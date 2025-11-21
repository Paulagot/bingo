/**
 * @module shared/lib/solana/transactions
 *
 * ## Purpose
 * Provides utilities for building, signing, sending, and confirming Solana transactions.
 * Handles common patterns like blockhash management, retry logic, and error handling.
 *
 * ## Architecture
 * Solana transactions have a lifecycle:
 * 1. **Build**: Add instructions, set fee payer, get recent blockhash
 * 2. **Sign**: Sign with required keypairs (wallet + any PDAs)
 * 3. **Send**: Submit to network via RPC
 * 4. **Confirm**: Wait for confirmation (finalized, confirmed, or processed)
 *
 * ## Blockhash Management
 * Transactions have a limited lifetime based on their `recentBlockhash`:
 * - Valid for ~60-90 seconds (150 blocks @ 400ms per block)
 * - Must be sent before `lastValidBlockHeight` is reached
 * - Expired transactions fail with "Blockhash not found" error
 *
 * **Best Practice**: Get blockhash as late as possible (right before signing)
 * to maximize the window for user approval and network submission.
 *
 * ## Retry Strategy
 * Network congestion and RPC issues require retry logic:
 * - Blockhash expiration: Retry with fresh blockhash
 * - Network errors: Exponential backoff
 * - Rate limits: Back off and retry
 *
 * ## Public API
 * - `buildTransaction()` - Create transaction with instructions
 * - `sendAndConfirm()` - Send transaction and wait for confirmation
 * - `sendWithRetry()` - Send with automatic retry on failure
 * - `simulateTransaction()` - Simulate before sending
 * - `getRecentBlockhash()` - Get fresh blockhash
 *
 * ## Security Considerations
 * - Always simulate transactions before sending (catch errors early)
 * - Use 'confirmed' or 'finalized' commitment for important operations
 * - Set reasonable timeout limits to prevent hanging
 * - Validate all signers are present before submitting
 *
 * @see https://docs.solana.com/developing/programming-model/transactions
 * @see https://docs.solana.com/developing/programming-model/runtime#blockhash
 *
 * @example
 * ```typescript
 * import { buildTransaction, sendAndConfirm } from '@/shared/lib/solana/transactions';
 *
 * // Build transaction
 * const tx = await buildTransaction({
 *   connection,
 *   instructions: [instruction1, instruction2],
 *   feePayer: publicKey,
 * });
 *
 * // Sign (wallet provider handles this)
 * const signedTx = await wallet.signTransaction(tx);
 *
 * // Send and confirm
 * const signature = await sendAndConfirm({
 *   connection,
 *   signedTransaction: signedTx,
 *   commitment: 'confirmed',
 * });
 * ```
 */

import {
  Connection,
  Transaction,
  TransactionInstruction,
  PublicKey,
  SendOptions,
  Commitment,
  BlockheightBasedTransactionConfirmationStrategy,
  type VersionedTransaction,
} from '@solana/web3.js';

/**
 * Parameters for building a transaction
 */
export interface BuildTransactionParams {
  /** Solana connection */
  connection: Connection;
  /** Instructions to include in transaction */
  instructions: TransactionInstruction[];
  /** Fee payer public key */
  feePayer: PublicKey;
  /** Commitment level for blockhash (default: 'finalized') */
  commitment?: Commitment;
}

/**
 * Parameters for sending and confirming a transaction
 */
export interface SendAndConfirmParams {
  /** Solana connection */
  connection: Connection;
  /** Signed transaction (from wallet.signTransaction) */
  signedTransaction: Transaction;
  /** Confirmation commitment level (default: 'confirmed') */
  commitment?: Commitment;
  /** Whether to skip preflight checks (default: false) */
  skipPreflight?: boolean;
  /** Maximum retries for sending (default: 3) */
  maxRetries?: number;
}

/**
 * Parameters for transaction simulation
 */
export interface SimulateTransactionParams {
  /** Solana connection */
  connection: Connection;
  /** Transaction to simulate (can be unsigned) */
  transaction: Transaction | VersionedTransaction;
  /** Commitment level (default: 'confirmed') */
  commitment?: Commitment;
  /** Accounts to treat as signers for simulation */
  signerPublicKeys?: PublicKey[];
}

/**
 * Result from transaction simulation
 */
export interface SimulationResult {
  /** Whether simulation succeeded */
  success: boolean;
  /** Simulation logs */
  logs: string[];
  /** Units consumed */
  unitsConsumed?: number;
  /** Error message if failed */
  error?: string;
  /** Return data if available */
  returnData?: any;
}

/**
 * Parameters for sending with retry logic
 */
export interface SendWithRetryParams extends SendAndConfirmParams {
  /** Maximum retry attempts (default: 2) */
  maxAttempts?: number;
  /** Retry delay in milliseconds (default: 1000) */
  retryDelay?: number;
  /** Callback for retry attempts */
  onRetry?: (attempt: number, error: Error) => void;
}

