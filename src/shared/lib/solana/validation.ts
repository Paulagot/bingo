/**
 * @module shared/lib/solana/validation
 *
 * ## Purpose
 * Provides validation utilities and schemas for Solana operations. Ensures data
 * integrity before submitting transactions, validating user inputs, and enforcing
 * business rules.
 *
 * ## Architecture
 * Uses Zod for schema validation with TypeScript type inference. Validation schemas
 * define:
 * - Structure: Required vs optional fields
 * - Types: String, number, PublicKey, BN, etc.
 * - Constraints: Min/max values, string patterns, custom validators
 * - Transformations: Parse strings to numbers, normalize inputs
 *
 * ## Validation Strategy
 * 1. **Client-side**: Fast feedback, better UX, reduces failed transactions
 * 2. **Pre-flight**: Validate before building transaction
 * 3. **Contract-side**: Ultimate source of truth (client validation can be bypassed)
 *
 * ## Public API
 * - `validateRoomParams()` - Validate room creation parameters
 * - `validateEntryFee()` - Validate entry fee amount and token
 * - `validateWinners()` - Validate winner addresses and rankings
 * - `validateFeeBreakdown()` - Validate fee percentage allocations
 * - Zod schemas for type-safe validation
 *
 * ## Fee Validation Rules
 * Based on contract constraints (see programs/bingo/src/state/global_config.rs):
 * - Platform fee: 20% (fixed, 2000 basis points)
 * - Host fee: 0-5% (0-500 basis points)
 * - Prize pool: 0-35% (calculated as 40% - host fee)
 * - Charity: 40%+ (remainder, minimum 40%)
 *
 * Total must equal 100%:
 * `platform (20%) + host_fee + prize_pool + charity = 100%`
 *
 * @see programs/bingo/src/state/global_config.rs - Contract fee constraints
 * @see programs/bingo/src/errors.rs - Error definitions
 *
 * @example
 * ```typescript
 * import { validateRoomParams, validateFeeBreakdown } from '@/shared/lib/solana/validation';
 *
 * // Validate room creation
 * const result = validateRoomParams({
 *   roomId: 'quiz-123',
 *   entryFee: '1.0',
 *   maxPlayers: 100,
 *   hostFeeBps: 100, // 1%
 *   prizePoolBps: 3900, // 39%
 * });
 *
 * if (!result.success) {
 *   console.error('Validation errors:', result.error.issues);
 * }
 * ```
 */

import { PublicKey } from '@solana/web3.js';
import { BN } from '@coral-xyz/anchor';
import { z } from 'zod';

/**
 * Maximum room ID length (contract constraint)
 */
export const MAX_ROOM_ID_LENGTH = 32;

/**
 * Maximum charity memo length (contract constraint)
 */
export const MAX_CHARITY_MEMO_LENGTH = 28;

/**
 * Fee constraints (basis points, 1 bp = 0.01%)
 */
export const FEE_CONSTRAINTS = {
  /** Platform fee (fixed) */
  PLATFORM_BPS: 2000, // 20%
  /** Maximum host fee */
  MAX_HOST_BPS: 500, // 5%
  /** Maximum combined host allocation (host fee + prize pool) */
  MAX_COMBINED_BPS: 4000, // 40%
  /** Minimum charity allocation */
  MIN_CHARITY_BPS: 4000, // 40%
  /** Total (must equal 100%) */
  TOTAL_BPS: 10000, // 100%
} as const;

/**
 * Zod schema for Solana PublicKey
 *
 * Validates that a value is a valid Solana public key (base58 string, 32-44 chars).
 */
export const publicKeySchema = z.custom<PublicKey>(
  (val) => {
    if (val instanceof PublicKey) {
      return true;
    }
    if (typeof val === 'string') {
      try {
        new PublicKey(val);
        return true;
      } catch {
        return false;
      }
    }
    return false;
  },
  {
    message: 'Invalid Solana public key (must be base58 string or PublicKey instance)',
  }
);

/**
 * Zod schema for Anchor BN (Big Number)
 *
 * Validates and transforms string/number to BN instance.
 */
