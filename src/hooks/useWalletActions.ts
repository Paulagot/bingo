// src/hooks/useWalletActions.ts

import { useCallback, useMemo, useEffect } from "react";
import { useWalletStore } from "../stores/walletStore";
import { useQuizSetupStore } from "../components/Quiz/hooks/useQuizSetupStore";
import { useMiniAppContext } from '../context/MiniAppContext';
import { useConnection } from 'wagmi';  // ← wagmi v3: useAccount renamed to useConnection

import {
  useAppKitProvider,
  useDisconnect,
} from "@reown/appkit/react";
import {
  useSafeAppKitAccount,
  useSafeAppKitNetwork,
  useSafeAppKit,
} from "./useSafeAppKit";

import { WalletErrorCode } from "../chains/types";
import { useStellarWallet } from "../chains/stellar/useStellarWallet";
import { useQuizConfig } from "../components/Quiz/hooks/useQuizConfig";
import { getMetaByKey, getKeyById, type EvmNetworkKey } from "../chains/evm/config/networks";

type ChainFamily = 'evm' | 'solana' | 'stellar' | null;

interface WalletActionsOptions {
  externalSetupConfig?: any;
}

const DEBUG = true;
const log = (...args: any[]) => DEBUG && console.log('[useWalletActions]', ...args);

/* -------------------------------------------------------------
   Determine CHAIN FAMILY (memoized)
-------------------------------------------------------------- */
function useResolvedChainFamily(externalSetupConfig?: any): ChainFamily {
  const { config } = useQuizConfig();
  const { setupConfig: storeSetupConfig } = useQuizSetupStore();
  const setupConfig = externalSetupConfig || storeSetupConfig;

  log('[useResolvedChainFamily] Inputs:', {
    setupConfig_web3Chain: setupConfig?.web3Chain,
    config_web3Chain: config?.web3Chain,
    config_evmNetwork: config?.evmNetwork,
    config_solanaCluster: config?.solanaCluster,
    config_stellarNetwork: config?.stellarNetwork,
    hasConfig: !!config,
    hasSetupConfig: !!setupConfig,
    isExternalConfig: !!externalSetupConfig,
  });

  return useMemo(() => {
    if (setupConfig?.web3Chain) {
      const chain = setupConfig.web3Chain;
      if (chain === 'evm' || chain === 'solana' || chain === 'stellar') {
        log('[useResolvedChainFamily] ✅ From setupConfig:', chain);
        return chain;
      }
    }
    if (config?.web3Chain) {
      const chain = config.web3Chain;
      if (chain === 'evm' || chain === 'solana' || chain === 'stellar') {
        log('[useResolvedChainFamily] ✅ From config:', chain);
        return chain;
      }
    }
    if (config?.evmNetwork) {
      log('[useResolvedChainFamily] ✅ Detected EVM from evmNetwork:', config.evmNetwork);
      return "evm";
    }
    if (config?.solanaCluster) {
      log('[useResolvedChainFamily] ✅ Detected Solana from solanaCluster');
      return "solana";
    }
    if (config?.stellarNetwork) {
      log('[useResolvedChainFamily] ✅ Detected Stellar from stellarNetwork');
      return "stellar";
    }
    log('[useResolvedChainFamily] ❌ No chain detected, returning null');
    return null;
  }, [
    setupConfig?.web3Chain,
    config?.web3Chain,
    config?.evmNetwork,
    config?.solanaCluster,
    config?.stellarNetwork,
  ]);
}

