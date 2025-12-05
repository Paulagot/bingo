// src/chains/evm/config/networks.ts

// ✅ Import networks directly from AppKit
import {
  mainnet,
  base,
  baseSepolia,
  optimism,
  optimismSepolia,
  arbitrum,
  arbitrumSepolia,
  bsc,
  bscTestnet,
  avalanche,
  avalancheFuji,
  polygon,
  polygonAmoy,
  sepolia,
  sei,
  seiTestnet,
} from '@reown/appkit/networks';

import type { AppKitNetwork } from '@reown/appkit/networks';

// ✅ Define the keys you support
export type EvmNetworkKey =
  | 'mainnet'
  | 'sepolia'
  | 'base'
  | 'baseSepolia'
  | 'optimism'
  | 'optimismSepolia'
  | 'arbitrum'
  | 'arbitrumSepolia'
  | 'bsc'
  | 'bscTestnet'
  | 'avalanche'
  | 'avalancheFuji'
  | 'polygon'
  | 'polygonAmoy'
  | 'sei'
  | 'seiTestnet';

// ✅ Map keys to AppKit's network objects
export const EVM_NETWORKS: Record<EvmNetworkKey, AppKitNetwork> = {
  mainnet,
  sepolia,
  base,
  baseSepolia,
  optimism,
  optimismSepolia,
  arbitrum,
  arbitrumSepolia,
  bsc,
  bscTestnet,
  avalanche,
  avalancheFuji,
  polygon,
  polygonAmoy,
  sei,
  seiTestnet,
};

// ✅ Get network by key
export const getMetaByKey = (key?: string | null): AppKitNetwork | undefined => {
  if (!key || !(key in EVM_NETWORKS)) return undefined;
  return EVM_NETWORKS[key as EvmNetworkKey];
};

// ✅ Get key by numeric chain ID
export const getKeyById = (id?: number | null): EvmNetworkKey | undefined => {
  if (id === undefined || id === null) return undefined;
  
  const entry = Object.entries(EVM_NETWORKS).find(
    ([_, network]) => network.id === id
  );
  
  return entry?.[0] as EvmNetworkKey | undefined;
};

// ✅ Get all networks as array
export const getAllNetworks = (): AppKitNetwork[] => {
  return Object.values(EVM_NETWORKS);
};

// ✅ Get display name by key
export const getNetworkName = (key: EvmNetworkKey): string => {
  return EVM_NETWORKS[key]?.name || key;
};

// ✅ Get chain ID by key - FIX: Type assertion to ensure it's a number
export const getChainIdByKey = (key: EvmNetworkKey): number | undefined => {
  const network = EVM_NETWORKS[key];
  if (!network?.id) return undefined;
  
  // ✅ Type assertion: AppKit network IDs are always numbers for EVM
  return typeof network.id === 'number' ? network.id : undefined;
};



