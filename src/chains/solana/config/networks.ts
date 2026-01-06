/**
 * Solana Network Configuration
 * 
 * Defines supported Solana networks using AppKit's network objects.
 * This mirrors the EVM networks.ts structure for consistency.
 * 
 * ## Network Support
 * - **Devnet**: Default for development and testing
 * - **Testnet**: Alternative testnet (less commonly used)
 * - **Mainnet**: Production network
 * 
 * ## Usage
 * 
 * ```typescript
 * import { getSolanaNetworkByKey, getSolanaKeyByChainId } from './networks';
 * 
 * // Get network config from stored key
 * const network = getSolanaNetworkByKey('devnet');
 * 
 * // Get key from chain ID (from AppKit)
 * const key = getSolanaKeyByChainId('solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1');
 * ```
 */

// ✅ Import Solana networks directly from AppKit
import {
  solana,
  solanaDevnet,
  solanaTestnet,
} from '@reown/appkit/networks';

import type { AppKitNetwork } from '@reown/appkit/networks';

// ✅ Define the keys we support
export type SolanaNetworkKey = 'mainnet' | 'devnet' | 'testnet';

// ✅ Map keys to AppKit's Solana network objects
export const SOLANA_NETWORKS: Record<SolanaNetworkKey, AppKitNetwork> = {
  mainnet: solana,
  devnet: solanaDevnet,
  testnet: solanaTestnet,
};

/**
 * Get Solana network by key (stored in QuizConfig.solanaCluster)
 */
export const getSolanaNetworkByKey = (key?: string | null): AppKitNetwork | undefined => {
  if (!key || !(key in SOLANA_NETWORKS)) return undefined;
  return SOLANA_NETWORKS[key as SolanaNetworkKey];
};

/**
 * Get key by AppKit's chain ID
 * 
 * AppKit v2 uses `id` property which is a CAIP-2 string for Solana:
 * - solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp (mainnet)
 * - solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1 (devnet)
 * - solana:4uhcVJyU9pJkvQyS88uRDiswHXSCkY3z (testnet)
 */
export const getSolanaKeyByChainId = (chainId?: string | null): SolanaNetworkKey | undefined => {
  if (!chainId) return undefined;
  
  // ✅ Use 'id' instead of 'caipNetworkId' - AppKit stores it as 'id'
  const entry = Object.entries(SOLANA_NETWORKS).find(
    ([_, network]) => network.id === chainId
  );
  
  return entry?.[0] as SolanaNetworkKey | undefined;
};

/**
 * Get all Solana networks as array
 */
export const getAllSolanaNetworks = (): AppKitNetwork[] => {
  return Object.values(SOLANA_NETWORKS);
};

/**
 * Get display name by key
 */
export const getSolanaNetworkName = (key: SolanaNetworkKey): string => {
  return SOLANA_NETWORKS[key]?.name || key;
};

/**
 * Get RPC endpoint by key
 */
export const getSolanaRpcUrl = (key: SolanaNetworkKey): string => {
  // AppKit provides default RPC URLs, but you can override here
  if (key === 'mainnet') {
    return 'https://api.mainnet-beta.solana.com'; // or your custom RPC
  }
  if (key === 'devnet') {
    return 'https://api.devnet.solana.com';
  }
  if (key === 'testnet') {
    return 'https://api.testnet.solana.com';
  }
  
  return 'https://api.devnet.solana.com'; // fallback
};

/**
 * Get Solana Explorer URL by key
 */
export const getSolanaExplorerUrl = (key: SolanaNetworkKey): string => {
  // Solana Explorer supports cluster parameter
  if (key === 'mainnet') {
    return 'https://explorer.solana.com';
  }
  return `https://explorer.solana.com?cluster=${key}`;
};

/**
 * Get transaction explorer URL
 */
export const getSolanaExplorerTxUrl = (signature: string, cluster: SolanaNetworkKey): string => {
  const base = getSolanaExplorerUrl(cluster);
  if (cluster === 'mainnet') {
    return `${base}/tx/${signature}`;
  }
  return `${base}/tx/${signature}?cluster=${cluster}`;
};

/**
 * Get address explorer URL
 */
export const getSolanaExplorerAddressUrl = (address: string, cluster: SolanaNetworkKey): string => {
  const base = getSolanaExplorerUrl(cluster);
  if (cluster === 'mainnet') {
    return `${base}/address/${address}`;
  }
  return `${base}/address/${address}?cluster=${cluster}`;
};

/**
 * Check if current network matches expected cluster
 * Used for network validation in hooks
 */
export const isCorrectSolanaNetwork = (
  currentChainId: string | undefined,
  expectedCluster: SolanaNetworkKey
): boolean => {
  if (!currentChainId) return false;
  
  const currentKey = getSolanaKeyByChainId(currentChainId);
  return currentKey === expectedCluster;
};