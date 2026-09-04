// src/components/puzzles/pages/PuzzleJoinPage.tsx
//
// Public Puzzle Subscription join page.
//
// Public page = sell the fundraiser + recurring puzzle experience.
// Logged-in dashboard = current week / streak / points / true progress.
//
// This page therefore uses:
// - linked event summary + description
// - shared fundraising goal/progress
// - illustrative puzzle previews (not fake future-week data)
// - subscription facts
// - sticky footer + join/sign-in bottom sheet

import {
  type FormEvent,
  type ReactNode,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  useNavigate,
  useParams,
  useSearchParams,
} from 'react-router-dom';

import {
  supporterAuthService,
  type PublicChallenge,
} from '../services/SupporterAuthService';

import PuzzlePageShell from '../ui/PuzzlePageShell';
import PuzzlePrimaryButton from '../ui/PuzzlePrimaryButton';
import FundraisingGoalProgress from '../ui/FundraisingGoalProgress';
import { resolvePuzzleTheme } from '../ui/puzzleTheme';

const CURRENCY_SYMBOLS: Record<string, string> = {
  eur: '€',
  gbp: '£',
  usd: '$',
};

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function formatDate(value?: string | null) {
  if (!value) return 'To be announced';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'To be announced';

  return date.toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function CalendarIcon({ className = 'h-5 w-5' }: { className?: string }) {
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

function LockIcon({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <rect x="5" y="10" width="14" height="10" rx="3" fill="none" stroke="currentColor" strokeWidth="1.7" />
      <path d="M8 10V8a4 4 0 0 1 8 0v2" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

function SparkIcon({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path
        d="m12 3 1.3 4.1L17 9l-3.7 1.9L12 15l-1.3-4.1L7 9l3.7-1.9L12 3ZM18.5 14l.8 2.4 2.2 1.1-2.2 1.1-.8 2.4-.8-2.4-2.2-1.1 2.2-1.1.8-2.4ZM5.5 12l.7 2.1 1.8.9-1.8.9-.7 2.1-.7-2.1L3 15l1.8-.9.7-2.1Z"
        fill="currentColor"
      />
    </svg>
  );
}

function MailIcon({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <rect x="3.5" y="5" width="17" height="14" rx="3" fill="none" stroke="currentColor" strokeWidth="1.7" />
      <path d="m5 7 7 6 7-6" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ArrowRightIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
      <path d="M5 12h14m-5-5 5 5-5 5" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ShareIcon({ className = 'h-5 w-5' }: { className?: string }) {
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

// ── Illustrative puzzle artwork ──────────────────────────────────────────────
// These deliberately communicate puzzle VARIETY. They are not taken from the
// challenge schedule and are labelled as examples in the public UI.

function WordLadderArt() {
  return (
    <div className="mx-auto w-full max-w-[150px] space-y-1.5">
      {['PLAY', '_ _ _ _', '_ _ _ _', 'SLAY'].map((row, index) => (
        <div
          key={row}
          className={`rounded-lg border px-2 py-1.5 text-center text-[10px] font-black tracking-[0.18em] ${
            index === 0 || index === 3
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

function SudokuArt() {
  const values = ['5', '', '8', '', '3', '', '2', '', '9'];
  return (
    <div className="mx-auto grid w-full max-w-[128px] grid-cols-3 overflow-hidden rounded-xl border-2 border-[#89A4CC] bg-white">
      {values.map((value, index) => (
        <div
          key={index}
          className="grid aspect-square place-items-center border border-[#D3DEEE] text-xs font-black text-[#355C92]"
        >
          {value}
        </div>
      ))}
    </div>
  );
}

function MatchPairsArt() {
  return (
    <div className="mx-auto grid w-full max-w-[145px] grid-cols-2 gap-2">
      {['★', '♥', '♥', '★'].map((value, index) => (
        <div
          key={index}
          className="grid aspect-[1.15/1] place-items-center rounded-xl border border-[#CDBDEB] bg-[#F4EEFF] text-xl font-black text-[#7650B4]"
        >
          {value}
        </div>
      ))}
    </div>
  );
}

function SlidingTilesArt() {
  return (
    <div className="mx-auto grid w-full max-w-[128px] grid-cols-3 overflow-hidden rounded-xl border-2 border-[#E4AD72] bg-[#FFF7EC]">
      {[1, 2, 3, 4, 5, 6, 7, 8, ''].map((value, index) => (
        <div
          key={index}
          className={`grid aspect-square place-items-center border border-[#EBC99F] text-xs font-black ${
            value === ''
              ? 'bg-[#E1D4C4]'
              : 'bg-[#FFF9F1] text-[#7B4A22]'
          }`}
        >
          {value}
        </div>
      ))}
    </div>
  );
}

export default function PuzzleJoinPage() {
  const { joinCode, challengeId } = useParams<{
    joinCode?: string;
    challengeId?: string;
  }>();

  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [challenge, setChallenge] = useState<PublicChallenge | null>(null);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const [mode, setMode] = useState<'join' | 'signin'>(() =>
    searchParams.get('mode') === 'signin' ? 'signin' : 'join',
  );

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [signInEmail, setSignInEmail] = useState('');
  const [signInSubmitting, setSignInSubmitting] = useState(false);
  const [signInError, setSignInError] = useState<string | null>(null);

  const theme = useMemo(() => resolvePuzzleTheme(challenge), [challenge]);

  useEffect(() => {
    const currentJoinCode = joinCode;
    const currentChallengeId = challengeId;

    async function load() {
      setLoading(true);
      setPageError(null);

      try {
        if (currentJoinCode) {
          const data = await supporterAuthService.getPublicChallengeByCode(currentJoinCode);
          setChallenge(data);
          return;
        }

        if (currentChallengeId) {
          const data = await supporterAuthService.getPublicChallenge(currentChallengeId);
          setChallenge(data);
          return;
        }

        setPageError('Challenge link is missing or invalid.');
      } catch {
        setPageError('Challenge not found or no longer available.');
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, [joinCode, challengeId]);

  const challengeIsFree = Number(challenge?.is_free) === 1;

  const weeklyAmount = useMemo(() => {
    if (!challenge?.weekly_price) return null;

    const currency = String(challenge.currency ?? 'eur').toLowerCase();
    const symbol = CURRENCY_SYMBOLS[currency] ?? '€';

    return `${symbol}${(challenge.weekly_price / 100).toFixed(2)}/week`;
  }, [challenge]);

  const weeklyPriceDisplay = useMemo(() => {
    if (!challenge?.weekly_price) return null;

    const currency = String(challenge.currency ?? 'eur').toLowerCase();
    const symbol = CURRENCY_SYMBOLS[currency] ?? '€';

    return `${symbol}${(challenge.weekly_price / 100).toFixed(2)}`;
  }, [challenge]);

  const currencySymbol = useMemo(() => {
    const currency = String(challenge?.currency ?? 'eur').toLowerCase();
    return CURRENCY_SYMBOLS[currency] ?? '€';
  }, [challenge?.currency]);

  function openJoin() {
    setMode('join');
    setFormError(null);
    setSignInError(null);
    setSheetOpen(true);
  }

  function openSignIn() {
    setMode('signin');
    setFormError(null);
    setSignInError(null);
    setSheetOpen(true);
  }

  function closeSheet() {
    if (submitting || signInSubmitting) return;
    setSheetOpen(false);
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError(null);

    if (!challenge) {
      setFormError('Challenge details are not available. Please refresh and try again.');
      return;
    }

    if (!name.trim()) {
      setFormError('Please enter your name.');
      return;
    }

    if (!isValidEmail(email)) {
      setFormError('Please enter a valid email address.');
      return;
    }

    setSubmitting(true);

    try {
      if (challengeIsFree) {
        await supporterAuthService.requestMagicLink({
          email: email.trim(),
          name: name.trim(),
          challengeId: challenge.id,
          clubId: challenge.club_id ?? '',
        });

        navigate('/puzzle-check-email', {
          state: {
            email: email.trim(),
            challengeId: challenge.id,
            clubId: challenge.club_id,
            clubName: challenge.club_name,
            theme,
          },
        });
        return;
      }

      const result = await supporterAuthService.createCheckoutSession({
        challengeId: challenge.id,
        name: name.trim(),
        email: email.trim(),
      });

      window.location.href = result.url;
    } catch (err) {
      setFormError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSignIn(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSignInError(null);

    if (!challenge) return;

    if (!isValidEmail(signInEmail)) {
      setSignInError('Please enter a valid email address.');
      return;
    }

    setSignInSubmitting(true);

    try {
      await supporterAuthService.requestMagicLink({
        email: signInEmail.trim(),
        challengeId: challenge.id,
        clubId: challenge.club_id ?? '',
      });

      navigate('/puzzle-check-email', {
        state: {
          email: signInEmail.trim(),
          challengeId: challenge.id,
          clubId: challenge.club_id,
          clubName: challenge.club_name,
          theme,
        },
      });
    } catch (err) {
      setSignInError((err as Error).message);
    } finally {
      setSignInSubmitting(false);
    }
  }


  async function handleShare() {
    if (!challenge) return;

    const shareUrl = window.location.href;
    const shareText =
      `I'm supporting ${challenge.club_name ?? 'this fundraiser'} through their weekly Puzzle Challenge. ` +
      `Join in, get a new puzzle every week and help them reach their fundraising goal.`;

    try {
      if (navigator.share) {
        await navigator.share({
          title: challenge.title,
          text: shareText,
          url: shareUrl,
        });
        return;
      }

      await navigator.clipboard.writeText(shareUrl);
      window.alert('Fundraiser link copied.');
    } catch (err) {
      if ((err as DOMException)?.name !== 'AbortError') {
        console.warn('[PuzzleJoinPage] Share failed:', err);
      }
    }
  }

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
      <PuzzlePageShell theme={theme} clubName={challenge?.club_name}>
        <div className="mx-auto max-w-xl rounded-[28px] border border-[#E7C4C4] bg-white p-8 text-center shadow-sm">
          <h1 className="text-xl font-bold text-[#071A44]">Challenge unavailable</h1>
          <p className="mt-2 text-sm text-[#6E6A63]">
            {pageError ?? 'Challenge not found'}
          </p>
        </div>
      </PuzzlePageShell>
    );
  }

  return (
    <PuzzlePageShell
      theme={theme}
      clubName={challenge.club_name}
      rightHeaderContent={
        <button
          type="button"
          onClick={openSignIn}
          className="hidden min-h-10 items-center justify-center rounded-full border border-[#D8D1C4] bg-white px-4 py-2 text-xs font-semibold text-[#071A44] shadow-sm transition hover:bg-[#FBF8F3] sm:inline-flex"
        >
          Already joined?
        </button>
      }
    >
      <div className="mx-auto w-full min-w-0 max-w-6xl overflow-x-hidden pb-32">

        {/* ── HERO ─────────────────────────────────────────────────────── */}
        <section className="relative w-full min-w-0 overflow-hidden rounded-[26px] border border-[#E8E0D3] bg-white shadow-sm sm:rounded-[36px]">
          <div className="absolute inset-x-0 top-0 h-2 bg-[var(--puzzle-primary)]" />

          <div className="grid min-w-0 gap-5 p-5 pt-8 sm:gap-7 sm:p-8 sm:pt-10 lg:grid-cols-[0.98fr_1.02fr] lg:items-center lg:p-10">
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#E36B2C] sm:text-xs">
                Weekly puzzle fundraiser
              </p>

              <h1 className="mt-3 break-words font-serif text-[2.5rem] leading-[0.98] text-[#071A44] sm:text-5xl lg:text-6xl">
                {challenge.title}
              </h1>

              {challenge.summary ? (
                <p className="mt-4 max-w-2xl break-words text-lg font-bold leading-snug text-[var(--puzzle-primary)] sm:text-2xl">
                  {challenge.summary}
                </p>
              ) : null}

              <div className="mt-5 max-w-2xl">
                <p className="break-words text-sm leading-6 text-[#5F5A54] sm:text-base sm:leading-7">
                  <strong className="text-[#071A44]">
                    Support every week. Play every week.
                  </strong>{' '}
                  {challengeIsFree
                    ? 'Join the challenge and each week you’ll receive a new puzzle to play and a fresh chance to climb the leaderboard.'
                    : `Your ${weeklyPriceDisplay ?? 'weekly'} weekly subscription helps fund the cause, and each week you’ll receive a new puzzle to play and a fresh chance to climb the leaderboard.`}
                </p>
              </div>

              <div className="mt-5 grid w-full min-w-0 grid-cols-2 gap-2 sm:flex sm:flex-wrap">
                <MetaCard
                  icon={<CalendarIcon className="h-4 w-4" />}
                  label="Challenge"
                  value={`${challenge.total_weeks} weekly puzzle${challenge.total_weeks !== 1 ? 's' : ''}`}
                />
                <MetaCard
                  icon={<LockIcon className="h-4 w-4" />}
                  label="Support"
                  value={challengeIsFree ? 'Free to join' : weeklyAmount ?? 'Weekly subscription'}
                />
                <MetaCard
                  icon={<MailIcon className="h-4 w-4" />}
                  label="Delivery"
                  value="New puzzle by email"
                  className="col-span-2 sm:col-auto"
                />
              </div>

              <div className="mt-5 flex min-w-0 flex-col gap-2 sm:flex-row sm:flex-wrap">
                <a
                  href={`/challenges/${challenge.id}/standings`}
                  className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl border border-[var(--puzzle-primary)] bg-white px-4 py-2.5 text-sm font-bold text-[var(--puzzle-primary)] transition hover:bg-[var(--puzzle-bg-accent)] sm:w-auto"
                >
                  <TrophyIcon className="h-4 w-4" />
                  View leaderboard
                </a>

                <button
                  type="button"
                  onClick={handleShare}
                  className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl border border-[#D8D1C4] bg-[#FBF8F3] px-4 py-2.5 text-sm font-bold text-[#071A44] transition hover:bg-white sm:w-auto"
                >
                  <ShareIcon className="h-4 w-4" />
                  Share fundraiser
                </button>
              </div>

              <button
                type="button"
                onClick={openSignIn}
                className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-[var(--puzzle-primary)] underline underline-offset-4 sm:hidden"
              >
                Already joined? Sign in
              </button>
            </div>

            <SubscriberExperiencePreview />
          </div>
        </section>

        {/* ── ORGANISER STORY ──────────────────────────────────────────── */}
        {challenge.description ? (
          <section className="mt-5 w-full min-w-0 rounded-[26px] border border-[#E8E0D3] bg-white p-5 shadow-sm sm:rounded-[30px] sm:p-7">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#E36B2C] sm:text-xs">
              Why we’re fundraising
            </p>

            <h2 className="mt-2 break-words font-serif text-3xl leading-tight text-[#071A44] sm:text-4xl">
              Support {challenge.club_name ?? 'the organiser'}
            </h2>

            <p className="mt-4 max-w-4xl whitespace-pre-line break-words text-sm leading-7 text-[#5F5A54] sm:text-base">
              {challenge.description}
            </p>
          </section>
        ) : null}

        {/* ── SHARED FUNDRAISING GOAL ─────────────────────────────────── */}
        <FundraisingGoalProgress
          className="mt-5"
          goalAmount={challenge.goal_amount}
          raisedAmount={challenge.raised_amount}
          currency={challenge.currency}
          currencySymbol={currencySymbol}
          clubName={challenge.club_name}
        />

        {/* ── PUZZLE EXAMPLES ─────────────────────────────────────────── */}
        <section className="mt-5 w-full min-w-0 rounded-[28px] border border-[#E8E0D3] bg-white p-5 shadow-sm sm:p-7">
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#E36B2C] sm:text-xs">
              Puzzle examples
            </p>

            <h2 className="mt-2 break-words font-serif text-3xl leading-tight text-[#071A44] sm:text-4xl">
              A different challenge to look forward to
            </h2>

            <p className="mt-2 max-w-3xl break-words text-sm leading-6 text-[#6E6A63]">
              The weekly challenge can mix different puzzle styles. Here are examples of the kinds of puzzles players can face.
            </p>
          </div>

          <div className="mt-6 grid min-w-0 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <PuzzleExampleCard
              tone="purple"
              title="Matching Pairs"
              text="Find the matching cards."
              artwork={<MatchPairsArt />}
            />
            <PuzzleExampleCard
              tone="green"
              title="Word Ladder"
              text="Change one letter at a time."
              artwork={<WordLadderArt />}
            />
            <PuzzleExampleCard
              tone="blue"
              title="Sudoku"
              text="Complete the number grid."
              artwork={<SudokuArt />}
            />
            <PuzzleExampleCard
              tone="orange"
              title="Sliding Tiles"
              text="Put every tile in its place."
              artwork={<SlidingTilesArt />}
            />
          </div>
        </section>

        {/* ── EXPERIENCE ───────────────────────────────────────────────── */}
        <section className="mt-5 grid w-full min-w-0 gap-3 sm:grid-cols-3">
          <ExperienceCard
            icon={<MailIcon />}
            title="A new puzzle each week"
            text="Your next puzzle is sent to your inbox so there is always something new to play."
          />
          <ExperienceCard
            icon={<TrophyIcon />}
            title="Join the leaderboard"
            text="Submit your score, see where you rank and come back next week to try again."
          />
          <ExperienceCard
            icon={<SparkIcon />}
            title="Keep supporting"
            text="Your weekly subscription continues to support the fundraiser while the challenge runs."
          />
        </section>
      </div>

      {/* ── STICKY FOOTER ─────────────────────────────────────────────── */}
      <div className="fixed inset-x-0 bottom-0 z-[9998] w-full max-w-full border-t border-[#DDD6CA] bg-white/95 px-3 pb-[max(env(safe-area-inset-bottom),0.75rem)] pt-2.5 shadow-[0_-8px_30px_rgba(7,26,68,0.10)] backdrop-blur sm:px-4 sm:pb-[max(env(safe-area-inset-bottom),1rem)] sm:pt-3">
        <div className="mx-auto flex w-full min-w-0 max-w-3xl items-center gap-2.5 sm:gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-[9px] font-black uppercase tracking-wide text-[#8A847B] sm:text-[10px]">
              {challengeIsFree ? 'Weekly puzzle challenge' : 'Weekly subscription'}
            </p>

            <p className="truncate text-xs font-black text-[#071A44] sm:text-base">
              {challengeIsFree
                ? `${challenge.total_weeks} weeks · Free`
                : `${weeklyAmount} · ${challenge.total_weeks} weeks`}
            </p>
          </div>

          <button
            type="button"
            onClick={openJoin}
            className="inline-flex min-h-11 shrink-0 items-center justify-center gap-1.5 rounded-xl bg-[var(--puzzle-primary)] px-4 py-2.5 text-xs font-black text-[var(--puzzle-text-on-primary)] shadow-sm sm:min-h-12 sm:rounded-2xl sm:px-7 sm:py-3 sm:text-base"
          >
            {challengeIsFree ? 'Join' : 'Subscribe'}
            <ArrowRightIcon />
          </button>
        </div>
      </div>

      {/* ── JOIN / SIGN-IN SHEET ──────────────────────────────────────── */}
      {sheetOpen ? (
        <div
          className="fixed inset-0 z-[10000] flex w-full max-w-full items-end justify-center overflow-x-hidden bg-slate-950/45 backdrop-blur-sm sm:items-center sm:p-6"
          onClick={closeSheet}
        >
          <section
            className="max-h-[92dvh] w-full min-w-0 max-w-lg overflow-x-hidden overflow-y-auto rounded-t-[2rem] bg-white p-5 shadow-2xl sm:rounded-[2rem] sm:p-6"
            onClick={event => event.stopPropagation()}
          >
            <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-slate-200 sm:hidden" />

            <div className="mb-5 flex min-w-0 items-start gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#8A847B] sm:text-xs">
                  Weekly puzzle challenge
                </p>
                <h2 className="mt-1 break-words font-serif text-3xl leading-tight text-[#071A44]">
                  {mode === 'join'
                    ? challengeIsFree
                      ? 'Join the challenge'
                      : 'Start your subscription'
                    : 'Welcome back'}
                </h2>
              </div>

              {!submitting && !signInSubmitting ? (
                <button
                  type="button"
                  onClick={closeSheet}
                  aria-label="Close"
                  className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#F4F1EC] text-xl font-semibold text-[#6E6A63]"
                >
                  ×
                </button>
              ) : null}
            </div>

            <div className="mb-5 flex w-full min-w-0 rounded-full border border-[#D8D1C4] bg-[#FBF8F3] p-1">
              <button
                type="button"
                onClick={() => {
                  setMode('join');
                  setFormError(null);
                }}
                className={`min-w-0 flex-1 rounded-full px-3 py-2.5 text-xs font-semibold transition sm:px-4 sm:text-sm ${
                  mode === 'join'
                    ? 'bg-[var(--puzzle-primary)] text-[var(--puzzle-text-on-primary)] shadow-sm'
                    : 'text-[#6E6A63]'
                }`}
              >
                New here
              </button>

              <button
                type="button"
                onClick={() => {
                  setMode('signin');
                  setSignInError(null);
                }}
                className={`min-w-0 flex-1 rounded-full px-3 py-2.5 text-xs font-semibold transition sm:px-4 sm:text-sm ${
                  mode === 'signin'
                    ? 'bg-[var(--puzzle-primary)] text-[var(--puzzle-text-on-primary)] shadow-sm'
                    : 'text-[#6E6A63]'
                }`}
              >
                Already joined?
              </button>
            </div>

            {mode === 'join' ? (
              <JoinForm
                challenge={challenge}
                challengeIsFree={challengeIsFree}
                weeklyAmount={weeklyAmount}
                name={name}
                email={email}
                submitting={submitting}
                formError={formError}
                setName={setName}
                setEmail={setEmail}
                onSubmit={handleSubmit}
              />
            ) : (
              <SignInForm
                email={signInEmail}
                submitting={signInSubmitting}
                error={signInError}
                setEmail={setSignInEmail}
                onSubmit={handleSignIn}
              />
            )}
          </section>
        </div>
      ) : null}
    </PuzzlePageShell>
  );
}

function SubscriberExperiencePreview() {
  return (
    <div className="relative mx-auto w-full min-w-0 max-w-[430px] py-1 sm:py-2">
      <div className="absolute -left-3 top-12 h-20 w-20 rounded-full bg-[#F1E9FF]" />
      <div className="absolute -right-2 bottom-10 h-24 w-24 rounded-full bg-[#FFF0D7]" />

      <div className="relative overflow-hidden rounded-[30px] border border-[#E8E0D3] bg-[#FBF8F3] p-4 shadow-[0_20px_55px_rgba(7,26,68,0.13)] sm:p-5">
        <div className="rounded-[24px] border border-[#E8E0D3] bg-white p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.16em] text-[#E36B2C]">
                Weekly challenge
              </p>
              <h3 className="mt-1 font-serif text-2xl leading-tight text-[#071A44]">
                Something new to crack
              </h3>
            </div>

            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--puzzle-bg-accent)] text-[var(--puzzle-primary)]">
              <SparkIcon />
            </div>
          </div>

          <div className="mt-4 rounded-[20px] bg-[linear-gradient(135deg,#F4EEFF_0%,#FFF8EA_100%)] p-4">
            <WordLadderArt />
          </div>

          <div className="mt-4 flex gap-2">
            <span className="rounded-full bg-[#FBF8F3] px-3 py-1.5 text-[10px] font-bold text-[#6E6A63]">
              New puzzle
            </span>
            <span className="rounded-full bg-[#FBF8F3] px-3 py-1.5 text-[10px] font-bold text-[#6E6A63]">
              Live scores
            </span>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-3 gap-2">
          <PreviewMiniCard label="Play" value="Weekly" />
          <PreviewMiniCard label="Score" value="Compete" />
          <PreviewMiniCard label="Return" value="Repeat" />
        </div>
      </div>
    </div>
  );
}

function PreviewMiniCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-xl border border-[#E8E0D3] bg-white p-2.5 text-center">
      <p className="truncate text-[8px] font-black uppercase tracking-wide text-[#9A9287]">
        {label}
      </p>
      <p className="mt-1 truncate text-[10px] font-black text-[#071A44]">
        {value}
      </p>
    </div>
  );
}

function MetaCard({
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
          <p className="text-[9px] font-black uppercase tracking-wide text-[#9A9287]">
            {label}
          </p>
          <p className="mt-0.5 break-words text-xs font-black leading-4 text-[#071A44]">
            {value}
          </p>
        </div>
      </div>
    </div>
  );
}

function PuzzleExampleCard({
  title,
  text,
  artwork,
  tone,
}: {
  title: string;
  text: string;
  artwork: ReactNode;
  tone: 'purple' | 'green' | 'blue' | 'orange';
}) {
  const backgrounds = {
    purple: 'bg-[#F6F0FF]',
    green: 'bg-[#F0F7EF]',
    blue: 'bg-[#F0F5FC]',
    orange: 'bg-[#FFF4E8]',
  };

  return (
    <article className={`min-w-0 overflow-hidden rounded-[24px] border border-[#E8E0D3] p-4 ${backgrounds[tone]}`}>
      <div className="grid min-h-[150px] place-items-center rounded-[18px] bg-white/65 p-3">
        {artwork}
      </div>

      <h3 className="mt-4 break-words text-base font-black text-[#071A44]">
        {title}
      </h3>

      <p className="mt-1 break-words text-xs leading-5 text-[#6E6A63]">
        {text}
      </p>
    </article>
  );
}

function ExperienceCard({
  icon,
  title,
  text,
}: {
  icon: ReactNode;
  title: string;
  text: string;
}) {
  return (
    <div className="w-full min-w-0 rounded-[22px] border border-[#E8E0D3] bg-white p-4 shadow-sm sm:rounded-[26px] sm:p-5">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--puzzle-bg-accent)] text-[var(--puzzle-primary)]">
        {icon}
      </div>
      <h3 className="mt-3 text-sm font-black text-[#071A44]">{title}</h3>
      <p className="mt-1 break-words text-xs leading-5 text-[#6E6A63]">{text}</p>
    </div>
  );
}

function JoinForm({
  challenge,
  challengeIsFree,
  weeklyAmount,
  name,
  email,
  submitting,
  formError,
  setName,
  setEmail,
  onSubmit,
}: {
  challenge: PublicChallenge;
  challengeIsFree: boolean;
  weeklyAmount: string | null;
  name: string;
  email: string;
  submitting: boolean;
  formError: string | null;
  setName: (value: string) => void;
  setEmail: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <>
      <div className="mb-5 w-full min-w-0 rounded-2xl border border-[#E8E0D3] bg-[#FBF8F3] p-4">
        <div className="flex min-w-0 items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-wide text-[#8A847B]">
              Your challenge
            </p>
            <p className="mt-1 break-words text-sm font-black text-[#071A44]">
              {challenge.total_weeks} week{challenge.total_weeks !== 1 ? 's' : ''}
            </p>
          </div>

          <p className="shrink-0 text-lg font-black text-[var(--puzzle-primary)] sm:text-xl">
            {challengeIsFree ? 'Free' : weeklyAmount ?? 'Weekly'}
          </p>
        </div>
      </div>

      <form onSubmit={onSubmit} className="w-full min-w-0 space-y-4">
        <div className="min-w-0">
          <label htmlFor="puzzle-player-name" className="mb-1.5 block text-sm font-semibold text-[#071A44]">
            Your name *
          </label>
          <input
            id="puzzle-player-name"
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            autoComplete="name"
            placeholder="First and last name"
            className="w-full min-w-0 rounded-2xl border border-[#D8D1C4] bg-[#FBF8F3] px-4 py-3 text-base text-[#071A44] outline-none transition placeholder:text-[#A39C91] focus:border-[var(--puzzle-primary)] focus:bg-white focus:ring-4 focus:ring-[var(--puzzle-primary)]/10"
          />
        </div>

        <div className="min-w-0">
          <label htmlFor="puzzle-player-email" className="mb-1.5 block text-sm font-semibold text-[#071A44]">
            Email address *
          </label>
          <input
            id="puzzle-player-email"
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            autoComplete="email"
            inputMode="email"
            placeholder="you@example.com"
            className="w-full min-w-0 rounded-2xl border border-[#D8D1C4] bg-[#FBF8F3] px-4 py-3 text-base text-[#071A44] outline-none transition placeholder:text-[#A39C91] focus:border-[var(--puzzle-primary)] focus:bg-white focus:ring-4 focus:ring-[var(--puzzle-primary)]/10"
          />
        </div>

        <div className="flex min-w-0 items-start gap-3 rounded-2xl border border-[#E8E0D3] bg-[#FBF8F3] p-3">
          <span className="mt-0.5 shrink-0 text-[var(--puzzle-primary)]">
            <LockIcon className="h-4 w-4" />
          </span>
          <p className="min-w-0 break-words text-[11px] leading-relaxed text-[#6E6A63]">
            We&apos;ll use your email for puzzle access
            {challengeIsFree ? '' : ' and subscription-related messages'}. See our{' '}
            <a
              href="/legal/privacy"
              target="_blank"
              rel="noreferrer"
              className="font-semibold text-[#071A44] underline"
            >
              Privacy Policy
            </a>
            .
          </p>
        </div>

        {formError ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3">
            <p className="break-words text-sm font-medium text-rose-700">{formError}</p>
          </div>
        ) : null}

        <PuzzlePrimaryButton type="submit" fullWidth disabled={submitting}>
          {challengeIsFree
            ? submitting
              ? 'Sending link…'
              : 'Join & send my access link →'
            : submitting
              ? 'Redirecting to checkout…'
              : `Subscribe${weeklyAmount ? ` · ${weeklyAmount}` : ''} →`}
        </PuzzlePrimaryButton>
      </form>
    </>
  );
}

function SignInForm({
  email,
  submitting,
  error,
  setEmail,
  onSubmit,
}: {
  email: string;
  submitting: boolean;
  error: string | null;
  setEmail: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <>
      <p className="mb-5 break-words text-sm leading-relaxed text-[#6E6A63]">
        Enter the email address you used when you joined and we&apos;ll send a fresh access link.
        There is no payment to sign back in.
      </p>

      <form onSubmit={onSubmit} className="w-full min-w-0 space-y-4">
        <div className="min-w-0">
          <label htmlFor="puzzle-signin-email" className="mb-1.5 block text-sm font-semibold text-[#071A44]">
            Email address *
          </label>
          <input
            id="puzzle-signin-email"
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            autoComplete="email"
            inputMode="email"
            placeholder="you@example.com"
            className="w-full min-w-0 rounded-2xl border border-[#D8D1C4] bg-[#FBF8F3] px-4 py-3 text-base text-[#071A44] outline-none transition placeholder:text-[#A39C91] focus:border-[var(--puzzle-primary)] focus:bg-white focus:ring-4 focus:ring-[var(--puzzle-primary)]/10"
          />
        </div>

        {error ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3">
            <p className="break-words text-sm font-medium text-rose-700">{error}</p>
          </div>
        ) : null}

        <PuzzlePrimaryButton type="submit" fullWidth disabled={submitting}>
          {submitting ? 'Sending…' : 'Send my access link →'}
        </PuzzlePrimaryButton>
      </form>
    </>
  );
}