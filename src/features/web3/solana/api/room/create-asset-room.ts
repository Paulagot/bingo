/**
 * @module features/web3/solana/api/room/create-asset-room
 *
 * ## Purpose
 * Creates a new asset-based fundraising room on Solana where prizes are pre-deposited
 * SPL tokens. This is an alternative to pool-based rooms.
 *
 * ## Architecture
 * This module extracts the asset room creation logic from solana-asset-room.ts into a
 * focused, testable API module. It uses Phase 1 utilities for all common operations:
 * - PDA derivation via `@/shared/lib/solana/pda`
 * - Token account management via `@/shared/lib/solana/token-accounts`
 * - Transaction building via `@/shared/lib/solana/transactions`
 *
 * ## Fee Structure (Asset Mode)
 * - Platform Fee: 20% (fixed)
 * - Host Fee: 0-5% (configurable)
 * - Charity: 75-80% (remainder, calculated as 100% - platform - host)
 * - Prizes: Pre-deposited assets (no percentage allocation from entry fees)
 *
 * @see {@link useSolanaContract} - React hook that uses this module
 * @see {@link createPoolRoom} - Alternative room creation for pool-based rooms
 * @see programs/bingo/src/instructions/init_asset_room.rs - Contract implementation
 */

import { SystemProgram, SYSVAR_RENT_PUBKEY } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';
import type { AnchorProvider, Program } from '@coral-xyz/anchor';

// Phase 1 utilities
import {
  deriveGlobalConfigPDA,
  deriveTokenRegistryPDA,
  deriveRoomPDA,
  deriveRoomVaultPDA,
} from '@/shared/lib/solana/pda';
import { buildTransaction, sendWithRetry } from '@/shared/lib/solana/transactions';

// Phase 2 types
import type {
  CreateAssetRoomParams,
  RoomCreationResult,
  SolanaContractContext,
} from '@/features/web3/solana/model/types';

// Config
import { PROGRAM_ID, getTokenMints } from '@/shared/lib/solana/config';

/**
 * Creates a new asset-based fundraising room on Solana
 *
 * This function creates a new fundraising room where prizes are pre-deposited SPL tokens.
 * Unlike pool-based rooms, asset-based rooms require hosts to deposit prize assets before
 * players can join.
 *
 * @param context - Solana contract context (must have program and provider initialized)
 * @param params - Asset room creation parameters
 * @returns Room creation result with room PDA and transaction signature
 *
 * @throws {Error} 'Wallet not connected' - If publicKey or provider is null
 * @throws {Error} 'Program not deployed yet' - If Anchor program not initialized
 * @throws {Error} Validation errors - If room ID invalid or host fee exceeds 5%
 * @throws {Error} Transaction errors - If on-chain execution fails
 *
 * @example
 * ```typescript
 * const result = await createAssetRoom(context, {
 *   roomId: 'bingo-asset-2024',
 *   charityWallet: new PublicKey('Char1ty...'),
 *   entryFee: new BN(1_000_000), // 1 USDC
 *   maxPlayers: 100,
 *   hostFeeBps: 100, // 1%
 *   charityMemo: 'Bingo Asset Room',
 *   feeTokenMint: USDC_MINT,
 *   prize1Mint: nftMint1,
 *   prize1Amount: new BN(1),
 *   prize2Mint: tokenMint,
 *   prize2Amount: new BN(1000),
 * });
 * ```
 */
export async function createAssetRoom(
  context: SolanaContractContext,
  params: CreateAssetRoomParams
): Promise<RoomCreationResult> {
  const { program, provider, publicKey, connection } = context;

  if (!publicKey || !provider || !program) {
    throw new Error('Wallet not connected');
  }

  if (!connection) {
    throw new Error('Connection not available');
  }

  // Import the implementation from lib (implementation detail)
  const { createAssetRoom: createAssetRoomImpl } = await import('@/features/web3/solana/lib/solana-asset-room');
  
  return await createAssetRoomImpl(program, provider, connection, publicKey, params);
}

