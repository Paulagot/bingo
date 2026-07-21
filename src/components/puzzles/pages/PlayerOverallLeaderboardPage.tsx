// src/components/puzzles/pages/PlayerOverallLeaderboardPage.tsx
//
// PLAYER page — supporter auth required. The cumulative "my standing"
// view across every week of the challenge. Uses the same backend route
// as the club dashboard's ChallengeLeaderboardPage
// (GET /puzzle-challenges/:challengeId/leaderboard, authenticateAny),
// but called with a supporter token via SupporterAuthService rather than
// ChallengeService — that route accepts either, and this stays a
// player-styled page (branded, PuzzlePageShell) instead of reusing the
// club-dashboard component, which is auth'd only for club tokens and
// styled for club admins.
//
// Never shows answers or solutions — see challengeService.js's
// getLeaderboard comment for why that's safe: the query already omits
// them server-side.

import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  supporterAuthService,
  type PublicChallenge,
  type SupporterLeaderboardEntry,
} from '../services/SupporterAuthService';
import PuzzlePageShell from '../ui/PuzzlePageShell';
import { resolvePuzzleTheme } from '../ui/puzzleTheme';
import { formatDuration } from './PublicWallOfFamePage';

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

function getRankMeta(rank: number) {
  if (rank === 1) {
    return { icon: '🏆', className: 'bg-[#FFF2D9] text-[#8A5A00] border-[#F3D79B]' };
  }
  if (rank === 2) {
    return { icon: '🥈', className: 'bg-[#EEF3FB] text-[#355C92] border-[#D6E2F2]' };
  }
  if (rank === 3) {
    return { icon: '🥉', className: 'bg-[#FBEFDF] text-[#A6541E] border-[#EFCFAE]' };
  }
  return { icon: `${rank}`, className: 'bg-white text-[#6E6A63] border-[#E8E0D3]' };
}

