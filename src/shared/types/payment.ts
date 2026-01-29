// ============================================================
// Unified Payment Types
// Used consistently across frontend and backend
// ============================================================

//src/shared/types/payment.ts

/**
 * Core payment methods (excludes web3 - that's a separate flow)
 */
export type PaymentMethod = 
  | 'cash'              // Physical cash
  | 'instant_payment'   // Revolut, ZippyPay, bank transfer, instant digital
  | 'card'              // Card tap/reader
  | 'stripe'            // Stripe payments
  | 'other';            // Catch-all

/**
 * Payment method categories (for club configuration)
 */
export type PaymentMethodCategory = Exclude<PaymentMethod, 'cash'>;

/**
 * Specific providers within instant_payment category
 */
export type InstantPaymentProvider = 
  | 'revolut'
  | 'bank_transfer'
  | 'zippypay'
  | 'paypal'
  | 'other';

/**
 * Club payment method configuration
 */
export interface ClubPaymentMethod {
  id: string;
  clubId: string;
  methodCategory: PaymentMethodCategory;
  providerName?: InstantPaymentProvider | string;
  methodLabel: string; // e.g., "Revolut - Main Account"
  displayOrder: number;
  isEnabled: boolean;
  playerInstructions?: string; // Markdown
  methodConfig: PaymentMethodConfig;
}

/**
 * Method-specific configuration
 */
export type PaymentMethodConfig = 
  | RevolutConfig
  | BankTransferConfig
  | ZippyPayConfig
  | StripeConfig
  | GenericConfig;

export interface RevolutConfig {
  link?: string; // https://revolut.me/username
  qrCodeUrl?: string;
}

export interface BankTransferConfig {
  iban?: string;
  bic?: string;
  accountName?: string;
  sortCode?: string; // UK
  accountNumber?: string; // UK
  bankName?: string;
}

export interface ZippyPayConfig {
  merchantId?: string;
  qrCodeUrl?: string;
}

export interface StripeConfig {
  publishableKey: string;
  webhookSecret?: string; // Backend only
}

export interface GenericConfig {
  [key: string]: any;
}

/**
 * Payment status flow
 */
export type PaymentStatus = 
  | 'expected'         // Player selected method but hasn't paid
  | 'claimed'          // Player claims they've paid
  | 'confirmed'        // Admin/webhook confirmed payment
  | 'reconciled'       // Included in financial reconciliation
  | 'refunded'         // Payment refunded
  | 'disputed';        // Payment disputed

/**
 * Payment ledger entry
 */
export interface PaymentLedgerEntry {
  id: string;
  roomId: string;
  clubId: string;
  playerId: string;
  ledgerType: 'entry_fee' | 'extra_purchase';
  amount: number;
  currency: string;
  status: PaymentStatus;
  paymentMethod: PaymentMethod;
  paymentSource: 'player_selected' | 'player_claimed' | 'admin_assigned' | 'webhook_auto';
  paymentReference?: string;
  externalTransactionId?: string;
  clubPaymentMethodId?: string;
  extraId?: string;
  claimedAt?: string;
  confirmedAt?: string;
  reconciledAt?: string;
  adminNotes?: string;
}