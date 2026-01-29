import { useEffect, useState } from 'react';

export interface Entitlements {
  game_credits_remaining?: number;
  max_players_per_game?: number;
  max_rounds?: number;
  plan_id?: number;
  plan_code?: string;
  quiz_features?: {
    eventLinking?: boolean;
    [key: string]: any;
  };
  quizFeatures?: {
    eventLinking?: boolean;
    [key: string]: any;
  };
  // allow extra fields without TS moaning
  [key: string]: any;
}

export function useEntitlements() {
  const [ents, setEnts] = useState<Entitlements | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        // lazy import to avoid initial bundle weight
       const { quizApi } = await import('@/shared/api');
        const cached = sessionStorage.getItem('fundraisely_ents');
        if (cached) {
          const parsed = JSON.parse(cached);
          if (!cancelled) setEnts(parsed);
        }

       const fresh = await quizApi.getEntitlements();
        if (!cancelled) {
          setEnts(fresh);
          sessionStorage.setItem('fundraisely_ents', JSON.stringify(fresh));
        }
      } catch (e: any) {
        if (!cancelled) setError(e?.message ?? 'Failed to load entitlements');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, []);

  return { ents, loading, error };
}
