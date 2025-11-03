/**
 * Solana Asset Room Functions
 *
 * Implements createAssetRoom() and depositPrizeAsset() for the Solana blockchain.
 * These functions work with the deployed Anchor program's init_asset_room and add_prize_asset instructions.
 */

import { Connection, PublicKey, Transaction, SystemProgram, SYSVAR_RENT_PUBKEY } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID, getAssociatedTokenAddress, createAssociatedTokenAccountInstruction } from '@solana/spl-token';
import { Program, AnchorProvider, BN } from '@coral-xyz/anchor';
import { PROGRAM_ID } from './config';

// ============================================================================
// Types
// ============================================================================

export interface CreateAssetRoomParams {
  roomId: string;
  charityWallet: PublicKey;
  entryFee: BN;
  maxPlayers: number;
  hostFeeBps: number; // 0-500 (no prize pool for asset rooms)
  charityMemo: string;
  expirationSlots?: BN;
  feeTokenMint: PublicKey;
  // Prize configuration (up to 3 prizes)
  prize1Mint: PublicKey;
  prize1Amount: BN;
  prize2Mint?: PublicKey;
  prize2Amount?: BN;
  prize3Mint?: PublicKey;
  prize3Amount?: BN;
}

export interface DepositPrizeAssetParams {
  roomId: string;
  hostPubkey: PublicKey;
  prizeIndex: number; // 0, 1, or 2
  prizeMint: PublicKey;
}

// ============================================================================
// PDA Derivation Helpers
// ============================================================================

export function deriveRoomPDA(host: PublicKey, roomId: string): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('room'), host.toBuffer(), Buffer.from(roomId)],
    PROGRAM_ID
  );
}

export function deriveGlobalConfigPDA(): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('global-config')],
    PROGRAM_ID
  );
}

export function deriveTokenRegistryPDA(): [PublicKey, number] {
  const seed = 'token-registry-v4';
  console.log('[deriveTokenRegistryPDA] Input - Seed:', seed, 'Program:', PROGRAM_ID.toString());
  const result = PublicKey.findProgramAddressSync(
    [Buffer.from(seed)],
    PROGRAM_ID
  );
  console.log('[deriveTokenRegistryPDA] Output - PDA:', result[0].toString(), 'Bump:', result[1]);

  // Verify it matches expected
  const expected = '3csDix6xeVKY6Pxxrm2mnScpA9zcyxX4twatFLVeQ8Ur';
  if (result[0].toString() !== expected) {
    console.error('[deriveTokenRegistryPDA] ❌ MISMATCH! Got:', result[0].toString(), 'Expected:', expected);
    console.error('[deriveTokenRegistryPDA] This means PROGRAM_ID is wrong:', PROGRAM_ID.toString());
  } else {
    console.log('[deriveTokenRegistryPDA] ✅ Correct PDA derived');
  }

  return result;
}

export function deriveRoomVaultPDA(room: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('room-vault'), room.toBuffer()],
    PROGRAM_ID
  );
}

export function derivePrizeVaultPDA(room: PublicKey, prizeIndex: number): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [
      Buffer.from('prize-vault'),
      room.toBuffer(),
      Buffer.from([prizeIndex])
    ],
    PROGRAM_ID
  );
}

// ============================================================================
// Create Asset Room
// ============================================================================

/**
 * Creates an asset-based room where prizes are pre-deposited SPL tokens.
 *
 * **Flow:**
 * 1. Room created with status: AwaitingFunding
 * 2. Host must call depositPrizeAsset() for each prize
 * 3. Once all prizes deposited, status changes to Ready
 * 4. Players can then join
 *
 * **Fee Distribution (Asset Mode):**
 * - Platform: 20% (fixed)
 * - Host: 0-5% (configurable)
 * - Charity: 75-80% (remainder)
 * - No prize pool percentage (prizes are pre-deposited assets)
 */
