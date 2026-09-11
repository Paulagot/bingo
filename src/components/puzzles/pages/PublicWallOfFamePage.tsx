// src/components/puzzles/pages/PublicWallOfFamePage.tsx
//
// PUBLIC shareable Wall of Fame for Puzzle Subscription.
// One week = one podium. Designed to recruit/share as well as celebrate scores.
// Scales to long challenges by showing unlocked/recent weeks first.

import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import { supporterAuthService } from '../services/SupporterAuthService';

import {
  publicLeaderboardService,
  type LeaderboardSummary,
  type WeekSummary,
} from '../services/publicLeaderboardService';

import PuzzlePageShell from '../ui/PuzzlePageShell';
import { resolvePuzzleTheme } from '../ui/puzzleTheme';

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

export function formatDuration(
  seconds: number
): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);

  if (m === 0) return `${s}s`;
  return `${m}m ${s}s`;
}

export default function PublicWallOfFamePage() {
  const { challengeId } = useParams<{
    challengeId: string;
  }>();

  const [summary, setSummary] =
    useState<LeaderboardSummary | null>(null);

  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] =
    useState<string | null>(null);

  const [showAll, setShowAll] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);

  const [isAuth] = useState(() =>
    supporterAuthService.isAuthenticated()
  );

  const theme = resolvePuzzleTheme(
    summary?.challenge
  );

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
        setPageError(
          err.message ??
            'Could not load the leaderboard.'
        )
      )
      .finally(() => setLoading(false));
  }, [challengeId]);

  const visibleWeeks = useMemo(() => {
    if (!summary) return [];

    const unlocked =
      summary.weeks.filter(week => week.isUnlocked);

    if (showAll || unlocked.length <= 8) {
      return unlocked;
    }

    return unlocked.slice(-8);
  }, [summary, showAll]);

  async function handleShare() {
    if (!summary) return;

    const shareUrl = window.location.href;

    try {
      if (navigator.share) {
        await navigator.share({
          title: `${summary.challenge.title} - Wall of Fame`,
          text:
            'See the top puzzle solvers and join the weekly challenge.',
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
          '[PublicWallOfFamePage] Share failed:',
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
          summary?.challenge.clubName ?? undefined
        }
      >
        <div className="flex min-h-[50vh] items-center justify-center">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#D8D1C4] border-t-[var(--puzzle-primary)]" />
        </div>
      </PuzzlePageShell>
    );
  }

  if (pageError || !summary) {
    return (
      <PuzzlePageShell theme={theme}>
        <div className="mx-auto max-w-xl rounded-[28px] border border-rose-200 bg-white p-8 text-center shadow-sm">
          <h1 className="font-serif text-3xl text-[#071A44]">
            Leaderboard unavailable
          </h1>

          <p className="mt-3 text-sm text-[#6E6A63]">
            {pageError ??
              'This challenge has no public leaderboard.'}
          </p>
        </div>
      </PuzzlePageShell>
    );
  }

  const {
    challenge,
    isFinal,
    weeks,
  } = summary;

  const unlockedWeeks =
    weeks.filter(week => week.isUnlocked);

  const totalPlayers = Math.max(
    0,
    ...weeks.map(week => week.playerCount)
  );

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

          <span
            className={`rounded-full px-3 py-2 text-xs font-bold ${
              isFinal
                ? 'bg-[#FFF2D9] text-[#8A5A00]'
                : 'bg-[#EEF8EF] text-[#2E6A46]'
            }`}
          >
            {isFinal
              ? 'Final results'
              : 'Challenge in progress'}
          </span>
        </div>
      }
    >
      <div className="mx-auto w-full min-w-0 max-w-6xl overflow-x-hidden">

        {/* HERO */}
        <section className="grid min-w-0 gap-5 overflow-hidden rounded-[28px] border border-[#E8E0D3] bg-white p-5 shadow-sm sm:p-7 lg:grid-cols-[1fr_0.7fr] lg:items-center">
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#E36B2C] sm:text-xs">
              Wall of Fame
            </p>

            <h1 className="mt-2 break-words font-serif text-[2.5rem] leading-[1] text-[#071A44] sm:text-5xl">
              {challenge.title}
            </h1>

            <p className="mt-3 max-w-2xl break-words text-sm leading-6 text-[#5F5A54] sm:text-base">
              Every week has its own podium. See who
              cracked each puzzle fastest and scored
              highest.
            </p>

            <div className="mt-4 flex flex-wrap gap-2">
              <InfoPill
                label={`${unlockedWeeks.length} unlocked`}
              />
              <InfoPill
                label={`${challenge.totalWeeks} total`}
              />
              {totalPlayers > 0 ? (
                <InfoPill
                  label={`${totalPlayers} player${totalPlayers !== 1 ? 's' : ''}`}
                />
              ) : null}
            </div>

            <div className="mt-5 flex min-w-0 flex-col gap-2 sm:flex-row sm:flex-wrap">
              {!isFinal ? (
                <Link
                  to={`/join/puzzle/challenge/${challenge.id}`}
                  className="inline-flex min-h-11 w-full items-center justify-center rounded-2xl bg-[var(--puzzle-primary)] px-5 py-3 text-sm font-black text-[var(--puzzle-text-on-primary)] shadow-sm sm:w-auto"
                >
                  Join the challenge
                </Link>
              ) : null}

              <button
                type="button"
                onClick={handleShare}
                className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl border border-[#D8D1C4] bg-[#FBF8F3] px-4 py-2.5 text-sm font-bold text-[#071A44] sm:w-auto"
              >
                <ShareIcon />
                {shareCopied
                  ? 'Link copied'
                  : 'Share Wall of Fame'}
              </button>
            </div>
          </div>

          <div className="min-w-0 rounded-[24px] bg-[linear-gradient(135deg,#FFF8EA_0%,#F4EEFF_100%)] p-5">
            <div className="mx-auto max-w-[260px] rounded-[22px] bg-white p-5 text-center shadow-sm">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[20px] bg-[var(--puzzle-primary)] text-[var(--puzzle-text-on-primary)]">
                <TrophyIcon className="h-8 w-8" />
              </div>

              <p className="mt-4 font-serif text-2xl text-[#071A44]">
                Weekly podiums
              </p>

              <p className="mt-2 text-xs leading-5 text-[#6E6A63]">
                Each unlocked puzzle has its own top
                three.
              </p>
            </div>
          </div>
        </section>

        {/* WEEK PODIUMS */}
        <section className="mt-5 rounded-[28px] border border-[#E8E0D3] bg-white p-5 shadow-sm sm:p-7">
          <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#8A847B] sm:text-xs">
                Weekly results
              </p>

              <h2 className="mt-1 font-serif text-3xl text-[#071A44] sm:text-4xl">
                Puzzle podiums
              </h2>
            </div>

            {unlockedWeeks.length > 8 ? (
              <button
                type="button"
                onClick={() =>
                  setShowAll(value => !value)
                }
                className="inline-flex min-h-10 shrink-0 items-center justify-center rounded-full border border-[#D8D1C4] bg-[#FBF8F3] px-4 py-2 text-xs font-bold text-[#071A44]"
              >
                {showAll
                  ? 'Show recent'
                  : `View all ${unlockedWeeks.length}`}
              </button>
            ) : null}
          </div>

          {visibleWeeks.length === 0 ? (
            <div className="mt-5 rounded-2xl border border-dashed border-[#D8D1C4] bg-[#FBF8F3] p-8 text-center">
              <p className="text-sm text-[#6E6A63]">
                No puzzle boards are unlocked yet.
              </p>
            </div>
          ) : (
            <div className="mt-6 grid min-w-0 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {visibleWeeks.map(week => (
                <WeekPodiumCard
                  key={week.weekNumber}
                  week={week}
                  challengeId={challenge.id}
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </PuzzlePageShell>
  );
}

function InfoPill({ label }: { label: string }) {
  return (
    <span className="rounded-full border border-[#E8E0D3] bg-[#FBF8F3] px-3 py-1.5 text-[10px] font-bold text-[#6E6A63] sm:text-xs">
      {label}
    </span>
  );
}

function WeekPodiumCard({
  week,
  challengeId,
}: {
  week: WeekSummary;
  challengeId: string;
}) {
  const label =
    PUZZLE_TYPE_LABELS[week.puzzleType] ??
    week.puzzleType;

  return (
    <article className="min-w-0 overflow-hidden rounded-[24px] border border-[#E8E0D3] bg-[#FBF8F3] p-4">
      <div className="flex min-w-0 items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[9px] font-black uppercase tracking-wide text-[#8A847B]">
            Week {week.weekNumber}
          </p>

          <h3 className="mt-1 truncate text-base font-black text-[#071A44]">
            {label}
          </h3>

          <p className="mt-1 text-[10px] capitalize text-[#6E6A63]">
            {week.difficulty} · {week.playerCount}{' '}
            player{week.playerCount !== 1 ? 's' : ''}
          </p>
        </div>

        <Link
          to={`/leaderboards/${challengeId}/weeks/${week.weekNumber}`}
          className="shrink-0 rounded-full border border-[#D8D1C4] bg-white px-3 py-1.5 text-[10px] font-black text-[#071A44]"
        >
          Full board
        </Link>
      </div>

      <div className="mt-4 rounded-[18px] bg-white p-3">
        <PuzzleArtwork
          puzzleType={week.puzzleType}
        />
      </div>

      {week.top.length === 0 ? (
        <p className="mt-4 rounded-xl border border-dashed border-[#D8D1C4] bg-white p-3 text-center text-xs text-[#6E6A63]">
          Podium wide open.
        </p>
      ) : (
        <ol className="mt-4 space-y-2">
          {week.top.map(entry => (
            <li
              key={entry.rank}
              className="flex min-w-0 items-center justify-between gap-2 rounded-xl bg-white px-3 py-2"
            >
              <div className="flex min-w-0 items-center gap-2">
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-[#FBF8F3] text-[10px] font-black text-[#071A44]">
                  {entry.rank}
                </span>

                <span className="truncate text-xs font-bold text-[#071A44]">
                  {entry.playerName}
                </span>
              </div>

              <span className="shrink-0 text-[10px] font-black text-[#6E6A63]">
                {entry.totalScore} pts
              </span>
            </li>
          ))}
        </ol>
      )}
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
        ? ['PLAY', '_ _ _ _', 'SLAY']
        : puzzleType === 'anagram'
          ? ['R E A D', 'D A R E']
          : ['A → M', 'B → N', 'C → O'];

    return (
      <div className="mx-auto max-w-[130px] space-y-1.5">
        {rows.map((row, index) => (
          <div
            key={`${row}-${index}`}
            className={`rounded-lg border px-2 py-1.5 text-center text-[8px] font-black tracking-[0.14em] ${
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
    return (
      <div className="mx-auto grid max-w-[110px] grid-cols-3 overflow-hidden rounded-lg border-2 border-[#89A4CC] bg-white">
        {['5', '', '8', '', '3', '', '2', '', '9'].map(
          (value, index) => (
            <div
              key={index}
              className="grid aspect-square place-items-center border border-[#D3DEEE] text-[8px] font-black text-[#355C92]"
            >
              {value}
            </div>
          )
        )}
      </div>
    );
  }

  if (
    puzzleType === 'matchPairs' ||
    puzzleType === 'memoryPairs'
  ) {
    return (
      <div className="mx-auto grid max-w-[120px] grid-cols-2 gap-1.5">
        {['★', '♥', '♥', '★'].map(
          (value, index) => (
            <div
              key={index}
              className="grid aspect-[1.15/1] place-items-center rounded-lg border border-[#CDBDEB] bg-[#F4EEFF] text-base font-black text-[#7650B4]"
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
      <div className="mx-auto grid max-w-[110px] grid-cols-3 overflow-hidden rounded-lg border-2 border-[#E4AD72] bg-[#FFF7EC]">
        {[1, 2, 3, 4, 5, 6, 7, 8, ''].map(
          (value, index) => (
            <div
              key={index}
              className={`grid aspect-square place-items-center border border-[#EBC99F] text-[8px] font-black ${
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
    <div className="mx-auto grid h-20 w-20 place-items-center rounded-2xl bg-[var(--puzzle-bg-accent)] text-[var(--puzzle-primary)]">
      <PuzzleIcon className="h-8 w-8" />
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
