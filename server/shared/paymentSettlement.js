// server/shared/paymentSettlement.js
//
// Decides whether a human is capable of verifying a payment.
//
// Keyed on method_category from fundraisely_club_payment_methods — NOT
// provider_name, which is club-editable free text ("Revolut - Main Account",
// "Donate") and carries no settlement semantics. Every provider under
// instant_payment (cash, card_tap, revolut, bank_transfer, paypal, sumup,
// monzo) is a link-or-in-person flow where a person checking the bank app
// or holding the cash IS the settlement event.

// External system settles. A human at the door has verified nothing.
const AUTO_SETTLED_CATEGORIES = new Set([
  'stripe',   // Stripe Connect → payment_intent webhook
  'crypto',   // on-chain confirmations
]);

// A human verifying IS the settlement event.
const MANUAL_SETTLED_CATEGORIES = new Set([
  'instant_payment',
  'other',
]);

// method_config.verificationMode overrides the category when present.
const AUTO_VERIFICATION_MODES   = new Set(['onchain_verified', 'gateway_verified', 'auto']);
const MANUAL_VERIFICATION_MODES = new Set(['manual']);

function parseConfig(methodConfig) {
  if (!methodConfig) return {};
  if (typeof methodConfig === 'object') return methodConfig;
  try { return JSON.parse(methodConfig) ?? {}; } catch { return {}; }
}

/**
 * @param {string|object} input  A method_category string, or a row/object
 *                               with { methodCategory | method_category,
 *                                      methodConfig   | method_config }.
 * @returns {'auto'|'manual'}
 */
export function settlementModeFor(input) {
  const isObj = input && typeof input === 'object';

  const category = String(
    (isObj ? (input.methodCategory ?? input.method_category) : input) || ''
  ).trim().toLowerCase();

  const config = isObj ? parseConfig(input.methodConfig ?? input.method_config) : {};
  const vMode  = String(config.verificationMode || '').trim().toLowerCase();

  // 1. Explicit verificationMode wins — it's the club's own declaration.
  if (vMode && AUTO_VERIFICATION_MODES.has(vMode))   return 'auto';
  if (vMode && MANUAL_VERIFICATION_MODES.has(vMode)) return 'manual';

  // 2. Category.
  if (AUTO_SETTLED_CATEGORIES.has(category))   return 'auto';
  if (MANUAL_SETTLED_CATEGORIES.has(category)) return 'manual';

  // 3. ⚠️ 'card' lands here — see note below. Unknown defaults to manual:
  //    a false block strands a real guest at the door, which is worse than
  //    a false allow on a category we don't recognise.
  console.warn(`[paymentSettlement] ⚠️ Unclassified method_category: "${category}" — defaulting to manual`);
  return 'manual';
}

export function canConfirmManually(input) {
  return settlementModeFor(input) !== 'auto';
}

export function settlementLabelFor(input) {
  const isObj = input && typeof input === 'object';
  const category = String(
    (isObj ? (input.methodCategory ?? input.method_category) : input) || ''
  ).trim().toLowerCase();

  if (category === 'stripe') return 'card payment';
  if (category === 'crypto') return 'on-chain payment';
  return 'online payment';
}