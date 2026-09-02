// src/components/puzzles/pages/PuzzleDropWallOfFamePage.tsx
//
// Public Wall of Fame for a whole Puzzle Drop.
// One card per puzzle, showing its current podium and linking to the full board.
//
// Visual direction:
// - Same club-branded Puzzle Drop family as PuzzleDropLandingPage.
// - Competition / bragging-rights first.
// - Mobile-first cards; polished multi-column layout on larger screens.
// - Uses the existing Drop leaderboard APIs — no backend changes required.

import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import {
  puzzleDropPlayService,
  type DropLeaderboardSummary,
  type DropSummaryItem,
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

function PuzzleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" aria-hidden="true">
      <path
        d="M9.2 4.5h3.1a2.7 2.7 0 1 1 5.2 0H20v5.1a2.7 2.7 0 1 0 0 5.2V20h-5.2a2.7 2.7 0 1 0-5.2 0H4.5v-5.2a2.7 2.7 0 1 1 0-5.2V4.5h4.7Z"
        fill="currentColor"
      />
    </svg>
  );
}

function ordinalLabel(rank: number) {
  if (rank === 1) return '1st';
  if (rank === 2) return '2nd';
  if (rank === 3) return '3rd';
  return `${rank}th`;
}

export default function PuzzleDropWallOfFamePage() {
  const { dropRoomId } = useParams<{ dropRoomId: string }>();

  const [summary, setSummary] = useState<DropLeaderboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);
  const [shareCopied, setShareCopied] = useState(false);

  const theme = resolvePuzzleTheme(summary?.challenge ?? null);

  useEffect(() => {
    if (!dropRoomId) {
      setPageError('Drop not found.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setPageError(null);

    puzzleDropPlayService
      .getLeaderboardSummary(dropRoomId)
      .then(setSummary)
      .catch((err: Error) =>
        setPageError(err.message ?? 'Could not load the leaderboard.'),
      )
      .finally(() => setLoading(false));
  }, [dropRoomId]);

  async function handleShare() {
    if (!summary) return;

    const url = window.location.href;
    const shareData = {
      title: `${summary.challenge.title} — Wall of Fame`,
      text: `See who's leading the Puzzle Drop for ${summary.challenge.clubName ?? 'the organiser'}. Think you can beat them?`,
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
        console.warn('[PuzzleDropWallOfFamePage] Share failed:', err);
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

  if (pageError || !summary) {
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
            {pageError ?? 'This Drop has no public leaderboard.'}
          </p>
        </div>
      </PuzzlePageShell>
    );
  }

  const { challenge, weeks: items } = summary;

  const totalEntries = items.reduce((sum, item) => sum + item.playerCount, 0);
  const activeBoards = items.filter(item => item.playerCount > 0).length;

  return (
    <PuzzlePageShell theme={theme} clubName={challenge.clubName ?? undefined}>
      <div className="mx-auto max-w-6xl space-y-6">
        {/* ── HERO ─────────────────────────────────────────────────────────── */}
        <section className="relative overflow-hidden rounded-[36px] border border-[#E8E0D3] bg-white p-6 shadow-sm sm:p-8 lg:p-10">
          <div
            className="pointer-events-none absolute inset-x-0 top-0 h-2"
            style={{ background: 'var(--puzzle-primary)' }}
          />

          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0">
              <div className="inline-flex items-center gap-2 rounded-full bg-[var(--puzzle-bg-accent)] px-3 py-1.5 text-xs font-bold uppercase tracking-[0.16em] text-[var(--puzzle-primary)]">
                <TrophyIcon className="h-4 w-4" />
                Wall of Fame
              </div>

              <h1 className="mt-5 font-serif text-4xl leading-[1.02] text-[#071A44] sm:text-5xl lg:text-6xl">
                {challenge.title}
              </h1>

              <p className="mt-4 max-w-2xl text-base leading-relaxed text-[#5F5A54] sm:text-lg">
                Every puzzle has its own leaderboard. These are the players
                currently holding the bragging rights.
              </p>

              <div className="mt-6 flex flex-wrap gap-2">
                <span className="rounded-full border border-[#E8E0D3] bg-[#FBF8F3] px-4 py-2 text-xs font-semibold text-[#6E6A63]">
                  {items.length} puzzle{items.length !== 1 ? 's' : ''}
                </span>
                <span className="rounded-full border border-[#E8E0D3] bg-[#FBF8F3] px-4 py-2 text-xs font-semibold text-[#6E6A63]">
                  {totalEntries} total entr{totalEntries === 1 ? 'y' : 'ies'}
                </span>
                <span className="rounded-full border border-[#E8E0D3] bg-[#FBF8F3] px-4 py-2 text-xs font-semibold text-[#6E6A63]">
                  {activeBoards} active board{activeBoards !== 1 ? 's' : ''}
                </span>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleShare}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-[var(--puzzle-primary)] bg-white px-5 py-2.5 text-sm font-semibold text-[var(--puzzle-primary)] transition hover:bg-[var(--puzzle-bg-accent)]"
              >
                <ShareIcon />
                {shareCopied ? 'Link copied!' : 'Share leaderboard'}
              </button>

              <Link
                to={`/puzzle-drop/${challenge.id}`}
                className="inline-flex min-h-11 items-center justify-center rounded-full bg-[var(--puzzle-primary)] px-6 py-2.5 text-sm font-semibold text-[var(--puzzle-text-on-primary)] shadow-sm transition hover:opacity-95"
              >
                Pick a puzzle →
              </Link>
            </div>
          </div>
        </section>

        {/* ── PODIUM GRID ──────────────────────────────────────────────────── */}
        <section>
          <div className="mb-4">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#E36B2C]">
              Puzzle by puzzle
            </p>
            <h2 className="mt-2 font-serif text-3xl text-[#071A44] sm:text-4xl">
              Who’s on top?
            </h2>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {items.map(item => (
              <ItemPodiumCard
                key={item.weekNumber}
                item={item}
                dropRoomId={challenge.id}
              />
            ))}
          </div>
        </section>

        <section className="rounded-[28px] border border-[#DDE7DA] bg-[linear-gradient(135deg,#F5F9F2_0%,#FBF8F3_100%)] p-5 sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[var(--puzzle-primary)] text-[var(--puzzle-text-on-primary)]">
                <PuzzleIcon />
              </div>
              <div>
                <p className="font-bold text-[var(--puzzle-primary)]">
                  Think you can take a spot?
                </p>
                <p className="mt-1 text-sm leading-relaxed text-[#5F5A54]">
                  Choose a puzzle, post your score and see if you can knock
                  someone off the podium.
                </p>
              </div>
            </div>

            <Link
              to={`/puzzle-drop/${challenge.id}`}
              className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-full bg-[var(--puzzle-primary)] px-6 py-2.5 text-sm font-semibold text-[var(--puzzle-text-on-primary)]"
            >
              Take the challenge →
            </Link>
          </div>
        </section>
      </div>
    </PuzzlePageShell>
  );
}

function ItemPodiumCard({
  item,
  dropRoomId,
}: {
  item: DropSummaryItem;
  dropRoomId: string;
}) {
  const puzzleType = (item as DropSummaryItem & { puzzleType?: string }).puzzleType;
  const title = puzzleType
    ? PUZZLE_TYPE_LABELS[puzzleType] ?? puzzleType
    : `Puzzle ${item.weekNumber}`;

  return (
    <article className="overflow-hidden rounded-[28px] border border-[#E8E0D3] bg-white shadow-sm">
      <div className="border-b border-[#EEE8DE] p-5 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#8A847B]">
              Puzzle {item.weekNumber}
            </p>
            <h3 className="mt-1 font-serif text-2xl leading-tight text-[#071A44]">
              {title}
            </h3>

            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-[#6E6A63]">
              <span className="capitalize">{item.difficulty}</span>
              <span>·</span>
              <span>
                {item.playerCount} player{item.playerCount !== 1 ? 's' : ''}
              </span>
            </div>
          </div>

          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[var(--puzzle-bg-accent)] text-[var(--puzzle-primary)]">
            <TrophyIcon />
          </div>
        </div>
      </div>

      <div className="p-4 sm:p-5">
        {item.top.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[#D8D1C4] bg-[#FBF8F3] p-6 text-center">
            <p className="font-serif text-xl text-[#071A44]">
              Podium wide open
            </p>
            <p className="mt-2 text-sm leading-relaxed text-[#6E6A63]">
              No one has cracked this one yet. The first top score could be
              yours.
            </p>
          </div>
        ) : (
          <ol className="space-y-2">
            {item.top.map(entry => (
              <li
                key={entry.rank}
                className={`flex items-center justify-between gap-3 rounded-2xl border px-4 py-3 ${
                  entry.rank === 1
                    ? 'border-[#F3D79B] bg-[#FFF8EA]'
                    : entry.rank === 2
                      ? 'border-[#D6E2F2] bg-[#F6F9FD]'
                      : 'border-[#EFCFAE] bg-[#FFF8F1]'
                }`}
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-xs font-black ${
                      entry.rank === 1
                        ? 'bg-[#FFE4A8] text-[#8A5A00]'
                        : entry.rank === 2
                          ? 'bg-[#E6EEF8] text-[#355C92]'
                          : 'bg-[#F7DEC7] text-[#A6541E]'
                    }`}
                  >
                    {ordinalLabel(entry.rank)}
                  </span>

                  <span className="truncate text-sm font-bold text-[#071A44]">
                    {entry.playerName}
                  </span>
                </div>

                <span className="shrink-0 rounded-full bg-white px-3 py-1 text-xs font-bold text-[#071A44] shadow-sm">
                  {entry.totalScore} pts
                </span>
              </li>
            ))}
          </ol>
        )}

        <Link
          to={`/puzzle-drop/${dropRoomId}/items/${item.weekNumber}/leaderboard`}
          className="mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-2xl border border-[#D8D1C4] bg-white px-4 py-2.5 text-sm font-semibold text-[#071A44] transition hover:bg-[#FBF8F3]"
        >
          View full leaderboard →
        </Link>
      </div>
    </article>
  );
}