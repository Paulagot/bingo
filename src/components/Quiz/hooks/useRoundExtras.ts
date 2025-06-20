// hooks/useRoundExtras.ts
import { useMemo } from 'react';
import { fundraisingExtraDefinitions } from '../../../constants/quizMetadata';

interface UseRoundExtrasParams {
  allPlayerExtras: string[];
  currentRoundType?: string;
  debug?: boolean;
}

export const useRoundExtras = ({ allPlayerExtras, currentRoundType, debug = false }: UseRoundExtrasParams) => {
  const roundExtras = useMemo(() => {
    const extras = allPlayerExtras.filter((extraId) => {
      const extra = fundraisingExtraDefinitions[extraId as keyof typeof fundraisingExtraDefinitions];
      if (!extra) return false;
      if (extra.applicableTo === 'global') return false;
      if (!currentRoundType) return false;
      return Array.isArray(extra.applicableTo) && extra.applicableTo.includes(currentRoundType);
    });

    if (debug) {
      console.log('[useRoundExtras] 🎯 roundExtras:', extras);
    }

    return extras;
  }, [allPlayerExtras, currentRoundType, debug]);

  return { roundExtras };
};