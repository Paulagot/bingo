/**
 * @module features/web3/solana/api/prizes/distribute-prizes
 *
 * ## Purpose
 * Handles prize distribution to winners after a game ends. This module extracts the
 * distribute prizes logic into a focused, testable function that uses Phase 1 utilities
 * for PDA derivation, token account management, and transaction building.
 *
 * ## Architecture
 * This module follows the extraction pattern established in Phase 6.2:
 * - Uses Phase 1 utilities (PDA derivation, token accounts, transactions)
 * - Uses centralized types from Phase 2
 * - Includes comprehensive JSDoc documentation
 * - Is testable and maintainable
 *
 * @see {@link useSolanaContract} - React hook that uses this module
 * @see programs/bingo/src/instructions/distribute_prizes.rs - Distribute prizes instruction
 */



import { PublicKey, TransactionInstruction } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';

// Phase 1 utilities
import {
  deriveRoomVaultPDA,
  deriveGlobalConfigPDA,
} from '@/shared/lib/solana/pda';
import {
  getOrCreateATA,
} from '@/shared/lib/solana/token-accounts';
import { buildTransaction } from '@/shared/lib/solana/transactions';

// Phase 2 types
import type { SolanaContractContext, DistributePrizesParams, DistributePrizesResult } from '@/features/web3/solana/model/types';

