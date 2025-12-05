// src/chains/evm/utils/evmSelect.ts
import { EVM_NETWORKS, type EvmNetworkKey } from '../config/networks';

export const evmKeyToId = (key: string | null | undefined): number | null => {
  if (!key) return null;
  const network = (EVM_NETWORKS as any)[key];
  return typeof network?.id === 'number' ? network.id : null;
};

export const evmIdToKey = (id: number | null | undefined): EvmNetworkKey | null => {
  if (!id) return null;
  const pair = Object.entries(EVM_NETWORKS).find(([, network]) => network.id === id);
  return (pair?.[0] as EvmNetworkKey) ?? null;
};

// ✅ Complete explorer URLs for all supported networks
const EXPLORER_URLS: Record<EvmNetworkKey, string> = {
  // Mainnets
  mainnet: 'https://etherscan.io',
  base: 'https://basescan.org',
  optimism: 'https://optimistic.etherscan.io',
  arbitrum: 'https://arbiscan.io',
  polygon: 'https://polygonscan.com',
  bsc: 'https://bscscan.com',
  avalanche: 'https://snowtrace.io',
  sei: 'https://seistream.app',
  
  // Testnets
  sepolia: 'https://sepolia.etherscan.io',
  baseSepolia: 'https://sepolia.basescan.org',
  optimismSepolia: 'https://sepolia-optimism.etherscan.io',
  arbitrumSepolia: 'https://sepolia.arbiscan.io',
  polygonAmoy: 'https://amoy.polygonscan.com',
  bscTestnet: 'https://testnet.bscscan.com',
  avalancheFuji: 'https://testnet.snowtrace.io',
  seiTestnet: 'https://seistream.app',
};

/**
 * Get block explorer URL for a network
 */
export const explorerFor = (key: EvmNetworkKey): string => {
  return EXPLORER_URLS[key];
};

export interface ResolvedEvmTarget {
  key: EvmNetworkKey;
  id: number;
  explorer: string;
}

/**
 * Resolve the target EVM network based on setup config and runtime state
 * Priority: explicit setup selection → wallet's current chainId → default baseSepolia
 */
export const resolveEvmTarget = (opts: { 
  setupKey?: string | null; 
  runtimeChainId?: number | null 
}): ResolvedEvmTarget => {
  const { setupKey, runtimeChainId } = opts;
  let key: EvmNetworkKey | null = (setupKey as EvmNetworkKey) ?? null;

  // Try to resolve from runtime chain ID if setup key not provided
  if (!key && runtimeChainId) {
    key = evmIdToKey(runtimeChainId);
  }
  
  // Fallback to default
  if (!key) {
    key = 'baseSepolia';
  }

  const network = EVM_NETWORKS[key];
  const id = network.id;
  
  // ✅ AppKit networks always have numeric IDs for EVM chains
  if (typeof id !== 'number') {
    throw new Error(`Invalid chain ID for network ${key}: ${id}`);
  }
  
  const explorer = explorerFor(key);

  return { key, id, explorer };
};

// ✅ Simple format guards (frontend validation)
export const isEvmAddress = (v?: string | null): v is `0x${string}` => {
  return !!v && /^0x[0-9a-fA-F]{40}$/.test(v);
};

export const isEvmTxHash = (v?: string | null): v is `0x${string}` => {
  return !!v && /^0x[0-9a-fA-F]{64}$/.test(v);
};
