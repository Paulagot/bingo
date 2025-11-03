// src/hooks/useWalletActions.ts
import { useMemo } from 'react';
import { useQuizChainIntegration } from './useQuizChainIntegration';
import { useStellarWalletContext } from '../chains/stellar/StellarWalletProvider';
import { useSolanaWalletContext } from '../chains/solana/SolanaWalletProvider';
import { useEvmProvider } from '../chains/evm/EvmWalletProvider';
import type { SupportedChain, WalletConnectionResult, NetworkInfo } from '../chains/types';

export interface WalletActions {
  chain: SupportedChain | null;
  connect: () => Promise<WalletConnectionResult>;
  disconnect: () => Promise<void>;
  isConnected: () => boolean;
  getAddress: () => string | null;
  getNetworkInfo: () => NetworkInfo | undefined;
}

type Options = { chainOverride?: SupportedChain | null };

export function useWalletActions(opts?: Options): WalletActions {
  const { selectedChain } = useQuizChainIntegration({ chainOverride: opts?.chainOverride });
  const effectiveChain = (opts?.chainOverride ?? selectedChain) as SupportedChain | null;

  // Try to get contexts - they'll throw if provider not mounted, so we catch and set to null
  let stellar: ReturnType<typeof useStellarWalletContext> | null = null;
  let solana: ReturnType<typeof useSolanaWalletContext> | null = null;
  let evm: ReturnType<typeof useEvmProvider> | null = null;

  // Note: This violates rules of hooks if called conditionally, so we use the pattern
  // where we always call the hook but handle the error if provider isn't mounted
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    stellar = useStellarWalletContext();
  } catch (e) {
    // Stellar provider not mounted, that's ok
  }

  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    solana = useSolanaWalletContext();
  } catch (e) {
    // Solana provider not mounted, that's ok
  }

  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    evm = useEvmProvider();
  } catch (e) {
    // EVM provider not mounted, that's ok
  }

  return useMemo<WalletActions>(() => {
    const stellarActions: WalletActions = {
      chain: 'stellar',
      connect: () => stellar.connect(),
      disconnect: () => stellar.disconnect(),
      isConnected: () => !!stellar.wallet.isConnected && !!stellar.wallet.address,
      getAddress: () => stellar.wallet.address ?? null,
      getNetworkInfo: (): NetworkInfo | undefined => {
        if (!stellar.wallet.networkPassphrase) return undefined;
        return {
          chainId: stellar.wallet.networkPassphrase,
          name: stellar.currentNetwork,
          isTestnet: stellar.currentNetwork === 'testnet',
          rpcUrl: '',
          blockExplorer: '',
        };
      },
    };

    const evmActions: WalletActions = {
      chain: 'evm',
      connect: () => evm ? evm.connect() : Promise.resolve({ success: false, address: null, error: { code: 'WALLET_NOT_FOUND' as any, message: 'EVM provider not mounted', timestamp: new Date() } }),
      disconnect: () => evm ? evm.disconnect() : Promise.resolve(),
      isConnected: () => evm ? evm.isConnected : false,
      getAddress: () => evm ? evm.address : null,
      getNetworkInfo: () => evm?.getNetworkInfo?.() ?? undefined,
    };

    const solanaActions: WalletActions = {
      chain: 'solana',
      connect: () => solana ? solana.connect() : Promise.resolve({ success: false, address: null, error: { code: 'WALLET_NOT_FOUND' as any, message: 'Solana provider not mounted', timestamp: new Date() } }),
      disconnect: () => solana ? solana.disconnect() : Promise.resolve(),
      isConnected: () => solana ? !!solana.wallet.isConnected && !!solana.wallet.address : false,
      getAddress: () => solana ? solana.wallet.address ?? null : null,
      getNetworkInfo: (): NetworkInfo | undefined => {
        if (!solana || !solana.wallet.cluster) return undefined;
        return {
          chainId: solana.wallet.cluster,
          name: solana.currentCluster,
          isTestnet: solana.currentCluster === 'devnet' || solana.currentCluster === 'testnet',
          rpcUrl: '',
          blockExplorer: '',
        };
      },
    };

    switch (effectiveChain) {
      case 'stellar': return stellarActions;
      case 'evm':     return evmActions;
      case 'solana':  return solanaActions;
      default:
        return {
          chain: null,
          connect: async () => ({ success: false, address: null, error: { code: 'CONNECTION_FAILED' as any, message: 'No chain selected', timestamp: new Date() } }),
          disconnect: async () => {},
          isConnected: () => false,
          getAddress: () => null,
          getNetworkInfo: () => undefined,
        };
    }
  // Include both stellar and solana dependencies
  }, [
    effectiveChain,
    stellar?.wallet.isConnected,
    stellar?.wallet.address,
    stellar?.wallet.networkPassphrase,
    stellar?.currentNetwork,
    solana?.wallet.isConnected,
    solana?.wallet.address,
    solana?.wallet.cluster,
    solana?.currentCluster,
  ]);
}




