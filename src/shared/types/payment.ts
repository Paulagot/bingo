// ============================================================
// Unified Payment Types
// Used consistently across frontend and backend
// ============================================================
//
// src/shared/types/payment.ts
//
// Notes:
// - "instant_payment" is currently manual verification (admins confirm).
// - "crypto" is currently manual verification for donation-only quiz flows.
// - For now crypto supports Solana public wallet addresses only.
// - providerName remains flexible, matching your varchar DB.
//

/**
 * Core payment methods.
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
 * Payment method categories used for club configuration.
 */
export type PaymentMethodCategory = Exclude<PaymentMethod, 'cash' | 'pay_admin'>;

/**
 * Verification mode for a payment method.
 *
 * manual:
 * Admin/host confirms payment manually.
 *
 * api_verified:
 * Verified automatically via provider API/webhook in future.
 *
 * onchain_verified:
 * Future crypto flow where you verify a chain transaction automatically.
 */
export type VerificationMode = 'manual' | 'api_verified' | 'onchain_verified';

/**
 * Specific providers within instant_payment category.
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
 * Specific providers within crypto category.
 */
export type CryptoPaymentProvider = 'solana_wallet';

/**
 * Any provider value your configured club payment methods may use.
 *
 * Keep string fallback because provider_name is varchar in DB and this keeps
 * future additions from breaking old records.
 */
export type PaymentProvider =
  | InstantPaymentProvider
  | CryptoPaymentProvider
  | 'stripe'
  | 'card'
  | 'other'
  | string;

/**
 * Club payment method configuration.
 */
export interface ClubPaymentMethod {
  id: string;
  clubId: string;

  methodCategory: PaymentMethodCategory;

  /**
   * Provider within the selected category.
   *
   * Examples:
   * - instant_payment + revolut
   * - instant_payment + bank_transfer
   * - crypto + solana_wallet
   */
  providerName?: PaymentProvider | null;

  methodLabel: string;
  displayOrder: number;
  isEnabled: boolean;

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
  | InstantPaymentConfig
  | BankTransferConfig
  | ZippyPayConfig
  | StripeConfig
  | SolanaWalletConfig
  | GenericConfig;

/**
 * Shared fields for most manual instant payment options.
 */
export interface InstantPaymentCommonConfig {
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
   * For now most non-Stripe/non-card methods are manual.
   */
  verificationMode?: VerificationMode;
}

/**
 * Generic config for most instant providers.
 */
export interface InstantPaymentConfig extends InstantPaymentCommonConfig {
  // Add provider-specific fields later without changing DB schema.
}

/**
 * Bank transfer config for UK + IE/EU.
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
 * ZippyPay config.
 */
export interface ZippyPayConfig extends InstantPaymentCommonConfig {
  merchantId?: string;
}

/**
 * Stripe config.
 */
export interface StripeConfig {
  publishableKey?: string;
  webhookSecret?: string;
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
  verificationMode?: 'manual' | 'onchain_verified';
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

  paymentMethod: PaymentMethod;
  paymentSource:
    | 'player_selected'
    | 'player_claimed'
    | 'admin_assigned'
    | 'webhook_auto'
    | 'onchain_auto';

  paymentReference?: string;

  /**
   * For API/on-chain verified methods later.
   */
  externalTransactionId?: string;
  transactionSignature?: string;

  clubPaymentMethodId?: string;
  extraId?: string;

  claimedAt?: string;
  confirmedAt?: string;
  reconciledAt?: string;

  adminNotes?: string;
}
