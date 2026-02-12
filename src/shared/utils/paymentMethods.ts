//src/shared/utils/paymentMethods.ts
import type { PaymentMethod } from '../types/payment';

/**
 * ✅ CANONICAL: Normalize payment method strings
 * Use this EVERYWHERE (frontend + backend via import)
 */
export function normalizePaymentMethod(raw?: string | null): PaymentMethod {
  if (!raw) return 'other';
  
  const lower = raw.toLowerCase().trim();
  
  // Direct matches
  if (lower === 'cash') return 'cash';
  if (lower === 'instant_payment' || lower === 'instant payment') return 'instant_payment';
  if (lower === 'pay_admin' || lower === 'pay admin' || lower === 'admin') return 'pay_admin'; // ✅ NEW
  if (lower === 'card' || lower === 'card tap') return 'card';
  if (lower === 'stripe') return 'stripe';
  
  // Legacy/variant mappings
  if (lower === 'revolut' || lower.includes('revolut')) return 'instant_payment';
  if (lower === 'zippypay' || lower.includes('zippy')) return 'instant_payment';
  if (lower === 'bank' || lower.includes('bank') || lower === 'bank_transfer') return 'instant_payment';
  if (lower === 'paypal' || lower.includes('paypal')) return 'instant_payment';
  if (lower.includes('cash_or_revolut')) return 'instant_payment'; // Legacy
  
  return 'other';
}


/**
 * Get display label for payment method
 */
export function getPaymentMethodLabel(method: PaymentMethod): string {
  const labels: Record<PaymentMethod, string> = {
    cash: 'Cash',
    instant_payment: 'Instant Payment',
    pay_admin: 'Pay Admin', // ✅ NEW
    card: 'Card Tap',
    stripe: 'Card (Stripe)',
    other: 'Other',
  };
  
  return labels[method] || 'Other';
}

/**
 * Get icon for payment method
 */
export function getPaymentMethodIcon(method: PaymentMethod): string {
  const icons: Record<PaymentMethod, string> = {
    cash: '💶',
    instant_payment: '📱',
    pay_admin: '🧾', // ✅ NEW
    card: '💳',
    stripe: '💳',
    other: '❓',
  };
  
  return icons[method] || '❓';
}
