// src/components/mgtsystem/components/digitalEvents/tabs/ImpactTabSubscription.tsx
//
// Borrows ImpactTab's StatCard/SectionHead/CollapsibleSection structure -
// and now its hero banner too - kept in this feature's own violet
// identity rather than the teal quiz/elimination palette, same choice
// OverviewTabSubscription made. Deliberately does NOT duplicate the full
// leaderboard list here - that already has its own dedicated tab
// (LeaderboardTabSubscription) - this shows a compact top-3 preview
// instead, the way a summary should. No volunteers/prize-awards/feedback
// sections: none of those concepts exist for subscriptions today, so
// nothing to port for them.

import { useState, type ReactNode } from 'react';
import {
  Heart, Users, TrendingUp, Calendar, Crown, ChevronDown, ChevronUp,
  Puzzle, Trophy, RefreshCw, Unlock,
} from 'lucide-react';
import type { RoomStats } from '../../../services/quizRoomServices';
import type { Challenge, LeaderboardEntry } from '../../../../puzzles/services/ChallengeService';
import { useCurrency } from '../../../hooks/useCurrency';

interface Props {
  stats?: RoomStats;
  challenge: Challenge | null;
  challengeLoading: boolean;
  leaderboard?: LeaderboardEntry[];
  onRefresh?: () => void;
}