export async function createAssetRoom(
  program: Program,
  provider: AnchorProvider,
  connection: Connection,
  publicKey: PublicKey,
  params: CreateAssetRoomParams
): Promise<{ signature: string; room: string }> {
  console.log('[createAssetRoom] Starting asset room creation:', {
    roomId: params.roomId,
    entryFee: params.entryFee.toString(),
    maxPlayers: params.maxPlayers,
    hostFeeBps: params.hostFeeBps,
  });

  // Validate inputs
  if (params.roomId.length > 32 || params.roomId.length === 0) {
    throw new Error('Room ID must be 1-32 characters');
  }

  if (params.hostFeeBps > 500) {
    throw new Error('Host fee cannot exceed 5% (500 basis points)');
  }

  // Derive PDAs
  const [globalConfig] = deriveGlobalConfigPDA();
  const [tokenRegistry] = deriveTokenRegistryPDA();
  const [room] = deriveRoomPDA(publicKey, params.roomId);
  const [roomVault] = deriveRoomVaultPDA(room);

  console.log('[createAssetRoom] PDAs derived:', {
    globalConfig: globalConfig.toBase58(),
    tokenRegistry: tokenRegistry.toBase58(),
    room: room.toBase58(),
    roomVault: roomVault.toBase58(),
  });

  // Check wallet balance for rent
  const hostBalance = await connection.getBalance(publicKey);
  const ROOM_ACCOUNT_SIZE = 500; // Approximate size
  const roomRent = await connection.getMinimumBalanceForRentExemption(ROOM_ACCOUNT_SIZE);
  const vaultRent = await connection.getMinimumBalanceForRentExemption(165);
  const totalRent = roomRent + vaultRent + 0.001 * 1e9; // Buffer for tx fees

  if (hostBalance < totalRent) {
    throw new Error(
      `Insufficient SOL. Need ${(totalRent / 1e9).toFixed(4)} SOL, have ${(hostBalance / 1e9).toFixed(4)} SOL`
    );
  }

  // Build init_asset_room instruction
  const ix = await program.methods
    .initAssetRoom(
      params.roomId,
      params.charityWallet,
      params.entryFee,
      params.maxPlayers,
      params.hostFeeBps,
      params.charityMemo,
      params.expirationSlots ?? null,
      params.prize1Mint,
      params.prize1Amount,
      params.prize2Mint ?? null,
      params.prize2Amount ?? null,
      params.prize3Mint ?? null,
      params.prize3Amount ?? null
    )
    .accounts({
      room,
      roomVault,
      feeTokenMint: params.feeTokenMint,
      globalConfig,
      tokenRegistry,
      host: publicKey,
      systemProgram: SystemProgram.programId,
      tokenProgram: TOKEN_PROGRAM_ID,
      rent: SYSVAR_RENT_PUBKEY,
    })
    .instruction();

  // Build and send transaction
  const tx = new Transaction().add(ix);
  tx.feePayer = publicKey;
  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('finalized');
  tx.recentBlockhash = blockhash;
  tx.lastValidBlockHeight = lastValidBlockHeight;

  console.log('[createAssetRoom] Sending transaction...');

  // Sign and send with same blockhash to avoid expiration
  let signedTx;
  try {
    signedTx = await provider.wallet.signTransaction(tx);
    console.log('[createAssetRoom] Transaction signed successfully');
  } catch (signError: any) {
    console.error('[createAssetRoom] Signing failed:', signError);
    if (signError?.message?.includes('User rejected')) {
      throw new Error('Transaction rejected by user');
    }
    throw new Error(`Failed to sign transaction: ${signError?.message || 'Unknown error'}`);
  }

  const rawTx = signedTx.serialize();
  console.log('[createAssetRoom] Transaction serialized, sending to network...');

  let signature;
  try {
    signature = await connection.sendRawTransaction(rawTx, {
      skipPreflight: false,
      maxRetries: 3,
    });
    console.log('[createAssetRoom] Transaction sent:', signature);
  } catch (sendError: any) {
    console.error('[createAssetRoom] Send failed:', sendError);
    if (sendError?.message?.includes('Blockhash not found')) {
      throw new Error('Transaction expired. Please try again and approve quickly.');
    }
    throw new Error(`Failed to send transaction: ${sendError?.message || 'Unknown error'}`);
  }

  // Wait for confirmation
  console.log('[createAssetRoom] Waiting for confirmation...');
  let confirmation;
  try {
    confirmation = await connection.confirmTransaction({
      signature,
      blockhash,
      lastValidBlockHeight,
    }, 'confirmed');
    console.log('[createAssetRoom] Confirmation received:', confirmation);
  } catch (confirmError: any) {
    console.error('[createAssetRoom] Confirmation failed:', confirmError);
    throw new Error(`Transaction confirmation failed: ${confirmError?.message || 'Unknown error'}`);
  }

  if (confirmation.value.err) {
    console.error('[createAssetRoom] Transaction error:', confirmation.value.err);
    throw new Error(`Transaction failed: ${JSON.stringify(confirmation.value.err)}`);
  }

  console.log('✅ Asset room created:', {
    signature,
    room: room.toBase58(),
    explorerUrl: `https://explorer.solana.com/tx/${signature}?cluster=devnet`,
  });

  return { signature, room: room.toBase58() };
}

// ============================================================================
// Deposit Prize Asset
// ============================================================================

