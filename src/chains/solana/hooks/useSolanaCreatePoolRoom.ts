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
 * - Fee tokens are approved (USDC, PYUSD via CLI)
 * 
 * ## Usage
 * 
 * ```typescript
 * const { createPoolRoom } = useSolanaCreatePoolRoom();
 * 
 * const result = await createPoolRoom({
 *   roomId: 'quiz-night-2024',
 *   currency: 'USDC',
 *   entryFee: 5.0,
 *   maxPlayers: 100,
 *   hostFeePct: 2,
 *   prizePoolPct: 30,
 *   charityName: 'Red Cross', // Optional display name
 *   prizeSplits: { first: 60, second: 30, third: 10 },
 * });
 * ```
 */

import { useCallback } from 'react';
import { SystemProgram, SYSVAR_RENT_PUBKEY } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { BN } from '@coral-xyz/anchor';

import { useSolanaShared } from './useSolanaShared';
import { SOLANA_CONTRACT, calculateFeeBps } from '../config/contracts';
import { getTokenConfig, amountToLamports } from '../config/tokens';
import { 
  deriveGlobalConfigPDA, 
  deriveRoomPDA, 
  deriveRoomVaultPDA,
  deriveTokenRegistryPDA 
} from '../utils/pda';
import { 
  buildTransaction, 
  simulateTransaction, 
  formatTransactionError 
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
      
      const tokenConfig = getTokenConfig(params.currency, cluster);
      const feeTokenMint = tokenConfig.mint;
      
      console.log('[Solana][CreatePoolRoom] Token:', {
        symbol: tokenConfig.symbol,
        name: tokenConfig.name,
        mint: feeTokenMint.toBase58(),
        decimals: tokenConfig.decimals,
      });

      // ============================================================================
      // Step 4: Convert Amounts to Lamports
      // ============================================================================
      
      console.log('[Solana][CreatePoolRoom] 🔢 Converting amounts to lamports...');
      
      const entryFeeLamports = amountToLamports(params.entryFee, params.currency);
      
      console.log('[Solana][CreatePoolRoom] Entry fee:', {
        human: `${params.entryFee} ${params.currency}`,
        lamports: entryFeeLamports.toString(),
      });

      // ============================================================================
      // Step 5: Calculate Fee Structure (BPS)
      // ============================================================================
      
      console.log('[Solana][CreatePoolRoom] 📊 Calculating fee structure...');
      
      // Convert percentages to basis points (1% = 100 BPS)
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
      // Step 8: Check Wallet Balance
      // ============================================================================
      
      console.log('[Solana][CreatePoolRoom] 💰 Checking wallet balance...');
      
      const balance = await connection.getBalance(publicKey);
      const balanceSOL = balance / 1e9;
      
      console.log('[Solana][CreatePoolRoom] Wallet balance:', {
        lamports: balance,
        SOL: balanceSOL.toFixed(4),
      });
      
      // Estimate rent for room + vault (rough estimate)
      const estimatedRent = 0.005; // ~0.005 SOL for room + vault
      const estimatedFees = 0.001; // ~0.001 SOL for transaction fees
      const totalRequired = estimatedRent + estimatedFees;
      
      if (balanceSOL < totalRequired) {
        console.error('[Solana][CreatePoolRoom] ❌ Insufficient SOL');
        throw new Error(
          `Insufficient SOL for room creation. Required: ${totalRequired.toFixed(4)} SOL, ` +
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
        entryFee: entryFeeLamports.toString(),
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
        if (!program || !program.methods) {
          throw new Error('Program methods not available');
        }
        
        // Cast to any to access dynamic method names
        const programMethods = program.methods as any;
        
        instruction = await programMethods
          .initPoolRoom(
            params.roomId,
            new BN(entryFeeLamports.toString()),
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
      
      console.log('[Solana][CreatePoolRoom] 🧪 Simulating transaction...');
      
      const simResult = await simulateTransaction(connection, transaction);
      
      if (!simResult.success) {
        console.error('[Solana][CreatePoolRoom] ❌ Simulation failed');
        console.error('[Solana][CreatePoolRoom] Error:', simResult.error);
        console.error('[Solana][CreatePoolRoom] Logs:', simResult.logs);
        
        const errorMsg = formatTransactionError(simResult.error);
        throw new Error(`Transaction simulation failed: ${errorMsg}`);
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
          if (!program.account) {
            throw new Error('Program account namespace not available');
          }
          
          const roomAccount = await (program.account as any).room.fetch(room);
          if (roomAccount) {
            console.log('[Solana][CreatePoolRoom] ⚠️  Room exists despite error - may have succeeded');
            
            // Try to get signature from error
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
        
        const errorMsg = formatTransactionError(error);
        throw new Error(`Transaction failed: ${errorMsg}`);
      }

      // ============================================================================
      // Step 13: Get Explorer URL
      // ============================================================================
      
      const explorerUrl = getTxExplorerUrl(signature);
      
      console.log('[Solana][CreatePoolRoom] 🔗 Explorer URL:', explorerUrl);

      // ============================================================================
      // Step 14: Success!
      // ============================================================================
      
      console.log('[Solana][CreatePoolRoom] ✅ Pool room created successfully!');
      console.log('[Solana][CreatePoolRoom] 📍 Room address:', room.toBase58());
      console.log('[Solana][CreatePoolRoom] 📍 Room vault:', roomVault.toBase58());
      console.log('[Solana][CreatePoolRoom] 💰 Entry fee:', `${params.entryFee} ${params.currency}`);
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