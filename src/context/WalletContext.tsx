// src/contexts/WalletContext.tsx
import React, { createContext, useContext, useMemo } from 'react';

import { useStellarWallet } from '../chains/stellar/useStellarWallet';
import { useWalletActions } from '../hooks/useWalletActions';
import { useSafeAppKitAccount } from '../hooks/useSafeAppKit';

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

  const appKitAccount = useSafeAppKitAccount();
  const stellarWallet = useStellarWallet();

  const walletActions = useWalletActions({
    externalSetupConfig: roomConfig,
  });

  const chainFamily = walletActions.chainFamily;

  // 🔥 No isReady delay — AppKit hydration gap is handled in useWalletActions
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