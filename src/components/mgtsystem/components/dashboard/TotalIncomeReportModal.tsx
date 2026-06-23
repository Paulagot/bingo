// src/components/mgtsystem/components/dashboard/TotalIncomeReportModal.tsx
//
// Emergency income report overlay. Club-scoped, confirmed-only (per
// DonationLedgerService status enum + quiz_tickets payment_status),
// pulls from TotalIncomeReportService which already does the merge of
// donations + tickets and the EUR-vs-target math. This component is
// rendering only — no business logic lives here on purpose, so the
// numbers can be unit tested via the service independent of the UI.

import { useEffect, useState } from 'react';
import {
  X, Target, Ticket, Heart, ChevronDown, ChevronUp,
  CreditCard, Coins, RefreshCw, AlertTriangle, Copy, Check,
} from 'lucide-react';
import {
  totalIncomeReportService,
  type TotalIncomeReport,
  type DonationRow,
} from '../../services/TotalIncomeReportService';

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

function formatMoney(n: number, currency = 'EUR') {
  try {
    return new Intl.NumberFormat('en-IE', { style: 'currency', currency }).format(n || 0);
  } catch {
    return `€${(n || 0).toFixed(2)}`;
  }
}

function formatTokenAmount(n: number | null) {
  if (n === null) return null;
  // Trim trailing zeros but keep enough precision to be useful, e.g.
  // "1.3 SOL" not "1.300000000 SOL".
  return n.toFixed(6).replace(/\.?0+$/, '');
}

function formatDate(iso: string | null) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('en-IE', { day: '2-digit', month: 'short', year: 'numeric' });
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

function DonationMethodBadge({ d }: { d: DonationRow }) {
  if (d.isCrypto) {
    return (
      <span
        className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold"
        style={{ background: 'rgba(21,127,133,0.1)', color: TEAL }}
      >
        <Coins className="h-3 w-3" /> Crypto{d.cryptoTokenCode ? ` · ${d.cryptoTokenCode}` : ''}
      </span>
    );
  }
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold"
      style={{ background: GOLD_BG, color: GOLD }}
    >
      <CreditCard className="h-3 w-3" /> Card
    </span>
  );
}

