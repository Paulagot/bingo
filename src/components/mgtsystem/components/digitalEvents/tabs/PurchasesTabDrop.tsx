// src/components/mgtsystem/components/digitalEvents/tabs/PurchasesTabDrop.tsx
//
// Drop's replacement for Payments + Tickets tabs combined - there's no
// ticket concept here (entitlements aren't tickets, they're per-item
// access grants) and no "outstanding player" concept either (that's a
// quiz-room idea). Instead: a flat list of purchases, grouped by ledger
// (one purchase can cover several items in one checkout), each with a
// Confirm action for anything still 'claimed'.
//
// Confirming ANY entitlement on a ledger via confirmDropPurchase already
// confirms every sibling entitlement on that same ledger server-side -
// so the button here calls confirm once using primaryEntitlementId,
// exactly matching that existing behaviour, not once per item.
//
// No "add sale manually" action yet - deliberately out of scope for this
// pass (see conversation notes); only list + confirm.

import { useEffect, useMemo, useState } from 'react';
import {
  Loader2, CheckCircle2, AlertCircle, Search, Clock,
  RefreshCw, Puzzle, ReceiptText, User, Mail,
} from 'lucide-react';
import puzzleDropMgmtService, { type DropPurchase } from '../../../services/PuzzleDropMgmtService';
import { useCurrency } from '../../../hooks/useCurrency';

interface Props {
  roomId: string;
  config?: any;
  confirmedBy: string;
  confirmedByName?: string;
}

type Filter = 'all' | 'claimed' | 'confirmed';

function formatDateTime(value: string | null | undefined): string {
  if (!value) return '-';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleString('en-IE', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

function humaniseMethod(value: string | null | undefined): string {
  if (!value) return 'Unknown';
  return value.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

function StatusPill({ status }: { status: string }) {
  if (status === 'claimed') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800">
        <Clock className="h-3.5 w-3.5" /> Awaiting confirmation
      </span>
    );
  }
  if (status === 'confirmed') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-green-200 bg-green-50 px-2.5 py-1 text-xs font-semibold text-green-800">
        <CheckCircle2 className="h-3.5 w-3.5" /> Confirmed
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-xs font-semibold text-gray-700">
      {humaniseMethod(status)}
    </span>
  );
}

