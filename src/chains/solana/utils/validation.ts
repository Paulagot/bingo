/**
 * Input Validation Utilities — updated for new contract
 *
 * ## What changed
 *
 * validatePoolRoomParams: removed hostFee, prizePool, prizeSplits, charityMemo,
 * and maxPlayers validation. The new contract only needs roomId + entryFee.
 *
 * validateAssetRoomParams: removed entirely (asset rooms are gone).
 *
 * Individual validators (validateHostFee, validatePrizePool, etc.) are kept
 * in case EVM still calls them, but they are no longer called for Solana pool rooms.
 */

import { PublicKey } from '@solana/web3.js';
import { SOLANA_CONTRACT } from '../config/contracts';
import type { CreatePoolRoomParams, ValidationResult } from './types';

// ---------------------------------------------------------------------------
// Primitive validators (kept for EVM compatibility)
// ---------------------------------------------------------------------------

export function isValidPublicKey(address: string | PublicKey): boolean {
  try {
    if (typeof address === 'string') {
      new PublicKey(address);
    } else {
      if (address.equals(PublicKey.default)) return false;
    }
    return true;
  } catch {
    return false;
  }
}

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

  return { success: errors.length === 0, errors };
}

export function validateEntryFee(fee: number): ValidationResult {
  const errors: string[] = [];

  if (fee === null || fee === undefined) {
    errors.push('Entry fee is required');
  } else if (isNaN(fee)) {
    errors.push('Entry fee must be a valid number');
  } else if (fee <= 0) {
    errors.push('Entry fee must be greater than 0');
  } else if (fee > 1_000_000) {
    errors.push('Entry fee is too large');
  }

  return { success: errors.length === 0, errors };
}

export function validateCharityWallet(wallet: PublicKey | string): ValidationResult {
  const errors: string[] = [];
  if (!wallet) errors.push('Charity wallet address is required');
  else if (!isValidPublicKey(wallet)) errors.push('Invalid charity wallet address');
  return { success: errors.length === 0, errors };
}

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
  return { success: errors.length === 0, errors };
}

export function validateHostFee(hostFeePct: number): ValidationResult {
  const errors: string[] = [];
  if (hostFeePct === null || hostFeePct === undefined || isNaN(hostFeePct)) {
    errors.push('Host fee must be a valid number');
  } else if (hostFeePct < 0) {
    errors.push('Host fee cannot be negative');
  } else if (hostFeePct > 5) {
    errors.push('Host fee cannot exceed 5%');
  }
  return { success: errors.length === 0, errors };
}

export function validatePrizePool(prizePoolPct: number, hostFeePct: number): ValidationResult {
  const errors: string[] = [];
  if (prizePoolPct === null || prizePoolPct === undefined || isNaN(prizePoolPct)) {
    errors.push('Prize pool must be a valid number');
  } else if (prizePoolPct < 0) {
    errors.push('Prize pool cannot be negative');
  } else if (prizePoolPct > 40) {
    errors.push('Prize pool cannot exceed 40%');
  }
  const totalHostAllocation = hostFeePct + prizePoolPct;
  if (totalHostAllocation > 40) {
    errors.push(`Host fee + prize pool cannot exceed 40% (currently ${totalHostAllocation}%)`);
  }
  return { success: errors.length === 0, errors };
}

export function validatePrizeSplits(splits?: {
  first: number; second?: number; third?: number;
}): ValidationResult {
  if (!splits) return { success: true, errors: [] };

  const errors: string[] = [];
  const first  = splits.first  ?? 0;
  const second = splits.second ?? 0;
  const third  = splits.third  ?? 0;

  if (first < 0 || second < 0 || third < 0) {
    errors.push('Prize split percentages cannot be negative');
  }
  const total = first + second + third;
  if (Math.abs(total - 100) > 0.01) {
    errors.push(`Prize splits must total 100% (currently ${total}%)`);
  }
  if (first === 0) {
    errors.push('First place prize split cannot be 0%');
  }
  return { success: errors.length === 0, errors };
}

export function validateCharityMemo(memo?: string): ValidationResult {
  const errors: string[] = [];
  if (memo && memo.length > SOLANA_CONTRACT.MAX_CHARITY_MEMO) {
    errors.push(`Charity name too long: ${memo.length} characters (max ${SOLANA_CONTRACT.MAX_CHARITY_MEMO})`);
  }
  return { success: errors.length === 0, errors };
}

// ---------------------------------------------------------------------------
// Pool room — new contract: only roomId + entryFee needed
// ---------------------------------------------------------------------------

export function validatePoolRoomParams(params: CreatePoolRoomParams): ValidationResult {
  console.log('[Solana][Validation] 🔍 Validating pool room parameters');

  const allErrors: string[] = [];

  const roomIdResult   = validateRoomId(params.roomId);
  allErrors.push(...roomIdResult.errors);

  const entryFeeResult = validateEntryFee(params.entryFee);
  allErrors.push(...entryFeeResult.errors);

  // maxPlayers, hostFeePct, prizePoolPct, prizeSplits, charityName
  // are NOT validated here — they are either gone from the new contract
  // or optional fields used only by EVM. Validating them here against
  // undefined would produce the "X is required" errors you're seeing.

  if (allErrors.length > 0) {
    console.error('[Solana][Validation] ❌ Validation failed:', allErrors);
  } else {
    console.log('[Solana][Validation] ✅ All validations passed');
  }

  return { success: allErrors.length === 0, errors: allErrors };
}
