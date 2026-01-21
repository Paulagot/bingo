/**
 * TypeScript Types for Solana Operations
 * 
 * Centralized type definitions for all Solana contract interactions.
 * Mirrors the pattern used in EVM for consistency.
 */

import type { PublicKey, Connection } from '@solana/web3.js';
import type { AnchorProvider, Program } from '@coral-xyz/anchor';
import type { Prize } from '@/components/Quiz/types/quiz';

/**
 * Solana contract context
 * Similar to EVM's context but with Anchor-specific types
 */
export interface SolanaContractContext {
  publicKey: PublicKey | null;
  connection: Connection | null;
  provider: AnchorProvider | null;
  program: Program | null;
  isConnected: boolean;
}

/**
 * Network cluster type
 */
export type SolanaCluster = 'mainnet' | 'devnet' | 'testnet';

/**
 * Supported SPL token symbols
 */
export type SolanaTokenSymbol = 'USDC' | 'PYUSD' | 'USDT';

// ============================================================================
// POOL ROOM TYPES
// ============================================================================

/**
 * Pool room creation parameters
 * Mirrors EvmDeployParams structure
 * 
 * NOTE: No charityWallet parameter! Charity wallet is provided at distribution time,
 * not at room creation. This enables dynamic TGB charity addresses.
 */
export interface CreatePoolRoomParams {
  roomId: string;
  currency: SolanaTokenSymbol;
  entryFee: number; // In token units (e.g., 1.5 USDC)
  maxPlayers: number;
  hostFeePct: number; // 0-5
  prizePoolPct: number; // 0-40
  charityName?: string; // Optional charity memo for display (max 28 chars)
  prizeSplits?: {
    first: number;
    second?: number;
    third?: number;
  };
}

/**
 * Pool room creation result
 * Mirrors EvmDeployResult structure
 */
export interface CreatePoolRoomResult {
  success: true;
  contractAddress: string; // Room PDA (base58)
  txHash: string; // Transaction signature
  explorerUrl?: string;
}

// ============================================================================
// ASSET ROOM TYPES
// ============================================================================

/**
 * Asset room creation parameters
 * 
 * NOTE: No charityWallet parameter! Charity wallet is provided at distribution time.
 */
export interface CreateAssetRoomParams {
  roomId: string;
  currency: SolanaTokenSymbol;
  entryFee: number;
  maxPlayers: number;
  hostFeePct: number; // 0-5
  charityName?: string; // Optional charity memo for display (max 28 chars)
  expectedPrizes: Prize[]; // Must have at least 1 prize
}

/**
 * Asset room creation result
 */
export interface CreateAssetRoomResult {
  success: true;
  contractAddress: string;
  txHash: string;
  explorerUrl?: string;
  roomVault: string; // Entry fee vault address
  expectedPrizes: number; // Number of prizes to deposit
  status: 'AwaitingFunding';
}

/**
 * Add prize asset parameters
 */
export interface AddPrizeAssetParams {
  roomId: string;
  roomAddress: string | PublicKey; // Room PDA
  prizeIndex: number; // 0 = first place, 1 = second, 2 = third
  prizeMint: string | PublicKey; // Token mint for the prize
}

/**
 * Add prize asset result
 */
export interface AddPrizeAssetResult {
  success: true;
  txHash: string;
  explorerUrl?: string;
  prizeIndex: number;
  newStatus: string; // 'PartiallyFunded' or 'Ready'
  allDeposited: boolean; // True if all prizes now deposited
}

// ============================================================================
// JOIN ROOM TYPES
// ============================================================================

/**
 * Join room parameters
 * Mirrors EVM join parameters
 */
export interface JoinRoomParams {
  roomId: string;
  roomAddress?: PublicKey; // Optional: provide room PDA directly
  entryFee?: number; // Optional: will fetch from room if not provided
  extrasAmount?: number; // Additional donation beyond entry fee
  currency?: SolanaTokenSymbol; // Optional: will fetch from room if not provided
}

/**
 * Join room result
 */
