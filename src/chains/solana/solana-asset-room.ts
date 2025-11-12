/**
 * Solana Asset Room Functions
 *
 * Implements createAssetRoom() and depositPrizeAsset() for the Solana blockchain.
 * These functions work with the deployed Anchor program's init_asset_room and add_prize_asset instructions.
 *
 * ## Asset-Based Rooms
 *
 * Asset-based rooms allow hosts to pre-deposit prize assets (NFTs, tokens, etc.) that
 * are distributed to winners at the end of the game. This is different from pool-based
 * rooms where prizes come from collected entry fees.
 *
 * ## Room Lifecycle
 *
 * 1. **Create Room**: Host calls `createAssetRoom()` to create a room in AwaitingFunding state
 * 2. **Deposit Prizes**: Host calls `depositPrizeAsset()` for each prize (up to 3 prizes)
 * 3. **Room Ready**: Once all prizes are deposited, room status changes to Ready
 * 4. **Players Join**: Players can join the room by paying entry fees
 * 5. **End Room**: Host calls `endRoom()` to distribute prizes to winners
 *
 * ## Fee Distribution (Asset Mode)
 *
 * - Platform: 20% (fixed)
 * - Host: 0-5% (configurable)
 * - Charity: 75-80% (remainder, calculated as 100% - platform - host)
 * - Prizes: Pre-deposited assets (no percentage allocation)
 *
 * ## Prize Assets
 *
 * - Up to 3 prizes can be deposited
 * - Each prize can be any SPL token (NFTs, fungible tokens, etc.)
 * - Prizes are stored in prize vault PDAs
 * - Prize vaults are created automatically when prizes are deposited
 *
 * ## Token Account Creation
 *
 * The system automatically creates missing token accounts for:
 * - Prize vaults (for storing prize assets)
 * - Winner token accounts (for receiving prizes)
 *
 * Used by `useSolanaContract` and `useContractActions` to create and manage asset-based rooms.
 */

