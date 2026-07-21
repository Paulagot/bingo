// src/components/puzzles/pages/PublicWeekLeaderboardPage.tsx
//
// PUBLIC page — no auth. The full leaderboard for one week's puzzle.
// Rolling until the challenge completes: late joiners always start at
// puzzle 1, so this board can gain entries at any time. Never shows
// answers or solutions.

import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { supporterAuthService } from '../services/SupporterAuthService';
import {
  publicLeaderboardService,
  type WeekLeaderboard,
} from '../services/publicLeaderboardService';
import PuzzlePageShell from '../ui/PuzzlePageShell';
import { resolvePuzzleTheme } from '../ui/puzzleTheme';
import { formatDuration } from './PublicWallOfFamePage';

const MEDAL_STYLES: Record<number, string> = {
  1: 'bg-[#FFF2D9] text-[#8A5A00] border-[#F3D79B]',
  2: 'bg-[#EEF3FB] text-[#355C92] border-[#D6E2F2]',
  3: 'bg-[#FBEFDF] text-[#A6541E] border-[#EFCFAE]',
};

const MEDALS: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' };

export default function PublicWeekLeaderboardPage() {
  const { challengeId, week } = useParams<{
    challengeId: string;
    week: string;
  }>();

  const weekNumber = parseInt(week ?? '1', 10);

  const [board, setBoard] = useState<WeekLeaderboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);

  // Same "read once on mount" tradeoff as PublicWallOfFamePage — this is
  // a public page a stranger might land on, so the link only shows for
  // someone who's already a logged-in supporter.
  const [isAuth] = useState(() => supporterAuthService.isAuthenticated());

  // Same resolvePuzzleTheme(...challenge) pattern as PublicWallOfFamePage —
  // WeekLeaderboard.challenge is the same PublicChallengeMeta shape.
  const theme = resolvePuzzleTheme(board?.challenge);

  useEffect(() => {
    if (!challengeId || !Number.isInteger(weekNumber) || weekNumber < 1) {
      setPageError('Leaderboard not found.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setPageError(null);

    publicLeaderboardService
      .getWeekLeaderboard(challengeId, weekNumber)
      .then(setBoard)
      .catch((err: Error) =>
        setPageError(err.message ?? 'Could not load the leaderboard.')
      )
      .finally(() => setLoading(false));
  }, [challengeId, weekNumber]);

  if (loading) {
    return (
      <PuzzlePageShell theme={theme} clubName={board?.challenge.clubName ?? undefined}>
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
          <h1 className="mb-2 text-xl font-bold text-[#071A44]">
            Leaderboard unavailable
          </h1>
          <p className="text-sm text-[#6E6A63]">
            {pageError ?? 'This week has no public leaderboard.'}
          </p>
        </div>
      </PuzzlePageShell>
    );
  }

  const { challenge, puzzleType, difficulty, isFinal, entries } = board;

  return (
    <PuzzlePageShell
      theme={theme}
      clubName={challenge.clubName ?? undefined}
      rightHeaderContent={
        <div className="flex flex-wrap items-center justify-end gap-2">
          {isAuth ? (
            <Link
              to={`/challenges/${challenge.id}/play`}
              className="inline-flex items-center justify-center rounded-full border border-[#D8D1C4] bg-white px-5 py-2.5 text-sm font-semibold text-[#071A44] shadow-sm transition hover:bg-[#F8F5EF]"
            >
              My puzzles →
            </Link>
          ) : null}

          <Link
            to={`/leaderboards/${challenge.id}`}
            className="inline-flex items-center justify-center rounded-full border border-[#D8D1C4] bg-white px-5 py-2.5 text-sm font-semibold text-[#071A44] shadow-sm transition hover:bg-[#F8F5EF]"
          >
            ← Wall of fame
          </Link>
        </div>
      }
    >
      <div className="space-y-6">
        <section className="rounded-[36px] border border-[#E8E0D3] bg-white p-6 shadow-sm sm:p-8">
          <p className="mb-3 text-sm font-semibold uppercase tracking-[0.18em] text-[#E36B2C]">
            Week {board.weekNumber} leaderboard
          </p>

          <h1 className="font-serif text-4xl leading-tight text-[#071A44] sm:text-5xl">
            {challenge.title}
          </h1>

          <p className="mt-3 text-sm capitalize text-[#6E6A63]">
            {puzzleType} · {difficulty} difficulty · {entries.length} player
            {entries.length !== 1 ? 's' : ''}
          </p>

          <p
            className={`mt-4 inline-flex rounded-full px-4 py-2 text-xs font-semibold ${
              isFinal
                ? 'bg-[#FFF2D9] text-[#8A5A00]'
                : 'bg-[#EEF8EF] text-[#2E6A46]'
            }`}
          >
            {isFinal
              ? '🏁 Final — the challenge has finished'
              : '⏳ Still open — new players can enter this board'}
          </p>
        </section>

        {entries.length === 0 ? (
          <section className="rounded-[36px] border border-dashed border-[#D8D1C4] bg-white p-10 text-center shadow-sm">
            <p className="mb-3 text-4xl">🧩</p>
            <h2 className="font-serif text-3xl text-[#071A44]">
              No submissions yet
            </h2>
            <p className="mx-auto mt-3 max-w-md text-sm text-[#6E6A63]">
              Be the first name on this board.
            </p>
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
                        MEDAL_STYLES[entry.rank] ??
                        'bg-white text-[#6E6A63] border-[#E8E0D3]'
                      }`}
                    >
                      {MEDALS[entry.rank] ?? entry.rank}
                    </div>

                    <div className="min-w-0">
                      <p className="truncate text-base font-semibold text-[#071A44]">
                        {entry.playerName}
                      </p>
                      <p className="text-xs text-[#6E6A63]">
                        {entry.isCorrect ? '✓ Solved' : '✗ Attempted'}
                        {entry.submittedAt
                          ? ` · ${new Date(entry.submittedAt).toLocaleDateString()}`
                          : ''}
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