/**
 * Solana Pool Room Creation Hook
 *
 * Creates pool-based fundraising rooms where winners receive prizes from
 * a pool of collected entry fees. Mirrors useEvmDeploy structure.
 *
 * ## Prerequisites
 *
 * Before using this hook, ensure:
 * - GlobalConfig is initialized (via CLI: `anchor run initialize-global-config`)
 * - TokenRegistry is initialized (via CLI: `anchor run initialize-token-registry`)
 * - All 11 fee tokens are approved in TokenRegistry
 *
 * ## Usage
 *
 * ```typescript
 * const { createPoolRoom } = useSolanaCreatePoolRoom();
 *
 * const result = await createPoolRoom({
 *   roomId: 'quiz-night-2024',
 *   currency: 'USDG',
 *   entryFee: 5.0,
 *   maxPlayers: 100,
 *   hostFeePct: 2,
 *   prizePoolPct: 30,
 *   charityName: 'Red Cross',
 *   prizeSplits: { first: 60, second: 30, third: 10 },
 * });
 * ```
 */

import { useCallback } from 'react';
import { PublicKey, SystemProgram, SYSVAR_RENT_PUBKEY } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { BN } from '@coral-xyz/anchor';

import { useSolanaShared } from './useSolanaShared';
import { SOLANA_CONTRACT, calculateFeeBps } from '../config/contracts';

// ✅ UPDATED: use new multi-token config — replaces getTokenConfig + amountToLamports from tokens.ts
import {
  SOLANA_TOKENS,
  toRawAmount,
  type SolanaTokenCode,
} from '../config/solanaTokenConfig';

