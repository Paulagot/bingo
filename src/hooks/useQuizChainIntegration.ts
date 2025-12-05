// src/hooks/useQuizChainIntegration.ts
import { useMemo, useEffect } from 'react';
import { useQuizSetupStore } from '../components/Quiz/hooks/useQuizSetupStore';
import { useQuizConfig } from '../components/Quiz/hooks/useQuizConfig';
import { useWalletStore } from '../stores/walletStore';
import { useAppKitAccount, useAppKitNetwork } from '@reown/appkit/react';
import { useStellarWallet } from '../chains/stellar/useStellarWallet';
import type { SupportedChain, WalletError } from '../chains/types';

// ✅ Use the central networks config to avoid drift
import { getMetaByKey, getKeyById, type EvmNetworkKey } from '../chains/evm/config/networks';

const SOLANA_NAME_BY_CLUSTER: Record<string, string> = {
  mainnet: 'Solana',
  devnet: 'Solana (Devnet)',
};

const hasPositiveAmount = (value: unknown): boolean => {
  if (typeof value === 'number') return value > 0;
  if (typeof value === 'string') {
    const n = parseFloat(value);
    return !Number.isNaN(n) && n > 0;
  }
  return false;
};

// ✅ Define the wallet state shape used by this hook
interface CurrentWalletState {
  address: string | null;
  isConnected: boolean;
  isConnecting: boolean;
  error: WalletError | null;
}

type Options = { chainOverride?: SupportedChain | null };

