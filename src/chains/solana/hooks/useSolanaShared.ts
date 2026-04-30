// src/chains/solana/hooks/useSolanaShared.ts

/**
 * Shared Solana Hook - mirrors useEvmShared.ts
 *
 * Provides connection, wallet, program instance with explicit cluster from config.
 * This is the foundation for all Solana operations.
 *
 * Important:
 * - Smart-contract flows can use `program`, `provider`, `isConnected`.
 * - Direct wallet-transfer flows can use `sendTransaction`, `walletProvider`,
 *   and `isWalletConnected` without requiring the Anchor program to be ready.
 */

import { useCallback, useMemo } from 'react';
import { useAppKitAccount, useAppKitProvider } from '@reown/appkit/react';
import { PublicKey, Connection, Transaction } from '@solana/web3.js';
import { AnchorProvider, Program } from '@coral-xyz/anchor';
import type { Idl } from '@coral-xyz/anchor';

import NewQuizIDL from '../newquiz.json';
import {
  getSolanaExplorerUrl,
  getSolanaRpcUrl,
  type SolanaNetworkKey,
} from '../config/networks';
import type { QuizConfig } from '@/components/Quiz/types/quiz';

const debug = false;

export interface UseSolanaSharedParams {
  /**
   * Optional QuizConfig to get the expected cluster.
   * If provided, we use the explicit cluster from config.
   */
  setupConfig?: QuizConfig | null;

  /**
   * Optional direct cluster override.
   * Useful for non-contract direct payment flows.
   */
  clusterOverride?: SolanaNetworkKey | null;
}

export interface UseSolanaSharedResult {
  publicKey: PublicKey | null;
  connection: Connection | null;

  /**
   * AnchorProvider for contract-based flows.
   */
  provider: AnchorProvider | null;

  /**
   * Raw AppKit Solana wallet provider.
   * Useful for direct wallet operations.
   */
  walletProvider: any | null;

  /**
   * Anchor program for smart-contract quiz flows.
   */
  program: Program | null;

  /**
   * Contract-ready connection state.
   * Requires wallet + program.
   */
  isConnected: boolean;

  /**
   * Wallet-ready connection state.
   * Does NOT require the Anchor program.
   * Use this for direct transfer flows.
   */
  isWalletConnected: boolean;

  /**
   * Sends a Solana transaction using the wallet provider.
   * Prefers walletProvider.sendTransaction when available.
   */
  sendTransaction: (
    tx: Transaction,
    connectionOverride?: Connection
  ) => Promise<string>;

  /**
   * Cluster from explicit config/override.
   */
  cluster: SolanaNetworkKey;

  /**
   * Expected cluster from config.
   */
  expectedCluster?: SolanaNetworkKey;

  /**
   * Always true because we use explicit cluster/RPC rather than wallet network.
   */
  isCorrectNetwork: boolean;

  /**
   * Explorer URL for current cluster.
   */
  explorerUrl: string;

  /**
   * Get transaction explorer URL.
   */
  getTxExplorerUrl: (signature: string) => string;

  /**
   * Get address explorer URL.
   */
  getAddressExplorerUrl: (address: string) => string;
}

function resolveSolanaProvider(walletProvider: any) {
  if (!walletProvider) return null;

  if (
    typeof walletProvider.sendTransaction === 'function' ||
    typeof walletProvider.signTransaction === 'function'
  ) {
    return walletProvider;
  }

  if (
    walletProvider.provider &&
    (typeof walletProvider.provider.sendTransaction === 'function' ||
      typeof walletProvider.provider.signTransaction === 'function')
  ) {
    return walletProvider.provider;
  }

  if (
    walletProvider.wallet &&
    (typeof walletProvider.wallet.sendTransaction === 'function' ||
      typeof walletProvider.wallet.signTransaction === 'function')
  ) {
    return walletProvider.wallet;
  }

  return walletProvider;
}

