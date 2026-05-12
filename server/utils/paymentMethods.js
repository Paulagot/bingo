// server/utils/paymentMethods.js

/**
 * Normalize payment method strings to consistent enum values.
 *
 * Must match DB/frontend supported values:
 * 'cash' | 'card_tap' | 'instant_payment' | 'pay_admin' | 'card' | 'stripe' | 'crypto' | 'other'
 *
 * Important:
 * - card_tap means in-person card tap on the night.
 * - card means generic/card-terminal/legacy card payment.
 * - stripe means online Stripe checkout.
 */
export function normalizePaymentMethod(value) {
  if (!value) return 'other';

  const v = String(value).toLowerCase().trim();

  // Direct matches
  if (v === 'cash') return 'cash';

  // CardTap must stay separate from generic "card" for reporting.
  if (v === 'card_tap' || v === 'card tap' || v === 'cardtap') {
    return 'card_tap';
  }

  if (
    v === 'instant_payment' ||
    v === 'instant payment' ||
    v === 'instant' ||
    v === 'manual'
  ) {
    return 'instant_payment';
  }

  if (
    v === 'pay_admin' ||
    v === 'pay admin' ||
    v === 'pay_host' ||
    v === 'pay host' ||
    v === 'admin'
  ) {
    return 'pay_admin';
  }

  if (v === 'card' || v === 'credit_card' || v === 'debit_card') {
    return 'card';
  }

  if (v === 'stripe' || v === 'stripe_checkout') {
    return 'stripe';
  }

  if (v === 'crypto' || v === 'web3' || v === 'solana') {
    return 'crypto';
  }

  if (v === 'other') return 'other';

  // Provider aliases that should count as instant_payment
  if (
    v === 'revolut' ||
    v.includes('revolut') ||
    v === 'zippypay' ||
    v.includes('zippy') ||
    v === 'bank_transfer' ||
    v === 'bank' ||
    v.includes('bank') ||
    v === 'paypal' ||
    v.includes('paypal') ||
    v === 'monzo' ||
    v.includes('monzo')
  ) {
    return 'instant_payment';
  }

  // Legacy
  if (v.includes('cash_or_revolut')) return 'instant_payment';

  return 'other';
}

/**
 * Payment method enum values.
 */
export const PaymentMethod = {
  CASH: 'cash',
  CARD_TAP: 'card_tap',
  INSTANT_PAYMENT: 'instant_payment',
  PAY_ADMIN: 'pay_admin',
  CARD: 'card',
  STRIPE: 'stripe',
  CRYPTO: 'crypto',
  OTHER: 'other',
};
