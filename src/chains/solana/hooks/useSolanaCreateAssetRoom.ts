/**
 * Solana Asset Room Creation Hook
 *
 * Creates asset-based fundraising rooms where prizes are pre-deposited SPL tokens
 * rather than percentages of the entry fee pool.
 *
 * Entry fee token:
 * - must come from SOLANA_TOKENS allowlist
 *
 * Prize tokens:
 * - can be ANY valid SPL mint
 * - if mint is known in SOLANA_TOKENS, use configured decimals
 * - otherwise fetch decimals on-chain from the mint account
 */

import { useCallback } from 'react';
import { SystemProgram, SYSVAR_RENT_PUBKEY, PublicKey } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID, getMint } from '@solana/spl-token';
import { BN } from '@coral-xyz/anchor';

import { useSolanaShared } from './useSolanaShared';
import { SOLANA_CONTRACT } from '../config/contracts';

import {
  SOLANA_TOKENS,
  getTokenByMint,
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

import { validateAssetRoomParams } from '../utils/validation';
import type { CreateAssetRoomParams, CreateAssetRoomResult } from '../utils/types';

function normalizeDecimalInput(value: string | number | undefined | null): string {
  const str = String(value ?? '').trim();

  if (!str) return '';

  if (str.startsWith('.')) return `0${str}`;

  return str;
}

function decimalToRawAmount(value: string, decimals: number): bigint {
  const normalized = normalizeDecimalInput(value);

  if (!normalized) {
    throw new Error('Amount is required');
  }

  if (!/^\d+(\.\d+)?$/.test(normalized)) {
    throw new Error(`Invalid token amount: ${value}`);
  }

  const [whole, fraction = ''] = normalized.split('.');

  if (fraction.length > decimals) {
    throw new Error(
      `Amount ${normalized} has too many decimal places. Token supports max ${decimals} decimals.`
    );
  }

  const paddedFraction = fraction.padEnd(decimals, '0');
  const raw = `${whole}${paddedFraction}`.replace(/^0+/, '') || '0';

  return BigInt(raw);
}

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
      // Step 3: Entry Fee Token Configuration
      // ============================================================================

      console.log('[Solana][CreateAssetRoom] 💰 Getting entry fee token configuration...');

      const entryTokenCode = params.currency as SolanaTokenCode;
      const entryTokenConfig = SOLANA_TOKENS[entryTokenCode];

      if (!entryTokenConfig) {
        throw new Error(`Unsupported entry fee token: ${params.currency}`);
      }

      // SOL uses wrapped SOL mint for SPL token transfers
      const WSOL_MINT = 'So11111111111111111111111111111111111111112';
      const entryMintAddress = entryTokenConfig.isNative ? WSOL_MINT : entryTokenConfig.mint;

      if (!entryMintAddress) {
        throw new Error(`No mint address for entry fee token: ${entryTokenCode}`);
      }

      

      const feeTokenMint = new PublicKey(entryMintAddress);

      


      console.log('[Solana][CreateAssetRoom] Entry fee token:', {
        code: entryTokenConfig.code,
        name: entryTokenConfig.name,
        mint: feeTokenMint.toBase58(),
        decimals: entryTokenConfig.decimals,
      });

      // ============================================================================
      // Step 4: Convert Entry Fee to Raw Units
      // ============================================================================

      console.log('[Solana][CreateAssetRoom] 🔢 Converting entry fee to raw units...');

      const entryFeeRaw = toRawAmount(normalizeDecimalInput(params.entryFee), entryTokenCode);

      console.log('[Solana][CreateAssetRoom] Entry fee:', {
        display: `${params.entryFee} ${entryTokenCode}`,
        raw: entryFeeRaw.toString(),
      });

      // ============================================================================
      // Step 5: Process Prize Configuration
      // ============================================================================

      console.log('[Solana][CreateAssetRoom] 🏆 Processing prize configuration...');

      if (!params.expectedPrizes || params.expectedPrizes.length === 0) {
        throw new Error('Asset room requires at least one prize configured.');
      }

      const sortedPrizes = [...params.expectedPrizes].sort((a, b) => a.place - b.place);

      if (sortedPrizes[0]?.place !== 1) {
        throw new Error('First place prize (place 1) is required for asset rooms.');
      }

      const processPrize = async (prize: typeof sortedPrizes[0], label: string) => {
        if (!prize.tokenAddress) {
          throw new Error(`${label} must have a tokenAddress (mint address)`);
        }

        const prizeMint = new PublicKey(prize.tokenAddress);
        const isNFT = prize.tokenType === 'nft';
        const displayAmount = normalizeDecimalInput(prize.amount);

        if (isNFT) {
          if (displayAmount && displayAmount !== '1') {
            throw new Error(
              `${label}: NFT detected (tokenType: ${prize.tokenType}) but amount is ${displayAmount}. NFTs must have amount = 1.`
            );
          }
        } else {
          if (!displayAmount) {
            throw new Error(`${label}: amount is required`);
          }
        }

        let prizeAmountRaw: bigint;

        if (isNFT) {
          prizeAmountRaw = 1n;
        } else {
          let decimals: number | null = null;

          const prizeTokenConfig = getTokenByMint(prize.tokenAddress);

          if (prizeTokenConfig) {
            decimals = prizeTokenConfig.decimals;
            console.log(
              `[Solana][CreateAssetRoom] ${label} token resolved from config: ${prizeTokenConfig.code} (${decimals} decimals)`
            );
          } else {
            try {
              const mintInfo = await getMint(connection, prizeMint);
              decimals = mintInfo.decimals;

              console.log(
                `[Solana][CreateAssetRoom] ${label} token decimals fetched on-chain: ${decimals}`
              );
            } catch (error) {
              console.error(
                `[Solana][CreateAssetRoom] ❌ Failed to fetch mint info for ${label}:`,
                error
              );
              throw new Error(
                `${label}: could not read token mint ${prize.tokenAddress}. Make sure it is a valid SPL mint on the current cluster.`
              );
            }
          }

          prizeAmountRaw = decimalToRawAmount(displayAmount, decimals);
        }

        const prizeType = isNFT ? 1 : 0; // 0 = FungibleToken, 1 = NFT

        console.log(`[Solana][CreateAssetRoom] ${label}:`, {
          place: prize.place,
          type: prizeType === 1 ? 'NFT' : 'Fungible',
          mint: prizeMint.toBase58(),
          amountDisplay: isNFT ? '1' : displayAmount,
          amountRaw: prizeAmountRaw.toString(),
          tokenType: prize.tokenType,
        });

        return {
          mint: prizeMint,
          type: prizeType,
          amount: new BN(prizeAmountRaw.toString()),
          typeArg: prizeType === 1 ? { nft: {} } : { fungibleToken: {} },
        };
      };

      const prize1 = await processPrize(sortedPrizes[0], 'Prize 1');
      const prize2Raw = sortedPrizes.find((p) => p.place === 2);
      const prize3Raw = sortedPrizes.find((p) => p.place === 3);

      const prize2 = prize2Raw?.tokenAddress ? await processPrize(prize2Raw, 'Prize 2') : null;
      const prize3 = prize3Raw?.tokenAddress ? await processPrize(prize3Raw, 'Prize 3') : null;

      // ============================================================================
      // Step 6: Calculate Fee Structure (BPS)
      // ============================================================================

      console.log('[Solana][CreateAssetRoom] 📊 Calculating fee structure...');

      const hostFeeBps = Math.floor((params.hostFeePct || 0) * 100);
      const platformBps = 2000;
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

      const estimatedRent = 0.01;
      const estimatedFees = 0.001;

      if (balanceSOL < estimatedRent + estimatedFees) {
        throw new Error(
          `Insufficient SOL for asset room creation. Required: ~${(estimatedRent + estimatedFees).toFixed(4)} SOL, ` +
            `Current balance: ${balanceSOL.toFixed(4)} SOL`
        );
      }

      console.log('[Solana][CreateAssetRoom] ✅ Sufficient balance for rent + fees');

      // ============================================================================
      // Step 9: Build Instruction
      // ============================================================================

      console.log('[Solana][CreateAssetRoom] 🔨 Building init_asset_room instruction...');

      const charityMemo =
        params.charityName?.substring(0, SOLANA_CONTRACT.MAX_CHARITY_MEMO) || 'Quiz charity';

      console.log('[Solana][CreateAssetRoom] Instruction parameters:', {
        roomId: params.roomId,
        entryFee: entryFeeRaw.toString(),
        maxPlayers: params.maxPlayers,
        hostFeeBps,
        charityMemo,
        prize1: {
          type: prize1.type,
          mint: prize1.mint.toBase58(),
          amount: prize1.amount.toString(),
        },
        prize2: prize2
          ? {
              type: prize2.type,
              mint: prize2.mint.toBase58(),
              amount: prize2.amount.toString(),
            }
          : null,
        prize3: prize3
          ? {
              type: prize3.type,
              mint: prize3.mint.toBase58(),
              amount: prize3.amount.toString(),
            }
          : null,
      });

      let instruction;
      try {
        if (!program?.methods) throw new Error('Program methods not available');

        instruction = await (program.methods as any)
          .initAssetRoom(
            params.roomId,
            new BN(entryFeeRaw.toString()),
            params.maxPlayers,
            hostFeeBps,
            charityMemo,
            null, // expirationSlots
            // Prize 1 (required)
            prize1.typeArg,
            prize1.mint,
            prize1.amount,
            // Prize 2 (optional)
            prize2?.typeArg ?? null,
            prize2?.mint ?? null,
            prize2?.amount ?? null,
            // Prize 3 (optional)
            prize3?.typeArg ?? null,
            prize3?.mint ?? null,
            prize3?.amount ?? null
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
        throw new Error(
          `Transaction simulation failed: ${formatTransactionError(simResult.error)}`
        );
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
        throw new Error(`Transaction failed: ${formatTransactionError(error)}`);
      }

      // ============================================================================
      // Step 13: Return Result
      // ============================================================================

      const explorerUrl = getTxExplorerUrl(signature);

      console.log('[Solana][CreateAssetRoom] ✅ Asset room created successfully!');
      console.log('[Solana][CreateAssetRoom] 📍 Room address:', room.toBase58());
      console.log('[Solana][CreateAssetRoom] 📍 Room vault:', roomVault.toBase58());
      console.log('[Solana][CreateAssetRoom] 💰 Entry fee:', `${params.entryFee} ${entryTokenCode}`);
      console.log('[Solana][CreateAssetRoom] 👥 Max players:', params.maxPlayers);
      console.log('[Solana][CreateAssetRoom] 🎁 Prizes to deposit:', sortedPrizes.length);
      console.log('[Solana][CreateAssetRoom] ⚠️ Status: AwaitingFunding');
      console.log('[Solana][CreateAssetRoom] 📋 Next: call addPrizeAsset for each prize slot');

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