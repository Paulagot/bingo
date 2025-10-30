// src/chains/shared/tgbNetworks.ts
/**
 * Single source of truth for The Giving Block network labels.
 * Keep this tiny table updated with the same keys you already use in resolveEvmTarget(...) and Solana cluster.
 */

export type TgbNetwork =
  | 'ethereum'
  | 'base'
  | 'polygon'
  | 'optimism'
  | 'arbitrum'
  | 'avalanche'
  | 'bsc'
  | 'solana';

const MAP: Record<string, TgbNetwork> = {
  // EVM mainnets
  ethereum: 'ethereum',
  base: 'base',
  polygon: 'polygon',
  optimism: 'optimism',
  arbitrum: 'arbitrum',
  avalanche: 'avalanche',
  bsc: 'bsc',

  // EVM testnets (map to their mainnet labels for TGB)
  baseSepolia: 'base',
  optimismSepolia: 'optimism',
  avalancheFuji: 'avalanche',
  bscTestnet: 'bsc',

  // Solana
  solana: 'solana',
  solanaMainnet: 'solana',
  solanaDevnet: 'solana',
};

/**
 * Returns the TGB label from your app’s network keys.
 * Safe fallback: returns `solana` if chain says solana; else returns input key.
 */
export function getTgbNetworkLabel(opts: {
  web3Chain: 'evm' | 'stellar' | 'solana';
  evmTargetKey?: string | null;   // e.g., 'base', 'baseSepolia', 'avalancheFuji'
  solanaCluster?: 'mainnet' | 'devnet' | null;
}): TgbNetwork {
  if (opts.web3Chain === 'solana') return 'solana';
  const key =
    opts.web3Chain === 'evm'
      ? (opts.evmTargetKey || '')
      : '';
  return (MAP[key] as TgbNetwork) || (key.includes('solana') ? 'solana' : (key as TgbNetwork));
}
