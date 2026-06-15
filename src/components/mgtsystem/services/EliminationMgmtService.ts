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

// ── Prize shape — matches quiz config_json.prizes exactly ──────────────────
export interface EliminationPrize {
  place:       number;      // Always 1 for elimination (last player standing)
  value:       number | null;
  description: string;
  sponsor:     string | null;
}

export interface EliminationRoomListItem {
  room_id:           string;
  host_id:           string;
  club_id:           string;
  game_type:         'elimination';
  status:            EliminationRoomStatus;
  scheduled_at:      string | null;
  ended_at:          string | null;
  time_zone:         string | null;
  config_json:       EliminationConfig | string | null;
  room_caps_json:    null;
  // Legacy flat fields — kept for backward compat with old rooms
  prize_description: string | null;
  prize_value:       number | null;
  created_at:        string;
  updated_at:        string;
}

export interface EliminationConfig {
  gameType:     'elimination';
  paymentMode:  'web2' | 'web3';
  entryFee:     number | null;
  currency:     string;         // ISO 4217 e.g. 'EUR'
  maxPlayers?:  number;         // set server-side from GAME_RULES.MAX_PLAYERS
  hostId:       string;
  hostName:     string | null;

  // ── Prize — array to match quiz config shape ──────────────────────────────
  // Elimination always has exactly one entry (place: 1 = last player standing).
  // Old rooms may still have the flat prizeDescription/prizeValue fields below;
  // use parseConfig() which normalises both shapes to the prizes array.
  prizes: EliminationPrize[];

  // @deprecated — flat fields kept for reading old rooms only, not written on
  // new or updated rooms. Will be removed once all rooms are migrated.
  prizeDescription?: string;
  prizeValue?:       number | null;

  createdAt?: string;
}

export interface ScheduleEliminationPayload {
  roomId:    string;
  hostId:    string;
  hostName?: string;
  scheduledAt?: string | null;   // ISO datetime
  timeZone?:    string | null;
  entryFee:     number;
  currency:     string;
  // prizes replaces the old prizeDescription/prizeValue flat fields
  prizes: EliminationPrize[];
}

export interface UpdateEliminationPayload {
  scheduledAt?:  string | null;
  timeZone?:     string | null;
  entryFee?:     number;
  currency?:     string;
  prizes?:       EliminationPrize[];
}

export interface ScheduleEliminationResponse {
  roomId:      string;
  hostId:      string;
  status:      EliminationRoomStatus;
  scheduledAt: string | null;
}

export interface HydrateEliminationResponse {
  roomId:         string;
  hostId:         string;
  status:         EliminationRoomStatus;
  config:         EliminationConfig;
  hydrated:       boolean;
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
   * Parse config_json from a list item — handles:
   *   1. New shape  → config_json.prizes array
   *   2. Old shape  → flat prizeDescription / prizeValue fields
   *   3. String     → JSON-encoded config (MySQL driver quirk)
   *
   * Always returns a config with a normalised `prizes` array so callers
   * don't need to branch on which shape the room was saved with.
   */
  parseConfig(room: EliminationRoomListItem): EliminationConfig | null {
    let config: EliminationConfig | null = null;

    if (!room.config_json) {
      config = null;
    } else if (typeof room.config_json === 'object') {
      config = room.config_json as EliminationConfig;
    } else {
      try {
        config = JSON.parse(room.config_json) as EliminationConfig;
      } catch {
        config = null;
      }
    }

    if (!config) return null;

    // Normalise: if the old flat fields exist and prizes array is missing/empty,
    // synthesise a prizes array from the legacy fields so all consumers work.
    if (!config.prizes?.length && config.prizeDescription) {
      config = {
        ...config,
        prizes: [{
          place:       1,
          value:       config.prizeValue ?? null,
          description: config.prizeDescription,
          sponsor:     null,
        }],
      };
    }

    // Ensure prizes is always an array (never undefined)
    if (!config.prizes) {
      config = { ...config, prizes: [] };
    }

    return config;
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

  /**
   * Return the first (winner) prize from a config, if present.
   */
  getWinnerPrize(config: EliminationConfig | null): EliminationPrize | null {
    return config?.prizes?.find(p => p.place === 1) ?? null;
  }
}

// Singleton — same pattern as other mgmt services
const eliminationMgmtService = new EliminationMgmtService();
export default eliminationMgmtService;