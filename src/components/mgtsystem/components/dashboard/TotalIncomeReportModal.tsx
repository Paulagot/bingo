// src/components/mgtsystem/components/dashboard/TotalIncomeReportModal.tsx
//
// Club-wide income report overlay, v2.1. Reads the assembled report from
// /api/income-report/:clubId — this component is rendering only.
//
// Hierarchy (reads like a mini P&L):
//   1. Gross income vs target        ← NO expenses in this number
//   2. Income by category            ← tickets / subscriptions / other /
//                                       donations, each with method chips;
//                                       tickets expands into by-type
//   2b. Donation detail              ← expandable row-level table (donor,
//                                       method, wallet, token, amount)
//   3. Adjustment income             ← received + cash-over
//   4. Expenses                      ← refunds / fees / prizes / cash short
//   5. Net position                  ← gross − expenses
// Plus warnings that surface data problems instead of hiding them:
// pending (unapproved) adjustments, unclassified adjustments, and
// ledger-vs-tickets-table variance.

import { useEffect, useState, type ReactNode } from 'react';
import {
  X, Target, Ticket, Heart, Repeat, Layers, ChevronDown, ChevronUp,
  CreditCard, Coins, Banknote, Zap, RefreshCw, AlertTriangle,
  TrendingUp, TrendingDown, Scale, CircleDollarSign, Copy, Check,
} from 'lucide-react';
import {
  totalIncomeReportService,
  type ClubIncomeReport,
  type MethodBreakdown,
  type AdjustmentLine,
  type AdjustmentDetailRow,
} from '../../services/TotalIncomeReportService';
import { SOLANA_TOKEN_DECIMALS } from '../../config/solanaTokenDecimals';

interface TotalIncomeReportModalProps {
  clubId: string;
  clubName: string;
  onClose: () => void;
}

const INK = '#102532';
const MUTE = '#52636f';
const TEAL = '#157f85';
const GOLD = '#8a6d2f';
const GOLD_BG = 'rgba(210,181,130,0.2)';
const BORDER = '#dce1df';
const CREAM = '#f6f1e8';
const RED = '#b3423b';
const RED_BG = 'rgba(179,66,59,0.08)';
const AMBER_BG = 'rgba(240,201,107,0.18)';

function formatMoney(n: number, currency = 'EUR') {
  try {
    return new Intl.NumberFormat('en-IE', { style: 'currency', currency }).format(n || 0);
  } catch {
    return `€${(n || 0).toFixed(2)}`;
  }
}

function formatDate(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-IE', { day: '2-digit', month: 'short', year: 'numeric' });
}

/**
 * Raw on-chain integer amount → human token units (e.g. "1.3" SOL),
 * using the same decimals table the backend uses for quoting. Returns
 * null if the token is unknown — better to show nothing than a wrong
 * number. Display only, never used for transfers.
 */
function rawAmountToTokenUnits(rawAmount: string | null, tokenCode: string | null): string | null {
  if (!rawAmount || !tokenCode) return null;
  const decimals = SOLANA_TOKEN_DECIMALS[tokenCode as keyof typeof SOLANA_TOKEN_DECIMALS];
  if (decimals === undefined) return null;
  try {
    const raw = BigInt(rawAmount);
    const divisor = BigInt(10) ** BigInt(decimals);
    const whole = raw / divisor;
    const remainder = raw % divisor;
    const fractional = Number(remainder) / Number(divisor);
    const value = Number(whole) + fractional;
    return value.toFixed(6).replace(/\.?0+$/, '');
  } catch {
    return null;
  }
}

const METHOD_META: Record<string, { label: string; Icon: typeof Coins }> = {
  crypto: { label: 'Crypto', Icon: Coins },
  web3: { label: 'Crypto', Icon: Coins },
  stripe: { label: 'Stripe', Icon: CreditCard },
  card: { label: 'Card', Icon: CreditCard },
  card_tap: { label: 'Card tap', Icon: CreditCard },
  cash: { label: 'Cash', Icon: Banknote },
  instant_payment: { label: 'Instant', Icon: Zap },
  pay_admin: { label: 'Pay admin', Icon: Banknote },
};

