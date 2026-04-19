// src/chains/tgbNetworks.ts
/**
 * Single source of truth for The Giving Block network labels.
 * Keep this tiny table updated with the same keys you already use in resolveEvmTarget(...)
 * and Solana cluster handling.
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

  // EVM testnets → map to TGB mainnet labels
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
 * Returns the TGB label from your app's network keys.
 * - Solana always resolves to `solana`
 * - EVM testnets map to their TGB mainnet labels
 * - Unknown values fall back safely to `base` for EVM
 */
export function getTgbNetworkLabel(opts: {
  web3Chain: 'evm' | 'stellar' | 'solana';
  evmTargetKey?: string | null;
  solanaCluster?: 'mainnet' | 'devnet' | null;
}): TgbNetwork {
  if (opts.web3Chain === 'solana') return 'solana';

  if (opts.web3Chain === 'evm') {
    const key = opts.evmTargetKey || '';
    return MAP[key] ?? 'base';
  }

  // Stellar should not use TGB network labels directly here.
  // Fallback chosen only to keep return type safe.
  return 'base';
}
