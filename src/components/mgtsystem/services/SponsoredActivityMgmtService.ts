import BaseService from './BaseService';

export type SponsoredActivityKind = 'walk' | 'run' | 'cycle' | 'swim' | 'readathon' | 'silence' | 'other';

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

class SponsoredActivityMgmtService extends BaseService {
  private readonly base = '/sponsored-activity';

  create(payload: CreateSponsoredActivityPayload) {
    return this.request<{ roomId: string; room: SponsoredActivityRoom }>(this.base, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  get(roomId: string) {
    return this.request<{ room: SponsoredActivityRoom }>(`${this.base}/${encodeURIComponent(roomId)}`);
  }

  update(roomId: string, payload: UpdateSponsoredActivityPayload) {
    return this.request<{ room: SponsoredActivityRoom }>(`${this.base}/${encodeURIComponent(roomId)}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  }
}

export default new SponsoredActivityMgmtService();