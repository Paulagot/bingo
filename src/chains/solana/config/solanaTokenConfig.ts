/**
 * solanaTokenConfig.ts
 *
 * Single source of truth for all supported Solana fee/prize tokens.
 * Used by:
 *  - Smart contract calls  (mint address, decimals → raw amounts)
 *  - TGB API              (tgbCode → pledgeCurrency)
 *  - Frontend             (display name, symbol, icon, minEntry)
 *  - Backend validation   (minDonation for TGB charity amount)
 *
 * Pool Room:  feeToken === prizeToken === charityToken (host picks one)
 * Asset Room: feeToken only (prizes are host-uploaded assets)
 *
 * ⚠️  All mint addresses are Solana MAINNET.
 *     For devnet testing, override via SOLANA_TOKEN_OVERRIDES env or mock config.
 */

export type SolanaTokenCode =
  | 'SOL'
  | 'USDG'
  | 'JUP'
  | 'BONK'
  | 'WIF'
  | 'JTO'
  | 'KMNO'
  | 'TRUMP'
  | 'MEW'
  | 'PYTH';

export interface SolanaTokenConfig {
  /** Short ticker — also used as the map key */
  code: SolanaTokenCode;

  /** Human-readable name shown in UI */
  name: string;

  /** SPL mint address (mainnet). null for native SOL. */
  mint: string | null;

  /** On-chain decimal places. CRITICAL — used for all raw amount calculations. */
  decimals: number;

  /**
   * Whether this is native SOL (lamports) vs an SPL token.
   * Determines which transfer instruction the contract uses.
   */
  isNative: boolean;

  /**
   * The Giving Block currency code for the /v1/deposit-address API call.
   * This is the pledgeCurrency value — NOT the network.
   */
  tgbCode: string;

  /**
   * Minimum donation amount for TGB (in display units, NOT raw).
   * Source: TGB /v1/currencies endpoint.
   * Used to validate charity pledge amount before calling TGB API.
   */
  tgbMinDonation: number;

  /**
   * Minimum entry fee a host can set (in display units).
   * You control this — set sensible floors per token.
   */
  minEntryFee: number;

  /** URL for the token logo. Use TGB CDN where available, else CoinGecko/static. */
  logoUrl: string;

  /**
   * CoinGecko ID for price lookups (USD value display, charity USD estimates).
   * null if not listed or not needed.
   */
  coingeckoId: string | null;
}

// ---------------------------------------------------------------------------
// Token map — the canonical list
// ---------------------------------------------------------------------------

