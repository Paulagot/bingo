/**
 * Solana Network Configuration
 * src/chains/solana/config/networks.ts
 */

import {
  solana,
  solanaDevnet,
  solanaTestnet,
} from '@reown/appkit/networks';

import type { AppKitNetwork } from '@reown/appkit/networks';

export type SolanaNetworkKey = 'mainnet' | 'devnet' | 'testnet';

export const SOLANA_NETWORKS: Record<SolanaNetworkKey, AppKitNetwork> = {
  mainnet: solana,
  devnet: solanaDevnet,
  testnet: solanaTestnet,
};

export const getSolanaNetworkByKey = (key?: string | null): AppKitNetwork | undefined => {
  if (!key || !(key in SOLANA_NETWORKS)) return undefined;
  return SOLANA_NETWORKS[key as SolanaNetworkKey];
};

export const getSolanaKeyByChainId = (chainId?: string | null): SolanaNetworkKey | undefined => {
  if (!chainId) return undefined;

  const entry = Object.entries(SOLANA_NETWORKS).find(
    ([_, network]) => network.id === chainId
  );

  return entry?.[0] as SolanaNetworkKey | undefined;
};

export const getAllSolanaNetworks = (): AppKitNetwork[] => {
  return Object.values(SOLANA_NETWORKS);
};

export const getSolanaNetworkName = (key: SolanaNetworkKey): string => {
  return SOLANA_NETWORKS[key]?.name || key;
};

/**
 * Get RPC endpoint by key
 */
export const getSolanaRpcUrl = (key: SolanaNetworkKey): string => {
  const alchemyKey = import.meta.env.VITE_ALCHEMY_KEY;

  if (key === 'mainnet') {
    if (!alchemyKey) {
      throw new Error('Missing VITE_ALCHEMY_KEY for Solana mainnet RPC');
    }
    return `https://solana-mainnet.g.alchemy.com/v2/${alchemyKey}`;
  }

  if (key === 'devnet') {
    return alchemyKey
      ? `https://solana-devnet.g.alchemy.com/v2/${alchemyKey}`
      : 'https://api.devnet.solana.com';
  }

  if (key === 'testnet') {
    return 'https://api.testnet.solana.com';
  }

  if (!alchemyKey) {
    throw new Error('Missing VITE_ALCHEMY_KEY for Solana mainnet RPC');
  }

  return `https://solana-mainnet.g.alchemy.com/v2/${alchemyKey}`;
};

export const getSolanaExplorerUrl = (key: SolanaNetworkKey): string => {
  if (key === 'mainnet') {
    return 'https://explorer.solana.com';
  }
  return `https://explorer.solana.com?cluster=${key}`;
};

export const getSolanaExplorerTxUrl = (signature: string, cluster: SolanaNetworkKey): string => {
  const base = getSolanaExplorerUrl(cluster);
  if (cluster === 'mainnet') {
    return `${base}/tx/${signature}`;
  }
  return `${base}/tx/${signature}?cluster=${cluster}`;
};

export const getSolanaExplorerAddressUrl = (address: string, cluster: SolanaNetworkKey): string => {
  const base = getSolanaExplorerUrl(cluster);
  if (cluster === 'mainnet') {
    return `${base}/address/${address}`;
  }
  return `${base}/address/${address}?cluster=${cluster}`;
};

export const isCorrectSolanaNetwork = (
  currentChainId: string | undefined,
  expectedCluster: SolanaNetworkKey
): boolean => {
  if (!currentChainId) return false;

  const currentKey = getSolanaKeyByChainId(currentChainId);
  return currentKey === expectedCluster;
};