import {
  deriveGlobalConfigPDA,
  deriveRoomPDA,
  deriveRoomVaultPDA,
  deriveTokenRegistryPDA,
} from '../utils/pda';
import {
  buildTransaction,
  simulateTransaction,
  formatTransactionError,
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
        roomId: params.roomId,
        currency: params.currency,
        entryFee: params.entryFee,
        maxPlayers: params.maxPlayers,
        hostFeePct: params.hostFeePct,
        prizePoolPct: params.prizePoolPct,
        charityName: params.charityName,
        prizeSplits: params.prizeSplits,
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

      // ✅ UPDATED: look up token from new config — supports all 11 tokens
      const tokenCode = params.currency as SolanaTokenCode;
      const tokenConfig = SOLANA_TOKENS[tokenCode];

      if (!tokenConfig) {
        throw new Error(`Unsupported token: ${params.currency}. Check solanaTokenConfig.ts for supported tokens.`);
      }

      // SOL uses wSOL mint for SPL token transfers
      const WSOL_MINT = 'So11111111111111111111111111111111111111112';
      const mintAddress = tokenConfig.isNative ? WSOL_MINT : tokenConfig.mint;

      if (!mintAddress) {
        throw new Error(`No mint address for token: ${tokenCode}`);
      }

      const feeTokenMint = new PublicKey(mintAddress);

      console.log('[Solana][CreatePoolRoom] Token:', {
        code: tokenConfig.code,
        name: tokenConfig.name,
        mint: feeTokenMint.toBase58(),
        decimals: tokenConfig.decimals,
        isNative: tokenConfig.isNative,
      });

      // ============================================================================
      // Step 4: Convert Entry Fee to Raw Units
      // ============================================================================

      console.log('[Solana][CreatePoolRoom] 🔢 Converting entry fee to raw units...');

      // ✅ UPDATED: use toRawAmount — no float math, handles all decimals correctly
      // e.g. 5 USDG → 5_000_000, 0.01 SOL → 10_000_000, 10000 BONK → 1_000_000_000
      const entryFeeRaw = toRawAmount(params.entryFee, tokenCode);

      console.log('[Solana][CreatePoolRoom] Entry fee:', {
        display: `${params.entryFee} ${tokenCode}`,
        raw: entryFeeRaw.toString(),
        decimals: tokenConfig.decimals,
      });

      // ============================================================================
      // Step 5: Calculate Fee Structure (BPS)
      // ============================================================================

      console.log('[Solana][CreatePoolRoom] 📊 Calculating fee structure...');

      const hostFeeBps = Math.floor(params.hostFeePct * 100);
      const prizePoolBps = Math.floor(params.prizePoolPct * 100);

      const feeBreakdown = calculateFeeBps(hostFeeBps, prizePoolBps);

      console.log('[Solana][CreatePoolRoom] Fee breakdown (BPS):', {
        platform: `${feeBreakdown.platform} BPS (${feeBreakdown.platform / 100}%)`,
        host: `${feeBreakdown.host} BPS (${feeBreakdown.host / 100}%)`,
        prizePool: `${feeBreakdown.prizePool} BPS (${feeBreakdown.prizePool / 100}%)`,
        charity: `${feeBreakdown.charity} BPS (${feeBreakdown.charity / 100}%)`,
        total: `${feeBreakdown.total} BPS (100%)`,
      });

      // ============================================================================
      // Step 6: Prize Splits
      // ============================================================================

      console.log('[Solana][CreatePoolRoom] 🏆 Configuring prize splits...');

      const firstPlacePct = params.prizeSplits?.first ?? SOLANA_CONTRACT.POOL_ROOM.DEFAULT_PRIZE_SPLITS.first;
      const secondPlacePct = params.prizeSplits?.second ?? SOLANA_CONTRACT.POOL_ROOM.DEFAULT_PRIZE_SPLITS.second;
      const thirdPlacePct = params.prizeSplits?.third ?? SOLANA_CONTRACT.POOL_ROOM.DEFAULT_PRIZE_SPLITS.third;

      console.log('[Solana][CreatePoolRoom] Prize splits:', {
        first: `${firstPlacePct}%`,
        second: `${secondPlacePct}%`,
        third: `${thirdPlacePct}%`,
        total: `${firstPlacePct + secondPlacePct + thirdPlacePct}%`,
      });

      // ============================================================================
      // Step 7: Derive PDAs
      // ============================================================================

      console.log('[Solana][CreatePoolRoom] 🔑 Deriving PDAs...');

      const [globalConfig] = deriveGlobalConfigPDA();
      const [tokenRegistry] = deriveTokenRegistryPDA();
      const [room] = deriveRoomPDA(publicKey, params.roomId);
      const [roomVault] = deriveRoomVaultPDA(room);

      console.log('[Solana][CreatePoolRoom] PDAs:', {
        globalConfig: globalConfig.toBase58(),
        tokenRegistry: tokenRegistry.toBase58(),
        room: room.toBase58(),
        roomVault: roomVault.toBase58(),
      });

      // ============================================================================
      // Step 8: Check Wallet Balance (SOL for rent + fees)
      // ============================================================================

      console.log('[Solana][CreatePoolRoom] 💰 Checking wallet balance...');

      const balance = await connection.getBalance(publicKey);
      const balanceSOL = balance / 1e9;

      console.log('[Solana][CreatePoolRoom] Wallet balance:', {
        lamports: balance,
        SOL: balanceSOL.toFixed(4),
      });

      const estimatedRent = 0.005; // ~0.005 SOL for room + vault
      const estimatedFees = 0.001; // ~0.001 SOL for tx fees

      if (balanceSOL < estimatedRent + estimatedFees) {
        throw new Error(
          `Insufficient SOL for room creation. Required: ~${(estimatedRent + estimatedFees).toFixed(4)} SOL, ` +
          `Current balance: ${balanceSOL.toFixed(4)} SOL`
        );
      }

      console.log('[Solana][CreatePoolRoom] ✅ Sufficient balance for rent + fees');

      // ============================================================================
      // Step 9: Build Instruction
      // ============================================================================

      console.log('[Solana][CreatePoolRoom] 🔨 Building init_pool_room instruction...');

      const charityMemo = params.charityName?.substring(0, SOLANA_CONTRACT.MAX_CHARITY_MEMO) || 'Quiz charity';

      console.log('[Solana][CreatePoolRoom] Instruction parameters:', {
        roomId: params.roomId,
        entryFee: entryFeeRaw.toString(),
        maxPlayers: params.maxPlayers,
        hostFeeBps,
        prizePoolBps,
        firstPlacePct,
        secondPlacePct: secondPlacePct || null,
        thirdPlacePct: thirdPlacePct || null,
        charityMemo,
        expirationSlots: null,
      });

      let instruction;
      try {
        if (!program?.methods) throw new Error('Program methods not available');

        instruction = await (program.methods as any)
          .initPoolRoom(
            params.roomId,
            new BN(entryFeeRaw.toString()),  // ✅ BigInt → BN
            params.maxPlayers,
            hostFeeBps,
            prizePoolBps,
            firstPlacePct,
            secondPlacePct || null,
            thirdPlacePct || null,
            charityMemo,
            null // expirationSlots
          )
          .accounts({
            room,
            roomVault,
            feeTokenMint,
            tokenRegistry,
            globalConfig,
            host: publicKey,
            systemProgram: SystemProgram.programId,
            tokenProgram: TOKEN_PROGRAM_ID,
            rent: SYSVAR_RENT_PUBKEY,
          })
          .instruction();

        console.log('[Solana][CreatePoolRoom] ✅ Instruction built successfully');
      } catch (error: any) {
        console.error('[Solana][CreatePoolRoom] ❌ Failed to build instruction:', error);
        throw new Error(`Failed to build transaction: ${error.message}`);
      }

      // ============================================================================
      // Step 10: Build Transaction
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
      // Step 11: Simulate Transaction
      // ============================================================================

      console.log('[Solana] Connection RPC:', (connection as any)._rpcEndpoint);
console.log('[Solana] Connection RPC:', connection.rpcEndpoint);

      console.log('[Solana][CreatePoolRoom] 🧪 Simulating transaction...');

      const simResult = await simulateTransaction(connection, transaction);

      if (!simResult.success) {
        console.error('[Solana][CreatePoolRoom] ❌ Simulation failed');
        console.error('[Solana][CreatePoolRoom] Error:', simResult.error);
        console.error('[Solana][CreatePoolRoom] Logs:', simResult.logs);
        throw new Error(`Transaction simulation failed: ${formatTransactionError(simResult.error)}`);
      }

      console.log('[Solana][CreatePoolRoom] ✅ Simulation successful');

      // ============================================================================
      // Step 12: Send and Confirm Transaction
      // ============================================================================

      console.log('[Solana][CreatePoolRoom] 📤 Sending transaction...');

      let signature: string;
      try {
        signature = await provider.sendAndConfirm(transaction, [], {
          skipPreflight: false,
          commitment: 'confirmed',
        });

        console.log('[Solana][CreatePoolRoom] ✅ Transaction confirmed');
        console.log('[Solana][CreatePoolRoom] 📝 Signature:', signature);
      } catch (error: any) {
        console.error('[Solana][CreatePoolRoom] ❌ Transaction failed:', error);

        // Check if room was actually created despite error
        try {
          const roomAccount = await (program.account as any).room.fetch(room);
          if (roomAccount) {
            console.log('[Solana][CreatePoolRoom] ⚠️ Room exists despite error — may have succeeded');
            const sig = error.signature || error.transactionSignature || 'unknown';
            return {
              success: true,
              contractAddress: room.toBase58(),
              txHash: sig,
              explorerUrl: getTxExplorerUrl(sig),
            };
          }
        } catch {
          // Room doesn't exist, transaction truly failed
        }

        throw new Error(`Transaction failed: ${formatTransactionError(error)}`);
      }

      // ============================================================================
      // Step 13: Return Result
      // ============================================================================

      const explorerUrl = getTxExplorerUrl(signature);

      console.log('[Solana][CreatePoolRoom] ✅ Pool room created successfully!');
      console.log('[Solana][CreatePoolRoom] 📍 Room address:', room.toBase58());
      console.log('[Solana][CreatePoolRoom] 📍 Room vault:', roomVault.toBase58());
      console.log('[Solana][CreatePoolRoom] 💰 Entry fee:', `${params.entryFee} ${tokenCode}`);
      console.log('[Solana][CreatePoolRoom] 👥 Max players:', params.maxPlayers);
      console.log('[Solana][CreatePoolRoom] 🎯 Prize pool:', `${params.prizePoolPct}%`);
      console.log('[Solana][CreatePoolRoom] 💝 Charity:', `${feeBreakdown.charity / 100}%`);

      return {
        success: true,
        contractAddress: room.toBase58(),
        txHash: signature,
        explorerUrl,
      };
    },
    [publicKey, connection, provider, program, isConnected, cluster, getTxExplorerUrl]
  );

  return { createPoolRoom };
}