export const useQuizChainIntegration = (_opts?: Options) => {
  const { setupConfig } = useQuizSetupStore();
  const { config } = useQuizConfig();

  // ✅ Read directly from AppKit for EVM/Solana
  const appKitAccount = useAppKitAccount();
  const { caipNetwork } = useAppKitNetwork();

  // ✅ Read from Stellar wallet (not managed by AppKit)
  const stellarWallet = useStellarWallet();

  // ✅ Read activeChain from store + get setter
  const activeChain = useWalletStore((s) => s.activeChain) as SupportedChain | null;
  const setActiveChain = useWalletStore((s) => s.setActiveChain);

  // Determine selected chain (coarse chain kind: 'stellar' | 'evm' | 'solana')
  const selectedChain: SupportedChain | null = useMemo(() => {
    // 1️⃣ Wizard-preferred source — user selection during setup
    if (setupConfig?.web3Chain === 'evm' ||
        setupConfig?.web3Chain === 'solana' ||
        setupConfig?.web3Chain === 'stellar') {
      return setupConfig.web3Chain;
    }

    // 2️⃣ After deployment, full config takes over
    if (config?.web3Chain === 'evm' ||
        config?.web3Chain === 'solana' ||
        config?.web3Chain === 'stellar') {
      return config.web3Chain;
    }

    // 3️⃣ Store fallback (rare)
    if (activeChain) return activeChain;

    return null;
  }, [setupConfig?.web3Chain, config?.web3Chain, activeChain]);

  // ✅ Sync selectedChain to activeChain in store (replaces DynamicChainProvider logic)
  useEffect(() => {
    if (selectedChain && selectedChain !== activeChain) {
      console.log('[useQuizChainIntegration] Syncing activeChain:', selectedChain);
      setActiveChain(selectedChain);
    }
  }, [selectedChain, activeChain, setActiveChain]);

  // ✅ Current wallet state based on selected chain
  const currentWallet = useMemo<CurrentWalletState | undefined>(() => {
    switch (selectedChain) {
      case 'stellar':
        return {
          address: stellarWallet.address || null,
          isConnected: stellarWallet.isConnected ?? false,
          isConnecting: false, // Stellar hook doesn't expose this
          error: (stellarWallet as any).error || null, // Cast to access error if it exists
        };
      
      case 'evm':
      case 'solana':
        return {
          address: appKitAccount.address || null,
          isConnected: appKitAccount.isConnected,
          isConnecting: appKitAccount.status === 'connecting',
          error: null, // AppKit doesn't expose errors in the same way
        };
      
      default:
        return undefined;
    }
  }, [
    selectedChain,
    stellarWallet.address,
    stellarWallet.isConnected,
    appKitAccount.address,
    appKitAccount.isConnected,
    appKitAccount.status,
  ]);

  const isWalletConnected = !!currentWallet?.isConnected;
  const isWalletConnecting = !!currentWallet?.isConnecting;
  const walletError = currentWallet?.error;
  const walletAddress = currentWallet?.address;

  // 🔹 The selected EVM subnetwork key (e.g., 'base', 'optimismSepolia', etc.)
  const selectedEvmNetwork = (setupConfig as any)?.evmNetwork as EvmNetworkKey | undefined;

  // ✅ Extract numeric chainId for EVM
  const evmChainId = useMemo(() => {
    if (selectedChain !== 'evm') return undefined;
    
    const caipNetworkId = caipNetwork?.caipNetworkId;
    if (!caipNetworkId) return undefined;

    // Extract from "eip155:84532"
    if (caipNetworkId.includes(':')) {
      const parts = caipNetworkId.split(':');
      const chainIdStr = parts[1];
      if (chainIdStr) {
        const parsed = parseInt(chainIdStr, 10);
        return isNaN(parsed) ? undefined : parsed;
      }
    }
    
    return undefined;
  }, [selectedChain, caipNetwork?.caipNetworkId]);

  // Network-aware display name, sourced from networks.ts
  const getNetworkDisplayName = (chain?: SupportedChain | null): string => {
    const c = chain ?? selectedChain;
    if (!c) return 'No blockchain';

    if (c === 'stellar') {
      const stellarNet = (setupConfig as any)?.stellarNetwork; // 'public' | 'testnet' (if present)
      return stellarNet === 'public' ? 'Stellar (Mainnet)'
           : stellarNet === 'testnet' ? 'Stellar (Testnet)'
           : 'Stellar';
    }

    if (c === 'solana') {
      const cluster = (setupConfig as any)?.solanaCluster || 'mainnet';
      return SOLANA_NAME_BY_CLUSTER[cluster] ?? 'Solana';
    }

    // EVM: prefer the configured network key, otherwise fall back to the connected chainId
    const metaFromKey = getMetaByKey(selectedEvmNetwork);
    if (metaFromKey?.name) return metaFromKey.name;

    if (typeof evmChainId === 'number') {
      const keyFromId = getKeyById(evmChainId);
      const metaFromId = getMetaByKey(keyFromId);
      if (metaFromId?.name) return metaFromId.name;
    }

    return 'EVM';
  };

  // Family label only
  const getChainDisplayName = (chain?: SupportedChain | null): string => {
    const c = chain ?? selectedChain;
    if (!c) return 'No blockchain';
    return c === 'stellar' ? 'Stellar' : c === 'solana' ? 'Solana' : 'EVM';
  };

  const isWalletRequired = useMemo(() => {
    if (!selectedChain) return false;
    const fee = config?.entryFee ?? setupConfig?.entryFee;
    return hasPositiveAmount(fee);
  }, [selectedChain, config?.entryFee, setupConfig?.entryFee]);

  const isWalletSetupComplete = useMemo(() => {
    if (!isWalletRequired) return true;
    if (!selectedChain) return false;
    return isWalletConnected;
  }, [isWalletRequired, selectedChain, isWalletConnected]);

  const walletReadiness = useMemo(() => {
    const net = getNetworkDisplayName();
    
    if (!isWalletRequired) {
      return { 
        status: 'not-required' as const, 
        message: 'No wallet required for this quiz', 
        canProceed: true 
      };
    }
    
    if (!selectedChain) {
      return { 
        status: 'no-chain' as const, 
        message: 'No blockchain selected', 
        canProceed: false 
      };
    }
    
    if (isWalletConnecting) {
      return { 
        status: 'connecting' as const, 
        message: `Connecting to ${net}…`, 
        canProceed: false 
      };
    }
    
    if (walletError) {
      const errMsg = walletError.message || 'Unknown wallet error';

      return {
        status: 'error' as const,
        message: `Wallet error: ${errMsg}`,
        canProceed: false,
      };
    }
    
    if (!isWalletConnected) {
      return { 
        status: 'disconnected' as const, 
        message: `${net} wallet not connected`, 
        canProceed: false 
      };
    }
    
    return { 
      status: 'ready' as const, 
      message: `${net} wallet connected and ready`, 
      canProceed: true 
    };
  }, [isWalletRequired, selectedChain, isWalletConnecting, walletError, isWalletConnected, getNetworkDisplayName]);

  const isUsingChain = (chain: SupportedChain): boolean => selectedChain === chain;

  const getFormattedAddress = (short = true): string | null => {
    if (!walletAddress) return null;
    if (!short) return walletAddress;
    return walletAddress.length > 10
      ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`
      : walletAddress;
  };

  return {
    // selection
    selectedChain,
    selectedEvmNetwork, // 🔹 expose for debug/consumers
    activeChain,

    // wallet state
    currentWallet,
    isWalletConnected,
    isWalletConnecting,
    walletError,

    // quiz logic
    isWalletRequired,
    isWalletSetupComplete,
    walletReadiness,

    // helpers
    isUsingChain,
    getChainDisplayName,    // family ("EVM", "Stellar", "Solana")
    getNetworkDisplayName,  // network-aware ("Base", "OP Sepolia", "Avalanche Fuji", etc.)
    getFormattedAddress,

    // debug (handy in overlays)
    debugInfo: {
      setupConfig,
      config,
      activeChain,
      evmChainId,
      evmNetworkKey: selectedEvmNetwork,
      solanaCluster: (setupConfig as any)?.solanaCluster,
      appKitConnected: appKitAccount.isConnected,
      appKitAddress: appKitAccount.address,
      caipNetworkId: caipNetwork?.caipNetworkId,
    },
  };
};

export default useQuizChainIntegration;



