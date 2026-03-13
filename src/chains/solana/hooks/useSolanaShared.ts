/**
 * Shared Solana Hook - mirrors useEvmShared.ts
 * 
 * Provides connection, wallet, program instance with explicit cluster from config.
 * This is the foundation for all Solana operations.
 * 
 * ## Network Configuration
 * 
 * Unlike EVM where wagmi handles network detection automatically, Solana requires
 * explicit cluster configuration:
 * 1. Get the cluster directly from QuizConfig (stored when room is created)
 * 2. Use that cluster to create the correct RPC connection directly — do NOT use
 *    useAppKitConnection, it returns whichever network the wallet is on (mainnet)
 *    rather than the configured cluster.
 * 3. AppKit manages wallet signing only — we manage network/connection configuration.
 * 
 * ## Usage
 * 
 * ```typescript
 * const { publicKey, program, connection, isConnected, cluster } = useSolanaShared(setupConfig);
 * 
 * if (!isConnected) {
 *   return <ConnectWallet />;
 * }
 * 
 * // Use program, connection, publicKey for operations
 * ```
 */

import { useMemo } from 'react';
import { useAppKitAccount, useAppKitProvider } from '@reown/appkit/react';
import { PublicKey, Connection } from '@solana/web3.js';
import { AnchorProvider, Program } from '@coral-xyz/anchor';
import type { Idl } from '@coral-xyz/anchor';

import QuizCoreIDL from '../quiz_core.json';
import { SOLANA_CONTRACT } from '../config/contracts';
import {
  getSolanaExplorerUrl,
  getSolanaRpcUrl,
  type SolanaNetworkKey,
} from '../config/networks';
import type { QuizConfig } from '@/components/Quiz/types/quiz';

const debug = false;

export interface UseSolanaSharedParams {
  /**
   * Optional QuizConfig to get the expected cluster
   * If provided, we use the explicit cluster from config
   */
  setupConfig?: QuizConfig | null;
}

export interface UseSolanaSharedResult {
  publicKey: PublicKey | null;
  connection: Connection | null;
  provider: AnchorProvider | null;
  program: Program | null;
  isConnected: boolean;

  /**
   * Cluster from QuizConfig (explicit, not detected)
   */
  cluster: SolanaNetworkKey;

  /**
   * Expected cluster from QuizConfig (same as cluster)
   */
  expectedCluster?: SolanaNetworkKey;

  /**
   * Whether user is on the correct network
   * Always true for Solana since we use explicit cluster from config
   */
  isCorrectNetwork: boolean;

  /**
   * Explorer URL for current cluster
   */
  explorerUrl: string;

  /**
   * Get transaction explorer URL
   */
  getTxExplorerUrl: (signature: string) => string;

  /**
   * Get address explorer URL
   */
  getAddressExplorerUrl: (address: string) => string;
}

