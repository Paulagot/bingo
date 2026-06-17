// src/components/mgtsystem/components/digitalEvents/tabs/reconciliation/TicketedEventReconciliationTab.tsx
//
// Reconciliation panel for completed ticketed events.
//
// Step 1 — Ticket Revenue: confirmed totals + manual payment breakdown
//           (who collected cash / confirmed Revolut) + unresolved claimed
//           payments with Confirm/Dispute actions.
// Step 2 — Adjustments: HTTP-based ledger, saves on blur.
// Step 3 — Approve: locks records, stamps ledger.

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Scale, CheckCircle2, AlertCircle, Loader, RefreshCw,
  Lock, Ticket, DollarSign, Users, UserCheck, AlertTriangle, X, 
} from 'lucide-react';
import type { Web2RoomListItem as Room } from '../../../../../../shared/api/quiz.api';
import ticketedEventReconciliationService, {
  type TicketedEventAdjustment,
  type TicketedEventReconciliation,
  type PaymentSummary,
  type RoomMeta,
} from '../../../../services/TicketedEventReconciliationService';
import { TicketedEventAdjustmentsLedger } from './TicketedEventAdjustmentsLedger';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(sym: string, n: number) {
  return `${sym}${Number(n || 0).toFixed(2)}`;
}

function methodLabel(m: string) {
  const map: Record<string, string> = {
    cash: 'Cash', card: 'Card', card_tap: 'Card (tap)',
    instant_payment: 'Instant Payment', pay_admin: 'Pay Host',
    stripe: 'Stripe', web3: 'Web3', crypto: 'Crypto', other: 'Other',
  };
  return map[m] ?? m;
}

function getRoleLabel(role: string) {
  if (role === 'host')  return 'Host';
  if (role === 'admin') return 'Staff';
  return role || 'Staff';
}

/**
 * Walk-ins are tickets added by staff at the door during check-in.
 * The backend may set saleType = 'walk_in' explicitly on the player object.
 * If not present, we detect by playerId prefix convention ('walkin_').
 * Stripe auto-confirmed rows (confirmedBy = 'webhook_auto') are advance sales.
 */
function getSaleTypeLabel(player: any): 'Walk-in' | 'Advance' {
  if (player.saleType === 'walk_in')          return 'Walk-in';
  if (player.saleType === 'advance')          return 'Advance';
  if (typeof player.playerId === 'string' && player.playerId.startsWith('walkin_')) return 'Walk-in';
  if (player.confirmedBy === 'webhook_auto')  return 'Advance';
  return 'Advance';
}

function SaleTypePill({ type }: { type: 'Walk-in' | 'Advance' }) {
  return type === 'Walk-in' ? (
    <span className="inline-flex items-center rounded-full bg-amber-100 px-1.5 py-0.5 text-[9px] font-bold text-amber-700 border border-amber-200 shrink-0">
      Walk-in
    </span>
  ) : (
    <span className="inline-flex items-center rounded-full bg-blue-50 px-1.5 py-0.5 text-[9px] font-bold text-blue-600 border border-blue-100 shrink-0">
      Advance
    </span>
  );
}

function StepBadge({ n, status }: { n: number; status: 'pending' | 'active' | 'done' }) {
  const base = 'flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold shrink-0';
  if (status === 'done')   return <div className={`${base} bg-green-100 text-green-700`}><CheckCircle2 className="h-5 w-5" /></div>;
  if (status === 'active') return <div className={`${base} bg-blue-100 text-blue-700`}>{n}</div>;
  return <div className={`${base} bg-gray-100 text-gray-400`}>{n}</div>;
}

// ─── Dispute modal ────────────────────────────────────────────────────────────

interface DisputeTarget {
  playerId:      string;
  playerName:    string;
  ticketId:      string | null;
  paymentMethod: string;
  amount:        number;
  reference:     string | null;
}

