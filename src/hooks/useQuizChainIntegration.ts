// src/hooks/useQuizChainIntegration.ts
import { useMemo } from 'react';
import { useQuizSetupStore } from '../components/Quiz/hooks/useQuizSetupStore';
import { useQuizConfig } from '../components/Quiz/hooks/useQuizConfig';
import { useWalletStore } from '../stores/walletStore';
import { useAppKitAccount } from '@reown/appkit/react';
import { useStellarWallet } from '../chains/stellar/useStellarWallet';
import type { SupportedChain, WalletError } from '../chains/types';
import { useWalletActions } from '../hooks/useWalletActions';
import type { EvmNetworkKey } from '../chains/evm/config/networks'

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

// ✅ External config option
interface ExternalConfig {
  web3Chain?: string;
  evmNetwork?: string;
  solanaCluster?: string;
  stellarNetwork?: string;
}

type Options = { 
  chainOverride?: SupportedChain | null;
  externalConfig?: ExternalConfig | null;
};

export const useQuizChainIntegration = (opts?: Options) => {
  const { setupConfig } = useQuizSetupStore();
  const { config } = useQuizConfig();

  // ✅ Read directly from AppKit for EVM/Solana
  const appKitAccount = useAppKitAccount();

  // ✅ Read from Stellar wallet (not managed by AppKit)
  const stellarWallet = useStellarWallet();

  // ✅ Read activeChain from store (used for Stellar only)
  const activeChain = useWalletStore((s) => s.activeChain) as SupportedChain | null;

  // ✅ Merge external config with internal config
  const effectiveConfig = useMemo(() => {
    // Priority: externalConfig > setupConfig > config
    return {
      web3Chain: opts?.externalConfig?.web3Chain || setupConfig?.web3Chain || config?.web3Chain,
      evmNetwork: opts?.externalConfig?.evmNetwork || (setupConfig as any)?.evmNetwork || config?.evmNetwork,
      solanaCluster: opts?.externalConfig?.solanaCluster || (setupConfig as any)?.solanaCluster || config?.solanaCluster,
      stellarNetwork: opts?.externalConfig?.stellarNetwork || (setupConfig as any)?.stellarNetwork || config?.stellarNetwork,
    };
  }, [
    opts?.externalConfig,
    setupConfig?.web3Chain,
    config?.web3Chain,
    (setupConfig as any)?.evmNetwork,
    config?.evmNetwork,
    (setupConfig as any)?.solanaCluster,
    config?.solanaCluster,
    (setupConfig as any)?.stellarNetwork,
    config?.stellarNetwork,
  ]);

  // Determine selected chain (coarse chain kind: 'stellar' | 'evm' | 'solana')
  const selectedChain: SupportedChain | null = useMemo(() => {
    // 1️⃣ Use effectiveConfig which includes external config
    if (effectiveConfig.web3Chain === 'evm' ||
        effectiveConfig.web3Chain === 'solana' ||
        effectiveConfig.web3Chain === 'stellar') {
      return effectiveConfig.web3Chain as SupportedChain;
    }

    // 2️⃣ Store fallback (rare, only for Stellar)
    if (activeChain) return activeChain;

    return null;
  }, [effectiveConfig.web3Chain, activeChain]);

  // ❌ REMOVED: activeChain sync effect - it was causing infinite loops
  // activeChain should only be used for Stellar, EVM/Solana state comes from AppKit

  // ✅ Current wallet state based on selected chain
  const currentWallet = useMemo<CurrentWalletState | undefined>(() => {
    switch (selectedChain) {
      case 'stellar':
        return {
          address: stellarWallet.address || null,
          isConnected: stellarWallet.isConnected ?? false,
          isConnecting: false,
          error: (stellarWallet as any).error || null,
        };
      
      case 'evm':
      case 'solana':
        return {
          address: appKitAccount.address || null,
          isConnected: appKitAccount.isConnected,
          isConnecting: appKitAccount.status === 'connecting',
          error: null,
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

  // 🔹 The selected EVM subnetwork key (from effectiveConfig)
  const selectedEvmNetwork = effectiveConfig.evmNetwork as EvmNetworkKey | undefined;

  // ✅ Get wallet actions with SAME config so chain family resolution is consistent
  const walletActions = useWalletActions({
    externalSetupConfig: effectiveConfig.web3Chain ? {
      web3Chain: effectiveConfig.web3Chain,
      evmNetwork: effectiveConfig.evmNetwork,
      solanaCluster: effectiveConfig.solanaCluster,
      stellarNetwork: effectiveConfig.stellarNetwork,
    } : undefined
  });

  // Network-aware display name
  const getNetworkDisplayName = (chain?: SupportedChain | null): string => {
    const networkInfo = walletActions.getNetworkInfo();
    
    const c = chain ?? selectedChain;
    if (!c) return 'No blockchain';
    
    // If checking the expected network, return the expected name
    if (!chain || chain === selectedChain) {
      return networkInfo.expectedNetwork || 'Blockchain';
    }
    
    // Otherwise return the current network name
    return networkInfo.currentNetwork || 'Blockchain';
  };

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
    selectedEvmNetwork,
    activeChain,
    effectiveConfig,

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
    getChainDisplayName,
    getNetworkDisplayName,
    getFormattedAddress,

    // ✅ Pass through network info from walletActions
    networkInfo: walletActions.getNetworkInfo(),
    isOnCorrectNetwork: walletActions.isOnCorrectNetwork(),
  };
};

export default useQuizChainIntegration;



