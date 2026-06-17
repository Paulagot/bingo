// src/components/mgtsystem/services/TicketedEventReconciliationService.ts
// UPDATED: PaymentSummary now includes byTicketType breakdown.

import BaseService from './BaseService';

export type AdjustmentType =
  | 'received'
  | 'refund'
  | 'fee'
  | 'cash_over_short'
  | 'prize_payout';

export type PaymentMethod =
  | 'cash' | 'card' | 'card_tap' | 'instant_payment'
  | 'pay_admin' | 'stripe' | 'web3' | 'crypto' | 'other';

export type ReasonCode =
  | 'late_payment' | 'complimentary' | 'data_entry_error' | 'method_mismatch'
  | 'refund' | 'prize_award_delivered' | 'cash_over' | 'cash_short' | 'other';

export interface TicketedEventAdjustment {
  id:             string;
  roomId:         string;
  ts:             string;
  adjustmentType: AdjustmentType;
  amount:         number;
  currency:       string;
  paymentMethod:  PaymentMethod | null;
  reasonCode:     ReasonCode | null;
  note:           string | null;
  createdBy:      string;
  createdAt:      string;
}

export interface TicketedEventReconciliation {
  id:                string;
  roomId:            string;
  clubId:            string;
  startingEntryFees: number;
  startingExtras:    number;
  startingTotal:     number;
  adjustmentsNet:    number;
  finalTotal:        number;
  approvedBy:        string | null;
  approvedAt:        string | null;
  notes:             string | null;
}

export interface TicketTypeBreakdown {
  ticketTypeId:   string;
  ticketTypeName: string;
  ticketCount:    number;
  entryFees:      number;
  total:          number;
}

export interface PaymentSummary {
  entryFees:        number;
  extras:           number;
  startingTotal:    number;
  confirmedPlayers: number;
  byMethod:         { method: string; entryFees: number; extras: number; total: number }[];
  byTicketType:     TicketTypeBreakdown[];  // ← new
  tickets:          { total: number; checkedIn: number; notCheckedIn: number };
}

export interface RoomMeta {
  clubId:          string;
  currencySymbol:  string;
  currency:        string;
  entryFee:        string;
  fundraisingMode: string;
  hostName:        string;
}

export interface ReconciliationState {
  meta:           RoomMeta | null;
  reconciliation: TicketedEventReconciliation | null;
  adjustments:    TicketedEventAdjustment[];
  summary:        PaymentSummary;
}

class TicketedEventReconciliationService extends BaseService {
  private readonly base = '/ticketed-event/reconciliation';

  async getState(roomId: string): Promise<ReconciliationState> {
    return this.request<ReconciliationState>(
      `${this.base}/room/${encodeURIComponent(roomId)}`,
    );
  }

  async addAdjustment(
    roomId: string,
    payload: {
      adjustmentType: AdjustmentType;
      amount:         number;
      paymentMethod:  PaymentMethod;
      reasonCode:     ReasonCode;
      note?:          string | null;
      createdBy?:     string;
    },
  ): Promise<{ ok: boolean; adjustment: TicketedEventAdjustment }> {
    return this.request(
      `${this.base}/room/${encodeURIComponent(roomId)}/adjustments`,
      { method: 'POST', body: JSON.stringify(payload) },
    );
  }

  async updateAdjustment(
    roomId: string,
    adjustmentId: string,
    patch: Partial<Pick<
      TicketedEventAdjustment,
      'adjustmentType' | 'amount' | 'paymentMethod' | 'reasonCode' | 'note'
    >>,
  ): Promise<{ ok: boolean }> {
    return this.request(
      `${this.base}/room/${encodeURIComponent(roomId)}/adjustments/${encodeURIComponent(adjustmentId)}`,
      { method: 'PATCH', body: JSON.stringify(patch) },
    );
  }

  async deleteAdjustment(
    roomId: string,
    adjustmentId: string,
  ): Promise<{ ok: boolean }> {
    return this.request(
      `${this.base}/room/${encodeURIComponent(roomId)}/adjustments/${encodeURIComponent(adjustmentId)}`,
      { method: 'DELETE' },
    );
  }

  async approve(
    roomId: string,
    payload: { approvedBy: string; notes?: string | null },
  ): Promise<{
    ok: boolean;
    data: {
      roomId:        string;
      finalTotal:    number;
      adjustmentsNet: number;
      startingTotal: number;
      approvedAt:    string;
      approvedBy:    string;
    };
  }> {
    return this.request(
      `${this.base}/room/${encodeURIComponent(roomId)}/approve`,
      { method: 'POST', body: JSON.stringify(payload) },
    );
  }

  async getPaymentView(roomId: string): Promise<{
    ok: boolean;
    onTheNight: {
      confirmedGroups: {
        confirmedById:   string;
        confirmedByName: string;
        confirmedByRole: string;
        totalAmount:     number;
        players: {
          playerId:         string;
          playerName:       string;
          ticketId:         string | null;
          paymentMethod:    string;
          methodLabel:      string | null;
          paymentReference: string | null;
          amount:           number;
          status:           string;
          saleType:         'walk_in' | 'advance';
        }[];
      }[];
      claimed: {
        playerId:         string;
        playerName:       string;
        ticketId:         string | null;
        paymentMethod:    string;
        methodLabel:      string | null;
        paymentReference: string | null;
        amount:           number;
      }[];
      disputed: {
        playerId:      string;
        playerName:    string;
        ticketId:      string | null;
        paymentMethod: string;
        amount:        number;
      }[];
      totalClaimed:  number;
      totalDisputed: number;
    };
  }> {
    return this.request(
      `${this.base}/room/${encodeURIComponent(roomId)}/payment-view`,
    );
  }

  async confirmPayment(
    roomId: string,
    ticketId: string,
    confirmedByName: string,
  ): Promise<{ ok: boolean }> {
    const token = localStorage.getItem('auth_token');
    const res = await fetch(
      `/api/ticketed-event/checkin/${encodeURIComponent(roomId)}/tickets/${encodeURIComponent(ticketId)}/confirm`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ confirmedByName }),
      },
    );
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error((data as any).error || `HTTP ${res.status}`);
    }
    return res.json();
  }

  async disputePayment(
    roomId: string,
    playerId: string,
    reason: string,
  ): Promise<{ ok: boolean }> {
    return this.request(
      `${this.base}/room/${encodeURIComponent(roomId)}/dispute-payment`,
      { method: 'POST', body: JSON.stringify({ playerId, reason }) },
    );
  }
}

const ticketedEventReconciliationService = new TicketedEventReconciliationService();
export default ticketedEventReconciliationService;