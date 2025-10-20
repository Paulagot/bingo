import { useMemo, useCallback } from 'react';
import { useQuizChainIntegration } from './useQuizChainIntegration';
import { useWalletStore } from '../stores/walletStore';
import type {
  SupportedChain,
  WalletConnectionResult,
  NetworkInfo,
} from '../chains/types';

/** Public shape this hook returns to callers */
export interface WalletActions {
  chain: SupportedChain | null;

  // lifecycle
  connect: () => Promise<WalletConnectionResult>;
  disconnect: () => Promise<void>;
  isConnected: () => boolean;
  getAddress: () => string | null;

  // info
  getNetworkInfo: () => NetworkInfo | undefined;

  // optional EVM-only helpers (feature-detect when calling)
  switchChain?: (toChainId: number) => Promise<boolean>;
  getChainId?: () => Promise<number | undefined>;
}

type Options = { chainOverride?: SupportedChain | null };

/**
 * ✅ STORE-BASED WALLET ACTIONS
 * 
 * This version reads from the global wallet store instead of contexts,
 * so it can be safely called anywhere without provider mounting issues.
 */
export function useWalletActions(opts?: Options): WalletActions {
  const { selectedChain } = useQuizChainIntegration({ chainOverride: opts?.chainOverride });
  const effectiveChain = (opts?.chainOverride ?? selectedChain) as SupportedChain | null;

  // ✅ Read from store, not contexts
  const { stellar, evm, solana } = useWalletStore((s) => ({
    stellar: s.stellar,
    evm: s.evm,
    solana: s.solana,
  }));

  // Connection handlers dispatch to window events that providers listen to
  const stellarConnect = useCallback(async (): Promise<WalletConnectionResult> => {
    console.log('[useWalletActions] Dispatching stellar:request-connect');
    window.dispatchEvent(new CustomEvent('stellar:request-connect'));
    
    // Wait a bit for provider to respond
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const state = useWalletStore.getState().stellar;
    if (state?.isConnected && state.address) {
      return {
        success: true,
        address: state.address,
        networkInfo: {
          chainId: state.networkPassphrase || 'stellar',
          name: 'Stellar',
          isTestnet: true,
          rpcUrl: '',
          blockExplorer: '',
        },
      };
    }
    
    return {
      success: false,
      address: null,
      error: {
        code: 'WALLET_CONNECTION_FAILED' as any,
        message: 'Stellar connection failed',
        timestamp: new Date(),
      },
    };
  }, []);

  const stellarDisconnect = useCallback(async (): Promise<void> => {
    console.log('[useWalletActions] Dispatching stellar:request-disconnect');
    window.dispatchEvent(new CustomEvent('stellar:request-disconnect'));
    await new Promise(resolve => setTimeout(resolve, 100));
  }, []);

  const evmConnect = useCallback(async (): Promise<WalletConnectionResult> => {
    console.log('[useWalletActions] Dispatching evm:request-connect');
    window.dispatchEvent(new CustomEvent('evm:request-connect'));
    
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const state = useWalletStore.getState().evm;
    if (state?.isConnected && state.address) {
      return {
        success: true,
        address: state.address,
        networkInfo: {
          chainId: state.chainId?.toString() || 'evm',
          name: 'EVM',
          isTestnet: false,
          rpcUrl: '',
          blockExplorer: '',
        },
      };
    }
    
    return {
      success: false,
      address: null,
      error: {
        code: 'WALLET_CONNECTION_FAILED' as any,
        message: 'EVM connection failed',
        timestamp: new Date(),
      },
    };
  }, []);

  const evmDisconnect = useCallback(async (): Promise<void> => {
    console.log('[useWalletActions] Dispatching evm:request-disconnect');
    window.dispatchEvent(new CustomEvent('evm:request-disconnect'));
    await new Promise(resolve => setTimeout(resolve, 100));
  }, []);

  return useMemo<WalletActions>(() => {
    // ========== STELLAR ==========
    if (effectiveChain === 'stellar') {
      return {
        chain: 'stellar',
        connect: stellarConnect,
        disconnect: stellarDisconnect,
        isConnected: () => !!(stellar?.isConnected && stellar?.address),
        getAddress: () => stellar?.address ?? null,
        getNetworkInfo: (): NetworkInfo | undefined => {
          if (!stellar?.networkPassphrase) return undefined;
          return {
            chainId: stellar.networkPassphrase,
            name: 'Stellar',
            isTestnet: true,
            rpcUrl: '',
            blockExplorer: '',
          };
        },
      };
    }

    // ========== EVM ==========
    if (effectiveChain === 'evm') {
      return {
        chain: 'evm',
        connect: evmConnect,
        disconnect: evmDisconnect,
        isConnected: () => !!(evm?.isConnected && evm?.address),
        getAddress: () => evm?.address ?? null,
        getNetworkInfo: () => ({
          chainId: evm?.chainId?.toString() || 'evm',
          name: 'EVM',
          isTestnet: false,
          rpcUrl: '',
          blockExplorer: '',
        }),
        // ✅ EVM-specific helpers
        switchChain: async (toChainId: number) => {
          window.dispatchEvent(new CustomEvent('evm:request-switch-chain', { 
            detail: { chainId: toChainId } 
          }));
          await new Promise(resolve => setTimeout(resolve, 500));
          return useWalletStore.getState().evm?.chainId === toChainId;
        },
        getChainId: async () => {
          return useWalletStore.getState().evm?.chainId;
        },
      };
    }

    // ========== SOLANA ==========
    if (effectiveChain === 'solana') {
      return {
        chain: 'solana',
        connect: async () => ({
          success: false,
          address: null,
          error: {
            code: 'WALLET_NOT_FOUND' as any,
            message: 'Solana wallet not implemented',
            timestamp: new Date(),
          },
        }),
        disconnect: async () => {},
        isConnected: () => !!(solana?.isConnected && solana?.address),
        getAddress: () => solana?.address ?? null,
        getNetworkInfo: () => undefined,
      };
    }

    // ========== NO CHAIN ==========
    return {
      chain: null,
      connect: async () => ({
        success: false,
        address: null,
        error: {
          code: 'WALLET_CONNECTION_FAILED' as any,
          message: 'No chain selected',
          timestamp: new Date(),
        },
      }),
      disconnect: async () => {},
      isConnected: () => false,
      getAddress: () => null,
      getNetworkInfo: () => undefined,
    };
  }, [
    effectiveChain,
    stellar?.isConnected,
    stellar?.address,
    stellar?.networkPassphrase,
    evm?.isConnected,
    evm?.address,
    evm?.chainId,
    solana?.isConnected,
    solana?.address,
    stellarConnect,
    stellarDisconnect,
    evmConnect,
    evmDisconnect,
  ]);
}




