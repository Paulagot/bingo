// src/chains/stellar/StellarWalletProvider.tsx
import React, { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { useStellarWallet } from './useStellarWallet';
import type { StellarWalletConnection, StellarNetwork, StellarBalance } from '../types/stellar-types';
import type { WalletConnectionResult, TransactionResult } from '../types';

// ===================================================================
// STELLAR WALLET CONTEXT TYPE
// ===================================================================

export interface StellarWalletContextType {
  // Connection state
  wallet: StellarWalletConnection;
  isInitialized: boolean;
  currentNetwork: StellarNetwork;
  balances: StellarBalance[];
  
  // Connection methods
  connect: () => Promise<WalletConnectionResult>;
  disconnect: () => Promise<void>;
  reconnect: () => Promise<void>;
  
  // Transaction methods
  sendPayment: (params: {
    to: string;
    amount: string;
    asset?: { code: string; issuer?: string; isNative: boolean };
    memo?: string;
  }) => Promise<TransactionResult>;
  
  getBalance: (tokenAddress?: string) => Promise<string>;
  
  // Network methods
  switchNetwork: (network: StellarNetwork) => Promise<boolean>;
  getSupportedAssets: () => any[];
  
  // Utility methods
  formatAddress: (address: string) => string;
  getExplorerUrl: (type: 'transaction' | 'account' | 'asset', identifier: string) => string;
  
  // State helpers
  isWalletInstalled: () => boolean;
  canConnect: boolean;
  canDisconnect: boolean;
}

// ===================================================================
// CONTEXT CREATION
// ===================================================================

const StellarWalletContext = createContext<StellarWalletContextType | null>(null);

// ===================================================================
// PROVIDER COMPONENT
// ===================================================================

interface StellarWalletProviderProps {
  children: ReactNode;
  autoConnect?: boolean;
  onConnectionChange?: (connected: boolean) => void;
  onError?: (error: any) => void;
}

export const StellarWalletProvider: React.FC<StellarWalletProviderProps> = ({
  children,
  autoConnect = true,
  onConnectionChange,
  onError,
}) => {
  // ===================================================================
  // STATE MANAGEMENT
  // ===================================================================
  
  const stellarWallet = useStellarWallet();
  const [isProviderReady, setIsProviderReady] = useState(false);
  const [lastConnectionState, setLastConnectionState] = useState(false);

  // ===================================================================
  // EFFECT HANDLERS
  // ===================================================================

  // Handle initialization
  useEffect(() => {
    if (stellarWallet.isInitialized && !isProviderReady) {
      setIsProviderReady(true);
      console.log('✅ Stellar wallet provider ready');
    }
  }, [stellarWallet.isInitialized, isProviderReady]);

  // Handle connection state changes
  useEffect(() => {
    if (stellarWallet.isConnected !== lastConnectionState) {
      setLastConnectionState(stellarWallet.isConnected);
      onConnectionChange?.(stellarWallet.isConnected);
      
      if (stellarWallet.isConnected) {
        console.log('🌟 Stellar wallet connected:', stellarWallet.address);
      } else {
        console.log('📱 Stellar wallet disconnected');
      }
    }
  }, [stellarWallet.isConnected, lastConnectionState, onConnectionChange, stellarWallet.address]);

  // Handle errors
  useEffect(() => {
    if (stellarWallet.error) {
      console.error('❌ Stellar wallet error:', stellarWallet.error);
      onError?.(stellarWallet.error);
    }
  }, [stellarWallet.error, onError]);

  // Auto-connect on initialization
  useEffect(() => {
    if (autoConnect && isProviderReady && !stellarWallet.isConnected && !stellarWallet.isConnecting) {
      const savedWalletId = localStorage.getItem('stellar-wallet-id');
      const savedAutoConnect = localStorage.getItem('stellar-auto-connect') === 'true';
      
      if (savedWalletId && savedAutoConnect) {
        console.log('🔄 Auto-connecting to Stellar wallet...');
        stellarWallet.reconnect().catch((error) => {
          console.warn('⚠️ Auto-connect failed:', error);
          // Don't call onError for auto-connect failures as they're expected
        });
      }
    }
  }, [autoConnect, isProviderReady, stellarWallet.isConnected, stellarWallet.isConnecting, stellarWallet.reconnect]);

  // ===================================================================
  // ENHANCED METHODS WITH ERROR HANDLING
  // ===================================================================

  const enhancedConnect = async (): Promise<WalletConnectionResult> => {
    try {
      const result = await stellarWallet.connect();
      if (result.success) {
        console.log('✅ Stellar wallet connected successfully');
      }
      return result;
    } catch (error) {
      console.error('❌ Stellar wallet connection failed:', error);
      onError?.(error);
      return {
        success: false,
        address: null,
        error: {
          code: 'CONNECTION_FAILED' as any,
          message: 'Failed to connect wallet',
          details: error,
          timestamp: new Date(),
        }
      };
    }
  };

  const enhancedDisconnect = async (): Promise<void> => {
    try {
      await stellarWallet.disconnect();
      console.log('✅ Stellar wallet disconnected successfully');
    } catch (error) {
      console.error('❌ Stellar wallet disconnection failed:', error);
      onError?.(error);
    }
  };

  const enhancedSendPayment = async (params: {
    to: string;
    amount: string;
    asset?: { code: string; issuer?: string; isNative: boolean };
    memo?: string;
  }): Promise<TransactionResult> => {
    try {
      if (!stellarWallet.isConnected) {
        throw new Error('Wallet not connected');
      }

      const result = await stellarWallet.sendPayment({
        to: params.to,
        amount: params.amount,
        asset: params.asset || { code: 'XLM', isNative: true }, // Provide default asset
        memo: params.memo,
      });

      if (result.success) {
        console.log('✅ Stellar payment sent successfully:', result.transactionHash);
      }

      return result;
    } catch (error) {
      console.error('❌ Stellar payment failed:', error);
      onError?.(error);
      return {
        success: false,
        error: {
          code: 'TRANSACTION_FAILED' as any,
          message: 'Failed to send payment',
          details: error,
          timestamp: new Date(),
        }
      };
    }
  };

  const enhancedSwitchNetwork = async (network: StellarNetwork): Promise<boolean> => {
    try {
      const success = await stellarWallet.switchNetwork(network);
      if (success) {
        console.log(`✅ Switched to Stellar ${network}`);
      }
      return success;
    } catch (error) {
      console.error('❌ Network switch failed:', error);
      onError?.(error);
      return false;
    }
  };

  // ===================================================================
  // CONTEXT VALUE
  // ===================================================================

  const contextValue: StellarWalletContextType = {
    // Connection state
    wallet: {
      address: stellarWallet.address,
      isConnected: stellarWallet.isConnected,
      isConnecting: stellarWallet.isConnecting,
      isDisconnecting: stellarWallet.isDisconnecting,
      chain: 'stellar',
      error: stellarWallet.error,
      balance: stellarWallet.balance,
      lastConnected: stellarWallet.lastConnected,
      publicKey: stellarWallet.publicKey,
      networkPassphrase: stellarWallet.networkPassphrase,
      walletType: stellarWallet.walletType,
    },
    isInitialized: stellarWallet.isInitialized,
    currentNetwork: stellarWallet.currentNetwork,
    balances: stellarWallet.balances,

    // Connection methods
    connect: enhancedConnect,
    disconnect: enhancedDisconnect,
    reconnect: stellarWallet.reconnect,

    // Transaction methods
    sendPayment: enhancedSendPayment,
    getBalance: stellarWallet.getBalance,

    // Network methods
    switchNetwork: enhancedSwitchNetwork,
    getSupportedAssets: stellarWallet.getSupportedAssets,

    // Utility methods
    formatAddress: stellarWallet.formatAddress,
    getExplorerUrl: stellarWallet.getExplorerUrl,

    // State helpers
    isWalletInstalled: stellarWallet.isWalletInstalled,
    canConnect: stellarWallet.canConnect,
    canDisconnect: stellarWallet.canDisconnect,
  };

  // ===================================================================
  // LOADING STATE
  // ===================================================================

  if (!isProviderReady) {
    return (
      <div className="flex min-h-32 items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-2 h-8 w-8 animate-spin rounded-full border-b-2 border-indigo-600"></div>
          <p className="text-fg/70 text-sm">Initializing Stellar wallet...</p>
        </div>
      </div>
    );
  }

  // ===================================================================
  // PROVIDER RENDER
  // ===================================================================

  return (
    <StellarWalletContext.Provider value={contextValue}>
      {children}
    </StellarWalletContext.Provider>
  );
};

// ===================================================================
// CONTEXT HOOK
// ===================================================================

export const useStellarWalletContext = (): StellarWalletContextType => {
  const context = useContext(StellarWalletContext);
  
  if (!context) {
    throw new Error(
      'useStellarWalletContext must be used within a StellarWalletProvider. ' +
      'Make sure to wrap your component with <StellarWalletProvider>.'
    );
  }
  
  return context;
};

// ===================================================================
// CONVENIENCE HOOKS
// ===================================================================

/**
 * Hook to get Stellar wallet connection state
 */
export const useStellarConnection = () => {
  const { wallet, isInitialized, connect, disconnect } = useStellarWalletContext();
  
  return {
    isConnected: wallet.isConnected,
    isConnecting: wallet.isConnecting,
    address: wallet.address,
    isInitialized,
    connect,
    disconnect,
  };
};

/**
 * Hook to get Stellar wallet balance information
 */
export const useStellarBalance = () => {
  const { wallet, balances, getBalance } = useStellarWalletContext();
  
  return {
    xlmBalance: wallet.balance || '0',
    balances,
    getBalance,
    isLoading: wallet.isConnecting,
  };
};

/**
 * Hook to send Stellar payments
 */
export const useStellarPayments = () => {
  const { sendPayment, wallet } = useStellarWalletContext();
  
  return {
    sendPayment,
    canSendPayment: wallet.isConnected && !wallet.isConnecting,
    isConnected: wallet.isConnected,
  };
};

/**
 * Hook to manage Stellar network
 */
export const useStellarNetwork = () => {
  const { currentNetwork, switchNetwork, getSupportedAssets } = useStellarWalletContext();
  
  return {
    currentNetwork,
    switchNetwork,
    getSupportedAssets,
    isMainnet: currentNetwork === 'mainnet',
    isTestnet: currentNetwork === 'testnet',
  };
};

// ===================================================================
// DEVELOPMENT HELPER
// ===================================================================

export const debugStellarProvider = (context: StellarWalletContextType) => {
  console.log('🌟 Stellar Provider Debug Info:', {
    isConnected: context.wallet.isConnected,
    address: context.wallet.address,
    network: context.currentNetwork,
    balances: context.balances.length,
    canConnect: context.canConnect,
    canDisconnect: context.canDisconnect,
  });
};