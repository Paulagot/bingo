// hooks/useGlobalExtras.ts
import { useMemo } from 'react';
import { fundraisingExtraDefinitions } from '../constants/quizMetadata';

interface UseGlobalExtrasParams {
  allPlayerExtras: string[];
  currentPlayerId: string;
  leaderboard: { id: string; name: string; score: number }[];
  cumulativeNegativePoints?: number;
  pointsRestored?: number;
  usedExtras?: Record<string, boolean>; // ✅ NEW: Add usedExtras for consistency
  debug?: boolean;
}

export const useGlobalExtras = ({ 
  allPlayerExtras, 
  currentPlayerId, 
  leaderboard, 
  cumulativeNegativePoints = 0,
  pointsRestored = 0,
  usedExtras = {}, // ✅ NEW: Default to empty object
  debug = false 
}: UseGlobalExtrasParams) => {
  
  // ✅ Calculate restorable points FIRST so we can use it in filtering
  const restorablePoints = useMemo(() => {
    const maxRestore = fundraisingExtraDefinitions.restorePoints?.totalRestorePoints || 3;
    
    // ✅ Account for both constraints:
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
      
      // ✅ NEW: Filter out used extras (except restorePoints which has special logic)
      if (extraId !== 'restorePoints' && usedExtras[extraId]) {
        if (debug) console.log(`[useGlobalExtras] 🚫 Filtering out used extra: ${extraId}`);
        return false;
      }
      
      // ✅ Handle restore points special case using calculated restorablePoints
      if (extraId === 'restorePoints') {
        const hasRestorablePoints = restorablePoints > 0;
        if (debug) console.log(`[useGlobalExtras] 🎯 restorePoints available: ${hasRestorablePoints} (${restorablePoints} points)`);
        return hasRestorablePoints;
      }
      
      // ✅ Handle other global extras
      const isGlobal = extra.applicableTo === 'global';
      if (debug && isGlobal) console.log(`[useGlobalExtras] ✅ Including global extra: ${extraId}`);
      return isGlobal;
    });

    if (debug) {
      console.log('[useGlobalExtras] 🌍 Available extras:', allPlayerExtras);
      console.log('[useGlobalExtras] 🚫 Used extras:', usedExtras);
      console.log('[useGlobalExtras] 🎯 Cumulative negative points:', cumulativeNegativePoints);
      console.log('[useGlobalExtras] 🔄 Points already restored:', pointsRestored);
      console.log('[useGlobalExtras] 💎 Restorable points:', restorablePoints);
      console.log('[useGlobalExtras] ✅ Final filtered global extras:', extras);
    }

    return extras;
  }, [allPlayerExtras, restorablePoints, usedExtras, debug]);

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