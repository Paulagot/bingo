/**
 * @module features/web3/solana/api/admin/create-token-mint
 *
 * ## Purpose
 * Creates a new SPL token mint on Solana. This is a utility function for creating test tokens
 * that can be used as prize assets in asset-based rooms.
 *
 * ## Architecture
 * This module extracts the token mint creation logic from solana-asset-room.ts into a focused,
 * testable API module. It uses Phase 1 utilities for transaction building and sending.
 *
 * ## Token Mint Creation
 *
 * Creates a new SPL token mint with:
 * - Configurable decimals (default: 9)
 * - Mint authority (default: creator's wallet)
 * - Optional freeze authority (default: creator's wallet)
 *
 * ## Use Cases
 *
 * - Creating test tokens for development
 * - Creating prize tokens for asset-based rooms
 * - Creating custom tokens for fundraising
 *
 * @see {@link useSolanaContract} - React hook that uses this module
 * @see {@link createAssetRoom} - Use created tokens as prize assets
 * @see https://spl.solana.com/token - SPL Token documentation
 *
 * @example
 * ```typescript
 * const result = await createTokenMint({
 *   connection,
 *   publicKey,
 *   signTransaction,
 *   decimals: 9,
 * });
 * console.log('Token mint created:', result.mint.toBase58());
 * ```
 */

import { Connection, Keypair, SystemProgram, Transaction } from '@solana/web3.js';
import { 
  TOKEN_PROGRAM_ID, 
  MINT_SIZE, 
  getMinimumBalanceForRentExemptMint, 
  createInitializeMint2Instruction 
} from '@solana/spl-token';
import type { PublicKey } from '@solana/web3.js';

// Phase 1 utilities
import { buildTransaction, sendWithRetry } from '@/shared/lib/solana/transactions';

// Config
import { NETWORK, getExplorerUrl } from '@/shared/lib/solana/config';

/**
 * Parameters for creating a token mint
 */
export interface CreateTokenMintParams {
  /** Solana connection */
  connection: Connection;
  /** Creator's public key (fee payer) */
  publicKey: PublicKey;
  /** Transaction signing function */
  signTransaction: (tx: Transaction) => Promise<Transaction>;
  /** Number of decimals (default: 9) */
  decimals?: number;
  /** Mint authority public key (default: creator's wallet) */
  mintAuthority?: PublicKey;
  /** Freeze authority public key (default: creator's wallet) */
  freezeAuthority?: PublicKey | null;
}

/**
 * Result from creating a token mint
 */
export interface CreateTokenMintResult {
  /** The created mint public key */
  mint: PublicKey;
  /** Transaction signature */
  signature: string;
  /** Explorer URL for the mint */
  explorerUrl: string;
}

/**
 * Creates a new SPL token mint on Solana
 *
 * This function creates a new SPL token mint that can be used for prize assets, test tokens,
 * or custom fundraising tokens. The mint is created with configurable decimals and authorities.
 *
 * Uses Phase 1 utilities for transaction building and sending with retry logic.
 *
 * @param params - Token mint creation parameters
 * @param params.connection - Solana connection
 * @param params.publicKey - Creator's public key (fee payer)
 * @param params.signTransaction - Transaction signing function
 * @param params.decimals - Number of decimals (default: 9)
 * @param params.mintAuthority - Mint authority public key (default: creator's wallet)
 * @param params.freezeAuthority - Freeze authority public key (default: creator's wallet)
 * @returns Token mint creation result with mint address, signature, and explorer URL
 *
 * @throws {Error} 'Insufficient SOL balance' - If wallet doesn't have enough SOL for rent and fees
 * @throws {Error} Transaction errors - If on-chain execution fails
 *
 * @example
 * ```typescript
 * const result = await createTokenMint({
 *   connection,
 *   publicKey,
 *   signTransaction: async (tx) => await wallet.signTransaction(tx),
 *   decimals: 9,
 * });
 * console.log('Token mint:', result.mint.toBase58());
 * ```
 */
export async function createTokenMint(
  params: CreateTokenMintParams
): Promise<CreateTokenMintResult> {
  const {
    connection,
    publicKey,
    signTransaction,
    decimals = 9,
    mintAuthority = publicKey,
    freezeAuthority = publicKey,
  } = params;

  // Check balance
  const balance = await connection.getBalance(publicKey);
  const rentExemptBalance = await getMinimumBalanceForRentExemptMint(connection);
  const estimatedFee = 5000; // Transaction fee
  const requiredBalance = rentExemptBalance + estimatedFee;

  if (balance < requiredBalance) {
    throw new Error(
      `Insufficient SOL balance. Need at least ${(requiredBalance / 1e9).toFixed(4)} SOL, ` +
      `have ${(balance / 1e9).toFixed(4)} SOL`
    );
  }

  // Generate a new keypair for the mint account
  // In Solana, mint accounts are created as standalone accounts
  const mintKeypair = Keypair.generate();
  const mint = mintKeypair.publicKey;

  // Build instructions
  const instructions = [
    // Create account instruction
    SystemProgram.createAccount({
      fromPubkey: publicKey,
      newAccountPubkey: mint,
      space: MINT_SIZE,
      lamports: rentExemptBalance,
      programId: TOKEN_PROGRAM_ID,
    }),
    // Initialize mint instruction
    createInitializeMint2Instruction(
      mint,
      decimals,
      mintAuthority,
      freezeAuthority, // null = no freeze authority
      TOKEN_PROGRAM_ID
    ),
  ];

  // Build transaction using Phase 1 utility
  const transaction = await buildTransaction({
    connection,
    instructions,
    feePayer: publicKey,
    commitment: 'finalized',
  });

  // Sign the transaction (we need to sign with the mint keypair too)
  // The wallet will sign for the fee payer, but we also need the mint keypair signature
  // Partial sign with the mint keypair first, then the wallet will sign for the payer
  transaction.partialSign(mintKeypair);

  // Sign with wallet (this will sign for the fee payer and any other wallet-owned accounts)
  const signedTx = await signTransaction(transaction);
  
  // Note: The transaction is now signed by both the mint keypair (partial sign) and the wallet

  // Send with retry using Phase 1 utility
  const signature = await sendWithRetry({
    connection,
    signedTransaction: signedTx,
    commitment: 'confirmed',
    maxRetries: 3,
    maxAttempts: 2,
  });

  const explorerUrl = getExplorerUrl(signature, 'tx', NETWORK);

  return {
    mint,
    signature,
    explorerUrl,
  };
}

