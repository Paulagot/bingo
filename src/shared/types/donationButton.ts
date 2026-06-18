// src/shared/types/donationButton.ts
//
// UPDATED — GetDonationButtonManageResponse's shape changed to combine
// Tier A (manual link) and Tier B (Stripe/crypto) data, matching the
// new donationButtonRoutes.js. eligiblePaymentMethods (singular list)
// is replaced by eligibleManualMethods + eligibleTrackableMethods
// (two separate lists), and amountConfig is new.

import type { PaymentProvider } from './payment';
import type { DonationAmountConfig, EligibleTrackableMethod } from './donationCheckout';

export interface ClubDonationButton {
  id: string;
  clubId: string;

  isEnabled: boolean;

  buttonLabel: string;
  buttonTitle?: string | null;

  clubPaymentMethodId: string;

  createdAt?: string;
  updatedAt?: string;
}

export interface ClubDonationButtonWithPaymentMethod extends ClubDonationButton {
  paymentMethod: {
    id: string;
    providerName: PaymentProvider | null;
    methodLabel: string;
    link: string;
    /**
     * Whether the linked payment method is currently enabled.
     * If false, the donation button is treated as inactive even
     * though isEnabled (the button's own toggle) may be true.
     *
     * Only meaningful for Tier A (manual link) — Tier B methods don't
     * populate `link` (they have no single static URL), so this field
     * is null/absent when the button's configured method is Tier B.
     * The modal should check eligibleTrackableMethods to find the
     * matching method's enabled state for Tier B buttons instead.
     */
    isEnabled: boolean;
  } | null;
}

export interface UpsertClubDonationButtonRequest {
  isEnabled: boolean;
  buttonLabel: string;
  buttonTitle?: string | null;
  clubPaymentMethodId: string | number;
  /**
   * Only meaningful when clubPaymentMethodId resolves to a Tier B
   * method — ignored by the backend's Tier A upsert path. Sending
   * these alongside a Tier A method id is harmless (they're simply
   * not read), but the modal should only show/collect them once a
   * Tier B method is selected, to avoid implying they do anything for
   * manual-link buttons.
   */
  allowCustomAmount?: boolean;
  presetAmounts?: number[];
}

/**
 * Slim shape returned for the "pick a payment method" dropdown
 * (Tier A / manual-link section only — Tier B's equivalent is
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
 */
export interface GetDonationButtonManageResponse {
  ok: boolean;
  donationButton: ClubDonationButtonWithPaymentMethod | null;
  amountConfig: DonationAmountConfig;
  eligibleManualMethods: EligibleDonationPaymentMethod[];
  eligibleTrackableMethods: EligibleTrackableMethod[];
}

export interface DonationButtonEmbedResponse {
  ok: boolean;
  embedHtml: string;
  donationButton: ClubDonationButtonWithPaymentMethod;
}