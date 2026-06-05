// src/components/Quiz/hooks/useEntitlements.ts
//
// Scope-aware entitlements hook.
//
// Usage:
//   const { ents, loading, error } = useEntitlements();            // quiz (default)
//   const { ents, loading, error } = useEntitlements('elimination');
//
// The hook caches per scope in sessionStorage so switching between
// quiz and elimination pages doesn't re-fetch unnecessarily.
// A fresh fetch always runs in the background to keep data current.

import { useEffect, useState } from 'react';
import type { Entitlements } from '@/shared/types';
import type { GameScope } from '@/shared/api/quiz.api';

// Re-export for convenience so callers don't need two imports
export type { Entitlements };

/**
 * Cache key per scope — avoids quiz entitlements overwriting elimination ones.
 */
function cacheKey(scope: GameScope): string {
  return `fundraisely_ents_${scope}`;
}

/**
 * useEntitlements
 *
 * @param scope - 'quiz' (default) | 'elimination' | future game type
 *
 * Returns:
 *   ents    - entitlements for the requested scope, or null while loading
 *   loading - true on the initial fetch (cached data shown immediately if available)
 *   error   - error message if fetch failed
 *   refetch - call this to force a fresh fetch (e.g. after purchasing credits)
 */
export function useEntitlements(scope: GameScope = 'quiz') {
  const [ents, setEnts] = useState<Entitlements | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const load = (cancelled: { current: boolean }) => {
    async function fetch() {
      try {
        setLoading(true);

        // Show cached data immediately so the UI doesn't flash blank
        const cached = sessionStorage.getItem(cacheKey(scope));
        if (cached) {
          try {
            const parsed = JSON.parse(cached) as Entitlements;
            if (!cancelled.current) setEnts(parsed);
          } catch {
            // Corrupt cache — ignore and wait for fresh fetch
            sessionStorage.removeItem(cacheKey(scope));
          }
        }

        // Lazy import to avoid including quizApi in the initial bundle
        const { quizApi } = await import('@/shared/api');
        const fresh = await quizApi.getEntitlements(scope);

        if (!cancelled.current) {
          setEnts(fresh);
          sessionStorage.setItem(cacheKey(scope), JSON.stringify(fresh));
        }
      } catch (e: unknown) {
        if (!cancelled.current) {
          const msg = e instanceof Error ? e.message : 'Failed to load entitlements';
          setError(msg);
        }
      } finally {
        if (!cancelled.current) setLoading(false);
      }
    }

    fetch();
  };

  useEffect(() => {
    // Use a ref-like object so we can cancel async work if scope changes
    // or component unmounts mid-fetch.
    const cancelled = { current: false };
    load(cancelled);
    return () => {
      cancelled.current = true;
    };
    // Re-run if scope changes (e.g. user navigates from quiz to elimination page)
  }, [scope]);

  /**
   * Force a fresh fetch — call after purchasing credits or changing plan.
   * Also clears the cache for this scope so stale data isn't shown.
   */
  function refetch() {
    sessionStorage.removeItem(cacheKey(scope));
    setEnts(null);
    setError(null);
    const cancelled = { current: false };
    load(cancelled);
  }

  return { ents, loading, error, refetch };
}

// ─── Convenience helpers ──────────────────────────────────────────────────────

/**
 * Returns true if the club has credits remaining for the given scope.
 * Handles both FREE (per-game-type) and GROWTH/PRO (pooled) plans transparently —
 * the server already resolves the right bucket before returning game_credits_remaining.
 */
export function hasCreditsFor(ents: Entitlements | null): boolean {
  if (!ents) return false;
  return (ents.game_credits_remaining ?? 0) > 0;
}

/**
 * Returns true if a specific game feature is enabled for this club.
 *
 * @example
 *   hasFeature(ents, 'eventLinking')  // true for DEV/GROWTH plans
 *   hasFeature(ents, 'ticketing')     // true for all plans
 */
export function hasFeature(ents: Entitlements | null, featureKey: string): boolean {
  if (!ents) return false;
  const features = ents.game_features ?? ents.quiz_features ?? ents.quizFeatures ?? {};
  return features[featureKey] === true;
}

/**
 * Returns a human-readable credit status string for display in the UI.
 *
 * @example
 *   creditStatusLabel(ents, 'quiz')        // "1 quiz credit remaining"
 *   creditStatusLabel(ents, 'elimination') // "8 credits remaining this month"
 */
export function creditStatusLabel(ents: Entitlements | null, scope: GameScope): string {
  if (!ents) return '';

  const remaining = ents.game_credits_remaining ?? 0;
  const planCode = ents.plan_code ?? '';

  if (planCode === 'FREE') {
    if (remaining === 0) return `No ${scope} credits remaining`;
    return `${remaining} lifetime ${scope} credit${remaining === 1 ? '' : 's'}`;
  }

  if (remaining === 0) return 'No credits remaining this month';
  return `${remaining} credit${remaining === 1 ? '' : 's'} remaining this month`;
}
