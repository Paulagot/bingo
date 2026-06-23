// src/components/mgtsystem/services/TotalIncomeReportService.ts
//
// Data layer for the emergency Total Income Report. Deliberately its own
// service, separate from QuizRoomsService / quizPaymentMethodsService —
// this report spans two unrelated tables (donations + tickets) and has
// its own shape, so bolting it onto an existing service would blur what
// each service is responsible for.
//
// Extends BaseService like every other service in this folder, so it
// gets the real auth (Bearer token from localStorage via getAuthHeaders,
// not cookies) and error handling for free. An earlier version of this
// file used a bare fetch() with credentials: 'include' — that's the
// cookie-session pattern, not this app's, so every request went out
// with no Authorization header and the backend correctly 401'd it.

import BaseService from './BaseService';
import { SOLANA_TOKEN_DECIMALS } from '../config/solanaTokenDecimals';

export type DonationStatus = 'pending' | 'confirmed' | 'failed' | 'expired';

export interface RawDonation {
  id: number;
  club_id: string;
  club_donation_button_id: number | null;
  club_payment_method_id: number;
  payment_method_category_snapshot: string; // 'card' | 'crypto' typically
  payment_provider_snapshot: string | null;
  payment_method_label_snapshot: string | null;
  amount: string | number;
  currency: string;
  status: DonationStatus;
  external_checkout_id: string | null;
  external_transaction_id: string | null;
  donor_name: string | null;
  donor_email: string | null;
  created_at: string;
  confirmed_at: string | null;
  updated_at: string;
  crypto_chain: string | null;
  crypto_network: string | null;
  crypto_sender_wallet: string | null;
  crypto_token_code: string | null;
  crypto_token_mint: string | null;
  crypto_raw_amount: string | null;
}

export interface DonationRow {
  id: number;
  amountEur: number;
  currency: string;
  donorName: string;
  donorEmail: string | null;
  methodCategory: 'card' | 'crypto' | string;
  methodLabel: string | null;
  confirmedAt: string | null;
  createdAt: string;
  isCrypto: boolean;
  cryptoChain: string | null;
  cryptoTokenCode: string | null;
  cryptoTokenAmount: number | null; // human units, e.g. 1.3 SOL
  cryptoRawAmount: string | null;
  cryptoSenderWallet: string | null;
}

export interface TicketTypeSummary {
  ticketTypeName: string;
  ticketCount: number;
  totalAmount: number;
  currency: string;
}

export interface TicketsSummary {
  byType: TicketTypeSummary[];
  grandTotal: number;
  totalTickets: number;
}

export interface TotalIncomeReport {
  target: number;
  ticketsTotal: number;
  ticketsByType: TicketTypeSummary[];
  totalTickets: number;
  donationsTotal: number;
  donations: DonationRow[];
  donationsByMethod: { category: string; total: number; count: number }[];
  grandTotal: number;
  progressPct: number;
}

/** Hardcoded for this emergency report — agreed fixed target. */
export const REPORT_TARGET_EUR = 5000;

/**
 * Converts a raw on-chain integer amount (string, to avoid precision
 * loss) into human-readable token units using the same decimals table
 * the backend uses for quoting. Returns null if we don't recognize the
 * token — better to show nothing than a wrong number.
 */
function rawAmountToTokenUnits(rawAmount: string | null, tokenCode: string | null): number | null {
  if (!rawAmount || !tokenCode) return null;
  const decimals = SOLANA_TOKEN_DECIMALS[tokenCode as keyof typeof SOLANA_TOKEN_DECIMALS];
  if (decimals === undefined) return null;
  try {
    const raw = BigInt(rawAmount);
    const divisor = BigInt(10) ** BigInt(decimals);
    // BigInt division truncates, so do the fractional part in floating
    // point after splitting whole/remainder — fine for display purposes,
    // this is never used for an actual on-chain transfer amount.
    const whole = raw / divisor;
    const remainder = raw % divisor;
    const fractional = Number(remainder) / Number(divisor);
    return Number(whole) + fractional;
  } catch {
    return null;
  }
}

function mapDonation(d: RawDonation): DonationRow {
  const isCrypto = d.payment_method_category_snapshot === 'crypto';
  return {
    id: d.id,
    amountEur: parseFloat(String(d.amount)) || 0,
    currency: d.currency,
    donorName: d.donor_name || 'Anonymous',
    donorEmail: d.donor_email,
    methodCategory: d.payment_method_category_snapshot,
    methodLabel: d.payment_method_label_snapshot,
    confirmedAt: d.confirmed_at,
    createdAt: d.created_at,
    isCrypto,
    cryptoChain: d.crypto_chain,
    cryptoTokenCode: d.crypto_token_code,
    cryptoTokenAmount: isCrypto ? rawAmountToTokenUnits(d.crypto_raw_amount, d.crypto_token_code) : null,
    cryptoRawAmount: d.crypto_raw_amount,
    cryptoSenderWallet: d.crypto_sender_wallet,
  };
}

function summarizeByMethod(donations: DonationRow[]) {
  const map = new Map<string, { total: number; count: number }>();
  for (const d of donations) {
    const key = d.methodCategory || 'other';
    const entry = map.get(key) || { total: 0, count: 0 };
    entry.total += d.amountEur;
    entry.count += 1;
    map.set(key, entry);
  }
  return Array.from(map.entries()).map(([category, v]) => ({ category, ...v }));
}

class TotalIncomeReportServiceClass extends BaseService {
  private async fetchAllConfirmedDonations(clubId: string): Promise<DonationRow[]> {
    const res = await this.request<{ ok: boolean; donations: RawDonation[] }>(
      `/donations/${encodeURIComponent(clubId)}/list?status=confirmed&all=true`
    );
    return (res.donations || []).map(mapDonation);
  }

  private async fetchTicketsSummary(clubId: string): Promise<TicketsSummary> {
    const res = await this.request<{ ok: boolean } & TicketsSummary>(
      `/tickets/${encodeURIComponent(clubId)}/summary`
    );
    return {
      byType: res.byType || [],
      grandTotal: res.grandTotal || 0,
      totalTickets: res.totalTickets || 0,
    };
  }

  /**
   * Single entry point the modal calls. Fetches both sources in
   * parallel, club-scoped, confirmed-only, and assembles every number
   * the report needs so the component is pure rendering.
   */
  async loadTotalIncomeReport(clubId: string): Promise<TotalIncomeReport> {
    const [donations, ticketsSummary] = await Promise.all([
      this.fetchAllConfirmedDonations(clubId),
      this.fetchTicketsSummary(clubId),
    ]);

    const donationsTotal = donations.reduce((sum, d) => sum + d.amountEur, 0);
    const ticketsTotal = ticketsSummary.grandTotal;
    const grandTotal = donationsTotal + ticketsTotal;

    return {
      target: REPORT_TARGET_EUR,
      ticketsTotal,
      ticketsByType: ticketsSummary.byType,
      totalTickets: ticketsSummary.totalTickets,
      donationsTotal,
      donations: donations.sort((a, b) => (b.confirmedAt || '').localeCompare(a.confirmedAt || '')),
      donationsByMethod: summarizeByMethod(donations),
      grandTotal,
      progressPct: REPORT_TARGET_EUR > 0 ? Math.min(100, (grandTotal / REPORT_TARGET_EUR) * 100) : 0,
    };
  }
}

export const totalIncomeReportService = new TotalIncomeReportServiceClass();
export default totalIncomeReportService;