// src/contexts/WalletContext.tsx
import React, { createContext, useContext, useMemo, useEffect, useState } from 'react';
import { useAppKitAccount } from '@reown/appkit/react';
import { useStellarWallet } from '../chains/stellar/useStellarWallet';
import type { SupportedChain } from '../chains/types';
import { useWalletActions } from '../hooks/useWalletActions';

interface WalletContextValue {
  chainFamily: 'evm' | 'solana' | 'stellar' | null;
  address: string | null;
  isConnected: boolean;
  isConnecting: boolean;
  actions: ReturnType<typeof useWalletActions>;
  networkInfo: {
    currentNetwork: string;
    expectedNetwork: string;
    isCorrect: boolean;
  };
}

const WalletContext = createContext<WalletContextValue | null>(null);

interface WalletProviderProps {
  children: React.ReactNode;
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
  
  // 🔥 Add a small delay to ensure AppKit is fully ready
  const [isReady, setIsReady] = useState(false);
  
  useEffect(() => {
    // Small delay to ensure AppKit context is mounted
    const timer = setTimeout(() => {
      setIsReady(true);
    }, 100);
    
    return () => clearTimeout(timer);
  }, []);
  
  // Get wallet state from AppKit (will be safe after delay)
  const appKitAccount = useAppKitAccount();
  const stellarWallet = useStellarWallet();
  
  // Get wallet actions with explicit config
  const walletActions = useWalletActions({
    externalSetupConfig: roomConfig
  });
  
  const chainFamily = walletActions.chainFamily;
  
  // Determine current wallet state based on chain family
  const { address, isConnected, isConnecting } = useMemo(() => {
    if (!isReady) {
      return {
        address: null,
        isConnected: false,
        isConnecting: true, // Show connecting state while initializing
      };
    }
    
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
    isReady,
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
    isReady,
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

export const useWalletOptional = (): WalletContextValue | null => {
  return useContext(WalletContext);
};