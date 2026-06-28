// src/components/puzzles/pages/PuzzleAuthPage.tsx
// Handles the magic link callback — /puzzle-auth?token=...&challengeId=...

import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supporterAuthService } from '../services/SupporterAuthService';
import PuzzlePageShell from '../ui/PuzzlePageShell';
import PuzzlePrimaryButton from '../ui/PuzzlePrimaryButton';

type Status = 'verifying' | 'success' | 'error';

export default function PuzzleAuthPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [status, setStatus] = useState<Status>('verifying');
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState<string>('');

  const token = searchParams.get('token');
  const challengeId = searchParams.get('challengeId');

  useEffect(() => {
    if (!token) {
      setError('No token found in this link. Please request a new one.');
      setStatus('error');
      return;
    }

    supporterAuthService
      .verifyToken(token, challengeId ?? undefined)
      .then(result => {
        setName(result.supporter.name);
        setStatus('success');

        window.setTimeout(() => {
          if (challengeId) {
            navigate(`/challenges/${challengeId}/play`);
          } else {
            navigate('/my-challenges');
          }
        }, 1500);
      })
      .catch(err => {
        setError((err as Error).message);
        setStatus('error');
      });
  }, [token, challengeId, navigate]);

  if (status === 'verifying') {
    return (
      <PuzzlePageShell
        rightHeaderContent={
          <div className="rounded-2xl border border-[#E8E0D3] bg-white px-4 py-2 shadow-sm">
            <p className="text-sm font-semibold text-[#071A44]">
              Verifying
            </p>
            <p className="text-xs text-[#6E6A63]">
              Secure magic link
            </p>
          </div>
        }
      >
        <div className="mx-auto flex min-h-[55vh] max-w-xl items-center justify-center">
          <div className="w-full rounded-[36px] border border-[#E8E0D3] bg-white p-8 text-center shadow-sm">
            <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-[26px] bg-[#FFF2D9] shadow-sm">
              <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#D8D1C4] border-t-[#157F85]" />
            </div>

            <p className="mb-3 text-sm font-semibold uppercase tracking-[0.18em] text-[#E36B2C]">
              One moment
            </p>

            <h1 className="font-serif text-4xl leading-tight text-[#071A44]">
              Verifying your link
            </h1>

            <p className="mt-4 text-sm leading-relaxed text-[#6E6A63]">
              We are checking your secure puzzle access link and getting your
              challenge ready.
            </p>
          </div>
        </div>
      </PuzzlePageShell>
    );
  }

  if (status === 'error') {
    return (
      <PuzzlePageShell
        rightHeaderContent={
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-2 shadow-sm">
            <p className="text-sm font-semibold text-rose-700">
              Link problem
            </p>
            <p className="text-xs text-rose-500">
              Please request a new link
            </p>
          </div>
        }
      >
        <div className="mx-auto flex min-h-[55vh] max-w-xl items-center justify-center">
          <div className="w-full rounded-[36px] border border-[#E8E0D3] bg-white p-8 text-center shadow-sm">
            <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-[26px] bg-rose-50 text-4xl shadow-sm">
              ⚠️
            </div>

            <p className="mb-3 text-sm font-semibold uppercase tracking-[0.18em] text-[#E36B2C]">
              Access issue
            </p>

            <h1 className="font-serif text-4xl leading-tight text-[#071A44]">
              Link problem
            </h1>

            <p className="mt-4 text-sm leading-relaxed text-[#6E6A63]">
              {error ?? 'This magic link could not be verified.'}
            </p>

            <div className="mt-7 rounded-[24px] border border-[#E8E0D3] bg-[#FBF8F3] p-5 text-left">
              <p className="text-sm font-semibold text-[#071A44]">
                What to do next
              </p>

              <p className="mt-2 text-sm leading-relaxed text-[#6E6A63]">
                Magic links expire for security. Go back to the join or sign-in
                screen and request a fresh access link.
              </p>

              <PuzzlePrimaryButton
                type="button"
                fullWidth
                onClick={() => navigate(-1)}
                className="mt-5"
              >
                Request a new link
              </PuzzlePrimaryButton>
            </div>
          </div>
        </div>
      </PuzzlePageShell>
    );
  }

  return (
    <PuzzlePageShell
      rightHeaderContent={
        <div className="rounded-2xl border border-[#D8E8D8] bg-[#EEF8EF] px-4 py-2 shadow-sm">
          <p className="text-sm font-semibold text-[#2E6A46]">
            Success
          </p>
          <p className="text-xs text-[#5F7D6A]">
            Taking you to puzzles
          </p>
        </div>
      }
    >
      <div className="mx-auto flex min-h-[55vh] max-w-xl items-center justify-center">
        <div className="w-full rounded-[36px] border border-[#E8E0D3] bg-white p-8 text-center shadow-sm">
          <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-[26px] bg-[#EEF8EF] text-4xl shadow-sm">
            🎉
          </div>

          <p className="mb-3 text-sm font-semibold uppercase tracking-[0.18em] text-[#E36B2C]">
            You&apos;re in
          </p>

          <h1 className="font-serif text-4xl leading-tight text-[#071A44]">
            Welcome{name ? `, ${name.split(' ')[0]}` : ''}!
          </h1>

          <p className="mt-4 text-sm leading-relaxed text-[#6E6A63]">
            Your puzzle access is verified. We&apos;re taking you to your
            challenge now.
          </p>

          <div className="mt-7 overflow-hidden rounded-full bg-[#F6F1E8]">
            <div className="h-2 w-full origin-left animate-[fundraiselyGrow_1.5s_ease-in-out_forwards] rounded-full bg-[#157F85]" />
          </div>

          <style>
            {`
              @keyframes fundraiselyGrow {
                from {
                  transform: scaleX(0);
                }
                to {
                  transform: scaleX(1);
                }
              }
            `}
          </style>
        </div>
      </div>
    </PuzzlePageShell>
  );
}