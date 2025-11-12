// src/features/web3/chains/solana/lib/token-accounts.ts
// Token account management utilities

import { PublicKey, TransactionInstruction } from '@solana/web3.js';
import {
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  getAccount,
  TOKEN_PROGRAM_ID,
} from '@solana/spl-token';
import { Connection } from '@solana/web3.js';

/**
 * Gets or creates an associated token account instruction
 * Returns the instruction if account doesn't exist, null if it does
 */
export async function ensureTokenAccountInstruction(
  connection: Connection,
  mint: PublicKey,
  owner: PublicKey,
  payer: PublicKey
): Promise<TransactionInstruction | null> {
  const tokenAccount = await getAssociatedTokenAddress(mint, owner);

  try {
    await getAccount(connection, tokenAccount);
    // Account exists, no instruction needed
    return null;
  } catch {
    // Account doesn't exist, create it
    return createAssociatedTokenAccountInstruction(payer, tokenAccount, owner, mint, TOKEN_PROGRAM_ID);
  }
}

/**
 * Gets associated token address for a mint and owner
 */
export async function getTokenAccountAddress(
  mint: PublicKey,
  owner: PublicKey
): Promise<PublicKey> {
  return getAssociatedTokenAddress(mint, owner);
}

/**
 * Checks if a token account exists
 */
export async function tokenAccountExists(
  connection: Connection,
  tokenAccount: PublicKey
): Promise<boolean> {
  try {
    await getAccount(connection, tokenAccount);
    return true;
  } catch {
    return false;
  }
}