/**
 * Builds a transaction with instructions and recent blockhash
 *
 * Creates a transaction ready for signing. Gets a fresh blockhash from the network
 * and sets up the transaction metadata.
 *
 * **Important**: The blockhash has a limited lifetime. Build the transaction as close
 * to signing time as possible to maximize the submission window.
 *
 * @param params - Transaction building parameters
 * @returns Unsigned transaction ready for signing
 *
 * @example
 * ```typescript
 * const tx = await buildTransaction({
 *   connection,
 *   instructions: [
 *     createAccountInstruction,
 *     initializeInstruction,
 *   ],
 *   feePayer: publicKey,
 * });
 *
 * // Sign immediately after building
 * const signed = await wallet.signTransaction(tx);
 * ```
 */
export async function buildTransaction(
  params: BuildTransactionParams
): Promise<Transaction> {
  const { connection, instructions, feePayer, commitment = 'finalized' } = params;

  // Get fresh blockhash
  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash(
    commitment
  );

  // Build transaction
  const transaction = new Transaction();
  transaction.add(...instructions);
  transaction.feePayer = feePayer;
  transaction.recentBlockhash = blockhash;
  transaction.lastValidBlockHeight = lastValidBlockHeight;

  return transaction;
}

/**
 * Gets a recent blockhash with metadata
 *
 * Fetches a fresh blockhash and its validity window. Use this when you need
 * to rebuild a transaction with a new blockhash (e.g., after expiration).
 *
 * @param connection - Solana connection
 * @param commitment - Commitment level (default: 'finalized')
 * @returns Blockhash and validity information
 *
 * @example
 * ```typescript
 * const { blockhash, lastValidBlockHeight } = await getRecentBlockhash(connection);
 * transaction.recentBlockhash = blockhash;
 * transaction.lastValidBlockHeight = lastValidBlockHeight;
 * ```
 */
export async function getRecentBlockhash(
  connection: Connection,
  commitment: Commitment = 'finalized'
): Promise<{
  blockhash: string;
  lastValidBlockHeight: number;
}> {
  return connection.getLatestBlockhash(commitment);
}

/**
 * Simulates a transaction without submitting it
 *
 * Runs the transaction through the runtime without actually executing it on-chain.
 * This is useful for:
 * - Checking if transaction will succeed before sending
 * - Estimating compute units
 * - Debugging transaction errors
 *
 * **Best Practice**: Always simulate before sending to catch errors early.
 *
 * @param params - Simulation parameters
 * @returns Simulation result with logs and error info
 *
 * @throws {Error} If simulation request fails (network error)
 *
 * @example
 * ```typescript
 * const result = await simulateTransaction({
 *   connection,
 *   transaction: tx,
 *   commitment: 'confirmed',
 * });
 *
 * if (!result.success) {
 *   console.error('Transaction will fail:', result.error);
 *   console.error('Logs:', result.logs);
 *   return; // Don't send
 * }
 *
 * console.log('Estimated compute units:', result.unitsConsumed);
 * ```
 */
export async function simulateTransaction(
  params: SimulateTransactionParams
): Promise<SimulationResult> {
  const { connection, transaction, commitment = 'confirmed', signerPublicKeys } = params;

  try {
    const result = await connection.simulateTransaction(
      transaction,
      signerPublicKeys,
      commitment
    );

    if (result.value.err) {
      return {
        success: false,
        logs: result.value.logs || [],
        unitsConsumed: result.value.unitsConsumed,
        error: JSON.stringify(result.value.err),
      };
    }

    return {
      success: true,
      logs: result.value.logs || [],
      unitsConsumed: result.value.unitsConsumed,
      returnData: result.value.returnData,
    };
  } catch (error: any) {
    return {
      success: false,
      logs: [],
      error: error.message || 'Simulation failed',
    };
  }
}

/**
 * Sends a signed transaction and waits for confirmation
 *
 * Submits the transaction to the network and polls for confirmation until
 * the specified commitment level is reached or the transaction expires.
 *
 * @param params - Send and confirm parameters
 * @returns Transaction signature
 *
 * @throws {Error} If transaction fails or expires
 *
 * @example
 * ```typescript
 * const signedTx = await wallet.signTransaction(tx);
 * const signature = await sendAndConfirm({
 *   connection,
 *   signedTransaction: signedTx,
 *   commitment: 'confirmed',
 * });
 *
 * console.log('Transaction confirmed:', signature);
 * ```
 */
export async function sendAndConfirm(
  params: SendAndConfirmParams
): Promise<string> {
  const {
    connection,
    signedTransaction,
    commitment = 'confirmed',
    skipPreflight = false,
    maxRetries = 3,
  } = params;

  // Send transaction
  const sendOptions: SendOptions = {
    skipPreflight,
    maxRetries,
    preflightCommitment: commitment,
  };

  const rawTransaction = signedTransaction.serialize();
  const signature = await connection.sendRawTransaction(rawTransaction, sendOptions);

  // Wait for confirmation
  const { blockhash, lastValidBlockHeight } = signedTransaction;

  if (!blockhash) {
    throw new Error('Transaction missing blockhash');
  }

  const strategy: BlockheightBasedTransactionConfirmationStrategy = {
    signature,
    blockhash,
    lastValidBlockHeight: lastValidBlockHeight || (await connection.getBlockHeight()) + 150,
  };

  const result = await connection.confirmTransaction(strategy, commitment);

  if (result.value.err) {
    throw new Error(`Transaction failed: ${JSON.stringify(result.value.err)}`);
  }

  return signature;
}

