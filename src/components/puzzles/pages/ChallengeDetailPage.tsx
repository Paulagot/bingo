// src/components/puzzles/pages/ChallengeDetailPage.tsx

import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  challengeService,
  type Challenge,
  type EnrolledPlayer,
} from '../services/ChallengeService';
import PuzzlePageShell from '../ui/PuzzlePageShell';
import PuzzlePrimaryButton from '../ui/PuzzlePrimaryButton';
import PuzzleStatPill from '../ui/PuzzleStatPill';

const CURRENCIES = [
  { value: 'eur', symbol: '€' },
  { value: 'gbp', symbol: '£' },
  { value: 'usd', symbol: '$' },
] as const;

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

interface StatusMeta {
  label: string;
  className: string;
}

const STATUS_META: Record<string, StatusMeta> = {
  draft: {
    label: 'Draft',
    className: 'bg-[#F8F6F1] text-[#7C7468] border-[#E8E0D3]',
  },
  active: {
    label: 'Active',
    className: 'bg-[#EEF8EF] text-[#2E6A46] border-[#D8E8D8]',
  },
  completed: {
    label: 'Completed',
    className: 'bg-[#EEF3FB] text-[#355C92] border-[#D6E2F2]',
  },
  cancelled: {
    label: 'Cancelled',
    className: 'bg-rose-50 text-rose-700 border-rose-200',
  },
};

function getStatusMeta(status: string): StatusMeta {
  return (
    STATUS_META[status] ?? {
      label: status,
      className: 'bg-[#F8F6F1] text-[#7C7468] border-[#E8E0D3]',
    }
  );
}

