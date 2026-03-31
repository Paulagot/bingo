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
 */
export async function buildTransaction(
  connection: Connection,
  instructions: TransactionInstruction[],
  feePayer: PublicKey
): Promise<Transaction> {
  console.log('[Solana][Transaction] 🔨 Building transaction with', instructions.length, 'instructions');
  console.log('[Solana][Transaction] Fee payer:', feePayer.toBase58());
  
  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');
  
  console.log('[Solana][Transaction] 📍 Blockhash:', blockhash.substring(0, 8) + '...');
  console.log('[Solana][Transaction] 📍 Last valid block height:', lastValidBlockHeight);
  
  const transaction = new Transaction({
    feePayer,
    blockhash,
    lastValidBlockHeight,
  });

  const computeIx = ComputeBudgetProgram.setComputeUnitLimit({
    units: 400_000,
  });
  
  if (computeIx) {
    transaction.add(computeIx);
    console.log('[Solana][Transaction] ⚡ Added compute budget: 400,000 units');
  }
  
  for (let i = 0; i < instructions.length; i++) {
    const instruction = instructions[i];
    if (instruction) {
      transaction.add(instruction);
      console.log('[Solana][Transaction] ➕ Added instruction', i + 1, 'of', instructions.length);
    }
  }
  
  console.log('[Solana][Transaction] ✅ Transaction built successfully');
  console.log('[Solana][Transaction] 📊 Total instructions:', transaction.instructions.length);

  // Log transaction size — max is 1232 bytes
  try {
    const serialized = transaction.serialize({ requireAllSignatures: false });
    console.log(
      '[Solana][Transaction] 📦 Transaction size:',
      serialized.length, '/ 1232 bytes',
      serialized.length > 1000 ? '⚠️ Getting large!' : '✅'
    );
  } catch {
    // Can fail before signing — not critical
  }
  
  return transaction;
}

/**
 * Simulate a transaction to catch errors before sending
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
      // Pretty-print the error object so it's readable without expanding
      console.error('[Solana][Simulation] Error:', JSON.stringify(simulation.value.err, null, 2));
      // Print every log line individually so they're visible without expanding the array
      console.error('[Solana][Simulation] Logs:');
      (simulation.value.logs ?? []).forEach((log, i) =>
        console.error(`  [${i}] ${log}`)
      );
      
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
    console.error('[Solana][Simulation] ❌ Simulation threw:', error);
    
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
  
  if (errorStr.includes('InstructionError')) {
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
 */
export function formatTransactionError(error: any): string {
  if (!error) return 'Unknown error';
  
  const errorStr = String(error);
  console.log('[Solana][Error] 🔍 Formatting error:', errorStr.substring(0, 200));
  
  if (errorStr.includes('insufficient funds') || errorStr.includes('InsufficientFunds')) {
    return 'Insufficient SOL for transaction fees. Please add SOL to your wallet.';
  }
  if (errorStr.includes('account not found') || errorStr.includes('AccountNotFound')) {
    return 'Account not found. The account may need to be initialized first.';
  }
  if (errorStr.includes('already in use') || errorStr.includes('AccountAlreadyInitialized')) {
    return 'This room ID is already in use. Please choose a different room ID.';
  }
  if (errorStr.includes('custom program error: 0x')) {
    const match = errorStr.match(/custom program error: 0x([0-9a-fA-F]+)/);
    if (match && match[1]) {
      return getProgramErrorMessage(parseInt(match[1], 16));
    }
  }
  if (errorStr.includes('Program failed to complete') || errorStr.includes('ProgramFailed')) {
    return 'Transaction failed. The program encountered an error. Check the transaction logs.';
  }
  if (errorStr.includes('BlockhashNotFound') || errorStr.includes('block height exceeded')) {
    return 'Transaction expired. Please try again.';
  }
  if (errorStr.includes('429') || errorStr.includes('rate limit')) {
    return 'RPC rate limit exceeded. Please wait a moment and try again.';
  }
  if (errorStr.includes('exceeded CUs meter') || errorStr.includes('compute budget')) {
    return 'Transaction too complex. Contact support if this persists.';
  }
  if (errorStr.includes('ExternalAccountLamportSpend')) {
    return 'Program attempted to spend lamports from an account it does not own.';
  }
  if (errorStr.includes('UnbalancedInstruction')) {
    return 'Transaction lamport balances do not balance. Check program logic.';
  }
  
  return errorStr.substring(0, 150);
}

/**
 * Map program error codes to user-friendly messages
 */
function getProgramErrorMessage(code: number): string {
  console.log('[Solana][Error] 🎯 Program error code:', code);
 
  const errorMessages: Record<number, string> = {
    6000: 'Unauthorized — only the host or admin can perform this action',
    6001: 'Room has already ended',
    6002: 'Room has already been refunded',
    6003: 'Invalid room status for this operation',
    6004: 'Room is full',
    6005: 'Room is no longer accepting new players (joining closed)',
    6006: 'Not enough players — at least 2 players required to end the room',
    6007: 'You have already joined this room',
    6008: 'The host cannot be a winner',
    6009: 'Duplicate winner in the winners list',
    6010: 'Exactly 2 winners required (1st and 2nd place)',
    6011: 'Winner did not join this room',
    6012: "Winner's token account owner does not match the declared winner",
    6013: 'Token account mint does not match the room fee token',
    6014: 'Invalid room ID — must be 1–32 characters',
    6015: 'Invalid entry fee',
    6016: 'Invalid max players — must be between 1 and 1000',
    6017: 'Invalid charity memo — max 28 characters',
    6018: 'Vault account must be uninitialised before room creation',
    6019: 'Refund account list length does not match player count',
    6020: 'Arithmetic overflow',
    6021: 'Arithmetic underflow',
  };
 
  const message = errorMessages[code];
  if (message) {
    console.log('[Solana][Error] ✅ Mapped to:', message);
    return message;
  }
 
  return `Program error ${code} — check transaction logs for details`;
}

/**
 * Get Solana explorer URL for a transaction
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
    
    if (
      status?.value?.confirmationStatus === 'confirmed' || 
      status?.value?.confirmationStatus === 'finalized'
    ) {
      console.log('[Solana][Confirmation] ✅ Transaction confirmed');
      return true;
    }
    
    if (status?.value?.err) {
      console.error('[Solana][Confirmation] ❌ Transaction failed:', status.value.err);
      return false;
    }
    
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.warn('[Solana][Confirmation] ⏰ Timeout waiting for confirmation');
  return false;
}