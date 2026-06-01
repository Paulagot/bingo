// server/utils/currencyUtils.js
//
// Single source of truth for currency handling on the server.
//
// Replaces the duplicated currencyFromSymbol() helpers scattered across:
//   - playerHandlers.js
//   - stripeTicketCheckoutService.js
//   - stripeWalkinCheckout.js
//   - cryptoSolanaPaymentVerificationService.js
//
// Usage:
//   import { currencyFromSymbol, currencyToSymbol, SUPPORTED_CURRENCIES } from '../../utils/currencyUtils.js';

// ---------------------------------------------------------------------------
// Supported currencies
// Each entry: { code, symbol, coingeckoVsCurrency, locale, decimals }
//   coingeckoVsCurrency — the vs_currencies param CoinGecko accepts
//   locale              — for Intl.NumberFormat if ever needed server-side
//   decimals            — standard decimal places for display
// ---------------------------------------------------------------------------

export const SUPPORTED_CURRENCIES = {
  EUR: { code: 'EUR', symbol: '€', coingeckoVsCurrency: 'eur', locale: 'en-IE', decimals: 2 },
  GBP: { code: 'GBP', symbol: '£', coingeckoVsCurrency: 'gbp', locale: 'en-GB', decimals: 2 },
  USD: { code: 'USD', symbol: '$', coingeckoVsCurrency: 'usd', locale: 'en-US', decimals: 2 },
  CAD: { code: 'CAD', symbol: 'CA$', coingeckoVsCurrency: 'cad', locale: 'en-CA', decimals: 2 },
  NGN: { code: 'NGN', symbol: '₦', coingeckoVsCurrency: 'ngn', locale: 'en-NG', decimals: 2 },
};

// Fast lookup maps built once at startup
const BY_SYMBOL = Object.fromEntries(
  Object.values(SUPPORTED_CURRENCIES).map((c) => [c.symbol, c])
);

// Some currencies share a symbol (e.g. '$' is used by USD, CAD, AUD).
// We resolve ambiguous symbols to the most common one, which is fine for
// legacy data that only stored a symbol. New code should always store the code.
const SYMBOL_OVERRIDES = {
  '$': 'USD',   // prefer USD over CAD for bare '$'
};

// ---------------------------------------------------------------------------
// Public helpers
// ---------------------------------------------------------------------------

/**
 * Map a currency symbol to its ISO 4217 code.
 * Falls back to 'EUR' for unknown symbols to match historic behaviour.
 *
 * @param {string} symbol  e.g. '€', '£', '$', '₦', 'CA$'
 * @returns {string}  e.g. 'EUR', 'GBP', 'USD', 'NGN', 'CAD'
 */
export function currencyFromSymbol(symbol) {
  if (!symbol) return 'EUR';
  const override = SYMBOL_OVERRIDES[symbol];
  if (override) return override;
  return BY_SYMBOL[symbol]?.code ?? 'EUR';
}

/**
 * Map an ISO 4217 code to its display symbol.
 * Falls back to the code itself for unknown currencies.
 *
 * @param {string} code  e.g. 'EUR', 'GBP', 'NGN'
 * @returns {string}  e.g. '€', '£', '₦'
 */
export function currencyToSymbol(code) {
  return SUPPORTED_CURRENCIES[code]?.symbol ?? code;
}

/**
 * Get the full currency config object for a code.
 * Returns EUR config as fallback.
 *
 * @param {string} code
 * @returns {{ code: string, symbol: string, coingeckoVsCurrency: string, locale: string, decimals: number }}
 */
export function getCurrencyConfig(code) {
  return SUPPORTED_CURRENCIES[code] ?? SUPPORTED_CURRENCIES.EUR;
}

/**
 * Resolve a room's currency code from its config_json.
 * Handles both new-style (stores code) and legacy (stores only symbol).
 *
 * @param {object} config  Parsed config_json from the room row
 * @returns {string}  ISO 4217 code e.g. 'EUR'
 */
export function getRoomCurrencyCode(config) {
  if (!config) return 'EUR';
  // NEW: prefer the club-level reporting currency if passed through
  if (config.reporting_currency && SUPPORTED_CURRENCIES[config.reporting_currency])
    return config.reporting_currency;
  // existing fallbacks remain...
  const explicit = config.currency || config.currencyCode || config.currency_type;
  if (explicit && SUPPORTED_CURRENCIES[explicit]) return explicit;
  const symbol = config.currencySymbol || config.currency_symbol;
  if (symbol) return currencyFromSymbol(symbol);
  return 'EUR';
}

/**
 * Resolve a room's currency symbol from its config_json.
 *
 * @param {object} config
 * @returns {string}  e.g. '€'
 */
export function getRoomCurrencySymbol(config) {
  if (!config) return '€';
  const symbol = config.currencySymbol || config.currency_symbol;
  if (symbol) return symbol;
  return currencyToSymbol(getRoomCurrencyCode(config));
}

/**
 * Return true if a currency code is one we support.
 *
 * @param {string} code
 * @returns {boolean}
 */
export function isSupportedCurrency(code) {
  return Object.prototype.hasOwnProperty.call(SUPPORTED_CURRENCIES, code);
}