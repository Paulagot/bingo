/**
 * @module features/web3/solana/api/prizes/calculate-charity-amount
 *
 * ## Purpose
 * Calculates the exact charity amount from on-chain room data. This ensures
 * the amount sent to The Giving Block API matches what will actually be
 * distributed by the contract.
 *
 * ## Architecture
 * This function reads:
 * - Room vault balance (actual tokens in vault)
 * - Room charity basis points (charityBps)
 * - Token mint decimals (for formatting)
 *
 * Then calculates: charityAmount = (vaultBalance * charityBps) / 10000
 *
 * @see {@link distributePrizes} - Uses this amount for TGB API calls
 */

import { PublicKey, Connection } from '@solana/web3.js';
import { BN } from '@coral-xyz/anchor';
import { getMint } from '@solana/spl-token';
import { deriveRoomVaultPDA } from '@/shared/lib/solana/pda';
import { getAccount } from '@solana/spl-token';
import type { SolanaContractContext } from '@/features/web3/solana/model/types';

/**
 * Result of charity amount calculation
 */
export interface CharityAmountResult {
  /** Exact charity amount in raw token units (BN) */
  charityAmountRaw: BN;
  /** Exact charity amount in human-readable format (string) */
  charityAmountFormatted: string;
  /** Total vault balance in raw token units (BN) */
  vaultBalanceRaw: BN;
  /** Charity basis points (e.g., 4000 = 40%) */
  charityBps: number;
  /** Token decimals (e.g., 6 for USDC) */
  decimals: number;
  /** Token mint address */
  feeTokenMint: PublicKey;
}

/**
 * Calculates the exact charity amount from on-chain room data
 *
 * This function reads the room vault balance and charity basis points
 * from the on-chain room account to calculate the exact amount that
 * will be sent to charity when prizes are distributed.
 *
 * @param context - Solana contract context (must have program and connection)
 * @param roomAddress - Room PDA address
 * @returns Charity amount calculation result
 * @throws Error if room not found, vault not found, or calculation fails
 *
 * @example
 * ```typescript
 * const result = await calculateCharityAmount(context, roomPDA);
 * console.log('Exact charity amount:', result.charityAmountFormatted);
 * console.log('Vault balance:', result.vaultBalanceRaw.toString());
 * console.log('Charity percentage:', result.charityBps / 100, '%');
 * ```
 */
export async function calculateCharityAmount(
  context: SolanaContractContext,
  roomAddress: string | PublicKey
): Promise<CharityAmountResult> {
  if (!context.program) {
    throw new Error('Program not initialized');
  }

  if (!context.connection) {
    throw new Error('Connection not available');
  }

  const { program, connection } = context;
  const roomPDA = typeof roomAddress === 'string' ? new PublicKey(roomAddress) : roomAddress;

  // Fetch room account
  const roomAccount = await (program.account as any).room.fetch(roomPDA);

  // Get charity basis points
  const charityBps = roomAccount.charityBps as number;
  if (!charityBps || charityBps < 0 || charityBps > 10000) {
    throw new Error(
      `Invalid charity basis points: ${charityBps}. Must be between 0 and 10000.`
    );
  }

  // Get fee token mint
  const feeTokenMint = roomAccount.feeTokenMint as PublicKey;

  // Get token decimals
  let decimals: number;
  try {
    const mintInfo = await getMint(connection, feeTokenMint);
    decimals = mintInfo.decimals;
  } catch (error: any) {
    throw new Error(
      `Failed to get token decimals for mint ${feeTokenMint.toBase58()}: ${error.message}`
    );
  }

  // Derive room vault PDA
  const [roomVault] = deriveRoomVaultPDA(roomPDA);

  // Get vault balance
  let vaultBalanceRaw: BN;
  try {
    const vaultAccount = await getAccount(connection, roomVault, 'confirmed');
    vaultBalanceRaw = new BN(vaultAccount.amount.toString());
  } catch (error: any) {
    if (
      error.message?.includes('could not find account') ||
      error.message?.includes('Invalid account') ||
      error.name === 'TokenAccountNotFoundError'
    ) {
      throw new Error(
        `Room vault not found: ${roomVault.toBase58()}. The room may not be properly initialized.`
      );
    }
    throw new Error(
      `Failed to get vault balance: ${error.message}. Vault: ${roomVault.toBase58()}`
    );
  }

  // Calculate exact charity amount: (vaultBalance * charityBps) / 10000
  const charityAmountRaw = vaultBalanceRaw.mul(new BN(charityBps)).div(new BN(10000));

  // Format charity amount for display (convert to human-readable format)
  const charityAmountFormatted = formatTokenAmount(charityAmountRaw, decimals);

  console.log('[calculateCharityAmount] 💰 Charity amount calculation:', {
    roomAddress: roomPDA.toBase58(),
    vaultBalance: vaultBalanceRaw.toString(),
    charityBps,
    charityPercentage: (charityBps / 100).toFixed(2) + '%',
    charityAmountRaw: charityAmountRaw.toString(),
    charityAmountFormatted,
    decimals,
    feeTokenMint: feeTokenMint.toBase58(),
  });

  return {
    charityAmountRaw,
    charityAmountFormatted,
    vaultBalanceRaw,
    charityBps,
    decimals,
    feeTokenMint,
  };
}

/**
 * Formats a token amount with decimals for display
 *
 * @param amount - Raw token amount (BN)
 * @param decimals - Token decimals (e.g., 6 for USDC)
 * @returns Formatted amount string (e.g., "1.234567")
 */
function formatTokenAmount(amount: BN, decimals: number): string {
  const amountStr = amount.toString();
  
  // Handle zero
  if (amountStr === '0' || amountStr === '') {
    return '0';
  }

  // Pad with leading zeros if needed
  const paddedAmount = amountStr.padStart(decimals + 1, '0');

  // Split into integer and fractional parts
  const integerPart = paddedAmount.slice(0, -decimals) || '0';
  let fractionalPart = paddedAmount.slice(-decimals);

  // Remove trailing zeros
  fractionalPart = fractionalPart.replace(/0+$/, '');

  // Combine
  return fractionalPart ? `${integerPart}.${fractionalPart}` : integerPart;
}