export const SOLANA_TOKENS: Record<SolanaTokenCode, SolanaTokenConfig> = {

  SOL: {
    code: 'SOL',
    name: 'Solana',
    mint: null,                                             // native — no mint
    decimals: 9,                                            // 1 SOL = 1_000_000_000 lamports
    isNative: true,
    tgbCode: 'SOL',
    tgbMinDonation: 0.00001,
    minEntryFee: 0.01,
    logoUrl: 'https://static.tgbwidget.com/currency_images%2F1dffe878-2164-4a11-902c-04ec7df9cca9.png',
    coingeckoId: 'solana',
  },

  USDG: {
    code: 'USDG',
    name: 'Global Dollar',
    mint: '2u1tszSeqZ3qBWF3uNGPFc8TzMk2tdiwknnRMWGWjGWH',   // Paxos / Solflare verified
    decimals: 6,                                            // 1 USDG = 1_000_000 units
    isNative: false,
    tgbCode: 'USDG',
    tgbMinDonation: 0.1,
    minEntryFee: 0.5,
    logoUrl: 'https://static.tgbwidget.com/currency_images/e39e781c-7917-4ad8-b34e-9e037c4b4b1c.png',
    coingeckoId: 'global-dollar',
  },

  JUP: {
    code: 'JUP',
    name: 'Jupiter',
    mint: 'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN',
    decimals: 6,
    isNative: false,
    tgbCode: 'JUP',
    tgbMinDonation: 0.3,
    minEntryFee: 1,
    logoUrl: 'https://static.tgbwidget.com/currency_images/0b318f9a-18b0-48fe-a423-59b145e6971b.png',
    coingeckoId: 'jupiter-exchange-solana',
  },

  BONK: {
    code: 'BONK',
    name: 'Bonk',
    mint: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',
    decimals: 5,                                            // ⚠️  5 decimals — not 6!
    isNative: false,
    tgbCode: 'BONK',
    tgbMinDonation: 4000,
    minEntryFee: 10000,
    logoUrl: 'https://static.tgbwidget.com/currency_images/47c4992a-b4b8-4bd3-aae3-64173629844d.png',
    coingeckoId: 'bonk',
  },

  WIF: {
    code: 'WIF',
    name: 'dogwifhat',
    mint: 'EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm',
    decimals: 6,
    isNative: false,
    tgbCode: 'WIF',
    tgbMinDonation: 0.07,
    minEntryFee: 0.5,
    logoUrl: 'https://static.tgbwidget.com/currency_images/49e34fff-e9c2-4127-8fb3-286360fac3ac.png',
    coingeckoId: 'dogwifcoin',
  },

  JTO: {
    code: 'JTO',
    name: 'JITO',
    mint: 'jtojtomepa8b1E2XlyriygzsChXTrqE73RM4BdWUGEm',
    decimals: 9,                                            // ⚠️  9 decimals like SOL
    isNative: false,
    tgbCode: 'JTO',
    tgbMinDonation: 0.05,
    minEntryFee: 0.5,
    logoUrl: 'https://static.tgbwidget.com/currency_images/985fdb8e-d90c-4fe6-b7e7-35a33a4f3943.png',
    coingeckoId: 'jito-governance-token',
  },

  KMNO: {
    code: 'KMNO',
    name: 'Kamino',
    mint: 'KMNo3nJsBXfcpJTVhZcXLW7RmTwTt4GVFE7suUBo9sS',
    decimals: 6,
    isNative: false,
    tgbCode: 'KMNO',
    tgbMinDonation: 1,
    minEntryFee: 5,
    logoUrl: 'https://static.tgbwidget.com/currency_images/24085e62-0663-4467-a423-1341d232a1da.png',
    coingeckoId: 'kamino',
  },



  TRUMP: {
    code: 'TRUMP',
    name: 'Trump',
    mint: '6p6xgHyF7AeE6TZkSmFsko444wqoP15icUSqi2jfGiPN',
    decimals: 6,
    isNative: false,
    tgbCode: 'TRUMP',
    tgbMinDonation: 0.01,
    minEntryFee: 0.1,
    logoUrl: 'https://static.tgbwidget.com/currency_images/bf24a293-6f19-4ed5-8a40-ba032f45fb18.png',
    coingeckoId: 'official-trump',
  },

  MEW: {
    code: 'MEW',
    name: 'cat in a dogs world',
    mint: 'MEW1gQWJ3nEXg2qgERiKu7FAFj79PHvQVREQUzScPP5',
    decimals: 5,                                            // ⚠️  5 decimals like BONK
    isNative: false,
    tgbCode: 'MEW',
    tgbMinDonation: 10,
    minEntryFee: 50,
    logoUrl: 'https://static.tgbwidget.com/currency_images/ac8bcaa4-2245-4bc3-a2ca-daa7c7d9bc53.png',
    coingeckoId: 'cat-in-a-dogs-world',
  },

  PYTH: {
    code: 'PYTH',
    name: 'Pyth Network',
    mint: 'HZ1JovNiVvGrGNiiYvEozEVgZ58xaU3RKwX8eACQBCt3',
    decimals: 6,
    isNative: false,
    tgbCode: 'PYTH',
    tgbMinDonation: 0.2,
    minEntryFee: 1,
    logoUrl: 'https://static.tgbwidget.com/currency_images/f761d7a6-986a-45e3-950d-b23fdb4b627b.png',
    coingeckoId: 'pyth-network',
  },

} as const;