const ADJUSTMENT_LABELS: Record<string, string> = {
  received: 'Money received',
  refund: 'Refunds',
  fee: 'Fees',
  prize_payout: 'Prize payouts',
  cash_over_short: 'Cash over/short',
};

function adjustmentLabel(a: Pick<AdjustmentLine, 'adjustmentType' | 'reasonCode'>) {
  const base = ADJUSTMENT_LABELS[a.adjustmentType] || a.adjustmentType;
  if (a.adjustmentType === 'cash_over_short') {
    if (a.reasonCode === 'cash_over') return 'Cash over';
    if (a.reasonCode === 'cash_short') return 'Cash short';
  }
  return base;
}

/** One approved adjustment row inside an expanded section */
function AdjustmentRowView({ row }: { row: AdjustmentDetailRow }) {
  const isIncome = row.kind === 'income';
  const sub = [
    `Room ${row.roomId.length > 10 ? `${row.roomId.slice(0, 8)}…` : row.roomId}`,
    row.ts ? formatDate(row.ts) : null,
    row.createdBy || null,
    row.method !== 'unknown' ? row.method.replace('_', ' ') : null,
  ].filter(Boolean).join(' · ');
  return (
    <div className="flex items-start justify-between gap-3 px-4 py-2.5">
      <div className="min-w-0">
        <p className="text-xs font-semibold" style={{ color: INK }}>{adjustmentLabel(row)}</p>
        <p className="text-[10px] capitalize" style={{ color: MUTE }}>{sub}</p>
        {row.note && (
          <p className="text-[10px] mt-0.5 italic truncate" style={{ color: MUTE }} title={row.note}>
            "{row.note}"
          </p>
        )}
      </div>
      <p className="flex-shrink-0 text-xs font-bold" style={{ color: isIncome ? TEAL : RED }}>
        {isIncome ? '+' : '−'}{formatMoney(row.amount)}
      </p>
    </div>
  );
}

/** "Money received (4) · Cash over (1)" — aggregated across payment methods */
function aggregatedAdjustmentSummary(byType: AdjustmentLine[]) {
  const counts: Record<string, number> = {};
  for (const a of byType) {
    const label = adjustmentLabel(a);
    counts[label] = (counts[label] || 0) + a.count;
  }
  return Object.entries(counts).map(([label, count]) => `${label} (${count})`).join(' · ');
}

function CopyableWallet({ address }: { address: string }) {
  const [copied, setCopied] = useState(false);
  const short = `${address.slice(0, 4)}…${address.slice(-4)}`;
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(address);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch { /* clipboard unavailable, ignore */ }
      }}
      className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-mono transition"
      style={{ background: '#f1f0ee', color: MUTE }}
      title={address}
    >
      {short}
      {copied ? <Check className="h-3 w-3" style={{ color: TEAL }} /> : <Copy className="h-3 w-3" />}
    </button>
  );
}

function MethodChips({ byMethod }: { byMethod: MethodBreakdown[] }) {
  if (!byMethod.length) return null;
  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {byMethod.map((m) => {
        const meta = METHOD_META[m.method] || { label: m.method, Icon: CircleDollarSign };
        const { Icon } = meta;
        return (
          <span
            key={m.method}
            className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold"
            style={{ background: 'rgba(21,127,133,0.08)', color: TEAL }}
          >
            <Icon className="h-3 w-3" />
            <span className="capitalize">{meta.label}</span>
            <span style={{ color: INK }}>{formatMoney(m.total)}</span>
            <span style={{ color: MUTE }}>({m.count})</span>
          </span>
        );
      })}
    </div>
  );
}

