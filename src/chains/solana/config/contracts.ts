/**
 * Solana Contract Configuration
 * 
 * Defines the quiz_core program for Solana fundraising rooms.
 * Unlike EVM which has separate factory contracts for pool and asset rooms,
 * Solana uses a SINGLE program that handles both room types via different instructions.
 * 
 * ## Program Architecture
 * 
 * The quiz_core program handles both pool and asset rooms:
 * - init_pool_room: Create pool-based rooms (prizes from entry fee pool)
 * - init_asset_room: Create asset-based rooms (pre-deposited prize assets)
 * - join_room: Players join and pay entry fee (works for both room types)
 * - declare_winners: Host declares winners (works for both room types)
 * - end_room: Distribute prizes to winners (works for both room types)
 * - cleanup_room: Reclaim rent after room ends (works for both room types)
 * 
 * ## Network Deployment
 * 
 * The same Program ID works on all clusters:
 * - Devnet: For development and testing (default)
 * - Testnet: Alternative testnet
 * - Mainnet: Production deployment (when ready)
 * 
 * ## Usage
 * 
 * ```typescript
 * import { SOLANA_CONTRACT } from './contracts';
 * 
 * // Program ID works on all clusters
 * const programId = SOLANA_CONTRACT.PROGRAM_ID;
 * 
 * // Get cluster-specific explorer URL
 * const cluster = 'devnet'; // from QuizConfig.solanaCluster
 * const explorerUrl = getProgramExplorerUrl(cluster);
 * ```
 */

import { PublicKey } from '@solana/web3.js';

/**
 * Main contract configuration
 * Single program handles both pool and asset rooms
 */
export const SOLANA_CONTRACT = {
  /**
   * Quiz Core Program ID (same across all clusters)
   * 
   * This program handles both pool and asset rooms.
   * Deployed from: quiz_core anchor program
   */
  PROGRAM_ID: new PublicKey('8nua5UPnPTyywyUyuPY8S65kWzNZsCp1ceqNxBao3apC'),
  
  /**
   * Fee structure constraints (enforced by on-chain program)
   */
  PLATFORM_FEE_BPS: 2000, // 20% fixed (set in GlobalConfig)
  MAX_HOST_FEE_BPS: 500,  // 5% max (0-5% configurable by host)
  MAX_PRIZE_POOL_BPS: 4000, // 40% max (host fee + prize pool ≤ 40%)
  MIN_CHARITY_BPS: 4000,  // 40% min (remainder after platform + host)
  
  /**
   * Room type specific limits
   */
  POOL_ROOM: {
    // Default prize split percentages (total must equal 100%)
    DEFAULT_PRIZE_SPLITS: {
      first: 100,  // 100% to first place
      second: 0,   // 0% to second place
      third: 0,    // 0% to third place
    },
  },
  
  ASSET_ROOM: {
    MAX_PRIZES: 3, // Up to 3 prizes for asset rooms (1st, 2nd, 3rd place)
  },
  
  /**
   * Room configuration limits
   */
  MAX_PLAYERS: 1000,        // Maximum players per room
  MAX_ROOM_ID_LENGTH: 32,   // Max length for room ID string
  MAX_CHARITY_MEMO: 28,     // Max length for charity memo field
  
  /**
   * PDA Seeds (used for deriving Program Derived Addresses)
   * IMPORTANT: These MUST match exactly what's in the Rust program!
   */
  SEEDS: {
    GLOBAL_CONFIG: 'global-config',       // ✅ Matches Rust: b"global-config"
    TOKEN_REGISTRY: 'token-registry-v2',  // ✅ Matches Rust: b"token-registry-v2"
    ROOM: 'room',
    ROOM_VAULT: 'room-vault',
    PLAYER: 'player',
    PRIZE_VAULT: 'prize-vault',
  },
} as const;

/**
 * Get program explorer URL for a specific cluster
 */
export function getProgramExplorerUrl(cluster: 'mainnet' | 'devnet' | 'testnet' = 'devnet'): string {
  const programId = SOLANA_CONTRACT.PROGRAM_ID.toBase58();
  
  if (cluster === 'mainnet') {
    return `https://explorer.solana.com/address/${programId}`;
  }
  
  return `https://explorer.solana.com/address/${programId}?cluster=${cluster}`;
}

/**
 * Validate fee structure meets program constraints
 * Works for both pool and asset rooms
 */
export function validateFeeStructure(hostFeeBps: number, prizePoolBps: number): {
  valid: boolean;
  error?: string;
} {
  if (hostFeeBps < 0 || hostFeeBps > SOLANA_CONTRACT.MAX_HOST_FEE_BPS) {
    return {
      valid: false,
      error: `Host fee must be between 0 and ${SOLANA_CONTRACT.MAX_HOST_FEE_BPS / 100}% (0-${SOLANA_CONTRACT.MAX_HOST_FEE_BPS} BPS)`,
    };
  }
  
  if (prizePoolBps < 0) {
    return {
      valid: false,
      error: 'Prize pool cannot be negative',
    };
  }
  
  const totalHostAllocation = hostFeeBps + prizePoolBps;
  if (totalHostAllocation > SOLANA_CONTRACT.MAX_PRIZE_POOL_BPS) {
    return {
      valid: false,
      error: `Host fee + prize pool cannot exceed ${SOLANA_CONTRACT.MAX_PRIZE_POOL_BPS / 100}% (${SOLANA_CONTRACT.MAX_PRIZE_POOL_BPS} BPS)`,
    };
  }
  
  // Calculate charity percentage
  const charityBps = 10_000 - SOLANA_CONTRACT.PLATFORM_FEE_BPS - totalHostAllocation;
  if (charityBps < SOLANA_CONTRACT.MIN_CHARITY_BPS) {
    return {
      valid: false,
      error: `Charity allocation must be at least ${SOLANA_CONTRACT.MIN_CHARITY_BPS / 100}% (${SOLANA_CONTRACT.MIN_CHARITY_BPS} BPS)`,
    };
  }
  
  return { valid: true };
}

/**
 * Calculate fee breakdown in basis points
 * Works for both pool and asset rooms
 */
export function calculateFeeBps(hostFeeBps: number, prizePoolBps: number): {
  platform: number;
  host: number;
  prizePool: number;
  charity: number;
  total: number;
} {
  const platform = SOLANA_CONTRACT.PLATFORM_FEE_BPS;
  const host = hostFeeBps;
  const prizePool = prizePoolBps;
  const charity = 10_000 - platform - host - prizePool;
  
  return {
    platform,
    host,
    prizePool,
    charity,
    total: 10_000,
  };
}