/**
 * Deposits a prize asset into an asset-based room.
 *
 * **Flow:**
 * 1. Host creates asset room (status: AwaitingFunding)
 * 2. Host calls this for prize index 0 (1st place)
 * 3. Host calls this for prize index 1 (2nd place) - optional
 * 4. Host calls this for prize index 2 (3rd place) - optional
 * 5. Once all configured prizes deposited, status → Ready
 *
 * **Requirements:**
 * - Caller must be room host
 * - Room must be asset-based mode
 * - Prize not already deposited
 * - Host must have sufficient token balance
 */
export async function depositPrizeAsset(
  program: Program,
  provider: AnchorProvider,
  connection: Connection,
  publicKey: PublicKey,
  params: DepositPrizeAssetParams
): Promise<{ signature: string }> {
  console.log('[depositPrizeAsset] Starting prize deposit:', {
    roomId: params.roomId,
    prizeIndex: params.prizeIndex,
    prizeMint: params.prizeMint.toBase58(),
  });

  // Validate prize index
  if (params.prizeIndex < 0 || params.prizeIndex > 2) {
    throw new Error('Prize index must be 0, 1, or 2');
  }

  // Derive PDAs
  const [room] = deriveRoomPDA(params.hostPubkey, params.roomId);

  // ✅ FIX: Prize vault should be an Associated Token Account (ATA) for the room PDA
  // The room PDA is the owner (so the program can control it), not derived from seeds
  const prizeVault = await getAssociatedTokenAddress(
    params.prizeMint,
    room,
    true // allowOwnerOffCurve = true (room is a PDA, not a keypair)
  );

  // Get host's token account
  const hostTokenAccount = await getAssociatedTokenAddress(
    params.prizeMint,
    publicKey
  );

  console.log('[depositPrizeAsset] Accounts:', {
    room: room.toBase58(),
    prizeVault: prizeVault.toBase58(),
    hostTokenAccount: hostTokenAccount.toBase58(),
    prizeMint: params.prizeMint.toBase58(),
  });

  // ✅ Check if prize vault exists, create if needed
  const vaultInfo = await connection.getAccountInfo(prizeVault);
  const hostTokenInfo = await connection.getAccountInfo(hostTokenAccount);
  const instructions = [];

  if (!vaultInfo) {
    console.log('[depositPrizeAsset] Prize vault does not exist, creating ATA...');
    const createAtaIx = createAssociatedTokenAccountInstruction(
      publicKey,      // payer
      prizeVault,     // ata address
      room,           // owner (room PDA)
      params.prizeMint // mint
    );
    instructions.push(createAtaIx);
  } else {
    console.log('[depositPrizeAsset] Prize vault already exists');
  }

  // ✅ Check if host's token account exists, create if needed
  if (!hostTokenInfo) {
    console.log('[depositPrizeAsset] Host token account does not exist, creating ATA...');
    const createHostAtaIx = createAssociatedTokenAccountInstruction(
      publicKey,           // payer
      hostTokenAccount,    // ata address
      publicKey,           // owner (host wallet)
      params.prizeMint     // mint
    );
    instructions.push(createHostAtaIx);
  } else {
    console.log('[depositPrizeAsset] Host token account already exists');
  }

  // Build add_prize_asset instruction
  const addPrizeIx = await program.methods
    .addPrizeAsset(params.roomId, params.prizeIndex)
    .accounts({
      room,
      prizeVault,
      prizeMint: params.prizeMint,
      hostTokenAccount,
      host: publicKey,
      systemProgram: SystemProgram.programId,
      tokenProgram: TOKEN_PROGRAM_ID,
      associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      rent: SYSVAR_RENT_PUBKEY,
    })
    .instruction();

  instructions.push(addPrizeIx);

  // Build and send transaction
  const tx = new Transaction().add(...instructions);
  tx.feePayer = publicKey;
  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('finalized');
  tx.recentBlockhash = blockhash;
  tx.lastValidBlockHeight = lastValidBlockHeight;

  console.log('[depositPrizeAsset] Sending transaction...');

  // Sign and send with same blockhash to avoid expiration
  const signedTx = await provider.wallet.signTransaction(tx);
  const rawTx = signedTx.serialize();

  const signature = await connection.sendRawTransaction(rawTx, {
    skipPreflight: false,
    maxRetries: 3,
  });

  // Wait for confirmation
  const confirmation = await connection.confirmTransaction({
    signature,
    blockhash,
    lastValidBlockHeight,
  }, 'confirmed');

  if (confirmation.value.err) {
    throw new Error(`Transaction failed: ${JSON.stringify(confirmation.value.err)}`);
  }

  console.log('✅ Prize asset deposited:', {
    signature,
    prizeIndex: params.prizeIndex,
    explorerUrl: `https://explorer.solana.com/tx/${signature}?cluster=devnet`,
  });

  return { signature };
}
