/**
 * TypeScript Types for Solana Operations
 * 
 * Centralized type definitions for all Solana contract interactions.
 * Mirrors the pattern used in EVM for consistency.
 */

import type { PublicKey, Connection } from '@solana/web3.js';
import type { AnchorProvider, Program } from '@coral-xyz/anchor';
import type { Prize } from '@/components/Quiz/types/quiz';

// ✅ UPDATED: import SolanaTokenCode from new multi-token config
// This replaces the old local type 'SolanaTokenSymbol = USDC | PYUSD | USDT'
// and supports all 11 tokens: SOL, USDG, JUP, BONK, WIF, JTO, KMNO,  TRUMP, MEW, PYTH
import type { SolanaTokenCode } from '../config/solanaTokenConfig';

// Re-export so other files that imported SolanaTokenSymbol from here can
// switch to SolanaTokenCode without changing their import path (optional convenience)
export type { SolanaTokenCode };

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
 * @deprecated Use SolanaTokenCode from solanaTokenConfig instead.
 * Kept temporarily so old imports don't break during migration.
 * Delete once all usages are updated.
 */
export type SolanaTokenSymbol = SolanaTokenCode;

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
  currency: SolanaTokenCode; // ✅ updated: was SolanaTokenSymbol
  entryFee: number;          // In token units (e.g., 1.5 USDG)
  maxPlayers: number;
  hostFeePct: number;        // 0-5
  prizePoolPct: number;      // 0-40
  charityName?: string;      // Optional charity memo for display (max 28 chars)
  prizeSplits?: {
    first: number;
    second?: number;
    third?: number;
  };
}

/**
 * Pool room creation result
 */
export interface CreatePoolRoomResult {
  success: true;
  contractAddress: string; // Room PDA (base58)
  txHash: string;
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
  currency: SolanaTokenCode; // ✅ updated: was SolanaTokenSymbol
  entryFee: number;
  maxPlayers: number;
  hostFeePct: number;   // 0-5
  charityName?: string; // Optional charity memo for display (max 28 chars)
  expectedPrizes: Prize[];
}

/**
 * Asset room creation result
 */
export interface CreateAssetRoomResult {
  success: true;
  contractAddress: string;
  txHash: string;
  explorerUrl?: string;
  roomVault: string;
  expectedPrizes: number;
  status: 'AwaitingFunding';
}

/**
 * Add prize asset parameters
 */
export interface AddPrizeAssetParams {
  roomId: string;
  roomAddress: string | PublicKey;
  prizeIndex: number;
  prizeMint: string | PublicKey;
}

/**
 * Add prize asset result
 */
export interface AddPrizeAssetResult {
  success: true;
  txHash: string;
  explorerUrl?: string;
  prizeIndex: number;
  newStatus: string;
  allDeposited: boolean;
}

// ============================================================================
// JOIN ROOM TYPES
// ============================================================================

/**
 * Join room parameters
 */
export interface JoinRoomParams {
  roomId: string;
  roomAddress?: PublicKey;
  entryFee?: number;
  extrasAmount?: number;
  currency?: SolanaTokenCode; // ✅ updated: was SolanaTokenSymbol
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
 */
export interface DistributePrizesParams {
  roomId: string;
  roomAddress: PublicKey;
  winners: PublicKey[];
  charityOrgId?: string;
  charityWallet?: PublicKey;
  charityAmountPreview?: string;
}

/**
 * Distribute prizes result
 */
export interface DistributePrizesResult {
  success: true;
  txHash: string;
  explorerUrl?: string;
  charityAmount?: string;
  declareWinnersTxHash?: string;
  cleanupTxHash?: string;
  rentReclaimed?: number;
  tgbDepositAddress?: string;
}

// ============================================================================
// CLOSE JOINING TYPES
// ============================================================================

export interface CloseJoiningParams {
  roomId: string;
  hostPubkey: PublicKey;
}

export interface CloseJoiningResult {
  success: true;
  txHash: string;
  explorerUrl?: string;
}

// ============================================================================
// DECLARE WINNERS TYPES
// ============================================================================

export interface DeclareWinnersParams {
  roomId: string;
  hostPubkey: PublicKey;
  winners: PublicKey[];
}

export interface DeclareWinnersResult {
  success: true;
  txHash: string;
  explorerUrl?: string;
}

// ============================================================================
// CLEANUP ROOM TYPES
// ============================================================================

export interface CleanupRoomParams {
  roomId: string;
  hostPubkey: PublicKey;
}

export interface CleanupRoomResult {
  success: true;
  txHash: string;
  rentReclaimed: number;
  explorerUrl?: string;
}

// ============================================================================
// VALIDATION TYPES
// ============================================================================

export interface ValidationResult {
  success: boolean;
  errors: string[];
}

export interface FeeStructure {
  platform: number;
  host: number;
  prizePool: number;
  charity: number;
  total: number;
}

// ============================================================================
// ON-CHAIN ACCOUNT TYPES
// ============================================================================

export interface GlobalConfigAccount {
  platformWallet: PublicKey;
  charityWallet: PublicKey;
  platformFeeBps: number;
  maxPrizePoolBps: number;
  admin: PublicKey;
}

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

export interface PlayerEntryAccount {
  player: PublicKey;
  room: PublicKey;
  entryFeePaid: bigint;
  extrasPaid: bigint;
  joinedAt: bigint;
}