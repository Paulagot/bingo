// src/components/puzzles/pages/PuzzleDropItemLeaderboardPage.tsx
//
// Public leaderboard for one Puzzle Drop item.
//
// Visual direction:
// - Same club-branded Puzzle Drop family as the landing page and Wall of Fame.
// - Hero identifies the exact puzzle clearly.
// - Top three get a proper podium treatment.
// - Remaining players use a compact mobile-friendly ranking list.
// - Existing Drop leaderboard API only — no backend change required.

import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import {
  puzzleDropPlayService,
  type DropItemLeaderboard,
} from '../services/puzzleDropPlayService';

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

function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);

  if (minutes === 0) return `${secs}s`;
  return `${minutes}m ${secs}s`;
}

function TrophyIcon({ className = 'h-5 w-5' }: { className?: string }) {
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

function ClockIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
      <circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" strokeWidth="1.7" />
      <path d="M12 7v5l3 2" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
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

export default function PuzzleDropItemLeaderboardPage() {
  const { dropRoomId, itemNumber } = useParams<{
    dropRoomId: string;
    itemNumber: string;
  }>();

  const itemNum = parseInt(itemNumber ?? '1', 10);

  const [board, setBoard] = useState<DropItemLeaderboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);
  const [shareCopied, setShareCopied] = useState(false);

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
      .catch((err: Error) =>
        setPageError(err.message ?? 'Could not load the leaderboard.'),
      )
      .finally(() => setLoading(false));
  }, [dropRoomId, itemNum]);

  async function handleShare() {
    if (!board) return;

    const puzzleName =
      PUZZLE_TYPE_LABELS[board.puzzleType] ?? board.puzzleType;

    const url = window.location.href;
    const shareData = {
      title: `${puzzleName} leaderboard — ${board.challenge.title}`,
      text: `See who's leading ${puzzleName}. Think you can beat the top score?`,
      url,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
        return;
      }

      await navigator.clipboard.writeText(url);
      setShareCopied(true);
      window.setTimeout(() => setShareCopied(false), 1800);
    } catch (err) {
      if ((err as DOMException)?.name !== 'AbortError') {
        console.warn('[PuzzleDropItemLeaderboardPage] Share failed:', err);
      }
    }
  }

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
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#FBF8F3] text-[#8A847B]">
            <TrophyIcon className="h-7 w-7" />
          </div>
          <h1 className="mt-4 text-xl font-bold text-[#071A44]">
            Leaderboard unavailable
          </h1>
          <p className="mt-2 text-sm text-[#6E6A63]">
            {pageError ?? 'This puzzle has no public leaderboard.'}
          </p>
        </div>
      </PuzzlePageShell>
    );
  }

  const { challenge, puzzleType, difficulty, entries } = board;
  const puzzleName = PUZZLE_TYPE_LABELS[puzzleType] ?? puzzleType;

  const topThree = entries.slice(0, 3);
  const remaining = entries.slice(3);

  return (
    <PuzzlePageShell
      theme={theme}
      clubName={challenge.clubName ?? undefined}
      rightHeaderContent={
        <Link
          to={`/puzzle-drop/${dropRoomId}/leaderboard`}
          className="inline-flex min-h-10 items-center justify-center rounded-full border border-[#D8D1C4] bg-white px-4 py-2 text-xs font-semibold text-[#071A44] shadow-sm transition hover:bg-[#F8F5EF] sm:min-h-11 sm:px-5 sm:text-sm"
        >
          ← All leaderboards
        </Link>
      }
    >
      <div className="mx-auto max-w-5xl space-y-6">
        {/* ── HERO ─────────────────────────────────────────────────────────── */}
        <section className="relative overflow-hidden rounded-[36px] border border-[#E8E0D3] bg-white p-6 shadow-sm sm:p-8 lg:p-10">
          <div
            className="pointer-events-none absolute inset-x-0 top-0 h-2"
            style={{ background: 'var(--puzzle-primary)' }}
          />

          <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0">
              <div className="inline-flex items-center gap-2 rounded-full bg-[var(--puzzle-bg-accent)] px-3 py-1.5 text-xs font-bold uppercase tracking-[0.16em] text-[var(--puzzle-primary)]">
                <TrophyIcon className="h-4 w-4" />
                Puzzle {board.weekNumber} leaderboard
              </div>

              <h1 className="mt-5 font-serif text-4xl leading-tight text-[#071A44] sm:text-5xl">
                {puzzleName}
              </h1>

              <p className="mt-2 text-base font-semibold text-[var(--puzzle-primary)]">
                {challenge.title}
              </p>

              <div className="mt-5 flex flex-wrap gap-2">
                <span className="rounded-full border border-[#E8E0D3] bg-[#FBF8F3] px-3 py-1.5 text-xs font-semibold capitalize text-[#6E6A63]">
                  {difficulty} difficulty
                </span>
                <span className="rounded-full border border-[#E8E0D3] bg-[#FBF8F3] px-3 py-1.5 text-xs font-semibold text-[#6E6A63]">
                  {entries.length} player{entries.length !== 1 ? 's' : ''}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleShare}
              className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-full border border-[var(--puzzle-primary)] bg-white px-5 py-2.5 text-sm font-semibold text-[var(--puzzle-primary)] transition hover:bg-[var(--puzzle-bg-accent)]"
            >
              <ShareIcon />
              {shareCopied ? 'Link copied!' : 'Share leaderboard'}
            </button>
          </div>
        </section>

        {entries.length === 0 ? (
          <section className="rounded-[36px] border border-dashed border-[#D8D1C4] bg-white p-8 text-center shadow-sm sm:p-12">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[22px] bg-[var(--puzzle-bg-accent)] text-[var(--puzzle-primary)]">
              <TrophyIcon className="h-8 w-8" />
            </div>

            <h2 className="mt-5 font-serif text-3xl text-[#071A44]">
              The top spot is waiting
            </h2>

            <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-[#6E6A63]">
              No one has submitted a score yet. Be the first player to claim
              the bragging rights.
            </p>

            <Link
              to={`/puzzle-drop/${challenge.id}`}
              className="mt-6 inline-flex min-h-11 items-center justify-center rounded-full bg-[var(--puzzle-primary)] px-6 py-2.5 text-sm font-semibold text-[var(--puzzle-text-on-primary)]"
            >
              Get this puzzle →
            </Link>
          </section>
        ) : (
          <>
            {/* ── TOP THREE ────────────────────────────────────────────────── */}
            <section>
              <div className="mb-4">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#E36B2C]">
                  Current podium
                </p>
                <h2 className="mt-2 font-serif text-3xl text-[#071A44] sm:text-4xl">
                  The players to beat
                </h2>
              </div>

              <div className="grid gap-3 md:grid-cols-3">
                {topThree.map(entry => (
                  <PodiumCard
                    key={`${entry.rank}-${entry.playerName}`}
                    rank={entry.rank}
                    playerName={entry.playerName}
                    totalScore={entry.totalScore}
                    isCorrect={entry.isCorrect}
                    timeTakenSeconds={entry.timeTakenSeconds}
                  />
                ))}
              </div>
            </section>

            {/* ── REST OF BOARD ────────────────────────────────────────────── */}
            {remaining.length > 0 ? (
              <section className="overflow-hidden rounded-[30px] border border-[#E8E0D3] bg-white shadow-sm">
                <div className="border-b border-[#EEE8DE] p-5 sm:p-6">
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#E36B2C]">
                    Full standings
                  </p>
                  <h2 className="mt-2 font-serif text-2xl text-[#071A44] sm:text-3xl">
                    Everyone else chasing the podium
                  </h2>
                </div>

                <ol className="divide-y divide-[#EEE8DE]">
                  {remaining.map(entry => (
                    <li
                      key={`${entry.rank}-${entry.playerName}`}
                      className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:px-6"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#FBF8F3] text-sm font-black text-[#6E6A63]">
                          {entry.rank}
                        </div>

                        <div className="min-w-0">
                          <p className="truncate text-sm font-bold text-[#071A44] sm:text-base">
                            {entry.playerName}
                          </p>
                          <p className="mt-0.5 text-xs text-[#6E6A63]">
                            {entry.isCorrect ? 'Solved' : 'Attempted'}
                            {entry.submittedAt
                              ? ` · ${new Date(entry.submittedAt).toLocaleDateString()}`
                              : ''}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 pl-[52px] sm:pl-0">
                        {entry.timeTakenSeconds !== null ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#FBF8F3] px-3 py-1.5 text-xs font-semibold text-[#6E6A63]">
                            <ClockIcon />
                            {formatDuration(entry.timeTakenSeconds)}
                          </span>
                        ) : null}

                        <span className="rounded-full bg-[var(--puzzle-bg-accent)] px-4 py-1.5 text-sm font-black text-[var(--puzzle-primary)]">
                          {entry.totalScore} pts
                        </span>
                      </div>
                    </li>
                  ))}
                </ol>
              </section>
            ) : null}

            <section className="rounded-[28px] border border-[#DDE7DA] bg-[linear-gradient(135deg,#F5F9F2_0%,#FBF8F3_100%)] p-5 sm:p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-bold text-[var(--puzzle-primary)]">
                    Think you can beat them?
                  </p>
                  <p className="mt-1 text-sm leading-relaxed text-[#5F5A54]">
                    Take on {puzzleName}, post your score and claim your place
                    on the board.
                  </p>
                </div>

                <Link
                  to={`/puzzle-drop/${challenge.id}`}
                  className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-full bg-[var(--puzzle-primary)] px-6 py-2.5 text-sm font-semibold text-[var(--puzzle-text-on-primary)]"
                >
                  Get this puzzle →
                </Link>
              </div>
            </section>
          </>
        )}
      </div>
    </PuzzlePageShell>
  );
}

