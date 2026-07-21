// src/components/puzzles/pages/PuzzleDropStripeSuccessPage.tsx
//
// Landing point for Stripe's success_url after a Puzzle Drop Checkout
// Session completes: /puzzle-drop/:dropRoomId/success?entitlementId=...&session_id=...
//
// Stripe's success_url can only carry small values, not a full set of
// access tokens for a multi-item purchase — so this page calls
// publicPuzzleDropService.getStripeSession to retrieve them, the same
// way the instant-payment success screen on PuzzleDropLandingPage.tsx
// gets them directly from the purchase() response.
//
// Webhook timing is NOT guaranteed relative to the browser's redirect
// back from Checkout — the webhook could land before or after this page
// loads. So this polls briefly (a few short retries) while pending
// rather than treating "not confirmed yet" as an error.

import { useEffect, useRef, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import {
  publicPuzzleDropService,
  type StripeSessionEntitlement,
} from '../services/publicPuzzleDropService';
import PuzzlePageShell from '../ui/PuzzlePageShell';
import { resolvePuzzleTheme } from '../ui/puzzleTheme';

const POLL_INTERVAL_MS = 2000;
const MAX_POLLS = 10; // ~20s of polling before giving up and showing a manual-refresh notice

export default function PuzzleDropStripeSuccessPage() {
  const { dropRoomId } = useParams<{ dropRoomId: string }>();
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('session_id') ?? '';

  const [entitlements, setEntitlements] = useState<StripeSessionEntitlement[] | null>(null);
  const [pending, setPending] = useState(true);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);
  const pollCount = useRef(0);

  // No club branding fetch here — same deliberate simplification as
  // PuzzleDropPlayPage.tsx; default theme only.
  const theme = resolvePuzzleTheme(null);

  useEffect(() => {
    if (!dropRoomId || !sessionId) {
      setPageError('This link is missing required information.');
      setLoading(false);
      return;
    }

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    async function poll() {
      try {
        const result = await publicPuzzleDropService.getStripeSession(dropRoomId!, sessionId);
        if (cancelled) return;

        setEntitlements(result.entitlements);
        setPending(result.pending);
        setLoading(false);

        if (result.pending && pollCount.current < MAX_POLLS) {
          pollCount.current += 1;
          timer = setTimeout(poll, POLL_INTERVAL_MS);
        }
      } catch (err) {
        if (cancelled) return;
        setPageError((err as Error).message ?? 'Could not confirm your payment.');
        setLoading(false);
      }
    }

    poll();

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [dropRoomId, sessionId]);

  if (loading) {
    return (
      <PuzzlePageShell theme={theme}>
        <div className="flex min-h-[50vh] items-center justify-center">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#D8D1C4] border-t-[var(--puzzle-primary)]" />
        </div>
      </PuzzlePageShell>
    );
  }

  if (pageError) {
    return (
      <PuzzlePageShell theme={theme}>
        <div className="mx-auto max-w-xl rounded-[28px] border border-[#E7C4C4] bg-white p-8 text-center shadow-sm">
          <p className="mb-2 text-3xl">😕</p>
          <h1 className="mb-2 text-xl font-bold text-[#071A44]">Couldn't confirm payment</h1>
          <p className="text-sm text-[#6E6A63]">{pageError}</p>
        </div>
      </PuzzlePageShell>
    );
  }

  return (
    <PuzzlePageShell theme={theme}>
      <div className="mx-auto max-w-3xl">
        <section className="rounded-[36px] border border-[#D8E8D8] bg-[#F3FAF4] p-6 shadow-sm sm:p-8">
          {pending ? (
            <>
              <h2 className="mb-2 font-serif text-3xl text-[#071A44]">Confirming your payment…</h2>
              <p className="mb-6 text-sm text-[#5F7D6A]">
                Stripe says your payment went through — we're just finishing setting up your puzzles.
                This page will update automatically in a few seconds.
              </p>
              <div className="flex items-center gap-3">
                <div className="h-6 w-6 animate-spin rounded-full border-4 border-[#D8D1C4] border-t-[var(--puzzle-primary)]" />
                <p className="text-sm text-[#6E6A63]">Still working on it…</p>
              </div>
            </>
          ) : (
            <>
              <h2 className="mb-2 font-serif text-3xl text-[#071A44]">Payment confirmed 🎉</h2>
              <p className="mb-6 text-sm text-[#5F7D6A]">
                Save these links now — each one unlocks a puzzle:
              </p>
              <div className="space-y-3">
                {(entitlements ?? []).map(ent => {
                  const playUrl = `${window.location.origin}/puzzle-drop/play/${ent.entitlementId}?token=${ent.accessToken}`;
                  return (
                    <div key={ent.entitlementId} className="rounded-2xl border border-[#D8D1C4] bg-white p-4">
                      <p className="mb-1 text-sm font-semibold text-[#071A44]">
                        Puzzle {ent.itemNumber ?? ''}
                      </p>
                      <a href={playUrl} className="break-all text-xs text-[var(--puzzle-primary)] underline">
                        {playUrl}
                      </a>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </section>
      </div>
    </PuzzlePageShell>
  );
}