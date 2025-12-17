/**
 * EVM Token Configuration
 *
 * Defines token addresses for each EVM-compatible network.
 * Supports USDC (USD Coin) and USDGLO (Glo Dollar) tokens for entry fees
 * and prize distributions.
 *
 * ## Token Details
 *
 * - **USDC**: USD Coin (Circle)
 *   - Decimals: 6
 *   - Networks: Base, Base Sepolia, Polygon, Polygon Amoy, Optimism, Avalanche, BSC
 * - **USDGLO**: Glo Dollar (charitable giving token)
 *   - Decimals: 18
 *   - Networks: Ethereum, Base, Polygon, Optimism
 *   - Same address across all supported chains
 *
 * ## Network-Specific Addresses
 *
 * Token addresses are network-specific and must match the deployed token
 * contracts on each network. Testnet tokens may differ from mainnet tokens.
 *
 * ## Usage
 *
 * ```typescript
 * import { USDC, USDGLO, getTokenDecimals } from './tokens';
 *
 * // Get USDC address for current network
 * const usdcAddress = USDC.baseSepolia;
 *
 * // Get token decimals
 * const decimals = getTokenDecimals('USDC'); // 6
 * ```
 *
 * Used by `useContractActions` and EVM wallet providers for token operations.
 */
// src/chains/evm/config/tokens.ts

import type { EvmNetworkKey } from './networks';

// --- USDC (decimals = 6 everywhere) ---
export const USDC: Partial<Record<EvmNetworkKey, `0x${string}`>> = {
  // Base
  base:        '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
  baseSepolia: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',

  // Optimism
  optimism:        '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85',
  optimismSepolia: '0x5fd84259d66Cd46123540766Be93DFE6D43130D7',

  // Avalanche (C-Chain)
  avalanche:     '0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E',
  avalancheFuji: '0x5425890298aed601595a70ab815c96711a31bc65',

  // Polygon PoS
  polygon:     '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359',
  polygonAmoy: '0x41E94Eb019C0762f9Bfcf9Fb1E58725BfB0e7582',

  // BNB Smart Chain
  // NOTE: Circle does NOT issue native USDC on BSC. This is Binance-Peg USDC.
  bsc:         '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d',
  bscTestnet:  '0x64544969ED7EBf5F083679233325356EBe738930',
  
  // Ethereum
  mainnet: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
  sepolia: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238',
  
  // Arbitrum
  arbitrum:        '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
  arbitrumSepolia: '0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d',
} as const;

export const USDC_DECIMALS = 6 as const;

// --- USDGLO (Glo Dollar) (decimals = 18) ---
// Glo uses the SAME contract address across its supported EVM chains.
export const USDGLO: Partial<Record<EvmNetworkKey, `0x${string}`>> = {
  mainnet:  '0x4F604735c1cF31399C6E711D5962b2B3E0225AD3',
  base:     '0x4F604735c1cF31399C6E711D5962b2B3E0225AD3',
  polygon:  '0x4F604735c1cF31399C6E711D5962b2B3E0225AD3',
  optimism: '0x4F604735c1cF31399C6E711D5962b2B3E0225AD3',
  // (Also available on Celo & Arbitrum with the same address if you add those chains later.)
} as const;

export const USDGLO_DECIMALS = 18 as const;

// --- Token Symbol Type ---
export type SupportedTokenSymbol = 'USDC' | 'USDGLO' | 'GLO' | 'USDGLO';

// --- Helper Functions ---

/**
 * Get token decimals for a given symbol
 */
export function getTokenDecimals(symbol: string): number {
  const sym = symbol.toUpperCase();
  
  if (sym === 'USDC' || sym === 'USDT' || sym === 'PYUSD') {
    return USDC_DECIMALS;
  }
  
  if (sym === 'USDGLO' || sym === 'GLO' || sym === 'GLOUSD') {
    return USDGLO_DECIMALS;
  }
  
  // Default to 6 for unknown stablecoins
  return 6;
}

/**
 * Check if a token is supported on a given network
 */
export function isTokenSupported(
  symbol: string,
  networkKey: EvmNetworkKey
): boolean {
  const sym = symbol.toUpperCase();
  
  if (sym === 'USDC') {
    return networkKey in USDC;
  }
  
  if (sym === 'USDGLO' || sym === 'GLO' || sym === 'GLOUSD') {
    return networkKey in USDGLO;
  }
  
  return false;
}

/**
 * Get all supported networks for a token
 */
export function getSupportedNetworks(symbol: string): EvmNetworkKey[] {
  const sym = symbol.toUpperCase();
  
  if (sym === 'USDC') {
    return Object.keys(USDC) as EvmNetworkKey[];
  }
  
  if (sym === 'USDGLO' || sym === 'GLO' || sym === 'GLOUSD') {
    return Object.keys(USDGLO) as EvmNetworkKey[];
  }
  
  return [];
}