import { Connection, PublicKey, Transaction, SystemProgram, SYSVAR_RENT_PUBKEY, Keypair } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID, getAssociatedTokenAddress, createAssociatedTokenAccountInstruction, createInitializeAccount3Instruction, getMinimumBalanceForRentExemptAccount, getAccount, createMint, getOrCreateAssociatedTokenAccount, mintTo, MINT_SIZE, getMinimumBalanceForRentExemptMint, createInitializeMint2Instruction } from '@solana/spl-token';
import { Program, AnchorProvider, BN } from '@coral-xyz/anchor';
import { PROGRAM_ID, getTokenMints, NETWORK } from './config';

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
  const seed = 'token-registry-v4'; // MUST match Rust contract: b"token-registry-v4"
  console.log('[deriveTokenRegistryPDA] Input - Seed:', seed, 'Program:', PROGRAM_ID.toString());
  const result = PublicKey.findProgramAddressSync(
    [Buffer.from(seed)],
    PROGRAM_ID
  );
  console.log('[deriveTokenRegistryPDA] Output - PDA:', result[0].toString(), 'Bump:', result[1]);
  console.log('[deriveTokenRegistryPDA] ✅ PDA derived successfully');

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
 * Creates an asset-based room where prizes are pre-deposited SPL tokens
 *
 * This function creates a new asset-based fundraising room on Solana. Unlike pool-based rooms,
 * asset-based rooms require hosts to pre-deposit prize assets before players can join.
 *
 * ## Room Lifecycle
 *
 * 1. **Create Room**: Room is created in AwaitingFunding state
 * 2. **Deposit Prizes**: Host must call `depositPrizeAsset()` for each prize (up to 3)
 * 3. **Room Ready**: Once all prizes are deposited, room status changes to Ready
 * 4. **Players Join**: Players can join the room by paying entry fees
 * 5. **End Room**: Host calls `endRoom()` to distribute prizes to winners
 *
 * ## Fee Distribution (Asset Mode)
 *
 * - **Platform**: 20% (fixed)
 * - **Host**: 0-5% (configurable)
 * - **Charity**: 75-80% (remainder, calculated as 100% - platform - host)
 * - **Prizes**: Pre-deposited assets (no percentage allocation from entry fees)
 *
 * ## Prize Configuration
 *
 * - Up to 3 prizes can be configured
 * - Each prize consists of a token mint and amount
 * - Prizes are stored in prize vault PDAs
 * - Prize vaults are created automatically when prizes are deposited
 *
 * ## Token Restrictions
 *
 * - Room fees are restricted to USDC and PYUSD only
 * - Prize tokens have no restrictions (can be any SPL token)
 *
 * @param program - Anchor program instance
 * @param provider - Anchor provider instance
 * @param connection - Solana connection
 * @param publicKey - Host public key
 * @param params - Asset room creation parameters
 * @param params.roomId - Unique room identifier
 * @param params.charityWallet - Charity wallet address
 * @param params.entryFee - Entry fee in token base units
 * @param params.maxPlayers - Maximum number of players
 * @param params.hostFeeBps - Host fee in basis points (0-500 = 0-5%)
 * @param params.charityMemo - Charity memo/name
 * @param params.expirationSlots - Optional expiration slots
 * @param params.feeTokenMint - Token mint for entry fees (must be USDC or PYUSD)
 * @param params.prize1Mint - First prize token mint
 * @param params.prize1Amount - First prize amount
 * @param params.prize2Mint - Second prize token mint (optional)
 * @param params.prize2Amount - Second prize amount (optional)
 * @param params.prize3Mint - Third prize token mint (optional)
 * @param params.prize3Amount - Third prize amount (optional)
 * @returns Room creation result with room PDA and transaction signature
 * @throws Error if validation fails or room creation fails
 *
 * @example
 * ```typescript
 * const result = await createAssetRoom(program, provider, connection, publicKey, {
 *   roomId: 'my-asset-room-123',
 *   charityWallet: charityAddress,
 *   entryFee: new BN(1000000), // 1 USDC
 *   maxPlayers: 100,
 *   hostFeeBps: 100, // 1%
 *   charityMemo: 'Charity Name',
 *   feeTokenMint: USDC_MINT,
 *   prize1Mint: nftMint1,
 *   prize1Amount: new BN(1),
 *   prize2Mint: tokenMint,
 *   prize2Amount: new BN(1000),
 * });
 * ```
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

  // Validate that fee token is USDC or PYUSD only (room fees restriction)
  const TOKEN_MINTS = getTokenMints();
  const isUSDC = params.feeTokenMint.equals(TOKEN_MINTS.USDC);
  const isPYUSD = params.feeTokenMint.equals(TOKEN_MINTS.PYUSD);
  
  if (!isUSDC && !isPYUSD) {
    throw new Error(
      `Room fees are restricted to USDC and PYUSD only. ` +
      `Received: ${params.feeTokenMint.toBase58()}. ` +
      `Note: Prize tokens have no restrictions and can be any token.`
    );
  }

  // Derive PDAs - Use helper functions to ensure consistency with Anchor's automatic derivation
  // Important: Anchor validates PDA constraints using the programId from the IDL
  // We must use the same programId that the Program instance uses (from its IDL)
  const programId = program.programId;
  
  // Verify PROGRAM_ID matches the program's programId (for consistency)
  if (!programId.equals(PROGRAM_ID)) {
    console.warn('[createAssetRoom] ⚠️ PROGRAM_ID mismatch!', {
      config: PROGRAM_ID.toBase58(),
      program: programId.toBase58(),
      message: 'Using program.programId for PDA derivation to match Anchor validation'
    });
  }
  
  // Use program.programId to ensure Anchor's PDA constraint validation passes
  const [globalConfig] = PublicKey.findProgramAddressSync(
    [Buffer.from('global-config')],
    programId
  );
  
  // Derive tokenRegistry PDA - CRITICAL: Must use the same programId as other PDAs
  // Use programId instead of PROGRAM_ID to match what Anchor expects
  // The IDL constraint is: seeds = ["token-registry-v4"] (matches Rust contract)
  const [tokenRegistry, tokenRegistryBump] = PublicKey.findProgramAddressSync(
    [Buffer.from('token-registry-v4')],
    programId
  );
  
  // Verify the token registry account exists and is owned by the program
  // If it doesn't exist, Anchor will fail the constraint check
  try {
    const tokenRegistryInfo = await connection.getAccountInfo(tokenRegistry);
    if (!tokenRegistryInfo) {
      throw new Error('Token registry account does not exist. Please initialize it first using initializeTokenRegistry().');
    }
    if (!tokenRegistryInfo.owner.equals(programId)) {
      throw new Error(`Token registry account is owned by ${tokenRegistryInfo.owner.toBase58()}, expected ${programId.toBase58()}`);
    }
    console.log('[createAssetRoom] ✅ Token registry account exists and is valid');
  } catch (error: any) {
    if (error.message?.includes('does not exist')) {
      throw error; // Re-throw if it doesn't exist
    }
    console.warn('[createAssetRoom] ⚠️ Could not verify token registry account:', error.message);
  }
  
  // ✅ FIX: Derive room PDA first (even though it doesn't exist yet)
  // We need this to derive the room vault PDA
  const [room, roomBump] = PublicKey.findProgramAddressSync(
    [Buffer.from('room'), publicKey.toBuffer(), Buffer.from(params.roomId)],
    programId
  );
  const [roomVault, roomVaultBump] = PublicKey.findProgramAddressSync(
    [Buffer.from('room-vault'), room.toBuffer()],
    programId
  );
  
  console.log('[createAssetRoom] PDA derivation details:', {
    programId: programId.toBase58(),
    tokenRegistry: tokenRegistry.toBase58(),
    tokenRegistryBump,
    tokenRegistrySeed: 'token-registry-v4',
    globalConfig: globalConfig.toBase58(),
    room: room.toBase58(),
    roomBump,
    roomVault: roomVault.toBase58(),
    roomVaultBump,
  });

  // Check wallet balance for rent
  const hostBalance = await connection.getBalance(publicKey);
  const ROOM_ACCOUNT_SIZE = 500; // Approximate size
  const roomRent = await connection.getMinimumBalanceForRentExemption(ROOM_ACCOUNT_SIZE);
  const TOKEN_ACCOUNT_SIZE = 165;
  const vaultRent = await connection.getMinimumBalanceForRentExemption(TOKEN_ACCOUNT_SIZE);
  const totalRent = roomRent + vaultRent + 0.001 * 1e9; // Buffer for tx fees

  if (hostBalance < totalRent) {
    throw new Error(
      `Insufficient SOL. Need ${(totalRent / 1e9).toFixed(4)} SOL, have ${(hostBalance / 1e9).toFixed(4)} SOL`
    );
  }

  // ✅ FIX: The contract now uses invoke_signed() with room_vault PDA seeds for Token Program CPI
  // This ensures the PDA can sign for initialize_account3, fixing the "Cross-program invocation
  // with unauthorized signer or writable account" error.
  const instructions: TransactionInstruction[] = [];
  
  // Check if room vault already exists
  const roomVaultInfo = await connection.getAccountInfo(roomVault);
  
  if (!roomVaultInfo || roomVaultInfo.data.length === 0) {
    console.log('[createAssetRoom] Room vault does not exist - contract will create it with proper PDA signing');
  } else {
    console.log('[createAssetRoom] Room vault already exists, contract will validate it');
  }

  // Build init_asset_room instruction
  // Note: For PDAs with constraints in the IDL, Anchor will automatically derive and validate them
  // We should NOT pass tokenRegistry explicitly - let Anchor auto-derive it from the IDL constraint
  // This prevents ConstraintSeeds validation errors
  // The IDL has a PDA constraint for token_registry with seeds: ["token-registry-v4"] (matches Rust contract)
  // Anchor will automatically derive it using program.programId, so we don't pass it
  const initAssetRoomIx = await program.methods
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
      // tokenRegistry is NOT passed - Anchor will auto-derive it from IDL constraint
      // This prevents ConstraintSeeds validation errors
      host: publicKey,
      systemProgram: SystemProgram.programId,
      tokenProgram: TOKEN_PROGRAM_ID,
      rent: SYSVAR_RENT_PUBKEY,
    })
    .instruction();
  
  // Add init_asset_room instruction AFTER vault creation
  instructions.push(initAssetRoomIx);
  
  // Log the instruction to debug PDA validation
  console.log('[createAssetRoom] Instruction accounts:', {
    room: room.toBase58(),
    roomVault: roomVault.toBase58(),
    globalConfig: globalConfig.toBase58(),
    tokenRegistry: tokenRegistry.toBase58(), // For reference - Anchor will auto-derive this
    programId: initAssetRoomIx.programId.toBase58(),
  });
  console.log('[createAssetRoom] ✅ tokenRegistry will be auto-derived by Anchor from IDL constraint');
  console.log('[createAssetRoom] Transaction will include:', {
    vaultCreation: instructions.length > 0 && instructions[0] !== initAssetRoomIx,
    initAssetRoom: true,
    totalInstructions: instructions.length,
  });

  // Build and send transaction with all instructions
  const tx = new Transaction().add(...instructions);
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
 * Deposits a prize asset into an asset-based room
 *
 * This function allows hosts to deposit prize assets (NFTs, tokens, etc.) into
 * an asset-based room. Prizes must be deposited before players can join the room.
 *
 * ## Deposit Flow
 *
 * 1. **Create Room**: Host creates asset room (status: AwaitingFunding)
 * 2. **Deposit Prize 1**: Host calls this for prize index 0 (1st place)
 * 3. **Deposit Prize 2**: Host calls this for prize index 1 (2nd place) - optional
 * 4. **Deposit Prize 3**: Host calls this for prize index 2 (3rd place) - optional
 * 5. **Room Ready**: Once all configured prizes deposited, status → Ready
 *
 * ## Prize Vault
 *
 * - Prize vaults are PDA token accounts managed by the program
 * - Vaults are created automatically by the contract when prizes are deposited
 * - Each prize has its own vault (prize vault 0, 1, 2)
 * - Assets are locked in vaults until room ends
 *
 * ## Token Account Creation
 *
 * The system automatically creates missing token accounts for:
 * - Host token account (for source of prize assets)
 * - Prize vault (created by contract, not frontend)
 *
 * ## Validation
 *
 * - Room must exist and be in AwaitingFunding state
 * - Prize index must be valid (0, 1, or 2)
 * - Prize mint must match room configuration
 * - Host must have sufficient balance of prize token
 * - Prize must not already be deposited
 * - Caller must be room host
 *
 * @param program - Anchor program instance
 * @param provider - Anchor provider instance
 * @param connection - Solana connection
 * @param publicKey - Host public key
 * @param params - Prize asset deposit parameters
 * @param params.roomId - Room identifier
 * @param params.hostPubkey - Host public key
 * @param params.prizeIndex - Prize index (0, 1, or 2)
 * @param params.prizeMint - Prize token mint
 * @returns Deposit result with transaction signature
 * @throws Error if validation fails or deposit fails
 *
 * @example
 * ```typescript
 * const result = await depositPrizeAsset(program, provider, connection, publicKey, {
 *   roomId: 'my-asset-room-123',
 *   hostPubkey: publicKey,
 *   prizeIndex: 0, // First prize
 *   prizeMint: nftMint,
 * });
 * console.log('Prize deposited:', result.signature);
 * ```
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

  // Validate prize mint address
  if (!params.prizeMint || params.prizeMint.equals(PublicKey.default)) {
    throw new Error('Invalid prize mint address');
  }

  // Verify the mint account exists and is valid
  // ⚠️ WARNING: If mint doesn't exist, transaction will fail on-chain
  // This is a pre-flight check to catch errors early
  try {
    const mintInfo = await connection.getAccountInfo(params.prizeMint);
    if (!mintInfo) {
      console.warn(
        `[depositPrizeAsset] ⚠️ Prize mint account does not exist on devnet: ${params.prizeMint.toBase58()}\n\n` +
        `To create a test token on devnet using your Phantom wallet:\n` +
        `1. Open browser console and run: window.createTestToken()\n` +
        `2. Or use the Solana CLI: spl-token create-token --url devnet\n` +
        `3. Make sure you're using a devnet mint address, not mainnet\n\n` +
        `⚠️ Transaction will proceed but may fail if mint doesn't exist.`
      );
      // Don't throw - let the transaction attempt (it will fail on-chain if mint doesn't exist)
      // This allows users to try even if validation fails
    } else {
      if (!mintInfo.owner.equals(TOKEN_PROGRAM_ID)) {
        throw new Error(`Prize mint account is not owned by Token Program: ${mintInfo.owner.toBase58()}`);
      }
      console.log('[depositPrizeAsset] ✅ Prize mint validated:', {
        mint: params.prizeMint.toBase58(),
        owner: mintInfo.owner.toBase58(),
        dataLength: mintInfo.data.length,
      });
    }
  } catch (error: any) {
    // Only throw if it's a validation error (not a "mint doesn't exist" error)
    if (error.message?.includes('Token Program')) {
      console.error('[depositPrizeAsset] ❌ Failed to validate prize mint:', error);
      throw error;
    }
    // For "mint doesn't exist" errors, just log and continue
    console.warn('[depositPrizeAsset] ⚠️ Mint validation warning:', error.message);
  }

  // Derive PDAs - Use program's programId to ensure match with Anchor's automatic derivation
  const programId = program.programId;
  const [room] = PublicKey.findProgramAddressSync(
    [Buffer.from('room'), params.hostPubkey.toBuffer(), Buffer.from(params.roomId)],
    programId
  );

  // ✅ FIX: Prize vault should be a PDA token account, not an ATA
  // The contract expects prize vaults to be PDAs with seeds ["prize-vault", room_key, prize_index]
  // ATAs cannot be created for PDA owners, so we must use a PDA token account
  const [prizeVault, prizeVaultBump] = PublicKey.findProgramAddressSync(
    [
      Buffer.from('prize-vault'),
      room.toBuffer(),
      Buffer.from([params.prizeIndex])
    ],
    programId
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

  // ✅ Check if prize vault exists - it should be created by the contract
  // Prize vaults are PDA token accounts, not ATAs, so they can't be created from the frontend
  // The contract should create them if needed (similar to room_vault)
  const vaultInfo = await connection.getAccountInfo(prizeVault);
  const hostTokenInfo = await connection.getAccountInfo(hostTokenAccount);
  const instructions = [];

  if (!vaultInfo || vaultInfo.data.length === 0) {
    console.log('[depositPrizeAsset] Prize vault does not exist - contract will create it automatically');
    // Note: The contract's add_prize_asset instruction will create the prize vault if it doesn't exist
    // Similar to how init_asset_room creates room_vault. This is expected behavior.
  } else {
    console.log('[depositPrizeAsset] Prize vault already exists');
  }

  // ✅ Verify mint exists before creating ATA (required for ATA creation)
  const mintInfo = await connection.getAccountInfo(params.prizeMint);
  if (!mintInfo || !mintInfo.owner.equals(TOKEN_PROGRAM_ID)) {
    throw new Error(
      `Prize mint account does not exist or is invalid: ${params.prizeMint.toBase58()}\n\n` +
      `The mint must exist on ${NETWORK} before you can deposit prize assets.\n` +
      `To create a test token mint using your Phantom wallet, use the createTokenMint function.`
    );
  }

  // ✅ Get room info to check prize amount
  let requiredPrizeAmount: BN | null = null;
  try {
    // @ts-ignore - Account types available after program deployment
    const roomAccount = await program.account.room.fetch(room);
    if (roomAccount && roomAccount.prize_assets && roomAccount.prize_assets[params.prizeIndex]) {
      const prizeAsset = roomAccount.prize_assets[params.prizeIndex];
      if (prizeAsset) {
        requiredPrizeAmount = prizeAsset.amount as BN;
        console.log('[depositPrizeAsset] Prize amount from room:', {
          prizeIndex: params.prizeIndex,
          requiredAmount: requiredPrizeAmount.toString(),
          mint: prizeAsset.mint.toBase58(),
        });
      }
    }
  } catch (error: any) {
    console.warn('[depositPrizeAsset] Could not fetch room info for prize amount:', error.message);
    // Continue without balance check - contract will validate on-chain
  }

  // ✅ Check if host's token account exists, create if needed
  // Use getAccount to properly check if it's a valid token account
  let hostTokenAccountExists = false;
  let hostBalance: BN | null = null;
  try {
    const tokenAccount = await getAccount(connection, hostTokenAccount, 'confirmed');
    if (tokenAccount && tokenAccount.mint.equals(params.prizeMint)) {
      hostTokenAccountExists = true;
      hostBalance = new BN(tokenAccount.amount.toString());
      console.log('[depositPrizeAsset] Host token account already exists:', {
        address: hostTokenAccount.toBase58(),
        mint: tokenAccount.mint.toBase58(),
        balance: hostBalance.toString(),
      });

      // Validate balance if we have the required amount
      if (requiredPrizeAmount && hostBalance.lt(requiredPrizeAmount)) {
        const mintInfo = await connection.getParsedAccountInfo(params.prizeMint);
        const decimals = (mintInfo.value?.data as any)?.parsed?.info?.decimals || 9;
        const requiredAmount = requiredPrizeAmount.toNumber() / Math.pow(10, decimals);
        const currentBalance = hostBalance.toNumber() / Math.pow(10, decimals);
        
        throw new Error(
          `Insufficient token balance!\n\n` +
          `Required: ${requiredAmount} tokens\n` +
          `Current balance: ${currentBalance} tokens\n` +
          `Missing: ${requiredAmount - currentBalance} tokens\n\n` +
          `Please mint or transfer tokens to your wallet before depositing prizes.\n` +
          `Token mint: ${params.prizeMint.toBase58()}`
        );
      }
    } else if (tokenAccount) {
      // Account exists but for different mint - this shouldn't happen with ATAs
      console.warn('[depositPrizeAsset] ⚠️ Host token account exists but for different mint:', {
        account: hostTokenAccount.toBase58(),
        expectedMint: params.prizeMint.toBase58(),
        actualMint: tokenAccount.mint.toBase58(),
      });
      throw new Error(`Token account exists but for different mint. Expected ${params.prizeMint.toBase58()}, found ${tokenAccount.mint.toBase58()}`);
    }
  } catch (error: any) {
    // Account doesn't exist or is not a token account
    if (error.name === 'TokenAccountNotFoundError' || 
        error.message?.includes('could not find account') ||
        error.message?.includes('InvalidAccountData')) {
      hostTokenAccountExists = false;
      console.log('[depositPrizeAsset] Host token account does not exist, will create ATA');
      
      // If account doesn't exist, balance will be 0, so validate required amount
      if (requiredPrizeAmount && requiredPrizeAmount.gt(new BN(0))) {
        const mintInfo = await connection.getParsedAccountInfo(params.prizeMint);
        const decimals = (mintInfo.value?.data as any)?.parsed?.info?.decimals || 9;
        const requiredAmount = requiredPrizeAmount.toNumber() / Math.pow(10, decimals);
        
        throw new Error(
          `Insufficient token balance!\n\n` +
          `Required: ${requiredAmount} tokens\n` +
          `Current balance: 0 tokens\n` +
          `Missing: ${requiredAmount} tokens\n\n` +
          `Please mint or transfer tokens to your wallet before depositing prizes.\n` +
          `Token mint: ${params.prizeMint.toBase58()}`
        );
      }
    } else if (error.message?.includes('Insufficient token balance')) {
      // Re-throw balance errors
      throw error;
    } else {
      // Re-throw other errors (like mint mismatch)
      throw error;
    }
  }

  if (!hostTokenAccountExists) {
    console.log('[depositPrizeAsset] Creating host ATA...', {
      payer: publicKey.toBase58(),
      ata: hostTokenAccount.toBase58(),
      owner: publicKey.toBase58(),
      mint: params.prizeMint.toBase58(),
    });
    // ✅ Create ATA instruction - mint is verified to exist above
    const createHostAtaIx = createAssociatedTokenAccountInstruction(
      publicKey,           // payer
      hostTokenAccount,    // ata address
      publicKey,           // owner (host wallet)
      params.prizeMint     // mint (verified to exist)
    );
    instructions.push(createHostAtaIx);
  }

  // Build add_prize_asset instruction
  // Note: prize_vault is now a PDA with seeds ["prize-vault", room_key, prize_index]
  // The contract will create it if it doesn't exist (similar to room_vault)
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
      rent: SYSVAR_RENT_PUBKEY,
    })
    .instruction();

  instructions.push(addPrizeIx);

  // Build and send transaction
  // Helper function to send transaction with retry on blockhash expiration
  const sendWithRetry = async (): Promise<string> => {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        // Get fresh blockhash right before building transaction
        const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('finalized');
        
        const tx = new Transaction().add(...instructions);
        tx.feePayer = publicKey;
        tx.recentBlockhash = blockhash;
        tx.lastValidBlockHeight = lastValidBlockHeight;

        console.log('[depositPrizeAsset] Signing transaction (attempt', attempt + 1, ')...');
        
        // Sign transaction
        const signedTx = await provider.wallet.signTransaction(tx);
        const rawTx = signedTx.serialize();

        // Send immediately after signing
        const signature = await connection.sendRawTransaction(rawTx, {
          skipPreflight: false,
          maxRetries: 3,
        });
        
        return signature;
      } catch (error: any) {
        // Handle blockhash expiration - retry with fresh blockhash
        if (error.message?.includes('Blockhash not found') || 
            error.message?.includes('blockhash') ||
            error.message?.includes('expired')) {
          if (attempt === 0) {
            console.log('[depositPrizeAsset] Blockhash expired, retrying with fresh blockhash...');
            // Wait a bit before retrying
            await new Promise(resolve => setTimeout(resolve, 1000));
            continue;
          } else {
            throw new Error(
              `Transaction expired. Please try again - the blockhash expired before the transaction was sent.\n\n` +
              `This usually happens if there's a delay approving the transaction in your wallet.\n` +
              `Try again with a fresh transaction.`
            );
          }
        } else {
          // Re-throw other errors
          throw error;
        }
      }
    }
    throw new Error('Failed to send transaction after retries');
  };

  let signature: string;
  try {
    signature = await sendWithRetry();
  } catch (error: any) {
    console.error('[depositPrizeAsset] Error caught:', {
      name: error?.name,
      message: error?.message,
      hasGetLogs: typeof error?.getLogs === 'function',
    });
    
    // Catch SendTransactionError and get full logs
    if (error && typeof error.getLogs === 'function') {
      const logs = await error.getLogs();
      console.error('[depositPrizeAsset] Transaction simulation failed. Full logs:', logs);
      
      // Check for "insufficient funds" error from Token Program (error code 0x1)
      const logString = logs.join('\n');
      const hasInsufficientFunds = logString.includes('insufficient funds') || 
                                   logString.includes('Error: insufficient funds') || 
                                   error.message?.includes('custom program error: 0x1');
      
      // Check for blockhash expiration error
      if (error.message?.includes('Blockhash not found') || error.message?.includes('blockhash')) {
        console.warn('[depositPrizeAsset] Blockhash expired - this should have been retried above');
        // This shouldn't happen if retry logic above worked, but handle it gracefully
        throw new Error(
          `Transaction expired. Please try again - the blockhash expired before the transaction was sent.\n\n` +
          `This usually happens if there's a delay approving the transaction in your wallet.\n` +
          `Try again with a fresh transaction.`
        );
      }
      
      console.log('[depositPrizeAsset] Checking for insufficient funds error:', {
        logString: logString.substring(0, 200), // First 200 chars
        hasInsufficientFunds,
        errorMessage: error.message,
      });
      
      if (hasInsufficientFunds) {
        // Try to get room info to show required amount
        let requiredAmount = 'unknown';
        let requiredAmountRaw = null;
        try {
          // @ts-ignore - Account types available after program deployment
          const roomAccount = await program.account.room.fetch(room);
          console.log('[depositPrizeAsset] Room account fetched:', {
            hasPrizeAssets: !!roomAccount?.prize_assets,
            prizeAssetsLength: roomAccount?.prize_assets?.length || 0,
            prizeIndex: params.prizeIndex,
          });
          
          if (roomAccount && roomAccount.prize_assets && roomAccount.prize_assets[params.prizeIndex]) {
            const prizeAsset = roomAccount.prize_assets[params.prizeIndex];
            if (prizeAsset && prizeAsset.amount) {
              requiredAmountRaw = prizeAsset.amount as BN;
              const mintInfo = await connection.getParsedAccountInfo(params.prizeMint);
              const decimals = (mintInfo.value?.data as any)?.parsed?.info?.decimals || 9;
              requiredAmount = (requiredAmountRaw.toNumber() / Math.pow(10, decimals)).toFixed(decimals).replace(/\.?0+$/, '');
              console.log('[depositPrizeAsset] Required amount calculated:', {
                raw: requiredAmountRaw.toString(),
                formatted: requiredAmount,
                decimals,
              });
            }
          } else {
            console.warn('[depositPrizeAsset] Prize asset not found in room:', {
              prizeIndex: params.prizeIndex,
              prizeAssets: roomAccount?.prize_assets,
            });
          }
        } catch (e) {
          console.warn('[depositPrizeAsset] Could not fetch prize amount for error message:', e);
          // Try alternative: check if we can get it from the error context or logs
        }

        // Get current balance
        let currentBalance = 'unknown';
        try {
          const tokenAccount = await getAccount(connection, hostTokenAccount, 'confirmed');
          if (tokenAccount) {
            const balance = new BN(tokenAccount.amount.toString());
            const mintInfo = await connection.getParsedAccountInfo(params.prizeMint);
            const decimals = (mintInfo.value?.data as any)?.parsed?.info?.decimals || 9;
            currentBalance = (balance.toNumber() / Math.pow(10, decimals)).toString();
          }
        } catch (e) {
          console.warn('[depositPrizeAsset] Could not fetch balance for error message:', e);
        }

        // Calculate missing amount if we have both values
        let missingAmount = 'unknown';
        if (requiredAmount !== 'unknown' && currentBalance !== 'unknown') {
          const missing = parseFloat(requiredAmount) - parseFloat(currentBalance);
          if (missing > 0) {
            missingAmount = missing.toFixed(6).replace(/\.?0+$/, '');
          }
        }

        const enhancedError = new Error(
          `❌ INSUFFICIENT TOKEN BALANCE\n\n` +
          `The transaction failed because your wallet doesn't have enough tokens.\n\n` +
          `📋 Details:\n` +
          `   Required: ${requiredAmount} tokens\n` +
          `   Current balance: ${currentBalance} tokens\n` +
          (missingAmount !== 'unknown' ? `   Missing: ${missingAmount} tokens\n` : '') +
          `   Token mint: ${params.prizeMint.toBase58()}\n\n` +
          `💡 Solution:\n` +
          `   1. Mint tokens to your wallet, OR\n` +
          `   2. Transfer tokens to your wallet from another account\n\n` +
          `📄 Full transaction logs:\n${logs.join('\n')}`
        );
        enhancedError.name = error.name || 'SendTransactionError';
        Object.assign(enhancedError, error);
        throw enhancedError;
      }
      
      // Parse Anchor error from logs
      let anchorError = null;
      // Look for AnchorError pattern in logs
      const anchorErrorMatch = logString.match(/AnchorError caused by account: (\w+)\. Error Code: (\w+)\. Error Number: (\d+)\. Error Message: ([^.]+)/);
      if (anchorErrorMatch) {
        anchorError = {
          account: anchorErrorMatch[1],
          errorCode: anchorErrorMatch[2],
          errorNumber: anchorErrorMatch[3],
          errorMessage: anchorErrorMatch[4],
        };
        
        console.error('[depositPrizeAsset] Anchor Error Details:', anchorError);
        
        // Provide specific error message for AccountNotInitialized
        if (anchorError.errorCode === 'AccountNotInitialized' && anchorError.account === 'prize_vault') {
          const enhancedError = new Error(
            `❌ PRIZE VAULT NOT INITIALIZED\n\n` +
            `The contract's add_prize_asset instruction expected the prize_vault PDA token account to already exist, but it doesn't.\n\n` +
            `📋 Account Details:\n` +
            `   Prize vault PDA: ${prizeVault.toBase58()}\n` +
            `   Room PDA: ${room.toBase58()}\n` +
            `   Prize index: ${params.prizeIndex}\n` +
            `   Prize mint: ${params.prizeMint.toBase58()}\n\n` +
            `🔧 CONTRACT FIX REQUIRED:\n` +
            `The contract's add_prize_asset instruction needs to be updated to:\n` +
            `1. Check if prize_vault PDA token account exists\n` +
            `2. If not, create it using Token Program with PDA as owner\n` +
            `3. This should work similar to how room_vault is created in init_asset_room\n\n` +
            `📝 PDA Seeds: ["prize-vault", room_pubkey, prize_index]\n` +
            `   The program can sign for this PDA using find_program_address\n\n` +
            `📚 See CONTRACT_FIX_PRIZE_VAULT.md for detailed implementation guide\n\n` +
            `📄 Full transaction logs:\n${logs.join('\n')}`
          );
          enhancedError.name = error.name || 'SendTransactionError';
          Object.assign(enhancedError, error);
          throw enhancedError;
        }
      }
      
      console.error('[depositPrizeAsset] Error details:', {
        message: error.message,
        name: error.name,
        logs: logs,
        anchorError: anchorError,
      });
    }
    // Re-throw with enhanced error message
    throw error;
  }

  // Wait for confirmation
  // Get fresh blockhash for confirmation (blockhash from sendWithRetry is not in scope)
  const { blockhash: confirmBlockhash, lastValidBlockHeight: confirmLastValidBlockHeight } = 
    await connection.getLatestBlockhash('finalized');
  
  const confirmation = await connection.confirmTransaction({
    signature,
    blockhash: confirmBlockhash,
    lastValidBlockHeight: confirmLastValidBlockHeight,
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

// ============================================================================
// Create Token Mint (for Phantom wallet)
// ============================================================================

export interface CreateTokenMintParams {
  connection: Connection;
  publicKey: PublicKey;
  signTransaction: (tx: Transaction) => Promise<Transaction>;
  decimals?: number; // Default: 9
  mintAuthority?: PublicKey; // Default: publicKey (your wallet)
  freezeAuthority?: PublicKey | null; // Default: publicKey (your wallet), null = no freeze authority
}

export interface CreateTokenMintResult {
  mint: PublicKey;
  signature: string;
  explorerUrl: string;
}

/**
 * Create an SPL token mint using your Phantom wallet
 * 
 * This function creates a new token mint on devnet that you can use for prize assets.
 * The mint will be owned by your wallet, so you can mint tokens to it later.
 * 
 * @param params - Connection, wallet, and token configuration
 * @returns The mint address and transaction signature
 */
export async function createTokenMint(
  params: CreateTokenMintParams
): Promise<CreateTokenMintResult> {
  const {
    connection,
    publicKey,
    signTransaction,
    decimals = 9,
    mintAuthority = publicKey,
    freezeAuthority = publicKey,
  } = params;

  console.log('[createTokenMint] Creating token mint...', {
    wallet: publicKey.toBase58(),
    decimals,
    mintAuthority: mintAuthority.toBase58(),
    freezeAuthority: freezeAuthority?.toBase58() || 'null',
  });

  // Check balance
  const balance = await connection.getBalance(publicKey);
  const rentExemptBalance = await getMinimumBalanceForRentExemptMint(connection);
  const estimatedFee = 5000; // Transaction fee
  const requiredBalance = rentExemptBalance + estimatedFee;

  if (balance < requiredBalance) {
    throw new Error(
      `Insufficient SOL balance. Need at least ${(requiredBalance / 1e9).toFixed(4)} SOL, ` +
      `have ${(balance / 1e9).toFixed(4)} SOL`
    );
  }

  // Generate a new keypair for the mint account
  // In Solana, mint accounts are created as standalone accounts
  const mintKeypair = Keypair.generate();
  const mint = mintKeypair.publicKey;

  console.log('[createTokenMint] Generated mint keypair:', mint.toBase58());

  // Build the transaction to create the mint
  const transaction = new Transaction();

  // Create account instruction
  const createAccountIx = SystemProgram.createAccount({
    fromPubkey: publicKey,
    newAccountPubkey: mint,
    space: MINT_SIZE,
    lamports: rentExemptBalance,
    programId: TOKEN_PROGRAM_ID,
  });

  // Initialize mint instruction
  const initMintIx = createInitializeMint2Instruction(
    mint,
    decimals,
    mintAuthority,
    freezeAuthority, // null = no freeze authority
    TOKEN_PROGRAM_ID
  );

  transaction.add(createAccountIx, initMintIx);
  transaction.feePayer = publicKey;

  // Get recent blockhash
  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('finalized');
  transaction.recentBlockhash = blockhash;
  transaction.lastValidBlockHeight = lastValidBlockHeight;

  console.log('[createTokenMint] Transaction prepared, signing...');

  // Sign the transaction (we need to sign with the mint keypair too)
  // The wallet will sign for the fee payer, but we also need the mint keypair signature
  // Partial sign with the mint keypair first, then the wallet will sign for the payer
  transaction.partialSign(mintKeypair);

  // Sign with wallet (this will sign for the fee payer and any other wallet-owned accounts)
  const signedTx = await signTransaction(transaction);
  
  // Note: The transaction is now signed by both the mint keypair (partial sign) and the wallet

  console.log('[createTokenMint] Transaction signed, sending to network...');

  // Send transaction
  const signature = await connection.sendRawTransaction(signedTx.serialize(), {
    skipPreflight: false,
    maxRetries: 3,
  });

  console.log('[createTokenMint] Transaction sent:', signature);

  // Wait for confirmation
  const confirmation = await connection.confirmTransaction(
    {
      signature,
      blockhash,
      lastValidBlockHeight,
    },
    'confirmed'
  );

  if (confirmation.value.err) {
    throw new Error(`Transaction failed: ${JSON.stringify(confirmation.value.err)}`);
  }

  const explorerUrl = `https://explorer.solana.com/address/${mint.toBase58()}?cluster=${NETWORK}`;

  console.log('[createTokenMint] ✅ Token mint created successfully!', {
    mint: mint.toBase58(),
    signature,
    explorerUrl,
    decimals,
    mintAuthority: mintAuthority.toBase58(),
    freezeAuthority: freezeAuthority?.toBase58() || 'null',
  });

  return {
    mint,
    signature,
    explorerUrl,
  };
}

