// src/components/mgtsystem/components/digitalEvents/tabs/ApprovalTotalsTab.tsx
//
// Read-only reconciliation audit view for a completed quiz room.
// Receives auditView from DigitalEventDrawer — no internal fetch.
// Shows confirmed payments by confirmer, late payments, manual adjustments,
// outstanding/written-off, and method breakdown.
// Leaderboard and prize awards are shown in the Impact tab instead.

import { useState } from "react";
import type { ReactNode } from "react";
import {
  AlertCircle,
  Clock,
  AlertTriangle,
  UserCheck,
  Ticket,
  Scale,
  DollarSign,
  ChevronDown,
  ChevronUp,
  Printer,
  RefreshCw,
} from "lucide-react";
import type { Web2RoomListItem as Room } from "../../../../../shared/api/quiz.api";

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

interface AuditPlayer {
  playerId: string;
  playerName: string;
  paymentMethod: string;
  methodLabel: string | null;
  paymentReference: string | null;
  amount: number;
}
interface ConfirmedGroup {
  confirmedById: string;
  confirmedByName: string;
  confirmedByRole: string;
  totalAmount: number;
  players: AuditPlayer[];
}
interface LatePlayer extends AuditPlayer {
  confirmedByName: string;
  confirmedByRole: string;
}
interface OutstandingPlayer extends AuditPlayer {
  status: string;
}
interface WrittenOffPlayer {
  playerId: string;
  playerName: string;
  paymentMethod: string;
  adminNotes: string | null;
  amount: number;
}
interface Adjustment {
  id: string;
  ts: string;
  adjustmentType: string;
  amount: number;
  currency: string;
  paymentMethod: string | null;
  reasonCode: string | null;
  note: string | null;
  createdBy: string;
}
interface TicketRow {
  ticketId: string;
  playerName: string;
  purchaserName: string;
  paymentMethod: string;
  amount: number;
  redemptionStatus: string;
  confirmedAt: string | null;
  confirmedByName: string | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function getMethodLabel(raw: string | null | undefined): string {
  const v = (raw || "").trim().toLowerCase();
  if (v === "cash") return "Cash";
  if (v === "instant_payment") return "Instant Payment";
  if (v === "card" || v === "card_tap") return "Card";
  if (v === "web3") return "Web3";
  if (v === "crypto") return "Crypto";
  if (v === "pay_admin" || v === "pay_host") return "Pay Host";
  if (v === "stripe") return "Stripe";
  if (!raw) return "Unknown";
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

function getRoleLabel(role: string) {
  if (role === "system") return "Auto";
  if (role === "host") return "Host";
  if (role === "admin") return "Admin";
  return role || "Staff";
}

function getAdjTypeLabel(type: string) {
  const labels: Record<string, string> = {
    received: "Received",
    refund: "Refund",
    fee: "Fee",
    cash_over_short: "Cash Over/Short",
    prize_payout: "Prize Payout",
  };
  return labels[type] || type;
}

function getStatusBadge(status: string) {
  switch (status) {
    case "claimed":
      return "bg-amber-100 text-amber-800 border-amber-200";
    case "disputed":
      return "bg-red-100 text-red-800 border-red-200";
    case "expected":
      return "bg-gray-100 text-gray-700 border-gray-200";
    case "written_off":
      return "bg-slate-100 text-slate-600 border-slate-200";
    default:
      return "bg-gray-100 text-gray-600 border-gray-200";
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// SUB-COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────

function MetricCard({
  label,
  value,
  tone = "gray",
  helper,
}: {
  label: string;
  value: string | number;
  tone?: "gray" | "indigo" | "green" | "amber" | "orange" | "red";
  helper?: string;
}) {
  const toneMap = {
    gray: "border-gray-200 bg-white text-gray-950",
    indigo: "border-indigo-200 bg-indigo-50 text-indigo-950",
    green: "border-green-200 bg-green-50 text-green-950",
    amber: "border-amber-200 bg-amber-50 text-amber-950",
    orange: "border-orange-200 bg-orange-50 text-orange-950",
    red: "border-red-200 bg-red-50 text-red-950",
  };
  const labelMap = {
    gray: "text-gray-600",
    indigo: "text-indigo-700",
    green: "text-green-700",
    amber: "text-amber-700",
    orange: "text-orange-700",
    red: "text-red-700",
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

function SectionCard({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`pc rounded-2xl border border-gray-200 bg-white p-4 shadow-sm ${className}`}
    >
      {children}
    </div>
  );
}

function SectionHead({
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

function PlayerRow({
  name,
  method,
  reference,
  amount,
  currency,
  badge,
}: {
  name: string;
  method: string;
  reference?: string | null;
  amount: number;
  currency: string;
  badge?: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 px-4 py-2.5 hover:bg-gray-50 transition-colors">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium text-gray-900">{name}</span>
          {badge}
        </div>
        <span className="text-xs text-gray-400">
          {method}
          {reference ? ` · Ref: ${reference}` : ""}
        </span>
      </div>
      <span className="text-sm font-semibold text-gray-900 shrink-0">
        {currency}
        {Number(amount || 0).toFixed(2)}
      </span>
    </div>
  );
}

function CollapsibleGroup({
  header,
  children,
  defaultOpen = false,
}: {
  header: ReactNode;
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-gray-100 last:border-0">
      <button
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors text-left"
        onClick={() => setOpen((o) => !o)}
      >
        {header}
        {open ? (
          <ChevronUp className="h-4 w-4 text-gray-400 shrink-0 ml-2" />
        ) : (
          <ChevronDown className="h-4 w-4 text-gray-400 shrink-0 ml-2" />
        )}
      </button>
      {open && (
        <div className="border-t border-gray-100 bg-gray-50 divide-y divide-gray-100">
          {children}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

interface Props {
  room: Room;
  config?: any;
  auditView: any;
  auditViewLoading: boolean;
  auditViewError: string | null;
  onRefresh: () => Promise<void>;
}

export default function ApprovalTotalsTab({
  room,
  config,
  auditView,
  auditViewLoading,
  auditViewError,
  onRefresh,
}: Props) {
  const [refreshing, setRefreshing] = useState(false);
  const currency = config?.currencySymbol || config?.currency || "€";
  const fmt = (n: number) => `${currency}${Number(n || 0).toFixed(2)}`;

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setRefreshing(false);
    }
  };

  const handlePrint = () => {
    const el = document.getElementById("approval-totals-report");
    if (!el) return;
    const styles = Array.from(
      document.querySelectorAll('link[rel="stylesheet"], style'),
    )
      .map((n) => n.outerHTML)
      .join("\n");
    const html = `<!doctype html><html><head><meta charset="utf-8"/><title>Approval Totals — ${room.room_id}</title>${styles}<style>body{margin:0;padding:24px;background:#fff;-webkit-print-color-adjust:exact;print-color-adjust:exact}.pc{break-inside:avoid;page-break-inside:avoid}@media print{@page{size:A4;margin:14mm}}</style></head><body>${el.innerHTML}</body></html>`;
    const w = window.open("", "_blank", "width=1100,height=850");
    if (!w) return;
    w.document.open();
    w.document.write(html);
    w.document.close();
    w.onload = () => {
      w.focus();
      setTimeout(() => w.print(), 500);
    };
  };

  if (room.status !== "completed") {
    return (
      <div className="p-5">
        <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 p-8 text-center">
          <p className="text-sm text-gray-400">
            Available once the quiz is completed and reconciliation approved.
          </p>
        </div>
      </div>
    );
  }

  if (auditViewLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-indigo-600" />
        <span className="ml-3 text-sm text-gray-600">
          Loading reconciliation…
        </span>
      </div>
    );
  }

  if (auditViewError || !auditView) {
    return (
      <div className="p-5 space-y-3">
        <div className="flex gap-3 rounded-xl border border-red-200 bg-red-50 p-4">
          <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-600" />
          <div>
            <p className="text-sm font-semibold text-red-900">
              Error loading reconciliation
            </p>
            <p className="text-xs text-red-700 mt-1">
              {auditViewError || "No data available"}
            </p>
          </div>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          <RefreshCw
            className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
          />{" "}
          Retry
        </button>
      </div>
    );
  }

  const {
    reconciliation,
    adjustments,
    confirmedGroups,
    latePlayers,
    writtenOff,
    outstanding,
    tickets,
    hasTickets,
    totals,
  } = auditView;

  const hasLate = latePlayers.length > 0;
  const hasWrittenOff = writtenOff.length > 0;
  const hasOutstanding = outstanding.length > 0;
  const hasAdj = adjustments.length > 0;

  const outstandingByStatus = (outstanding as OutstandingPlayer[]).reduce(
    (acc: Record<string, OutstandingPlayer[]>, p: OutstandingPlayer) => {
      if (!acc[p.status]) acc[p.status] = [];
      acc[p.status]!.push(p);
      return acc;
    },
    {} as Record<string, OutstandingPlayer[]>,
  );

  return (
    <div className="p-5 space-y-4">
      {/* Actions row */}
      <div className="flex items-center justify-between gap-3">
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          <RefreshCw
            className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
          />
          Refresh
        </button>
        <button
          onClick={handlePrint}
          className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
        >
          <Printer className="h-4 w-4" /> Print / Save PDF
        </button>
      </div>

      <div id="approval-totals-report" className="space-y-4">
        {/* ── Header ───────────────────────────────────────────────────────── */}
        <div className="pc rounded-2xl border border-gray-200 bg-gradient-to-r from-indigo-50 via-white to-purple-50 p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-xl font-black text-gray-950">
                Reconciliation Audit
              </h2>
              <p className="mt-1 text-sm text-gray-600">
                Exactly what was confirmed during the quiz — grouped by who
                collected it.
              </p>
              {reconciliation.approvedAt && (
                <p className="mt-2 text-xs text-gray-500">
                  Approved by{" "}
                  <strong>{reconciliation.approvedBy || "—"}</strong> on{" "}
                  {new Date(reconciliation.approvedAt).toLocaleString()}
                </p>
              )}
              {reconciliation.notes && (
                <p className="mt-1 text-xs italic text-gray-500">
                  Note: {reconciliation.notes}
                </p>
              )}
            </div>
            <div className="rounded-xl bg-white p-3 text-sm shadow-sm ring-1 ring-gray-200 flex-shrink-0">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Approved total
              </p>
              <p className="mt-1 text-2xl font-black text-indigo-700">
                {fmt(reconciliation.finalTotal)}
              </p>
            </div>
          </div>
        </div>

        {/* ── Summary tiles ─────────────────────────────────────────────────── */}
        <SectionCard>
          <SectionHead
            icon={<DollarSign className="h-5 w-5 text-indigo-600" />}
            title="Financial Summary"
          />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <MetricCard
              label="Entry fees"
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
              label="Final approved"
              value={fmt(reconciliation.finalTotal)}
              tone="indigo"
            />
          </div>
          {hasLate && (
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <MetricCard
                label="Late received"
                value={fmt(totals.late)}
                tone="amber"
                helper="After approval"
              />
            </div>
          )}
          <div className="mt-3 flex flex-col gap-2 rounded-xl bg-gray-950 p-4 text-white sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-gray-200">
                Total collected (approved{hasLate ? " + late" : ""}
                {hasTickets ? " + tickets" : ""})
              </p>
              <p className="text-xs text-gray-400">
                All confirmed money regardless of when collected.
              </p>
            </div>
            <p className="text-2xl font-black">{fmt(totals.collected)}</p>
          </div>
        </SectionCard>

        {/* ── Ticket Sales ──────────────────────────────────────────────────── */}
        {hasTickets && (
          <div className="pc rounded-2xl border border-purple-200 bg-purple-50 p-4">
            <div className="rounded-xl border border-purple-100 bg-white overflow-hidden">
              <CollapsibleGroup
                defaultOpen={false}
                header={
                  <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-start gap-2">
                      <Ticket className="mt-0.5 h-5 w-5 flex-shrink-0 text-purple-600" />
                      <div>
                        <h3 className="text-sm font-bold text-gray-950">
                          Pre-sold Ticket Sales
                        </h3>
                        <p className="mt-0.5 text-xs text-gray-600">
                          Confirmed before the quiz · click to view ticket rows
                        </p>
                      </div>
                    </div>
                    <div className="grid grid-cols-4 gap-2 text-right sm:min-w-[340px]">
                      <div>
                        <p className="text-sm font-black text-gray-900">
                          {tickets.length}
                        </p>
                        <p className="text-[11px] text-gray-500">Sold</p>
                      </div>
                      <div>
                        <p className="text-sm font-black text-green-700">
                          {
                            tickets.filter(
                              (t: TicketRow) =>
                                t.redemptionStatus === "redeemed",
                            ).length
                          }
                        </p>
                        <p className="text-[11px] text-gray-500">Redeemed</p>
                      </div>
                      <div>
                        <p className="text-sm font-black text-amber-600">
                          {
                            tickets.filter(
                              (t: TicketRow) =>
                                t.redemptionStatus !== "redeemed",
                            ).length
                          }
                        </p>
                        <p className="text-[11px] text-gray-500">No-show</p>
                      </div>
                      <div>
                        <p className="text-sm font-black text-purple-800">
                          {fmt(totals.tickets)}
                        </p>
                        <p className="text-[11px] text-gray-500">Revenue</p>
                      </div>
                    </div>
                  </div>
                }
              >
                <div className="divide-y divide-gray-50 bg-white">
                  {tickets.map((t: TicketRow) => (
                    <div
                      key={t.ticketId}
                      className="px-4 py-3 flex items-center justify-between gap-4 hover:bg-gray-50"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium text-gray-900">
                            {t.playerName}
                          </span>
                          {t.playerName !== t.purchaserName && (
                            <span className="text-xs text-gray-400">
                              bought by {t.purchaserName}
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-gray-400">
                          {getMethodLabel(t.paymentMethod)}
                          {t.confirmedByName &&
                            ` · confirmed by ${t.confirmedByName}`}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                            t.redemptionStatus === "redeemed"
                              ? "bg-green-100 text-green-700"
                              : "bg-amber-100 text-amber-700"
                          }`}
                        >
                          {t.redemptionStatus === "redeemed"
                            ? "✓ Redeemed"
                            : "✗ No-show"}
                        </span>
                        <span className="text-sm font-semibold text-gray-900">
                          {fmt(t.amount)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="px-4 py-3 flex justify-between bg-purple-50 border-t border-purple-100">
                  <span className="text-sm font-semibold text-purple-800">
                    Total ticket revenue
                  </span>
                  <span className="text-sm font-bold text-purple-900">
                    {fmt(totals.tickets)}
                  </span>
                </div>
              </CollapsibleGroup>
            </div>
          </div>
        )}

        {/* ── On the Night ──────────────────────────────────────────────────── */}
        <div className="pc rounded-2xl border border-green-200 bg-green-50 p-4">
          <SectionHead
            icon={<UserCheck className="h-5 w-5 text-green-600" />}
            title="On the Night — Confirmed Payments"
            subtitle="Grouped by who collected and confirmed each payment"
          />
          {confirmedGroups.length > 0 ? (
            <div className="rounded-xl border border-green-100 bg-white overflow-hidden">
              {confirmedGroups.map((group: ConfirmedGroup) => (
                <CollapsibleGroup
                  key={group.confirmedById}
                  defaultOpen={false}
                  header={
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-xs font-bold text-green-700 shrink-0">
                        {group.confirmedByName.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-gray-900">
                          {group.confirmedByName}
                        </div>
                        <div className="text-xs text-gray-500">
                          {getRoleLabel(group.confirmedByRole)} ·{" "}
                          {group.players.length} player
                          {group.players.length !== 1 ? "s" : ""}
                        </div>
                      </div>
                      <div className="ml-auto mr-2 text-sm font-semibold text-green-700">
                        {fmt(group.totalAmount)}
                      </div>
                    </div>
                  }
                >
                  {group.players.map((p: AuditPlayer) => (
                    <PlayerRow
                      key={p.playerId + p.paymentMethod}
                      name={p.playerName}
                      method={p.methodLabel || getMethodLabel(p.paymentMethod)}
                      reference={p.paymentReference}
                      amount={p.amount}
                      currency={currency}
                    />
                  ))}
                  <div className="px-4 py-2 flex justify-between bg-white">
                    <span className="text-xs font-semibold text-gray-500 uppercase">
                      Subtotal
                    </span>
                    <span className="text-sm font-bold text-green-700">
                      {fmt(group.totalAmount)}
                    </span>
                  </div>
                </CollapsibleGroup>
              ))}
              <div className="px-4 py-3 flex justify-between bg-green-50 border-t border-green-100">
                <span className="text-sm font-semibold text-green-800">
                  Total confirmed on the night
                </span>
                <span className="text-sm font-bold text-green-900">
                  {fmt(totals.confirmedOnNight)}
                </span>
              </div>
            </div>
          ) : (
            <EmptyState>No on-the-night payments confirmed.</EmptyState>
          )}
        </div>

        {/* ── Manual Adjustments ───────────────────────────────────────────── */}
        {hasAdj && (
          <SectionCard>
            <SectionHead
              icon={<Scale className="h-5 w-5 text-indigo-600" />}
              title="Manual Adjustments"
              subtitle="Ledger entries added during reconciliation"
            />
            <div className="rounded-xl border border-gray-200 overflow-hidden">
              {adjustments.map((adj: Adjustment) => {
                const isIncrease =
                  adj.adjustmentType === "received" ||
                  (adj.adjustmentType === "cash_over_short" &&
                    adj.reasonCode === "cash_over");
                return (
                  <div
                    key={adj.id}
                    className="px-4 py-3 flex items-center justify-between gap-4 border-b border-gray-50 last:border-0 hover:bg-gray-50"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium text-gray-900">
                          {getAdjTypeLabel(adj.adjustmentType)}
                        </span>
                        {adj.reasonCode && (
                          <span className="text-xs rounded-full bg-gray-100 text-gray-600 px-2 py-0.5">
                            {adj.reasonCode}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-gray-400 mt-0.5">
                        {new Date(adj.ts).toLocaleString()}
                        {adj.paymentMethod &&
                          ` · ${getMethodLabel(adj.paymentMethod)}`}
                        {adj.note && ` · ${adj.note}`}
                        {` · by ${adj.createdBy}`}
                      </div>
                    </div>
                    <span
                      className={`text-sm font-semibold shrink-0 ${isIncrease ? "text-green-700" : "text-red-700"}`}
                    >
                      {isIncrease ? "+" : "−"}
                      {fmt(adj.amount)}
                    </span>
                  </div>
                );
              })}
              <div className="px-4 py-3 flex justify-between bg-gray-50 border-t border-gray-200">
                <span className="text-sm font-semibold text-gray-700">
                  Net adjustments
                </span>
                <span
                  className={`text-sm font-bold ${reconciliation.adjustmentsNet >= 0 ? "text-green-700" : "text-red-700"}`}
                >
                  {reconciliation.adjustmentsNet >= 0 ? "+" : ""}
                  {fmt(reconciliation.adjustmentsNet)}
                </span>
              </div>
            </div>
          </SectionCard>
        )}

        {/* ── Late Payments ─────────────────────────────────────────────────── */}
        {hasLate && (
          <div className="pc rounded-2xl border border-amber-200 bg-amber-50 p-4">
            <SectionHead
              icon={<Clock className="h-5 w-5 text-amber-600" />}
              title="Late Payments"
              subtitle="Confirmed after the reconciliation was approved"
            />
            <div className="rounded-xl border border-amber-100 bg-white overflow-hidden">
              {latePlayers.map((p: LatePlayer) => (
                <PlayerRow
                  key={p.playerId + p.paymentMethod}
                  name={p.playerName}
                  method={p.methodLabel || getMethodLabel(p.paymentMethod)}
                  reference={p.paymentReference}
                  amount={p.amount}
                  currency={currency}
                  badge={
                    <span className="text-xs rounded-full bg-amber-100 text-amber-700 px-2 py-0.5">
                      {p.confirmedByName || getRoleLabel(p.confirmedByRole)}
                    </span>
                  }
                />
              ))}
              <div className="px-4 py-3 flex justify-between bg-amber-50 border-t border-amber-100">
                <span className="text-sm font-semibold text-amber-800">
                  Total late payments
                </span>
                <span className="text-sm font-bold text-amber-900">
                  {fmt(totals.late)}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* ── Outstanding & Written Off ─────────────────────────────────────── */}
        {(hasOutstanding || hasWrittenOff) && (
          <div className="grid gap-4 lg:grid-cols-2">
            {hasOutstanding && (
              <div className="pc rounded-2xl border border-orange-200 bg-orange-50 p-4">
                <SectionHead
                  icon={<AlertTriangle className="h-5 w-5 text-orange-600" />}
                  title="Outstanding"
                  subtitle="Not resolved — excluded from totals"
                />
                <div className="space-y-3">
                  {Object.entries(outstandingByStatus).map(
                    ([status, players]) => (
                      <div
                        key={status}
                        className="rounded-xl border border-orange-100 bg-white overflow-hidden"
                      >
                        <div className="px-3 py-2 bg-orange-50 border-b border-orange-100 flex items-center gap-2">
                          <span
                            className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${getStatusBadge(status)}`}
                          >
                            {status.charAt(0).toUpperCase() + status.slice(1)}
                          </span>
                          <span className="text-xs text-gray-500">
                            {(players as OutstandingPlayer[]).length} player
                            {(players as OutstandingPlayer[]).length !== 1
                              ? "s"
                              : ""}
                          </span>
                        </div>
                        {(players as OutstandingPlayer[]).map((p) => (
                          <PlayerRow
                            key={p.playerId + p.paymentMethod}
                            name={p.playerName}
                            method={
                              p.methodLabel || getMethodLabel(p.paymentMethod)
                            }
                            reference={p.paymentReference}
                            amount={p.amount}
                            currency={currency}
                          />
                        ))}
                      </div>
                    ),
                  )}
                  <div className="flex justify-between px-1">
                    <span className="text-sm font-semibold text-orange-800">
                      Total outstanding
                    </span>
                    <span className="text-sm font-bold text-orange-900">
                      {fmt(totals.outstanding)}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {hasWrittenOff && (
              <div className="pc rounded-2xl border border-red-200 bg-red-50 p-4">
                <SectionHead
                  icon={<AlertCircle className="h-5 w-5 text-red-600" />}
                  title="Written Off"
                  subtitle="Closed as not collected — excluded from totals"
                />
                <div className="rounded-xl border border-red-100 bg-white overflow-hidden">
                  {writtenOff.map((p: WrittenOffPlayer) => (
                    <div
                      key={p.playerId + p.paymentMethod}
                      className="px-4 py-3 border-b border-red-50 last:border-0"
                    >
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <span className="text-sm font-medium text-gray-900">
                            {p.playerName}
                          </span>
                          <div className="text-xs text-gray-400">
                            {getMethodLabel(p.paymentMethod)}
                          </div>
                        </div>
                        <span className="text-sm font-semibold text-red-700">
                          {fmt(p.amount)}
                        </span>
                      </div>
                      {p.adminNotes && (
                        <p className="mt-1 rounded-lg bg-red-50 p-2 text-xs text-gray-600">
                          Note: {p.adminNotes}
                        </p>
                      )}
                    </div>
                  ))}
                  <div className="px-4 py-3 flex justify-between bg-red-50 border-t border-red-100">
                    <span className="text-sm font-semibold text-red-800">
                      Total written off
                    </span>
                    <span className="text-sm font-bold text-red-900">
                      {fmt(totals.writtenOff)}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}