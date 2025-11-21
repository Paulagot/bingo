import React from 'react'; 
import { useNavigate } from 'react-router-dom';

import { usePlayerStore } from '../hooks/usePlayerStore';
import { useQuizConfig } from '../hooks/useQuizConfig';
import { Lock, TrendingUp, Users, DollarSign, Scale } from 'lucide-react';

import ReconciliationApproval from '../payments/ReconciliationApproval';
import ReconciliationDownloads from '../payments/ReconciliationDownloads';
import ReconciliationLedger from '../payments/ReconciliationLedger';

type MethodTotals = { entry: number; extrasAmount: number; extrasCount: number; total: number };

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-3 shadow-sm">
      <div className="text-xs font-medium text-gray-600">{label}</div>
      <div className="text-lg font-bold text-gray-900">{value}</div>
    </div>
  );
}

/**
 * Normalize raw method strings from players / extras / legacy values
 * into the same buckets as the AddPlayerModal dropdown:
 * 'cash' | 'instant payment' | 'card' | 'web3' | 'unknown'
 */
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

  // collapse 'other', 'unknown', anything weird into 'unknown'
  return 'unknown';
}

const PaymentReconciliationPanel: React.FC = () => {

  const { players } = usePlayerStore();
  const { config, currentPhase } = useQuizConfig();
  const isComplete = currentPhase === 'complete';
  const navigate = useNavigate();

  // Gate: prizes must be completed before reconciliation
  const awards = (config?.reconciliation as any)?.prizeAwards || [];
  const prizePlaces = new Set((config?.prizes || []).map((p: any) => p.place));
  const finalStatuses = new Set(['delivered','unclaimed','refused','returned','canceled']);
  const declaredByPlace = new Map<number, any>();
  for (const a of awards) if (typeof a?.place === 'number') declaredByPlace.set(a.place, a);
  const allDeclared = prizePlaces.size > 0 && [...prizePlaces].every(pl => declaredByPlace.has(pl));
  const allResolved = prizePlaces.size > 0 && [...prizePlaces].every(pl => finalStatuses.has(declaredByPlace.get(pl)?.status));
  const prizesDone = allDeclared && allResolved;

  const currency = config?.currencySymbol || '€';
  const entryFee = parseFloat(config?.entryFee || '0');

  // Determine if reconciliation features should be locked
  const isLocked = !isComplete || !prizesDone;

  // ----- totals & breakdown (StartingReceived) -----
  const paymentData: Record<string, MethodTotals> = {};
  const activePlayers = players.filter((p) => !p.disqualified);
  const paidPlayers = activePlayers.filter((p) => p.paid);
  const unpaidPlayers = activePlayers.filter((p) => !p.paid);

for (const p of activePlayers) {
  const primaryMethod = normalizeMethodForReport(p.paymentMethod);
  if (!paymentData[primaryMethod]) {
    paymentData[primaryMethod] = { entry: 0, extrasAmount: 0, extrasCount: 0, total: 0 };
  }

  // Only count entry if player is marked paid
  if (p.paid) {
    paymentData[primaryMethod].entry += entryFee;
  }

  // ✅ Only count extras once the player is marked paid
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
    d.total = d.entry + d.extrasAmount;
  }

  const totalPlayers = activePlayers.length;
  const totalEntryReceived = paidPlayers.length * entryFee;
  const totalExtrasAmount = Object.values(paymentData).reduce((s, v) => s + v.extrasAmount, 0);
  const totalExtrasCount = Object.values(paymentData).reduce((s, v) => s + v.extrasCount, 0);
  const startingReceived = totalEntryReceived + totalExtrasAmount;

  // ----- Net Adjustments from Ledger -----
  const rec = (config?.reconciliation as any) || {};
  const ledger = (rec.ledger as any[]) || [];

  // Helper: sum by predicate
  const sumIf = (fn: (l: any) => boolean) =>
    ledger.reduce((acc, l) => acc + (fn(l) ? Number(l.amount || 0) : 0), 0);

  const adjReceived = sumIf((l) => l.type === 'received'); // +
  const adjRefunds  = sumIf((l) => l.type === 'refund');   // -
  const adjFees     = sumIf((l) => l.type === 'fee');      // -
  const adjPrize    = sumIf((l) => l.type === 'prize_payout'); // -
  const adjCashOver = sumIf((l) => l.type === 'cash_over_short' && l.reasonCode === 'cash_over'); // +
  const adjCashShort= sumIf((l) => l.type === 'cash_over_short' && l.reasonCode === 'cash_short'); // -

  const increases = adjReceived + adjCashOver;
  const reductions = adjRefunds + adjFees + adjPrize + adjCashShort;
  const netAdjustments = increases - reductions;

  const reconciledTotal = startingReceived + netAdjustments;

  const fmt = (n: number) => `${currency}${n.toFixed(2)}`;

  return (
    <div className="bg-gray-50 rounded-xl p-6 md:p-8 shadow-md">
      
      {/* STATUS WARNINGS */}
      <div className="space-y-3 mb-6">
        {!isComplete && (
          <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
            <strong>⏳ Quiz In Progress</strong>
            <p className="mt-1">Reconciliation will unlock when the game ends.</p>
          </div>
        )}
        {isComplete && !prizesDone && (
          <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
            <strong>🏆 Complete Prize Distribution</strong>
            <p className="mt-1">Finish prize awards before reconciling payments.</p>
            <button
              onClick={() => navigate(`?tab=prizes`)}
              className="mt-2 rounded-lg border border-amber-400 bg-white px-3 py-1.5 text-xs font-medium hover:bg-amber-100"
            >
              Go to Prizes →
            </button>
          </div>
        )}
      </div>

      {/* QUICK SUMMARY - Only show when locked */}
      {isLocked && (
        <div className="mb-6 rounded-lg border-2 border-blue-200 bg-blue-50 p-4">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="h-5 w-5 text-blue-700" />
            <h3 className="font-bold text-blue-900">Quick Financial Summary</h3>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="rounded-lg bg-white border border-blue-200 p-3">
              <div className="flex items-center gap-2 mb-1">
                <Users className="h-4 w-4 text-blue-600" />
                <div className="text-xs font-medium text-gray-600">Players</div>
              </div>
              <div className="text-xl font-bold text-gray-900">{totalPlayers}</div>
              <div className="text-xs text-green-600">{paidPlayers.length} paid</div>
            </div>
            <div className="rounded-lg bg-white border border-blue-200 p-3">
              <div className="flex items-center gap-2 mb-1">
                <DollarSign className="h-4 w-4 text-green-600" />
                <div className="text-xs font-medium text-gray-600">Starting Received</div>
              </div>
              <div className="text-xl font-bold text-gray-900">{fmt(startingReceived)}</div>
            </div>
            <div className="rounded-lg bg-white border border-blue-200 p-3">
              <div className="flex items-center gap-2 mb-1">
                <Scale className="h-4 w-4 text-blue-600" />
                <div className="text-xs font-medium text-gray-600">Net Adjustments</div>
              </div>
              <div className="text-xl font-bold text-gray-900">{fmt(netAdjustments)}</div>
            </div>
            <div className="rounded-lg bg-white border border-blue-200 p-3">
              <div className="flex items-center gap-2 mb-1">
                <DollarSign className="h-4 w-4 text-purple-600" />
                <div className="text-xs font-medium text-gray-600">Reconciled Total</div>
              </div>
              <div className="text-xl font-bold text-gray-900">{fmt(reconciledTotal)}</div>
            </div>
          </div>
          {unpaidPlayers.length > 0 && (
            <div className="mt-3 rounded-lg bg-red-50 border border-red-200 p-3">
              <div className="text-xs font-semibold text-red-800 mb-1">
                {unpaidPlayers.length} Unpaid Player{unpaidPlayers.length !== 1 ? 's' : ''}
              </div>
              <div className="flex flex-wrap gap-1">
                {unpaidPlayers.slice(0, 5).map((p) => (
                  <span key={p.id} className="text-xs text-red-700 bg-red-100 rounded px-2 py-0.5">
                    {p.name || p.id}
                  </span>
                ))}
                {unpaidPlayers.length > 5 && (
                  <span className="text-xs text-red-700">+{unpaidPlayers.length - 5} more</span>
                )}
              </div>
            </div>
          )}
          <p className="text-xs text-blue-800 mt-3">
            Full details and reconciliation tools will be available below once the quiz is complete and prizes are distributed.
          </p>
        </div>
      )}

      {/* TRANSACTION LEDGER - Disabled when locked */}
      <div className={`mb-8 relative ${isLocked ? 'pointer-events-none' : ''}`}>
        {isLocked && (
          <div className="absolute inset-0 bg-white/60 rounded-lg z-10 flex items-center justify-center backdrop-blur-[2px]">
            <div className="flex items-center gap-2 rounded-lg bg-amber-100 border border-amber-300 px-4 py-2 shadow-lg">
              <Lock className="h-4 w-4 text-amber-700" />
              <span className="text-sm font-medium text-amber-800">Complete quiz and prizes first</span>
            </div>
          </div>
        )}
        <div className={isLocked ? 'opacity-40' : ''}>
          <ReconciliationLedger />
        </div>
      </div>

      {/* ACTION ITEMS - Side by Side - Disabled when locked */}
      <div className={`mb-8 relative ${isLocked ? 'pointer-events-none' : ''}`}>
        {isLocked && (
          <div className="absolute inset-0 bg-white/60 rounded-lg z-10 flex items-center justify-center backdrop-blur-[2px]">
            <div className="flex items-center gap-2 rounded-lg bg-amber-100 border border-amber-300 px-4 py-2 shadow-lg">
              <Lock className="h-4 w-4 text-amber-700" />
              <span className="text-sm font-medium text-amber-800">Locked until quiz and prizes complete</span>
            </div>
          </div>
        )}
        <div className={`grid grid-cols-1 lg:grid-cols-2 gap-4 ${isLocked ? 'opacity-40' : ''}`}>
          <ReconciliationApproval />
          <ReconciliationDownloads allRoundsStats={[]} />
        </div>
      </div>

      {/* FINANCIAL OVERVIEW */}
      <div className="mb-8">
        <h2 className="text-xl font-bold text-gray-900 mb-4">💰 Financial Overview</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
          <Stat label="Total Players" value={String(totalPlayers)} />
          <Stat label="Paid" value={String(paidPlayers.length)} />
          <Stat label="Unpaid" value={String(unpaidPlayers.length)} />
          <Stat label="Entry Fee" value={fmt(entryFee)} />
          <Stat label="Extras" value={String(totalExtrasCount)} />
          <Stat label="Starting Received" value={fmt(startingReceived)} />
          <Stat label="Reconciled Total" value={fmt(reconciledTotal)} />
        </div>
      </div>

      {/* PAYMENT METHOD BREAKDOWN */}
      <div className="mb-8">
        <h2 className="text-xl font-bold text-gray-900 mb-4">📊 Payment Method Breakdown</h2>
        <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Payment Method
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Entry Fees
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Extras (count)
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Extras (amount)
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Total
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  % of Starting
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {Object.entries(paymentData).map(([method, d]) => (
                <tr key={method} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900 capitalize">
                    {method}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">{fmt(d.entry)}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{d.extrasCount}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{fmt(d.extrasAmount)}</td>
                  <td className="px-4 py-3 text-sm font-semibold text-gray-900">{fmt(d.total)}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">
                    {startingReceived > 0 ? `${((d.total / startingReceived) * 100).toFixed(1)}%` : '—'}
                  </td>
                </tr>
              ))}
              <tr className="bg-gray-100 font-bold">
                <td className="px-4 py-3 text-sm text-gray-900">Total</td>
                <td className="px-4 py-3 text-sm text-gray-900">{fmt(totalEntryReceived)}</td>
                <td className="px-4 py-3 text-sm text-gray-900">{totalExtrasCount}</td>
                <td className="px-4 py-3 text-sm text-gray-900">{fmt(totalExtrasAmount)}</td>
                <td className="px-4 py-3 text-sm text-gray-900">{fmt(startingReceived)}</td>
                <td className="px-4 py-3 text-sm text-gray-900">100%</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* UNPAID PLAYERS */}
      <div className="mb-8">
        <h2 className="text-xl font-bold text-gray-900 mb-4">🚩 Outstanding Payments</h2>
        <div className="rounded-lg border bg-white p-4 shadow-sm">
          {unpaidPlayers.length === 0 ? (
            <div className="flex items-center gap-2 text-green-700">
              <span className="text-2xl">✅</span>
              <span className="font-medium">All players have paid their entry fees!</span>
            </div>
          ) : (
            <div>
              <p className="text-sm font-medium text-red-700 mb-3">
                {unpaidPlayers.length} player{unpaidPlayers.length !== 1 ? 's' : ''} haven't paid entry fees:
              </p>
              <ul className="space-y-2">
                {unpaidPlayers.map((p) => (
                  <li key={p.id} className="flex items-center gap-2 text-sm text-red-600">
                    <span className="w-2 h-2 rounded-full bg-red-500"></span>
                    <span className="font-medium">{p.name || p.id}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

    </div>
  );
};

export default PaymentReconciliationPanel;











