// src/components/mgtsystem/services/TicketedEventMgmtService.ts
// UPDATED: TicketType now includes isEnabled, quantity, saleEndsAt.

import BaseService from './BaseService';

export type TicketedEventStatus =
  | 'scheduled'
  | 'open'
  | 'live'
  | 'completed'
  | 'cancelled';

export interface TicketType {
  id:          string;
  name:        string;
  price:       string;
  isEnabled:   boolean;
  quantity:    number | null;   // null = no per-type limit
  saleEndsAt:  string | null;   // UTC ISO string, null = no date limit
}

export interface TicketedEventPrize {
  place:       number;
  value:       number | null;
  description: string;
  sponsor:     string;
}

export interface TicketedEventSponsor {
  name: string;
  role: string;
}

export interface TicketedEventConfig {
  gameType:        'ticketed_event';
  clubId:          string;
  hostId:          string;
  hostName:        string | null;
  fundraisingMode: 'fixed_fee' | 'donation';
  entryFee:        string | null;
  ticketTypes:     TicketType[];
  currency:        string;
  currencySymbol:  string;
  timeZone:        string | null;
  eventDateTime:   string | null;
  prizes:          TicketedEventPrize[];
  eventSponsors:   TicketedEventSponsor[];
  roomCaps: {
    maxPlayers:     number;
    planCode?:      string;
    venueCapacity?: number | null;
  };
}

// ── Payment methods ──────────────────────────────────────────────────────────
// Mirrors the JSON shape QuizPaymentMethodsService writes. Ticketed events
// DO have an advance/on-the-night split — tickets can be bought ahead of
// time online (ticket_method_ids) or at the door on the night
// (onnight_method_ids) — same shape as quiz/elimination.
export interface LinkedPaymentMethods {
  ticket_method_ids?:  number[];
  onnight_method_ids?: number[];
  updated_at?:         string | null;
  updated_by?:         string | null;
}

export interface TicketedEventRoomListItem {
  room_id:               string;
  host_id:               string;
  club_id:               string;
  game_type:             'ticketed_event';
  status:                TicketedEventStatus;
  scheduled_at:          string | null;
  ended_at:              string | null;
  time_zone:             string | null;
  config_json:           TicketedEventConfig | string | null;
  room_caps_json:        null;
  prize_description:     string | null;
  prize_value:           number | null;
  reconciliation_status: string;
  // Set at schedule time, read back here so the edit modal can hydrate
  // current selections. May be string (raw JSON) or already-parsed object
  // depending on the MySQL driver, same quirk config_json already has.
  linked_payment_methods_json: LinkedPaymentMethods | string | null;
  created_at:            string;
  updated_at:            string;
}

export interface ScheduleTicketedEventPayload {
  roomId:          string;
  hostId:          string;
  hostName?:       string;
  scheduledAt?:    string | null;
  timeZone?:       string | null;
  entryFee?:       string | null;
  fundraisingMode: 'fixed_fee' | 'donation';
  currency:        string;
  currencySymbol:  string;
  ticketTypes?:    TicketType[];
  prizes?:         TicketedEventPrize[];
  eventSponsors?:  TicketedEventSponsor[];
  venueCapacity?:  number;
  eventTitle?:     string | null;
  eventLocation?:  string | null;
  // Ticketed events DO have an advance/on-the-night split — tickets can be
  // bought ahead of time online, or at the door on the night. Optional:
  // an empty array is a valid choice (no methods yet), so default to []
  // at the call site rather than omitting either field.
  ticketMethodIds?:  number[];
  onnightMethodIds?: number[];
}

