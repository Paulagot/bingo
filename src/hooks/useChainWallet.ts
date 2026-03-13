/**
 * useChainWallet — unified wallet hook for all chains.
 *
 * REPLACES: useWalletActions, useQuizChainIntegration, useSafeAppKit (inlined)
 *
 * Key rules:
 * - Config flows IN as a parameter. This hook never reads from stores or localStorage.
 * - switchToCorrectNetwork() is a function you call explicitly (e.g. in a useEffect
 *   on mount). It does NOT run automatically inside this hook.
 * - No global flags. No auto-switch useEffect.
 * - Mini app detection via useMiniAppContext().isMiniApp — that context stays.
 */

import { useCallback, useMemo } from 'react';
import { useConnection } from 'wagmi';
import {
  useAppKitProvider,
  useDisconnect,
} from '@reown/appkit/react';
import { useMiniAppContext } from '../context/MiniAppContext';
import { useStellarWallet } from '../chains/stellar/useStellarWallet';
import { getMetaByKey, type EvmNetworkKey } from '../chains/evm/config/networks';
import { WalletErrorCode } from '../chains/types';
import type { ChainConfig } from '../types/chainConfig';

// ---------------------------------------------------------------------------
// Safe AppKit wrappers (inlined from useSafeAppKit.ts)
// AppKit hooks throw during SSR / before the provider is ready.
// Wrapping them in try/catch makes the hook safe to call unconditionally.
// ---------------------------------------------------------------------------
import {
  useAppKitAccount,
  useAppKitNetwork,
  useAppKit,
} from '@reown/appkit/react';

function useSafeAppKitAccount() {
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    return useAppKitAccount();
  } catch {
    return { address: undefined, isConnected: false, status: 'disconnected' as const };
  }
}

function useSafeAppKitNetwork() {
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    return useAppKitNetwork();
  } catch {
    return { caipNetwork: undefined, switchNetwork: undefined };
  }
}

function useSafeAppKit() {
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    return useAppKit();
  } catch {
    return { open: async () => {} };
  }
}

// ---------------------------------------------------------------------------
// EIP-1193 direct network switch
// Sends wallet_switchEthereumChain to the actual wallet (MetaMask etc.)
// rather than only updating AppKit's internal state.
// ---------------------------------------------------------------------------
async function switchViaEIP1193(
  provider: any,
  chainId: number,
  chainName: string,
  rpcUrl: string,
  nativeCurrency: { name: string; symbol: string; decimals: number },
  blockExplorer: string
): Promise<void> {
  const chainIdHex = `0x${chainId.toString(16)}`;
  try {
    await provider.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: chainIdHex }],
    });
  } catch (switchErr: any) {
    // 4902 = chain not added to wallet yet
    if (switchErr?.code === 4902 || switchErr?.code === -32603) {
      await provider.request({
        method: 'wallet_addEthereumChain',
        params: [{
          chainId: chainIdHex,
          chainName,
          rpcUrls: [rpcUrl],
          nativeCurrency,
          blockExplorerUrls: [blockExplorer],
        }],
      });
    } else {
      throw switchErr;
    }
  }
}

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------
type ChainFamily = 'evm' | 'solana' | 'stellar' | null;

export interface NetworkInfo {
  currentNetwork: string;
  expectedNetwork: string;
  currentChainId?: number;
  expectedChainId?: number;
}

export interface ChainWalletState {
  // Which chain this hook is configured for (derived from chainConfig, never a store)
  chainFamily: ChainFamily;

  // Connection state
  address: string | null;
  isConnected: boolean;
  isConnecting: boolean;

  // Network state
  isOnCorrectNetwork: boolean;
  networkInfo: NetworkInfo;

  // Actions
  connect(): Promise<{ success: boolean; error?: any }>;
  disconnect(): Promise<void>;
  /**
   * Call this explicitly when you need the wallet on the correct network.
   * Typically called once in a useEffect when isConnected becomes true.
   * It is NOT called automatically inside this hook.
   *
   * Example:
   *   useEffect(() => {
   *     if (!isConnected) return;
   *     switchToCorrectNetwork();
   *   }, [isConnected]);
   */
  switchToCorrectNetwork(): Promise<void>;
  openModal(): void;
}

