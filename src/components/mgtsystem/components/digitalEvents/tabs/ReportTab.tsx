// src/components/mgtsystem/components/digitalEvents/tabs/ReportTab.tsx
//
// Quiz / Elimination: unchanged from original — uses ReconciliationService.getFinancialReport.
// Ticketed Events:    early-return path, fetches from ticketedEventReconciliationService.
//                     Players column removed from breakdown table for ALL room types.

import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  DollarSign, TrendingDown, Ticket, FileText, AlertCircle,
  Clock, CheckCircle, Printer, Scale, Zap, UserCheck,
} from "lucide-react";
import type { Web2RoomListItem as Room } from "../../../../../shared/api/quiz.api";
import ReconciliationService from "../../../services/QuizReconciliationService";
import ticketedEventReconciliationService from "../../../services/TicketedEventReconciliationService";
import { useCurrency } from "../../../hooks/useCurrency";

// ─── Types (original, unchanged) ─────────────────────────────────────────────

interface ReconciliationData {
  fundraisingMode?: "fixed_fee" | "donation";
  startingEntryFees: number;
  startingExtras: number;
  startingTotal: number;
  adjustmentsNet: number;
  finalTotal: number;
  approvedBy: string;
  approvedAt: string | null;
}
interface TicketStats {
  totalSold: number; redeemed: number; unredeemed: number;
  totalRevenue: number; entryFees: number; extras: number;
}
interface PaymentMethodBreakdown { method: string; uniquePlayers?: number; total: number; }
interface PaymentSection { byMethod: PaymentMethodBreakdown[]; total: number; uniquePlayers?: number; }
interface OutstandingByStatus { status: string; uniquePlayers: number; total: number; }
interface OutstandingPayments { byStatus: OutstandingByStatus[]; uniquePlayers: number; total: number; }
interface WriteOffRow { playerId: string; playerName: string; total: number; adminNotes: string | null; }
interface WriteOffs { rows: WriteOffRow[]; uniquePlayers: number; total: number; }
interface ByMethodRow {
  method: string;
  confirmedOnNight: number; confirmedLate: number;
  expected: number; claimed: number; disputed: number; writtenOff: number; total?: number;
}
interface FinancialReport {
  reconciliation: ReconciliationData | null;
  tickets: TicketStats;
  onNightPayments: PaymentSection;
  latePayments?: PaymentSection;
  outstandingPayments?: OutstandingPayments;
  writeOffs?: WriteOffs;
}

// ─── Sub-components (original, unchanged) ────────────────────────────────────

function MetricCard({ label, value, tone = "gray", helper }: {
  label: string; value: string | number;
  tone?: "gray"|"indigo"|"green"|"amber"|"orange"|"red"|"purple"|"blue";
  helper?: string;
}) {
  const toneMap = {
    gray:   "border-[#dce1df] bg-white text-[#102532]",
    indigo: "border-[rgba(21,127,133,0.3)] bg-[rgba(21,127,133,0.08)] text-indigo-950",
    green:  "border-[rgba(21,127,133,0.3)] bg-[rgba(21,127,133,0.06)] text-green-950",
    amber:  "border-[rgba(210,181,130,0.5)] bg-[rgba(210,181,130,0.1)] text-amber-950",
    orange: "border-[rgba(210,181,130,0.5)] bg-[rgba(210,181,130,0.1)] text-orange-950",
    red:    "border-[rgba(233,87,79,0.3)] bg-[rgba(233,87,79,0.08)] text-red-950",
    purple: "border-[rgba(184,198,176,0.5)] bg-[rgba(184,198,176,0.1)] text-purple-950",
    blue:   "border-[rgba(21,127,133,0.3)] bg-[rgba(21,127,133,0.06)] text-blue-950",
  };
  const labelMap = {
    gray: "text-[#52636f]", indigo: "text-[#157f85]", green: "text-[#157f85]",
    amber: "text-[#8a6d2f]", orange: "text-[#8a6d2f]", red: "text-[#c8423b]",
    purple: "text-[#52636f]", blue: "text-[#157f85]",
  };
  return (
    <div className={`rounded-xl border p-3 ${toneMap[tone]}`}>
      <p className={`text-xs font-semibold uppercase tracking-wide ${labelMap[tone]}`}>{label}</p>
      <p className="mt-1 text-lg font-black">{value}</p>
      {helper && <p className="mt-1 text-[11px] text-[#52636f]">{helper}</p>}
    </div>
  );
}

function SectionHeader({ icon, title, subtitle }: { icon: ReactNode; title: string; subtitle?: string }) {
  return (
    <div className="mb-3 flex items-start gap-2">
      <div className="mt-0.5 flex-shrink-0">{icon}</div>
      <div>
        <h3 className="text-sm font-bold text-[#102532]">{title}</h3>
        {subtitle && <p className="mt-0.5 text-xs text-[#52636f]">{subtitle}</p>}
      </div>
    </div>
  );
}

