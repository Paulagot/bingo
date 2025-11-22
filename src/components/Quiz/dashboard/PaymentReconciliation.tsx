// src/components/Quiz/dashboard/PaymentReconciliationPanel.tsx
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { usePlayerStore } from '../hooks/usePlayerStore';
import { useQuizConfig } from '../hooks/useQuizConfig';
import { useQuizSocket } from '../sockets/QuizSocketProvider';

import {
  Lock,
  TrendingUp,
  Users,
  DollarSign,
  Scale,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Info
} from 'lucide-react';

import ReconciliationApproval from '../payments/ReconciliationApproval';
import ReconciliationDownloads from '../payments/ReconciliationDownloads';
import ReconciliationLedger from '../payments/ReconciliationLedger';

// Removed unused Stat component

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
  isLocked
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

function normalizeMethodForReport(raw: any): string {
  if (!raw) return 'unknown';
  const v = String(raw).trim().toLowerCase();

  if (v === 'cash') return 'cash';
  if (
    v === 'instant payment' ||
    v === 'instant_payment' ||
    v === 'revolut' ||
    v === 'cash_or_revolut'
  ) {
    return 'instant payment';
  }
  if (v === 'card' || v === 'card tap' || v === 'card_tap') {
    return 'card';
  }
  if (v === 'web3' || v === 'crypto') {
    return 'web3';
  }
  return 'unknown';
}

