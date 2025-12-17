/**
 * @module features/web3/solana/api/admin/initialize-token-registry
 *
 * ## Purpose
 * Initializes the token registry account. This is a one-time setup operation that
 * creates the TokenRegistry PDA account for managing approved tokens. The registry
 * stores a whitelist of tokens that can be used for room entry fees.
 *
 * ## Architecture
 * This module extracts the token registry initialization logic into a focused,
 * testable API module. It uses Phase 1 utilities for PDA derivation.
 *
 * ## Security
 * This operation should only be performed by the platform admin. The account
 * can only be initialized once - subsequent calls will fail or return early.
 *
 * ## Token Registry Versioning
 * The registry uses seed `token-registry-v4` to allow for upgrades. If the
 * registry structure changes, a new version can be deployed without breaking
 * existing rooms.
 *
 * @see {@link useSolanaContract} - React hook that uses this module
 * @see {@link addApprovedToken} - Add tokens to the registry
 * @see programs/bingo/src/instructions/initialize_token_registry.rs - Contract implementation
 */

import { PublicKey, SystemProgram, Transaction } from '@solana/web3.js';
import type { AnchorProvider, Program } from '@coral-xyz/anchor';

// Phase 1 utilities
import { buildTransaction } from '@/shared/lib/solana/transactions';

// Phase 2 types
import type { SolanaContractContext } from '@/features/web3/solana/model/types';

/**
 * Result from token registry initialization
 */
export interface InitializeTokenRegistryResult {
  /** Transaction signature */
  signature: string;
  /** Whether the registry was already initialized */
  alreadyInitialized?: boolean;
}

/**
 * Initializes the token registry account
 *
 * This is a one-time setup operation that creates the TokenRegistry PDA account.
 * The registry stores a whitelist of approved tokens that can be used for room
 * entry fees. The account can only be initialized once.
 *
 * @param context - Solana contract context (must have program and provider initialized)
 * @returns Initialization result with transaction signature
 *
 * @throws {Error} 'Wallet not connected' - If publicKey or provider is null
 * @throws {Error} 'Program not initialized' - If Anchor program not initialized
 * @throws {Error} Transaction errors - If initialization fails
 *
 * @example
 * ```typescript
 * const result = await initializeTokenRegistry(context);
 *
 * if (result.alreadyInitialized) {
 *   console.log('Token registry already initialized');
 * } else {
 *   console.log('Token registry initialized:', result.signature);
 * }
 * ```
 */
export async function initializeTokenRegistry(
  context: SolanaContractContext
): Promise<InitializeTokenRegistryResult> {
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
  
  // Derive token registry PDA using program.programId (same as Anchor uses)
  // Note: We use programId directly instead of deriveTokenRegistryPDA() to ensure
  // we're using the exact programId from the program instance
  const [tokenRegistry] = PublicKey.findProgramAddressSync(
    [Buffer.from('token-registry-v2')],
    programId
  );

  // Check if already initialized
  try {
    const registryAccount = await connection.getAccountInfo(tokenRegistry);
    if (registryAccount) {
      // Check if it's owned by the correct program
      if (registryAccount.owner.toBase58() === programId.toBase58()) {
        return { signature: 'already-initialized', alreadyInitialized: true };
      } else {
        console.warn('[initializeTokenRegistry] ⚠️ Token registry exists but owned by old program:', {
          oldOwner: registryAccount.owner.toBase58(),
          currentProgram: programId.toBase58(),
        });
        throw new Error(
          `⚠️ DEVNET CLEANUP NEEDED: Token registry was created by old program deployment.\n\n` +
          `To fix this, run in your bingo-solana-contracts repo:\n` +
          `cd <path-to-bingo-solana-contracts>\n` +
          `anchor clean && anchor build && anchor deploy\n\n` +
          `Or manually close the old account:\n` +
          `solana program close ${registryAccount.owner.toBase58()} --url devnet`
        );
      }
    }
  } catch (error: any) {
    if (error.message?.includes('DEVNET CLEANUP')) {
      throw error; // Re-throw our custom error
    }
    // Registry not found, will initialize
  }

  // Build initialization instruction
  const ix = await program.methods
    .initializeTokenRegistry()
    .accounts({
      tokenRegistry,
      admin: publicKey,
      systemProgram: SystemProgram.programId,
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

  return { signature, alreadyInitialized: false };
}

