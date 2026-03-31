/**
 * Solana Join Room Hook
 *
 * ## What changed (new contract)
 *
 * - GlobalConfig PDA removed from join_room accounts
 * - join_room instruction signature is unchanged: joinRoom(roomId, extrasAmount)
 * - Everything else (wSOL wrap, balance checks, PDAs) is identical
 */

import { useCallback } from 'react';
import { PublicKey } from '@solana/web3.js';
import { BN } from '@coral-xyz/anchor';
import { getAssociatedTokenAddress } from '@solana/spl-token';
import {
  buildWrapSolInstructions,
  isNativeSolRoom,
  WSOL_MINT,
} from '../utils/wsolUtils';

import { useSolanaShared } from './useSolanaShared';
import {
  derivePlayerEntryPDA,
  deriveRoomVaultPDA,
} from '../utils/pda';
import {
  buildTransaction,
  simulateTransaction,
  formatTransactionError,
} from '../utils/transaction-helpers';

import {
  getTokenByMint,
  toRawAmount,
  type SolanaTokenCode,
} from '../config/solanaTokenConfig';

import { SOLANA_CONTRACT } from '../config/contracts';
import type { JoinRoomParams, JoinRoomResult } from '../utils/types';

export function useSolanaJoinRoom() {
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
   * Check if player already has an entry for this room
   */
  const checkExistingEntry = useCallback(async (
    roomPDA:         PublicKey,
    playerPublicKey: PublicKey
  ): Promise<boolean> => {
    if (!program) {
      console.warn('[Solana][JoinRoom] ⚠️ Cannot check existing entry: no program');
      return false;
    }

    try {
      const [playerEntry] = derivePlayerEntryPDA(roomPDA, playerPublicKey);
      console.log('[Solana][JoinRoom] 🔍 Checking for existing player entry:', playerEntry.toBase58());

      const playerEntryAccount = await (program.account as any).playerEntry.fetch(playerEntry);

      if (playerEntryAccount) {
        console.log('[Solana][JoinRoom] ✅ Player entry already exists!');
        return true;
      }

      return false;
    } catch (error: any) {
      if (error.message?.includes('Account does not exist')) {
        console.log('[Solana][JoinRoom] ℹ️ No existing player entry found');
        return false;
      }
      console.warn('[Solana][JoinRoom] ⚠️ Error checking existing entry:', error.message);
      return false;
    }
  }, [program]);

  /**
   * Join a room by paying entry fee + optional extras
   */
  const joinRoom = useCallback(async (params: JoinRoomParams): Promise<JoinRoomResult> => {
    console.log('[Solana][JoinRoom] 🎮 Starting join room flow');
    console.log('[Solana][JoinRoom] Params:', params);

    // ============================================================================
    // STEP 1: Validate wallet connection
    // ============================================================================

    if (!isConnected || !publicKey || !program || !connection || !provider) {
      const missing = [];
      if (!isConnected)  missing.push('not connected');
      if (!publicKey)    missing.push('no publicKey');
      if (!program)      missing.push('no program');
      if (!connection)   missing.push('no connection');
      if (!provider)     missing.push('no provider');

      const error = `Wallet not ready: ${missing.join(', ')}`;
      console.error('[Solana][JoinRoom] ❌', error);
      throw new Error(error);
    }

    console.log('[Solana][JoinRoom] ✅ Wallet connected:', publicKey.toBase58());
    console.log('[Solana][JoinRoom] 🌐 Cluster:', cluster);

    // ============================================================================
    // STEP 2: Validate parameters
    // ============================================================================

    const { roomId, extrasAmount = 0 } = params;

    if (!roomId || roomId.length === 0) throw new Error('Room ID is required');

    if (roomId.length > SOLANA_CONTRACT.MAX_ROOM_ID_LENGTH) {
      throw new Error(
        `Room ID too long: ${roomId.length} chars (max ${SOLANA_CONTRACT.MAX_ROOM_ID_LENGTH})`
      );
    }

    if (extrasAmount < 0) throw new Error('Extras amount cannot be negative');

    console.log('[Solana][JoinRoom] ✅ Parameters validated');

    // ============================================================================
    // STEP 3: Get room data
    // ============================================================================

    let roomPDA:         PublicKey;
    let feeTokenMint:    PublicKey;
    let entryFeeRaw:     BN;
    let tokenCode:       SolanaTokenCode;

    try {
      if (params.roomAddress) {
        roomPDA = params.roomAddress;
        console.log('[Solana][JoinRoom] 📍 Using provided room address:', roomPDA.toBase58());
      } else {
        throw new Error(
          'roomAddress parameter is required for Solana join. ' +
          'The host address must be known to derive the room PDA.'
        );
      }

      // Check if player already joined BEFORE fetching room details
      console.log('[Solana][JoinRoom] 🔍 Checking if player already joined...');
      const alreadyJoined = await checkExistingEntry(roomPDA, publicKey);

      if (alreadyJoined) {
        console.log('[Solana][JoinRoom] ✅ Player already joined this room — returning success');
        return {
          success:     true,
          txHash:      'already-joined',
          explorerUrl: getTxExplorerUrl(''),
          alreadyPaid: true,
        };
      }

      // Fetch room account
      console.log('[Solana][JoinRoom] 🔍 Fetching room account...');
      const roomAccount = await (program.account as any).room.fetch(roomPDA);

      feeTokenMint = roomAccount.feeTokenMint as PublicKey;
      entryFeeRaw  = new BN(roomAccount.entryFee.toString());

      console.log('[Solana][JoinRoom] ✅ Room data fetched:');
      console.log('[Solana][JoinRoom]   Token mint:   ', feeTokenMint.toBase58());
      console.log('[Solana][JoinRoom]   Entry fee (raw):', entryFeeRaw.toString());
      console.log('[Solana][JoinRoom]   Player count:', roomAccount.playerCount);
      console.log('[Solana][JoinRoom]   Max players:', roomAccount.maxPlayers);

      const tokenConfig = getTokenByMint(feeTokenMint.toBase58());
      if (!tokenConfig) {
        throw new Error(`Unsupported token mint: ${feeTokenMint.toBase58()}`);
      }
      tokenCode = tokenConfig.code;
      console.log('[Solana][JoinRoom] 💰 Token resolved from mint:', tokenCode);

    } catch (error: any) {
      console.error('[Solana][JoinRoom] ❌ Failed to fetch room:', error);
      throw new Error(`Failed to fetch room: ${error.message}`);
    }

    // ============================================================================
    // STEP 4: Calculate amounts
    // ============================================================================

    let entryFeeBaseUnits: BN;

    if (params.entryFee !== undefined) {
      entryFeeBaseUnits = new BN(toRawAmount(params.entryFee, tokenCode).toString());
      console.log('[Solana][JoinRoom] 💵 Entry fee from params:', params.entryFee, tokenCode, '→', entryFeeBaseUnits.toString());
    } else {
      entryFeeBaseUnits = entryFeeRaw;
      console.log('[Solana][JoinRoom] 💵 Entry fee from chain (raw):', entryFeeBaseUnits.toString());
    }

    const extrasBaseUnits = new BN(toRawAmount(extrasAmount, tokenCode).toString());
    const totalPayment    = entryFeeBaseUnits.add(extrasBaseUnits);

    console.log('[Solana][JoinRoom] 💵 Payment breakdown:');
    console.log('[Solana][JoinRoom]   Entry fee (raw):', entryFeeBaseUnits.toString());
    console.log('[Solana][JoinRoom]   Extras (raw):   ', extrasBaseUnits.toString());
    console.log('[Solana][JoinRoom]   Total (raw):    ', totalPayment.toString());

    // ============================================================================
    // STEP 5: Derive PDAs
    //
    // NOTE: GlobalConfig PDA is GONE in the new contract.
    // ============================================================================

    console.log('[Solana][JoinRoom] 🔑 Deriving PDAs...');

    const [playerEntry] = derivePlayerEntryPDA(roomPDA, publicKey);
    const [roomVault]   = deriveRoomVaultPDA(roomPDA);

    console.log('[Solana][JoinRoom] ✅ PDAs derived:');
    console.log('[Solana][JoinRoom]   PlayerEntry:', playerEntry.toBase58());
    console.log('[Solana][JoinRoom]   RoomVault:  ', roomVault.toBase58());

    // ============================================================================
    // STEP 6: Get player's token account
    // ============================================================================

    console.log('[Solana][JoinRoom] 🔍 Getting player token account...');

    const isSolRoom        = isNativeSolRoom(feeTokenMint);
    const tokenMintForAta  = isSolRoom ? WSOL_MINT : feeTokenMint;
    const playerTokenAccount = await getAssociatedTokenAddress(tokenMintForAta, publicKey);

    console.log('[Solana][JoinRoom] ✅ Player token account:', playerTokenAccount.toBase58());
    console.log('[Solana][JoinRoom] 🪙 SOL room (needs wSOL wrap):', isSolRoom);

    if (!isSolRoom) {
      try {
        const balance    = await connection.getTokenAccountBalance(playerTokenAccount);
        const balanceRaw = BigInt(balance.value.amount);
        const requiredRaw = BigInt(totalPayment.toString());

        console.log('[Solana][JoinRoom] 💰 Token balance (raw):', balanceRaw.toString());
        console.log('[Solana][JoinRoom] 💰 Required (raw):     ', requiredRaw.toString());

        if (balanceRaw < requiredRaw) {
          throw new Error(
            `Insufficient ${tokenCode} balance. ` +
            `Required: ${balance.value.uiAmountString} ${tokenCode}`
          );
        }
      } catch (error: any) {
        if (error.message.includes('could not find account')) {
          throw new Error(
            `You don't have a ${tokenCode} token account. ` +
            `Please add ${tokenCode} to your wallet first.`
          );
        }
        if (error.message.includes('Insufficient')) throw error;
        console.warn('[Solana][JoinRoom] ⚠️ Could not check balance:', error.message);
      }
    } else {
      const solBalance   = await connection.getBalance(publicKey);
      const requiredLamports = BigInt(totalPayment.toString());
      const rentBuffer   = 10_000_000n; // ~0.01 SOL buffer for rent + fees

      console.log('[Solana][JoinRoom] 💰 Native SOL balance (lamports):', solBalance);
      console.log('[Solana][JoinRoom] 💰 Required (lamports):          ', requiredLamports.toString());

      if (BigInt(solBalance) < requiredLamports + rentBuffer) {
        throw new Error(
          `Insufficient SOL balance. ` +
          `Required: ${Number(requiredLamports) / 1e9} SOL + fees, ` +
          `Available: ${solBalance / 1e9} SOL`
        );
      }
    }

    // ============================================================================
    // STEP 7: Build and send transaction
    //
    // NOTE: globalConfig account is GONE from join_room accounts.
    // ============================================================================

    console.log('[Solana][JoinRoom] 🔨 Building join_room instruction...');

    if (!program.methods?.joinRoom) {
      throw new Error('Program methods not available');
    }

    const joinInstruction = await program.methods
      .joinRoom(roomId, extrasBaseUnits)
      .accountsStrict({
        room:               roomPDA,
        playerEntry,
        roomVault,
        playerTokenAccount,
        player:             publicKey,
        tokenProgram:       new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'),
        systemProgram:      new PublicKey('11111111111111111111111111111111'),
      })
      .instruction();

    console.log('[Solana][JoinRoom] ✅ Join instruction built');

    let allInstructions = [joinInstruction];

    if (isSolRoom) {
      console.log('[Solana][JoinRoom] 🔄 SOL room — prepending wSOL wrap instructions');
      const wrapIxs = await buildWrapSolInstructions(
        connection,
        publicKey,
        BigInt(totalPayment.toString())
      );
      allInstructions = [...wrapIxs, joinInstruction];
      console.log('[Solana][JoinRoom] ✅ Wrap instructions prepended:', wrapIxs.length);
    }

    const transaction = await buildTransaction(connection, allInstructions, publicKey);
    console.log('[Solana][JoinRoom] ✅ Transaction built with', allInstructions.length, 'instructions');

    // Simulate
    console.log('[Solana][JoinRoom] 🧪 Simulating transaction...');
    const simulation = await simulateTransaction(connection, transaction);

    if (!simulation.success) {
      console.error('[Solana][JoinRoom] ❌ Simulation failed:', simulation.error);
      console.error('[Solana][JoinRoom] 📜 Logs:', simulation.logs);
      throw new Error(`Simulation failed: ${simulation.error}`);
    }

    console.log('[Solana][JoinRoom] ✅ Simulation successful');

    // Send
    console.log('[Solana][JoinRoom] 📤 Sending transaction...');

    try {
      const signature = await provider.sendAndConfirm(transaction);

      console.log('[Solana][JoinRoom] ✅ Transaction confirmed!');
      console.log('[Solana][JoinRoom] 📝 Signature:', signature);

      return {
        success:     true,
        txHash:      signature,
        explorerUrl: getTxExplorerUrl(signature),
      };
    } catch (error: any) {
      console.error('[Solana][JoinRoom] ❌ Transaction failed:', error);
      throw new Error(formatTransactionError(error));
    }

  }, [publicKey, program, connection, provider, isConnected, cluster, getTxExplorerUrl, checkExistingEntry]);

  return { joinRoom };
}