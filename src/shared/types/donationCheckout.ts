// src/shared/types/donationCheckout.ts
//
// Phase 2 — trackable donation checkout (Stripe / crypto / sumup_api).
//
// This file is intentionally separate from donationButton.ts (Phase 1,
// manual-link buttons) rather than extending it, because the two flows
// share almost nothing at runtime: Phase 1 produces a static <a> embed
// with no backend call at click-time; Phase 2 always calls the backend
// to create a checkout/quote before anything is shown to the supporter.
// ClubDonationButton itself (the row) is extended in-place below since
// the same row now needs to carry amount-tier config regardless of
// which provider it points at.
//
// PHASE 3b — MULTI-METHOD: a donation button can now be linked to
// multiple Tier B payment methods (fundraisely_donation_button_methods).
// What changes here: PublicDonationButtonConfig.method (singular)
// becomes .methods (plural array); UpsertTierBButtonRequest takes
// clubPaymentMethodIds (plural). A donation itself STILL resolves to
// exactly one method — StartDonationCheckoutRequest, ResolvedDonationMethod,
// and everything under "Checkout request/response" below is unchanged,
// since the supporter always ends up choosing one method per donation
// regardless of how many were on offer.

import type { PaymentMethodCategory, PaymentProvider } from './payment';
import type { ClubDonationButton, EligibleDonationPaymentMethod } from './donationButton';

/**
 * ISO currency codes currently known to the frontend's symbol map
 * (ISO_TO_SYMBOL in useCurrency.ts). Kept as a string fallback union —
 * same pattern as PaymentProvider in payment.ts — so a club whose
 * reporting_currency isn't in the known set yet doesn't break typing;
 * useCurrency.ts already falls back gracefully (isoToSymbol returns
 * the raw code if unmapped).
 */
export type ReportingCurrency = 'EUR' | 'GBP' | 'USD' | 'CAD' | 'NGN' | string;

// ─── Provider eligibility (spec section 5, Tier B) ──────────────────────────

/**
 * Providers that can power a *trackable* donation button.
 *
 * Deliberately a closed union (not `PaymentProvider | string`) — the
 * checkout dispatcher switches on this exhaustively, so adding a new
 * trackable provider should be a compile error everywhere it isn't
 * yet handled, not a silent runtime fallthrough.
 *
 * 'sumup_api' is listed now even though no handler exists yet (section
 * 6 is unbuilt) — see TrackableCheckoutDispatchResult below for how an
 * unimplemented provider is represented without removing it from the
 * type.
 */
export type TrackableDonationProvider = 'stripe' | 'crypto' | 'sumup_api';

/**
 * Providers whose checkout flow is "create a session server-side,
 * redirect the browser to a provider-hosted page, webhook confirms
 * later." Stripe today; sumup_api will be identical in shape per spec
 * section 6.2.
 */
export type RedirectCheckoutProvider = 'stripe' | 'sumup_api';

/**
 * Providers whose checkout flow stays in-page: get a quote, the
 * supporter signs in their wallet, we verify on-chain and confirm
 * synchronously. No redirect, no webhook.
 */
export type InPageCheckoutProvider = 'crypto';

// ─── Eligible methods for a given donation button (what the picker shows) ──

/**
 * One selectable provider option in the admin's "which methods to
 * attach" picker (ManageDonationButtonModal.tsx).
 *
 * Slim by design (mirrors EligibleDonationPaymentMethod in
 * donationButton.ts) — the embed/iframe page is public and
 * unauthenticated, so this must never carry method_config secrets
 * (Stripe account internals, SumUp tokens, wallet config beyond the
 * public address).
 */
export interface EligibleTrackableMethod {
  clubPaymentMethodId: string;
  methodCategory: PaymentMethodCategory;
  providerName: TrackableDonationProvider;
  methodLabel: string;
  isEnabled: boolean;
}

