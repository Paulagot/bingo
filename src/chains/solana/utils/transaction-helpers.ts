/**
 * Transaction Building, Simulation, and Error Formatting Utilities
 * 
 * Provides helpers for safely constructing and executing Solana transactions.
 * Mirrors the logging style of EVM hooks for consistency.
 * 
 * ## Key Features
 * 
 * - **Transaction Building**: Create transactions with proper recent blockhash
 * - **Simulation**: Test transactions before sending (catch errors early)
 * - **Error Formatting**: User-friendly error messages
 * - **Compute Budget**: Automatically add compute units for complex transactions
 * 
 * ## Usage
 * 
 * ```typescript
 * import { buildTransaction, simulateTransaction } from './transaction-helpers';
 * 
 * // Build transaction
 * const tx = await buildTransaction(connection, [instruction], publicKey);
 * 
 * // Simulate before sending
 * const simResult = await simulateTransaction(connection, tx);
 * if (!simResult.success) {
 *   throw new Error(simResult.error);
 * }
 * 
 * // Send
 * const signature = await provider.sendAndConfirm(tx);
 * ```
 */

import { 
  Connection, 
  Transaction, 
  TransactionInstruction,
  PublicKey,
  ComputeBudgetProgram,
} from '@solana/web3.js';

/**
 * Build a transaction with proper recent blockhash and compute budget
 * 
 * @param connection - Solana RPC connection
 * @param instructions - Array of instructions to include
 * @param feePayer - Public key that pays transaction fees
 * @returns Constructed transaction ready to sign
 */
export async function buildTransaction(
  connection: Connection,
  instructions: TransactionInstruction[],
  feePayer: PublicKey
): Promise<Transaction> {
  console.log('[Solana][Transaction] 🔨 Building transaction with', instructions.length, 'instructions');
  console.log('[Solana][Transaction] Fee payer:', feePayer.toBase58());
  
  // Get recent blockhash
  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');
  
  console.log('[Solana][Transaction] 📍 Blockhash:', blockhash.substring(0, 8) + '...');
  console.log('[Solana][Transaction] 📍 Last valid block height:', lastValidBlockHeight);
  
  // Create transaction
  const transaction = new Transaction({
    feePayer,
    blockhash,
    lastValidBlockHeight,
  });

  // Add compute budget instruction (increases compute units for complex transactions)
  const computeIx = ComputeBudgetProgram.setComputeUnitLimit({
    units: 400_000, // Increase if you get "exceeded compute budget" errors
  });
  
  if (computeIx) {
    transaction.add(computeIx);
    console.log('[Solana][Transaction] ⚡ Added compute budget: 400,000 units');
  }
  
  // Add all user instructions
  for (let i = 0; i < instructions.length; i++) {
    const instruction = instructions[i];
    if (instruction) {
      transaction.add(instruction);
      console.log('[Solana][Transaction] ➕ Added instruction', i + 1, 'of', instructions.length);
    }
  }
  
  console.log('[Solana][Transaction] ✅ Transaction built successfully');
  console.log('[Solana][Transaction] 📊 Total instructions:', transaction.instructions.length);
  
  return transaction;
}

/**
 * Simulate a transaction to catch errors before sending
 * 
 * Simulation runs the transaction on the RPC node without actually
 * submitting it to the network. This helps catch errors early.
 * 
 * @param connection - Solana RPC connection
 * @param transaction - Transaction to simulate
 * @returns Simulation result with success flag and logs
 */
export async function simulateTransaction(
  connection: Connection,
  transaction: Transaction
): Promise<{ success: boolean; error?: string; logs?: string[] }> {
  console.log('[Solana][Simulation] 🧪 Simulating transaction...');
  
  try {
    const simulation = await connection.simulateTransaction(transaction);
    
    if (simulation.value.err) {
      console.error('[Solana][Simulation] ❌ Simulation failed');
      console.error('[Solana][Simulation] Error:', simulation.value.err);
      console.error('[Solana][Simulation] Logs:', simulation.value.logs);
      
      return {
        success: false,
        error: formatSimulationError(simulation.value.err),
        logs: simulation.value.logs ?? [],
      };
    }
    
    console.log('[Solana][Simulation] ✅ Simulation successful');
    console.log('[Solana][Simulation] 📜 Logs:', simulation.value.logs?.slice(0, 5), '...');
    console.log('[Solana][Simulation] 💰 Units consumed:', simulation.value.unitsConsumed);
    
    return { success: true, logs: simulation.value.logs ?? [] };
  } catch (error: any) {
    console.error('[Solana][Simulation] ❌ Simulation error:', error);
    
    return {
      success: false,
      error: error.message || 'Simulation failed',
      logs: [],
    };
  }
}

/**
 * Format simulation errors into user-friendly messages
 */
function formatSimulationError(err: any): string {
  if (!err) return 'Unknown simulation error';
  
  const errorStr = JSON.stringify(err);
  console.log('[Solana][Error] Raw simulation error:', errorStr);
  
  // Handle common error patterns
  if (errorStr.includes('InstructionError')) {
    // Try to extract the instruction index and error code
    const match = errorStr.match(/InstructionError.*?(\d+)/);
    if (match) {
      return `Transaction failed at instruction ${match[1]}. Check program logs for details.`;
    }
    return 'Transaction instruction failed. Check logs for details.';
  }
  
  return formatTransactionError(errorStr);
}

/**
 * Format transaction errors for user display
 * Mirrors EVM error formatting style
 * 
 * @param error - Error from transaction execution
 * @returns User-friendly error message
 */