export const bnSchema = z.custom<BN>(
  (val) => {
    if (BN.isBN(val)) {
      return true;
    }
    if (typeof val === 'string' || typeof val === 'number') {
      try {
        new BN(val);
        return true;
      } catch {
        return false;
      }
    }
    return false;
  },
  {
    message: 'Invalid BN value (must be BN instance, string, or number)',
  }
).transform((val) => {
  if (BN.isBN(val)) {
    return val;
  }
  return new BN(val);
});

/**
 * Zod schema for room ID
 *
 * Validates room ID is:
 * - Non-empty string
 * - Max 32 characters
 * - Alphanumeric with hyphens/underscores
 */
export const roomIdSchema = z
  .string()
  .min(1, 'Room ID cannot be empty')
  .max(MAX_ROOM_ID_LENGTH, `Room ID must be ${MAX_ROOM_ID_LENGTH} characters or less`)
  .regex(/^[a-zA-Z0-9_-]+$/, 'Room ID must be alphanumeric (hyphens and underscores allowed)');

/**
 * Zod schema for charity memo
 *
 * Validates memo is:
 * - Non-empty string
 * - Max 28 characters (on-chain constraint)
 */
export const charityMemoSchema = z
  .string()
  .min(1, 'Charity memo cannot be empty')
  .max(MAX_CHARITY_MEMO_LENGTH, `Charity memo must be ${MAX_CHARITY_MEMO_LENGTH} characters or less`);

/**
 * Zod schema for entry fee amount
 *
 * Validates entry fee is:
 * - Positive number (can be string or BN)
 * - Greater than 0
 */
export const entryFeeSchema = z
  .union([bnSchema, z.string(), z.number()])
  .refine(
    (val) => {
      const bn = BN.isBN(val) ? val : new BN(val);
      return bn.gt(new BN(0));
    },
    {
      message: 'Entry fee must be greater than 0',
    }
  );

/**
 * Zod schema for player count
 *
 * Validates max players is:
 * - Positive integer
 * - At least 2 (minimum for a game)
 * - Not more than 1000 (reasonable limit)
 */
export const maxPlayersSchema = z
  .number()
  .int('Max players must be an integer')
  .min(2, 'At least 2 players required')
  .max(1000, 'Max players cannot exceed 1000');

/**
 * Zod schema for basis points (fee percentages)
 *
 * Validates basis points are:
 * - Integer
 * - Between 0 and 10000 (0% to 100%)
 */
export const basisPointsSchema = z
  .number()
  .int('Basis points must be an integer')
  .min(0, 'Basis points cannot be negative')
  .max(FEE_CONSTRAINTS.TOTAL_BPS, 'Basis points cannot exceed 10000 (100%)');

/**
 * Zod schema for host fee
 *
 * Validates host fee is within contract limits (0-5%).
 */
export const hostFeeBpsSchema = basisPointsSchema.max(
  FEE_CONSTRAINTS.MAX_HOST_BPS,
  `Host fee cannot exceed ${FEE_CONSTRAINTS.MAX_HOST_BPS} basis points (${FEE_CONSTRAINTS.MAX_HOST_BPS / 100}%)`
);

/**
 * Zod schema for prize pool percentage
 *
 * Validates prize pool is within limits based on host fee.
 */
export const prizePoolBpsSchema = basisPointsSchema;

/**
 * Zod schema for room creation parameters
 *
 * Validates all parameters for creating a pool or asset room.
 */
