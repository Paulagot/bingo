// src/components/puzzles/pages/PublicWallOfFamePage.tsx
//
// PUBLIC page — no auth. The shareable "wall of fame" for a challenge:
// one card per week showing the top 3, linking through to each week's full
// board. Doubles as the recruitment page: visitors see the podiums and a
// join button. Never shows answers, solutions, or emails.

import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  publicLeaderboardService,
  type LeaderboardSummary,
  type WeekSummary,
} from '../services/publicLeaderboardService';
import PuzzlePageShell from '../ui/PuzzlePageShell';

const PUZZLE_TYPE_LABELS: Record<string, string> = {
  anagram: 'Anagram',
  sequenceOrdering: 'Sequence Ordering',
  matchPairs: 'Match Pairs',
  wordSearch: 'Word Search',
  slidingTile: 'Sliding Tile',
  sudoku: 'Sudoku',
  patternCompletion: 'Pattern Completion',
  wordLadder: 'Word Ladder',
  cryptogram: 'Cryptogram',
  numberPath: 'Number Path',
  towersOfHanoi: 'Towers of Hanoi',
  nonogram: 'Nonogram',
  memoryPairs: 'Memory Pairs',
};

const MEDALS = ['🥇', '🥈', '🥉'];

export function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  if (m === 0) return `${s}s`;
  return `${m}m ${s}s`;
}

export default function PublicWallOfFamePage() {
  const { challengeId } = useParams<{ challengeId: string }>();

  const [summary, setSummary] = useState<LeaderboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);

  useEffect(() => {
    if (!challengeId) {
      setPageError('Challenge not found.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setPageError(null);

    publicLeaderboardService
      .getSummary(challengeId)
      .then(setSummary)
      .catch((err: Error) =>
        setPageError(err.message ?? 'Could not load the leaderboard.')
      )
      .finally(() => setLoading(false));
  }, [challengeId]);

  if (loading) {
    return (
      <PuzzlePageShell>
        <div className="flex min-h-[50vh] items-center justify-center">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#D8D1C4] border-t-[#157F85]" />
        </div>
      </PuzzlePageShell>
    );
  }

  if (pageError || !summary) {
    return (
      <PuzzlePageShell>
        <div className="mx-auto max-w-xl rounded-[28px] border border-rose-200 bg-white p-8 text-center shadow-sm">
          <p className="mb-2 text-3xl">😕</p>
          <h1 className="mb-2 text-xl font-bold text-[#071A44]">
            Leaderboard unavailable
          </h1>
          <p className="text-sm text-[#6E6A63]">
            {pageError ?? 'This challenge has no public leaderboard.'}
          </p>
        </div>
      </PuzzlePageShell>
    );
  }

  const { challenge, isFinal, weeks } = summary;
  const openWeeks = weeks.filter(week => week.isUnlocked);
  const totalPlayers = Math.max(0, ...weeks.map(week => week.playerCount));

  return (
    <PuzzlePageShell
      rightHeaderContent={
        <div
          className={`rounded-2xl border px-4 py-2 shadow-sm ${
            isFinal
              ? 'border-[#F3D79B] bg-[#FFF2D9]'
              : 'border-[#D8E8D8] bg-[#EEF8EF]'
          }`}
        >
          <p
            className={`text-sm font-semibold ${
              isFinal ? 'text-[#8A5A00]' : 'text-[#2E6A46]'
            }`}
          >
            {isFinal ? 'Final results' : 'Challenge in progress'}
          </p>
          <p className={`text-xs ${isFinal ? 'text-[#A6842E]' : 'text-[#5F7D6A]'}`}>
            {isFinal
              ? 'These podiums are locked in'
              : 'Boards update as players submit'}
          </p>
        </div>
      }
    >
      <div className="space-y-6">
        <section className="rounded-[36px] border border-[#E8E0D3] bg-white p-6 shadow-sm sm:p-8">
          <p className="mb-3 text-sm font-semibold uppercase tracking-[0.18em] text-[#E36B2C]">
            Wall of fame
          </p>

          <h1 className="font-serif text-4xl leading-tight text-[#071A44] sm:text-5xl">
            {challenge.title}
          </h1>

          <p className="mt-4 max-w-2xl text-base leading-relaxed text-[#5F5A54]">
            The top solvers for each weekly puzzle. Everyone plays the same
            puzzles from week one, whenever they join — so every board below
            is a fair, head-to-head contest.
          </p>

          {!isFinal ? (
            <Link
              to={`/challenges/${challenge.id}/play`}
              className="mt-6 inline-flex items-center justify-center rounded-full bg-[#071A44] px-7 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#12295C]"
            >
              Join the challenge →
            </Link>
          ) : null}

          <p className="mt-5 text-sm text-[#6E6A63]">
            {openWeeks.length} of {challenge.totalWeeks} puzzles unlocked
            {totalPlayers > 0 ? ` · ${totalPlayers} players competing` : ''}
          </p>
        </section>

        <div className="grid gap-4 sm:grid-cols-2">
          {weeks.map(week => (
            <WeekPodiumCard
              key={week.weekNumber}
              week={week}
              challengeId={challenge.id}
            />
          ))}
        </div>
      </div>
    </PuzzlePageShell>
  );
}

function WeekPodiumCard({
  week,
  challengeId,
}: {
  week: WeekSummary;
  challengeId: string;
}) {
  const label = PUZZLE_TYPE_LABELS[week.puzzleType] ?? week.puzzleType;

  if (!week.isUnlocked) {
    return (
      <div className="rounded-[28px] border border-dashed border-[#D8D1C4] bg-white p-5 shadow-sm">
        <p className="text-sm font-semibold text-[#071A44]">
          Week {week.weekNumber} · {label}
        </p>
        <p className="mt-3 text-sm text-[#6E6A63]">🔒 Not unlocked yet.</p>
      </div>
    );
  }

  return (
    <div className="rounded-[28px] border border-[#E8E0D3] bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-[#071A44]">
            Week {week.weekNumber} · {label}
          </p>
          <p className="mt-1 text-xs capitalize text-[#6E6A63]">
            {week.difficulty} · {week.playerCount} player
            {week.playerCount !== 1 ? 's' : ''}
          </p>
        </div>

        <Link
          to={`/leaderboards/${challengeId}/weeks/${week.weekNumber}`}
          className="shrink-0 rounded-full border border-[#D8D1C4] bg-white px-4 py-2 text-xs font-semibold text-[#071A44] transition hover:bg-[#F8F5EF]"
        >
          Full board →
        </Link>
      </div>

      {week.top.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-[#D8D1C4] bg-[#FBF8F3] p-4 text-center text-sm text-[#6E6A63]">
          No one has cracked this one yet — the podium is wide open.
        </p>
      ) : (
        <ol className="space-y-2">
          {week.top.map(entry => (
            <li
              key={entry.rank}
              className="flex items-center justify-between gap-3 rounded-2xl bg-[#FBF8F3] px-4 py-2.5"
            >
              <div className="flex min-w-0 items-center gap-3">
                <span className="text-xl">{MEDALS[entry.rank - 1] ?? entry.rank}</span>
                <span className="truncate text-sm font-semibold text-[#071A44]">
                  {entry.playerName}
                </span>
              </div>

              <div className="flex shrink-0 items-center gap-2 text-xs text-[#6E6A63]">
                {entry.timeTakenSeconds !== null ? (
                  <span>⏱ {formatDuration(entry.timeTakenSeconds)}</span>
                ) : null}
                <span className="rounded-full bg-white px-3 py-1 font-semibold text-[#071A44] shadow-sm">
                  {entry.totalScore} pts
                </span>
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}