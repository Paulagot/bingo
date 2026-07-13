// src/components/mgtsystem/services/SubscriptionReconciliationService.ts
//
// Period-aware reconciliation for puzzle subscriptions. Same base pattern
// as TicketedEventReconciliationService (getState/addAdjustment/approve),
// but "state" here is scoped to the CURRENT period, plus separate calls
// for the full history and the lifetime rollup.

import BaseService from './BaseService';

export type AdjustmentType = 'received' | 'refund' | 'fee' | 'cash_over_short' | 'prize_payout';
export type PaymentMethod  = 'cash' | 'card' | 'card_tap' | 'instant_payment' | 'pay_admin' | 'stripe' | 'web3' | 'crypto' | 'other';
export type ReasonCode     = 'late_payment' | 'complimentary' | 'data_entry_error' | 'method_mismatch' | 'other' | 'refund' | 'cash_over' | 'cash_short' | 'prize_award_delivered';

export interface SubscriptionAdjustment {
  id:             string;
  roomId:         string;
  ts:             string;
  adjustmentType: AdjustmentType;
  amount:         number;
  currency:       string;
  paymentMethod:  PaymentMethod | null;
  reasonCode:     ReasonCode | null;
  note:           string | null;
  createdBy:      string | null;
  createdAt:      string;
}

export interface SubscriptionReconciliationPeriod {
  id:               string;
  roomId:           string;
  clubId:           string;
  openingBalance:   number;
  periodReceipts:   number;
  startingTotal:    number;
  adjustmentsNet:   number;
  closingBalance:   number;
  approvedBy:       string | null;
  approvedAt:       string | null;
  notes:            string | null;
  periodStart:      string;
  createdAt:        string;
  updatedAt:        string | null;
}

export interface LifetimeSummary {
  periodCount:      number;
  totalReceipts:    number;
  totalAdjustments: number;
  currentBalance:   number;
  lastApprovedAt:   string | null;
}

export interface CurrentPeriodResponse {
  reconciliation: SubscriptionReconciliationPeriod;
  adjustments:    SubscriptionAdjustment[];
  liveReceipts:   { total: number; count: number };
}

class SubscriptionReconciliationService extends BaseService {
  private readonly base = '/subscription-reconciliation';

  getCurrent(roomId: string) {
    return this.request<CurrentPeriodResponse>(`${this.base}/room/${roomId}/current`);
  }

  getHistory(roomId: string) {
    return this.request<{ history: SubscriptionReconciliationPeriod[] }>(`${this.base}/room/${roomId}/history`);
  }

  getSummary(roomId: string) {
    return this.request<{ summary: LifetimeSummary }>(`${this.base}/room/${roomId}/summary`);
  }

  addAdjustment(roomId: string, payload: {
    adjustmentType: AdjustmentType;
    amount: number;
    paymentMethod?: PaymentMethod;
    reasonCode?: ReasonCode;
    note?: string | null;
    createdBy?: string;
    currency?: string;
  }) {
    return this.request<{ reconciliationId: string; adjustment: SubscriptionAdjustment }>(
      `${this.base}/room/${roomId}/adjustments`,
      { method: 'POST', body: JSON.stringify(payload) }
    );
  }

  updateAdjustment(roomId: string, adjustmentId: string, patch: Partial<{
    adjustmentType: AdjustmentType; amount: number; paymentMethod: PaymentMethod; reasonCode: ReasonCode; note: string;
  }>) {
    return this.request<{ ok: boolean }>(
      `${this.base}/room/${roomId}/adjustments/${adjustmentId}`,
      { method: 'PATCH', body: JSON.stringify(patch) }
    );
  }

  deleteAdjustment(roomId: string, adjustmentId: string) {
    return this.request<{ ok: boolean }>(
      `${this.base}/room/${roomId}/adjustments/${adjustmentId}`,
      { method: 'DELETE' }
    );
  }

  approve(roomId: string, payload: { approvedBy: string; notes?: string | null; finalLeaderboard?: unknown }) {
    return this.request<{ ok: boolean; reconciliation: SubscriptionReconciliationPeriod }>(
      `${this.base}/room/${roomId}/approve`,
      { method: 'POST', body: JSON.stringify(payload) }
    );
  }
}

export default new SubscriptionReconciliationService();