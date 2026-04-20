/**
 * Solana Pool Room Creation Hook
 *
 * ## What changed (new contract)
 *
 * - init_pool_room now takes ONLY 2 args:  roomId, entryFee
 *   All fee splits (platform 15%, host 25%, charity 30%, prizes 18%/12%)
 *   are fixed on-chain — no hostFeePct / prizePoolPct / prizeSplits params.
 * - No GlobalConfig PDA — removed from accounts
 * - No TokenRegistry PDA — removed from accounts
 * - Program ID updated to AMuhGgHziizhHzC4xETZUjyXBeVCjhbknMcXU5HPxocv
 *
 * ## Usage
 *
 * ```typescript
 * const { createPoolRoom } = useSolanaCreatePoolRoom();
 *
 * const result = await createPoolRoom({
 *   roomId:     'quiz-night-2024',
 *   currency:   'USDG',
 *   entryFee:   5.0,
 *   maxPlayers: 100,
 * });
 * ```
 */

import { useCallback } from 'react';
import { PublicKey, SystemProgram, SYSVAR_RENT_PUBKEY } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { BN } from '@coral-xyz/anchor';

import { useSolanaShared } from './useSolanaShared';

import {
  SOLANA_TOKENS,
  toRawAmount,
  type SolanaTokenCode,
} from '../config/solanaTokenConfig';

import {
  deriveRoomPDA,
  deriveRoomVaultPDA,
} from '../utils/pda';
import {
  buildTransaction,
  simulateTransaction,
  formatTransactionError,
  waitForConfirmation
} from '../utils/transaction-helpers';
import { validatePoolRoomParams } from '../utils/validation';
import type { CreatePoolRoomParams, CreatePoolRoomResult } from '../utils/types';
import type { QuizConfig } from '@/components/Quiz/types/quiz';

export interface UseSolanaCreatePoolRoomParams {
  setupConfig?: QuizConfig | null;
}