/**
 * Sends a transaction with automatic retry on blockhash expiration
 *
 * Handles the common case where a transaction expires due to user delay in
 * approving the wallet signature. If the blockhash expires, this function
 * automatically gets a fresh blockhash and retries.
 *
 * **Use Case**: User takes too long to approve transaction in wallet, causing
 * blockhash to expire. This function rebuilds with fresh blockhash and retries.
 *
 * @param params - Send with retry parameters
 * @returns Transaction signature
 *
 * @throws {Error} If all retry attempts fail
 *
 * @example
 * ```typescript
 * // This will automatically retry if blockhash expires
 * const signature = await sendWithRetry({
 *   connection,
 *   signedTransaction: tx,
 *   maxAttempts: 3,
 *   onRetry: (attempt, error) => {
 *     console.log(`Retry attempt ${attempt}: ${error.message}`);
 *   },
 * });
 * ```
 */
export async function sendWithRetry(
  params: SendWithRetryParams
): Promise<string> {
  const {
    connection,
    signedTransaction,
    commitment = 'confirmed',
    skipPreflight = false,
    maxRetries = 3,
    maxAttempts = 2,
    retryDelay = 1000,
    onRetry,
  } = params;

  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      // Try to send and confirm
      const signature = await sendAndConfirm({
        connection,
        signedTransaction,
        commitment,
        skipPreflight,
        maxRetries,
      });

      return signature;
    } catch (error: any) {
      lastError = error;

      // Check if it's a blockhash expiration error
      const isBlockhashExpired =
        error.message?.includes('Blockhash not found') ||
        error.message?.includes('blockhash') ||
        error.message?.includes('expired');

      if (isBlockhashExpired && attempt < maxAttempts - 1) {
        // Notify caller of retry
        if (onRetry) {
          onRetry(attempt + 1, error);
        }

        // Wait before retrying
        await new Promise((resolve) => setTimeout(resolve, retryDelay));

        // Get fresh blockhash and update transaction
        const { blockhash, lastValidBlockHeight } = await getRecentBlockhash(
          connection,
          'finalized'
        );
        signedTransaction.recentBlockhash = blockhash;
        signedTransaction.lastValidBlockHeight = lastValidBlockHeight;

        // Continue to next attempt
        continue;
      }

      // Non-blockhash error or last attempt - throw
      throw error;
    }
  }

  // All attempts failed
  throw lastError || new Error('Transaction failed after all retry attempts');
}

/**
 * Waits for a transaction to be confirmed
 *
 * Polls the network until a transaction reaches the specified commitment level.
 * Useful when you have a signature but need to wait for confirmation.
 *
 * @param connection - Solana connection
 * @param signature - Transaction signature
 * @param commitment - Commitment level to wait for (default: 'confirmed')
 * @param timeout - Maximum wait time in milliseconds (default: 60000)
 * @returns True if confirmed, false if timeout
 *
 * @example
 * ```typescript
 * const confirmed = await waitForConfirmation(
 *   connection,
 *   signature,
 *   'finalized',
 *   90000 // 90 seconds
 * );
 *
 * if (confirmed) {
 *   console.log('Transaction finalized');
 * } else {
 *   console.warn('Transaction confirmation timeout');
 * }
 * ```
 */
export async function waitForConfirmation(
  connection: Connection,
  signature: string,
  commitment: Commitment = 'confirmed',
  timeout: number = 60000
): Promise<boolean> {
  const start = Date.now();

  while (Date.now() - start < timeout) {
    const status = await connection.getSignatureStatus(signature);

    if (status.value?.confirmationStatus === commitment ||
        status.value?.confirmationStatus === 'finalized') {
      return true;
    }

    if (status.value?.err) {
      throw new Error(`Transaction failed: ${JSON.stringify(status.value.err)}`);
    }

    // Wait 500ms before next check
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  return false;
}

/**
 * Estimates compute units for a transaction
 *
 * Simulates the transaction and returns the compute units consumed.
 * Useful for determining if a transaction will fit within compute limits.
 *
 * @param connection - Solana connection
 * @param transaction - Transaction to estimate
 * @returns Estimated compute units, or null if simulation failed
 *
 * @example
 * ```typescript
 * const units = await estimateComputeUnits(connection, tx);
 * if (units && units > 200000) {
 *   console.warn('Transaction is compute-intensive');
 * }
 * ```
 */
export async function estimateComputeUnits(
  connection: Connection,
  transaction: Transaction
): Promise<number | null> {
  const result = await simulateTransaction({
    connection,
    transaction,
  });

  return result.unitsConsumed || null;
}
