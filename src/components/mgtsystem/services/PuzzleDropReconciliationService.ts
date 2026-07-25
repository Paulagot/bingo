// src/components/mgtsystem/services/PuzzleDropReconciliationService.ts
//
// Frontend service for Puzzle Drop's period-based reconciliation.
// Same shape and calling convention as SubscriptionReconciliationService —
// extends BaseService, this.request() handles auth — pointed at the
// puzzle-drop-reconciliation router instead. Backend:
// puzzleDropReconciliationService.js / puzzleDropReconciliationRoutes.js.

import BaseService from './BaseService';

export type AdjustmentType = 'received' | 'refund' | 'fee' | 'cash_over_short' | 'prize_payout';
export type PaymentMethod = 'cash' | 'instant_payment' | 'stripe' | 'crypto' | 'other';
export type ReasonCode =
  | 'late_payment' | 'complimentary' | 'data_entry_error' | 'other'
  | 'refund' | 'cash_over' | 'cash_short' | 'prize_award_delivered';

export interface DropAdjustment {
  id: string;
  roomId: string;
  ts: string;
  adjustmentType: AdjustmentType;
  amount: number;
  currency: string;
  paymentMethod: PaymentMethod | null;
  reasonCode: ReasonCode | null;
  note: string | null;
  createdBy: string | null;
  createdAt: string;
}

export interface DropReconciliationPeriod {
  id: string | null;
  roomId: string;
  clubId: string | null;
  openingBalance: number;
  periodReceipts: number;
  startingTotal: number;
  adjustmentsNet: number;
  closingBalance: number;
  approvedBy: string | null;
  approvedAt: string | null;
  notes: string | null;
  periodStart: string;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface DropLifetimeSummary {
  periodCount: number;
  totalReceipts: number;
  totalAdjustments: number;
  currentBalance: number;
  lastApprovedAt: string | null;
}

export interface GetCurrentResult {
  reconciliation: DropReconciliationPeriod;
  adjustments: DropAdjustment[];
  liveReceipts: { total: number; count: number };
}

export interface GetHistoryResult {
  history: DropReconciliationPeriod[];
}

export interface GetSummaryResult {
  summary: DropLifetimeSummary;
}

export interface ApproveResult {
  ok: boolean;
  reconciliation: DropReconciliationPeriod;
}

export interface AddAdjustmentPayload {
  adjustmentType: AdjustmentType;
  amount: number;
  paymentMethod?: PaymentMethod | null;
  reasonCode?: ReasonCode | null;
  note?: string | null;
  createdBy?: string | null;
  currency?: string;
}

export interface AddAdjustmentResult {
  reconciliationId: string;
  adjustment: DropAdjustment;
}

class PuzzleDropReconciliationService extends BaseService {
  private readonly base = '/puzzle-drop-reconciliation';

  async getCurrent(roomId: string): Promise<GetCurrentResult> {
    return this.request<GetCurrentResult>(`${this.base}/room/${encodeURIComponent(roomId)}/current`);
  }

  async getHistory(roomId: string): Promise<GetHistoryResult> {
    return this.request<GetHistoryResult>(`${this.base}/room/${encodeURIComponent(roomId)}/history`);
  }

  async getSummary(roomId: string): Promise<GetSummaryResult> {
    return this.request<GetSummaryResult>(`${this.base}/room/${encodeURIComponent(roomId)}/summary`);
  }

  async addAdjustment(roomId: string, payload: AddAdjustmentPayload): Promise<AddAdjustmentResult> {
    return this.request<AddAdjustmentResult>(`${this.base}/room/${encodeURIComponent(roomId)}/adjustments`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async updateAdjustment(roomId: string, adjustmentId: string, patch: Partial<AddAdjustmentPayload>): Promise<{ ok: boolean }> {
    return this.request<{ ok: boolean }>(
      `${this.base}/room/${encodeURIComponent(roomId)}/adjustments/${encodeURIComponent(adjustmentId)}`,
      { method: 'PATCH', body: JSON.stringify(patch) }
    );
  }

  async deleteAdjustment(roomId: string, adjustmentId: string): Promise<{ ok: boolean }> {
    return this.request<{ ok: boolean }>(
      `${this.base}/room/${encodeURIComponent(roomId)}/adjustments/${encodeURIComponent(adjustmentId)}`,
      { method: 'DELETE' }
    );
  }

  async approve(roomId: string, payload: { approvedBy: string; notes?: string | null }): Promise<ApproveResult> {
    return this.request<ApproveResult>(`${this.base}/room/${encodeURIComponent(roomId)}/approve`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }
}

const puzzleDropReconciliationService = new PuzzleDropReconciliationService();
export default puzzleDropReconciliationService;