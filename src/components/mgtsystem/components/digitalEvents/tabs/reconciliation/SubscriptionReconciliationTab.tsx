// src/components/mgtsystem/components/digitalEvents/tabs/reconciliation/SubscriptionReconciliationTab.tsx
//
// Three sections, in order:
//   1. Lifetime summary — the "overall" rollup across every period, always
//      visible at the top so a club never loses the big picture while
//      looking at one period.
//   2. Current period — opening balance → this period's Stripe receipts →
//      adjustments → closing balance. Approve locks it and starts the next
//      period's opening balance from this one's closing figure.
//   3. Period history — every past (approved) period, collapsed by default.

import { useCallback, useEffect, useState } from 'react';
import {
  Scale, CheckCircle2, AlertCircle, Loader, ChevronDown, ChevronUp,
  TrendingUp, ArrowRight, Lock, History,
} from 'lucide-react';
import subscriptionReconciliationService, {
  type SubscriptionAdjustment,
  type SubscriptionReconciliationPeriod,
  type LifetimeSummary,
} from '../../../../services/SubscriptionReconciliationService';
import { SubscriptionAdjustmentsLedger } from './SubscriptionAdjustmentsLedger';

interface Props {
  roomId: string;
  currencySymbol?: string;
  hostName?: string;
}

function fmt(sym: string, n: number) {
  return `${sym}${Number(n || 0).toFixed(2)}`;
}

