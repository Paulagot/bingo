/**
 * solana-tokens.js  (backend)
 *
 * Lean Solana token config for server-side use only.
 * No UI concerns — no logos, no display order, no formatting, no coingeckoId.
 *
 * Used by:
 *  - TGB API calls         (tgbCode → pledgeCurrency, tgbMinDonation validation)
 *  - Prize distribution    (mint address, decimals → raw on-chain amounts)
 *  - Contract interactions (isNative → which transfer instruction to use)
 *  - Request validation    (isSupportedToken, meetsMinDonation)
 *
 * Pool Room:  feeToken === prizeToken === charityToken (host picks one)
 * Asset Room: feeToken only (prizes are host-uploaded assets — same token list)
 *
 * ⚠️  All mint addresses are Solana MAINNET.
 *     For devnet, swap mints via SOLANA_NETWORK=devnet + devnet overrides below.
 */

// ---------------------------------------------------------------------------
// Token map
// ---------------------------------------------------------------------------

export const SOLANA_TOKENS = {

  SOL: {
    code: 'SOL',
    name: 'Solana',
    mint: null,                                              // native SOL — no mint address
    decimals: 9,                                             // 1 SOL = 1_000_000_000 lamports
    isNative: true,
    tgbCode: 'SOL',
    tgbMinDonation: 0.001,
  },

  USDG: {
    code: 'USDG',
    name: 'Global Dollar',
    mint: '2u1tszSeqZ3qBWF3uNGPFc8TzMk2tdiwknnRMWGWjGWH',   // Paxos / Solflare verified
    decimals: 6,                                             // 1 USDG = 1_000_000 units
    isNative: false,
    tgbCode: 'USDG',
    tgbMinDonation: 0.1,
  },

  JUP: {
    code: 'JUP',
    name: 'Jupiter',
    mint: 'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN',
    decimals: 6,
    isNative: false,
    tgbCode: 'JUP',
    tgbMinDonation: 0.3,
  },

  BONK: {
    code: 'BONK',
    name: 'Bonk',
    mint: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',
    decimals: 5,                                             // ⚠️  5 decimals — NOT 6
    isNative: false,
    tgbCode: 'BONK',
    tgbMinDonation: 4000,
  },

  WIF: {
    code: 'WIF',
    name: 'dogwifhat',
    mint: 'EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm',
    decimals: 6,
    isNative: false,
    tgbCode: 'WIF',
    tgbMinDonation: 0.07,
  },

  JTO: {
    code: 'JTO',
    name: 'JITO',
    mint: 'jtojtomepa8b1E2XlyriygzsChXTrqE73RM4BdWUGEm',
    decimals: 9,                                             // ⚠️  9 decimals like SOL
    isNative: false,
    tgbCode: 'JTO',
    tgbMinDonation: 0.05,
  },

  KMNO: {
    code: 'KMNO',
    name: 'Kamino',
    mint: 'KMNo3nJsBXfcpJTVhZcXLW7RmTwTt4GVFE7suUBo9sS',
    decimals: 6,
    isNative: false,
    tgbCode: 'KMNO',
    tgbMinDonation: 1,
  },



  TRUMP: {
    code: 'TRUMP',
    name: 'Trump',
    mint: '6p6xgHyF7AeE6TZkSmFsko444wqoP15icUSqi2jfGiPN',
    decimals: 6,
    isNative: false,
    tgbCode: 'TRUMP',
    tgbMinDonation: 0.01,
  },

  MEW: {
    code: 'MEW',
    name: 'cat in a dogs world',
    mint: 'MEW1gQWJ3nEXg2qgERiKu7FAFj79PHvQVREQUzScPP5',
    decimals: 5,                                             // ⚠️  5 decimals — NOT 6
    isNative: false,
    tgbCode: 'MEW',
    tgbMinDonation: 10,
  },

  PYTH: {
    code: 'PYTH',
    name: 'Pyth Network',
    mint: 'HZ1JovNiVvGrGNiiYvEozEVgZ58xaU3RKwX8eACQBCt3',
    decimals: 6,
    isNative: false,
    tgbCode: 'PYTH',
    tgbMinDonation: 0.2,
  },

};

// ---------------------------------------------------------------------------
// Devnet mint overrides
// Most SPL tokens don't exist on devnet — use these wrapped/mock mints
// for local testing. SOL works natively on devnet with no changes.
// Override by setting SOLANA_NETWORK=devnet in your .env
// ---------------------------------------------------------------------------

export const SOLANA_DEVNET_OVERRIDES = {
  // USDG devnet equivalent — use Circle's devnet USDC as a stand-in stablecoin
  // mint: '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU'
  // Uncomment and populate as needed per token for your devnet test setup
};

/**
 * Get the active token map based on SOLANA_NETWORK env var.
 * Falls back to mainnet if not set.
 *
 * Usage: const tokens = getActiveTokens();
 */
