// src/components/mgtsystem/services/PuzzleDropMgmtService.ts
//
// Frontend service for Puzzle Drop's club-side management calls.
// Extends BaseService - same auth header pattern as every other mgmt
// service (EliminationMgmtService, SupporterAuthService, etc.). Auth is
// handled entirely by BaseService.request(); this class doesn't need to
// know or guess how.
//
// Backend route: server/puzzles/routes/puzzleDropRoutes.js, mounted in
// server/index.js at '/api/puzzle-drop' (see index_js_additions.txt).
// Create/get/update sit at or just under the router root; purchases,
// confirm, complete, and open are additional endpoints on that same
// router - all reached through this one service, same `base`.

import BaseService from './BaseService';

// ─── Create / Edit types ────────────────────────────────────────────────────

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

// Mixed casing here matches what the two different backend functions
// actually produce, not smoothed over: getDropRoomConfig explicitly
// returns camelCased room fields (roomId, clubId, status, etc.), while
// getDropItems/getDropPricingTiers pass raw DB rows straight through -
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

// ─── Purchases / confirm / complete / open types ───────────────────────────

export interface DropPurchaseItem {
  entitlementId: string;
  itemNumber: number;
  puzzleType: string;
  paymentStatus: 'expected' | 'claimed' | 'confirmed';
}

export interface DropPurchase {
  ledgerId: string | null;
  buyerName: string | null;
  buyerEmail: string;
  amount: number | null;
  currency: string;
  paymentMethod: string | null;
  paymentSource: string | null;
  paymentReference: string | null;
  status: string;
  confirmedAt: string | null;
  confirmedByName: string | null;
  createdAt: string;
  primaryEntitlementId: string;
  items: DropPurchaseItem[];
}

export interface GetDropPurchasesResult {
  purchases: DropPurchase[];
}

export interface ConfirmDropPurchasePayload {
  entitlementId: string;
  confirmedBy: string;
  confirmedByName?: string;
  confirmedByRole?: string;
}

export interface ConfirmDropPurchaseResult {
  ok: boolean;
  confirmedEntitlementIds: string[];
}

export interface CompleteDropResult {
  ok: boolean;
  roomId: string;
  status: string;
}

export interface OpenDropResult {
  ok: boolean;
  roomId: string;
  status: string;
}

// ── Leaderboard types ───────────────────────────────────────────────────────

export interface DropLeaderboardEntry {
  rank: number;
  playerName: string;
  totalScore: number;
  isCorrect: boolean;
  timeTakenSeconds: number | null;
  submittedAt?: string | null;
}

export interface DropSummaryItem {
  weekNumber: number; // actually itemNumber - backend field name reused, see getPublicDropSummary
  puzzleType: string;
  difficulty: string;
  isUnlocked: boolean;
  playerCount: number;
  top: DropLeaderboardEntry[];
}

export interface GetDropSummaryResult {
  challenge: {
    id: string;
    title: string;
    status: string;
    currency: string;
    currencySymbol: string;
    clubName: string | null;
  } | null;
  isFinal: boolean;
  weeks: DropSummaryItem[];
}

export interface GetDropItemLeaderboardResult {
  challenge: GetDropSummaryResult['challenge'];
  weekNumber: number;
  puzzleType: string;
  difficulty: string;
  isFinal: boolean;
  entries: DropLeaderboardEntry[];
}

// ─── Service ────────────────────────────────────────────────────────────────

class PuzzleDropMgmtService extends BaseService {
  private readonly base = '/puzzle-drop';

  /** Compact per-item summary (top 3 each) - powers the Leaderboard tab's default view. */
  async getPublicSummary(roomId: string): Promise<GetDropSummaryResult> {
    return this.request<GetDropSummaryResult>(
      `${this.base}/public/${encodeURIComponent(roomId)}/leaderboard-summary`
    );
  }

  /** Full leaderboard for one puzzle item - fetched on expand. */
  async getItemLeaderboard(roomId: string, itemNumber: number): Promise<GetDropItemLeaderboardResult> {
    return this.request<GetDropItemLeaderboardResult>(
      `${this.base}/public/${encodeURIComponent(roomId)}/items/${itemNumber}/leaderboard`
    );
  }

  async createDrop(payload: CreateDropPayload): Promise<CreateDropResult> {
    return this.request<CreateDropResult>(this.base, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  /** Combined room+items+tiers read - seeds EditFundraiserModal's edit UI. */
  async getDrop(roomId: string): Promise<DropDetail> {
    return this.request<DropDetail>(`${this.base}/${encodeURIComponent(roomId)}`);
  }

  /**
   * Edit a Drop. Only succeeds while the room is still 'scheduled' (not
   * yet on sale) - see updateDrop's backend comment for why. A 409 with
   * error: 'drop_not_editable' means it's already gone on sale.
   */
  async updateDrop(roomId: string, payload: UpdateDropPayload): Promise<DropDetail> {
    return this.request<DropDetail>(`${this.base}/${encodeURIComponent(roomId)}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  }

  /** Purchases list for the club dashboard's Purchases tab, grouped by ledger. */
  async getPurchases(roomId: string): Promise<GetDropPurchasesResult> {
    return this.request<GetDropPurchasesResult>(
      `${this.base}/${encodeURIComponent(roomId)}/purchases`
    );
  }

  /**
   * Confirm a claimed purchase. Confirming ANY entitlement on a ledger
   * confirms every sibling entitlement sharing that ledger row too - see
   * confirmDropPurchase's backend implementation - so callers only ever
   * need to pass one entitlementId per purchase, not one per item.
   */
  async confirmPurchase(payload: ConfirmDropPurchasePayload): Promise<ConfirmDropPurchaseResult> {
    return this.request<ConfirmDropPurchaseResult>(
      `${this.base}/entitlements/${encodeURIComponent(payload.entitlementId)}/confirm`,
      {
        method: 'POST',
        body: JSON.stringify({
          confirmedBy: payload.confirmedBy,
          confirmedByName: payload.confirmedByName,
          confirmedByRole: payload.confirmedByRole,
        }),
      }
    );
  }

  /**
   * Mark a Drop as completed - stops new purchases, leaves existing
   * confirmed entitlements untouched. Irreversible from this call alone.
   */
  async completeDrop(roomId: string): Promise<CompleteDropResult> {
    return this.request<CompleteDropResult>(
      `${this.base}/${encodeURIComponent(roomId)}/complete`,
      { method: 'POST' }
    );
  }

  /**
   * Opens a Drop for purchases immediately, ahead of its scheduled_at
   * time. Only valid while status is still 'scheduled' - a 409 with
   * error: 'drop_not_schedulable' means it's already open, completed,
   * or cancelled.
   */
  async openNow(roomId: string): Promise<OpenDropResult> {
    return this.request<OpenDropResult>(
      `${this.base}/${encodeURIComponent(roomId)}/open`,
      { method: 'POST' }
    );
  }
}

// Singleton - same pattern as every other mgmt service
const puzzleDropMgmtService = new PuzzleDropMgmtService();
export default puzzleDropMgmtService;