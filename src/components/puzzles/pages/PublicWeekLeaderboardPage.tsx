// src/components/puzzles/pages/PublicWeekLeaderboardPage.tsx
//
// PUBLIC page - no auth. Full leaderboard for one weekly puzzle.
// Shares the same visual language as the Puzzle Subscription dashboard.
//
// Notes:
// - No answers / solutions.
// - Public share URL.
// - Top 3 get a podium treatment.
// - Remaining standings stay compact.
// - Mobile-first and width-safe.

import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import { supporterAuthService } from '../services/SupporterAuthService';

import {
  publicLeaderboardService,
  type WeekLeaderboard,
} from '../services/publicLeaderboardService';

import PuzzlePageShell from '../ui/PuzzlePageShell';
import { resolvePuzzleTheme } from '../ui/puzzleTheme';
import { formatDuration } from './PublicWallOfFamePage';

const PUZZLE_TYPE_LABELS: Record<string, string> = {
  anagram: 'Anagram',
  sequenceOrdering: 'Sequence Ordering',
  matchPairs: 'Matching Pairs',
  wordSearch: 'Word Search',
  slidingTile: 'Sliding Tiles',
  sudoku: 'Sudoku',
  patternCompletion: 'Pattern Completion',
  wordLadder: 'Word Ladder',
  cryptogram: 'Cryptogram',
  numberPath: 'Number Path',
  towersOfHanoi: 'Towers of Hanoi',
  nonogram: 'Nonogram',
  memoryPairs: 'Memory Pairs',
};

