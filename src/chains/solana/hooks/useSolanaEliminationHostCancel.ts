/**
 * Calls host_cancel_room then host_refund_batch then close_room
 * on the Elimination program. Host signs all — no oracle needed.
 * All player entry PDAs are derived client-side and passed as remaining accounts.
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
import { useSolanaEliminationCloseRoom } from './useSolanaEliminationCloseRoom';
import {
  buildTransaction,
  simulateTransaction,
  formatTransactionError,
} from '../utils/transaction-helpers';
import type { SolanaNetworkKey } from '../config/networks';

export interface EliminationHostCancelParams {
  roomPda: string;
  feeMint: string;
  playerWallets: string[];
}

export interface EliminationHostCancelResult {
  success: true;
  cancelTxHash: string;
  refundTxHash: string;
  explorerUrl: string;
}

export function useSolanaEliminationHostCancel(cluster?: SolanaNetworkKey) {
  const {
    publicKey,
    connection,
    provider,
    program,
    isConnected,
    getTxExplorerUrl,
  } = useSolanaEliminationShared({ cluster });

  const { closeRoom } = useSolanaEliminationCloseRoom(cluster);

  const cancelAndRefund = useCallback(
    async (params: EliminationHostCancelParams): Promise<EliminationHostCancelResult> => {
      console.log('[EliminationHostCancel] 🚫 Starting cancel + refund...', params);

      if (!isConnected || !publicKey || !program || !provider || !connection) {
        throw new Error('Wallet not connected. Please connect your Solana wallet.');
      }

      // ── Resolve accounts ──────────────────────────────────────────────────
      let roomPda: PublicKey;
      let feeMint: PublicKey;

      try { roomPda = new PublicKey(params.roomPda); }
      catch { throw new Error(`Invalid room PDA: ${params.roomPda}`); }

      try { feeMint = new PublicKey(params.feeMint); }
      catch { throw new Error(`Invalid fee mint: ${params.feeMint}`); }

      const roomVault = getAssociatedTokenAddressSync(feeMint, roomPda, true);

      console.log('[EliminationHostCancel] Room PDA:', roomPda.toBase58());
      console.log('[EliminationHostCancel] Fee mint:', feeMint.toBase58());
      console.log('[EliminationHostCancel] Room vault:', roomVault.toBase58());
      console.log('[EliminationHostCancel] Players to refund:', params.playerWallets.length);

      // ── Step 1: host_cancel_room ──────────────────────────────────────────
      console.log('[EliminationHostCancel] Step 1: Cancelling room on-chain...');

      let cancelInstruction;
      try {
        cancelInstruction = await (program.methods as any)
          .hostCancelRoom()
          .accountsStrict({
            host: publicKey,
            room: roomPda,
          })
          .instruction();
      } catch (err: any) {
        throw new Error(`Failed to build cancel instruction: ${err.message}`);
      }

      const cancelTx = await buildTransaction(connection, [cancelInstruction], publicKey);

      const cancelSim = await simulateTransaction(connection, cancelTx);
      if (!cancelSim.success) {
        console.error('[EliminationHostCancel] Cancel simulation failed:', cancelSim.logs);
        throw new Error(`Cancel simulation failed: ${formatTransactionError(cancelSim.error)}`);
      }

      let cancelTxHash: string;
      try {
        cancelTxHash = await provider.sendAndConfirm(cancelTx, [], {
          skipPreflight: true,
          commitment: 'confirmed',
        });
        console.log('[EliminationHostCancel] ✅ Room cancelled:', cancelTxHash);
      } catch (err: any) {
        throw new Error(`Cancel transaction failed: ${formatTransactionError(err)}`);
      }

      // ── Step 2: host_refund_batch ─────────────────────────────────────────
      if (params.playerWallets.length === 0) {
        console.log('[EliminationHostCancel] No players to refund — skipping to close');

        // Still close the room even with no players
        try {
          console.log('[EliminationHostCancel] Step 2: Closing room (no players)...');
          await closeRoom({ roomPda: params.roomPda, feeMint: params.feeMint });
          console.log('[EliminationHostCancel] ✅ Room closed');
        } catch (closeErr: any) {
          console.warn('[EliminationHostCancel] close_room failed (non-critical):', closeErr.message);
        }

        return {
          success: true,
          cancelTxHash,
          refundTxHash: '',
          explorerUrl: getTxExplorerUrl(cancelTxHash),
        };
      }

      console.log('[EliminationHostCancel] Step 2: Refunding', params.playerWallets.length, 'players...');

      // Build remaining accounts: [playerEntry, playerToken] pairs for each player
      const remainingAccounts: Array<{
        pubkey: PublicKey;
        isSigner: boolean;
        isWritable: boolean;
      }> = [];

      for (const walletStr of params.playerWallets) {
        let playerWallet: PublicKey;
        try {
          playerWallet = new PublicKey(walletStr);
        } catch {
          console.warn('[EliminationHostCancel] Skipping invalid wallet:', walletStr);
          continue;
        }

        const [playerEntryPda] = PublicKey.findProgramAddressSync(
          [
            Buffer.from(ELIMINATION_SEEDS.PLAYER_ENTRY),
            roomPda.toBuffer(),
            playerWallet.toBuffer(),
          ],
          program.programId
        );

        const playerToken = getAssociatedTokenAddressSync(feeMint, playerWallet);

        remainingAccounts.push(
          { pubkey: playerEntryPda, isSigner: false, isWritable: true },
          { pubkey: playerToken,    isSigner: false, isWritable: true },
        );

        console.log(`[EliminationHostCancel]   Player ${walletStr.slice(0, 8)}... entry: ${playerEntryPda.toBase58().slice(0, 8)}...`);
      }

      if (remainingAccounts.length === 0) {
        console.log('[EliminationHostCancel] No valid player accounts — skipping refund batch');

        try {
          console.log('[EliminationHostCancel] Step 2: Closing room (no valid accounts)...');
          await closeRoom({ roomPda: params.roomPda, feeMint: params.feeMint });
          console.log('[EliminationHostCancel] ✅ Room closed');
        } catch (closeErr: any) {
          console.warn('[EliminationHostCancel] close_room failed (non-critical):', closeErr.message);
        }

        return {
          success: true,
          cancelTxHash,
          refundTxHash: '',
          explorerUrl: getTxExplorerUrl(cancelTxHash),
        };
      }

      let refundInstruction;
      try {
        refundInstruction = await (program.methods as any)
          .hostRefundBatch()
          .accountsStrict({
            host:         publicKey,
            room:         roomPda,
            feeMint,
            roomVault,
            tokenProgram: TOKEN_PROGRAM_ID,
          })
          .remainingAccounts(remainingAccounts)
          .instruction();
      } catch (err: any) {
        throw new Error(`Failed to build refund batch instruction: ${err.message}`);
      }

      const refundTx = await buildTransaction(connection, [refundInstruction], publicKey);

      const refundSim = await simulateTransaction(connection, refundTx);
      if (!refundSim.success) {
        console.error('[EliminationHostCancel] Refund simulation failed:', refundSim.logs);
        throw new Error(`Refund simulation failed: ${formatTransactionError(refundSim.error)}`);
      }

  let refundTxHash: string;
try {
  refundTxHash = await provider.sendAndConfirm(refundTx, [], {
    skipPreflight: true,
    commitment: 'confirmed',
  });
  console.log('[EliminationHostCancel] ✅ Refund batch complete:', refundTxHash);
} catch (err: any) {
  // "already processed" means the tx landed — recover the signature
  const alreadyProcessed =
    err?.message?.includes('already been processed') ||
    err?.message?.includes('AlreadyProcessed');

  if (alreadyProcessed) {
    console.log('[EliminationHostCancel] Refund already processed — recovering signature');
    try {
      const sigs = await connection.getSignaturesForAddress(roomPda, { limit: 5 });
      const found = sigs.find(s => !s.err);
      refundTxHash = found?.signature ?? err.signature ?? 'unknown';
      console.log('[EliminationHostCancel] ✅ Recovered refund signature:', refundTxHash);
    } catch {
      refundTxHash = err.signature ?? 'unknown';
    }
  } else {
    throw new Error(`Refund transaction failed: ${formatTransactionError(err)}`);
  }
}

      // ── Step 3: close_room (reclaim rent to platform) ─────────────────────
      // Vault is now empty after refund batch — safe to close.
      // Non-critical: cancel and refund are already done.
      try {
        console.log('[EliminationHostCancel] Step 3: Closing room to reclaim rent...');
        await closeRoom({ roomPda: params.roomPda, feeMint: params.feeMint });
        console.log('[EliminationHostCancel] ✅ Room closed');
      } catch (closeErr: any) {
        console.warn('[EliminationHostCancel] close_room failed (non-critical):', closeErr.message);
      }

      return {
        success: true,
        cancelTxHash,
        refundTxHash,
        explorerUrl: getTxExplorerUrl(refundTxHash),
      };
    },
    [publicKey, connection, provider, program, isConnected, getTxExplorerUrl, closeRoom]
  );

  return { cancelAndRefund };
}