export default function PurchasesTabDrop({ roomId, config, confirmedBy, confirmedByName }: Props) {
  const [purchases, setPurchases] = useState<DropPurchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>('all');
  const [search, setSearch] = useState('');
  const [confirmingLedgerId, setConfirmingLedgerId] = useState<string | null>(null);

  const { fmt } = useCurrency(config);

  const loadPurchases = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await puzzleDropMgmtService.getPurchases(roomId);
      setPurchases(res.purchases || []);
    } catch (e: any) {
      setError(e?.message || 'Failed to load purchases');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadPurchases();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId]);

  const handleConfirm = async (purchase: DropPurchase) => {
    if (!confirmedBy) {
      setError('Missing confirmer identity - please refresh and try again.');
      return;
    }
    const key = purchase.ledgerId || purchase.primaryEntitlementId;
    setConfirmingLedgerId(key);
    setError(null);
    try {
      await puzzleDropMgmtService.confirmPurchase({
        entitlementId: purchase.primaryEntitlementId,
        confirmedBy,
        confirmedByName: confirmedByName || 'Admin',
        confirmedByRole: 'admin',
      });
      await loadPurchases();
    } catch (e: any) {
      setError(e?.message || 'Failed to confirm purchase');
    } finally {
      setConfirmingLedgerId(null);
    }
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return purchases.filter(p => {
      if (filter === 'claimed' && p.status !== 'claimed') return false;
      if (filter === 'confirmed' && p.status !== 'confirmed') return false;
      if (!q) return true;
      return (
        (p.buyerName || '').toLowerCase().includes(q) ||
        (p.buyerEmail || '').toLowerCase().includes(q) ||
        (p.paymentReference || '').toLowerCase().includes(q)
      );
    });
  }, [purchases, filter, search]);

  const stats = useMemo(() => ({
    total: purchases.length,
    claimed: purchases.filter(p => p.status === 'claimed').length,
    confirmed: purchases.filter(p => p.status === 'confirmed').length,
    revenue: purchases
      .filter(p => p.status === 'confirmed')
      .reduce((sum, p) => sum + Number(p.amount || 0), 0),
  }), [purchases]);

  const filterOptions: Array<{ key: Filter; label: string; count: number }> = [
    { key: 'all', label: 'All', count: stats.total },
    { key: 'claimed', label: 'Awaiting confirmation', count: stats.claimed },
    { key: 'confirmed', label: 'Confirmed', count: stats.confirmed },
  ];

  return (
    <div className="space-y-5 p-5">

      {/* ── Header / stats ── */}
      <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="h-1 w-full bg-gradient-to-r from-[#7c3aed] to-[#a855f7]" />
        <div className="border-b border-gray-100 bg-[rgba(124,58,237,0.04)] p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-[rgba(124,58,237,0.18)] bg-white/80 px-3 py-1 text-xs font-semibold text-[#7c3aed] shadow-sm">
                <ReceiptText className="h-3.5 w-3.5" />
                Purchases
              </div>
              <h2 className="mt-3 text-lg font-bold text-[#102532]">Puzzle purchases</h2>
              <p className="mt-1 max-w-2xl text-sm text-gray-600">
                Confirm manual and instant-payment purchases here. Stripe and crypto purchases confirm themselves automatically and just show up as Confirmed.
              </p>
            </div>
            <button type="button" onClick={loadPurchases}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50">
              <RefreshCw className="h-4 w-4" /> Refresh
            </button>
          </div>
        </div>

        <div className="grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-gray-200 bg-gray-50/70 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Total purchases</p>
            <p className="mt-1 text-xl font-bold text-[#102532]">{stats.total}</p>
          </div>
          <div className="rounded-xl border border-amber-100 bg-amber-50/60 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">Awaiting confirmation</p>
            <p className="mt-1 text-xl font-bold text-amber-900">{stats.claimed}</p>
          </div>
          <div className="rounded-xl border border-green-100 bg-green-50/60 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-green-700">Confirmed</p>
            <p className="mt-1 text-xl font-bold text-green-900">{stats.confirmed}</p>
          </div>
          <div className="rounded-xl border border-[#102532]/10 bg-[#102532]/[0.04] p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-[#52636f]">Confirmed revenue</p>
            <p className="mt-1 text-xl font-bold text-[#102532]">{fmt(stats.revenue)}</p>
          </div>
        </div>
      </section>

      {error && (
        <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* ── List ── */}
      <section className="rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-gray-100 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-2">
            {filterOptions.map(({ key, label, count }) => (
              <button key={key} type="button" onClick={() => setFilter(key)}
                className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                  filter === key
                    ? 'bg-[#7c3aed] text-white shadow-sm'
                    : 'border border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100'
                }`}>
                {label}
                <span className={`rounded-full px-1.5 py-0.5 text-[10px] ${filter === key ? 'bg-white/20 text-white' : 'bg-white text-gray-500'}`}>
                  {count}
                </span>
              </button>
            ))}
          </div>
          <div className="relative sm:w-64">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search buyer or reference…"
              className="w-full rounded-xl border border-gray-200 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-[#7c3aed] focus:ring-2 focus:ring-[rgba(124,58,237,0.15)]"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-14">
            <Loader2 className="h-6 w-6 animate-spin text-[#7c3aed]" />
            <span className="ml-3 text-sm font-medium text-gray-600">Loading purchases…</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-gray-100 text-gray-400">
              <Puzzle className="h-6 w-6" />
            </div>
            <p className="mt-3 text-sm font-semibold text-gray-700">No purchases found</p>
            <p className="mt-1 text-xs text-gray-500">
              {filter === 'all' ? 'Purchases will appear here once someone buys a puzzle.' : 'Try a different filter.'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filtered.map(purchase => {
              const key = purchase.ledgerId || purchase.primaryEntitlementId;
              const isConfirming = confirmingLedgerId === key;
              return (
                <div key={key} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between hover:bg-[rgba(124,58,237,0.02)]">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="flex items-center gap-1.5 text-sm font-semibold text-[#102532]">
                        <User className="h-3.5 w-3.5 text-gray-400" />
                        {purchase.buyerName || 'No name given'}
                      </span>
                      <StatusPill status={purchase.status} />
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <Mail className="h-3 w-3" /> {purchase.buyerEmail}
                      </span>
                      <span>{humaniseMethod(purchase.paymentMethod)}</span>
                      {purchase.paymentReference && (
                        <code className="rounded bg-gray-50 px-1.5 py-0.5 text-[11px] text-gray-600">
                          {purchase.paymentReference}
                        </code>
                      )}
                      <span>{formatDateTime(purchase.createdAt)}</span>
                    </div>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {purchase.items.map(item => (
                        <span key={item.entitlementId}
                          className="inline-flex items-center gap-1 rounded-full border border-[rgba(124,58,237,0.2)] bg-[rgba(124,58,237,0.05)] px-2 py-0.5 text-[11px] font-medium text-[#7c3aed]">
                          <Puzzle className="h-3 w-3" /> #{item.itemNumber} · {item.puzzleType}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-shrink-0 items-center gap-3">
                    <div className="text-right">
                      <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Amount</p>
                      <p className="text-base font-bold text-[#102532]">
                        {purchase.amount !== null ? fmt(purchase.amount) : '-'}
                      </p>
                    </div>
                    {purchase.status === 'claimed' && (
                      <button
                        type="button"
                        onClick={() => handleConfirm(purchase)}
                        disabled={isConfirming}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-green-600 px-3 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {isConfirming
                          ? <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                          : <CheckCircle2 className="h-3.5 w-3.5" />}
                        Confirm
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}