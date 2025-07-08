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
  
  // ✅ FIXED: Calculate restorable points FIRST so we can use it in filtering
  const restorablePoints = useMemo(() => {
    const maxRestore = fundraisingExtraDefinitions.restorePoints?.totalRestorePoints || 3;
    
    // ✅ FIXED: Account for both constraints:
    // 1. Can't restore more than the max limit allows
    const remainingRestoreCapacity = Math.max(0, maxRestore - pointsRestored);
    
    // 2. Can't restore more points than were actually lost (and not already restored)
    const remainingLostPoints = Math.max(0, cumulativeNegativePoints - pointsRestored);
    
    // Take the minimum of both constraints
    const result = Math.min(remainingRestoreCapacity, remainingLostPoints);
    
    if (debug) {
      console.log('[useGlobalExtras] 🔧 Restore Points Calculation:');
      console.log('  - Max restore limit:', maxRestore);
      console.log('  - Points already restored:', pointsRestored);
      console.log('  - Cumulative negative points:', cumulativeNegativePoints);
      console.log('  - Remaining restore capacity:', remainingRestoreCapacity);
      console.log('  - Remaining lost points:', remainingLostPoints);
      console.log('  - Final restorable points:', result);
    }
    
    return result;
  }, [cumulativeNegativePoints, pointsRestored, debug]);
  
  const globalExtras = useMemo(() => {
    const extras = allPlayerExtras.filter((extraId) => {
      const extra = fundraisingExtraDefinitions[extraId as keyof typeof fundraisingExtraDefinitions];
      if (!extra) return false;
      
      // ✅ FIXED: Handle restore points special case using calculated restorablePoints
      if (extraId === 'restorePoints') {
        return restorablePoints > 0;
      }
      
      // ✅ Handle other global extras
      return extra.applicableTo === 'global';
    });

    if (debug) {
      console.log('[useGlobalExtras] 🌍 Available extras:', allPlayerExtras);
      console.log('[useGlobalExtras] 🎯 Cumulative negative points:', cumulativeNegativePoints);
      console.log('[useGlobalExtras] 🔄 Points already restored:', pointsRestored);
      console.log('[useGlobalExtras] 💎 Restorable points:', restorablePoints);
      console.log('[useGlobalExtras] ✅ Filtered global extras:', extras);
    }

    return extras;
  }, [allPlayerExtras, restorablePoints, debug]);

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