export function useSolanaShared(params?: UseSolanaSharedParams): UseSolanaSharedResult {
  const { setupConfig } = params || {};

  // Get wallet state from AppKit — used for signing only, NOT for connection/RPC
  const { address, isConnected } = useAppKitAccount();
  const { walletProvider } = useAppKitProvider('solana');

  if (debug) console.log('[Solana][Shared] 🔌 AppKit Wallet State:', {
    address,
    isConnected,
    hasWalletProvider: !!walletProvider,
  });

  // ✅ Get cluster EXPLICITLY from config, don't try to detect it from AppKit
  const cluster = useMemo(() => {
    const stored = setupConfig?.solanaCluster as SolanaNetworkKey | undefined;
    const resolved = stored || 'devnet'; // Default to devnet

    if (debug) console.log('[Solana][Shared] 📋 Cluster from config:', {
      fromConfig: stored,
      resolved,
    });

    return resolved;
  }, [setupConfig?.solanaCluster]);

  // Expected cluster is same as cluster (we use explicit config, not detection)
  const expectedCluster = cluster;

  // ✅ Since we use explicit cluster from config, we're always on "correct" network
  const isCorrectNetwork = true;

  // ✅ Build connection directly from cluster config — bypasses AppKit's connection
  // which follows the wallet's network (mainnet) rather than our configured cluster.
  const connection = useMemo(() => {
    const rpcUrl = getSolanaRpcUrl(cluster);
    if (debug) console.log('[Solana][Shared] 🔗 Creating connection to:', rpcUrl);
    return new Connection(rpcUrl, 'confirmed');
  }, [cluster]);

  // Convert address string to PublicKey
  const publicKey = useMemo(() => {
    if (!address) {
      if (debug) console.log('[Solana][Shared] ❌ No wallet address');
      return null;
    }

    try {
      const pk = new PublicKey(address);
      if (debug) console.log('[Solana][Shared] ✅ PublicKey created:', pk.toBase58());
      return pk;
    } catch (error) {
      if (debug) console.error('[Solana][Shared] ❌ Failed to create PublicKey:', error);
      return null;
    }
  }, [address]);

  // Create Anchor wallet adapter from AppKit wallet provider (signing only)
  const walletAdapter = useMemo(() => {
    if (!walletProvider || !publicKey) {
      if (debug) console.log('[Solana][Shared] ⏳ Wallet adapter not ready:', {
        hasProvider: !!walletProvider,
        hasPublicKey: !!publicKey,
      });
      return null;
    }

    const provider = walletProvider as any;

    if (debug) console.log('[Solana][Shared] ✅ Creating wallet adapter');

    return {
      publicKey,
      signTransaction: async (tx: any) => {
        if (debug) console.log('[Solana][Shared] ✍️  Signing transaction...');
        return provider.signTransaction(tx);
      },
      signAllTransactions: async (txs: any[]) => {
        if (debug) console.log('[Solana][Shared] ✍️  Signing', txs.length, 'transactions...');
        return provider.signAllTransactions(txs);
      },
    };
  }, [walletProvider, publicKey]);

  // Create Anchor provider — connection is now always the correct cluster RPC
  const provider = useMemo(() => {
    if (!walletAdapter || !connection) {
      if (debug) console.log('[Solana][Shared] ⏳ Provider not ready:', {
        hasWalletAdapter: !!walletAdapter,
        hasConnection: !!connection,
      });
      return null;
    }

    if (debug) console.log('[Solana][Shared] ✅ Creating AnchorProvider with cluster:', cluster);

    return new AnchorProvider(
      connection,
      walletAdapter as any,
      {
        commitment: 'confirmed',
        preflightCommitment: 'confirmed',
      }
    );
  }, [walletAdapter, connection]);

  // Create program instance
  const program = useMemo(() => {
    if (!provider) {
      if (debug) console.log('[Solana][Shared] ⏳ Program not ready: no provider');
      return null;
    }

    try {
      const programId = SOLANA_CONTRACT.PROGRAM_ID.toBase58();

      if (debug) console.log('[Solana][Shared] ✅ Creating Program instance');
      if (debug) console.log('[Solana][Shared] 📍 Program ID:', programId);
      if (debug) console.log('[Solana][Shared] 🌐 Cluster:', cluster);

      return new Program(QuizCoreIDL as Idl, provider);
    } catch (error) {
      if (debug) console.error('[Solana][Shared] ❌ Failed to create program:', error);
      return null;
    }
  }, [provider]);

  // Explorer URLs
  const explorerUrl = useMemo(() => {
    return getSolanaExplorerUrl(cluster);
  }, [cluster]);

  const getTxExplorerUrl = (signature: string): string => {
    if (cluster === 'mainnet') {
      return `${explorerUrl}/tx/${signature}`;
    }
    return `${explorerUrl}/tx/${signature}?cluster=${cluster}`;
  };

  const getAddressExplorerUrl = (address: string): string => {
    if (cluster === 'mainnet') {
      return `${explorerUrl}/address/${address}`;
    }
    return `${explorerUrl}/address/${address}?cluster=${cluster}`;
  };

  const isFullyConnected = isConnected && !!publicKey && !!program && isCorrectNetwork;

  if (debug) console.log('[Solana][Shared] 🎯 Final State:', {
    isConnected,
    hasPublicKey: !!publicKey,
    hasProgram: !!program,
    isCorrectNetwork,
    isFullyConnected,
    cluster,
    expectedCluster,
  });

  return {
    publicKey,
    connection,
    provider,
    program,
    isConnected: isFullyConnected,
    cluster,
    expectedCluster,
    isCorrectNetwork,
    explorerUrl,
    getTxExplorerUrl,
    getAddressExplorerUrl,
  };
}