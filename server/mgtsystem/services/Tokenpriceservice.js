/**
 * tokenPriceService.js
 *
 * Fetches the EUR price for any supported Solana token.
 *
 * Strategy:
 *   1. Return cached value if fresh (< CACHE_TTL_MS)
 *   2. Try CoinGecko /simple/price  (uses coingeckoId from your token config)
 *   3. Fall back to Jupiter Price API v2  (uses mint address)
 *   4. If both fail, return null — callers must handle gracefully
 *
 * Usage:
 *   import { getTokenPriceEur } from './tokenPriceService.js';
 *   const eurPrice = await getTokenPriceEur('SOL');   // e.g. 142.30
 *   const eurPrice = await getTokenPriceEur('BONK');  // e.g. 0.0000182
 */

import { SOLANA_TOKENS, EVM_TOKENS } from './solanaTokenConfig.js';

// ---------------------------------------------------------------------------
// Cache — simple in-process Map, keyed by SolanaTokenCode
// One quiz-end event = one price fetch per unique token
// ---------------------------------------------------------------------------

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/** @type {Map<string, { priceEur: number; fetchedAt: number }>} */
const priceCache = new Map();

function getCached(code) {
  const entry = priceCache.get(code);
  if (!entry) return null;
  if (Date.now() - entry.fetchedAt > CACHE_TTL_MS) {
    priceCache.delete(code);
    return null;
  }
  return entry.priceEur;
}

function setCache(code, priceEur) {
  priceCache.set(code, { priceEur, fetchedAt: Date.now() });
}

// ---------------------------------------------------------------------------
// Source 1 — CoinGecko free /simple/price endpoint
// Docs: https://docs.coingecko.com/reference/simple-price
// Rate limit: ~10–30 req/min on free tier — fine for end-of-quiz
// ---------------------------------------------------------------------------

/**
 * @param {string} coingeckoId  e.g. 'solana', 'bonk', 'dogwifcoin'
 * @returns {Promise<number|null>}
 */
async function fetchFromCoinGecko(coingeckoId) {
  const url =
    `https://api.coingecko.com/api/v3/simple/price` +
    `?ids=${encodeURIComponent(coingeckoId)}&vs_currencies=eur`;

  const res = await fetch(url, {
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(8_000), // 8 s timeout
  });

  if (!res.ok) {
    throw new Error(`CoinGecko HTTP ${res.status}`);
  }

  const json = await res.json();
  const price = json?.[coingeckoId]?.eur;

  if (typeof price !== 'number') {
    throw new Error(`CoinGecko: no EUR price in response for ${coingeckoId}`);
  }

  return price;
}

// ---------------------------------------------------------------------------
// Source 2 — Jupiter Price API v2 (Solana-native, returns USD)
// We then convert USD → EUR using a second CoinGecko call for EUR/USD rate.
// Docs: https://dev.jup.ag/docs/apis/price-api
// ---------------------------------------------------------------------------

/** Cached USD→EUR rate (separate short-lived cache) */
let usdToEurRate = null;
let usdToEurFetchedAt = 0;

async function getUsdToEurRate() {
  if (usdToEurRate && Date.now() - usdToEurFetchedAt < CACHE_TTL_MS) {
    return usdToEurRate;
  }

  const res = await fetch(
    'https://api.coingecko.com/api/v3/simple/price?ids=usd-coin&vs_currencies=eur',
    {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(8_000),
    }
  );

  if (!res.ok) throw new Error(`CoinGecko USD/EUR rate HTTP ${res.status}`);

  const json = await res.json();
  // USDC ≈ $1 so USDC/EUR ≈ USD/EUR rate
  const rate = json?.['usd-coin']?.eur;
  if (typeof rate !== 'number') throw new Error('Could not get USD→EUR rate');

  usdToEurRate = rate;
  usdToEurFetchedAt = Date.now();
  return rate;
}

