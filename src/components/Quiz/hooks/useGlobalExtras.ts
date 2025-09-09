// hooks/useGlobalExtras.ts - FIXED: Configuration support and better restore logic
import { useMemo } from 'react';
import { fundraisingExtraDefinitions } from '../constants/quizMetadata';

interface UseGlobalExtrasParams {
  allPlayerExtras: string[];
  currentPlayerId: string;
  leaderboard: { id: string; name: string; score: number; cumulativeNegativePoints?: number; pointsRestored?: number }[];
  cumulativeNegativePoints?: number; // Keep for backwards compatibility
  pointsRestored?: number;
  usedExtras?: Record<string, boolean>;
  maxRestorePoints?: number; // ✅ NEW: Accept configuration
  debug?: boolean;
}

export const useGlobalExtras = ({ 
  allPlayerExtras, 
  currentPlayerId, 
  leaderboard, 
  cumulativeNegativePoints = 0, 
  pointsRestored = 0,
  usedExtras = {},
  maxRestorePoints, // ✅ NEW: Optional config override
  debug = false 
}: UseGlobalExtrasParams) => {
  
  // Find current player's data from leaderboard (more reliable than separate props)
  const currentPlayerData = useMemo(() => {
    const currentPlayer = leaderboard.find(p => p.id === currentPlayerId);
    return {
      score: currentPlayer?.score ?? 0,
      cumulativeNegativePoints: currentPlayer?.cumulativeNegativePoints ?? cumulativeNegativePoints,
      pointsRestored: currentPlayer?.pointsRestored ?? pointsRestored
    };
  }, [leaderboard, currentPlayerId, cumulativeNegativePoints, pointsRestored]);

  // ✅ FIXED: Calculate restorable points using leaderboard data and configuration
  const restorablePoints = useMemo(() => {
    // ✅ FIXED: Get max restore from config, fallback to metadata, then hardcoded
    const maxRestore = maxRestorePoints 
      ?? fundraisingExtraDefinitions.restorePoints?.totalRestorePoints 
      ?? 3;
    
    // How many restores they have left (lifetime limit)
    const remainingRestoreCapacity = Math.max(0, maxRestore - currentPlayerData.pointsRestored);
    
    // ✅ CORRECT: Use cumulativeNegativePoints to determine how many points they can restore
    const negativePointsAvailableToRestore = Math.max(0, currentPlayerData.cumulativeNegativePoints - currentPlayerData.pointsRestored);
    
    // ✅ CORRECT: Can only restore up to the points they actually lost AND their remaining capacity
    const actuallyRestorablePoints = Math.min(remainingRestoreCapacity, negativePointsAvailableToRestore);
    
    // ✅ SIMPLIFIED: Clean boolean logic
    const canRestore = remainingRestoreCapacity > 0 && negativePointsAvailableToRestore > 0;
    
    if (debug) {
      console.log('[useGlobalExtras] 🔧 Restore Points Calculation:');
      console.log('  - Current player score (net):', currentPlayerData.score);
      console.log('  - Total negative points accumulated:', currentPlayerData.cumulativeNegativePoints);
      console.log('  - Points already restored:', currentPlayerData.pointsRestored);
      console.log('  - Max restore limit (config):', maxRestore);
      console.log('  - Remaining restore capacity:', remainingRestoreCapacity);
      console.log('  - Negative points available to restore:', negativePointsAvailableToRestore);
      console.log('  - Can restore:', canRestore);
      console.log('  - Actually restorable points:', actuallyRestorablePoints);
    }
    
    return canRestore ? actuallyRestorablePoints : 0;
  }, [currentPlayerData, maxRestorePoints, debug]);
  
  const globalExtras = useMemo(() => {
    const extras = allPlayerExtras.filter((extraId) => {
      const extra = fundraisingExtraDefinitions[extraId as keyof typeof fundraisingExtraDefinitions];
      if (!extra) return false;
      
      // ✅ FIXED: Filter out used extras individually per player
      // Don't use global usedExtras for restorePoints since it has per-player limits
      if (extraId !== 'restorePoints' && usedExtras[extraId]) {
        if (debug) console.log(`[useGlobalExtras] 🚫 Filtering out used extra: ${extraId}`);
        return false;
      }
      
      // ✅ UPDATED: Handle restore points with proper per-player logic
      if (extraId === 'restorePoints') {
        const hasRestorablePoints = restorablePoints > 0;
        if (debug) {
          console.log(`[useGlobalExtras] 🎯 restorePoints check for ${currentPlayerId}:`);
          console.log(`   - Player score: ${currentPlayerData.score}`);
          console.log(`   - Cumulative negative: ${currentPlayerData.cumulativeNegativePoints}`);
          console.log(`   - Already restored: ${currentPlayerData.pointsRestored}`);
          console.log(`   - Restorable points: ${restorablePoints}`);
          console.log(`   - Available: ${hasRestorablePoints}`);
        }
        return hasRestorablePoints;
      }
      
      // Handle other global extras
      const isGlobal = extra.applicableTo === 'global';
      if (debug && isGlobal) console.log(`[useGlobalExtras] ✅ Including global extra: ${extraId}`);
      return isGlobal;
    });

    if (debug) {
      console.log('[useGlobalExtras] 🌍 Available extras:', allPlayerExtras);
      console.log('[useGlobalExtras] 🚫 Used extras:', usedExtras);
      console.log('[useGlobalExtras] 🎯 Current player data:', currentPlayerData);
      console.log('[useGlobalExtras] 💎 Restorable points:', restorablePoints);
      console.log('[useGlobalExtras] ✅ Final filtered global extras:', extras);
    }

    return extras;
  }, [allPlayerExtras, restorablePoints, usedExtras, currentPlayerData, debug]);

  // Helper to get eligible targets for robPoints
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