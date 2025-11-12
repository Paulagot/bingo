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
  getAssociatedTokenAddress as getATAAddress,
  createAssociatedTokenAccountInstruction,
  getAccount,
  TokenAccountNotFoundError,
  TokenInvalidAccountOwnerError,
  TokenInvalidMintError,
  type Account as TokenAccount,
} from '@solana/spl-token';
import { BN } from '@coral-xyz/anchor';

/**
 * Result from getOrCreateATA operation
 */
export interface GetOrCreateATAResult {
  /** The ATA address (existing or to-be-created) */
  address: PublicKey;
  /** Instruction to create the ATA (null if already exists) */
  instruction: TransactionInstruction | null;
  /** Whether the account already existed */
  exists: boolean;
  /** Token account info (if exists) */
  account?: TokenAccount;
}

/**
 * Parameters for getting or creating an ATA
 */
export interface GetOrCreateATAParams {
  /** Solana connection */
  connection: Connection;
  /** Token mint address */
  mint: PublicKey;
  /** Owner of the token account */
  owner: PublicKey;
  /** Payer for account creation (pays rent) */
  payer: PublicKey;
  /** Allow owner off curve (PDA owners) */
  allowOwnerOffCurve?: boolean;
}

/**
 * Parameters for checking token balance
 */
export interface CheckTokenBalanceParams {
  /** Solana connection */
  connection: Connection;
  /** Token account address */
  tokenAccount: PublicKey;
  /** Required amount (in raw token units) */
  requiredAmount: BN;
  /** Optional mint to verify */
  expectedMint?: PublicKey;
}

/**
 * Result from token balance check
 */
export interface TokenBalanceResult {
  /** Whether balance is sufficient */
  sufficient: boolean;
  /** Current balance */
  currentBalance: BN;
  /** Required balance */
  requiredBalance: BN;
  /** Missing amount (0 if sufficient) */
  missingAmount: BN;
  /** Token account info */
  account: TokenAccount;
}

/**
 * Parameters for validating a token account
 */
export interface ValidateTokenAccountParams {
  /** Solana connection */
  connection: Connection;
  /** Token account address to validate */
  tokenAccount: PublicKey;
  /** Expected owner (optional) */
  expectedOwner?: PublicKey;
  /** Expected mint (optional) */
  expectedMint?: PublicKey;
}

/**
 * Derives the Associated Token Account address for an owner and mint
 *
 * This function computes the ATA address without making an RPC call.
 * The address is deterministic based on the owner and mint, following the SPL Token
 * standard derivation.
 *
 * Note: In some versions of @solana/spl-token, getATAAddress may return a Promise,
 * so this function is async to handle both synchronous and Promise returns.
 *
 * @param mint - Token mint address
 * @param owner - Owner's public key
 * @param allowOwnerOffCurve - Allow PDA owners (default: false)
 * @returns The ATA address (Promise)
 *
 * @example
 * ```typescript
 * const ataAddress = await getAssociatedTokenAccountAddress(USDC_MINT, userPublicKey);
 * console.log('User USDC account:', ataAddress.toBase58());
 * ```
 */
export async function getAssociatedTokenAccountAddress(
  mint: PublicKey,
  owner: PublicKey,
  allowOwnerOffCurve: boolean = false
): Promise<PublicKey> {
  // Validate inputs are actually PublicKey instances
  if (!(mint instanceof PublicKey)) {
    throw new Error(`Invalid mint: expected PublicKey, got ${typeof mint}`);
  }
  if (!(owner instanceof PublicKey)) {
    throw new Error(`Invalid owner: expected PublicKey, got ${typeof owner}`);
  }

  try {
    // getATAAddress may return a PublicKey directly or a Promise depending on version
    const ataAddressResult = getATAAddress(
      mint,
      owner,
      allowOwnerOffCurve,
      TOKEN_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID
    );
    
    // Handle both sync and async returns
    const ataAddress = ataAddressResult instanceof Promise 
      ? await ataAddressResult 
      : ataAddressResult;
    
    // getATAAddress should return a PublicKey
    if (ataAddress instanceof PublicKey) {
      return ataAddress;
    }
    
    // If it's not a PublicKey, try to convert it
    // This shouldn't happen, but handle it gracefully
    if (typeof ataAddress === 'string') {
      return new PublicKey(ataAddress);
    }
    
    // If it has a toBase58 method, use it
    if (ataAddress && typeof ataAddress.toBase58 === 'function') {
      return new PublicKey(ataAddress.toBase58());
    }
    
    // If it's an object with a publicKey property (some versions return this)
    if (ataAddress && typeof ataAddress === 'object' && 'publicKey' in ataAddress) {
      const pubkey = (ataAddress as any).publicKey;
      return pubkey instanceof PublicKey ? pubkey : new PublicKey(pubkey);
    }
    
    // Check for empty object
    if (ataAddress && typeof ataAddress === 'object' && Object.keys(ataAddress).length === 0) {
      throw new Error(
        `getATAAddress returned empty object. This usually indicates invalid parameters or a library error. ` +
        `mint: ${mint.toBase58()}, owner: ${owner.toBase58()}, allowOwnerOffCurve: ${allowOwnerOffCurve}. ` +
        `Please verify the mint and owner are valid PublicKey instances.`
      );
    }
    
    throw new Error(
      `getATAAddress returned invalid type: ${typeof ataAddress}. ` +
      `Value: ${JSON.stringify(ataAddress)}. ` +
      `mint: ${mint.toBase58()}, owner: ${owner.toBase58()}`
    );
  } catch (error: any) {
    if (error.message?.includes('Assertion failed')) {
      throw new Error(
        `Failed to derive ATA: Invalid PublicKey parameters. ` +
        `mint: ${mint.toBase58()}, owner: ${owner.toBase58()}. ` +
        `Original error: ${error.message}`
      );
    }
    throw error;
  }
}