/**
 * Amount-tier configuration, stored on fundraisely_club_donation_buttons
 * (spec section 4.2). Lives on the same row as Phase 1's button config
 * since both describe "how this one button behaves" — splitting into a
 * child table only makes sense if tiers ever need independent ordering
 * or per-tier labels (spec flags this as a revisit-later, not now).
 */
export interface DonationAmountConfig {
  allowCustomAmount: boolean;
  presetAmounts: number[]; // max 4, club's reporting currency, validated server-side
}

/**
 * Branding colors for the donation widget, stored on
 * fundraisely_club_donation_buttons (3 new columns). Deliberately three
 * explicit colors rather than two + an auto-computed contrast color —
 * the club picks all three so nothing is guessed on their behalf.
 *
 * - primaryColor: the widget's accent color — donate button background,
 *   selected-amount highlight, active borders.
 * - backgroundColor: the widget card's own background (NOT the page
 *   behind it, which the embed has no control over).
 * - textOnPrimaryColor: text/icon color rendered ON TOP of
 *   primaryColor (e.g. the donate button's own label).
 *
 * No contrast validation is performed server-side or client-side —
 * this is a deliberate product decision (an admin's own brand colors
 * are their call, not something to second-guess), so it's possible to
 * save a combination that's hard to read. Hex format (#rrggbb) IS
 * validated, since that's a correctness check, not a taste judgment.
 *
 * Logo upload is explicitly out of scope for this revision — a fuller
 * club-wide branding system (colors + logo, reused across the whole
 * product) is planned later; this is a narrower, donation-widget-only
 * stopgap ahead of that.
 */
export interface DonationBrandingConfig {
  primaryColor: string;
  backgroundColor: string;
  textOnPrimaryColor: string;
}

export const DEFAULT_DONATION_BRANDING: DonationBrandingConfig = {
  primaryColor: '#157f85',
  backgroundColor: '#ffffff',
  textOnPrimaryColor: '#ffffff',
};

/**
 * Extends the Phase 1 button row with Phase 2 fields. Phase 1 buttons
 * (manual link methods) will have amountConfig present but unused —
 * the manual-link embed path never reads it.
 */
export interface ClubDonationButtonV2 extends ClubDonationButton {
  amountConfig: DonationAmountConfig;
}

/**
 * One resolved, currently-usable method linked to a donation button, as
 * returned to the public embed page. Deliberately a different (and
 * smaller) shape than EligibleTrackableMethod, which is for the admin's
 * "pick methods to attach" list (needs methodLabel + isEnabled to
 * render checkboxes for options that might be disabled). The embed page
 * already knows every entry it gets back is valid and enabled —
 * getPublicConfig filters out anything that isn't before returning —
 * so there's nothing for the embed to branch on per-item; it just needs
 * the category/provider to render the right choice and, later, the
 * right next step once one is chosen.
 *
 * PHASE 3b: this was previously the single shape under
 * PublicDonationButtonConfig.method (singular). It's unchanged in its
 * own fields — only its cardinality on the parent type changed, see
 * PublicDonationButtonConfig.methods below.
 */
export interface ResolvedDonationMethod {
  clubPaymentMethodId: string;
  methodCategory: PaymentMethodCategory;
  providerName: TrackableDonationProvider;
}

/**
 * What the public embed page fetches to render the picker. Returned by
 * a new public/unauthenticated GET — distinct from the existing
 * authenticated /donation-buttons/:clubId/manage, which is for the
 * club admin UI and should keep returning full management data.
 *
 * PHASE 3b: `methods` is now a LIST, not a single `method`. A donation
 * button can have multiple Tier B payment methods linked to it
 * (fundraisely_donation_button_methods); the supporter picks one at
 * checkout time if there's more than one on offer. This list is
 * pre-filtered server-side to only methods that are currently enabled
 * and eligible — getPublicConfig throws if the filtered list would be
 * empty, so the embed never has to handle a zero-length methods array
 * itself.
 *
 * If `methods.length === 1`, the embed page should skip any
 * provider-choice UI and behave exactly as the old single-method flow
 * did — there's nothing to choose between.
 */