// ---------------------------------------------------------------------------
// Ordered list for UI display (host token selector)
// SOL and stablecoin first, then by ecosystem familiarity
// ---------------------------------------------------------------------------

export const SOLANA_TOKEN_LIST: SolanaTokenCode[] = [
  'SOL',
  'USDG',
  'JUP',
  'JTO',
  'PYTH',
  'KMNO',
  'WIF',
  'BONK',
  'MEW',
  'TRUMP',
 
];

// ---------------------------------------------------------------------------
// Utility helpers
// ---------------------------------------------------------------------------

/**
 * Convert a display amount (what the user types) to raw on-chain units.
 * e.g. toRawAmount(1.5, 'SOL') → 1_500_000_000n
 *
 * Uses BigInt to avoid floating-point precision bugs.
 */
export function toRawAmount(displayAmount: number, code: SolanaTokenCode): bigint {
  const { decimals } = SOLANA_TOKENS[code];
  // Multiply by 10^decimals, round to avoid float drift
  const raw = Math.round(displayAmount * Math.pow(10, decimals));
  return BigInt(raw);
}

/**
 * Convert raw on-chain units back to a display amount.
 * e.g. toDisplayAmount(1_500_000_000n, 'SOL') → 1.5
 */
export function toDisplayAmount(rawAmount: bigint, code: SolanaTokenCode): number {
  const { decimals } = SOLANA_TOKENS[code];
  return Number(rawAmount) / Math.pow(10, decimals);
}

/**
 * Format a display amount with appropriate decimal places for UI.
 * e.g. formatTokenAmount(1234567, 'BONK') → '1,234,567 BONK'
 */
export function formatTokenAmount(displayAmount: number, code: SolanaTokenCode): string {
  const { decimals } = SOLANA_TOKENS[code];

  // Show fewer decimals for large-unit tokens (BONK, MEW)
  const maxFractionDigits = decimals <= 5 ? 0 : 4;

  const formatted = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: maxFractionDigits,
  }).format(displayAmount);

  return `${formatted} ${code}`;
}

/**
 * Returns the TGB pledgeCurrency code for a given token.
 * This is what goes into the /v1/deposit-address payload.
 */
export function getTgbCurrencyCode(code: SolanaTokenCode): string {
  return SOLANA_TOKENS[code].tgbCode;
}

/**
 * Validate that a charity amount meets TGB's minimum for the token.
 * Call before hitting the TGB API.
 */
export function meetsMinDonation(displayAmount: number, code: SolanaTokenCode): boolean {
  return displayAmount >= SOLANA_TOKENS[code].tgbMinDonation;
}

/**
 * Get token config by mint address (useful when parsing on-chain data).
 * Returns null if the mint isn't in our supported list.
 */
export function getTokenByMint(mint: string): SolanaTokenConfig | null {
  // ✅ wSOL mint maps to SOL config
  const WSOL_MINT = 'So11111111111111111111111111111111111111112';
  if (mint === WSOL_MINT) return SOLANA_TOKENS['SOL'];
  
  return Object.values(SOLANA_TOKENS).find(t => t.mint === mint) ?? null;
}

// ---------------------------------------------------------------------------
// Type guard
// ---------------------------------------------------------------------------

export function isSupportedToken(code: string): code is SolanaTokenCode {
  return code in SOLANA_TOKENS;
}

// ============================================================================
// Platform charity reserve wallet
// Used when charity amount is below TGB minimum for a token.
// Platform batches these small amounts and forwards to charities manually.
// ============================================================================
export const PLATFORM_CHARITY_RESERVE = '4dBPGPU6tmsWSsGhHgNMK9QBADWLs9AxKL1Jh7hZeS6o';