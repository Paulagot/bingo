import { useMemo, useCallback } from 'react';
import { useQuizChainIntegration } from './useQuizChainIntegration';
import { useWalletStore } from '../stores/walletStore';
import type {
  SupportedChain,
  WalletConnectionResult,
  NetworkInfo,
} from '../chains/types';

export interface WalletActions {
  chain: SupportedChain | null;

  // lifecycle
  connect: () => Promise<WalletConnectionResult>;
  disconnect: () => Promise<void>;
  isConnected: () => boolean;
  getAddress: () => string | null;

  // info
  getNetworkInfo: () => NetworkInfo | undefined;

  // optional EVM-only helpers
  switchChain?: (toChainId: number) => Promise<boolean>;
  getChainId?: () => Promise<number | undefined>;
}

type Options = { chainOverride?: SupportedChain | null };

export function useWalletActions(opts?: Options): WalletActions {
  const { selectedChain } = useQuizChainIntegration({ chainOverride: opts?.chainOverride });
  const effectiveChain = (opts?.chainOverride ?? selectedChain) as SupportedChain | null;

  // Read from store (no contexts)
  const { stellar, evm, solana } = useWalletStore((s) => ({
    stellar: s.stellar,
    evm: s.evm,
    solana: s.solana,
  }));

  // -------------------- Stellar --------------------
  const stellarConnect = useCallback(async (): Promise<WalletConnectionResult> => {
    window.dispatchEvent(new CustomEvent('stellar:request-connect'));
    await new Promise((r) => setTimeout(r, 100));

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
    window.dispatchEvent(new CustomEvent('stellar:request-disconnect'));
    await new Promise((r) => setTimeout(r, 100));
  }, []);

  // -------------------- EVM --------------------
  const evmConnect = useCallback(async (): Promise<WalletConnectionResult> => {
    window.dispatchEvent(new CustomEvent('evm:request-connect'));
    await new Promise((r) => setTimeout(r, 100));

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
    window.dispatchEvent(new CustomEvent('evm:request-disconnect'));
    await new Promise((r) => setTimeout(r, 100));
  }, []);

  // -------------------- ✅ Solana (events) --------------------
  const solanaConnect = useCallback(async (): Promise<WalletConnectionResult> => {
    window.dispatchEvent(new CustomEvent('solana:request-connect'));
    await new Promise((r) => setTimeout(r, 150)); // adapters can be slightly slower

    const state = useWalletStore.getState().solana;
    if (state?.isConnected && state.address) {
      return {
        success: true,
        address: state.address,
        networkInfo: {
          chainId: state.cluster || 'solana',
          name: state.cluster || 'solana',
          isTestnet: state.cluster !== 'mainnet-beta',
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
        message: 'Solana connection failed',
        timestamp: new Date(),
      },
    };
  }, []);

  const solanaDisconnect = useCallback(async (): Promise<void> => {
    window.dispatchEvent(new CustomEvent('solana:request-disconnect'));
    await new Promise((r) => setTimeout(r, 150));
  }, []);

  // -------------------- Return shape per chain --------------------
  return useMemo<WalletActions>(() => {
    if (effectiveChain === 'stellar') {
      return {
        chain: 'stellar',
        connect: stellarConnect,
        disconnect: stellarDisconnect,
        isConnected: () => !!(stellar?.isConnected && stellar?.address),
        getAddress: () => stellar?.address ?? null,
        getNetworkInfo: () => (stellar?.networkPassphrase
          ? {
              chainId: stellar.networkPassphrase,
              name: 'Stellar',
              isTestnet: true,
              rpcUrl: '',
              blockExplorer: '',
            }
          : undefined),
      };
    }

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
        switchChain: async (toChainId: number) => {
          window.dispatchEvent(
            new CustomEvent('evm:request-switch-chain', { detail: { chainId: toChainId } })
          );
          await new Promise((r) => setTimeout(r, 500));
          return useWalletStore.getState().evm?.chainId === toChainId;
        },
        getChainId: async () => useWalletStore.getState().evm?.chainId,
      };
    }

    if (effectiveChain === 'solana') {
      return {
        chain: 'solana',
        connect: solanaConnect,
        disconnect: solanaDisconnect, // ✅ now implemented
        isConnected: () => !!(solana?.isConnected && solana?.address),
        getAddress: () => solana?.address ?? null,
        getNetworkInfo: () =>
          solana?.cluster
            ? {
                chainId: solana.cluster,
                name: solana.cluster,
                isTestnet: solana.cluster !== 'mainnet-beta',
                rpcUrl: '',
                blockExplorer: '',
              }
            : undefined,
      };
    }

    // No chain selected
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

    // store-driven deps
    stellar?.isConnected,
    stellar?.address,
    stellar?.networkPassphrase,

    evm?.isConnected,
    evm?.address,
    evm?.chainId,

    solana?.isConnected,
    solana?.address,
    solana?.cluster,

    // stable callbacks
    stellarConnect,
    stellarDisconnect,
    evmConnect,
    evmDisconnect,
    solanaConnect,
    solanaDisconnect,
  ]);
}





