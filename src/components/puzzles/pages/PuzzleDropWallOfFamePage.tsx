// src/components/puzzles/pages/PuzzleDropWallOfFamePage.tsx
//
// Public "wall of fame" for a whole Drop — one card per item showing the
// top 3, linking through to each item's full board. Modeled on
// PublicWallOfFamePage.tsx's layout, but Drop-specific (see
// PuzzleDropItemLeaderboardPage.tsx's header comment for why these
// aren't literally the same component).
//
// Drop has no "final" concept (§3.1 — no completed lifecycle) and every
// item is available the instant the Drop is open (no per-item unlock
// schedule) — isFinal/isUnlocked are always false/true respectively, per
// the backend's own comments on getPublicDropSummary.

import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { puzzleDropPlayService, type DropLeaderboardSummary, type DropSummaryItem } from '../services/puzzleDropPlayService';
import PuzzlePageShell from '../ui/PuzzlePageShell';
import { resolvePuzzleTheme } from '../ui/puzzleTheme';

const MEDALS = ['🥇', '🥈', '🥉'];

export default function PuzzleDropWallOfFamePage() {
  const { dropRoomId } = useParams<{ dropRoomId: string }>();

  const [summary, setSummary] = useState<DropLeaderboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);

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
      .catch((err: Error) => setPageError(err.message ?? 'Could not load the leaderboard.'))
      .finally(() => setLoading(false));
  }, [dropRoomId]);

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
          <p className="mb-2 text-3xl">😕</p>
          <h1 className="mb-2 text-xl font-bold text-[#071A44]">Leaderboard unavailable</h1>
          <p className="text-sm text-[#6E6A63]">{pageError ?? 'This Drop has no public leaderboard.'}</p>
        </div>
      </PuzzlePageShell>
    );
  }

  const { challenge, weeks: items } = summary;
  const totalPlayers = Math.max(0, ...items.map(i => i.playerCount));

  return (
    <PuzzlePageShell theme={theme} clubName={challenge.clubName ?? undefined}>
      <div className="space-y-6">
        <section className="rounded-[36px] border border-[#E8E0D3] bg-white p-6 shadow-sm sm:p-8">
          <p className="mb-3 text-sm font-semibold uppercase tracking-[0.18em] text-[#E36B2C]">Wall of fame</p>
          <h1 className="font-serif text-4xl leading-tight text-[#071A44] sm:text-5xl">{challenge.title}</h1>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-[#5F5A54]">
            The top solvers for each puzzle in this Drop.
          </p>
          <Link
            to={`/puzzle-drop/${challenge.id}`}
            className="mt-6 inline-flex items-center justify-center rounded-full bg-[var(--puzzle-primary)] px-7 py-3 text-sm font-semibold text-[var(--puzzle-text-on-primary)] shadow-sm transition hover:opacity-95"
          >
            Buy this Drop →
          </Link>
          <p className="mt-5 text-sm text-[#6E6A63]">
            {items.length} puzzle{items.length !== 1 ? 's' : ''}
            {totalPlayers > 0 ? ` · ${totalPlayers} players competing` : ''}
          </p>
        </section>

        <div className="grid gap-4 sm:grid-cols-2">
          {items.map(item => (
            <ItemPodiumCard key={item.weekNumber} item={item} dropRoomId={challenge.id} />
          ))}
        </div>
      </div>
    </PuzzlePageShell>
  );
}

function ItemPodiumCard({ item, dropRoomId }: { item: DropSummaryItem; dropRoomId: string }) {
  return (
    <div className="rounded-[28px] border border-[#E8E0D3] bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-[#071A44]">Puzzle {item.weekNumber}</p>
          <p className="mt-1 text-xs capitalize text-[#6E6A63]">
            {item.difficulty} · {item.playerCount} player{item.playerCount !== 1 ? 's' : ''}
          </p>
        </div>
        <Link
          to={`/puzzle-drop/${dropRoomId}/items/${item.weekNumber}/leaderboard`}
          className="shrink-0 rounded-full border border-[#D8D1C4] bg-white px-4 py-2 text-xs font-semibold text-[#071A44] transition hover:bg-[#F8F5EF]"
        >
          Full board →
        </Link>
      </div>

      {item.top.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-[#D8D1C4] bg-[#FBF8F3] p-4 text-center text-sm text-[#6E6A63]">
          No one has cracked this one yet — the podium is wide open.
        </p>
      ) : (
        <ol className="space-y-2">
          {item.top.map(entry => (
            <li key={entry.rank} className="flex items-center justify-between gap-3 rounded-2xl bg-[#FBF8F3] px-4 py-2.5">
              <div className="flex min-w-0 items-center gap-3">
                <span className="text-xl">{MEDALS[entry.rank - 1] ?? entry.rank}</span>
                <span className="truncate text-sm font-semibold text-[#071A44]">{entry.playerName}</span>
              </div>
              <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-[#071A44] shadow-sm">
                {entry.totalScore} pts
              </span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}