export default function ChallengeDetailPage() {
  const { challengeId } = useParams<{ challengeId: string }>();
  const navigate = useNavigate();

  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [players, setPlayers] = useState<EnrolledPlayer[]>([]);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState<Challenge['status'] | null>(
    null
  );

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
      setActionError(null);

      try {
        const [challengeData, playerData] = await Promise.all([
          challengeService.getChallenge(currentChallengeId),
          challengeService.getPlayers(currentChallengeId),
        ]);

        setChallenge(challengeData);
        setPlayers(playerData);
      } catch (err) {
        setPageError((err as Error).message);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [challengeId]);

  async function handleStatusChange(status: Challenge['status']) {
    if (!challengeId) return;

    setUpdatingStatus(status);
    setActionError(null);

    try {
      const updated = await challengeService.updateStatus(challengeId, status);
      setChallenge(updated);
    } catch (err) {
      setActionError((err as Error).message);
    } finally {
      setUpdatingStatus(null);
    }
  }

  const now = new Date();

  const statusMeta = getStatusMeta(challenge?.status ?? 'draft');

  const currencySymbol =
    CURRENCIES.find(c => c.value === challenge?.currency)?.symbol ?? '€';

  const challengeIsFree = Number(challenge?.is_free) === 1;

  const priceLabel = challengeIsFree
    ? 'Free challenge'
    : `${currencySymbol}${((challenge?.weekly_price ?? 0) / 100).toFixed(2)}/week`;

  const unlockedCount =
    challenge?.schedule?.filter(row => {
      const unlocksAt = row.unlocks_at ? new Date(row.unlocks_at) : null;
      return !unlocksAt || unlocksAt <= now;
    }).length ?? 0;

  const lockedCount = Number(challenge?.schedule?.length ?? 0) - unlockedCount;

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

  if (pageError || !challenge) {
    return (
      <PuzzlePageShell>
        <div className="mx-auto max-w-xl rounded-[28px] border border-rose-200 bg-white p-8 text-center shadow-sm">
          <p className="mb-2 text-3xl">😕</p>

          <h1 className="mb-2 text-xl font-bold text-[#071A44]">
            Could not load challenge
          </h1>

          <p className="text-sm text-[#6E6A63]">
            {pageError ?? 'Challenge not found'}
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
              onClick={() => navigate('/challenges')}
              className="inline-flex items-center justify-center rounded-full border border-[#D8D1C4] bg-white px-6 py-3 text-sm font-semibold text-[#071A44] transition hover:bg-[#F8F5EF]"
            >
              ← All challenges
            </button>
          </div>
        </div>
      </PuzzlePageShell>
    );
  }

  const resolvedChallengeId = challengeId ?? challenge.id;

  return (
    <PuzzlePageShell
      rightHeaderContent={
        <button
          type="button"
          onClick={() => navigate('/challenges')}
          className="inline-flex items-center justify-center rounded-full border border-[#D8D1C4] bg-white px-5 py-2.5 text-sm font-semibold text-[#071A44] shadow-sm transition hover:bg-[#F8F5EF]"
        >
          ← All challenges
        </button>
      }
    >
      <div className="space-y-6">
        <section className="rounded-[36px] border border-[#E8E0D3] bg-white p-6 shadow-sm sm:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#E36B2C]">
                  Challenge manager
                </p>

                <span
                  className={`rounded-full border px-3 py-1 text-xs font-semibold ${statusMeta.className}`}
                >
                  {statusMeta.label}
                </span>
              </div>

              <h1 className="font-serif text-4xl leading-tight text-[#071A44] sm:text-5xl">
                {challenge.title}
              </h1>

              {challenge.description ? (
                <p className="mt-4 max-w-2xl text-base leading-relaxed text-[#5F5A54]">
                  {challenge.description}
                </p>
              ) : (
                <p className="mt-4 max-w-2xl text-base leading-relaxed text-[#5F5A54]">
                  Manage the weekly schedule, player list and leaderboard for
                  this puzzle challenge.
                </p>
              )}

              <p className="mt-3 text-sm text-[#8A847B]">
                Starts {new Date(challenge.starts_at).toLocaleDateString()} ·{' '}
                {challenge.total_weeks} week
                {challenge.total_weeks !== 1 ? 's' : ''} · {priceLabel}
              </p>
            </div>

            <div className="flex flex-wrap gap-2 lg:justify-end">
              {challenge.status === 'draft' ? (
                <PuzzlePrimaryButton
                  type="button"
                  onClick={() => handleStatusChange('active')}
                  disabled={updatingStatus === 'active'}
                >
                  {updatingStatus === 'active' ? 'Activating…' : 'Activate'}
                </PuzzlePrimaryButton>
              ) : null}

              {challenge.status === 'active' ? (
                <PuzzlePrimaryButton
                  type="button"
                  onClick={() => handleStatusChange('completed')}
                  disabled={updatingStatus === 'completed'}
                >
                  {updatingStatus === 'completed'
                    ? 'Completing…'
                    : 'Mark complete'}
                </PuzzlePrimaryButton>
              ) : null}

              <button
                type="button"
                onClick={() =>
                  navigate(`/challenges/${resolvedChallengeId}/leaderboard`)
                }
                className="inline-flex items-center justify-center rounded-full border border-[#D8D1C4] bg-white px-5 py-3 text-sm font-semibold text-[#071A44] transition hover:bg-[#F8F5EF]"
              >
                Leaderboard →
              </button>
            </div>
          </div>

          {actionError ? (
            <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3">
              <p className="text-sm font-medium text-rose-700">
                {actionError}
              </p>
            </div>
          ) : null}

          <div className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <PuzzleStatPill
              icon={<span>🗓️</span>}
              label="Weeks"
              value={`${challenge.total_weeks}`}
            />

            <PuzzleStatPill
              icon={<span>🔓</span>}
              label="Unlocked"
              value={`${unlockedCount}`}
            />

            <PuzzleStatPill
              icon={<span>🔒</span>}
              label="Locked"
              value={`${lockedCount}`}
            />

            <PuzzleStatPill
              icon={<span>👥</span>}
              label="Players"
              value={`${players.length}`}
            />
          </div>
        </section>

        <div className="grid gap-6 lg:grid-cols-[1fr_0.8fr]">
          <section className="rounded-[36px] border border-[#E8E0D3] bg-white p-6 shadow-sm sm:p-8">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#E36B2C]">
                  Schedule
                </p>

                <h2 className="text-2xl font-semibold text-[#071A44]">
                  Week schedule
                </h2>

                <p className="mt-1 text-sm text-[#6E6A63]">
                  Each week unlocks based on the challenge start date and
                  schedule.
                </p>
              </div>
            </div>

            {challenge.schedule?.length ? (
              <div className="grid gap-3">
                {challenge.schedule.map(row => {
                  const unlocksAt = row.unlocks_at
                    ? new Date(row.unlocks_at)
                    : null;

                  const isUnlocked = !unlocksAt || unlocksAt <= now;

                  return (
                    <WeekScheduleCard
                      key={row.week_number}
                      weekNumber={row.week_number}
                      puzzleType={row.puzzle_type}
                      difficulty={row.difficulty}
                      unlocksAt={unlocksAt}
                      isUnlocked={isUnlocked}
                    />
                  );
                })}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-[#D8D1C4] bg-[#FBF8F3] p-8 text-center">
                <p className="text-sm text-[#6E6A63]">
                  No schedule available for this challenge.
                </p>
              </div>
            )}
          </section>

          <aside className="space-y-6">
            <section className="rounded-[36px] border border-[#E8E0D3] bg-white p-6 shadow-sm sm:p-8">
              <div className="mb-5">
                <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#E36B2C]">
                  Players
                </p>

                <h2 className="text-2xl font-semibold text-[#071A44]">
                  Enrolled players
                </h2>

                <p className="mt-1 text-sm text-[#6E6A63]">
                  Supporters who have joined this puzzle challenge.
                </p>
              </div>

              {players.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-[#D8D1C4] bg-[#FBF8F3] p-8 text-center">
                  <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#FFF2D9] text-2xl">
                    👥
                  </div>

                  <p className="text-sm font-semibold text-[#071A44]">
                    No players enrolled yet
                  </p>

                  <p className="mt-1 text-xs leading-relaxed text-[#6E6A63]">
                    Once supporters join, they will appear here.
                  </p>
                </div>
              ) : (
                <div className="max-h-[620px] space-y-3 overflow-y-auto pr-1">
                  {players.map(player => (
                    <PlayerCard key={player.id} player={player} />
                  ))}
                </div>
              )}
            </section>

            <section className="rounded-[36px] border border-[#E8E0D3] bg-white p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-[#071A44]">
                Challenge summary
              </h3>

              <div className="mt-4 space-y-3 text-sm">
                <SummaryRow label="Status" value={statusMeta.label} />
                <SummaryRow
                  label="Starts"
                  value={new Date(challenge.starts_at).toLocaleDateString()}
                />
                <SummaryRow label="Pricing" value={priceLabel} />
                <SummaryRow label="Players" value={`${players.length}`} />
              </div>

              <button
                type="button"
                onClick={() =>
                  navigate(`/challenges/${resolvedChallengeId}/leaderboard`)
                }
                className="mt-6 inline-flex w-full items-center justify-center rounded-full border border-[#D8D1C4] bg-white px-5 py-3 text-sm font-semibold text-[#071A44] transition hover:bg-[#F8F5EF]"
              >
                View leaderboard →
              </button>
            </section>
          </aside>
        </div>
      </div>
    </PuzzlePageShell>
  );
}

function WeekScheduleCard({
  weekNumber,
  puzzleType,
  difficulty,
  unlocksAt,
  isUnlocked,
}: {
  weekNumber: number;
  puzzleType: string;
  difficulty: string;
  unlocksAt: Date | null;
  isUnlocked: boolean;
}) {
  return (
    <div className="rounded-[24px] border border-[#E8E0D3] bg-[#FBF8F3] p-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white text-2xl shadow-sm">
            {isUnlocked ? '🔓' : '🔒'}
          </div>

          <div className="min-w-0">
            <p className="text-sm font-semibold text-[#071A44]">
              Week {weekNumber}
            </p>

            <p className="truncate text-sm text-[#6E6A63]">
              {PUZZLE_TYPE_LABELS[puzzleType] ?? puzzleType}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:justify-end">
          <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold capitalize text-[#6E6A63] shadow-sm">
            {difficulty}
          </span>

          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold ${
              isUnlocked
                ? 'bg-[#EEF8EF] text-[#2E6A46]'
                : 'bg-[#F8F6F1] text-[#7C7468]'
            }`}
          >
            {isUnlocked
              ? 'Unlocked'
              : `Unlocks ${unlocksAt?.toLocaleDateString() ?? 'soon'}`}
          </span>
        </div>
      </div>
    </div>
  );
}

function PlayerCard({ player }: { player: EnrolledPlayer }) {
  const initials = getInitials(player.name);

  return (
    <div className="rounded-[24px] border border-[#E8E0D3] bg-[#FBF8F3] p-4">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#157F85] text-sm font-bold text-white shadow-sm">
          {initials}
        </div>

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-[#071A44]">
            {player.name}
          </p>

          <p className="truncate text-xs text-[#6E6A63]">
            {player.email}
          </p>
        </div>
      </div>

      <p className="mt-3 text-xs text-[#8A847B]">
        Joined {new Date(player.enrolled_at).toLocaleDateString()}
      </p>
    </div>
  );
}

function SummaryRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl bg-[#FBF8F3] px-4 py-3">
      <span className="text-[#6E6A63]">{label}</span>
      <span className="text-right font-semibold text-[#071A44]">{value}</span>
    </div>
  );
}

function getInitials(name: string) {
  return (
    name
      .split(' ')
      .map(part => part.trim()[0])
      .filter(Boolean)
      .join('')
      .slice(0, 2)
      .toUpperCase() || '?'
  );
}