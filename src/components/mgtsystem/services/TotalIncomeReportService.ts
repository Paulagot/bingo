// src/components/mgtsystem/services/TotalIncomeReportService.ts
//
// Data layer for the club-wide Total Income Report. v2: the backend now
// owns categorization, adjustment classification, and the dynamic target
// (/api/income-report/:clubId - see clubIncomeReportService.js). This
// service is a thin typed pass-through; the modal is pure rendering.
//
// The old version fetched donations + a tickets summary and did the math
// client-side, with a hardcoded €5,000 target. Ticket money now comes
// from the payment ledger (single source), quiz_tickets provides labels
// only, and any disagreement between the two surfaces as ticketsVariance.

import BaseService from './BaseService';

export interface MethodBreakdown {
  method: string; // 'cash' | 'stripe' | 'instant_payment' | 'crypto' | 'card' | 'unknown' | …
  total: number;
  count: number;
}

export interface IncomeCategory {
  total: number;
  count: number;
  byMethod: MethodBreakdown[];
}

export interface TicketTypeSummary {
  ticketTypeName: string;
  ticketCount: number;
  totalAmount: number;
  currency: string;
}

export interface TicketsCategory extends IncomeCategory {
  byType: TicketTypeSummary[];
  /** Ticket count per quiz_tickets - may differ from ledger `count` */
  typeCount: number;
}

export interface DonationDetailRow {
  id: number;
  donorName: string;
  donorEmail: string | null;
  amount: number;
  currency: string;
  methodCategory: string;
  methodLabel: string | null;
  isCrypto: boolean;
  cryptoChain: string | null;
  cryptoTokenCode: string | null;
  cryptoRawAmount: string | null;
  cryptoSenderWallet: string | null;
  confirmedAt: string | null;
}

export interface AdjustmentLine {
  adjustmentType: 'received' | 'refund' | 'fee' | 'cash_over_short' | 'prize_payout' | string;
  reasonCode: string | null;
  method: string;
  total: number;
  count: number;
}

export interface UnclassifiedAdjustment extends AdjustmentLine {
  approved: boolean;
}

export interface AdjustmentDetailRow {
  id: number;
  roomId: string;
  adjustmentType: string;
  reasonCode: string | null;
  method: string;
  amount: number;
  note: string | null;
  createdBy: string | null;
  ts: string | null;
  kind: 'income' | 'expense';
}

export interface ClubIncomeReport {
  target: number;
  /** All income, NO expenses - this is what's measured against target */
  grossIncome: number;
  progressPct: number;
  income: {
    tickets: TicketsCategory;
    subscriptions: IncomeCategory;
    other: IncomeCategory;
    donations: IncomeCategory;
    adjustmentIncome: { total: number; byType: AdjustmentLine[] };
  };
  expenses: { total: number; byType: AdjustmentLine[] };
  /** Row-level donation detail for the expandable table */
  donationRows: DonationDetailRow[];
  /** Individual approved adjustment rows (income + expense) for expandable detail */
  adjustmentRows: AdjustmentDetailRow[];
  pendingAdjustments: { income: number; expense: number; net: number; count: number };
  unclassifiedAdjustments: UnclassifiedAdjustment[];
  /** grossIncome − expenses.total */
  netIncome: number;
  ticketsVariance: { ledgerTotal: number; ticketsTableTotal: number; delta: number };
}

class TotalIncomeReportServiceClass extends BaseService {
  async loadClubIncomeReport(clubId: string): Promise<ClubIncomeReport> {
    const res = await this.request<{ ok: boolean; report: ClubIncomeReport }>(
      `/income-report/${encodeURIComponent(clubId)}`
    );
    return res.report;
  }
}

export const totalIncomeReportService = new TotalIncomeReportServiceClass();
export default totalIncomeReportService;