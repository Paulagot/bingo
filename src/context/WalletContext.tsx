// src/contexts/WalletContext.tsx
import React, { createContext, useContext, useMemo } from 'react';
import { useAppKitAccount } from '@reown/appkit/react';
import { useStellarWallet } from '../chains/stellar/useStellarWallet';
import type { SupportedChain } from '../chains/types';
import { useWalletActions } from '../hooks/useWalletActions';

/**
 * WalletContext - Only used for Web3 rooms
 * 
 * This context wraps Web3 rooms and provides wallet functionality.
 * It should NEVER be used for Web2 rooms.
 * 
 * Usage:
 * ```tsx
 * // In Web3PaymentStep or other Web3 components:
 * const wallet = useWallet();
 * const { connect, disconnect, isConnected } = wallet.actions;
 * ```
 */

interface WalletContextValue {
  // Wallet state
  chainFamily: 'evm' | 'solana' | 'stellar' | null;
  address: string | null;
  isConnected: boolean;
  isConnecting: boolean;
  
  // Actions
  actions: ReturnType<typeof useWalletActions>;
  
  // Network info
  networkInfo: {
    currentNetwork: string;
    expectedNetwork: string;
    isCorrect: boolean;
  };
}

const WalletContext = createContext<WalletContextValue | null>(null);

interface WalletProviderProps {
  children: React.ReactNode;
  /**
   * Explicit config for this room
   */
  roomConfig: {
    web3Chain?: string;
    evmNetwork?: string;
    solanaCluster?: string;
    stellarNetwork?: string;
  };
}

export const WalletProvider: React.FC<WalletProviderProps> = ({ 
  children, 
  roomConfig 
}) => {
  console.log('[WalletProvider] Initializing with config:', roomConfig);
  
  // Get wallet state from AppKit
  const appKitAccount = useAppKitAccount();
  const stellarWallet = useStellarWallet();
  
  // Get wallet actions with explicit config
  const walletActions = useWalletActions({
    externalSetupConfig: roomConfig
  });
  
  const chainFamily = walletActions.chainFamily;
  
  // Determine current wallet state based on chain family
  const { address, isConnected, isConnecting } = useMemo(() => {
    switch (chainFamily) {
      case 'stellar':
        return {
          address: stellarWallet.address || null,
          isConnected: stellarWallet.isConnected ?? false,
          isConnecting: false,
        };
      
      case 'evm':
      case 'solana':
        return {
          address: appKitAccount.address || null,
          isConnected: appKitAccount.isConnected,
          isConnecting: appKitAccount.status === 'connecting',
        };
      
      default:
        return {
          address: null,
          isConnected: false,
          isConnecting: false,
        };
    }
  }, [
    chainFamily,
    stellarWallet.address,
    stellarWallet.isConnected,
    appKitAccount.address,
    appKitAccount.isConnected,
    appKitAccount.status,
  ]);
  
  const networkInfo = walletActions.getNetworkInfo();
  
  const value: WalletContextValue = {
    chainFamily,
    address,
    isConnected,
    isConnecting,
    actions: walletActions,
    networkInfo,
  };
  
  console.log('[WalletProvider] State:', {
    chainFamily,
    address,
    isConnected,
    networkInfo,
  });
  
  return (
    <WalletContext.Provider value={value}>
      {children}
    </WalletContext.Provider>
  );
};

/**
 * Hook to access wallet context
 * 
 * ⚠️ This will throw an error if used outside WalletProvider
 * This is intentional - wallet hooks should only be used in Web3 rooms
 */
export const useWallet = (): WalletContextValue => {
  const context = useContext(WalletContext);
  
  if (!context) {
    throw new Error(
      'useWallet must be used within WalletProvider. ' +
      'This hook should only be used in Web3 components. ' +
      'If you need wallet functionality, wrap your component in WalletProvider.'
    );
  }
  
  return context;
};

/**
 * Safe version that returns null if not in WalletProvider
 * Use this in components that might render in both Web2 and Web3 contexts
 */
export const useWalletOptional = (): WalletContextValue | null => {
  return useContext(WalletContext);
};