export const roomParamsSchema = z
  .object({
    roomId: roomIdSchema,
    charityWallet: publicKeySchema,
    entryFee: entryFeeSchema,
    maxPlayers: maxPlayersSchema,
    hostFeeBps: hostFeeBpsSchema,
    prizePoolBps: prizePoolBpsSchema.optional(),
    charityMemo: charityMemoSchema.optional(),
    feeTokenMint: publicKeySchema,
  })
  .refine(
    (data) => {
      // Validate fee breakdown
      const hostFee = data.hostFeeBps;
      const prizePool = data.prizePoolBps || 0;
      const combined = hostFee + prizePool;

      // Host allocation (host fee + prize pool) cannot exceed 40%
      return combined <= FEE_CONSTRAINTS.MAX_COMBINED_BPS;
    },
    {
      message: `Host allocation (host fee + prize pool) cannot exceed ${FEE_CONSTRAINTS.MAX_COMBINED_BPS} basis points (${FEE_CONSTRAINTS.MAX_COMBINED_BPS / 100}%)`,
      path: ['prizePoolBps'],
    }
  )
  .refine(
    (data) => {
      // Calculate charity percentage
      const hostFee = data.hostFeeBps;
      const prizePool = data.prizePoolBps || 0;
      const charity =
        FEE_CONSTRAINTS.TOTAL_BPS - FEE_CONSTRAINTS.PLATFORM_BPS - hostFee - prizePool;

      // Charity must be at least 40%
      return charity >= FEE_CONSTRAINTS.MIN_CHARITY_BPS;
    },
    {
      message: `Charity allocation must be at least ${FEE_CONSTRAINTS.MIN_CHARITY_BPS} basis points (${FEE_CONSTRAINTS.MIN_CHARITY_BPS / 100}%)`,
      path: ['prizePoolBps'],
    }
  );

/**
 * Zod schema for winner validation
 *
 * Validates winner addresses are valid Solana public keys.
 */
export const winnersSchema = z
  .array(publicKeySchema)
  .min(1, 'At least one winner required')
  .max(3, 'Maximum 3 winners allowed');

/**
 * Validates room creation parameters
 *
 * Checks all parameters before creating a room, ensuring they meet contract constraints.
 *
 * @param params - Room creation parameters
 * @returns Validation result
 *
 * @example
 * ```typescript
 * const result = validateRoomParams({
 *   roomId: 'quiz-123',
 *   charityWallet: new PublicKey('...'),
 *   entryFee: new BN(1_000_000), // 1 USDC
 *   maxPlayers: 100,
 *   hostFeeBps: 100, // 1%
 *   prizePoolBps: 3900, // 39%
 *   charityMemo: 'Save the Whales',
 *   feeTokenMint: USDC_MINT,
 * });
 *
 * if (!result.success) {
 *   console.error('Validation failed:', result.error.format());
 * }
 * ```
 */
export function validateRoomParams(params: unknown): z.SafeParseReturnType<unknown, unknown> {
  return roomParamsSchema.safeParse(params);
}

/**
 * Validates entry fee amount and token
 *
 * Ensures entry fee is positive and token mint is a valid Solana address.
 *
 * @param entryFee - Entry fee amount (BN, string, or number)
 * @param tokenMint - Token mint address
 * @returns Validation result
 *
 * @example
 * ```typescript
 * const result = validateEntryFee(new BN(1_000_000), USDC_MINT);
 * if (!result.success) {
 *   console.error('Invalid entry fee:', result.error.message);
 * }
 * ```
 */
export function validateEntryFee(
  entryFee: unknown,
  tokenMint: unknown
): z.SafeParseReturnType<unknown, unknown> {
  return z
    .object({
      entryFee: entryFeeSchema,
      tokenMint: publicKeySchema,
    })
    .safeParse({ entryFee, tokenMint });
}

/**
 * Validates winner addresses
 *
 * Ensures all winner addresses are valid Solana public keys and within limits.
 *
 * @param winners - Array of winner addresses
 * @returns Validation result
 *
 * @example
 * ```typescript
 * const result = validateWinners([
 *   new PublicKey('winner1...'),
 *   new PublicKey('winner2...'),
 *   new PublicKey('winner3...'),
 * ]);
 *
 * if (!result.success) {
 *   console.error('Invalid winners:', result.error.issues);
 * }
 * ```
 */
export function validateWinners(winners: unknown): z.SafeParseReturnType<unknown, unknown> {
  return winnersSchema.safeParse(winners);
}

/**
 * Validates fee breakdown percentages
 *
 * Ensures all fee percentages are valid and sum to 100%.
 *
 * @param fees - Fee breakdown object
 * @param fees.hostFeeBps - Host fee in basis points
 * @param fees.prizePoolBps - Prize pool in basis points
 * @returns Validation result with calculated charity percentage
 *
 * @example
 * ```typescript
 * const result = validateFeeBreakdown({
 *   hostFeeBps: 100, // 1%
 *   prizePoolBps: 3900, // 39%
 * });
 *
 * if (result.success) {
 *   console.log('Fees valid! Charity gets:', result.data.charityBps, 'bps');
 * }
 * ```
 */
