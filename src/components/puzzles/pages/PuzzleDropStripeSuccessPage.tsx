// src/components/puzzles/pages/PuzzleDropStripeSuccessPage.tsx
//
// Landing point for Stripe's success_url after a Puzzle Drop Checkout
// Session completes:
// /puzzle-drop/:dropRoomId/success?entitlementId=...&session_id=...
//
// Stripe's success_url can only carry small values, not a full set of
// access tokens for a multi-item purchase, so this page calls
// publicPuzzleDropService.getStripeSession to retrieve them.
//
// Webhook timing is NOT guaranteed relative to the browser redirect.
// This page therefore polls briefly while the payment is still pending.
//
// Club branding is loaded separately through getInfo(). Branding failure
// is non-fatal: payment confirmation still works and the standard
// FundRaisely Puzzle theme is used as a fallback.

import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';

import {
  publicPuzzleDropService,
  type PublicDropInfo,
  type StripeSessionEntitlement,
} from '../services/publicPuzzleDropService';

import PuzzlePageShell from '../ui/PuzzlePageShell';
import { resolvePuzzleTheme } from '../ui/puzzleTheme';

const POLL_INTERVAL_MS = 2000;
const MAX_POLLS = 10; // ~20 seconds

export default function PuzzleDropStripeSuccessPage() {
  const { dropRoomId } = useParams<{ dropRoomId: string }>();
  const [searchParams] = useSearchParams();

  const sessionId = searchParams.get('session_id') ?? '';

  const [info, setInfo] = useState<PublicDropInfo | null>(null);

  const [entitlements, setEntitlements] =
    useState<StripeSessionEntitlement[] | null>(null);

  const [pending, setPending] = useState(true);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);

  const pollCount = useRef(0);

  // Use the same club-branding resolution as PuzzleDropLandingPage.
  // If info has not loaded (or branding lookup fails), this naturally
  // falls back to the standard FundRaisely Puzzle theme.
  const theme = useMemo(() => resolvePuzzleTheme(info), [info]);

  // ────────────────────────────────────────────────────────────────────────────
  // Load public Drop information / club branding
  //
  // This is deliberately separate from payment confirmation. A branding/API
  // issue must never prevent the buyer seeing their confirmed purchase.
  // ────────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!dropRoomId) return;

    let cancelled = false;

    publicPuzzleDropService
      .getInfo(dropRoomId)
      .then((result) => {
        if (!cancelled) {
          setInfo(result);
        }
      })
      .catch((err) => {
        // Non-fatal. PuzzlePageShell will use the default theme.
        console.warn(
          '[PuzzleDropStripeSuccessPage] Could not load club branding:',
          err
        );
      });

    return () => {
      cancelled = true;
    };
  }, [dropRoomId]);

  // ────────────────────────────────────────────────────────────────────────────
  // Poll Stripe session / entitlement confirmation
  // ────────────────────────────────────────────────────────────────────────────

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
        const result = await publicPuzzleDropService.getStripeSession(
          dropRoomId!,
          sessionId
        );

        if (cancelled) return;

        setEntitlements(result.entitlements);
        setPending(result.pending);
        setLoading(false);

        if (result.pending && pollCount.current < MAX_POLLS) {
          pollCount.current += 1;

          timer = setTimeout(
            poll,
            POLL_INTERVAL_MS
          );
        }
      } catch (err) {
        if (cancelled) return;

        setPageError(
          (err as Error).message ??
            'Could not confirm your payment.'
        );

        setLoading(false);
      }
    }

    poll();

    return () => {
      cancelled = true;

      if (timer) {
        clearTimeout(timer);
      }
    };
  }, [dropRoomId, sessionId]);

  // ────────────────────────────────────────────────────────────────────────────
  // Loading
  // ────────────────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <PuzzlePageShell
        theme={theme}
        clubName={info?.clubName ?? undefined}
      >
        <div className="flex min-h-[50vh] items-center justify-center">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#D8D1C4] border-t-[var(--puzzle-primary)]" />
        </div>
      </PuzzlePageShell>
    );
  }

  // ────────────────────────────────────────────────────────────────────────────
  // Error
  // ────────────────────────────────────────────────────────────────────────────

  if (pageError) {
    return (
      <PuzzlePageShell
        theme={theme}
        clubName={info?.clubName ?? undefined}
      >
        <div className="mx-auto max-w-xl rounded-[28px] border border-[#E7C4C4] bg-white p-8 text-center shadow-sm">
          <p className="mb-2 text-3xl">😕</p>

          <h1 className="mb-2 text-xl font-bold text-[#071A44]">
            Couldn't confirm payment
          </h1>

          <p className="text-sm text-[#6E6A63]">
            {pageError}
          </p>
        </div>
      </PuzzlePageShell>
    );
  }

  // ────────────────────────────────────────────────────────────────────────────
  // Success / pending
  // ────────────────────────────────────────────────────────────────────────────

  return (
    <PuzzlePageShell
      theme={theme}
      clubName={info?.clubName ?? undefined}
    >
      <div className="mx-auto max-w-3xl">
        <section className="rounded-[36px] border border-[var(--puzzle-primary)] bg-white p-6 shadow-sm sm:p-8">
          {pending ? (
            <>
              <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--puzzle-primary)] text-2xl text-[var(--puzzle-text-on-primary)]">
                🧩
              </div>

              <h2 className="mb-2 font-serif text-3xl text-[#071A44]">
                Confirming your payment…
              </h2>

              <p className="mb-6 text-sm text-[#6E6A63]">
                Stripe says your payment went through - we're just
                finishing setting up your puzzles. This page will update
                automatically in a few seconds.
              </p>

              <div className="flex items-center gap-3">
                <div className="h-6 w-6 animate-spin rounded-full border-4 border-[#D8D1C4] border-t-[var(--puzzle-primary)]" />

                <p className="text-sm text-[#6E6A63]">
                  Still working on it…
                </p>
              </div>
            </>
          ) : (
            <>
              <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--puzzle-primary)] text-2xl text-[var(--puzzle-text-on-primary)]">
                ✓
              </div>

              <h2 className="mb-2 font-serif text-3xl text-[#071A44]">
                Payment confirmed 🎉
              </h2>

              <p className="mb-2 text-sm text-[#5F7D6A]">
                Thanks for supporting{' '}
                <strong>
                  {info?.clubName ?? 'the organiser'}
                </strong>.
              </p>

              <p className="mb-6 text-sm text-[#6E6A63]">
                We've also sent your puzzle links by email. You can
                start playing now using the links below.
              </p>

              <div className="space-y-3">
                {(entitlements ?? []).map((ent) => {
                  const playUrl =
                    `${window.location.origin}` +
                    `/puzzle-drop/play/${ent.entitlementId}` +
                    `?token=${ent.accessToken}`;

                  return (
                    <div
                      key={ent.entitlementId}
                      className="rounded-2xl border border-[#D8D1C4] bg-[#FBF8F3] p-4"
                    >
                      <p className="mb-2 text-sm font-semibold text-[#071A44]">
                        Puzzle {ent.itemNumber ?? ''}
                      </p>

                      <a
                        href={playUrl}
                        className="inline-flex rounded-xl bg-[var(--puzzle-primary)] px-4 py-2.5 text-sm font-semibold text-[var(--puzzle-text-on-primary)] no-underline transition hover:opacity-90"
                      >
                        Play Puzzle {ent.itemNumber ?? ''}
                      </a>

                      <p className="mt-3 break-all text-[11px] text-[#8A847B]">
                        {playUrl}
                      </p>
                    </div>
                  );
                })}
              </div>

              <p className="mt-6 text-xs text-[#8A847B]">
                Keep your confirmation email safe - each puzzle link
                gives you access to that puzzle.
              </p>
            </>
          )}
        </section>
      </div>
    </PuzzlePageShell>
  );
}