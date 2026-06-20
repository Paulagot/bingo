// src/components/puzzles/pages/ChallengeLeaderboardPage.tsx

import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  challengeService,
  type Challenge,
  type LeaderboardEntry,
} from '../services/ChallengeService';
import PuzzlePageShell from '../ui/PuzzlePageShell';
import PuzzlePrimaryButton from '../ui/PuzzlePrimaryButton';
import PuzzleStatPill from '../ui/PuzzleStatPill';

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
    return {
      icon: '🏆',
      className: 'bg-[#FFF2D9] text-[#8A5A00] border-[#F3D79B]',
      label: 'Winner',
    };
  }

  if (rank === 2) {
    return {
      icon: '🥈',
      className: 'bg-[#EEF3FB] text-[#355C92] border-[#D6E2F2]',
      label: 'Second',
    };
  }

  if (rank === 3) {
    return {
      icon: '🥉',
      className: 'bg-[#FBEFDF] text-[#A6541E] border-[#EFCFAE]',
      label: 'Third',
    };
  }

  return {
    icon: `${rank}`,
    className: 'bg-white text-[#6E6A63] border-[#E8E0D3]',
    label: `Rank ${rank}`,
  };
}

export default function ChallengeLeaderboardPage() {
  const { challengeId } = useParams<{ challengeId: string }>();
  const navigate = useNavigate();

  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);

  useEffect(() => {
    if (!challengeId) {
      setPageError('Challenge not found.');
      setLoading(false);
      return;
    }

    const currentChallengeId = challengeId;

    async function load() {
      setLoading(true);
      setPageError(null);

      try {
        const [challengeData, leaderboardData] = await Promise.all([
          challengeService.getChallenge(currentChallengeId),
          challengeService.getLeaderboard(currentChallengeId),
        ]);

        setChallenge(challengeData);
        setEntries(leaderboardData);
      } catch (err) {
        setPageError((err as Error).message);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [challengeId]);

  function toggleExpand(playerId: number) {
    setExpanded(prev => (prev === playerId ? null : playerId));
  }

  const summary = useMemo(() => {
    const playerCount = entries.length;
    const totalSubmissions = entries.reduce(
      (sum, entry) => sum + entry.weeks.length,
      0
    );
    const topScore = entries[0]?.totalScore ?? 0;
    const completedWeeks = entries.reduce(
      (sum, entry) => sum + entry.weeksCompleted,
      0
    );

    return {
      playerCount,
      totalSubmissions,
      topScore,
      completedWeeks,
    };
  }, [entries]);

  const resolvedChallengeId = challengeId ?? challenge?.id ?? '';

  if (loading) {
    return (
      <PuzzlePageShell
        rightHeaderContent={
          <span className="rounded-full bg-white px-4 py-2 text-sm font-medium text-[#6E6A63] shadow-sm">
            Loading…
          </span>
        }
      >
        <div className="flex min-h-[50vh] items-center justify-center">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#D8D1C4] border-t-[#157F85]" />
        </div>
      </PuzzlePageShell>
    );
  }

  if (pageError) {
    return (
      <PuzzlePageShell>
        <div className="mx-auto max-w-xl rounded-[28px] border border-rose-200 bg-white p-8 text-center shadow-sm">
          <p className="mb-2 text-3xl">😕</p>

          <h1 className="mb-2 text-xl font-bold text-[#071A44]">
            Could not load leaderboard
          </h1>

          <p className="text-sm text-[#6E6A63]">
            {pageError}
          </p>

          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <PuzzlePrimaryButton
              type="button"
              onClick={() => window.location.reload()}
            >
              Try again
            </PuzzlePrimaryButton>

            <button
              type="button"
              onClick={() => navigate(`/challenges/${resolvedChallengeId}`)}
              className="inline-flex items-center justify-center rounded-full border border-[#D8D1C4] bg-white px-6 py-3 text-sm font-semibold text-[#071A44] transition hover:bg-[#F8F5EF]"
            >
              ← Back to challenge
            </button>
          </div>
        </div>
      </PuzzlePageShell>
    );
  }

  return (
    <PuzzlePageShell
      rightHeaderContent={
        <button
          type="button"
          onClick={() => navigate(`/challenges/${resolvedChallengeId}`)}
          className="inline-flex items-center justify-center rounded-full border border-[#D8D1C4] bg-white px-5 py-2.5 text-sm font-semibold text-[#071A44] shadow-sm transition hover:bg-[#F8F5EF]"
        >
          ← Back to challenge
        </button>
      }
    >
      <div className="space-y-6">
        <section className="rounded-[36px] border border-[#E8E0D3] bg-white p-6 shadow-sm sm:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="mb-3 text-sm font-semibold uppercase tracking-[0.18em] text-[#E36B2C]">
                Leaderboard
              </p>

              <h1 className="font-serif text-4xl leading-tight text-[#071A44] sm:text-5xl">
                Puzzle scores
              </h1>

              <p className="mt-4 max-w-2xl text-base leading-relaxed text-[#5F5A54]">
                {challenge?.title
                  ? `Score breakdown for ${challenge.title}.`
                  : 'Review player scores and week-by-week puzzle submissions.'}
              </p>
            </div>

            <div className="rounded-[28px] border border-[#E8E0D3] bg-[#FBF8F3] p-5">
              <p className="text-sm font-semibold text-[#071A44]">
                Top score
              </p>

              <p className="mt-1 font-serif text-4xl leading-none text-[#071A44]">
                {summary.topScore}
              </p>

              <p className="mt-2 text-sm text-[#6E6A63]">
                Highest score currently on the board.
              </p>
            </div>
          </div>

          <div className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <PuzzleStatPill
              icon={<span>👥</span>}
              label="Players"
              value={`${summary.playerCount}`}
            />

            <PuzzleStatPill
              icon={<span>🧩</span>}
              label="Submissions"
              value={`${summary.totalSubmissions}`}
            />

            <PuzzleStatPill
              icon={<span>✅</span>}
              label="Weeks completed"
              value={`${summary.completedWeeks}`}
            />

            <PuzzleStatPill
              icon={<span>🏆</span>}
              label="Top score"
              value={`${summary.topScore}`}
            />
          </div>
        </section>

        {entries.length === 0 ? (
          <section className="rounded-[36px] border border-dashed border-[#D8D1C4] bg-white p-10 text-center shadow-sm">
            <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-[26px] bg-[#FFF2D9] text-4xl shadow-sm">
              🏆
            </div>

            <h2 className="font-serif text-3xl leading-tight text-[#071A44]">
              No submissions yet
            </h2>

            <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-[#6E6A63]">
              Once players complete their weekly puzzles, their scores and
              answer breakdowns will appear here.
            </p>

            <button
              type="button"
              onClick={() => navigate(`/challenges/${resolvedChallengeId}`)}
              className="mt-6 inline-flex items-center justify-center rounded-full border border-[#D8D1C4] bg-white px-6 py-3 text-sm font-semibold text-[#071A44] transition hover:bg-[#F8F5EF]"
            >
              ← Back to challenge
            </button>
          </section>
        ) : (
          <section className="rounded-[36px] border border-[#E8E0D3] bg-white p-5 shadow-sm sm:p-6">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-2xl font-semibold text-[#071A44]">
                  Player rankings
                </h2>

                <p className="mt-1 text-sm text-[#6E6A63]">
                  Expand a player to review their week-by-week answers.
                </p>
              </div>
            </div>

            <div className="space-y-4">
              {entries.map(entry => (
                <LeaderboardCard
                  key={entry.playerId}
                  entry={entry}
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

function LeaderboardCard({
  entry,
  expanded,
  onToggle,
}: {
  entry: LeaderboardEntry;
  expanded: boolean;
  onToggle: () => void;
}) {
  const rankMeta = getRankMeta(entry.rank);

  return (
    <div className="overflow-hidden rounded-[28px] border border-[#E8E0D3] bg-[#FBF8F3] shadow-sm">
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

                <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-[#6E6A63] shadow-sm">
                  {rankMeta.label}
                </span>
              </div>

              <p className="text-sm text-[#6E6A63]">
                {entry.weeksCompleted} week
                {entry.weeksCompleted !== 1 ? 's' : ''} completed
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
              {expanded ? 'Hide ▲' : 'View details ▼'}
            </span>
          </div>
        </div>
      </button>

      {expanded ? (
        <div className="border-t border-[#E8E0D3] bg-white p-4 sm:p-5">
          {entry.weeks.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[#D8D1C4] bg-[#FBF8F3] p-6 text-center">
              <p className="text-sm text-[#6E6A63]">
                No week data yet.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {entry.weeks.map(week => (
                <WeekBreakdownCard
                  key={week.weekNumber}
                  week={week}
                />
              ))}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}

function WeekBreakdownCard({
  week,
}: {
  week: LeaderboardEntry['weeks'][number];
}) {
  return (
    <div className="rounded-[24px] border border-[#E8E0D3] bg-[#FBF8F3] p-4">
      <div className="grid gap-4 lg:grid-cols-[120px_1fr_120px] lg:items-start">
        <div>
          <p className="text-sm font-semibold text-[#071A44]">
            Week {week.weekNumber}
          </p>

          <p className="mt-1 text-xs text-[#6E6A63]">
            {PUZZLE_TYPE_LABELS[week.puzzleType] ?? week.puzzleType}
          </p>
        </div>

        <AnswerReveal
          playerAnswer={week.playerAnswer}
          correctAnswer={week.correctAnswer}
          isCorrect={week.isCorrect}
        />

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
  );
}

function AnswerReveal({
  playerAnswer,
  correctAnswer,
  isCorrect,
}: {
  playerAnswer: Record<string, unknown> | null;
  correctAnswer: Record<string, unknown> | null;
  isCorrect: boolean;
}) {
  const player = extractReadableAnswer(playerAnswer);
  const correct = extractReadableAnswer(correctAnswer);

  return (
    <div className="space-y-2">
      <div className="rounded-2xl bg-white px-4 py-3 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-wide text-[#8A847B]">
          Player answer
        </p>

        <p className="mt-1 break-words text-sm font-semibold text-[#071A44]">
          {player}
        </p>
      </div>

      {!isCorrect && correct ? (
        <div className="rounded-2xl border border-[#D8E8D8] bg-[#EEF8EF] px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#5F7D6A]">
            Correct answer
          </p>

          <p className="mt-1 break-words text-sm font-semibold text-[#2E6A46]">
            {correct}
          </p>
        </div>
      ) : null}
    </div>
  );
}

function extractReadableAnswer(obj: Record<string, unknown> | null): string {
  if (!obj) return '—';

  const priorityKeys = [
    'answer',
    'decoded',
    'selectedOption',
    'orderedIds',
    'steps',
    'matches',
    'foundWords',
    'grid',
  ];

  for (const key of priorityKeys) {
    if (key in obj) {
      const value = obj[key];

      if (typeof value === 'string') {
        return value;
      }

      if (Array.isArray(value)) {
        return `[${value.slice(0, 4).join(', ')}${value.length > 4 ? '…' : ''}]`;
      }

      return safeStringify(value);
    }
  }

  return safeStringify(obj);
}

function safeStringify(value: unknown): string {
  try {
    const result = JSON.stringify(value);

    if (!result) return '—';

    return result.length > 60 ? `${result.slice(0, 60)}…` : result;
  } catch {
    return '—';
  }
}