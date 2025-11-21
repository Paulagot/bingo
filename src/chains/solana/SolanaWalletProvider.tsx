/**
 * Solana Wallet Provider Component
 *
 * Configures and initializes the Solana Wallet Adapter ecosystem for the entire application.
 * Wraps components with ConnectionProvider (RPC connection), WalletProvider (wallet integration),
 * and WalletModalProvider (connection UI) to enable blockchain interactions.
 * Supports Phantom and Solflare wallets with auto-connect enabled.
 * Integrates with global walletStore for state synchronization across the multichain application.
 */

import React, { createContext, useContext, useEffect, useState, useMemo, type ReactNode } from 'react';
import {
  ConnectionProvider,
  WalletProvider,
} from '@solana/wallet-adapter-react';
import {
  PhantomWalletAdapter,
  SolflareWalletAdapter,
  
} from '@solana/wallet-adapter-wallets';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { type Cluster } from '@solana/web3.js';
import { useSolanaWallet } from './useSolanaWallet';
import { getRpcEndpoint, NETWORK, solanaStorageKeys } from '@/shared/lib/solana/config';
import { useWalletStore } from '../../stores/walletStore';
import type { WalletConnectionResult, WalletError } from '../types';

// Import wallet styles
import '@solana/wallet-adapter-react-ui/styles.css';

// ===================================================================
// SOLANA WALLET CONTEXT TYPE
// ===================================================================

export interface SolanaWalletContextType {
  // Connection state
  wallet: {
    address: string | null;
    isConnected: boolean;
    isConnecting: boolean;
    isDisconnecting: boolean;
    chain: 'solana';
    error: string | null;
    balance: string | null;
    publicKey: string | null;
    cluster: Cluster | undefined;
    walletType: string | undefined;
  };
  isInitialized: boolean;
  currentCluster: Cluster;

  // Connection methods
  connect: () => Promise<WalletConnectionResult>;
  disconnect: () => Promise<void>;
  reconnect: () => Promise<void>;

  // Balance methods
  getBalance: (tokenAddress?: string) => Promise<string>;

  // Network methods
  switchNetwork: (cluster: Cluster) => Promise<boolean>;

  // Utility methods
  formatAddress: (address: string) => string;
  getExplorerUrl: (type: 'transaction' | 'account' | 'token', identifier: string) => string;

  // State helpers
  isWalletInstalled: () => boolean;
  canConnect: boolean;
  canDisconnect: boolean;
}

// ===================================================================
// CONTEXT CREATION
// ===================================================================

const SolanaWalletContext = createContext<SolanaWalletContextType | null>(null);

// ===================================================================
// INTERNAL STRICT HOOK (throws if no provider)
// Only used within this file
// ===================================================================
const useSolanaWalletContextStrict = (): SolanaWalletContextType => {
  const context = useContext(SolanaWalletContext);
  if (!context) {
    throw new Error(
      'useSolanaWalletContextStrict must be used within a SolanaWalletProvider. ' +
        'This is an internal error - please report this bug.'
    );
  }
  return context;
};

// ===================================================================
// PROVIDER WRAPPER (Adapters + Context)
// ===================================================================

interface SolanaWalletProviderProps {
  children: ReactNode;
  autoConnect?: boolean;
  onConnectionChange?: (connected: boolean) => void;
  onError?: (error: any) => void;
}

