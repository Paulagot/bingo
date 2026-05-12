// src/components/mgtsystem/components/digitalEvents/tabs/ReportTab.tsx
import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Ticket,
  FileText,
  AlertCircle,
  Clock,
  CheckCircle,
  Printer,
  Scale,
} from "lucide-react";
import type { Web2RoomListItem as Room } from "../../../../../shared/api/quiz.api";
import ReconciliationService from "../../../services/QuizReconciliationService";

// ─── Types (copied from original modal) ──────────────────────────────────────

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
interface TicketPaymentMethodBreakdown {
  method: string;
  tickets: number;
  entryFees: number;
  extras: number;
  total: number;
}
interface TicketStats {
  totalSold: number;
  redeemed: number;
  unredeemed: number;
  totalRevenue: number;
  entryFees: number;
  extras: number;
  byMethod?: TicketPaymentMethodBreakdown[];
}
interface PaymentMethodBreakdown {
  method: string;
  uniquePlayers?: number;
  records?: number;
  total: number;
}
interface InstantPaymentBreakdown {
  paymentMethodId: number | null;
  label: string;
  provider: string | null;
  players: number;
  nonLatePlayers: number;
  latePlayers: number;
  total: number;
  nonLateTotal: number;
  lateTotal: number;
}
interface PaymentSection {
  byMethod: PaymentMethodBreakdown[];
  total: number;
  uniquePlayers?: number;
  records?: number;
}
interface OutstandingByStatus {
  status: string;
  uniquePlayers: number;
  records: number;
  total: number;
}
interface OutstandingPayments {
  byStatus: OutstandingByStatus[];
  uniquePlayers: number;
  records: number;
  total: number;
}
interface WriteOffRow {
  playerId: string;
  playerName: string;
  records: number;
  total: number;
  adminNotes: string | null;
  updatedAt: string | null;
}
interface WriteOffs {
  rows: WriteOffRow[];
  uniquePlayers: number;
  records: number;
  total: number;
}
interface ByMethodRow {
  method: string;
  confirmedOnNight: number;
  confirmedLate: number;
  expected: number;
  claimed: number;
  disputed: number;
  writtenOff: number;
  total?: number;
}
interface FinancialReport {
  reconciliation: ReconciliationData | null;
  tickets: TicketStats;
  onNightPayments: PaymentSection;
  latePayments?: PaymentSection;
  instantPaymentBreakdown: InstantPaymentBreakdown[];
  outstandingPayments?: OutstandingPayments;
  writeOffs?: WriteOffs;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function MetricCard({
  label,
  value,
  tone = "gray",
  helper,
}: {
  label: string;
  value: string | number;
  tone?:
    | "gray"
    | "indigo"
    | "green"
    | "amber"
    | "orange"
    | "red"
    | "purple"
    | "blue";
  helper?: string;
}) {
  const toneMap = {
    gray: "border-gray-200 bg-white text-gray-950",
    indigo: "border-indigo-200 bg-indigo-50 text-indigo-950",
    green: "border-green-200 bg-green-50 text-green-950",
    amber: "border-amber-200 bg-amber-50 text-amber-950",
    orange: "border-orange-200 bg-orange-50 text-orange-950",
    red: "border-red-200 bg-red-50 text-red-950",
    purple: "border-purple-200 bg-purple-50 text-purple-950",
    blue: "border-blue-200 bg-blue-50 text-blue-950",
  };
  const labelMap = {
    gray: "text-gray-600",
    indigo: "text-indigo-700",
    green: "text-green-700",
    amber: "text-amber-700",
    orange: "text-orange-700",
    red: "text-red-700",
    purple: "text-purple-700",
    blue: "text-blue-700",
  };
  return (
    <div className={`rounded-xl border p-3 ${toneMap[tone]}`}>
      <p
        className={`text-xs font-semibold uppercase tracking-wide ${labelMap[tone]}`}
      >
        {label}
      </p>
      <p className="mt-1 text-lg font-black">{value}</p>
      {helper && <p className="mt-1 text-[11px] text-gray-600">{helper}</p>}
    </div>
  );
}

function SectionHeader({
  icon,
  title,
  subtitle,
}: {
  icon: ReactNode;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="mb-3 flex items-start gap-2">
      <div className="mt-0.5 flex-shrink-0">{icon}</div>
      <div>
        <h3 className="text-sm font-bold text-gray-950">{title}</h3>
        {subtitle && <p className="mt-0.5 text-xs text-gray-600">{subtitle}</p>}
      </div>
    </div>
  );
}

function EmptyState({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-4 text-center text-sm text-gray-600">
      {children}
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function escapeHtml(v: string) {
  return String(v || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
function getCurrentDocumentStyles() {
  return Array.from(document.querySelectorAll('link[rel="stylesheet"], style'))
    .map((n) => n.outerHTML)
    .join("\n");
}

// ─── Main component ───────────────────────────────────────────────────────────

interface Props {
  room: Room;
  config?: any;
  auditView?: any;
  auditViewLoading?: boolean;
}

export default function ReportTab({
  room,
  config,
  auditView,
  auditViewLoading = false,
}: Props) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<FinancialReport | null>(null);
  const currency = config?.currencySymbol || config?.currency || "€";

  const roomName = room.scheduled_at
    ? new Date(room.scheduled_at).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      }) + " Quiz"
    : "Quiz";

  useEffect(() => {
    if (room.status !== "completed") return;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const data = (await ReconciliationService.getFinancialReport(
          room.room_id,
        )) as any;
        if (!data.ok) throw new Error(data.error || "Failed to fetch report");
        setReport(data.report);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load report");
      } finally {
        setLoading(false);
      }
    })();
  }, [room.room_id, room.status]);

  const fmt = (n: number | null | undefined) =>
    `${currency}${Number(n ?? 0).toFixed(2)}`;

  const formatMethod = (m: string | null | undefined) => {
    const labels: Record<string, string> = {
      cash: "Cash",
      instant_payment: "Instant Payment",
      card: "Card",
      card_tap: "Card Tap",
      stripe: "Stripe",
      pay_admin: "Pay Admin",
      pay_host: "Pay Host",
      crypto: "Crypto",
      web3: "Web3",
      other: "Other",
    };
    if (!m) return "Unknown";
    return labels[m] || m.replace(/_/g, " ");
  };

  const formatStatus = (s: string) => {
    const l: Record<string, string> = {
      expected: "Expected / Pay Later",
      claimed: "Claimed, Not Confirmed",
      disputed: "Disputed",
      written_off: "Written Off",
      confirmed: "Confirmed",
    };
    return l[s] || s.replace(/_/g, " ");
  };

 const paymentMethodBreakdown = useMemo<ByMethodRow[]>(() => {
  const rows: ByMethodRow[] = Array.isArray(auditView?.byMethod)
    ? (auditView.byMethod as ByMethodRow[])
    : [];

  return rows
    .map((row): ByMethodRow => {
      const confirmedOnNight = Number(row.confirmedOnNight || 0);
      const confirmedLate = Number(row.confirmedLate || 0);
      const expected = Number(row.expected || 0);
      const claimed = Number(row.claimed || 0);
      const disputed = Number(row.disputed || 0);
      const writtenOff = Number(row.writtenOff || 0);

      return {
        method: row.method || "unknown",
        confirmedOnNight,
        confirmedLate,
        expected,
        claimed,
        disputed,
        writtenOff,
        total:
          confirmedOnNight +
          confirmedLate +
          expected +
          claimed +
          disputed -
          writtenOff,
      };
    })
    .sort(
      (a: ByMethodRow, b: ByMethodRow) =>
        Number(b.total || 0) - Number(a.total || 0),
    );
}, [auditView]);

  const paymentMethodTotals = useMemo(() => {
    return paymentMethodBreakdown.reduce(
      (acc, row) => {
        acc.confirmedOnNight += row.confirmedOnNight;
        acc.confirmedLate += row.confirmedLate;
        acc.expected += row.expected;
        acc.claimed += row.claimed;
        acc.disputed += row.disputed;
        acc.writtenOff += row.writtenOff;
        acc.total += Number(row.total || 0);
        return acc;
      },
      {
        confirmedOnNight: 0,
        confirmedLate: 0,
        expected: 0,
        claimed: 0,
        disputed: 0,
        writtenOff: 0,
        total: 0,
      },
    );
  }, [paymentMethodBreakdown]);

  const finalPos = useMemo(() => {
    if (!report?.reconciliation) return null;
    const approved = report.reconciliation.finalTotal ?? 0;
    const late = report.latePayments?.total ?? 0;
    return {
      approved,
      late,
      collected: approved + late,
      outstanding: report.outstandingPayments?.total ?? 0,
      writtenOff: report.writeOffs?.total ?? 0,
    };
  }, [report]);

  const handlePrint = () => {
    try {
      const el = document.getElementById("digital-event-financial-report");
      if (!el) throw new Error("Report element not found");
      const styles = getCurrentDocumentStyles();
      const html = `<!doctype html><html><head><meta charset="utf-8"/><title>Financial Report - ${escapeHtml(roomName)}</title>${styles}<style>body{margin:0;padding:0;background:#fff;-webkit-print-color-adjust:exact;print-color-adjust:exact}#pr{max-width:980px;margin:0 auto;padding:24px}.pc{break-inside:avoid;page-break-inside:avoid;margin-bottom:14px}.fixed,.absolute,.sticky{position:static!important}.overflow-y-auto,.overflow-auto,.overflow-hidden{overflow:visible!important}@media print{@page{size:A4;margin:14mm}}</style></head><body><div id="pr">${el.innerHTML}</div></body></html>`;
      const w = window.open("", "_blank", "width=1100,height=850");
      if (!w) {
        setError("Pop-up blocked. Please allow pop-ups to print.");
        return;
      }
      w.document.open();
      w.document.write(html);
      w.document.close();
      const run = () => {
        w.focus();
        setTimeout(() => w.print(), 500);
      };
      w.onload = run;
      setTimeout(() => {
        if (!w.closed) run();
      }, 1000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to prepare report");
    }
  };

  if (room.status !== "completed") {
    return (
      <div className="p-5">
        <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 p-8 text-center">
          <p className="text-sm text-gray-400">
            The financial report is available once the quiz is completed.
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-indigo-600" />
        <span className="ml-3 text-sm text-gray-600">
          Loading financial report…
        </span>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="p-5">
        <div className="flex gap-3 rounded-xl border border-red-200 bg-red-50 p-4">
          <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-600" />
          <div>
            <p className="text-sm font-semibold text-red-900">
              Error loading report
            </p>
            <p className="text-xs text-red-700 mt-1">
              {error || "Failed to load financial report"}
            </p>
          </div>
        </div>
      </div>
    );
  }

  const {
    reconciliation,
    tickets,
    onNightPayments,
    latePayments,
    instantPaymentBreakdown,
    outstandingPayments,
    writeOffs,
  } = report;
  const isDonation = reconciliation?.fundraisingMode === "donation";

  return (
    <div className="p-5 space-y-4">
      {/* Print button */}
      <div className="flex justify-end">
        <button
          type="button"
          onClick={handlePrint}
          className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
        >
          <Printer className="h-4 w-4" /> Print / Save PDF
        </button>
      </div>

      <div id="digital-event-financial-report" className="space-y-4">
        {/* Title */}
        <div className="pc rounded-2xl border border-gray-200 bg-gradient-to-r from-indigo-50 via-white to-purple-50 p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-xl font-black text-gray-950">
                Financial Report
              </h2>
              <p className="mt-1 text-sm text-gray-600">{roomName}</p>
              <p className="mt-2 text-sm text-gray-700">
                Confirmed income, approved reconciliation, late receipts,
                outstanding balances and payment method breakdowns.
              </p>
            </div>
            <div className="rounded-xl bg-white p-3 text-sm shadow-sm ring-1 ring-gray-200 flex-shrink-0">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Room ID
              </p>
              <p className="mt-1 font-bold text-gray-950 font-mono text-xs">
                {room.room_id}
              </p>
            </div>
          </div>
        </div>

        {/* Financial summary */}
        {finalPos && (
          <div className="pc rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
            <SectionHeader
              icon={<DollarSign className="h-5 w-5 text-indigo-600" />}
              title="Financial Summary"
              subtitle="Approved reconciliation, late receipts, outstanding balances and write-offs."
            />
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <MetricCard
                label="Approved total"
                value={fmt(finalPos.approved)}
                tone="indigo"
                helper="Signed-off amount"
              />
              <MetricCard
                label="Late received"
                value={fmt(finalPos.late)}
                tone="amber"
                helper="Collected after approval"
              />
              <MetricCard
                label="Still outstanding"
                value={fmt(finalPos.outstanding)}
                tone="orange"
                helper="Not yet resolved"
              />
              <MetricCard
                label="Written off"
                value={fmt(finalPos.writtenOff)}
                tone="red"
                helper="Closed as not paid"
              />
            </div>
            <div className="mt-3 flex flex-col gap-2 rounded-xl bg-gray-950 p-4 text-white sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-200">
                  Final known collected total
                </p>
                <p className="text-xs text-gray-400">
                  Approved total plus late payments.
                </p>
              </div>
              <p className="text-2xl font-black">{fmt(finalPos.collected)}</p>
            </div>
            {auditViewLoading && paymentMethodBreakdown.length === 0 && (
              <div className="mt-3 rounded-xl border border-dashed border-gray-300 bg-gray-50 p-4 text-center text-sm text-gray-600">
                Loading payment method breakdown…
              </div>
            )}

            {paymentMethodBreakdown.length > 0 && (
              <div className="mt-3">
                <SectionHeader
                  icon={<CheckCircle className="h-5 w-5 text-gray-700" />}
                  title="Breakdown by Payment Method"
                  subtitle="All statuses — total is on-night + late + outstanding statuses, minus written off."
                />
                <div className="overflow-x-auto rounded-xl border border-gray-200">
                  <table className="min-w-full divide-y divide-gray-200 text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        {[
                          "Method",
                          "On Night",
                          "Late",
                          "Expected",
                          "Claimed",
                          "Disputed",
                          "Written Off",
                          "Total",
                        ].map((h) => (
                          <th
                            key={h}
                            className="px-3 py-2.5 text-right text-xs font-semibold uppercase text-gray-600 first:text-left whitespace-nowrap"
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 bg-white">
                      {paymentMethodBreakdown.map((row) => (
                        <tr key={row.method} className="hover:bg-gray-50">
                          <td className="px-3 py-2.5 font-medium text-gray-900 whitespace-nowrap">
                            {formatMethod(row.method)}
                          </td>
                          <td className="px-3 py-2.5 text-right font-medium text-green-700">
                            {row.confirmedOnNight > 0
                              ? fmt(row.confirmedOnNight)
                              : "—"}
                          </td>
                          <td className="px-3 py-2.5 text-right text-amber-600">
                            {row.confirmedLate > 0
                              ? fmt(row.confirmedLate)
                              : "—"}
                          </td>
                          <td className="px-3 py-2.5 text-right text-gray-400">
                            {row.expected > 0 ? fmt(row.expected) : "—"}
                          </td>
                          <td className="px-3 py-2.5 text-right text-amber-600">
                            {row.claimed > 0 ? fmt(row.claimed) : "—"}
                          </td>
                          <td className="px-3 py-2.5 text-right text-red-600">
                            {row.disputed > 0 ? fmt(row.disputed) : "—"}
                          </td>
                          <td className="px-3 py-2.5 text-right text-slate-500">
                            {row.writtenOff > 0
                              ? `−${fmt(row.writtenOff)}`
                              : "—"}
                          </td>
                          <td className="px-3 py-2.5 text-right font-semibold text-gray-900">
                            {fmt(row.total)}
                          </td>
                        </tr>
                      ))}
                      <tr className="border-t-2 border-gray-300 bg-gray-50 font-semibold">
                        <td className="px-3 py-2.5 text-gray-900">Total</td>
                        <td className="px-3 py-2.5 text-right text-green-700">
                          {fmt(paymentMethodTotals.confirmedOnNight)}
                        </td>
                        <td className="px-3 py-2.5 text-right text-amber-600">
                          {fmt(paymentMethodTotals.confirmedLate)}
                        </td>
                        <td className="px-3 py-2.5 text-right text-gray-400">
                          {fmt(paymentMethodTotals.expected)}
                        </td>
                        <td className="px-3 py-2.5 text-right text-amber-600">
                          {fmt(paymentMethodTotals.claimed)}
                        </td>
                        <td className="px-3 py-2.5 text-right text-red-600">
                          {fmt(paymentMethodTotals.disputed)}
                        </td>
                        <td className="px-3 py-2.5 text-right text-slate-500">
                          {paymentMethodTotals.writtenOff > 0
                            ? `−${fmt(paymentMethodTotals.writtenOff)}`
                            : fmt(0)}
                        </td>
                        <td className="px-3 py-2.5 text-right text-gray-900">
                          {fmt(paymentMethodTotals.total)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Reconciliation */}
        {reconciliation ? (
          <div className="pc rounded-2xl border border-indigo-200 bg-indigo-50 p-4">
            <SectionHeader
              icon={<FileText className="h-5 w-5 text-indigo-600" />}
              title="Approved Reconciliation"
              subtitle="Amount signed off during reconciliation."
            />
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <MetricCard
                label={isDonation ? "Donations" : "Entry fees"}
                value={fmt(reconciliation.startingEntryFees)}
                tone="gray"
              />
              <MetricCard
                label="Extras"
                value={fmt(reconciliation.startingExtras)}
                tone="gray"
              />
              <MetricCard
                label="Adjustments"
                value={fmt(reconciliation.adjustmentsNet)}
                tone={reconciliation.adjustmentsNet >= 0 ? "green" : "red"}
              />
              <MetricCard
                label="Approved final"
                value={fmt(reconciliation.finalTotal)}
                tone="indigo"
              />
            </div>
            <div className="mt-3 rounded-xl border border-indigo-100 bg-white p-3 text-sm">
              <p className="font-semibold text-gray-950">
                Approved by {reconciliation.approvedBy || "—"}
              </p>
              <p className="text-xs text-gray-600">
                {reconciliation.approvedAt
                  ? new Date(reconciliation.approvedAt).toLocaleString()
                  : "No date"}
              </p>
            </div>
          </div>
        ) : (
          <div className="pc rounded-2xl border border-amber-200 bg-amber-50 p-4">
            <SectionHeader
              icon={<AlertCircle className="h-5 w-5 text-amber-600" />}
              title="Reconciliation Not Approved"
            />
            <EmptyState>Reconciliation has not been approved yet.</EmptyState>
          </div>
        )}

        {/* Tickets */}
        <div className="pc rounded-2xl border border-purple-200 bg-purple-50 p-4">
          <SectionHeader
            icon={<Ticket className="h-5 w-5 text-purple-600" />}
            title="Ticket Sales"
          />
          {tickets?.totalSold > 0 ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <MetricCard
                label="Sold"
                value={tickets.totalSold}
                tone="purple"
              />
              <MetricCard
                label="Redeemed"
                value={tickets.redeemed}
                tone="blue"
              />
              <MetricCard
                label="Revenue"
                value={fmt(tickets.totalRevenue)}
                tone="green"
              />
              <MetricCard
                label="Extras"
                value={fmt(tickets.extras)}
                tone="gray"
              />
            </div>
          ) : (
            <EmptyState>No ticket sales recorded.</EmptyState>
          )}
        </div>

        {/* On-night payments */}
        <div className="pc rounded-2xl border border-green-200 bg-green-50 p-4">
          <SectionHeader
            icon={<CheckCircle className="h-5 w-5 text-green-600" />}
            title="On-Night Payments"
            subtitle="Cash, card and instant payments received during the event."
          />
          {onNightPayments?.total > 0 ? (
            <>
              <div className="overflow-hidden rounded-xl border border-green-100 bg-white">
                {onNightPayments.byMethod.map((row, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between gap-3 border-b border-green-50 last:border-0 px-3 py-2.5"
                  >
                    <div>
                      <p className="text-sm font-bold text-gray-950">
                        {formatMethod(row.method)}
                      </p>
                      <p className="text-xs text-gray-600">
                        {row.uniquePlayers !== undefined
                          ? `${row.uniquePlayers} players`
                          : ""}
                        {row.records !== undefined
                          ? ` · ${row.records} records`
                          : ""}
                      </p>
                    </div>
                    <p className="text-base font-black text-green-700">
                      {fmt(row.total)}
                    </p>
                  </div>
                ))}
              </div>
              <div className="mt-3 flex items-center justify-between rounded-xl bg-green-600 p-3 text-white">
                <p className="text-sm font-semibold">On-night total</p>
                <p className="text-xl font-black">
                  {fmt(onNightPayments.total)}
                </p>
              </div>
            </>
          ) : (
            <EmptyState>No on-night payments recorded.</EmptyState>
          )}
        </div>

        {/* Late payments */}
        {latePayments && (
          <div className="pc rounded-2xl border border-amber-200 bg-amber-50 p-4">
            <SectionHeader
              icon={<Clock className="h-5 w-5 text-amber-600" />}
              title="Late Payments"
              subtitle="Confirmed after the event."
            />
            {latePayments.total > 0 ? (
              <>
                <div className="overflow-hidden rounded-xl border border-amber-100 bg-white">
                  {latePayments.byMethod.map((row, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between gap-3 border-b border-amber-50 last:border-0 px-3 py-2.5"
                    >
                      <p className="text-sm font-bold text-gray-950">
                        {formatMethod(row.method)}
                      </p>
                      <p className="text-base font-black text-amber-700">
                        {fmt(row.total)}
                      </p>
                    </div>
                  ))}
                </div>
                <div className="mt-3 flex items-center justify-between rounded-xl bg-amber-600 p-3 text-white">
                  <p className="text-sm font-semibold">Late payment total</p>
                  <p className="text-xl font-black">
                    {fmt(latePayments.total)}
                  </p>
                </div>
              </>
            ) : (
              <EmptyState>No late payments recorded.</EmptyState>
            )}
          </div>
        )}

        {/* Instant payment breakdown */}
        <div className="pc rounded-2xl border border-blue-200 bg-blue-50 p-4">
          <SectionHeader
            icon={<TrendingUp className="h-5 w-5 text-blue-600" />}
            title="Instant Payment Accounts"
            subtitle="Breakdown by saved club payment method."
          />
          {instantPaymentBreakdown?.length > 0 ? (
            <div className="overflow-hidden rounded-xl border border-blue-100 bg-white">
              <div className="hidden grid-cols-5 gap-3 border-b border-blue-100 bg-blue-50 px-3 py-2 text-xs font-bold uppercase text-blue-800 md:grid">
                <div>Account</div>
                <div>Provider</div>
                <div className="text-right">On night</div>
                <div className="text-right">Late</div>
                <div className="text-right">Total</div>
              </div>
              <div className="divide-y divide-blue-50">
                {instantPaymentBreakdown.map((item, i) => (
                  <div
                    key={i}
                    className="grid gap-2 px-3 py-3 text-sm md:grid-cols-5 md:items-center"
                  >
                    <div>
                      <p className="font-bold text-gray-950">{item.label}</p>
                      <p className="text-xs text-gray-600">
                        {item.players} players
                      </p>
                    </div>
                    <div className="text-gray-700">{item.provider || "—"}</div>
                    <div className="md:text-right">
                      <p className="font-bold">{fmt(item.nonLateTotal)}</p>
                      <p className="text-xs text-gray-500">
                        {item.nonLatePlayers} players
                      </p>
                    </div>
                    <div className="md:text-right">
                      <p className="font-bold">{fmt(item.lateTotal)}</p>
                      <p className="text-xs text-gray-500">
                        {item.latePlayers} players
                      </p>
                    </div>
                    <div className="md:text-right">
                      <p className="font-black text-blue-700">
                        {fmt(item.total)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <EmptyState>
              No instant payment account breakdown available.
            </EmptyState>
          )}
        </div>

        {/* Outstanding + Write-offs */}
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="pc rounded-2xl border border-orange-200 bg-orange-50 p-4">
            <SectionHeader
              icon={<AlertCircle className="h-5 w-5 text-orange-600" />}
              title="Outstanding Payments"
              subtitle="Not included in received totals."
            />
            {outstandingPayments && outstandingPayments.total > 0 ? (
              <>
                <div className="space-y-2">
                  {outstandingPayments.byStatus.map((row) => (
                    <div
                      key={row.status}
                      className="flex items-center justify-between gap-3 rounded-xl border border-orange-100 bg-white p-3"
                    >
                      <div>
                        <p className="text-sm font-bold text-gray-950">
                          {formatStatus(row.status)}
                        </p>
                        <p className="text-xs text-gray-600">
                          {row.uniquePlayers} players · {row.records} records
                        </p>
                      </div>
                      <p className="text-base font-black text-orange-700">
                        {fmt(row.total)}
                      </p>
                    </div>
                  ))}
                </div>
                <div className="mt-3 flex items-center justify-between rounded-xl bg-orange-600 p-3 text-white">
                  <p className="text-sm font-semibold">Total outstanding</p>
                  <p className="text-xl font-black">
                    {fmt(outstandingPayments.total)}
                  </p>
                </div>
              </>
            ) : (
              <EmptyState>No outstanding unresolved payments.</EmptyState>
            )}
          </div>

          <div className="pc rounded-2xl border border-red-200 bg-red-50 p-4">
            <SectionHeader
              icon={<TrendingDown className="h-5 w-5 text-red-600" />}
              title="Written Off"
              subtitle="Excluded from received totals."
            />
            {writeOffs && writeOffs.total > 0 ? (
              <>
                <div className="space-y-2">
                  {writeOffs.rows.map((row) => (
                    <div
                      key={row.playerId}
                      className="rounded-xl border border-red-100 bg-white p-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-bold text-gray-950">
                            {row.playerName || row.playerId}
                          </p>
                          <p className="text-xs text-gray-600">
                            {row.records} records
                          </p>
                        </div>
                        <p className="text-base font-black text-red-700">
                          {fmt(row.total)}
                        </p>
                      </div>
                      {row.adminNotes && (
                        <p className="mt-2 rounded-lg bg-red-50 p-2 text-xs text-gray-700">
                          Note: {row.adminNotes}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
                <div className="mt-3 flex items-center justify-between rounded-xl bg-red-600 p-3 text-white">
                  <p className="text-sm font-semibold">Total written off</p>
                  <p className="text-xl font-black">{fmt(writeOffs.total)}</p>
                </div>
              </>
            ) : (
              <EmptyState>No written-off payments.</EmptyState>
            )}
          </div>
        </div>

        {/* Audit notes */}
        <div className="pc rounded-2xl border border-gray-200 bg-gray-50 p-4">
          <SectionHeader
            icon={<Scale className="h-5 w-5 text-gray-700" />}
            title="Audit Notes"
            subtitle="How to read this report."
          />
          <div className="grid gap-3 text-sm text-gray-700 md:grid-cols-2">
            {[
              [
                "Approved total",
                "The amount signed off during reconciliation. Does not include late payments received after approval.",
              ],
              [
                "Late payments",
                "Confirmed after the event and shown separately so you can see the approved position and final collected position.",
              ],
              [
                "Outstanding payments",
                "Expected, claimed and disputed amounts are not counted as received until confirmed.",
              ],
              [
                "Write-offs",
                "Closed as not collected and excluded from received totals.",
              ],
            ].map(([title, body]) => (
              <div
                key={title}
                className="rounded-xl bg-white p-3 ring-1 ring-gray-200"
              >
                <p className="font-bold text-gray-950">{title}</p>
                <p className="mt-1 text-xs leading-5">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}