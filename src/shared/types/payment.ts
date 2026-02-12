// ============================================================
// Unified Payment Types
// Used consistently across frontend and backend
// ============================================================
//
// src/shared/types/payment.ts
//
// Notes:
// - "instant_payment" is currently manual verification (admins confirm).
// - We add common config for link/QR/reference hints across providers.
// - We future-proof for API-verified methods via `VerificationMode` (optional).
// - providerName remains flexible (InstantPaymentProvider | string), matching your varchar DB.
//

/**
 * Core payment methods (excludes web3 - that's a separate flow)
 */
export type PaymentMethod =
  | 'cash'              // Physical cash
  | 'instant_payment'   // Manual-verification instant methods (links/QR/bank transfer/etc.)
  | 'pay_admin'
  | 'card'              // Card tap/reader
  | 'stripe'            // Stripe payments
  | 'other';            // Catch-all

/**
 * Payment method categories (for club configuration)
 */
export type PaymentMethodCategory = Exclude<PaymentMethod, 'cash' | 'pay_admin'>;

/**
 * Verification mode for a payment method
 * - manual: admin confirms (default for instant payment links/QR/bank transfer)
 * - api_verified: verified automatically via provider API/webhooks (future)
 */
export type VerificationMode = 'manual' | 'api_verified';

/**
 * Specific providers within instant_payment category
 *
 * UK-friendly additions:
 * - monzo, starling, wise, cashapp
 * - open_banking_pay_by_bank (future)
 *
 * NOTE: your DB stores provider_name as varchar(64),
 * so you can still store custom strings.
 */
export type InstantPaymentProvider =
  | 'revolut'
  | 'bank_transfer'
  | 'paypal'
  | 'monzo'
  | 'starling'
  | 'wise'
  | 'cashapp'
  // | 'open_banking_pay_by_bank'
  | 'zippypay'
  | 'other';

/**
 * Club payment method configuration
 */
export interface ClubPaymentMethod {
  id: string;
  clubId: string;

  methodCategory: PaymentMethodCategory;

  /**
   * Provider within instant_payment category.
   * Keep as union + string so you can add providers without breaking.
   */
  providerName?: InstantPaymentProvider | string;

  methodLabel: string; // e.g., "Revolut - Main Account"
  displayOrder: number;
  isEnabled: boolean;

  /**
   * Markdown instructions shown to players during join/payment
   */
  playerInstructions?: string;

  methodConfig: PaymentMethodConfig;
}

/**
 * Method-specific configuration union
 */
export type PaymentMethodConfig =
  | InstantPaymentConfig
  | BankTransferConfig
  | ZippyPayConfig
  | StripeConfig
  | GenericConfig;

/**
 * Shared fields for most manual "instant payment" options (links/QR)
 * This is the key upgrade for manual verification + QR support.
 */
export interface InstantPaymentCommonConfig {
  /**
   * Optional payment link/handle link (paypal.me / monzo.me / revolut.me / custom)
   */
  link?: string;

  /**
   * Optional hosted QR code image URL
   */
  qrCodeUrl?: string;

  /**
   * Hint shown to payer e.g. "Use your Name + Team"
   */
  referenceHint?: string;

  /**
   * Hint for admin reconciliation e.g. "Look for £5.00 from John Smith ref TIGERS"
   */
  verificationHint?: string;

  /**
   * Future-proof: how this method is verified.
   * For now your UI can default to 'manual'.
   */
  verificationMode?: VerificationMode;
}

/**
 * Generic config for most instant providers (Revolut/PayPal/Monzo/etc.)
 * If you only need link/QR/hints, this is enough.
 */
export interface InstantPaymentConfig extends InstantPaymentCommonConfig {
  // You can optionally add fields later without changing DB schema.
}

/**
 * Bank transfer config (UK + IE/EU)
 * Still benefits from link/QR + hints (some banks generate QR/payment links).
 */
export interface BankTransferConfig extends InstantPaymentCommonConfig {
  accountName?: string;
  bankName?: string;

  // IE/EU
  iban?: string;
  bic?: string;

  // UK
  sortCode?: string;
  accountNumber?: string;
}

/**
 * ZippyPay config
 * (Keeping your existing field + common config)
 */
export interface ZippyPayConfig extends InstantPaymentCommonConfig {
  merchantId?: string;
}

/**
 * Stripe config (for verified card/web checkout)
 */
export interface StripeConfig {
  publishableKey: string;
  webhookSecret?: string; // Backend only
}

/**
 * Catch-all config type
 */
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

  /**
   * For API-verified methods later (Stripe/OpenBanking/etc.)
   */
  externalTransactionId?: string;

  clubPaymentMethodId?: string;
  extraId?: string;

  claimedAt?: string;
  confirmedAt?: string;
  reconciledAt?: string;

  adminNotes?: string;
}
