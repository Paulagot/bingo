export const EVM_NETWORKS = {
  base: {
    id: 8453,
    name: 'Base',
    rpc: 'https://mainnet.base.org',
    explorer: 'https://basescan.org',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  },
  baseSepolia: {
    id: 84532,
    name: 'Base Sepolia',
    rpc: 'https://sepolia.base.org',
    explorer: 'https://sepolia.basescan.org',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  },
  polygon: {
    id: 137,
    name: 'Polygon',
    rpc: 'https://polygon-rpc.com',
    explorer: 'https://polygonscan.com',
    nativeCurrency: { name: 'MATIC', symbol: 'MATIC', decimals: 18 },
  },
  polygonAmoy: 
  { id: 80002,
     name: 'Polygon Amoy',   
     rpc: 'https://rpc-amoy.polygon.technology', 
     explorer: 'https://amoy.polygonscan.com' }
} as const;

export type EvmNetworkKey = keyof typeof EVM_NETWORKS;

// Utility helpers
export const getMetaByKey = (key?: string | null) =>
  key && key in EVM_NETWORKS ? EVM_NETWORKS[key as EvmNetworkKey] : undefined;

export const getKeyById = (id?: number | null): EvmNetworkKey | undefined => {
  if (!id && id !== 0) return undefined;
  const entry = Object.entries(EVM_NETWORKS).find(([, v]) => v.id === id);
  return entry?.[0] as EvmNetworkKey | undefined;
};


