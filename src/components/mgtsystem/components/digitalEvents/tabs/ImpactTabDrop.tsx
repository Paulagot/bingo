// src/components/mgtsystem/components/digitalEvents/tabs/ImpactTabDrop.tsx
//
// Impact tab for Puzzle Drop - no new backend call. Reuses the same
// purchases list PurchasesTabDrop already fetches (getDropPurchasesForClub)
// and derives totals from it client-side, the same way ImpactTabSubscription
// derives its stats from `leaderboard` rather than a dedicated impact
// endpoint. No top-scorers section here - that needs the per-item
// leaderboard backend, which isn't wired to a tab yet (separate piece of
// work); this is purely the financial/participation summary.

import { useEffect, useMemo, useState } from 'react';
import {
  Heart, Users, TrendingUp, Puzzle, RefreshCw, Loader2, AlertCircle, Clock,
} from 'lucide-react';
import puzzleDropMgmtService, { type DropPurchase } from '../../../services/PuzzleDropMgmtService';
import { useCurrency } from '../../../hooks/useCurrency';

interface Props {
  roomId: string;
  config?: any;
  dropTitle?: string | null;
  status: 'scheduled' | 'open' | 'completed' | 'cancelled';
}

function StatCard({ icon, label, value, helper }: {
  icon: React.ReactNode; label: string; value: string | number; helper?: string;
}) {
  return (
    <div className="rounded-xl border p-4" style={{ borderColor: 'rgba(124,58,237,0.25)', background: 'rgba(124,58,237,0.05)' }}>
      <div className="mb-2 text-[#7c3aed]">{icon}</div>
      <p className="text-xs font-semibold uppercase tracking-wide text-[#7c3aed]">{label}</p>
      <p className="mt-1 text-xl font-black text-[#102532]">{value}</p>
      {helper && <p className="mt-1 text-[11px] text-[#52636f]">{helper}</p>}
    </div>
  );
}

export default function ImpactTabDrop({ roomId, config, dropTitle, status }: Props) {
  const [purchases, setPurchases] = useState<DropPurchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const { fmt } = useCurrency(config);

  const load = async () => {
    try {
      setError(null);
      const res = await puzzleDropMgmtService.getPurchases(roomId);
      setPurchases(res.purchases || []);
    } catch (e: any) {
      setError(e?.message || 'Failed to load impact data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId]);

  const handleRefresh = () => {
    setRefreshing(true);
    void load();
  };

  const stats = useMemo(() => {
    const confirmed = purchases.filter(p => p.status === 'confirmed');
    const claimed = purchases.filter(p => p.status === 'claimed');

    const revenue = confirmed.reduce((sum, p) => sum + Number(p.amount || 0), 0);
    const itemsSold = confirmed.reduce((sum, p) => sum + p.items.length, 0);
    const uniqueBuyers = new Set(confirmed.map(p => p.buyerEmail.toLowerCase())).size;

    // Per-item popularity - which puzzles sold the most, confirmed only.
    const itemCounts = new Map<string, number>();
    for (const p of confirmed) {
      for (const item of p.items) {
        const key = `#${item.itemNumber} · ${item.puzzleType}`;
        itemCounts.set(key, (itemCounts.get(key) || 0) + 1);
      }
    }
    const topItems = [...itemCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    return {
      revenue,
      itemsSold,
      uniqueBuyers,
      pendingCount: claimed.length,
      pendingItems: claimed.reduce((sum, p) => sum + p.items.length, 0),
      topItems,
    };
  }, [purchases]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-10">
        <Loader2 className="h-8 w-8 animate-spin text-[#7c3aed]" />
      </div>
    );
  }

  return (
    <div className="space-y-5 p-5">

      {/* ── Header ── */}
      <div className="rounded-2xl border border-[#dce1df] bg-gradient-to-r from-[rgba(124,58,237,0.06)] via-white to-[rgba(168,85,247,0.06)] p-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="mb-1 flex items-center gap-2">
              <h2 className="text-xl font-black text-[#102532]">Community Impact</h2>
              <span className="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold"
                style={{ background: 'rgba(124,58,237,0.12)', color: '#7c3aed', borderColor: 'rgba(124,58,237,0.3)' }}>
                <Puzzle className="h-3 w-3" />
                Puzzle Drop
              </span>
            </div>
            <p className="text-sm text-[#52636f]">How this Drop brought your community together.</p>
            {dropTitle && <p className="mt-1 text-xs text-[#8a9bab]">{dropTitle}</p>}
          </div>
          <button onClick={handleRefresh} disabled={refreshing} title="Refresh data"
            className="rounded-lg border border-[#dce1df] p-2 text-[#8a9bab] transition-colors hover:bg-white hover:text-[#52636f]">
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
          {error}
        </div>
      )}

      <div className="flex items-start gap-2 rounded-xl border p-3" style={{ borderColor: 'rgba(124,58,237,0.3)', background: 'rgba(124,58,237,0.06)' }}>
        <Heart className="mt-0.5 h-4 w-4 flex-shrink-0 text-[#7c3aed]" />
        <p className="text-xs text-[#4c1d95]">
          {status === 'completed'
            ? 'This Drop is completed. Totals below are final for new sales, though a trailing manual confirmation could still land after the fact.'
            : 'This Drop is still on sale - the totals below are as of right now and will keep changing as purchases come in.'}
        </p>
      </div>

      {/* ── Stat grid ── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard icon={<TrendingUp className="h-4 w-4" />} label="Raised so far" value={fmt(stats.revenue)} />
        <StatCard icon={<Puzzle className="h-4 w-4" />} label="Puzzles sold" value={stats.itemsSold} helper="Confirmed purchases only" />
        <StatCard icon={<Users className="h-4 w-4" />} label="Buyers" value={stats.uniqueBuyers} helper="Unique confirmed buyers" />
        <StatCard icon={<Clock className="h-4 w-4" />} label="Awaiting confirmation" value={stats.pendingCount}
          helper={stats.pendingItems > 0 ? `${stats.pendingItems} puzzle${stats.pendingItems !== 1 ? 's' : ''} pending` : undefined} />
      </div>

      {/* ── Most popular puzzles ── */}
      {stats.topItems.length > 0 && (
        <div className="rounded-2xl border border-[#dce1df] overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3.5 bg-[#fbf8f2] border-b border-[#dce1df]">
            <Puzzle className="h-4 w-4 text-[#52636f]" />
            <span className="text-sm font-semibold text-[#102532]">Most popular puzzles</span>
          </div>
          <div className="divide-y divide-[#f6f1e8] bg-white">
            {stats.topItems.map(([label, count]) => (
              <div key={label} className="flex items-center justify-between px-4 py-3">
                <span className="text-sm font-medium text-[#102532]">{label}</span>
                <span className="text-sm font-bold text-[#7c3aed]">{count} sold</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {stats.itemsSold === 0 && stats.pendingCount === 0 && (
        <div className="rounded-2xl border border-dashed border-[#dce1df] bg-[#fbf8f2] p-8 text-center">
          <p className="text-sm text-[#8a9bab]">No purchases yet - impact numbers will fill in once someone buys a puzzle.</p>
        </div>
      )}
    </div>
  );
}