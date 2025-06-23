// hooks/useGlobalExtras.ts
import { useMemo } from 'react';
import { fundraisingExtraDefinitions } from '../../../constants/quizMetadata';

interface UseGlobalExtrasParams {
  allPlayerExtras: string[];
  currentPlayerId: string;
  leaderboard: { id: string; name: string; score: number }[];
  cumulativeNegativePoints?: number; // ✅ NEW: Track cumulative negative points
  pointsRestored?: number; // ✅ NEW: Track points already restored
  debug?: boolean;
}

export const useGlobalExtras = ({ 
  allPlayerExtras, 
  currentPlayerId, 
  leaderboard, 
  cumulativeNegativePoints = 0,
  pointsRestored = 0,
  debug = false 
}: UseGlobalExtrasParams) => {
  
  const globalExtras = useMemo(() => {
    const extras = allPlayerExtras.filter((extraId) => {
      const extra = fundraisingExtraDefinitions[extraId as keyof typeof fundraisingExtraDefinitions];
      if (!extra) return false;
      
      // ✅ Handle restore points special case
    if (extraId === 'restorePoints') {
        const availableToRestore = Math.max(0, cumulativeNegativePoints - pointsRestored);
        return availableToRestore > 0;
      }
      
      // ✅ Handle other global extras
       return extra.applicableTo === 'global';
    });

    if (debug) {
      console.log('[useGlobalExtras] 🌍 Available extras:', allPlayerExtras);
      console.log('[useGlobalExtras] 🎯 Cumulative negative points:', cumulativeNegativePoints);
      console.log('[useGlobalExtras] 🔄 Points already restored:', pointsRestored);
      console.log('[useGlobalExtras] ✅ Filtered global extras:', extras);
    }

    return extras;
  }, [allPlayerExtras, cumulativeNegativePoints, pointsRestored, debug]);

  // ✅ Calculate restorable points for display
  const restorablePoints = useMemo(() => {
    const maxRestore = fundraisingExtraDefinitions.restorePoints?.totalRestorePoints || 3;
    const availableToRestore = Math.max(0, cumulativeNegativePoints - pointsRestored);
    return Math.min(maxRestore, availableToRestore);
  }, [cumulativeNegativePoints, pointsRestored]);

  // ✅ Helper to get eligible targets for robPoints
  const robPointsTargets = useMemo(() => {
    return leaderboard.filter(
      player => player.id !== currentPlayerId && player.score >= 2
    );
  }, [leaderboard, currentPlayerId]);

  return { 
    globalExtras, 
    restorablePoints,
    robPointsTargets 
  };
};