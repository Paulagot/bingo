/**
 * Solana End Room Hook (Two-Step Flow)
 *
 * Handles prize distribution for Solana quiz rooms using the two-step pattern:
 * 1. declare_winners - Validates and stores winners on-chain
 * 2. end_room - Distributes funds to all recipients
 *
 * ## Why Two Steps?
 *
 * - ✅ Winners validated BEFORE calling TGB API
 * - ✅ Winners visible on-chain before distribution
 * - ✅ More transparent and trustworthy
 * - ✅ Time to get TGB charity address between steps
 */

import { useCallback } from 'react';
import { PublicKey, SystemProgram } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID, getAssociatedTokenAddress } from '@solana/spl-token';
import { BN } from '@coral-xyz/anchor';
import { keccak_256 } from '@noble/hashes/sha3';

import { useSolanaShared } from './useSolanaShared';
import {
  deriveRoomVaultPDA,
  deriveGlobalConfigPDA,
  derivePlayerEntryPDA,
  derivePrizeVaultPDA,
} from '../utils/pda';
import {
  buildTransaction,
  simulateTransaction,
  formatTransactionError,
} from '../utils/transaction-helpers';

import {
  getTokenByMint,
  meetsMinDonation,
  toDisplayAmount,
  PLATFORM_CHARITY_RESERVE,
} from '../config/solanaTokenConfig';

import {
  buildUnwrapSolInstruction,
  isNativeSolRoom,
  WSOL_MINT,
} from '../utils/wsolUtils';

import { fetchAndParseRoomEndedEvent } from '../utils/event-praser';

import type {
  DistributePrizesParams,
  DistributePrizesResult,
} from '../utils/types';

