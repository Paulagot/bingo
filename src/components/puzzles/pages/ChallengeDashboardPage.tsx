// src/components/puzzles/pages/ChallengeDashboardPage.tsx

import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  challengeService,
  type Challenge,
} from '../services/ChallengeService';
import PuzzlePageShell from '../ui/PuzzlePageShell';
import PuzzlePrimaryButton from '../ui/PuzzlePrimaryButton';
import PuzzleStatPill from '../ui/PuzzleStatPill';

const CURRENCY_SYMBOLS: Record<string, string> = {
  eur: '€',
  gbp: '£',
  usd: '$',
};

const STATUS_META: Record<
  string,
  {
    label: string;
    className: string;
  }
> = {
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

export default function ChallengeDashboardPage() {
  const navigate = useNavigate();

  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [activatingId, setActivatingId] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function loadChallenges() {
      setLoading(true);
      setPageError(null);

      try {
        const data = await challengeService.listChallenges();

        if (mounted) {
          setChallenges(data);
        }
      } catch (err) {
        if (mounted) {
          setPageError((err as Error).message);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    loadChallenges();

    return () => {
      mounted = false;
    };
  }, []);

  async function handleActivate(id: string) {
    setActivatingId(id);
    setActionError(null);

    try {
      const updated = await challengeService.updateStatus(id, 'active');

      setChallenges(prev =>
        prev.map(challenge => (challenge.id === id ? updated : challenge))
      );
    } catch (err) {
      setActionError((err as Error).message);
    } finally {
      setActivatingId(null);
    }
  }

  const summary = useMemo(() => {
    const total = challenges.length;
    const active = challenges.filter(c => c.status === 'active').length;
    const drafts = challenges.filter(c => c.status === 'draft').length;
    const players = challenges.reduce(
      (sum, c) => sum + Number(c.player_count ?? 0),
      0
    );

    return {
      total,
      active,
      drafts,
      players,
    };
  }, [challenges]);

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
            Could not load challenges
          </h1>

          <p className="text-sm text-[#6E6A63]">
            {pageError}
          </p>

          <PuzzlePrimaryButton
            type="button"
            onClick={() => window.location.reload()}
            className="mt-6"
          >
            Try again
          </PuzzlePrimaryButton>
        </div>
      </PuzzlePageShell>
    );
  }

  return (
    <PuzzlePageShell
      rightHeaderContent={
        <PuzzlePrimaryButton
          type="button"
          onClick={() => navigate('/challenges/create')}
        >
          + New Challenge
        </PuzzlePrimaryButton>
      }
    >
      <div className="space-y-6">
        <section className="rounded-[36px] border border-[#E8E0D3] bg-white p-6 shadow-sm sm:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="mb-3 text-sm font-semibold uppercase tracking-[0.18em] text-[#E36B2C]">
                Host dashboard
              </p>

              <h1 className="font-serif text-4xl leading-tight text-[#071A44] sm:text-5xl">
                Puzzle Challenges
              </h1>

              <p className="mt-4 max-w-2xl text-base leading-relaxed text-[#5F5A54]">
                Create, launch and manage weekly puzzle subscriptions for your
                club, charity or community fundraiser.
              </p>
            </div>

            <div className="rounded-[28px] border border-[#E8E0D3] bg-[#FBF8F3] p-5">
              <p className="text-sm font-semibold text-[#071A44]">
                Quick action
              </p>

              <p className="mt-1 text-sm text-[#6E6A63]">
                Build a new weekly challenge schedule.
              </p>

              <PuzzlePrimaryButton
                type="button"
                onClick={() => navigate('/challenges/create')}
                className="mt-4"
              >
                Create challenge →
              </PuzzlePrimaryButton>
            </div>
          </div>

          <div className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <PuzzleStatPill
              icon={<span>🧩</span>}
              label="Total challenges"
              value={`${summary.total}`}
            />

            <PuzzleStatPill
              icon={<span>🚀</span>}
              label="Active"
              value={`${summary.active}`}
            />

            <PuzzleStatPill
              icon={<span>✏️</span>}
              label="Drafts"
              value={`${summary.drafts}`}
            />

            <PuzzleStatPill
              icon={<span>👥</span>}
              label="Players"
              value={`${summary.players}`}
            />
          </div>

          {actionError ? (
            <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3">
              <p className="text-sm font-medium text-rose-700">
                {actionError}
              </p>
            </div>
          ) : null}
        </section>

        {challenges.length === 0 ? (
          <section className="rounded-[36px] border border-dashed border-[#D8D1C4] bg-white p-10 text-center shadow-sm">
            <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-[26px] bg-[#FFF2D9] text-4xl shadow-sm">
              🧠
            </div>

            <h2 className="font-serif text-3xl leading-tight text-[#071A44]">
              No puzzle challenges yet
            </h2>

            <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-[#6E6A63]">
              Create your first weekly puzzle challenge, choose the puzzle mix,
              set the price, and invite players to join.
            </p>

            <PuzzlePrimaryButton
              type="button"
              onClick={() => navigate('/challenges/create')}
              className="mt-6"
            >
              Create your first challenge →
            </PuzzlePrimaryButton>
          </section>
        ) : (
          <section className="rounded-[36px] border border-[#E8E0D3] bg-white p-5 shadow-sm sm:p-6">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-2xl font-semibold text-[#071A44]">
                  Your challenges
                </h2>

                <p className="mt-1 text-sm text-[#6E6A63]">
                  Review status, players and schedules.
                </p>
              </div>
            </div>

            <div className="grid gap-4">
              {challenges.map(challenge => (
                <ChallengeCard
                  key={challenge.id}
                  challenge={challenge}
                  activating={activatingId === challenge.id}
                  onOpen={() => navigate(`/challenges/${challenge.id}`)}
                  onActivate={() => handleActivate(challenge.id)}
                />
              ))}
            </div>
          </section>
        )}
      </div>
    </PuzzlePageShell>
  );
}

function ChallengeCard({
  challenge,
  activating,
  onOpen,
  onActivate,
}: {
  challenge: Challenge;
  activating: boolean;
  onOpen: () => void;
  onActivate: () => void;
}) {
  const statusMeta = STATUS_META[challenge.status] ?? {
    label: challenge.status,
    className: 'bg-[#F8F6F1] text-[#7C7468] border-[#E8E0D3]',
  };

  const isFree = Number(challenge.is_free) === 1;
  const currency = challenge.currency ?? 'eur';
  const symbol = CURRENCY_SYMBOLS[currency] ?? '€';

  const priceLabel = isFree
    ? 'Free'
    : challenge.weekly_price
      ? `${symbol}${(challenge.weekly_price / 100).toFixed(2)}/week`
      : 'Paid';

  const startLabel = challenge.starts_at
    ? new Date(challenge.starts_at).toLocaleDateString()
    : 'No date set';

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={event => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onOpen();
        }
      }}
      className="group cursor-pointer rounded-[28px] border border-[#E8E0D3] bg-[#FBF8F3] p-5 shadow-sm transition hover:-translate-y-0.5 hover:bg-white hover:shadow-md"
    >
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[20px] bg-[#FFF2D9] text-3xl shadow-sm">
            🧩
          </div>

          <div className="min-w-0">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <h3 className="truncate text-xl font-semibold text-[#071A44]">
                {challenge.title}
              </h3>

              <span
                className={`rounded-full border px-3 py-1 text-xs font-semibold ${statusMeta.className}`}
              >
                {statusMeta.label}
              </span>
            </div>

            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-[#6E6A63]">
              <span>
                {challenge.total_weeks} week{challenge.total_weeks !== 1 ? 's' : ''}
              </span>

              <span>
                Starts {startLabel}
              </span>

              <span>
                {Number(challenge.player_count ?? 0)} player
                {Number(challenge.player_count ?? 0) !== 1 ? 's' : ''}
              </span>

              <span>
                {priceLabel}
              </span>
            </div>
          </div>
        </div>

        <div
          className="flex flex-wrap items-center gap-2 lg:justify-end"
          onClick={event => event.stopPropagation()}
        >
          {challenge.status === 'draft' ? (
            <button
              type="button"
              onClick={onActivate}
              disabled={activating}
              className="inline-flex items-center justify-center rounded-full border border-[#D8E8D8] bg-[#EEF8EF] px-4 py-2.5 text-sm font-semibold text-[#2E6A46] transition hover:bg-[#E4F3E6] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {activating ? 'Activating…' : 'Activate'}
            </button>
          ) : null}

          <button
            type="button"
            onClick={onOpen}
            className="inline-flex items-center justify-center rounded-full border border-[#D8D1C4] bg-white px-4 py-2.5 text-sm font-semibold text-[#071A44] transition hover:bg-[#F8F5EF]"
          >
            Manage →
          </button>
        </div>
      </div>
    </div>
  );
}