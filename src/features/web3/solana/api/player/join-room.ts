/**
 * @module features/web3/solana/api/player/join-room
 *
 * ## Purpose
 * Handles player joining a bingo room by paying entry fee and optional extras.
 * This module extracts the join room logic into a focused, testable function that
 * uses Phase 1 utilities for PDA derivation, token account management, and transaction building.
 *
 * ## Architecture
 * This module follows the extraction pattern established in Phase 6.2:
 * - Uses Phase 1 utilities (PDA derivation, token accounts, transactions)
 * - Uses centralized types from Phase 2
 * - Includes comprehensive JSDoc documentation
 * - Is testable and maintainable
 *
 * @see {@link useSolanaContract} - React hook that uses this module
 * @see programs/bingo/src/instructions/join_room.rs - Join room instruction
 */

import { PublicKey, SystemProgram, TransactionInstruction } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID, getAccount } from '@solana/spl-token';
import { BN } from '@coral-xyz/anchor';

// Phase 1 utilities
import {
  deriveRoomPDA,
  derivePlayerEntryPDA,
  deriveRoomVaultPDA,
} from '@/shared/lib/solana/pda';
import {
  getAssociatedTokenAccountAddress,
  createATAInstruction,
} from '@/shared/lib/solana/token-accounts';
import { getAssociatedTokenAddress } from '@solana/spl-token';
import { buildTransaction } from '@/shared/lib/solana/transactions';

// Phase 2 types
import type { SolanaContractContext } from '@/features/web3/solana/model/types';

/**
 * Parameters for joining a room
 */
export interface JoinRoomParams {
  roomId: string; // Room identifier
  hostPubkey?: PublicKey; // Room host's pubkey (optional - will be fetched from room data if not provided)
  entryFee?: BN; // Entry fee amount (optional - will be fetched from room data if not provided)
  extrasAmount?: BN; // Additional donation beyond entry fee (optional)
  feeTokenMint?: PublicKey; // SPL token mint (optional - will be fetched from room data if not provided)
  roomPDA?: PublicKey; // Optional: Use this room PDA instead of deriving it (avoids PDA mismatch errors)
}

/**
 * Result of joining a room
 */
export interface JoinRoomResult {
  signature: string; // Transaction signature
  playerEntry: string; // PlayerEntry PDA address (base58 string)
}

/**
 * Joins an existing bingo room by paying the entry fee and optional extras.
 *
 * **Transaction Flow:**
 * 1. Derives Room PDA from host and room ID (or uses provided roomPDA)
 * 2. Derives PlayerEntry PDA for current wallet
 * 3. Checks if Associated Token Account (ATA) exists for fee token
 * 4. Creates ATA if needed (player pays rent ~0.002 SOL)
 * 5. Validates player has sufficient balance
 * 6. Transfers entry fee + extras from player to RoomVault
 * 7. Creates PlayerEntry account recording payment amounts
 * 8. Increments room player count
 *
 * **Payment Breakdown:**
 * - Entry Fee: Added to total pool (pool = total income from entry fees + extras)
 * - Extras: Added to total pool (same as entry fees)
 * - Total Pool Distribution: Split proportionally among host payment (<5%), prize pool, platform wallet, and charity
 *
 * **Account Structure Created:**
 * - PlayerEntry PDA: Records player wallet, fees paid, join timestamp
 * - If missing: Associated Token Account for player (rent-exempt, ~0.002 SOL)
 *
 * **Security:**
 * - Cannot join twice (PlayerEntry PDA prevents duplicate joins)
 * - Cannot join after game started (enforced on-chain)
 * - Cannot join if room full (maxPlayers check on-chain)
 *
 * @param context - Solana contract context (must have program, provider, publicKey, and connection)
 * @param params - Join room parameters
 * @param params.roomId - Room identifier (must match room creation)
 * @param params.hostPubkey - Host's Solana public key (optional - will be fetched if not provided)
 * @param params.extrasAmount - Additional donation beyond entry fee (in token base units, optional)
 * @param params.feeTokenMint - SPL token mint (optional - will be fetched if not provided)
 * @param params.entryFee - Entry fee amount (optional - will be fetched if not provided)
 * @param params.roomPDA - Optional room PDA address (avoids derivation if provided)
 * @returns Join result with transaction signature and player entry PDA
 *
 * @throws {Error} 'Wallet not connected' - If publicKey or provider is null
 * @throws {Error} 'Program not deployed yet' - If Anchor program not initialized
 * @throws {Error} 'Room not found' - If Room PDA doesn't exist
 * @throws {Error} 'Room full' - If maxPlayers reached
 * @throws {Error} 'Already joined' - If PlayerEntry already exists
 * @throws {Error} 'Insufficient balance' - If player doesn't have enough tokens
 * @throws {Error} Transaction simulation errors - If on-chain execution would fail
 *
 * @example
 * ```typescript
 * const result = await joinRoom(context, {
 *   roomId: 'bingo-night-2024',
 *   hostPubkey: new PublicKey('Host...'),
 *   extrasAmount: new BN(10_000_000), // +10 USDC donation
 *   feeTokenMint: USDC_MINT,
 * });
 *
 * console.log('Joined room:', result.playerEntry);
 * console.log('Transaction:', result.signature);
 * ```
 *
 * @see {@link https://spl.solana.com/associated-token-account} - ATA spec
 */