export interface PublicDonationButtonConfig {
  clubId: string;
  buttonLabel: string;
  buttonTitle?: string | null;
  currency: ReportingCurrency;
  amountConfig: DonationAmountConfig;
  branding: DonationBrandingConfig;
  methods: ResolvedDonationMethod[];
}

// ─── Admin save request (PUT /donation-buttons/:clubId, Tier B branch) ─────

/**
 * Per-method save outcome reported back after upsertTierBButton.
 * `reason` mirrors DonationCheckoutService.js's drop reasons exactly —
 * keep these two in sync if either side adds a new one.
 */
export type DroppedMethodReason = 'not_found' | 'disabled' | 'not_eligible';

export interface DroppedMethod {
  clubPaymentMethodId: string;
  reason: DroppedMethodReason;
}

/**
 * PHASE 3b: clubPaymentMethodIds (plural) replaces the old singular
 * clubPaymentMethodId field for the Tier B save path. Per product
 * decision, the backend does NOT reject the whole save if some
 * submitted ids turn out to be invalid (deleted, disabled, no longer
 * eligible) — it saves whichever ones are still valid and reports the
 * rest back via the response's droppedMethodIds, so the modal can
 * surface "X was dropped because Y" instead of either silently losing
 * the admin's other selections or blocking the save entirely over one
 * stale id.
 */
export interface UpsertTierBButtonRequest {
  isEnabled: boolean;
  buttonLabel: string;
  buttonTitle?: string;
  clubPaymentMethodIds: string[];
  allowCustomAmount: boolean;
  presetAmounts: number[];
  branding: DonationBrandingConfig;
}

/**
 * Response shape for the combined PUT /donation-buttons/:clubId route
 * when the Tier B branch was taken. `droppedMethodIds` is empty when
 * every submitted id was valid — the modal only needs to show a
 * warning when this is non-empty.
 */
export interface UpsertTierBButtonResponse {
  ok: true;
  donationButton: ClubDonationButton;
  amountConfig: DonationAmountConfig;
  branding: DonationBrandingConfig;
  eligibleManualMethods: EligibleDonationPaymentMethod[];
  eligibleTrackableMethods: EligibleTrackableMethod[];
  linkedTrackableMethodIds: string[]; // which of eligibleTrackableMethods are currently attached
  droppedMethodIds: DroppedMethod[];
}

// ─── Checkout request/response (POST /api/donations/:clubId/checkout) ──────
//
// Follows the same convention as every other *Service.ts in this codebase
// (DonationButtonService, StripeConnectService): BaseService.request<T>()
// throws a real Error (with backend error fields spread onto it) on any
// non-2xx response. So unlike the donationButton.ts management types,
// there is no `ok: false` variant here for "provider not yet supported" —
// that's a 4xx the backend route returns (mapErrorToStatus-style) and the
// frontend catches like any other error, not a 200 the caller has to
// branch on. Keeps one failure-handling pattern across the whole app.
//
// UNCHANGED by Phase 3b — the supporter still picks exactly ONE method
// per donation, regardless of how many were offered.

export interface StartDonationCheckoutRequest {
  clubPaymentMethodId: string;
  amount: number;
  // currency is NOT sent by the client — the backend derives it from the
  // club's reporting_currency (see register/login in AuthService.js,
  // useCurrency.ts on the frontend). A public, unauthenticated endpoint
  // should never trust a client-supplied currency for a money amount;
  // the backend is the only source of truth for which currency a given
  // club's donations are in.
  donorName?: string;
  donorEmail?: string;
  /**
   * Which of FundRaisely's own domains (.ie / .co.uk) this request is
   * coming from — NOT the club's own website domain, which is wherever
   * they happened to paste the <iframe> embed snippet and is irrelevant
   * here. Required for redirect-based providers (Stripe) so
   * success_url/cancel_url land back on the correct FundRaisely domain.
   * Validated server-side against a fixed allowlist before use — a
   * value outside that allowlist is rejected, not silently defaulted,
   * so this can never be abused as an open redirect even though it's
   * client-supplied on a public endpoint.
   */
  appOrigin: string;
}

