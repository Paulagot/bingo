/**
 * @module features/web3/solana/model/types
 *
 * Type definitions for Solana contract operations
 *
 * Defines all parameter and result types for Solana smart contract interactions.
 * These types ensure type safety across the application when working with the
 * Solana Bingo program.
 */

import { PublicKey, Transaction } from '@solana/web3.js';
import { BN, Program, AnchorProvider } from '@coral-xyz/anchor';

/**
 * Room creation parameters for pool-based rooms
 */
export interface CreatePoolRoomParams {
  roomId: string;
  charityWallet: PublicKey;
  entryFee: BN;
  maxPlayers: number;
  hostFeeBps: number;
  prizePoolBps: number;
  firstPlacePct?: number;
  secondPlacePct?: number;
  thirdPlacePct?: number;
  charityMemo: string;
  expirationSlots?: BN;
  feeTokenMint: PublicKey;
}

/**
 * Room creation parameters for asset-based rooms
 */
export interface CreateAssetRoomParams {
  roomId: string;
  charityWallet: PublicKey;
  entryFee: BN;
  maxPlayers: number;
  hostFeeBps: number;
  charityMemo: string;
  expirationSlots?: BN;
  feeTokenMint: PublicKey;
  prize1Mint: PublicKey;
  prize1Amount: BN;
  prize2Mint?: PublicKey;
  prize2Amount?: BN;
  prize3Mint?: PublicKey;
  prize3Amount?: BN;
}

/**
 * Room creation result
 */
export interface RoomCreationResult {
  signature: string;
  room: string;
}

/**
 * Player join parameters
 */
export interface JoinRoomParams {
  roomId: string;
  entryFee: BN;
  extrasAmount?: BN;
}

/**
 * Player join result
 */
export interface JoinRoomResult {
  signature: string;
  playerEntry: string;
}

/**
 * Winner declaration parameters
 */
export interface DeclareWinnersParams {
  roomId: string;
  winners: PublicKey[];
}

/**
 * Prize distribution parameters
 */
export interface DistributePrizesParams {
  roomId: string;
  winners: string[];
  roomAddress?: string;
  charityWallet?: string;
}

/**
 * Prize distribution result
 */
export interface DistributePrizesResult {
  signature: string;
  cleanupSignature?: string;
  cleanupError?: string;
  rentReclaimed?: number;
  charityAmount?: string;
}

/**
 * Prize asset deposit parameters
 */
export interface DepositPrizeAssetParams {
  roomId: string;
  prizeIndex: number;
  prizeMint: PublicKey;
}

/**
 * Room information from on-chain account
 */
export interface RoomInfo {
  roomId: string;
  host: PublicKey;
  charityWallet: PublicKey;
  feeTokenMint: PublicKey;
  entryFee: BN;
  hostFeeBps: number;
  prizePoolBps: number;
  charityBps: number;
  status: RoomStatus;
  playerCount: number;
  maxPlayers: number;
  totalCollected: BN;
  winners: PublicKey[];
  prizeDistribution?: number[];
  prizeAssets?: PrizeAsset[];
}

/**
 * Room status enum
 */
export enum RoomStatus {
  Ready = 'Ready',
  Active = 'Active',
  Ended = 'Ended',
  AwaitingFunding = 'AwaitingFunding',
}

/**
 * Prize asset configuration
 */
export interface PrizeAsset {
  mint: PublicKey;
  amount: BN;
  uploaded: boolean;
}

/**
 * Player entry information
 */
export interface PlayerEntryInfo {
  player: PublicKey;
  room: PublicKey;
  entryPaid: BN;
  extrasPaid: BN;
  totalPaid: BN;
  joinSlot: BN;
}

/**
 * Global config parameters
 */
export interface GlobalConfigParams {
  platformWallet?: PublicKey;
  charityWallet?: PublicKey;
  platformFeeBps?: number;
  maxHostFeeBps?: number;
  maxPrizePoolBps?: number;
  minCharityBps?: number;
}

/**
 * Solana contract context
 */
export interface SolanaContractContext {
  program: Program | null;
  provider: AnchorProvider | null;
  publicKey: PublicKey | null;
  connected: boolean;
  isReady: boolean;
  connection?: import('@solana/web3.js').Connection; // Optional connection for operations that need it
}

/**
 * Room cleanup result
 */
export interface CleanupRoomResult {
  signature: string;
  rentReclaimed: number;
}

/**
 * Token mint creation result
 */
export interface CreateTokenMintResult {
  mint: PublicKey;
  signature: string;
  explorerUrl: string;
}
