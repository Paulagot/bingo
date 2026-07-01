// src/components/puzzles/pages/PlayerChallengePage.tsx

import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  supporterAuthService,
  type PublicChallenge,
  type ScheduleRow,
} from '../services/SupporterAuthService';
import PuzzlePageShell from '../ui/PuzzlePageShell';
import PuzzlePrimaryButton from '../ui/PuzzlePrimaryButton';
import PuzzleStatPill from '../ui/PuzzleStatPill';

interface WeekState {
  weekNumber: number;
  puzzleType: string;
  difficulty: string;
  unlocksAt: Date | null;
  status: 'locked' | 'available' | 'completed';
}

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

const CURRENCY_SYMBOLS: Record<string, string> = {
  eur: '€',
  gbp: '£',
  usd: '$',
};

export default function PlayerChallengePage() {
  const { challengeId } = useParams<{ challengeId: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [challenge, setChallenge] = useState<PublicChallenge | null>(null);
  const [weeks, setWeeks] = useState<WeekState[]>([]);
  const [enrolled, setEnrolled] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [pageError, setPageError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // isAuthenticated() reads a token from localStorage, so it isn't
  // reactive on its own — this is re-evaluated explicitly below, after
  // any Stripe session exchange has had a chance to set a fresh token,
  // rather than captured once and frozen for the lifetime of the
  // component.
  const [isAuth, setIsAuth] = useState(() => supporterAuthService.isAuthenticated());

  const sessionId = searchParams.get('session_id');

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

      // Landed here from Stripe Checkout (success_url carries
      // ?session_id=... deliberately with no token in it — see
      // exchangeSessionForSupporterToken for why). Exchange it for a
      // real supporter token before deciding anything about auth/
      // enrollment state below, so a just-paid player doesn't briefly
      // (or permanently, if they don't reload) see "Join challenge"
      // for a challenge they already paid for.
      let authNow = supporterAuthService.isAuthenticated();

      // True once we have independent proof of enrollment that doesn't
      // depend on the webhook having landed yet — exchangeSession
      // succeeding already means Stripe confirmed this exact session
      // as paid for this exact challenge, which is a stronger and
      // faster signal than waiting on getEnrollmentStatus to agree
      // (that query depends on confirmSubscriptionCheckout having
      // already run off the webhook, which is a separate, slower path
      // that may not have completed yet when this page first loads).
      let provenEnrolledByCheckout = false;

      if (sessionId && !authNow) {
        try {
          await supporterAuthService.exchangeSession(sessionId, currentChallengeId);
          authNow = true;
          provenEnrolledByCheckout = true;
          setIsAuth(true);
        } catch (err) {
          // Don't fail the whole page over this — fall through to the
          // normal unauthenticated view. The most common real cause is
          // the player reloading this URL much later after the token
          // they'd otherwise already have has naturally been used, or
          // a session that doesn't match this challenge.
          console.warn('Stripe session exchange failed:', (err as Error).message);
        } finally {
          // Strip session_id from the URL once consumed (or once we've
          // given up on it) so a refresh/bookmark of this page doesn't
          // keep re-attempting the exchange on every load.
          searchParams.delete('session_id');
          setSearchParams(searchParams, { replace: true });
        }
      }

      try {
        const data = await supporterAuthService.getPublicChallenge(currentChallengeId);
        setChallenge(data);

        if (authNow) {
          const [scheduleData, enrollmentData] = await Promise.all([
            supporterAuthService
              .getSchedule(currentChallengeId)
              .catch(() => [] as ScheduleRow[]),
            supporterAuthService
              .getEnrollmentStatus(currentChallengeId)
              .catch(() => null),
          ]);

          setEnrolled((enrollmentData?.enrolled ?? false) || provenEnrolledByCheckout);

          if (scheduleData.length) {
            setWeeks(mapScheduleToWeekState(scheduleData));
          }
        } else {
          setEnrolled(false);
          setWeeks([]);
        }
      } catch {
        setPageError('Could not load this challenge.');
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [challengeId]);

  async function handleJoinFree() {
    if (!challengeId) return;

    if (!isAuth) {
      navigate(`/join/puzzle/challenge/${challengeId}`);
      return;
    }

    setJoining(true);
    setActionError(null);

    try {
      await supporterAuthService.joinFree(challengeId);
      setEnrolled(true);

      const scheduleData = await supporterAuthService.getSchedule(challengeId);
      setWeeks(mapScheduleToWeekState(scheduleData));
    } catch (err) {
      setActionError((err as Error).message);
    } finally {
      setJoining(false);
    }
  }

  const challengeIsFree = Number(challenge?.is_free) === 1;

  const weeklyAmount = useMemo(() => {
    if (!challenge?.weekly_price) return null;

    const currency = challenge.currency ?? 'eur';
    const symbol = CURRENCY_SYMBOLS[currency] ?? '€';

    return `${symbol}${(challenge.weekly_price / 100).toFixed(2)}/week`;
  }, [challenge]);

  const availableWeeks = weeks.filter(w => w.status === 'available').length;
  const lockedWeeks = weeks.filter(w => w.status === 'locked').length;
  const completedWeeks = weeks.filter(w => w.status === 'completed').length;

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
        <div className="rounded-[28px] border border-[#E7C4C4] bg-white p-8 text-center shadow-sm">
          <p className="mb-2 text-3xl">😕</p>
          <p className="font-semibold text-[#071A44]">
            {pageError ?? 'Challenge not found'}
          </p>
        </div>
      </PuzzlePageShell>
    );
  }

  const resolvedChallengeId = challengeId ?? challenge.id;

  return (
    <PuzzlePageShell
      rightHeaderContent={
        <div className="rounded-2xl border border-[#D8E8D8] bg-[#EEF8EF] px-4 py-2 shadow-sm">
          <p className="text-sm font-semibold text-[#2E6A46]">
            {enrolled ? 'Subscriber active' : 'Join challenge'}
          </p>
          <p className="text-xs text-[#5F7D6A]">
            {challengeIsFree ? 'Free access' : 'Weekly subscription'}
          </p>
        </div>
      }
    >
      <div className="grid gap-6 lg:grid-cols-[1.5fr_0.8fr]">
        <main className="space-y-6">
          <section className="rounded-[32px] border border-[#E8E0D3] bg-white p-6 shadow-sm sm:p-8">
            <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="mb-2 text-sm font-semibold uppercase tracking-[0.18em] text-[#E36B2C]">
                  This week&apos;s challenge
                </p>

                <h1 className="font-serif text-4xl leading-tight text-[#071A44] sm:text-5xl">
                  {challenge.title}
                </h1>

                <p className="mt-3 max-w-2xl text-base text-[#5F5A54]">
                  {challenge.description ||
                    'Sharpen your mind, build your streak, and come back each week for a fresh puzzle.'}
                </p>
              </div>

              <div className="rounded-2xl bg-[#F6F1E8] px-4 py-3 text-right">
                <p className="text-xs font-medium uppercase tracking-wide text-[#8A847B]">
                  Starts
                </p>
                <p className="text-sm font-semibold text-[#071A44]">
                  {new Date(challenge.starts_at).toLocaleDateString()}
                </p>
              </div>
            </div>

            <div className="mb-6 grid gap-3 sm:grid-cols-3">
              <PuzzleStatPill
                icon={<span>🗓️</span>}
                label="Challenge length"
                value={`${challenge.total_weeks} week${challenge.total_weeks !== 1 ? 's' : ''}`}
              />

              <PuzzleStatPill
                icon={<span>🔥</span>}
                label="Available now"
                value={`${availableWeeks} unlocked`}
              />

              <PuzzleStatPill
                icon={<span>⭐</span>}
                label="Access"
                value={challengeIsFree ? 'Free challenge' : weeklyAmount ?? 'Paid weekly'}
              />
            </div>

            {!enrolled && (
              <div className="rounded-[28px] border border-[#E8E0D3] bg-[#FBF8F3] p-6">
                <p className="mb-4 text-sm text-[#5F5A54]">
                  {isAuth
                    ? 'You are not enrolled yet. Join now to unlock your weekly puzzles.'
                    : 'Join this challenge to receive your weekly puzzles and build your streak.'}
                </p>

                <div className="flex flex-wrap gap-3">
                  {challengeIsFree ? (
                    <PuzzlePrimaryButton onClick={handleJoinFree} disabled={joining}>
                      {joining ? 'Joining…' : 'Start this week’s puzzle →'}
                    </PuzzlePrimaryButton>
                  ) : (
                    <PuzzlePrimaryButton
                      onClick={() => navigate(`/join/puzzle/challenge/${resolvedChallengeId}`)}
                    >
                      Join challenge →
                    </PuzzlePrimaryButton>
                  )}

                  {!isAuth && (
                    <button
                      type="button"
                      onClick={() =>
                        navigate('/puzzle-login', {
                          state: {
                            challengeId: resolvedChallengeId,
                            clubId: challenge.club_id,
                          },
                        })
                      }
                      className="inline-flex items-center justify-center rounded-full border border-[#D8D1C4] bg-white px-5 py-3 text-sm font-semibold text-[#071A44] transition hover:bg-[#F8F5EF]"
                    >
                      Already joined? Sign in
                    </button>
                  )}
                </div>

                {actionError ? (
                  <p className="mt-4 text-sm font-medium text-rose-600">
                    {actionError}
                  </p>
                ) : null}
              </div>
            )}

            {enrolled && (
              <div className="rounded-[28px] border border-[#D8E8D8] bg-[#F3FAF4] p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-[#2E6A46]">
                      Subscriber active
                    </p>
                    <p className="text-sm text-[#5F7D6A]">
                      Your challenge is live and ready to play.
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2 text-xs">
                    <span className="rounded-full bg-white px-3 py-1.5 font-medium text-[#071A44]">
                      {availableWeeks} available
                    </span>
                    <span className="rounded-full bg-white px-3 py-1.5 font-medium text-[#071A44]">
                      {lockedWeeks} locked
                    </span>
                    <span className="rounded-full bg-white px-3 py-1.5 font-medium text-[#071A44]">
                      {completedWeeks} completed
                    </span>
                  </div>
                </div>
              </div>
            )}
          </section>

          {enrolled && (
            <section className="rounded-[32px] border border-[#E8E0D3] bg-white p-6 shadow-sm sm:p-8">
              <div className="mb-5 flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-semibold text-[#071A44]">
                    More puzzles
                  </h2>
                  <p className="mt-1 text-sm text-[#6E6A63]">
                    Your weekly schedule and unlocked challenges.
                  </p>
                </div>
              </div>

              {weeks.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-[#D8D1C4] bg-[#FBF8F3] p-8 text-center">
                  <p className="text-sm text-[#6E6A63]">
                    Schedule not available yet.
                  </p>
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {weeks.map(week => (
                    <WeekCard
                      key={week.weekNumber}
                      week={week}
                      onPlay={() =>
                        navigate(`/challenges/${resolvedChallengeId}/puzzle/${week.weekNumber}`)
                      }
                    />
                  ))}
                </div>
              )}
            </section>
          )}
        </main>

        <aside className="space-y-6">
          <section className="rounded-[32px] border border-[#E8E0D3] bg-white p-6 shadow-sm">
            <div className="mb-4 text-center">
              <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-[24px] bg-[#FFF2D9] text-4xl shadow-sm">
                🏆
              </div>

              <h3 className="font-serif text-3xl leading-tight text-[#071A44]">
                New weekly
                <br />
                challenge unlocked!
              </h3>

              <p className="mt-3 text-sm text-[#6E6A63]">
                A new challenge is sent every week to keep your mind sharp.
              </p>
            </div>

            <div className="rounded-[24px] border border-[#E8E0D3] bg-[#FBF8F3] p-5 text-center">
              <span className="mb-3 inline-flex rounded-full bg-[#E9E0FB] px-3 py-1 text-xs font-semibold text-[#6E50A0]">
                Week 1
              </span>

              <p className="mb-2 font-serif text-2xl text-[#071A44]">
                {weeks[0]
                  ? PUZZLE_TYPE_LABELS[weeks[0].puzzleType] ?? weeks[0].puzzleType
                  : 'Weekly puzzle'}
              </p>

              <p className="mb-5 text-sm text-[#6E6A63]">
                Come back each week for a fresh brain challenge.
              </p>

              {enrolled ? (
                <PuzzlePrimaryButton
                  fullWidth
                  onClick={() => {
                    const firstAvailable = weeks.find(w => w.status === 'available');

                    if (firstAvailable) {
                      navigate(
                        `/challenges/${resolvedChallengeId}/puzzle/${firstAvailable.weekNumber}`
                      );
                    }
                  }}
                  disabled={!weeks.some(w => w.status === 'available')}
                >
                  Play now →
                </PuzzlePrimaryButton>
              ) : (
                <PuzzlePrimaryButton
                  fullWidth
                  onClick={() => {
                    if (challengeIsFree) {
                      handleJoinFree();
                      return;
                    }

                    navigate(`/join/puzzle/challenge/${resolvedChallengeId}`);
                  }}
                  disabled={joining}
                >
                  {challengeIsFree ? 'Join free →' : 'Join challenge →'}
                </PuzzlePrimaryButton>
              )}
            </div>
          </section>

          <section className="rounded-[32px] border border-[#E8E0D3] bg-white p-6 shadow-sm">
            <h3 className="mb-4 text-lg font-semibold text-[#071A44]">
              Challenge summary
            </h3>

            <div className="space-y-3 text-sm">
              <SummaryRow
                label="Host"
                value={challenge.club_name ?? 'FundRaisely club'}
              />
              <SummaryRow label="Weeks" value={`${challenge.total_weeks}`} />
              <SummaryRow
                label="Pricing"
                value={challengeIsFree ? 'Free' : weeklyAmount ?? 'Paid'}
              />
              <SummaryRow
                label="Status"
                value={enrolled ? 'Enrolled' : 'Not joined'}
              />
            </div>
          </section>
        </aside>
      </div>
    </PuzzlePageShell>
  );
}

function mapScheduleToWeekState(scheduleData: ScheduleRow[]): WeekState[] {
  const now = new Date();

  return scheduleData.map(row => ({
    weekNumber: row.week_number,
    puzzleType: row.puzzle_type,
    difficulty: row.difficulty,
    unlocksAt: row.unlocks_at ? new Date(row.unlocks_at) : null,
    status:
      !row.unlocks_at || new Date(row.unlocks_at) <= now
        ? 'available'
        : 'locked',
  }));
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

function WeekCard({
  week,
  onPlay,
}: {
  week: WeekState;
  onPlay: () => void;
}) {
  const isLocked = week.status === 'locked';
  const isCompleted = week.status === 'completed';

  const bgClass = isLocked
    ? 'bg-[#F8F6F1]'
    : week.weekNumber % 4 === 1
      ? 'bg-[#F4EBFA]'
      : week.weekNumber % 4 === 2
        ? 'bg-[#EEF7EE]'
        : week.weekNumber % 4 === 3
          ? 'bg-[#EEF3FB]'
          : 'bg-[#FBEFDF]';

  const badgeText = isLocked
    ? 'Locked'
    : isCompleted
      ? 'Completed'
      : 'Available';

  const icon = isLocked ? '🔒' : isCompleted ? '✅' : '🧩';

  return (
    <div className={`rounded-[28px] border border-[#E8E0D3] p-5 shadow-sm ${bgClass}`}>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-2xl shadow-sm">
          {icon}
        </div>

        <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-[#6E6A63] shadow-sm">
          Week {week.weekNumber}
        </span>
      </div>

      <h3 className="text-xl font-semibold text-[#071A44]">
        {PUZZLE_TYPE_LABELS[week.puzzleType] ?? week.puzzleType}
      </h3>

      <p className="mt-2 text-sm capitalize text-[#6E6A63]">
        {week.difficulty} difficulty
      </p>

      <div className="mt-4 flex items-center justify-between gap-3">
        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold ${
            isLocked
              ? 'bg-[#ECE8DF] text-[#7C7468]'
              : isCompleted
                ? 'bg-[#E8F6EA] text-[#2E6A46]'
                : 'bg-[#E8F0FB] text-[#355C92]'
          }`}
        >
          {badgeText}
        </span>

        {isLocked && week.unlocksAt ? (
          <span className="text-xs text-[#8A847B]">
            Unlocks {week.unlocksAt.toLocaleDateString()}
          </span>
        ) : null}
      </div>

      <button
        type="button"
        onClick={onPlay}
        disabled={isLocked}
        className={`mt-5 w-full rounded-full px-4 py-3 text-sm font-semibold transition ${
          isLocked
            ? 'cursor-not-allowed bg-white text-[#A39C91]'
            : 'bg-[#071A44] text-white hover:opacity-95'
        }`}
      >
        {isLocked ? 'Locked' : isCompleted ? 'View result' : 'Play now →'}
      </button>
    </div>
  );
}