function PodiumCard({
  rank,
  playerName,
  totalScore,
  isCorrect,
  timeTakenSeconds,
}: {
  rank: number;
  playerName: string;
  totalScore: number;
  isCorrect: boolean;
  timeTakenSeconds: number | null;
}) {
  const styles =
    rank === 1
      ? {
          shell: 'border-[#F3D79B] bg-[#FFF8EA]',
          badge: 'bg-[#FFE4A8] text-[#8A5A00]',
          label: '1st place',
        }
      : rank === 2
        ? {
            shell: 'border-[#D6E2F2] bg-[#F6F9FD]',
            badge: 'bg-[#E6EEF8] text-[#355C92]',
            label: '2nd place',
          }
        : {
            shell: 'border-[#EFCFAE] bg-[#FFF8F1]',
            badge: 'bg-[#F7DEC7] text-[#A6541E]',
            label: '3rd place',
          };

  return (
    <article className={`rounded-[28px] border p-5 ${styles.shell}`}>
      <div
        className={`flex h-12 w-12 items-center justify-center rounded-2xl ${styles.badge}`}
      >
        <TrophyIcon className="h-6 w-6" />
      </div>

      <p className="mt-4 text-xs font-bold uppercase tracking-[0.14em] text-[#8A847B]">
        {styles.label}
      </p>

      <h3 className="mt-1 truncate font-serif text-2xl text-[#071A44]">
        {playerName}
      </h3>

      <p className="mt-3 text-3xl font-black text-[#071A44]">
        {totalScore}
        <span className="ml-1 text-sm font-semibold text-[#8A847B]">pts</span>
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        <span className="rounded-full bg-white/80 px-3 py-1.5 text-xs font-semibold text-[#6E6A63]">
          {isCorrect ? '✓ Solved' : 'Attempted'}
        </span>

        {timeTakenSeconds !== null ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/80 px-3 py-1.5 text-xs font-semibold text-[#6E6A63]">
            <ClockIcon />
            {formatDuration(timeTakenSeconds)}
          </span>
        ) : null}
      </div>
    </article>
  );
}
