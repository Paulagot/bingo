/**
 * Creates an Elimination room on-chain.
 * Calls create_room(room_id: string, entry_fee: u64) on the Elimination program.
 */
import { useCallback } from 'react';
import { PublicKey, SystemProgram } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID, getAssociatedTokenAddressSync  } from '@solana/spl-token';
import { BN } from '@coral-xyz/anchor';

import {
  useSolanaEliminationShared,
  ELIMINATION_SEEDS,
} from './useSolanaEliminationShared';
import { SOLANA_TOKENS, toRawAmount, type SolanaTokenCode } from '../config/solanaTokenConfig';
import { buildTransaction, simulateTransaction, formatTransactionError, waitForConfirmation } from '../utils/transaction-helpers';
import type { SolanaNetworkKey } from '../config/networks';

export interface CreateEliminationRoomParams {
  roomId: string;           // used as on-chain seed
  currency: SolanaTokenCode;
  entryFee: number;         // display amount e.g. 1.0
  cluster?: SolanaNetworkKey;
}

export interface CreateEliminationRoomResult {
  success: true;
  contractAddress: string;  // room PDA
  roomVault: string;        // vault ATA
  txHash: string;
  explorerUrl: string;
}

export function useSolanaEliminationCreateRoom(cluster?: SolanaNetworkKey) {
  const {
    publicKey,
    connection,
    provider,
    program,
    isConnected,
    getTxExplorerUrl,
  } = useSolanaEliminationShared({ cluster });

  const createRoom = useCallback(
    async (params: CreateEliminationRoomParams): Promise<CreateEliminationRoomResult> => {
      console.log('[EliminationCreateRoom] 🚀 Starting...', params);

      if (!isConnected || !publicKey || !program || !provider || !connection) {
        throw new Error('Wallet not connected. Please connect your Solana wallet.');
      }

      // ── Token config ──
      const tokenConfig = SOLANA_TOKENS[params.currency];
      if (!tokenConfig) throw new Error(`Unsupported token: ${params.currency}`);

      const WSOL_MINT = 'So11111111111111111111111111111111111111112';
      const mintAddress = tokenConfig.isNative ? WSOL_MINT : tokenConfig.mint;
      if (!mintAddress) throw new Error(`No mint address for ${params.currency}`);

      const feeMint = new PublicKey(mintAddress);

      // ── Entry fee in raw units ──
      const entryFeeRaw = toRawAmount(params.entryFee, params.currency);
      console.log('[EliminationCreateRoom] Entry fee raw:', entryFeeRaw.toString());

      // ── Derive PDAs ──
      // Room PDA: seeds = [b"room", room_id.as_bytes()]
      const [roomPda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from(ELIMINATION_SEEDS.ROOM),
          Buffer.from(params.roomId),
        ],
        program.programId
      );

      // Global config PDA: seeds = [b"global-config"]
      const [globalConfig] = PublicKey.findProgramAddressSync(
        [Buffer.from(ELIMINATION_SEEDS.GLOBAL_CONFIG)],
        program.programId
      );

      // Room vault is an ATA owned by the room PDA
      // The program derives it using associated_token::authority = room
      // We derive it the same way using findAssociatedTokenAddress
   
      const roomVault = getAssociatedTokenAddressSync(
        feeMint,
        roomPda,
        true // allowOwnerOffCurve = true for PDAs
      );

      console.log('[EliminationCreateRoom] PDAs:', {
        room: roomPda.toBase58(),
        roomVault: roomVault.toBase58(),
        globalConfig: globalConfig.toBase58(),
        feeMint: feeMint.toBase58(),
      });

        const programInfo = await connection.getAccountInfo(program.programId);
console.log('[EliminationCreateRoom] Program account check:', {
  programId: program.programId.toBase58(),
  exists: !!programInfo,
  executable: programInfo?.executable ?? false,
  owner: programInfo?.owner?.toBase58?.(),
  lamports: programInfo?.lamports,
})

      // ── Build instruction ──
// REPLACE the instruction building block (the try/catch around program.methods)
// with this:

let instruction;
try {
  instruction = await (program.methods as any)
    .createRoom(params.roomId, new BN(entryFeeRaw.toString()))
    .accountsStrict({
      host: publicKey,
      globalConfig,           // camelCase for Anchor client
      room: roomPda,
      feeMint,
      roomVault,
      tokenProgram: TOKEN_PROGRAM_ID,
      associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
    })
    .instruction();
} catch (err: any) {
  throw new Error(`Failed to build instruction: ${err.message}`);
}

      // ── Build, simulate, send ──
      const transaction = await buildTransaction(connection, [instruction], publicKey);

      const simResult = await simulateTransaction(connection, transaction);
      if (!simResult.success) {
        console.error('[EliminationCreateRoom] Simulation failed:', simResult.logs);
        throw new Error(`Simulation failed: ${formatTransactionError(simResult.error)}`);
      }

let signature: string | undefined;
try {
  const signedTx = await provider.wallet.signTransaction(transaction);

  signature = await connection.sendRawTransaction(
    signedTx.serialize(),
    {
      skipPreflight: false,
      preflightCommitment: 'confirmed',
    }
  );

  console.log('[EliminationCreateRoom] 📝 Signature:', signature);

  const confirmed = await waitForConfirmation(connection, signature, 60_000);
  if (!confirmed) {
    throw new Error('Create room transaction was sent but not confirmed in time');
  }
} catch (err: any) {
  try {
    await (program.account as any).room.fetch(roomPda);
    const sig = signature ?? err?.signature ?? 'unknown';
    return {
      success: true,
      contractAddress: roomPda.toBase58(),
      roomVault: roomVault.toBase58(),
      txHash: sig,
      explorerUrl: getTxExplorerUrl(sig),
    };
  } catch {
    throw new Error(`Transaction failed: ${formatTransactionError(err)}`);
  }
}

if (!signature) {
  throw new Error('Transaction signature missing after send');
}

      console.log('[EliminationCreateRoom] ✅ Room created:', roomPda.toBase58());

      return {
        success: true,
        contractAddress: roomPda.toBase58(),
        roomVault: roomVault.toBase58(),
        txHash: signature,
        explorerUrl: getTxExplorerUrl(signature),
      };
    },
    [publicKey, connection, provider, program, isConnected, getTxExplorerUrl]
  );

;

  return { createRoom };
}