export function getActiveTokens() {
  if (process.env.SOLANA_NETWORK === 'devnet') {
    // Deep merge devnet overrides into mainnet config
    const merged = {};
    for (const [code, config] of Object.entries(SOLANA_TOKENS)) {
      merged[code] = {
        ...config,
        ...(SOLANA_DEVNET_OVERRIDES[code] ?? {}),
      };
    }
    return merged;
  }
  return SOLANA_TOKENS;
}

// ---------------------------------------------------------------------------
// Utility functions
// ---------------------------------------------------------------------------

/**
 * Check if a token code is in our supported list.
 * Use this to validate token codes from request bodies.
 *
 * @param {string} code
 * @returns {boolean}
 *
 * @example
 * isSupportedToken('SOL')   // true
 * isSupportedToken('USDC')  // false
 * isSupportedToken('')      // false
 */
export function isSupportedToken(code) {
  return typeof code === 'string' && code in SOLANA_TOKENS;
}

/**
 * Convert a display amount to raw on-chain units (BigInt).
 * Uses BigInt + rounding to avoid floating-point precision bugs.
 *
 * ALWAYS use this before passing amounts to the contract or comparing
 * on-chain values. Never do inline multiplication with floats.
 *
 * @param {number} displayAmount  - Human-readable amount (e.g. 1.5)
 * @param {string} code           - Token code (e.g. 'SOL')
 * @returns {bigint}              - Raw units (e.g. 1_500_000_000n)
 *
 * @example
 * toRawAmount(1.5, 'SOL')    // 1_500_000_000n
 * toRawAmount(10, 'USDG')    // 10_000_000n
 * toRawAmount(5000, 'BONK')  // 500_000_000n  (5 decimals)
 */
export function toRawAmount(displayAmount, code) {
  if (!isSupportedToken(code)) {
    throw new Error(`toRawAmount: unsupported token "${code}"`);
  }
  const { decimals } = SOLANA_TOKENS[code];
  const raw = Math.round(displayAmount * Math.pow(10, decimals));
  return BigInt(raw);
}

/**
 * Convert raw on-chain units back to a display amount (number).
 *
 * @param {bigint|number} rawAmount - Raw units from chain
 * @param {string} code             - Token code
 * @returns {number}                - Human-readable amount
 *
 * @example
 * toDisplayAmount(1_500_000_000n, 'SOL')  // 1.5
 * toDisplayAmount(10_000_000n, 'USDG')    // 10
 */
export function toDisplayAmount(rawAmount, code) {
  if (!isSupportedToken(code)) {
    throw new Error(`toDisplayAmount: unsupported token "${code}"`);
  }
  const { decimals } = SOLANA_TOKENS[code];
  return Number(rawAmount) / Math.pow(10, decimals);
}

/**
 * Validate that a charity amount meets TGB's minimum for the token.
 * Call this BEFORE hitting the TGB /v1/deposit-address endpoint.
 *
 * @param {number} displayAmount - Charity amount in display units
 * @param {string} code          - Token code
 * @returns {boolean}
 *
 * @example
 * meetsMinDonation(0.5, 'SOL')    // true  (min is 0.001)
 * meetsMinDonation(0.01, 'USDG')  // false (min is 0.1)
 * meetsMinDonation(3000, 'BONK')  // false (min is 4000)
 */
export function meetsMinDonation(displayAmount, code) {
  if (!isSupportedToken(code)) return false;
  return displayAmount >= SOLANA_TOKENS[code].tgbMinDonation;
}

/**
 * Get the TGB pledgeCurrency code for a token.
 * This is what goes into the /v1/deposit-address API payload.
 *
 * @param {string} code - Token code
 * @returns {string}    - TGB currency code
 *
 * @example
 * getTgbCode('SOL')   // 'SOL'
 * getTgbCode('USDG')  // 'USDG'
 */
export function getTgbCode(code) {
  if (!isSupportedToken(code)) {
    throw new Error(`getTgbCode: unsupported token "${code}"`);
  }
  return SOLANA_TOKENS[code].tgbCode;
}

/**
 * Get token config by mint address.
 * Useful when parsing on-chain transaction data to identify which token was used.
 *
 * @param {string} mint - SPL mint address
 * @returns {object|null} - Token config or null if not in supported list
 *
 * @example
 * getTokenByMint('DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263')
 * // → { code: 'BONK', decimals: 5, ... }
 */
export function getTokenByMint(mint) {
  return Object.values(SOLANA_TOKENS).find(t => t.mint === mint) ?? null;
}

/**
 * Assert a token code is valid — throws a structured error suitable for
 * returning as a 400 response. Use at the top of route handlers.
 *
 * @param {string} code        - Token code from request body
 * @param {string} [field='tokenCode'] - Field name for error message
 * @throws {Error}
 *
 * @example
 * assertSupportedToken(req.body.tokenCode)
 */
export function assertSupportedToken(code, field = 'tokenCode') {
  if (!isSupportedToken(code)) {
    const err = new Error(
      `Invalid "${field}": "${code}" is not a supported Solana token. ` +
      `Supported: ${Object.keys(SOLANA_TOKENS).join(', ')}`
    );
    err.statusCode = 400;
    err.code = 'UNSUPPORTED_TOKEN';
    throw err;
  }
}