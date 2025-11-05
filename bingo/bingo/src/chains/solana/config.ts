/**
 * Solana Network Configuration
 *
 * Centralizes blockchain configuration including deployed program ID, RPC endpoints, and
 * transaction parameters for the Bingo Solana program. Defines network selection
 * (devnet/mainnet/testnet), PDA seed constants that must match the Rust program's anchor
 * derive macros, and fee constraints enforced by smart contract.
 * Provides TOKEN_MINTS for supported tokens (USDC, SOL) and TX_CONFIG for transaction
 * commitment levels. Referenced by useSolanaContract, transactionHelpers, and
 * SolanaWalletProvider to ensure consistent blockchain interaction across the application.
 */

import { PublicKey, type Cluster } from '@solana/web3.js';

// Program IDs - HARDCODED - Nov 1, 2025 13:51
// BYPASSING import.meta.env DUE TO AGGRESSIVE BROWSER CACHING
const HARDCODED_PROGRAM_ID = '8W83G9mSeoQ6Ljcz5QJHYPjH2vQgw94YeVCnpY6KFt7i';

console.log('═══════════════════════════════════════════════════════');
console.log('🔧 SOLANA CONFIG MODULE LOADING - HARDCODED MODE');
console.log('═══════════════════════════════════════════════════════');
console.log('[Config] HARDCODED_PROGRAM_ID:', HARDCODED_PROGRAM_ID);

export const PROGRAM_ID = new PublicKey(HARDCODED_PROGRAM_ID);

console.log('[Config] ✅ PROGRAM_ID PublicKey created:', PROGRAM_ID.toString());
console.log('[Config] Match:', PROGRAM_ID.toString() === HARDCODED_PROGRAM_ID ? '✅ CORRECT' : '❌ MISMATCH!!!');
console.log('═══════════════════════════════════════════════════════');

// Network configuration
export const NETWORK = (import.meta.env.VITE_SOLANA_NETWORK || 'devnet') as Cluster;

// RPC endpoints
export const RPC_ENDPOINTS = {
  'devnet': import.meta.env.VITE_SOLANA_RPC_DEVNET || 'https://api.devnet.solana.com',
  'testnet': import.meta.env.VITE_SOLANA_RPC_TESTNET || 'https://api.testnet.solana.com',
  'mainnet-beta': import.meta.env.VITE_SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com',
};

// Get RPC endpoint for current network
export const getRpcEndpoint = (network: Cluster = NETWORK): string => {
  return RPC_ENDPOINTS[network] || RPC_ENDPOINTS.devnet;
};

// Known token mints (network-specific addresses)
const TOKEN_MINTS_BY_NETWORK = {
  'mainnet-beta': {
    USDC: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', // Mainnet USDC (Circle)
    PYUSD: '2b1kV6DkPAnxd5ixfnxCpjxmKwqjjaYmCZfHsFu24GXo', // Mainnet PYUSD (PayPal USD)
    USDT: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB', // Mainnet USDT (Tether)
    SOL: 'So11111111111111111111111111111111111111112', // Wrapped SOL (native mint)
  },
  'devnet': {
    USDC: '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU', // Circle's Devnet USDC (mintable at faucet.circle.com)
    PYUSD: '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU', // Devnet PYUSD (using same as USDC for devnet - update when available)
    USDT: 'EJwZgeZrdC8TXTQbQBoL6bfuAnFUUy1PVCMB4DYPzVaS', // Devnet USDT
    SOL: 'So11111111111111111111111111111111111111112', // Wrapped SOL (native mint)
  },
  'testnet': {
    USDC: '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU', // Testnet USDC (same as devnet)
    PYUSD: '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU', // Testnet PYUSD (using same as USDC for testnet - update when available)
    USDT: 'EJwZgeZrdC8TXTQbQBoL6bfuAnFUUy1PVCMB4DYPzVaS', // Testnet USDT (same as devnet)
    SOL: 'So11111111111111111111111111111111111111112', // Wrapped SOL (native mint)
  },
} as const;

// Get token mints for current network
export const getTokenMints = (network: Cluster = NETWORK) => {
  const mints = TOKEN_MINTS_BY_NETWORK[network] || TOKEN_MINTS_BY_NETWORK.devnet;
  return {
    USDC: new PublicKey(mints.USDC),
    PYUSD: new PublicKey(mints.PYUSD),
    USDT: new PublicKey(mints.USDT),
    SOL: new PublicKey(mints.SOL),
  };
};

// Legacy export for backwards compatibility (uses current network)
export const TOKEN_MINTS = getTokenMints();

// PDA seeds (must match program - using underscores as per Rust code)
export const PDA_SEEDS = {
  GLOBAL_CONFIG: 'global-config',
  APPROVED_TOKENS: 'approved_tokens',
  ROOM: 'room',
  ROOM_VAULT: 'room-vault',
  PLAYER: 'player',
  PLAYER_ENTRY: 'player-entry',
};

// Transaction configuration
export const TX_CONFIG = {
  commitment: 'confirmed' as const,
  preflightCommitment: 'confirmed' as const,
  skipPreflight: false,
  maxRetries: 3,
};

// Fee configuration (basis points)
export const FEES = {
  PLATFORM_BPS: 2000, // 20%
  MAX_HOST_BPS: 500,   // 5%
  MAX_COMBINED_BPS: 4000, // 40%
};

// Storage keys for persisting wallet state
export const solanaStorageKeys = {
  WALLET_ID: 'solana_wallet_id',
  LAST_ADDRESS: 'solana_last_address',
  AUTO_CONNECT: 'solana_auto_connect',
  NETWORK: 'solana_network',
} as const;

// Supported Solana wallet types
export const SUPPORTED_WALLETS = [
  'phantom',
  'solflare',
  'backpack',
  'glow',
  'slope',
  'sollet',
] as const;

export type SupportedSolanaWallet = typeof SUPPORTED_WALLETS[number];

// Explorer URLs
export const EXPLORER_URLS = {
  'mainnet-beta': 'https://solscan.io',
  'devnet': 'https://solscan.io',
  'testnet': 'https://solscan.io',
};

export const getExplorerUrl = (
  type: 'tx' | 'address' | 'token',
  identifier: string,
  cluster: Cluster = NETWORK
): string => {
  const base = EXPLORER_URLS[cluster] || EXPLORER_URLS.devnet;
  const clusterParam = cluster !== 'mainnet-beta' ? `?cluster=${cluster}` : '';

  switch (type) {
    case 'tx':
      return `${base}/tx/${identifier}${clusterParam}`;
    case 'address':
      return `${base}/account/${identifier}${clusterParam}`;
    case 'token':
      return `${base}/token/${identifier}${clusterParam}`;
    default:
      return base;
  }
};
