/**
 * Solana Asset Room Creation Hook
 * 
 * Creates asset-based fundraising rooms where prizes are pre-deposited SPL tokens
 * rather than percentages of the entry fee pool. Mirrors useEvmDeploy asset room structure.
 * 
 * ## Flow:
 * 1. Create room (init_asset_room) - Room status: AwaitingFunding
 * 2. Add prizes (add_prize_asset) - One transaction per prize
 * 3. Once all prizes deposited - Room status: Ready
 * 4. Players can join
 * 
 * ## Usage
 * 
 * ```typescript
 * const { createAssetRoom } = useSolanaCreateAssetRoom();
 * 
 * const result = await createAssetRoom({
 *   roomId: 'quiz-night-2024',
 *   currency: 'USDC',
 *   entryFee: 5.0,
 *   maxPlayers: 100,
 *   hostFeePct: 2,
 *   charityName: 'Red Cross',
 *   expectedPrizes: [
 *     { place: 1, tokenAddress: 'USDC...', amount: 100 }, // Use tokenAddress for Solana too
 *     { place: 2, tokenAddress: 'USDC...', amount: 50 },
 *   ],
 * });
 * ```
 */

import { useCallback } from 'react';
import { SystemProgram, SYSVAR_RENT_PUBKEY, PublicKey } from '@solana/web3.js';
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
import { validateAssetRoomParams } from '../utils/validation';
import type { CreateAssetRoomParams, CreateAssetRoomResult } from '../utils/types';

