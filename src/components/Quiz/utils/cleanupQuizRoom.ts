// src/components/Quiz/utils/cleanupQuizRoom.ts
import { stellarStorageKeys } from '../../../chains/stellar/config';
import { useQuizConfig } from '../hooks/useQuizConfig';
import { usePlayerStore } from '../hooks/usePlayerStore';
import { useAdminStore } from '../hooks/useAdminStore';

interface CleanupOptions {
  roomId: string;
  isWeb3Game?: boolean;
  disconnectWallets?: boolean;
}

/**
 * Comprehensive cleanup when ending/leaving a quiz room
 */
export async function cleanupQuizRoom({ 
  roomId, 
  isWeb3Game = false,
  disconnectWallets = true 
}: CleanupOptions) {
  console.log('[cleanupQuizRoom] 🧹 Starting cleanup', { roomId, isWeb3Game, disconnectWallets });

  try {
    // ========================================
    // 1. Clear All Zustand Stores
    // ========================================
    console.log('[cleanupQuizRoom] 🗑️ Clearing Zustand stores...');
    
    useQuizConfig.getState().resetConfig();
    console.log('[cleanupQuizRoom] ✅ Quiz config cleared');
    
    usePlayerStore.setState({ players: [], hydrated: false });
    console.log('[cleanupQuizRoom] ✅ Player store cleared');
    
    useAdminStore.setState({ admins: [] });
    console.log('[cleanupQuizRoom] ✅ Admin store cleared');

    // ========================================
    // 2. Clear Quiz-Specific localStorage
    // ========================================
    const quizKeys = [
      'current-room-id',
      'current-host-id',
      'current-contract-address',
      `quizPlayerId:${roomId}`,
      `quiz_config_${roomId}`,
      `prizesDistributed:${roomId}`,
      `quiz_rejoin_${roomId}`,
      `players_${roomId}`,
      `quizUser:${roomId}:host`,
      `quizUser:${roomId}:player`,
      'setupConfig', // Legacy Web3 setup config
      
      // ✅ NEW: Clean up setup wizard state
      'quiz-setup-v2',           // Setup wizard store
      'quiz-admins',             // Admins store
      'fundraisely-quiz-setup-draft', // Draft saved during wallet connect
    ];

    quizKeys.forEach(key => {
      try {
        localStorage.removeItem(key);
        console.log(`[cleanupQuizRoom] ✅ Removed: ${key}`);
      } catch (err) {
        console.warn(`[cleanupQuizRoom] ⚠️ Failed to remove ${key}:`, err);
      }
    });

    // ========================================
    // 3. Disconnect Wallets (if Web3 game)
    // ========================================
    if (isWeb3Game && disconnectWallets) {
      console.log('[cleanupQuizRoom] 🔌 Disconnecting wallets...');

      // Disconnect Reown AppKit (handles EVM + Solana)
      try {
        const appKit = (window as any).reownAppKit;
        
        if (appKit && typeof appKit.disconnect === 'function') {
          await appKit.disconnect();
          console.log('[cleanupQuizRoom] ✅ Disconnected Reown AppKit (EVM + Solana)');
        } else {
          console.warn('[cleanupQuizRoom] ⚠️ AppKit instance not found on window');
        }
      } catch (err) {
        console.warn('[cleanupQuizRoom] ⚠️ Failed to disconnect AppKit:', err);
      }

      // Clear AppKit localStorage (covers both EVM and Solana)
      const appKitKeys = [
        'wagmi.store',
        '@appkit/portfolio_cache',
        'lace-wallet-mode',
        '@appkit/solana:connected_connector_id', // ✅ NEW: Solana connector state
      ];
      
      appKitKeys.forEach(key => {
        try {
          localStorage.removeItem(key);
          console.log(`[cleanupQuizRoom] ✅ Removed AppKit key: ${key}`);
        } catch (err) {
          console.warn(`[cleanupQuizRoom] ⚠️ Failed to remove ${key}:`, err);
        }
      });

      // Disconnect Stellar (custom implementation - not via AppKit)
      try {
        Object.values(stellarStorageKeys).forEach(key => {
          localStorage.removeItem(key);
          console.log(`[cleanupQuizRoom] ✅ Removed Stellar key: ${key}`);
        });
      } catch (err) {
        console.warn('[cleanupQuizRoom] ⚠️ Failed to clear Stellar storage:', err);
      }
    }

    console.log('[cleanupQuizRoom] ✅ Cleanup complete');
  } catch (error) {
    console.error('[cleanupQuizRoom] ❌ Cleanup failed:', error);
    throw error;
  }
}