export function formatTransactionError(error: any): string {
  if (!error) return 'Unknown error';
  
  const errorStr = String(error);
  console.log('[Solana][Error] 🔍 Formatting error:', errorStr.substring(0, 200));
  
  // Insufficient funds for transaction fee
  if (errorStr.includes('insufficient funds') || errorStr.includes('InsufficientFunds')) {
    return 'Insufficient SOL for transaction fees. Please add SOL to your wallet.';
  }
  
  // Account not found
  if (errorStr.includes('account not found') || errorStr.includes('AccountNotFound')) {
    return 'Account not found. The account may need to be initialized first.';
  }
  
  // Account already exists
  if (errorStr.includes('already in use') || errorStr.includes('AccountAlreadyInitialized')) {
    return 'This room ID is already in use. Please choose a different room ID.';
  }
  
  // Custom program errors (from quiz_core)
  if (errorStr.includes('custom program error: 0x')) {
    const match = errorStr.match(/custom program error: 0x([0-9a-fA-F]+)/);
    if (match && match[1]) {
      const errorCode = parseInt(match[1], 16);
      return getProgramErrorMessage(errorCode);
    }
  }
  
  // Program error codes (decimal)
  if (errorStr.includes('Program failed to complete') || errorStr.includes('ProgramFailed')) {
    return 'Transaction failed. The program encountered an error. Check the transaction logs.';
  }
  
  // Blockhash not found (transaction expired)
  if (errorStr.includes('BlockhashNotFound') || errorStr.includes('block height exceeded')) {
    return 'Transaction expired. Please try again.';
  }
  
  // Rate limit
  if (errorStr.includes('429') || errorStr.includes('rate limit')) {
    return 'RPC rate limit exceeded. Please wait a moment and try again.';
  }
  
  // Compute budget exceeded
  if (errorStr.includes('exceeded CUs meter') || errorStr.includes('compute budget')) {
    return 'Transaction too complex. Contact support if this persists.';
  }
  
  // Default: return first 150 chars of error
  return errorStr.substring(0, 150);
}

/**
 * Map program error codes to user-friendly messages
 * These should match your quiz_core Rust program's error enum
 */
function getProgramErrorMessage(code: number): string {
  console.log('[Solana][Error] 🎯 Program error code:', code);
  
  const errorMessages: Record<number, string> = {
    // Common Anchor errors (0x0 - 0x100)
    100: 'Account has already been initialized',
    101: 'Account is not initialized',
    102: 'Account is owned by a different program',
    103: 'Program execution failed',
    
    // Custom quiz_core errors (6000+)
    6000: 'Invalid room configuration',
    6001: 'Room ID too long (max 32 characters)',
    6002: 'Host fee exceeds maximum (5%)',
    6003: 'Prize pool exceeds maximum (40%)',
    6004: 'Room is full',
    6005: 'Room has not started yet',
    6006: 'Room has already ended',
    6007: 'Player has already joined this room',
    6008: 'Unauthorized: only host can perform this action',
    6009: 'Token not approved for use',
    6010: 'Invalid winner address',
    6011: 'Prizes have already been distributed',
    6012: 'Room vault is not empty',
    
    // Add more as you discover them from your Rust program
  };
  
  const message = errorMessages[code];
  if (message) {
    console.log('[Solana][Error] ✅ Mapped to:', message);
    return message;
  }
  
  console.log('[Solana][Error] ⚠️  Unknown error code, using generic message');
  return `Program error: ${code}. Please check transaction logs for details.`;
}

/**
 * Get Solana explorer URL for a transaction
 * 
 * @param signature - Transaction signature
 * @param cluster - Network cluster
 * @returns Explorer URL
 */
export function getExplorerTxUrl(
  signature: string, 
  cluster: 'devnet' | 'testnet' | 'mainnet' = 'devnet'
): string {
  if (!signature) {
    console.warn('[Solana][Explorer] ⚠️  Empty signature provided');
    return cluster === 'mainnet' 
      ? 'https://explorer.solana.com' 
      : `https://explorer.solana.com?cluster=${cluster}`;
  }
  
  if (cluster === 'mainnet') {
    return `https://explorer.solana.com/tx/${signature}`;
  }
  return `https://explorer.solana.com/tx/${signature}?cluster=${cluster}`;
}

/**
 * Get Solana explorer URL for an address
 * 
 * @param address - Public key address
 * @param cluster - Network cluster
 * @returns Explorer URL
 */
export function getExplorerAddressUrl(
  address: string,
  cluster: 'devnet' | 'testnet' | 'mainnet' = 'devnet'
): string {
  if (cluster === 'mainnet') {
    return `https://explorer.solana.com/address/${address}`;
  }
  return `https://explorer.solana.com/address/${address}?cluster=${cluster}`;
}

/**
 * Wait for transaction confirmation with timeout
 * 
 * @param connection - Solana connection
 * @param signature - Transaction signature to wait for
 * @param timeout - Timeout in milliseconds (default 60s)
 * @returns True if confirmed, false if timeout
 */
export async function waitForConfirmation(
  connection: Connection,
  signature: string,
  timeout: number = 60_000
): Promise<boolean> {
  console.log('[Solana][Confirmation] ⏳ Waiting for transaction:', signature);
  
  const start = Date.now();
  
  while (Date.now() - start < timeout) {
    const status = await connection.getSignatureStatus(signature);
    
    if (status?.value?.confirmationStatus === 'confirmed' || 
        status?.value?.confirmationStatus === 'finalized') {
      console.log('[Solana][Confirmation] ✅ Transaction confirmed');
      return true;
    }
    
    if (status?.value?.err) {
      console.error('[Solana][Confirmation] ❌ Transaction failed:', status.value.err);
      return false;
    }
    
    // Wait 1 second before checking again
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.warn('[Solana][Confirmation] ⏰ Timeout waiting for confirmation');
  return false;
}