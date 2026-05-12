// server/mgtsystem/services/tokenPriceService.js
//
// Fetches the price for any supported Solana/EVM token in any supported fiat currency.
//
// Strategy:
//   1. Return cached value if fresh (< CACHE_TTL_MS)
//   2. Try CoinGecko /simple/price  (uses coingeckoId from token config)
//   3. Fall back to Jupiter Price API v2  (Solana tokens only, returns USD, we convert)
//   4. If both fail, return null — callers must handle gracefully
//
// Usage:
//   import { getTokenPrice, toFiat } from './tokenPriceService.js';
//   const price = await getTokenPrice('SOL', 'EUR');   // e.g. 142.30
//   const price = await getTokenPrice('SOL', 'GBP');   // e.g. 122.10
//   const value = await toFiat(0.5, 'SOL', 'EUR');     // e.g. 71.15

import { SOLANA_TOKENS, EVM_TOKENS } from './solanaTokenConfig.js';
import { getCurrencyConfig, SUPPORTED_CURRENCIES } from '../../utils/currencyUtils.js';

// ---------------------------------------------------------------------------
// Cache — keyed by `${tokenCode}:${currencyCode}` e.g. 'SOL:EUR'
// ---------------------------------------------------------------------------

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/** @type {Map<string, { price: number; fetchedAt: number }>} */
const priceCache = new Map();

function cacheKey(tokenCode, currencyCode) {
  return `${tokenCode}:${currencyCode}`;
}

function getCached(tokenCode, currencyCode) {
  const entry = priceCache.get(cacheKey(tokenCode, currencyCode));
  if (!entry) return null;
  if (Date.now() - entry.fetchedAt > CACHE_TTL_MS) {
    priceCache.delete(cacheKey(tokenCode, currencyCode));
    return null;
  }
  return entry.price;
}

function setCache(tokenCode, currencyCode, price) {
  priceCache.set(cacheKey(tokenCode, currencyCode), { price, fetchedAt: Date.now() });
}

// ---------------------------------------------------------------------------
// Source 1 — CoinGecko /simple/price
// Supports all our fiat currencies natively via vs_currencies param.
// Rate limit: ~10–30 req/min on free tier — fine for end-of-quiz usage.
// ---------------------------------------------------------------------------

/**
 * @param {string} coingeckoId   e.g. 'solana', 'usd-coin'
 * @param {string} vsCurrency    CoinGecko vs_currency code e.g. 'eur', 'gbp', 'ngn'
 * @returns {Promise<number>}
 */
async function fetchFromCoinGecko(coingeckoId, vsCurrency) {
  const url =
    `https://api.coingecko.com/api/v3/simple/price` +
    `?ids=${encodeURIComponent(coingeckoId)}&vs_currencies=${encodeURIComponent(vsCurrency)}`;

  const res = await fetch(url, {
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(8_000),
  });

  if (!res.ok) throw new Error(`CoinGecko HTTP ${res.status}`);

  const json = await res.json();
  const price = json?.[coingeckoId]?.[vsCurrency];

  if (typeof price !== 'number') {
    throw new Error(`CoinGecko: no ${vsCurrency} price for ${coingeckoId}`);
  }

  return price;
}

// ---------------------------------------------------------------------------
// Source 2 — Jupiter Price API v2 (Solana-native, USD only)
// We convert USD → target currency using a CoinGecko cross-rate.
// ---------------------------------------------------------------------------

/** Short-lived cache for USD → fiat cross-rates */
const usdCrossRateCache = new Map();

/**
 * Get the exchange rate from USD to a target currency.
 * Uses USDC as the USD proxy since Jupiter/CoinGecko both support it.
 *
 * @param {string} targetCurrencyCode  e.g. 'EUR', 'GBP', 'NGN'
 * @returns {Promise<number>}  e.g. 0.92 for USD→EUR
 */
async function getUsdCrossRate(targetCurrencyCode) {
  if (targetCurrencyCode === 'USD') return 1;

  const cached = usdCrossRateCache.get(targetCurrencyCode);
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) return cached.rate;

  const vsCurrency = getCurrencyConfig(targetCurrencyCode).coingeckoVsCurrency;

  const res = await fetch(
    `https://api.coingecko.com/api/v3/simple/price?ids=usd-coin&vs_currencies=${vsCurrency}`,
    {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(8_000),
    }
  );

  if (!res.ok) throw new Error(`CoinGecko USD cross-rate HTTP ${res.status}`);

  const json = await res.json();
  const rate = json?.['usd-coin']?.[vsCurrency];
  if (typeof rate !== 'number') throw new Error(`Could not get USD→${targetCurrencyCode} rate`);

  usdCrossRateCache.set(targetCurrencyCode, { rate, fetchedAt: Date.now() });
  return rate;
}