/* -------------------------------------------------------------
   MAIN HOOK
-------------------------------------------------------------- */
export function useWalletActions(options?: WalletActionsOptions) {
  const chainFamily = useResolvedChainFamily(options?.externalSetupConfig);
  const { setupConfig: storeSetupConfig } = useQuizSetupStore();
  const setupConfig = options?.externalSetupConfig || storeSetupConfig;

  // Mini app detection
  const { isMiniApp } = useMiniAppContext();

  // wagmi v3: useConnection replaces useAccount
  const { address: wagmiAddress, isConnected: wagmiIsConnected, status: wagmiStatus } = useConnection();

  log('🔍 Mini app state:', {
    isMiniApp,
    wagmiConnected: wagmiIsConnected,
    wagmiAddress,
    wagmiStatus,
  });

  // AppKit hooks
  const appKitAccount = useSafeAppKitAccount();
  const { caipNetwork, switchNetwork } = useSafeAppKitNetwork();
  const { open: openAppKitModal } = useSafeAppKit();

  const { walletProvider: evmWalletProvider } = useAppKitProvider("eip155");
  const { walletProvider: solanaWalletProvider } = useAppKitProvider("solana");
  const { disconnect: disconnectAppKit } = useDisconnect();

  // Stellar wallet
  const stellarWallet = useStellarWallet();
  const { updateStellarWallet } = useWalletStore();

  log('🎯 State:', {
    chainFamily,
    appKitConnected: appKitAccount.isConnected,
    appKitAddress: appKitAccount.address,
    appKitStatus: appKitAccount.status,
    currentNetwork: caipNetwork?.name,
    currentChainId: caipNetwork?.caipNetworkId,
    stellarConnected: stellarWallet.isConnected,
    stellarAddress: stellarWallet.address,
    hasExternalConfig: !!options?.externalSetupConfig,
  });

  /* -------------------------------------------------------------
     STELLAR CONNECT/DISCONNECT
  -------------------------------------------------------------- */
  const connectStellar = useCallback(async () => {
    try {
      log('🔗 [Stellar] Attempting connection...');
      await stellarWallet.connect();
      if (!stellarWallet.address) throw new Error("Stellar wallet not connected");
      log('✅ [Stellar] Connected:', stellarWallet.address);
      updateStellarWallet({
        address: stellarWallet.address,
        publicKey: stellarWallet.publicKey ?? undefined,
        isConnected: true,
        error: null,
      });
      return { success: true, address: stellarWallet.address };
    } catch (err: any) {
      log('❌ [Stellar] Connection failed:', err);
      updateStellarWallet({
        address: null,
        isConnected: false,
        error: {
          code: WalletErrorCode.CONNECTION_FAILED,
          message: String(err?.message ?? err),
          timestamp: new Date(),
          details: err,
        },
      });
      return { success: false, error: err };
    }
  }, [stellarWallet, updateStellarWallet]);

  const disconnectStellar = useCallback(async () => {
    try {
      log('🔌 [Stellar] Disconnecting...');
      await stellarWallet.disconnect();
      updateStellarWallet({ address: null, isConnected: false, error: null });
      log('✅ [Stellar] Disconnected');
      return { success: true };
    } catch (err) {
      log('❌ [Stellar] Disconnect failed:', err);
      return { success: false, error: err };
    }
  }, [stellarWallet, updateStellarWallet]);

  /* -------------------------------------------------------------
     HELPER: Get numeric chainId for EVM contracts
  -------------------------------------------------------------- */
  const getChainId = useCallback((): number | undefined => {
    if (chainFamily !== 'evm') return undefined;
    const caipNetworkId = caipNetwork?.caipNetworkId;
    if (!caipNetworkId) return undefined;
    if (caipNetworkId.includes(':')) {
      const parts = caipNetworkId.split(':');
      const chainIdStr = parts[1];
      if (chainIdStr) {
        const parsed = parseInt(chainIdStr, 10);
        return isNaN(parsed) ? undefined : parsed;
      }
    }
    return undefined;
  }, [chainFamily, caipNetwork?.caipNetworkId]);

  /* -------------------------------------------------------------
     HELPER: Get expected network info
  -------------------------------------------------------------- */
  const getExpectedNetwork = useCallback(() => {
    if (chainFamily !== 'evm') return null;
    const expectedNetworkKey = setupConfig?.evmNetwork as EvmNetworkKey | undefined;
    if (!expectedNetworkKey) return null;
    return getMetaByKey(expectedNetworkKey);
  }, [chainFamily, setupConfig?.evmNetwork]);

  /* -------------------------------------------------------------
     HELPER: Get expected chain family
  -------------------------------------------------------------- */
  const getExpectedChainFamily = useCallback((): ChainFamily => {
    return chainFamily;
  }, [chainFamily]);

  /* -------------------------------------------------------------
     HELPER: Get actual connected chain family
  -------------------------------------------------------------- */
  const getActualChainFamily = useCallback((): ChainFamily => {
    if (isMiniApp) {
      log('🎯 [getActualChainFamily] Mini app - wagmiIsConnected:', wagmiIsConnected);
      return wagmiIsConnected ? 'evm' : null;
    }
    const network = caipNetwork?.caipNetworkId;
    if (stellarWallet.isConnected) return 'stellar';
    if (network?.startsWith('eip155:')) return 'evm';
    if (network?.startsWith('solana:')) return 'solana';
    return null;
  }, [isMiniApp, wagmiIsConnected, caipNetwork?.caipNetworkId, stellarWallet.isConnected]);

  /* -------------------------------------------------------------
     HELPER: Check if on correct network
  -------------------------------------------------------------- */
  const isOnCorrectNetwork = useCallback((): boolean => {
    const expectedFamily = getExpectedChainFamily();
    const actualFamily = getActualChainFamily();

    log('🔍 [Network Check] Chain Family:', { expected: expectedFamily, actual: actualFamily });

    if (expectedFamily !== actualFamily) {
      log('❌ [Network Check] Chain family mismatch!');
      return false;
    }

    if (expectedFamily === 'evm') {
      const expectedMeta = getExpectedNetwork();
      if (!expectedMeta) {
        log('⚠️ [Network Check] No expected EVM network configured');
        return true;
      }
      const currentChainId = getChainId();
      const isCorrect = currentChainId === expectedMeta.id;
      log('🔍 [Network Check] EVM Network:', {
        current: currentChainId,
        expected: expectedMeta.id,
        expectedName: expectedMeta.name,
        isCorrect,
      });
      return isCorrect;
    }

    log('✅ [Network Check] Chain family matches:', expectedFamily);
    return true;
  }, [getExpectedChainFamily, getActualChainFamily, getChainId, getExpectedNetwork]);

  /* -------------------------------------------------------------
     AUTO-SWITCH EVM NETWORK EFFECT
  -------------------------------------------------------------- */
  useEffect(() => {
    const expectedFamily = getExpectedChainFamily();
    const actualFamily = getActualChainFamily();

    if (expectedFamily !== 'evm') return;
    if (actualFamily !== 'evm') {
      log('⚠️ [Auto-Switch] Cannot switch - wrong chain family');
      return;
    }

    // In mini app, chain switching is not needed — locked to Base Sepolia
    if (isMiniApp) return;

    if (!appKitAccount.isConnected) return;
    if (!switchNetwork) return;

    const expectedMeta = getExpectedNetwork();
    const currentChainId = getChainId();

    if (expectedMeta && currentChainId && currentChainId !== expectedMeta.id) {
      log('🔄 [EVM] Auto-switching to expected network...', {
        from: currentChainId,
        to: expectedMeta.id,
        toName: expectedMeta.name,
      });
      switchNetwork(expectedMeta)
        .then(() => log(`✅ [EVM] Successfully switched to ${expectedMeta.name}`))
        .catch((err) => log('❌ [EVM] Auto-switch failed:', err));
    }
  }, [
    isMiniApp,
    getExpectedChainFamily,
    getActualChainFamily,
    appKitAccount.isConnected,
    getExpectedNetwork,
    getChainId,
    switchNetwork,
  ]);

  /* -------------------------------------------------------------
     UNIFIED CONNECT
  -------------------------------------------------------------- */
  const connect = useCallback(async () => {
    log('🚀 [Unified Connect] Chain family:', chainFamily, 'isMiniApp:', isMiniApp);

    if (chainFamily === 'stellar') return connectStellar();

    if (chainFamily === 'evm' || chainFamily === 'solana') {
      // In mini app, wallet is auto-connected via SDK — nothing to do
      if (isMiniApp) {
        log('🎯 [Connect] Mini app - wallet already connected via SDK');
        return { success: true, address: wagmiAddress ?? null };
      }

      try {
        if (appKitAccount.address && appKitAccount.isConnected) {
          log(`✅ Already connected:`, appKitAccount.address);
          return { success: true, address: appKitAccount.address };
        }
        log(`🔗 Opening AppKit modal...`);
        await openAppKitModal();
        return { success: true, address: null, pending: true };
      } catch (err: any) {
        log(`❌ Connection failed:`, err);
        return { success: false, error: err };
      }
    }

    return {
      success: false,
      error: {
        code: WalletErrorCode.UNKNOWN_ERROR,
        message: "NO_CHAIN_SELECTED",
        timestamp: new Date(),
      },
    };
  }, [chainFamily, isMiniApp, wagmiAddress, connectStellar, openAppKitModal, appKitAccount]);

  /* -------------------------------------------------------------
     UNIFIED DISCONNECT
  -------------------------------------------------------------- */
  const disconnect = useCallback(async () => {
    log('🔌 [Unified Disconnect] Chain family:', chainFamily);

    if (chainFamily === 'stellar') return disconnectStellar();

    if (chainFamily === 'evm' || chainFamily === 'solana') {
      try {
        await disconnectAppKit();
        log(`✅ Disconnected`);
        return { success: true };
      } catch (err) {
        log(`❌ Disconnect failed:`, err);
        return { success: false, error: err };
      }
    }

    return {
      success: false,
      error: {
        code: WalletErrorCode.UNKNOWN_ERROR,
        message: "NO_CHAIN_SELECTED",
        timestamp: new Date(),
      },
    };
  }, [chainFamily, disconnectStellar, disconnectAppKit]);

  /* -------------------------------------------------------------
     HELPER: Get current address
  -------------------------------------------------------------- */
  const getAddress = useCallback((): string | null => {
    if (isMiniApp) return wagmiAddress ?? null;
    switch (chainFamily) {
      case 'evm':
      case 'solana':
        return appKitAccount.address || null;
      case 'stellar':
        return stellarWallet.address || null;
      default:
        return null;
    }
  }, [isMiniApp, wagmiAddress, chainFamily, appKitAccount.address, stellarWallet.address]);

  /* -------------------------------------------------------------
     HELPER: Check if connected
  -------------------------------------------------------------- */
  const isConnected = useCallback((): boolean => {
    if (isMiniApp) return wagmiIsConnected;

    const network = caipNetwork?.caipNetworkId;
    switch (chainFamily) {
      case 'evm':
        return appKitAccount.isConnected && !!evmWalletProvider && !!network?.startsWith('eip155:');
      case 'solana':
        return appKitAccount.isConnected && !!solanaWalletProvider && !!network?.startsWith('solana:');
      case 'stellar':
        return stellarWallet.isConnected ?? false;
      default:
        return false;
    }
  }, [
    isMiniApp, wagmiIsConnected,
    chainFamily, appKitAccount.isConnected,
    evmWalletProvider, solanaWalletProvider,
    caipNetwork?.caipNetworkId, stellarWallet.isConnected,
  ]);

  /* -------------------------------------------------------------
     HELPER: Get network info
  -------------------------------------------------------------- */
  const getNetworkInfo = useCallback(() => {
    const expectedFamily = getExpectedChainFamily();
    const actualFamily = getActualChainFamily();

    let currentNetwork = '';
    let expectedNetwork = '';

    if (actualFamily === 'solana') {
      currentNetwork = caipNetwork?.name || 'Solana Devnet';
    } else if (actualFamily === 'evm') {
      currentNetwork = isMiniApp ? 'Base Sepolia' : (caipNetwork?.name || 'EVM');
    } else if (actualFamily === 'stellar') {
      currentNetwork = 'Stellar';
    }

    if (expectedFamily === 'evm') {
      const expectedMeta = getExpectedNetwork();
      expectedNetwork = expectedMeta?.name || 'EVM';
    } else if (expectedFamily === 'solana') {
      const cluster = setupConfig?.solanaCluster || 'devnet';
      expectedNetwork = cluster === 'devnet' ? 'Solana Devnet' : 'Solana';
    } else if (expectedFamily === 'stellar') {
      expectedNetwork = 'Stellar';
    }

    const isCorrect = isOnCorrectNetwork();

    return {
      currentChainId: getChainId(),
      currentNetwork,
      expectedChainId: expectedFamily === 'evm' ? getExpectedNetwork()?.id : undefined,
      expectedNetwork,
      isCorrect,
    };
  }, [
    isMiniApp,
    getExpectedChainFamily,
    getActualChainFamily,
    getChainId,
    getExpectedNetwork,
    isOnCorrectNetwork,
    caipNetwork?.name,
    setupConfig?.solanaCluster,
  ]);

  /* -------------------------------------------------------------
     EXPOSE API
  -------------------------------------------------------------- */
  return {
    chainFamily,

    account: {
      address: isMiniApp ? (wagmiAddress ?? null) : (appKitAccount.address ?? null),
      isConnected: isMiniApp ? wagmiIsConnected : appKitAccount.isConnected,
      status: isMiniApp ? wagmiStatus : appKitAccount.status,
    },

    stellarAccount: {
      address: stellarWallet.address,
      isConnected: stellarWallet.isConnected,
      publicKey: stellarWallet.publicKey,
    },

    evmWalletProvider,
    solanaWalletProvider,
    caipNetwork,

    connect,
    disconnect,
    switchNetwork,

    getAddress,
    isConnected,
    getChainId,
    isOnCorrectNetwork,
    getNetworkInfo,
    getExpectedNetwork,
    getExpectedChainFamily,
    getActualChainFamily,
  };
}