export default function SubscriptionReconciliationTab({ roomId, currencySymbol = '€', hostName = 'Host' }: Props) {
  const [summary, setSummary]             = useState<LifetimeSummary | null>(null);
  const [current, setCurrent]             = useState<SubscriptionReconciliationPeriod | null>(null);
  const [adjustments, setAdjustments]     = useState<SubscriptionAdjustment[]>([]);
  const [liveReceipts, setLiveReceipts]   = useState<{ total: number; count: number }>({ total: 0, count: 0 });
  const [history, setHistory]             = useState<SubscriptionReconciliationPeriod[]>([]);
  const [showHistory, setShowHistory]     = useState(false);

  const [loading, setLoading]     = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [approvedBy, setApprovedBy]   = useState('');
  const [notes, setNotes]             = useState('');
  const [approving, setApproving]     = useState(false);
  const [approveError, setApproveError] = useState<string | null>(null);


  const isApproved = !!current?.approvedAt;

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [currentRes, summaryRes] = await Promise.all([
        subscriptionReconciliationService.getCurrent(roomId),
        subscriptionReconciliationService.getSummary(roomId),
      ]);
      setCurrent(currentRes.reconciliation);
      setAdjustments(currentRes.adjustments);
      setLiveReceipts(currentRes.liveReceipts);
      setSummary(summaryRes.summary);
    } catch (e: any) {
      setLoadError(e?.message || 'Failed to load reconciliation data');
    } finally {
      setLoading(false);
    }
  }, [roomId]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const loadHistory = async () => {
    setShowHistory(s => !s);
    if (!history.length) {
      try {
        const res = await subscriptionReconciliationService.getHistory(roomId);
        // Most recent first for a history list — getHistory returns oldest-first.
        setHistory([...res.history].reverse());
      } catch (e) {
        console.error('[SubscriptionReconciliationTab] history load failed:', e);
      }
    }
  };

  const handleApprove = async () => {
    if (!approvedBy.trim()) return;
    setApproving(true);
    setApproveError(null);
    try {
      const res = await subscriptionReconciliationService.approve(roomId, {
        approvedBy: approvedBy.trim(),
        notes: notes.trim() || null,
      });
      setCurrent(res.reconciliation);
   
      // Refresh the lifetime summary too — this period's numbers now count
      // toward it, and a new draft period will open the next time someone
      // adds an adjustment or approves again.
      const summaryRes = await subscriptionReconciliationService.getSummary(roomId);
      setSummary(summaryRes.summary);
    } catch (e: any) {
      setApproveError(e?.message || 'Approval failed. Please try again.');
    } finally {
      setApproving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader className="h-6 w-6 animate-spin text-[#7c3aed]" />
        <span className="ml-3 text-sm text-[#52636f]">Loading reconciliation…</span>
      </div>
    );
  }

  if (loadError || !current) {
    return (
      <div className="p-5">
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          {loadError || 'Could not load reconciliation data.'}
        </div>
      </div>
    );
  }

  const projectedClosing = current.openingBalance + liveReceipts.total +
    adjustments.reduce((net, a) => net + (a.adjustmentType === 'received' ? a.amount : -a.amount), 0);

  return (
    <div className="space-y-6 p-5">

      {/* ── Lifetime summary ──────────────────────────────────────────────── */}
      {summary && (
        <div className="rounded-2xl border border-[rgba(124,58,237,0.25)] bg-[rgba(124,58,237,0.05)] p-5">
          <div className="mb-3 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-[#7c3aed]" />
            <h3 className="text-sm font-bold text-[#102532]">Overall (all periods)</h3>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div>
              <p className="text-xs text-[#52636f]">Periods reconciled</p>
              <p className="text-lg font-bold text-[#102532]">{summary.periodCount}</p>
            </div>
            <div>
              <p className="text-xs text-[#52636f]">Total received</p>
              <p className="text-lg font-bold text-[#102532]">{fmt(currencySymbol, summary.totalReceipts)}</p>
            </div>
            <div>
              <p className="text-xs text-[#52636f]">Total adjustments</p>
              <p className={`text-lg font-bold ${summary.totalAdjustments >= 0 ? 'text-[#102532]' : 'text-rose-700'}`}>
                {summary.totalAdjustments >= 0 ? '+' : ''}{fmt(currencySymbol, summary.totalAdjustments)}
              </p>
            </div>
            <div>
              <p className="text-xs text-[#52636f]">Current balance</p>
              <p className="text-lg font-bold text-[#7c3aed]">{fmt(currencySymbol, summary.currentBalance)}</p>
            </div>
          </div>
        </div>
      )}

      {/* ── Current period ─────────────────────────────────────────────────── */}
      <div className={`rounded-xl border p-5 shadow-sm ${isApproved ? 'border-green-200 bg-white' : 'border-[#7c3aed] bg-white'}`}>
        <div className="mb-4 flex items-center gap-3">
          <Scale className="h-5 w-5 text-[#7c3aed]" />
          <h3 className="text-base font-bold text-[#102532]">
            {isApproved ? 'Last Reconciled Period' : 'Current Period'}
          </h3>
          {isApproved && <Lock className="h-4 w-4 text-gray-400" />}
        </div>

        {/* Opening → transactions → closing, laid out explicitly */}
        <div className="mb-5 flex flex-wrap items-center gap-3">
          <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
            <p className="text-xs font-medium text-gray-500">Opening balance</p>
            <p className="text-lg font-bold text-gray-900">{fmt(currencySymbol, current.openingBalance)}</p>
          </div>
          <ArrowRight className="h-4 w-4 text-gray-300 shrink-0" />
          <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3">
            <p className="text-xs font-medium text-green-700">
              {isApproved ? 'Receipts this period' : 'Receipts so far'}
            </p>
            <p className="text-lg font-bold text-green-900">
              {fmt(currencySymbol, isApproved ? current.periodReceipts : liveReceipts.total)}
            </p>
            <p className="text-[11px] text-green-600 mt-0.5">
              {(isApproved ? undefined : liveReceipts.count)} {!isApproved && `payment${liveReceipts.count !== 1 ? 's' : ''}`}
            </p>
          </div>
          <ArrowRight className="h-4 w-4 text-gray-300 shrink-0" />
          <div className={`rounded-xl border px-4 py-3 ${
            (isApproved ? current.adjustmentsNet : adjustments.reduce((n, a) => n + (a.adjustmentType === 'received' ? a.amount : -a.amount), 0)) >= 0
              ? 'border-blue-200 bg-blue-50' : 'border-rose-200 bg-rose-50'
          }`}>
            <p className="text-xs font-medium text-gray-600">Adjustments</p>
            <p className="text-lg font-bold text-gray-900">
              {(() => {
                const net = isApproved ? current.adjustmentsNet
                  : adjustments.reduce((n, a) => n + (a.adjustmentType === 'received' ? a.amount : -a.amount), 0);
                return `${net >= 0 ? '+' : ''}${fmt(currencySymbol, net)}`;
              })()}
            </p>
          </div>
          <ArrowRight className="h-4 w-4 text-gray-300 shrink-0" />
          <div className="rounded-xl bg-gradient-to-r from-[#7c3aed] to-[#a855f7] px-4 py-3 text-white">
            <p className="text-xs font-medium opacity-90">
              {isApproved ? 'Closing balance' : 'Projected closing'}
            </p>
            <p className="text-lg font-bold">
              {fmt(currencySymbol, isApproved ? current.closingBalance : projectedClosing)}
            </p>
          </div>
        </div>

        {/* Adjustments ledger */}
        <SubscriptionAdjustmentsLedger
          roomId={roomId}
          adjustments={adjustments}
          currency={currencySymbol}
          isLocked={isApproved}
          approverName={hostName}
          onChange={setAdjustments}
        />

        {/* Approve */}
        <div className="mt-5">
          {isApproved ? (
            <div className="rounded-xl bg-green-50 border border-green-200 p-4 flex items-center gap-3">
              <CheckCircle2 className="h-6 w-6 text-green-600 shrink-0" />
              <div>
                <p className="font-semibold text-green-900">Period approved</p>
                <p className="text-sm text-green-700 mt-0.5">
                  Closing balance: <strong>{fmt(currencySymbol, current.closingBalance)}</strong>
                  {' '}· Approved by <strong>{current.approvedBy}</strong>
                </p>
                <p className="text-xs text-green-600 mt-1">
                  A new period opens automatically the next time an adjustment is added or approval is run again.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-3 rounded-xl border border-gray-200 bg-gray-50 p-4">
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
                <input type="text" value={approvedBy} onChange={e => setApprovedBy(e.target.value)}
                  disabled={approving} placeholder="Your name or role (required)"
                  className="w-full rounded-lg border-2 border-gray-300 px-3 py-2 text-sm focus:border-[#7c3aed] focus:outline-none focus:ring-2 focus:ring-[rgba(124,58,237,0.2)] disabled:bg-gray-100" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-1.5">Notes (optional)</label>
                <textarea rows={2} value={notes} onChange={e => setNotes(e.target.value)}
                  disabled={approving} placeholder="Anything worth noting for this period…"
                  className="w-full rounded-lg border-2 border-gray-300 px-3 py-2 text-sm focus:border-[#7c3aed] focus:outline-none focus:ring-2 focus:ring-[rgba(124,58,237,0.2)] disabled:bg-gray-100 resize-none" />
              </div>
              <button onClick={handleApprove} disabled={!approvedBy.trim() || approving}
                className="w-full rounded-xl bg-[#7c3aed] py-3 text-sm font-bold text-white hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2">
                {approving
                  ? <><Loader className="h-4 w-4 animate-spin" /> Approving…</>
                  : <><CheckCircle2 className="h-4 w-4" /> Approve This Period</>}
              </button>
              {!approvedBy.trim() && (
                <p className="text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-2">
                  Enter your name above to enable approval.
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── History ─────────────────────────────────────────────────────────── */}
      <div className="rounded-xl border border-gray-200 bg-white">
        <button onClick={loadHistory}
          className="flex w-full items-center justify-between px-5 py-4 text-left">
          <div className="flex items-center gap-2">
            <History className="h-4 w-4 text-[#52636f]" />
            <span className="text-sm font-bold text-[#102532]">Past periods</span>
          </div>
          {showHistory ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
        </button>
        {showHistory && (
          <div className="border-t border-gray-100 px-5 py-3 space-y-2">
            {history.length === 0 ? (
              <p className="py-3 text-sm text-gray-400">No past periods yet.</p>
            ) : (
              history.map(period => (
                <div key={period.id} className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2.5">
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {new Date(period.periodStart).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                      {period.approvedAt ? ` – ${new Date(period.approvedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}` : ' – ongoing'}
                    </p>
                    <p className="text-xs text-gray-500">
                      {period.approvedAt ? `Approved by ${period.approvedBy}` : 'Not yet approved'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-gray-900">{fmt(currencySymbol, period.closingBalance)}</p>
                    <p className="text-xs text-gray-500">{fmt(currencySymbol, period.openingBalance)} opening</p>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}