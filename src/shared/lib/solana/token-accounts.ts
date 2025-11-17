/**
 * @module shared/lib/solana/token-accounts
 *
 * ## Purpose
 * Provides utilities for managing SPL token accounts on Solana. Handles Associated
 * Token Account (ATA) creation, validation, balance checking, and ownership verification.
 *
 * ## Architecture
 * Token accounts on Solana follow the SPL Token standard:
 * - **Mint**: The token type (USDC, PYUSD, NFT, etc.)
 * - **Token Account**: Holds tokens of a specific mint for a specific owner
 * - **ATA**: Deterministically derived token account address for (owner, mint) pair
 *
 * Associated Token Accounts (ATAs) are the standard way to hold tokens. They are
 * PDAs derived from the owner's public key and the token mint, ensuring each owner
 * has exactly one canonical address per token type.
 *
 * ## Public API
 * - `getAssociatedTokenAccountAddress()` - Derive ATA address without RPC call
 * - `getOrCreateATA()` - Get existing ATA or create instruction if missing
 * - `checkTokenBalance()` - Validate sufficient token balance
 * - `validateTokenAccount()` - Verify account ownership and mint
 * - `createATAInstruction()` - Create instruction for ATA creation
 *
 * ## Token Account States
 * 1. **Doesn't exist**: Account info is null, must be created
 * 2. **Exists but uninitialized**: Has lamports but not initialized as token account
 * 3. **Initialized**: Properly initialized with correct mint and owner
 * 4. **Wrong mint**: Initialized but for different token type (error state)
 *
 * ## Security Considerations
 * - Always verify account ownership before transferring
 * - Check mint matches expected token type
 * - Validate sufficient balance before operations
 * - ATAs are created with rent-exemption (permanent accounts)
 *
 * @see https://spl.solana.com/token - SPL Token documentation
 * @see https://spl.solana.com/associated-token-account - ATA specification
 *
 * @example
 * ```typescript
 * import { getOrCreateATA, checkTokenBalance } from '@/shared/lib/solana/token-accounts';
 *
 * // Get or create user's USDC account
 * const { address, instruction } = await getOrCreateATA({
 *   connection,
 *   mint: USDC_MINT,
 *   owner: userPublicKey,
 *   payer: userPublicKey,
 * });
 *
 * // Validate user has enough USDC
 * const hasBalance = await checkTokenBalance({
 *   connection,
 *   tokenAccount: address,
 *   requiredAmount: new BN(1_000_000), // 1 USDC (6 decimals)
 * });
 * ```
 */


import {
  Connection,
  PublicKey,
  TransactionInstruction,
} from '@solana/web3.js';
import {
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getAssociatedTokenAddressSync, // ✅ USE THE SYNC VERSION
  createAssociatedTokenAccountInstruction,
  getAccount,
  TokenAccountNotFoundError,
  TokenInvalidAccountOwnerError,
  TokenInvalidMintError,
  type Account as TokenAccount,
} from '@solana/spl-token';
import { BN } from '@coral-xyz/anchor';

// ... (keep all your interfaces the same)

export interface GetOrCreateATAResult {
  address: PublicKey;
  instruction: TransactionInstruction | null;
  exists: boolean;
  account?: TokenAccount;
}

export interface GetOrCreateATAParams {
  connection: Connection;
  mint: PublicKey;
  owner: PublicKey;
  payer: PublicKey;
  allowOwnerOffCurve?: boolean;
}

export interface CheckTokenBalanceParams {
  connection: Connection;
  tokenAccount: PublicKey;
  requiredAmount: BN;
  expectedMint?: PublicKey;
}

export interface TokenBalanceResult {
  sufficient: boolean;
  currentBalance: BN;
  requiredBalance: BN;
  missingAmount: BN;
  account: TokenAccount;
}

export interface ValidateTokenAccountParams {
  connection: Connection;
  tokenAccount: PublicKey;
  expectedOwner?: PublicKey;
  expectedMint?: PublicKey;
}

/**
 * Derives the Associated Token Account address for an owner and mint
 * 
 * This is a SYNCHRONOUS function that computes the ATA address without making an RPC call.
 */