export default function PlayerOverallLeaderboardPage() {
  const { challengeId } = useParams<{ challengeId: string }>();
  const navigate = useNavigate();

  const [challenge, setChallenge] = useState<PublicChallenge | null>(null);
  const [entries, setEntries] = useState<SupporterLeaderboardEntry[]>([]);
  const [myPlayerId, setMyPlayerId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);

  const theme = useMemo(() => resolvePuzzleTheme(challenge), [challenge]);

  useEffect(() => {
    if (!challengeId) {
      setPageError('Challenge not found.');
      setLoading(false);
      return;
    }

    // Not logged in — send to the join/login flow rather than showing an
    // error state, since this page has no meaning for an anonymous visitor.
    if (!supporterAuthService.isAuthenticated()) {
      navigate('/puzzle-login', { state: { challengeId } });
      return;
    }

    const currentChallengeId = challengeId;

    async function load() {
      setLoading(true);
      setPageError(null);

      try {
        const [challengeData, leaderboardData, profile] = await Promise.all([
          supporterAuthService.getPublicChallenge(currentChallengeId),
          supporterAuthService.getOverallLeaderboard(currentChallengeId),
          supporterAuthService.getMe().catch(() => null),
        ]);

        setChallenge(challengeData);
        setEntries(leaderboardData);
        setMyPlayerId(profile?.id ?? null);
      } catch (err) {
        setPageError((err as Error).message ?? 'Could not load the leaderboard.');
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [challengeId, navigate]);

  function toggleExpand(playerId: number) {
    setExpanded(prev => (prev === playerId ? null : playerId));
  }

  const resolvedChallengeId = challengeId ?? challenge?.id ?? '';

  if (loading) {
    return (
      <PuzzlePageShell theme={theme} clubName={challenge?.club_name}>
        <div className="flex min-h-[50vh] items-center justify-center">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#D8D1C4] border-t-[var(--puzzle-primary)]" />
        </div>
      </PuzzlePageShell>
    );
  }

  if (pageError || !challenge) {
    return (
      <PuzzlePageShell theme={theme}>
        <div className="mx-auto max-w-xl rounded-[28px] border border-rose-200 bg-white p-8 text-center shadow-sm">
          <p className="mb-2 text-3xl">😕</p>
          <h1 className="mb-2 text-xl font-bold text-[#071A44]">
            Standings unavailable
          </h1>
          <p className="text-sm text-[#6E6A63]">
            {pageError ?? 'Could not load your standing for this challenge.'}
          </p>
          <Link
            to={`/challenges/${resolvedChallengeId}/play`}
            className="mt-6 inline-flex items-center justify-center rounded-full border border-[#D8D1C4] bg-white px-6 py-3 text-sm font-semibold text-[#071A44] transition hover:bg-[#F8F5EF]"
          >
            ← Back to my puzzles
          </Link>
        </div>
      </PuzzlePageShell>
    );
  }

  return (
    <PuzzlePageShell
      theme={theme}
      clubName={challenge.club_name}
      rightHeaderContent={
        <div className="flex flex-wrap items-center gap-2">
          <Link
            to={`/challenges/${resolvedChallengeId}/play`}
            className="inline-flex items-center justify-center rounded-full border border-[#D8D1C4] bg-white px-5 py-2.5 text-sm font-semibold text-[#071A44] shadow-sm transition hover:bg-[#F8F5EF]"
          >
            ← My puzzles
          </Link>
          <Link
            to={`/leaderboards/${resolvedChallengeId}`}
            className="inline-flex items-center justify-center rounded-full border border-[#D8D1C4] bg-white px-5 py-2.5 text-sm font-semibold text-[#071A44] shadow-sm transition hover:bg-[#F8F5EF]"
          >
            Wall of fame →
          </Link>
        </div>
      }
    >
      <div className="space-y-6">
        <section className="rounded-[36px] border border-[#E8E0D3] bg-white p-6 shadow-sm sm:p-8">
          <p className="mb-3 text-sm font-semibold uppercase tracking-[0.18em] text-[#E36B2C]">
            My standing
          </p>

          <h1 className="font-serif text-4xl leading-tight text-[#071A44] sm:text-5xl">
            {challenge.title}
          </h1>

          <p className="mt-4 max-w-2xl text-base leading-relaxed text-[#5F5A54]">
            Your cumulative score across every week you've played, alongside
            everyone else in this challenge.
          </p>
        </section>

        {entries.length === 0 ? (
          <section className="rounded-[36px] border border-dashed border-[#D8D1C4] bg-white p-10 text-center shadow-sm">
            <p className="mb-3 text-4xl">🧩</p>
            <h2 className="font-serif text-3xl text-[#071A44]">
              No scores yet
            </h2>
            <p className="mx-auto mt-3 max-w-md text-sm text-[#6E6A63]">
              Standings will appear here once players start submitting puzzles.
            </p>
          </section>
        ) : (
          <section className="rounded-[36px] border border-[#E8E0D3] bg-white p-5 shadow-sm sm:p-6">
            <div className="space-y-4">
              {entries.map(entry => (
                <PlayerLeaderboardCard
                  key={entry.playerId}
                  entry={entry}
                  isMe={myPlayerId != null && String(entry.playerId) === myPlayerId}
                  expanded={expanded === entry.playerId}
                  onToggle={() => toggleExpand(entry.playerId)}
                />
              ))}
            </div>
          </section>
        )}
      </div>
    </PuzzlePageShell>
  );
}

function PlayerLeaderboardCard({
  entry,
  isMe,
  expanded,
  onToggle,
}: {
  entry: SupporterLeaderboardEntry;
  isMe: boolean;
  expanded: boolean;
  onToggle: () => void;
}) {
  const rankMeta = getRankMeta(entry.rank);

  return (
    <div
      className={`overflow-hidden rounded-[28px] border shadow-sm ${
        isMe ? 'border-[var(--puzzle-primary)] bg-[#FBF8F3]' : 'border-[#E8E0D3] bg-[#FBF8F3]'
      }`}
    >
      <button
        type="button"
        onClick={onToggle}
        className="w-full p-5 text-left transition hover:bg-white"
      >
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-center gap-4">
            <div
              className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-[20px] border text-xl font-bold shadow-sm ${rankMeta.className}`}
            >
              {rankMeta.icon}
            </div>

            <div className="min-w-0">
              <div className="mb-1 flex flex-wrap items-center gap-2">
                <h3 className="truncate text-xl font-semibold text-[#071A44]">
                  {entry.playerName}
                </h3>
                {isMe ? (
                  <span className="rounded-full bg-[var(--puzzle-primary)] px-3 py-1 text-xs font-semibold text-[var(--puzzle-text-on-primary)]">
                    You
                  </span>
                ) : null}
              </div>

              <p className="text-sm text-[#6E6A63]">
                {entry.weeksCompleted} week{entry.weeksCompleted !== 1 ? 's' : ''} completed
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 lg:justify-end">
            <div className="rounded-2xl bg-white px-4 py-2 text-right shadow-sm">
              <p className="text-xs font-medium uppercase tracking-wide text-[#8A847B]">
                Score
              </p>
              <p className="text-2xl font-bold text-[#071A44]">
                {entry.totalScore}
              </p>
            </div>

            <span className="rounded-full border border-[#D8D1C4] bg-white px-4 py-2 text-xs font-semibold text-[#071A44] shadow-sm">
              {expanded ? 'Hide ▲' : 'Details ▼'}
            </span>
          </div>
        </div>
      </button>

      {expanded ? (
        <div className="border-t border-[#E8E0D3] bg-white p-4 sm:p-5">
          {entry.weeks.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[#D8D1C4] bg-[#FBF8F3] p-6 text-center">
              <p className="text-sm text-[#6E6A63]">No week data yet.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {entry.weeks.map(week => (
                <div
                  key={week.weekNumber}
                  className="rounded-[24px] border border-[#E8E0D3] bg-[#FBF8F3] p-4"
                >
                  <div className="grid gap-4 lg:grid-cols-[120px_1fr_auto] lg:items-center">
                    <div>
                      <p className="text-sm font-semibold text-[#071A44]">
                        Week {week.weekNumber}
                      </p>
                      <p className="mt-1 text-xs text-[#6E6A63]">
                        {PUZZLE_TYPE_LABELS[week.puzzleType] ?? week.puzzleType}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-xs text-[#6E6A63]">
                      {week.timeTakenSeconds !== null ? (
                        <span className="rounded-full bg-white px-3 py-1 font-semibold shadow-sm">
                          ⏱ {formatDuration(week.timeTakenSeconds)}
                        </span>
                      ) : null}
                      {week.submittedAt ? (
                        <span className="rounded-full bg-white px-3 py-1 font-semibold shadow-sm">
                          {new Date(week.submittedAt).toLocaleDateString()}
                        </span>
                      ) : null}
                    </div>

                    <div className="flex flex-wrap items-center gap-2 lg:flex-col lg:items-end">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          week.isCorrect
                            ? 'bg-[#EEF8EF] text-[#2E6A46]'
                            : 'bg-rose-50 text-rose-700'
                        }`}
                      >
                        {week.isCorrect ? '✓ Correct' : '✗ Wrong'}
                      </span>
                      <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-[#071A44] shadow-sm">
                        {week.totalScore} pts
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}