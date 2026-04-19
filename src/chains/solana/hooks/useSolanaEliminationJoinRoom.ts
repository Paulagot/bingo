/**
 * Solana Elimination Join Room Hook
 * Calls join_room on the Elimination program.
 * Handles both native SOL (wSOL wrap) and SPL token rooms.
 */
import { useCallback } from 'react';
import { PublicKey, SystemProgram } from '@solana/web3.js';
import {
  TOKEN_PROGRAM_ID,

  getAssociatedTokenAddress,
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
   waitForConfirmation,
} from '../utils/transaction-helpers';
import type { SolanaNetworkKey } from '../config/networks';

const WSOL_MINT = 'So11111111111111111111111111111111111111112';

export interface EliminationJoinParams {
  roomId: string;
  roomPda: string;
  feeMint: string;
  entryFee: number;
  currency: string;
}

export interface EliminationJoinResult {
  success: true;
  txHash: string;
  explorerUrl: string;
}

export function useSolanaEliminationJoinRoom(cluster?: SolanaNetworkKey) {
  const {
    publicKey,
    connection,
    provider,
    program,
    isConnected,
    getTxExplorerUrl,
  } = useSolanaEliminationShared({ cluster });

  const joinRoom = useCallback(
    async (params: EliminationJoinParams): Promise<EliminationJoinResult> => {
      console.log('[EliminationJoinRoom] 🎮 Starting...', params);

      if (!isConnected || !publicKey || !program || !provider || !connection) {
        throw new Error('Wallet not connected. Please connect your Solana wallet.');
      }

      const isNativeSOL = params.feeMint === WSOL_MINT;

      // ── Resolve public keys ───────────────────────────────────────────────
      let roomPda: PublicKey;
      let feeMint: PublicKey;

      try {
        roomPda = new PublicKey(params.roomPda);
      } catch {
        throw new Error(`Invalid room PDA: ${params.roomPda}`);
      }

      try {
        feeMint = new PublicKey(params.feeMint);
      } catch {
        throw new Error(`Invalid fee mint: ${params.feeMint}`);
      }

      // ── Check if already joined ───────────────────────────────────────────
      const [playerEntryPda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from(ELIMINATION_SEEDS.PLAYER_ENTRY),
          roomPda.toBuffer(),
          publicKey.toBuffer(),
        ],
        program.programId
      );

      try {
        await (program.account as any).playerEntry.fetch(playerEntryPda);
        console.log('[EliminationJoinRoom] ✅ Already joined — returning existing entry');
        return {
          success: true,
          txHash: 'already-joined',
          explorerUrl: getTxExplorerUrl(''),
        };
      } catch {
        // Account doesn't exist — proceed with join
      }

      // ── Balance check ─────────────────────────────────────────────────────
      if (isNativeSOL) {
        // Check native SOL balance
        const solBalance = await connection.getBalance(publicKey);
        const buffer = 10_000_000; // 0.01 SOL buffer for tx fees + rent
        const required = params.entryFee + buffer;

        console.log('[EliminationJoinRoom] SOL balance:', solBalance, 'required:', required);

        if (solBalance < required) {
          throw new Error(
            `Insufficient SOL balance. Required: ${(params.entryFee / 1e9).toFixed(6)} SOL + fees, ` +
            `available: ${(solBalance / 1e9).toFixed(6)} SOL`
          );
        }
      } else {
        // Check SPL token balance
        const playerToken = await getAssociatedTokenAddress(feeMint, publicKey);
        try {
          const balance = await connection.getTokenAccountBalance(playerToken);
          const balanceRaw = BigInt(balance.value.amount);
          const requiredRaw = BigInt(params.entryFee);

          console.log('[EliminationJoinRoom] Token balance raw:', balanceRaw.toString(), 'required:', requiredRaw.toString());

          if (balanceRaw < requiredRaw) {
            throw new Error(
              `Insufficient token balance. Required: ${balance.value.uiAmountString}, ` +
              `you have: ${balance.value.uiAmountString}`
            );
          }
        } catch (err: any) {
          if (err.message?.includes('could not find account')) {
            throw new Error(
              'You don\'t have a token account for this token. ' +
              'Please add the token to your wallet first.'
            );
          }
          if (err.message?.includes('Insufficient')) throw err;
          console.warn('[EliminationJoinRoom] Could not check balance:', err.message);
        }
      }

      // ── Get player token account ──────────────────────────────────────────
      // For SOL rooms we use wSOL ATA — it gets created by the wrap instructions
      const playerToken = await getAssociatedTokenAddress(feeMint, publicKey);

      // ── Get room vault ────────────────────────────────────────────────────
      const roomVault = getAssociatedTokenAddressSync(feeMint, roomPda, true);

      console.log('[EliminationJoinRoom] Accounts:', {
        player: publicKey.toBase58(),
        room: roomPda.toBase58(),
        feeMint: feeMint.toBase58(),
        playerEntry: playerEntryPda.toBase58(),
        playerToken: playerToken.toBase58(),
        roomVault: roomVault.toBase58(),
        isNativeSOL,
      });

      // ── Build join_room instruction ───────────────────────────────────────
      let instruction;
      try {
        instruction = await (program.methods as any)
          .joinRoom()
          .accountsStrict({
            player: publicKey,
            room: roomPda,
            feeMint,
            playerEntry: playerEntryPda,
            playerToken,
            roomVault,
            tokenProgram: TOKEN_PROGRAM_ID,
            systemProgram: SystemProgram.programId,
          })
          .instruction();
      } catch (err: any) {
        throw new Error(`Failed to build join instruction: ${err.message}`);
      }

      // ── Prepend wSOL wrap instructions for native SOL rooms ───────────────
      let allInstructions = [instruction];

      if (isNativeSOL) {
        console.log('[EliminationJoinRoom] Native SOL room — prepending wSOL wrap instructions');
        try {
          const { buildWrapSolInstructions } = await import('../utils/wsolUtils');
          const wrapIxs = await buildWrapSolInstructions(
            connection,
            publicKey,
            BigInt(params.entryFee)
          );
          allInstructions = [...wrapIxs, instruction];
          console.log('[EliminationJoinRoom] Wrap instructions prepended:', wrapIxs.length);
        } catch (err: any) {
          throw new Error(`Failed to build SOL wrap instructions: ${err.message}`);
        }
      }

      // ── Build, simulate, send ─────────────────────────────────────────────
      const transaction = await buildTransaction(connection, allInstructions, publicKey);

      const simResult = await simulateTransaction(connection, transaction);
      if (!simResult.success) {
        console.error('[EliminationJoinRoom] Simulation failed:', simResult.logs);
        throw new Error(`Simulation failed: ${formatTransactionError(simResult.error)}`);
      }

      console.log('[EliminationJoinRoom] Simulation passed — sending...');

      let signature: string | undefined;
      try {
        const signedTx = await provider.wallet.signTransaction(transaction);

        signature = await connection.sendRawTransaction(signedTx.serialize(), {
          skipPreflight: true,
          preflightCommitment: 'confirmed',
        });

        console.log('[EliminationJoinRoom] Sent transaction:', signature);
        console.log('[EliminationJoinRoom] Waiting for confirmation...');

        const confirmed = await waitForConfirmation(connection, signature, 60_000);

        if (!confirmed) {
          throw new Error('Transaction was sent but not confirmed in time');
        }
      } catch (err: any) {
        // tx may have landed even though confirmation threw — check the PDA
        try {
          await (program.account as any).playerEntry.fetch(playerEntryPda);

          let txHash = signature || 'already-joined';

          try {
            const sigs = await connection.getSignaturesForAddress(playerEntryPda, {
              limit: 1,
            });
            const first = sigs[0];
            if (first?.signature) {
              txHash = first.signature;
              console.log('[EliminationJoinRoom] Recovered real signature:', txHash);
            }
          } catch {
            console.warn('[EliminationJoinRoom] Could not recover signature, using fallback');
          }

          return {
            success: true,
            txHash,
            explorerUrl: getTxExplorerUrl(txHash === 'already-joined' ? '' : txHash),
          };
        } catch {
          throw new Error(`Transaction failed: ${formatTransactionError(err)}`);
        }
      }

      console.log('[EliminationJoinRoom] ✅ Joined room:', signature);

      return {
        success: true,
        txHash: signature,
        explorerUrl: getTxExplorerUrl(signature),
      };
    },
    [publicKey, connection, provider, program, isConnected, getTxExplorerUrl]
  );

  return { joinRoom };
}