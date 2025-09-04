// src/hooks/useQuizChainIntegration.ts
import { useMemo } from 'react';
import { useQuizSetupStore } from '../components/Quiz/hooks/useQuizSetupStore';
import { useQuizConfig } from '../components/Quiz/hooks/useQuizConfig';
import { useDynamicChain } from '../components/chains/DynamicChainProvider';
import type { SupportedChain } from '../chains/types';

/**
 * Type guard to safely check if a value represents a positive amount
 */
const hasPositiveAmount = (value: unknown): boolean => {
  if (typeof value === 'number') return value > 0;
  if (typeof value === 'string') {
    const parsed = parseFloat(value);
    return !isNaN(parsed) && parsed > 0;
  }
  return false;
};

/**
 * Hook that bridges quiz setup configuration with chain wallet providers
 * Provides a clean API for quiz components to access wallet functionality
 */
export const useQuizChainIntegration = () => {
  // Get quiz configuration from both stores
  const { setupConfig } = useQuizSetupStore();
  const { config } = useQuizConfig();
  
  // Get current wallet state from dynamic provider
  const {
    activeChain,
    currentWallet,
    isWalletConnected,
    isWalletConnecting,
    walletError
  } = useDynamicChain();

  // Normalize the chain selection from quiz config - check all sources
  const selectedChain: SupportedChain | null = useMemo(() => {
    // FIRST: Check if DynamicChainProvider has an active chain (for join room flow)
    if (activeChain) {
      return activeChain;
    }
    
    // SECOND: Try dashboard config (for dashboard context)
    const dashboardChain = config?.web3Chain || config?.web3ChainConfirmed;
    if (dashboardChain) {
      switch (dashboardChain) {
        case 'stellar':
        case 'evm':
        case 'solana':
          return dashboardChain;
      }
    }
    
    // THIRD: Fall back to setup config (for wizard context)
    const setupChain = setupConfig?.web3Chain;
    switch (setupChain) {
      case 'stellar':
      case 'evm':
      case 'solana':
        return setupChain;
      default:
        return null;
    }
  }, [activeChain, config?.web3Chain, config?.web3ChainConfirmed, setupConfig?.web3Chain]);

  // Check if wallet is required for current quiz configuration - check both stores
  const isWalletRequired = useMemo(() => {
    if (!selectedChain) return false;
    
    // Check dashboard config first, then setup config
    const entryFee = config?.entryFee || setupConfig?.entryFee;
    const hasEntryFee = hasPositiveAmount(entryFee);
    
    return hasEntryFee;
  }, [selectedChain, config?.entryFee, setupConfig?.entryFee]);

  // Check if wallet setup is complete for quiz requirements
  const isWalletSetupComplete = useMemo(() => {
    if (!isWalletRequired) return true;
    if (!selectedChain) return false;
    if (!isWalletConnected) return false;
    return true;
  }, [isWalletRequired, selectedChain, isWalletConnected]);

  // Get wallet readiness status with detailed messaging
  const walletReadiness = useMemo(() => {
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
        message: `Connecting to ${selectedChain} wallet...`,
        canProceed: false
      };
    }
    
    if (walletError) {
      return { 
        status: 'error' as const, 
        message: `Wallet error: ${walletError.message}`,
        canProceed: false
      };
    }
    
    if (!isWalletConnected) {
      return { 
        status: 'disconnected' as const, 
        message: `${selectedChain} wallet not connected`,
        canProceed: false
      };
    }
    
    return { 
      status: 'ready' as const, 
      message: `${selectedChain} wallet connected and ready`,
      canProceed: true
    };
  }, [isWalletRequired, selectedChain, isWalletConnecting, walletError, isWalletConnected]);

  // Helper to get display-friendly chain name
  const getChainDisplayName = (chain?: SupportedChain | null): string => {
    const targetChain = chain ?? selectedChain;
    if (!targetChain) return 'No blockchain';
    
    switch (targetChain) {
      case 'stellar':
        return 'Stellar';
      case 'evm':
        return 'Ethereum';
      case 'solana':
        return 'Solana';
      default:
        return String(targetChain).charAt(0).toUpperCase() + String(targetChain).slice(1);
    }
  };

  // Helper to check if using a specific chain
  const isUsingChain = (chain: SupportedChain): boolean => {
    return selectedChain === chain;
  };

  // Helper to get formatted wallet address
  const getFormattedAddress = (short = true): string | null => {
    if (!currentWallet?.address) return null;
    
    const address = currentWallet.address;
    if (!short) return address;
    
    // Return shortened version: first 6 + ... + last 4
    if (address.length > 10) {
      return `${address.slice(0, 6)}...${address.slice(-4)}`;
    }
    
    return address;
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
    
    // Debug info (useful during development)
    debugInfo: {
      setupConfig,
      config,
      activeChain, // Add this to see what DynamicChainProvider thinks
      hasEntryFee: hasPositiveAmount(config?.entryFee || setupConfig?.entryFee),
      configWeb3Chain: config?.web3Chain || config?.web3ChainConfirmed,
      setupWeb3Chain: setupConfig?.web3Chain,
      chainSource: activeChain ? 'dynamic-provider' : 
                   (config?.web3Chain || config?.web3ChainConfirmed) ? 'config' :
                   setupConfig?.web3Chain ? 'setup' : 'none'
    }
  };
};

export default useQuizChainIntegration;