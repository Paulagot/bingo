/**
 * DEPRECATED: Legacy Solana Contract Context
 * 
 * This file exists for backwards compatibility with components that haven't been migrated yet.
 * New code should use the individual hooks:
 * - useSolanaCreatePoolRoom
 * - useSolanaCreateAssetRoom  
 * - useSolanaJoinRoom
 * - etc.
 */

import { useSolanaShared } from './hooks/useSolanaShared';
import type { PublicKey } from '@solana/web3.js';

export function useSolanaContractContext() {
  const { isConnected, program, publicKey } = useSolanaShared();

  console.warn('[DEPRECATED] useSolanaContractContext is deprecated. Migrate to individual hooks.');

  return {
    isReady: isConnected && !!program,
    publicKey: publicKey || undefined,
    
    /**
     * Get room info from on-chain account
     * TODO: Create dedicated hook for this
     */
    getRoomInfo: async (roomPDA: PublicKey) => {
      if (!program) {
        throw new Error('Program not initialized');
      }
      
      try {
        const roomAccount = await (program.account as any).room.fetch(roomPDA);
        return roomAccount;
      } catch (error) {
        console.error('[getRoomInfo] Failed:', error);
        throw error;
      }
    },
    
    /**
     * Close joining for a room
     * TODO: Create useSolanaCloseJoining hook
     */
    closeJoining: async (params: {
      roomId: string;
      hostPubkey: PublicKey;
    }) => {
      console.error('[DEPRECATED] closeJoining not yet implemented in new architecture');
      console.log('Params:', params);
      
      throw new Error(
        'closeJoining not yet implemented. ' +
        'Please create useSolanaCloseJoining hook first.'
      );
    },
    
    /**
     * Cleanup room after it ends
     * TODO: Create useSolanaCleanupRoom hook
     */
    cleanupRoom: async (params: {
      roomId: string;
      hostPubkey: PublicKey;
      recipient: PublicKey;
    }) => {
      console.error('[DEPRECATED] cleanupRoom not yet implemented in new architecture');
      console.log('Params:', params);
      
      throw new Error(
        'cleanupRoom not yet implemented. ' +
        'Please create useSolanaCleanupRoom hook first.'
      );
    },
    
    /**
     * Deposit prize asset for asset-based rooms
     * TODO: Implement this using the proper hook pattern
     */
    depositPrizeAsset: async (params: {
      roomId: string;
      hostPubkey: PublicKey;
      prizeIndex: number;
      prizeMint: PublicKey;
    }) => {
      console.error('[DEPRECATED] depositPrizeAsset not yet implemented in new architecture');
      console.log('Params:', params);
      
      throw new Error(
        'depositPrizeAsset not yet implemented. ' +
        'Please create useSolanaAddPrizeAsset hook first.'
      );
    },
  };
}

export default useSolanaContractContext;