export default function PublicWeekLeaderboardPage() {
  const { challengeId, week } = useParams<{
    challengeId: string;
    week: string;
  }>();

  const weekNumber = parseInt(week ?? '1', 10);

  const [board, setBoard] = useState<WeekLeaderboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);
  const [shareCopied, setShareCopied] = useState(false);

  const [isAuth] = useState(() =>
    supporterAuthService.isAuthenticated()
  );

  const theme = resolvePuzzleTheme(board?.challenge);

  useEffect(() => {
    if (
      !challengeId ||
      !Number.isInteger(weekNumber) ||
      weekNumber < 1
    ) {
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
        setPageError(
          err.message ??
            'Could not load the leaderboard.'
        )
      )
      .finally(() => setLoading(false));
  }, [challengeId, weekNumber]);

  const topThree = useMemo(
    () => board?.entries.slice(0, 3) ?? [],
    [board]
  );

  const remaining = useMemo(
    () => board?.entries.slice(3) ?? [],
    [board]
  );

  async function handleShare() {
    if (!board) return;

    const shareUrl = window.location.href;
    const puzzleLabel =
      PUZZLE_TYPE_LABELS[board.puzzleType] ??
      board.puzzleType;

    try {
      if (navigator.share) {
        await navigator.share({
          title: `${board.challenge.title} - Week ${board.weekNumber}`,
          text: `See the Week ${board.weekNumber} ${puzzleLabel} leaderboard.`,
          url: shareUrl,
        });
        return;
      }

      await navigator.clipboard.writeText(shareUrl);
      setShareCopied(true);
      window.setTimeout(
        () => setShareCopied(false),
        1800
      );
    } catch (err) {
      if ((err as DOMException)?.name !== 'AbortError') {
        console.warn(
          '[PublicWeekLeaderboardPage] Share failed:',
          err
        );
      }
    }
  }

  if (loading) {
    return (
      <PuzzlePageShell
        theme={theme}
        clubName={
          board?.challenge.clubName ?? undefined
        }
      >
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
          <h1 className="font-serif text-3xl text-[#071A44]">
            Leaderboard unavailable
          </h1>
          <p className="mt-3 text-sm text-[#6E6A63]">
            {pageError ??
              'This week has no public leaderboard.'}
          </p>
        </div>
      </PuzzlePageShell>
    );
  }

  const {
    challenge,
    puzzleType,
    difficulty,
    isFinal,
    entries,
  } = board;

  const puzzleLabel =
    PUZZLE_TYPE_LABELS[puzzleType] ?? puzzleType;

  return (
    <PuzzlePageShell
      theme={theme}
      clubName={challenge.clubName ?? undefined}
      rightHeaderContent={
        <div className="hidden items-center gap-2 sm:flex">
          {isAuth ? (
            <Link
              to={`/challenges/${challenge.id}/play`}
              className="inline-flex min-h-10 items-center justify-center rounded-full border border-[#D8D1C4] bg-white px-4 py-2 text-xs font-bold text-[#071A44] shadow-sm"
            >
              My puzzles
            </Link>
          ) : null}

          <Link
            to={`/leaderboards/${challenge.id}`}
            className="inline-flex min-h-10 items-center justify-center rounded-full border border-[#D8D1C4] bg-white px-4 py-2 text-xs font-bold text-[#071A44] shadow-sm"
          >
            Wall of Fame
          </Link>
        </div>
      }
    >
      <div className="mx-auto w-full min-w-0 max-w-5xl overflow-x-hidden">

        {/* HERO */}
        <section className="grid min-w-0 gap-5 overflow-hidden rounded-[28px] border border-[#E8E0D3] bg-white p-5 shadow-sm sm:p-7 lg:grid-cols-[1fr_0.8fr] lg:items-center">
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#E36B2C] sm:text-xs">
              Week {board.weekNumber} leaderboard
            </p>

            <h1 className="mt-2 break-words font-serif text-[2.4rem] leading-[1] text-[#071A44] sm:text-5xl">
              {puzzleLabel}
            </h1>

            <p className="mt-2 break-words text-sm leading-6 text-[#5F5A54] sm:text-base">
              {challenge.title}
            </p>

            <div className="mt-4 flex min-w-0 flex-wrap gap-2">
              <InfoPill
                label={`${difficulty} difficulty`}
              />
              <InfoPill
                label={`${entries.length} player${entries.length !== 1 ? 's' : ''}`}
              />
              <InfoPill
                label={
                  isFinal
                    ? 'Final results'
                    : 'Board still open'
                }
              />
            </div>

            <div className="mt-5 flex min-w-0 flex-col gap-2 sm:flex-row sm:flex-wrap">
              <button
                type="button"
                onClick={handleShare}
                className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl border border-[#D8D1C4] bg-[#FBF8F3] px-4 py-2.5 text-sm font-bold text-[#071A44] sm:w-auto"
              >
                <ShareIcon />
                {shareCopied
                  ? 'Link copied'
                  : 'Share leaderboard'}
              </button>

              <Link
                to={`/leaderboards/${challenge.id}`}
                className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl border border-[var(--puzzle-primary)] bg-white px-4 py-2.5 text-sm font-bold text-[var(--puzzle-primary)] sm:w-auto"
              >
                <TrophyIcon />
                Wall of Fame
              </Link>
            </div>
          </div>

          <div className="min-w-0 rounded-[24px] bg-[linear-gradient(135deg,#FBF8F3_0%,var(--puzzle-bg-accent)_100%)] p-4 sm:p-5">
            <div className="rounded-[20px] bg-white p-4 shadow-sm">
              <PuzzleArtwork puzzleType={puzzleType} />
            </div>
          </div>
        </section>

        {/* EMPTY */}
        {entries.length === 0 ? (
          <section className="mt-5 rounded-[28px] border border-dashed border-[#D8D1C4] bg-white p-8 text-center shadow-sm">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--puzzle-bg-accent)] text-[var(--puzzle-primary)]">
              <TrophyIcon className="h-7 w-7" />
            </div>

            <h2 className="mt-4 font-serif text-3xl text-[#071A44]">
              The podium is wide open
            </h2>

            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#6E6A63]">
              No one has posted a score yet.
            </p>
          </section>
        ) : (
          <>
            {/* PODIUM */}
            <section className="mt-5 rounded-[28px] border border-[#E8E0D3] bg-white p-5 shadow-sm sm:p-7">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#8A847B] sm:text-xs">
                    Top players
                  </p>
                  <h2 className="mt-1 font-serif text-3xl text-[#071A44]">
                    This week’s podium
                  </h2>
                </div>
              </div>

              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                {topThree.map(entry => (
                  <PodiumCard
                    key={`${entry.rank}-${entry.playerName}`}
                    entry={entry}
                  />
                ))}
              </div>
            </section>

            {/* REMAINING */}
            {remaining.length > 0 ? (
              <section className="mt-5 rounded-[28px] border border-[#E8E0D3] bg-white p-4 shadow-sm sm:p-6">
                <div className="mb-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#8A847B] sm:text-xs">
                    Full standings
                  </p>
                  <h2 className="mt-1 font-serif text-2xl text-[#071A44]">
                    Everyone else
                  </h2>
                </div>

                <ol className="space-y-2">
                  {remaining.map(entry => (
                    <li
                      key={`${entry.rank}-${entry.playerName}`}
                      className="flex min-w-0 items-center justify-between gap-3 rounded-2xl border border-[#E8E0D3] bg-[#FBF8F3] px-3 py-3 sm:px-4"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white text-sm font-black text-[#071A44] shadow-sm">
                          {entry.rank}
                        </div>

                        <div className="min-w-0">
                          <p className="truncate text-sm font-bold text-[#071A44]">
                            {entry.playerName}
                          </p>

                          <p className="mt-0.5 text-[10px] text-[#6E6A63]">
                            {entry.isCorrect
                              ? 'Solved'
                              : 'Attempted'}
                            {entry.submittedAt
                              ? ` · ${new Date(entry.submittedAt).toLocaleDateString()}`
                              : ''}
                          </p>
                        </div>
                      </div>

                      <div className="flex shrink-0 items-center gap-2">
                        {entry.timeTakenSeconds !== null ? (
                          <span className="hidden rounded-full bg-white px-2.5 py-1 text-[10px] font-semibold text-[#6E6A63] shadow-sm sm:inline-flex">
                            {formatDuration(
                              entry.timeTakenSeconds
                            )}
                          </span>
                        ) : null}

                        <span className="rounded-full bg-white px-3 py-1.5 text-xs font-black text-[#071A44] shadow-sm">
                          {entry.totalScore} pts
                        </span>
                      </div>
                    </li>
                  ))}
                </ol>
              </section>
            ) : null}
          </>
        )}
      </div>
    </PuzzlePageShell>
  );
}

