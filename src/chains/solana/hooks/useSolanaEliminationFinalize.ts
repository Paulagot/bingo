/**
 * Calls finalize_game on the Elimination program.
 * Host signs — distributes prizes to winner, host, platform, charity.
 */
import { useCallback } from 'react';
import { PublicKey, SystemProgram } from '@solana/web3.js';
import {
  TOKEN_PROGRAM_ID,
  getAssociatedTokenAddress,
  getAssociatedTokenAddressSync,
  createAssociatedTokenAccountInstruction,
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

export interface EliminationFinalizeParams {
  onChainRoomId: string;     // short ID used as PDA seed
  roomPda: string;           // room PDA address string
  feeMint: string;           // token mint pubkey string
  winnerWallet: string;      // winner's Solana wallet pubkey
  charityWallet: string;     // TGB or platform reserve wallet pubkey
}

export interface EliminationFinalizeResult {
  success: true;
  txHash: string;
  explorerUrl: string;
}

export function useSolanaEliminationFinalize(cluster?: SolanaNetworkKey) {
  const {
    publicKey,
    connection,
    provider,
    program,
    isConnected,
    getTxExplorerUrl,
  } = useSolanaEliminationShared({ cluster });

  const finalizeGame = useCallback(
    async (params: EliminationFinalizeParams): Promise<EliminationFinalizeResult> => {
      console.log('[EliminationFinalize] 🏆 Starting finalize_game...', params);

      if (!isConnected || !publicKey || !program || !provider || !connection) {
        throw new Error('Wallet not connected. Please connect your Solana wallet.');
      }

      // ── Resolve public keys ───────────────────────────────────────────────
      let roomPda: PublicKey;
      let feeMint: PublicKey;
      let winner: PublicKey;
      let charityWallet: PublicKey;

      try { roomPda = new PublicKey(params.roomPda); }
      catch { throw new Error(`Invalid room PDA: ${params.roomPda}`); }

      try { feeMint = new PublicKey(params.feeMint); }
      catch { throw new Error(`Invalid fee mint: ${params.feeMint}`); }

      try { winner = new PublicKey(params.winnerWallet); }
      catch { throw new Error(`Invalid winner wallet: ${params.winnerWallet}`); }

      try { charityWallet = new PublicKey(params.charityWallet); }
      catch { throw new Error(`Invalid charity wallet: ${params.charityWallet}`); }

      // ── Derive PDAs ───────────────────────────────────────────────────────
      const [globalConfig] = PublicKey.findProgramAddressSync(
        [Buffer.from(ELIMINATION_SEEDS.GLOBAL_CONFIG)],
        program.programId
      );

      const [winnerEntry] = PublicKey.findProgramAddressSync(
        [
          Buffer.from(ELIMINATION_SEEDS.PLAYER_ENTRY),
          roomPda.toBuffer(),
          winner.toBuffer(),
        ],
        program.programId
      );

      // Room vault is ATA owned by the room PDA
      const roomVault = getAssociatedTokenAddressSync(feeMint, roomPda, true);

      console.log('[EliminationFinalize] PDAs:', {
        globalConfig: globalConfig.toBase58(),
        winnerEntry: winnerEntry.toBase58(),
        roomVault: roomVault.toBase58(),
      });

      // ── Read platform wallet from global_config ───────────────────────────
      const globalConfigData = await connection.getAccountInfo(globalConfig);
      if (!globalConfigData) throw new Error('GlobalConfig account not found');

      // GlobalConfig layout: 8 (discriminator) + 32 (authority) + 32 (platform_wallet) + 1 (bump)
      const platformWalletOffset = 8 + 32;
      const platformWallet = new PublicKey(
        globalConfigData.data.slice(platformWalletOffset, platformWalletOffset + 32)
      );

      console.log('[EliminationFinalize] Platform wallet:', platformWallet.toBase58());

      // ── Derive token accounts (ATAs) ──────────────────────────────────────
      const hostToken = await getAssociatedTokenAddress(feeMint, publicKey);
      const platformToken = await getAssociatedTokenAddress(feeMint, platformWallet);
      const winnerToken = await getAssociatedTokenAddress(feeMint, winner);
      const charityToken = await getAssociatedTokenAddress(feeMint, charityWallet);

      console.log('[EliminationFinalize] Token accounts:', {
        hostToken: hostToken.toBase58(),
        platformToken: platformToken.toBase58(),
        winnerToken: winnerToken.toBase58(),
        charityToken: charityToken.toBase58(),
      });

      // ── Create missing ATAs ───────────────────────────────────────────────
      const ataInstructions: any[] = [];
      const checkAta = async (ata: PublicKey, owner: PublicKey, label: string) => {
        const info = await connection.getAccountInfo(ata);
        if (!info) {
          console.log(`[EliminationFinalize] Creating ${label} ATA...`);
          ataInstructions.push(
            createAssociatedTokenAccountInstruction(publicKey, ata, owner, feeMint)
          );
        }
      };

      await checkAta(hostToken, publicKey, 'host');
      await checkAta(platformToken, platformWallet, 'platform');
      await checkAta(winnerToken, winner, 'winner');
      await checkAta(charityToken, charityWallet, 'charity');

      if (ataInstructions.length > 0) {
        console.log('[EliminationFinalize] Creating', ataInstructions.length, 'missing ATAs...');
        const ataTx = await buildTransaction(connection, ataInstructions, publicKey);
        try {
          const ataSig = await provider.sendAndConfirm(ataTx, [], { commitment: 'confirmed' });
          console.log('[EliminationFinalize] ATAs created:', ataSig);
        } catch (err: any) {
          throw new Error(`Failed to create token accounts: ${formatTransactionError(err)}`);
        }
      }

      // ── Build finalize_game instruction ───────────────────────────────────
      let instruction;
      try {
        instruction = await (program.methods as any)
          .finalizeGame()
          .accountsStrict({
            host: publicKey,
            globalConfig,
            room: roomPda,
            feeMint,
            roomVault,
            winnerEntry,
            winner,
            charityWallet,
            hostToken,
            platformToken,
            winnerToken,
            charityToken,
            tokenProgram: TOKEN_PROGRAM_ID,
          })
          .instruction();
      } catch (err: any) {
        throw new Error(`Failed to build finalize instruction: ${err.message}`);
      }

      // ── Build, simulate, send ─────────────────────────────────────────────
      const transaction = await buildTransaction(connection, [instruction], publicKey);

      const simResult = await simulateTransaction(connection, transaction);
      if (!simResult.success) {
        console.error('[EliminationFinalize] Simulation failed:', simResult.logs);
        throw new Error(`Simulation failed: ${formatTransactionError(simResult.error)}`);
      }

      console.log('[EliminationFinalize] Simulation passed. Sending...');

      let signature: string;
      try {
        signature = await provider.sendAndConfirm(transaction, [], {
          skipPreflight: true,
          commitment: 'confirmed',
        });
      } catch (err: any) {
        throw new Error(`Transaction failed: ${formatTransactionError(err)}`);
      }

      console.log('[EliminationFinalize] ✅ Finalized:', signature);

      return {
        success: true,
        txHash: signature,
        explorerUrl: getTxExplorerUrl(signature),
      };
    },
    [publicKey, connection, provider, program, isConnected, getTxExplorerUrl]
  );

  return { finalizeGame };
}