/**
 * Gets an existing ATA or returns an instruction to create it
 *
 * This function checks if the ATA already exists. If it does, it returns the
 * account info. If not, it returns an instruction that can be added to a
 * transaction to create the account.
 *
 * **Important**: The instruction should be added BEFORE any instructions that
 * require the account to exist (like transferring tokens).
 *
 * @param params - Get or create parameters
 * @returns Result with address, optional instruction, and existence flag
 *
 * @throws {TokenInvalidMintError} If account exists but has wrong mint
 * @throws {TokenInvalidAccountOwnerError} If account exists but has wrong owner
 *
 * @example
 * ```typescript
 * const { address, instruction, exists } = await getOrCreateATA({
 *   connection,
 *   mint: USDC_MINT,
 *   owner: userPublicKey,
 *   payer: userPublicKey,
 * });
 *
 * const tx = new Transaction();
 * if (instruction) {
 *   tx.add(instruction); // Create account first
 * }
 * tx.add(transferInstruction); // Then transfer tokens
 * ```
 */
export async function getOrCreateATA(
  params: GetOrCreateATAParams
): Promise<GetOrCreateATAResult> {
  const { connection, mint, owner, payer, allowOwnerOffCurve = false } = params;

  // Derive ATA address
  const address = await getAssociatedTokenAccountAddress(mint, owner, allowOwnerOffCurve);

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
      const instruction = await createATAInstruction({
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
 *
 * This instruction creates a new ATA that is rent-exempt and properly initialized.
 * The payer pays for the account creation (~0.002 SOL).
 *
 * @param params - Creation parameters
 * @returns Transaction instruction
 *
 * @example
 * ```typescript
 * const instruction = createATAInstruction({
 *   mint: USDC_MINT,
 *   owner: userPublicKey,
 *   payer: userPublicKey,
 * });
 *
 * const tx = new Transaction().add(instruction);
 * ```
 */
export async function createATAInstruction(params: {
  mint: PublicKey;
  owner: PublicKey;
  payer: PublicKey;
  allowOwnerOffCurve?: boolean;
}): Promise<TransactionInstruction> {
  const { mint, owner, payer, allowOwnerOffCurve = false } = params;

  const ataAddress = await getAssociatedTokenAccountAddress(mint, owner, allowOwnerOffCurve);

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
 *
 * Validates that the token account exists, has the expected mint (if provided),
 * and contains at least the required amount of tokens.
 *
 * @param params - Balance check parameters
 * @returns Balance check result with detailed information
 *
 * @throws {TokenAccountNotFoundError} If account doesn't exist
 * @throws {TokenInvalidMintError} If expectedMint provided and doesn't match
 *
 * @example
 * ```typescript
 * const result = await checkTokenBalance({
 *   connection,
 *   tokenAccount: userUSDCAccount,
 *   requiredAmount: new BN(1_000_000), // 1 USDC
 *   expectedMint: USDC_MINT,
 * });
 *
 * if (!result.sufficient) {
 *   throw new Error(
 *     `Insufficient balance. Need ${result.requiredBalance.toString()}, ` +
 *     `have ${result.currentBalance.toString()}, ` +
 *     `missing ${result.missingAmount.toString()}`
 *   );
 * }
 * ```
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
 *
 * Fetches the token account and verifies it matches expected constraints.
 * Useful for pre-flight validation before operations.
 *
 * @param params - Validation parameters
 * @returns Token account info if valid
 *
 * @throws {TokenAccountNotFoundError} If account doesn't exist
 * @throws {TokenInvalidAccountOwnerError} If owner doesn't match
 * @throws {TokenInvalidMintError} If mint doesn't match
 *
 * @example
 * ```typescript
 * try {
 *   const account = await validateTokenAccount({
 *     connection,
 *     tokenAccount: hostTokenAccount,
 *     expectedOwner: hostPublicKey,
 *     expectedMint: prizeMint,
 *   });
 *   console.log('Account valid with balance:', account.amount);
 * } catch (error) {
 *   console.error('Invalid token account:', error.message);
 * }
 * ```
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
 *
 * Converts raw token units to a human-readable decimal string.
 *
 * @param amount - Raw token amount (e.g., 1000000 for 1 USDC with 6 decimals)
 * @param decimals - Token decimals (e.g., 6 for USDC, 9 for SOL)
 * @param maxFractionDigits - Maximum decimal places to show (default: decimals)
 * @returns Formatted string (e.g., "1.000000" or "1")
 *
 * @example
 * ```typescript
 * const balance = new BN(1_234_567); // 1.234567 USDC
 * const formatted = formatTokenAmount(balance, 6);
 * console.log(formatted); // "1.234567"
 *
 * const formattedShort = formatTokenAmount(balance, 6, 2);
 * console.log(formattedShort); // "1.23"
 * ```
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
 *
 * Converts a human-readable decimal string to raw token units.
 *
 * @param amount - Decimal amount string (e.g., "1.5" for 1.5 USDC)
 * @param decimals - Token decimals (e.g., 6 for USDC)
 * @returns Raw token units as BN
 *
 * @throws {Error} If amount is invalid or has too many decimal places
 *
 * @example
 * ```typescript
 * const rawAmount = parseTokenAmount("1.5", 6);
 * console.log(rawAmount.toString()); // "1500000"
 * ```
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
