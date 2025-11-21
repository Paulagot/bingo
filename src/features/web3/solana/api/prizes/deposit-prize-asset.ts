/**
 * @module features/web3/solana/api/prizes/deposit-prize-asset
 *
 * ## Purpose
 * Deposits a prize asset into an asset-based room. This allows hosts to pre-deposit
 * prize assets (NFTs, tokens, etc.) that will be distributed to winners.
 *
 * ## Architecture
 * This module extracts the prize asset deposit logic from solana-asset-room.ts into a
 * focused, testable API module. It uses Phase 1 utilities for all common operations:
 * - PDA derivation via `@/shared/lib/solana/pda`
 * - Token account management via `@/shared/lib/solana/token-accounts`
 * - Transaction building via `@/shared/lib/solana/transactions`
 *
 * ## Deposit Flow
 * 1. **Create Room**: Host creates asset room (status: AwaitingFunding)
 * 2. **Deposit Prize 1**: Host calls this for prize index 0 (1st place)
 * 3. **Deposit Prize 2**: Host calls this for prize index 1 (2nd place) - optional
 * 4. **Deposit Prize 3**: Host calls this for prize index 2 (3rd place) - optional
 * 5. **Room Ready**: Once all configured prizes deposited, status → Ready
 *
 * @see {@link useSolanaContract} - React hook that uses this module
 * @see {@link createAssetRoom} - Create asset-based room
 * @see programs/bingo/src/instructions/add_prize_asset.rs - Contract implementation
 */

import type { AnchorProvider, Program } from '@coral-xyz/anchor';

// Phase 2 types
import type {
  DepositPrizeAssetParams,
  SolanaContractContext,
} from '@/features/web3/solana/model/types';

/**
 * Deposits a prize asset into an asset-based room
 *
 * This function allows hosts to deposit prize assets (NFTs, tokens, etc.) into
 * an asset-based room. Prizes must be deposited before players can join the room.
 *
 * @param context - Solana contract context (must have program and provider initialized)
 * @param params - Prize asset deposit parameters
 * @param params.roomId - Room identifier
 * @param params.prizeIndex - Prize index (0, 1, or 2)
 * @param params.prizeMint - Prize token mint
 * @returns Deposit result with transaction signature
 *
 * @throws {Error} 'Wallet not connected' - If publicKey or provider is null
 * @throws {Error} 'Program not deployed yet' - If Anchor program not initialized
 * @throws {Error} Validation errors - If room not found, prize already deposited, or insufficient balance
 * @throws {Error} Transaction errors - If on-chain execution fails
 *
 * @example
 * ```typescript
 * const result = await depositPrizeAsset(context, {
 *   roomId: 'bingo-asset-2024',
 *   prizeIndex: 0, // First prize
 *   prizeMint: nftMint,
 * });
 * ```
 */
export async function depositPrizeAsset(
  context: SolanaContractContext,
  params: DepositPrizeAssetParams
): Promise<{ signature: string }> {
  const { program, provider, publicKey, connection } = context;

  if (!publicKey || !provider || !program) {
    throw new Error('Wallet not connected');
  }

  if (!connection) {
    throw new Error('Connection not available');
  }

  // Import the implementation from lib (implementation detail)
  const { depositPrizeAsset: depositPrizeAssetImpl } = await import('@/features/web3/solana/lib/solana-asset-room');
  
  return await depositPrizeAssetImpl(program, provider, connection, publicKey, {
    ...params,
    hostPubkey: publicKey,
  });
}

