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
 * 
 * ## Usage
 * 
 * ```typescript
 * const { endRoom } = useSolanaEndRoom();
 * 
 * const result = await endRoom({
 *   roomId: 'quiz-123',
 *   roomAddress: roomPDA,
 *   winners: [alicePubkey, bobPubkey, carolPubkey],
 *   charityOrgId: 'tgb-org-id',  // Optional: for TGB integration
 *   charityWallet: fallbackPubkey, // Fallback if TGB fails
 * });
 * 
 * if (result.success) {
 *   console.log('✅ Prizes distributed!');
 *   console.log('  Declare tx:', result.declareWinnersTxHash);
 *   console.log('  Distribute tx:', result.txHash);
 *   console.log('  Charity amount:', result.charityAmount);
 * }
 * ```
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
import { getTokenConfig } from '../config/tokens';
import { getTgbNetworkLabel } from '../../tgbNetworks';
import { fetchAndParseRoomEndedEvent } from '../utils/event-praser';

import type {
  DistributePrizesParams,
  DistributePrizesResult,
  SolanaTokenSymbol,
} from '../utils/types';

/**
 * Hook for ending Solana quiz rooms and distributing prizes
 */
export function useSolanaEndRoom() {
  const {
    publicKey,
    program,
    connection,
    provider,
    isConnected,
    cluster,
    getTxExplorerUrl,
  } = useSolanaShared();

  /**
   * End room and distribute prizes (two-step flow)
   */
  const endRoom = useCallback(
    async (params: DistributePrizesParams): Promise<DistributePrizesResult> => {
      console.log('[Solana][EndRoom] 🏆 Starting two-step prize distribution...');
      console.log('[Solana][EndRoom] Params:', params);

      // ============================================================================
      // STEP 1: Validate wallet connection
      // ============================================================================

      if (!isConnected || !publicKey || !program || !connection || !provider) {
        const missing = [];
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

      if (!roomId) {
        throw new Error('Room ID is required');
      }

      if (!roomAddress) {
        throw new Error('Room address is required');
      }

      if (!winners || winners.length === 0) {
        throw new Error('At least one winner is required');
      }

      if (winners.length > 10) {
        throw new Error('Maximum 10 winners allowed');
      }

      // Convert winner addresses to PublicKeys
      let winnerPublicKeys: PublicKey[] = winners.map((addr) => {
        try {
          return typeof addr === 'string' ? new PublicKey(addr) : addr;
        } catch (e: any) {
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
      const totalCollected = new BN(roomAccount.totalCollected.toString());
      const totalEntryFees = new BN(roomAccount.totalEntryFees.toString());
      const totalExtrasFees = new BN(roomAccount.totalExtrasFees.toString());
      const hostFeeBps = roomAccount.hostFeeBps;
      const prizePoolBps = roomAccount.prizePoolBps;

      console.log('[Solana][EndRoom] ✅ Room data fetched:');
      console.log('[Solana][EndRoom]   Host:', host.toBase58());
      console.log('[Solana][EndRoom]   Token mint:', tokenMint.toBase58());
      console.log('[Solana][EndRoom]   Total collected:', totalCollected.toString());
      console.log('[Solana][EndRoom]   Entry fees:', totalEntryFees.toString());
      console.log('[Solana][EndRoom]   Extras:', totalExtrasFees.toString());

      // ✅ NEW: Handle asset-based room winner count validation
      const prizeMode = Object.keys(roomAccount.prizeMode)[0]; // 'poolSplit' or 'assetBased'
      console.log('[Solana][EndRoom]   Prize mode:', prizeMode);

      if (prizeMode === 'assetBased') {
        console.log('[Solana][EndRoom] 🎁 Asset-based room detected - validating winner count...');
        
        const prizeAssets = roomAccount.prizeAssets || [];
        
        // Log each prize asset to see structure
        console.log('[Solana][EndRoom] 🔍 Examining prize assets:');
        prizeAssets.forEach((asset: any, idx: number) => {
          if (asset) {
            console.log(`[Solana][EndRoom]   Slot ${idx}:`, {
              exists: true,
              deposited: asset.deposited,
              mint: asset.mint?.toBase58?.() || 'unknown',
              amount: asset.amount?.toString?.() || 'unknown'
            });
          } else {
            console.log(`[Solana][EndRoom]   Slot ${idx}: null (no prize configured)`);
          }
        });
        
        const depositedPrizeCount = prizeAssets.filter((asset: any) => {
          const isValid = asset !== null && asset.deposited === true;
          return isValid;
        }).length;
        
        console.log('[Solana][EndRoom]   Prize slots configured:', prizeAssets.length);
        console.log('[Solana][EndRoom]   Prizes actually deposited:', depositedPrizeCount);
        console.log('[Solana][EndRoom]   Winners provided:', winnerPublicKeys.length);
        
        if (depositedPrizeCount === 0) {
          throw new Error('No prizes have been deposited for this asset room');
        }
        
        // Handle TOO MANY winners - trim to match prize count
        if (winnerPublicKeys.length > depositedPrizeCount) {
          const originalCount = winnerPublicKeys.length;
          
          console.warn('[Solana][EndRoom] ⚠️ Too many winners for asset room prizes');
          console.warn('[Solana][EndRoom] ⚠️ Deposited prizes:', depositedPrizeCount);
          console.warn('[Solana][EndRoom] ⚠️ Winners provided:', originalCount);
          console.warn('[Solana][EndRoom] 🔧 Trimming to top', depositedPrizeCount, 'winner(s)');
          
          // Only keep top N winners (where N = depositedPrizeCount)
          winnerPublicKeys = winnerPublicKeys.slice(0, depositedPrizeCount);
          
          console.log('[Solana][EndRoom] ✅ Trimmed winners:', winnerPublicKeys.length);
        }
        
        // Pad winners array to match prize count (host gets unclaimed prizes)
        if (winnerPublicKeys.length < depositedPrizeCount) {
          const originalCount = winnerPublicKeys.length;
          
          console.warn('[Solana][EndRoom] ⚠️ Asset room requires exactly', depositedPrizeCount, 'winners');
          console.warn('[Solana][EndRoom] ⚠️ Only', originalCount, 'winners provided');
          console.warn('[Solana][EndRoom] 🔧 Padding with host address for unclaimed prizes');
          
          // Add host as winner for unclaimed prizes
          while (winnerPublicKeys.length < depositedPrizeCount) {
            winnerPublicKeys.push(host);
            console.log('[Solana][EndRoom]   Added host for prize #' + winnerPublicKeys.length);
          }
          
          console.log('[Solana][EndRoom] ✅ Final winner count:', winnerPublicKeys.length);
        }
        
        console.log('[Solana][EndRoom] ✅ Winner count matches deposited prize count:', winnerPublicKeys.length);
      }

      // ============================================================================
      // STEP 4: Calculate charity preview (for TGB API call)
      // ============================================================================

      // Get token config
      let currency: SolanaTokenSymbol = 'USDC'; // Default
      
      // Try to determine currency from mint (simplified - you might want better logic)
      if (tokenMint.toBase58() === getTokenConfig('USDC', cluster).mint.toBase58()) {
        currency = 'USDC';
      } else if (tokenMint.toBase58() === getTokenConfig('PYUSD', cluster).mint.toBase58()) {
        currency = 'PYUSD';
      } else if (tokenMint.toBase58() === getTokenConfig('USDT', cluster).mint.toBase58()) {
        currency = 'USDT';
      }

      const tokenConfig = getTokenConfig(currency, cluster);
      const decimals = tokenConfig.decimals;

      // Calculate charity preview based on prize mode
      let charityAmountPreview: BN;
      let charityDecimal: string;

      if (prizeMode === 'assetBased') {
        // For asset rooms, all entry fees go to charity (no prize pool from fees)
        console.log('[Solana][EndRoom] 💰 Asset room charity calculation:');
        
        const PLATFORM_FEE_BPS = 2000; // 20%
        const totalPool = totalEntryFees.add(totalExtrasFees);
        
        const platformFee = totalPool.mul(new BN(PLATFORM_FEE_BPS)).div(new BN(10000));
        const hostFee = totalPool.mul(new BN(hostFeeBps)).div(new BN(10000));
        
        // Asset rooms: No prize_pool_bps deduction (prizes are pre-deposited assets)
        charityAmountPreview = totalPool.sub(platformFee).sub(hostFee);
        charityDecimal = (Number(charityAmountPreview.toString()) / Math.pow(10, decimals)).toFixed(2);
        
        console.log('[Solana][EndRoom]   Total pool:', totalPool.toString());
        console.log('[Solana][EndRoom]   Platform fee:', platformFee.toString());
        console.log('[Solana][EndRoom]   Host fee:', hostFee.toString());
        console.log('[Solana][EndRoom]   Prize pool fee: 0 (asset-based)');
        console.log('[Solana][EndRoom]   Charity (preview):', charityAmountPreview.toString());
      } else {
        // Pool room calculation
        console.log('[Solana][EndRoom] 💰 Pool room charity calculation:');
        
        const PLATFORM_FEE_BPS = 2000; // 20%
        const totalPool = totalEntryFees.add(totalExtrasFees);
        
        const platformFee = totalPool.mul(new BN(PLATFORM_FEE_BPS)).div(new BN(10000));
        const hostFee = totalPool.mul(new BN(hostFeeBps)).div(new BN(10000));
        const prizeFee = totalPool.mul(new BN(prizePoolBps)).div(new BN(10000));
        
        charityAmountPreview = totalPool.sub(platformFee).sub(hostFee).sub(prizeFee);
        charityDecimal = (Number(charityAmountPreview.toString()) / Math.pow(10, decimals)).toFixed(2);
        
        console.log('[Solana][EndRoom]   Total pool:', totalPool.toString());
        console.log('[Solana][EndRoom]   Platform fee:', platformFee.toString());
        console.log('[Solana][EndRoom]   Host fee:', hostFee.toString());
        console.log('[Solana][EndRoom]   Prize fee:', prizeFee.toString());
        console.log('[Solana][EndRoom]   Charity (preview):', charityAmountPreview.toString());
      }
      
      console.log('[Solana][EndRoom]   Charity (decimal):', charityDecimal, currency);

      // ============================================================================
      // STEP 5: Derive PDAs
      // ============================================================================

      console.log('[Solana][EndRoom] 🔑 Deriving PDAs...');

      const [roomVault] = deriveRoomVaultPDA(roomPDA);
      const [globalConfig] = deriveGlobalConfigPDA();

      // Derive PlayerEntry PDAs for each winner (needed for declare_winners validation)
      let playerEntryPDAs: PublicKey[] = [];
      for (const winner of winnerPublicKeys) {
        const [playerEntry] = derivePlayerEntryPDA(roomPDA, winner);
        playerEntryPDAs.push(playerEntry);
      }

      console.log('[Solana][EndRoom] ✅ PDAs derived');
      console.log('[Solana][EndRoom]   Room vault:', roomVault.toBase58());
      console.log('[Solana][EndRoom]   Global config:', globalConfig.toBase58());
      console.log('[Solana][EndRoom]   Player entries:', playerEntryPDAs.length);
      console.log('[Solana][EndRoom]   Final winners:', winnerPublicKeys.length);

      // ============================================================================
      // STEP 6A: DECLARE WINNERS (First Transaction)
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

      // Simulate declare_winners
      console.log('[Solana][EndRoom] 🧪 Simulating declare_winners...');
      const declareSimulation = await simulateTransaction(connection, declareTx);

      if (!declareSimulation.success) {
        console.error('[Solana][EndRoom] ❌ Declare winners simulation failed:', declareSimulation.error);
        console.error('[Solana][EndRoom] ❌ Simulation logs:', declareSimulation.logs);
        throw new Error(`Declare winners simulation failed: ${declareSimulation.error}`);
      }

      console.log('[Solana][EndRoom] ✅ Declare winners simulation successful');

      // Send declare_winners transaction
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
      // STEP 6B: GET TGB CHARITY ADDRESS (Between Transactions)
      // ============================================================================

      let charityWallet: PublicKey;

      if (charityOrgId && Number(charityAmountPreview.toString()) > 0) {
        console.log('[Solana][EndRoom] 🌐 Getting TGB charity address...');

        try {
          const tgbNetwork = getTgbNetworkLabel({
            web3Chain: 'solana',
            evmTargetKey: null,
            solanaCluster: cluster === 'testnet' ? 'devnet' : cluster as 'mainnet' | 'devnet',
          });

          const response = await fetch('/api/tgb/create-deposit-address', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              organizationId: charityOrgId,
              currency: currency,
              network: tgbNetwork,
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

          if (!params.charityWallet) {
            throw new Error('TGB API failed and no fallback charity wallet provided');
          }

          charityWallet = typeof params.charityWallet === 'string' 
            ? new PublicKey(params.charityWallet)
            : params.charityWallet;

          console.log('[Solana][EndRoom] ⚠️ Using fallback charity wallet:', charityWallet.toBase58());
        }
      } else {
        if (!params.charityWallet) {
          throw new Error('Charity wallet is required');
        }

        charityWallet = typeof params.charityWallet === 'string'
          ? new PublicKey(params.charityWallet)
          : params.charityWallet;

        console.log('[Solana][EndRoom] 📍 Using provided charity wallet:', charityWallet.toBase58());
      }

      // ============================================================================
      // STEP 7: DERIVE TOKEN ACCOUNTS (ATAs)
      // ============================================================================

      console.log('[Solana][EndRoom] 🔍 Deriving token accounts...');

      // Read GlobalConfig to get platform wallet
      const globalConfigData = await connection.getAccountInfo(globalConfig);
      if (!globalConfigData) {
        throw new Error('GlobalConfig account not found');
      }

      // Parse GlobalConfig to get platform wallet
      // Simplified - you may need to properly deserialize based on your GlobalConfig structure
      const platformWalletOffset = 8; // Discriminator
      const platformWalletBytes = globalConfigData.data.slice(platformWalletOffset, platformWalletOffset + 32);
      const platformWallet = new PublicKey(platformWalletBytes);

      console.log('[Solana][EndRoom] 🏢 Platform wallet:', platformWallet.toBase58());

      // Derive Associated Token Accounts
      const platformTokenAccount = await getAssociatedTokenAddress(tokenMint, platformWallet);
      const charityTokenAccount = await getAssociatedTokenAddress(tokenMint, charityWallet);
      const hostTokenAccount = await getAssociatedTokenAddress(tokenMint, host);

      // Derive winner token accounts
      const winnerTokenAccounts: PublicKey[] = [];
      for (const winner of winnerPublicKeys) {
        const winnerATA = await getAssociatedTokenAddress(tokenMint, winner);
        winnerTokenAccounts.push(winnerATA);
      }

      console.log('[Solana][EndRoom] ✅ Token accounts derived');
      console.log('[Solana][EndRoom]   Platform ATA:', platformTokenAccount.toBase58());
      console.log('[Solana][EndRoom]   Charity ATA:', charityTokenAccount.toBase58());
      console.log('[Solana][EndRoom]   Host ATA:', hostTokenAccount.toBase58());
      console.log('[Solana][EndRoom]   Winner ATAs:', winnerTokenAccounts.length);

      // ============================================================================
      // STEP 7B: CREATE ATAs IF THEY DON'T EXIST
      // ============================================================================

      console.log('[Solana][EndRoom] 🔍 Checking if ATAs exist...');

      const { createAssociatedTokenAccountInstruction } = await import('@solana/spl-token');
      const ataInstructions: any[] = [];

      // Check and create platform ATA
      const platformATA = await connection.getAccountInfo(platformTokenAccount);
      if (!platformATA) {
        console.log('[Solana][EndRoom] 📝 Creating platform ATA...');
        ataInstructions.push(
          createAssociatedTokenAccountInstruction(
            publicKey, // payer
            platformTokenAccount, // ata
            platformWallet, // owner
            tokenMint // mint
          )
        );
      }

      // Check and create charity ATA
      const charityATA = await connection.getAccountInfo(charityTokenAccount);
      if (!charityATA) {
        console.log('[Solana][EndRoom] 📝 Creating charity ATA...');
        ataInstructions.push(
          createAssociatedTokenAccountInstruction(
            publicKey, // payer
            charityTokenAccount, // ata
            charityWallet, // owner
            tokenMint // mint
          )
        );
      }

      // Check and create host ATA
      const hostATA = await connection.getAccountInfo(hostTokenAccount);
      if (!hostATA) {
        console.log('[Solana][EndRoom] 📝 Creating host ATA...');
        ataInstructions.push(
          createAssociatedTokenAccountInstruction(
            publicKey, // payer
            hostTokenAccount, // ata
            host, // owner
            tokenMint // mint
          )
        );
      }

      // Check and create winner ATAs
      for (let i = 0; i < winnerPublicKeys.length; i++) {
        const winner = winnerPublicKeys[i];
        const winnerATA = winnerTokenAccounts[i];
        
        if (!winner || !winnerATA) {
          console.warn('[Solana][EndRoom] ⚠️ Skipping invalid winner at index:', i);
          continue;
        }
        
        const winnerATAInfo = await connection.getAccountInfo(winnerATA);
        
        if (!winnerATAInfo) {
          console.log('[Solana][EndRoom] 📝 Creating winner ATA for:', winner.toBase58().slice(0, 8) + '...');
          ataInstructions.push(
            createAssociatedTokenAccountInstruction(
              publicKey, // payer
              winnerATA, // ata
              winner, // owner
              tokenMint // mint
            )
          );
        }
      }

      // Send ATA creation transaction if needed
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
      // STEP 7C: BUILD REMAINING ACCOUNTS FOR end_room
      // ============================================================================
      // Note: Prize vaults will be derived inline when building remaining accounts

      // ============================================================================
      // STEP 8: END ROOM (Second Transaction - Distribute Funds)
      // ============================================================================

      console.log('[Solana][EndRoom] 💰 Step 2/2: Distributing prizes...');

      // Create intent ID hash (for deduplication)
      const offchainIntentId = `FR-${roomId}-${Date.now()}`;
      const intentIdBytes = new TextEncoder().encode(offchainIntentId.padEnd(32, '\0'));
      const intentIdHash = Array.from(keccak_256(intentIdBytes));

      console.log('[Solana][EndRoom] 🔐 Intent ID:', offchainIntentId);

      if (!program.methods?.endRoom) {
        throw new Error('Program methods not available');
      }

      // Build remaining accounts based on prize mode
      let remainingAccounts: any[] = [];

      if (prizeMode === 'assetBased') {
        // Asset room expects specific order per end_room.rs:
        // [0..winners.len()] = PlayerEntry PDAs
        // [winners.len()..winners.len()*2] = Winner token accounts (ATAs)
        // [winners.len()*2..winners.len()*2+3] = Prize vault accounts (all 3 slots)
        
        console.log('[Solana][EndRoom] 🎁 Asset room - building remaining accounts in contract order');
        
        // Step 1: Add PlayerEntry PDAs
        playerEntryPDAs.forEach((pda, idx) => {
          console.log('[Solana][EndRoom]   [' + idx + '] PlayerEntry PDA:', pda.toBase58());
          remainingAccounts.push({
            pubkey: pda,
            isSigner: false,
            isWritable: false,
          });
        });
        
        // Step 2: Add Winner token accounts
        winnerTokenAccounts.forEach((ata, idx) => {
          const accountIndex = playerEntryPDAs.length + idx;
          console.log('[Solana][EndRoom]   [' + accountIndex + '] Winner ATA:', ata.toBase58());
          remainingAccounts.push({
            pubkey: ata,
            isSigner: false,
            isWritable: true,
          });
        });
        
        // Step 3: Add ALL 3 prize vaults (contract loops through all 3)
        for (let i = 0; i < 3; i++) {
          const [prizeVault] = derivePrizeVaultPDA(roomPDA, i);
          const accountIndex = playerEntryPDAs.length + winnerTokenAccounts.length + i;
          console.log('[Solana][EndRoom]   [' + accountIndex + '] Prize Vault slot', i + 1, ':', prizeVault.toBase58());
          remainingAccounts.push({
            pubkey: prizeVault,
            isSigner: false,
            isWritable: true,
          });
        }
        
        console.log('[Solana][EndRoom]   PlayerEntry PDAs:', playerEntryPDAs.length);
        console.log('[Solana][EndRoom]   Winner ATAs:', winnerTokenAccounts.length);
        console.log('[Solana][EndRoom]   Prize vaults: 3 (all slots)');
        console.log('[Solana][EndRoom]   Total remaining accounts:', remainingAccounts.length);
        console.log('[Solana][EndRoom]   Expected formula: PDAs(' + playerEntryPDAs.length + ') + ATAs(' + winnerTokenAccounts.length + ') + Vaults(3) = ' + (playerEntryPDAs.length + winnerTokenAccounts.length + 3));
      } else {
        // Pool room: only winner ATAs
        remainingAccounts = winnerTokenAccounts.map((ata) => ({
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
          [] // Empty array - winners already declared in step 1
        )
        .accounts({
          room: roomPDA,
          roomVault: roomVault,
          globalConfig: globalConfig,
          platformTokenAccount: platformTokenAccount,
          charityTokenAccount: charityTokenAccount,
          hostTokenAccount: hostTokenAccount,
          host: publicKey,
          charityWallet: charityWallet,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .remainingAccounts(remainingAccounts)
        .instruction();

      const endRoomTx = await buildTransaction(connection, [endRoomInstruction], publicKey);

      // Simulate end_room
      console.log('[Solana][EndRoom] 🧪 Simulating end_room...');
      const endRoomSimulation = await simulateTransaction(connection, endRoomTx);

      if (!endRoomSimulation.success) {
        console.error('[Solana][EndRoom] ❌ End room simulation failed:', endRoomSimulation.error);
        console.error('[Solana][EndRoom] ❌ Simulation logs:', endRoomSimulation.logs);
        throw new Error(`End room simulation failed: ${endRoomSimulation.error}`);
      }

      console.log('[Solana][EndRoom] ✅ End room simulation successful');

      // Send end_room transaction
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
      // STEP 9: PARSE RoomEnded EVENT (Get Actual Charity Amount)
      // ============================================================================

      console.log('[Solana][EndRoom] 📊 Parsing RoomEnded event...');

      let actualCharityAmount = charityDecimal; // Fallback to preview

      try {
        // Fetch transaction and parse event
        const { event, charityAmountDecimal } = await fetchAndParseRoomEndedEvent(
          connection,
          endRoomTxHash,
          decimals,
          10 // Max 10 retries
        );

        if (event && charityAmountDecimal) {
          actualCharityAmount = charityAmountDecimal;
          
          console.log('[Solana][EndRoom] ✅ RoomEnded event parsed successfully');
          console.log('[Solana][EndRoom] 💰 Actual charity amount from event:', actualCharityAmount, currency);
          console.log('[Solana][EndRoom] 📊 Event details:');
          console.log('[Solana][EndRoom]   Platform amount:', event.platformAmount.toString());
          console.log('[Solana][EndRoom]   Host amount:', event.hostAmount.toString());
          console.log('[Solana][EndRoom]   Prize amount:', event.prizeAmount.toString());
          console.log('[Solana][EndRoom]   Total players:', event.totalPlayers);

          // Verify preview matches actual (warn if different)
          if (actualCharityAmount !== charityDecimal) {
            console.warn('[Solana][EndRoom] ⚠️ MISMATCH:');
            console.warn('[Solana][EndRoom]   Preview:', charityDecimal, currency);
            console.warn('[Solana][EndRoom]   Actual:', actualCharityAmount, currency);
            console.warn('[Solana][EndRoom]   Using actual amount from blockchain event');
          } else {
            console.log('[Solana][EndRoom] ✅ Preview matches actual charity amount');
          }
        } else {
          console.warn('[Solana][EndRoom] ⚠️ Could not parse RoomEnded event');
          console.warn('[Solana][EndRoom] ⚠️ Using preview calculation:', charityDecimal, currency);
          console.warn('[Solana][EndRoom] ⚠️ TGB reporting may be inaccurate');
        }
      } catch (parseError: any) {
        console.error('[Solana][EndRoom] ❌ Event parsing error:', parseError.message);
        console.warn('[Solana][EndRoom] ⚠️ Falling back to preview calculation');
      }

      // ============================================================================
      // STEP 10: RETURN RESULT
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
        // Additional Solana-specific fields
        declareWinnersTxHash, // Included so backend can log both transactions
      } as DistributePrizesResult & { declareWinnersTxHash: string };
    },
    [publicKey, program, connection, provider, isConnected, cluster, getTxExplorerUrl]
  );

  return { endRoom };
}