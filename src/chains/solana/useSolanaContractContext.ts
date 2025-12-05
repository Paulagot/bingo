// src/chains/solana/useSolanaContractContext.ts
import { useAppKitAccount, useAppKitProvider, useAppKitNetwork } from '@reown/appkit/react';
import { useMemo, useCallback } from 'react';

/**
 * Context-aware hook for Solana contract operations.
 * ALWAYS returns an object (never null) to maintain stable React hook dependencies.
 */
export function useSolanaContractContext() {
  const { address, isConnected } = useAppKitAccount();
  const { walletProvider } = useAppKitProvider('solana');
  const { caipNetwork } = useAppKitNetwork();
  
  // ✅ Check if we're actually on Solana
  const isSolanaNetwork = caipNetwork?.caipNetworkId?.startsWith('solana:');
  const isSolanaReady = isConnected && !!walletProvider && !!address && isSolanaNetwork;
  
  // ✅ DEFINE ALL CALLBACKS AT TOP LEVEL - NOT INSIDE useMemo!
  const createPoolRoom = useCallback(async (params: any) => {
    if (!isSolanaReady) {
      throw new Error('Solana wallet not connected');
    }
    // TODO: Implement actual contract call with walletProvider
    throw new Error('createPoolRoom not yet implemented with AppKit');
  }, [isSolanaReady]);
  
  const createAssetRoom = useCallback(async (params: any) => {
    if (!isSolanaReady) {
      throw new Error('Solana wallet not connected');
    }
    throw new Error('createAssetRoom not yet implemented with AppKit');
  }, [isSolanaReady]);
  
  const joinRoom = useCallback(async (params: any) => {
    if (!isSolanaReady) {
      throw new Error('Solana wallet not connected');
    }
    throw new Error('joinRoom not yet implemented with AppKit');
  }, [isSolanaReady]);
  
  const distributePrizes = useCallback(async (params: any) => {
    if (!isSolanaReady) {
      throw new Error('Solana wallet not connected');
    }
    throw new Error('distributePrizes not yet implemented with AppKit');
  }, [isSolanaReady]);
  
  const previewCharityPayout = useCallback(async (params: any) => {
    if (!isSolanaReady) {
      throw new Error('Solana wallet not connected');
    }
    throw new Error('previewCharityPayout not yet implemented with AppKit');
  }, [isSolanaReady]);
  
  // ✅ NOW use the callbacks in useMemo - just return the object
  return useMemo(() => ({
    isReady: isSolanaReady,
    publicKey: isSolanaReady ? address : null,
    walletProvider: isSolanaReady ? walletProvider : null,
    createPoolRoom,
    createAssetRoom,
    joinRoom,
    distributePrizes,
    previewCharityPayout,
  }), [
    isSolanaReady, 
    address, 
    walletProvider,
    createPoolRoom,
    createAssetRoom,
    joinRoom,
    distributePrizes,
    previewCharityPayout
  ]);
}