// src/hooks/useWalletActions.ts
import { useMemo } from 'react';
import { useQuizChainIntegration } from './useQuizChainIntegration';
import type { SupportedChain, WalletConnectionResult, NetworkInfo, TransactionResult } from '../chains/types';
import type { StellarWalletContextType } from '../chains/stellar/StellarWalletProvider';

import { useStellarWalletContext } from '../chains/stellar/StellarWalletProvider';
import { useEvmProvider } from '../chains/evm/EvmWalletProvider';

// helper: call a hook, but if its provider isn't mounted, return a stub instead of throwing
function useSafe<T>(hook: () => T, stub: T): T {
  try { return hook(); } catch { return stub; }
}

export interface WalletActions {
  chain: SupportedChain | null;
  connect: () => Promise<WalletConnectionResult>;
  disconnect: () => Promise<void>;
  isConnected: () => boolean;
  getAddress: () => string | null;
  getNetworkInfo: () => NetworkInfo | undefined;
}

type Options = { chainOverride?: SupportedChain | null };

/** FULLY-TYPED STELLAR STUB (matches StellarWalletContextType) */
const STELLAR_STUB: StellarWalletContextType = {
  // connection state
  wallet: {
    address: null,
    isConnected: false,
    isConnecting: false,
    isDisconnecting: false,
    chain: 'stellar',
    error: null,
    balance: '0',
    lastConnected: undefined,
    publicKey: undefined,
    networkPassphrase: undefined as any,
    walletType: undefined,
  },
  isInitialized: true,
  currentNetwork: 'testnet',
  balances: [],

  // connection methods
  connect: async () => ({ success: false, address: null }),
  disconnect: async () => {},
  reconnect: async () => {},

  // tx methods
  sendPayment: async (): Promise<TransactionResult> => ({ success: false }),
  getBalance: async () => '0',

  // network methods
  switchNetwork: async () => false,
  getSupportedAssets: () => [],

  // utils
  formatAddress: (a: string) => a,
  getExplorerUrl: () => '',
  isWalletInstalled: () => false,

  // flags
  canConnect: false,
  canDisconnect: false,
};

/** EVM STUB (shape of your EVM context; we only use a few fields) */
const EVM_STUB = {
  connect: async () => ({ success: false, address: null } as WalletConnectionResult),
  disconnect: async () => {},
  isConnected: false,
  address: null as string | null,

  // EvmChainProvider base methods referenced optionally
  getChainId: async () => 0,
} as any;

export function useWalletActions(opts?: Options): WalletActions {
  const { selectedChain } = useQuizChainIntegration({ chainOverride: opts?.chainOverride });
  const effectiveChain = (opts?.chainOverride ?? selectedChain) as SupportedChain | null;

  // Always call hooks (rules of hooks), but safely — return stubs if the provider isn't mounted.
  const stellar = useSafe(useStellarWalletContext, STELLAR_STUB);
  const evm     = useSafe(useEvmProvider, EVM_STUB);

  return useMemo<WalletActions>(() => {
    // --- STELLAR (unchanged from your original logic) ---
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

    // --- EVM via EvmWalletProvider ---
    const evmActions: WalletActions = {
      chain: 'evm',
      connect: () => evm.connect(),
      disconnect: () => evm.disconnect(),
      isConnected: () => !!evm.isConnected,
      getAddress: () => evm.address ?? null,
      getNetworkInfo: () => undefined, // optional: mirror chainId in a store if you need it here
    };

    // --- Solana placeholder ---
    const solanaActions: WalletActions = {
      chain: 'solana',
      connect: async () => ({
        success: false,
        address: null,
        error: { code: 'WALLET_NOT_FOUND' as any, message: 'Solana wallet not implemented', timestamp: new Date() }
      }),
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
          connect: async () => ({
            success: false, address: null,
            error: { code: 'CONNECTION_FAILED' as any, message: 'No chain selected', timestamp: new Date() }
          }),
          disconnect: async () => {},
          isConnected: () => false,
          getAddress: () => null,
          getNetworkInfo: () => undefined,
        };
    }
  }, [
    effectiveChain,
    // deps used in the memo:
    stellar.wallet.isConnected,
    stellar.wallet.address,
    stellar.wallet.networkPassphrase,
    stellar.currentNetwork,
    evm.isConnected,
    evm.address,
  ]);
}