export function useSolanaCreateAssetRoom() {
  const { 
    publicKey, 
    connection, 
    provider, 
    program, 
    isConnected,
    cluster,
    getTxExplorerUrl,
  } = useSolanaShared();

  const createAssetRoom = useCallback(
    async (params: CreateAssetRoomParams): Promise<CreateAssetRoomResult> => {
      console.log('[Solana][CreateAssetRoom] 🚀 Starting asset room creation...');
      console.log('[Solana][CreateAssetRoom] 📋 Parameters:', {
        roomId: params.roomId,
        currency: params.currency,
        entryFee: params.entryFee,
        maxPlayers: params.maxPlayers,
        hostFeePct: params.hostFeePct,
        charityName: params.charityName,
        expectedPrizes: params.expectedPrizes?.length,
      });

      // ============================================================================
      // Step 1: Connection & Wallet Validation
      // ============================================================================
      
      if (!isConnected || !publicKey || !program || !provider || !connection) {
        console.error('[Solana][CreateAssetRoom] ❌ Wallet not connected');
        throw new Error('Wallet not connected. Please connect your Solana wallet.');
      }

      console.log('[Solana][CreateAssetRoom] ✅ Wallet connected:', publicKey.toBase58());
      console.log('[Solana][CreateAssetRoom] 🌐 Cluster:', cluster);

      // ============================================================================
      // Step 2: Input Validation
      // ============================================================================
      
      console.log('[Solana][CreateAssetRoom] 🔍 Validating parameters...');
      
      const validation = validateAssetRoomParams(params);
      if (!validation.success) {
        console.error('[Solana][CreateAssetRoom] ❌ Validation failed:', validation.errors);
        throw new Error(validation.errors.join('. '));
      }

      console.log('[Solana][CreateAssetRoom] ✅ All validations passed');

      // ============================================================================
      // Step 3: Token Configuration
      // ============================================================================
      
      console.log('[Solana][CreateAssetRoom] 💰 Getting token configuration...');
      
      const tokenConfig = getTokenConfig(params.currency, cluster);
      const feeTokenMint = tokenConfig.mint;
      
      console.log('[Solana][CreateAssetRoom] Entry fee token:', {
        symbol: tokenConfig.symbol,
        name: tokenConfig.name,
        mint: feeTokenMint.toBase58(),
        decimals: tokenConfig.decimals,
      });

      // ============================================================================
      // Step 4: Convert Amounts to Lamports
      // ============================================================================
      
      console.log('[Solana][CreateAssetRoom] 🔢 Converting amounts to lamports...');
      
      const entryFeeLamports = amountToLamports(params.entryFee, params.currency);
      
      console.log('[Solana][CreateAssetRoom] Entry fee:', {
        human: `${params.entryFee} ${params.currency}`,
        lamports: entryFeeLamports.toString(),
      });

      // ============================================================================
      // Step 5: Process Prize Configuration
      // ============================================================================
      
      console.log('[Solana][CreateAssetRoom] 🏆 Processing prize configuration...');
      
      if (!params.expectedPrizes || params.expectedPrizes.length === 0) {
        throw new Error('Asset room requires at least one prize configured.');
      }

      // Sort prizes by place
      const sortedPrizes = [...params.expectedPrizes].sort((a, b) => a.place - b.place);
      
      if (sortedPrizes[0]?.place !== 1) {
        throw new Error('First place prize (place 1) is required for asset rooms.');
      }

      // Extract first 3 prizes (Solana supports up to 3)
      const prize1 = sortedPrizes[0];
      const prize2 = sortedPrizes.find(p => p.place === 2);
      const prize3 = sortedPrizes.find(p => p.place === 3);

      // Validate and convert prize 1 (required)
      if (!prize1) {
        throw new Error('Prize 1 is required');
      }

      // Get mint from tokenAddress (Prize uses tokenAddress for both EVM and Solana)
      const mintAddress = prize1.tokenAddress;
      if (!mintAddress) {
        throw new Error('Prize 1 must have a tokenAddress (mint address for Solana)');
      }
      
      const prize1Mint = new PublicKey(mintAddress);
      
      // ✅ CORRECT: Only check explicit Solana tokenType
      const isNFT1 = prize1.tokenType === 'nft';
      
      // Parse amount - ensure it's a number
      const amount1 = prize1.amount ? Number(prize1.amount) : 1;
      
      // ✅ VALIDATE: If marked as NFT, amount MUST be 1
      if (isNFT1 && amount1 !== 1) {
        throw new Error(
          `Prize 1: NFT detected (tokenType: ${prize1.tokenType}) but amount is ${amount1}. ` +
          `NFTs must have amount = 1.`
        );
      }
      
      const prize1Type = isNFT1 ? 1 : 0; // 0 = FungibleToken, 1 = NFT
      
      const prize1Amount = new BN(
        amountToLamports(amount1, params.currency).toString()
      );

      console.log('[Solana][CreateAssetRoom] Prize 1:', {
        place: 1,
        type: prize1Type === 1 ? 'NFT' : 'Fungible',
        mint: prize1Mint.toBase58(),
        amount: prize1Amount.toString(),
        rawAmount: amount1,
        tokenType: prize1.tokenType,
      });

      // Process prize 2 (optional)
      let prize2Type: number | null = null;
      let prize2Mint: PublicKey | null = null;
      let prize2Amount: BN | null = null;

      if (prize2 && prize2.tokenAddress) {
        prize2Mint = new PublicKey(prize2.tokenAddress);
        
        // ✅ CORRECT: Only check explicit Solana tokenType
        const isNFT2 = prize2.tokenType === 'nft';
        
        const amount2 = prize2.amount ? Number(prize2.amount) : 1;
        
        // ✅ VALIDATE: If marked as NFT, amount MUST be 1
        if (isNFT2 && amount2 !== 1) {
          throw new Error(
            `Prize 2: NFT detected (tokenType: ${prize2.tokenType}) but amount is ${amount2}. ` +
            `NFTs must have amount = 1.`
          );
        }
        
        prize2Type = isNFT2 ? 1 : 0;
        prize2Amount = new BN(
          amountToLamports(amount2, params.currency).toString()
        );
        
        console.log('[Solana][CreateAssetRoom] Prize 2:', {
          place: 2,
          type: prize2Type === 1 ? 'NFT' : 'Fungible',
          mint: prize2Mint.toBase58(),
          amount: prize2Amount.toString(),
          rawAmount: amount2,
          tokenType: prize2.tokenType,
        });
      }

      // Process prize 3 (optional)
      let prize3Type: number | null = null;
      let prize3Mint: PublicKey | null = null;
      let prize3Amount: BN | null = null;

      if (prize3 && prize3.tokenAddress) {
        prize3Mint = new PublicKey(prize3.tokenAddress);
        
        // ✅ CORRECT: Only check explicit Solana tokenType
        const isNFT3 = prize3.tokenType === 'nft';
        
        const amount3 = prize3.amount ? Number(prize3.amount) : 1;
        
        // ✅ VALIDATE: If marked as NFT, amount MUST be 1
        if (isNFT3 && amount3 !== 1) {
          throw new Error(
            `Prize 3: NFT detected (tokenType: ${prize3.tokenType}) but amount is ${amount3}. ` +
            `NFTs must have amount = 1.`
          );
        }
        
        prize3Type = isNFT3 ? 1 : 0;
        prize3Amount = new BN(
          amountToLamports(amount3, params.currency).toString()
        );
        
        console.log('[Solana][CreateAssetRoom] Prize 3:', {
          place: 3,
          type: prize3Type === 1 ? 'NFT' : 'Fungible',
          mint: prize3Mint.toBase58(),
          amount: prize3Amount.toString(),
          rawAmount: amount3,
          tokenType: prize3.tokenType,
        });
      }

      // ============================================================================
      // Step 6: Calculate Fee Structure (BPS)
      // ============================================================================
      
      console.log('[Solana][CreateAssetRoom] 📊 Calculating fee structure...');
      
      // Asset rooms: entry fees go to platform (20%) + charity (75-80%) + host (0-5%)
      const hostFeeBps = Math.floor((params.hostFeePct || 0) * 100);
      
      // Platform is always 20% (2000 BPS)
      const platformBps = 2000;
      
      // Charity gets the rest (after platform and host)
      const charityBps = 10000 - platformBps - hostFeeBps;
      
      console.log('[Solana][CreateAssetRoom] Fee breakdown (BPS):', {
        platform: `${platformBps} BPS (20%)`,
        host: `${hostFeeBps} BPS (${hostFeeBps / 100}%)`,
        charity: `${charityBps} BPS (${charityBps / 100}%)`,
        total: '10000 BPS (100%)',
      });

      // ============================================================================
      // Step 7: Derive PDAs
      // ============================================================================
      
      console.log('[Solana][CreateAssetRoom] 🔑 Deriving PDAs...');
      
      const [globalConfig] = deriveGlobalConfigPDA();
      const [tokenRegistry] = deriveTokenRegistryPDA();
      const [room] = deriveRoomPDA(publicKey, params.roomId);
      const [roomVault] = deriveRoomVaultPDA(room);
      
      console.log('[Solana][CreateAssetRoom] PDAs:', {
        globalConfig: globalConfig.toBase58(),
        tokenRegistry: tokenRegistry.toBase58(),
        room: room.toBase58(),
        roomVault: roomVault.toBase58(),
      });

      // ============================================================================
      // Step 8: Check Wallet Balance
      // ============================================================================
      
      console.log('[Solana][CreateAssetRoom] 💰 Checking wallet balance...');
      
      const balance = await connection.getBalance(publicKey);
      const balanceSOL = balance / 1e9;
      
      console.log('[Solana][CreateAssetRoom] Wallet balance:', {
        lamports: balance,
        SOL: balanceSOL.toFixed(4),
      });
      
      const estimatedRent = 0.01; // Higher for asset room (room + prize vaults)
      const estimatedFees = 0.001;
      const totalRequired = estimatedRent + estimatedFees;
      
      if (balanceSOL < totalRequired) {
        console.error('[Solana][CreateAssetRoom] ❌ Insufficient SOL');
        throw new Error(
          `Insufficient SOL for asset room creation. Required: ${totalRequired.toFixed(4)} SOL, ` +
          `Current balance: ${balanceSOL.toFixed(4)} SOL`
        );
      }
      
      console.log('[Solana][CreateAssetRoom] ✅ Sufficient balance for rent + fees');

      // ============================================================================
      // Step 9: Build Instruction
      // ============================================================================
      
      console.log('[Solana][CreateAssetRoom] 🔨 Building init_asset_room instruction...');
      
      const charityMemo = params.charityName?.substring(0, SOLANA_CONTRACT.MAX_CHARITY_MEMO) || 'Quiz charity';
      
      console.log('[Solana][CreateAssetRoom] Instruction parameters:', {
        roomId: params.roomId,
        entryFee: entryFeeLamports.toString(),
        maxPlayers: params.maxPlayers,
        hostFeeBps,
        charityMemo,
        prize1: { type: prize1Type, mint: prize1Mint.toBase58(), amount: prize1Amount.toString() },
        prize2: prize2Mint ? { type: prize2Type, mint: prize2Mint.toBase58(), amount: prize2Amount?.toString() } : null,
        prize3: prize3Mint ? { type: prize3Type, mint: prize3Mint.toBase58(), amount: prize3Amount?.toString() } : null,
      });

      let instruction;
      try {
        if (!program || !program.methods) {
          throw new Error('Program methods not available');
        }
        
        const programMethods = program.methods as any;
        
        instruction = await programMethods
          .initAssetRoom(
            params.roomId,
            new BN(entryFeeLamports.toString()),
            params.maxPlayers,
            hostFeeBps,
            charityMemo,
            null, // expirationSlots
            // Prize 1 (required)
            prize1Type === 1 ? { nft: {} } : { fungibleToken: {} },
            prize1Mint,
            prize1Amount,
            // Prize 2 (optional)
            prize2Type !== null ? (prize2Type === 1 ? { nft: {} } : { fungibleToken: {} }) : null,
            prize2Mint,
            prize2Amount,
            // Prize 3 (optional)
            prize3Type !== null ? (prize3Type === 1 ? { nft: {} } : { fungibleToken: {} }) : null,
            prize3Mint,
            prize3Amount,
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
        
        console.log('[Solana][CreateAssetRoom] ✅ Instruction built successfully');
      } catch (error: any) {
        console.error('[Solana][CreateAssetRoom] ❌ Failed to build instruction:', error);
        throw new Error(`Failed to build transaction: ${error.message}`);
      }

      // ============================================================================
      // Step 10: Build Transaction
      // ============================================================================
      
      console.log('[Solana][CreateAssetRoom] 📦 Building transaction...');
      
      let transaction;
      try {
        transaction = await buildTransaction(connection, [instruction], publicKey);
        console.log('[Solana][CreateAssetRoom] ✅ Transaction built');
      } catch (error: any) {
        console.error('[Solana][CreateAssetRoom] ❌ Failed to build transaction:', error);
        throw new Error(`Failed to build transaction: ${error.message}`);
      }

      // ============================================================================
      // Step 11: Simulate Transaction
      // ============================================================================
      
      console.log('[Solana][CreateAssetRoom] 🧪 Simulating transaction...');
      
      const simResult = await simulateTransaction(connection, transaction);
      
      if (!simResult.success) {
        console.error('[Solana][CreateAssetRoom] ❌ Simulation failed');
        console.error('[Solana][CreateAssetRoom] Error:', simResult.error);
        console.error('[Solana][CreateAssetRoom] Logs:', simResult.logs);
        
        const errorMsg = formatTransactionError(simResult.error);
        throw new Error(`Transaction simulation failed: ${errorMsg}`);
      }
      
      console.log('[Solana][CreateAssetRoom] ✅ Simulation successful');

      // ============================================================================
      // Step 12: Send and Confirm Transaction
      // ============================================================================
      
      console.log('[Solana][CreateAssetRoom] 📤 Sending transaction...');
      
      let signature: string;
      try {
        signature = await provider.sendAndConfirm(transaction, [], {
          skipPreflight: false,
          commitment: 'confirmed',
        });
        
        console.log('[Solana][CreateAssetRoom] ✅ Transaction confirmed');
        console.log('[Solana][CreateAssetRoom] 📝 Signature:', signature);
      } catch (error: any) {
        console.error('[Solana][CreateAssetRoom] ❌ Transaction failed:', error);
        
        const errorMsg = formatTransactionError(error);
        throw new Error(`Transaction failed: ${errorMsg}`);
      }

      // ============================================================================
      // Step 13: Success!
      // ============================================================================
      
      const explorerUrl = getTxExplorerUrl(signature);
      
      console.log('[Solana][CreateAssetRoom] ✅ Asset room created successfully!');
      console.log('[Solana][CreateAssetRoom] 📍 Room address:', room.toBase58());
      console.log('[Solana][CreateAssetRoom] 📍 Room vault:', roomVault.toBase58());
      console.log('[Solana][CreateAssetRoom] 💰 Entry fee:', `${params.entryFee} ${params.currency}`);
      console.log('[Solana][CreateAssetRoom] 👥 Max players:', params.maxPlayers);
      console.log('[Solana][CreateAssetRoom] 🎁 Prizes to deposit:', sortedPrizes.length);
      console.log('[Solana][CreateAssetRoom] ⚠️  Status: AwaitingFunding');
      console.log('[Solana][CreateAssetRoom] 📋 Next steps:');
      console.log('[Solana][CreateAssetRoom]   1. Call addPrizeAsset for each prize');
      console.log('[Solana][CreateAssetRoom]   2. Room status will change to Ready');
      console.log('[Solana][CreateAssetRoom]   3. Players can join');

      return {
        success: true,
        contractAddress: room.toBase58(),
        txHash: signature,
        explorerUrl,
        roomVault: roomVault.toBase58(),
        expectedPrizes: sortedPrizes.length,
        status: 'AwaitingFunding',
      };
    },
    [publicKey, connection, provider, program, isConnected, cluster, getTxExplorerUrl]
  );

  return { createAssetRoom };
}