/**
 * Calls host_cancel_room then host_refund_batch on the Elimination program.
 * Host signs both — no oracle needed.
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
import {
  buildTransaction,
  simulateTransaction,
  formatTransactionError,
} from '../utils/transaction-helpers';
import type { SolanaNetworkKey } from '../config/networks';

export interface EliminationHostCancelParams {
  roomPda: string;
  feeMint: string;
  playerWallets: string[];  // wallet addresses of all players who joined
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
          skipPreflight: false,
          commitment: 'confirmed',
        });
        console.log('[EliminationHostCancel] ✅ Room cancelled:', cancelTxHash);
      } catch (err: any) {
        throw new Error(`Cancel transaction failed: ${formatTransactionError(err)}`);
      }

      // ── Step 2: host_refund_batch ─────────────────────────────────────────
      // Only run if there are players to refund
      if (params.playerWallets.length === 0) {
        console.log('[EliminationHostCancel] No players to refund — done');
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

        // Derive player entry PDA
        const [playerEntryPda] = PublicKey.findProgramAddressSync(
          [
            Buffer.from(ELIMINATION_SEEDS.PLAYER_ENTRY),
            roomPda.toBuffer(),
            playerWallet.toBuffer(),
          ],
          program.programId
        );

        // Derive player token ATA
        const playerToken = getAssociatedTokenAddressSync(feeMint, playerWallet);

        remainingAccounts.push(
          { pubkey: playerEntryPda, isSigner: false, isWritable: true },
          { pubkey: playerToken, isSigner: false, isWritable: true },
        );

        console.log(`[EliminationHostCancel]   Player ${walletStr.slice(0, 8)}... entry: ${playerEntryPda.toBase58().slice(0, 8)}...`);
      }

      if (remainingAccounts.length === 0) {
        console.log('[EliminationHostCancel] No valid player accounts — skipping refund batch');
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
            host: publicKey,
            room: roomPda,
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
          skipPreflight: false,
          commitment: 'confirmed',
        });
        console.log('[EliminationHostCancel] ✅ Refund batch complete:', refundTxHash);
      } catch (err: any) {
        throw new Error(`Refund transaction failed: ${formatTransactionError(err)}`);
      }

      return {
        success: true,
        cancelTxHash,
        refundTxHash,
        explorerUrl: getTxExplorerUrl(refundTxHash),
      };
    },
    [publicKey, connection, provider, program, isConnected, getTxExplorerUrl]
  );

  return { cancelAndRefund };
}