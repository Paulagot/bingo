/**
 * Solana Token Configuration
 * 
 * Defines SPL token mint addresses for supported stablecoins.
 * Token addresses differ between mainnet and devnet/testnet.
 * 
 * ## Supported Tokens
 * - **USDC**: USD Coin (most common)
 * - **PYUSD**: PayPal USD
 * - **USDT**: Tether USD
 * 
 * ## Network Differences
 * - Mainnet: Real token mints
 * - Devnet: Test token mints (may need to airdrop for testing)
 * 
 * ## Usage
 * 
 * ```typescript
 * import { getTokenConfig } from './tokens';
 * 
 * // Get token config for current cluster
 * const cluster = 'devnet'; // from QuizConfig.solanaCluster
 * const usdc = getTokenConfig('USDC', cluster);
 * 
 * console.log(usdc.mint.toBase58()); // Token mint address
 * console.log(usdc.decimals); // 6 for most stablecoins
 * ```
 */

import { PublicKey } from '@solana/web3.js';
import type { SolanaNetworkKey } from './networks';

export interface TokenConfig {
  mint: PublicKey;
  symbol: string;
  decimals: number;
  name: string;
}

/**
 * Mainnet token addresses (production)
 */
const MAINNET_TOKENS = {
  USDC: {
    mint: new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'),
    symbol: 'USDC',
    decimals: 6,
    name: 'USD Coin',
  },
  PYUSD: {
    mint: new PublicKey('2b1kV6DkPAnxd5ixfnxCpjxmKwqjjaYmCZfHsFu24GXo'),
    symbol: 'PYUSD',
    decimals: 6,
    name: 'PayPal USD',
  },
  USDT: {
    mint: new PublicKey('Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB'),
    symbol: 'USDT',
    decimals: 6,
    name: 'Tether USD',
  },
} as const;

/**
 * Devnet token addresses (testing)
 * 
 * Note: These are test tokens that can be airdropped via:
 * - Solana CLI: `spl-token create-account <mint> && spl-token mint <mint> <amount>`
 * - Faucets: Various devnet faucets available
 */
const DEVNET_TOKENS = {
  USDC: {
    // Devnet USDC - you may need to create/use your own test token
    mint: new PublicKey('4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU'),
    symbol: 'USDC',
    decimals: 6,
    name: 'USD Coin (Devnet)',
  },
  PYUSD: {
    // Devnet PYUSD - placeholder, replace with actual devnet token if available
    mint: new PublicKey('CXk2AMBfi3TwaEL2468s6zP8xq9NxTXjp9gjMgzeUynM'),
    symbol: 'PYUSD',
    decimals: 6,
    name: 'PayPal USD (Devnet)',
  },
  USDT: {
    // Devnet USDT - placeholder, replace with actual devnet token if available
    mint: new PublicKey('EJwZgeZrdC8TXTQbQBoL6bfuAnFUUy1PVCMB4DYPzVaS'),
    symbol: 'USDT',
    decimals: 6,
    name: 'Tether USD (Devnet)',
  },
} as const;

/**
 * Testnet uses same addresses as devnet for now
 */
const TESTNET_TOKENS = DEVNET_TOKENS;

export type SolanaTokenSymbol = keyof typeof MAINNET_TOKENS;

/**
 * Get token config for a specific symbol and cluster
 */
export function getTokenConfig(
  symbol: SolanaTokenSymbol,
  cluster: SolanaNetworkKey = 'devnet'
): TokenConfig {
  if (cluster === 'mainnet') {
    return MAINNET_TOKENS[symbol];
  }
  
  if (cluster === 'testnet') {
    return TESTNET_TOKENS[symbol];
  }
  
  // Default to devnet
  return DEVNET_TOKENS[symbol];
}

/**
 * Get all supported token symbols
 */
export function getSupportedTokens(): SolanaTokenSymbol[] {
  return ['USDC', 'PYUSD', 'USDT'];
}

/**
 * Get token mint address for a symbol and cluster
 */
export function getTokenMint(
  symbol: SolanaTokenSymbol,
  cluster: SolanaNetworkKey = 'devnet'
): PublicKey {
  return getTokenConfig(symbol, cluster).mint;
}

/**
 * Get token decimals for a symbol
 * All stablecoins use 6 decimals, but this makes it explicit
 */
export function getTokenDecimals(symbol: SolanaTokenSymbol): number {
  return 6; // All supported stablecoins use 6 decimals
}

/**
 * Convert human-readable amount to lamports
 * 
 * Example: 1.5 USDC → 1_500_000 lamports
 */
export function amountToLamports(amount: number, symbol: SolanaTokenSymbol): bigint {
  const decimals = getTokenDecimals(symbol);
  const multiplier = Math.pow(10, decimals);
  return BigInt(Math.floor(amount * multiplier));
}

/**
 * Convert lamports to human-readable amount
 * 
 * Example: 1_500_000 lamports → 1.5 USDC
 */
export function lamportsToAmount(lamports: bigint, symbol: SolanaTokenSymbol): number {
  const decimals = getTokenDecimals(symbol);
  const divisor = Math.pow(10, decimals);
  return Number(lamports) / divisor;
}

/**
 * Format amount with proper decimals and symbol
 * 
 * Example: formatAmount(1_500_000, 'USDC') → "1.50 USDC"
 */
export function formatAmount(lamports: bigint, symbol: SolanaTokenSymbol): string {
  const amount = lamportsToAmount(lamports, symbol);
  return `${amount.toFixed(2)} ${symbol}`;
}

/**
 * Validate token symbol is supported
 */
export function isValidTokenSymbol(symbol: string): symbol is SolanaTokenSymbol {
  return ['USDC', 'PYUSD', 'USDT'].includes(symbol);
}

/**
 * Get token mint explorer URL
 */
export function getTokenMintExplorerUrl(
  symbol: SolanaTokenSymbol,
  cluster: SolanaNetworkKey = 'devnet'
): string {
  const mint = getTokenMint(symbol, cluster);
  
  if (cluster === 'mainnet') {
    return `https://explorer.solana.com/address/${mint.toBase58()}`;
  }
  
  return `https://explorer.solana.com/address/${mint.toBase58()}?cluster=${cluster}`;
}