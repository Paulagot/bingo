import BaseService from '../components/mgtsystem/services/BaseService';
import type { ClubPaymentMethod } from '../components/Quiz/shared/PaymentMethodSelector';

export interface PublicSponsoredActivity {
  roomId: string;
  clubId: string;
  status: 'scheduled' | 'open' | 'completed';
  opensAt: string | null;
  closesAt: string | null;
  timeZone: string | null;
  activityKind: string;
  activityLabel: string;
  customActivityLabel: string | null;
  hostName: string | null;
  suggestedAmounts: number[];
  allowOtherAmount: boolean;
  currency: string;
  clubName: string | null;
  clubLogoUrl: string | null;
  clubPrimaryColor: string | null;
  clubBackgroundColor: string | null;
  clubTextOnPrimaryColor: string | null;
  paymentMethods: ClubPaymentMethod[];
}

export interface SponsorDetails {
  sponsorName: string;
  sponsorEmail?: string;
  displayName?: string;
  isAnonymous: boolean;
  message?: string;
  amount: number;
  clubPaymentMethodId: string | number;
}

class PublicSponsoredActivityService extends BaseService {
  protected override getAuthHeaders(): Record<string, string> {
    return { 'Content-Type': 'application/json' };
  }

  getActivity(roomId: string) {
    return this.request<{ ok: true; activity: PublicSponsoredActivity }>(
      `/sponsored-activity-public/${roomId}`
    );
  }

  createManualContribution(roomId: string, payload: SponsorDetails & { paymentReference: string }) {
    return this.request<{ ok: true; contributionId: string; ledgerId: string; status: 'claimed'; currency: string }>(
      `/sponsored-activity-public/${roomId}/manual`,
      { method: 'POST', body: JSON.stringify(payload) }
    );
  }

  createStripeCheckout(roomId: string, payload: SponsorDetails & { appOrigin: string; activityLabel: string }) {
    return this.request<{ ok: true; contributionId: string; redirectUrl: string }>(
      `/sponsored-activity-public/${roomId}/stripe/checkout`,
      { method: 'POST', body: JSON.stringify(payload) }
    );
  }

  createCryptoContribution(roomId: string, payload: SponsorDetails) {
    return this.request<{ ok: true; contributionId: string; walletAddress: string; amount: number; currency: string }>(
      `/sponsored-activity-public/${roomId}/crypto/start`,
      { method: 'POST', body: JSON.stringify(payload) }
    );
  }

  getStatus(roomId: string, args: { contributionId?: string; sessionId?: string }) {
    const query = new URLSearchParams();
    if (args.contributionId) query.set('contributionId', args.contributionId);
    if (args.sessionId) query.set('sessionId', args.sessionId);
    return this.request<{ ok: true; contributionId: string; status: string; amount: number; currency: string; displayName: string }>(
      `/sponsored-activity-public/${roomId}/status?${query.toString()}`
    );
  }
}

export const publicSponsoredActivityService = new PublicSponsoredActivityService();
