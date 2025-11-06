/**
 * Solana Wallet Hook
 *
 * Provides wallet connection, disconnection, and balance management for Solana blockchain.
 * Wraps @solana/wallet-adapter-react with state synchronization to global walletStore.
 * Handles auto-connect, localStorage persistence, and network switching.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { LAMPORTS_PER_SOL, type Cluster } from '@solana/web3.js';
import { useWalletStore } from '../../stores/walletStore';
import type { WalletConnectionResult,WalletError } from '../types';
import { WalletErrorCode } from '../types';
import { solanaStorageKeys, NETWORK } from './config';

export const useSolanaWallet = () => {
  // ===================================================================
  // STATE MANAGEMENT
  // ===================================================================

  const solanaWallet = useWallet();
  const { connection } = useConnection();
  const { setVisible } = useWalletModal();
  const { solana: solanaState, updateSolanaWallet,  setActiveChain } = useWalletStore();

  const [isInitialized, setIsInitialized] = useState(false);
  const [currentCluster, setCurrentCluster] = useState<Cluster>(NETWORK);
  const [balance, setBalance] = useState<string>('0');

  const mountedRef = useRef(true);
  const balanceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // ===================================================================
  // UTILITY FUNCTIONS
  // ===================================================================

  const createWalletError = (
    code: WalletErrorCode,
    message: string,
    details?: any
  ): WalletError => ({
    code,
    message,
    details,
    timestamp: new Date(),
  });

  // ===================================================================
  // BALANCE MANAGEMENT
  // ===================================================================

  const fetchBalance = useCallback(async (address?: string): Promise<string> => {
    const targetAddress = address || solanaWallet.publicKey?.toBase58();

    if (!targetAddress || !connection) {
      return '0';
    }

    try {
      const pubKey = solanaWallet.publicKey;
      if (!pubKey) return '0';

      const lamports = await connection.getBalance(pubKey);
      const sol = (lamports / LAMPORTS_PER_SOL).toFixed(4);
      setBalance(sol);
      return sol;
    } catch (error) {
      console.error('[Solana] Balance fetch failed:', error);
      return '0';
    }
  }, [connection, solanaWallet.publicKey]);

  const getBalance = useCallback(
    async (tokenAddress?: string): Promise<string> => {
      if (tokenAddress) {
        // TODO: Implement SPL token balance fetching
        console.warn('[Solana] SPL token balance not yet implemented');
        return '0';
      }
      return fetchBalance();
    },
    [fetchBalance]
  );

  // Start polling balance
  const startBalancePolling = useCallback(() => {
    if (balanceTimerRef.current) {
      clearInterval(balanceTimerRef.current);
    }

    if (solanaWallet.connected && solanaWallet.publicKey) {
      // Initial fetch
      fetchBalance();

      // Poll every 10 seconds
      balanceTimerRef.current = setInterval(() => {
        if (mountedRef.current && solanaWallet.connected) {
          fetchBalance();
        }
      }, 10000);
    }
  }, [solanaWallet.connected, solanaWallet.publicKey, fetchBalance]);

  const stopBalancePolling = useCallback(() => {
    if (balanceTimerRef.current) {
      clearInterval(balanceTimerRef.current);
      balanceTimerRef.current = null;
    }
  }, []);

  // ===================================================================
  // CONNECTION METHODS
  // ===================================================================

  const connect = useCallback(async (): Promise<WalletConnectionResult> => {
    try {
      updateSolanaWallet({ isConnecting: true, error: undefined });

      // If already connected, just return success
      if (solanaWallet.connected && solanaWallet.publicKey) {
        updateSolanaWallet({ isConnecting: false });
        return {
          success: true,
          address: solanaWallet.publicKey.toBase58(),
        };
      }

      // If no wallet selected, show the modal for user to choose
      if (!solanaWallet.wallet) {
        console.log('🔓 No wallet selected, opening wallet modal...');
        setVisible(true);

        // Wait for user to select a wallet from the modal
        // The modal will handle the connection automatically
        return new Promise((resolve) => {
          // Check every 500ms if wallet got connected
          const checkInterval = setInterval(() => {
            if (solanaWallet.connected && solanaWallet.publicKey) {
              clearInterval(checkInterval);
              const address = solanaWallet.publicKey.toBase58();

              updateSolanaWallet({
                address,
                publicKey: address,
                isConnected: true,
                isConnecting: false,
                error: undefined,
                cluster: currentCluster,
              });

              setActiveChain('solana');
              startBalancePolling();

              console.log('✅ Solana wallet connected via modal:', address);

              resolve({
                success: true,
                address,
              });
            }
          }, 500);

          // Timeout after 60 seconds
          setTimeout(() => {
            clearInterval(checkInterval);
            if (!solanaWallet.connected) {
              updateSolanaWallet({ isConnecting: false });
              resolve({
                success: false,
                address: null,
                error: createWalletError(
                  WalletErrorCode.CONNECTION_FAILED,
                  'Wallet connection timed out or was cancelled'
                ),
              });
            }
          }, 60000);
        });
      }

      // Wallet already selected, just connect
      await solanaWallet.connect();

      if (solanaWallet.publicKey) {
        const address = solanaWallet.publicKey.toBase58();
        const walletName = solanaWallet.wallet?.adapter.name || 'unknown';

        // Save to localStorage
        localStorage.setItem(solanaStorageKeys.WALLET_ID, walletName);
        localStorage.setItem(solanaStorageKeys.LAST_ADDRESS, address);
        localStorage.setItem(solanaStorageKeys.AUTO_CONNECT, 'true');

        updateSolanaWallet({
          address,
          publicKey: solanaWallet.publicKey.toBase58(),
          isConnected: true,
          isConnecting: false,
          error: undefined,
          cluster: currentCluster,
        });

        setActiveChain('solana');
        startBalancePolling();

        console.log('✅ Solana wallet connected:', address);

        return {
          success: true,
          address,
        };
      }

      throw new Error('Failed to get public key from wallet');
    } catch (error: any) {
      const walletError = createWalletError(
        WalletErrorCode.CONNECTION_FAILED,
        error.message || 'Failed to connect Solana wallet',
        error
      );

      updateSolanaWallet({
        isConnecting: false,
        error: walletError
      });

      console.error('❌ Solana connection failed:', error);

      return {
        success: false,
        address: null,
        error: walletError,
      };
    }
  }, [
    solanaWallet,
    updateSolanaWallet,
    setActiveChain,
    currentCluster,
    startBalancePolling,
  ]);

  const disconnect = useCallback(async (): Promise<void> => {
    try {
      updateSolanaWallet({ isDisconnecting: true });

      await solanaWallet.disconnect();

      stopBalancePolling();

      // Clear localStorage
      localStorage.removeItem(solanaStorageKeys.AUTO_CONNECT);

      updateSolanaWallet({
        address: undefined,
        publicKey: undefined,
        isConnected: false,
        isDisconnecting: false,
        error: undefined,
        balance: undefined,
      });

      // Clear active chain if Solana was active
      const state = useWalletStore.getState();
      if (state.activeChain === 'solana') {
        const otherConnected =
          (state.stellar && state.stellar.isConnected) ||
          (state.evm && state.evm.isConnected);
        if (!otherConnected) {
          setActiveChain(null);
        }
      }

      console.log('✅ Solana wallet disconnected');
    } catch (error: any) {
      console.error('❌ Solana disconnection failed:', error);
      updateSolanaWallet({ isDisconnecting: false });
    }
  }, [solanaWallet, updateSolanaWallet, setActiveChain, stopBalancePolling]);

  const reconnect = useCallback(async (): Promise<void> => {
    const savedAutoConnect = localStorage.getItem(solanaStorageKeys.AUTO_CONNECT) === 'true';
    const savedWalletId = localStorage.getItem(solanaStorageKeys.WALLET_ID);

    if (!savedAutoConnect || solanaWallet.connected) {
      return;
    }

    try {
      // Try to select the previously used wallet
      if (savedWalletId) {
        const wallet = solanaWallet.wallets.find(
          (w) => w.adapter.name === savedWalletId
        );
        if (wallet) {
          solanaWallet.select(wallet.adapter.name);
        }
      }

      await connect();
    } catch (error) {
      console.warn('[Solana] Auto-reconnect failed:', error);
    }
  }, [solanaWallet, connect]);

  // ===================================================================
  // NETWORK METHODS
  // ===================================================================

  const switchNetwork = useCallback(
    async (cluster: Cluster): Promise<boolean> => {
      try {
        // This would require reconnecting with a different RPC endpoint
        // For now, we just update the stored cluster preference
        setCurrentCluster(cluster);
        localStorage.setItem(solanaStorageKeys.NETWORK, cluster);

        console.log(`✅ Switched to Solana ${cluster}`);

        // Note: Full implementation would require updating the ConnectionProvider
        // which is set at the provider level, not here
        return true;
      } catch (error) {
        console.error('[Solana] Network switch failed:', error);
        return false;
      }
    },
    []
  );

  // ===================================================================
  // UTILITY METHODS
  // ===================================================================

  const formatAddress = (address: string): string => {
    if (!address || address.length < 8) return address;
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
  };

  const getExplorerUrl = (type: 'transaction' | 'account' | 'token', identifier: string): string => {
    const base = currentCluster === 'mainnet-beta'
      ? 'https://solscan.io'
      : 'https://solscan.io';
    const clusterParam = currentCluster !== 'mainnet-beta' ? `?cluster=${currentCluster}` : '';

    switch (type) {
      case 'transaction':
        return `${base}/tx/${identifier}${clusterParam}`;
      case 'account':
        return `${base}/account/${identifier}${clusterParam}`;
      case 'token':
        return `${base}/token/${identifier}${clusterParam}`;
      default:
        return base;
    }
  };

  const isWalletInstalled = (): boolean => {
    return solanaWallet.wallets.length > 0;
  };

  // ===================================================================
  // EFFECT HANDLERS
  // ===================================================================

  // Initialize
  useEffect(() => {
    if (!isInitialized) {
      setIsInitialized(true);
      console.log('✅ Solana wallet hook initialized');
    }
  }, [isInitialized]);

  // Sync wallet state to global store
  useEffect(() => {
    if (solanaWallet.connected && solanaWallet.publicKey) {
      updateSolanaWallet({
        address: solanaWallet.publicKey.toBase58(),
        publicKey: solanaWallet.publicKey.toBase58(),
        isConnected: true,
        cluster: currentCluster,
      });
    }
  }, [solanaWallet.connected, solanaWallet.publicKey, currentCluster, updateSolanaWallet]);

  // Handle balance updates
  useEffect(() => {
    if (balance !== solanaState.balance) {
      updateSolanaWallet({ balance });
    }
  }, [balance, solanaState.balance, updateSolanaWallet]);

  // Start/stop balance polling based on connection
  useEffect(() => {
    if (solanaWallet.connected && solanaWallet.publicKey) {
      startBalancePolling();
    } else {
      stopBalancePolling();
    }

    return () => {
      stopBalancePolling();
    };
  }, [solanaWallet.connected, solanaWallet.publicKey, startBalancePolling, stopBalancePolling]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false;
      stopBalancePolling();
    };
  }, [stopBalancePolling]);

  // ===================================================================
  // RETURN HOOK INTERFACE
  // ===================================================================

  return {
    // Connection state
    address: solanaWallet.publicKey?.toBase58() || null,
    isConnected: solanaWallet.connected,
    isConnecting: solanaWallet.connecting,
    isDisconnecting: solanaState.isDisconnecting || false,
    error: solanaState.error || null,
    publicKey: solanaWallet.publicKey,
    balance,

    // Wallet info
    walletType: solanaWallet.wallet?.adapter.name,
    cluster: currentCluster,

    // Connection methods
    connect,
    disconnect,
    reconnect,

    // Balance methods
    getBalance,

    // Network methods
    switchNetwork,

    // Utility methods
    formatAddress,
    getExplorerUrl,
    isWalletInstalled,

    // State
    isInitialized,
    canConnect: !solanaWallet.connected && !solanaWallet.connecting,
    canDisconnect: solanaWallet.connected && !solanaState.isDisconnecting,
  };
};