export async function joinRoom(
  context: SolanaContractContext,
  params: JoinRoomParams
): Promise<JoinRoomResult> {
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

  // Validate roomId length (max 32 chars per Solana program constraint)
  if (params.roomId.length > 32) {
    throw new Error(`Room ID cannot exceed 32 characters. Current length: ${params.roomId.length}`);
  }

  // If host pubkey or fee token mint not provided, we need to find the room
  // by searching all possible host addresses
  let hostPubkey = params.hostPubkey;
  let feeTokenMint = params.feeTokenMint;
  let roomPDA = params.roomPDA;

  if (!hostPubkey || !feeTokenMint) {
    // Try to fetch all rooms and find the one with matching roomId
    // This is a workaround - ideally the UI should pass these parameters
    const rooms = await (program.account as any).room.all();
    const matchingRoom = rooms.find((r: any) => {
      const roomData = r.account;
      const roomIdStr = Buffer.from(roomData.roomId).toString('utf8').replace(/\0/g, '');
      return roomIdStr === params.roomId;
    });

    if (!matchingRoom) {
      throw new Error(`Room "${params.roomId}" not found`);
    }

    const roomAccount = matchingRoom.account;
    // Convert to PublicKey instances (Anchor may return them as objects or strings)
    // Use toBase58() to ensure we have a valid string representation first
    try {
      hostPubkey = roomAccount.host instanceof PublicKey 
        ? roomAccount.host 
        : new PublicKey(typeof roomAccount.host === 'string' ? roomAccount.host : roomAccount.host.toBase58());
      feeTokenMint = roomAccount.feeTokenMint instanceof PublicKey
        ? roomAccount.feeTokenMint
        : new PublicKey(typeof roomAccount.feeTokenMint === 'string' ? roomAccount.feeTokenMint : roomAccount.feeTokenMint.toBase58());
      roomPDA = matchingRoom.publicKey;
    } catch (error: any) {
      throw new Error(
        `Failed to convert room account data to PublicKey: ${error.message}. ` +
        `host: ${JSON.stringify(roomAccount.host)}, feeTokenMint: ${JSON.stringify(roomAccount.feeTokenMint)}`
      );
    }
  }

  // If roomPDA is provided but feeTokenMint is missing, fetch room data
  if (roomPDA && !feeTokenMint) {
    try {
      const roomAccount = await (program.account as any).room.fetch(roomPDA);
      // Convert to PublicKey instances - use toBase58() to ensure valid string
      try {
        feeTokenMint = roomAccount.feeTokenMint instanceof PublicKey
          ? roomAccount.feeTokenMint
          : new PublicKey(typeof roomAccount.feeTokenMint === 'string' ? roomAccount.feeTokenMint : roomAccount.feeTokenMint.toBase58());
        if (!hostPubkey) {
          hostPubkey = roomAccount.host instanceof PublicKey
            ? roomAccount.host
            : new PublicKey(typeof roomAccount.host === 'string' ? roomAccount.host : roomAccount.host.toBase58());
        }
      } catch (convertError: any) {
        throw new Error(
          `Failed to convert room account data to PublicKey: ${convertError.message}. ` +
          `host: ${JSON.stringify(roomAccount.host)}, feeTokenMint: ${JSON.stringify(roomAccount.feeTokenMint)}`
        );
      }
    } catch (error: any) {
      throw new Error(`Failed to fetch room data from provided roomPDA: ${error.message}`);
    }
  }

  // Validate required parameters after fetch
  if (!feeTokenMint) {
    throw new Error(`Fee token mint not found for room "${params.roomId}". Room may be corrupted or not fully initialized.`);
  }

  if (!hostPubkey) {
    throw new Error(`Host pubkey not found for room "${params.roomId}". Room may be corrupted or not fully initialized.`);
  }

  // Derive room PDA - use provided or derive from host
  let room: PublicKey;
  if (roomPDA) {
    room = roomPDA;
  } else {
    if (!hostPubkey) {
      throw new Error(`Cannot derive room PDA: host pubkey is required for room "${params.roomId}"`);
    }
    [room] = deriveRoomPDA(hostPubkey, params.roomId);
  }
  const [playerEntry] = derivePlayerEntryPDA(room, publicKey);
  const [roomVault] = deriveRoomVaultPDA(room);

  // Fetch room data to get entry fee if not provided
  let entryFee = params.entryFee;
  if (!entryFee) {
    const roomAccount = await (program.account as any).room.fetch(room);
    entryFee = roomAccount.entryFee as BN;
  }

  // Validate feeTokenMint is a valid PublicKey before use
  if (!feeTokenMint) {
    throw new Error(`Fee token mint is required for room "${params.roomId}" but was not found.`);
  }

  // Ensure feeTokenMint is a valid PublicKey instance
  let validFeeTokenMint: PublicKey;
  try {
    if (feeTokenMint instanceof PublicKey) {
      validFeeTokenMint = feeTokenMint;
    } else if (typeof feeTokenMint === 'string') {
      validFeeTokenMint = new PublicKey(feeTokenMint);
    } else if (feeTokenMint && typeof (feeTokenMint as any).toBase58 === 'function') {
      validFeeTokenMint = new PublicKey((feeTokenMint as any).toBase58());
    } else {
      throw new Error(`Invalid fee token mint type: ${typeof feeTokenMint}`);
    }
    // Validate it's a valid PublicKey by calling toBase58
    validFeeTokenMint.toBase58();
  } catch (error: any) {
    throw new Error(
      `Invalid fee token mint for room "${params.roomId}": ${error.message}. ` +
      `Type: ${typeof feeTokenMint}, Value: ${JSON.stringify(feeTokenMint)}`
    );
  }

  if (!publicKey) {
    throw new Error('Public key is required but wallet is not connected.');
  }

  // Ensure publicKey is a valid PublicKey instance
  let validPublicKey: PublicKey;
  try {
    if (publicKey instanceof PublicKey) {
      validPublicKey = publicKey;
    } else if (typeof publicKey === 'string') {
      validPublicKey = new PublicKey(publicKey);
    } else if (publicKey && typeof (publicKey as any).toBase58 === 'function') {
      validPublicKey = new PublicKey((publicKey as any).toBase58());
    } else {
      throw new Error(`Invalid public key type: ${typeof publicKey}`);
    }
    // Validate it's a valid PublicKey by calling toBase58
    validPublicKey.toBase58();
  } catch (error: any) {
    throw new Error(
      `Invalid public key. Wallet may not be properly connected: ${error.message}. ` +
      `Type: ${typeof publicKey}, Value: ${JSON.stringify(publicKey)}`
    );
  }

  // Create player's Associated Token Account (ATA) if it doesn't exist
  // Use getAssociatedTokenAddress directly from @solana/spl-token (same as createsolanaroom.tsx)
  let playerTokenAccount: PublicKey;
  try {
    // Use the SPL token library function directly - it may return a Promise in some versions
    const ataAddressResult = getAssociatedTokenAddress(
      validFeeTokenMint,
      validPublicKey,
      false, // allowOwnerOffCurve
      TOKEN_PROGRAM_ID
    );
    
    // Handle both sync and async returns
    const ataAddress = ataAddressResult instanceof Promise 
      ? await ataAddressResult 
      : ataAddressResult;
    
    // Ensure it's a PublicKey instance
    playerTokenAccount = ataAddress instanceof PublicKey 
      ? ataAddress 
      : new PublicKey(ataAddress);
  } catch (error: any) {
    throw new Error(
      `Failed to derive player token account: ${error.message}. ` +
      `feeTokenMint: ${validFeeTokenMint.toBase58()}, publicKey: ${validPublicKey.toBase58()}`
    );
  }

  const instructions: TransactionInstruction[] = [];

  // Check if player ATA exists
  let ataExists = false;
  try {
    await getAccount(connection, playerTokenAccount);
    ataExists = true;
  } catch (error: any) {
    // ATA doesn't exist - need to create it
    const createATAIx = createATAInstruction({
      mint: validFeeTokenMint,
      owner: validPublicKey,
      payer: validPublicKey,
    });
    instructions.push(createATAIx);
  }

  // Check player balance
  try {
    const balance = await connection.getTokenAccountBalance(playerTokenAccount);
    const balanceBN = new BN(balance.value.amount);
    const totalRequired = params.extrasAmount
      ? entryFee.add(params.extrasAmount)
      : entryFee;

    if (balanceBN.lt(totalRequired)) {
      const token = validFeeTokenMint.toBase58() === 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v' ? 'USDC' : 'tokens';
      throw new Error(
        `Insufficient balance. Required: ${totalRequired.toString()} ${token}, Available: ${balanceBN.toString()} ${token}`
      );
    }
  } catch (error: any) {
    if (!ataExists) {
      // ATA doesn't exist yet, so balance check fails - this is expected
    } else {
      throw error;
    }
  }

  // Validate playerTokenAccount is a valid PublicKey before passing to Anchor
  if (!(playerTokenAccount instanceof PublicKey)) {
    throw new Error(
      `Invalid player token account. Expected PublicKey, got ${typeof playerTokenAccount}. ` +
      `feeTokenMint: ${validFeeTokenMint?.toBase58() || 'undefined'}, ` +
      `publicKey: ${validPublicKey?.toBase58() || 'undefined'}`
    );
  }

  // Build join room instruction
  // All accounts have been validated as PublicKey instances above
  const joinRoomIx = await (program.methods as any)
    .joinRoom(params.roomId, params.extrasAmount || new BN(0))
    .accounts({
      room,
      roomVault,
      playerEntry,
      player: validPublicKey,
      playerTokenAccount, // Already validated as PublicKey above
      tokenProgram: TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
    })
    .instruction();

  instructions.push(joinRoomIx);

  // Build transaction using Phase 1 utilities
  const transaction = await buildTransaction({
    connection,
    instructions,
    feePayer: publicKey,
    commitment: 'confirmed',
  });

  // Send and confirm using Anchor provider (handles signing automatically)
  const signature = await provider.sendAndConfirm(transaction, [], {
    skipPreflight: false,
    commitment: 'confirmed',
  });

  return {
    signature,
    playerEntry: playerEntry.toBase58(),
  };
}

