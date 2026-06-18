// src/shared/types/donationButton.ts

import type { PaymentProvider } from './payment';

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
     */
    isEnabled: boolean;
  } | null;
}

export interface UpsertClubDonationButtonRequest {
  isEnabled: boolean;
  buttonLabel: string;
  buttonTitle?: string | null;
  clubPaymentMethodId: string | number;
}

/**
 * Slim shape returned for the "pick a payment method" dropdown.
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

export interface GetDonationButtonManageResponse {
  ok: boolean;
  donationButton: ClubDonationButtonWithPaymentMethod | null;
  eligiblePaymentMethods: EligibleDonationPaymentMethod[];
}

export interface DonationButtonEmbedResponse {
  ok: boolean;
  embedHtml: string;
  donationButton: ClubDonationButtonWithPaymentMethod;
}