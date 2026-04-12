/**
 * Solana Refund Room Hook — IDL-verified (newquiz.json)
 *
 * refund_room: host cancels the room.
 * Platform keeps 15%, players get 85% back. Extras refunded 100%.
 * ALL rent goes to platform_wallet.
 *
 * ## IDL accounts
 *   room, room_vault, platform_token_account, platform_wallet, host,
 *   token_program, system_program
 *
 * ## remainingAccounts
 *   (playerEntryPDA, playerTokenAcct) pairs for every player who joined.
 *   IDL error 6019 fires if count doesn't match room.player_count.
 *
 * ## Usage
 *
 * ```typescript
 * const { refundRoom } = useSolanaRefundRoom();
 *
 * await refundRoom({
 *   roomId:        'quiz-night-2024',
 *   roomAddress:   roomPDA,
 *   playerWallets: [wallet1, wallet2, ...],  // ALL players who joined
 * });
 * ```
 */

import { useCallback } from 'react';
import { PublicKey, SystemProgram } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID, getAssociatedTokenAddress } from '@solana/spl-token';

import { useSolanaShared } from './useSolanaShared';
import {
  deriveRoomVaultPDA,
  derivePlayerEntryPDA,
} from '../utils/pda';
import {
  buildTransaction,
  simulateTransaction,
  formatTransactionError,
} from '../utils/transaction-helpers';
import { getTokenByMint } from '../config/solanaTokenConfig';
import { isNativeSolRoom, WSOL_MINT } from '../utils/wsolUtils';
import { getPlatformWallet } from '../config/contracts';

export interface RefundRoomParams {
  roomId:        string;
  roomAddress:   PublicKey | string;
  /**
   * All wallets that joined the room.
   * Must match room.player_count exactly — IDL error 6019 otherwise.
   */
  playerWallets: (PublicKey | string)[];
}

export interface RefundRoomResult {
  success:      true;
  txHash:       string;
  explorerUrl?: string;
}