function InfoPill({ label }: { label: string }) {
  return (
    <span className="rounded-full border border-[#E8E0D3] bg-[#FBF8F3] px-3 py-1.5 text-[10px] font-bold capitalize text-[#6E6A63] sm:text-xs">
      {label}
    </span>
  );
}

function PodiumCard({
  entry,
}: {
  entry: WeekLeaderboard['entries'][number];
}) {
  const rankStyle =
    entry.rank === 1
      ? 'bg-[#FFF2D9] border-[#F3D79B]'
      : entry.rank === 2
        ? 'bg-[#EEF3FB] border-[#D6E2F2]'
        : 'bg-[#FBEFDF] border-[#EFCFAE]';

  return (
    <article
      className={`min-w-0 rounded-[24px] border p-4 ${rankStyle}`}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="grid h-11 w-11 place-items-center rounded-2xl bg-white text-base font-black text-[#071A44] shadow-sm">
          #{entry.rank}
        </div>

        <TrophyIcon
          className={
            entry.rank === 1
              ? 'h-6 w-6 text-[#8A5A00]'
              : 'h-5 w-5 text-[#6E6A63]'
          }
        />
      </div>

      <h3 className="mt-4 truncate text-base font-black text-[#071A44]">
        {entry.playerName}
      </h3>

      <p className="mt-1 text-xs font-semibold text-[#6E6A63]">
        {entry.isCorrect ? 'Solved' : 'Attempted'}
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        {entry.timeTakenSeconds !== null ? (
          <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-bold text-[#6E6A63]">
            {formatDuration(entry.timeTakenSeconds)}
          </span>
        ) : null}

        <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-black text-[#071A44]">
          {entry.totalScore} pts
        </span>
      </div>
    </article>
  );
}

function PuzzleArtwork({
  puzzleType,
}: {
  puzzleType: string;
}) {
  if (
    puzzleType === 'wordLadder' ||
    puzzleType === 'anagram' ||
    puzzleType === 'cryptogram'
  ) {
    const rows =
      puzzleType === 'wordLadder'
        ? ['PLAY', '_ _ _ _', '_ _ _ _', 'SLAY']
        : puzzleType === 'anagram'
          ? ['R E A D', '↓', 'D A R E']
          : ['A → M', 'B → N', 'C → O'];

    return (
      <div className="mx-auto max-w-[220px] space-y-2">
        {rows.map((row, index) => (
          <div
            key={`${row}-${index}`}
            className={`rounded-xl border px-3 py-2 text-center text-sm font-black tracking-[0.16em] ${
              index === 0 ||
              index === rows.length - 1
                ? 'border-[#A8CDBA] bg-[#EFF8F1] text-[#286048]'
                : 'border-[#D8D1C4] bg-white text-[#7A746C]'
            }`}
          >
            {row}
          </div>
        ))}
      </div>
    );
  }

  if (
    puzzleType === 'sudoku' ||
    puzzleType === 'numberPath' ||
    puzzleType === 'nonogram'
  ) {
    const values =
      puzzleType === 'sudoku'
        ? ['5', '', '8', '', '3', '', '2', '', '9']
        : puzzleType === 'numberPath'
          ? ['1', '2', '', '', '3', '4', '7', '6', '5']
          : ['■', '', '■', '', '■', '', '■', '', '■'];

    return (
      <div className="mx-auto grid max-w-[190px] grid-cols-3 overflow-hidden rounded-xl border-2 border-[#89A4CC] bg-white">
        {values.map((value, index) => (
          <div
            key={index}
            className="grid aspect-square place-items-center border border-[#D3DEEE] text-sm font-black text-[#355C92]"
          >
            {value}
          </div>
        ))}
      </div>
    );
  }

  if (
    puzzleType === 'matchPairs' ||
    puzzleType === 'memoryPairs'
  ) {
    return (
      <div className="mx-auto grid max-w-[200px] grid-cols-2 gap-2">
        {['★', '♥', '♥', '★'].map(
          (value, index) => (
            <div
              key={index}
              className="grid aspect-[1.15/1] place-items-center rounded-xl border border-[#CDBDEB] bg-[#F4EEFF] text-3xl font-black text-[#7650B4]"
            >
              {value}
            </div>
          )
        )}
      </div>
    );
  }

  if (puzzleType === 'slidingTile') {
    return (
      <div className="mx-auto grid max-w-[190px] grid-cols-3 overflow-hidden rounded-xl border-2 border-[#E4AD72] bg-[#FFF7EC]">
        {[1, 2, 3, 4, 5, 6, 7, 8, ''].map(
          (value, index) => (
            <div
              key={index}
              className={`grid aspect-square place-items-center border border-[#EBC99F] text-sm font-black ${
                value === ''
                  ? 'bg-[#E1D4C4]'
                  : 'bg-[#FFF9F1] text-[#7B4A22]'
              }`}
            >
              {value}
            </div>
          )
        )}
      </div>
    );
  }

  return (
    <div className="mx-auto grid h-36 w-36 place-items-center rounded-[28px] border border-[#E8E0D3] bg-[var(--puzzle-bg-accent)] text-[var(--puzzle-primary)]">
      <PuzzleIcon className="h-14 w-14" />
    </div>
  );
}

function TrophyIcon({
  className = 'h-5 w-5',
}: {
  className?: string;
}) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path
        d="M8 4h8v4.4c0 3-1.7 5.1-4 5.1s-4-2.1-4-5.1V4Zm0 2H5v1.5c0 2.1 1.2 3.6 3.2 4M16 6h3v1.5c0 2.1-1.2 3.6-3.2 4M12 13.5V18m-3 2h6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ShareIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
      <path
        d="M12 3v11m0-11 4 4m-4-4L8 7M5 10v8a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-8"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function PuzzleIcon({
  className = 'h-5 w-5',
}: {
  className?: string;
}) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path
        d="M9.2 4.5h3.1a2.7 2.7 0 1 1 5.2 0H20v5.1a2.7 2.7 0 1 0 0 5.2V20h-5.2a2.7 2.7 0 1 0-5.2 0H4.5v-5.2a2.7 2.7 0 1 1 0-5.2V4.5h4.7Z"
        fill="currentColor"
      />
    </svg>
  );
}
