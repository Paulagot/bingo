// src/shared/types/donationButton.ts
//
// UPDATED (Phase 3b) — ClubDonationButton's single clubPaymentMethodId
// is replaced by clubPaymentMethodIds: string[], and
// ClubDonationButtonWithPaymentMethod's single `paymentMethod` is
// replaced by `paymentMethods: []`, reflecting the new
// fundraisely_donation_button_methods join table — a button can now be
// linked to multiple Tier B (trackable) methods. Tier A (manual link)
// buttons still only ever have exactly one method in practice — the
// backend enforces Tier A/Tier B mutual exclusivity and Tier A always
// saves a single-element array — but the TYPE allows a list either way,
// since the row itself doesn't know which tier it's in without looking
// at the linked method(s).
//
// GetDonationButtonManageResponse's shape combines Tier A (manual link)
// and Tier B (Stripe/crypto) data, matching donationButtonRoutes.js.
// eligiblePaymentMethods (singular list) is replaced by
// eligibleManualMethods + eligibleTrackableMethods (two separate
// lists), and amountConfig + linkedTrackableMethodIds are new.

import type { PaymentProvider } from './payment';
import type { DonationAmountConfig, DonationBrandingConfig, EligibleTrackableMethod, DroppedMethod } from './donationCheckout';

/**
 * One domain a club has registered as a legitimate place for their
 * donate.js widget to render. Stored in fundraisely_club_allowed_domains.
 * This is a short-term, button-level field ahead of the planned proper
 * club onboarding flow, where domain registration will move to entity
 * setup — see migration 001_club_allowed_domains.sql.
 */
export interface AllowedDomain {
  hostname: string;
}
 
export type DroppedDomainReason = 'invalid';
 
export interface DroppedDomain {
  input: string;
  reason: DroppedDomainReason;
}

export interface ClubDonationButton {
  id: string;
  clubId: string;

  isEnabled: boolean;

  buttonLabel: string;
  buttonTitle?: string | null;

  /**
   * PHASE 3b: plural — every clubPaymentMethodId currently linked to
   * this button via fundraisely_donation_button_methods, in
   * display_order. For a Tier A (manual link) button this will always
   * be a single-element array (Tier A and Tier B are mutually
   * exclusive on one button, and Tier A has no concept of multiple
   * linked methods) — callers that know they're in the Tier A case can
   * safely read clubPaymentMethodIds[0], but should not assume that
   * for a button generally without checking which tier it is first.
   */
  clubPaymentMethodIds: string[];

  createdAt?: string;
  updatedAt?: string;
}

export interface ClubDonationButtonWithPaymentMethod extends ClubDonationButton {
  /**
   * PHASE 3b: plural — was a single `paymentMethod` object. Empty
   * array if every linked method has since been deleted (button still
   * exists but has nothing usable attached — same edge case the old
   * single `paymentMethod: null` represented).
   *
   * Tier B entries don't populate `link` (no single static URL for a
   * checkout-based method) — `link` is only meaningful for Tier A.
   */
  paymentMethods: {
    id: string;
    providerName: PaymentProvider | null;
    methodLabel: string;
    link: string;
    /**
     * Whether this linked payment method is currently enabled. If
     * false, this entry is effectively dead weight on the button —
     * for Tier A (where there's only ever one), that makes the whole
     * button inactive even if isEnabled (the button's own toggle) is
     * true. For Tier B, an individual disabled method here just means
     * the supporter won't be offered it; the button overall still
     * works if at least one OTHER linked method is enabled.
     */
    isEnabled: boolean;
  }[];
}