function StatCard({ icon, label, value, helper }: {
  icon: ReactNode; label: string; value: string | number; helper?: string;
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

function CollapsibleSection({ icon, title, subtitle, count, children, defaultOpen = false }: {
  icon: ReactNode; title: string; subtitle?: string; count?: number; children: ReactNode; defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-2xl border border-[#dce1df] overflow-hidden">
      <button
        className="w-full flex items-center justify-between gap-3 px-4 py-3.5 bg-[#fbf8f2] hover:bg-[#f1f0ee] transition-colors text-left"
        onClick={() => setOpen(o => !o)}
      >
        <div className="flex items-center gap-2">
          <div className="text-[#52636f] flex-shrink-0">{icon}</div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-[#102532]">{title}</span>
              {count !== undefined && (
                <span className="inline-flex items-center rounded-full bg-[#dce1df] px-2 py-0.5 text-xs font-medium text-[#52636f]">
                  {count}
                </span>
              )}
            </div>
            {subtitle && <p className="text-xs text-[#52636f] mt-0.5">{subtitle}</p>}
          </div>
        </div>
        {open ? <ChevronUp className="h-4 w-4 text-[#8a9bab] shrink-0" /> : <ChevronDown className="h-4 w-4 text-[#8a9bab] shrink-0" />}
      </button>
      <div className={`bg-white ${open ? '' : 'hidden'}`}>{children}</div>
    </div>
  );
}

function getStatusMeta(status: string): { label: string; className: string } {
  switch (status) {
    case 'active':    return { label: 'Active',    className: 'bg-[rgba(124,58,237,0.12)] text-[#7c3aed] border-[rgba(124,58,237,0.3)]' };
    case 'completed': return { label: 'Completed', className: 'bg-[rgba(21,127,133,0.12)] text-[#157f85] border-[rgba(21,127,133,0.3)]' };
    case 'cancelled': return { label: 'Cancelled', className: 'bg-rose-50 text-rose-700 border-rose-200' };
    default:          return { label: 'Draft',     className: 'bg-gray-100 text-gray-600 border-gray-200' };
  }
}

export default function ImpactTabSubscription({ stats, challenge, challengeLoading, leaderboard = [], onRefresh }: Props) {
  const { fmt: formatMoney } = useCurrency();
  const [refreshing, setRefreshing] = useState(false);

  if (challengeLoading) {
    return (
      <div className="flex items-center justify-center p-10">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#e8ddfb] border-t-[#7c3aed]" />
      </div>
    );
  }

  if (!challenge) {
    return <div className="p-5 text-sm text-[#52636f]">No linked challenge found.</div>;
  }

  const isOngoing = challenge.status === 'active';
  const subscriberCount = challenge.player_count ?? 0;
  const statusMeta = getStatusMeta(challenge.status);

  // Weeks actually released so far - NOT total_weeks. A 4-week challenge
  // in its 2nd week has only ever offered 2 puzzles; using total_weeks as
  // the denominator would understate completion by counting weeks nobody
  // could possibly have solved yet.
  const startDate = new Date(challenge.starts_at);
  const now = Date.now();
  const releasedWeeks = Math.max(0, Math.min(
    challenge.total_weeks,
    Math.floor((now - startDate.getTime()) / (7 * 24 * 60 * 60 * 1000)) + 1
  ));

  // "Total puzzles solved" - every submission across every subscriber,
  // summed from each entry's own weeksCompleted.
  const totalPuzzlesSolved = leaderboard.reduce((sum, e) => sum + e.weeksCompleted, 0);

  // Completion rate - puzzles solved vs. puzzles actually released
  // (subscribers × released weeks, not total weeks). This is a
  // simplification: it doesn't account for subscribers who joined
  // partway through and so never had every released week available to
  // them personally - a per-subscriber version would be more precise,
  // but this is a reasonable challenge-wide approximation.
  const maxPossibleReleased = subscriberCount * releasedWeeks;
  const completionRate = maxPossibleReleased > 0 ? Math.round((totalPuzzlesSolved / maxPossibleReleased) * 100) : null;
  const releasedPct = challenge.total_weeks > 0 ? Math.round((releasedWeeks / challenge.total_weeks) * 100) : 0;

  const handleRefresh = () => {
    if (!onRefresh) return;
    setRefreshing(true);
    onRefresh();
    window.setTimeout(() => setRefreshing(false), 600);
  };

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
                Puzzle Subscription
              </span>
            </div>
            <p className="text-sm text-[#52636f]">How this puzzle subscription brought your community together.</p>
            <p className="mt-1 text-xs text-[#8a9bab]">{challenge.title}</p>
          </div>
          <div className="flex flex-shrink-0 items-start gap-2">
            <div className="rounded-xl bg-white p-3 shadow-sm ring-1 ring-[#dce1df]">
              <p className="text-xs font-semibold uppercase tracking-wide text-[#52636f]">Status</p>
              <p className={`mt-1 inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-bold ${statusMeta.className}`}>
                {statusMeta.label}
              </p>
            </div>
            {onRefresh && (
              <button onClick={handleRefresh} disabled={refreshing} title="Refresh data"
                className="rounded-lg border border-[#dce1df] p-2 text-[#8a9bab] transition-colors hover:bg-white hover:text-[#52636f]">
                <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-start gap-2 rounded-xl border p-3" style={{ borderColor: 'rgba(124,58,237,0.3)', background: 'rgba(124,58,237,0.06)' }}>
        <Heart className="mt-0.5 h-4 w-4 flex-shrink-0 text-[#7c3aed]" />
        <p className="text-xs text-[#4c1d95]">
          {isOngoing
            ? "This challenge is still running - the totals below are as of right now, and will keep changing as weekly payments and puzzle submissions come in."
            : 'Totals as of the most recent data. A trailing subscriber payment or two may still land after a challenge is marked complete - see the monthly reconciliation for a settled figure.'}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard icon={<TrendingUp className="h-4 w-4" />} label="Raised so far"
          value={formatMoney(stats?.totalIncome ?? 0)} />
        <StatCard icon={<Users className="h-4 w-4" />} label="Subscribers"
          value={subscriberCount} />
        <StatCard icon={<Puzzle className="h-4 w-4" />} label="Total puzzles solved"
          value={totalPuzzlesSolved}
          helper={`Across all ${subscriberCount} subscriber${subscriberCount !== 1 ? 's' : ''}`} />
        <StatCard icon={<Calendar className="h-4 w-4" />} label="Completion rate"
          value={completionRate !== null ? `${completionRate}%` : '-'}
          helper="Solved vs. puzzles released so far" />
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard icon={<Unlock className="h-4 w-4" />} label="Puzzles released"
          value={`${releasedWeeks} / ${challenge.total_weeks}`}
          helper={`${releasedPct}% of the full ${challenge.total_weeks}-week run`} />
      </div>

      <CollapsibleSection
        icon={<Trophy className="h-5 w-5 text-[#7c3aed]" />}
        title="Top scorers"
        subtitle="Full leaderboard is in its own tab"
        count={leaderboard.length}
        defaultOpen={false}
      >
        {leaderboard.length > 0 ? (
          <>
            {leaderboard.slice(0, 3).map((entry, idx) => (
              <div key={entry.playerId} className={`flex items-center justify-between gap-4 px-4 py-3 border-b border-[#f6f1e8] last:border-0 ${idx === 0 ? 'bg-gradient-to-r from-[rgba(124,58,237,0.08)] to-white' : ''}`}>
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                    idx === 0 ? 'bg-[rgba(124,58,237,0.15)] text-[#7c3aed]' : 'bg-[#f1f0ee] text-[#52636f]'
                  }`}>
                    {idx === 0 ? <Crown className="h-4 w-4" /> : entry.rank}
                  </div>
                  <div>
                    <span className="text-sm font-medium text-[#102532]">{entry.playerName}</span>
                    <p className="text-xs text-[#8a9bab]">{entry.weeksCompleted} puzzle{entry.weeksCompleted !== 1 ? 's' : ''} solved</p>
                  </div>
                </div>
                <span className="text-sm font-bold text-[#52636f]">{entry.totalScore} pts</span>
              </div>
            ))}
            <div className="px-4 py-2.5 bg-[rgba(124,58,237,0.08)] border-t border-[rgba(124,58,237,0.2)] text-xs text-[#7c3aed] font-medium">
              See the Leaderboard tab for the full list.
            </div>
          </>
        ) : (
          <div className="p-4 text-center text-sm text-[#52636f]">No submissions yet.</div>
        )}
      </CollapsibleSection>
    </div>
  );
}