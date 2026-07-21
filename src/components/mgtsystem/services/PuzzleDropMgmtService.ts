// src/components/mgtsystem/services/PuzzleDropMgmtService.ts
//
// Frontend service for Puzzle Drop's club-side creation call.
// Extends BaseService — same auth header pattern as every other mgmt
// service (EliminationMgmtService, SupporterAuthService, etc.). Auth is
// handled entirely by BaseService.request(); this class doesn't need to
// know or guess how.
//
// Backend route: POST /api/puzzle-drop (server/puzzles/routes/puzzleDropRoutes.js,
// mounted in server/index.js at '/api/puzzle-drop' — see
// index_js_additions.txt). Unlike elimination's /elimination/mgmt/schedule,
// Drop's create route is at the router's root, so `base` has no extra
// path segment appended for this one call.

import BaseService from './BaseService';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CreateDropItemPayload {
  puzzleType: string;
  difficulty: string;
}

export interface CreateDropPricingTierPayload {
  quantity: number;
  price:    number;
  label?:   string;
}

export interface CreateDropPayload {
  roomId:           string;
  hostId:           string;
  hostName:         string;
  scheduledAt:      string | null;
  timeZone:         string;
  currency:         string;
  currencySymbol:   string;
  dropTitle:        string | null;
  items:            CreateDropItemPayload[];
  pricingTiers:     CreateDropPricingTierPayload[];
  onnightMethodIds: number[];
}

export interface CreateDropResult {
  roomId: string;
}

// ── Edit types ────────────────────────────────────────────────────────────
// Mixed casing here matches what the two different backend functions
// actually produce, not smoothed over: getDropRoomConfig explicitly
// returns camelCased room fields (roomId, clubId, status, etc.), while
// getDropItems/getDropPricingTiers pass raw DB rows straight through —
// snake_case, same convention as EliminationRoomListItem elsewhere in
// this codebase.
export interface DropItemRow {
  id: string;
  drop_room_id: string;
  item_number: number;
  puzzle_type: string;
  difficulty: string;
  display_order: number;
}

export interface DropPricingTierRow {
  id: string;
  drop_room_id: string;
  quantity: number;
  price: string | number;
  label: string | null;
  display_order: number;
}

export interface DropDetail {
  roomId: string;
  clubId: string;
  hostId: string;
  status: 'scheduled' | 'open' | 'live' | 'completed' | 'cancelled';
  scheduledAt: string | null;
  timeZone: string | null;
  config: { currency?: string; currencySymbol?: string; dropTitle?: string | null };
  linkedPaymentMethods: { onnight_method_ids?: number[] } | null;
  items: DropItemRow[];
  pricingTiers: DropPricingTierRow[];
}

export interface UpdateDropPayload {
  scheduledAt?:      string | null;
  timeZone?:         string;
  currency?:         string;
  currencySymbol?:   string;
  dropTitle?:        string | null;
  items?:            CreateDropItemPayload[];
  pricingTiers?:     CreateDropPricingTierPayload[];
  onnightMethodIds?: number[];
}

// ─── Service ──────────────────────────────────────────────────────────────────

class PuzzleDropMgmtService extends BaseService {
  private readonly base = '/puzzle-drop';

  async createDrop(payload: CreateDropPayload): Promise<CreateDropResult> {
    return this.request<CreateDropResult>(this.base, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  /** Combined room+items+tiers read — seeds EditFundraiserModal's edit UI. */
  async getDrop(roomId: string): Promise<DropDetail> {
    return this.request<DropDetail>(`${this.base}/${encodeURIComponent(roomId)}`);
  }

  /**
   * Edit a Drop. Only succeeds while the room is still 'scheduled' (not
   * yet on sale) — see updateDrop's backend comment for why. A 409 with
   * error: 'drop_not_editable' means it's already gone on sale.
   */
  async updateDrop(roomId: string, payload: UpdateDropPayload): Promise<DropDetail> {
    return this.request<DropDetail>(`${this.base}/${encodeURIComponent(roomId)}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  }
}

// Singleton — same pattern as every other mgmt service
const puzzleDropMgmtService = new PuzzleDropMgmtService();
export default puzzleDropMgmtService;