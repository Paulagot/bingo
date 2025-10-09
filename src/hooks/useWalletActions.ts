// src/hooks/useWalletActions.ts
import { useMemo } from 'react';
import { useQuizChainIntegration } from './useQuizChainIntegration';
import { useStellarWalletContext } from '../chains/stellar/StellarWalletProvider';
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

  // Always mount Stellar context; we’ll read from it when chain === 'stellar'
  const stellar = useStellarWalletContext();

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
      connect: async () => ({ success: false, address: null, error: { code: 'WALLET_NOT_FOUND' as any, message: 'EVM wallet not implemented', timestamp: new Date() } }),
      disconnect: async () => {},
      isConnected: () => false,
      getAddress: () => null,
      getNetworkInfo: () => undefined,
    };

    const solanaActions: WalletActions = {
      chain: 'solana',
      connect: async () => ({ success: false, address: null, error: { code: 'WALLET_NOT_FOUND' as any, message: 'Solana wallet not implemented', timestamp: new Date() } }),
      disconnect: async () => {},
      isConnected: () => false,
      getAddress: () => null,
      getNetworkInfo: () => undefined,
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
  // keep deps lean; stellar values are fine here
  }, [effectiveChain, stellar.wallet.isConnected, stellar.wallet.address, stellar.wallet.networkPassphrase, stellar.currentNetwork]);
}