export function useSolanaRefundRoom() {
  const {
    publicKey,
    program,
    connection,
    provider,
    isConnected,
    getTxExplorerUrl,
  } = useSolanaShared();

  const refundRoom = useCallback(
    async (params: RefundRoomParams): Promise<RefundRoomResult> => {
      console.log('[Solana][RefundRoom] 🔄 Starting refund_room...');

      // ============================================================================
      // STEP 1: Validate wallet connection
      // ============================================================================

      if (!isConnected || !publicKey || !program || !connection || !provider) {
        const missing: string[] = [];
        if (!isConnected) missing.push('not connected');
        if (!publicKey)   missing.push('no publicKey');
        if (!program)     missing.push('no program');
        if (!connection)  missing.push('no connection');
        if (!provider)    missing.push('no provider');
        throw new Error(`Wallet not ready: ${missing.join(', ')}`);
      }

      console.log('[Solana][RefundRoom] ✅ Wallet connected:', publicKey.toBase58());

      // ============================================================================
      // STEP 2: Validate parameters
      // ============================================================================

      if (!params.roomId)      throw new Error('Room ID is required');
      if (!params.roomAddress) throw new Error('Room address is required');
      if (!params.playerWallets || params.playerWallets.length === 0) {
        throw new Error('playerWallets is required (must match all players who joined)');
      }

      const roomPDA = typeof params.roomAddress === 'string'
        ? new PublicKey(params.roomAddress)
        : params.roomAddress;

      const playerPublicKeys: PublicKey[] = params.playerWallets.map((w) => {
        try { return typeof w === 'string' ? new PublicKey(w) : w; }
        catch { throw new Error(`Invalid player wallet: ${w}`); }
      });

      console.log('[Solana][RefundRoom] 🏠 Room:', roomPDA.toBase58());
      console.log('[Solana][RefundRoom] 👥 Players:', playerPublicKeys.length);

      // ============================================================================
      // STEP 3: Fetch room account
      // ============================================================================

      console.log('[Solana][RefundRoom] 🔍 Fetching room...');

      const roomAccount = await (program.account as any).room.fetch(roomPDA);

      const host      = roomAccount.host as PublicKey;
      const tokenMint = roomAccount.feeTokenMint as PublicKey;

      // Caller must be the host
      if (!host.equals(publicKey)) {
        throw new Error(`Only the room host (${host.toBase58()}) can call refund_room.`);
      }

      console.log('[Solana][RefundRoom] ✅ Host verified:', host.toBase58());
      console.log('[Solana][RefundRoom] 💰 Token mint:', tokenMint.toBase58());

      // ============================================================================
      // STEP 4: Resolve token / mint
      // ============================================================================

      const tokenConfig = getTokenByMint(tokenMint.toBase58());
      if (!tokenConfig) {
        throw new Error(`Unsupported token mint: ${tokenMint.toBase58()}`);
      }

      const isSolRoom = isNativeSolRoom(tokenMint);
      const splMint   = isSolRoom ? WSOL_MINT : tokenMint;

      console.log('[Solana][RefundRoom] 💰 Token:', tokenConfig.code, 'SOL room:', isSolRoom);

      // ============================================================================
      // STEP 5: Derive PDAs and platform ATA
      //
      // IDL accounts: room, room_vault, platform_token_account,
      //               platform_wallet, host, token_program, system_program
      // ============================================================================

      const platformWallet       = getPlatformWallet();
      const platformTokenAccount = await getAssociatedTokenAddress(splMint, platformWallet);
      const [roomVault]          = deriveRoomVaultPDA(roomPDA);

      console.log('[Solana][RefundRoom] 🏢 Platform wallet:', platformWallet.toBase58());
      console.log('[Solana][RefundRoom] 🏢 Platform ATA:  ', platformTokenAccount.toBase58());
      console.log('[Solana][RefundRoom] 🔑 Room vault:    ', roomVault.toBase58());

      // ============================================================================
      // STEP 5B: Ensure platform ATA exists
      // ============================================================================

      const { createAssociatedTokenAccountInstruction } = await import('@solana/spl-token');

      const platformAtaInfo = await connection.getAccountInfo(platformTokenAccount);
      if (!platformAtaInfo) {
        console.log('[Solana][RefundRoom] 📝 Creating platform ATA...');
        const createAtaTx = await buildTransaction(
          connection,
          [createAssociatedTokenAccountInstruction(publicKey, platformTokenAccount, platformWallet, splMint)],
          publicKey
        );
        const ataSig = await provider.sendAndConfirm(createAtaTx);
        console.log('[Solana][RefundRoom] ✅ Platform ATA created:', ataSig);
      }

      // ============================================================================
      // STEP 6: Build remainingAccounts
      //
      // IDL: "Pass all PlayerEntry/token pairs in remaining_accounts."
      // Layout: [playerEntryPDA_0, playerTokenAcct_0, playerEntryPDA_1, ...]
      // ============================================================================

      console.log('[Solana][RefundRoom] 📋 Building remaining accounts...');

      const remainingAccounts: Array<{ pubkey: PublicKey; isSigner: boolean; isWritable: boolean }> = [];

      for (const player of playerPublicKeys) {
        const [playerEntry]      = derivePlayerEntryPDA(roomPDA, player);
        const playerTokenAccount = await getAssociatedTokenAddress(splMint, player);

        remainingAccounts.push({ pubkey: playerEntry,        isSigner: false, isWritable: true });
        remainingAccounts.push({ pubkey: playerTokenAccount, isSigner: false, isWritable: true });
      }

      console.log('[Solana][RefundRoom] ✅ Remaining accounts:', remainingAccounts.length, `(${playerPublicKeys.length} players × 2)`);

      // ============================================================================
      // STEP 7: Build, simulate, send
      // ============================================================================

      console.log('[Solana][RefundRoom] 🔨 Building refund_room instruction...');

      if (!program.methods?.refundRoom) {
        throw new Error('refundRoom method not found. Check IDL / program version.');
      }

      const instruction = await program.methods
        .refundRoom(params.roomId)
        .accountsStrict({
          room:                 roomPDA,
          roomVault:            roomVault,
          platformTokenAccount: platformTokenAccount,
          platformWallet:       platformWallet,
          host:                 publicKey,
          tokenProgram:         TOKEN_PROGRAM_ID,
          systemProgram:        SystemProgram.programId,
        })
        .remainingAccounts(remainingAccounts)
        .instruction();

      console.log('[Solana][RefundRoom] ✅ Instruction built');

      const transaction = await buildTransaction(connection, [instruction], publicKey);

      console.log('[Solana][RefundRoom] 🧪 Simulating...');
      const simulation = await simulateTransaction(connection, transaction);

      if (!simulation.success) {
        console.error('[Solana][RefundRoom] ❌ Simulation failed:', simulation.error);
        console.error('[Solana][RefundRoom] Logs:', simulation.logs);
        throw new Error(`Simulation failed: ${simulation.error}`);
      }

      console.log('[Solana][RefundRoom] ✅ Simulation passed — sending...');

      let signature: string;
      try {
        signature = await provider.sendAndConfirm(transaction);
        console.log('[Solana][RefundRoom] ✅ Refund complete:', signature);
      } catch (error: any) {
        throw new Error(formatTransactionError(error));
      }

      const explorerUrl = getTxExplorerUrl(signature);
      console.log('[Solana][RefundRoom] 🔗', explorerUrl);

      return { success: true, txHash: signature, explorerUrl };
    },
    [publicKey, program, connection, provider, isConnected, getTxExplorerUrl]
  );

  return { refundRoom };
}