// src/components/puzzles/pages/PuzzleDropItemLeaderboardPage.tsx
//
// Public leaderboard for one Drop item. Modeled on
// PublicWeekLeaderboardPage.tsx's layout/medal styling, but calls
// puzzleDropPlayService's Drop-specific leaderboard methods instead of
// publicLeaderboardService (which is challenge/week-shaped and hits a
// different route tree) — the two components aren't directly shared
// since PublicWeekLeaderboardPage.tsx hardcodes its own service import
// rather than taking one as a prop.
//
// No branding fetch — same deliberate simplification as
// PuzzleDropPlayPage.tsx; default theme only.

import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { puzzleDropPlayService, type DropItemLeaderboard } from '../services/puzzleDropPlayService';
import PuzzlePageShell from '../ui/PuzzlePageShell';
import { resolvePuzzleTheme } from '../ui/puzzleTheme';

const MEDAL_STYLES: Record<number, string> = {
  1: 'bg-[#FFF2D9] text-[#8A5A00] border-[#F3D79B]',
  2: 'bg-[#EEF3FB] text-[#355C92] border-[#D6E2F2]',
  3: 'bg-[#FBEFDF] text-[#A6541E] border-[#EFCFAE]',
};
const MEDALS: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' };

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  if (m === 0) return `${s}s`;
  return `${m}m ${s}s`;
}

export default function PuzzleDropItemLeaderboardPage() {
  const { dropRoomId, itemNumber } = useParams<{ dropRoomId: string; itemNumber: string }>();
  const itemNum = parseInt(itemNumber ?? '1', 10);

  const [board, setBoard] = useState<DropItemLeaderboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);

  const theme = resolvePuzzleTheme(board?.challenge ?? null);

  useEffect(() => {
    if (!dropRoomId || !Number.isInteger(itemNum) || itemNum < 1) {
      setPageError('Leaderboard not found.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setPageError(null);

    puzzleDropPlayService
      .getItemLeaderboard(dropRoomId, itemNum)
      .then(setBoard)
      .catch((err: Error) => setPageError(err.message ?? 'Could not load the leaderboard.'))
      .finally(() => setLoading(false));
  }, [dropRoomId, itemNum]);

  if (loading) {
    return (
      <PuzzlePageShell theme={theme}>
        <div className="flex min-h-[50vh] items-center justify-center">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#D8D1C4] border-t-[var(--puzzle-primary)]" />
        </div>
      </PuzzlePageShell>
    );
  }

  if (pageError || !board) {
    return (
      <PuzzlePageShell theme={theme}>
        <div className="mx-auto max-w-xl rounded-[28px] border border-rose-200 bg-white p-8 text-center shadow-sm">
          <p className="mb-2 text-3xl">😕</p>
          <h1 className="mb-2 text-xl font-bold text-[#071A44]">Leaderboard unavailable</h1>
          <p className="text-sm text-[#6E6A63]">{pageError ?? 'This item has no public leaderboard.'}</p>
        </div>
      </PuzzlePageShell>
    );
  }

  const { challenge, puzzleType, difficulty, entries } = board;

  return (
    <PuzzlePageShell
      theme={theme}
      clubName={challenge.clubName ?? undefined}
      rightHeaderContent={
        <Link
          to={`/puzzle-drop/${dropRoomId}/leaderboard`}
          className="inline-flex items-center justify-center rounded-full border border-[#D8D1C4] bg-white px-5 py-2.5 text-sm font-semibold text-[#071A44] shadow-sm transition hover:bg-[#F8F5EF]"
        >
          ← All puzzles
        </Link>
      }
    >
      <div className="space-y-6">
        <section className="rounded-[36px] border border-[#E8E0D3] bg-white p-6 shadow-sm sm:p-8">
          <p className="mb-3 text-sm font-semibold uppercase tracking-[0.18em] text-[#E36B2C]">
            Puzzle {board.weekNumber} leaderboard
          </p>
          <h1 className="font-serif text-4xl leading-tight text-[#071A44] sm:text-5xl">{challenge.title}</h1>
          <p className="mt-3 text-sm capitalize text-[#6E6A63]">
            {puzzleType} · {difficulty} difficulty · {entries.length} player{entries.length !== 1 ? 's' : ''}
          </p>
        </section>

        {entries.length === 0 ? (
          <section className="rounded-[36px] border border-dashed border-[#D8D1C4] bg-white p-10 text-center shadow-sm">
            <p className="mb-3 text-4xl">🧩</p>
            <h2 className="font-serif text-3xl text-[#071A44]">No submissions yet</h2>
            <p className="mx-auto mt-3 max-w-md text-sm text-[#6E6A63]">Be the first name on this board.</p>
          </section>
        ) : (
          <section className="rounded-[36px] border border-[#E8E0D3] bg-white p-4 shadow-sm sm:p-6">
            <ol className="space-y-3">
              {entries.map(entry => (
                <li
                  key={`${entry.rank}-${entry.playerName}`}
                  className="flex items-center justify-between gap-3 rounded-[24px] border border-[#E8E0D3] bg-[#FBF8F3] p-4"
                >
                  <div className="flex min-w-0 items-center gap-4">
                    <div
                      className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-[18px] border text-lg font-bold shadow-sm ${
                        MEDAL_STYLES[entry.rank] ?? 'bg-white text-[#6E6A63] border-[#E8E0D3]'
                      }`}
                    >
                      {MEDALS[entry.rank] ?? entry.rank}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-base font-semibold text-[#071A44]">{entry.playerName}</p>
                      <p className="text-xs text-[#6E6A63]">
                        {entry.isCorrect ? '✓ Solved' : '✗ Attempted'}
                        {entry.submittedAt ? ` · ${new Date(entry.submittedAt).toLocaleDateString()}` : ''}
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {entry.timeTakenSeconds !== null ? (
                      <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-[#6E6A63] shadow-sm">
                        ⏱ {formatDuration(entry.timeTakenSeconds)}
                      </span>
                    ) : null}
                    <span className="rounded-full bg-white px-4 py-2 text-sm font-bold text-[#071A44] shadow-sm">
                      {entry.totalScore} pts
                    </span>
                  </div>
                </li>
              ))}
            </ol>
          </section>
        )}
      </div>
    </PuzzlePageShell>
  );
}