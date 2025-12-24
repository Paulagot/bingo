/**
 * Shared Solana Hook - mirrors useEvmShared.ts
 * 
 * Provides connection, wallet, program instance with network detection from AppKit.
 * This is the foundation for all Solana operations.
 * 
 * ## Network Detection
 * 
 * Unlike EVM where wagmi handles network detection automatically, Solana requires
 * us to:
 * 1. Get the cluster from QuizConfig (stored when room is created)
 * 2. Use AppKit's network.id to detect current network
 * 3. Compare them to ensure user is on correct network
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
import { useAppKitAccount, useAppKitProvider, useAppKitNetwork } from '@reown/appkit/react';
import { useAppKitConnection } from '@reown/appkit-adapter-solana/react';
import { PublicKey, Connection } from '@solana/web3.js';
import { AnchorProvider, Program } from '@coral-xyz/anchor';
import type { Idl } from '@coral-xyz/anchor';

import QuizCoreIDL from '../quiz_core.json';
import { SOLANA_CONTRACT } from '../config/contracts';
import { 
  getSolanaKeyByChainId, 
  getSolanaExplorerUrl,
  type SolanaNetworkKey 
} from '../config/networks';
import type { QuizConfig } from '@/components/Quiz/types/quiz';

export interface UseSolanaSharedParams {
  /**
   * Optional QuizConfig to get the expected cluster
   * If provided, we can validate user is on correct network
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
   * Current cluster detected from AppKit
   */
  cluster: SolanaNetworkKey;
  
  /**
   * Expected cluster from QuizConfig (if provided)
   */
  expectedCluster?: SolanaNetworkKey;
  
  /**
   * Whether user is on the correct network
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
  
  // Get wallet state from AppKit
  const { address, isConnected } = useAppKitAccount();
  const { walletProvider } = useAppKitProvider('solana');
  const { caipNetwork } = useAppKitNetwork();
  const { connection } = useAppKitConnection();
  
  console.log('[Solana][Shared] 🔌 AppKit Connection State:', {
    address,
    isConnected,
    hasWalletProvider: !!walletProvider,
    hasConnection: !!connection,
    networkId: caipNetwork?.id,
    networkName: caipNetwork?.name,
  });
  
  // Detect current cluster from AppKit's network.id
  const cluster = useMemo(() => {
    const networkId = caipNetwork?.id;
    
    // ✅ Handle both string and number - only strings are valid for Solana
    const chainId = typeof networkId === 'string' ? networkId : undefined;
    const detected = getSolanaKeyByChainId(chainId);
    
    console.log('[Solana][Shared] 🌐 Network Detection:', {
      networkId,
      networkIdType: typeof networkId,
      chainId,
      detectedCluster: detected,
      fallback: detected || 'devnet',
    });
    
    return detected || 'devnet'; // Default to devnet if detection fails
  }, [caipNetwork?.id]);
  
  // Get expected cluster from QuizConfig
  const expectedCluster = useMemo(() => {
    const stored = setupConfig?.solanaCluster;
    
    if (stored) {
      console.log('[Solana][Shared] 📋 Expected cluster from QuizConfig:', stored);
    }
    
    return stored as SolanaNetworkKey | undefined;
  }, [setupConfig?.solanaCluster]);
  
  // Check if on correct network
  const isCorrectNetwork = useMemo(() => {
    if (!expectedCluster) {
      // If no expected cluster, any network is fine
      return true;
    }
    
    const correct = cluster === expectedCluster;
    
    console.log('[Solana][Shared] ✅ Network Match:', {
      current: cluster,
      expected: expectedCluster,
      isCorrect: correct,
    });
    
    return correct;
  }, [cluster, expectedCluster]);
  
  // Convert address string to PublicKey
  const publicKey = useMemo(() => {
    if (!address) {
      console.log('[Solana][Shared] ❌ No wallet address');
      return null;
    }
    
    try {
      const pk = new PublicKey(address);
      console.log('[Solana][Shared] ✅ PublicKey created:', pk.toBase58());
      return pk;
    } catch (error) {
      console.error('[Solana][Shared] ❌ Failed to create PublicKey:', error);
      return null;
    }
  }, [address]);

  // Create Anchor wallet adapter
  const walletAdapter = useMemo(() => {
    if (!walletProvider || !publicKey) {
      console.log('[Solana][Shared] ⏳ Wallet adapter not ready:', {
        hasProvider: !!walletProvider,
        hasPublicKey: !!publicKey,
      });
      return null;
    }
    
    const provider = walletProvider as any;
    
    console.log('[Solana][Shared] ✅ Creating wallet adapter');
    
    return {
      publicKey,
      signTransaction: async (tx: any) => {
        console.log('[Solana][Shared] ✍️  Signing transaction...');
        return provider.signTransaction(tx);
      },
      signAllTransactions: async (txs: any[]) => {
        console.log('[Solana][Shared] ✍️  Signing', txs.length, 'transactions...');
        return provider.signAllTransactions(txs);
      },
    };
  }, [walletProvider, publicKey]);

  // Create Anchor provider
  const provider = useMemo(() => {
    if (!walletAdapter || !connection) {
      console.log('[Solana][Shared] ⏳ Provider not ready:', {
        hasWalletAdapter: !!walletAdapter,
        hasConnection: !!connection,
      });
      return null;
    }
    
    console.log('[Solana][Shared] ✅ Creating AnchorProvider with cluster:', cluster);
    
    return new AnchorProvider(
      connection as unknown as Connection,
      walletAdapter as any,
      { 
        commitment: 'confirmed',
        preflightCommitment: 'confirmed',
      }
    );
  }, [walletAdapter, connection, cluster]);

  // Create program instance
  const program = useMemo(() => {
    if (!provider) {
      console.log('[Solana][Shared] ⏳ Program not ready: no provider');
      return null;
    }
    
    try {
      const programId = SOLANA_CONTRACT.PROGRAM_ID.toBase58();
      
      console.log('[Solana][Shared] ✅ Creating Program instance');
      console.log('[Solana][Shared] 📍 Program ID:', programId);
      console.log('[Solana][Shared] 🌐 Cluster:', cluster);
      
      return new Program(QuizCoreIDL as Idl, provider);
    } catch (error) {
      console.error('[Solana][Shared] ❌ Failed to create program:', error);
      return null;
    }
  }, [provider, cluster]);

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
  
  console.log('[Solana][Shared] 🎯 Final State:', {
    isConnected,
    hasPublicKey: !!publicKey,
    hasProgram: !!program,
    isCorrectNetwork,
    isFullyConnected,
    cluster,
    expectedCluster: expectedCluster || 'none',
  });

  return {
    publicKey,
    connection: connection as unknown as Connection,
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