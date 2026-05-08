// src/shared/utils/paymentMethods.ts

import type { PaymentMethod } from '../types/payment';

/**
 * Normalize payment method strings.
 *
 * Important:
 * - card_tap means in-person CardTap on the night.
 * - card means generic/card-terminal/legacy card payment.
 * - stripe means online Stripe checkout.
 */
export function normalizePaymentMethod(raw?: string | null): PaymentMethod {
  if (!raw) return 'other';

  const lower = raw.toLowerCase().trim();

  // Direct matches
  if (lower === 'cash') return 'cash';

  // CardTap must stay separate from generic "card" for reports.
  if (
    lower === 'card_tap' ||
    lower === 'card tap' ||
    lower === 'cardtap'
  ) {
    return 'card_tap';
  }

  if (
    lower === 'instant_payment' ||
    lower === 'instant payment' ||
    lower === 'instant' ||
    lower === 'manual'
  ) {
    return 'instant_payment';
  }

  if (
    lower === 'pay_admin' ||
    lower === 'pay admin' ||
    lower === 'pay_host' ||
    lower === 'pay host' ||
    lower === 'admin'
  ) {
    return 'pay_admin';
  }

  if (
    lower === 'card' ||
    lower === 'credit_card' ||
    lower === 'debit_card'
  ) {
    return 'card';
  }

  if (lower === 'stripe' || lower === 'stripe_checkout') {
    return 'stripe';
  }

  if (lower === 'crypto' || lower === 'web3' || lower === 'solana') {
    return 'crypto';
  }

  // Provider aliases that should count as instant_payment
  if (lower === 'revolut' || lower.includes('revolut')) {
    return 'instant_payment';
  }

  if (lower === 'zippypay' || lower.includes('zippy')) {
    return 'instant_payment';
  }

  if (
    lower === 'bank' ||
    lower === 'bank_transfer' ||
    lower.includes('bank')
  ) {
    return 'instant_payment';
  }

  if (lower === 'paypal' || lower.includes('paypal')) {
    return 'instant_payment';
  }

  if (lower === 'monzo' || lower.includes('monzo')) {
    return 'instant_payment';
  }

  if (lower.includes('cash_or_revolut')) {
    return 'instant_payment';
  }

  return 'other';
}

/**
 * Get display label for payment method.
 */
export function getPaymentMethodLabel(method: PaymentMethod): string {
  const labels: Record<PaymentMethod, string> = {
    cash: 'Cash',
    card_tap: 'CardTap on the Night',
    instant_payment: 'Manual Payment',
    pay_admin: 'Pay at the Door',
    card: 'Card',
    stripe: 'Card (Stripe)',
    crypto: 'Crypto',
    other: 'Other',
  };

  return labels[method] || 'Other';
}

/**
 * Get icon for payment method.
 */
export function getPaymentMethodIcon(method: PaymentMethod): string {
  const icons: Record<PaymentMethod, string> = {
    cash: '💶',
    card_tap: '💳',
    instant_payment: '📱',
    pay_admin: '🧾',
    card: '💳',
    stripe: '💳',
    crypto: '🪙',
    other: '❓',
  };

  return icons[method] || '❓';
}