const DisputeModal: React.FC<{
  target:      DisputeTarget;
  sym:         string;
  submitting:  boolean;
  onClose:     () => void;
  onSubmit:    (reason: string) => void;
}> = ({ target, sym, submitting, onClose, onSubmit }) => {
  const [reason, setReason] = useState('');
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl overflow-hidden">
        <div className="flex items-start justify-between gap-4 border-b border-gray-100 px-5 py-4">
          <div>
            <h2 className="text-base font-bold text-gray-900">Mark payment as disputed</h2>
            <p className="text-xs text-gray-500 mt-0.5">Add a note explaining why this payment couldn't be verified.</p>
          </div>
          <button onClick={onClose} disabled={submitting} className="rounded-full p-1.5 text-gray-400 hover:bg-gray-100">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="px-5 py-4 space-y-4">
          <div className="rounded-xl border border-red-100 bg-red-50 p-3">
            <div className="font-semibold text-sm text-red-900">{target.playerName}</div>
            <div className="text-xs text-red-700 mt-0.5">
              {fmt(sym, target.amount)} · {methodLabel(target.paymentMethod)}
              {target.reference && ` · Ref: ${target.reference}`}
            </div>
          </div>
          <textarea
            value={reason}
            onChange={e => setReason(e.target.value)}
            rows={3}
            maxLength={300}
            placeholder="e.g. payment reference not found, amount doesn't match…"
            className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100"
            autoFocus
          />
        </div>
        <div className="flex gap-2 border-t border-gray-100 bg-gray-50 px-5 py-4">
          <button onClick={onClose} disabled={submitting}
            className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50">
            Cancel
          </button>
          <button onClick={() => onSubmit(reason.trim())} disabled={submitting || !reason.trim()}
            className="flex-1 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50">
            {submitting ? 'Saving…' : 'Mark disputed'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  room: Room;
  onRefreshRoom?: () => Promise<void>;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function TicketedEventReconciliationTab({ room, onRefreshRoom }: Props) {
  const roomId = room.room_id;

  // ── Data state ──────────────────────────────────────────────────────────────
  const [meta,           setMeta]           = useState<RoomMeta | null>(null);
  const [reconciliation, setReconciliation] = useState<TicketedEventReconciliation | null>(null);
  const [adjustments,    setAdjustments]    = useState<TicketedEventAdjustment[]>([]);
  const [summary,        setSummary]        = useState<PaymentSummary | null>(null);
  const [paymentView,    setPaymentView]    = useState<any>(null);
  const [loading,        setLoading]        = useState(true);
  const [loadError,      setLoadError]      = useState<string | null>(null);

  // ── Approval state ──────────────────────────────────────────────────────────
  const [approvedBy,    setApprovedBy]   = useState('');
  const [notes,         setNotes]        = useState('');
  const [approving,     setApproving]    = useState(false);
  const [approveError,  setApproveError] = useState<string | null>(null);
  const [approveOk,     setApproveOk]    = useState(false);

  // ── Claimed payment actions ─────────────────────────────────────────────────
  const [confirmingId,      setConfirmingId]      = useState<string | null>(null);
  const [disputeTarget,     setDisputeTarget]     = useState<DisputeTarget | null>(null);
  const [disputeSubmitting, setDisputeSubmitting] = useState(false);

  const isApproved = !!reconciliation?.approvedAt;
  const sym        = meta?.currencySymbol ?? '€';

  const claimedPayments  = paymentView?.onTheNight?.claimed        ?? [];
  const disputedPayments = paymentView?.onTheNight?.disputed       ?? [];
  const confirmedGroups  = paymentView?.onTheNight?.confirmedGroups ?? [];
  const pendingClaimed   = claimedPayments.length;

  // ── Walk-in vs advance counts — derived from confirmedGroups (paymentView)
  // We intentionally do NOT rely on summary.tickets for this because that type
  // only has { total, checkedIn, notCheckedIn }. The saleType breakdown lives
  // in each player row inside confirmedGroups.
  const { walkInCount, advanceCount } = useMemo(() => {
    let walkIn = 0, advance = 0;
    for (const group of confirmedGroups) {
      for (const p of (group.players ?? [])) {
        if (getSaleTypeLabel(p) === 'Walk-in') walkIn++;
        else advance++;
      }
    }
    return { walkInCount: walkIn, advanceCount: advance };
  }, [confirmedGroups]);

  // ── Fetch ───────────────────────────────────────────────────────────────────
  const fetchState = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [stateData, viewData] = await Promise.all([
        ticketedEventReconciliationService.getState(roomId),
        ticketedEventReconciliationService.getPaymentView(roomId),
      ]);
      setMeta(stateData.meta);
      setReconciliation(stateData.reconciliation);
      setAdjustments(stateData.adjustments ?? []);
      setSummary(stateData.summary);
      setPaymentView(viewData);
      if (stateData.reconciliation?.approvedAt) {
        setApprovedBy(stateData.reconciliation.approvedBy ?? '');
        setApproveOk(true);
      }
    } catch (e: any) {
      setLoadError(e?.message || 'Failed to load reconciliation data');
    } finally {
      setLoading(false);
    }
  }, [roomId]);

  useEffect(() => { fetchState(); }, [fetchState]);

  // ── Adjustments net ─────────────────────────────────────────────────────────
  const adjustmentsNet = useMemo(() => {
    let moneyIn = 0, moneyOut = 0;
    for (const a of adjustments) {
      const amt = Number(a.amount || 0);
      switch (a.adjustmentType) {
        case 'received':     moneyIn  += amt; break;
        case 'refund':
        case 'fee':
        case 'prize_payout': moneyOut += amt; break;
        case 'cash_over_short':
          if (a.reasonCode === 'cash_over')  moneyIn  += amt;
          else if (a.reasonCode === 'cash_short') moneyOut += amt;
          break;
      }
    }
    return moneyIn - moneyOut;
  }, [adjustments]);

  const startingTotal   = summary?.startingTotal ?? 0;
  const reconciledTotal = startingTotal + adjustmentsNet;

  // ── Confirm claimed payment ─────────────────────────────────────────────────
  const handleConfirm = async (player: any) => {
    if (!player.ticketId) return;
    setConfirmingId(player.playerId);
    try {
      await ticketedEventReconciliationService.confirmPayment(
        roomId,
        player.ticketId,
        meta?.hostName || 'Host',
      );
      await fetchState();
    } catch (e: any) {
      console.error('Confirm failed:', e);
    } finally {
      setConfirmingId(null);
    }
  };

  // ── Dispute claimed payment ─────────────────────────────────────────────────
  const handleDisputeSubmit = async (reason: string) => {
    if (!disputeTarget) return;
    setDisputeSubmitting(true);
    try {
      await ticketedEventReconciliationService.disputePayment(
        roomId,
        disputeTarget.playerId,
        reason,
      );
      setDisputeTarget(null);
      await fetchState();
    } catch (e: any) {
      console.error('Dispute failed:', e);
    } finally {
      setDisputeSubmitting(false);
    }
  };

  // ── Approve ─────────────────────────────────────────────────────────────────
  const handleApprove = async () => {
    if (!approvedBy.trim() || pendingClaimed > 0) return;
    setApproving(true);
    setApproveError(null);
    try {
      const res = await ticketedEventReconciliationService.approve(roomId, {
        approvedBy: approvedBy.trim(),
        notes: notes.trim() || null,
      });
      setReconciliation(prev => ({
        ...(prev ?? { id: '', roomId, clubId: '', startingEntryFees: 0, startingExtras: 0 }),
        startingTotal:     res.data.startingTotal,
        startingEntryFees: summary?.entryFees ?? 0,
        startingExtras:    summary?.extras ?? 0,
        adjustmentsNet:    res.data.adjustmentsNet,
        finalTotal:        res.data.finalTotal,
        approvedBy:        res.data.approvedBy,
        approvedAt:        res.data.approvedAt,
        notes:             notes.trim() || null,
      }));
      setApproveOk(true);
      setTimeout(() => onRefreshRoom?.(), 500);
    } catch (e: any) {
      setApproveError(e?.message || 'Approval failed. Please try again.');
    } finally {
      setApproving(false);
    }
  };

  // ── Guards ──────────────────────────────────────────────────────────────────
  if (room.status !== 'completed') {
    return (
      <div className="p-5">
        <div className="rounded-xl border border-dashed border-[#dce1df] bg-[#fbf8f2] p-8 text-center">
          <p className="text-sm text-[#8a9bab]">Reconciliation is available once the event is closed.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader className="h-6 w-6 animate-spin text-[#157f85]" />
        <span className="ml-3 text-sm text-[#52636f]">Loading reconciliation…</span>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="p-5 space-y-3">
        <div className="flex gap-3 rounded-xl border border-[rgba(233,87,79,0.3)] bg-[rgba(233,87,79,0.08)] p-4">
          <AlertCircle className="h-5 w-5 text-[#c8423b] shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-[#8b1c1c]">Failed to load</p>
            <p className="text-xs text-[#c8423b] mt-1">{loadError}</p>
          </div>
        </div>
        <button onClick={fetchState}
          className="inline-flex items-center gap-2 rounded-lg bg-[#157f85] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0e6268]">
          <RefreshCw className="h-4 w-4" /> Retry
        </button>
      </div>
    );
  }

  const step1Status: 'done' | 'active' | 'pending' = 'done';
  const step2Status: 'done' | 'active' | 'pending' = isApproved ? 'done' : 'active';
  const step3Status: 'done' | 'active' | 'pending' = isApproved ? 'done' : 'active';

  return (
    <>
      {disputeTarget && (
        <DisputeModal
          target={disputeTarget}
          sym={sym}
          submitting={disputeSubmitting}
          onClose={() => setDisputeTarget(null)}
          onSubmit={handleDisputeSubmit}
        />
      )}

      <div className="min-h-full bg-gray-50 py-5 px-4 space-y-6">

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <Scale className="h-5 w-5 text-indigo-600" />
            <h2 className="text-lg font-bold text-gray-900">Payment Reconciliation</h2>
          </div>
          <p className="text-sm text-gray-600">
            Review ticket revenue, resolve any outstanding payments, add adjustments, then approve to lock your records.
          </p>
          {isApproved && reconciliation?.approvedAt && (
            <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-green-100 border border-green-300 px-3 py-1 text-xs font-semibold text-green-800">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Approved by {reconciliation.approvedBy} on{' '}
              {new Date(reconciliation.approvedAt).toLocaleString()}
            </div>
          )}
        </div>

        {/* ── Step 1: Ticket Revenue ──────────────────────────────────────── */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <StepBadge n={1} status={step1Status} />
            <h3 className="text-base font-bold text-gray-900">Ticket Revenue</h3>
            <button onClick={fetchState} disabled={loading} title="Refresh"
              className="ml-auto rounded-lg border border-gray-200 bg-white p-1.5 text-gray-400 hover:bg-gray-50 hover:text-gray-600 transition-colors">
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {/* Summary tiles */}
          {summary && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
              <div className="rounded-lg bg-green-50 border border-green-200 p-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <Ticket className="h-3.5 w-3.5 text-green-600" />
                  <div className="text-xs font-medium text-green-700">Tickets Sold</div>
                </div>
                <div className="text-xl font-bold text-green-900">{summary.tickets.total}</div>
                <div className="text-xs text-green-600 mt-0.5">{summary.tickets.checkedIn} checked in</div>
              </div>
              <div className="rounded-lg bg-blue-50 border border-blue-200 p-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <Users className="h-3.5 w-3.5 text-blue-600" />
                  <div className="text-xs font-medium text-blue-700">Attendees</div>
                </div>
                <div className="text-xl font-bold text-blue-900">{summary.confirmedPlayers}</div>
                <div className="text-xs text-blue-600 mt-0.5">confirmed paid</div>
              </div>
              <div className="rounded-lg bg-purple-50 border border-purple-200 p-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <DollarSign className="h-3.5 w-3.5 text-purple-600" />
                  <div className="text-xs font-medium text-purple-700">Entry Fees</div>
                </div>
                <div className="text-xl font-bold text-purple-900">{fmt(sym, summary.entryFees)}</div>
              </div>
              <div className="rounded-lg bg-indigo-50 border border-indigo-200 p-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <Scale className="h-3.5 w-3.5 text-indigo-600" />
                  <div className="text-xs font-medium text-indigo-700">Starting Total</div>
                </div>
                <div className="text-xl font-bold text-indigo-900">{fmt(sym, summary.startingTotal)}</div>
                <div className="text-xs text-indigo-600 mt-0.5">before adjustments</div>
              </div>
            </div>
          )}

          {/* ── Ticket Sales Breakdown (advance vs walk-in) ──
              Derived from confirmedGroups in paymentView — no extra fields needed
              on the PaymentSummary type. Only shown when we have both types. */}
          {(walkInCount > 0 || advanceCount > 0) && (
            <div className="rounded-xl border border-gray-200 overflow-hidden mb-4">
              <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase">
                Ticket Sales Breakdown
              </div>
              <div className="divide-y divide-gray-50 bg-white">
                {advanceCount > 0 && (
                  <div className="px-4 py-2.5 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <SaleTypePill type="Advance" />
                      <span className="text-sm font-medium text-gray-900">Advance sales</span>
                    </div>
                    <span className="text-sm font-semibold text-gray-900">
                      {advanceCount} ticket{advanceCount !== 1 ? 's' : ''}
                    </span>
                  </div>
                )}
                {walkInCount > 0 && (
                  <div className="px-4 py-2.5 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <SaleTypePill type="Walk-in" />
                      <span className="text-sm font-medium text-gray-900">Walk-in (added at door)</span>
                    </div>
                    <span className="text-sm font-semibold text-gray-900">
                      {walkInCount} ticket{walkInCount !== 1 ? 's' : ''}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

           {/* ── By ticket type ── */}
          {summary && Array.isArray(summary.byTicketType) && summary.byTicketType.length > 1 && (
            <div className="rounded-xl border border-[rgba(21,127,133,0.2)] overflow-hidden mb-4">
              <div className="px-4 py-2.5 bg-[rgba(21,127,133,0.06)] border-b border-[rgba(21,127,133,0.15)] flex items-center gap-2">
                <Ticket className="h-4 w-4 text-[#157f85]" />
                <span className="text-xs font-semibold text-[#157f85] uppercase">By Ticket Type</span>
              </div>
              <div className="divide-y divide-gray-50 bg-white">
                {summary.byTicketType.map((row: any) => (
                  <div key={row.ticketTypeId} className="px-4 py-2.5 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="inline-flex items-center gap-1 rounded-full border border-[rgba(21,127,133,0.25)] bg-[rgba(21,127,133,0.06)] px-2 py-0.5 text-xs font-semibold text-[#157f85]">
                        {row.ticketTypeName}
                      </span>
                      <span className="text-xs text-gray-400">{row.ticketCount} ticket{row.ticketCount !== 1 ? 's' : ''}</span>
                    </div>
                    <span className="text-sm font-semibold text-gray-900">{fmt(sym, row.total)}</span>
                  </div>
                ))}
              </div>
              <div className="px-4 py-2.5 flex justify-between bg-gray-50 border-t border-gray-200">
                <span className="text-sm font-semibold text-gray-700">Total</span>
                <span className="text-sm font-bold text-[#157f85]">{fmt(sym, summary.startingTotal)}</span>
              </div>
            </div>
          )}

          {/* By payment method */}
          {summary && summary.byMethod.length > 0 && (
            <div className="rounded-xl border border-gray-200 overflow-hidden mb-4">
              <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase">
                By Payment Method
              </div>
              <div className="divide-y divide-gray-50 bg-white">
                {summary.byMethod.map(row => (
                  <div key={row.method} className="px-4 py-2.5 flex items-center justify-between">
                    <div className="text-sm font-medium text-gray-900">{methodLabel(row.method)}</div>
                    <div className="text-sm font-semibold text-gray-900">{fmt(sym, row.total)}</div>
                  </div>
                ))}
              </div>
              <div className="px-4 py-2.5 flex justify-between bg-gray-50 border-t border-gray-200">
                <span className="text-sm font-semibold text-gray-700">Total confirmed</span>
                <span className="text-sm font-bold text-indigo-700">{fmt(sym, summary?.startingTotal ?? 0)}</span>
              </div>
            </div>
          )}

          {/* ── Who collected what ──
              Each staff member's row now shows advance/walk-in counts as sub-badges,
              and each individual player row shows a sale-type pill so it's clear
              which entries were added at the door vs pre-sold. */}
          {confirmedGroups.length > 0 && (
            <div className="rounded-xl border border-green-100 overflow-hidden mb-4">
              <div className="px-4 py-2.5 bg-green-50 border-b border-green-100 flex items-center gap-2">
                <UserCheck className="h-4 w-4 text-green-700" />
                <span className="text-xs font-semibold text-green-800 uppercase">Collected by</span>
                <span className="ml-auto flex items-center gap-1.5 text-[10px] text-green-700 font-medium">
                  <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 border border-blue-100 px-1.5 py-0.5">
                    <span className="font-bold text-blue-600">A</span>dvance
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 border border-amber-200 px-1.5 py-0.5">
                    <span className="font-bold text-amber-700">W</span>alk-in
                  </span>
                </span>
              </div>
              <div className="divide-y divide-gray-50 bg-white">
                {confirmedGroups.map((group: any) => {
                  const groupWalkIn  = (group.players ?? []).filter((p: any) => getSaleTypeLabel(p) === 'Walk-in').length;
                  const groupAdvance = (group.players ?? []).length - groupWalkIn;
                  return (
                    <div key={group.confirmedById} className="px-4 py-3">
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-[rgba(21,127,133,0.12)] flex items-center justify-center text-xs font-bold text-[#157f85] shrink-0">
                            {(group.confirmedByName ?? '?').charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="text-sm font-semibold text-gray-900">{group.confirmedByName}</div>
                            <div className="text-xs text-gray-500 flex flex-wrap items-center gap-1.5 mt-0.5">
                              {getRoleLabel(group.confirmedByRole)}
                              {groupAdvance > 0 && (
                                <span className="rounded-full bg-blue-50 border border-blue-100 px-1.5 text-[9px] font-bold text-blue-600">
                                  {groupAdvance} advance
                                </span>
                              )}
                              {groupWalkIn > 0 && (
                                <span className="rounded-full bg-amber-100 border border-amber-200 px-1.5 text-[9px] font-bold text-amber-700">
                                  {groupWalkIn} walk-in
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="text-sm font-bold text-[#157f85] shrink-0">{fmt(sym, group.totalAmount)}</div>
                      </div>
                      <div className="ml-9 space-y-1">
                        {(group.players ?? []).map((p: any) => (
                          <div key={p.playerId + p.paymentMethod} className="flex items-center justify-between gap-2 text-xs text-gray-500">
                            <span className="flex items-center gap-1.5 min-w-0">
                              <SaleTypePill type={getSaleTypeLabel(p)} />
                              <span className="truncate">
                                {p.playerName} · {p.methodLabel || methodLabel(p.paymentMethod)}
                                {p.paymentReference ? ` · ${p.paymentReference}` : ''}
                              </span>
                            </span>
                            <span className="font-medium text-gray-700 shrink-0">{fmt(sym, p.amount)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Claimed payments needing resolution ── */}
          {claimedPayments.length > 0 && (
            <div className="rounded-xl border border-amber-200 overflow-hidden mb-4">
              <div className="px-4 py-2.5 bg-amber-50 border-b border-amber-200 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <span className="text-xs font-semibold text-amber-800 uppercase">
                  {claimedPayments.length} claimed payment{claimedPayments.length !== 1 ? 's' : ''} need resolution
                </span>
              </div>
              <div className="divide-y divide-amber-50 bg-white">
                {claimedPayments.map((player: any) => (
                  <div key={player.playerId} className="px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-900">{player.playerName}</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {fmt(sym, player.amount)} · {player.methodLabel || methodLabel(player.paymentMethod)}
                        {player.paymentReference && (
                          <span className="ml-1 font-mono text-amber-700"> Ref: {player.paymentReference}</span>
                        )}
                      </p>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <button
                        onClick={() => handleConfirm(player)}
                        disabled={confirmingId === player.playerId || isApproved}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-green-500/60 bg-green-50 px-3 py-1.5 text-xs font-semibold text-green-800 hover:bg-green-100 disabled:opacity-50 transition-colors"
                      >
                        {confirmingId === player.playerId
                          ? <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                          : <CheckCircle2 className="h-3.5 w-3.5" />}
                        Confirm
                      </button>
                      <button
                        onClick={() => setDisputeTarget({
                          playerId:      player.playerId,
                          playerName:    player.playerName,
                          ticketId:      player.ticketId,
                          paymentMethod: player.paymentMethod,
                          amount:        player.amount,
                          reference:     player.paymentReference,
                        })}
                        disabled={confirmingId === player.playerId || isApproved}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-red-400/60 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-800 hover:bg-red-100 disabled:opacity-50 transition-colors"
                      >
                        <AlertTriangle className="h-3.5 w-3.5" /> Dispute
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Disputed payments (info only) ── */}
          {disputedPayments.length > 0 && (
            <div className="rounded-xl border border-red-200 overflow-hidden">
              <div className="px-4 py-2.5 bg-red-50 border-b border-red-200 text-xs font-semibold text-red-800 uppercase">
                {disputedPayments.length} disputed payment{disputedPayments.length !== 1 ? 's' : ''} — excluded from total
              </div>
              <div className="divide-y divide-red-50 bg-white">
                {disputedPayments.map((player: any) => (
                  <div key={player.playerId} className="px-4 py-2.5 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{player.playerName}</p>
                      <p className="text-xs text-gray-500">{methodLabel(player.paymentMethod)}</p>
                    </div>
                    <span className="text-sm font-semibold text-red-600">{fmt(sym, player.amount)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── Step 2: Adjustments ─────────────────────────────────────────── */}
        <div className={`bg-white rounded-xl border p-5 shadow-sm ${isApproved ? 'border-gray-200' : 'border-blue-200'}`}>
          <div className="flex items-center gap-3 mb-4">
            <StepBadge n={2} status={step2Status} />
            <h3 className="text-base font-bold text-gray-900">Adjustments</h3>
            {isApproved && <Lock className="h-4 w-4 text-gray-400" />}
          </div>

          {!isApproved && (
            <div className="mb-4 flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900">
              <Scale className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
              Record any cash, refunds, or other adjustments not captured above. Changes save automatically.
            </div>
          )}

          <TicketedEventAdjustmentsLedger
            roomId={roomId}
            adjustments={adjustments}
            currency={sym}
            currencyCode={meta?.currency ?? 'EUR'}
            isLocked={isApproved}
            hostName={meta?.hostName ?? 'Host'}
            onChange={setAdjustments}
          />

          {/* Reconciled total */}
          <div className="mt-4 rounded-lg bg-gradient-to-r from-indigo-500 to-purple-600 p-4 text-white">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium opacity-90">
                  {isApproved ? 'Approved Total' : 'Reconciled Total'}
                </div>
                <div className="text-3xl font-bold mt-1">
                  {fmt(sym, isApproved ? (reconciliation?.finalTotal ?? 0) : reconciledTotal)}
                </div>
                {adjustmentsNet !== 0 && (
                  <div className="text-xs opacity-75 mt-1">
                    {fmt(sym, startingTotal)} starting {adjustmentsNet >= 0 ? '+' : ''}{fmt(sym, adjustmentsNet)} adjustments
                  </div>
                )}
              </div>
              <Scale className="h-10 w-10 opacity-30" />
            </div>
          </div>
        </div>

        {/* ── Step 3: Approve ──────────────────────────────────────────────── */}
        <div className={`bg-white rounded-xl border p-5 shadow-sm ${isApproved ? 'border-green-200' : 'border-indigo-200'}`}>
          <div className="flex items-center gap-3 mb-4">
            <StepBadge n={3} status={step3Status} />
            <h3 className="text-base font-bold text-gray-900">Approve &amp; Lock</h3>
          </div>

          {isApproved ? (
            <div className="rounded-xl bg-green-50 border border-green-200 p-4 flex items-center gap-3">
              <CheckCircle2 className="h-6 w-6 text-green-600 shrink-0" />
              <div>
                <p className="font-semibold text-green-900">Reconciliation approved</p>
                <p className="text-sm text-green-700 mt-0.5">
                  Final total: <strong>{fmt(sym, reconciliation?.finalTotal ?? 0)}</strong>
                  {' '}· Approved by <strong>{reconciliation?.approvedBy}</strong>
                </p>
                <p className="text-xs text-green-600 mt-1">
                  The Approval Totals tab now shows the full breakdown.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {pendingClaimed > 0 && (
                <div className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3">
                  <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                  <div>
                    <div className="text-sm font-semibold text-amber-900">Approval blocked</div>
                    <div className="text-xs text-amber-800 mt-0.5">
                      {pendingClaimed} claimed payment{pendingClaimed !== 1 ? 's' : ''} must be confirmed or disputed before approving.
                    </div>
                  </div>
                </div>
              )}

              <div className="flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900">
                <AlertCircle className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
                <span>Once approved, adjustments are locked and your records are finalised.</span>
              </div>

              {approveOk && !isApproved && (
                <div className="flex items-center gap-2 rounded-lg bg-green-50 border border-green-200 p-3">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <span className="text-sm text-green-900 font-medium">Saved successfully</span>
                </div>
              )}

              {approveError && (
                <div className="flex items-start gap-2 rounded-lg bg-red-50 border border-red-200 p-3">
                  <AlertCircle className="h-4 w-4 text-red-600 mt-0.5 shrink-0" />
                  <span className="text-sm text-red-800">{approveError}</span>
                </div>
              )}

              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-1.5">
                  Approved by <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={approvedBy}
                  onChange={e => setApprovedBy(e.target.value)}
                  disabled={approving}
                  placeholder="Your name or role (required)"
                  className="w-full rounded-lg border-2 border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 disabled:bg-gray-100 transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-1.5">
                  Notes (optional)
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  disabled={approving}
                  placeholder="Any discrepancies or final notes…"
                  className="w-full rounded-lg border-2 border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 disabled:bg-gray-100 transition-all resize-none"
                />
              </div>

              <button
                onClick={handleApprove}
                disabled={!approvedBy.trim() || approving || pendingClaimed > 0}
                className="w-full rounded-xl bg-indigo-600 py-3 text-sm font-bold text-white hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                {approving
                  ? <><Loader className="h-4 w-4 animate-spin" /> Approving…</>
                  : <><CheckCircle2 className="h-4 w-4" /> Approve Reconciliation</>
                }
              </button>

              {!approvedBy.trim() && (
                <p className="text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-2">
                  Enter your name above to enable approval.
                </p>
              )}
              {pendingClaimed > 0 && approvedBy.trim() && (
                <p className="text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-2">
                  Resolve the claimed payments above before approving.
                </p>
              )}
            </div>
          )}
        </div>

      </div>
    </>
  );
}