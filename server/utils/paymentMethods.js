// server/utils/paymentMethods.js

/**
 * Normalize payment method strings to consistent enum values
 * Matches frontend: src/shared/types/payment.ts PaymentMethod enum
 */
export function normalizePaymentMethod(value) {
  if (!value) return 'unknown';
  
  const v = String(value).toLowerCase().trim();
  
  // Web3
  if (v === 'web3') return 'web3';
  
  // Instant payment providers
  if (['revolut', 'bank_transfer', 'bank', 'zippypay', 'zippy', 'instant_payment', 'instant'].includes(v)) {
    return 'instant_payment';
  }
  
  // Pay admin/host directly
  if (['cash', 'pay_admin', 'pay_host', 'cash_or_revolut'].includes(v)) {
    return 'pay_admin';
  }
  
  // Card payments
  if (['card', 'credit_card', 'debit_card'].includes(v)) {
    return 'card';
  }
  
  // Stripe
  if (['stripe', 'stripe_checkout'].includes(v)) {
    return 'stripe';
  }
  
  // Other
  if (v === 'other') return 'other';
  
  // Unknown
  return 'unknown';
}

/**
 * Payment method enum values (kept in sync with frontend)
 */
export const PaymentMethod = {
  WEB3: 'web3',
  INSTANT_PAYMENT: 'instant_payment',
  PAY_ADMIN: 'pay_admin',
  CARD: 'card',
  STRIPE: 'stripe',
  OTHER: 'other',
  UNKNOWN: 'unknown',
};