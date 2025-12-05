// src/hooks/useWalletActions.ts

import { useCallback, useMemo, useEffect } from "react";
import { useWalletStore } from "../stores/walletStore";
import { useQuizSetupStore } from "../components/Quiz/hooks/useQuizSetupStore";

// Reown AppKit - direct hooks
import {
  useAppKitAccount,
  useAppKitProvider,
  useDisconnect,
  useAppKitNetwork, // ✅ This includes switchNetwork
  useAppKit,
} from "@reown/appkit/react";

import { WalletErrorCode } from "../chains/types";
import { useStellarWallet } from "../chains/stellar/useStellarWallet";
import { useQuizConfig } from "../components/Quiz/hooks/useQuizConfig";
import { getMetaByKey, getKeyById, type EvmNetworkKey } from "../chains/evm/config/networks";

type ChainFamily = 'evm' | 'solana' | 'stellar' | null;

/* -------------------------------------------------------------
   Determine CHAIN FAMILY (memoized)
-------------------------------------------------------------- */
function useResolvedChainFamily(): ChainFamily {
  const { config } = useQuizConfig();
  const { setupConfig } = useQuizSetupStore();
  
  // ✅ ADD THIS DEBUG LOG
  console.log('[useResolvedChainFamily] Inputs:', {
    setupConfig_web3Chain: setupConfig?.web3Chain,
    config_web3Chain: config?.web3Chain,
    config_evmNetwork: config?.evmNetwork,
    config_solanaCluster: config?.solanaCluster,
    config_stellarNetwork: config?.stellarNetwork,
    hasConfig: !!config,
    hasSetupConfig: !!setupConfig,
  });
  
  return useMemo(() => {
    // 1. Check setupConfig.web3Chain (during wizard)
    if (setupConfig?.web3Chain) {
      const chain = setupConfig.web3Chain;
      if (chain === 'evm' || chain === 'solana' || chain === 'stellar') {
        console.log('[useResolvedChainFamily] ✅ From setupConfig:', chain);
        return chain;
      }
    }

    // 2. Check config.web3Chain (after deployment)
    if (config?.web3Chain) {
      const chain = config.web3Chain;
      if (chain === 'evm' || chain === 'solana' || chain === 'stellar') {
        console.log('[useResolvedChainFamily] ✅ From config:', chain);
        return chain;
      }
    }

    // 3. Fallback to detecting from network config
    if (config?.evmNetwork) {
      console.log('[useResolvedChainFamily] ✅ Detected EVM from evmNetwork:', config.evmNetwork);
      return "evm";
    }
    if (config?.solanaCluster) {
      console.log('[useResolvedChainFamily] ✅ Detected Solana from solanaCluster');
      return "solana";
    }
    if (config?.stellarNetwork) {
      console.log('[useResolvedChainFamily] ✅ Detected Stellar from stellarNetwork');
      return "stellar";
    }

    console.log('[useResolvedChainFamily] ❌ No chain detected, returning null');
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
export function useWalletActions() {
  const chainFamily = useResolvedChainFamily();

  // AppKit hooks
  const appKitAccount = useAppKitAccount();
  const { walletProvider: evmWalletProvider } = useAppKitProvider("eip155");
  const { walletProvider: solanaWalletProvider } = useAppKitProvider("solana");
  const { disconnect: disconnectAppKit } = useDisconnect();
  const { open: openAppKitModal } = useAppKit();
  
  // ✅ Get caipNetwork AND switchNetwork from the same hook
  const { caipNetwork, switchNetwork } = useAppKitNetwork();

  // Stellar wallet
  const stellarWallet = useStellarWallet();
  const { updateStellarWallet } = useWalletStore();
  
  // Quiz setup config
  const { setupConfig } = useQuizSetupStore();

  console.log("🎯 [useWalletActions] State:", {
    chainFamily,
    appKitConnected: appKitAccount.isConnected,
    appKitAddress: appKitAccount.address,
    appKitStatus: appKitAccount.status,
    currentNetwork: caipNetwork?.name,
    currentChainId: caipNetwork?.caipNetworkId,
    stellarConnected: stellarWallet.isConnected,
    stellarAddress: stellarWallet.address,
  });

  /* -------------------------------------------------------------
     STELLAR CONNECT/DISCONNECT (unchanged)
  -------------------------------------------------------------- */
  const connectStellar = useCallback(async () => {
    try {
      console.log("🔗 [Stellar] Attempting connection...");
      await stellarWallet.connect();

      if (!stellarWallet.address) {
        throw new Error("Stellar wallet not connected");
      }

      console.log("✅ [Stellar] Connected:", stellarWallet.address);

      updateStellarWallet({
        address: stellarWallet.address,
        publicKey: stellarWallet.publicKey ?? undefined,
        isConnected: true,
        error: null,
      });

      return { success: true, address: stellarWallet.address };
    } catch (err: any) {
      console.error("❌ [Stellar] Connection failed:", err);
      
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
      console.log("🔌 [Stellar] Disconnecting...");
      await stellarWallet.disconnect();
      
      updateStellarWallet({
        address: null,
        isConnected: false,
        error: null,
      });
      
      console.log("✅ [Stellar] Disconnected");
      return { success: true };
    } catch (err) {
      console.error("❌ [Stellar] Disconnect failed:", err);
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
     HELPER: Check if on correct network
  -------------------------------------------------------------- */
  const isOnCorrectNetwork = useCallback((): boolean => {
    if (chainFamily !== 'evm') return true;
    
    const expectedMeta = getExpectedNetwork();
    if (!expectedMeta) return true;
    
    const currentChainId = getChainId();
    const isCorrect = currentChainId === expectedMeta.id;
    
    console.log('🔍 [Network Check]:', {
      current: currentChainId,
      expected: expectedMeta.id,
      expectedName: expectedMeta.name,
      isCorrect,
    });
    
    return isCorrect;
  }, [chainFamily, getChainId, getExpectedNetwork]);

  /* -------------------------------------------------------------
     ✅ AUTO-SWITCH EFFECT: Automatically switch when on wrong network
  -------------------------------------------------------------- */
  useEffect(() => {
    if (chainFamily !== 'evm') return;
    if (!appKitAccount.isConnected) return;
    if (!switchNetwork) return; // Guard: ensure switchNetwork exists
    
    const expectedMeta = getExpectedNetwork();
    const currentChainId = getChainId();
    
    if (expectedMeta && currentChainId && currentChainId !== expectedMeta.id) {
      console.log('🔄 [EVM] Auto-switching to expected network...', {
        from: currentChainId,
        to: expectedMeta.id,
        toName: expectedMeta.name,
      });
      
      // ✅ Use switchNetwork from useAppKitNetwork
      switchNetwork(expectedMeta)
        .then(() => {
          console.log(`✅ [EVM] Successfully switched to ${expectedMeta.name}`);
        })
        .catch((err) => {
          console.error('❌ [EVM] Auto-switch failed:', err);
        });
    }
  }, [
    chainFamily,
    appKitAccount.isConnected,
    getExpectedNetwork,
    getChainId,
    switchNetwork, // ✅ From useAppKitNetwork
  ]);

  /* -------------------------------------------------------------
     UNIFIED CONNECT
  -------------------------------------------------------------- */
  const connect = useCallback(async () => {
    console.log("🚀 [Unified Connect] Chain family:", chainFamily);
    
    if (chainFamily === 'stellar') {
      return connectStellar();
    }
    
    if (chainFamily === 'evm' || chainFamily === 'solana') {
      try {
        console.log(`🔗 [${chainFamily.toUpperCase()}] Current state:`, {
          address: appKitAccount.address,
          isConnected: appKitAccount.isConnected,
          status: appKitAccount.status,
          network: caipNetwork?.name,
          networkId: caipNetwork?.caipNetworkId,
        });
        
        // Already connected - the auto-switch effect will handle network switching
        if (appKitAccount.address && appKitAccount.isConnected) {
          console.log(`✅ [${chainFamily.toUpperCase()}] Already connected:`, appKitAccount.address);
          return { success: true, address: appKitAccount.address };
        }
        
        // Not connected - open modal
        console.log(`🔗 [${chainFamily.toUpperCase()}] Opening AppKit modal...`);
        await openAppKitModal();
        
        console.log(`📱 [${chainFamily.toUpperCase()}] Modal opened, waiting for user action...`);
        
        return { 
          success: true, 
          address: null,
          pending: true,
        };
        
      } catch (err: any) {
        console.error(`❌ [${chainFamily?.toUpperCase()}] Connection failed:`, err);
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
  }, [
    chainFamily, 
    connectStellar, 
    openAppKitModal, 
    appKitAccount, 
    caipNetwork,
  ]);

  /* -------------------------------------------------------------
     UNIFIED DISCONNECT
  -------------------------------------------------------------- */
  const disconnect = useCallback(async () => {
    console.log("🔌 [Unified Disconnect] Chain family:", chainFamily);
    
    if (chainFamily === 'stellar') {
      return disconnectStellar();
    }
    
    if (chainFamily === 'evm' || chainFamily === 'solana') {
      try {
        console.log(`🔌 [${chainFamily.toUpperCase()}] Disconnecting via AppKit...`);
        await disconnectAppKit();
        console.log(`✅ [${chainFamily.toUpperCase()}] Disconnected`);
        return { success: true };
      } catch (err) {
        console.error(`❌ [${chainFamily?.toUpperCase()}] Disconnect failed:`, err);
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
    switch (chainFamily) {
      case 'evm':
      case 'solana':
        return appKitAccount.address || null;
      case 'stellar':
        return stellarWallet.address || null;
      default:
        return null;
    }
  }, [chainFamily, appKitAccount.address, stellarWallet.address]);

  /* -------------------------------------------------------------
     HELPER: Check if connected
  -------------------------------------------------------------- */
  const isConnected = useCallback((): boolean => {
    const network = caipNetwork?.caipNetworkId;

    switch (chainFamily) {
      case 'evm':
        return (
          appKitAccount.isConnected &&
          !!evmWalletProvider &&
          !!network?.startsWith('eip155:')
        );

      case 'solana':
        return (
          appKitAccount.isConnected &&
          !!solanaWalletProvider &&
          !!network?.startsWith('solana:')
        );

      case 'stellar':
        return stellarWallet.isConnected ?? false;

      default:
        return false;
    }
  }, [
    chainFamily,
    appKitAccount.isConnected,
    evmWalletProvider,
    solanaWalletProvider,
    caipNetwork?.caipNetworkId,
    stellarWallet.isConnected,
  ]);

  /* -------------------------------------------------------------
     HELPER: Get network info
  -------------------------------------------------------------- */
  const getNetworkInfo = useCallback(() => {
    const currentChainId = getChainId();
    const expectedMeta = getExpectedNetwork();
    const isCorrect = isOnCorrectNetwork();
    
    return {
      currentChainId,
      currentNetwork: caipNetwork?.name,
      expectedChainId: expectedMeta?.id,
      expectedNetwork: expectedMeta?.name,
      isCorrect,
    };
  }, [getChainId, getExpectedNetwork, isOnCorrectNetwork, caipNetwork]);

  /* -------------------------------------------------------------
     EXPOSE API
  -------------------------------------------------------------- */
  return {
    // State
    chainFamily,
    
    // AppKit account
    account: {
      address: appKitAccount.address,
      isConnected: appKitAccount.isConnected,
      status: appKitAccount.status,
    },
    
    // Stellar account
    stellarAccount: {
      address: stellarWallet.address,
      isConnected: stellarWallet.isConnected,
      publicKey: stellarWallet.publicKey,
    },
    
    // Providers
    evmWalletProvider,
    solanaWalletProvider,
    
    // Network info
    caipNetwork,
    
    // Actions
    connect,
    disconnect,
    switchNetwork, // ✅ Expose for manual switching if needed
    
    // Helpers
    getAddress,
    isConnected,
    getChainId,
    isOnCorrectNetwork,
    getNetworkInfo,
    getExpectedNetwork,
  };
}