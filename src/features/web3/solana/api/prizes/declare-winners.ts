/**
 * @module features/web3/solana/api/prizes/declare-winners
 */

import { PublicKey } from '@solana/web3.js';
// ✅ FIXED: Removed unused imports

// Phase 1 utilities
import { deriveRoomPDA, derivePlayerEntryPDA } from '@/shared/lib/solana/pda';
import { buildTransaction } from '@/shared/lib/solana/transactions';

// Phase 2 types
import type { SolanaContractContext } from '@/features/web3/solana/model/types';

export interface DeclareWinnersParams {
  roomId: string;
  hostPubkey: PublicKey;
  winners: PublicKey[];
}

import { simulateTransaction, formatTransactionError } from '@/shared/lib/solana/transaction-helpers';

export interface DeclareWinnersResult {
  signature: string;
}

export async function declareWinners(
  context: SolanaContractContext,
  params: DeclareWinnersParams
): Promise<DeclareWinnersResult> {
  if (!context.publicKey || !context.provider) {
    throw new Error('Wallet not connected');
  }

  if (!context.program) {
    throw new Error('Program not deployed yet. Run: cd solana-program/bingo && anchor deploy');
  }

  if (!context.connection) {
    throw new Error('Connection not available. Please ensure wallet is connected.');
  }

  const { program, provider, publicKey, connection } = context;

  // Validate winners
  if (params.winners.length < 1 || params.winners.length > 10) {
    throw new Error('Must declare 1-10 winners');
  }

  // Derive room PDA
  const [room] = deriveRoomPDA(params.hostPubkey, params.roomId);

  // Derive PlayerEntry PDAs for each winner
  const playerEntryPDAs = params.winners.map(winner => {
    const [playerEntry] = derivePlayerEntryPDA(room, winner);
    return playerEntry;
  });

  // Fetch and validate room state
  try {
    const roomAccount = await (program.account as any).room.fetch(room);

    if (roomAccount.host.toBase58() !== params.hostPubkey.toBase58()) {
      console.error('[declareWinners] ⚠️ WARNING: Host mismatch!');
    }

    if (roomAccount.ended) {
      console.error('[declareWinners] ⚠️ WARNING: Room already ended!');
    }

    if (roomAccount.winners && roomAccount.winners.length > 0) {
      console.error('[declareWinners] ⚠️ WARNING: Winners already declared!');
    }
  } catch (e: any) {
    console.error('[declareWinners] ❌ Failed to fetch room account:', e);
    throw new Error('Cannot fetch room account: ' + e.message);
  }

  // ✅ FIXED: Add null check for program.methods
  if (!program.methods) {
    throw new Error('Program methods not available');
  }

  // Build instruction with PlayerEntry PDAs as remaining_accounts
  const ix = await (program.methods as any)
    .declareWinners(params.roomId, params.winners)
    .accounts({
      room,
      host: publicKey,
    })
    .remainingAccounts(
      playerEntryPDAs.map(playerEntry => ({
        pubkey: playerEntry,
        isSigner: false,
        isWritable: false,
      }))
    )
    .instruction();

  // Build transaction and simulate
  const transaction = await buildTransaction({
    connection,
    instructions: [ix],
    feePayer: publicKey,
    commitment: 'finalized',
  });

  const simResult = await simulateTransaction(connection, transaction);

  if (!simResult.success) {
    console.error('[declareWinners] Simulation failed:', simResult.error);
    throw new Error(formatTransactionError(simResult.error) || 'Transaction simulation failed');
  }

  // Send and confirm transaction
  const signature = await provider.sendAndConfirm(transaction, [], {
    skipPreflight: false,
    commitment: 'confirmed',
  });

  return { signature };
}

