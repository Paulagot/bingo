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

  // Marketing copy lives on the linked fundraisely_events row.
  // Null is expected for older/unlinked Drops and the landing page has
  // sensible fallbacks.
  summary: string | null;
  description: string | null;

  status: 'scheduled' | 'open' | 'completed';
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
    return this.request<PublicDropInfo>(
      `/puzzle-drop/public/${dropRoomId}/info`,
    );
  }

  async getPaymentMethods(
    dropRoomId: string,
  ): Promise<ClubPaymentMethod[]> {
    const res = await this.request<{
      ok: boolean;
      paymentMethods: ClubPaymentMethod[];
    }>(`/payment-methods/room/${dropRoomId}/public`);

    return res.paymentMethods ?? [];
  }

  purchase(dropRoomId: string, payload: PurchaseDropPayload) {
    return this.request<PurchaseDropResult>(
      `/puzzle-drop/${dropRoomId}/purchase`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      },
    );
  }

  createStripeCheckout(
    dropRoomId: string,
    payload: StripeCheckoutPayload,
  ) {
    return this.request<StripeCheckoutResult>(
      `/puzzle-drop/${dropRoomId}/stripe/checkout`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      },
    );
  }

  getStripeSession(dropRoomId: string, sessionId: string) {
    return this.request<StripeSessionResult>(
      `/puzzle-drop/${dropRoomId}/stripe/session/${sessionId}`,
    );
  }

  recoverAccess(dropRoomId: string, email: string) {
    return this.request<RecoverAccessResult>(
      `/puzzle-drop/public/${dropRoomId}/recover?email=${encodeURIComponent(email)}`,
    );
  }
}

export const publicPuzzleDropService = new PublicPuzzleDropService();