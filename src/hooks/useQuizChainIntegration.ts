// useQuizChainIntegration.ts
import { useMemo } from 'react';
import { useQuizSetupStore } from '../components/Quiz/hooks/useQuizSetupStore';
import { useQuizConfig } from '../components/Quiz/hooks/useQuizConfig';
import { useWalletStore } from '../stores/walletStore';
import type { SupportedChain } from '../chains/types';

/** Type guard to safely check if a value represents a positive amount */
const hasPositiveAmount = (value: unknown): boolean => {
  if (typeof value === 'number') return value > 0;
  if (typeof value === 'string') {
    const parsed = parseFloat(value);
    return !isNaN(parsed) && parsed > 0;
  }
  return false;
};

type Options = {
  /** 👈 Room-driven override (from verification/join flow) */
  chainOverride?: SupportedChain | null;
};

/**
 * Hook that bridges quiz setup/config with the wallet store (room-driven)
 * Room override > active provider > dashboard config > setup config
 */
export const useQuizChainIntegration = (opts?: Options) => {
  // Quiz configuration from both stores
  const { setupConfig } = useQuizSetupStore();
  const { config } = useQuizConfig();

  // Wallet state from the central store (populated by providers)
  const { activeChain, stellar, evm, solana } = useWalletStore((s) => ({
    activeChain: s.activeChain as SupportedChain | null,
    stellar: s.stellar,
    evm: s.evm,
    solana: s.solana,
  }));

  // Normalize chain selection with clear priority (now includes override)
  const selectedChain: SupportedChain | null = useMemo(() => {
    // 1) Room override (authoritative in join flow)
    if (opts?.chainOverride) return opts.chainOverride;

    // 2) Active provider (DynamicChainProvider should sync this)
    if (activeChain) return activeChain;

    // 3) Dashboard config
    const dashboardChain = (config?.web3Chain ?? config?.web3ChainConfirmed) as SupportedChain | undefined;
    if (dashboardChain === 'stellar' || dashboardChain === 'evm' || dashboardChain === 'solana') {
      return dashboardChain;
    }

    // 4) Setup wizard config
    const setupChain = setupConfig?.web3Chain as SupportedChain | undefined;
    if (setupChain === 'stellar' || setupChain === 'evm' || setupChain === 'solana') {
      return setupChain;
    }

    return null;
  }, [opts?.chainOverride, activeChain, config?.web3Chain, config?.web3ChainConfirmed, setupConfig?.web3Chain]);

  // Select current wallet slice by chain (read-only)
  const currentWallet = useMemo(() => {
    switch (selectedChain) {
      case 'stellar': return stellar;
      case 'evm':     return evm;
      case 'solana':  return solana;
      default:        return undefined;
    }
  }, [selectedChain, stellar, evm, solana]);

  // Derived wallet flags (chain-agnostic)
  const isWalletConnected   = !!currentWallet?.isConnected;
  const isWalletConnecting  = !!currentWallet?.isConnecting;
  const walletError         = currentWallet?.error;
  const walletAddress       = currentWallet?.address;

  // Is a wallet required for this room/setup? (basic rule: entryFee > 0)
  const isWalletRequired = useMemo(() => {
    if (!selectedChain) return false;
    const entryFee = config?.entryFee ?? setupConfig?.entryFee;
    return hasPositiveAmount(entryFee);
  }, [selectedChain, config?.entryFee, setupConfig?.entryFee]);

  // Overall readiness for flows that need a wallet
  const isWalletSetupComplete = useMemo(() => {
    if (!isWalletRequired) return true;
    if (!selectedChain) return false;
    if (!isWalletConnected) return false;
    return true;
  }, [isWalletRequired, selectedChain, isWalletConnected]);

  const walletReadiness = useMemo(() => {
    if (!isWalletRequired) {
      return { status: 'not-required' as const, message: 'No wallet required for this quiz', canProceed: true };
    }
    if (!selectedChain) {
      return { status: 'no-chain' as const, message: 'No blockchain selected', canProceed: false };
    }
    if (isWalletConnecting) {
      return { status: 'connecting' as const, message: `Connecting to ${selectedChain} wallet...`, canProceed: false };
    }
    if (walletError) {
      return { status: 'error' as const, message: `Wallet error: ${walletError.message}`, canProceed: false };
    }
    if (!isWalletConnected) {
      return { status: 'disconnected' as const, message: `${selectedChain} wallet not connected`, canProceed: false };
    }
    return { status: 'ready' as const, message: `${selectedChain} wallet connected and ready`, canProceed: true };
  }, [isWalletRequired, selectedChain, isWalletConnecting, walletError, isWalletConnected]);

  // Helpers
  const getChainDisplayName = (chain?: SupportedChain | null): string => {
    const targetChain = chain ?? selectedChain;
    if (!targetChain) return 'No blockchain';
    switch (targetChain) {
      case 'stellar': return 'Stellar';
      case 'evm':     return 'Ethereum';
      case 'solana':  return 'Solana';
      default:        return String(targetChain).charAt(0).toUpperCase() + String(targetChain).slice(1);
    }
  };

  const isUsingChain = (chain: SupportedChain): boolean => selectedChain === chain;

  const getFormattedAddress = (short = true): string | null => {
    if (!walletAddress) return null;
    if (!short) return walletAddress;
    return walletAddress.length > 10
      ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`
      : walletAddress;
  };

  return {
    // Chain selection
    selectedChain,
    activeChain,

    // Wallet state
    currentWallet,
    isWalletConnected,
    isWalletConnecting,
    walletError,

    // Quiz-specific logic
    isWalletRequired,
    isWalletSetupComplete,
    walletReadiness,

    // Convenience flags
    canStartQuiz: walletReadiness.canProceed,
    canProcessPayments: isWalletConnected && selectedChain !== null,
    needsWalletConnection: isWalletRequired && !isWalletConnected,

    // Helper functions
    isUsingChain,
    getChainDisplayName,
    getFormattedAddress,

    // Debug info (useful during migration)
    debugInfo: {
      setupConfig,
      config,
      activeChain,
      hasEntryFee: hasPositiveAmount(config?.entryFee ?? setupConfig?.entryFee),
      configWeb3Chain: config?.web3Chain ?? config?.web3ChainConfirmed,
      setupWeb3Chain: setupConfig?.web3Chain,
      chainSource: opts?.chainOverride
        ? 'room-override'
        : activeChain
          ? 'active-provider'
          : (config?.web3Chain || config?.web3ChainConfirmed)
            ? 'dashboard-config'
            : setupConfig?.web3Chain
              ? 'setup-config'
              : 'none',
    },
  };
};

export default useQuizChainIntegration;