/**
 * @param {string} mintAddress  SPL mint address (null → use SOL mint alias)
 * @returns {Promise<number|null>}  Price in EUR
 */
async function fetchFromJupiter(mintAddress) {
  // Jupiter uses the SOL mint alias for native SOL
  const SOL_MINT = 'So11111111111111111111111111111111111111112';
  const mint = mintAddress ?? SOL_MINT;

  const url = `https://api.jup.ag/price/v2?ids=${mint}`;

  const res = await fetch(url, {
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(8_000),
  });

  if (!res.ok) throw new Error(`Jupiter HTTP ${res.status}`);

  const json = await res.json();
  const priceUsd = json?.data?.[mint]?.price;

  if (typeof priceUsd !== 'number' && typeof priceUsd !== 'string') {
    throw new Error(`Jupiter: no price in response for mint ${mint}`);
  }

  const usdPrice = Number(priceUsd);
  if (!Number.isFinite(usdPrice)) throw new Error('Jupiter: non-finite price');

  // Convert USD → EUR
  const rate = await getUsdToEurRate();
  return usdPrice * rate;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Get the current EUR price for a token.
 * Returns null if both sources fail — callers should log and store null.
 *
 * @param {import('./solanaTokenConfig.js').SolanaTokenCode} code
 * @returns {Promise<number|null>}
 */
export async function getTokenPriceEur(code) {
  // 1) Cache hit
  const cached = getCached(code);
  if (cached !== null) {
    console.log(`[TokenPrice] 💾 Cache hit for ${code}: €${cached}`);
    return cached;
  }

  const config = SOLANA_TOKENS[code] ?? EVM_TOKENS[code];
  if (!config) {
    console.warn(`[TokenPrice] ⚠️ Unknown token code: ${code}`);
    return null;
  }

  // 2) Try CoinGecko first
  if (config.coingeckoId) {
    try {
      const price = await fetchFromCoinGecko(config.coingeckoId);
      console.log(`[TokenPrice] ✅ CoinGecko ${code}: €${price}`);
      setCache(code, price);
      return price;
    } catch (err) {
      console.warn(`[TokenPrice] ⚠️ CoinGecko failed for ${code}: ${err.message}`);
    }
  }

  // 3) Fall back to Jupiter
  try {
    const price = await fetchFromJupiter(config.mint);
    console.log(`[TokenPrice] ✅ Jupiter fallback ${code}: €${price}`);
    setCache(code, price);
    return price;
  } catch (err) {
    console.warn(`[TokenPrice] ❌ Jupiter also failed for ${code}: ${err.message}`);
  }

  return null;
}

/**
 * Convert a token display amount to EUR.
 * Returns null if price unavailable — store as NULL in DB, don't store 0.
 *
 * @param {number} displayAmount   Human-readable token amount (not raw on-chain units)
 * @param {import('./solanaTokenConfig.js').SolanaTokenCode} code
 * @returns {Promise<number|null>}
 */
export async function toEur(displayAmount, code) {
  if (!displayAmount || displayAmount <= 0) return 0;

  const priceEur = await getTokenPriceEur(code);
  if (priceEur === null) return null;

  const eur = displayAmount * priceEur;
  // Round to 4 dp — enough precision for micro-transactions (BONK, MEW etc.)
  return Math.round(eur * 10_000) / 10_000;
}

/**
 * Fetch EUR prices for multiple tokens in one go.
 * Useful if a room ever supports mixed tokens in future.
 *
 * @param {import('./solanaTokenConfig.js').SolanaTokenCode[]} codes
 * @returns {Promise<Record<string, number|null>>}
 */
export async function getTokenPricesEur(codes) {
  const unique = [...new Set(codes)];
  const results = await Promise.allSettled(unique.map(c => getTokenPriceEur(c)));

  return Object.fromEntries(
    unique.map((code, i) => [
      code,
      results[i].status === 'fulfilled' ? results[i].value : null,
    ])
  );
}