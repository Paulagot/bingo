/**
 * wSOL Wrapping Utilities
 *
 * Native SOL cannot be used directly as an SPL token. When a room uses SOL
 * as the entry fee token, we wrap it into wSOL (Wrapped SOL) before joining,
 * and unwrap it back to native SOL after distribution.
 *
 * ## How wSOL works
 *
 * wSOL is just a regular SPL token account whose mint is the System Program's
 * native mint: So11111111111111111111111111111111111111112
 *
 * Wrapping:
 *   1. Create (or reuse) the player's wSOL Associated Token Account (ATA)
 *   2. Transfer native SOL into that ATA
 *   3. Call SyncNative to tell the token program about the new balance
 *
 * Unwrapping:
 *   1. Close the wSOL ATA — token program sends the lamports back to the owner
 *
 * Both operations are done as instructions prepended/appended to the main
 * transaction so everything settles atomically.
 *
 * ## Usage
 *
 * ```typescript
 * import { buildWrapSolInstructions, buildUnwrapSolInstruction, WSOL_MINT } from './wsolUtils';
 *
 * // Before join_room (SOL rooms only)
 * const wrapIxs = await buildWrapSolInstructions(connection, publicKey, amountLamports);
 * const tx = await buildTransaction(connection, [...wrapIxs, joinIx], publicKey);
 *
 * // After end_room (SOL winners only)
 * const unwrapIx = buildUnwrapSolInstruction(publicKey);
 * const tx = await buildTransaction(connection, [endRoomIx, unwrapIx], publicKey);
 * ```
 */

import {
  Connection,
  PublicKey,
  SystemProgram,
  TransactionInstruction,
} from '@solana/web3.js';
import {
  NATIVE_MINT,
  TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountInstruction,
  createSyncNativeInstruction,
  createCloseAccountInstruction,
  getAssociatedTokenAddress,
  getAccount,
} from '@solana/spl-token';

// ✅ Re-export NATIVE_MINT as WSOL_MINT for clarity throughout the codebase
export const WSOL_MINT = NATIVE_MINT; // So11111111111111111111111111111111111111112

/**
 * Get the player's wSOL Associated Token Account address.
 * This is deterministic — same address every time for a given wallet.
 */
export async function getWsolAta(owner: PublicKey): Promise<PublicKey> {
  return getAssociatedTokenAddress(WSOL_MINT, owner);
}

/**
 * Check whether the player's wSOL ATA already exists on-chain.
 */
export async function wsolAtaExists(
  connection: Connection,
  owner: PublicKey
): Promise<boolean> {
  try {
    const ata = await getWsolAta(owner);
    await getAccount(connection, ata);
    return true;
  } catch {
    // getAccount throws if account doesn't exist
    return false;
  }
}

/**
 * Build the instructions needed to wrap native SOL into wSOL.
 *
 * Returns an array of 2-3 instructions to prepend to your main transaction:
 *   [createAta?] + transferSol + syncNative
 *
 * @param connection  - Active Solana connection
 * @param owner       - Player's public key (pays + owns the wSOL ATA)
 * @param lamports    - Amount of SOL to wrap, in lamports (raw units)
 *
 * @example
 * // Wrap 0.5 SOL
 * const ixs = await buildWrapSolInstructions(connection, publicKey, 500_000_000n);
 * const tx = await buildTransaction(connection, [...ixs, joinIx], publicKey);
 */