export function useSolanaEndRoom() {
  const {
    publicKey,
    program,
    connection,
    provider,
    isConnected,
    getTxExplorerUrl,
  } = useSolanaShared();

  const endRoom = useCallback(
    async (params: DistributePrizesParams): Promise<DistributePrizesResult> => {
      console.log('[Solana][EndRoom] 🏆 Starting two-step prize distribution...');
      console.log('[Solana][EndRoom] Params:', params);

      // ============================================================================
      // STEP 1: Validate wallet connection
      // ============================================================================

      if (!isConnected || !publicKey || !program || !connection || !provider) {
        const missing: string[] = [];
        if (!isConnected) missing.push('not connected');
        if (!publicKey) missing.push('no publicKey');
        if (!program) missing.push('no program');
        if (!connection) missing.push('no connection');
        if (!provider) missing.push('no provider');

        const error = `Wallet not ready: ${missing.join(', ')}`;
        console.error('[Solana][EndRoom] ❌', error);
        throw new Error(error);
      }

      console.log('[Solana][EndRoom] ✅ Wallet connected:', publicKey.toBase58());

      // ============================================================================
      // STEP 2: Validate parameters
      // ============================================================================

      const { roomId, roomAddress, winners, charityOrgId } = params;

      if (!roomId) throw new Error('Room ID is required');
      if (!roomAddress) throw new Error('Room address is required');
      if (!winners || winners.length === 0) throw new Error('At least one winner is required');
      if (winners.length > 10) throw new Error('Maximum 10 winners allowed');

      let winnerPublicKeys: PublicKey[] = winners.map((addr) => {
        try {
          return typeof addr === 'string' ? new PublicKey(addr) : addr;
        } catch {
          throw new Error(`Invalid winner address: ${addr}`);
        }
      });

      console.log('[Solana][EndRoom] ✅ Parameters validated');
      console.log('[Solana][EndRoom] 🏅 Winners (initial):', winnerPublicKeys.length);

      // ============================================================================
      // STEP 3: Fetch room account
      // ============================================================================

      console.log('[Solana][EndRoom] 🔍 Fetching room account...');

      let roomPDA: PublicKey;
      try {
        roomPDA = typeof roomAddress === 'string' ? new PublicKey(roomAddress) : roomAddress;
      } catch (e: any) {
        throw new Error(`Invalid room address: ${e.message}`);
      }

      const roomAccount = await (program.account as any).room.fetch(roomPDA);

      const host = roomAccount.host as PublicKey;
      const tokenMint = roomAccount.feeTokenMint as PublicKey;
      const totalEntryFees = new BN(roomAccount.totalEntryFees.toString());
      const totalExtrasFees = new BN(roomAccount.totalExtrasFees.toString());
      const hostFeeBps = roomAccount.hostFeeBps;
      const prizePoolBps = roomAccount.prizePoolBps;

      console.log('[Solana][EndRoom] ✅ Room data fetched:');
      console.log('[Solana][EndRoom]   Host:', host.toBase58());
      console.log('[Solana][EndRoom]   Token mint:', tokenMint.toBase58());
      console.log('[Solana][EndRoom]   Entry fees:', totalEntryFees.toString());
      console.log('[Solana][EndRoom]   Extras:', totalExtrasFees.toString());

      const prizeMode = Object.keys(roomAccount.prizeMode)[0]; // 'poolSplit' or 'assetBased'
      console.log('[Solana][EndRoom]   Prize mode:', prizeMode);

      const prizeDist: number[] = roomAccount.prizeDistribution ?? [];
      const expectedWinners = prizeDist.filter((pct: number) => pct > 0).length;

      console.log('[Solana][EndRoom]   prize_distribution:', prizeDist);
      console.log('[Solana][EndRoom]   expected_winners:', expectedWinners);

      if (expectedWinners <= 0) {
        throw new Error('This room has no prize slots configured (all prize_distribution entries are 0).');
      }

      if (prizeMode === 'assetBased') {
        console.log('[Solana][EndRoom] 🎁 Asset-based room detected - validating prizes deposited...');

        const prizeAssets = roomAccount.prizeAssets || [];

        console.log('[Solana][EndRoom] 🔍 Examining prize assets:');
        prizeAssets.forEach((asset: any, idx: number) => {
          if (asset) {
            console.log(`[Solana][EndRoom]   Slot ${idx}:`, {
              exists: true,
              deposited: asset.deposited,
              mint: asset.mint?.toBase58?.() || 'unknown',
              amount: asset.amount?.toString?.() || 'unknown',
            });
          } else {
            console.log(`[Solana][EndRoom]   Slot ${idx}: null (no prize configured)`);
          }
        });

        const depositedPrizeCount = prizeAssets.filter(
          (asset: any) => asset !== null && asset.deposited === true
        ).length;

        console.log('[Solana][EndRoom]   Prize slots configured:', prizeAssets.length);
        console.log('[Solana][EndRoom]   Prizes actually deposited:', depositedPrizeCount);
        console.log('[Solana][EndRoom]   Winners provided:', winnerPublicKeys.length);

        if (depositedPrizeCount === 0) {
          throw new Error('No prizes have been deposited for this asset room');
        }

        const maxAllowed = Math.min(expectedWinners, depositedPrizeCount);

        if (winnerPublicKeys.length > maxAllowed) {
          console.warn('[Solana][EndRoom] ⚠️ Too many winners for available asset prizes');
          console.warn('[Solana][EndRoom] ⚠️ Max allowed:', maxAllowed);
          console.warn('[Solana][EndRoom] 🔧 Trimming to top', maxAllowed, 'winner(s)');
          winnerPublicKeys = winnerPublicKeys.slice(0, maxAllowed);
          console.log('[Solana][EndRoom] ✅ Trimmed winners:', winnerPublicKeys.length);
        }

        if (winnerPublicKeys.length < 1) {
          throw new Error('At least one winner is required');
        }
      } else {
        if (winnerPublicKeys.length > expectedWinners) {
          console.warn(
            `[Solana][EndRoom] ⚠️ Too many winners provided (${winnerPublicKeys.length}). Trimming to ${expectedWinners} based on prize_distribution.`
          );
          winnerPublicKeys = winnerPublicKeys.slice(0, expectedWinners);
        }
      }

      console.log('[Solana][EndRoom] ✅ Winners (final):', winnerPublicKeys.length);

      // ============================================================================
      // STEP 4: Resolve token config from on-chain mint
      // ============================================================================

      const mintAddress = tokenMint.toBase58();
      const tokenConfig = getTokenByMint(mintAddress);

      if (!tokenConfig) {
        throw new Error(
          `Unsupported token mint: ${mintAddress}. This token is not in the approved token list.`
        );
      }

      const currency = tokenConfig.code;
      const decimals = tokenConfig.decimals;

      console.log('[Solana][EndRoom] ✅ Token resolved:', currency, `(${decimals} decimals)`);

      const isSolRoom = isNativeSolRoom(tokenMint);
      const splMint = isSolRoom ? WSOL_MINT : tokenMint;
      console.log('[Solana][EndRoom] 🪙 SOL room (wSOL):', isSolRoom);

      // ============================================================================
      // STEP 5: Calculate charity preview
      // ============================================================================

      const PLATFORM_FEE_BPS = 2000;
      const totalPool = totalEntryFees.add(totalExtrasFees);

      let charityAmountRaw: BN;

      if (prizeMode === 'assetBased') {
        console.log('[Solana][EndRoom] 💰 Asset room charity calculation:');

        const platformFee = totalPool.mul(new BN(PLATFORM_FEE_BPS)).div(new BN(10000));
        const hostFee = totalPool.mul(new BN(hostFeeBps)).div(new BN(10000));

        charityAmountRaw = totalPool.sub(platformFee).sub(hostFee);

        console.log('[Solana][EndRoom]   Total pool:', totalPool.toString());
        console.log('[Solana][EndRoom]   Platform fee:', platformFee.toString());
        console.log('[Solana][EndRoom]   Host fee:', hostFee.toString());
        console.log('[Solana][EndRoom]   Prize pool fee: 0 (asset-based)');
      } else {
        console.log('[Solana][EndRoom] 💰 Pool room charity calculation:');

        const platformFee = totalPool.mul(new BN(PLATFORM_FEE_BPS)).div(new BN(10000));
        const hostFee = totalPool.mul(new BN(hostFeeBps)).div(new BN(10000));
        const prizeFee = totalPool.mul(new BN(prizePoolBps)).div(new BN(10000));

        charityAmountRaw = totalPool.sub(platformFee).sub(hostFee).sub(prizeFee);

        console.log('[Solana][EndRoom]   Total pool:', totalPool.toString());
        console.log('[Solana][EndRoom]   Platform fee:', platformFee.toString());
        console.log('[Solana][EndRoom]   Host fee:', hostFee.toString());
        console.log('[Solana][EndRoom]   Prize fee:', prizeFee.toString());
      }

      const charityAmountDisplay = toDisplayAmount(BigInt(charityAmountRaw.toString()), currency);
      const charityDecimal = charityAmountDisplay.toFixed(6);

      console.log('[Solana][EndRoom]   Charity (raw):', charityAmountRaw.toString());
      console.log('[Solana][EndRoom]   Charity (display):', charityDecimal, currency);

      // ============================================================================
      // STEP 6: Derive PDAs
      // ============================================================================

      console.log('[Solana][EndRoom] 🔑 Deriving PDAs...');

      const [roomVault] = deriveRoomVaultPDA(roomPDA);
      const [globalConfig] = deriveGlobalConfigPDA();

      const playerEntryPDAs: PublicKey[] = [];
      for (const winner of winnerPublicKeys) {
        const [playerEntry] = derivePlayerEntryPDA(roomPDA, winner);
        playerEntryPDAs.push(playerEntry);
      }

      console.log('[Solana][EndRoom] ✅ PDAs derived');
      console.log('[Solana][EndRoom]   Room vault:', roomVault.toBase58());
      console.log('[Solana][EndRoom]   Global config:', globalConfig.toBase58());
      console.log('[Solana][EndRoom]   Player entries:', playerEntryPDAs.length);

      // ============================================================================
      // STEP 7A: DECLARE WINNERS
      // ============================================================================

      console.log('[Solana][EndRoom] 🥇 Step 1/2: Declaring winners on-chain...');

      if (!program.methods?.declareWinners) {
        throw new Error('Program methods not available');
      }

      const declareInstruction = await program.methods
        .declareWinners(roomId, winnerPublicKeys)
        .accounts({
          room: roomPDA,
          roomVault: roomVault,
          host: publicKey,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .remainingAccounts(
          playerEntryPDAs.map((pda) => ({
            pubkey: pda,
            isSigner: false,
            isWritable: false,
          }))
        )
        .instruction();

      const declareTx = await buildTransaction(connection, [declareInstruction], publicKey);

      console.log('[Solana][EndRoom] 🧪 Simulating declare_winners...');
      const declareSimulation = await simulateTransaction(connection, declareTx);

      if (!declareSimulation.success) {
        console.error('[Solana][EndRoom] ❌ Declare winners simulation failed:', declareSimulation.error);
        console.error('[Solana][EndRoom] ❌ Simulation logs:', declareSimulation.logs);
        throw new Error(`Declare winners simulation failed: ${declareSimulation.error}`);
      }

      console.log('[Solana][EndRoom] ✅ Declare winners simulation successful');
      console.log('[Solana][EndRoom] 📤 Sending declare_winners transaction...');

      let declareWinnersTxHash: string;
      try {
        declareWinnersTxHash = await provider.sendAndConfirm(declareTx);
        console.log('[Solana][EndRoom] ✅ Winners declared on-chain!');
        console.log('[Solana][EndRoom] 📝 Declare tx:', declareWinnersTxHash);
      } catch (error: any) {
        console.error('[Solana][EndRoom] ❌ Declare winners failed:', error);
        throw new Error(formatTransactionError(error));
      }

      // ============================================================================
      // STEP 7B: GET TGB CHARITY ADDRESS
      // ============================================================================

      let charityWallet: PublicKey;
      const charityAmountNum = parseFloat(charityDecimal);

      if (charityOrgId && charityAmountNum > 0) {
        console.log('[Solana][EndRoom] 🌐 Getting TGB charity address...');

        if (!meetsMinDonation(charityAmountNum, currency)) {
          console.warn(
            `[Solana][EndRoom] ⚠️ Charity amount ${charityDecimal} ${currency} is below TGB minimum for this token. Using platform reserve wallet.`
          );

          const fallback = params.charityWallet ?? PLATFORM_CHARITY_RESERVE;
          charityWallet = typeof fallback === 'string'
            ? new PublicKey(fallback)
            : fallback;

          console.log('[Solana][EndRoom] ⚠️ Amount below TGB minimum — using reserve wallet:', charityWallet.toBase58());
        } else {
          try {
            console.log('[Solana][EndRoom] 💰 Charity amount:', charityDecimal, currency);

            const response = await fetch('/api/tgb/create-deposit-address', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                organizationId: Number(charityOrgId),
                tokenCode: currency,
                amount: charityDecimal,
                metadata: { roomId },
              }),
            });

            const data = await response.json();

            if (!data.ok || !data.depositAddress) {
              throw new Error(data.error || 'Failed to get TGB deposit address');
            }

            charityWallet = new PublicKey(data.depositAddress);
            console.log('[Solana][EndRoom] ✅ TGB charity wallet:', charityWallet.toBase58());
          } catch (tgbError: any) {
            console.warn('[Solana][EndRoom] ⚠️ TGB API failed, using fallback:', tgbError.message);

            const fallback = params.charityWallet ?? PLATFORM_CHARITY_RESERVE;
            charityWallet = typeof fallback === 'string'
              ? new PublicKey(fallback)
              : fallback;

            console.log('[Solana][EndRoom] ⚠️ TGB API failed — using reserve wallet:', charityWallet.toBase58());
          }
        }
      } else {
        const fallback = params.charityWallet ?? PLATFORM_CHARITY_RESERVE;
        charityWallet = typeof fallback === 'string'
          ? new PublicKey(fallback)
          : fallback;

        console.log('[Solana][EndRoom] 📍 Using charity wallet (no TGB org):', charityWallet.toBase58());
      }

      // ============================================================================
      // STEP 8: DERIVE TOKEN ACCOUNTS (ATAs)
      // ============================================================================

      console.log('[Solana][EndRoom] 🔍 Deriving token accounts...');

      const globalConfigData = await connection.getAccountInfo(globalConfig);
      if (!globalConfigData) {
        throw new Error('GlobalConfig account not found');
      }

      const platformWalletOffset = 8 + 32;
      const platformWalletBytes = globalConfigData.data.slice(
        platformWalletOffset,
        platformWalletOffset + 32
      );
      const platformWallet = new PublicKey(platformWalletBytes);

      console.log('[Solana][EndRoom] 🏢 Platform wallet:', platformWallet.toBase58());

      const platformTokenAccount = await getAssociatedTokenAddress(splMint, platformWallet);
      const charityTokenAccount = await getAssociatedTokenAddress(splMint, charityWallet);
      const hostTokenAccount = await getAssociatedTokenAddress(splMint, host);

      // Fee-token winner ATAs
      const winnerFeeTokenAccounts: PublicKey[] = [];
      for (const winner of winnerPublicKeys) {
        const winnerATA = await getAssociatedTokenAddress(splMint, winner);
        winnerFeeTokenAccounts.push(winnerATA);
      }

      // Prize-token winner ATAs for asset rooms
      const winnerPrizeTokenAccounts: PublicKey[] = [];

      if (prizeMode === 'assetBased') {
        console.log('[Solana][EndRoom] 🎁 Deriving winner prize-token ATAs...');

        const prizeAssets = roomAccount.prizeAssets || [];

        for (let prizeIndex = 0; prizeIndex < winnerPublicKeys.length; prizeIndex++) {
          const winner = winnerPublicKeys[prizeIndex];
          const prizeAsset = prizeAssets[prizeIndex];

          if (!winner) {
            throw new Error(`Missing winner at prize index ${prizeIndex}`);
          }

          if (!prizeAsset || !prizeAsset.deposited) {
            throw new Error(
              `Prize slot ${prizeIndex + 1} is not deposited but was matched to a winner`
            );
          }

          const prizeMint = new PublicKey(prizeAsset.mint);
          const winnerPrizeAta = await getAssociatedTokenAddress(prizeMint, winner);

          winnerPrizeTokenAccounts.push(winnerPrizeAta);

          console.log(
            `[Solana][EndRoom]   Prize ${prizeIndex + 1}: winner ${winner.toBase58()} -> mint ${prizeMint.toBase58()} -> ATA ${winnerPrizeAta.toBase58()}`
          );
        }
      }

      console.log('[Solana][EndRoom] ✅ Token accounts derived');
      console.log('[Solana][EndRoom]   Platform ATA:', platformTokenAccount.toBase58());
      console.log('[Solana][EndRoom]   Charity ATA:', charityTokenAccount.toBase58());
      console.log('[Solana][EndRoom]   Host ATA:', hostTokenAccount.toBase58());
      console.log('[Solana][EndRoom]   Winner fee-token ATAs:', winnerFeeTokenAccounts.length);
      console.log('[Solana][EndRoom]   Winner prize-token ATAs:', winnerPrizeTokenAccounts.length);

      // ============================================================================
      // STEP 8B: CREATE ATAs IF THEY DON'T EXIST
      // ============================================================================

      console.log('[Solana][EndRoom] 🔍 Checking if ATAs exist...');

      const { createAssociatedTokenAccountInstruction } = await import('@solana/spl-token');
      const ataInstructions: any[] = [];

      const checkAndQueueAta = async (
        ata: PublicKey,
        owner: PublicKey,
        mint: PublicKey,
        label: string
      ) => {
        const info = await connection.getAccountInfo(ata);
        if (!info) {
          console.log(`[Solana][EndRoom] 📝 Creating ${label} ATA...`);
          ataInstructions.push(
            createAssociatedTokenAccountInstruction(publicKey, ata, owner, mint)
          );
        }
      };

      await checkAndQueueAta(platformTokenAccount, platformWallet, splMint, 'platform');
      await checkAndQueueAta(charityTokenAccount, charityWallet, splMint, 'charity');
      await checkAndQueueAta(hostTokenAccount, host, splMint, 'host');

      for (let i = 0; i < winnerPublicKeys.length; i++) {
        const winner = winnerPublicKeys[i];
        const winnerATA = winnerFeeTokenAccounts[i];
        if (!winner || !winnerATA) continue;

        await checkAndQueueAta(
          winnerATA,
          winner,
          splMint,
          `winner fee-token ${winner.toBase58().slice(0, 8)}...`
        );
      }

      if (prizeMode === 'assetBased') {
        const prizeAssets = roomAccount.prizeAssets || [];

        for (let i = 0; i < winnerPublicKeys.length; i++) {
          const winner = winnerPublicKeys[i];
          const winnerPrizeAta = winnerPrizeTokenAccounts[i];
          const prizeAsset = prizeAssets[i];

          if (!winner || !winnerPrizeAta || !prizeAsset) continue;

          const prizeMint = new PublicKey(prizeAsset.mint);

          await checkAndQueueAta(
            winnerPrizeAta,
            winner,
            prizeMint,
            `winner prize-token ${i + 1} (${winner.toBase58().slice(0, 8)}...)`
          );
        }
      }

      if (ataInstructions.length > 0) {
        console.log('[Solana][EndRoom] 📤 Creating', ataInstructions.length, 'ATAs...');
        const ataTx = await buildTransaction(connection, ataInstructions, publicKey);
        try {
          const ataSignature = await provider.sendAndConfirm(ataTx);
          console.log('[Solana][EndRoom] ✅ ATAs created:', ataSignature);
        } catch (error: any) {
          console.error('[Solana][EndRoom] ❌ Failed to create ATAs:', error);
          throw new Error(`Failed to create token accounts: ${formatTransactionError(error)}`);
        }
      } else {
        console.log('[Solana][EndRoom] ✅ All ATAs already exist');
      }

      // ============================================================================
      // STEP 9: END ROOM
      // ============================================================================

      console.log('[Solana][EndRoom] 💰 Step 2/2: Distributing prizes...');

      const offchainIntentId = `FR-${roomId}-${Date.now()}`;
      const intentIdBytes = new TextEncoder().encode(offchainIntentId.padEnd(32, '\0'));
      const intentIdHash = Array.from(keccak_256(intentIdBytes));

      console.log('[Solana][EndRoom] 🔐 Intent ID:', offchainIntentId);

      if (!program.methods?.endRoom) {
        throw new Error('Program methods not available');
      }

      let remainingAccounts: Array<{
        pubkey: PublicKey;
        isSigner: boolean;
        isWritable: boolean;
      }> = [];

      if (prizeMode === 'assetBased') {
        // Contract order from end_room.rs:
        // [0..winners_count]                 = winner fee-token ATAs
        // [winners_count..winners_count*2]   = winner prize-token ATAs
        // [winners_count*2..+3]              = prize vault PDAs

        console.log('[Solana][EndRoom] 🎁 Asset room - building remaining accounts in contract order');

        winnerFeeTokenAccounts.forEach((ata, idx) => {
          console.log(`[Solana][EndRoom]   [${idx}] Winner fee ATA:`, ata.toBase58());
          remainingAccounts.push({
            pubkey: ata,
            isSigner: false,
            isWritable: true,
          });
        });

        winnerPrizeTokenAccounts.forEach((ata, idx) => {
          const accountIndex = winnerFeeTokenAccounts.length + idx;
          console.log(`[Solana][EndRoom]   [${accountIndex}] Winner prize ATA:`, ata.toBase58());
          remainingAccounts.push({
            pubkey: ata,
            isSigner: false,
            isWritable: true,
          });
        });

        for (let i = 0; i < 3; i++) {
          const [prizeVault] = derivePrizeVaultPDA(roomPDA, i);
          const accountIndex =
            winnerFeeTokenAccounts.length + winnerPrizeTokenAccounts.length + i;

          console.log(
            `[Solana][EndRoom]   [${accountIndex}] Prize Vault slot ${i + 1}:`,
            prizeVault.toBase58()
          );

          remainingAccounts.push({
            pubkey: prizeVault,
            isSigner: false,
            isWritable: true,
          });
        }

        console.log('[Solana][EndRoom]   Total remaining accounts:', remainingAccounts.length);
      } else {
        remainingAccounts = winnerFeeTokenAccounts.map((ata) => ({
          pubkey: ata,
          isSigner: false,
          isWritable: true,
        }));

        console.log('[Solana][EndRoom]   Pool room - winner ATAs only:', remainingAccounts.length);
      }

      const endRoomInstruction = await program.methods
        .endRoom(
          roomId,
          charityWallet,
          intentIdHash,
          []
        )
        .accounts({
          room: roomPDA,
          roomVault: roomVault,
          globalConfig: globalConfig,
          platformTokenAccount: platformTokenAccount,
          platformWallet: platformWallet,
          charityTokenAccount: charityTokenAccount,
          hostTokenAccount: hostTokenAccount,
          host: publicKey,
          charityWallet: charityWallet,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .remainingAccounts(remainingAccounts)
        .instruction();

      const endRoomInstructions = [endRoomInstruction];

      if (isSolRoom) {
        console.log('[Solana][EndRoom] 🔓 SOL room — unwrapping host wSOL only');
        endRoomInstructions.push(await buildUnwrapSolInstruction(host));
        console.log('[Solana][EndRoom] ✅ Host unwrap instruction appended');
      }

      const endRoomTx = await buildTransaction(connection, endRoomInstructions, publicKey);

      console.log('[Solana][EndRoom] 🧪 Simulating end_room...');
      const endRoomSimulation = await simulateTransaction(connection, endRoomTx);

      if (!endRoomSimulation.success) {
        console.error('[Solana][EndRoom] ❌ End room simulation failed:', endRoomSimulation.error);
        console.error('[Solana][EndRoom] ❌ Simulation logs:', endRoomSimulation.logs);
        throw new Error(`End room simulation failed: ${endRoomSimulation.error}`);
      }

      console.log('[Solana][EndRoom] ✅ End room simulation successful');
      console.log('[Solana][EndRoom] 📤 Sending end_room transaction...');

      let endRoomTxHash: string;
      try {
        endRoomTxHash = await provider.sendAndConfirm(endRoomTx);
        console.log('[Solana][EndRoom] ✅ Prizes distributed!');
        console.log('[Solana][EndRoom] 📝 End room tx:', endRoomTxHash);
      } catch (error: any) {
        console.error('[Solana][EndRoom] ❌ End room failed:', error);
        throw new Error(formatTransactionError(error));
      }

      // ============================================================================
      // STEP 10: PARSE RoomEnded EVENT
      // ============================================================================

      console.log('[Solana][EndRoom] 📊 Parsing RoomEnded event...');

      let actualCharityAmount = charityDecimal;

      try {
        const { event, charityAmountDecimal } = await fetchAndParseRoomEndedEvent(
          connection,
          endRoomTxHash,
          decimals,
          10
        );

        if (event && charityAmountDecimal) {
          actualCharityAmount = charityAmountDecimal;

          console.log('[Solana][EndRoom] ✅ RoomEnded event parsed successfully');
          console.log('[Solana][EndRoom] 💰 Actual charity amount:', actualCharityAmount, currency);
          console.log('[Solana][EndRoom]   Platform amount:', event.platformAmount.toString());
          console.log('[Solana][EndRoom]   Host amount:', event.hostAmount.toString());
          console.log('[Solana][EndRoom]   Prize amount:', event.prizeAmount.toString());
          console.log('[Solana][EndRoom]   Total players:', event.totalPlayers);

          if (actualCharityAmount !== charityDecimal) {
            console.warn('[Solana][EndRoom] ⚠️ Preview vs actual mismatch:');
            console.warn('[Solana][EndRoom]   Preview:', charityDecimal, currency);
            console.warn('[Solana][EndRoom]   Actual:', actualCharityAmount, currency);
          } else {
            console.log('[Solana][EndRoom] ✅ Preview matches actual charity amount');
          }
        } else {
          console.warn('[Solana][EndRoom] ⚠️ Could not parse RoomEnded event, using preview');
        }
      } catch (parseError: any) {
        console.error('[Solana][EndRoom] ❌ Event parsing error:', parseError.message);
        console.warn('[Solana][EndRoom] ⚠️ Falling back to preview calculation');
      }

      // ============================================================================
      // STEP 11: RETURN RESULT
      // ============================================================================

      const explorerUrl = getTxExplorerUrl(endRoomTxHash);

      console.log('[Solana][EndRoom] 🎉 Prize distribution complete!');
      console.log('[Solana][EndRoom] 🔗 Declare winners tx:', getTxExplorerUrl(declareWinnersTxHash));
      console.log('[Solana][EndRoom] 🔗 Distribute tx:', explorerUrl);

      return {
        success: true,
        txHash: endRoomTxHash,
        explorerUrl,
        charityAmount: actualCharityAmount,
        tgbDepositAddress: charityWallet.toBase58(),
        declareWinnersTxHash,
      } as DistributePrizesResult & {
        declareWinnersTxHash: string;
        tgbDepositAddress: string;
      };
    },
    [publicKey, program, connection, provider, isConnected, getTxExplorerUrl]
  );

  return { endRoom };
}