export function useSolanaShared(
  params?: UseSolanaSharedParams
): UseSolanaSharedResult {
  const { setupConfig, clusterOverride } = params || {};

  /**
   * Wallet state from AppKit.
   * Used for signing only — NOT for RPC/network selection.
   */
  const { address, isConnected: appKitConnected } = useAppKitAccount();
  const { walletProvider } = useAppKitProvider('solana');

  if (debug) {
    console.log('[Solana][Shared] 🔌 AppKit Wallet State:', {
      address,
      appKitConnected,
      hasWalletProvider: !!walletProvider,
    });
  }

  /**
   * Explicit cluster.
   *
   * Priority:
   * 1. clusterOverride
   * 2. setupConfig.solanaCluster
   * 3. mainnet
   */
  const cluster = useMemo(() => {
    const fromOverride = clusterOverride || undefined;
    const fromConfig = setupConfig?.solanaCluster as SolanaNetworkKey | undefined;
    const resolved = fromOverride || fromConfig || 'mainnet';

    if (debug) {
      console.log('[Solana][Shared] 📋 Cluster resolved:', {
        fromOverride,
        fromConfig,
        resolved,
      });
    }

    return resolved;
  }, [clusterOverride, setupConfig?.solanaCluster]);

  const expectedCluster = cluster;

  /**
   * We use explicit connection/RPC from config, so we do not rely on
   * wallet network detection here.
   */
  const isCorrectNetwork = true;

  /**
   * Build connection directly from configured cluster.
   */
  const connection = useMemo(() => {
    const rpcUrl = getSolanaRpcUrl(cluster);
    const wsUrl = rpcUrl
      .replace(/^https:\/\//, 'wss://')
      .replace(/^http:\/\//, 'ws://');

    if (debug) {
      console.log('[Solana][Shared] 🔗 Creating connection to:', rpcUrl);
      console.log('[Solana][Shared] 🔌 Using ws endpoint:', wsUrl);
    }

    return new Connection(rpcUrl, {
      commitment: 'confirmed',
      wsEndpoint: wsUrl,
    });
  }, [cluster]);

  /**
   * Convert AppKit address string to PublicKey.
   */
  const publicKey = useMemo(() => {
    if (!address) {
      if (debug) console.log('[Solana][Shared] ❌ No wallet address');
      return null;
    }

    try {
      const pk = new PublicKey(address);
      if (debug) {
        console.log('[Solana][Shared] ✅ PublicKey created:', pk.toBase58());
      }
      return pk;
    } catch (error) {
      if (debug) {
        console.error('[Solana][Shared] ❌ Failed to create PublicKey:', error);
      }
      return null;
    }
  }, [address]);

  /**
   * Anchor wallet adapter.
   * Used by AnchorProvider/program flows.
   */
  const walletAdapter = useMemo(() => {
    if (!walletProvider || !publicKey) {
      if (debug) {
        console.log('[Solana][Shared] ⏳ Wallet adapter not ready:', {
          hasProvider: !!walletProvider,
          hasPublicKey: !!publicKey,
        });
      }
      return null;
    }

   const rawProvider = resolveSolanaProvider(walletProvider);

    if (debug) console.log('[Solana][Shared] ✅ Creating wallet adapter');

    return {
      publicKey,
      signTransaction: async (tx: any) => {
        if (debug) console.log('[Solana][Shared] ✍️ Signing transaction...');
        return rawProvider.signTransaction(tx);
      },
      signAllTransactions: async (txs: any[]) => {
        if (debug) {
          console.log('[Solana][Shared] ✍️ Signing', txs.length, 'transactions...');
        }
        return rawProvider.signAllTransactions(txs);
      },
    };
  }, [walletProvider, publicKey]);

  /**
   * Anchor provider.
   * Used for smart-contract quiz flows.
   */
  const provider = useMemo(() => {
    if (!walletAdapter || !connection) {
      if (debug) {
        console.log('[Solana][Shared] ⏳ Provider not ready:', {
          hasWalletAdapter: !!walletAdapter,
          hasConnection: !!connection,
        });
      }
      return null;
    }

    if (debug) {
      console.log('[Solana][Shared] ✅ Creating AnchorProvider with cluster:', cluster);
    }

    return new AnchorProvider(connection, walletAdapter as any, {
      commitment: 'confirmed',
      preflightCommitment: 'confirmed',
    });
  }, [walletAdapter, connection, cluster]);

  /**
   * Send transaction helper.
   *
   * Preferred:
   * - walletProvider.sendTransaction(tx, connection)
   *
   * Fallback:
   * - walletProvider.signTransaction(tx)
   * - connection.sendRawTransaction(...)
   */
  const sendTransaction = useCallback(
    async (tx: Transaction, connectionOverride?: Connection): Promise<string> => {
      if (!walletProvider) {
        throw new Error('Solana wallet provider is not ready');
      }

      if (!publicKey) {
        throw new Error('Solana wallet is not connected');
      }

      const activeConnection = connectionOverride || connection;

      if (!activeConnection) {
        throw new Error('Solana connection is not ready');
      }

      const rawProvider = walletProvider as any;

      if (debug) {
console.log('[Solana][Shared] 🚀 Sending transaction via wallet provider', {
  hasSendTransaction: typeof rawProvider?.sendTransaction === 'function',
  hasSignTransaction: typeof rawProvider?.signTransaction === 'function',
  providerKeys: Object.keys(rawProvider || {}),
  wrapperKeys: Object.keys(walletProvider || {}),
  instructionCount: tx.instructions.length,
  feePayer: tx.feePayer?.toBase58?.(),
  cluster,
});
      }

      /**
       * Always make sure the tx has fee payer and blockhash.
       * Some wallets set this themselves, but this keeps behaviour consistent.
       */
      const latestBlockhash = await activeConnection.getLatestBlockhash('confirmed');

      tx.feePayer = tx.feePayer || publicKey;
      tx.recentBlockhash = tx.recentBlockhash || latestBlockhash.blockhash;

      /**
       * Preferred path.
       * Wallets usually display clearer transaction information here.
       */
      if (typeof rawProvider.sendTransaction === 'function') {
        return rawProvider.sendTransaction(tx, activeConnection, {
          skipPreflight: false,
          preflightCommitment: 'confirmed',
        });
      }

      /**
       * Fallback path.
       */
      if (typeof rawProvider.signTransaction !== 'function') {
        throw new Error('Connected Solana wallet cannot sign transactions');
      }

      const signedTx = await rawProvider.signTransaction(tx);

      return activeConnection.sendRawTransaction(signedTx.serialize(), {
        skipPreflight: false,
        preflightCommitment: 'confirmed',
      });
    },
    [walletProvider, publicKey, connection, cluster]
  );

  /**
   * Anchor program.
   * Contract-based flows use this.
   */
  const program = useMemo(() => {
    if (!provider) {
      if (debug) console.log('[Solana][Shared] ⏳ Program not ready: no provider');
      return null;
    }

    try {
      if (debug) {
        console.log('[Solana][Shared] ✅ Creating Program instance');
        console.log('[Solana][Shared] 📍 Program ID (IDL):', (NewQuizIDL as any).address);
        console.log('[Solana][Shared] 🌐 Cluster:', cluster);
      }

      return new Program(NewQuizIDL as Idl, provider);
    } catch (error) {
      if (debug) {
        console.error('[Solana][Shared] ❌ Failed to create program:', error);
      }
      return null;
    }
  }, [provider, cluster]);

  const explorerUrl = useMemo(() => {
    return getSolanaExplorerUrl(cluster);
  }, [cluster]);

  const getTxExplorerUrl = useCallback(
    (signature: string): string => {
      if (cluster === 'mainnet') {
        return `${explorerUrl}/tx/${signature}`;
      }

      return `${explorerUrl}/tx/${signature}?cluster=${cluster}`;
    },
    [cluster, explorerUrl]
  );

  const getAddressExplorerUrl = useCallback(
    (addr: string): string => {
      if (cluster === 'mainnet') {
        return `${explorerUrl}/address/${addr}`;
      }

      return `${explorerUrl}/address/${addr}?cluster=${cluster}`;
    },
    [cluster, explorerUrl]
  );

  /**
   * Wallet-only state for direct payments.
   */
  const isWalletConnected = !!appKitConnected && !!publicKey && !!walletProvider;

  /**
   * Full contract-ready state.
   */
  const isFullyConnected =
    isWalletConnected && !!program && isCorrectNetwork;

  if (debug) {
    console.log('[Solana][Shared] 🎯 Final State:', {
      appKitConnected,
      hasPublicKey: !!publicKey,
      hasWalletProvider: !!walletProvider,
      hasProgram: !!program,
      isWalletConnected,
      isCorrectNetwork,
      isFullyConnected,
      cluster,
      expectedCluster,
    });
  }

  return {
    publicKey,
    connection,
    provider,
    walletProvider,
    program,
    isConnected: isFullyConnected,
    isWalletConnected,
    sendTransaction,
    cluster,
    expectedCluster,
    isCorrectNetwork,
    explorerUrl,
    getTxExplorerUrl,
    getAddressExplorerUrl,
  };
}