// src/components/mgtsystem/services/QuizRoomsService.ts
import BaseService from './BaseService';

export type StatusFilter = 'scheduled' | 'live' | 'completed' | 'cancelled' | 'all';
export type TimeFilter = 'upcoming' | 'past' | 'all';

export interface Web2RoomRow {
  room_id: string;
  host_id: string;
  status: string;
  scheduled_at: string | null;
  time_zone: string | null;
  config_json: string | any | null;
  room_caps_json?: string | any | null;
  created_at: string;
  updated_at: string;
}

export interface ListWeb2RoomsParams {
  status?: StatusFilter;
  time?: TimeFilter;
}
export interface ListWeb2RoomsResponse {
  rooms: Web2RoomRow[];
}

export interface Entitlements {
  game_credits_remaining?: number | string;
  concurrent_rooms?: number;
  max_players_per_game?: number;
  max_rounds?: number;
  extras_allowed?: string[];
  round_types_allowed?: string[];
  [k: string]: unknown;
}

class QuizRoomsService extends BaseService {
  getEntitlements() {
    return this.request<Entitlements>(`/quiz/entitlements`);
  }

  listWeb2Rooms(params: ListWeb2RoomsParams) {
    const qs = this.buildQueryString(params as Record<string, any>);
    return this.request<ListWeb2RoomsResponse>(`/quiz/web2/rooms?${qs}`);
  }
}

export default new QuizRoomsService();

