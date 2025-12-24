/**
 * Solana Join Room Hook
 * 
 * Mirrors EVM's useEvmJoin.ts pattern for consistency.
 * Handles joining a Solana quiz room by paying entry fee + optional extras.
 * 
 * ## What This Hook Does
 * 
 * 1. Validates wallet connection
 * 2. Validates input parameters
 * 3. Derives required PDAs (room, playerEntry, roomVault)
 * 4. Gets player's token account
 * 5. Builds join_room instruction
 * 6. Simulates transaction
 * 7. Sends & confirms transaction
 * 8. Returns result with transaction signature
 * 
 * ## Entry Fee vs Extras
 * 
 * - **Entry Fee**: Required payment set by room.entry_fee
 *   - Subject to splits: Platform 20%, Host 0-5%, Prizes 0-35%, Charity 40%+
 * - **Extras**: Optional additional amount chosen by player
 *   - Goes 100% to charity (no splits)
 *   - Maximizes fundraising impact
 * 
 * ## Usage
 * 
 * ```typescript
 * const { joinRoom } = useSolanaJoinRoom();
 * 
 * const result = await joinRoom({
 *   roomId: 'my-quiz-123',
 *   currency: 'USDC',
 *   entryFee: 10,        // Optional: will fetch from room if not provided
 *   extrasAmount: 5,     // Optional: additional donation (default 0)
 * });
 * 
 * if (result.success) {
 *   console.log('Joined room!', result.txHash);
 * }
 * ```
 */

import { useCallback } from 'react';
import { PublicKey } from '@solana/web3.js';
import { BN } from '@coral-xyz/anchor';
import { getAssociatedTokenAddress } from '@solana/spl-token';

import { useSolanaShared } from './useSolanaShared';
import { 
  derivePlayerEntryPDA, 
  deriveRoomVaultPDA,
  deriveGlobalConfigPDA,
} from '../utils/pda';
import { 
  buildTransaction, 
  simulateTransaction,
  formatTransactionError,
} from '../utils/transaction-helpers';
import { getTokenConfig } from '../config/tokens';
import { SOLANA_CONTRACT } from '../config/contracts';

import type { 
  JoinRoomParams, 
  JoinRoomResult,
  SolanaTokenSymbol,
} from '../utils/types';

