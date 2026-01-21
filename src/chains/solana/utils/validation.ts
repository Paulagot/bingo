/**
 * Input Validation Utilities
 * 
 * Validates user inputs before submitting transactions to catch errors early.
 * Provides clear error messages to users.
 * 
 * ## Usage
 * 
 * ```typescript
 * import { validatePoolRoomParams } from './validation';
 * 
 * const result = validatePoolRoomParams({
 *   roomId: 'my-room-123',
 *   currency: 'USDC',
 *   entryFee: 1.5,
 *   // ...
 * });
 * 
 * if (!result.success) {
 *   throw new Error(result.errors.join(', '));
 * }
 * ```
 */

import { PublicKey } from '@solana/web3.js';
import { SOLANA_CONTRACT } from '../config/contracts';
import type { CreatePoolRoomParams, CreateAssetRoomParams, ValidationResult } from './types';

/**
 * Validate a Solana public key address
 */
export function isValidPublicKey(address: string | PublicKey): boolean {
  try {
    if (typeof address === 'string') {
      new PublicKey(address);
    } else {
      // Already a PublicKey, validate it's not default
      if (address.equals(PublicKey.default)) {
        return false;
      }
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Validate room ID format and length
 */
export function validateRoomId(roomId: string): ValidationResult {
  const errors: string[] = [];
  
  if (!roomId || roomId.trim().length === 0) {
    errors.push('Room ID is required');
  } else if (roomId.length > SOLANA_CONTRACT.MAX_ROOM_ID_LENGTH) {
    errors.push(
      `Room ID too long: ${roomId.length} characters (max ${SOLANA_CONTRACT.MAX_ROOM_ID_LENGTH})`
    );
  } else if (!/^[a-zA-Z0-9_-]+$/.test(roomId)) {
    errors.push('Room ID can only contain letters, numbers, hyphens, and underscores');
  }
  
  return {
    success: errors.length === 0,
    errors,
  };
}

/**
 * Validate charity wallet address
 */
export function validateCharityWallet(wallet: PublicKey | string): ValidationResult {
  const errors: string[] = [];
  
  if (!wallet) {
    errors.push('Charity wallet address is required');
  } else if (!isValidPublicKey(wallet)) {
    errors.push('Invalid charity wallet address');
  }
  
  return {
    success: errors.length === 0,
    errors,
  };
}

/**
 * Validate entry fee amount
 */
export function validateEntryFee(fee: number): ValidationResult {
  const errors: string[] = [];
  
  if (fee === null || fee === undefined) {
    errors.push('Entry fee is required');
  } else if (isNaN(fee)) {
    errors.push('Entry fee must be a valid number');
  } else if (fee <= 0) {
    errors.push('Entry fee must be greater than 0');
  } else if (fee > 1_000) {
    errors.push('Entry fee is too large (max 1,000,000)');
  }
  
  return {
    success: errors.length === 0,
    errors,
  };
}

/**
 * Validate max players
 */
export function validateMaxPlayers(maxPlayers: number): ValidationResult {
  const errors: string[] = [];
  
  if (maxPlayers === null || maxPlayers === undefined) {
    errors.push('Max players is required');
  } else if (!Number.isInteger(maxPlayers)) {
    errors.push('Max players must be a whole number');
  } else if (maxPlayers < 1) {
    errors.push('Max players must be at least 1');
  } else if (maxPlayers > SOLANA_CONTRACT.MAX_PLAYERS) {
    errors.push(`Max players cannot exceed ${SOLANA_CONTRACT.MAX_PLAYERS}`);
  }
  
  return {
    success: errors.length === 0,
    errors,
  };
}

/**
 * Validate host fee percentage
 */
export function validateHostFee(hostFeePct: number): ValidationResult {
  const errors: string[] = [];
  
  if (hostFeePct === null || hostFeePct === undefined) {
    errors.push('Host fee percentage is required');
  } else if (isNaN(hostFeePct)) {
    errors.push('Host fee must be a valid number');
  } else if (hostFeePct < 0) {
    errors.push('Host fee cannot be negative');
  } else if (hostFeePct > 5) {
    errors.push('Host fee cannot exceed 5%');
  }
  
  return {
    success: errors.length === 0,
    errors,
  };
}

/**
 * Validate prize pool percentage
 */
export function validatePrizePool(prizePoolPct: number, hostFeePct: number): ValidationResult {
  const errors: string[] = [];
  
  if (prizePoolPct === null || prizePoolPct === undefined) {
    errors.push('Prize pool percentage is required');
  } else if (isNaN(prizePoolPct)) {
    errors.push('Prize pool must be a valid number');
  } else if (prizePoolPct < 0) {
    errors.push('Prize pool cannot be negative');
  } else if (prizePoolPct > 40) {
    errors.push('Prize pool cannot exceed 40%');
  }
  
  // Check total allocation
  const totalHostAllocation = hostFeePct + prizePoolPct;
  if (totalHostAllocation > 40) {
    errors.push(
      `Host fee (${hostFeePct}%) + Prize pool (${prizePoolPct}%) cannot exceed 40% (currently ${totalHostAllocation}%)`
    );
  }
  
  // Check charity minimum
  const charityPct = 100 - 20 - totalHostAllocation; // 20% platform fee
  if (charityPct < 40) {
    errors.push(
      `Charity allocation must be at least 40% (currently ${charityPct}%). Reduce host fee or prize pool.`
    );
  }
  
  return {
    success: errors.length === 0,
    errors,
  };
}

/**
 * Validate prize splits for pool rooms
 */
export function validatePrizeSplits(splits?: {
  first: number;
  second?: number;
  third?: number;
}): ValidationResult {
  const errors: string[] = [];
  
  if (!splits) {
    // No splits provided, will use defaults (100% to first place)
    return { success: true, errors: [] };
  }
  
  const first = splits.first ?? 0;
  const second = splits.second ?? 0;
  const third = splits.third ?? 0;
  
  if (first < 0 || second < 0 || third < 0) {
    errors.push('Prize split percentages cannot be negative');
  }
  
  const total = first + second + third;
  if (Math.abs(total - 100) > 0.01) {
    // Allow small floating point errors
    errors.push(
      `Prize splits must total 100% (currently ${total}%)`
    );
  }
  
  if (first === 0) {
    errors.push('First place prize split cannot be 0%');
  }
  
  return {
    success: errors.length === 0,
    errors,
  };
}

/**
 * Validate charity memo/name
 */
export function validateCharityMemo(memo?: string): ValidationResult {
  const errors: string[] = [];
  
  if (memo && memo.length > SOLANA_CONTRACT.MAX_CHARITY_MEMO) {
    errors.push(
      `Charity name too long: ${memo.length} characters (max ${SOLANA_CONTRACT.MAX_CHARITY_MEMO})`
    );
  }
  
  return {
    success: errors.length === 0,
    errors,
  };
}

/**
 * Validate all pool room parameters at once
 */
export function validatePoolRoomParams(params: CreatePoolRoomParams): ValidationResult {
  console.log('[Solana][Validation] 🔍 Validating pool room parameters');
  
  const allErrors: string[] = [];
  
  // Validate each field
  const roomIdResult = validateRoomId(params.roomId);
  allErrors.push(...roomIdResult.errors);
  
  const entryFeeResult = validateEntryFee(params.entryFee);
  allErrors.push(...entryFeeResult.errors);
  
  const maxPlayersResult = validateMaxPlayers(params.maxPlayers);
  allErrors.push(...maxPlayersResult.errors);
  
  const hostFeeResult = validateHostFee(params.hostFeePct);
  allErrors.push(...hostFeeResult.errors);
  
  const prizePoolResult = validatePrizePool(params.prizePoolPct, params.hostFeePct);
  allErrors.push(...prizePoolResult.errors);
  
  const prizeSplitsResult = validatePrizeSplits(params.prizeSplits);
  allErrors.push(...prizeSplitsResult.errors);
  
  const charityMemoResult = validateCharityMemo(params.charityName);
  allErrors.push(...charityMemoResult.errors);
  
  if (allErrors.length > 0) {
    console.error('[Solana][Validation] ❌ Validation failed:', allErrors);
  } else {
    console.log('[Solana][Validation] ✅ All validations passed');
  }
  
  return {
    success: allErrors.length === 0,
    errors: allErrors,
  };
}

/**
 * Validate all asset room parameters at once
 */
export function validateAssetRoomParams(params: CreateAssetRoomParams): ValidationResult {
  console.log('[Solana][Validation] 🔍 Validating asset room parameters');
  
  const allErrors: string[] = [];
  
  // Validate common fields
  const roomIdResult = validateRoomId(params.roomId);
  allErrors.push(...roomIdResult.errors);
  
  const entryFeeResult = validateEntryFee(params.entryFee);
  allErrors.push(...entryFeeResult.errors);
  
  const maxPlayersResult = validateMaxPlayers(params.maxPlayers);
  allErrors.push(...maxPlayersResult.errors);
  
  const hostFeeResult = validateHostFee(params.hostFeePct);
  allErrors.push(...hostFeeResult.errors);
  
  const charityMemoResult = validateCharityMemo(params.charityName);
  allErrors.push(...charityMemoResult.errors);
  
  // Validate prizes
  if (!params.expectedPrizes || params.expectedPrizes.length === 0) {
    allErrors.push('Asset room requires at least 1 prize');
  } else if (params.expectedPrizes.length > SOLANA_CONTRACT.ASSET_ROOM.MAX_PRIZES) {
    allErrors.push(
      `Asset room can have at most ${SOLANA_CONTRACT.ASSET_ROOM.MAX_PRIZES} prizes`
    );
  }
  
  if (allErrors.length > 0) {
    console.error('[Solana][Validation] ❌ Validation failed:', allErrors);
  } else {
    console.log('[Solana][Validation] ✅ All validations passed');
  }
  
  return {
    success: allErrors.length === 0,
    errors: allErrors,
  };
}
