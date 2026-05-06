// ============================================================
// Unified Payment Types
// Used consistently across frontend and backend
// ============================================================
//
// src/shared/types/payment.ts
//
// DB alignment:
// fundraisely_club_payment_methods.method_category is:
// enum('instant_payment','crypto','card','stripe','other')
//
// Naming note:
// - "instant_payment" is the existing DB/internal value.
// - In the UI, display "instant_payment" as "Manual payments".
// - Manual payments include cash, Revolut, bank transfer, PayPal, etc.
// - Crypto payments are verified in the current crypto flow.
// - Stripe/card payments are verified by Stripe/webhook flow.
// ============================================================

/**
 * Broad/legacy payment method values used by older quiz/player/ledger flows.
 *
 * New club-configured flows should prefer:
 * - clubPaymentMethodId
 * - methodCategory
 * - providerName
 * - snapshots on the ledger/report where possible
 */
export type PaymentMethod =
  | 'cash'
  | 'instant_payment'
  | 'crypto'
  | 'pay_admin'
  | 'card'
  | 'stripe'
  | 'other';

/**
 * Payment method categories used by club configuration.
 *
 * Must match the DB enum:
 * fundraisely_club_payment_methods.method_category
 */
export type PaymentMethodCategory =
  | 'instant_payment'
  | 'crypto'
  | 'card'
  | 'stripe'
  | 'other';

/**
 * Verification mode for a payment method.
 *
 * This is not currently a top-level DB column.
 * Store this inside method_config where needed, or infer it from category/provider.
 */
export type VerificationMode =
  | 'manual'
  | 'api_verified'
  | 'onchain_verified';

/**
 * Providers within the manual payment category.
 *
 * Internal category: instant_payment
 * UI label: Manual payment
 */
export type InstantPaymentProvider =
  | 'cash'
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
 * Providers within the crypto category.
 */
export type CryptoPaymentProvider = 'solana_wallet';

/**
 * Providers within card/stripe categories.
 */
export type CardPaymentProvider = 'stripe' | 'card';

/**
 * Any provider value your configured club payment methods may use.
 *
 * Keep string fallback because provider_name is varchar in DB and this keeps
 * future additions from breaking old records.
 */
export type PaymentProvider =
  | InstantPaymentProvider
  | CryptoPaymentProvider
  | CardPaymentProvider
  | string;

/**
 * Club payment method configuration.
 *
 * This maps to fundraisely_club_payment_methods, using camelCase in frontend.
 */
export interface ClubPaymentMethod {
  id: string;
  clubId: string;

  methodCategory: PaymentMethodCategory;

  /**
   * Provider within the selected category.
   *
   * Examples:
   * - instant_payment + cash
   * - instant_payment + revolut
   * - instant_payment + bank_transfer
   * - crypto + solana_wallet
   * - stripe + stripe
   */
  providerName?: PaymentProvider | null;

  /**
   * Club-controlled display name.
   *
   * Examples:
   * - "Cash at the door"
   * - "Official Club Revolut"
   * - "Coach Paula Revolut"
   * - "Club bank transfer"
   * - "Solana donations wallet"
   */
  methodLabel: string;

  displayOrder: number;
  isEnabled: boolean;

  /**
   * True where funds go to an official club/charity account.
   * False where funds go to a host/admin/coach/member account.
   */
  isOfficialClubAccount?: boolean;

  /**
   * Markdown/plain instructions shown to players during join/payment.
   */
  playerInstructions?: string;

  methodConfig: PaymentMethodConfig;
}

/**
 * Method-specific configuration union.
 */
export type PaymentMethodConfig =
  | CashPaymentConfig
  | InstantPaymentConfig
  | BankTransferConfig
  | ZippyPayConfig
  | StripeConfig
  | SolanaWalletConfig
  | GenericConfig;

/**
 * Shared fields for most manual payment options.
 */