export async function distributePrizes(
  context: SolanaContractContext,
  params: DistributePrizesParams
): Promise<DistributePrizesResult> {
  console.log('[distributePrizes] ========== START ==========');
  console.log('[distributePrizes] Input params:', {
    roomId: params.roomId,
    roomAddress: params.roomAddress,
    winners: params.winners,
    winnersCount: params.winners?.length,
    charityWallet: params.charityWallet,
  });

  if (!context.publicKey || !context.provider) {
    throw new Error('Wallet not connected');
  }

  if (!context.program) {
    throw new Error('Program not deployed yet');
  }

  if (!context.connection) {
    throw new Error('Connection not available. Please ensure wallet is connected.');
  }

  const { program, provider, publicKey, connection } = context;

  console.log('[distributePrizes] Context:', {
    publicKey: publicKey.toBase58(),
    programId: program.programId.toBase58(),
  });

  // Validate winners array
  if (!params.winners || params.winners.length === 0) {
    throw new Error('At least one winner must be specified');
  }

  if (params.winners.length > 10) {
    throw new Error('Maximum 10 winners allowed');
  }

  // Derive or use provided room PDA
  let roomPDA: PublicKey;
  if (params.roomAddress) {
    roomPDA = new PublicKey(params.roomAddress);
    console.log('[distributePrizes] Using provided room address:', roomPDA.toBase58());
  } else {
    console.log('[distributePrizes] Searching for room by ID:', params.roomId);
    const rooms = await (program.account as any).room.all();
    const matchingRoom = rooms.find((r: any) => {
      const roomData = r.account;
      const roomIdStr = Buffer.from(roomData.roomId).toString('utf8').replace(/\0/g, '');
      return roomIdStr === params.roomId;
    });

    if (!matchingRoom) {
      throw new Error(`Room "${params.roomId}" not found`);
    }

    roomPDA = matchingRoom.publicKey;
    console.log('[distributePrizes] Found room PDA:', roomPDA.toBase58());
  }

  // Fetch room data
  console.log('[distributePrizes] Fetching room account data...');
  const roomAccount = await (program.account as any).room.fetch(roomPDA);
  console.log('[distributePrizes] Room account:', {
    roomId: roomAccount.roomId,
    host: roomAccount.host.toBase58(),
    feeTokenMint: roomAccount.feeTokenMint.toBase58(),
    charityWallet: roomAccount.charityWallet.toBase58(),
    prizeDistribution: roomAccount.prizeDistribution,
    playerCount: roomAccount.playerCount,
    ended: roomAccount.ended,
    status: roomAccount.status,
  });

  const [roomVault] = deriveRoomVaultPDA(roomPDA);
  const [globalConfig] = deriveGlobalConfigPDA();

  console.log('[distributePrizes] Derived PDAs:', {
    roomVault: roomVault.toBase58(),
    globalConfig: globalConfig.toBase58(),
  });

  // Get charity wallet (use TGB dynamic address if provided, otherwise room's charity wallet)
  const charityWallet = params.charityWallet
    ? new PublicKey(params.charityWallet)
    : (roomAccount.charityWallet as PublicKey);

  console.log('[distributePrizes] Charity wallet:', charityWallet.toBase58());

  // Get fee token mint from room
  const feeTokenMint = roomAccount.feeTokenMint as PublicKey;
  console.log('[distributePrizes] Fee token mint:', feeTokenMint.toBase58());

  // Get global config for platform wallet
  const globalConfigAccount = await (program.account as any).globalConfig.fetch(globalConfig);
  const platformWallet = globalConfigAccount.platformWallet as PublicKey;
  console.log('[distributePrizes] Platform wallet:', platformWallet.toBase58());

  // Convert winner strings to PublicKeys
  const winnerPubkeys = params.winners.map((w: string | PublicKey) =>
    typeof w === 'string' ? new PublicKey(w) : w
  );

  console.log('[distributePrizes] Winner pubkeys:', winnerPubkeys.map(pk => pk.toBase58()));

  // Create setup instructions for missing ATAs
  const setupInstructions: TransactionInstruction[] = [];

  // Check/create charity token account
  console.log('[distributePrizes] Getting/creating charity ATA...');
  const charityATAResult = await getOrCreateATA({
    connection,
    mint: feeTokenMint,
    owner: charityWallet,
    payer: publicKey,
  });
  if (charityATAResult.instruction) {
    console.log('[distributePrizes] Creating charity ATA:', charityATAResult.address.toBase58());
    setupInstructions.push(charityATAResult.instruction);
  } else {
    console.log('[distributePrizes] Charity ATA exists:', charityATAResult.address.toBase58());
  }
  const charityTokenAccount = charityATAResult.address;

  // Check/create platform token account
  console.log('[distributePrizes] Getting/creating platform ATA...');
  const platformATAResult = await getOrCreateATA({
    connection,
    mint: feeTokenMint,
    owner: platformWallet,
    payer: publicKey,
  });
  if (platformATAResult.instruction) {
    console.log('[distributePrizes] Creating platform ATA:', platformATAResult.address.toBase58());
    setupInstructions.push(platformATAResult.instruction);
  } else {
    console.log('[distributePrizes] Platform ATA exists:', platformATAResult.address.toBase58());
  }
  const platformTokenAccount = platformATAResult.address;

  // Check/create host token account
  const hostWallet = roomAccount.host as PublicKey;
  console.log('[distributePrizes] Getting/creating host ATA for:', hostWallet.toBase58());
  const hostATAResult = await getOrCreateATA({
    connection,
    mint: feeTokenMint,
    owner: hostWallet,
    payer: publicKey,
  });
  if (hostATAResult.instruction) {
    console.log('[distributePrizes] Creating host ATA:', hostATAResult.address.toBase58());
    setupInstructions.push(hostATAResult.instruction);
  } else {
    console.log('[distributePrizes] Host ATA exists:', hostATAResult.address.toBase58());
  }
  const hostTokenAccount = hostATAResult.address;

  // Check/create winner token accounts
  const winnerTokenAccounts: PublicKey[] = [];
  console.log('[distributePrizes] Getting/creating winner ATAs...');
  for (let i = 0; i < winnerPubkeys.length; i++) {
    const winnerPubkey = winnerPubkeys[i];
    if (!winnerPubkey) {
      throw new Error(`Winner at index ${i} is undefined`);
    }
    console.log(`[distributePrizes] Winner ${i + 1} wallet:`, winnerPubkey.toBase58());
    const winnerATAResult = await getOrCreateATA({
      connection,
      mint: feeTokenMint,
      owner: winnerPubkey,
      payer: publicKey,
    });
    if (winnerATAResult.instruction) {
      console.log(`[distributePrizes] Creating winner ${i + 1} ATA:`, winnerATAResult.address.toBase58());
      setupInstructions.push(winnerATAResult.instruction);
    } else {
      console.log(`[distributePrizes] Winner ${i + 1} ATA exists:`, winnerATAResult.address.toBase58());
    }
    winnerTokenAccounts.push(winnerATAResult.address);
  }

  console.log(`[distributePrizes] Setup instructions: ${setupInstructions.length} ATAs to create`);
  console.log('[distributePrizes] Winner token accounts:', winnerTokenAccounts.map(pk => pk.toBase58()));

  // Build remaining accounts - ONLY winner token accounts, NOT winner pubkeys
  const remainingAccounts = winnerTokenAccounts.map((ata: PublicKey) => ({
    pubkey: ata,
    isSigner: false,
    isWritable: true,
  }));

  console.log('[distributePrizes] Remaining accounts for contract:', {
    count: remainingAccounts.length,
    accounts: remainingAccounts.map(acc => ({
      pubkey: acc.pubkey.toBase58(),
      isSigner: acc.isSigner,
      isWritable: acc.isWritable,
    })),
  });

  console.log('[distributePrizes] Building endRoom instruction with:', {
    roomId: params.roomId,
    winnersArg: winnerPubkeys.map(pk => pk.toBase58()),
    accounts: {
      room: roomPDA.toBase58(),
      roomVault: roomVault.toBase58(),
      globalConfig: globalConfig.toBase58(),
      charityTokenAccount: charityTokenAccount.toBase58(),
      platformTokenAccount: platformTokenAccount.toBase58(),
      hostTokenAccount: hostTokenAccount.toBase58(),
      host: publicKey.toBase58(),
      tokenProgram: TOKEN_PROGRAM_ID.toBase58(),
    },
    remainingAccountsCount: remainingAccounts.length,
  });

  // Build the endRoom instruction
  const endRoomIx = await (program.methods as any)
    .endRoom(params.roomId, winnerPubkeys)
    .accounts({
      room: roomPDA,
      roomVault,
      globalConfig,
      platformTokenAccount,
      charityTokenAccount,
      hostTokenAccount,
      host: publicKey,
      tokenProgram: TOKEN_PROGRAM_ID,
    })
    .remainingAccounts(remainingAccounts)
    .instruction();

  console.log('[distributePrizes] endRoom instruction built successfully');

  // Build transaction with setup instructions FIRST, then endRoom
  const transaction = await buildTransaction({
    connection,
    instructions: [...setupInstructions, endRoomIx],
    feePayer: publicKey,
    commitment: 'confirmed',
  });

  console.log(`[distributePrizes] Transaction built with ${setupInstructions.length + 1} instructions`);
  console.log('[distributePrizes] Sending transaction...');

  // Send and confirm using Anchor provider
  const signature = await provider.sendAndConfirm(transaction, [], {
    skipPreflight: false,
    commitment: 'confirmed',
  });

  console.log('[distributePrizes] ✅ Transaction confirmed:', signature);
  console.log('[distributePrizes] ========== END ==========');

  // Return only required field, omit optional undefined fields
  return {
    signature,
  };
}