const PaymentReconciliationPanel: React.FC = () => {
  const { players } = usePlayerStore();
  const { config, currentPhase } = useQuizConfig();
  const { socket } = useQuizSocket();
  const navigate = useNavigate();

  const isComplete = currentPhase === 'complete';

  // Prize dependency checks
  const awards = (config?.reconciliation as any)?.prizeAwards || [];
  const prizePlaces = new Set((config?.prizes || []).map((p: any) => p.place));
  const finalStatuses = new Set(['collected', 'delivered', 'unclaimed', 'refused', 'canceled']);
  const declaredByPlace = new Map<number, any>();
  for (const a of awards) if (typeof a?.place === 'number') declaredByPlace.set(a.place, a);

  const allDeclared = prizePlaces.size > 0 && [...prizePlaces].every(pl => declaredByPlace.has(pl));
  const allResolved = prizePlaces.size > 0 && [...prizePlaces].every(pl => finalStatuses.has(declaredByPlace.get(pl)?.status));
  const prizesDone = allDeclared && allResolved;

  const currency = config?.currencySymbol || '€';
  const entryFee = parseFloat(config?.entryFee || '0');

  // Lock status
  const isLocked = !isComplete || !prizesDone;
  const approvedAt = (config?.reconciliation as any)?.approvedAt;
  const isApproved = !!approvedAt;

  // Financial data
  const paymentData: Record<string, any> = {};
  const activePlayers = players.filter((p) => !p.disqualified);
  const paidPlayers = activePlayers.filter((p) => p.paid);
  const unpaidPlayers = activePlayers.filter((p) => !p.paid);

  for (const p of activePlayers) {
    const primaryMethod = normalizeMethodForReport(p.paymentMethod);

    if (!paymentData[primaryMethod]) {
      paymentData[primaryMethod] = { entry: 0, extrasAmount: 0, extrasCount: 0, total: 0 };
    }

    if (p.paid) paymentData[primaryMethod].entry += entryFee;

    if (p.paid && p.extraPayments) {
      for (const [, val] of Object.entries(p.extraPayments)) {
        const m = normalizeMethodForReport((val as any)?.method);
        const amt = Number((val as any)?.amount || 0);

        if (!paymentData[m]) {
          paymentData[m] = { entry: 0, extrasAmount: 0, extrasCount: 0, total: 0 };
        }

        paymentData[m].extrasAmount += amt;
        paymentData[m].extrasCount += 1;
      }
    }
  }

  for (const k in paymentData) {
    const d = paymentData[k];
    if (!d) continue;
    d.total = d.entry + d.extrasAmount;
  }

  const totalPlayers = activePlayers.length;
  const totalEntryReceived = paidPlayers.length * entryFee;

  const startingReceived =
    totalEntryReceived +
    Object.values(paymentData).reduce((s, d) => s + (d?.extrasAmount || 0), 0);

  // Ledger adjustments
  const rec = (config?.reconciliation as any) || {};
  const ledger = (rec.ledger as any[]) || [];

  const adjReceived = ledger.reduce((a, l) => (l.type === 'received' ? a + Number(l.amount) : a), 0);
  const adjRefund = ledger.reduce((a, l) => (l.type === 'refund' ? a + Number(l.amount) : a), 0);
  const adjFees = ledger.reduce((a, l) => (l.type === 'fee' ? a + Number(l.amount) : a), 0);
  const adjPrize = ledger.reduce((a, l) => (l.type === 'prize_payout' ? a + Number(l.amount) : a), 0);
  const adjCashOver = ledger.reduce(
    (a, l) => (l.type === 'cash_over_short' && l.reasonCode === 'cash_over' ? a + Number(l.amount) : a),
    0
  );
  const adjCashShort = ledger.reduce(
    (a, l) => (l.type === 'cash_over_short' && l.reasonCode === 'cash_short' ? a + Number(l.amount) : a),
    0
  );

  const netAdjustments = adjReceived + adjCashOver - (adjRefund + adjFees + adjPrize + adjCashShort);
  const reconciledTotal = startingReceived + netAdjustments;

  const endedAt: string | null = (config as any)?.endedAt ?? null;
  const [timeUntilCleanup, setTimeUntilCleanup] = useState<number | null>(null);

  // Auto cleanup timer
  useEffect(() => {
    if (isLocked || !socket || !endedAt) return;

    const quizEnd = new Date(endedAt).getTime();
    const cleanupTime = quizEnd + 3 * 60 * 60 * 1000;

    const tick = () => {
      const now = Date.now();
      const remaining = cleanupTime - now;
      if (remaining <= 0) {
        socket.emit('end_quiz_cleanup', { roomId: config.roomId });
      } else {
        setTimeUntilCleanup(Math.floor(remaining / 1000 / 60));
      }
    };

    tick();
    const int = setInterval(tick, 60000);
    return () => clearInterval(int);
  }, [isLocked, socket, endedAt, config?.roomId]);

  const fmt = (n: number) => `${currency}${n.toFixed(2)}`;

  // Step states
  const step1Status = isLocked ? 'pending' : 'complete';
  const step2Status = isLocked ? 'pending' : 'in-progress';
  const step3Status = isLocked ? 'pending' : isApproved ? 'complete' : 'in-progress';
  const step4Status = isLocked ? 'pending' : isApproved ? 'in-progress' : 'pending';

  return (
    <div className="bg-gray-50 rounded-xl p-6 md:p-8 shadow-md space-y-8">

      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Payment Reconciliation</h1>
        <p className="text-gray-600">Review financials, make adjustments, and finalize your records.</p>
      </div>

      {/* Cleanup Warning */}
      {!isLocked && timeUntilCleanup !== null && timeUntilCleanup <= 60 && !isApproved && (
        <div className="rounded-lg border-2 border-orange-300 bg-orange-50 p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-orange-600 mt-0.5" />
            <div>
              <h3 className="font-bold text-orange-900 mb-1">Auto-Cleanup Warning</h3>
              <p className="text-sm text-orange-800">
                This quiz will automatically clean in <strong>{timeUntilCleanup} minutes</strong>.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Quiz not complete */}
      {!isComplete && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-4">
          <div className="flex items-start gap-3">
            <Clock className="h-5 w-5 text-amber-600 mt-0.5" />
            <div>
              <strong className="text-amber-900">Quiz in Progress</strong>
              <p className="text-sm text-amber-800 mt-1">Reconciliation unlocks when the quiz ends.</p>
            </div>
          </div>
        </div>
      )}

      {/* Prizes incomplete */}
      {isComplete && !prizesDone && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
            <div>
              <strong className="text-amber-900">Complete prize distribution first</strong>
              <p className="text-sm text-amber-800 mt-1">All prizes must be awarded before reconciliation.</p>
              <button
                onClick={() => navigate(`?tab=prizes`)}
                className="mt-2 rounded-lg border border-amber-400 bg-white px-3 py-1.5 text-xs font-medium hover:bg-amber-100"
              >
                Go to Prizes →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STEP 1 ---------------------------------------------------------------- */}
      <div className="bg-white rounded-xl border-2 border-gray-200 p-6">
        <StepHeader stepNum={1} title="Review Financial Summary" status={step1Status} isLocked={isLocked} />

        <InfoBox>Review all money collected during your quiz before adding adjustments.</InfoBox>

        {/* Stats */}
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="rounded-lg bg-blue-50 border border-blue-200 p-4">
            <div className="flex items-center gap-2 mb-1">
              <Users className="h-4 w-4 text-blue-600" />
              <div className="text-xs font-medium text-blue-700">Players</div>
            </div>
            <div className="text-2xl font-bold text-blue-900">{totalPlayers}</div>
            <div className="text-xs text-blue-600 mt-1">
              {paidPlayers.length} paid • {unpaidPlayers.length} unpaid
            </div>
          </div>

          <div className="rounded-lg bg-green-50 border border-green-200 p-4">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className="h-4 w-4 text-green-600" />
              <div className="text-xs font-medium text-green-700">Entry Fees</div>
            </div>
            <div className="text-2xl font-bold text-green-900">{fmt(totalEntryReceived)}</div>
            <div className="text-xs text-green-600 mt-1">
              {paidPlayers.length} × {fmt(entryFee)}
            </div>
          </div>

          <div className="rounded-lg bg-purple-50 border border-purple-200 p-4">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="h-4 w-4 text-purple-600" />
              <div className="text-xs font-medium text-purple-700">Extras</div>
            </div>
            <div className="text-2xl font-bold text-purple-900">
              {fmt(
                Object.values(paymentData).reduce((s, d) => s + (d?.extrasAmount || 0), 0)
              )}
            </div>
            <div className="text-xs text-purple-600 mt-1">
              {
                Object.values(paymentData).reduce((s, d) => s + (d?.extrasCount || 0), 0)
              }{' '}
              transactions
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

        {/* Payment method breakdown */}
        <div className="mt-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wider">
            Breakdown by Payment Method
          </h3>
          <div className="overflow-x-auto rounded-lg border border-gray-200">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                    Method
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                    Entry Fees
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                    Extras
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                    Total
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                    %
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {Object.entries(paymentData).map(([method, d]) => {
                  if (!d) return null;
                  return (
                    <tr key={method} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900 capitalize">{method}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">{fmt(d.entry)}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {fmt(d.extrasAmount)}{' '}
                        <span className="text-xs text-gray-500">({d.extrasCount})</span>
                      </td>
                      <td className="px-4 py-3 text-sm font-semibold text-gray-900">{fmt(d.total)}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {startingReceived > 0
                          ? `${((d.total / startingReceived) * 100).toFixed(1)}%`
                          : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Unpaid players */}
        {unpaidPlayers.length > 0 && (
          <div className="mt-4 rounded-lg bg-red-50 border border-red-200 p-4">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5" />
              <div className="flex-1">
                <div className="text-sm font-semibold text-red-800 mb-2">
                  {unpaidPlayers.length} Unpaid Player
                  {unpaidPlayers.length !== 1 ? 's' : ''}
                </div>
                <div className="flex flex-wrap gap-1">
                  {unpaidPlayers.map((p) => (
                    <span key={p.id} className="text-xs text-red-700 bg-red-100 rounded px-2 py-0.5">
                      {p.name || p.id}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* STEP 2 ------------------------------------------------------------ */}
      <div
        className={`bg-white rounded-xl border-2 p-6 relative ${
          isLocked ? 'border-gray-200' : 'border-blue-200'
        }`}
      >
        {isLocked && (
          <div className="absolute inset-0 bg-white/80 rounded-xl z-10 flex items-center justify-center backdrop-blur-sm">
            <div className="flex items-center gap-2 rounded-lg bg-gray-100 border border-gray-300 px-4 py-2 shadow-lg">
              <Lock className="h-4 w-4 text-gray-600" />
              <span className="text-sm font-medium text-gray-700">Complete quiz and prizes first</span>
            </div>
          </div>
        )}

        <div className={isLocked ? 'opacity-40' : ''}>
          <StepHeader stepNum={2} title="Make Adjustments (Optional)" status={step2Status} isLocked={isLocked} />

          <InfoBox>
            Record any money that came in or went out after initial collection (refunds, fees, late payments,
            cash errors, prize payouts).
          </InfoBox>

          <div className="mt-4">
            <ReconciliationLedger />
          </div>

          {/* Final reconciled total only */}
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

      {/* STEP 3 ------------------------------------------------------------ */}
      <div
        className={`bg-white rounded-xl border-2 p-6 relative ${
          isLocked ? 'border-gray-200' : 'border-indigo-200'
        }`}
      >
        {isLocked && (
          <div className="absolute inset-0 bg-white/80 rounded-xl z-10 flex items-center justify-center backdrop-blur-sm">
            <div className="flex items-center gap-2 rounded-lg bg-gray-100 border border-gray-300 px-4 py-2 shadow-lg">
              <Lock className="h-4 w-4 text-gray-600" />
              <span className="text-sm font-medium text-gray-700">Locked until quiz and prizes complete</span>
            </div>
          </div>
        )}

        <div className={isLocked ? 'opacity-40' : ''}>
          <StepHeader stepNum={3} title="Review & Approve" status={step3Status} isLocked={isLocked} />

          <InfoBox>
            Sign off on reconciliation to prevent changes and prepare your records for download.
          </InfoBox>

            <div className="mt-4">
            <ReconciliationApproval />
          </div>
        </div>
      </div>

      {/* STEP 4 ------------------------------------------------------------ */}
      <div
        className={`bg-white rounded-xl border-2 p-6 relative ${
          isLocked ? 'border-gray-200' : 'border-emerald-200'
        }`}
      >
        {isLocked && (
          <div className="absolute inset-0 bg-white/80 rounded-xl z-10 flex items-center justify-center backdrop-blur-sm">
            <div className="flex items-center gap-2 rounded-lg bg-gray-100 border border-gray-300 px-4 py-2 shadow-lg">
              <Lock className="h-4 w-4 text-gray-600" />
              <span className="text-sm font-medium text-gray-700">Complete previous steps first</span>
            </div>
          </div>
        )}

        <div className={isLocked ? 'opacity-40' : ''}>
          <StepHeader stepNum={4} title="Download & Complete" status={step4Status} isLocked={isLocked} />

          <InfoBox>
            Download your complete quiz archive including financial reports, player data, and audit logs.
          </InfoBox>

          <div className="mt-4">
            <ReconciliationDownloads allRoundsStats={[]} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentReconciliationPanel;