/**
 * Hook for joining Solana quiz rooms
 */
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
      if (!isConnected) missing.push('not connected');
      if (!publicKey) missing.push('no publicKey');
      if (!program) missing.push('no program');
      if (!connection) missing.push('no connection');
      if (!provider) missing.push('no provider');
      
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

    if (!roomId || roomId.length === 0) {
      throw new Error('Room ID is required');
    }

    if (roomId.length > SOLANA_CONTRACT.MAX_ROOM_ID_LENGTH) {
      throw new Error(
        `Room ID too long: ${roomId.length} chars (max ${SOLANA_CONTRACT.MAX_ROOM_ID_LENGTH})`
      );
    }

    if (extrasAmount < 0) {
      throw new Error('Extras amount cannot be negative');
    }

    console.log('[Solana][JoinRoom] ✅ Parameters validated');

    // ============================================================================
    // STEP 3: Get room data to determine host, token mint, and entry fee
    // ============================================================================

    let roomPDA: PublicKey;
    let host: PublicKey;
    let feeTokenMint: PublicKey;
    let entryFeeFromChain: BN;
    let currency: SolanaTokenSymbol;

    try {
      // If roomAddress provided directly, use it
      if (params.roomAddress) {
        roomPDA = params.roomAddress;
        console.log('[Solana][JoinRoom] 📍 Using provided room address:', roomPDA.toBase58());
      } else {
        // Need to derive room PDA, but we need the host first
        // This is a limitation - we need to fetch room by scanning or have host address
        throw new Error(
          'roomAddress parameter is required for Solana join. ' +
          'The host address must be known to derive the room PDA.'
        );
      }

      // Fetch room account
      console.log('[Solana][JoinRoom] 🔍 Fetching room account...');
      
      // Type assertion: program.account is dynamic based on IDL
      // We cast to any to access the room property
      const roomAccount = await (program.account as any).room.fetch(roomPDA);
      
      host = roomAccount.host as PublicKey;
      feeTokenMint = roomAccount.feeTokenMint as PublicKey;
      entryFeeFromChain = new BN(roomAccount.entryFee.toString());

      console.log('[Solana][JoinRoom] ✅ Room data fetched:');
      console.log('[Solana][JoinRoom]   Host:', host.toBase58());
      console.log('[Solana][JoinRoom]   Token mint:', feeTokenMint.toBase58());
      console.log('[Solana][JoinRoom]   Entry fee:', entryFeeFromChain.toString());
      console.log('[Solana][JoinRoom]   Player count:', roomAccount.playerCount);
      console.log('[Solana][JoinRoom]   Max players:', roomAccount.maxPlayers);
      console.log('[Solana][JoinRoom]   Status:', roomAccount.status);
      console.log('[Solana][JoinRoom]   Ended:', roomAccount.ended);

      // Determine currency - use from params or default to USDC
      // TODO: In the future, we could map mint address to symbol
      currency = (params.currency ?? 'USDC') as SolanaTokenSymbol;
      
      console.log('[Solana][JoinRoom] 💰 Currency:', currency);

    } catch (error: any) {
      console.error('[Solana][JoinRoom] ❌ Failed to fetch room:', error);
      throw new Error(`Failed to fetch room: ${error.message}`);
    }

    // ============================================================================
    // STEP 4: Get token configuration and calculate amounts
    // ============================================================================

    const tokenConfig = getTokenConfig(currency, cluster);

    console.log('[Solana][JoinRoom] 🪙 Token config:', {
      symbol: tokenConfig.symbol,
      decimals: tokenConfig.decimals,
      mint: tokenConfig.mint.toBase58(),
    });

    // Use provided entry fee or fetch from chain
    const entryFeeUI = params.entryFee ?? parseFloat(entryFeeFromChain.toString()) / Math.pow(10, tokenConfig.decimals);
    
    // Convert UI amounts to base units (e.g., 10 USDC → 10_000_000)
    const entryFeeBaseUnits = new BN(entryFeeUI * Math.pow(10, tokenConfig.decimals));
    const extrasBaseUnits = new BN(extrasAmount * Math.pow(10, tokenConfig.decimals));
    const totalPayment = entryFeeBaseUnits.add(extrasBaseUnits);

    console.log('[Solana][JoinRoom] 💵 Payment breakdown:');
    console.log('[Solana][JoinRoom]   Entry fee (UI):', entryFeeUI, currency);
    console.log('[Solana][JoinRoom]   Entry fee (base):', entryFeeBaseUnits.toString());
    console.log('[Solana][JoinRoom]   Extras (UI):', extrasAmount, currency);
    console.log('[Solana][JoinRoom]   Extras (base):', extrasBaseUnits.toString());
    console.log('[Solana][JoinRoom]   Total payment:', totalPayment.toString());

    // ============================================================================
    // STEP 5: Derive PDAs
    // ============================================================================

    console.log('[Solana][JoinRoom] 🔑 Deriving PDAs...');

    const [globalConfig] = deriveGlobalConfigPDA();
    const [playerEntry] = derivePlayerEntryPDA(roomPDA, publicKey);
    const [roomVault] = deriveRoomVaultPDA(roomPDA);

    console.log('[Solana][JoinRoom] ✅ PDAs derived:');
    console.log('[Solana][JoinRoom]   GlobalConfig:', globalConfig.toBase58());
    console.log('[Solana][JoinRoom]   Room:', roomPDA.toBase58());
    console.log('[Solana][JoinRoom]   PlayerEntry:', playerEntry.toBase58());
    console.log('[Solana][JoinRoom]   RoomVault:', roomVault.toBase58());

    // ============================================================================
    // STEP 6: Get player's token account (Associated Token Account)
    // ============================================================================

    console.log('[Solana][JoinRoom] 🔍 Getting player token account...');

    const playerTokenAccount = await getAssociatedTokenAddress(
      feeTokenMint,
      publicKey
    );

    console.log('[Solana][JoinRoom] ✅ Player token account:', playerTokenAccount.toBase58());

    // Check balance (optional but helpful for better error messages)
    try {
      const balance = await connection.getTokenAccountBalance(playerTokenAccount);
      const balanceUI = parseFloat(balance.value.uiAmountString || '0');
      const requiredUI = parseFloat(totalPayment.toString()) / Math.pow(10, tokenConfig.decimals);

      console.log('[Solana][JoinRoom] 💰 Token balance:', balanceUI, currency);
      console.log('[Solana][JoinRoom] 💰 Required:', requiredUI, currency);

      if (balanceUI < requiredUI) {
        throw new Error(
          `Insufficient ${currency} balance. ` +
          `Required: ${requiredUI.toFixed(2)} ${currency}, ` +
          `Available: ${balanceUI.toFixed(2)} ${currency}`
        );
      }
    } catch (error: any) {
      if (error.message.includes('could not find account')) {
        throw new Error(
          `You don't have a ${currency} token account. ` +
          `Please add ${currency} to your wallet first.`
        );
      }
      // If it's our balance check error, re-throw it
      if (error.message.includes('Insufficient')) {
        throw error;
      }
      // Otherwise just log and continue (balance check is optional)
      console.warn('[Solana][JoinRoom] ⚠️ Could not check balance:', error.message);
    }

    // ============================================================================
    // STEP 7: Build join_room instruction
    // ============================================================================

    console.log('[Solana][JoinRoom] 🔨 Building join_room instruction...');

    if (!program.methods?.joinRoom) {
      throw new Error('Program methods not available. The program instance may not be initialized correctly.');
    }

    try {
      const instruction = await program.methods
        .joinRoom(
          roomId,
          extrasBaseUnits // extras_amount parameter
        )
        .accounts({
          room: roomPDA,
          playerEntry: playerEntry,
          roomVault: roomVault,
          playerTokenAccount: playerTokenAccount,
          globalConfig: globalConfig,
          player: publicKey,
          tokenProgram: new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'),
          systemProgram: new PublicKey('11111111111111111111111111111111'),
        })
        .instruction();

      console.log('[Solana][JoinRoom] ✅ Instruction built');
      console.log('[Solana][JoinRoom] 📋 Instruction keys:', instruction.keys.length);

    } catch (error: any) {
      console.error('[Solana][JoinRoom] ❌ Failed to build instruction:', error);
      throw new Error(`Failed to build instruction: ${error.message}`);
    }

    // ============================================================================
    // STEP 8: Build transaction
    // ============================================================================

    console.log('[Solana][JoinRoom] 🔨 Building transaction...');

    if (!program.methods?.joinRoom) {
      throw new Error('Program methods not available');
    }

    const instruction = await program.methods
      .joinRoom(roomId, extrasBaseUnits)
      .accounts({
        room: roomPDA,
        playerEntry: playerEntry,
        roomVault: roomVault,
        playerTokenAccount: playerTokenAccount,
        globalConfig: globalConfig,
        player: publicKey,
        tokenProgram: new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'),
        systemProgram: new PublicKey('11111111111111111111111111111111'),
      })
      .instruction();

    const transaction = await buildTransaction(
      connection,
      [instruction],
      publicKey
    );

    console.log('[Solana][JoinRoom] ✅ Transaction built');

    // ============================================================================
    // STEP 9: Simulate transaction
    // ============================================================================

    console.log('[Solana][JoinRoom] 🧪 Simulating transaction...');

    const simulation = await simulateTransaction(connection, transaction);

    if (!simulation.success) {
      console.error('[Solana][JoinRoom] ❌ Simulation failed:', simulation.error);
      console.error('[Solana][JoinRoom] 📜 Simulation logs:', simulation.logs);
      throw new Error(`Simulation failed: ${simulation.error}`);
    }

    console.log('[Solana][JoinRoom] ✅ Simulation successful');

    // ============================================================================
    // STEP 10: Send and confirm transaction
    // ============================================================================

    console.log('[Solana][JoinRoom] 📤 Sending transaction...');

    try {
      const signature = await provider.sendAndConfirm(transaction);

      console.log('[Solana][JoinRoom] ✅ Transaction confirmed!');
      console.log('[Solana][JoinRoom] 📝 Signature:', signature);

      const explorerUrl = getTxExplorerUrl(signature);
      console.log('[Solana][JoinRoom] 🔗 Explorer:', explorerUrl);

      return {
        success: true,
        txHash: signature,
        explorerUrl,
      };

    } catch (error: any) {
      console.error('[Solana][JoinRoom] ❌ Transaction failed:', error);
      
      const formattedError = formatTransactionError(error);
      console.error('[Solana][JoinRoom] 📋 Formatted error:', formattedError);
      
      throw new Error(formattedError);
    }

  }, [
    publicKey,
    program,
    connection,
    provider,
    isConnected,
    cluster,
    getTxExplorerUrl,
  ]);

  return { joinRoom };
}