export function useSolanaCreatePoolRoom(params?: UseSolanaCreatePoolRoomParams) {
  const { setupConfig } = params || {};
  const {
    publicKey,
    connection,
    provider,
    program,
    isConnected,
    cluster,
    getTxExplorerUrl,
  } = useSolanaShared({ setupConfig });

  const createPoolRoom = useCallback(
    async (params: CreatePoolRoomParams): Promise<CreatePoolRoomResult> => {
      console.log('[Solana][CreatePoolRoom] 🚀 Starting pool room creation...');
      console.log('[Solana][CreatePoolRoom] 📋 Parameters:', {
        roomId:     params.roomId,
        currency:   params.currency,
        entryFee:   params.entryFee,
        maxPlayers: params.maxPlayers,
      });

      // ============================================================================
      // Step 1: Connection & Wallet Validation
      // ============================================================================

      if (!isConnected || !publicKey || !program || !provider || !connection) {
        console.error('[Solana][CreatePoolRoom] ❌ Wallet not connected');
        throw new Error('Wallet not connected. Please connect your Solana wallet.');
      }

      console.log('[Solana][CreatePoolRoom] ✅ Wallet connected:', publicKey.toBase58());
      console.log('[Solana][CreatePoolRoom] 🌐 Cluster:', cluster);

      // ============================================================================
      // Step 2: Input Validation
      // ============================================================================

      console.log('[Solana][CreatePoolRoom] 🔍 Validating parameters...');

      const validation = validatePoolRoomParams(params);
      if (!validation.success) {
        console.error('[Solana][CreatePoolRoom] ❌ Validation failed:', validation.errors);
        throw new Error(validation.errors.join('. '));
      }

      console.log('[Solana][CreatePoolRoom] ✅ All validations passed');

      // ============================================================================
      // Step 3: Token Configuration
      // ============================================================================

      console.log('[Solana][CreatePoolRoom] 💰 Getting token configuration...');

      const tokenCode = params.currency as SolanaTokenCode;
      const tokenConfig = SOLANA_TOKENS[tokenCode];

      if (!tokenConfig) {
        throw new Error(
          `Unsupported token: ${params.currency}. Check solanaTokenConfig.ts for supported tokens.`
        );
      }

      const WSOL_MINT = 'So11111111111111111111111111111111111111112';
      const mintAddress = tokenConfig.isNative ? WSOL_MINT : tokenConfig.mint;

      if (!mintAddress) {
        throw new Error(`No mint address for token: ${tokenCode}`);
      }

      const feeTokenMint = new PublicKey(mintAddress);

      console.log('[Solana][CreatePoolRoom] Token:', {
        code:     tokenConfig.code,
        name:     tokenConfig.name,
        mint:     feeTokenMint.toBase58(),
        decimals: tokenConfig.decimals,
        isNative: tokenConfig.isNative,
      });

      // ============================================================================
      // Step 4: Convert Entry Fee to Raw Units
      // ============================================================================

      console.log('[Solana][CreatePoolRoom] 🔢 Converting entry fee to raw units...');

      const entryFeeRaw = toRawAmount(params.entryFee, tokenCode);

      console.log('[Solana][CreatePoolRoom] Entry fee:', {
        display:  `${params.entryFee} ${tokenCode}`,
        raw:      entryFeeRaw.toString(),
        decimals: tokenConfig.decimals,
      });

      // ============================================================================
      // Step 5: Derive PDAs
      //
      // NOTE: GlobalConfig and TokenRegistry PDAs are GONE in the new contract.
      // We only need the room and its vault.
      // ============================================================================
      // Step 5: Derive PDAs explicitly
      // ============================================================================

      console.log('[Solana][CreatePoolRoom] 🔑 Deriving PDAs...');

      const [room]      = deriveRoomPDA(publicKey, params.roomId);
      const [roomVault] = deriveRoomVaultPDA(room);

      console.log('[Solana][CreatePoolRoom] PDAs:', {
        room:      room.toBase58(),
        roomVault: roomVault.toBase58(),
      });

      // ============================================================================
      // Step 6: Check Wallet Balance (SOL for rent + fees)
      // ============================================================================

      console.log('[Solana][CreatePoolRoom] 💰 Checking wallet balance...');

      const balance    = await connection.getBalance(publicKey);
      const balanceSOL = balance / 1e9;

      console.log('[Solana][CreatePoolRoom] Wallet balance:', {
        lamports: balance,
        SOL:      balanceSOL.toFixed(4),
      });

      const estimatedRent = 0.005; // ~0.005 SOL for room + vault
      const estimatedFees = 0.001; // ~0.001 SOL for tx fees

      if (balanceSOL < estimatedRent + estimatedFees) {
        throw new Error(
          `Insufficient SOL for room creation. ` +
          `Required: ~${(estimatedRent + estimatedFees).toFixed(4)} SOL, ` +
          `Current balance: ${balanceSOL.toFixed(4)} SOL`
        );
      }

      console.log('[Solana][CreatePoolRoom] ✅ Sufficient balance for rent + fees');

      // ============================================================================
      // Step 7: Build Instruction
      //
      // NEW: only 2 args — roomId and entryFee.
      // hostFeeBps, prizePoolBps, prizeSplits, charityMemo, expirationSlots are GONE.
      // GlobalConfig, TokenRegistry, and rent accounts are GONE from accounts.
      // ============================================================================

      console.log('[Solana][CreatePoolRoom] 🔨 Building init_pool_room instruction...');
      console.log('[Solana][CreatePoolRoom] Instruction parameters:', {
        roomId:   params.roomId,
        entryFee: entryFeeRaw.toString(),
      });

      let instruction;
      try {
        if (!program?.methods) throw new Error('Program methods not available');

        // Pass every account explicitly so Anchor's resolver never runs.
        // Auto-derivation is unreliable across Anchor client versions when
        // PDA seeds include method args (like room_id).
        instruction = await (program.methods as any)
          .initPoolRoom(
            params.roomId,
            new BN(entryFeeRaw.toString()),
          )
          .accountsStrict({
            room:          room,
            roomVault:     roomVault,
            feeTokenMint:  feeTokenMint,
            host:          publicKey,
            systemProgram: SystemProgram.programId,
            tokenProgram:  TOKEN_PROGRAM_ID,
            rent:          SYSVAR_RENT_PUBKEY,
          })
          .instruction();

        console.log('[Solana][CreatePoolRoom] ✅ Instruction built successfully');
      } catch (error: any) {
        console.error('[Solana][CreatePoolRoom] ❌ Failed to build instruction:', error);
        throw new Error(`Failed to build transaction: ${error.message}`);
      }

      // ============================================================================
      // Step 8: Build Transaction
      // ============================================================================

      console.log('[Solana][CreatePoolRoom] 📦 Building transaction...');

      let transaction;
      try {
        transaction = await buildTransaction(connection, [instruction], publicKey);
        console.log('[Solana][CreatePoolRoom] ✅ Transaction built');
      } catch (error: any) {
        console.error('[Solana][CreatePoolRoom] ❌ Failed to build transaction:', error);
        throw new Error(`Failed to build transaction: ${error.message}`);
      }

      // ============================================================================
      // Step 9: Simulate Transaction
      // ============================================================================

      console.log('[Solana][CreatePoolRoom] 🧪 Simulating transaction...');
      console.log('[Solana] Connection RPC:', connection.rpcEndpoint);

      const simResult = await simulateTransaction(connection, transaction);

      if (!simResult.success) {
        console.error('[Solana][CreatePoolRoom] ❌ Simulation failed');
        console.error('[Solana][CreatePoolRoom] Error:', simResult.error);
        console.error('[Solana][CreatePoolRoom] Logs:', simResult.logs);
        throw new Error(
          `Transaction simulation failed: ${formatTransactionError(simResult.error)}`
        );
      }

      console.log('[Solana][CreatePoolRoom] ✅ Simulation successful');

      // ============================================================================
      // Step 10: Send and Confirm Transaction
      // ============================================================================

      console.log('[Solana][CreatePoolRoom] 📤 Sending transaction...');

let signature: string | undefined;

try {
  const signedTx = await provider.wallet.signTransaction(transaction);

  signature = await connection.sendRawTransaction(
    signedTx.serialize(),
    {
      skipPreflight: false,
      preflightCommitment: 'confirmed',
    }
  );

  console.log('[Solana][CreatePoolRoom] 📝 Signature:', signature);

  const confirmed = await waitForConfirmation(connection, signature, 60_000);

  if (!confirmed) {
    throw new Error('Transaction was sent but not confirmed in time');
  }

  console.log('[Solana][CreatePoolRoom] ✅ Transaction confirmed');

} catch (error: any) {
  console.error('[Solana][CreatePoolRoom] ❌ Transaction failed:', error);

  try {
    const roomAccount = await (program.account as any).room.fetch(room);

    if (roomAccount) {
      const sig =
        error.signature ||
        error.transactionSignature ||
        signature ||
        'unknown';

      return {
        success: true,
        contractAddress: room.toBase58(),
        txHash: sig,
        explorerUrl: getTxExplorerUrl(sig),
      };
    }
  } catch {
    // ignore
  }

  throw new Error(`Transaction failed: ${formatTransactionError(error)}`);
}

      // ============================================================================
      // Step 11: Return Result
      // ============================================================================

      const explorerUrl = getTxExplorerUrl(signature);

      console.log('[Solana][CreatePoolRoom] ✅ Pool room created successfully!');
      console.log('[Solana][CreatePoolRoom] 📍 Room address:', room.toBase58());
      console.log('[Solana][CreatePoolRoom] 💰 Entry fee:', `${params.entryFee} ${tokenCode}`);

      return {
        success:         true,
        contractAddress: room.toBase58(),
        txHash:          signature,
        explorerUrl,
      };
    },
    [publicKey, connection, provider, program, isConnected, cluster, getTxExplorerUrl]
  );

  return { createPoolRoom };
}