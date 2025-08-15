// hooks/useRoundExtras.ts
import { useMemo } from 'react';
import { fundraisingExtraDefinitions } from '../constants/quizMetadata';
import type { RoundTypeId } from '../types/quiz';

interface UseRoundExtrasParams {
  allPlayerExtras: string[];
  currentRoundType?: string;
  usedExtras?: Record<string, boolean>; // ✅ NEW: Add used extras
  debug?: boolean;
}

export const useRoundExtras = ({ 
  allPlayerExtras, 
  currentRoundType, 
  usedExtras = {}, // ✅ NEW: Default to empty object
  debug = false 
}: UseRoundExtrasParams) => {
  const roundExtras = useMemo(() => {
    const extras = allPlayerExtras.filter((extraId) => {
      const extra = fundraisingExtraDefinitions[extraId as keyof typeof fundraisingExtraDefinitions];
      if (!extra) return false;
      if (extra.applicableTo === 'global') return false;
      
      // ✅ NEW: Exclude restore points from round extras (show only on leaderboard)
      if (extraId === 'restorePoints') return false;
      
      // ✅ NEW: Filter out used extras so they disappear from UI
      if (usedExtras[extraId]) {
        if (debug) console.log(`[useRoundExtras] 🚫 Filtering out used extra: ${extraId}`);
        return false;
      }
      
      if (!currentRoundType) return false;
      
      // ✅ FIXED: Cast currentRoundType to RoundTypeId to fix TypeScript error
      return Array.isArray(extra.applicableTo) && 
             extra.applicableTo.includes(currentRoundType as RoundTypeId);
    });

    if (debug) {
      console.log('[useRoundExtras] 🎯 Available roundExtras:', extras);
      console.log('[useRoundExtras] 🚫 Used extras:', usedExtras);
      console.log('[useRoundExtras] 🔍 All player extras:', allPlayerExtras);
    }

    return extras;
  }, [allPlayerExtras, currentRoundType, usedExtras, debug]);

  return { roundExtras };
};