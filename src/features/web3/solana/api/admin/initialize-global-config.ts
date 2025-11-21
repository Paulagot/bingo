/**
 * @module features/web3/solana/api/admin/initialize-global-config
 *
 * ## Purpose
 * Initializes the global platform configuration account. This is a one-time setup
 * operation that must be performed before creating any rooms. The GlobalConfig
 * stores platform-wide settings including wallet addresses and fee configuration.
 *
 * ## Architecture
 * This module extracts the global config initialization logic into a focused,
 * testable API module. It uses Phase 1 utilities for PDA derivation and transaction
 * building.
 *
 * ## Security
 * This operation should only be performed by the platform admin. The account
 * can only be initialized once - subsequent calls will fail or return early.
 *
 * @see {@link useSolanaContract} - React hook that uses this module
 * @see programs/bingo/src/instructions/initialize.rs - Contract implementation
 * @see programs/bingo/src/state/global_config.rs - GlobalConfig account structure
 */

import { PublicKey, SystemProgram, Transaction } from '@solana/web3.js';
import type { AnchorProvider, Program } from '@coral-xyz/anchor';

// Phase 1 utilities
import { deriveGlobalConfigPDA } from '@/shared/lib/solana/pda';
import { buildTransaction } from '@/shared/lib/solana/transactions';

// Phase 2 types
import type { SolanaContractContext } from '@/features/web3/solana/model/types';

/**
 * Parameters for initializing global config
 */
export interface InitializeGlobalConfigParams {
  /** Platform wallet address (receives platform fees) */
  platformWallet: PublicKey;
  /** Charity wallet address (receives charity donations) */
  charityWallet: PublicKey;
}

/**
 * Result from global config initialization
 */
export interface InitializeGlobalConfigResult {
  /** Transaction signature */
  signature: string;
  /** Whether the config was already initialized */
  alreadyInitialized?: boolean;
}

/**
 * Initializes the global platform configuration account
 *
 * This is a one-time setup operation that creates the GlobalConfig PDA account
 * with platform and charity wallet addresses. The account can only be initialized
 * once - if it already exists, this function will return early with `alreadyInitialized: true`.
 *
 * @param context - Solana contract context (must have program and provider initialized)
 * @param params - Initialization parameters
 * @returns Initialization result with transaction signature
 *
 * @throws {Error} 'Wallet not connected' - If publicKey or provider is null
 * @throws {Error} 'Program not initialized' - If Anchor program not initialized
 * @throws {Error} Transaction errors - If initialization fails
 *
 * @example
 * ```typescript
 * const result = await initializeGlobalConfig(context, {
 *   platformWallet: new PublicKey('Platform...'),
 *   charityWallet: new PublicKey('Charity...'),
 * });
 *
 * if (result.alreadyInitialized) {
 *   console.log('GlobalConfig already initialized');
 * } else {
 *   console.log('GlobalConfig initialized:', result.signature);
 * }
 * ```
 */
export async function initializeGlobalConfig(
  context: SolanaContractContext,
  params: InitializeGlobalConfigParams
): Promise<InitializeGlobalConfigResult> {
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

  const [globalConfig] = deriveGlobalConfigPDA();

  // Check if already initialized
  try {
    const configAccount = await connection.getAccountInfo(globalConfig);
    if (configAccount && configAccount.owner.toBase58() === program.programId.toBase58()) {
      return { signature: 'already-initialized', alreadyInitialized: true };
    }
  } catch (error) {
    // Config not found, will initialize
  }

  // Build initialization instruction
  const ix = await program.methods
    .initialize(params.platformWallet, params.charityWallet)
    .accounts({
      globalConfig,
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

