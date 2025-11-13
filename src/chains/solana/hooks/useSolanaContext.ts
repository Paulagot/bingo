/**
 * @module chains/solana/hooks/useSolanaContext
 *
 * Solana Contract Context Hook
 *
 * ## Purpose
 *
 * This hook encapsulates provider detection, context creation, and memoization logic
 * for the Solana contract integration. It provides a single source of truth for the
 * `SolanaContractContext` that all API operations require.
 *
 * ## Architecture Decisions
 *
 * ### Provider Detection Strategy
 *
 * **Why Check Connection Instead of Wallet?**
 *
 * We check the `connection` object rather than `wallet.publicKey` because:
 *
 * 1. **Connection is more reliable**: The connection object is always present when a
 *    provider is mounted, even if the wallet isn't connected
 * 2. **Avoids error logs**: Accessing `wallet.publicKey` when no provider exists
 *    triggers error logs in the wallet adapter
 * 3. **Type safety**: The connection object has a clear structure (`rpcEndpoint`
 *    property) that we can check without type assertions
 * 4. **Early detection**: We can detect provider availability before checking wallet
 *    connection state
 *
 * ### Memoization Strategy
 *
 * **Provider Memoization**:
 * - Recreated when: `connection`, `publicKey`, `signTransaction`, or `wallet` changes
 * - Purpose: Avoid recreating AnchorProvider on every render
 * - Dependencies: All values used in provider creation
 *
 * **Program Memoization**:
 * - Recreated when: `provider` changes
 * - Purpose: Avoid recreating Program instance on every render
 * - Dependencies: Provider instance
 *
 * **Context Memoization**:
 * - Recreated when: `program`, `provider`, `publicKey`, or `connection` changes
 * - Purpose: Single source of truth for all API operations
 * - Dependencies: All values that affect context validity
 *
 * ### Error Handling
 *
 * Program creation errors are caught and logged, but don't throw. This allows:
 * - Hook to return safely even if program creation fails
 * - `isReady` flag to indicate when operations are safe
 * - Graceful degradation when program isn't available
 *
 * ## Context Structure
 *
 * The context includes:
 * - `program`: Anchor Program instance (null if not available)
 * - `provider`: AnchorProvider instance (null if wallet not connected)
 * - `publicKey`: Current wallet public key (null if not connected)
 * - `connected`: Boolean indicating wallet connection state
 * - `isReady`: Boolean indicating if operations are safe (requires publicKey and program)
 * - `connection`: Solana Connection instance
 *
 * ## Usage
 *
 * ```typescript
 * const context = useSolanaContext();
 *
 * if (!context.isReady) {
 *   return <div>Please connect your wallet</div>;
 * }
 *
 * // Use context for API operations
 * await someAPI(context, ...args);
 * ```
 *
 * ## Integration Points
 *
 * - Used by `useSolanaContract` to create context
 * - Used by all domain hooks for API operations
 * - Provides connection state to components
 */

import { useContext, useMemo } from 'react';
import { useConnection, useWallet, WalletContext } from '@solana/wallet-adapter-react';
import { Program, AnchorProvider } from '@coral-xyz/anchor';
import type { Idl } from '@coral-xyz/anchor';
import { TX_CONFIG } from '@/shared/lib/solana/config';
import BingoIDL from '@/idl/solana_bingo.json';
import type { SolanaContractContext } from '@/features/web3/solana/model/types';

/**
 * Creates and memoizes the Solana contract context
 *
 * ## Purpose
 *
 * This hook detects wallet provider availability, creates Anchor provider and program
 * instances, and provides a memoized context object for all API operations.
 *
 * ## Provider Detection
 *
 * The hook checks for provider availability by examining the connection object:
 *
 * 1. Checks if `connectionContext.connection` exists
 * 2. Verifies it's an object with `rpcEndpoint` property
 * 3. Returns safe defaults if no provider detected
 *
 * This approach avoids error logs that occur when accessing wallet properties
 * without a provider.
 *
 * ## Memoization
 *
 * All values are memoized to prevent unnecessary recreations:
 *
 * - **Provider**: Only recreated when connection/wallet changes
 * - **Program**: Only recreated when provider changes
 * - **Context**: Only recreated when dependencies change
 *
 * ## Return Value
 *
 * Returns `SolanaContractContext` with:
 * - `program`: Program instance or null
 * - `provider`: Provider instance or null
 * - `publicKey`: Wallet public key or null
 * - `connected`: Boolean connection state
 * - `isReady`: Boolean indicating if operations are safe
 * - `connection`: Connection instance
 *
 * @returns SolanaContractContext object with all required fields
 *
 * @example
 * ```typescript
 * const context = useSolanaContext();
 *
 * if (context.isReady) {
 *   // Safe to perform operations
 *   await createRoom(context, params);
 * }
 * ```
 */
export function useSolanaContext(): SolanaContractContext {
  // Check if WalletProvider exists - useContext is safe to call and won't throw
  // It returns DEFAULT_CONTEXT if no provider is mounted
  const walletContext = useContext(WalletContext);

  // Hooks MUST be called unconditionally (Rules of Hooks)
  // useConnection and useWallet return default contexts if provider doesn't exist
  // They don't throw, but accessing properties on default context logs errors
  const connectionContext = useConnection();
  const wallet = useWallet();

  // Check if we have a real provider by checking connection
  // Default connection context is {} (empty object cast as ConnectionContextState)
  // At runtime, connectionContext.connection is undefined for default context
  // Real provider has a valid Connection object with rpcEndpoint property
  // We can safely check if connection exists without triggering error logs
  const hasRealConnection =
    connectionContext &&
    connectionContext.connection !== undefined &&
    connectionContext.connection !== null &&
    typeof connectionContext.connection === 'object' &&
    'rpcEndpoint' in connectionContext.connection;

  // If no real connection, return safe defaults
  if (!hasRealConnection) {
    return {
      program: null,
      provider: null,
      publicKey: null,
      connected: false,
      isReady: false,
      connection: null as any, // Type assertion for safe defaults
    };
  }

  // Provider exists - safe to access properties
  // Note: Accessing wallet.publicKey might still log error if wallet not connected,
  // but that's expected behavior and won't cause render loops (only logs, doesn't throw)
  const { connection } = connectionContext;
  // Safe to access wallet properties now since we have a real provider
  // Even if wallet is not connected, publicKey will be null (not trigger error)
  const publicKey = wallet.publicKey;
  const signTransaction = wallet.signTransaction;

  // Memoize provider - only recreate when wallet/connection changes
  const provider = useMemo(() => {
    if (!publicKey || !signTransaction) return null;

    return new AnchorProvider(
      connection,
      wallet as any, // Anchor expects its own Wallet type
      {
        commitment: TX_CONFIG.commitment,
        preflightCommitment: TX_CONFIG.preflightCommitment,
        skipPreflight: TX_CONFIG.skipPreflight,
      }
    );
  }, [connection, publicKey, signTransaction, wallet]);

  // Memoize program instance - only recreate when provider changes
  const program = useMemo((): Program | null => {
    if (!provider) return null;

    try {
      return new Program(BingoIDL as Idl, provider);
    } catch (error) {
      console.error('[useSolanaContext] Failed to create program:', error);
      return null;
    }
  }, [provider]);

  // Memoize context - single source of truth for all API operations
  const context = useMemo((): SolanaContractContext => {
    return {
      program,
      provider,
      publicKey,
      connected: !!publicKey,
      isReady: !!publicKey && !!program,
      connection,
    };
  }, [program, provider, publicKey, connection]);

  return context;
}