function CategoryCard({
  icon,
  iconBg,
  label,
  total,
  sub,
  byMethod,
  children,
}: {
  icon: ReactNode;
  iconBg: string;
  label: string;
  total: number;
  sub: string;
  byMethod?: MethodBreakdown[];
  children?: ReactNode;
}) {
  return (
    <div className="rounded-xl p-4" style={{ background: '#ffffff', border: `1px solid ${BORDER}` }}>
      <div className="flex items-center gap-2 mb-1">
        <div className="p-1.5 rounded-lg" style={{ background: iconBg }}>{icon}</div>
        <span className="text-xs font-semibold" style={{ color: MUTE }}>{label}</span>
      </div>
      <p className="text-xl font-bold" style={{ color: INK }}>{formatMoney(total)}</p>
      <p className="text-[11px] mt-0.5" style={{ color: MUTE }}>{sub}</p>
      {byMethod && <MethodChips byMethod={byMethod} />}
      {children}
    </div>
  );
}

export default function TotalIncomeReportModal({ clubId, clubName, onClose }: TotalIncomeReportModalProps) {
  const [report, setReport] = useState<ClubIncomeReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [ticketsExpanded, setTicketsExpanded] = useState(false);
  const [donationsExpanded, setDonationsExpanded] = useState(false);
  const [adjIncomeExpanded, setAdjIncomeExpanded] = useState(false);
  const [expensesExpanded, setExpensesExpanded] = useState(false);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      setReport(await totalIncomeReportService.loadClubIncomeReport(clubId));
    } catch (e: any) {
      setError(e?.message || 'Failed to load income report');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [clubId]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const hasVariance = report ? Math.abs(report.ticketsVariance.delta) > 0.005 : false;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 sm:p-6"
      style={{ background: 'rgba(16,37,50,0.55)' }}
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-3xl rounded-2xl shadow-2xl my-4 sm:my-8"
        style={{ background: '#ffffff' }}
        onClick={e => e.stopPropagation()}
      >
        {/* ── Header ── */}
        <div
          className="flex items-center justify-between gap-4 rounded-t-2xl px-5 sm:px-7 py-5"
          style={{ background: INK }}
        >
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'rgba(255,255,255,0.55)' }}>
              Income report
            </p>
            <h2 className="text-lg sm:text-xl font-bold text-white mt-0.5">{clubName}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex-shrink-0 rounded-lg p-2 transition"
            style={{ background: 'rgba(255,255,255,0.08)' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.16)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.08)')}
            aria-label="Close report"
          >
            <X className="h-4 w-4 text-white" />
          </button>
        </div>

        <div className="px-5 sm:px-7 py-6">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div
                className="h-7 w-7 animate-spin rounded-full border-4 border-t-transparent"
                style={{ borderColor: TEAL, borderTopColor: 'transparent' }}
              />
              <span className="ml-3 text-sm" style={{ color: MUTE }}>Building report…</span>
            </div>
          ) : error ? (
            <div className="py-12 text-center">
              <AlertTriangle className="mx-auto mb-3 h-8 w-8" style={{ color: '#e9574f' }} />
              <p className="text-sm font-semibold" style={{ color: '#e9574f' }}>Couldn't load the report</p>
              <p className="mt-1 text-xs" style={{ color: MUTE }}>{error}</p>
              <button
                onClick={load}
                className="mt-4 inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white"
                style={{ background: TEAL }}
              >
                <RefreshCw className="h-4 w-4" /> Retry
              </button>
            </div>
          ) : report ? (
            <>
              {/* ── 1. Gross income vs target ── */}
              <div className="rounded-xl p-5" style={{ background: CREAM, border: `1px solid ${BORDER}` }}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Target className="h-4 w-4" style={{ color: TEAL }} />
                    <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: MUTE }}>
                      Gross income vs target
                    </span>
                  </div>
                  {report.target > 0 && (
                    <span className="text-xs font-semibold" style={{ color: report.progressPct >= 100 ? TEAL : GOLD }}>
                      {report.progressPct.toFixed(0)}%
                    </span>
                  )}
                </div>
                <div className="flex items-baseline gap-2 mb-3">
                  <span className="text-3xl font-bold" style={{ color: INK }}>
                    {formatMoney(report.grossIncome)}
                  </span>
                  {report.target > 0 ? (
                    <span className="text-sm font-medium" style={{ color: MUTE }}>
                      of {formatMoney(report.target)} target
                    </span>
                  ) : (
                    <span className="text-sm font-medium" style={{ color: MUTE }}>
                      · no event goals set yet
                    </span>
                  )}
                </div>
                {report.target > 0 && (
                  <div className="h-2.5 w-full rounded-full overflow-hidden" style={{ background: 'rgba(16,37,50,0.08)' }}>
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.max(2, Math.min(100, report.progressPct))}%`,
                        background: report.progressPct >= 100 ? TEAL : `linear-gradient(90deg, ${TEAL}, #2da6ad)`,
                      }}
                    />
                  </div>
                )}
                <p className="mt-2 text-[11px]" style={{ color: MUTE }}>
                  Income before expenses · target is the sum of your event goals
                </p>
              </div>

              {/* ── 2. Income by category ── */}
              <p className="mt-5 mb-2 text-xs font-semibold uppercase tracking-wide" style={{ color: MUTE }}>
                Income
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <CategoryCard
                  icon={<Ticket className="h-3.5 w-3.5" style={{ color: TEAL }} />}
                  iconBg="rgba(21,127,133,0.1)"
                  label="Pre-sold tickets"
                  total={report.income.tickets.total}
                  sub={`${report.income.tickets.count} payment${report.income.tickets.count === 1 ? '' : 's'} · confirmed only`}
                  byMethod={report.income.tickets.byMethod}
                >
                  {report.income.tickets.byType.length > 0 && (
                    <div className="mt-3">
                      <button
                        type="button"
                        onClick={() => setTicketsExpanded(v => !v)}
                        className="flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-[11px] font-semibold"
                        style={{ background: '#fbf8f2', color: MUTE, border: `1px solid ${BORDER}` }}
                      >
                        By ticket type ({report.income.tickets.byType.length})
                        {ticketsExpanded
                          ? <ChevronUp className="h-3.5 w-3.5" />
                          : <ChevronDown className="h-3.5 w-3.5" />}
                      </button>
                      {ticketsExpanded && (
                        <div className="mt-1 divide-y rounded-lg" style={{ border: `1px solid ${BORDER}` }}>
                          {report.income.tickets.byType.map(t => (
                            <div key={t.ticketTypeName} className="flex items-center justify-between px-2.5 py-1.5">
                              <div>
                                <p className="text-xs font-semibold" style={{ color: INK }}>{t.ticketTypeName}</p>
                                <p className="text-[10px]" style={{ color: MUTE }}>{t.ticketCount} sold</p>
                              </div>
                              <p className="text-xs font-bold" style={{ color: INK }}>
                                {formatMoney(t.totalAmount, t.currency)}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </CategoryCard>

                <CategoryCard
                  icon={<Repeat className="h-3.5 w-3.5" style={{ color: TEAL }} />}
                  iconBg="rgba(21,127,133,0.1)"
                  label="Subscriptions"
                  total={report.income.subscriptions.total}
                  sub={`${report.income.subscriptions.count} payment${report.income.subscriptions.count === 1 ? '' : 's'} · confirmed only`}
                  byMethod={report.income.subscriptions.byMethod}
                />

                <CategoryCard
                  icon={<Layers className="h-3.5 w-3.5" style={{ color: GOLD }} />}
                  iconBg={GOLD_BG}
                  label="Other income"
                  total={report.income.other.total}
                  sub={`${report.income.other.count} payment${report.income.other.count === 1 ? '' : 's'} · on-the-night & walk-ins`}
                  byMethod={report.income.other.byMethod}
                />

                <CategoryCard
                  icon={<Heart className="h-3.5 w-3.5" style={{ color: GOLD }} />}
                  iconBg={GOLD_BG}
                  label="Donations"
                  total={report.income.donations.total}
                  sub={`${report.income.donations.count} donation${report.income.donations.count === 1 ? '' : 's'} · confirmed only`}
                  byMethod={report.income.donations.byMethod}
                />
              </div>

              {/* ── 2b. Donation detail (expandable, full width) ── */}
              {report.donationRows.length > 0 && (
                <div className="mt-3 rounded-xl overflow-hidden" style={{ border: `1px solid ${BORDER}` }}>
                  <button
                    type="button"
                    onClick={() => setDonationsExpanded(v => !v)}
                    className="flex w-full items-center justify-between px-4 py-3 transition"
                    style={{ background: '#fbf8f2' }}
                  >
                    <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: MUTE }}>
                      Donation detail ({report.donationRows.length})
                    </span>
                    {donationsExpanded
                      ? <ChevronUp className="h-4 w-4" style={{ color: MUTE }} />
                      : <ChevronDown className="h-4 w-4" style={{ color: MUTE }} />}
                  </button>

                  {donationsExpanded && (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                            <th className="text-left px-4 py-2 text-[11px] font-semibold uppercase tracking-wide" style={{ color: MUTE }}>Donor</th>
                            <th className="text-left px-4 py-2 text-[11px] font-semibold uppercase tracking-wide" style={{ color: MUTE }}>Method</th>
                            <th className="text-left px-4 py-2 text-[11px] font-semibold uppercase tracking-wide" style={{ color: MUTE }}>Wallet / token</th>
                            <th className="text-left px-4 py-2 text-[11px] font-semibold uppercase tracking-wide" style={{ color: MUTE }}>Date</th>
                            <th className="text-right px-4 py-2 text-[11px] font-semibold uppercase tracking-wide" style={{ color: MUTE }}>Amount</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y" style={{ background: '#ffffff' }}>
                          {report.donationRows.map(d => {
                            const tokenAmount = d.isCrypto
                              ? rawAmountToTokenUnits(d.cryptoRawAmount, d.cryptoTokenCode)
                              : null;
                            return (
                              <tr key={d.id}>
                                <td className="px-4 py-2.5">
                                  <p className="font-semibold" style={{ color: INK }}>{d.donorName}</p>
                                  {d.donorEmail && (
                                    <p className="text-[11px]" style={{ color: MUTE }}>{d.donorEmail}</p>
                                  )}
                                </td>
                                <td className="px-4 py-2.5">
                                  {d.isCrypto ? (
                                    <span
                                      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold"
                                      style={{ background: 'rgba(21,127,133,0.1)', color: TEAL }}
                                    >
                                      <Coins className="h-3 w-3" /> Crypto{d.cryptoTokenCode ? ` · ${d.cryptoTokenCode}` : ''}
                                    </span>
                                  ) : (
                                    <span
                                      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold"
                                      style={{ background: GOLD_BG, color: GOLD }}
                                    >
                                      <CreditCard className="h-3 w-3" /> {d.methodLabel || 'Card'}
                                    </span>
                                  )}
                                </td>
                                <td className="px-4 py-2.5">
                                  {d.isCrypto ? (
                                    <div className="flex flex-col gap-1">
                                      {tokenAmount && (
                                        <span className="text-xs font-mono font-semibold" style={{ color: TEAL }}>
                                          {tokenAmount} {d.cryptoTokenCode}
                                        </span>
                                      )}
                                      {d.cryptoChain && (
                                        <span className="text-[10px] uppercase" style={{ color: MUTE }}>{d.cryptoChain}</span>
                                      )}
                                      {d.cryptoSenderWallet && (
                                        <CopyableWallet address={d.cryptoSenderWallet} />
                                      )}
                                    </div>
                                  ) : (
                                    <span className="text-xs" style={{ color: MUTE }}>—</span>
                                  )}
                                </td>
                                <td className="px-4 py-2.5 text-xs" style={{ color: MUTE }}>{formatDate(d.confirmedAt)}</td>
                                <td className="px-4 py-2.5 text-right font-bold" style={{ color: INK }}>
                                  {formatMoney(d.amount, d.currency)}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* ── 3. Adjustment income (expandable) ── */}
              {report.income.adjustmentIncome.total > 0 && (() => {
                const incomeRows = report.adjustmentRows.filter(r => r.kind === 'income');
                return (
                  <div className="mt-3 rounded-xl overflow-hidden" style={{ border: `1px solid ${BORDER}` }}>
                    <button
                      type="button"
                      onClick={() => setAdjIncomeExpanded(v => !v)}
                      className="flex w-full items-center justify-between px-4 py-3 transition"
                      style={{ background: '#ffffff' }}
                    >
                      <div className="flex items-center gap-2 text-left">
                        <TrendingUp className="h-3.5 w-3.5 flex-shrink-0" style={{ color: TEAL }} />
                        <div>
                          <p className="text-xs font-semibold" style={{ color: INK }}>
                            Adjustment income ({incomeRows.length})
                          </p>
                          <p className="text-[10px]" style={{ color: MUTE }}>
                            {aggregatedAdjustmentSummary(report.income.adjustmentIncome.byType)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-bold" style={{ color: TEAL }}>
                          +{formatMoney(report.income.adjustmentIncome.total)}
                        </p>
                        {adjIncomeExpanded
                          ? <ChevronUp className="h-4 w-4" style={{ color: MUTE }} />
                          : <ChevronDown className="h-4 w-4" style={{ color: MUTE }} />}
                      </div>
                    </button>
                    {adjIncomeExpanded && incomeRows.length > 0 && (
                      <div className="divide-y" style={{ background: '#fbf8f2', borderTop: `1px solid ${BORDER}` }}>
                        {incomeRows.map(r => <AdjustmentRowView key={r.id} row={r} />)}
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* ── 4. Expenses (expandable) ── */}
              <p className="mt-5 mb-2 text-xs font-semibold uppercase tracking-wide" style={{ color: MUTE }}>
                Expenses
              </p>
              {(() => {
                const expenseRows = report.adjustmentRows.filter(r => r.kind === 'expense');
                return (
                  <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${BORDER}` }}>
                    {expenseRows.length === 0 ? (
                      <div className="px-4 py-5 text-center" style={{ background: '#ffffff' }}>
                        <p className="text-xs" style={{ color: MUTE }}>No expenses recorded from reconciliations.</p>
                      </div>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => setExpensesExpanded(v => !v)}
                          className="flex w-full items-center justify-between px-4 py-3 transition"
                          style={{ background: '#ffffff' }}
                        >
                          <div className="flex items-center gap-2 text-left">
                            <TrendingDown className="h-3.5 w-3.5 flex-shrink-0" style={{ color: RED }} />
                            <div>
                              <p className="text-xs font-semibold" style={{ color: INK }}>
                                Expenses ({expenseRows.length})
                              </p>
                              <p className="text-[10px]" style={{ color: MUTE }}>
                                {aggregatedAdjustmentSummary(report.expenses.byType)}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-bold" style={{ color: RED }}>
                              −{formatMoney(report.expenses.total)}
                            </p>
                            {expensesExpanded
                              ? <ChevronUp className="h-4 w-4" style={{ color: MUTE }} />
                              : <ChevronDown className="h-4 w-4" style={{ color: MUTE }} />}
                          </div>
                        </button>
                        {expensesExpanded && (
                          <div className="divide-y" style={{ background: '#fbf8f2', borderTop: `1px solid ${BORDER}` }}>
                            {expenseRows.map(r => <AdjustmentRowView key={r.id} row={r} />)}
                            <div className="flex items-center justify-between px-4 py-2.5" style={{ background: RED_BG }}>
                              <p className="text-xs font-bold" style={{ color: INK }}>Total expenses</p>
                              <p className="text-sm font-bold" style={{ color: RED }}>−{formatMoney(report.expenses.total)}</p>
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                );
              })()}

              {/* ── Warnings ── */}
              {report.pendingAdjustments.count > 0 && (
                <div className="mt-3 rounded-xl px-4 py-3" style={{ background: AMBER_BG, border: `1px solid ${BORDER}` }}>
                  <p className="text-xs font-semibold" style={{ color: GOLD }}>
                    {report.pendingAdjustments.count} adjustment{report.pendingAdjustments.count === 1 ? '' : 's'} awaiting reconciliation approval
                  </p>
                  <p className="text-[11px] mt-0.5" style={{ color: MUTE }}>
                    Not included above · net effect once approved: {report.pendingAdjustments.net >= 0 ? '+' : '−'}
                    {formatMoney(Math.abs(report.pendingAdjustments.net))}
                  </p>
                </div>
              )}

              {report.unclassifiedAdjustments.length > 0 && (
                <div className="mt-3 rounded-xl px-4 py-3" style={{ background: RED_BG, border: `1px solid ${BORDER}` }}>
                  <p className="text-xs font-semibold" style={{ color: RED }}>
                    {report.unclassifiedAdjustments.length} adjustment{report.unclassifiedAdjustments.length === 1 ? '' : 's'} couldn't be classified as income or expense
                  </p>
                  <p className="text-[11px] mt-0.5" style={{ color: MUTE }}>
                    Excluded from all totals — check the reason code on cash over/short entries in reconciliation.
                  </p>
                </div>
              )}

              {hasVariance && (
                <div className="mt-3 rounded-xl px-4 py-3" style={{ background: AMBER_BG, border: `1px solid ${BORDER}` }}>
                  <p className="text-xs font-semibold" style={{ color: GOLD }}>
                    Ticket records are out of sync by {formatMoney(Math.abs(report.ticketsVariance.delta))}
                  </p>
                  <p className="text-[11px] mt-0.5" style={{ color: MUTE }}>
                    Payment ledger shows {formatMoney(report.ticketsVariance.ledgerTotal)}, ticket records show{' '}
                    {formatMoney(report.ticketsVariance.ticketsTableTotal)}. The ledger figure is used above.
                  </p>
                </div>
              )}

              {/* ── 5. Net position ── */}
              <div className="mt-5 rounded-xl p-5" style={{ background: INK }}>
                <div className="flex items-center gap-2 mb-3">
                  <Scale className="h-4 w-4" style={{ color: '#7aacb5' }} />
                  <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#7aacb5' }}>
                    Net position
                  </span>
                </div>
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <span style={{ color: 'rgba(255,255,255,0.6)' }}>Gross income</span>
                    <span className="font-semibold text-white">{formatMoney(report.grossIncome)}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span style={{ color: 'rgba(255,255,255,0.6)' }}>Expenses</span>
                    <span className="font-semibold" style={{ color: '#f0a49e' }}>−{formatMoney(report.expenses.total)}</span>
                  </div>
                  <div
                    className="mt-1.5 flex items-center justify-between pt-2.5"
                    style={{ borderTop: '1px solid rgba(255,255,255,0.12)' }}
                  >
                    <span className="text-sm font-semibold text-white">Net income</span>
                    <span className="text-2xl font-bold" style={{ color: report.netIncome >= 0 ? '#4ade80' : '#f0a49e' }}>
                      {formatMoney(report.netIncome)}
                    </span>
                  </div>
                </div>
              </div>

              <p className="mt-4 text-[11px] text-center" style={{ color: MUTE }}>
                Confirmed payments and approved reconciliations only · {clubName}
              </p>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}