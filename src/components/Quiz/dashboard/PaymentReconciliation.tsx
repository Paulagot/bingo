// src/components/Quiz/dashboard/PaymentReconciliationPanel.tsx
import React, { useEffect, useState, useCallback } from 'react';

import { usePlayerStore } from '../hooks/usePlayerStore';
import { useQuizConfig } from '../hooks/useQuizConfig';
import { useQuizSocket } from '../sockets/QuizSocketProvider';
import { cleanupQuizRoom } from '../utils/cleanupQuizRoom';
import { useRoomIdentity } from '../hooks/useRoomIdentity';

import {
  Lock,
  TrendingUp,
  Users,
  DollarSign,
  Scale,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Info,
  RefreshCw,
  Ticket,
  ChevronDown,
  ChevronUp,
  UserCheck,
  X,
} from 'lucide-react';

import ReconciliationApproval from '../payments/ReconciliationApproval';
import ReconciliationDownloads from '../payments/ReconciliationDownloads';
import ReconciliationLedger from '../payments/ReconciliationLedger';

// ─────────────────────────────────────────────────────────────────────────────
// TYPES — mirrors backend getPaymentLedgerReconciliationView return shape
// ─────────────────────────────────────────────────────────────────────────────

interface TicketDetail {
  ticketId: string;
  playerName: string;
  purchaserName: string;
  paymentMethod: string;
  amount: number;
  redemptionStatus: string;
  confirmedAt: string | null;
  confirmedByName: string | null;
}

interface TicketByMethod {
  method: string;
  count: number;
  value: number;
}

interface TicketSection {
  total: number;
  totalValue: number;
  redeemed: number;
  redeemedValue: number;
  unredeemed: number;
  unredeemedValue: number;
  byMethod: TicketByMethod[];
  detail: TicketDetail[];
}

interface OnNightPlayer {
  playerId: string;
  playerName: string;
  paymentMethod: string;
  methodLabel: string | null;
  paymentReference: string | null;
  amount: number;
  status: string;
}

interface ConfirmedGroup {
  confirmedById: string;
  confirmedByName: string;
  confirmedByRole: string;
  totalAmount: number;
  players: OnNightPlayer[];
}

interface OnTheNight {
  confirmedGroups: ConfirmedGroup[];
  claimed: OnNightPlayer[];
  disputed: OnNightPlayer[];
  expected: OnNightPlayer[];
  totalConfirmed: number;
  totalClaimed: number;
  totalDisputed: number;
  totalExpected: number;
}

interface ByMethodRow {
  method: string;
  confirmed: number;
  expected: number;
  claimed: number;
  disputed: number;
  total: number;
}

interface SummaryLine {
  expected: number;
  confirmed: number;
  gap: number;
}

interface RecSummary {
  entryFees: SummaryLine;
  extras: SummaryLine;
  total: SummaryLine;
}

interface ReconciliationView {
  hasTickets: boolean;
  tickets: TicketSection;
  onTheNight: OnTheNight;
  byMethod: ByMethodRow[];
  summary: RecSummary;
  totalConfirmed: number;
  totalExpected: number;
  totalGap: number;
}

interface LedgerSummary {
  byMethod: Record<string, { entryFees: number; extras: number; extrasCount: number; total: number }>;
  totals: { entryFees: number; extras: number; extrasCount: number; total: number };
  paidPlayers: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function getMethodLabel(raw: string): string {
  const v = (raw || '').trim().toLowerCase();

  if (v === 'cash') return 'Cash';
  if (v === 'instant_payment') return 'Instant Payment';
  if (v === 'card' || v === 'card_tap') return 'Card';
  if (v === 'web3') return 'Web3';
  if (v === 'crypto') return 'Crypto';
  if (v === 'pay_admin' || v === 'pay_host') return 'Pay Host';
  if (v === 'stripe') return 'Stripe';
  if (!raw) return 'Unknown';

  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

function getRoleLabel(role: string) {
  if (role === 'system') return 'Auto';
  if (role === 'host') return 'Host';
  if (role === 'admin') return 'Admin';
  return role || 'Staff';
}

function InfoBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 flex items-start gap-2">
      <Info className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
      <div className="text-sm text-blue-900">{children}</div>
    </div>
  );
}

function StepHeader({
  stepNum,
  title,
  status,
  isLocked,
}: {
  stepNum: number;
  title: string;
  status: 'pending' | 'in-progress' | 'complete';
  isLocked?: boolean;
}) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <div
        className={`flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm ${
          status === 'complete'
            ? 'bg-green-100 text-green-700'
            : status === 'in-progress'
              ? 'bg-blue-100 text-blue-700'
              : 'bg-gray-100 text-gray-400'
        }`}
      >
        {status === 'complete' ? <CheckCircle2 className="h-5 w-5" /> : stepNum}
      </div>

      <h2 className={`text-xl font-bold ${isLocked ? 'text-gray-400' : 'text-gray-900'}`}>
        {title}
      </h2>

      {isLocked && <Lock className="h-4 w-4 text-gray-400" />}
    </div>
  );
}

function SectionHeader({
  icon,
  title,
  subtitle,
  badge,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  badge?: React.ReactNode;
}) {
  return (
    <div className="px-5 py-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="text-gray-500">{icon}</div>

        <div>
          <div className="font-semibold text-gray-900 text-sm flex items-center gap-2">
            {title}
            {badge}
          </div>

          {subtitle && <div className="text-xs text-gray-500 mt-0.5">{subtitle}</div>}
        </div>
      </div>
    </div>
  );
}