// ---------------------------------------------------------------------------
// Main hook
// ---------------------------------------------------------------------------
export function useChainWallet(chainConfig: ChainConfig): ChainWalletState {

  // Derive chain family from config — no store reads
  const chainFamily = useMemo<ChainFamily>(() => {
    const chain = chainConfig.web3Chain;
    if (chain === 'evm' || chain === 'solana' || chain === 'stellar') return chain;
    // Infer from which network field is populated
    if (chainConfig.evmNetwork) return 'evm';
    if (chainConfig.solanaCluster) return 'solana';
    if (chainConfig.stellarNetwork) return 'stellar';
    return null;
  }, [chainConfig.web3Chain, chainConfig.evmNetwork, chainConfig.solanaCluster, chainConfig.stellarNetwork]);

  // Mini app detection (context is fine — it's not chain config)
  const { isMiniApp } = useMiniAppContext();

  // wagmi — used by mini app path (SDK-backed wallet)
  const { address: wagmiAddress, isConnected: wagmiIsConnected, status: wagmiStatus } = useConnection();

  // AppKit — used by normal browser path for EVM + Solana
  const appKitAccount = useSafeAppKitAccount();
  const { caipNetwork, switchNetwork } = useSafeAppKitNetwork();
  const { open: openAppKitModal } = useSafeAppKit();
  const { walletProvider: evmWalletProvider } = useAppKitProvider('eip155');
  const { walletProvider: solanaWalletProvider } = useAppKitProvider('solana');
  const { disconnect: disconnectAppKit } = useDisconnect();

  // Stellar — has its own separate SDK
  const stellarWallet = useStellarWallet();

  // ---------------------------------------------------------------------------
  // Derived: address + connection state
  // ---------------------------------------------------------------------------
  const address = useMemo<string | null>(() => {
    if (isMiniApp) return wagmiAddress ?? null;
    switch (chainFamily) {
      case 'evm':
      case 'solana':
        return appKitAccount.address ?? null;
      case 'stellar':
        return stellarWallet.address ?? null;
      default:
        return null;
    }
  }, [isMiniApp, wagmiAddress, chainFamily, appKitAccount.address, stellarWallet.address]);

  const isConnected = useMemo<boolean>(() => {
    if (isMiniApp) return wagmiIsConnected;
    switch (chainFamily) {
      case 'evm':
        return appKitAccount.isConnected && !!evmWalletProvider;
      case 'solana':
        return appKitAccount.isConnected && !!solanaWalletProvider;
      case 'stellar':
        return stellarWallet.isConnected ?? false;
      default:
        return false;
    }
  }, [isMiniApp, wagmiIsConnected, chainFamily, appKitAccount.isConnected, evmWalletProvider, solanaWalletProvider, stellarWallet.isConnected]);

  const isConnecting = useMemo<boolean>(() => {
    if (isMiniApp) return wagmiStatus === 'connecting';
    return appKitAccount.status === 'connecting';
  }, [isMiniApp, wagmiStatus, appKitAccount.status]);

  // ---------------------------------------------------------------------------
  // Derived: expected EVM network metadata
  // ---------------------------------------------------------------------------
  const expectedEvmMeta = useMemo(() => {
    if (chainFamily !== 'evm') return null;
    if (!chainConfig.evmNetwork) return null;
    return getMetaByKey(chainConfig.evmNetwork as EvmNetworkKey) ?? null;
  }, [chainFamily, chainConfig.evmNetwork]);

  // ---------------------------------------------------------------------------
  // Derived: current chain ID (EVM only)
  // ---------------------------------------------------------------------------
  const currentChainId = useMemo<number | undefined>(() => {
    if (isMiniApp) return 8453; // Base mainnet — mini app is always Base
    if (chainFamily !== 'evm') return undefined;
    const caipId = caipNetwork?.caipNetworkId;
    if (!caipId?.startsWith('eip155:')) return undefined;
    const parsed = parseInt(caipId.split(':')[1] ?? '', 10);
    return isNaN(parsed) ? undefined : parsed;
  }, [isMiniApp, chainFamily, caipNetwork?.caipNetworkId]);

  // ---------------------------------------------------------------------------
  // Derived: actual chain family from the connected wallet
  // ---------------------------------------------------------------------------
  const actualChainFamily = useMemo<ChainFamily>(() => {
    if (isMiniApp) return wagmiIsConnected ? 'evm' : null;
    if (stellarWallet.isConnected) return 'stellar';
    const caipId = caipNetwork?.caipNetworkId;
    // If AppKit is connected but caipNetwork hasn't settled yet (hydration gap),
    // return expected family to avoid a false mismatch flash
    if (appKitAccount.isConnected && !caipId) return chainFamily;
    if (caipId?.startsWith('eip155:')) return 'evm';
    if (caipId?.startsWith('solana:')) return 'solana';
    return null;
  }, [isMiniApp, wagmiIsConnected, stellarWallet.isConnected, caipNetwork?.caipNetworkId, appKitAccount.isConnected, chainFamily]);

  // ---------------------------------------------------------------------------
  // Derived: isOnCorrectNetwork
  // ---------------------------------------------------------------------------
  const isOnCorrectNetwork = useMemo<boolean>(() => {
    if (isMiniApp) return wagmiIsConnected; // mini app is always on Base

    // Wrong chain family = definitely wrong
    if (actualChainFamily !== chainFamily) return false;

    // EVM: check specific chain ID
    if (chainFamily === 'evm') {
      if (!expectedEvmMeta) return true; // no expected network configured → assume ok
      return currentChainId === expectedEvmMeta.id;
    }

    // Solana / Stellar: chain family match is enough (cluster/network checked at tx time)
    return true;
  }, [isMiniApp, wagmiIsConnected, actualChainFamily, chainFamily, expectedEvmMeta, currentChainId]);

  // ---------------------------------------------------------------------------
  // Derived: networkInfo (for UI display)
  // ---------------------------------------------------------------------------
  const networkInfo = useMemo<NetworkInfo>(() => {
    if (isMiniApp) {
      return {
        currentNetwork: 'Base',
        expectedNetwork: 'Base',
        currentChainId: 8453,
        expectedChainId: 8453,
      };
    }

    let currentNetwork = '';
    if (actualChainFamily === 'evm') currentNetwork = caipNetwork?.name ?? 'EVM';
    else if (actualChainFamily === 'solana') currentNetwork = caipNetwork?.name ?? 'Solana';
    else if (actualChainFamily === 'stellar') currentNetwork = 'Stellar';

    let expectedNetwork = '';
    if (chainFamily === 'evm') expectedNetwork = expectedEvmMeta?.name ?? 'EVM';
    else if (chainFamily === 'solana') {
      const cluster = chainConfig.solanaCluster ?? 'devnet';
      expectedNetwork = cluster === 'mainnet-beta' ? 'Solana' : `Solana ${cluster}`;
    } else if (chainFamily === 'stellar') {
      expectedNetwork = chainConfig.stellarNetwork === 'mainnet' ? 'Stellar' : 'Stellar Testnet';
    }

    return {
      currentNetwork,
      expectedNetwork,
      currentChainId,
      expectedChainId: expectedEvmMeta?.id as number | undefined,
    };
  }, [isMiniApp, actualChainFamily, chainFamily, caipNetwork?.name, expectedEvmMeta, currentChainId, chainConfig.solanaCluster, chainConfig.stellarNetwork]);

  // ---------------------------------------------------------------------------
  // Actions
  // ---------------------------------------------------------------------------
  const connect = useCallback(async (): Promise<{ success: boolean; error?: any }> => {
    if (chainFamily === 'stellar') {
      try {
        await stellarWallet.connect();
        return { success: true };
      } catch (err: any) {
        return { success: false, error: err };
      }
    }
if (chainFamily === 'evm' || chainFamily === 'solana') {
  if (isMiniApp) {
    // Mini app wallet is already connected via SDK — nothing to do
    return { success: true };
  }
  try {
    // For Solana: always open modal — AppKit needs the correct namespace.
    // For EVM: skip modal only if already connected AND on correct network.
    const alreadyGood =
      chainFamily === 'evm' &&
      appKitAccount.isConnected &&
      !!appKitAccount.address &&
      isOnCorrectNetwork;

    if (!alreadyGood) {
      await openAppKitModal();
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err };
  }
}

    return {
      success: false,
      error: { code: WalletErrorCode.UNKNOWN_ERROR, message: 'NO_CHAIN_SELECTED' },
    };
  }, [chainFamily, isMiniApp, appKitAccount.isConnected, appKitAccount.address, openAppKitModal, stellarWallet]);

  const disconnect = useCallback(async (): Promise<void> => {
    if (chainFamily === 'stellar') {
      try { await stellarWallet.disconnect(); } catch {}
      return;
    }
    if (chainFamily === 'evm' || chainFamily === 'solana') {
      try { await disconnectAppKit(); } catch {}
    }
  }, [chainFamily, stellarWallet, disconnectAppKit]);

  /**
   * switchToCorrectNetwork — call this explicitly, never runs automatically.
   *
   * For EVM: uses EIP-1193 direct provider switch (reaches the actual wallet
   * e.g. MetaMask), with AppKit switchNetwork as fallback.
   * For Solana/Stellar: no-op (cluster/network is per-transaction).
   */
  const switchToCorrectNetwork = useCallback(async (): Promise<void> => {
    if (chainFamily !== 'evm') return;
    if (isMiniApp) return; // mini app is always on Base — no switching needed
    if (!expectedEvmMeta) return;
    if (currentChainId === expectedEvmMeta.id) return; // already correct

    const rpcUrl = (expectedEvmMeta as any).rpcUrls?.default?.http?.[0] ?? '';
    const blockExplorer = (expectedEvmMeta as any).blockExplorers?.default?.url ?? '';
    const nativeCurrency = (expectedEvmMeta as any).nativeCurrency ?? { name: 'Ether', symbol: 'ETH', decimals: 18 };

    try {
      if (evmWalletProvider && (evmWalletProvider as any)?.request) {
        await switchViaEIP1193(
          evmWalletProvider,
          expectedEvmMeta.id as number,
          expectedEvmMeta.name,
          rpcUrl,
          nativeCurrency,
          blockExplorer,
        );
      } else if (switchNetwork) {
        await switchNetwork(expectedEvmMeta as any);
      }
    } catch (err) {
      console.warn('[useChainWallet] switchToCorrectNetwork failed:', err);
    }
  }, [chainFamily, isMiniApp, expectedEvmMeta, currentChainId, evmWalletProvider, switchNetwork]);

  const openModal = useCallback((): void => {
    try { openAppKitModal(); } catch {}
  }, [openAppKitModal]);

  // ---------------------------------------------------------------------------
  // Return
  // ---------------------------------------------------------------------------
  return {
    chainFamily,
    address,
    isConnected,
    isConnecting,
    isOnCorrectNetwork,
    networkInfo,
    connect,
    disconnect,
    switchToCorrectNetwork,
    openModal,
  };
}