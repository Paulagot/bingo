// src/components/puzzles/services/publicPuzzleDropService.ts
//
// Client for the PUBLIC Drop buyer endpoints. No token ever sent - same
// convention as publicLeaderboardService.ts, since these pages are
// shareable links anyone can land on.

import BaseService from '../../mgtsystem/services/BaseService';
import type { ClubPaymentMethod } from '../../Quiz/shared/PaymentMethodSelector';

export interface PublicDropItem {
  id: string;
  itemNumber: number;
  puzzleType: string;
  difficulty: string;
}

export interface PublicDropPricingTier {
  id: string;
  quantity: number;
  price: string | number;
  label: string | null;
}

export interface PublicDropInfo {
  id: string; // roomId
  title: string;
  status: 'scheduled' | 'open' | 'completed'; // getPublicDropInfo only ever returns 'open' drops
  currency: string;
  currencySymbol: string;
  clubName: string | null;
  clubLogoUrl: string | null;
  clubPrimaryColor: string | null;
  clubBackgroundColor: string | null;
  clubTextOnPrimaryColor: string | null;
  items: PublicDropItem[];
  pricingTiers: PublicDropPricingTier[];
}

export interface PurchaseDropPayload {
  itemIds: string[];
  buyerName: string;
  buyerEmail: string;
  paymentReference: string;
  clubPaymentMethodId: string | number;
}

export interface PurchaseDropEntitlement {
  entitlementId: string;
  itemNumber: number;
  accessToken: string;
}

export interface PurchaseDropResult {
  ok: true;
  ledgerId: number;
  totalAmount: number;
  currency: string;
  entitlements: PurchaseDropEntitlement[];
}

export interface StripeCheckoutPayload {
  itemIds: string[];
  buyerName: string;
  buyerEmail: string;
  appOrigin?: string;
}

export interface StripeCheckoutResult {
  ok: true;
  url: string;
}

export interface StripeSessionEntitlement {
  entitlementId: string;
  itemNumber: number | null;
  accessToken: string;
  paymentStatus: 'expected' | 'claimed' | 'confirmed';
}

export interface StripeSessionResult {
  ok: true;
  /** True until the webhook has confirmed every entitlement in this
   *  purchase - the frontend should poll briefly rather than error out,
   *  since Stripe's webhook and the browser's redirect back from
   *  Checkout aren't guaranteed to arrive in any particular order. */
  pending: boolean;
  entitlements: StripeSessionEntitlement[];
}

export interface RecoveredEntitlement {
  entitlementId: string;
  itemNumber: number | null;
  accessToken: string;
  paymentStatus: 'expected' | 'claimed' | 'confirmed';
}

export interface RecoverAccessResult {
  ok: true;
  entitlements: RecoveredEntitlement[];
}

class PublicPuzzleDropService extends BaseService {
  protected override getAuthHeaders(): Record<string, string> {
    return { 'Content-Type': 'application/json' };
  }

  getInfo(dropRoomId: string) {
    return this.request<PublicDropInfo>(`/puzzle-drop/public/${dropRoomId}/info`);
  }

  /**
   * Reuses the EXISTING public payment-methods route
   * (server/mgtsystem/routes/paymentMethods.js - GET /room/:roomId/public,
   * already generic across quiz/elimination/ticketed rooms) rather than
   * building a Drop-specific equivalent. ⚠️ Response shape assumed as
   * `{ ok: true, paymentMethods: ClubPaymentMethod[] }` by convention
   * with the other routes in that same file - worth confirming against
   * the real response the first time this is exercised, since
   * getAvailablePaymentMethodsForRoom's exact return shape hasn't been
   * directly reviewed.
   */
  async getPaymentMethods(dropRoomId: string): Promise<ClubPaymentMethod[]> {
    const res = await this.request<{ ok: boolean; paymentMethods: ClubPaymentMethod[] }>(
      `/payment-methods/room/${dropRoomId}/public`
    );
    return res.paymentMethods ?? [];
  }

  /**
   * Instant-payment/cash purchase - matches the manual-payment flow
   * (PaymentMethodSelector → PaymentInstructions → confirm paid).
   */
  purchase(dropRoomId: string, payload: PurchaseDropPayload) {
    return this.request<PurchaseDropResult>(`/puzzle-drop/${dropRoomId}/purchase`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  /**
   * Stripe purchase - creates entitlements at 'expected' plus a Checkout
   * Session, and returns the URL to redirect the browser to. The caller
   * is responsible for the actual `window.location.href = result.url`
   * redirect (same convention as every other Stripe-checkout service in
   * this codebase - this service only ever returns data, never navigates
   * itself).
   */
  createStripeCheckout(dropRoomId: string, payload: StripeCheckoutPayload) {
    return this.request<StripeCheckoutResult>(`/puzzle-drop/${dropRoomId}/stripe/checkout`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  /**
   * Post-checkout success page's one call - retrieves access tokens for
   * every item in a Stripe purchase, since Stripe's success_url can only
   * carry small values (entitlementId, session_id), not a multi-item
   * token set. See StripeSessionResult.pending's comment for why the
   * caller should be prepared to poll briefly.
   */
  getStripeSession(dropRoomId: string, sessionId: string) {
    return this.request<StripeSessionResult>(`/puzzle-drop/${dropRoomId}/stripe/session/${sessionId}`);
  }

  /**
   * "Already bought this?" recovery lookup - see the backend route's
   * comment on why this is a convenience lookup, not strong auth.
   */
  recoverAccess(dropRoomId: string, email: string) {
    return this.request<RecoverAccessResult>(
      `/puzzle-drop/public/${dropRoomId}/recover?email=${encodeURIComponent(email)}`
    );
  }
}

export const publicPuzzleDropService = new PublicPuzzleDropService();