function CollapsibleGroup({
  header,
  children,
  defaultOpen = false,
}: {
  header: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="border-b border-gray-100 last:border-0">
      <button
        type="button"
        className="w-full px-5 py-3.5 flex items-center justify-between hover:bg-gray-50 transition-colors text-left"
        onClick={() => setOpen((o) => !o)}
      >
        {header}

        {open ? (
          <ChevronUp className="h-4 w-4 text-gray-400 shrink-0" />
        ) : (
          <ChevronDown className="h-4 w-4 text-gray-400 shrink-0" />
        )}
      </button>

      {open && <div className="border-t border-gray-100 bg-gray-50">{children}</div>}
    </div>
  );
}

function PlayerRow({ player, currency }: { player: OnNightPlayer; currency: string }) {
  return (
    <div className="px-8 py-2.5 flex items-center justify-between gap-4 hover:bg-white transition-colors">
      <div className="flex-1 min-w-0">
        <span className="text-sm text-gray-900 font-medium">{player.playerName}</span>

        <span className="text-xs text-gray-400 ml-2">
          {player.methodLabel || getMethodLabel(player.paymentMethod)}
          {player.paymentReference && ` · Ref: ${player.paymentReference}`}
        </span>
      </div>

      <span className="text-sm font-semibold text-gray-900 shrink-0">
        {currency}
        {Number(player.amount || 0).toFixed(2)}
      </span>
    </div>
  );
}

