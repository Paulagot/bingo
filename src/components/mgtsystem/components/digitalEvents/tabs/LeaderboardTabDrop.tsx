// src/components/mgtsystem/components/digitalEvents/tabs/LeaderboardTabDrop.tsx
//
// Leaderboard tab for Puzzle Drop. Backend already existed for this
// (getDropItemLeaderboard, getPublicDropSummary) — this is purely a tab
// wrapper, same two-tier shape as LeaderboardTabSubscription: a cheap
// summary call up front (top 3 per item), full per-item list fetched only
// when that item is expanded. No week-by-week breakdown per player here
// the way Subscription's does — Drop's items are independent puzzles,
// not a weekly sequence, so the natural grouping is by ITEM, then by
// player within that item, not the other way around.

import { useEffect, useState } from 'react';
import { ChevronDown, ChevronUp, Crown, Loader2, Puzzle, Trophy, AlertCircle } from 'lucide-react';
import puzzleDropMgmtService, {
  type DropSummaryItem,
  type DropLeaderboardEntry,
} from '../../../services/PuzzleDropMgmtService';

interface Props {
  roomId: string;
}

function formatDuration(seconds: number | null): string {
  if (seconds === null || seconds === undefined) return '—';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  if (m === 0) return `${s}s`;
  return `${m}m ${s}s`;
}

function titleCase(value: string | null | undefined) {
  if (!value) return '—';
  return String(value).replace(/_/g, ' ').replace(/\s+/g, ' ').trim()
    .replace(/\b\w/g, c => c.toUpperCase());
}

export default function LeaderboardTabDrop({ roomId }: Props) {
  const [items, setItems] = useState<DropSummaryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [expandedItem, setExpandedItem] = useState<number | null>(null);
  const [fullEntries, setFullEntries] = useState<Record<number, DropLeaderboardEntry[]>>({});
  const [expandLoading, setExpandLoading] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    puzzleDropMgmtService.getPublicSummary(roomId)
      .then(res => { if (!cancelled) setItems(res.weeks || []); })
      .catch(e => { if (!cancelled) setError(e?.message || 'Failed to load leaderboard'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [roomId]);

  const toggleExpand = async (itemNumber: number) => {
    if (expandedItem === itemNumber) {
      setExpandedItem(null);
      return;
    }
    setExpandedItem(itemNumber);
    if (!fullEntries[itemNumber]) {
      setExpandLoading(itemNumber);
      try {
        const res = await puzzleDropMgmtService.getItemLeaderboard(roomId, itemNumber);
        setFullEntries(prev => ({ ...prev, [itemNumber]: res.entries || [] }));
      } catch (e) {
        console.error('[LeaderboardTabDrop] failed to load full leaderboard:', e);
        setFullEntries(prev => ({ ...prev, [itemNumber]: [] }));
      } finally {
        setExpandLoading(null);
      }
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-10">
        <Loader2 className="h-8 w-8 animate-spin text-[#7c3aed]" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-5">
        <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
          {error}
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="p-5">
        <div className="rounded-2xl border border-dashed border-[#dce1df] bg-[#fbf8f2] p-8 text-center">
          <Puzzle className="mx-auto mb-3 h-8 w-8 text-[#8a9bab]" />
          <p className="text-sm text-[#8a9bab]">
            No puzzles configured yet, or nobody's submitted a score.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3 p-5">
      {items.map(item => {
        const itemNumber = item.weekNumber; // backend field name — see getPublicDropSummary
        const isExpanded = expandedItem === itemNumber;
        const isLoadingFull = expandLoading === itemNumber;
        const entries = fullEntries[itemNumber] ?? item.top;

        return (
          <div key={itemNumber} className="overflow-hidden rounded-2xl border border-[#dce1df]">
            <button
              type="button"
              onClick={() => toggleExpand(itemNumber)}
              className="flex w-full items-center justify-between gap-4 bg-[#fbf8f2] px-4 py-3.5 text-left transition hover:bg-[#f1f0ee]"
            >
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[rgba(124,58,237,0.1)] text-xs font-bold text-[#7c3aed]">
                  {itemNumber}
                </span>
                <div>
                  <span className="text-sm font-semibold text-[#102532]">{titleCase(item.puzzleType)}</span>
                  <span className="ml-2 text-xs text-[#8a9bab] capitalize">{item.difficulty}</span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-[#8a9bab]">
                  {item.playerCount} player{item.playerCount !== 1 ? 's' : ''}
                </span>
                {isExpanded ? <ChevronUp className="h-4 w-4 text-[#8a9bab]" /> : <ChevronDown className="h-4 w-4 text-[#8a9bab]" />}
              </div>
            </button>

            {isExpanded && (
              <div className="divide-y divide-[#f6f1e8] bg-white">
                {isLoadingFull ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-5 w-5 animate-spin text-[#7c3aed]" />
                  </div>
                ) : entries.length === 0 ? (
                  <div className="px-4 py-6 text-center text-sm text-[#8a9bab]">
                    No submissions yet for this puzzle.
                  </div>
                ) : (
                  entries.map((entry, idx) => (
                    <div
                      key={`${entry.playerName}-${idx}`}
                      className={`flex items-center justify-between gap-4 px-4 py-3 ${idx === 0 ? 'bg-gradient-to-r from-[rgba(124,58,237,0.06)] to-white' : ''}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                          idx === 0 ? 'bg-[rgba(124,58,237,0.15)] text-[#7c3aed]' : 'bg-[#f1f0ee] text-[#52636f]'
                        }`}>
                          {idx === 0 ? <Crown className="h-3.5 w-3.5" /> : entry.rank}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-[#102532]">{entry.playerName}</p>
                          <p className="flex items-center gap-1.5 text-xs text-[#8a9bab]">
                            {entry.timeTakenSeconds !== null && <span>⏱ {formatDuration(entry.timeTakenSeconds)}</span>}
                            <span className={entry.isCorrect ? 'text-green-600' : 'text-rose-500'}>
                              {entry.isCorrect ? '✓ Correct' : '✗ Incorrect'}
                            </span>
                          </p>
                        </div>
                      </div>
                      <span className="text-sm font-bold text-[#52636f]">{entry.totalScore} pts</span>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        );
      })}

      <div className="flex items-center gap-2 rounded-xl border border-[rgba(124,58,237,0.2)] bg-[rgba(124,58,237,0.06)] px-4 py-2.5 text-xs font-medium text-[#7c3aed]">
        <Trophy className="h-3.5 w-3.5" />
        {items.length} puzzle{items.length !== 1 ? 's' : ''} in this Drop
      </div>
    </div>
  );
}