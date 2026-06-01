// src/components/Elimination/reconciliation/EliminationReconciliationPanel.tsx

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Scale, Users, DollarSign, CheckCircle2, AlertTriangle,
   Info, RefreshCw, Lock, TrendingUp, Trophy,
  ChevronDown, ChevronUp, X,
} from 'lucide-react';
import { EliminationAdjustmentsLedger, type AdjustmentEntry } from './EliminationAdjustmentsLedger';
import type { EliminationRoom } from '../types/elimination';

// ─── Types ────────────────────────────────────────────────────────────────────

interface WinnerSummary { winnerId: string; winnerName: string; }

interface Props {
  roomId: string;
  hostId: string;
  isLoggedIn: boolean;
  socket: any;
  room: EliminationRoom | null;
  winner: WinnerSummary | null;
  onComplete: () => void;
}

interface LedgerSummary {
  totals: { entryFees: number; extras: number; extrasCount: number; total: number };
  paidPlayers: number;
}

interface OnNightPlayer {
  playerId: string;
  playerName: string;
  paymentMethod: string;
  paymentReference?: string | null;
  amount: number;
  status: string;
}

interface ReconciliationView {
  onTheNight: {
    confirmedGroups: any[];
    claimed: OnNightPlayer[];
    disputed: OnNightPlayer[];
    expected: OnNightPlayer[];
    totalConfirmed: number;
    totalClaimed: number;
    totalDisputed: number;
    totalExpected: number;
  };
  byMethod: { method: string; confirmed: number; claimed: number; disputed: number; expected: number; total: number }[];
  totalConfirmed: number;
  totalGap: number;
}

interface EliminationTimeline {
  round: number | null;
  eliminated?: { playerId: string; name: string }[];
  survived?: { playerId: string; name: string }[];
}

interface ReconciliationRecord {
  roomId: string;
  clubId: string | null;
  startingEntryFees: number;
  startingExtras: number;
  startingTotal: number;
  adjustmentsNet: number;
  finalTotal: number;
  approvedBy: string | null;
  approvedAt: string | null;
  notes: string | null;
  finalLeaderboard: {
    type: string;
    totalRounds: number;
    totalPlayers: number;
    totalAdmins: number;
    winner: { playerId: string; name: string };
    timeline: EliminationTimeline[];
    finalStandings: { rank: number; playerId: string; name: string; cumulativeScore: number; eliminatedInRound: number | null }[];
  } | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number, sym: string) {
  return `${sym}${Number(n || 0).toFixed(2)}`;
}

function getMethodLabel(raw: string): string {
  const map: Record<string, string> = {
    cash: 'Cash', card: 'Card', card_tap: 'Card (tap)',
    instant_payment: 'Instant Payment', pay_admin: 'Pay Host',
    stripe: 'Stripe', web3: 'Web3', crypto: 'Crypto', other: 'Other',
  };
  return map[raw?.toLowerCase()] ?? raw ?? 'Unknown';
}