function DisputePaymentModal({
  open,
  playerName,
  paymentReference,
  amountLabel,
  reason,
  setReason,
  submitting,
  onClose,
  onSubmit,
}: {
  open: boolean;
  playerName: string;
  paymentReference?: string | null;
  amountLabel: string;
  reason: string;
  setReason: (value: string) => void;
  submitting: boolean;
  onClose: () => void;
  onSubmit: () => void;
}) {
  if (!open) return null;

  const trimmedReason = reason.trim();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50 px-4">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-gray-200 overflow-hidden">
        <div className="flex items-start justify-between gap-4 border-b border-gray-100 px-5 py-4">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Mark payment as disputed</h2>
            <p className="mt-1 text-sm text-gray-600">
              Add a short note so the host/admin team knows why this payment was not confirmed.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded-full p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 disabled:opacity-50"
            aria-label="Close dispute modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-4">
          <div className="rounded-xl border border-red-100 bg-red-50 p-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-red-700">
              Payment being disputed
            </div>

            <div className="mt-2 flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="font-semibold text-red-950">{playerName}</div>

                {paymentReference && (
                  <div className="mt-0.5 text-xs text-red-700">Ref: {paymentReference}</div>
                )}
              </div>

              <div className="shrink-0 text-sm font-bold text-red-900">{amountLabel}</div>
            </div>
          </div>

          <div>
            <label htmlFor="dispute-reason" className="block text-sm font-semibold text-gray-900">
              Reason for dispute
            </label>

            <textarea
              id="dispute-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={4}
              maxLength={300}
              placeholder="Example: payment reference not found, amount does not match, payer sent to wrong account..."
              className="mt-2 w-full rounded-xl border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100"
              autoFocus
            />

            <div className="mt-2 flex items-center justify-between gap-3">
              <p className="text-xs text-gray-500">
                This note will be saved against the disputed payment.
              </p>

              <span className="text-xs text-gray-400">{reason.length}/300</span>
            </div>
          </div>

          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-700 mt-0.5 shrink-0" />

              <p className="text-xs text-amber-900">
                Disputed payments are excluded from confirmed totals and will continue to appear
                in the reconciliation record.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 border-t border-gray-100 bg-gray-50 px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="inline-flex justify-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={onSubmit}
            disabled={submitting || trimmedReason.length === 0}
            className="inline-flex justify-center rounded-lg border border-red-700 bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? 'Saving dispute...' : 'Mark as disputed'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

const PaymentReconciliationPanel: React.FC = () => {
  const { players } = usePlayerStore();
  const { config, currentPhase } = useQuizConfig();
  const { socket } = useQuizSocket();
  const { roomId } = useRoomIdentity();

  const [ledgerSummary, setLedgerSummary] = useState<LedgerSummary | null>(null);
  const [recView, setRecView] = useState<ReconciliationView | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [disputeModalOpen, setDisputeModalOpen] = useState(false);
  const [disputePlayer, setDisputePlayer] = useState<any | null>(null);
  const [disputeReason, setDisputeReason] = useState('');
  const [disputeSubmitting, setDisputeSubmitting] = useState(false);

  const isComplete = currentPhase === 'complete' || currentPhase === 'reconciling';
  const currency = config?.currencySymbol || '€';
  const isDonation = config?.fundraisingMode === 'donation';
  const isLocked = !isComplete;
  const approvedAt = (config?.reconciliation as any)?.approvedAt;
  const isApproved = !!approvedAt;

  // Socket-state players (for pending resolution in Step 2)
  const activePlayers = players.filter((p: any) => !p.disqualified);
  const paidPlayers = activePlayers.filter((p: any) => p.paid);
  const unpaidPlayers = activePlayers.filter((p: any) => !p.paid);
  const pendingInstantPlayers = activePlayers.filter(
    (p: any) => !p.paid && !!p.paymentClaimed && !p.paymentDisputed,
  );
  const disputedPlayers = activePlayers.filter((p: any) => !p.paid && !!p.paymentDisputed);
  const expectedUnpaidPlayers = activePlayers.filter(
    (p: any) => !p.paid && !p.paymentClaimed && !p.paymentDisputed,
  );
  const hasBlockingPendingPayments = pendingInstantPlayers.length > 0;

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    if (!roomId) return;

    setLoading(true);
    setError(null);

    const token = localStorage.getItem('auth_token');
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };

    if (token) headers.Authorization = `Bearer ${token}`;

    console.log('[Reconciliation] Fetching for room:', roomId, '| has token:', !!token);

    try {
      const [summaryRes, viewRes] = await Promise.all([
        fetch(`/api/quiz-reconciliation/room/${roomId}/payment-ledger/summary`, { headers }),
        fetch(`/api/quiz-reconciliation/room/${roomId}/payment-ledger/reconciliation-view`, {
          headers,
        }),
      ]);

      const summaryData = await summaryRes.json();
      const viewData = await viewRes.json();

      console.log('[Reconciliation] summary:', summaryData);
      console.log('[Reconciliation] view:', viewData);

      if (summaryData.ok) setLedgerSummary(summaryData.summary);

      if (viewData.ok) {
        console.log('[Reconciliation] onTheNight:', viewData.view?.onTheNight);
        console.log('[Reconciliation] tickets.detail:', viewData.view?.tickets?.detail);
        console.log('[Reconciliation] byMethod:', viewData.view?.byMethod);

        setRecView(viewData.view);
      } else {
        setError(viewData.error || 'Failed to load reconciliation data');
      }
    } catch (err) {
      console.error('[Reconciliation] fetch error:', err);
      setError('Network error loading reconciliation data');
    } finally {
      setLoading(false);
    }
  }, [roomId]);

  useEffect(() => {
    if (!roomId) return;
    fetchData();
  }, [roomId, fetchData]);

  // ── Derived totals from DB ──────────────────────────────────────────────────
  const entryFee = parseFloat(config?.entryFee || '0');

  const totalEntryReceived = ledgerSummary
    ? isDonation
      ? 0
      : ledgerSummary.totals.entryFees
    : isDonation
      ? 0
      : paidPlayers.length * entryFee;

  const totalDonationReceived =
    ledgerSummary && isDonation
      ? ledgerSummary.totals.entryFees
      : paidPlayers.reduce((s: number, p: any) => s + Number(p.donationAmount || 0), 0);

  const totalExtrasReceived = ledgerSummary ? (isDonation ? 0 : ledgerSummary.totals.extras) : 0;
  const totalExtrasCount = ledgerSummary?.totals.extrasCount ?? 0;
  const startingReceived = isDonation ? totalDonationReceived : totalEntryReceived + totalExtrasReceived;
  const confirmedPaidCount = ledgerSummary?.paidPlayers ?? paidPlayers.length;

  // ── Manual adjustment ledger ───────────────────────────────────────────────
  const rec = (config?.reconciliation as any) || {};
  const ledger = (rec.ledger as any[]) || [];

  const adjReceived = ledger.reduce(
    (a, l) => (l.type === 'received' ? a + Number(l.amount) : a),
    0,
  );
  const adjRefund = ledger.reduce(
    (a, l) => (l.type === 'refund' ? a + Number(l.amount) : a),
    0,
  );
  const adjFees = ledger.reduce((a, l) => (l.type === 'fee' ? a + Number(l.amount) : a), 0);
  const adjPrize = ledger.reduce(
    (a, l) => (l.type === 'prize_payout' ? a + Number(l.amount) : a),
    0,
  );
  const adjCashOver = ledger.reduce(
    (a, l) =>
      l.type === 'cash_over_short' && l.reasonCode === 'cash_over'
        ? a + Number(l.amount)
        : a,
    0,
  );
  const adjCashShort = ledger.reduce(
    (a, l) =>
      l.type === 'cash_over_short' && l.reasonCode === 'cash_short'
        ? a + Number(l.amount)
        : a,
    0,
  );

  const netAdjustments =
    adjReceived + adjCashOver - (adjRefund + adjFees + adjPrize + adjCashShort);

  const reconciledTotal = startingReceived + netAdjustments;

  // ── Socket actions ─────────────────────────────────────────────────────────
  const handleConfirmPayment = (playerId: string) => {
    if (!socket || !roomId) return;

    socket.emit(
      'confirm_player_payment',
      { roomId, playerId, adminNotes: 'Confirmed during reconciliation' },
      (r: any) => {
        if (!r?.ok) {
          setError(r?.error || 'Failed to confirm payment');
          return;
        }

        fetchData();
      },
    );
  };

  const openDisputeModal = (player: any) => {
    setError(null);
    setDisputePlayer(player);
    setDisputeReason('');
    setDisputeModalOpen(true);
  };

  const closeDisputeModal = () => {
    if (disputeSubmitting) return;

    setDisputeModalOpen(false);
    setDisputePlayer(null);
    setDisputeReason('');
  };

  const submitDisputePayment = () => {
    if (!socket || !roomId || !disputePlayer) return;

    const reason = disputeReason.trim();

    if (!reason) {
      setError('Please enter a reason before marking this payment as disputed.');
      return;
    }

    setDisputeSubmitting(true);
    setError(null);

    socket.emit(
      'dispute_player_payment',
      {
        roomId,
        playerId: disputePlayer.id,
        disputeReason: reason,
      },
      (r: any) => {
        setDisputeSubmitting(false);

        if (!r?.ok) {
          setError(r?.error || 'Failed to mark payment as disputed');
          return;
        }

        setDisputeModalOpen(false);
        setDisputePlayer(null);
        setDisputeReason('');

        fetchData();
      },
    );
  };

  const getPlayerTotal = (player: any) => {
    if (isDonation) return Number(player?.donationAmount || 0);

    return (
      entryFee +
      (player.extras || []).reduce(
        (s: number, k: string) => s + Number(config?.fundraisingPrices?.[k] || 0),
        0,
      )
    );
  };

  // ── Auto-cleanup timer ─────────────────────────────────────────────────────
  const endedAt: string | null = (config as any)?.endedAt ?? null;
  const [timeUntilCleanup, setTimeUntilCleanup] = useState<number | null>(null);

  useEffect(() => {
    if (isLocked || !socket || !endedAt || !roomId) return;

    const cleanupTime = new Date(endedAt).getTime() + 30 * 60 * 1000;

    const tick = async () => {
      const remaining = cleanupTime - Date.now();

      if (remaining <= 0) {
        await cleanupQuizRoom({ roomId, isWeb3Game: false, disconnectWallets: false });
        socket.emit('end_quiz_cleanup', { roomId: config?.roomId || roomId });
      } else {
        setTimeUntilCleanup(Math.floor(remaining / 1000 / 60));
      }
    };

    tick();

    const int = setInterval(tick, 60000);

    return () => clearInterval(int);
  }, [isLocked, socket, endedAt, config?.roomId, roomId]);

  const fmt = (n: number) => `${currency}${Number(n || 0).toFixed(2)}`;

  const step1Status = isLocked ? 'pending' : 'complete';
  const step2Status = isLocked ? 'pending' : 'in-progress';
  const step3Status = isLocked ? 'pending' : isApproved ? 'complete' : 'in-progress';
  const step4Status = isLocked ? 'pending' : isApproved ? 'in-progress' : 'pending';

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div className="bg-gray-50 rounded-xl p-6 md:p-8 shadow-md space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Payment Reconciliation</h1>
        <p className="text-gray-600">
          Review financials, resolve claimed payments, make adjustments, and finalize your records.
        </p>
      </div>

      {/* Auto-cleanup warning */}
      {!isLocked && timeUntilCleanup !== null && timeUntilCleanup <= 60 && !isApproved && (
        <div className="rounded-lg border-2 border-orange-300 bg-orange-50 p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-orange-600 mt-0.5" />

            <div>
              <h3 className="font-bold text-orange-900 mb-1">Auto-Cleanup Warning</h3>
              <p className="text-sm text-orange-800">
                This quiz will automatically clean up in{' '}
                <strong>{timeUntilCleanup} minutes</strong>.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Quiz in progress */}
      {!isComplete && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-4">
          <div className="flex items-start gap-3">
            <Clock className="h-5 w-5 text-amber-600 mt-0.5" />

            <div>
              <strong className="text-amber-900">Quiz in Progress</strong>
              <p className="text-sm text-amber-800 mt-1">
                Reconciliation unlocks when the quiz ends.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── STEP 1: Financial Summary ──────────────────────────────────────── */}
      <div className="bg-white rounded-xl border-2 border-gray-200 p-6">
        <StepHeader
          stepNum={1}
          title="Review Financial Summary"
          status={step1Status}
          isLocked={isLocked}
        />

        <InfoBox>
          Review all confirmed money collected during your quiz. Claimed, disputed, and expected
          payments are not included in received totals.
        </InfoBox>

        {/* Loading / error */}
        {loading && (
          <div className="mt-4 flex items-center gap-2 text-sm text-gray-500">
            <RefreshCw className="h-4 w-4 animate-spin" /> Loading financial data…
          </div>
        )}

        {error && !loading && (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 flex items-center justify-between">
            <span className="text-sm text-red-800">{error}</span>

            <button
              type="button"
              onClick={fetchData}
              className="text-xs font-semibold text-red-700 underline ml-3"
            >
              Retry
            </button>
          </div>
        )}

        {/* Quick tiles */}
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="rounded-lg bg-blue-50 border border-blue-200 p-4">
            <div className="flex items-center gap-2 mb-1">
              <Users className="h-4 w-4 text-blue-600" />
              <div className="text-xs font-medium text-blue-700">Players</div>
            </div>

            <div className="text-2xl font-bold text-blue-900">{activePlayers.length}</div>

            <div className="text-xs text-blue-600 mt-1">
              {confirmedPaidCount} paid • {unpaidPlayers.length} unpaid
            </div>
          </div>

          <div className="rounded-lg bg-green-50 border border-green-200 p-4">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className="h-4 w-4 text-green-600" />
              <div className="text-xs font-medium text-green-700">
                {isDonation ? 'Donations' : 'Entry Fees'}
              </div>
            </div>

            <div className="text-2xl font-bold text-green-900">
              {fmt(isDonation ? totalDonationReceived : totalEntryReceived)}
            </div>

            <div className="text-xs text-green-600 mt-1">
              {isDonation
                ? `${confirmedPaidCount} donations`
                : `${confirmedPaidCount} × ${fmt(entryFee)}`}
            </div>
          </div>

          <div className="rounded-lg bg-purple-50 border border-purple-200 p-4">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="h-4 w-4 text-purple-600" />
              <div className="text-xs font-medium text-purple-700">Extras</div>
            </div>

            <div className="text-2xl font-bold text-purple-900">
              {isDonation ? fmt(0) : fmt(totalExtrasReceived)}
            </div>

            <div className="text-xs text-purple-600 mt-1">
              {isDonation ? 'Included' : `${totalExtrasCount} transactions`}
            </div>
          </div>

          <div className="rounded-lg bg-indigo-50 border border-indigo-200 p-4">
            <div className="flex items-center gap-2 mb-1">
              <Scale className="h-4 w-4 text-indigo-600" />
              <div className="text-xs font-medium text-indigo-700">Starting Total</div>
            </div>

            <div className="text-2xl font-bold text-indigo-900">{fmt(startingReceived)}</div>

            <div className="text-xs text-indigo-600 mt-1">Before adjustments</div>
          </div>
        </div>

        {/* ══ SECTION A: TICKET SALES ══════════════════════════════════════════ */}
        {recView?.hasTickets && (recView.tickets.detail?.length ?? 0) > 0 && (
          <div className="mt-6 rounded-xl border border-gray-200 overflow-hidden">
            <SectionHeader
              icon={<Ticket className="h-4 w-4" />}
              title="Pre-sold Ticket Sales"
              subtitle="All confirmed before the quiz — redeemed means the player turned up"
              badge={
                <span className="ml-2 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                  {recView.tickets.total} ticket{recView.tickets.total !== 1 ? 's' : ''} ·{' '}
                  {fmt(recView.tickets.totalValue)}
                </span>
              }
            />

            {/* Ticket summary bar */}
            <div className="px-5 py-3 bg-white grid grid-cols-3 gap-3 border-b border-gray-100">
              <div className="text-center">
                <div className="text-lg font-bold text-gray-900">{recView.tickets.total}</div>
                <div className="text-xs text-gray-500">Total sold</div>
              </div>

              <div className="text-center">
                <div className="text-lg font-bold text-green-700">
                  {recView.tickets.redeemed}
                </div>
                <div className="text-xs text-gray-500">
                  Redeemed · {fmt(recView.tickets.redeemedValue)}
                </div>
              </div>

              <div className="text-center">
                <div className="text-lg font-bold text-amber-600">
                  {recView.tickets.unredeemed}
                </div>
                <div className="text-xs text-gray-500">
                  No-show · {fmt(recView.tickets.unredeemedValue)}
                </div>
              </div>
            </div>

            {/* Individual tickets */}
            <div className="divide-y divide-gray-50">
              {(recView.tickets.detail ?? []).map((t) => (
                <div
                  key={t.ticketId}
                  className="px-5 py-3 flex items-center justify-between gap-4 hover:bg-gray-50"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-900">{t.playerName}</span>

                      {t.playerName !== t.purchaserName && (
                        <span className="text-xs text-gray-400">
                          bought by {t.purchaserName}
                        </span>
                      )}
                    </div>

                    <div className="text-xs text-gray-400 mt-0.5">
                      {getMethodLabel(t.paymentMethod)}
                      {t.confirmedByName && ` · confirmed by ${t.confirmedByName}`}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                        t.redemptionStatus === 'redeemed'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-amber-100 text-amber-700'
                      }`}
                    >
                      {t.redemptionStatus === 'redeemed' ? '✓ Redeemed' : '✗ No-show'}
                    </span>

                    <span className="text-sm font-semibold text-gray-900">{fmt(t.amount)}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Ticket totals footer */}
            <div className="px-5 py-3 bg-gray-50 flex justify-between border-t border-gray-200">
              <span className="text-sm font-semibold text-gray-700">Total ticket revenue</span>
              <span className="text-sm font-bold text-gray-900">
                {fmt(recView.tickets.totalValue)}
              </span>
            </div>
          </div>
        )}

        {/* ══ SECTION B: ON THE NIGHT ══════════════════════════════════════════ */}
        {recView?.onTheNight && (
          <div className="mt-6 rounded-xl border border-gray-200 overflow-hidden">
            <SectionHeader
              icon={<UserCheck className="h-4 w-4" />}
              title="On the Night"
              subtitle="Walk-in payments — grouped by who collected and confirmed"
              badge={
                <span className="ml-2 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                  {fmt(recView.onTheNight.totalConfirmed)} confirmed
                  {recView.onTheNight.totalClaimed +
                    recView.onTheNight.totalDisputed +
                    recView.onTheNight.totalExpected >
                    0 &&
                    ` · ${fmt(
                      recView.onTheNight.totalClaimed +
                        recView.onTheNight.totalDisputed +
                        recView.onTheNight.totalExpected,
                    )} outstanding`}
                </span>
              }
            />

            {/* Confirmed groups — one per person who confirmed */}
            {recView.onTheNight.confirmedGroups.map((group) => (
              <CollapsibleGroup
                key={group.confirmedById}
                defaultOpen={recView.onTheNight.confirmedGroups.length <= 3}
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
                        {getRoleLabel(group.confirmedByRole)} · {group.players.length} player
                        {group.players.length !== 1 ? 's' : ''}
                      </div>
                    </div>

                    <div className="ml-auto mr-4 text-sm font-semibold text-green-700">
                      {fmt(group.totalAmount)}
                    </div>
                  </div>
                }
              >
                <div className="divide-y divide-gray-100">
                  {group.players.map((p) => (
                    <PlayerRow
                      key={p.playerId + p.paymentMethod}
                      player={p}
                      currency={currency}
                    />
                  ))}

                  <div className="px-8 py-2 flex justify-between bg-white">
                    <span className="text-xs font-semibold text-gray-500 uppercase">
                      Subtotal
                    </span>

                    <span className="text-sm font-bold text-green-700">
                      {fmt(group.totalAmount)}
                    </span>
                  </div>
                </div>
              </CollapsibleGroup>
            ))}

            {/* Claimed group */}
            {recView.onTheNight.claimed.length > 0 && (
              <CollapsibleGroup
                defaultOpen
                header={
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                      <AlertTriangle className="h-4 w-4 text-amber-600" />
                    </div>

                    <div>
                      <div className="text-sm font-semibold text-amber-900">
                        Claimed — awaiting confirmation
                      </div>

                      <div className="text-xs text-amber-700">
                        {recView.onTheNight.claimed.length} player
                        {recView.onTheNight.claimed.length !== 1 ? 's' : ''} · blocks approval
                      </div>
                    </div>

                    <div className="ml-auto mr-4 text-sm font-semibold text-amber-700">
                      {fmt(recView.onTheNight.totalClaimed)}
                    </div>
                  </div>
                }
              >
                <div className="divide-y divide-gray-100">
                  {recView.onTheNight.claimed.map((p) => (
                    <PlayerRow
                      key={p.playerId + p.paymentMethod}
                      player={p}
                      currency={currency}
                    />
                  ))}
                </div>
              </CollapsibleGroup>
            )}

            {/* Disputed group */}
            {recView.onTheNight.disputed.length > 0 && (
              <CollapsibleGroup
                defaultOpen
                header={
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                      <AlertTriangle className="h-4 w-4 text-red-600" />
                    </div>

                    <div>
                      <div className="text-sm font-semibold text-red-900">Disputed</div>

                      <div className="text-xs text-red-700">
                        {recView.onTheNight.disputed.length} player
                        {recView.onTheNight.disputed.length !== 1 ? 's' : ''} · excluded from
                        totals
                      </div>
                    </div>

                    <div className="ml-auto mr-4 text-sm font-semibold text-red-700">
                      {fmt(recView.onTheNight.totalDisputed)}
                    </div>
                  </div>
                }
              >
                <div className="divide-y divide-gray-100">
                  {recView.onTheNight.disputed.map((p) => (
                    <PlayerRow
                      key={p.playerId + p.paymentMethod}
                      player={p}
                      currency={currency}
                    />
                  ))}
                </div>
              </CollapsibleGroup>
            )}

            {/* Expected group */}
            {recView.onTheNight.expected.length > 0 && (
              <CollapsibleGroup
                header={
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
                      <Clock className="h-4 w-4 text-gray-500" />
                    </div>

                    <div>
                      <div className="text-sm font-semibold text-gray-700">
                        Expected / Pay Later
                      </div>

                      <div className="text-xs text-gray-500">
                        {recView.onTheNight.expected.length} player
                        {recView.onTheNight.expected.length !== 1 ? 's' : ''} · excluded from
                        totals
                      </div>
                    </div>

                    <div className="ml-auto mr-4 text-sm font-semibold text-gray-500">
                      {fmt(recView.onTheNight.totalExpected)}
                    </div>
                  </div>
                }
              >
                <div className="divide-y divide-gray-100">
                  {recView.onTheNight.expected.map((p) => (
                    <PlayerRow
                      key={p.playerId + p.paymentMethod}
                      player={p}
                      currency={currency}
                    />
                  ))}
                </div>
              </CollapsibleGroup>
            )}

            {/* On the night total footer */}
            <div className="px-5 py-3 bg-gray-50 flex justify-between border-t border-gray-200">
              <span className="text-sm font-semibold text-gray-700">
                Total confirmed on the night
              </span>

              <span className="text-sm font-bold text-gray-900">
                {fmt(recView.onTheNight.totalConfirmed)}
              </span>
            </div>
          </div>
        )}

        {/* ══ SECTION C: METHOD BREAKDOWN ══════════════════════════════════════ */}
        {recView && recView.byMethod.length > 0 && (
          <div className="mt-6">
            <h3 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wider">
              Breakdown by Payment Method
            </h3>

            <div className="overflow-x-auto rounded-lg border border-gray-200">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    {['Method', 'Confirmed', 'Claimed', 'Disputed', 'Expected', 'Total', '% Confirmed'].map(
                      (h) => (
                        <th
                          key={h}
                          className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase text-right first:text-left"
                        >
                          {h}
                        </th>
                      ),
                    )}
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-100 bg-white">
                  {recView.byMethod.map((m) => {
                    const pct = m.total > 0 ? Math.round((m.confirmed / m.total) * 100) : 0;

                    return (
                      <tr key={m.method} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">
                          {getMethodLabel(m.method)}
                        </td>

                        <td className="px-4 py-3 text-sm text-right text-green-700 font-medium">
                          {fmt(m.confirmed)}
                        </td>

                        <td className="px-4 py-3 text-sm text-right text-amber-600">
                          {m.claimed > 0 ? fmt(m.claimed) : '—'}
                        </td>

                        <td className="px-4 py-3 text-sm text-right text-red-600">
                          {m.disputed > 0 ? fmt(m.disputed) : '—'}
                        </td>

                        <td className="px-4 py-3 text-sm text-right text-gray-400">
                          {m.expected > 0 ? fmt(m.expected) : '—'}
                        </td>

                        <td className="px-4 py-3 text-sm text-right font-semibold text-gray-900">
                          {fmt(m.total)}
                        </td>

                        <td className="px-4 py-3 text-right">
                          <span
                            className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                              pct === 100
                                ? 'bg-green-100 text-green-700'
                                : pct >= 75
                                  ? 'bg-amber-100 text-amber-700'
                                  : 'bg-red-100 text-red-700'
                            }`}
                          >
                            {pct}%
                          </span>
                        </td>
                      </tr>
                    );
                  })}

                  {/* Totals row */}
                  {(() => {
                    const totConf = recView.byMethod.reduce((s, m) => s + m.confirmed, 0);
                    const totClaim = recView.byMethod.reduce((s, m) => s + m.claimed, 0);
                    const totDisp = recView.byMethod.reduce((s, m) => s + m.disputed, 0);
                    const totExp = recView.byMethod.reduce((s, m) => s + m.expected, 0);
                    const totAll = recView.byMethod.reduce((s, m) => s + m.total, 0);
                    const totPct = totAll > 0 ? Math.round((totConf / totAll) * 100) : 0;

                    return (
                      <tr className="bg-gray-50 font-semibold border-t-2 border-gray-300">
                        <td className="px-4 py-3 text-sm text-gray-900">Total</td>

                        <td className="px-4 py-3 text-sm text-right text-green-700">
                          {fmt(totConf)}
                        </td>

                        <td className="px-4 py-3 text-sm text-right text-amber-600">
                          {totClaim > 0 ? fmt(totClaim) : '—'}
                        </td>

                        <td className="px-4 py-3 text-sm text-right text-red-600">
                          {totDisp > 0 ? fmt(totDisp) : '—'}
                        </td>

                        <td className="px-4 py-3 text-sm text-right text-gray-400">
                          {totExp > 0 ? fmt(totExp) : '—'}
                        </td>

                        <td className="px-4 py-3 text-sm text-right text-gray-900">
                          {fmt(totAll)}
                        </td>

                        <td className="px-4 py-3 text-right">
                          <span
                            className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                              totPct === 100
                                ? 'bg-green-100 text-green-700'
                                : totPct >= 75
                                  ? 'bg-amber-100 text-amber-700'
                                  : 'bg-red-100 text-red-700'
                            }`}
                          >
                            {totPct}%
                          </span>
                        </td>
                      </tr>
                    );
                  })()}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Unpaid notice */}
        {unpaidPlayers.length > 0 && (
          <div className="mt-4 rounded-lg bg-gray-50 border border-gray-200 p-4">
            <div className="flex items-start gap-2">
              <Info className="h-4 w-4 text-gray-600 mt-0.5" />

              <div className="flex-1">
                <div className="text-sm font-semibold text-gray-800 mb-1">
                  {unpaidPlayers.length} unpaid / unresolved player
                  {unpaidPlayers.length !== 1 ? 's' : ''}
                </div>

                <p className="text-xs text-gray-600">
                  Only confirmed payments are included in received totals.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── STEP 2: Resolve Payments & Adjustments ──────────────────────── */}
      <div
        className={`bg-white rounded-xl border-2 p-6 relative ${
          isLocked ? 'border-gray-200' : 'border-blue-200'
        }`}
      >
        {isLocked && (
          <div className="absolute inset-0 bg-white/80 rounded-xl z-10 flex items-center justify-center backdrop-blur-sm">
            <div className="flex items-center gap-2 rounded-lg bg-gray-100 border border-gray-300 px-4 py-2 shadow-lg">
              <Lock className="h-4 w-4 text-gray-600" />
              <span className="text-sm font-medium text-gray-700">
                Complete quiz and prizes first
              </span>
            </div>
          </div>
        )}

        <div className={isLocked ? 'opacity-40' : ''}>
          <StepHeader
            stepNum={2}
            title="Resolve Payments & Make Adjustments"
            status={step2Status}
            isLocked={isLocked}
          />

          <InfoBox>
            Confirm instant payments that arrived, mark unverifiable payments as disputed, and
            record any manual adjustments.
          </InfoBox>

          {/* Pending instant payments */}
          {pendingInstantPlayers.length > 0 && (
            <div className="mt-4 rounded-xl border-2 border-amber-300 bg-amber-50 p-5">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-700 mt-0.5 flex-shrink-0" />

                <div className="flex-1">
                  <h3 className="text-base font-bold text-amber-950">
                    Resolve claimed instant payments before approval
                  </h3>

                  <div className="mt-4 space-y-2">
                    {pendingInstantPlayers.map((p: any) => (
                      <div
                        key={p.id}
                        className="rounded-lg border border-amber-200 bg-white p-3 flex flex-col md:flex-row md:items-center md:justify-between gap-3"
                      >
                        <div>
                          <div className="font-semibold text-gray-900">{p.name || p.id}</div>

                          <div className="text-xs text-gray-600 mt-0.5">
                            {fmt(getPlayerTotal(p))}
                            {p.paymentMethod ? ` · ${getMethodLabel(p.paymentMethod)}` : ''}
                            {p.paymentReference ? ` · Ref: ${p.paymentReference}` : ''}
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => handleConfirmPayment(p.id)}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-green-300 bg-green-50 px-3 py-1.5 text-xs font-semibold text-green-800 hover:bg-green-100"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" /> Confirm
                          </button>

                          <button
                            type="button"
                            onClick={() => openDisputeModal(p)}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-red-300 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-800 hover:bg-red-100"
                          >
                            <AlertTriangle className="h-3.5 w-3.5" /> Mark disputed
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Disputed from socket */}
          {disputedPlayers.length > 0 && (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-red-700 mt-0.5 flex-shrink-0" />

                <div>
                  <h3 className="text-sm font-bold text-red-950">Disputed payments</h3>

                  <div className="mt-3 flex flex-wrap gap-2">
                    {disputedPlayers.map((p: any) => (
                      <span
                        key={p.id}
                        className="rounded-full border border-red-200 bg-white px-3 py-1 text-xs font-medium text-red-800"
                      >
                        {p.name || p.id}
                        {p.paymentReference ? ` · Ref: ${p.paymentReference}` : ''}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Expected unpaid from socket */}
          {expectedUnpaidPlayers.length > 0 && (
            <div className="mt-4 rounded-xl border border-gray-200 bg-white p-4">
              <div className="flex items-start gap-3">
                <Clock className="h-5 w-5 text-gray-600 mt-0.5 flex-shrink-0" />

                <div>
                  <h3 className="text-sm font-bold text-gray-900">
                    Outstanding expected payments
                  </h3>

                  <div className="mt-3 flex flex-wrap gap-2">
                    {expectedUnpaidPlayers.map((p: any) => (
                      <span
                        key={p.id}
                        className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs font-medium text-gray-700"
                      >
                        {p.name || p.id} · {fmt(getPlayerTotal(p))}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="mt-4">
            <ReconciliationLedger />
          </div>

          {/* Final reconciled total */}
          <div className="mt-6 rounded-lg bg-gradient-to-r from-indigo-500 to-purple-600 p-4 text-white">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium opacity-90">Final Reconciled Total</div>
                <div className="text-3xl font-bold mt-1">{fmt(reconciledTotal)}</div>

                {netAdjustments !== 0 && (
                  <div className="text-xs opacity-75 mt-1">
                    {fmt(startingReceived)} starting + {fmt(netAdjustments)} adjustments
                  </div>
                )}
              </div>

              <Scale className="h-12 w-12 opacity-50" />
            </div>
          </div>
        </div>
      </div>

      {/* ── STEP 3: Review & Approve ─────────────────────────────────────── */}
      <div
        className={`bg-white rounded-xl border-2 p-6 relative ${
          isLocked ? 'border-gray-200' : hasBlockingPendingPayments ? 'border-amber-300' : 'border-indigo-200'
        }`}
      >
        {isLocked && (
          <div className="absolute inset-0 bg-white/80 rounded-xl z-10 flex items-center justify-center backdrop-blur-sm">
            <div className="flex items-center gap-2 rounded-lg bg-gray-100 border border-gray-300 px-4 py-2 shadow-lg">
              <Lock className="h-4 w-4 text-gray-600" />
              <span className="text-sm font-medium text-gray-700">
                Locked until quiz and prizes complete
              </span>
            </div>
          </div>
        )}

        <div className={isLocked ? 'opacity-40' : ''}>
          <StepHeader
            stepNum={3}
            title="Review & Approve"
            status={step3Status}
            isLocked={isLocked}
          />

          <InfoBox>
            Sign off on reconciliation to prevent changes and prepare your records for download.
          </InfoBox>

          <div className="mt-4">
            <ReconciliationApproval
              hasBlockingPendingPayments={hasBlockingPendingPayments}
              blockingPaymentCount={pendingInstantPlayers.length}
            />
          </div>
        </div>
      </div>

      {/* ── STEP 4: Download & Complete ──────────────────────────────────── */}
      <div
        className={`bg-white rounded-xl border-2 p-6 relative ${
          isLocked ? 'border-gray-200' : 'border-emerald-200'
        }`}
      >
        {isLocked && (
          <div className="absolute inset-0 bg-white/80 rounded-xl z-10 flex items-center justify-center backdrop-blur-sm">
            <div className="flex items-center gap-2 rounded-lg bg-gray-100 border border-gray-300 px-4 py-2 shadow-lg">
              <Lock className="h-4 w-4 text-gray-600" />
              <span className="text-sm font-medium text-gray-700">
                Complete previous steps first
              </span>
            </div>
          </div>
        )}

        <div className={isLocked ? 'opacity-40' : ''}>
          <StepHeader
            stepNum={4}
            title="Download & Complete"
            status={step4Status}
            isLocked={isLocked}
          />

          <InfoBox>
            End the quiz session — all players and admins will be disconnected and you will be
            returned to your event dashboard.
          </InfoBox>

          <div className="mt-4">
            <ReconciliationDownloads allRoundsStats={[]} />
          </div>
        </div>
      </div>

      <DisputePaymentModal
        open={disputeModalOpen}
        playerName={disputePlayer?.name || disputePlayer?.id || 'Selected player'}
        paymentReference={disputePlayer?.paymentReference}
        amountLabel={disputePlayer ? fmt(getPlayerTotal(disputePlayer)) : fmt(0)}
        reason={disputeReason}
        setReason={setDisputeReason}
        submitting={disputeSubmitting}
        onClose={closeDisputeModal}
        onSubmit={submitDisputePayment}
      />
    </div>
  );
};

export default PaymentReconciliationPanel;