export function getAssociatedTokenAccountAddress(
  mint: PublicKey,
  owner: PublicKey,
  allowOwnerOffCurve: boolean = false
): PublicKey {
  // Validate inputs are actually PublicKey instances
  if (!(mint instanceof PublicKey)) {
    throw new Error(
      `Invalid mint: expected PublicKey, got ${typeof mint}. ` +
      `Value: ${JSON.stringify(mint)}`
    );
  }
  if (!(owner instanceof PublicKey)) {
    throw new Error(
      `Invalid owner: expected PublicKey, got ${typeof owner}. ` +
      `Value: ${JSON.stringify(owner)}`
    );
  }

  // Validate PublicKey instances are valid
  let mintAddress: string;
  let ownerAddress: string;
  try {
    mintAddress = mint.toBase58();
  } catch (error: any) {
    throw new Error(
      `Invalid mint PublicKey: ${error.message}. ` +
      `Value: ${JSON.stringify(mint)}`
    );
  }
  try {
    ownerAddress = owner.toBase58();
  } catch (error: any) {
    throw new Error(
      `Invalid owner PublicKey: ${error.message}. ` +
      `Value: ${JSON.stringify(owner)}`
    );
  }

  try {
    // ✅ USE getAssociatedTokenAddressSync - this is guaranteed to be synchronous
    const ataAddress = getAssociatedTokenAddressSync(
      mint,
      owner,
      allowOwnerOffCurve,
      TOKEN_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID
    );
    
    return ataAddress;
  } catch (error: any) {
    // Handle assertion failures and other errors
    if (error.message?.includes('Assertion failed')) {
      throw new Error(
        `Failed to derive ATA: Invalid PublicKey parameters. ` +
        `mint: ${mintAddress}, owner: ${ownerAddress}. ` +
        `Original error: ${error.message}`
      );
    }
    
    // Wrap other errors with context
    throw new Error(
      `Failed to get associated token account address: ${error.message}. ` +
      `mint: ${mintAddress}, owner: ${ownerAddress}`
    );
  }
}

/**
 * Converts Anchor account PublicKey objects to PublicKey instances
 * Handles: PublicKey instances, strings, and Anchor account objects with toBase58()
 * 
 * @param value - The value to convert (PublicKey, string, or Anchor account object)
 * @param fieldName - Name of the field for error messages (default: 'PublicKey')
 * @returns PublicKey instance
 * @throws Error if value cannot be converted to PublicKey
 * 
 * @example
 * ```typescript
 * // Handle Anchor account PublicKey objects
 * const mint = toPublicKey(roomAccount.feeTokenMint, 'feeTokenMint');
 * 
 * // Handle strings
 * const wallet = toPublicKey('9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM', 'wallet');
 * 
 * // Handle existing PublicKey instances (no conversion needed)
 * const existing = toPublicKey(publicKey, 'publicKey');
 * ```
 */
export function toPublicKey(value: any, fieldName: string = 'PublicKey'): PublicKey {
  if (value instanceof PublicKey) {
    return value;
  }
  if (typeof value === 'string') {
    return new PublicKey(value);
  }
  if (value && typeof value.toBase58 === 'function') {
    return new PublicKey(value.toBase58());
  }
  throw new Error(
    `Invalid ${fieldName}: expected PublicKey, string, or object with toBase58, got ${typeof value}. ` +
    `Value: ${JSON.stringify(value)}`
  );
}

/**
 * Gets an existing ATA or returns an instruction to create it
 */
export async function getOrCreateATA(
  params: GetOrCreateATAParams
): Promise<GetOrCreateATAResult> {
  const { connection, mint, owner, payer, allowOwnerOffCurve = false } = params;

  // Derive ATA address
  const address = getAssociatedTokenAccountAddress(mint, owner, allowOwnerOffCurve);

  // Try to fetch existing account
  try {
    const account = await getAccount(
      connection,
      address,
      'confirmed',
      TOKEN_PROGRAM_ID
    );

    // Validate account
    if (!account.mint.equals(mint)) {
      throw new TokenInvalidMintError(
        `Token account ${address.toBase58()} has mint ${account.mint.toBase58()}, expected ${mint.toBase58()}`
      );
    }

    if (!account.owner.equals(owner)) {
      throw new TokenInvalidAccountOwnerError(
        `Token account ${address.toBase58()} has owner ${account.owner.toBase58()}, expected ${owner.toBase58()}`
      );
    }

    // Account exists and is valid
    return {
      address,
      instruction: null,
      exists: true,
      account,
    };
  } catch (error) {
    // Account doesn't exist - create instruction
    if (
      error instanceof TokenAccountNotFoundError ||
      (error as any).message?.includes('could not find account') ||
      (error as any).message?.includes('Invalid account data')
    ) {
      const instruction = createATAInstruction({
        mint,
        owner,
        payer,
        allowOwnerOffCurve,
      });

      return {
        address,
        instruction,
        exists: false,
      };
    }

    // Other errors (invalid mint, invalid owner, etc.)
    throw error;
  }
}

