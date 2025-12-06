/**
 * @module shared/lib/solana/config
 *
 * ## Purpose
 * Centralizes blockchain configuration including deployed program ID, RPC endpoints, and
 * transaction parameters for the FundRaisely Solana program. Defines network selection
 * (devnet/mainnet/testnet), PDA seed constants that must match the Rust program's anchor
 * derive macros, and fee constraints enforced by smart contract.
 *
 * ## Program Configuration
 *
 * - **Program ID**: `7cBb4Ho5W66nBdcaAgt7sLnY3HG6jwTWkmCFF9d2yxBn` (devnet)
 * - **Network**: Devnet (default), Testnet, Mainnet-beta
 * - **RPC Endpoints**: Configurable per network via environment variables
 *
 * ## Token Configuration
 *
 * Supported tokens for room fees (restricted to USDC and PYUSD):
 * - **USDC**: USD Coin (Circle)
 * - **PYUSD**: PayPal USD
 * - **USDT**: Tether USD (optional)
 * - **SOL**: Native Solana token (wrapped)
 *
 * Token mints are network-specific and automatically selected based on the current network.
 *
 * ## PDA Seeds
 *
 * PDA seeds must match the Rust program's anchor derive macros:
 * - `global-config`: GlobalConfig PDA
 * - `token-registry-v4`: TokenRegistry PDA (versioned for upgrades)
 * - `room`: Room PDA
 * - `room-vault`: RoomVault PDA
 * - `prize-vault`: PrizeVault PDA
 * - `player-entry`: PlayerEntry PDA
 *
 * ## Fee Configuration
 *
 * Fee constraints enforced by the smart contract:
 * - **PLATFORM_BPS**: 2000 (20% fixed platform fee)
 * - **MAX_HOST_BPS**: 500 (5% maximum host fee)
 * - **MAX_COMBINED_BPS**: 4000 (40% maximum host allocation: host fee + prize pool)
 *
 * ## Transaction Configuration
 *
 * - **Commitment**: 'confirmed' (default)
 * - **Preflight Commitment**: 'confirmed'
 * - **Skip Preflight**: false (validate before sending)
 * - **Max Retries**: 3
 *
 * @see {@link pda} - PDA derivation utilities using these seeds
 * @see {@link validation} - Validation schemas using these constraints
 *
 * @example
 * ```typescript
 * import { PROGRAM_ID, getTokenMints, NETWORK } from '@/shared/lib/solana/config';
 *
 * const [roomPda] = deriveRoomPDA(hostPubkey, roomId);
 * const tokenMints = getTokenMints();
 * ```
 */

import { PublicKey, type Cluster } from '@solana/web3.js';

// Program IDs - HARDCODED - Nov 1, 2025 13:51
// BYPASSING import.meta.env DUE TO AGGRESSIVE BROWSER CACHING
const HARDCODED_PROGRAM_ID = '7cBb4Ho5W66nBdcaAgt7sLnY3HG6jwTWkmCFF9d2yxBn';

export const PROGRAM_ID = new PublicKey(HARDCODED_PROGRAM_ID);

// Network configuration
// FORCE devnet for development (public mainnet RPC is rate-limited)
export const NETWORK = 'devnet' as Cluster;

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
    PYUSD: '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU', // Testnet PYUSD (same as devnet)
    USDT: 'EJwZgeZrdC8TXTQbQBoL6bfuAnFUUy1PVCMB4DYPzVaS', // Testnet USDT (same as devnet)
    SOL: 'So11111111111111111111111111111111111111112', // Wrapped SOL (native mint)
  },
};

// Get token mints for current network
export const getTokenMints = (network: Cluster = NETWORK): {
  USDC: PublicKey;
  PYUSD: PublicKey;
  USDT: PublicKey;
  SOL: PublicKey;
} => {
  const mints = TOKEN_MINTS_BY_NETWORK[network] || TOKEN_MINTS_BY_NETWORK.devnet;
  return {
    USDC: new PublicKey(mints.USDC),
    PYUSD: new PublicKey(mints.PYUSD),
    USDT: new PublicKey(mints.USDT),
    SOL: new PublicKey(mints.SOL),
  };
};

// Export token mints as constants for convenience (using current network)
export const TOKEN_MINTS = getTokenMints();

// PDA seed constants (must match Rust program's anchor derive macros)
export const PDA_SEEDS = {
  GLOBAL_CONFIG: 'global-config',
  TOKEN_REGISTRY: 'token-registry-v2', // Versioned for upgrades
  APPROVED_TOKENS: 'approved_tokens', // Legacy name (kept for compatibility)
  ROOM: 'room',
  ROOM_VAULT: 'room-vault',
  PRIZE_VAULT: 'prize-vault',
  PLAYER: 'player', // Used for player_entry PDA (matches Rust: seeds = [b"player", ...])
  PLAYER_ENTRY: 'player', // Alias for PLAYER (contract uses "player", not "player-entry")
} as const;

// Fee constraints (enforced by smart contract)
export const FEE_CONSTRAINTS = {
  PLATFORM_BPS: 2000, // 20% fixed platform fee
  MAX_HOST_BPS: 500, // 5% maximum host fee
  MAX_COMBINED_BPS: 4000, // 40% maximum host allocation (host fee + prize pool)
} as const;

// Legacy export for backwards compatibility
export const FEES = FEE_CONSTRAINTS;

// Transaction configuration
export const TX_CONFIG = {
  commitment: 'confirmed' as const,
  preflightCommitment: 'confirmed' as const,
  skipPreflight: false,
  maxRetries: 3,
} as const;

// Solana storage keys for localStorage
export const solanaStorageKeys = {
  WALLET_NAME: 'solana_wallet_name',
  WALLET_ID: 'solana_wallet_id', // Legacy name
  LAST_ADDRESS: 'solana_last_address', // Legacy name
  AUTO_CONNECT: 'solana_auto_connect',
  LAST_CONNECTED: 'solana_last_connected',
  NETWORK: 'solana_network', // Legacy name
} as const;

// Explorer URLs
export const EXPLORER_URLS = {
  'mainnet-beta': 'https://solscan.io',
  'devnet': 'https://solscan.io',
  'testnet': 'https://solscan.io',
} as const;

// Get explorer URL for a transaction or account
export const getExplorerUrl = (
  typeOrSignature: 'tx' | 'address' | 'token' | string,
  identifierOrType?: string,
  cluster: Cluster = NETWORK
): string => {
  // Support both old signature (string, type) and new (type, identifier, cluster) signatures
  if (identifierOrType === undefined) {
    // Old signature: (signatureOrAddress: string, type: 'tx' | 'address' = 'tx', network: Cluster = NETWORK)
    const signatureOrAddress = typeOrSignature;
    const type = 'tx';
    const network = cluster;
    const clusterParam = network !== 'mainnet-beta' ? `?cluster=${network}` : '';
    return `https://explorer.solana.com/${type}/${signatureOrAddress}${clusterParam}`;
  } else {
    // New signature: (type: 'tx' | 'address' | 'token', identifier: string, cluster: Cluster = NETWORK)
    const type = typeOrSignature as 'tx' | 'address' | 'token';
    const identifier = identifierOrType;
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
  }
};

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

