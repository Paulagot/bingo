/**
 * Wallet Connection Hook
 *
 * Custom hook that manages wallet connection and disconnection for the Web3 launch step.
 * Provides a unified interface for connecting/disconnecting wallets across all supported
 * blockchains (Solana, EVM, Stellar).
 *
 * ## Responsibilities
 *
 * 1. **Connection Management**: Handles wallet connection via walletActions
 * 2. **Disconnection Management**: Handles wallet disconnection
 * 3. **Error Handling**: Catches and logs connection errors
 *
 * ## Usage
 *
 * ```typescript
 * const { handleConnect, handleDisconnect } = useWalletConnection({
 *   walletActions
 * });
 *
 * <button onClick={handleConnect}>Connect Wallet</button>
 * <button onClick={handleDisconnect}>Disconnect</button>
 * ```
 *
 * Used by StepWeb3ReviewLaunch component for wallet connection UI.
 */

import { useCallback } from 'react';
import type { WalletActions } from '@/hooks/useWalletActions';

/**
 * Hook Configuration
 */
export interface UseWalletConnectionConfig {
  /** Wallet actions hook */
  walletActions: WalletActions;
}

/**
 * Hook Return Value
 */
export interface UseWalletConnectionReturn {
  /** Function to connect wallet */
  handleConnect: () => Promise<void>;
  /** Function to disconnect wallet */
  handleDisconnect: () => Promise<void>;
}

/**
 * Wallet Connection Hook
 *
 * Manages wallet connection and disconnection operations.
 *
 * @param config - Hook configuration
 * @returns Connection handler functions
 */
export function useWalletConnection(
  config: UseWalletConnectionConfig
): UseWalletConnectionReturn {
  const { walletActions } = config;

  /**
   * Handle Wallet Connection
   *
   * Connects the user's wallet for the selected blockchain.
   * Handles errors gracefully and logs connection attempts.
   *
   * ## Error Handling
   *
   * - Catches connection errors
   * - Logs error details for debugging
   * - Does not throw (errors are handled by wallet provider)
   */
  const handleConnect = useCallback(async () => {
    try {
      const res = await walletActions.connect();
      if (!res.success) {
        throw new Error(res.error?.message || 'Wallet connection failed');
      }
    } catch (err) {
      console.error('[useWalletConnection] Wallet connection failed:', err);
      // Error is handled by wallet provider UI
    }
  }, [walletActions]);

  /**
   * Handle Wallet Disconnection
   *
   * Disconnects the user's wallet.
   * Handles errors gracefully and logs disconnection attempts.
   */
  const handleDisconnect = useCallback(async () => {
    try {
      await walletActions.disconnect();
    } catch (err) {
      console.error('[useWalletConnection] Wallet disconnection failed:', err);
      // Error is handled by wallet provider UI
    }
  }, [walletActions]);

  return {
    handleConnect,
    handleDisconnect,
  };
}

