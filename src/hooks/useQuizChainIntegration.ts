// src/hooks/useQuizChainIntegration.ts
import { useMemo } from 'react';
import { useQuizSetupStore } from '../components/Quiz/hooks/useQuizSetupStore';
import { useQuizConfig } from '../components/Quiz/hooks/useQuizConfig';
import { useWalletStore } from '../stores/walletStore';
import { useSafeAppKitAccount } from './useSafeAppKit';
import { useStellarWallet } from '../chains/stellar/useStellarWallet';
import { useMiniAppContext } from '../context/MiniAppContext';
import { useConnection } from 'wagmi';
import type { SupportedChain, WalletError } from '../chains/types';
import { useWalletActions } from '../hooks/useWalletActions';
import type { EvmNetworkKey } from '../chains/evm/config/networks';

const DEBUG = true;
const log = (...args: any[]) => DEBUG && console.log('[useQuizChainIntegration]', ...args);

const hasPositiveAmount = (value: unknown): boolean => {
  if (typeof value === 'number') return value > 0;
  if (typeof value === 'string') {
    const n = parseFloat(value);
    return !Number.isNaN(n) && n > 0;
  }
  return false;
};

interface CurrentWalletState {
  address: string | null;
  isConnected: boolean;
  isConnecting: boolean;
  error: WalletError | null;
}

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

  // Mini app detection
  const { isMiniApp } = useMiniAppContext();
  const { address: wagmiAddress, isConnected: wagmiIsConnected, status: wagmiStatus } = useConnection();

  log('Mini app state:', { isMiniApp, wagmiIsConnected, wagmiAddress, wagmiStatus });

  // AppKit for EVM/Solana (non-mini-app path)
  const appKitAccount = useSafeAppKitAccount();

  // Stellar wallet
  const stellarWallet = useStellarWallet();

  // Active chain from store (used for Stellar only)
  const activeChain = useWalletStore((s) => s.activeChain) as SupportedChain | null;

  // Merge external config with internal config
  const effectiveConfig = useMemo(() => {
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

  // Determine selected chain
  const selectedChain: SupportedChain | null = useMemo(() => {
    if (
      effectiveConfig.web3Chain === 'evm' ||
      effectiveConfig.web3Chain === 'solana' ||
      effectiveConfig.web3Chain === 'stellar'
    ) {
      return effectiveConfig.web3Chain as SupportedChain;
    }
    if (activeChain) return activeChain;
    return null;
  }, [effectiveConfig.web3Chain, activeChain]);

  // Current wallet state based on selected chain
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
        // In mini app, wallet comes from wagmi (SDK-backed), not AppKit
        if (isMiniApp) {
          log('Using wagmi for wallet state:', { wagmiIsConnected, wagmiAddress });
          return {
            address: wagmiAddress ?? null,
            isConnected: wagmiIsConnected,
            isConnecting: wagmiStatus === 'connecting',
            error: null,
          };
        }
        // Normal path: use AppKit
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
    isMiniApp,
    wagmiAddress,
    wagmiIsConnected,
    wagmiStatus,
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

  log('Wallet state:', { isWalletConnected, isWalletConnecting, walletAddress, selectedChain });

  const selectedEvmNetwork = effectiveConfig.evmNetwork as EvmNetworkKey | undefined;

  // Get wallet actions with same config for consistent chain family resolution
  const walletActions = useWalletActions({
    externalSetupConfig: effectiveConfig.web3Chain ? {
      web3Chain: effectiveConfig.web3Chain,
      evmNetwork: effectiveConfig.evmNetwork,
      solanaCluster: effectiveConfig.solanaCluster,
      stellarNetwork: effectiveConfig.stellarNetwork,
    } : undefined,
  });

  const getNetworkDisplayName = (chain?: SupportedChain | null): string => {
    const networkInfo = walletActions.getNetworkInfo();
    const c = chain ?? selectedChain;
    if (!c) return 'No blockchain';
    if (!chain || chain === selectedChain) {
      return networkInfo.expectedNetwork || 'Blockchain';
    }
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
      return { status: 'not-required' as const, message: 'No wallet required for this quiz', canProceed: true };
    }
    if (!selectedChain) {
      return { status: 'no-chain' as const, message: 'No blockchain selected', canProceed: false };
    }
    if (isWalletConnecting) {
      return { status: 'connecting' as const, message: `Connecting to ${net}…`, canProceed: false };
    }
    if (walletError) {
      return { status: 'error' as const, message: `Wallet error: ${walletError.message || 'Unknown'}`, canProceed: false };
    }
    if (!isWalletConnected) {
      return { status: 'disconnected' as const, message: `${net} wallet not connected`, canProceed: false };
    }
    return { status: 'ready' as const, message: `${net} wallet connected and ready`, canProceed: true };
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
    selectedChain,
    selectedEvmNetwork,
    activeChain,
    effectiveConfig,
    currentWallet,
    isWalletConnected,
    isWalletConnecting,
    walletError,
    isWalletRequired,
    isWalletSetupComplete,
    walletReadiness,
    isUsingChain,
    getChainDisplayName,
    getNetworkDisplayName,
    getFormattedAddress,
    networkInfo: walletActions.getNetworkInfo(),
    isOnCorrectNetwork: walletActions.isOnCorrectNetwork(),
  };
};

export default useQuizChainIntegration;