export interface UpsertClubDonationButtonRequest {
  isEnabled: boolean;
  buttonLabel: string;
  buttonTitle?: string | null;
  allowedDomains?: string[]; 
  /**
   * PHASE 3b: plural for the Tier B save path
   * (DonationCheckoutService.upsertTierBButton). Tier A's own upsert
   * (DonationButtonService.upsert) still takes a single
   * clubPaymentMethodId — see donationButtonRoutes.js's PUT handler,
   * which inspects the FIRST id here to decide which tier's service to
   * call, then for Tier A passes clubPaymentMethodIds[0] through as
   * that service's singular field. Sending more than one id when the
   * resolved tier turns out to be Tier A is rejected by the route
   * (manual-link buttons have no concept of "supporter picks one of
   * several" — there's no checkout step to choose at).
   */
  clubPaymentMethodIds: (string | number)[];
  /**
   * Only meaningful when clubPaymentMethodIds resolves to Tier B
   * methods — ignored by the backend's Tier A upsert path. Sending
   * these alongside Tier A method ids is harmless (they're simply not
   * read), but the modal should only show/collect them once at least
   * one Tier B method is selected, to avoid implying they do anything
   * for manual-link buttons.
   */
  allowCustomAmount?: boolean;
  presetAmounts?: number[];
  /**
   * Branding applies regardless of tier — both a Tier A manual-link
   * button and a Tier B trackable button render the same widget shell
   * (button itself, and for Tier B the full amount-picker card), so
   * this is required on every save rather than optional alongside the
   * Tier-B-only amount fields above.
   */
  branding: DonationBrandingConfig;
}

/**
 * Slim shape returned for the "pick a payment method" dropdown/checkbox
 * list (Tier A / manual-link section only — Tier B's equivalent is
 * EligibleTrackableMethod in donationCheckout.ts).
 *
 * Deliberately excludes addedBy/editedBy/full methodConfig per the
 * public-exposure rules — only what the admin needs to choose a
 * method and understand why it might not be selectable.
 *
 * Includes disabled-but-otherwise-eligible methods (right category,
 * has a link, allowed provider) so the admin can see *why* a
 * previously-selected method disappeared rather than have it
 * silently vanish from the list.
 */
export interface EligibleDonationPaymentMethod {
  id: string;
  providerName: PaymentProvider | null;
  methodLabel: string;
  hasLink: boolean;
  isEnabled: boolean;
}

/**
 * Combined management response — Tier A and Tier B data side by side.
 * See donationButtonRoutes.js's GET /donation-buttons/:clubId/manage
 * for the server side of this shape.
 *
 * PHASE 3b: added linkedTrackableMethodIds so the modal can pre-check
 * the right boxes in the Tier B multi-select without having to
 * cross-reference donationButton.clubPaymentMethodIds against
 * eligibleTrackableMethods itself (the former includes Tier A ids too
 * when the button is Tier A, so it's not safe for the modal to treat
 * it as "the Tier B selection" directly).
 */
export interface GetDonationButtonManageResponse {
  ok: boolean;
  donationButton: ClubDonationButtonWithPaymentMethod | null;
  amountConfig: DonationAmountConfig;
  branding: DonationBrandingConfig;
  eligibleManualMethods: EligibleDonationPaymentMethod[];
  eligibleTrackableMethods: EligibleTrackableMethod[];
  linkedTrackableMethodIds: string[];
  allowedDomains: string[]; 
}

/**
 * Response shape specifically for PUT /donation-buttons/:clubId (the
 * save call) — adds droppedMethodIds on top of the same fields GET
 * /manage returns. Only the save path can ever report dropped
 * methods (a method becoming invalid between page load and the save
 * landing), so this is intentionally a separate type from
 * GetDonationButtonManageResponse rather than adding an always-empty
 * field to every GET /manage response. DonationButtonService.save()
 * (the frontend service) should return this type, not
 * GetDonationButtonManageResponse.
 */
export interface SaveDonationButtonResponse extends GetDonationButtonManageResponse {
  droppedMethodIds: DroppedMethod[];
   droppedDomains: DroppedDomain[]; 
}

export interface DonationButtonEmbedResponse {
  ok: boolean;
  embedHtml: string;
  donationButton: ClubDonationButtonWithPaymentMethod;
}