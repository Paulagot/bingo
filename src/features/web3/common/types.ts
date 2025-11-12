/**
 * @module features/web3/common/types
 *
 * Common types for multi-chain Web3 operations
 *
 * Provides unified interfaces that work across Solana, EVM, and Stellar chains.
 * These abstractions enable consistent API regardless of underlying blockchain.
 */

/**
 * Supported blockchain networks
 */
export type SupportedChain = 'solana' | 'evm' | 'stellar';

/**
 * Generic room creation parameters (chain-agnostic)
 */
export interface CreateRoomParams {
  roomId: string;
  hostWallet: string;
  entryFee: string | number;
  maxPlayers: number;
  hostFeePct: number;
  prizePoolPct?: number;
  charityAddress?: string;
  charityName?: string;
  currency?: string;
  prizeMode?: 'pool' | 'assets';
  prizeSplits?: {
    first: number;
    second?: number;
    third?: number;
  };
  expectedPrizes?: Array<{
    tokenAddress: string;
    amount: string;
  }>;
}

/**
 * Generic room creation result (chain-agnostic)
 */
export interface CreateRoomResult {
  success: true;
  contractAddress: string;
  txHash: string;
  explorerUrl?: string;
}

/**
 * Generic join room parameters (chain-agnostic)
 */
export interface JoinRoomParams {
  roomId: string;
  roomAddress?: string;
  entryFee?: string | number;
  extrasAmount?: string | number;
  currency?: string;
}

/**
 * Generic join room result (chain-agnostic)
 */
export interface JoinRoomResult {
  success: true;
  txHash: string;
  explorerUrl?: string;
}

/**
 * Generic prize distribution parameters (chain-agnostic)
 */
export interface DistributePrizesParams {
  roomId: string;
  roomAddress?: string;
  winners: Array<{
    playerId: string;
    address?: string | null;
    rank?: number;
    amount?: string;
  }>;
  charityOrgId?: string;
  charityName?: string;
  charityAddress?: string;
  charityWallet?: string;
  web3Chain?: string;
  evmNetwork?: string;
}

/**
 * Generic prize distribution result (chain-agnostic)
 */
export interface DistributePrizesResult {
  success: true;
  txHash: string;
  explorerUrl?: string;
  cleanupTxHash?: string;
  rentReclaimed?: number;
  charityAmount?: string;
}

/**
 * Generic error result (chain-agnostic)
 */
export interface ErrorResult {
  success: false;
  error: string;
  errorType?: string;
  errorDetails?: any;
}

/**
 * Generic operation result (success or error)
 */
export type OperationResult<T> = T | ErrorResult;
