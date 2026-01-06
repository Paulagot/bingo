/**
 * Solana Add Prize Asset Hook
 * 
 * Escrows a prize asset into the room's prize vault for asset-based rooms.
 * This must be called after createAssetRoom for each configured prize.
 * 
 * ## Flow:
 * 1. Host approves tokens to their own wallet (done outside this hook)
 * 2. Call addPrizeAsset for prize index 0 (first place)
 * 3. Call addPrizeAsset for prize index 1 (second place) - if configured
 * 4. Call addPrizeAsset for prize index 2 (third place) - if configured
 * 5. Once all prizes deposited, room status changes to Ready
 * 
 * ## Usage
 * 
 * ```typescript
 * const { addPrizeAsset } = useSolanaAddPrizeAsset();
 * 
 * // Add first place prize
 * await addPrizeAsset({
 *   roomId: 'quiz-night-2024',
 *   roomAddress: roomPDA,
 *   prizeIndex: 0, // 0 = first place, 1 = second, 2 = third
 *   prizeMint: usdcMint,
 * });
 * ```
 */

import { useCallback } from 'react';
import { SystemProgram, SYSVAR_RENT_PUBKEY, PublicKey } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID, getAssociatedTokenAddress } from '@solana/spl-token';

import { useSolanaShared } from './useSolanaShared';
import { derivePrizeVaultPDA } from '../utils/pda';
import { 
  buildTransaction, 
  simulateTransaction, 
  formatTransactionError 
} from '../utils/transaction-helpers';
import type { AddPrizeAssetParams, AddPrizeAssetResult } from '../utils/types';