/**
 * @param {string|null} mintAddress  SPL mint address; null → use SOL mint alias
 * @param {string} targetCurrencyCode
 * @returns {Promise<number>}  Price in target currency
 */
async function fetchFromJupiter(mintAddress, targetCurrencyCode) {
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
    throw new Error(`Jupiter: no price for mint ${mint}`);
  }

  const usdPrice = Number(priceUsd);
  if (!Number.isFinite(usdPrice)) throw new Error('Jupiter: non-finite price');

  const rate = await getUsdCrossRate(targetCurrencyCode);
  return usdPrice * rate;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Get the current price for a token in any supported fiat currency.
 * Returns null if both sources fail — callers should store NULL, not 0.
 *
 * @param {string} tokenCode          e.g. 'SOL', 'USDC', 'BONK'
 * @param {string} [currencyCode]     ISO 4217 code — defaults to 'EUR'
 * @returns {Promise<number|null>}
 */
export async function getTokenPrice(tokenCode, currencyCode = 'EUR') {
  const currency = SUPPORTED_CURRENCIES[currencyCode] ?? SUPPORTED_CURRENCIES.EUR;
  const vsCurrency = currency.coingeckoVsCurrency;

  // 1) Cache hit
  const cached = getCached(tokenCode, currency.code);
  if (cached !== null) {
    console.log(`[TokenPrice] 💾 Cache hit ${tokenCode}/${currency.code}: ${currency.symbol}${cached}`);
    return cached;
  }

  const config = SOLANA_TOKENS[tokenCode] ?? EVM_TOKENS[tokenCode];
  if (!config) {
    console.warn(`[TokenPrice] ⚠️ Unknown token code: ${tokenCode}`);
    return null;
  }

  // 2) Try CoinGecko first
  if (config.coingeckoId) {
    try {
      const price = await fetchFromCoinGecko(config.coingeckoId, vsCurrency);
      console.log(`[TokenPrice] ✅ CoinGecko ${tokenCode}/${currency.code}: ${currency.symbol}${price}`);
      setCache(tokenCode, currency.code, price);
      return price;
    } catch (err) {
      console.warn(`[TokenPrice] ⚠️ CoinGecko failed for ${tokenCode}/${currency.code}: ${err.message}`);
    }
  }

  // 3) Fall back to Jupiter (Solana tokens only)
  try {
    const price = await fetchFromJupiter(config.mint ?? null, currency.code);
    console.log(`[TokenPrice] ✅ Jupiter fallback ${tokenCode}/${currency.code}: ${currency.symbol}${price}`);
    setCache(tokenCode, currency.code, price);
    return price;
  } catch (err) {
    console.warn(`[TokenPrice] ❌ Jupiter also failed for ${tokenCode}/${currency.code}: ${err.message}`);
  }

  return null;
}

/**
 * Convert a token display amount to a fiat value.
 * Returns null if price unavailable — store as NULL in DB, not 0.
 *
 * @param {number} displayAmount   Human-readable token amount (not raw on-chain units)
 * @param {string} tokenCode       e.g. 'SOL'
 * @param {string} [currencyCode]  ISO 4217 code — defaults to 'EUR'
 * @returns {Promise<number|null>}
 */
export async function toFiat(displayAmount, tokenCode, currencyCode = 'EUR') {
  if (!displayAmount || displayAmount <= 0) return 0;

  const price = await getTokenPrice(tokenCode, currencyCode);
  if (price === null) return null;

  const value = displayAmount * price;
  // Round to 4 dp — enough precision for micro-transactions (BONK etc.)
  return Math.round(value * 10_000) / 10_000;
}

/**
 * Batch fetch prices for multiple tokens in one go.
 *
 * @param {string[]} tokenCodes
 * @param {string} [currencyCode]
 * @returns {Promise<Record<string, number|null>>}
 */
export async function getTokenPrices(tokenCodes, currencyCode = 'EUR') {
  const unique = [...new Set(tokenCodes)];
  const results = await Promise.allSettled(unique.map((c) => getTokenPrice(c, currencyCode)));

  return Object.fromEntries(
    unique.map((code, i) => [
      code,
      results[i].status === 'fulfilled' ? results[i].value : null,
    ])
  );
}

// ---------------------------------------------------------------------------
// Legacy export — kept so existing callers don't break immediately.
// Callers should migrate to getTokenPrice(code, 'EUR') when convenient.
// ---------------------------------------------------------------------------

/** @deprecated Use getTokenPrice(code, 'EUR') instead */
export async function getTokenPriceEur(code) {
  return getTokenPrice(code, 'EUR');
}

/** @deprecated Use toFiat(amount, code, 'EUR') instead */
export async function toEur(displayAmount, code) {
  return toFiat(displayAmount, code, 'EUR');
}

/** @deprecated Use getTokenPrices(codes, 'EUR') instead */
export async function getTokenPricesEur(codes) {
  return getTokenPrices(codes, 'EUR');
}