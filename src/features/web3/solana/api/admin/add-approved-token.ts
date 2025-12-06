/**
 * @module features/web3/solana/api/admin/add-approved-token
 *
 * ## Purpose
 * Adds a token to the approved token registry. Only approved tokens can be used
 * for room entry fees. This prevents users from creating rooms with arbitrary or
 * malicious tokens.
 *
 * ## Architecture
 * This module extracts the token approval logic into a focused, testable API module.
 * It uses Phase 1 utilities for PDA derivation and transaction building.
 *
 * ## Security
 * This operation should only be performed by the platform admin. The registry
 * has a maximum capacity of 50 tokens.
 *
 * ## Token Registry
 * The registry uses seed `token-registry-v4` and stores an array of approved
 * token mint addresses. Tokens must be approved before they can be used for room fees.
 *
 * @see {@link useSolanaContract} - React hook that uses this module
 * @see {@link initializeTokenRegistry} - Initialize the registry first
 * @see programs/bingo/src/instructions/add_approved_token.rs - Contract implementation
 */

import { PublicKey, Transaction } from '@solana/web3.js';
import type { AnchorProvider, Program } from '@coral-xyz/anchor';

// Phase 1 utilities
import { buildTransaction } from '@/shared/lib/solana/transactions';

// Phase 2 types
import type { SolanaContractContext } from '@/features/web3/solana/model/types';

/**
 * Parameters for adding an approved token
 */
export interface AddApprovedTokenParams {
  /** Token mint address to approve */
  tokenMint: PublicKey;
}

/**
 * Result from adding an approved token
 */
export interface AddApprovedTokenResult {
  /** Transaction signature */
  signature: string;
  /** Whether the token was already approved */
  alreadyApproved?: boolean;
}

/**
 * Adds a token to the approved token registry
 *
 * Only approved tokens can be used for room entry fees. This prevents users
 * from creating rooms with arbitrary or malicious tokens. The registry has a
 * maximum capacity of 50 tokens.
 *
 * @param context - Solana contract context (must have program and provider initialized)
 * @param params - Token approval parameters
 * @returns Approval result with transaction signature
 *
 * @throws {Error} 'Wallet not connected' - If publicKey or provider is null
 * @throws {Error} 'Program not initialized' - If Anchor program not initialized
 * @throws {Error} 'Token already approved' - If token is already in the registry
 * @throws {Error} 'Token registry full' - If registry is at capacity (50 tokens)
 * @throws {Error} Transaction errors - If approval fails
 *
 * @example
 * ```typescript
 * const result = await addApprovedToken(context, {
 *   tokenMint: USDC_MINT,
 * });
 *
 * if (result.alreadyApproved) {
 *   console.log('Token already approved');
 * } else {
 *   console.log('Token approved:', result.signature);
 * }
 * ```
 */
export async function addApprovedToken(
  context: SolanaContractContext,
  params: AddApprovedTokenParams
): Promise<AddApprovedTokenResult> {
  if (!context.publicKey || !context.provider) {
    throw new Error('Wallet not connected');
  }

  if (!context.program) {
    throw new Error('Program not initialized');
  }

  if (!context.connection) {
    throw new Error('Connection not available. Please ensure wallet is connected.');
  }

  const { program, provider, publicKey, connection } = context;

  // CRITICAL: Use program.programId to derive token registry PDA (matches Anchor's derivation)
  // This ensures the PDA matches what Anchor expects when validating the constraint
  const programId = program.programId;
  const [tokenRegistry] = PublicKey.findProgramAddressSync(
    [Buffer.from('token-registry-v2')],
    programId
  );

  // Check if token is already approved
  try {
    // @ts-ignore - Account types available after program deployment
    const registryAccount = await program.account.tokenRegistry.fetch(tokenRegistry);
    const approvedTokens = registryAccount.approvedTokens as PublicKey[];

    if (approvedTokens.some(t => t.equals(params.tokenMint))) {
      return { signature: 'already-approved', alreadyApproved: true };
    }
  } catch (error) {
    // Could not check approved tokens, will attempt to add
  }

  // Build add token instruction
  // Note: tokenRegistry is explicitly passed, but Anchor will validate it matches the PDA constraint
  // Using program.programId ensures the PDA matches Anchor's derivation
  // @ts-ignore - IDL types loaded at runtime
  const ix = await program.methods
    .addApprovedToken(params.tokenMint)
    .accounts({
      tokenRegistry,
      tokenMintAccount: params.tokenMint, // Explicitly pass - Anchor will validate it matches the constraint
      admin: publicKey,
    })
    .instruction();

  // Build and send transaction
  const transaction = await buildTransaction({
    connection,
    instructions: [ix],
    feePayer: publicKey,
    commitment: 'finalized',
  });

  const signature = await provider.sendAndConfirm(transaction, [], {
    skipPreflight: false,
    commitment: 'confirmed',
  });

  return { signature, alreadyApproved: false };
}

