// src/components/mgtsystem/components/digitalEvents/tabs/LeaderboardTabSubscription.tsx
//
// Brings the standalone ChallengeLeaderboardPage's data into the drawer,
// rather than duplicating that page's full UI — getLeaderboard is the
// same endpoint, fetched once in DigitalEventDrawer alongside the
// challenge and passed down here (same pattern as auditView for
// Report/Approval).
//
// Rows expand to the same week-by-week breakdown as the full page
// (score, time, correct — never answers or solutions; the backend
// doesn't send them). Header links out to the full club page and the
// PUBLIC wall of fame, which is the shareable/recruitment URL.

import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { LeaderboardEntry } from '../../../../puzzles/services/ChallengeService';
import { ChevronDown, ChevronUp, Crown, ExternalLink, Globe, Trophy } from 'lucide-react';

interface Props {
  leaderboard: LeaderboardEntry[];
  leaderboardLoading: boolean;
  /** Challenge id — enables the full-page and public wall-of-fame links.
   *  Optional so the drawer still renders while the challenge resolves. */
  challengeId?: string;
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  if (m === 0) return `${s}s`;
  return `${m}m ${s}s`;
}

export default function LeaderboardTabSubscription({
  leaderboard,
  leaderboardLoading,
  challengeId,
}: Props) {
  const [expanded, setExpanded] = useState<number | null>(null);

  if (leaderboardLoading) {
    return (
      <div className="flex items-center justify-center p-10">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#e8ddfb] border-t-[#7c3aed]" />
      </div>
    );
  }

  if (!leaderboard.length) {
    return (
      <div className="p-5 text-sm text-[#52636f]">
        No submissions yet — the leaderboard fills in once subscribers start solving weekly puzzles.
      </div>
    );
  }

  return (
    <div className="space-y-3 p-5">
      {challengeId ? (
        <div className="flex flex-wrap items-center gap-2">
          <Link
            to={`/challenges/${challengeId}/leaderboard`}
            className="inline-flex items-center gap-1.5 rounded-full border border-[#dce1df] bg-white px-3.5 py-1.5 text-xs font-semibold text-[#102532] transition hover:bg-[#f6f1e8]"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Full leaderboard page
          </Link>

          <Link
            to={`/leaderboards/${challengeId}`}
            className="inline-flex items-center gap-1.5 rounded-full border border-[rgba(124,58,237,0.25)] bg-[rgba(124,58,237,0.06)] px-3.5 py-1.5 text-xs font-semibold text-[#7c3aed] transition hover:bg-[rgba(124,58,237,0.12)]"
          >
            <Globe className="h-3.5 w-3.5" />
            Public wall of fame
          </Link>
        </div>
      ) : null}

      <div className="overflow-hidden rounded-2xl border border-[#dce1df]">
        {leaderboard.map((entry, idx) => {
          const isExpanded = expanded === entry.playerId;

          return (
            <div key={entry.playerId} className="border-b border-[#f6f1e8] last:border-0">
              <button
                type="button"
                onClick={() => setExpanded(prev => (prev === entry.playerId ? null : entry.playerId))}
                className={`flex w-full items-center justify-between gap-4 px-4 py-3 text-left transition hover:bg-[#faf8f4] ${
                  idx === 0 ? 'bg-gradient-to-r from-[rgba(124,58,237,0.08)] to-white' : ''
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                      idx === 0 ? 'bg-[rgba(124,58,237,0.15)] text-[#7c3aed]' : 'bg-[#f1f0ee] text-[#52636f]'
                    }`}
                  >
                    {idx === 0 ? <Crown className="h-4 w-4" /> : entry.rank}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-[#102532]">{entry.playerName}</p>
                    <p className="text-xs text-[#8a9bab]">
                      {entry.weeksCompleted} week{entry.weeksCompleted !== 1 ? 's' : ''} completed
                    </p>
                  </div>
                </div>

                <div className="flex flex-shrink-0 items-center gap-2">
                  <span className="text-sm font-bold text-[#52636f]">{entry.totalScore} pts</span>
                  {isExpanded
                    ? <ChevronUp className="h-4 w-4 text-[#8a9bab]" />
                    : <ChevronDown className="h-4 w-4 text-[#8a9bab]" />}
                </div>
              </button>

              {isExpanded ? (
                <div className="space-y-1.5 bg-[#faf8f4] px-4 py-3">
                  {entry.weeks.length === 0 ? (
                    <p className="text-xs text-[#8a9bab]">No week data yet.</p>
                  ) : (
                    entry.weeks.map(week => (
                      <div
                        key={week.weekNumber}
                        className="flex items-center justify-between gap-3 rounded-xl bg-white px-3 py-2"
                      >
                        <div className="flex min-w-0 items-center gap-2">
                          <span className="text-xs font-semibold text-[#102532]">
                            Wk {week.weekNumber}
                          </span>
                          <span className="truncate text-xs capitalize text-[#8a9bab]">
                            {week.puzzleType}
                          </span>
                        </div>

                        <div className="flex flex-shrink-0 items-center gap-2 text-xs">
                          {week.timeTakenSeconds !== null && week.timeTakenSeconds !== undefined ? (
                            <span className="text-[#8a9bab]">⏱ {formatDuration(week.timeTakenSeconds)}</span>
                          ) : null}
                          <span className={week.isCorrect ? 'font-semibold text-[#157f85]' : 'font-semibold text-rose-600'}>
                            {week.isCorrect ? '✓' : '✗'}
                          </span>
                          <span className="font-semibold text-[#52636f]">{week.totalScore} pts</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              ) : null}
            </div>
          );
        })}

        <div className="flex items-center gap-2 border-t border-[rgba(124,58,237,0.2)] bg-[rgba(124,58,237,0.06)] px-4 py-2.5 text-xs font-medium text-[#7c3aed]">
          <Trophy className="h-3.5 w-3.5" />
          {leaderboard.length} player{leaderboard.length !== 1 ? 's' : ''} on the board
        </div>
      </div>
    </div>
  );
}