const SolanaWalletInner: React.FC<SolanaWalletProviderProps> = ({
  children,
  autoConnect = true,
  onConnectionChange,
  onError,
}) => {
  // ===================================================================
  // STATE MANAGEMENT
  // ===================================================================

  const solanaWallet = useSolanaWallet();
  const [isProviderReady, setIsProviderReady] = useState(false);
  const [lastConnectionState, setLastConnectionState] = useState(false);

  // ===================================================================
  // EFFECT HANDLERS
  // ===================================================================

  // Sync wallet state to global store
  useEffect(() => {
    // ✅ Create proper WalletError object with correct WalletErrorCode
    const walletError: WalletError | null = solanaWallet.error
      ? {
          // Cast the fallback literal to the WalletError code type to satisfy the WalletError type.
          code: ('UNKNOWN' as unknown) as WalletError['code'],
          message: solanaWallet.error.message,
          timestamp: new Date(),
        }
      : null;

    // ✅ Build update object with only defined values (no undefined)
    const updates: any = {
      isConnected: !!solanaWallet.isConnected,
      isConnecting: !!solanaWallet.isConnecting,
      isDisconnecting: !!solanaWallet.isDisconnecting,
      error: walletError,
      chain: 'solana' as const,
    };

    // Only add optional properties if they have values
    if (solanaWallet.address) {
      updates.address = solanaWallet.address;
    }
    if (solanaWallet.balance) {
      updates.balance = solanaWallet.balance;
    }
    if (solanaWallet.publicKey) {
      updates.publicKey = solanaWallet.publicKey.toBase58();
    }
    if (solanaWallet.cluster) {
      updates.cluster = solanaWallet.cluster;
    }

    useWalletStore.getState().updateSolanaWallet(updates);

    // Maintain activeChain = 'solana' only when actually connected
    if (solanaWallet.isConnected && solanaWallet.address) {
      const { activeChain, setActiveChain } = useWalletStore.getState();
      if (activeChain !== 'solana') setActiveChain('solana');
    } else {
      // Clear only if no other chain is connected
      const state = useWalletStore.getState();
      const otherConnected =
        (state.stellar && state.stellar.isConnected) ||
        (state.evm && state.evm.isConnected);
      if (!otherConnected && state.activeChain === 'solana') {
        state.setActiveChain(null);
      }
    }
  }, [
    solanaWallet.address,
    solanaWallet.isConnected,
    solanaWallet.isConnecting,
    solanaWallet.isDisconnecting,
    solanaWallet.error,
    solanaWallet.balance,
    solanaWallet.publicKey,
    solanaWallet.cluster,
  ]);

  // Persist successful connections to localStorage
  useEffect(() => {
    if (solanaWallet.isConnected && solanaWallet.address) {
      try {
        const prevId = localStorage.getItem(solanaStorageKeys.WALLET_ID);
        const walletId = solanaWallet.walletType || prevId || 'phantom';
        localStorage.setItem(solanaStorageKeys.WALLET_ID, walletId);
        localStorage.setItem(solanaStorageKeys.LAST_ADDRESS, solanaWallet.address);
        localStorage.setItem(solanaStorageKeys.AUTO_CONNECT, 'true');
      } catch (e) {
        console.warn('[SolanaProvider] Failed persisting localStorage', e);
      }
    }
  }, [solanaWallet.isConnected, solanaWallet.address, solanaWallet.walletType]);

  // Handle initialization
  useEffect(() => {
    if (solanaWallet.isInitialized && !isProviderReady) {
      setIsProviderReady(true);
    }
  }, [solanaWallet.isInitialized, isProviderReady]);

  // Handle connection state changes
  useEffect(() => {
    if (solanaWallet.isConnected !== lastConnectionState) {
      setLastConnectionState(solanaWallet.isConnected);
      onConnectionChange?.(solanaWallet.isConnected);
    }
  }, [solanaWallet.isConnected, lastConnectionState, onConnectionChange]);

  // Handle errors
  useEffect(() => {
    if (solanaWallet.error) {
      // Check if this is an expected error (user rejection, auto-connect failure)
      const errorMessage = solanaWallet.error.message || '';
      const isExpectedError = 
        errorMessage.includes('Connection rejected') ||
        errorMessage.includes('User rejected') ||
        errorMessage.includes('rejected') ||
        errorMessage.includes('Failed to get public key');

      // Only log unexpected errors
      if (!isExpectedError) {
        console.error('❌ Solana wallet error:', solanaWallet.error);
      }
      
      // Always call onError callback (parent may want to handle it)
      onError?.(solanaWallet.error);
    }
  }, [solanaWallet.error, onError]);

  // Auto-connect on initialization
  useEffect(() => {
    if (!autoConnect || !isProviderReady) return;
    if (solanaWallet.isConnected || solanaWallet.isConnecting) return;

    const savedWalletId = localStorage.getItem(solanaStorageKeys.WALLET_ID);
    const savedAutoConnect = localStorage.getItem(solanaStorageKeys.AUTO_CONNECT) === 'true';
    const savedLastAddress = localStorage.getItem(solanaStorageKeys.LAST_ADDRESS);

    if (!savedAutoConnect) return;

    const tryReconnect = async () => {
      try {
        if (savedWalletId || savedLastAddress) {
          await solanaWallet.reconnect();
        }
      } catch (error) {
        console.warn('⚠️ Solana auto-connect failed:', error);
      }
    };

    tryReconnect();
  }, [
    autoConnect,
    isProviderReady,
    solanaWallet.isConnected,
    solanaWallet.isConnecting,
    solanaWallet.reconnect,
  ]);

  // ===================================================================
  // ENHANCED METHODS WITH ERROR HANDLING
  // ===================================================================

  const enhancedConnect = async (): Promise<WalletConnectionResult> => {
    try {
      const result = await solanaWallet.connect();
      return result;
    } catch (error) {
      console.error('❌ Solana wallet connection failed:', error);
      onError?.(error);
      return {
        success: false,
        address: null,
        error: {
          code: 'CONNECTION_FAILED' as any,
          message: 'Failed to connect wallet',
          details: error,
          timestamp: new Date(),
        },
      };
    }
  };

  const enhancedDisconnect = async (): Promise<void> => {
    try {
      await solanaWallet.disconnect();
    } catch (error) {
      console.error('❌ Solana wallet disconnection failed:', error);
      onError?.(error);
    }
  };

  const enhancedSwitchNetwork = async (cluster: Cluster): Promise<boolean> => {
    try {
      const success = await solanaWallet.switchNetwork(cluster);
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

  const contextValue: SolanaWalletContextType = {
    // Connection state
    wallet: {
      address: solanaWallet.address,
      isConnected: solanaWallet.isConnected,
      isConnecting: solanaWallet.isConnecting,
      isDisconnecting: solanaWallet.isDisconnecting,
      chain: 'solana',
      error: solanaWallet.error?.message ?? null,
      balance: solanaWallet.balance,
      publicKey: solanaWallet.publicKey?.toBase58() ?? null,
      cluster: solanaWallet.cluster,
      walletType: solanaWallet.walletType,
    },
    isInitialized: solanaWallet.isInitialized,
    currentCluster: solanaWallet.cluster || NETWORK,

    // Connection methods
    connect: enhancedConnect,
    disconnect: enhancedDisconnect,
    reconnect: solanaWallet.reconnect,

    // Balance methods
    getBalance: solanaWallet.getBalance,

    // Network methods
    switchNetwork: enhancedSwitchNetwork,

    // Utility methods
    formatAddress: solanaWallet.formatAddress,
    getExplorerUrl: solanaWallet.getExplorerUrl,

    // State helpers
    isWalletInstalled: solanaWallet.isWalletInstalled,
    canConnect: solanaWallet.canConnect,
    canDisconnect: solanaWallet.canDisconnect,
  };

  // Listen for global wallet requests (from UI components)
  useEffect(() => {
    const onRequestConnect = () => {
      if (solanaWallet.isConnected || solanaWallet.isConnecting) return;
      enhancedConnect().catch(() => {});
    };

    const onRequestDisconnect = () => {
      if (!solanaWallet.isConnected || solanaWallet.isDisconnecting) return;
      enhancedDisconnect().catch(() => {});
    };

    window.addEventListener('solana:request-connect', onRequestConnect);
    window.addEventListener('solana:request-disconnect', onRequestDisconnect);

    return () => {
      window.removeEventListener('solana:request-connect', onRequestConnect);
      window.removeEventListener('solana:request-disconnect', onRequestDisconnect);
    };
  }, [
    solanaWallet.isConnected,
    solanaWallet.isConnecting,
    solanaWallet.isDisconnecting,
  ]);

  // ===================================================================
  // LOADING STATE
  // ===================================================================

  if (!isProviderReady) {
    return (
      <div className="flex min-h-32 items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-2 h-8 w-8 animate-spin rounded-full border-b-2 border-indigo-600"></div>
          <p className="text-fg/70 text-sm">Initializing Solana wallet...</p>
        </div>
      </div>
    );
  }

  // ===================================================================
  // PROVIDER RENDER
  // ===================================================================

  return (
    <SolanaWalletContext.Provider value={contextValue}>
      {children}
    </SolanaWalletContext.Provider>
  );
};

// ===================================================================
// MAIN PROVIDER (Wallet Adapter Setup)
// ===================================================================

export const SolanaWalletProvider: React.FC<SolanaWalletProviderProps> = ({
  children,
  ...props
}) => {
  // Get network from environment or default to devnet
  // FORCE devnet for development (public mainnet RPC is rate-limited)
  const network = useMemo(() => {
    // Force devnet for development
    return 'devnet' as Cluster;
    // Uncomment below to allow env override:
    // const envNetwork = import.meta.env.VITE_SOLANA_NETWORK as Cluster | undefined;
    // if (envNetwork === 'mainnet-beta' || envNetwork === 'testnet' || envNetwork === 'devnet') {
    //   return envNetwork;
    // }
    // return 'devnet';
  }, []);

  // Get RPC endpoint
  const endpoint = useMemo(() => {
    const customRpc = import.meta.env.VITE_SOLANA_RPC_URL;
    if (customRpc) {
      return customRpc;
    }
    return getRpcEndpoint(network);
  }, [network]);

  // Configure wallet adapters
  const wallets = useMemo(
    () => [
      new PhantomWalletAdapter(),
      new SolflareWalletAdapter(),
    ],
    []
  );

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          <SolanaWalletInner {...props}>{children}</SolanaWalletInner>
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
};

// ===================================================================
// PUBLIC SAFE HOOK (returns null if no provider)
// Used by multi-chain components
// ===================================================================

export const useSolanaWalletContext = (): SolanaWalletContextType | null => {
  return useContext(SolanaWalletContext);
};

// ===================================================================
// CONVENIENCE HOOKS (use strict version internally)
// ===================================================================

/**
 * Hook to get Solana wallet connection state
 * ✅ Safe to call - uses strict version internally (only called within provider)
 */
export const useSolanaConnection = () => {
  const { wallet, isInitialized, connect, disconnect } = useSolanaWalletContextStrict(); // ✅ Fixed

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
 * Hook to get Solana wallet balance information
 * ✅ Safe to call - uses strict version internally (only called within provider)
 */
export const useSolanaBalance = () => {
  const { wallet, getBalance } = useSolanaWalletContextStrict(); // ✅ Fixed

  return {
    solBalance: wallet.balance || '0',
    getBalance,
    isLoading: wallet.isConnecting,
  };
};

/**
 * Hook to manage Solana network
 * ✅ Safe to call - uses strict version internally (only called within provider)
 */
export const useSolanaNetwork = () => {
  const { currentCluster, switchNetwork } = useSolanaWalletContextStrict(); // ✅ Fixed

  return {
    currentCluster,
    switchNetwork,
    isMainnet: currentCluster === 'mainnet-beta',
    isDevnet: currentCluster === 'devnet',
    isTestnet: currentCluster === 'testnet',
  };
};

// ===================================================================
// DEVELOPMENT HELPER
// ===================================================================