export async function buildWrapSolInstructions(
  connection: Connection,
  owner: PublicKey,
  lamports: bigint
): Promise<TransactionInstruction[]> {
  const instructions: TransactionInstruction[] = [];
  const wsolAta = await getWsolAta(owner);

  console.log('[wSOL] 🔄 Building wrap instructions');
  console.log('[wSOL]   Owner:', owner.toBase58());
  console.log('[wSOL]   wSOL ATA:', wsolAta.toBase58());
  console.log('[wSOL]   Amount (lamports):', lamports.toString());

  // Step 1: Create wSOL ATA if it doesn't exist yet
  const ataAlreadyExists = await wsolAtaExists(connection, owner);

  if (!ataAlreadyExists) {
    console.log('[wSOL] 📝 wSOL ATA does not exist — adding createATA instruction');
    instructions.push(
      createAssociatedTokenAccountInstruction(
        owner,      // payer
        wsolAta,    // ATA address
        owner,      // owner
        WSOL_MINT   // mint
      )
    );
  } else {
    console.log('[wSOL] ✅ wSOL ATA already exists — skipping createATA');
  }

  // Step 2: Transfer native SOL into the wSOL ATA
  // The ATA is just a regular account — we transfer SOL lamports into it
  instructions.push(
    SystemProgram.transfer({
      fromPubkey: owner,
      toPubkey: wsolAta,
      lamports,   // bigint is accepted by SystemProgram.transfer
    })
  );

  console.log('[wSOL] 💸 Added SOL transfer instruction:', lamports.toString(), 'lamports');

  // Step 3: SyncNative — tells the token program to read the new lamport
  // balance and update the token account's amount field
  instructions.push(
    createSyncNativeInstruction(wsolAta, TOKEN_PROGRAM_ID)
  );

  console.log('[wSOL] 🔄 Added syncNative instruction');
  console.log('[wSOL] ✅ Wrap instructions ready:', instructions.length, 'total');

  return instructions;
}

/**
 * Build the instruction to unwrap wSOL back to native SOL.
 *
 * Closing the wSOL ATA sends all lamports (wrapped SOL + rent) back to the
 * owner as native SOL. This is a single instruction to append after end_room.
 *
 * @param owner - Player's public key (must be the ATA owner)
 *
 * @example
 * const unwrapIx = await buildUnwrapSolInstruction(owner);
 * const tx = await buildTransaction(connection, [endRoomIx, unwrapIx], publicKey);
 */
export async function buildUnwrapSolInstruction(
  owner: PublicKey
): Promise<TransactionInstruction> {
  const wsolAta = await getWsolAta(owner);

  console.log('[wSOL] 🔓 Building unwrap instruction');
  console.log('[wSOL]   Owner:', owner.toBase58());
  console.log('[wSOL]   wSOL ATA to close:', wsolAta.toBase58());

  // closeAccount sends all lamports in the ATA back to `destination` (owner)
  const ix = createCloseAccountInstruction(
    wsolAta,    // account to close
    owner,      // destination for lamports
    owner,      // authority
    [],         // multisig signers (none)
    TOKEN_PROGRAM_ID
  );

  console.log('[wSOL] ✅ Unwrap instruction ready');

  return ix;
}

/**
 * Check current wSOL balance for a wallet.
 * Returns 0n if the ATA doesn't exist.
 */
export async function getWsolBalance(
  connection: Connection,
  owner: PublicKey
): Promise<bigint> {
  try {
    const wsolAta = await getWsolAta(owner);
    const account = await getAccount(connection, wsolAta);
    return account.amount; // bigint
  } catch {
    return 0n;
  }
}

/**
 * Type guard — check if a mint address is the wSOL mint.
 * Use this in hooks to decide whether to wrap/unwrap.
 *
 * @example
 * if (isWsolMint(feeTokenMint.toBase58())) {
 *   const wrapIxs = await buildWrapSolInstructions(...);
 * }
 */
export function isWsolMint(mintAddress: string): boolean {
  return mintAddress === WSOL_MINT.toBase58();
}

/**
 * isNativeSolRoom — convenience helper for hooks.
 * Returns true if the room's fee token is wSOL (i.e. a SOL room).
 *
 * @example
 * const needsWrapping = isNativeSolRoom(feeTokenMint);
 */
export function isNativeSolRoom(feeTokenMint: PublicKey): boolean {
  return feeTokenMint.equals(WSOL_MINT);
}