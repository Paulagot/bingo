// src/components/mgtsystem/services/EliminationMgmtService.ts
//
// Frontend service for the elimination management system.
// Extends BaseService — same auth header pattern as all other mgmt services.
// All requests go to /api/elimination/mgmt (auth-gated).

import BaseService from './BaseService';

// ─── Types ────────────────────────────────────────────────────────────────────

export type EliminationRoomStatus =
  | 'scheduled'
  | 'open'
  | 'live'
  | 'completed'
  | 'cancelled';

export type EliminationStatusFilter = EliminationRoomStatus | 'all';
export type EliminationTimeFilter = 'upcoming' | 'past' | 'all';

export interface EliminationRoomListItem {
  room_id:          string;
  host_id:          string;
  club_id:          string;
  game_type:        'elimination';
  status:           EliminationRoomStatus;
  scheduled_at:     string | null;
  ended_at:         string | null;
  time_zone:        string | null;
  config_json:      EliminationConfig | string | null;
  room_caps_json:   null;
  prize_description: string | null;
  prize_value:      number | null;
  created_at:       string;
  updated_at:       string;
}

export interface EliminationConfig {
  gameType:         'elimination';
  paymentMode:      'web2' | 'web3';
  entryFee:         number | null;
  currency:         string;       // ISO 4217 e.g. 'EUR'
  // maxPlayers set server-side from GAME_RULES.MAX_PLAYERS
  maxPlayers?:      number;
  hostId:           string;
  hostName:         string | null;
  prizeDescription: string;
  prizeValue:       number | null;
  createdAt?:       string;
}

export interface ScheduleEliminationPayload {
  roomId:           string;
  hostId:           string;
  hostName?:        string;
  scheduledAt?:     string | null;   // ISO datetime
  timeZone?:        string | null;
  entryFee:         number;
  currency:         string;
  // maxPlayers set server-side — not sent from frontend
  prizeDescription: string;
  prizeValue?:      number | null;
}

export interface UpdateEliminationPayload {
  scheduledAt?:     string | null;
  timeZone?:        string | null;
  entryFee?:        number;
  currency?:        string;
  // maxPlayers not editable after scheduling
  prizeDescription?: string;
  prizeValue?:      number | null;
}

export interface ScheduleEliminationResponse {
  roomId:      string;
  hostId:      string;
  status:      EliminationRoomStatus;
  scheduledAt: string | null;
}

export interface HydrateEliminationResponse {
  roomId:        string;
  hostId:        string;
  status:        EliminationRoomStatus;
  config:        EliminationConfig;
  hydrated:      boolean;
  alreadyExisted: boolean;
}

export interface OperatorTokenResponse {
  token:       string;
  operatorUrl: string;
}

// ─── Service ──────────────────────────────────────────────────────────────────

class EliminationMgmtService extends BaseService {
  private readonly base = '/elimination/mgmt';

  // ── Schedule ────────────────────────────────────────────────────────────────

  /**
   * Schedule a new elimination room.
   * Saves to DB only — does NOT create the socket room yet.
   * The socket room is created on hydrate (when host clicks Launch).
   */
  async scheduleRoom(
    payload: ScheduleEliminationPayload,
  ): Promise<ScheduleEliminationResponse> {
    return this.request<ScheduleEliminationResponse>(`${this.base}/schedule`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  // ── List ────────────────────────────────────────────────────────────────────

  /**
   * List elimination rooms for the logged-in club.
   */
  async getRooms(
    status: EliminationStatusFilter = 'all',
    time: EliminationTimeFilter = 'all',
  ): Promise<{ rooms: EliminationRoomListItem[] }> {
    const qs = this.buildQueryString({ status, time });
    return this.request<{ rooms: EliminationRoomListItem[] }>(
      `${this.base}/rooms?${qs}`,
    );
  }

  // ── Get single ──────────────────────────────────────────────────────────────

  /**
   * Fetch a single elimination room by ID.
   */
  async getRoom(roomId: string): Promise<{ room: EliminationRoomListItem }> {
    return this.request<{ room: EliminationRoomListItem }>(
      `${this.base}/rooms/${encodeURIComponent(roomId)}`,
    );
  }

  // ── Update ──────────────────────────────────────────────────────────────────

  /**
   * Edit a scheduled elimination room.
   * Only works while status = 'scheduled'.
   */
  async updateRoom(
    roomId: string,
    payload: UpdateEliminationPayload,
  ): Promise<{ room: EliminationRoomListItem }> {
    return this.request<{ room: EliminationRoomListItem }>(
      `${this.base}/rooms/${encodeURIComponent(roomId)}`,
      {
        method: 'PATCH',
        body: JSON.stringify(payload),
      },
    );
  }

  // ── Cancel ──────────────────────────────────────────────────────────────────

  /**
   * Cancel a scheduled or open elimination room.
   */
  async cancelRoom(roomId: string): Promise<{ ok: boolean }> {
    return this.request<{ ok: boolean }>(
      `${this.base}/rooms/${encodeURIComponent(roomId)}/cancel`,
      { method: 'POST' },
    );
  }

  // ── Hydrate ─────────────────────────────────────────────────────────────────

  /**
   * Load a scheduled room from DB into the socket server's memory.
   * Call this before opening the game tab.
   *
   * Usage:
   *   const { roomId, hostId } = await eliminationMgmtService.hydrateRoom(roomId);
   *   window.open(`/elimination/host/${roomId}?hostId=${hostId}`, '_blank');
   */
  async hydrateRoom(roomId: string): Promise<HydrateEliminationResponse> {
    return this.request<HydrateEliminationResponse>(
      `${this.base}/rooms/${encodeURIComponent(roomId)}/hydrate`,
      { method: 'POST' },
    );
  }

  // ── Operator token ──────────────────────────────────────────────────────────

  /**
   * Generate a short-lived operator JWT for a non-logged-in co-host.
   */
  async getOperatorToken(roomId: string): Promise<OperatorTokenResponse> {
    return this.request<OperatorTokenResponse>(
      `${this.base}/rooms/${encodeURIComponent(roomId)}/operator-token`,
      { method: 'POST' },
    );
  }

  // ── Helpers ─────────────────────────────────────────────────────────────────

  /**
   * Parse config_json from a list item — handles both object and string forms
   * since MySQL can return either depending on driver settings.
   */
  parseConfig(room: EliminationRoomListItem): EliminationConfig | null {
    if (!room.config_json) return null;
    if (typeof room.config_json === 'object') return room.config_json as EliminationConfig;
    try {
      return JSON.parse(room.config_json) as EliminationConfig;
    } catch {
      return null;
    }
  }

  /**
   * Format entry fee for display e.g. "€5.00"
   */
  formatEntryFee(config: EliminationConfig | null): string {
    if (!config?.entryFee) return '—';
    const symbols: Record<string, string> = {
      EUR: '€', GBP: '£', USD: '$', CAD: 'CA$', NGN: '₦',
    };
    const symbol = symbols[config.currency] ?? config.currency;
    return `${symbol}${Number(config.entryFee).toFixed(2)}`;
  }
}

// Singleton — same pattern as other mgmt services
const eliminationMgmtService = new EliminationMgmtService();
export default eliminationMgmtService;