function StepBadge({ n, status }: { n: number; status: 'pending' | 'active' | 'done' }) {
  return (
    <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold shrink-0 ${
      status === 'done'   ? 'bg-green-100 text-green-700'
      : status === 'active' ? 'bg-blue-100 text-blue-700'
      : 'bg-gray-100 text-gray-400'
    }`}>
      {status === 'done' ? <CheckCircle2 className="h-5 w-5" /> : n}
    </div>
  );
}

function InfoBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 flex items-start gap-2 text-sm text-blue-900">
      <Info className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
      <div>{children}</div>
    </div>
  );
}

// ─── Dispute modal ────────────────────────────────────────────────────────────

const DisputeModal: React.FC<{
  player: OnNightPlayer;
  currencySymbol: string;
  onClose: () => void;
  onSubmit: (reason: string) => void;
  submitting: boolean;
}> = ({ player, currencySymbol, onClose, onSubmit, submitting }) => {
  const [reason, setReason] = useState('');
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl border border-gray-200 overflow-hidden">
        <div className="flex items-start justify-between gap-4 border-b border-gray-100 px-5 py-4">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Mark payment as disputed</h2>
            <p className="text-sm text-gray-500 mt-0.5">Add a note explaining why this payment wasn't confirmed.</p>
          </div>
          <button onClick={onClose} disabled={submitting} className="rounded-full p-1.5 text-gray-400 hover:bg-gray-100">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="px-5 py-4 space-y-4">
          <div className="rounded-xl border border-red-100 bg-red-50 p-3">
            <div className="font-semibold text-red-900">{player.playerName}</div>
            <div className="text-xs text-red-700 mt-0.5">
              {fmt(player.amount, currencySymbol)} · {getMethodLabel(player.paymentMethod)}
              {player.paymentReference && ` · Ref: ${player.paymentReference}`}
            </div>
          </div>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
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

// ─── Main Component ───────────────────────────────────────────────────────────

export const EliminationReconciliationPanel: React.FC<Props> = ({
  roomId, hostId, isLoggedIn, socket, room, winner, onComplete,
}) => {
  const currency       = (room as any)?.currency ?? 'EUR';
  const currencySymbol = currency === 'GBP' ? '£' : currency === 'USD' ? '$' : '€';
  const entryFee       = Number((room as any)?.entryFee ?? 0);
  const hostName       = (room as any)?.hostName ?? 'Host';

  // ── Data state ──────────────────────────────────────────────────────────────
  const [reconciliation, setReconciliation] = useState<ReconciliationRecord | null>(null);
  const [adjustments, setAdjustments]       = useState<AdjustmentEntry[]>([]);
  const [ledgerSummary, setLedgerSummary]   = useState<LedgerSummary | null>(null);
  const [recView, setRecView]               = useState<ReconciliationView | null>(null);
  const [loading, setLoading]               = useState(true);
  const [error, setError]                   = useState<string | null>(null);

  // ── UI state ─────────────────────────────────────────────────────────────────
  const [approveNotes, setApproveNotes]     = useState('');
  const [approving, setApproving]           = useState(false);
  const [approveError, setApproveError]     = useState<string | null>(null);
  const [approved, setApproved]             = useState(false);
  const [showTimeline, setShowTimeline]     = useState(true);

  // Claimed payment actions
  const [confirmingId, setConfirmingId]     = useState<string | null>(null);
  const [disputeTarget, setDisputeTarget]   = useState<OnNightPlayer | null>(null);
  const [disputeSubmitting, setDisputeSubmitting] = useState(false);

  const isApproved = approved || !!reconciliation?.approvedAt;

  // ── Fetch data ──────────────────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const recRes  = await fetch(`/api/elimination/rooms/${roomId}/reconciliation`);
      const recData = await recRes.json();
      if (recData.ok) {
        setReconciliation(recData.reconciliation);
        setAdjustments(recData.adjustments ?? []);
        if (recData.reconciliation?.approvedAt) setApproved(true);
      }

      const token = localStorage.getItem('auth_token');
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const [summaryRes, viewRes] = await Promise.all([
        fetch(`/api/quiz-reconciliation/room/${roomId}/payment-ledger/summary`, { headers }),
        fetch(`/api/quiz-reconciliation/room/${roomId}/payment-ledger/reconciliation-view`, { headers }),
      ]);

      if (summaryRes.ok) {
        const d = await summaryRes.json();
        if (d.ok) setLedgerSummary(d.summary);
      }
      if (viewRes.ok) {
        const d = await viewRes.json();
        if (d.ok) setRecView(d.view);
      }
    } catch (err: any) {
      setError('Could not load reconciliation data. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [roomId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── Socket: approval + payment confirmed ────────────────────────────────────
  useEffect(() => {
    if (!socket) return;

    const onApproved = (data: any) => {
      if (data.roomId === roomId && data.ok) {
        setApproved(true);
        // Re-fetch to populate reconciliation.approvedAt and lock the ledger
        fetchData();
      }
    };

    // When a payment is confirmed via the host dashboard, re-fetch so the
    // financial summary and pending count update automatically
    const onPaymentConfirmed = () => {
      fetchData();
    };

    socket.on('elimination_reconciliation_approved', onApproved);
    socket.on('payment_confirmed', onPaymentConfirmed);
    socket.on('elimination_payment_confirmed', onPaymentConfirmed);

    return () => {
      socket.off('elimination_reconciliation_approved', onApproved);
      socket.off('payment_confirmed', onPaymentConfirmed);
      socket.off('elimination_payment_confirmed', onPaymentConfirmed);
    };
  }, [socket, roomId, fetchData]);

  // ── Claimed payment actions ─────────────────────────────────────────────────
  const handleConfirmPayment = (player: OnNightPlayer) => {
    if (!socket) return;
    setConfirmingId(player.playerId);
    socket.emit(
      'confirm_player_payment',
      {
        roomId,
        playerId: player.playerId,
        confirmedBy: { id: hostId, role: 'host' },
        adminNotes: 'Confirmed during reconciliation',
      },
      (res: any) => {
        setConfirmingId(null);
        fetchData(); // re-fetch regardless — UI must reflect real DB state
      }
    );
    // Fallback if socket doesn't ack
    setTimeout(() => { setConfirmingId(null); fetchData(); }, 6000);
  };

  const handleDisputeSubmit = (reason: string) => {
    if (!socket || !disputeTarget) return;
    setDisputeSubmitting(true);
    socket.emit(
      'dispute_player_payment',
      { roomId, playerId: disputeTarget.playerId, disputeReason: reason },
      () => {
        setDisputeSubmitting(false);
        setDisputeTarget(null);
        fetchData();
      }
    );
    setTimeout(() => { setDisputeSubmitting(false); setDisputeTarget(null); fetchData(); }, 6000);
  };

  // ── Derived totals ──────────────────────────────────────────────────────────
  const startingTotal = reconciliation?.startingTotal ?? (ledgerSummary?.totals.total ?? 0);

  const adjustmentsNet = useMemo(() => {
    let moneyIn = 0, moneyOut = 0;
    for (const a of adjustments) {
      const amt = Number(a.amount || 0);
      switch (a.type) {
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

  const reconciledTotal = startingTotal + adjustmentsNet;
  const pendingClaimed  = recView?.onTheNight?.claimed?.length ?? 0;

  const step1Status = loading ? 'pending' : 'done' as const;
  const step2Status = isApproved ? 'done' : loading ? 'pending' : 'active' as const;
  const step3Status = isApproved ? 'done' : loading ? 'pending' : 'active' as const;
  const step4Status = isApproved ? 'active' : 'pending' as const;

  // ── Approve ─────────────────────────────────────────────────────────────────
  const handleApprove = async () => {
    if (pendingClaimed > 0) {
      setApproveError(`Resolve ${pendingClaimed} claimed payment${pendingClaimed !== 1 ? 's' : ''} before approving`);
      return;
    }
    setApproving(true);
    setApproveError(null);
    try {
      if (isLoggedIn) {
        const token = localStorage.getItem('auth_token') ?? '';
        const res   = await fetch(`/api/elimination/mgmt/rooms/${roomId}/approve-reconciliation`, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body:    JSON.stringify({ approvedBy: hostName, notes: approveNotes }),
        });
        const data = await res.json();
        if (!data.ok) throw new Error(data.error ?? 'Approval failed');
        setApproved(true);
        // Re-fetch so reconciliation.approvedAt is populated — this is what
        // locks the adjustments ledger. Without this the ledger stays editable
        // because approvedAt is still null in local state.
        await fetchData();
      } else {
        if (!socket) throw new Error('No socket connection');
        socket.emit('elimination_approve_reconciliation', {
          roomId, approvedBy: hostName, notes: approveNotes || null,
        });
        // setApproved triggered by socket event listener above
        // fetchData is called by the socket listener too (see onApproved below)
      }
    } catch (err: any) {
      setApproveError(err.message ?? 'Approval failed');
    } finally {
      setApproving(false);
    }
  };

  const timeline      = reconciliation?.finalLeaderboard?.timeline ?? [];
  const finalStandings = reconciliation?.finalLeaderboard?.finalStandings ?? [];
  const gameStats     = reconciliation?.finalLeaderboard;

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <>
      {disputeTarget && (
        <DisputeModal
          player={disputeTarget}
          currencySymbol={currencySymbol}
          onClose={() => setDisputeTarget(null)}
          onSubmit={handleDisputeSubmit}
          submitting={disputeSubmitting}
        />
      )}

      <div className="min-h-screen bg-gray-50 py-8 px-4">
        <div className="max-w-3xl mx-auto space-y-8">

          {/* Header */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-2">
              <Scale className="h-6 w-6 text-indigo-600" />
              <h1 className="text-2xl font-bold text-gray-900">Payment Reconciliation</h1>
            </div>
            <p className="text-gray-600 text-sm">
              The game has ended. Review payments, make any adjustments, then approve to finalise your records.
            </p>
            {gameStats && (
              <div className="mt-4 flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 border border-indigo-200 px-3 py-1 text-xs font-semibold text-indigo-700">
                  <Trophy className="h-3.5 w-3.5" /> Winner: {gameStats.winner?.name ?? '—'}
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 border border-gray-200 px-3 py-1 text-xs font-semibold text-gray-700">
                  <Users className="h-3.5 w-3.5" /> {gameStats.totalPlayers} players · {gameStats.totalAdmins} admins
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 border border-gray-200 px-3 py-1 text-xs font-semibold text-gray-700">
                  {gameStats.totalRounds} rounds
                </span>
              </div>
            )}
          </div>

          {loading && (
            <div className="flex items-center gap-2 text-sm text-gray-500 justify-center py-8">
              <RefreshCw className="h-4 w-4 animate-spin" /> Loading reconciliation data…
            </div>
          )}

          {error && !loading && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 flex items-center justify-between">
              <span className="text-sm text-red-800">{error}</span>
              <button onClick={fetchData} className="text-xs font-semibold text-red-700 underline ml-3">Retry</button>
            </div>
          )}

          {/* ── STEP 1: Financial Summary ────────────────────────────────────── */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <StepBadge n={1} status={step1Status} />
              <h2 className="text-xl font-bold text-gray-900">Financial Summary</h2>
            </div>

            <div className="flex items-start gap-2 justify-between">
              <InfoBox>
                Confirmed payments collected during the game. Claimed payments must be resolved before approving.
              </InfoBox>
              <button
                onClick={fetchData}
                disabled={loading}
                title="Refresh financial summary"
                className="shrink-0 rounded-lg border border-gray-200 bg-white p-2 text-gray-400 hover:bg-gray-50 hover:text-gray-600 disabled:opacity-40 transition-colors"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>

            {/* Quick tiles */}
            <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="rounded-lg bg-blue-50 border border-blue-200 p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Users className="h-4 w-4 text-blue-600" />
                  <div className="text-xs font-medium text-blue-700">Players</div>
                </div>
                <div className="text-2xl font-bold text-blue-900">
                  {gameStats?.totalPlayers ?? (room as any)?.players?.length ?? '—'}
                </div>
                <div className="text-xs text-blue-600 mt-1">{ledgerSummary?.paidPlayers ?? '—'} confirmed paid</div>
              </div>

              <div className="rounded-lg bg-purple-50 border border-purple-200 p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Users className="h-4 w-4 text-purple-600" />
                  <div className="text-xs font-medium text-purple-700">Admins</div>
                </div>
                <div className="text-2xl font-bold text-purple-900">{gameStats?.totalAdmins ?? '—'}</div>
              </div>

              <div className="rounded-lg bg-green-50 border border-green-200 p-4">
                <div className="flex items-center gap-2 mb-1">
                  <DollarSign className="h-4 w-4 text-green-600" />
                  <div className="text-xs font-medium text-green-700">Entry Fees</div>
                </div>
                <div className="text-2xl font-bold text-green-900">
                  {fmt(ledgerSummary?.totals.entryFees ?? 0, currencySymbol)}
                </div>
                <div className="text-xs text-green-600 mt-1">
                  {ledgerSummary?.paidPlayers ?? 0} × {fmt(entryFee, currencySymbol)}
                </div>
              </div>

              <div className="rounded-lg bg-indigo-50 border border-indigo-200 p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Scale className="h-4 w-4 text-indigo-600" />
                  <div className="text-xs font-medium text-indigo-700">Starting Total</div>
                </div>
                <div className="text-2xl font-bold text-indigo-900">{fmt(startingTotal, currencySymbol)}</div>
                <div className="text-xs text-indigo-600 mt-1">Before adjustments</div>
              </div>
            </div>

            {/* By method table */}
            {recView && recView.byMethod.length > 0 && (
              <div className="mt-6 rounded-xl border border-gray-200 overflow-hidden">
                <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
                  <div className="text-sm font-semibold text-gray-900">On the Night</div>
                  <div className="text-xs text-gray-500">
                    {fmt(recView.onTheNight.totalConfirmed, currencySymbol)} confirmed
                    {recView.onTheNight.totalClaimed > 0 && (
                      <span className="ml-2 text-amber-600">· {fmt(recView.onTheNight.totalClaimed, currencySymbol)} claimed</span>
                    )}
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-100">
                    <thead className="bg-gray-50">
                      <tr>
                        {['Method', 'Confirmed', 'Claimed', 'Disputed', 'Expected'].map((h) => (
                          <th key={h} className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase text-right first:text-left">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50 bg-white">
                      {recView.byMethod.map((m) => (
                        <tr key={m.method} className="hover:bg-gray-50">
                          <td className="px-4 py-2 text-sm font-medium text-gray-900">{getMethodLabel(m.method)}</td>
                          <td className="px-4 py-2 text-sm text-right text-green-700 font-medium">{fmt(m.confirmed, currencySymbol)}</td>
                          <td className="px-4 py-2 text-sm text-right text-amber-600">{m.claimed > 0 ? fmt(m.claimed, currencySymbol) : '—'}</td>
                          <td className="px-4 py-2 text-sm text-right text-red-600">{m.disputed > 0 ? fmt(m.disputed, currencySymbol) : '—'}</td>
                          <td className="px-4 py-2 text-sm text-right text-gray-400">{m.expected > 0 ? fmt(m.expected, currencySymbol) : '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* ── Claimed payments — inline confirm/dispute ── */}
                {recView.onTheNight.claimed.length > 0 && (
                  <div className="border-t border-amber-200 bg-amber-50 p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                      <p className="text-sm font-semibold text-amber-900">
                        {recView.onTheNight.claimed.length} claimed payment{recView.onTheNight.claimed.length !== 1 ? 's' : ''} need resolution
                      </p>
                    </div>
                    <div className="space-y-2">
                      {recView.onTheNight.claimed.map((player) => (
                        <div key={player.playerId}
                          className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 rounded-lg border border-amber-200 bg-white p-3">
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-gray-900">{player.playerName}</p>
                            <p className="text-xs text-gray-500 mt-0.5">
                              {fmt(player.amount, currencySymbol)} · {getMethodLabel(player.paymentMethod)}
                              {player.paymentReference && <span className="ml-1 font-mono text-amber-700"> Ref: {player.paymentReference}</span>}
                            </p>
                          </div>
                          <div className="flex gap-2 shrink-0">
                            <button
                              onClick={() => handleConfirmPayment(player)}
                              disabled={confirmingId === player.playerId}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-green-500/60 bg-green-50 px-3 py-1.5 text-xs font-semibold text-green-800 hover:bg-green-100 disabled:opacity-50 transition-colors">
                              {confirmingId === player.playerId
                                ? <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                                : <CheckCircle2 className="h-3.5 w-3.5" />}
                              Confirm
                            </button>
                            <button
                              onClick={() => setDisputeTarget(player)}
                              disabled={confirmingId === player.playerId}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-red-400/60 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-800 hover:bg-red-100 disabled:opacity-50 transition-colors">
                              <AlertTriangle className="h-3.5 w-3.5" /> Dispute
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── STEP 2: Adjustments ─────────────────────────────────────────── */}
          <div className={`bg-white rounded-xl border p-6 shadow-sm ${isApproved ? 'border-gray-200' : 'border-blue-200'}`}>
            <div className="flex items-center gap-3 mb-4">
              <StepBadge n={2} status={step2Status} />
              <h2 className="text-xl font-bold text-gray-900">Adjustments</h2>
              {isApproved && <Lock className="h-4 w-4 text-gray-400" />}
            </div>

            <InfoBox>
              Record any cash, refunds, fees, or other adjustments not captured above. Changes save when you click away from a field.
            </InfoBox>

            <div className="mt-4">
              <EliminationAdjustmentsLedger
                roomId={roomId}
                socket={socket}
                adjustments={adjustments}
                currency={currencySymbol}
                approvedAt={reconciliation?.approvedAt ?? null}
                createdBy={hostName}
                onAdjustmentsChange={setAdjustments}
              />
            </div>

            <div className="mt-4 rounded-lg bg-gradient-to-r from-indigo-500 to-purple-600 p-4 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium opacity-90">Reconciled Total</div>
                  <div className="text-3xl font-bold mt-1">{fmt(reconciledTotal, currencySymbol)}</div>
                  {adjustmentsNet !== 0 && (
                    <div className="text-xs opacity-75 mt-1">
                      {fmt(startingTotal, currencySymbol)} starting {adjustmentsNet >= 0 ? '+' : ''}{fmt(adjustmentsNet, currencySymbol)} adjustments
                    </div>
                  )}
                </div>
                <Scale className="h-12 w-12 opacity-30" />
              </div>
            </div>
          </div>

          {/* ── STEP 3: Review & Approve ─────────────────────────────────────── */}
          <div className={`bg-white rounded-xl border p-6 shadow-sm ${isApproved ? 'border-green-200' : 'border-indigo-200'}`}>
            <div className="flex items-center gap-3 mb-4">
              <StepBadge n={3} status={step3Status} />
              <h2 className="text-xl font-bold text-gray-900">Review & Approve</h2>
            </div>

            {/* Timeline */}
            {timeline.length > 0 && (
              <div className="mb-6">
                <button onClick={() => setShowTimeline((v) => !v)}
                  className="w-full flex items-center justify-between px-4 py-3 rounded-lg bg-gray-50 border border-gray-200 text-sm font-semibold text-gray-900 hover:bg-gray-100 transition-colors">
                  <span className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-indigo-500" /> Elimination Timeline
                  </span>
                  {showTimeline ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
                </button>
                {showTimeline && (
                  <div className="mt-2 space-y-1">
                    {timeline.map((entry, i) => (
                      <div key={i} className={`flex items-start gap-3 px-4 py-3 rounded-lg text-sm ${
                        entry.round === null ? 'bg-yellow-50 border border-yellow-200' : 'bg-gray-50 border border-gray-100'
                      }`}>
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                          entry.round === null ? 'bg-yellow-200 text-yellow-800' : 'bg-red-100 text-red-700'
                        }`}>
                          {entry.round === null ? '🏆' : `R${entry.round}`}
                        </div>
                        <div>
                          <div className="font-semibold text-gray-900">
                            {entry.round === null ? 'Winner!' : `Round ${entry.round}`}
                          </div>
                          <div className="text-gray-600 mt-0.5">
                            {entry.eliminated?.map((p) => p.name).join(', ')}
                            {entry.survived?.map((p) => p.name).join(', ')}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Final standings */}
            {finalStandings.length > 0 && (
              <div className="mb-6 rounded-lg border border-gray-200 overflow-hidden">
                <div className="px-4 py-2 bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase">
                  Final Standings
                </div>
                <div className="divide-y divide-gray-50 max-h-48 overflow-y-auto">
                  {finalStandings.slice(0, 10).map((p) => (
                    <div key={p.playerId} className="px-4 py-2.5 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-bold text-gray-400 w-5">#{p.rank}</span>
                        <span className="text-sm font-medium text-gray-900">{p.name}</span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-gray-500">
                        {p.eliminatedInRound && <span className="text-red-500">Out R{p.eliminatedInRound}</span>}
                        <span className="font-semibold text-gray-700">{p.cumulativeScore.toLocaleString()} pts</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {!isApproved ? (
              <div className="space-y-4">
                <InfoBox>Once approved, adjustments are locked and your records are saved.</InfoBox>

                {pendingClaimed > 0 && (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                    <p className="text-sm text-amber-800">
                      Resolve {pendingClaimed} claimed payment{pendingClaimed !== 1 ? 's' : ''} in the Financial Summary above before approving.
                    </p>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-1">Notes (optional)</label>
                  <textarea value={approveNotes} onChange={(e) => setApproveNotes(e.target.value)}
                    rows={2} placeholder="Any notes for your records…"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900" />
                </div>

                {approveError && (
                  <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">{approveError}</div>
                )}

                <button onClick={handleApprove} disabled={approving || pendingClaimed > 0}
                  className="w-full rounded-xl bg-indigo-600 py-3 text-sm font-bold text-white hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2">
                  {approving
                    ? <><RefreshCw className="h-4 w-4 animate-spin" /> Approving…</>
                    : <><CheckCircle2 className="h-4 w-4" /> Approve Reconciliation</>
                  }
                </button>
              </div>
            ) : (
              <div className="rounded-xl bg-green-50 border border-green-200 p-4 flex items-center gap-3">
                <CheckCircle2 className="h-6 w-6 text-green-600 shrink-0" />
                <div>
                  <p className="font-semibold text-green-900">Reconciliation approved</p>
                  <p className="text-sm text-green-700 mt-0.5">Final total: <strong>{fmt(reconciledTotal, currencySymbol)}</strong></p>
                </div>
              </div>
            )}
          </div>

          {/* ── STEP 4: Done ─────────────────────────────────────────────────── */}
          <div className={`bg-white rounded-xl border p-6 shadow-sm ${isApproved ? 'border-emerald-200' : 'border-gray-200 opacity-50'}`}>
            <div className="flex items-center gap-3 mb-4">
              <StepBadge n={4} status={step4Status} />
              <h2 className={`text-xl font-bold ${isApproved ? 'text-gray-900' : 'text-gray-400'}`}>Done</h2>
              {!isApproved && <Lock className="h-4 w-4 text-gray-400" />}
            </div>
            {isApproved ? (
              <div className="space-y-4">
                <InfoBox>Your records have been saved. The game room will close when you leave.</InfoBox>
                <button onClick={onComplete}
                  className="w-full rounded-xl bg-emerald-600 py-3 text-sm font-bold text-white hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2">
                  <CheckCircle2 className="h-4 w-4" /> Return to Dashboard
                </button>
              </div>
            ) : (
              <p className="text-sm text-gray-400">Complete the previous steps to finish.</p>
            )}
          </div>

        </div>
      </div>
    </>
  );
};