function EmptyState({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-lg border border-dashed border-[#dce1df] bg-[#fbf8f2] p-4 text-center text-sm text-[#52636f]">
      {children}
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function escapeHtml(v: string) {
  return String(v || "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}
function getCurrentDocumentStyles() {
  return Array.from(document.querySelectorAll('link[rel="stylesheet"], style'))
    .map(n => n.outerHTML).join("\n");
}

const formatMethod = (m: string | null | undefined) => {
  const labels: Record<string, string> = {
    cash: "Cash", instant_payment: "Instant Payment", card: "Card",
    card_tap: "Card Tap", stripe: "Stripe", pay_admin: "Pay Admin",
    pay_host: "Pay Host", crypto: "Crypto", web3: "Web3", other: "Other",
  };
  if (!m) return "Unknown";
  return labels[m] || m.replace(/_/g, " ");
};

const formatStatus = (s: string) => {
  const l: Record<string, string> = {
    expected: "Expected / Pay Later", claimed: "Claimed, Not Confirmed",
    disputed: "Disputed", written_off: "Written Off", confirmed: "Confirmed",
  };
  return l[s] || s.replace(/_/g, " ");
};

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  room: Room; config?: any; auditView?: any; auditViewLoading?: boolean;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ReportTab({ room, config, auditView, auditViewLoading = false }: Props) {
  const isTicketedEvent = (room as any)?.game_type === "ticketed_event";

  // ── Quiz / Elimination state ───────────────────────────────────────────────
  const [loading, setLoading] = useState(!isTicketedEvent);
  const [error,   setError]   = useState<string | null>(null);
  const [report,  setReport]  = useState<FinancialReport | null>(null);

  // ── Ticketed event state ───────────────────────────────────────────────────
  const [teLoading, setTeLoading] = useState(isTicketedEvent);
  const [teError,   setTeError]   = useState<string | null>(null);
  const [teState,   setTeState]   = useState<any>(null);
  const [teView,    setTeView]    = useState<any>(null);

  const { fmt } = useCurrency(config);

  const gameType      = (room as any).game_type || config?.gameType || "quiz";
  const isElimination = gameType === "elimination";
  const gameTypeLabel = isElimination ? "Elimination" : isTicketedEvent ? "Event" : "Quiz";

  const roomName = room.scheduled_at
    ? new Date(room.scheduled_at).toLocaleDateString("en-GB", {
        day: "numeric", month: "short", year: "numeric",
      }) + ` ${gameTypeLabel}`
    : gameTypeLabel;

  // ── Fetch quiz/elimination ─────────────────────────────────────────────────
  useEffect(() => {
    if (isTicketedEvent || room.status !== "completed") return;
    (async () => {
      try {
        setLoading(true); setError(null);
        const data = (await ReconciliationService.getFinancialReport(room.room_id)) as any;
        if (!data.ok) throw new Error(data.error || "Failed to fetch report");
        setReport(data.report);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load report");
      } finally { setLoading(false); }
    })();
  }, [room.room_id, room.status, isTicketedEvent]);

  // ── Fetch ticketed event ───────────────────────────────────────────────────
  useEffect(() => {
    if (!isTicketedEvent || room.status !== "completed") return;
    (async () => {
      try {
        setTeLoading(true); setTeError(null);
        const [stateData, viewData] = await Promise.all([
          ticketedEventReconciliationService.getState(room.room_id),
          ticketedEventReconciliationService.getPaymentView(room.room_id),
        ]);
        setTeState(stateData);
        setTeView(viewData);
      } catch (e: any) {
        setTeError(e?.message || "Failed to load report");
      } finally { setTeLoading(false); }
    })();
  }, [room.room_id, room.status, isTicketedEvent]);

  // ── Breakdown rows for quiz/elimination — Players column removed ───────────
  const breakdownRows = useMemo(() => {
    if (isTicketedEvent) return [];
    const rows: ByMethodRow[] = Array.isArray(auditView?.byMethod) ? auditView.byMethod : [];
    return rows.map(row => {
      const confirmedOnNight = Number(row.confirmedOnNight || 0);
      const confirmedLate    = Number(row.confirmedLate    || 0);
      const outstanding      = Number(row.expected || 0) + Number(row.claimed || 0) + Number(row.disputed || 0);
      return { method: row.method || "unknown", confirmedOnNight, confirmedLate, outstanding, total: confirmedOnNight + confirmedLate + outstanding };
    }).filter(r => r.total > 0).sort((a, b) => b.total - a.total);
  }, [auditView, isTicketedEvent]);

  const breakdownTotals = useMemo(() => breakdownRows.reduce(
    (acc, row) => ({
      confirmedOnNight: acc.confirmedOnNight + row.confirmedOnNight,
      confirmedLate:    acc.confirmedLate    + row.confirmedLate,
      outstanding:      acc.outstanding      + row.outstanding,
      total:            acc.total            + row.total,
    }),
    { confirmedOnNight: 0, confirmedLate: 0, outstanding: 0, total: 0 },
  ), [breakdownRows]);

  const finalPos = useMemo(() => {
    if (!report?.reconciliation) return null;
    const approved    = report.reconciliation.finalTotal       ?? 0;
    const late        = report.latePayments?.total             ?? 0;
    const outstanding = report.outstandingPayments?.total      ?? 0;
    return { approved, late, collected: approved + late, outstanding };
  }, [report]);

  const handlePrint = () => {
    try {
      const el = document.getElementById("digital-event-financial-report");
      if (!el) throw new Error("Report element not found");
      const styles = getCurrentDocumentStyles();
      const html = `<!doctype html><html><head><meta charset="utf-8"/><title>Financial Report - ${escapeHtml(roomName)}</title>${styles}<style>body{margin:0;padding:0;background:#fff;-webkit-print-color-adjust:exact;print-color-adjust:exact}#pr{max-width:980px;margin:0 auto;padding:24px}.pc{break-inside:avoid;page-break-inside:avoid;margin-bottom:14px}.fixed,.absolute,.sticky{position:static!important}.overflow-y-auto,.overflow-auto,.overflow-hidden{overflow:visible!important}@media print{@page{size:A4;margin:14mm}}</style></head><body><div id="pr">${el.innerHTML}</div></body></html>`;
      const w = window.open("", "_blank", "width=1100,height=850");
      if (!w) { setError("Pop-up blocked. Please allow pop-ups to print."); return; }
      w.document.open(); w.document.write(html); w.document.close();
      const run = () => { w.focus(); setTimeout(() => w.print(), 500); };
      w.onload = run; setTimeout(() => { if (!w.closed) run(); }, 1000);
    } catch (e) { setError(e instanceof Error ? e.message : "Failed to prepare report"); }
  };

  // ── Guards ─────────────────────────────────────────────────────────────────

  if (room.status !== "completed") {
    return (
      <div className="p-5">
        <div className="rounded-xl border border-dashed border-[#dce1df] bg-[#fbf8f2] p-8 text-center">
          <p className="text-sm text-[#8a9bab]">The financial report is available once the {gameTypeLabel.toLowerCase()} is completed.</p>
        </div>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // TICKETED EVENT REPORT
  // ══════════════════════════════════════════════════════════════════════════

  if (isTicketedEvent) {
    if (teLoading) return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-[#157f85]" />
        <span className="ml-3 text-sm text-[#52636f]">Loading financial report…</span>
      </div>
    );
    if (teError) return (
      <div className="p-5">
        <div className="flex gap-3 rounded-xl border border-[rgba(233,87,79,0.3)] bg-[rgba(233,87,79,0.08)] p-4">
          <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-[#c8423b]" />
          <div>
            <p className="text-sm font-semibold text-[#8b1c1c]">Error loading report</p>
            <p className="text-xs text-[#c8423b] mt-1">{teError}</p>
          </div>
        </div>
      </div>
    );

    const recon    = teState?.reconciliation ?? null;
    const summary  = teState?.summary ?? null;
    const teSym    = teState?.meta?.currencySymbol ?? config?.currencySymbol ?? "€";
    const fmtTE    = (n: number) => `${teSym}${Number(n || 0).toFixed(2)}`;

    const confirmedGroups: any[] = teView?.onTheNight?.confirmedGroups ?? [];
    const claimed:         any[] = teView?.onTheNight?.claimed         ?? [];
    const disputed:        any[] = teView?.onTheNight?.disputed        ?? [];

    const methodMap: Record<string, number> = {};
    let walkInTotal = 0, advanceTotal = 0, walkInCount = 0, advanceCount = 0;
    for (const g of confirmedGroups) {
      for (const p of (g.players ?? [])) {
        methodMap[p.paymentMethod] = (methodMap[p.paymentMethod] ?? 0) + p.amount;
        if (p.saleType === "walk_in") { walkInTotal += p.amount; walkInCount++; }
        else                          { advanceTotal += p.amount; advanceCount++; }
      }
    }
    const teByMethod = Object.entries(methodMap)
      .map(([method, total]) => ({ method, total }))
      .sort((a, b) => b.total - a.total);

    const teReconData: ReconciliationData | null = recon ? {
      startingEntryFees: recon.startingEntryFees ?? summary?.entryFees ?? 0,
      startingExtras:    recon.startingExtras    ?? summary?.extras     ?? 0,
      startingTotal:     recon.startingTotal     ?? summary?.startingTotal ?? 0,
      adjustmentsNet:    recon.adjustmentsNet    ?? 0,
      finalTotal:        recon.finalTotal        ?? 0,
      approvedBy:        recon.approvedBy        ?? "",
      approvedAt:        recon.approvedAt        ?? null,
    } : null;

    return (
      <div className="p-5 space-y-4">
        <div className="flex justify-end">
          <button type="button" onClick={handlePrint}
            className="inline-flex items-center gap-2 rounded-lg bg-[#157f85] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0e6268]">
            <Printer className="h-4 w-4" /> Print / Save PDF
          </button>
        </div>
        <div id="digital-event-financial-report" className="space-y-4">

          {/* Title */}
          <div className="pc rounded-2xl border border-[#dce1df] bg-gradient-to-r from-[rgba(21,127,133,0.06)] via-white to-blue-50 p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h2 className="text-xl font-black text-[#102532]">Financial Report</h2>
                  <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                    <Ticket className="h-3 w-3" /> Ticketed Event
                  </span>
                </div>
                <p className="text-sm text-[#52636f]">{roomName}</p>
              </div>
              <div className="rounded-xl bg-white p-3 text-sm shadow-sm ring-1 ring-[#dce1df] flex-shrink-0">
                <p className="text-xs font-semibold uppercase tracking-wide text-[#52636f]">Room ID</p>
                <p className="mt-1 font-bold text-[#102532] font-mono text-xs">{room.room_id}</p>
              </div>
            </div>
          </div>

          {/* Ticket stats */}
          {summary?.tickets && summary.tickets.total > 0 && (
            <div className="pc rounded-2xl border border-[rgba(184,198,176,0.5)] bg-[rgba(184,198,176,0.1)] p-4">
              <SectionHeader icon={<Ticket className="h-5 w-5 text-[#52636f]" />} title="Ticket Sales" />
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <MetricCard label="Sold"       value={summary.tickets.total}      tone="purple" />
                <MetricCard label="Checked in" value={summary.tickets.checkedIn}  tone="blue" />
                <MetricCard label="Advance"    value={advanceCount}               tone="gray"   helper={fmtTE(advanceTotal)} />
                <MetricCard label="Walk-in"    value={walkInCount}                tone="amber"  helper={fmtTE(walkInTotal)} />
              </div>
            </div>
          )}

          {/* Financial summary */}
          {teReconData && (
            <div className="pc rounded-2xl border border-[#dce1df] bg-white p-4 shadow-sm">
              <SectionHeader icon={<DollarSign className="h-5 w-5 text-[#157f85]" />} title="Financial Summary" />
              <div className="grid grid-cols-2 gap-3">
                <MetricCard label="Starting total" value={fmtTE(teReconData.startingTotal)}  tone="gray"   helper="Confirmed ticket sales" />
                <MetricCard label="Adjustments"    value={fmtTE(teReconData.adjustmentsNet)} tone={teReconData.adjustmentsNet >= 0 ? "green" : "red"} />
              </div>
              <div className="mt-3 flex flex-col gap-2 rounded-xl bg-gray-950 p-4 text-white sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-gray-200">Approved Final Total</p>
                  <p className="text-xs text-[#8a9bab]">Signed off during reconciliation.</p>
                </div>
                <p className="text-2xl font-black">{fmtTE(teReconData.finalTotal)}</p>
              </div>

              {/* By payment method — no Players column */}
              {teByMethod.length > 0 && (
                <div className="mt-4">
                  <SectionHeader icon={<CheckCircle className="h-5 w-5 text-[#52636f]" />} title="Breakdown by Payment Method" />
                  <div className="rounded-xl border border-[#dce1df]">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-[#fbf8f2] border-b border-[#dce1df]">
                          <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase text-[#52636f]">Method</th>
                          <th className="px-3 py-2.5 text-right text-xs font-semibold uppercase text-[#157f85]">Confirmed</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 bg-white">
                        {teByMethod.map(row => (
                          <tr key={row.method} className="hover:bg-[#fbf8f2]">
                            <td className="px-3 py-2.5 font-medium text-[#102532]">{formatMethod(row.method)}</td>
                            <td className="px-3 py-2.5 text-right font-medium text-[#157f85]">{fmtTE(row.total)}</td>
                          </tr>
                        ))}
                        <tr className="border-t-2 border-[#dce1df] bg-[#fbf8f2] font-semibold">
                          <td className="px-3 py-2.5 text-[#102532]">Total</td>
                          <td className="px-3 py-2.5 text-right text-[#157f85]">{fmtTE(teByMethod.reduce((s, r) => s + r.total, 0))}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Approved payments — collected by */}
          <div className="pc rounded-2xl border border-[rgba(21,127,133,0.3)] bg-[rgba(21,127,133,0.06)] p-4">
            <SectionHeader icon={<UserCheck className="h-5 w-5 text-[#157f85]" />} title="Approved Payments"
              subtitle="Confirmed ticket payments grouped by who collected them." />
            {confirmedGroups.length > 0 ? (
              <div className="overflow-hidden rounded-xl border border-green-100 bg-white divide-y divide-green-50">
                {confirmedGroups.map((group: any) => (
                  <div key={group.confirmedById} className="px-3 py-2.5">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-[rgba(21,127,133,0.12)] flex items-center justify-center text-xs font-bold text-[#157f85] shrink-0">
                          {(group.confirmedByName ?? "?").charAt(0).toUpperCase()}
                        </div>
                        <span className="text-sm font-bold text-[#102532]">{group.confirmedByName}</span>
                        <span className="text-xs text-[#8a9bab]">
                          {group.confirmedByRole === "host" ? "Host" : group.confirmedByRole === "admin" ? "Staff" : group.confirmedByRole}
                        </span>
                      </div>
                      <span className="text-base font-black text-[#157f85]">{fmtTE(group.totalAmount)}</span>
                    </div>
                    <div className="ml-8 space-y-0.5">
                      {(group.players ?? []).map((p: any) => (
                        <div key={p.playerId + p.paymentMethod} className="flex justify-between text-xs text-[#8a9bab]">
                          <span>
                            {p.saleType === "walk_in"
                              ? <span className="mr-1 text-amber-600 font-semibold">Walk-in</span>
                              : <span className="mr-1 text-blue-600 font-semibold">Advance</span>}
                            {p.playerName} · {p.methodLabel || formatMethod(p.paymentMethod)}
                          </span>
                          <span>{fmtTE(p.amount)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
                <div className="px-3 py-2.5 flex justify-between bg-green-50">
                  <span className="text-sm font-semibold text-[#102532]">Total confirmed</span>
                  <span className="text-base font-black text-[#157f85]">
                    {fmtTE(confirmedGroups.reduce((s: number, g: any) => s + g.totalAmount, 0))}
                  </span>
                </div>
              </div>
            ) : <EmptyState>No confirmed payments found.</EmptyState>}
          </div>

          {/* Reconciliation record */}
          {teReconData ? (
            <div className="pc rounded-2xl border border-[rgba(21,127,133,0.3)] bg-[rgba(21,127,133,0.08)] p-4">
              <SectionHeader icon={<FileText className="h-5 w-5 text-[#157f85]" />} title="Approved Reconciliation" />
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <MetricCard label="Entry fees"     value={fmtTE(teReconData.startingEntryFees)} tone="gray" />
                <MetricCard label="Extras"         value={fmtTE(teReconData.startingExtras)}    tone="gray" />
                <MetricCard label="Adjustments"    value={fmtTE(teReconData.adjustmentsNet)}    tone={teReconData.adjustmentsNet >= 0 ? "green" : "red"} />
                <MetricCard label="Approved final" value={fmtTE(teReconData.finalTotal)}        tone="indigo" />
              </div>
              {teReconData.approvedBy && (
                <div className="mt-3 rounded-xl border border-[rgba(21,127,133,0.2)] bg-white p-3 text-sm">
                  <p className="font-semibold text-[#102532]">Approved by {teReconData.approvedBy}</p>
                  <p className="text-xs text-[#52636f]">
                    {teReconData.approvedAt ? new Date(teReconData.approvedAt).toLocaleString() : ""}
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="pc rounded-2xl border border-[rgba(210,181,130,0.5)] bg-[rgba(210,181,130,0.1)] p-4">
              <SectionHeader icon={<AlertCircle className="h-5 w-5 text-[#8a6d2f]" />} title="Reconciliation Not Approved" />
              <EmptyState>Reconciliation has not been approved yet.</EmptyState>
            </div>
          )}

          {/* Unresolved claims */}
          {claimed.length > 0 && (
            <div className="pc rounded-2xl border border-[rgba(210,181,130,0.5)] bg-[rgba(210,181,130,0.1)] p-4">
              <SectionHeader icon={<Clock className="h-5 w-5 text-[#8a6d2f]" />} title="Unresolved Claims"
                subtitle="These payments were claimed but not confirmed during reconciliation." />
              <div className="space-y-2">
                {claimed.map((p: any) => (
                  <div key={p.playerId} className="flex items-center justify-between rounded-xl bg-white border border-[rgba(210,181,130,0.3)] px-3 py-2">
                    <div>
                      <p className="text-sm font-bold text-[#102532]">{p.playerName}</p>
                      <p className="text-xs text-[#52636f]">{formatMethod(p.paymentMethod)}{p.paymentReference ? ` · ${p.paymentReference}` : ""}</p>
                    </div>
                    <p className="text-sm font-black text-[#8a6d2f]">{fmtTE(p.amount)}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Disputed */}
          {disputed.length > 0 && (
            <div className="pc rounded-2xl border border-[rgba(233,87,79,0.3)] bg-[rgba(233,87,79,0.08)] p-4">
              <SectionHeader icon={<TrendingDown className="h-5 w-5 text-[#c8423b]" />} title="Disputed Payments"
                subtitle="Excluded from totals." />
              <div className="space-y-2">
                {disputed.map((p: any) => (
                  <div key={p.playerId} className="rounded-xl border border-[rgba(233,87,79,0.2)] bg-white p-3">
                    <div className="flex items-start justify-between">
                      <p className="text-sm font-bold text-[#102532]">{p.playerName}</p>
                      <p className="text-sm font-black text-[#c8423b]">{fmtTE(p.amount)}</p>
                    </div>
                    {p.adminNotes && <p className="mt-1 text-xs text-[#52636f]">Note: {p.adminNotes}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // QUIZ / ELIMINATION REPORT — original layout, original colours
  // Only change: Players column removed from breakdown table
  // ══════════════════════════════════════════════════════════════════════════

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-[#157f85]" />
        <span className="ml-3 text-sm text-[#52636f]">Loading financial report…</span>
      </div>
    );
  }
  if (error || !report) {
    return (
      <div className="p-5">
        <div className="flex gap-3 rounded-xl border border-[rgba(233,87,79,0.3)] bg-[rgba(233,87,79,0.08)] p-4">
          <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-[#c8423b]" />
          <div>
            <p className="text-sm font-semibold text-[#8b1c1c]">Error loading report</p>
            <p className="text-xs text-[#c8423b] mt-1">{error || "Failed to load financial report"}</p>
          </div>
        </div>
      </div>
    );
  }

  const { reconciliation, tickets, onNightPayments, latePayments, outstandingPayments, writeOffs } = report;
  const isDonation = reconciliation?.fundraisingMode === "donation";

  return (
    <div className="p-5 space-y-4">
      <div className="flex justify-end">
        <button type="button" onClick={handlePrint}
          className="inline-flex items-center gap-2 rounded-lg bg-[#157f85] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0e6268]">
          <Printer className="h-4 w-4" /> Print / Save PDF
        </button>
      </div>

      <div id="digital-event-financial-report" className="space-y-4">

        {/* Title */}
        <div className="pc rounded-2xl border border-[#dce1df] bg-gradient-to-r from-[rgba(21,127,133,0.06)] via-white to-purple-50 p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-xl font-black text-[#102532]">Financial Report</h2>
                <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${
                  isElimination
                    ? "bg-[rgba(233,87,79,0.1)] text-[#c8423b] border border-[rgba(233,87,79,0.3)]"
                    : "bg-[rgba(21,127,133,0.12)] text-[#157f85] border border-[rgba(21,127,133,0.3)]"
                }`}>
                  {isElimination ? <Zap className="h-3 w-3" /> : <Scale className="h-3 w-3" />}
                  {gameTypeLabel}
                </span>
              </div>
              <p className="text-sm text-[#52636f]">{roomName}</p>
              <p className="mt-2 text-sm text-[#52636f]">
                Confirmed income, approved reconciliation, late receipts,
                outstanding balances and payment method breakdowns.
              </p>
            </div>
            <div className="rounded-xl bg-white p-3 text-sm shadow-sm ring-1 ring-[#dce1df] flex-shrink-0">
              <p className="text-xs font-semibold uppercase tracking-wide text-[#52636f]">Room ID</p>
              <p className="mt-1 font-bold text-[#102532] font-mono text-xs">{room.room_id}</p>
            </div>
          </div>
        </div>

        {/* Financial Summary */}
        {finalPos && (
          <div className="pc rounded-2xl border border-[#dce1df] bg-white p-4 shadow-sm">
            <SectionHeader icon={<DollarSign className="h-5 w-5 text-[#157f85]" />} title="Financial Summary"
              subtitle="Approved reconciliation, late receipts and outstanding balances." />
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
              <MetricCard label="Approved total"    value={fmt(finalPos.approved)}    tone="indigo" helper="Signed-off amount" />
              <MetricCard label="Late received"     value={fmt(finalPos.late)}        tone="amber"  helper="Collected after approval" />
              <MetricCard label="Still outstanding" value={fmt(finalPos.outstanding)} tone="orange" helper="Not yet resolved" />
            </div>
            <div className="mt-3 flex flex-col gap-2 rounded-xl bg-gray-950 p-4 text-white sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-200">Final known collected total</p>
                <p className="text-xs text-[#8a9bab]">Approved total plus late payments.</p>
              </div>
              <p className="text-2xl font-black">{fmt(finalPos.collected)}</p>
            </div>

            {/* Breakdown by Payment Method — Players column removed */}
            {(auditViewLoading && breakdownRows.length === 0) ? (
              <div className="mt-3 rounded-xl border border-dashed border-[#dce1df] bg-[#fbf8f2] p-4 text-center text-sm text-[#52636f]">
                Loading payment method breakdown…
              </div>
            ) : breakdownRows.length > 0 ? (
              <div className="mt-4">
                <SectionHeader icon={<CheckCircle className="h-5 w-5 text-[#52636f]" />}
                  title="Breakdown by Payment Method"
                  subtitle="All payment sources — approved on night, late, and outstanding." />
                <div className="rounded-xl border border-[#dce1df]">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-[#fbf8f2] border-b border-[#dce1df]">
                        <th className="px-3 py-2.5 text-left  text-xs font-semibold uppercase text-[#52636f]">Method</th>
                        <th className="px-3 py-2.5 text-right text-xs font-semibold uppercase text-[#157f85]  w-24">Approved</th>
                        <th className="px-3 py-2.5 text-right text-xs font-semibold uppercase text-[#8a6d2f]  w-20">Late</th>
                        <th className="px-3 py-2.5 text-right text-xs font-semibold uppercase text-[#c8423b]  w-24">Outstanding</th>
                        <th className="px-3 py-2.5 text-right text-xs font-semibold uppercase text-[#102532]  w-20">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 bg-white">
                      {breakdownRows.map(row => (
                        <tr key={row.method} className="hover:bg-[#fbf8f2]">
                          <td className="px-3 py-2.5 font-medium text-[#102532]">{formatMethod(row.method)}</td>
                          <td className="px-3 py-2.5 text-right font-medium text-[#157f85]">{row.confirmedOnNight > 0 ? fmt(row.confirmedOnNight) : "—"}</td>
                          <td className="px-3 py-2.5 text-right text-[#8a6d2f]">{row.confirmedLate > 0 ? fmt(row.confirmedLate) : "—"}</td>
                          <td className="px-3 py-2.5 text-right text-[#c8423b]">{row.outstanding > 0 ? fmt(row.outstanding) : "—"}</td>
                          <td className="px-3 py-2.5 text-right font-semibold text-[#102532]">{fmt(row.total)}</td>
                        </tr>
                      ))}
                      <tr className="border-t-2 border-[#dce1df] bg-[#fbf8f2] font-semibold">
                        <td className="px-3 py-2.5 text-[#102532]">Total</td>
                        <td className="px-3 py-2.5 text-right text-[#157f85]">{fmt(breakdownTotals.confirmedOnNight)}</td>
                        <td className="px-3 py-2.5 text-right text-[#8a6d2f]">{fmt(breakdownTotals.confirmedLate)}</td>
                        <td className="px-3 py-2.5 text-right text-[#c8423b]">{fmt(breakdownTotals.outstanding)}</td>
                        <td className="px-3 py-2.5 text-right text-[#102532]">{fmt(breakdownTotals.total)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            ) : null}
          </div>
        )}

        {/* Reconciliation */}
        {reconciliation ? (
          <div className="pc rounded-2xl border border-[rgba(21,127,133,0.3)] bg-[rgba(21,127,133,0.08)] p-4">
            <SectionHeader icon={<FileText className="h-5 w-5 text-[#157f85]" />} title="Approved Reconciliation"
              subtitle="Amount signed off during reconciliation." />
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <MetricCard label={isDonation ? "Donations" : "Entry fees"} value={fmt(reconciliation.startingEntryFees)} tone="gray" />
              <MetricCard label="Extras"         value={fmt(reconciliation.startingExtras)} tone="gray" />
              <MetricCard label="Adjustments"    value={fmt(reconciliation.adjustmentsNet)} tone={reconciliation.adjustmentsNet >= 0 ? "green" : "red"} />
              <MetricCard label="Approved final" value={fmt(reconciliation.finalTotal)}     tone="indigo" />
            </div>
            <div className="mt-3 rounded-xl border border-[rgba(21,127,133,0.2)] bg-white p-3 text-sm">
              <p className="font-semibold text-[#102532]">Approved by {reconciliation.approvedBy || "—"}</p>
              <p className="text-xs text-[#52636f]">{reconciliation.approvedAt ? new Date(reconciliation.approvedAt).toLocaleString() : "No date"}</p>
            </div>
          </div>
        ) : (
          <div className="pc rounded-2xl border border-[rgba(210,181,130,0.5)] bg-[rgba(210,181,130,0.1)] p-4">
            <SectionHeader icon={<AlertCircle className="h-5 w-5 text-[#8a6d2f]" />} title="Reconciliation Not Approved" />
            <EmptyState>Reconciliation has not been approved yet.</EmptyState>
          </div>
        )}

        {/* Ticket Sales */}
        {tickets?.totalSold > 0 && (
          <div className="pc rounded-2xl border border-[rgba(184,198,176,0.5)] bg-[rgba(184,198,176,0.1)] p-4">
            <SectionHeader icon={<Ticket className="h-5 w-5 text-[#52636f]" />} title="Ticket Sales" />
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <MetricCard label="Sold"     value={tickets.totalSold}         tone="purple" />
              <MetricCard label="Redeemed" value={tickets.redeemed}          tone="blue" />
              <MetricCard label="Revenue"  value={fmt(tickets.totalRevenue)} tone="green" />
              <MetricCard label="Extras"   value={fmt(tickets.extras)}       tone="gray" />
            </div>
          </div>
        )}

        {/* Approved Payments */}
        <div className="pc rounded-2xl border border-[rgba(21,127,133,0.3)] bg-[rgba(21,127,133,0.06)] p-4">
          <SectionHeader icon={<CheckCircle className="h-5 w-5 text-[#157f85]" />} title="Approved Payments"
            subtitle="Cash, card and instant payments confirmed for this event." />
          {onNightPayments?.total > 0 ? (
            <>
              <div className="overflow-hidden rounded-xl border border-green-100 bg-white">
                {onNightPayments.byMethod.map((row, i) => (
                  <div key={i} className="flex items-center justify-between gap-3 border-b border-green-50 last:border-0 px-3 py-2.5">
                    <div>
                      <p className="text-sm font-bold text-[#102532]">{formatMethod(row.method)}</p>
                      {row.uniquePlayers !== undefined && row.uniquePlayers > 0 && (
                        <p className="text-xs text-[#52636f]">{row.uniquePlayers} players</p>
                      )}
                    </div>
                    <p className="text-base font-black text-[#157f85]">{fmt(row.total)}</p>
                  </div>
                ))}
              </div>
              <div className="mt-3 flex items-center justify-between rounded-xl bg-green-600 p-3 text-white">
                <p className="text-sm font-semibold">Approved total</p>
                <p className="text-xl font-black">{fmt(onNightPayments.total)}</p>
              </div>
            </>
          ) : <EmptyState>No approved payments recorded.</EmptyState>}
        </div>

        {/* Late Payments */}
        {latePayments && latePayments.total > 0 && (
          <div className="pc rounded-2xl border border-[rgba(210,181,130,0.5)] bg-[rgba(210,181,130,0.1)] p-4">
            <SectionHeader icon={<Clock className="h-5 w-5 text-[#8a6d2f]" />} title="Late Payments"
              subtitle="Confirmed after the event." />
            <div className="overflow-hidden rounded-xl border border-[rgba(210,181,130,0.3)] bg-white">
              {latePayments.byMethod.map((row, i) => (
                <div key={i} className="flex items-center justify-between gap-3 border-b border-amber-50 last:border-0 px-3 py-2.5">
                  <div>
                    <p className="text-sm font-bold text-[#102532]">{formatMethod(row.method)}</p>
                    {row.uniquePlayers !== undefined && row.uniquePlayers > 0 && (
                      <p className="text-xs text-[#52636f]">{row.uniquePlayers} players</p>
                    )}
                  </div>
                  <p className="text-base font-black text-[#8a6d2f]">{fmt(row.total)}</p>
                </div>
              ))}
            </div>
            <div className="mt-3 flex items-center justify-between rounded-xl bg-amber-600 p-3 text-white">
              <p className="text-sm font-semibold">Late payment total</p>
              <p className="text-xl font-black">{fmt(latePayments.total)}</p>
            </div>
          </div>
        )}

        {/* Outstanding + Write-offs */}
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="pc rounded-2xl border border-[rgba(210,181,130,0.5)] bg-[rgba(210,181,130,0.1)] p-4">
            <SectionHeader icon={<AlertCircle className="h-5 w-5 text-[#8a6d2f]" />} title="Outstanding Payments"
              subtitle="Not included in received totals." />
            {outstandingPayments && outstandingPayments.total > 0 ? (
              <>
                <div className="space-y-2">
                  {outstandingPayments.byStatus.map(row => (
                    <div key={row.status} className="flex items-center justify-between gap-3 rounded-xl border border-[rgba(210,181,130,0.3)] bg-white p-3">
                      <div>
                        <p className="text-sm font-bold text-[#102532]">{formatStatus(row.status)}</p>
                        <p className="text-xs text-[#52636f]">{row.uniquePlayers} players</p>
                      </div>
                      <p className="text-base font-black text-[#8a6d2f]">{fmt(row.total)}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-3 flex items-center justify-between rounded-xl bg-orange-600 p-3 text-white">
                  <p className="text-sm font-semibold">Total outstanding</p>
                  <p className="text-xl font-black">{fmt(outstandingPayments.total)}</p>
                </div>
              </>
            ) : <EmptyState>No outstanding unresolved payments.</EmptyState>}
          </div>

          <div className="pc rounded-2xl border border-[rgba(233,87,79,0.3)] bg-[rgba(233,87,79,0.08)] p-4">
            <SectionHeader icon={<TrendingDown className="h-5 w-5 text-[#c8423b]" />} title="Written Off"
              subtitle="Excluded from received totals." />
            {writeOffs && writeOffs.total > 0 ? (
              <>
                <div className="space-y-2">
                  {writeOffs.rows.map(row => (
                    <div key={row.playerId} className="rounded-xl border border-[rgba(233,87,79,0.2)] bg-white p-3">
                      <div className="flex items-start justify-between gap-3">
                        <p className="text-sm font-bold text-[#102532]">{row.playerName || row.playerId}</p>
                        <p className="text-base font-black text-[#c8423b]">{fmt(row.total)}</p>
                      </div>
                      {row.adminNotes && (
                        <p className="mt-2 rounded-lg bg-[rgba(233,87,79,0.08)] p-2 text-xs text-[#52636f]">Note: {row.adminNotes}</p>
                      )}
                    </div>
                  ))}
                </div>
                <div className="mt-3 flex items-center justify-between rounded-xl bg-[#e9574f] p-3 text-white">
                  <p className="text-sm font-semibold">Total written off</p>
                  <p className="text-xl font-black">{fmt(writeOffs.total)}</p>
                </div>
              </>
            ) : <EmptyState>No written-off payments.</EmptyState>}
          </div>
        </div>

        {/* Audit notes */}
        <div className="pc rounded-2xl border border-[#dce1df] bg-[#fbf8f2] p-4">
          <SectionHeader icon={<Scale className="h-5 w-5 text-[#52636f]" />} title="Audit Notes"
            subtitle="How to read this report." />
          <div className="grid gap-3 text-sm text-[#52636f] md:grid-cols-2">
            {[
              ["Approved total",       "The amount signed off during reconciliation. Does not include late payments received after approval."],
              ["Late payments",        "Confirmed after the event and shown separately so you can see the approved position and final collected position."],
              ["Outstanding payments", "Expected, claimed and disputed amounts are not counted as received until confirmed."],
              ["Write-offs",           "Closed as not collected and excluded from received totals."],
            ].map(([title, body]) => (
              <div key={title} className="rounded-xl bg-white p-3 ring-1 ring-[#dce1df]">
                <p className="font-bold text-[#102532]">{title}</p>
                <p className="mt-1 text-xs leading-5">{body}</p>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}