import BaseService from './BaseService';

export type SponsoredActivityKind = 'walk' | 'run' | 'cycle' | 'swim' | 'readathon' | 'silence' | 'other';
export type SponsoredContributionStatus = 'pending' | 'claimed' | 'confirmed' | 'disputed' | 'cancelled' | 'failed' | 'expired';

export interface SponsoredActivityRoom {
  room_id: string;
  host_id: string;
  club_id: string;
  game_type: 'sponsored_activity';
  status: 'scheduled' | 'open' | 'live' | 'completed' | 'cancelled';
  scheduled_at: string | null;
  ended_at: string | null;
  time_zone: string | null;
  config_json: SponsoredActivityRoomConfig | string;
  linked_payment_methods_json?: unknown;
}
export interface SponsoredActivityRoomConfig {
  gameType: 'sponsored_activity';
  activityKind: SponsoredActivityKind;
  customActivityLabel: string | null;
  suggestedAmounts: number[];
  allowOtherAmount: true;
  currency: string;
  hostName: string | null;
}
export interface CreateSponsoredActivityPayload {
  roomId: string;
  hostId: string;
  hostName?: string;
  sponsorshipOpensAt: string | null;
  sponsorshipClosesAt: string | null;
  timeZone: string;
  activityKind: SponsoredActivityKind;
  customActivityLabel?: string;
  suggestedAmounts: number[];
  currency: string;
  onnightMethodIds: number[];
}
export type UpdateSponsoredActivityPayload = Partial<Omit<CreateSponsoredActivityPayload, 'roomId' | 'hostId'>>;

export interface SponsoredContribution {
  id: string;
  roomId: string;
  clubId: string;
  ledgerId: string | null;
  supporterId: string | null;
  peerFundraiserId: string | null;
  participantId: string | null;
  sponsorName: string | null;
  sponsorEmail: string | null;
  displayName: string | null;
  isAnonymous: boolean;
  message: string | null;
  amount: number;
  currency: string;
  clubPaymentMethodId: string;
  paymentMethodCategory: string;
  paymentProvider: string | null;
  paymentMethodLabel: string | null;
  paymentReference: string | null;
  status: SponsoredContributionStatus;
  confirmedAt: string | null;
  confirmedBy: string | null;
  confirmedByName: string | null;
  confirmedByRole: string | null;
  disputedAt: string | null;
  disputedBy: string | null;
  disputeReason: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}
export interface SponsoredContributionSummary {
  contributionCount: number;
  confirmedCount: number;
  confirmedTotal: number;
  pendingTotal: number;
  disputedTotal: number;
  anonymousCount: number;
  namedSponsorCount: number;
  averageConfirmed: number;
  byMethod: Array<{ label: string; category: string; count: number; total: number }>;
}

class SponsoredActivityMgmtService extends BaseService {
  private readonly base = '/sponsored-activity';
  create(payload: CreateSponsoredActivityPayload) {
    return this.request<{ roomId: string; room: SponsoredActivityRoom }>(this.base, { method: 'POST', body: JSON.stringify(payload) });
  }
  get(roomId: string) {
    return this.request<{ room: SponsoredActivityRoom }>(`${this.base}/${encodeURIComponent(roomId)}`);
  }
  update(roomId: string, payload: UpdateSponsoredActivityPayload) {
    return this.request<{ room: SponsoredActivityRoom }>(`${this.base}/${encodeURIComponent(roomId)}`, { method: 'PATCH', body: JSON.stringify(payload) });
  }
  getSummary(roomId: string) {
    return this.request<{ roomStatus: SponsoredActivityRoom['status']; summary: SponsoredContributionSummary }>(`${this.base}/${encodeURIComponent(roomId)}/summary`);
  }
  listContributions(roomId: string, params: { status?: string; search?: string } = {}) {
    const query = new URLSearchParams();
    if (params.status && params.status !== 'all') query.set('status', params.status);
    if (params.search) query.set('search', params.search);
    const suffix = query.toString() ? `?${query.toString()}` : '';
    return this.request<{ roomStatus: SponsoredActivityRoom['status']; contributions: SponsoredContribution[] }>(`${this.base}/${encodeURIComponent(roomId)}/contributions${suffix}`);
  }
  addManualContribution(roomId: string, payload: {
    sponsorName: string; sponsorEmail?: string | null; displayName?: string | null;
    isAnonymous?: boolean; message?: string | null; amount: number; currency?: string;
    clubPaymentMethodId: number | string; paymentReference?: string | null;
  }) {
    return this.request<{ contribution: SponsoredContribution }>(`${this.base}/${encodeURIComponent(roomId)}/contributions`, { method: 'POST', body: JSON.stringify(payload) });
  }
  confirmContribution(roomId: string, contributionId: string) {
    return this.request<{ ok: boolean }>(`${this.base}/${encodeURIComponent(roomId)}/contributions/${encodeURIComponent(contributionId)}/confirm`, { method: 'PATCH' });
  }
  disputeContribution(roomId: string, contributionId: string, reason: string) {
    return this.request<{ ok: boolean }>(`${this.base}/${encodeURIComponent(roomId)}/contributions/${encodeURIComponent(contributionId)}/dispute`, { method: 'PATCH', body: JSON.stringify({ reason }) });
  }

  writeOffContribution(roomId: string, contributionId: string, reason: string) {
    return this.request<{ ok: boolean }>(
      `${this.base}/${encodeURIComponent(roomId)}/contributions/${encodeURIComponent(contributionId)}/write-off`,
      { method: 'PATCH', body: JSON.stringify({ reason }) },
    );
  }
  openNow(roomId: string) {
    return this.request<{ ok: boolean; status: 'open' }>(`${this.base}/${encodeURIComponent(roomId)}/open`, { method: 'POST' });
  }
  close(roomId: string) {
    return this.request<{ ok: boolean; status: 'completed' }>(`${this.base}/${encodeURIComponent(roomId)}/close`, { method: 'POST' });
  }
}
export default new SponsoredActivityMgmtService();
