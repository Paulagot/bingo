// src/components/mgtsystem/services/SponsoredActivityReconciliationService.ts
//
// Frontend service for period-based Sponsored Activity reconciliation.
// Mirrors the subscription/drop reconciliation service pattern while using
// the sponsored-activity reconciliation API routes.

import BaseService from './BaseService';

export type AdjustmentType =
  | 'received'
  | 'refund'
  | 'fee'
  | 'cash_over_short'
  | 'prize_payout'
  | 'expense';

export type PaymentMethod =
  | 'cash'
  | 'card'
  | 'card_tap'
  | 'instant_payment'
  | 'pay_admin'
  | 'stripe'
  | 'web3'
  | 'crypto'
  | 'other';

export type ReasonCode =
  | 'late_payment'
  | 'complimentary'
  | 'data_entry_error'
  | 'method_mismatch'
  | 'refund'
  | 'cash_over'
  | 'cash_short'
  | 'prize_award_delivered'
  | 'venue_hire'
  | 'equipment'
  | 'catering'
  | 'printing'
  | 'marketing'
  | 'insurance'
  | 'professional_fees'
  | 'travel'
  | 'payment_processing'
  | 'other_expense'
  | 'other';

export interface SponsoredActivityAdjustment {
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

export interface SponsoredActivityReconciliationPeriod {
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

export interface SponsoredActivityLifetimeSummary {
  periodCount: number;
  totalReceipts: number;
  totalAdjustments: number;
  currentBalance: number;
  lastApprovedAt: string | null;
}

export interface SponsoredActivityCurrentResult {
  reconciliation: SponsoredActivityReconciliationPeriod;
  adjustments: SponsoredActivityAdjustment[];
  liveReceipts: {
    total: number;
    count: number;
  };
}

export interface SponsoredActivityHistoryResult {
  history: SponsoredActivityReconciliationPeriod[];
}

export interface SponsoredActivitySummaryResult {
  summary: SponsoredActivityLifetimeSummary;
}

export interface SponsoredActivityAddAdjustmentPayload {
  adjustmentType: AdjustmentType;
  amount: number;
  paymentMethod?: PaymentMethod | null;
  reasonCode?: ReasonCode | null;
  note?: string | null;
  createdBy?: string | null;
  currency?: string;
}

class SponsoredActivityReconciliationService extends BaseService {
  private readonly base = '/sponsored-activity-reconciliation';

  async getCurrent(
    roomId: string,
  ): Promise<SponsoredActivityCurrentResult> {
    return this.request<SponsoredActivityCurrentResult>(
      `${this.base}/room/${encodeURIComponent(roomId)}/current`,
    );
  }

  async getHistory(
    roomId: string,
  ): Promise<SponsoredActivityHistoryResult> {
    return this.request<SponsoredActivityHistoryResult>(
      `${this.base}/room/${encodeURIComponent(roomId)}/history`,
    );
  }

  async getSummary(
    roomId: string,
  ): Promise<SponsoredActivitySummaryResult> {
    return this.request<SponsoredActivitySummaryResult>(
      `${this.base}/room/${encodeURIComponent(roomId)}/summary`,
    );
  }

  async addAdjustment(
    roomId: string,
    payload: SponsoredActivityAddAdjustmentPayload,
  ): Promise<{
    reconciliationId: string;
    adjustment: SponsoredActivityAdjustment;
  }> {
    return this.request(
      `${this.base}/room/${encodeURIComponent(roomId)}/adjustments`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      },
    );
  }

  async updateAdjustment(
    roomId: string,
    adjustmentId: string,
    patch: Partial<SponsoredActivityAddAdjustmentPayload>,
  ): Promise<{ ok: boolean }> {
    return this.request(
      `${this.base}/room/${encodeURIComponent(roomId)}/adjustments/${encodeURIComponent(adjustmentId)}`,
      {
        method: 'PATCH',
        body: JSON.stringify(patch),
      },
    );
  }

  async deleteAdjustment(
    roomId: string,
    adjustmentId: string,
  ): Promise<{ ok: boolean }> {
    return this.request(
      `${this.base}/room/${encodeURIComponent(roomId)}/adjustments/${encodeURIComponent(adjustmentId)}`,
      {
        method: 'DELETE',
      },
    );
  }

  async approve(
    roomId: string,
    payload: {
      approvedBy: string;
      notes?: string | null;
    },
  ): Promise<{
    ok: boolean;
    reconciliation: SponsoredActivityReconciliationPeriod;
  }> {
    return this.request(
      `${this.base}/room/${encodeURIComponent(roomId)}/approve`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      },
    );
  }
}

const sponsoredActivityReconciliationService =
  new SponsoredActivityReconciliationService();

export default sponsoredActivityReconciliationService;