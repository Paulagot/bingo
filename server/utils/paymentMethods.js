// server/utils/paymentMethods.js

/**
 * Normalize payment method strings to consistent enum values
 * Must match DB enum + frontend PaymentMethod type:
 * 'cash' | 'instant_payment' | 'pay_admin' | 'card' | 'stripe' | 'other'
 */
export function normalizePaymentMethod(value) {
  if (!value) return 'other';

  const v = String(value).toLowerCase().trim();

  // Direct matches
  if (v === 'cash') return 'cash';
  if (v === 'instant_payment' || v === 'instant payment' || v === 'instant') return 'instant_payment';
  if (v === 'pay_admin' || v === 'pay admin' || v === 'pay_host' || v === 'pay host' || v === 'admin') return 'pay_admin';
  if (v === 'card' || v === 'card tap' || v === 'credit_card' || v === 'debit_card') return 'card';
  if (v === 'stripe' || v === 'stripe_checkout') return 'stripe';
  if (v === 'other') return 'other';

  // Provider aliases that should count as instant_payment
  if (
    v === 'revolut' || v.includes('revolut') ||
    v === 'zippypay' || v.includes('zippy') ||
    v === 'bank_transfer' || v === 'bank' || v.includes('bank') ||
    v === 'paypal' || v.includes('paypal')
  ) {
    return 'instant_payment';
  }

  // Legacy
  if (v.includes('cash_or_revolut')) return 'instant_payment';

  return 'other';
}

/**
 * Payment method enum values (kept in sync with frontend + DB)
 */
export const PaymentMethod = {
  CASH: 'cash',
  INSTANT_PAYMENT: 'instant_payment',
  PAY_ADMIN: 'pay_admin',
  CARD: 'card',
  STRIPE: 'stripe',
  OTHER: 'other',
};
