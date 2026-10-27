// src/components/puzzles/pages/PlayerChallengePage.tsx
//
// Subscriber dashboard for Puzzle Subscription.
// Updated to use shared PuzzleTypePreview artwork and clearer leaderboard wording.

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';

import {
  supporterAuthService,
  type PublicChallenge,
  type ScheduleRow,
} from '../services/SupporterAuthService';

import PuzzlePageShell from '../ui/PuzzlePageShell';
import PuzzlePrimaryButton from '../ui/PuzzlePrimaryButton';
import { resolvePuzzleTheme } from '../ui/puzzleTheme';
import PuzzleTypePreview, { getPuzzleTypeLabel } from '../ui/PuzzleTypePreview';

interface WeekState {
  weekNumber: number;
  puzzleType: string;
  difficulty: string;
  unlocksAt: Date | null;
  status: 'locked' | 'available' | 'completed';
}

const PUZZLE_DESCRIPTIONS: Record<string, string> = {
  anagram: 'Unscramble the letters and find the hidden word.',
  sequenceOrdering: 'Put the items into the correct order.',
  matchPairs: 'Find every matching pair.',
  wordSearch: 'Find the hidden words in the grid.',
  slidingTile: 'Move the tiles into the correct order.',
  sudoku: 'Complete the number grid.',
  patternCompletion: 'Spot the pattern and complete it.',
  wordLadder: 'Change one letter at a time to reach the final word.',
  cryptogram: 'Decode the hidden message.',
  numberPath: 'Connect the numbers in the correct path.',
  towersOfHanoi: 'Move the tower using the fewest legal moves.',
  nonogram: 'Use the clues to reveal the hidden picture.',
  memoryPairs: 'Remember the cards and find every pair.',
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
  const [showAllPuzzles, setShowAllPuzzles] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);

  const [isAuth, setIsAuth] = useState(() => supporterAuthService.isAuthenticated());

  const sessionId = searchParams.get('session_id');
  const theme = useMemo(() => resolvePuzzleTheme(challenge), [challenge]);

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

      let authNow = supporterAuthService.isAuthenticated();
      let provenEnrolledByCheckout = false;

      if (sessionId && !authNow) {
        try {
          await supporterAuthService.exchangeSession(sessionId, currentChallengeId);
          authNow = true;
          provenEnrolledByCheckout = true;
          setIsAuth(true);
        } catch (err) {
          console.warn('Stripe session exchange failed:', (err as Error).message);
        } finally {
          searchParams.delete('session_id');
          setSearchParams(searchParams, { replace: true });
        }
      }

      try {
        const data = await supporterAuthService.getPublicChallenge(currentChallengeId);
        setChallenge(data);

        if (authNow) {
          const [scheduleData, enrollmentData] = await Promise.all([
            supporterAuthService.getSchedule(currentChallengeId).catch(() => [] as ScheduleRow[]),
            supporterAuthService.getEnrollmentStatus(currentChallengeId).catch(() => null),
          ]);

          setEnrolled((enrollmentData?.enrolled ?? false) || provenEnrolledByCheckout);
          setWeeks(scheduleData.length ? mapScheduleToWeekState(scheduleData) : []);
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

    void load();
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

  async function handleShare() {
    if (!challenge) return;

    const shareUrl = `${window.location.origin}/join/puzzle/challenge/${challenge.id}`;
    const shareData = {
      title: challenge.title,
      text: `I'm taking part in ${challenge.title}. Join the weekly puzzle fundraiser and see how you score.`,
      url: shareUrl,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
        return;
      }

      await navigator.clipboard.writeText(shareUrl);
      setShareCopied(true);
      window.setTimeout(() => setShareCopied(false), 1800);
    } catch (err) {
      if ((err as DOMException)?.name !== 'AbortError') {
        console.warn('[PlayerChallengePage] Share failed:', err);
      }
    }
  }

  const challengeIsFree = Number(challenge?.is_free) === 1;

  const weeklyAmount = useMemo(() => {
    if (!challenge?.weekly_price) return null;
    const currency = String(challenge.currency ?? 'eur').toLowerCase();
    const symbol = CURRENCY_SYMBOLS[currency] ?? '€';
    return `${symbol}${(challenge.weekly_price / 100).toFixed(2)}/week`;
  }, [challenge]);

  const availableWeeks = weeks.filter(w => w.status === 'available').length;
  const lockedWeeks = weeks.filter(w => w.status === 'locked').length;
  const completedWeeks = weeks.filter(w => w.status === 'completed').length;
  const totalWeeks = weeks.length || Number(challenge?.total_weeks ?? 0);

  const progressPercent =
    totalWeeks > 0 ? Math.min(100, Math.max(0, (completedWeeks / totalWeeks) * 100)) : 0;

  const currentAvailableWeek = weeks.find(w => w.status === 'available') ?? null;
  const nextLockedWeek = weeks.find(w => w.status === 'locked') ?? null;
  const lastCompletedWeek = [...weeks].reverse().find(w => w.status === 'completed') ?? null;
  const featuredWeek = currentAvailableWeek ?? nextLockedWeek ?? lastCompletedWeek ?? weeks[0] ?? null;
  const allComplete = weeks.length > 0 && completedWeeks === weeks.length;

  const compactWeeks = useMemo(() => {
    if (showAllPuzzles || weeks.length <= 8) return weeks;

    const relevant = new Map<number, WeekState>();
    weeks.filter(w => w.status === 'completed').slice(-3).forEach(w => relevant.set(w.weekNumber, w));
    weeks.filter(w => w.status === 'available').slice(0, 3).forEach(w => relevant.set(w.weekNumber, w));
    weeks.filter(w => w.status === 'locked').slice(0, 2).forEach(w => relevant.set(w.weekNumber, w));

    return [...relevant.values()].sort((a, b) => a.weekNumber - b.weekNumber);
  }, [weeks, showAllPuzzles]);

  if (loading) {
    return (
      <PuzzlePageShell
        theme={theme}
        clubName={challenge?.club_name}
        rightHeaderContent={<span className="rounded-full bg-white px-4 py-2 text-sm font-medium text-[#6E6A63] shadow-sm">Loading…</span>}
      >
        <div className="flex min-h-[50vh] items-center justify-center">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#D8D1C4] border-t-[var(--puzzle-primary)]" />
        </div>
      </PuzzlePageShell>
    );
  }

  if (pageError || !challenge) {
    return (
      <PuzzlePageShell theme={theme} clubName={challenge?.club_name}>
        <div className="mx-auto max-w-xl rounded-[28px] border border-[#E7C4C4] bg-white p-8 text-center shadow-sm">
          <h1 className="font-serif text-3xl text-[#071A44]">Challenge unavailable</h1>
          <p className="mt-3 text-sm text-[#6E6A63]">{pageError ?? 'Challenge not found'}</p>
        </div>
      </PuzzlePageShell>
    );
  }

  const resolvedChallengeId = challengeId ?? challenge.id;
  const featuredPuzzleLabel = featuredWeek ? getPuzzleTypeLabel(featuredWeek.puzzleType) : 'Weekly puzzle';
  const featuredPuzzleDescription =
    featuredWeek ? PUZZLE_DESCRIPTIONS[featuredWeek.puzzleType] ?? 'A fresh puzzle challenge is waiting for you.' : 'A fresh puzzle challenge is waiting for you.';

  const heroEyebrow = allComplete
    ? 'Challenge complete'
    : currentAvailableWeek
      ? currentAvailableWeek.weekNumber < Math.max(...weeks.map(w => w.weekNumber), 1)
        ? 'Your next puzzle'
        : 'This week’s challenge'
      : 'Coming up next';

  return (
    <PuzzlePageShell
      theme={theme}
      clubName={challenge.club_name}
      rightHeaderContent={
        <div className="hidden rounded-2xl border border-[#D8E8D8] bg-[#EEF8EF] px-4 py-2 shadow-sm sm:block">
          <p className="text-sm font-semibold text-[#2E6A46]">{enrolled ? 'Subscriber active' : 'Join challenge'}</p>
          <p className="text-xs text-[#5F7D6A]">{challengeIsFree ? 'Free access' : weeklyAmount ?? 'Weekly subscription'}</p>
        </div>
      }
    >
      <div className="mx-auto w-full min-w-0 max-w-6xl overflow-x-hidden">
        <section className="mb-4 flex min-w-0 flex-col gap-4 sm:mb-6 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#E36B2C] sm:text-xs">Puzzle Challenge</p>
            <h1 className="mt-1 break-words font-serif text-[2.4rem] leading-[1] text-[#071A44] sm:text-5xl">{challenge.title}</h1>
            <p className="mt-2 max-w-2xl break-words text-sm leading-6 text-[#5F5A54] sm:text-base">
              Play the next puzzle. Build your progress. Climb the leaderboard.
            </p>
          </div>

          <div className="flex min-w-0 flex-wrap gap-2">
            {enrolled ? (
              <span className="inline-flex items-center gap-2 rounded-full border border-[#D8E8D8] bg-[#EEF8EF] px-3 py-2 text-xs font-bold text-[#2E6A46] sm:px-4">
                <CheckIcon />
                Subscriber active
              </span>
            ) : null}

            <button
              type="button"
              onClick={handleShare}
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-full border border-[#D8D1C4] bg-white px-4 py-2 text-xs font-bold text-[#071A44] shadow-sm transition hover:bg-[#FBF8F3]"
            >
              <ShareIcon />
              {shareCopied ? 'Link copied' : 'Share challenge'}
            </button>
          </div>
        </section>

        {!enrolled ? (
          <section className="mb-5 w-full min-w-0 rounded-[28px] border border-[#E8E0D3] bg-white p-5 shadow-sm sm:p-7">
            <p className="text-sm leading-6 text-[#5F5A54]">
              {isAuth
                ? 'You are not enrolled yet. Join now to unlock your weekly puzzles.'
                : 'Join this challenge to receive your weekly puzzles and take part in the leaderboard.'}
            </p>

            <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
              {challengeIsFree ? (
                <PuzzlePrimaryButton onClick={handleJoinFree} disabled={joining}>
                  {joining ? 'Joining…' : 'Join challenge →'}
                </PuzzlePrimaryButton>
              ) : (
                <PuzzlePrimaryButton onClick={() => navigate(`/join/puzzle/challenge/${resolvedChallengeId}`)}>
                  Join challenge →
                </PuzzlePrimaryButton>
              )}

              {!isAuth ? (
                <button
                  type="button"
                  onClick={() => navigate('/puzzle-login', { state: { challengeId: resolvedChallengeId, clubId: challenge.club_id } })}
                  className="inline-flex min-h-11 items-center justify-center rounded-full border border-[#D8D1C4] bg-white px-5 py-3 text-sm font-semibold text-[#071A44]"
                >
                  Already joined? Sign in
                </button>
              ) : null}
            </div>

            {actionError ? <p className="mt-4 text-sm font-medium text-rose-600">{actionError}</p> : null}
          </section>
        ) : null}

        {enrolled ? (
          <section className="w-full min-w-0 overflow-hidden rounded-[28px] border border-[#E8E0D3] bg-white shadow-sm sm:rounded-[34px]">
            <div className="grid min-w-0 lg:grid-cols-[0.95fr_1.05fr] lg:items-stretch">
              <div className="min-w-0 p-5 sm:p-7 lg:p-8">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#E36B2C] sm:text-xs">{heroEyebrow}</p>
                <h2 className="mt-2 break-words font-serif text-[2.25rem] leading-[1.02] text-[#071A44] sm:text-5xl">{featuredPuzzleLabel}</h2>
                <p className="mt-3 max-w-xl break-words text-sm leading-6 text-[#5F5A54] sm:text-base">{featuredPuzzleDescription}</p>

                <div className="mt-5 grid min-w-0 grid-cols-2 gap-2 sm:flex sm:flex-wrap">
                  <DashboardStat icon={<CalendarIcon />} label="Current" value={featuredWeek ? `Week ${featuredWeek.weekNumber}` : 'Waiting'} />
                  <DashboardStat icon={<CheckIcon />} label="Completed" value={`${completedWeeks} of ${totalWeeks}`} />
                  <DashboardStat icon={<TrophyIcon />} label="Competing" value="Weekly + overall" className="col-span-2 sm:col-auto" />
                </div>

                <div className="mt-6 flex min-w-0 flex-col gap-2 sm:flex-row sm:flex-wrap">
                  {currentAvailableWeek ? (
                    <button
                      type="button"
                      onClick={() => navigate(`/challenges/${resolvedChallengeId}/puzzle/${currentAvailableWeek.weekNumber}`)}
                      className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#071A44] px-6 py-3 text-sm font-black text-white shadow-sm transition hover:opacity-95 sm:w-auto"
                    >
                      {completedWeeks > 0 ? 'Play next puzzle' : 'Start first puzzle'}
                      <ArrowRightIcon />
                    </button>
                  ) : allComplete ? (
                    <button
                      type="button"
                      onClick={() => navigate(`/challenges/${resolvedChallengeId}/standings`)}
                      className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#071A44] px-6 py-3 text-sm font-black text-white sm:w-auto"
                    >
                      View overall leaderboard
                      <ArrowRightIcon />
                    </button>
                  ) : (
                    <button type="button" disabled className="inline-flex min-h-12 w-full cursor-not-allowed items-center justify-center rounded-2xl bg-[#ECE8DF] px-6 py-3 text-sm font-black text-[#8A847B] sm:w-auto">
                      Next puzzle locked
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => navigate(`/leaderboards/${resolvedChallengeId}`)}
                    className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border border-[#D8D1C4] bg-white px-5 py-3 text-sm font-bold text-[#071A44] sm:w-auto"
                  >
                    <TrophyIcon className="h-4 w-4" />
                    Weekly Wall of Fame
                  </button>
                </div>

                {!currentAvailableWeek && nextLockedWeek?.unlocksAt ? (
                  <p className="mt-4 text-xs font-semibold text-[#8A847B]">
                    Next puzzle unlocks {nextLockedWeek.unlocksAt.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}.
                  </p>
                ) : null}
              </div>

              <div className="min-w-0 bg-[linear-gradient(135deg,#FBF8F3_0%,var(--puzzle-bg-accent)_100%)] p-5 sm:p-7 lg:grid lg:place-items-center lg:p-8">
                <div className="mx-auto w-full max-w-[430px]">
                  <div className="rounded-[28px] border border-white/70 bg-white/80 p-4 shadow-[0_18px_55px_rgba(7,26,68,0.10)] backdrop-blur sm:p-5">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-[9px] font-black uppercase tracking-[0.16em] text-[#8A847B]">
                          {featuredWeek ? `Week ${featuredWeek.weekNumber}` : 'Weekly puzzle'}
                        </p>
                        <p className="mt-1 text-sm font-bold capitalize text-[#071A44]">
                          {featuredWeek?.difficulty ?? 'medium'} difficulty
                        </p>
                      </div>

                      <span
                        className={`rounded-full px-3 py-1.5 text-[10px] font-black uppercase tracking-wide ${
                          featuredWeek?.status === 'completed'
                            ? 'bg-[#E8F6EA] text-[#2E6A46]'
                            : featuredWeek?.status === 'locked'
                              ? 'bg-[#ECE8DF] text-[#7C7468]'
                              : 'bg-[#E8F0FB] text-[#355C92]'
                        }`}
                      >
                        {featuredWeek?.status === 'available'
                          ? 'Ready to play'
                          : featuredWeek?.status ?? 'waiting'}
                      </span>
                    </div>

                    <div className="mt-4 min-h-[225px] rounded-[24px] bg-white p-4 sm:min-h-[260px] sm:p-5">
                      <PuzzleTypePreview puzzleType={featuredWeek?.puzzleType ?? 'wordLadder'} size="hero" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        ) : null}

        {enrolled ? (
          <section className="mt-5 grid min-w-0 gap-4 lg:grid-cols-[1.15fr_0.85fr]">
            <div className="min-w-0 rounded-[26px] border border-[#E8E0D3] bg-white p-5 shadow-sm sm:p-6">
              <div className="flex min-w-0 items-end justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#8A847B] sm:text-xs">Your progress</p>
                  <h2 className="mt-1 break-words font-serif text-3xl text-[#071A44]">
                    {completedWeeks} of {totalWeeks} puzzles completed
                  </h2>
                </div>
                <span className="shrink-0 text-sm font-black text-[var(--puzzle-primary)]">{Math.round(progressPercent)}%</span>
              </div>

              <div className="mt-4 h-3 w-full overflow-hidden rounded-full bg-[#F0ECE5]">
                <div className="h-full rounded-full bg-[var(--puzzle-primary)] transition-[width] duration-500" style={{ width: `${progressPercent}%` }} />
              </div>

              <div className="mt-5 grid grid-cols-3 gap-2">
                <MiniStat value={completedWeeks} label="Completed" />
                <MiniStat value={availableWeeks} label="Available" />
                <MiniStat value={lockedWeeks} label="Coming up" />
              </div>
            </div>

            <div className="grid min-w-0 gap-3 sm:grid-cols-2 lg:grid-cols-1">
              <FeatureActionCard
                eyebrow="Overall leaderboard"
                title="See your rank across the full challenge"
                text="Compare your total score against every subscriber across all completed weekly puzzles."
                buttonLabel="View overall leaderboard"
                icon={<TrophyIcon className="h-6 w-6" />}
                onClick={() => navigate(`/challenges/${resolvedChallengeId}/standings`)}
              />

              <FeatureActionCard
                eyebrow="Weekly Wall of Fame"
                title="See the top players for each puzzle"
                text="Open the public weekly boards, see who cracked each challenge, and share the competition with a friend."
                buttonLabel={shareCopied ? 'Link copied' : 'View Wall of Fame'}
                icon={<ShareIcon className="h-6 w-6" />}
                onClick={() => navigate(`/leaderboards/${resolvedChallengeId}`)}
              />
            </div>
          </section>
        ) : null}

        {enrolled ? (
          <section className="mt-5 w-full min-w-0 rounded-[28px] border border-[#E8E0D3] bg-white p-5 shadow-sm sm:p-7">
            <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#8A847B] sm:text-xs">Weekly puzzles</p>
                <h2 className="mt-1 break-words font-serif text-3xl text-[#071A44] sm:text-4xl">More puzzles</h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-[#6E6A63]">
                  Pick up where you left off, revisit completed leaderboards, or see what is coming next.
                </p>
              </div>

              {weeks.length > 8 ? (
                <button
                  type="button"
                  onClick={() => setShowAllPuzzles(value => !value)}
                  className="inline-flex min-h-10 shrink-0 items-center justify-center rounded-full border border-[#D8D1C4] bg-[#FBF8F3] px-4 py-2 text-xs font-bold text-[#071A44]"
                >
                  {showAllPuzzles ? 'Show highlights' : `View all ${weeks.length} puzzles`}
                </button>
              ) : null}
            </div>

            {weeks.length === 0 ? (
              <div className="mt-5 rounded-2xl border border-dashed border-[#D8D1C4] bg-[#FBF8F3] p-8 text-center">
                <p className="text-sm text-[#6E6A63]">Your puzzle schedule is not available yet.</p>
              </div>
            ) : (
              <div className="mt-6 grid min-w-0 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {compactWeeks.map(week => (
                  <WeekCard
                    key={week.weekNumber}
                    week={week}
                    challengeId={resolvedChallengeId}
                    onPlay={() => navigate(`/challenges/${resolvedChallengeId}/puzzle/${week.weekNumber}`)}
                  />
                ))}
              </div>
            )}
          </section>
        ) : null}
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
    status: row.is_correct !== null ? 'completed' : !row.unlocks_at || new Date(row.unlocks_at) <= now ? 'available' : 'locked',
  }));
}

