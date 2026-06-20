// src/components/puzzles/pages/PuzzleCheckEmailPage.tsx

import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { supporterAuthService } from '../services/SupporterAuthService';
import PuzzlePageShell from '../ui/PuzzlePageShell';
import PuzzlePrimaryButton from '../ui/PuzzlePrimaryButton';

export default function PuzzleCheckEmailPage() {
  const location = useLocation();
  const navigate = useNavigate();

  const { email, challengeId, clubId } = (location.state ?? {}) as {
    email?: string;
    challengeId?: string;
    clubId?: string;
  };

  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);
  const [cooldown, setCooldown] = useState(false);
  const [resendError, setResendError] = useState<string | null>(null);

  async function handleResend() {
    if (!email || !clubId || cooldown) return;

    setResending(true);
    setResendError(null);

    try {
      await supporterAuthService.requestMagicLink({
        email,
        challengeId,
        clubId,
      });

      setResent(true);
      setCooldown(true);

      setTimeout(() => {
        setCooldown(false);
        setResent(false);
      }, 60_000);
    } catch {
      setResendError(
        'We could not resend the link just now. Please wait a moment and try again.'
      );
    } finally {
      setResending(false);
    }
  }

  return (
    <PuzzlePageShell
      rightHeaderContent={
        <div className="rounded-2xl border border-[#D8E8D8] bg-[#EEF8EF] px-4 py-2 shadow-sm">
          <p className="text-sm font-semibold text-[#2E6A46]">
            Almost there
          </p>
          <p className="text-xs text-[#5F7D6A]">
            Check your inbox
          </p>
        </div>
      }
    >
      <div className="mx-auto grid max-w-5xl items-start gap-6 lg:grid-cols-[1fr_0.8fr]">
        <section className="rounded-[36px] border border-[#E8E0D3] bg-white p-6 shadow-sm sm:p-8">
          <p className="mb-3 text-sm font-semibold uppercase tracking-[0.18em] text-[#E36B2C]">
            Magic link sent
          </p>

          <h1 className="font-serif text-4xl leading-tight text-[#071A44] sm:text-5xl">
            Check your email
          </h1>

          <p className="mt-4 max-w-xl text-base leading-relaxed text-[#5F5A54]">
            We sent you a secure access link for your puzzle challenge. Open the
            email and tap the link to continue.
          </p>

          <div className="mt-7 rounded-[30px] border border-[#E8E0D3] bg-[#FBF8F3] p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[22px] bg-[#FFF2D9] text-3xl shadow-sm">
                📧
              </div>

              <div className="min-w-0">
                <p className="text-sm font-medium text-[#6E6A63]">
                  We sent the link to
                </p>

                <p className="mt-1 break-words text-lg font-bold text-[#071A44]">
                  {email ?? 'your email address'}
                </p>

                <p className="mt-2 text-sm leading-relaxed text-[#6E6A63]">
                  The link expires in <strong>15 minutes</strong>. You can
                  request another one if it does not arrive.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            <InfoCard
              emoji="1"
              title="Open your inbox"
              text="Look for an email from FundRaisely."
            />

            <InfoCard
              emoji="2"
              title="Tap the link"
              text="The magic link signs you in securely."
            />

            <InfoCard
              emoji="3"
              title="Start playing"
              text="You will be taken back to your puzzle challenge."
            />
          </div>
        </section>

        <aside className="space-y-6">
          <section className="rounded-[36px] border border-[#E8E0D3] bg-white p-6 text-center shadow-sm sm:p-8">
            <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-[26px] bg-[#E9E0FB] text-4xl shadow-sm">
              ✨
            </div>

            <h2 className="font-serif text-3xl leading-tight text-[#071A44]">
              Can&apos;t find it?
            </h2>

            <p className="mt-3 text-sm leading-relaxed text-[#6E6A63]">
              Check your spam, junk or promotions folder. The subject line
              should mention your puzzle access link.
            </p>

            <div className="mt-6 rounded-[24px] border border-[#E8E0D3] bg-[#FBF8F3] p-5 text-left">
              <p className="text-sm font-semibold text-[#071A44]">
                Resend your access link
              </p>

              <p className="mt-2 text-sm leading-relaxed text-[#6E6A63]">
                We can send a fresh link to the same email address.
              </p>

              {resent ? (
                <div className="mt-4 rounded-2xl border border-[#D8E8D8] bg-[#EEF8EF] px-4 py-3">
                  <p className="text-sm font-semibold text-[#2E6A46]">
                    ✓ New link sent — check your inbox.
                  </p>
                </div>
              ) : null}

              {resendError ? (
                <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3">
                  <p className="text-sm font-medium text-rose-700">
                    {resendError}
                  </p>
                </div>
              ) : null}

              <PuzzlePrimaryButton
                type="button"
                fullWidth
                onClick={handleResend}
                disabled={!email || !clubId || resending || cooldown}
                className="mt-5"
              >
                {resending
                  ? 'Sending…'
                  : cooldown
                    ? 'Resend available in 60s'
                    : 'Resend the link'}
              </PuzzlePrimaryButton>

              {!clubId ? (
                <p className="mt-3 text-xs leading-relaxed text-[#8A847B]">
                  Resend is unavailable because the organiser details were not
                  passed through. Go back and submit the join form again.
                </p>
              ) : null}
            </div>

            <button
              type="button"
              onClick={() => navigate(-1)}
              className="mt-6 text-sm font-semibold text-[#071A44] underline"
            >
              ← Go back
            </button>
          </section>
        </aside>
      </div>
    </PuzzlePageShell>
  );
}

function InfoCard({
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
      <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-[#F6F1E8] text-sm font-bold text-[#071A44]">
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