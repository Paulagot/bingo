/**
 * Calls close_room on the Elimination program.
 * Closes the room PDA and vault ATA, returning rent lamports to the platform wallet.
 * Called after finalize_game or after host_refund_batch (cancel flow).
 */
import { useCallback } from 'react';
import { PublicKey } from '@solana/web3.js';
import {
  TOKEN_PROGRAM_ID,
  getAssociatedTokenAddressSync,
} from '@solana/spl-token';

import {
  useSolanaEliminationShared,
  ELIMINATION_SEEDS,
} from './useSolanaEliminationShared';
import {
  buildTransaction,
  simulateTransaction,
  formatTransactionError,
} from '../utils/transaction-helpers';
import type { SolanaNetworkKey } from '../config/networks';

export interface EliminationCloseRoomParams {
  roomPda: string;
  feeMint: string;
}

export interface EliminationCloseRoomResult {
  success: true;
  txHash: string;
  explorerUrl: string;
}

export function useSolanaEliminationCloseRoom(cluster?: SolanaNetworkKey) {
  const {
    publicKey,
    connection,
    provider,
    program,
    isConnected,
    getTxExplorerUrl,
  } = useSolanaEliminationShared({ cluster });

  const closeRoom = useCallback(
    async (params: EliminationCloseRoomParams): Promise<EliminationCloseRoomResult> => {
      console.log('[EliminationCloseRoom] 🔒 Starting close_room...', params);

      if (!isConnected || !publicKey || !program || !provider || !connection) {
        throw new Error('Wallet not connected.');
      }

      let roomPda: PublicKey;
      let feeMint: PublicKey;

      try { roomPda = new PublicKey(params.roomPda); }
      catch { throw new Error(`Invalid room PDA: ${params.roomPda}`); }

      try { feeMint = new PublicKey(params.feeMint); }
      catch { throw new Error(`Invalid fee mint: ${params.feeMint}`); }

      // ── Derive PDAs ───────────────────────────────────────────────────────
      const [globalConfig] = PublicKey.findProgramAddressSync(
        [Buffer.from(ELIMINATION_SEEDS.GLOBAL_CONFIG)],
        program.programId
      );

      const roomVault = getAssociatedTokenAddressSync(feeMint, roomPda, true);

      // ── Read platform_recipient from global_config ────────────────────────
      // GlobalConfig layout: 8 (discriminator) + 32 (authority) + 32 (platform_wallet) + 1 (bump)
      const globalConfigData = await connection.getAccountInfo(globalConfig);
      if (!globalConfigData) throw new Error('GlobalConfig account not found');

      const platformWallet = new PublicKey(
        globalConfigData.data.slice(8 + 32, 8 + 32 + 32)
      );

      console.log('[EliminationCloseRoom] globalConfig:', globalConfig.toBase58());
      console.log('[EliminationCloseRoom] roomVault:', roomVault.toBase58());
      console.log('[EliminationCloseRoom] platformRecipient:', platformWallet.toBase58());

      // ── Build close_room instruction ──────────────────────────────────────
      let instruction;
      try {
        instruction = await (program.methods as any)
          .closeRoom()
          .accountsStrict({
            authority:         publicKey,
            globalConfig,
            room:              roomPda,
            feeMint,
            roomVault,
            platformRecipient: platformWallet,
            tokenProgram:      TOKEN_PROGRAM_ID,
          })
          .instruction();
      } catch (err: any) {
        throw new Error(`Failed to build close_room instruction: ${err.message}`);
      }

      // ── Build, simulate, send ─────────────────────────────────────────────
      const transaction = await buildTransaction(connection, [instruction], publicKey);

      const simResult = await simulateTransaction(connection, transaction);
      if (!simResult.success) {
        console.error('[EliminationCloseRoom] Simulation failed:', simResult.logs);
        throw new Error(`Simulation failed: ${formatTransactionError(simResult.error)}`);
      }

      let signature: string;
      try {
        signature = await provider.sendAndConfirm(transaction, [], {
          skipPreflight: true,
          commitment: 'confirmed',
        });
      } catch (err: any) {
        throw new Error(`close_room transaction failed: ${formatTransactionError(err)}`);
      }

      console.log('[EliminationCloseRoom] ✅ Room closed:', signature);

      return {
        success: true,
        txHash: signature,
        explorerUrl: getTxExplorerUrl(signature),
      };
    },
    [publicKey, connection, provider, program, isConnected, getTxExplorerUrl]
  );

  return { closeRoom };
}