function DashboardStat({
  icon,
  label,
  value,
  className = '',
}: {
  icon: ReactNode;
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className={`min-w-0 rounded-2xl border border-[#E8E0D3] bg-[#FBF8F3] px-3 py-3 ${className}`}>
      <div className="flex min-w-0 items-center gap-2">
        <span className="shrink-0 text-[var(--puzzle-primary)]">{icon}</span>
        <div className="min-w-0">
          <p className="text-[8px] font-black uppercase tracking-wide text-[#9A9287]">{label}</p>
          <p className="mt-0.5 truncate text-xs font-black text-[#071A44]">{value}</p>
        </div>
      </div>
    </div>
  );
}

function MiniStat({ value, label }: { value: number; label: string }) {
  return (
    <div className="min-w-0 rounded-2xl bg-[#FBF8F3] px-3 py-4 text-center">
      <p className="font-serif text-2xl text-[#071A44]">{value}</p>
      <p className="mt-1 truncate text-[9px] font-black uppercase tracking-wide text-[#8A847B] sm:text-[10px]">{label}</p>
    </div>
  );
}

function FeatureActionCard({
  eyebrow,
  title,
  text,
  buttonLabel,
  icon,
  onClick,
}: {
  eyebrow: string;
  title: string;
  text: string;
  buttonLabel: string;
  icon: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="min-w-0 rounded-[24px] border border-[#E8E0D3] bg-[linear-gradient(135deg,#FFFFFF_0%,#FBF8F3_100%)] p-5 text-left shadow-sm transition hover:translate-y-[-1px] hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-3">
        <span className="rounded-2xl bg-[var(--puzzle-bg-accent)] p-3 text-[var(--puzzle-primary)]">{icon}</span>
        <span className="rounded-full bg-[#EEF8EF] px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.16em] text-[#2E6A46]">
          Explore
        </span>
      </div>

      <p className="mt-4 text-[10px] font-black uppercase tracking-[0.16em] text-[#8A847B]">{eyebrow}</p>
      <h3 className="mt-1 font-serif text-2xl leading-tight text-[#071A44]">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-[#6E6A63]">{text}</p>

      <span className="mt-4 inline-flex min-h-11 items-center justify-center rounded-2xl bg-[#071A44] px-4 py-2.5 text-sm font-black text-white">
        {buttonLabel} →
      </span>
    </button>
  );
}

function WeekCard({
  week,
  challengeId,
  onPlay,
}: {
  week: WeekState;
  challengeId: string;
  onPlay: () => void;
}) {
  const navigate = useNavigate();

  const isLocked = week.status === 'locked';
  const isCompleted = week.status === 'completed';

  const bgClass =
    isLocked
      ? 'bg-[#F8F6F1]'
      : week.weekNumber % 4 === 1
        ? 'bg-[#F4EBFA]'
        : week.weekNumber % 4 === 2
          ? 'bg-[#EEF7EE]'
          : week.weekNumber % 4 === 3
            ? 'bg-[#EEF3FB]'
            : 'bg-[#FBEFDF]';

  function handleClick() {
    if (isLocked) return;
    if (isCompleted) {
      navigate(`/leaderboards/${challengeId}/weeks/${week.weekNumber}`);
      return;
    }
    onPlay();
  }

  return (
    <article className={`flex min-w-0 flex-col overflow-hidden rounded-[24px] border border-[#E8E0D3] p-4 ${bgClass}`}>
      <div className="flex items-center justify-between gap-2">
        <span className="rounded-full bg-white/90 px-2.5 py-1 text-[9px] font-black uppercase tracking-wide text-[#6E6A63]">Week {week.weekNumber}</span>
        <span
          className={`rounded-full px-2.5 py-1 text-[9px] font-black uppercase tracking-wide ${
            isLocked
              ? 'bg-[#ECE8DF] text-[#7C7468]'
              : isCompleted
                ? 'bg-[#E8F6EA] text-[#2E6A46]'
                : 'bg-[#E8F0FB] text-[#355C92]'
          }`}
        >
          {isLocked ? 'Locked' : isCompleted ? 'Completed' : 'Available'}
        </span>
      </div>

      <div className="mt-3 grid min-h-[138px] place-items-center rounded-[18px] bg-white/75 p-3">
        <PuzzleTypePreview puzzleType={week.puzzleType} size="card" />
      </div>

      <div className="mt-4 min-w-0 flex-1">
        <h3 className="break-words text-base font-black text-[#071A44]">{getPuzzleTypeLabel(week.puzzleType)}</h3>
        <p className="mt-1 text-xs capitalize text-[#6E6A63]">{week.difficulty} difficulty</p>
        {isLocked && week.unlocksAt ? (
          <p className="mt-2 text-[10px] font-semibold text-[#8A847B]">
            Unlocks {week.unlocksAt.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}
          </p>
        ) : null}
      </div>

      <button
        type="button"
        onClick={handleClick}
        disabled={isLocked}
        className={`mt-4 min-h-10 w-full rounded-xl px-3 py-2.5 text-xs font-black transition ${
          isLocked
            ? 'cursor-not-allowed bg-white/70 text-[#A39C91]'
            : 'bg-[#071A44] text-white hover:opacity-95'
        }`}
      >
        {isLocked ? 'Coming soon' : isCompleted ? 'View leaderboard' : 'Play now →'}
      </button>
    </article>
  );
}

function CalendarIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <rect x="4" y="6" width="16" height="14" rx="3" fill="none" stroke="currentColor" strokeWidth="1.7" />
      <path d="M8 3v6M16 3v6M4 10h16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
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

function ShareIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
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

function CheckIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path d="m6 12 4 4 8-9" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ArrowRightIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
      <path d="M5 12h14m-5-5 5 5-5 5" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