export default function TotalIncomeReportModal({ clubId, clubName, onClose }: TotalIncomeReportModalProps) {
  const [report, setReport] = useState<TotalIncomeReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [donationsExpanded, setDonationsExpanded] = useState(false);
  const [ticketsExpanded, setTicketsExpanded] = useState(false);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await totalIncomeReportService.loadTotalIncomeReport(clubId);
      setReport(r);
    } catch (e: any) {
      setError(e?.message || 'Failed to load income report');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [clubId]);

  // Close on Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

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
              Fundraising report
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
              {/* ── Target progress ── */}
              <div className="rounded-xl p-5" style={{ background: CREAM, border: `1px solid ${BORDER}` }}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Target className="h-4 w-4" style={{ color: TEAL }} />
                    <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: MUTE }}>
                      Total income vs target
                    </span>
                  </div>
                  <span className="text-xs font-semibold" style={{ color: report.progressPct >= 100 ? TEAL : GOLD }}>
                    {report.progressPct.toFixed(0)}%
                  </span>
                </div>
                <div className="flex items-baseline gap-2 mb-3">
                  <span className="text-3xl font-bold" style={{ color: INK }}>
                    {formatMoney(report.grandTotal)}
                  </span>
                  <span className="text-sm font-medium" style={{ color: MUTE }}>
                    of {formatMoney(report.target)} target
                  </span>
                </div>
                <div className="h-2.5 w-full rounded-full overflow-hidden" style={{ background: 'rgba(16,37,50,0.08)' }}>
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.max(2, Math.min(100, report.progressPct))}%`,
                      background: report.progressPct >= 100 ? TEAL : `linear-gradient(90deg, ${TEAL}, #2da6ad)`,
                    }}
                  />
                </div>
              </div>

              {/* ── Summary cards ── */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
                <div className="rounded-xl p-4" style={{ background: '#ffffff', border: `1px solid ${BORDER}` }}>
                  <div className="flex items-center gap-2 mb-1">
                    <div className="p-1.5 rounded-lg" style={{ background: 'rgba(21,127,133,0.1)' }}>
                      <Ticket className="h-3.5 w-3.5" style={{ color: TEAL }} />
                    </div>
                    <span className="text-xs font-semibold" style={{ color: MUTE }}>Ticket sales</span>
                  </div>
                  <p className="text-xl font-bold" style={{ color: INK }}>{formatMoney(report.ticketsTotal)}</p>
                  <p className="text-[11px] mt-0.5" style={{ color: MUTE }}>
                    {report.totalTickets} ticket{report.totalTickets === 1 ? '' : 's'} · confirmed only
                  </p>
                </div>

                <div className="rounded-xl p-4" style={{ background: '#ffffff', border: `1px solid ${BORDER}` }}>
                  <div className="flex items-center gap-2 mb-1">
                    <div className="p-1.5 rounded-lg" style={{ background: GOLD_BG }}>
                      <Heart className="h-3.5 w-3.5" style={{ color: GOLD }} />
                    </div>
                    <span className="text-xs font-semibold" style={{ color: MUTE }}>Donations</span>
                  </div>
                  <p className="text-xl font-bold" style={{ color: INK }}>{formatMoney(report.donationsTotal)}</p>
                  <p className="text-[11px] mt-0.5" style={{ color: MUTE }}>
                    {report.donations.length} donation{report.donations.length === 1 ? '' : 's'} · confirmed only
                  </p>
                </div>
              </div>

              {/* ── Ticket breakdown by type (summary level, collapsible) ── */}
              {report.ticketsByType.length > 0 && (
                <div className="mt-4 rounded-xl overflow-hidden" style={{ border: `1px solid ${BORDER}` }}>
                  <button
                    type="button"
                    onClick={() => setTicketsExpanded(v => !v)}
                    className="flex w-full items-center justify-between px-4 py-3 transition"
                    style={{ background: '#fbf8f2' }}
                  >
                    <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: MUTE }}>
                      Ticket sales by type ({report.ticketsByType.length})
                    </span>
                    {ticketsExpanded
                      ? <ChevronUp className="h-4 w-4" style={{ color: MUTE }} />
                      : <ChevronDown className="h-4 w-4" style={{ color: MUTE }} />}
                  </button>

                  {ticketsExpanded && (
                    <div className="divide-y" style={{ background: '#ffffff', borderTop: `1px solid ${BORDER}` }}>
                      {report.ticketsByType.map(t => (
                        <div key={t.ticketTypeName} className="flex items-center justify-between px-4 py-2.5">
                          <div>
                            <p className="text-sm font-semibold" style={{ color: INK }}>{t.ticketTypeName}</p>
                            <p className="text-[11px]" style={{ color: MUTE }}>
                              {t.ticketCount} sold
                            </p>
                          </div>
                          <p className="text-sm font-bold" style={{ color: INK }}>
                            {formatMoney(t.totalAmount, t.currency)}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ── Donations by method (summary) ── */}
              {report.donationsByMethod.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {report.donationsByMethod.map(m => (
                    <div
                      key={m.category}
                      className="flex items-center gap-2 rounded-lg px-3 py-2"
                      style={{ background: CREAM, border: `1px solid ${BORDER}` }}
                    >
                      {m.category === 'crypto'
                        ? <Coins className="h-3.5 w-3.5" style={{ color: TEAL }} />
                        : <CreditCard className="h-3.5 w-3.5" style={{ color: GOLD }} />}
                      <span className="text-xs font-semibold capitalize" style={{ color: INK }}>{m.category}</span>
                      <span className="text-xs font-bold" style={{ color: INK }}>{formatMoney(m.total)}</span>
                      <span className="text-[11px]" style={{ color: MUTE }}>({m.count})</span>
                    </div>
                  ))}
                </div>
              )}

              {/* ── Donations detail (expandable) ── */}
              <div className="mt-4 rounded-xl overflow-hidden" style={{ border: `1px solid ${BORDER}` }}>
                <button
                  type="button"
                  onClick={() => setDonationsExpanded(v => !v)}
                  className="flex w-full items-center justify-between px-4 py-3 transition"
                  style={{ background: '#fbf8f2' }}
                >
                  <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: MUTE }}>
                    Donation detail ({report.donations.length})
                  </span>
                  {donationsExpanded
                    ? <ChevronUp className="h-4 w-4" style={{ color: MUTE }} />
                    : <ChevronDown className="h-4 w-4" style={{ color: MUTE }} />}
                </button>

                {donationsExpanded && (
                  report.donations.length === 0 ? (
                    <div className="px-4 py-8 text-center">
                      <p className="text-sm" style={{ color: MUTE }}>No confirmed donations yet.</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                            <th className="text-left px-4 py-2 text-[11px] font-semibold uppercase tracking-wide" style={{ color: MUTE }}>Donor</th>
                            <th className="text-left px-4 py-2 text-[11px] font-semibold uppercase tracking-wide" style={{ color: MUTE }}>Method</th>
                            <th className="text-left px-4 py-2 text-[11px] font-semibold uppercase tracking-wide" style={{ color: MUTE }}>Wallet / amount</th>
                            <th className="text-left px-4 py-2 text-[11px] font-semibold uppercase tracking-wide" style={{ color: MUTE }}>Date</th>
                            <th className="text-right px-4 py-2 text-[11px] font-semibold uppercase tracking-wide" style={{ color: MUTE }}>Amount</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y" style={{ background: '#ffffff' }}>
                          {report.donations.map(d => (
                            <tr key={d.id}>
                              <td className="px-4 py-2.5">
                                <p className="font-semibold" style={{ color: INK }}>{d.donorName}</p>
                                {d.donorEmail && (
                                  <p className="text-[11px]" style={{ color: MUTE }}>{d.donorEmail}</p>
                                )}
                              </td>
                              <td className="px-4 py-2.5"><DonationMethodBadge d={d} /></td>
                              <td className="px-4 py-2.5">
                                {d.isCrypto ? (
                                  <div className="flex flex-col gap-1">
                                    {d.cryptoTokenAmount !== null && (
                                      <span className="text-xs font-mono font-semibold" style={{ color: TEAL }}>
                                        {formatTokenAmount(d.cryptoTokenAmount)} {d.cryptoTokenCode}
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
                                  <span className="text-xs" style={{ color: MUTE }}>{d.methodLabel || '—'}</span>
                                )}
                              </td>
                              <td className="px-4 py-2.5 text-xs" style={{ color: MUTE }}>{formatDate(d.confirmedAt)}</td>
                              <td className="px-4 py-2.5 text-right font-bold" style={{ color: INK }}>
                                {formatMoney(d.amountEur, d.currency)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )
                )}
              </div>

              <p className="mt-4 text-[11px] text-center" style={{ color: MUTE }}>
                Showing confirmed payments only · {clubName}
              </p>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}