/**
 * Discriminated on provider so the frontend never has to guess what
 * shape it got back. Redirect providers give a URL; crypto gives
 * everything needed to render an in-page wallet-connect + quote step.
 *
 * Only the success shape lives here — "provider not yet supported"
 * (e.g. sumup_api before section 6 is built) is a thrown 4xx, not a
 * member of this union. See note above.
 */
export type StartDonationCheckoutResponse =
  | RedirectCheckoutResult
  | CryptoCheckoutResult;

export interface RedirectCheckoutResult {
  ok: true;
  provider: RedirectCheckoutProvider;
  donationId: string; // fundraisely_donations.id, status 'pending'
  redirectUrl: string; // Stripe Checkout URL / SumUp hosted_checkout_url
}

/**
 * Crypto never goes through this endpoint's redirect path — quote +
 * on-chain confirm reuse the existing /quiz/crypto-quote and
 * /quiz/crypto-donation/confirm-shaped flow, scoped to club-level
 * donations rather than a quiz room. donationId here is created
 * up front in 'pending' status so the in-page flow has something to
 * attach the eventual confirmation to, same as the redirect path.
 */
export interface CryptoCheckoutResult {
  ok: true;
  provider: 'crypto';
  donationId: string;
  walletAddress: string; // recipient — from SolanaWalletConfig
  // Quote is fetched separately once the supporter picks a token,
  // via the existing quote-style endpoint scoped to this donationId.
}

// ─── Ledger row (mirrors fundraisely_donations table, spec section 4.1) ────
//
// Resolves spec open question 11.1: this is deliberately a SEPARATE table
// from fundraisely_quiz_payment_ledger, not a reuse of it. Reasoning:
//
// - quizPaymentLedgerService.js is built entirely around room-scoped,
//   player-scoped identity — roomId and playerId are required on nearly
//   every function (createExpectedPayment, claimPayment, getPlayerLedger),
//   plus ticket_id dedup logic. A club-level donation from the public embed
//   has neither a room nor a player; forcing a fake "donations room" per
//   club just to satisfy that schema would drag in irrelevant columns
//   (ticket_id, extra_id) and complicate every query that needs to
//   distinguish real quiz activity from donation noise.
// - The status vocabularies don't line up. Ledger statuses model a
//   human-claim-then-admin-confirms workflow: expected, claimed, confirmed,
//   reconciled, refunded, disputed, awaiting_crypto_transfer. Donations are
//   machine-only — pending, confirmed, failed, expired — there's no
//   claiming or disputing step, since the supporter is never logged in and
//   no admin manually approves a webhook/API confirmation.

export type DonationStatus = 'pending' | 'confirmed' | 'failed' | 'expired';

export interface FundraiselyDonation {
  id: string;
  clubId: string;

  clubDonationButtonId: string | null;
  clubPaymentMethodId: string;

  paymentMethodCategorySnapshot: PaymentMethodCategory;
  paymentProviderSnapshot: PaymentProvider | null;
  paymentMethodLabelSnapshot: string | null;

  amount: number;
  currency: ReportingCurrency;

  status: DonationStatus;

  externalCheckoutId?: string | null; // Stripe session id / SumUp checkout id
  externalTransactionId?: string | null; // Stripe payment_intent / on-chain tx signature

  donorName?: string | null;
  donorEmail?: string | null;

  createdAt: string;
  confirmedAt?: string | null;
  updatedAt: string;
}

/**
 * Club-facing "donations received" list (spec section 8,
 * GET /api/donations/:clubId/list).
 */
export interface ListDonationsResponse {
  ok: true;
  donations: FundraiselyDonation[];
  total: number;
  page: number;
  pageSize: number;
}