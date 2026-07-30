// src/components/puzzles/pages/PuzzleNotifyPage.tsx
// Handles the "week N is ready" notification email link -
// /puzzle-notify?token=...&challengeId=...
//
// Deliberately simpler than PuzzleAuthPage: the token here is already a
// full, valid 90-day JWT (issued directly by
// supporterAuthService.sendWeekReadyNotification on the backend), not a
// short-lived opaque magic-link token that needs exchanging. There is no
// verify/exchange API call to make - just store it and go, the same way
// exchangeSession's caller stores its result, but with one less network
// round trip since the token is already final.

import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supporterAuthService } from '../services/SupporterAuthService';
import PuzzlePageShell from '../ui/PuzzlePageShell';

export default function PuzzleNotifyPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  const token = searchParams.get('token');
  const challengeId = searchParams.get('challengeId');

  useEffect(() => {
    if (!token || !challengeId) {
      setError('This link is missing some information. Please use the link from your email again.');
      return;
    }

    supporterAuthService.setSupporterToken(token);
    navigate(`/challenges/${challengeId}/play`, { replace: true });
  }, [token, challengeId, navigate]);

  if (error) {
    return (
      <PuzzlePageShell>
        <div className="mx-auto flex min-h-[55vh] max-w-xl items-center justify-center">
          <div className="w-full rounded-[36px] border border-[#E8E0D3] bg-white p-8 text-center shadow-sm">
            <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-[26px] bg-rose-50 text-4xl shadow-sm">
              ⚠️
            </div>
            <h1 className="font-serif text-4xl leading-tight text-[#071A44]">
              Link problem
            </h1>
            <p className="mt-4 text-sm leading-relaxed text-[#6E6A63]">
              {error}
            </p>
          </div>
        </div>
      </PuzzlePageShell>
    );
  }

  return (
    <PuzzlePageShell>
      <div className="mx-auto flex min-h-[55vh] max-w-xl items-center justify-center">
        <div className="w-full rounded-[36px] border border-[#E8E0D3] bg-white p-8 text-center shadow-sm">
          <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-[26px] bg-[#FFF2D9] shadow-sm">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#D8D1C4] border-t-[#157F85]" />
          </div>
          <h1 className="font-serif text-4xl leading-tight text-[#071A44]">
            Taking you to your puzzle…
          </h1>
        </div>
      </div>
    </PuzzlePageShell>
  );
}