/**
 * Creates an instruction to initialize an Associated Token Account
 */
export function createATAInstruction(params: {
  mint: PublicKey;
  owner: PublicKey;
  payer: PublicKey;
  allowOwnerOffCurve?: boolean;
}): TransactionInstruction {
  const { mint, owner, payer, allowOwnerOffCurve = false } = params;

  const ataAddress = getAssociatedTokenAccountAddress(mint, owner, allowOwnerOffCurve);

  return createAssociatedTokenAccountInstruction(
    payer,
    ataAddress,
    owner,
    mint,
    TOKEN_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID
  );
}

/**
 * Checks if a token account has sufficient balance
 */
export async function checkTokenBalance(
  params: CheckTokenBalanceParams
): Promise<TokenBalanceResult> {
  const { connection, tokenAccount, requiredAmount, expectedMint } = params;

  // Fetch account
  const account = await getAccount(
    connection,
    tokenAccount,
    'confirmed',
    TOKEN_PROGRAM_ID
  );

  // Validate mint if provided
  if (expectedMint && !account.mint.equals(expectedMint)) {
    throw new TokenInvalidMintError(
      `Token account has mint ${account.mint.toBase58()}, expected ${expectedMint.toBase58()}`
    );
  }

  // Check balance
  const currentBalance = new BN(account.amount.toString());
  const sufficient = currentBalance.gte(requiredAmount);
  const missingAmount = sufficient ? new BN(0) : requiredAmount.sub(currentBalance);

  return {
    sufficient,
    currentBalance,
    requiredBalance: requiredAmount,
    missingAmount,
    account,
  };
}

/**
 * Validates a token account's ownership and mint
 */
export async function validateTokenAccount(
  params: ValidateTokenAccountParams
): Promise<TokenAccount> {
  const { connection, tokenAccount, expectedOwner, expectedMint } = params;

  // Fetch account
  const account = await getAccount(
    connection,
    tokenAccount,
    'confirmed',
    TOKEN_PROGRAM_ID
  );

  // Validate owner
  if (expectedOwner && !account.owner.equals(expectedOwner)) {
    throw new TokenInvalidAccountOwnerError(
      `Token account has owner ${account.owner.toBase58()}, expected ${expectedOwner.toBase58()}`
    );
  }

  // Validate mint
  if (expectedMint && !account.mint.equals(expectedMint)) {
    throw new TokenInvalidMintError(
      `Token account has mint ${account.mint.toBase58()}, expected ${expectedMint.toBase58()}`
    );
  }

  return account;
}

/**
 * Formats a token amount with decimals for display
 */
export function formatTokenAmount(
  amount: BN | bigint | number,
  decimals: number,
  maxFractionDigits?: number
): string {
  const amountStr = amount.toString();
  const paddedAmount = amountStr.padStart(decimals + 1, '0');

  const integerPart = paddedAmount.slice(0, -decimals) || '0';
  let fractionPart = paddedAmount.slice(-decimals);

  // Trim trailing zeros
  if (maxFractionDigits !== undefined) {
    fractionPart = fractionPart.slice(0, maxFractionDigits);
  }
  fractionPart = fractionPart.replace(/0+$/, '');

  return fractionPart ? `${integerPart}.${fractionPart}` : integerPart;
}

/**
 * Parses a decimal token amount to raw units
 */
export function parseTokenAmount(amount: string, decimals: number): BN {
  if (!/^\d+(\.\d+)?$/.test(amount)) {
    throw new Error(`Invalid amount format: ${amount}`);
  }

  const [integerPart, fractionPart = ''] = amount.split('.');

  if (fractionPart.length > decimals) {
    throw new Error(
      `Amount has too many decimal places: ${fractionPart.length} (max: ${decimals})`
    );
  }

  const paddedFraction = fractionPart.padEnd(decimals, '0');
  const rawAmount = integerPart + paddedFraction;

  return new BN(rawAmount);
}