export function validateFeeBreakdown(fees: {
  hostFeeBps: number;
  prizePoolBps: number;
}): {
  success: boolean;
  data?: {
    hostFeeBps: number;
    prizePoolBps: number;
    charityBps: number;
    platformBps: number;
  };
  error?: string;
} {
  const { hostFeeBps, prizePoolBps } = fees;

  // Validate individual values
  if (hostFeeBps < 0 || hostFeeBps > FEE_CONSTRAINTS.MAX_HOST_BPS) {
    return {
      success: false,
      error: `Host fee must be between 0 and ${FEE_CONSTRAINTS.MAX_HOST_BPS} bps (0-${FEE_CONSTRAINTS.MAX_HOST_BPS / 100}%)`,
    };
  }

  if (prizePoolBps < 0) {
    return {
      success: false,
      error: 'Prize pool cannot be negative',
    };
  }

  // Validate combined allocation
  const combined = hostFeeBps + prizePoolBps;
  if (combined > FEE_CONSTRAINTS.MAX_COMBINED_BPS) {
    return {
      success: false,
      error: `Host allocation (host fee + prize pool) cannot exceed ${FEE_CONSTRAINTS.MAX_COMBINED_BPS} bps (${FEE_CONSTRAINTS.MAX_COMBINED_BPS / 100}%)`,
    };
  }

  // Calculate charity
  const charityBps =
    FEE_CONSTRAINTS.TOTAL_BPS - FEE_CONSTRAINTS.PLATFORM_BPS - hostFeeBps - prizePoolBps;

  // Validate charity minimum
  if (charityBps < FEE_CONSTRAINTS.MIN_CHARITY_BPS) {
    return {
      success: false,
      error: `Charity must receive at least ${FEE_CONSTRAINTS.MIN_CHARITY_BPS} bps (${FEE_CONSTRAINTS.MIN_CHARITY_BPS / 100}%)`,
    };
  }

  return {
    success: true,
    data: {
      hostFeeBps,
      prizePoolBps,
      charityBps,
      platformBps: FEE_CONSTRAINTS.PLATFORM_BPS,
    },
  };
}

/**
 * Validates prize split percentages (1st, 2nd, 3rd place)
 *
 * Ensures prize splits sum to 100% and are all non-negative.
 *
 * @param splits - Prize split percentages (basis points)
 * @returns Validation result
 *
 * @example
 * ```typescript
 * const result = validatePrizeSplits({
 *   firstPlace: 5000,  // 50%
 *   secondPlace: 3000, // 30%
 *   thirdPlace: 2000,  // 20%
 * });
 * ```
 */
export function validatePrizeSplits(splits: {
  firstPlace: number;
  secondPlace?: number;
  thirdPlace?: number;
}): {
  success: boolean;
  error?: string;
} {
  const { firstPlace, secondPlace = 0, thirdPlace = 0 } = splits;

  // All must be non-negative
  if (firstPlace < 0 || secondPlace < 0 || thirdPlace < 0) {
    return {
      success: false,
      error: 'Prize splits cannot be negative',
    };
  }

  // Must sum to 100%
  const total = firstPlace + secondPlace + thirdPlace;
  if (total !== FEE_CONSTRAINTS.TOTAL_BPS) {
    return {
      success: false,
      error: `Prize splits must sum to ${FEE_CONSTRAINTS.TOTAL_BPS} bps (100%), got ${total} bps`,
    };
  }

  return { success: true };
}

/**
 * Validation error formatter
 *
 * Converts Zod validation errors to user-friendly messages.
 *
 * @param error - Zod validation error
 * @returns Formatted error message
 *
 * @example
 * ```typescript
 * const result = validateRoomParams(invalidParams);
 * if (!result.success) {
 *   const message = formatValidationError(result.error);
 *   alert(message);
 * }
 * ```
 */
export function formatValidationError(error: z.ZodError): string {
  const issues = error.issues.map((issue) => {
    const path = issue.path.join('.');
    return path ? `${path}: ${issue.message}` : issue.message;
  });

  return issues.join('\n');
}
