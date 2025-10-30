/**
 * Solana Asset Room Functions
 *
 * Implements createAssetRoom() and depositPrizeAsset() for the Solana blockchain.
 * These functions work with the deployed Anchor program's init_asset_room and add_prize_asset instructions.
 */

import { Connection, PublicKey, Transaction, SystemProgram, SYSVAR_RENT_PUBKEY } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID, getAssociatedTokenAddress } from '@solana/spl-token';
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
  return PublicKey.findProgramAddressSync(
    [Buffer.from('token-registry')],
    PROGRAM_ID
  );
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
  const { blockhash } = await connection.getLatestBlockhash('finalized');
  tx.recentBlockhash = blockhash;

  console.log('[createAssetRoom] Sending transaction...');
  const signature = await provider.sendAndConfirm(tx, [], {
    skipPreflight: false,
    commitment: 'confirmed',
  });

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
  const [prizeVault] = derivePrizeVaultPDA(room, params.prizeIndex);

  // Get host's token account
  const hostTokenAccount = await getAssociatedTokenAddress(
    params.prizeMint,
    publicKey
  );

  console.log('[depositPrizeAsset] Accounts:', {
    room: room.toBase58(),
    prizeVault: prizeVault.toBase58(),
    hostTokenAccount: hostTokenAccount.toBase58(),
  });

  // Build add_prize_asset instruction
  const ix = await program.methods
    .addPrizeAsset(params.roomId, params.prizeIndex)
    .accounts({
      room,
      prizeVault,
      prizeMint: params.prizeMint,
      hostTokenAccount,
      host: publicKey,
      systemProgram: SystemProgram.programId,
      tokenProgram: TOKEN_PROGRAM_ID,
      rent: SYSVAR_RENT_PUBKEY,
    })
    .instruction();

  // Build and send transaction
  const tx = new Transaction().add(ix);
  tx.feePayer = publicKey;
  const { blockhash } = await connection.getLatestBlockhash('finalized');
  tx.recentBlockhash = blockhash;

  console.log('[depositPrizeAsset] Sending transaction...');
  const signature = await provider.sendAndConfirm(tx, [], {
    skipPreflight: false,
    commitment: 'confirmed',
  });

  console.log('✅ Prize asset deposited:', {
    signature,
    prizeIndex: params.prizeIndex,
    explorerUrl: `https://explorer.solana.com/tx/${signature}?cluster=devnet`,
  });

  return { signature };
}