export interface ManualPaymentCommonConfig {
  /**
   * Optional payment link/handle link.
   *
   * Examples:
   * - paypal.me
   * - monzo.me
   * - revolut.me
   */
  link?: string;

  /**
   * Optional hosted QR code image URL.
   */
  qrCodeUrl?: string;

  /**
   * Hint shown to payer.
   *
   * Example:
   * "Use your name + team name as reference."
   */
  referenceHint?: string;

  /**
   * Hint for admin reconciliation.
   *
   * Example:
   * "Look for €5.00 from John Smith."
   */
  verificationHint?: string;

  /**
   * Stored in JSON, not currently a top-level DB column.
   */
  verificationMode?: VerificationMode;
}

/**
 * Backwards-compatible alias.
 *
 * Existing code may still refer to InstantPaymentCommonConfig.
 */
export interface InstantPaymentCommonConfig extends ManualPaymentCommonConfig {}

/**
 * Cash config.
 *
 * Cash has no link, wallet, IBAN, or API config requirement.
 */
export interface CashPaymentConfig {
  collectionInstructions?: string;
  referenceHint?: string;
  verificationHint?: string;
  verificationMode?: 'manual';
}

/**
 * Generic config for most manual payment providers.
 */
export interface InstantPaymentConfig extends ManualPaymentCommonConfig {
  // Add provider-specific fields later without changing DB schema.
}

/**
 * Bank transfer config for UK + IE/EU.
 */
export interface BankTransferConfig extends ManualPaymentCommonConfig {
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
 * ZippyPay config.
 */
export interface ZippyPayConfig extends ManualPaymentCommonConfig {
  merchantId?: string;
}

/**
 * Stripe config.
 */
export interface StripeConfig {
  publishableKey?: string;
  webhookSecret?: string;
  verificationMode?: 'api_verified';
  connect?: {
    accountId?: string;
    detailsSubmitted?: boolean;
    chargesEnabled?: boolean;
    payoutsEnabled?: boolean;
  };
}

/**
 * Solana wallet config.
 *
 * For now this is a public wallet address only.
 * Never store seed phrases/private keys here.
 */
export interface SolanaWalletConfig {
  chain: 'solana';
  walletAddress: string;
  verificationMode?: 'onchain_verified';
}

/**
 * Catch-all config type.
 */
export interface GenericConfig {
  [key: string]: any;
}

/**
 * Payment status flow.
 */
export type PaymentStatus =
  | 'expected'
  | 'claimed'
  | 'confirmed'
  | 'reconciled'
  | 'refunded'
  | 'disputed'
  | 'awaiting_crypto_transfer';

/**
 * Payment ledger entry.
 */
export interface PaymentLedgerEntry {
  id: string;
  roomId: string;
  clubId: string;
  playerId: string;

  ledgerType: 'entry_fee' | 'extra_purchase' | 'donation';
  amount: number;
  currency: string;

  status: PaymentStatus;

  /**
   * Legacy broad method.
   *
   * For new records, also store clubPaymentMethodId where possible.
   */
  paymentMethod: PaymentMethod;

  paymentSource:
    | 'player_selected'
    | 'player_claimed'
    | 'admin_assigned'
    | 'webhook_auto'
    | 'onchain_auto';

  paymentReference?: string;

  /**
   * For API/on-chain verified methods.
   */
  externalTransactionId?: string;
  transactionSignature?: string;

  clubPaymentMethodId?: string;
  extraId?: string;

  /**
   * Optional report-safe snapshots.
   *
   * These protect reports if a club later renames/disables/deletes a method.
   */
  paymentMethodCategorySnapshot?: PaymentMethodCategory;
  paymentProviderSnapshot?: PaymentProvider | null;
  paymentMethodLabelSnapshot?: string;
  isOfficialClubAccountSnapshot?: boolean;

  claimedAt?: string;
  confirmedAt?: string;
  reconciledAt?: string;

  adminNotes?: string;
}
