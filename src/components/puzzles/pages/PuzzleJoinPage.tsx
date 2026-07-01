// src/components/puzzles/pages/PuzzleJoinPage.tsx

import { type FormEvent, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  supporterAuthService,
  type PublicChallenge,
} from '../services/SupporterAuthService';
import PuzzlePageShell from '../ui/PuzzlePageShell';
import PuzzlePrimaryButton from '../ui/PuzzlePrimaryButton';
import PuzzleStatPill from '../ui/PuzzleStatPill';

const CURRENCY_SYMBOLS: Record<string, string> = {
  eur: '€',
  gbp: '£',
  usd: '$',
};

export default function PuzzleJoinPage() {
  const { joinCode, challengeId } = useParams<{
    joinCode?: string;
    challengeId?: string;
  }>();

  const navigate = useNavigate();

  const [challenge, setChallenge] = useState<PublicChallenge | null>(null);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [gdprConsent, setGdprConsent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    const currentJoinCode = joinCode;
    const currentChallengeId = challengeId;

    async function load() {
      setLoading(true);
      setPageError(null);

      try {
        if (currentJoinCode) {
          const data = await supporterAuthService.getPublicChallengeByCode(
            currentJoinCode
          );
          setChallenge(data);
          return;
        }

        if (currentChallengeId) {
          const data = await supporterAuthService.getPublicChallenge(
            currentChallengeId
          );
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

    load();
  }, [joinCode, challengeId]);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError(null);

    if (!challenge) {
      setFormError('Challenge details are not available. Please refresh and try again.');
      return;
    }

    if (!gdprConsent) {
      setFormError('Please agree to the privacy policy to continue.');
      return;
    }

    setSubmitting(true);

    try {
      if (challengeIsFree) {
        await supporterAuthService.requestMagicLink({
          email,
          name,
          challengeId: challenge.id,
          clubId: challenge.club_id ?? '',
        });

        navigate('/puzzle-check-email', {
          state: {
            email,
            challengeId: challenge.id,
            clubId: challenge.club_id,
          },
        });
        return;
      }

      // Paid challenge — go straight to Stripe Checkout rather than the
      // magic-link form. The backend creates the supporter record and a
      // pending subscription row as part of this call; the player is
      // redirected to Stripe's hosted checkout page, which is outside
      // the SPA, so a full-page redirect (not react-router navigate) is
      // correct here.
      const result = await supporterAuthService.createCheckoutSession({
        challengeId: challenge.id,
        name,
        email,
      });

      window.location.href = result.url;
    } catch (err) {
      setFormError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  const challengeIsFree = Number(challenge?.is_free) === 1;

  const weeklyAmount = useMemo(() => {
    if (!challenge?.weekly_price) return null;

    const currency = challenge.currency ?? 'eur';
    const symbol = CURRENCY_SYMBOLS[currency] ?? '€';

    return `${symbol}${(challenge.weekly_price / 100).toFixed(2)}/week`;
  }, [challenge]);

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
        <div className="mx-auto max-w-xl rounded-[28px] border border-[#E7C4C4] bg-white p-8 text-center shadow-sm">
          <p className="mb-2 text-3xl">😕</p>
          <h1 className="mb-2 text-xl font-bold text-[#071A44]">
            Challenge problem
          </h1>
          <p className="text-sm text-[#6E6A63]">
            {pageError ?? 'Challenge not found'}
          </p>
        </div>
      </PuzzlePageShell>
    );
  }

  return (
    <PuzzlePageShell
      rightHeaderContent={
        <div className="rounded-2xl border border-[#D8E8D8] bg-[#EEF8EF] px-4 py-2 shadow-sm">
          <p className="text-sm font-semibold text-[#2E6A46]">
            Puzzle access
          </p>
          <p className="text-xs text-[#5F7D6A]">
            {challengeIsFree ? 'Magic link sign in' : 'Secure subscription checkout'}
          </p>
        </div>
      }
    >
      <div className="grid items-start gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <section className="rounded-[36px] border border-[#E8E0D3] bg-white p-6 shadow-sm sm:p-8">
          <p className="mb-3 text-sm font-semibold uppercase tracking-[0.18em] text-[#E36B2C]">
            Weekly puzzle challenge
          </p>

          <h1 className="font-serif text-4xl leading-tight text-[#071A44] sm:text-5xl">
            Join the challenge
          </h1>

          <p className="mt-4 max-w-xl text-base leading-relaxed text-[#5F5A54]">
            {challengeIsFree
              ? "Enter your details and we'll send you a secure magic link. No password needed — just open the email and start playing."
              : "Enter your details to subscribe and start playing. You'll be taken to a secure checkout to set up your weekly payment."}
          </p>

          <div className="mt-7 rounded-[30px] border border-[#E8E0D3] bg-[#FBF8F3] p-5">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-[#157F85]">
                  {challenge.club_name ?? 'FundRaisely club'}
                </p>

                <h2 className="mt-1 font-serif text-3xl leading-tight text-[#071A44]">
                  {challenge.title}
                </h2>

                {challenge.description ? (
                  <p className="mt-3 text-sm leading-relaxed text-[#6E6A63]">
                    {challenge.description}
                  </p>
                ) : null}
              </div>

              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[22px] bg-[#FFF2D9] text-3xl shadow-sm">
                🧩
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <PuzzleStatPill
                icon={<span>🗓️</span>}
                label="Length"
                value={`${challenge.total_weeks} week${challenge.total_weeks !== 1 ? 's' : ''}`}
              />

              <PuzzleStatPill
                icon={<span>🚀</span>}
                label="Starts"
                value={new Date(challenge.starts_at).toLocaleDateString()}
              />

              <PuzzleStatPill
                icon={<span>⭐</span>}
                label="Access"
                value={challengeIsFree ? 'Free' : weeklyAmount ?? 'Paid'}
              />
            </div>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            <FeatureCard
              emoji="📧"
              title={challengeIsFree ? 'Magic link' : 'Secure checkout'}
              text={
                challengeIsFree
                  ? 'Secure email access with no password to remember.'
                  : 'Set up your weekly subscription via secure Stripe checkout.'
              }
            />

            <FeatureCard
              emoji="🧠"
              title="Weekly puzzles"
              text="A fresh brain challenge unlocks on the schedule."
            />

            <FeatureCard
              emoji="🏆"
              title="Leaderboard"
              text="Track progress and scores as the challenge runs."
            />
          </div>
        </section>

        <section className="rounded-[36px] border border-[#E8E0D3] bg-white p-6 shadow-sm sm:p-8">
          <div className="mb-6 text-center">
            <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-[26px] bg-[#E9E0FB] text-4xl shadow-sm">
              ✨
            </div>

            <h2 className="font-serif text-3xl leading-tight text-[#071A44]">
              {challengeIsFree ? 'Join for free' : 'Join this challenge'}
            </h2>

            <p className="mt-2 text-sm text-[#6E6A63]">
              {challengeIsFree
                ? "We'll email your private access link."
                : "You'll be taken to a secure checkout to start your subscription."}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="puzzle-player-name"
                className="mb-1.5 block text-sm font-semibold text-[#071A44]"
              >
                Your name *
              </label>

              <input
                id="puzzle-player-name"
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                required
                placeholder="First and last name"
                className="w-full rounded-2xl border border-[#D8D1C4] bg-[#FBF8F3] px-4 py-3 text-sm text-[#071A44] outline-none transition placeholder:text-[#A39C91] focus:border-[#157F85] focus:bg-white focus:ring-4 focus:ring-[#157F85]/10"
              />
            </div>

            <div>
              <label
                htmlFor="puzzle-player-email"
                className="mb-1.5 block text-sm font-semibold text-[#071A44]"
              >
                Email address *
              </label>

              <input
                id="puzzle-player-email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                placeholder="you@example.com"
                className="w-full rounded-2xl border border-[#D8D1C4] bg-[#FBF8F3] px-4 py-3 text-sm text-[#071A44] outline-none transition placeholder:text-[#A39C91] focus:border-[#157F85] focus:bg-white focus:ring-4 focus:ring-[#157F85]/10"
              />

              <p className="mt-2 text-xs leading-relaxed text-[#8A847B]">
                {challengeIsFree
                  ? "Your link is emailed to this address. You'll use it to access your puzzles during the challenge."
                  : "Used for your Stripe receipt and to access your puzzles during the challenge."}
              </p>
            </div>

            <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-[#E8E0D3] bg-[#FBF8F3] p-4">
              <input
                type="checkbox"
                checked={gdprConsent}
                onChange={e => setGdprConsent(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-[#D8D1C4] text-[#157F85] focus:ring-[#157F85]"
              />

              <span className="text-xs leading-relaxed text-[#6E6A63]">
                I agree to the{' '}
                <a
                  href="/legal/privacy"
                  target="_blank"
                  rel="noreferrer"
                  className="font-semibold text-[#071A44] underline"
                >
                  Privacy Policy
                </a>{' '}
                {challengeIsFree
                  ? <>and consent to receiving puzzle access emails from{' '}<strong>{challenge.club_name ?? 'the organiser'}</strong>.</>
                  : <>and consent to receiving puzzle access and billing emails from{' '}<strong>{challenge.club_name ?? 'the organiser'}</strong>.</>}
              </span>
            </label>

            {formError ? (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3">
                <p className="text-sm font-medium text-rose-700">
                  {formError}
                </p>
              </div>
            ) : null}

            <PuzzlePrimaryButton
              type="submit"
              fullWidth
              disabled={submitting}
              className="mt-2"
            >
              {challengeIsFree
                ? (submitting ? 'Sending link…' : 'Send my access link →')
                : (submitting ? 'Redirecting to checkout…' : `Pay & join${weeklyAmount ? ` — ${weeklyAmount}` : ''} →`)}
            </PuzzlePrimaryButton>
          </form>

          <div className="mt-6 border-t border-[#E8E0D3] pt-5 text-center">
            <p className="text-sm text-[#6E6A63]">
              Already joined?{' '}
              <button
                type="button"
                onClick={() =>
                  navigate('/puzzle-login', {
                    state: {
                      challengeId: challenge.id,
                      clubId: challenge.club_id,
                    },
                  })
                }
                className="font-semibold text-[#071A44] underline"
              >
                Sign in with magic link
              </button>
            </p>
          </div>
        </section>
      </div>
    </PuzzlePageShell>
  );
}

function FeatureCard({
  emoji,
  title,
  text,
}: {
  emoji: string;
  title: string;
  text: string;
}) {
  return (
    <div className="rounded-[24px] border border-[#E8E0D3] bg-white p-4 shadow-sm">
      <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-[#F6F1E8] text-xl">
        {emoji}
      </div>

      <h3 className="text-sm font-semibold text-[#071A44]">
        {title}
      </h3>

      <p className="mt-1 text-xs leading-relaxed text-[#6E6A63]">
        {text}
      </p>
    </div>
  );
}