export interface JoinRoomResult {
  success: boolean;
  txHash: string;
  explorerUrl?: string;
  alreadyPaid?: boolean; 
}

// ============================================================================
// DISTRIBUTE PRIZES TYPES
// ============================================================================

/**
 * Distribute prizes parameters
 * 
 * NOTE: This is where charityWallet is provided! It's generated dynamically
 * from TGB API right before distribution.
 */
export interface DistributePrizesParams {
  roomId: string;
  roomAddress: PublicKey;
  winners: PublicKey[]; // Winner wallet addresses
  charityOrgId?: string; // For TGB integration (hook will call TGB API)
  charityWallet?: PublicKey; // Optional fallback if TGB fails or no TGB integration
  charityAmountPreview?: string; // Expected charity amount (for validation)
}

/**
 * Distribute prizes result
 */
export interface DistributePrizesResult {
  success: true;
  txHash: string;
  explorerUrl?: string;
  charityAmount?: string; // Actual charity amount from blockchain event
  declareWinnersTxHash?: string; // Solana-specific: declare_winners transaction
  cleanupTxHash?: string; // Solana-specific: cleanup_room transaction (if called)
  rentReclaimed?: number; // Solana-specific: rent reclaimed in lamports
  tgbDepositAddress?: string; // TGB deposit address for charity
}

// ============================================================================
// CLOSE JOINING TYPES
// ============================================================================

/**
 * Close joining parameters
 */
export interface CloseJoiningParams {
  roomId: string;
  hostPubkey: PublicKey;
}

/**
 * Close joining result
 */
export interface CloseJoiningResult {
  success: true;
  txHash: string;
  explorerUrl?: string;
}

// ============================================================================
// DECLARE WINNERS TYPES
// ============================================================================

/**
 * Declare winners parameters
 */
export interface DeclareWinnersParams {
  roomId: string;
  hostPubkey: PublicKey;
  winners: PublicKey[];
}

/**
 * Declare winners result
 */
export interface DeclareWinnersResult {
  success: true;
  txHash: string;
  explorerUrl?: string;
}

// ============================================================================
// CLEANUP ROOM TYPES
// ============================================================================

/**
 * Cleanup room parameters
 */
export interface CleanupRoomParams {
  roomId: string;
  hostPubkey: PublicKey;
}

/**
 * Cleanup room result
 */
export interface CleanupRoomResult {
  success: true;
  txHash: string;
  rentReclaimed: number; // Lamports reclaimed
  explorerUrl?: string;
}

// ============================================================================
// VALIDATION TYPES
// ============================================================================

/**
 * Validation result
 * Used by validation utilities
 */
export interface ValidationResult {
  success: boolean;
  errors: string[];
}

/**
 * Fee structure breakdown (in basis points)
 */
export interface FeeStructure {
  platform: number; // Platform fee (20% = 2000 BPS)
  host: number; // Host fee (0-5% = 0-500 BPS)
  prizePool: number; // Prize pool (0-40% = 0-4000 BPS)
  charity: number; // Charity (remainder)
  total: number; // Should always equal 10000 (100%)
}

// ============================================================================
// ON-CHAIN ACCOUNT TYPES (for reference)
// ============================================================================

/**
 * GlobalConfig account structure
 * These match the Rust program's account layouts
 */
export interface GlobalConfigAccount {
  platformWallet: PublicKey;
  charityWallet: PublicKey;
  platformFeeBps: number;
  maxPrizePoolBps: number;
  admin: PublicKey;
}

/**
 * Room account structure (simplified)
 */
export interface RoomAccount {
  host: PublicKey;
  roomId: string;
  feeTokenMint: PublicKey;
  entryFee: bigint;
  maxPlayers: number;
  playerCount: number;
  hostFeeBps: number;
  prizePoolBps: number;
  charityWallet: PublicKey;
  started: boolean;
  ended: boolean;
  winners?: PublicKey[];
}

/**
 * PlayerEntry account structure
 */
export interface PlayerEntryAccount {
  player: PublicKey;
  room: PublicKey;
  entryFeePaid: bigint;
  extrasPaid: bigint;
  joinedAt: bigint;
}