export function useSolanaAddPrizeAsset() {
  const { 
    publicKey, 
    connection, 
    provider, 
    program, 
    isConnected,
    getTxExplorerUrl,
  } = useSolanaShared();

  const addPrizeAsset = useCallback(
    async (params: AddPrizeAssetParams): Promise<AddPrizeAssetResult> => {
      console.log('[Solana][AddPrizeAsset] 🎁 Starting prize deposit...');
      console.log('[Solana][AddPrizeAsset] 📋 Parameters:', {
        roomId: params.roomId,
        roomAddress: params.roomAddress,
        prizeIndex: params.prizeIndex,
        prizeMint: params.prizeMint,
      });

      // ============================================================================
      // Step 1: Connection & Wallet Validation
      // ============================================================================
      
      if (!isConnected || !publicKey || !program || !provider || !connection) {
        console.error('[Solana][AddPrizeAsset] ❌ Wallet not connected');
        throw new Error('Wallet not connected. Please connect your Solana wallet.');
      }

      console.log('[Solana][AddPrizeAsset] ✅ Wallet connected:', publicKey.toBase58());

      // ============================================================================
      // Step 2: Validate Parameters
      // ============================================================================
      
      if (!params.roomId || !params.roomAddress || params.prizeIndex === undefined) {
        throw new Error('Missing required parameters: roomId, roomAddress, prizeIndex');
      }

      if (params.prizeIndex < 0 || params.prizeIndex > 2) {
        throw new Error('Prize index must be 0 (1st), 1 (2nd), or 2 (3rd)');
      }

      // Convert addresses to PublicKeys
      let roomPDA: PublicKey;
      let prizeMintPubkey: PublicKey;

      try {
        roomPDA = typeof params.roomAddress === 'string' 
          ? new PublicKey(params.roomAddress) 
          : params.roomAddress;
      } catch (e: any) {
        throw new Error(`Invalid room address: ${e.message}`);
      }

      try {
        prizeMintPubkey = typeof params.prizeMint === 'string' 
          ? new PublicKey(params.prizeMint) 
          : params.prizeMint;
      } catch (e: any) {
        throw new Error(`Invalid prize mint: ${e.message}`);
      }

      console.log('[Solana][AddPrizeAsset] ✅ Parameters validated');

      // ============================================================================
      // Step 3: Fetch Room Account
      // ============================================================================
      
      console.log('[Solana][AddPrizeAsset] 🔍 Fetching room account...');

      let roomAccount;
      try {
        roomAccount = await (program.account as any).room.fetch(roomPDA);
      } catch (error: any) {
        throw new Error(`Room not found at ${roomPDA.toBase58()}: ${error.message}`);
      }

      console.log('[Solana][AddPrizeAsset] ✅ Room found:', {
        roomId: roomAccount.roomId,
        status: Object.keys(roomAccount.status)[0],
        host: roomAccount.host.toBase58(),
      });

      // Verify we're the host
      if (roomAccount.host.toBase58() !== publicKey.toBase58()) {
        throw new Error('Only the room host can add prize assets');
      }

      // Verify room is asset-based
      const prizeMode = Object.keys(roomAccount.prizeMode)[0];
      if (prizeMode !== 'assetBased') {
        throw new Error('Room is not an asset-based room');
      }

      // Verify prize exists at this index
      const prizeAsset = roomAccount.prizeAssets[params.prizeIndex];
      if (!prizeAsset) {
        throw new Error(`No prize configured at index ${params.prizeIndex}`);
      }

      // Verify prize not already deposited
      if (prizeAsset.deposited) {
        throw new Error(`Prize ${params.prizeIndex + 1} already deposited`);
      }

      // Verify mint matches
      if (prizeAsset.mint.toBase58() !== prizeMintPubkey.toBase58()) {
        throw new Error(
          `Prize mint mismatch. Expected: ${prizeAsset.mint.toBase58()}, Got: ${prizeMintPubkey.toBase58()}`
        );
      }

      console.log('[Solana][AddPrizeAsset] 🎁 Prize info:', {
        index: params.prizeIndex,
        place: params.prizeIndex + 1,
        type: Object.keys(prizeAsset.prizeType)[0],
        mint: prizeAsset.mint.toBase58(),
        amount: prizeAsset.amount.toString(),
        deposited: prizeAsset.deposited,
      });

      // ============================================================================
      // Step 4: Derive PDAs and Token Accounts
      // ============================================================================
      
      console.log('[Solana][AddPrizeAsset] 🔑 Deriving PDAs and token accounts...');

      const [prizeVault] = derivePrizeVaultPDA(roomPDA, params.prizeIndex);
      const hostTokenAccount = await getAssociatedTokenAddress(
        prizeMintPubkey,
        publicKey
      );

      console.log('[Solana][AddPrizeAsset] Accounts:', {
        prizeVault: prizeVault.toBase58(),
        hostTokenAccount: hostTokenAccount.toBase58(),
        prizeMint: prizeMintPubkey.toBase58(),
      });

      // ============================================================================
      // Step 5: Check Host Token Balance
      // ============================================================================
      
      console.log('[Solana][AddPrizeAsset] 💰 Checking host token balance...');

      let hostBalance;
      try {
        const accountInfo = await connection.getTokenAccountBalance(hostTokenAccount);
        hostBalance = BigInt(accountInfo.value.amount);
      } catch (error: any) {
        throw new Error(
          `Host does not have a token account for ${prizeMintPubkey.toBase58()}. ` +
          `Please create one first or fund your wallet with the prize tokens.`
        );
      }

      const requiredAmount = BigInt(prizeAsset.amount.toString());

      if (hostBalance < requiredAmount) {
        throw new Error(
          `Insufficient token balance. Required: ${requiredAmount.toString()}, ` +
          `Available: ${hostBalance.toString()}`
        );
      }

      console.log('[Solana][AddPrizeAsset] ✅ Sufficient token balance:', {
        required: requiredAmount.toString(),
        available: hostBalance.toString(),
      });

      // ============================================================================
      // Step 6: Build Instruction
      // ============================================================================
      
      console.log('[Solana][AddPrizeAsset] 🔨 Building add_prize_asset instruction...');

      let instruction;
      try {
        if (!program || !program.methods) {
          throw new Error('Program methods not available');
        }
        
        const programMethods = program.methods as any;
        
        instruction = await programMethods
          .addPrizeAsset(
            params.roomId,
            params.prizeIndex
          )
          .accounts({
            room: roomPDA,
            prizeVault: prizeVault,
            prizeMint: prizeMintPubkey,
            hostTokenAccount: hostTokenAccount,
            host: publicKey,
            systemProgram: SystemProgram.programId,
            tokenProgram: TOKEN_PROGRAM_ID,
            rent: SYSVAR_RENT_PUBKEY,
          })
          .instruction();
        
        console.log('[Solana][AddPrizeAsset] ✅ Instruction built successfully');
      } catch (error: any) {
        console.error('[Solana][AddPrizeAsset] ❌ Failed to build instruction:', error);
        throw new Error(`Failed to build transaction: ${error.message}`);
      }

      // ============================================================================
      // Step 7: Build Transaction
      // ============================================================================
      
      console.log('[Solana][AddPrizeAsset] 📦 Building transaction...');
      
      let transaction;
      try {
        transaction = await buildTransaction(connection, [instruction], publicKey);
        console.log('[Solana][AddPrizeAsset] ✅ Transaction built');
      } catch (error: any) {
        console.error('[Solana][AddPrizeAsset] ❌ Failed to build transaction:', error);
        throw new Error(`Failed to build transaction: ${error.message}`);
      }

      // ============================================================================
      // Step 8: Simulate Transaction
      // ============================================================================
      
      console.log('[Solana][AddPrizeAsset] 🧪 Simulating transaction...');
      
      const simResult = await simulateTransaction(connection, transaction);
      
      if (!simResult.success) {
        console.error('[Solana][AddPrizeAsset] ❌ Simulation failed');
        console.error('[Solana][AddPrizeAsset] Error:', simResult.error);
        console.error('[Solana][AddPrizeAsset] Logs:', simResult.logs);
        
        const errorMsg = formatTransactionError(simResult.error);
        throw new Error(`Transaction simulation failed: ${errorMsg}`);
      }
      
      console.log('[Solana][AddPrizeAsset] ✅ Simulation successful');

      // ============================================================================
      // Step 9: Send and Confirm Transaction
      // ============================================================================
      
      console.log('[Solana][AddPrizeAsset] 📤 Sending transaction...');
      
      let signature: string;
      try {
        signature = await provider.sendAndConfirm(transaction, [], {
          skipPreflight: false,
          commitment: 'confirmed',
        });
        
        console.log('[Solana][AddPrizeAsset] ✅ Transaction confirmed');
        console.log('[Solana][AddPrizeAsset] 📝 Signature:', signature);
      } catch (error: any) {
        console.error('[Solana][AddPrizeAsset] ❌ Transaction failed:', error);
        
        const errorMsg = formatTransactionError(error);
        throw new Error(`Transaction failed: ${errorMsg}`);
      }

      // ============================================================================
      // Step 10: Fetch Updated Room Status
      // ============================================================================
      
      console.log('[Solana][AddPrizeAsset] 🔍 Fetching updated room status...');

      let updatedRoom;
      try {
        updatedRoom = await (program.account as any).room.fetch(roomPDA);
      } catch (error: any) {
        console.warn('[Solana][AddPrizeAsset] ⚠️ Could not fetch updated room:', error.message);
      }

      const newStatus = updatedRoom ? Object.keys(updatedRoom.status)[0] : 'Unknown';
      const allDeposited = updatedRoom 
        ? updatedRoom.prizeAssets.every((asset: any) => !asset || asset.deposited)
        : false;

      console.log('[Solana][AddPrizeAsset] Updated room status:', {
        status: newStatus,
        allDeposited,
      });

      // ============================================================================
      // Step 11: Success!
      // ============================================================================
      
      const explorerUrl = getTxExplorerUrl(signature);
      
      console.log('[Solana][AddPrizeAsset] ✅ Prize asset deposited successfully!');
      console.log('[Solana][AddPrizeAsset] 🎁 Prize:', {
        index: params.prizeIndex,
        place: params.prizeIndex + 1,
        amount: prizeAsset.amount.toString(),
      });
      console.log('[Solana][AddPrizeAsset] 📍 Prize vault:', prizeVault.toBase58());
      
      if (allDeposited) {
        console.log('[Solana][AddPrizeAsset] 🎉 All prizes deposited! Room is now Ready for players.');
      } else {
        console.log('[Solana][AddPrizeAsset] ⏳ More prizes needed. Call addPrizeAsset for remaining prizes.');
      }

      return {
        success: true,
        txHash: signature,
        explorerUrl,
        prizeIndex: params.prizeIndex,
        newStatus: newStatus || 'Unknown', // ✅ Ensure it's never undefined
        allDeposited,
      };
    },
    [publicKey, connection, provider, program, isConnected, getTxExplorerUrl]
  );

  return { addPrizeAsset };
}