export interface UpdateTicketedEventPayload {
  scheduledAt?:     string | null;
  timeZone?:        string | null;
  entryFee?:        string | null;
  fundraisingMode?: 'fixed_fee' | 'donation';
  currency?:        string;
  currencySymbol?:  string;
  ticketTypes?:     TicketType[];
  prizes?:          TicketedEventPrize[];
  eventSponsors?:   TicketedEventSponsor[];
  // undefined = don't touch payment methods, [] = clear all selections.
  // Same convention as UpdateEliminationPayload / UpdateWeb2RoomPatch.
  ticketMethodIds?:  number[];
  onnightMethodIds?: number[];
}

export interface ScheduleTicketedEventResponse {
  roomId:      string;
  hostId:      string;
  status:      TicketedEventStatus;
  scheduledAt: string | null;
  roomCaps:    { maxPlayers: number };
}

class TicketedEventMgmtService extends BaseService {
  private readonly base = '/ticketed-event/mgmt';

  async scheduleEvent(payload: ScheduleTicketedEventPayload): Promise<ScheduleTicketedEventResponse> {
    return this.request<ScheduleTicketedEventResponse>(`${this.base}/schedule`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async getRooms(
    status: TicketedEventStatus | 'all' = 'all',
    time: 'upcoming' | 'past' | 'all' = 'all',
  ): Promise<{ rooms: TicketedEventRoomListItem[] }> {
    const qs = this.buildQueryString({ status, time });
    return this.request<{ rooms: TicketedEventRoomListItem[] }>(`${this.base}/rooms?${qs}`);
  }

  async getRoom(roomId: string): Promise<{ room: TicketedEventRoomListItem }> {
    return this.request<{ room: TicketedEventRoomListItem }>(
      `${this.base}/rooms/${encodeURIComponent(roomId)}`,
    );
  }

  async updateRoom(roomId: string, payload: UpdateTicketedEventPayload): Promise<{ room: TicketedEventRoomListItem }> {
    return this.request<{ room: TicketedEventRoomListItem }>(
      `${this.base}/rooms/${encodeURIComponent(roomId)}`,
      { method: 'PATCH', body: JSON.stringify(payload) },
    );
  }

  async cancelRoom(roomId: string): Promise<{ ok: boolean }> {
    return this.request<{ ok: boolean }>(
      `${this.base}/rooms/${encodeURIComponent(roomId)}/cancel`,
      { method: 'POST' },
    );
  }

  async openCheckIn(roomId: string): Promise<{ roomId: string; status: string; alreadyOpen: boolean }> {
    return this.request(`${this.base}/rooms/${encodeURIComponent(roomId)}/open-checkin`, { method: 'POST' });
  }

  async completeEvent(roomId: string): Promise<{ ok: boolean }> {
    return this.request<{ ok: boolean }>(
      `${this.base}/rooms/${encodeURIComponent(roomId)}/complete`,
      { method: 'POST' },
    );
  }

  parseConfig(room: TicketedEventRoomListItem): TicketedEventConfig | null {
    if (!room.config_json) return null;
    if (typeof room.config_json === 'object') return room.config_json as TicketedEventConfig;
    try { return JSON.parse(room.config_json) as TicketedEventConfig; }
    catch { return null; }
  }

  formatEntryFee(config: TicketedEventConfig | null): string {
    if (!config) return '—';
    if (config.fundraisingMode === 'donation') return 'Donation';
    const types = (config.ticketTypes ?? []).filter(t => t.isEnabled !== false);
    if (types.length > 1) {
      const prices = types.map(t => parseFloat(t.price)).filter(p => !isNaN(p));
      if (!prices.length) return '—';
      const min = Math.min(...prices), max = Math.max(...prices);
      if (min === max) return `${config.currencySymbol}${min.toFixed(2)}`;
      return `${config.currencySymbol}${min.toFixed(2)} – ${config.currencySymbol}${max.toFixed(2)}`;
    }
    if (!config.entryFee) return '—';
    return `${config.currencySymbol}${Number(config.entryFee).toFixed(2)}`;
  }
}

const ticketedEventMgmtService = new TicketedEventMgmtService();
export default ticketedEventMgmtService;