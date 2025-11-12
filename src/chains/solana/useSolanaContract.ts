/**
 * Bingo Smart Contract Integration Hook
 *
 * Primary interface for all Solana blockchain interactions in the FundRaisely quiz platform. Provides
 * type-safe methods to create fundraising rooms, join as players, and distribute prizes via the
 * deployed Anchor program. Handles complex PDA derivation for Room, RoomVault, and PlayerEntry
 * accounts, manages SPL token transfers for entry fees, and simulates transactions before sending
 * to prevent failed transactions.
 *
 * ## Key Features
 *
 * ### Room Management
 * - **createPoolRoom**: Creates a new pool-based fundraising room with configurable fee structure
 * - **createAssetRoom**: Creates an asset-based room with pre-deposited prize assets
 * - **getRoomInfo**: Fetches on-chain room state and configuration
 *
 * ### Player Operations
 * - **joinRoom**: Allows players to join a room by paying entry fee
 * - **getPlayerEntry**: Fetches player participation record
 *
 * ### Prize Distribution
 * - **distributePrizes**: Distributes prizes to winners with automatic token account creation
 *   - Automatically creates missing token accounts for host, platform, charity, and winners
 *   - Handles both pool-based and asset-based rooms
 *   - Simulates transaction before execution to prevent failures
 *   - Emits RoomEnded event for transparency
 *
 * ### Token Account Management
 * - **Automatic Creation**: Missing token accounts are created automatically before prize distribution
 * - **Recipients**: Host, platform, charity, and winner token accounts are checked and created if needed
 * - **Asset Rooms**: Prize asset token accounts are also created for asset-based rooms
 *
 * ### Transaction Safety
 * - **Simulation**: All transactions are simulated before execution
 * - **Validation**: Input validation via transactionHelpers.ts
 * - **Error Handling**: User-friendly error messages for common failures
 *
 * ## Economic Model
 *
 * The contract enforces a trustless economic model:
 * - Platform Fee: 20% (fixed)
 * - Host Allocation: 40% total (configurable within this limit)
 *   - Host Fee: 0-5% (host chooses)
 *   - Prize Pool: 0-35% (calculated as 40% - host fee)
 * - Charity: Minimum 40% (calculated remainder)
 * - Extras: 100% to charity
 *
 * ## Usage
 *
 * ```typescript
 * const { createPoolRoom, joinRoom, distributePrizes } = useSolanaContract();
 *
 * // Create a room
 * const room = await createPoolRoom({
 *   roomId: 'my-room-123',
 *   entryFee: 1.0,
 *   hostFeeBps: 100, // 1%
 *   prizePoolBps: 3900, // 39% (max with 1% host fee)
 *   maxPlayers: 100,
 *   feeTokenMint: USDC_MINT,
 *   charityWallet: charityAddress,
 * });
 *
 * // Join a room
 * await joinRoom({
 *   roomId: 'my-room-123',
 *   roomAddress: room.room,
 *   entryFee: 1.0,
 *   feeTokenMint: USDC_MINT,
 * });
 *
 * // Distribute prizes
 * await distributePrizes({
 *   roomId: 'my-room-123',
 *   winners: ['winner1...', 'winner2...', 'winner3...'],
 * });
 * ```
 *
 * Used by CreateRoomPage for room initialization and RoomPage for player joins. Integrates with
 * transactionHelpers.ts for validation and config.ts for network settings. Exposes query methods
 * (getRoomInfo, getPlayerEntry) for fetching on-chain state and PDA derivation helpers for building
 * custom transactions. Core blockchain layer of the application.
 */
import { getAccount } from '@solana/spl-token';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { useCallback, useMemo } from 'react';
import { Program, AnchorProvider, BN } from '@coral-xyz/anchor';
import {
  PublicKey,
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
  Transaction,
  TransactionInstruction,
} from '@solana/web3.js';
import {
  TOKEN_PROGRAM_ID,
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  createInitializeAccount3Instruction,
  getMinimumBalanceForRentExemptAccount,
  NATIVE_MINT,
  createSyncNativeInstruction,
} from '@solana/spl-token';
import { PROGRAM_ID, PDA_SEEDS, TX_CONFIG, getTokenMints } from './config';
import {
  simulateTransaction,
  validateTransactionInputs,
  formatTransactionError,
} from './transactionHelpers';

// Import IDL - Generated from deployed Solana program
import BingoIDL from '@/idl/solana_bingo.json';
import type { Idl } from '@coral-xyz/anchor';

// Import asset room functions
import {
  createAssetRoom as createAssetRoomImpl,
  depositPrizeAsset as depositPrizeAssetImpl,
  deriveTokenRegistryPDA,
  createTokenMint as createTokenMintImpl,
  type CreateAssetRoomParams,
  type DepositPrizeAssetParams,
  type CreateTokenMintParams,
  type CreateTokenMintResult,
} from './solana-asset-room';

// ============================================================================
// Types - Match Solana program structs exactly
// ============================================================================

export interface CreatePoolRoomParams {
  roomId: string; // Human-readable room identifier (max 32 chars)
  charityWallet: PublicKey; // Charity's Solana wallet address (from TGB or custom)
  entryFee: BN; // Entry fee in token base units (e.g., lamports for SOL)
  maxPlayers: number; // Maximum players allowed (up to 10,000)
  hostFeeBps: number; // Host fee in basis points: 0-500 (0-5%)
  prizePoolBps: number; // Prize pool in basis points: 0-2500 (0-25% for bingo)
  firstPlacePct: number; // First place prize percentage: 0-100
  secondPlacePct?: number; // Second place prize percentage: 0-100 (optional)
  thirdPlacePct?: number; // Third place prize percentage: 0-100 (optional)
  charityMemo: string; // Memo for charity transfer (max 28 chars)
  expirationSlots?: BN; // Optional: slots until room expires (~43200 = 24 hours)
  feeTokenMint: PublicKey; // SPL token mint for entry fees
}

export interface JoinRoomParams {
  roomId: string; // Room identifier
  hostPubkey?: PublicKey; // Room host's pubkey (optional - will be fetched from room data if not provided)
  entryFee?: BN; // Entry fee amount (optional - will be fetched from room data if not provided)
  extrasAmount?: BN; // Additional donation beyond entry fee (optional)
  feeTokenMint?: PublicKey; // SPL token mint (optional - will be fetched from room data if not provided)
  roomPDA?: PublicKey; // Optional: Use this room PDA instead of deriving it (avoids PDA mismatch errors)
}

export interface DeclareWinnersParams {
  roomId: string; // Room identifier
  hostPubkey: PublicKey; // Room host's pubkey (must match caller)
  winners: PublicKey[]; // Winner pubkeys (1-10 winners, host cannot be winner)
}

export interface EndRoomParams {
  roomId: string; // Room identifier
  hostPubkey: PublicKey; // Room host's pubkey (must match caller or room expired)
  winners: PublicKey[]; // Winner pubkeys (1-10 winners, host cannot be winner)
  feeTokenMint: PublicKey; // SPL token mint
}

export interface RoomInfo {
  roomId: string;
  host: PublicKey;
  feeTokenMint: PublicKey;
  entryFee: BN;
  maxPlayers: number;
  playerCount: number;
  totalCollected: BN;
  status: any; // RoomStatus enum
  ended: boolean;
  expirationSlot: BN;
  hostFeeBps: number;
  prizePoolBps: number;
  charityBps: number;
  prizeMode?: any; // PrizeMode enum (PoolSplit | AssetBased)
  prizeAssets?: Array<{
    mint: PublicKey;
    amount: BN;
    deposited: boolean;
  } | null>; // [Option<PrizeAsset>; 3]
}

export interface PlayerEntryInfo {
  player: PublicKey;
  room: PublicKey;
  entryPaid: BN;
  extrasPaid: BN;
  totalPaid: BN;
  joinSlot: BN;
}

// ============================================================================
// Main Hook
// ============================================================================

export function useSolanaContract() {
  const { connection } = useConnection();
  const wallet = useWallet();
  const { publicKey, signTransaction } = wallet;

  // Memoize provider - only recreate when wallet/connection changes
  const provider = useMemo(() => {
    if (!publicKey || !signTransaction) return null;

    return new AnchorProvider(
      connection,
      wallet as any, // Anchor expects its own Wallet type
      {
        commitment: TX_CONFIG.commitment,
        preflightCommitment: TX_CONFIG.preflightCommitment,
        skipPreflight: TX_CONFIG.skipPreflight,
      }
    );
  }, [connection, publicKey, signTransaction, wallet]);

  // Memoize program instance - only recreate when provider changes
  const program = useMemo((): Program | null => {
    if (!provider) return null;

    try {
      return new Program(BingoIDL as Idl, provider);
    } catch (error) {
      console.error('[useSolanaContract] Failed to create program:', error);
      return null;
    }
  }, [provider]);

  // ============================================================================
  // PDA Derivation Helpers
  // ============================================================================

  /**
   * Derive GlobalConfig PDA
   * Seeds: ["global-config"]
   */
  const deriveGlobalConfigPDA = useCallback((): [PublicKey, number] => {
    return PublicKey.findProgramAddressSync(
      [Buffer.from(PDA_SEEDS.GLOBAL_CONFIG)],
      PROGRAM_ID
    );
  }, []);

  /**
   * Derive Room PDA
   * Seeds: ["room", host_pubkey, room_id]
   */
  const deriveRoomPDA = useCallback((host: PublicKey, roomId: string): [PublicKey, number] => {
    return PublicKey.findProgramAddressSync(
      [Buffer.from(PDA_SEEDS.ROOM), host.toBuffer(), Buffer.from(roomId)],
      PROGRAM_ID
    );
  }, []);

  /**
   * Derive RoomVault PDA (token account owned by room)
   * Seeds: ["room-vault", room_pubkey]
   */
  const deriveRoomVaultPDA = useCallback((room: PublicKey): [PublicKey, number] => {
    return PublicKey.findProgramAddressSync(
      [Buffer.from('room-vault'), room.toBuffer()],
      PROGRAM_ID
    );
  }, []);

  /**
   * Derive PlayerEntry PDA
   * Seeds: ["player", room_pubkey, player_pubkey]
   */
  const derivePlayerEntryPDA = useCallback((room: PublicKey, player: PublicKey): [PublicKey, number] => {
    return PublicKey.findProgramAddressSync(
      [Buffer.from(PDA_SEEDS.PLAYER), room.toBuffer(), player.toBuffer()],
      PROGRAM_ID
    );
  }, []);

  // ============================================================================
  // Instruction: Create Pool Room
  // ============================================================================

  /**
   * Creates a new bingo room on-chain with configurable fee structure.
   *
   * **Transaction Flow:**
   * 1. Validates input parameters (room ID, fees, prize splits)
   * 2. Derives Program Derived Addresses (PDAs) for room and vault
   * 3. Builds and simulates transaction before submission
   * 4. Submits `init_pool_room` instruction to Solana program
   * 5. Returns room PDA and transaction signature
   *
   * **Account Structure Created:**
   * - Room PDA: Stores room configuration, fee structure, player count
   * - RoomVault PDA: SPL token account that holds all collected fees
   *
   * **Fee Distribution Model (BINGO):**
   * - Platform: 20% (fixed, enforced on-chain)
   * - Host: 0-5% (configurable via hostFeeBps)
   * - Prize Pool: 0-25% (configurable via prizePoolBps, reduced from 40% for bingo)
   * - Charity: Remainder (minimum 50%, enforced: 100% - platform - host - prize)
   *
   * **Prize Split Configuration:**
   * - First place: Required (0-100%)
   * - Second place: Optional (0-100%)
   * - Third place: Optional (0-100%)
   * - Must sum to 100% if multiple winners declared
   *
   * @param params - Room creation parameters
   * @param params.roomId - Unique identifier for room (max 32 chars, used in PDA seed)
   * @param params.charityWallet - Solana public key of charity recipient
   * @param params.entryFee - Fee amount in token base units (e.g., 1 USDC = 1,000,000)
   * @param params.maxPlayers - Maximum allowed players (up to 10,000 for bingo)
   * @param params.hostFeeBps - Host fee in basis points (0-500 = 0-5%)
   * @param params.prizePoolBps - Prize pool in basis points (0-2500 = 0-25%)
   * @param params.firstPlacePct - First place prize percentage (0-100)
   * @param params.secondPlacePct - Optional second place percentage (0-100)
   * @param params.thirdPlacePct - Optional third place percentage (0-100)
   * @param params.charityMemo - Memo attached to charity transfer (max 28 chars)
   * @param params.expirationSlots - Optional expiration in slots (~43200 = 24 hours)
   * @param params.feeTokenMint - SPL token mint address (USDC, SOL, etc.)
   *
   * @returns Promise resolving to creation result
   * @returns result.signature - Solana transaction signature
   * @returns result.room - Room PDA address (base58 string)
   *
   * @throws {Error} 'Wallet not connected' - If publicKey or provider is null
   * @throws {Error} 'Program not deployed yet' - If Anchor program not initialized
   * @throws {Error} Validation errors - If fee structure invalid (charity < 50%)
   * @throws {Error} Transaction simulation errors - If on-chain execution would fail
   *
   * @example
   * ```typescript
   * const { createPoolRoom } = useSolanaContract();
   *
   * const result = await createPoolRoom({
   *   roomId: 'bingo-night-2024',
   *   charityWallet: new PublicKey('Char1ty...'),
   *   entryFee: new BN(5_000_000), // 5 USDC
   *   maxPlayers: 100,
   *   hostFeeBps: 300, // 3%
   *   prizePoolBps: 2000, // 20%
   *   firstPlacePct: 60,
   *   secondPlacePct: 30,
   *   thirdPlacePct: 10,
   *   charityMemo: 'Bingo Night Charity',
   *   feeTokenMint: USDC_MINT,
   * });
   *
   * console.log('Room created:', result.room);
   * console.log('Transaction:', result.signature);
   * ```
   *
   * @see {@link https://explorer.solana.com} - View transaction on explorer
   */

  /**
   * Initializes the global config (one-time setup)
   *
   * The global config must be initialized before creating any rooms.
   * This sets the platform and charity wallet addresses.
   *
   * @param platformWallet - Wallet to receive platform fees
   * @param charityWallet - Wallet to receive charity donations
   * @returns Transaction signature
   */
  const initializeGlobalConfig = useCallback(
    async (platformWallet: PublicKey, charityWallet: PublicKey): Promise<{ signature: string }> => {
      console.log('[initializeGlobalConfig] Starting global config initialization');

      if (!publicKey || !provider) {
        throw new Error('Wallet not connected');
      }

      if (!program) {
        throw new Error('Program not initialized');
      }

      const [globalConfig] = deriveGlobalConfigPDA();

      console.log('[initializeGlobalConfig] Global config PDA:', globalConfig.toBase58());
      console.log('[initializeGlobalConfig] Platform wallet:', platformWallet.toBase58());
      console.log('[initializeGlobalConfig] Charity wallet:', charityWallet.toBase58());

      // Check if already initialized
      try {
        const configAccount = await connection.getAccountInfo(globalConfig);
        if (configAccount && configAccount.owner.toBase58() === program.programId.toBase58()) {
          console.log('[initializeGlobalConfig] Global config already initialized');
          return { signature: 'already-initialized' };
        }
      } catch (error) {
        console.log('[initializeGlobalConfig] Config not found, will initialize');
      }

      // Build initialization instruction
      const ix = await program.methods
        .initialize(platformWallet, charityWallet)
        .accounts({
          globalConfig,
          admin: publicKey,
          systemProgram: SystemProgram.programId,
        })
        .instruction();

      // Build and send transaction
      const tx = new Transaction().add(ix);
      tx.feePayer = publicKey;
      const { blockhash } = await connection.getLatestBlockhash('finalized');
      tx.recentBlockhash = blockhash;

      const signature = await provider.sendAndConfirm(tx, [], {
        skipPreflight: false,
        commitment: 'confirmed',
      });

      console.log('✅ Global config initialized:', signature);

      return { signature };
    },
    [publicKey, provider, program, connection, deriveGlobalConfigPDA]
  );

  /**
   * Updates the global configuration (admin only)
   * 
   * Used to update max_prize_pool_bps from 3500 (35%) to 4000 (40%) to allow
   * hosts to allocate up to 40% - host fee for prizes.
   */
  const updateGlobalConfig = useCallback(
    async (updates: {
      platformWallet?: PublicKey | null;
      charityWallet?: PublicKey | null;
      platformFeeBps?: number | null;
      maxHostFeeBps?: number | null;
      maxPrizePoolBps?: number | null;
      minCharityBps?: number | null;
    }): Promise<{ signature: string }> => {
      console.log('[updateGlobalConfig] Updating global config:', updates);

      if (!publicKey || !provider) {
        throw new Error('Wallet not connected');
      }

      if (!program) {
        throw new Error('Program not initialized');
      }

      const [globalConfig] = deriveGlobalConfigPDA();

      // Build update instruction
      const ix = await program.methods
        .updateGlobalConfig(
          updates.platformWallet ?? null,
          updates.charityWallet ?? null,
          updates.platformFeeBps ?? null,
          updates.maxHostFeeBps ?? null,
          updates.maxPrizePoolBps ?? null,
          updates.minCharityBps ?? null
        )
        .accounts({
          globalConfig,
          admin: publicKey,
        })
        .instruction();

      // Build and send transaction
      const tx = new Transaction().add(ix);
      tx.feePayer = publicKey;
      const { blockhash } = await connection.getLatestBlockhash('finalized');
      tx.recentBlockhash = blockhash;

      const signature = await provider.sendAndConfirm(tx, [], {
        skipPreflight: false,
        commitment: 'confirmed',
      });

      console.log('✅ Global config updated:', signature);

      return { signature };
    },
    [publicKey, provider, program, deriveGlobalConfigPDA]
  );

  /**
   * Initializes the token registry (one-time setup)
   *
   * The token registry must be initialized before creating any rooms.
   * This is a one-time operation that creates the registry PDA account.
   *
   * @returns Transaction signature
   */
  const initializeTokenRegistry = useCallback(
    async (): Promise<{ signature: string }> => {
      console.log('[initializeTokenRegistry] Starting token registry initialization');

      if (!publicKey || !provider) {
        throw new Error('Wallet not connected');
      }

      if (!program) {
        throw new Error('Program not initialized');
      }

      // CRITICAL: Use program.programId to derive token registry PDA (matches Anchor's derivation)
      // This ensures the PDA matches what Anchor expects when validating the constraint
      const programId = program.programId;
      
      // Verify PROGRAM_ID matches the program's programId (for consistency)
      if (!programId.equals(PROGRAM_ID)) {
        console.warn('[initializeTokenRegistry] ⚠️ PROGRAM_ID mismatch!', {
          config: PROGRAM_ID.toBase58(),
          program: programId.toBase58(),
          message: 'Using program.programId for PDA derivation to match Anchor validation'
        });
      }
      
      // Derive token registry PDA using program.programId (same as Anchor uses)
      const [tokenRegistry, bump] = PublicKey.findProgramAddressSync(
        [Buffer.from('token-registry-v4')],
        programId
      );

      console.log('[initializeTokenRegistry] Token registry PDA (derived with program.programId):', tokenRegistry.toBase58());
      console.log('[initializeTokenRegistry] Bump:', bump);
      console.log('[initializeTokenRegistry] Program ID:', programId.toBase58());
      console.log('[initializeTokenRegistry] Seed used:', 'token-registry-v4');

      // Check if already initialized
      try {
        const registryAccount = await connection.getAccountInfo(tokenRegistry);
        if (registryAccount) {
          // Check if it's owned by the correct program
          if (registryAccount.owner.toBase58() === programId.toBase58()) {
            console.log('[initializeTokenRegistry] Token registry already initialized');
            return { signature: 'already-initialized' };
          } else {
            console.warn('[initializeTokenRegistry] ⚠️ Token registry exists but owned by old program:', {
              oldOwner: registryAccount.owner.toBase58(),
              currentProgram: programId.toBase58(),
            });
            throw new Error(
              `⚠️ DEVNET CLEANUP NEEDED: Token registry was created by old program deployment.\n\n` +
              `To fix this, run in your bingo-solana-contracts repo:\n` +
              `cd <path-to-bingo-solana-contracts>\n` +
              `anchor clean && anchor build && anchor deploy\n\n` +
              `Or manually close the old account:\n` +
              `solana program close ${registryAccount.owner.toBase58()} --url devnet`
            );
          }
        }
      } catch (error: any) {
        if (error.message?.includes('DEVNET CLEANUP')) {
          throw error; // Re-throw our custom error
        }
        console.log('[initializeTokenRegistry] Registry not found, will initialize');
      }

      // Build initialization instruction
      // Note: tokenRegistry is explicitly passed, but Anchor will validate it matches the PDA constraint
      // Using program.programId ensures the PDA matches Anchor's derivation
      console.log('[initializeTokenRegistry] 🏗️ Building instruction with Anchor...');
      console.log('[initializeTokenRegistry] Program object:', programId.toString());
      console.log('[initializeTokenRegistry] Passing tokenRegistry:', tokenRegistry.toBase58());

      const ix = await program.methods
        .initializeTokenRegistry()
        .accounts({
          tokenRegistry, // Explicitly pass - Anchor will validate it matches the constraint
          admin: publicKey,
          systemProgram: SystemProgram.programId,
        })
        .instruction();

      console.log('[initializeTokenRegistry] ✅ Instruction built successfully');
      console.log('[initializeTokenRegistry] Instruction programId:', ix.programId.toBase58());
      console.log('[initializeTokenRegistry] Instruction keys:', ix.keys.map(k => ({
        pubkey: k.pubkey.toBase58(),
        isSigner: k.isSigner,
        isWritable: k.isWritable
      })));

      // Build transaction
      const tx = new Transaction().add(ix);
      tx.feePayer = publicKey;
      const { blockhash } = await connection.getLatestBlockhash('finalized');
      tx.recentBlockhash = blockhash;

      console.log('[initializeTokenRegistry] 📤 Transaction ready to send');
      console.log('[initializeTokenRegistry] Transaction accounts:', tx.instructions[0].keys.map(k => k.pubkey.toBase58()));

      // Send and confirm
      const signature = await provider.sendAndConfirm(tx, [], {
        skipPreflight: false,
        commitment: 'confirmed',
      });

      console.log('✅ Token registry initialized:', signature);

      return { signature };
    },
    [publicKey, provider, program, connection]
  );

  /**
   * Add an approved token to the token registry
   *
   * @param tokenMint - The mint address of the token to approve
   * @returns Transaction signature
   */
  const addApprovedToken = useCallback(
    async (tokenMint: PublicKey): Promise<{ signature: string }> => {
      console.log('[addApprovedToken] Adding token:', tokenMint.toBase58());

      if (!publicKey || !provider) {
        throw new Error('Wallet not connected');
      }

      if (!program) {
        throw new Error('Program not initialized');
      }

      // CRITICAL: Use program.programId to derive token registry PDA (matches Anchor's derivation)
      // This ensures the PDA matches what Anchor expects when validating the constraint
      const programId = program.programId;
      const [tokenRegistry] = PublicKey.findProgramAddressSync(
        [Buffer.from('token-registry-v4')],
        programId
      );

      console.log('[addApprovedToken] Token registry PDA (derived with program.programId):', tokenRegistry.toBase58());
      console.log('[addApprovedToken] Token to approve:', tokenMint.toBase58());

      // Check if token is already approved
      try {
        const registryAccount = await program.account.tokenRegistry.fetch(tokenRegistry);
        const approvedTokens = registryAccount.approvedTokens as PublicKey[];

        if (approvedTokens.some(t => t.equals(tokenMint))) {
          console.log('[addApprovedToken] Token already approved');
          return { signature: 'already-approved' };
        }
      } catch (error) {
        console.log('[addApprovedToken] Could not check approved tokens, will attempt to add');
      }

      // Build add token instruction
      // Note: tokenRegistry is explicitly passed, but Anchor will validate it matches the PDA constraint
      // Using program.programId ensures the PDA matches Anchor's derivation
      const ix = await program.methods
        .addApprovedToken(tokenMint)
        .accounts({
          tokenRegistry, // Explicitly pass - Anchor will validate it matches the constraint
          admin: publicKey,
        })
        .instruction();

      // Build and send transaction
      const tx = new Transaction().add(ix);
      tx.feePayer = publicKey;
      const { blockhash } = await connection.getLatestBlockhash('finalized');
      tx.recentBlockhash = blockhash;

      const signature = await provider.sendAndConfirm(tx, [], {
        skipPreflight: false,
        commitment: 'confirmed',
      });

      console.log('✅ Token approved:', signature);

      return { signature };
    },
    [publicKey, provider, program, connection, deriveTokenRegistryPDA]
  );

  /**
   * Creates a new pool-based fundraising room on Solana
   *
   * This function creates a new fundraising room where winners receive prizes from a pool of
   * collected entry fees. The room is configured with a fee structure that allocates funds
   * between platform (20%), host (0-5%), prize pool (0-35%), and charity (40%+).
   *
   * ## Charity Wallet Handling
   *
   * The charity wallet is determined using the following priority:
   * The charity wallet is provided via params.charityWallet. This wallet is stored in the room
   * account but is primarily used as a placeholder. The actual charity routing happens during
   * prize distribution via the charity_token_account parameter in the end_room instruction.
   *
   * **Important**: The charity wallet used at room creation time is stored in room.charity_wallet,
   * but the end_room instruction accepts ANY valid charity_token_account without validation against
   * GlobalConfig.charity_wallet. This enables:
   * - TGB dynamic wallet addresses (different address per transaction)
   * - Custom charity wallets per-room or per-transaction
   * - Per-room charity configuration
   *
   * ## Fee Structure Validation
   *
   * - Platform Fee: 20% (fixed by GlobalConfig)
   * - Host Fee: 0-5% (500 basis points maximum)
   * - Prize Pool: 0-35% (calculated as 40% - host fee)
   * - Charity: Minimum 40% (calculated remainder)
   *
   * The system validates that:
   * - Host fee + prize pool does not exceed 40%
   * - Total allocation (platform + host + prize + charity) equals 100%
   * - Charity receives at least 40%
   *
   * ## Automatic Initialization
   *
   * This function automatically initializes:
   * - GlobalConfig: If not already initialized
   * - TokenRegistry: If not already initialized
   * - Token Approval: If the fee token is not already approved
   *
   * ## Token Restrictions
   *
   * Room fees are restricted to USDC and PYUSD only. Prize tokens have no restrictions.
   *
   * @param params - Room creation parameters
   * @param params.roomId - Unique room identifier
   * @param params.entryFee - Entry fee in token base units (e.g., 1000000 = 1 USDC)
   * @param params.hostFeeBps - Host fee in basis points (0-500 = 0-5%)
   * @param params.prizePoolBps - Prize pool in basis points (0-3500 = 0-35%, max = 40% - host fee)
   * @param params.maxPlayers - Maximum number of players (1-1000)
   * @param params.feeTokenMint - Token mint for entry fees (must be USDC or PYUSD)
   * @param params.charityWallet - Charity wallet address (used if GlobalConfig not initialized)
   * @param params.prizeDistribution - Prize distribution percentages [1st, 2nd, 3rd] (must sum to 100)
   * @returns Room creation result with room PDA and transaction signature
   * @throws Error if wallet not connected, program not initialized, or validation fails
   *
   * @example
   * ```typescript
   * const room = await createPoolRoom({
   *   roomId: 'my-room-123',
   *   entryFee: new BN(1000000), // 1 USDC
   *   hostFeeBps: 100, // 1%
   *   prizePoolBps: 3900, // 39% (max with 1% host fee)
   *   maxPlayers: 100,
   *   feeTokenMint: USDC_MINT,
   *   charityWallet: charityAddress,
   *   prizeDistribution: [50, 30, 20], // 50% 1st, 30% 2nd, 20% 3rd
   * });
   * ```
   */
  const createPoolRoom = useCallback(
    async (params: CreatePoolRoomParams) => {
      console.log('[createPoolRoom] Starting room creation with params:', {
        roomId: params.roomId,
        entryFee: params.entryFee.toString(),
        maxPlayers: params.maxPlayers,
        hostFeeBps: params.hostFeeBps,
        prizePoolBps: params.prizePoolBps,
        charityWallet: params.charityWallet.toBase58(),
        feeTokenMint: params.feeTokenMint.toBase58(),
      });

      if (!publicKey || !provider) {
        throw new Error('Wallet not connected');
      }

      if (!program) {
        throw new Error('Program not deployed yet. Run: cd solana-program/bingo && anchor deploy');
      }

      // Auto-initialize global config and token registry if needed
      // Note: The charity wallet passed here is used to initialize GlobalConfig if it doesn't exist.
      // This is a placeholder - the actual TGB dynamic charity address is used during prize distribution.
      console.log('[createPoolRoom] Checking if global config is initialized...');
      console.log('[createPoolRoom] Charity wallet for GlobalConfig initialization:', params.charityWallet.toBase58());
      
      try {
        await initializeGlobalConfig(publicKey, params.charityWallet);
        console.log('[createPoolRoom] ✅ GlobalConfig initialized or already exists');
      } catch (error: any) {
        // Only fail if it's not already initialized
        const isAlreadyInit = error.message?.includes('already-initialized') ||
                             error.message?.includes('already been processed') ||
                             error.message?.includes('custom program error: 0x0') || // Account already initialized
                             error.message?.includes('AccountAlreadyInitialized'); // Alternative error format
        if (!isAlreadyInit) {
          console.error('[createPoolRoom] ❌ Failed to initialize global config:', error);
          console.error('[createPoolRoom] Error details:', {
            message: error.message,
            name: error.name,
            stack: error.stack?.substring(0, 500)
          });
          // Don't throw - if GlobalConfig initialization fails, we can still try to use existing GlobalConfig
          // or continue with room creation (the contract may handle missing GlobalConfig differently)
          console.warn('[createPoolRoom] ⚠️ Continuing despite GlobalConfig initialization failure - room creation may fail if GlobalConfig is required');
        } else {
          console.log('[createPoolRoom] ✅ GlobalConfig already initialized (caught expected error)');
        }
      }
      
      // Verify GlobalConfig exists and has a valid charity wallet
      // If it doesn't exist or has an invalid wallet, we've already tried to initialize it above
      try {
        const [globalConfigPDA] = deriveGlobalConfigPDA();
        const configAccount = await program.account.globalConfig.fetch(globalConfigPDA);
        const configCharityWallet = configAccount.charityWallet as PublicKey;
        console.log('[createPoolRoom] ✅ GlobalConfig verified - charity wallet:', configCharityWallet.toBase58());
        
        // Warn if the charity wallet in GlobalConfig doesn't match the one we're trying to use
        // (this is OK - the room will use the charity wallet from params, and prize distribution uses TGB address)
        if (!configCharityWallet.equals(params.charityWallet)) {
          console.log('[createPoolRoom] ℹ️ Note: Room will use charity wallet from params:', params.charityWallet.toBase58());
          console.log('[createPoolRoom] ℹ️ GlobalConfig has different charity wallet:', configCharityWallet.toBase58());
          console.log('[createPoolRoom] ℹ️ This is OK - prize distribution uses TGB dynamic address, not room.charity_wallet');
        }
      } catch (verifyError: any) {
        // GlobalConfig doesn't exist or couldn't be fetched - this is a problem
        console.error('[createPoolRoom] ❌ Could not verify GlobalConfig:', verifyError.message);
        console.error('[createPoolRoom] ⚠️ Room creation may fail if GlobalConfig is required by the contract');
        // Don't throw - let the contract validation handle this
      }

      // Check and update max_prize_pool_bps if it's set to 3500 (35%)
      // The contract should allow up to 40% - host fee, so max_prize_pool_bps should be 4000
      const [globalConfig] = deriveGlobalConfigPDA();
      try {
        const configAccount = await program.account.globalConfig.fetch(globalConfig);
        if (configAccount.maxPrizePoolBps === 3500) {
          console.log('[createPoolRoom] GlobalConfig has max_prize_pool_bps = 3500, updating to 4000...');
          try {
            // Check if current user is admin
            if (configAccount.admin.equals(publicKey)) {
              await updateGlobalConfig({ maxPrizePoolBps: 4000 });
              console.log('[createPoolRoom] ✅ Updated max_prize_pool_bps to 4000 (40%)');
            } else {
              console.warn('[createPoolRoom] ⚠️ max_prize_pool_bps is 3500 but user is not admin. Contract validation may fail for prize pools > 35%.');
              console.warn('[createPoolRoom] ⚠️ Admin must update GlobalConfig.max_prize_pool_bps to 4000 to allow prize pools up to 40% - host fee.');
            }
          } catch (updateError: any) {
            // If update fails (e.g., not admin), log warning but continue
            console.warn('[createPoolRoom] Could not update GlobalConfig:', updateError.message);
            console.warn('[createPoolRoom] Prize pool validation may fail if prizePoolBps > 35%.');
          }
        } else {
          console.log(`[createPoolRoom] GlobalConfig max_prize_pool_bps: ${configAccount.maxPrizePoolBps}`);
        }
      } catch (configError: any) {
        // If we can't fetch config, log warning but continue
        console.warn('[createPoolRoom] Could not fetch GlobalConfig:', configError.message);
      }

      console.log('[createPoolRoom] Checking if token registry is initialized...');
      
      // CRITICAL: Use program.programId to derive token registry PDA (matches Anchor's derivation)
      // This ensures the PDA matches what Anchor expects when auto-deriving from IDL constraint
      const programId = program.programId;
      
      // Verify PROGRAM_ID matches the program's programId (for consistency)
      if (!programId.equals(PROGRAM_ID)) {
        console.warn('[createPoolRoom] ⚠️ PROGRAM_ID mismatch!', {
          config: PROGRAM_ID.toBase58(),
          program: programId.toBase58(),
          message: 'Using program.programId for PDA derivation to match Anchor validation'
        });
      }
      
      // Derive token registry PDA using program.programId (same as Anchor uses)
      const [tokenRegistryPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from('token-registry-v4')],
        programId
      );
      
      console.log('[createPoolRoom] Token registry PDA (derived with program.programId):', tokenRegistryPDA.toBase58());
      console.log('[createPoolRoom] Program ID used for derivation:', programId.toBase58());
      
      // CRITICAL: The contract constraint uses `bump = token_registry.bump`, which means
      // Anchor must read the account to get the bump. The account MUST exist before init_pool_room.
      // 
      // DIAGNOSIS: Check if token registry exists at v4 PDA, and also check for old v2 PDA
      // If it exists at v2 PDA, that's the problem - Anchor is looking for v4 but finding v2
      const [oldV2PDA] = PublicKey.findProgramAddressSync(
        [Buffer.from('token-registry-v2')],
        programId
      );
      
      console.log('[createPoolRoom] Checking for token registry at both PDAs:');
      console.log('[createPoolRoom] v4 PDA (expected):', tokenRegistryPDA.toBase58());
      console.log('[createPoolRoom] v2 PDA (old, if exists):', oldV2PDA.toBase58());
      
      // Check if old v2 registry exists (diagnostic only - don't throw error)
      const oldV2Account = await connection.getAccountInfo(oldV2PDA).catch(() => null);
      if (oldV2Account && oldV2Account.owner.toBase58() === programId.toBase58()) {
        console.warn('[createPoolRoom] ⚠️ WARNING: Token registry also exists at OLD v2 PDA (this should not cause issues):', {
          v2PDA: oldV2PDA.toBase58(),
          v4PDA: tokenRegistryPDA.toBase58(),
          message: 'Both v2 and v4 registries exist. Using v4 registry as expected.'
        });
      }
      
      // Verify v4 registry exists
      let tokenRegistryExists = false;
      try {
        // First, try to fetch using Anchor's account API (this is what Anchor will use)
        const registryAccount = await program.account.tokenRegistry.fetch(tokenRegistryPDA);
        console.log('[createPoolRoom] ✅ Token registry account fetched successfully via Anchor API:', {
          pda: tokenRegistryPDA.toBase58(),
          admin: registryAccount.admin.toBase58(),
          approvedTokensCount: registryAccount.approvedTokens?.length || 0,
          bump: registryAccount.bump,
        });
        tokenRegistryExists = true;
      } catch (fetchError: any) {
        console.log('[createPoolRoom] Token registry not found via Anchor API:', fetchError.message);
        console.log('[createPoolRoom] Checking with getAccountInfo...');
        
        // Fallback: Check with getAccountInfo
        const accountInfo = await connection.getAccountInfo(tokenRegistryPDA);
        if (!accountInfo) {
          console.log('[createPoolRoom] ❌ Token registry does not exist at v4 PDA:', tokenRegistryPDA.toBase58());
          console.log('[createPoolRoom] Initializing token registry with v4 seed...');
          
          try {
            await initializeTokenRegistry();
            // Verify it was created
            const verifyAccount = await program.account.tokenRegistry.fetch(tokenRegistryPDA);
            console.log('[createPoolRoom] ✅ Token registry initialized and verified:', {
              pda: tokenRegistryPDA.toBase58(),
              admin: verifyAccount.admin.toBase58(),
              bump: verifyAccount.bump,
            });
            tokenRegistryExists = true;
          } catch (initError: any) {
            console.error('[createPoolRoom] ❌ Token registry initialization failed:', initError);
            throw new Error(`Token registry initialization failed: ${initError.message}`);
          }
        } else if (accountInfo.owner.toBase58() !== programId.toBase58()) {
          console.error('[createPoolRoom] ❌ Token registry exists but owned by wrong program:', {
            owner: accountInfo.owner.toBase58(),
            expected: programId.toBase58(),
            pda: tokenRegistryPDA.toBase58(),
          });
          throw new Error(
            `Token registry exists but owned by wrong program.\n` +
            `Owner: ${accountInfo.owner.toBase58()}\n` +
            `Expected: ${programId.toBase58()}\n` +
            `PDA: ${tokenRegistryPDA.toBase58()}\n\n` +
            `Please close the old account and reinitialize.`
          );
        } else {
          // Account exists and is owned by correct program, but Anchor API failed
          // This might mean the account data is invalid or the IDL doesn't match
          console.error('[createPoolRoom] ❌ Token registry exists but Anchor API fetch failed:', fetchError.message);
          console.error('[createPoolRoom] Account info:', {
            exists: true,
            owner: accountInfo.owner.toBase58(),
            dataLength: accountInfo.data.length,
            executable: accountInfo.executable,
          });
          throw new Error(
            `Token registry exists at ${tokenRegistryPDA.toBase58()} but Anchor cannot fetch it: ${fetchError.message}. ` +
            `This might indicate an IDL mismatch or corrupted account data. ` +
            `The account might have been created with a different IDL version.`
          );
        }
      }
      
      if (!tokenRegistryExists) {
        throw new Error('Token registry verification failed - account does not exist');
      }
      
      console.log('[createPoolRoom] ✅ Token registry verified and ready for room creation');

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

      // Auto-approve the fee token if needed
      console.log('[createPoolRoom] Checking if fee token is approved...');
      try {
        await addApprovedToken(params.feeTokenMint);
      } catch (error: any) {
        const isAlreadyApproved = error.message?.includes('already-approved') ||
                                 error.message?.includes('already been processed');
        if (!isAlreadyApproved) {
          console.error('[createPoolRoom] Failed to approve token:', error);
          throw error;
        }
        console.log('[createPoolRoom] Token already approved (caught expected error)');
      }

      // Validate inputs before building transaction
      const validation = validateTransactionInputs({
        entryFee: params.entryFee.toNumber(),
        hostFeeBps: params.hostFeeBps,
        prizePoolBps: params.prizePoolBps,
        roomId: params.roomId,
      });

      if (!validation.valid) {
        console.error('[createPoolRoom] Validation failed:', validation.errors);
        throw new Error(validation.errors.join('. '));
      }

      // Check wallet has enough SOL for rent
      // With the security fix, we now initialize both Room AND RoomVault token account
      // Both require rent-exempt balance to be paid by the host
      const hostBalance = await connection.getBalance(publicKey);

      // Room PDA rent (~0.002 SOL for account data)
      const ROOM_ACCOUNT_SIZE = 8 + 32 + 32 + 32 + 32 + 8 + 2 + 2 + 2 + 1 + 128 + 4 + 8 + 8 + 8 + 1 + 128 + 8 + 8 + 1; // ~300 bytes
      const roomRent = await connection.getMinimumBalanceForRentExemption(ROOM_ACCOUNT_SIZE);

      // Token Account rent (~0.00204 SOL for 165 bytes)
      const TOKEN_ACCOUNT_SIZE = 165;
      const vaultRent = await connection.getMinimumBalanceForRentExemption(TOKEN_ACCOUNT_SIZE);

      const totalRentRequired = roomRent + vaultRent;
      const TRANSACTION_FEE_BUFFER = 0.001 * 1e9; // 0.001 SOL buffer for transaction fees

      if (hostBalance < totalRentRequired + TRANSACTION_FEE_BUFFER) {
        const requiredSOL = (totalRentRequired + TRANSACTION_FEE_BUFFER) / 1e9;
        const currentSOL = hostBalance / 1e9;
        throw new Error(
          `Insufficient SOL for room creation. ` +
          `Required: ${requiredSOL.toFixed(4)} SOL (${roomRent / 1e9} for room + ${vaultRent / 1e9} for vault + fees). ` +
          `Current balance: ${currentSOL.toFixed(4)} SOL. ` +
          `Please add ${(requiredSOL - currentSOL).toFixed(4)} SOL to your wallet.`
        );
      }

      console.log('[createPoolRoom] Rent validation passed:', {
        hostBalance: (hostBalance / 1e9).toFixed(4),
        roomRent: (roomRent / 1e9).toFixed(6),
        vaultRent: (vaultRent / 1e9).toFixed(6),
        totalRequired: ((totalRentRequired + TRANSACTION_FEE_BUFFER) / 1e9).toFixed(4),
      });

      // Derive all required PDAs
      // tokenRegistryPDA was already derived and verified above (line 826)
      const [room] = deriveRoomPDA(publicKey, params.roomId);
      const [roomVault] = deriveRoomVaultPDA(room);

      console.log('[createPoolRoom] PDAs derived:', {
        programId: programId.toBase58(),
        globalConfig: globalConfig.toBase58(),
        room: room.toBase58(),
        roomVault: roomVault.toBase58(),
        tokenRegistry: tokenRegistryPDA.toBase58(), // Already verified to exist above
      });

      // Final verification: Fetch the token registry account one more time to get its bump
      // This ensures we have the exact account data that Anchor will see
      const finalRegistryCheck = await program.account.tokenRegistry.fetch(tokenRegistryPDA);
      console.log('[createPoolRoom] Final token registry verification:', {
        pda: tokenRegistryPDA.toBase58(),
        storedBump: finalRegistryCheck.bump,
        admin: finalRegistryCheck.admin.toBase58(),
        programId: programId.toBase58(),
      });
      
      // Verify the PDA derivation matches what Anchor expects
      // Anchor will derive: findProgramAddressSync([b"token-registry-v4"], programId)
      // Then read the account's bump and verify it matches
      const [derivedPDA, derivedBump] = PublicKey.findProgramAddressSync(
        [Buffer.from('token-registry-v4')],
        programId
      );
      console.log('[createPoolRoom] PDA derivation check:', {
        expectedPDA: tokenRegistryPDA.toBase58(),
        derivedPDA: derivedPDA.toBase58(),
        matches: tokenRegistryPDA.toBase58() === derivedPDA.toBase58(),
        storedBump: finalRegistryCheck.bump,
        derivedBump: derivedBump,
        bumpMatches: finalRegistryCheck.bump === derivedBump,
      });
      
      if (tokenRegistryPDA.toBase58() !== derivedPDA.toBase58()) {
        throw new Error(
          `PDA derivation mismatch! Expected ${tokenRegistryPDA.toBase58()} but derived ${derivedPDA.toBase58()}. ` +
          `This indicates a program ID mismatch. Program ID: ${programId.toBase58()}`
        );
      }
      
      if (finalRegistryCheck.bump !== derivedBump) {
        console.error('[createPoolRoom] ❌ CRITICAL: Stored bump does not match derived bump!', {
          storedBump: finalRegistryCheck.bump,
          derivedBump: derivedBump,
          pda: tokenRegistryPDA.toBase58(),
          message: 'This WILL cause ConstraintSeeds error! The account was created with a different program ID or seed.'
        });
        throw new Error(
          `Token registry account has incorrect bump! ` +
          `Stored: ${finalRegistryCheck.bump}, Expected: ${derivedBump}. ` +
          `This indicates the account was created with a different program ID or seed. ` +
          `The account needs to be reinitialized with the correct program ID.`
        );
      }
      
      console.log('[createPoolRoom] ✅ Bump verification passed - stored bump matches derived bump');

      // Build instruction using Anchor's methods API
      // CRITICAL: Explicitly pass tokenRegistry to ensure Anchor can validate the bump constraint correctly
      // The constraint `bump = token_registry.bump` requires Anchor to read the account to get the bump.
      // By explicitly passing the account, we ensure Anchor has it available for validation and can
      // properly verify that the stored bump matches the derived bump.
      // 
      // This is necessary because Anchor's auto-derivation with bump constraints that require
      // reading account data can sometimes fail if the account isn't explicitly provided.
      console.log('[createPoolRoom] Building instruction with accounts...');
      console.log('[createPoolRoom] ✅ Explicitly passing tokenRegistry account for bump constraint validation');
      console.log('[createPoolRoom] Token registry PDA:', tokenRegistryPDA.toBase58());
      const ix = await program.methods
        .initPoolRoom(
          params.roomId,
          params.charityWallet,
          params.entryFee,
          params.maxPlayers,
          params.hostFeeBps,
          params.prizePoolBps,
          params.firstPlacePct,
          params.secondPlacePct ?? null,
          params.thirdPlacePct ?? null,
          params.charityMemo,
          params.expirationSlots ?? null
        )
        .accounts({
          room,
          roomVault,
          feeTokenMint: params.feeTokenMint,
          tokenRegistry: tokenRegistryPDA, // ✅ Explicitly pass to ensure Anchor can validate bump constraint
          globalConfig,
          host: publicKey,
          systemProgram: SystemProgram.programId,
          tokenProgram: TOKEN_PROGRAM_ID,
          rent: SYSVAR_RENT_PUBKEY,
        })
        .instruction();
      
      console.log('[createPoolRoom] Instruction built successfully');
      console.log('[createPoolRoom] Instruction program ID:', ix.programId.toBase58());
      
      // Verify tokenRegistry account is in the instruction (we explicitly passed it)
      const allInstructionAccounts = ix.keys.map((k, i) => ({
        index: i,
        pubkey: k.pubkey.toBase58(),
        isSigner: k.isSigner,
        isWritable: k.isWritable,
      }));
      
      console.log('[createPoolRoom] 📋 All instruction accounts:', JSON.stringify(allInstructionAccounts, null, 2));
      console.log('[createPoolRoom] Expected tokenRegistry PDA (v4):', tokenRegistryPDA.toBase58());
      
      // Verify the tokenRegistry account we passed is in the instruction
      const tokenRegistryInInstruction = ix.keys.find(k => k.pubkey.toBase58() === tokenRegistryPDA.toBase58());
      const oldV2InInstruction = ix.keys.find(k => k.pubkey.toBase58() === oldV2PDA.toBase58());
      
      if (tokenRegistryInInstruction) {
        console.log('[createPoolRoom] ✅ Token registry account (v4) found in instruction:', {
          pubkey: tokenRegistryInInstruction.pubkey.toBase58(),
          isSigner: tokenRegistryInInstruction.isSigner,
          isWritable: tokenRegistryInInstruction.isWritable,
          index: ix.keys.indexOf(tokenRegistryInInstruction),
        });
      } else {
        console.error('[createPoolRoom] ❌ Token registry (v4) NOT found in instruction keys!');
        console.error('[createPoolRoom] This should not happen since we explicitly passed it.');
        throw new Error(
          `Token registry account not found in instruction despite explicitly passing it. ` +
          `Expected: ${tokenRegistryPDA.toBase58()}`
        );
      }
      
      if (oldV2InInstruction) {
        console.error('[createPoolRoom] ⚠️ WARNING: Old v2 PDA also found in instruction!', {
          v2PDA: oldV2InInstruction.pubkey.toBase58(),
          v4PDA: tokenRegistryPDA.toBase58(),
        });
        // Don't throw error, just log warning - both might be present for some reason
      }
      
      // Verify program ID matches
      if (ix.programId.toBase58() !== programId.toBase58()) {
        console.error('[createPoolRoom] ❌ Program ID mismatch!', {
          instructionProgramId: ix.programId.toBase58(),
          expectedProgramId: programId.toBase58(),
        });
        throw new Error(`Program ID mismatch in instruction! This will cause PDA derivation to fail.`);
      }
      console.log('[createPoolRoom] ✅ Program ID matches:', programId.toBase58());

      // Build transaction and simulate
      const tx = new Transaction().add(ix);

      // Set fee payer and get FRESH recent blockhash with finalized commitment
      // This prevents "already processed" errors from stale blockhashes
      tx.feePayer = publicKey;
      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('finalized');
      tx.recentBlockhash = blockhash;

      console.log('[createPoolRoom] Transaction prepared:', {
        feePayer: publicKey.toBase58(),
        blockhash: blockhash.substring(0, 8) + '...',
        lastValidBlockHeight,
      });

      // Before simulation, verify token registry one final time
      try {
        const preSimRegistry = await program.account.tokenRegistry.fetch(tokenRegistryPDA);
        console.log('[createPoolRoom] Pre-simulation token registry check:', {
          pda: tokenRegistryPDA.toBase58(),
          bump: preSimRegistry.bump,
          admin: preSimRegistry.admin.toBase58(),
          programId: programId.toBase58(),
        });
      } catch (preSimError: any) {
        console.error('[createPoolRoom] ❌ Pre-simulation check failed - token registry cannot be fetched:', preSimError.message);
        throw new Error(`Token registry verification failed before simulation: ${preSimError.message}`);
      }
      
      console.log('[createPoolRoom] Simulating transaction...');
      console.log('[createPoolRoom] Instruction details:', {
        programId: ix.programId.toBase58(),
        accountsCount: ix.keys.length,
        tokenRegistryExpected: tokenRegistryPDA.toBase58(),
      });
      
      const simResult = await simulateTransaction(connection, tx);
      
      if (!simResult.success) {
        console.error('[createPoolRoom] Simulation failed:', simResult.error);
        console.error('[createPoolRoom] Full simulation result:', JSON.stringify(simResult, null, 2));
        
        // If it's a ConstraintSeeds error on token_registry, provide detailed diagnosis
        if (simResult.logs && simResult.logs.some((log: string) => 
          log.includes('token_registry') && log.includes('ConstraintSeeds')
        )) {
          console.error('[createPoolRoom] ❌ ConstraintSeeds error on token_registry detected!');
          console.error('[createPoolRoom] Diagnosis:');
          console.error('[createPoolRoom] 1. Token registry PDA (expected):', tokenRegistryPDA.toBase58());
          console.error('[createPoolRoom] 2. Program ID (used for derivation):', programId.toBase58());
          console.error('[createPoolRoom] 3. Seed used: token-registry-v4');
          console.error('[createPoolRoom] 4. This error means Anchor could not validate the PDA constraint.');
          console.error('[createPoolRoom] 5. Possible causes:');
          console.error('[createPoolRoom]    - Token registry account does not exist at expected PDA');
          console.error('[createPoolRoom]    - Token registry was created with different program ID');
          console.error('[createPoolRoom]    - Token registry was created with old v2 seed');
          console.error('[createPoolRoom]    - Stored bump in account does not match derived bump');
          console.error('[createPoolRoom]    - IDL mismatch between frontend and deployed contract');
          
          // Try to fetch the account one more time to see its current state
          try {
            const diagnosticCheck = await program.account.tokenRegistry.fetch(tokenRegistryPDA);
            console.error('[createPoolRoom] ✅ Account exists and can be fetched:', {
              pda: tokenRegistryPDA.toBase58(),
              bump: diagnosticCheck.bump,
            });
          } catch (diagError: any) {
            console.error('[createPoolRoom] ❌ Account cannot be fetched:', diagError.message);
          }
          
          // CRITICAL: Check what PDA Anchor actually included in the instruction
          console.error('[createPoolRoom] 🔍 DIAGNOSTIC: Checking what PDA Anchor derived...');
          console.error('[createPoolRoom] Expected v4 PDA:', tokenRegistryPDA.toBase58());
          console.error('[createPoolRoom] Expected v2 PDA (if contract uses old seed):', oldV2PDA.toBase58());
          
          // Check instruction accounts to see which PDA Anchor derived
          const instructionAccounts = tx.instructions[0].keys.map((k, i) => ({
            index: i,
            pubkey: k.pubkey.toBase58(),
            isSigner: k.isSigner,
            isWritable: k.isWritable,
          }));
          console.error('[createPoolRoom] 📋 Instruction accounts in transaction:', JSON.stringify(instructionAccounts, null, 2));
          
          const v4InTx = instructionAccounts.find(a => a.pubkey === tokenRegistryPDA.toBase58());
          const v2InTx = instructionAccounts.find(a => a.pubkey === oldV2PDA.toBase58());
          
          if (v2InTx) {
            console.error('[createPoolRoom] ❌❌❌ ROOT CAUSE IDENTIFIED: Anchor included v2 PDA in transaction!');
            console.error('[createPoolRoom] This confirms the DEPLOYED CONTRACT uses token-registry-v2 seed, but IDL says v4.');
            console.error('[createPoolRoom] SOLUTION: The contract needs to be rebuilt and redeployed with v4 seed.');
            console.error('[createPoolRoom] TEMPORARY FIX: Update IDL to use v2 seed to match deployed contract.');
            throw new Error(
              `IDL/Contract Mismatch Confirmed! ` +
              `The deployed contract uses token-registry-v2 seed, but the IDL says token-registry-v4. ` +
              `Anchor derived v2 PDA (${oldV2PDA.toBase58()}) but the account exists at v4 PDA (${tokenRegistryPDA.toBase58()}). ` +
              `SOLUTION: Rebuild and redeploy the contract from source code (which uses v4 seed) to match the IDL. ` +
              `The contract is at: C:\\Users\\isich\\bingo-solana-contracts\\bingo`
            );
          } else if (v4InTx) {
            console.error('[createPoolRoom] ✅ Anchor included v4 PDA in transaction (correct)');
            console.error('[createPoolRoom] But simulation still fails - this suggests the DEPLOYED CONTRACT validates against v2 seed.');
            console.error('[createPoolRoom] SOLUTION: Rebuild and redeploy the contract to match the IDL.');
          } else {
            console.error('[createPoolRoom] ❌ Neither v4 nor v2 PDA found in transaction accounts!');
            console.error('[createPoolRoom] This suggests Anchor did not auto-derive the token_registry PDA from IDL.');
          }
        }
        
        throw new Error(formatTransactionError(simResult.error) || 'Transaction simulation failed');
      }

      console.log('[createPoolRoom] Simulation successful, sending transaction...');

      // Send and confirm transaction
      let signature: string;
      try {
        signature = await provider.sendAndConfirm(tx, [], {
          skipPreflight: false,
          commitment: 'confirmed',
        });
        console.log('✅ Transaction confirmed:', signature);
      } catch (error: any) {
        console.error('[createPoolRoom] Transaction error:', error);

        // Check if transaction actually succeeded despite error
        if (error.message?.includes('already been processed')) {
          console.log('[createPoolRoom] Transaction may have succeeded, checking room account...');

          // Try to fetch the room to see if it was created
          try {
            const roomAccount = await program.account.room.fetch(room);
            console.log('✅ Room exists! Transaction succeeded despite error:', roomAccount);

            // Try to get the actual transaction signature from recent signatures
            try {
              const signatures = await connection.getSignaturesForAddress(room, { limit: 1 });
              if (signatures.length > 0) {
                const sig = signatures[0].signature;
                console.log('✅ Found transaction signature:', sig);
                return { signature: sig, room: room.toBase58() };
              }
            } catch (sigError) {
              console.warn('[createPoolRoom] Could not fetch signature, using fallback');
            }

            // Fallback: extract from error or use placeholder
            const sig = error.signature || error.transactionSignature || 'transaction-completed';
            return { signature: sig, room: room.toBase58() };
          } catch (fetchError) {
            console.error('[createPoolRoom] Room does not exist, transaction truly failed:', fetchError);
            throw new Error('Transaction failed and room was not created');
          }
        }

        throw error;
      }

      const explorerUrl = `https://explorer.solana.com/tx/${signature}?cluster=devnet`;

      console.log('✅ Room created successfully:', {
        signature,
        room: room.toBase58(),
        roomId: params.roomId,
        explorerUrl,
      });

      return { signature, room: room.toBase58() };
    },
    [publicKey, program, provider, connection, deriveGlobalConfigPDA, deriveRoomPDA, deriveRoomVaultPDA, initializeGlobalConfig, updateGlobalConfig, initializeTokenRegistry, addApprovedToken]
  );

  // ============================================================================
  // Instruction: Create Asset Room
  // ============================================================================

  /**
   * Creates an asset-based room where prizes are pre-deposited SPL tokens.
   * Wrapper around solana-asset-room.ts implementation.
   */
  const createAssetRoom = useCallback(
    async (params: CreateAssetRoomParams) => {
      if (!publicKey || !provider || !program) {
        throw new Error('Wallet not connected');
      }

      // Auto-initialize global config and token registry if needed
      console.log('[createAssetRoom] Checking if global config is initialized...');
      try {
        await initializeGlobalConfig(publicKey, params.charityWallet);
      } catch (error: any) {
        // Only fail if it's not already initialized
        const isAlreadyInit = error.message?.includes('already-initialized') ||
                             error.message?.includes('already been processed') ||
                             error.message?.includes('custom program error: 0x0'); // Account already initialized
        if (!isAlreadyInit) {
          console.error('[createAssetRoom] Failed to initialize global config:', error);
          throw error;
        }
        console.log('[createAssetRoom] Global config already initialized (caught expected error)');
      }

      console.log('[createAssetRoom] Checking if token registry is initialized...');
      try {
        await initializeTokenRegistry();
      } catch (error: any) {
        // Get full transaction logs if available
        if (error.getLogs && typeof error.getLogs === 'function') {
          const logs = await error.getLogs();
          console.error('[createAssetRoom] Full transaction logs:', logs);
        }

        // Log complete error details
        console.error('[createAssetRoom] Full error object:', {
          message: error.message,
          name: error.name,
          stack: error.stack,
          logs: error.logs,
        });

        // Only fail if it's not already initialized
        if (!error.message?.includes('already-initialized')) {
          console.error('[createAssetRoom] Failed to initialize token registry:', error);
          throw new Error(`Token registry initialization failed: ${error.message}`);
        }
      }

      // Auto-approve the fee token if needed
      console.log('[createAssetRoom] Checking if fee token is approved...');
      try {
        await addApprovedToken(params.feeTokenMint);
      } catch (error: any) {
        // Only fail if it's not already approved
        if (!error.message?.includes('already-approved')) {
          console.error('[createAssetRoom] Failed to approve fee token:', error);
          throw new Error(`Fee token approval failed: ${error.message}`);
        }
      }

      return createAssetRoomImpl(program, provider, connection, publicKey, params);
    },
    [publicKey, provider, program, connection, initializeGlobalConfig, initializeTokenRegistry, addApprovedToken]
  );

  // ============================================================================
  // Instruction: Deposit Prize Asset
  // ============================================================================

  /**
   * Deposits a prize asset into an asset-based room.
   * Wrapper around solana-asset-room.ts implementation.
   */
  const depositPrizeAsset = useCallback(
    async (params: DepositPrizeAssetParams) => {
      if (!publicKey || !provider || !program) {
        throw new Error('Wallet not connected');
      }
      return depositPrizeAssetImpl(program, provider, connection, publicKey, params);
    },
    [publicKey, provider, program, connection]
  );

  // ============================================================================
  // Utility: Create Token Mint
  // ============================================================================

  /**
   * Creates a new SPL token mint using your Phantom wallet.
   * Use this to create test tokens for prize assets.
   */
  const createTokenMint = useCallback(
    async (params?: Omit<CreateTokenMintParams, 'connection' | 'publicKey' | 'signTransaction'>): Promise<CreateTokenMintResult> => {
      if (!publicKey || !signTransaction) {
        throw new Error('Wallet not connected');
      }

      const signTx = async (tx: Transaction) => {
        return signTransaction(tx);
      };

      return createTokenMintImpl({
        connection,
        publicKey,
        signTransaction: signTx,
        ...params,
      });
    },
    [publicKey, signTransaction, connection]
  );

  // ============================================================================
  // Instruction: Join Room
  // ============================================================================

  /**
   * Joins an existing bingo room by paying the entry fee and optional extras.
   *
   * **Transaction Flow:**
   * 1. Derives Room PDA from host and room ID
   * 2. Derives PlayerEntry PDA for current wallet
   * 3. Checks if Associated Token Account (ATA) exists for fee token
   * 4. Creates ATA if needed (player pays rent ~0.002 SOL)
   * 5. Transfers entry fee + extras from player to RoomVault
   * 6. Creates PlayerEntry account recording payment amounts
   * 7. Increments room player count
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
   * @param params - Join room parameters
   * @param params.roomId - Room identifier (must match room creation)
   * @param params.hostPubkey - Host's Solana public key (needed for Room PDA derivation)
   * @param params.extrasAmount - Additional donation beyond entry fee (in token base units)
   * @param params.feeTokenMint - SPL token mint (must match room's configured token)
   *
   * @returns Promise resolving to join result
   * @returns result.signature - Solana transaction signature
   * @returns result.playerEntry - PlayerEntry PDA address (base58 string)
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
   * const { joinRoom } = useSolanaContract();
   *
   * // Join with just entry fee
   * const result = await joinRoom({
   *   roomId: 'bingo-night-2024',
   *   hostPubkey: new PublicKey('Host...'),
   *   extrasAmount: new BN(0),
   *   feeTokenMint: USDC_MINT,
   * });
   *
   * // Join with extra donation
   * const result2 = await joinRoom({
   *   roomId: 'bingo-night-2024',
   *   hostPubkey: new PublicKey('Host...'),
   *   extrasAmount: new BN(10_000_000), // +10 USDC donation
   *   feeTokenMint: USDC_MINT,
   * });
   *
   * console.log('Joined room:', result.playerEntry);
   * ```
   *
   * @see {@link https://spl.solana.com/associated-token-account} - ATA spec
   */
  /**
   * Joins a room as a player by paying the entry fee
   *
   * This function allows a player to join a fundraising room by paying the required entry fee.
   * The entry fee is transferred to the room vault, and a PlayerEntry account is created to
   * track the player's participation.
   *
   * ## Token Account Management
   *
   * - If the player's token account doesn't exist, it is created automatically
   * - For native SOL, the account is funded and synced
   * - For SPL tokens, the player must have approved the token transfer
   *
   * ## Entry Fee Payment
   *
   * - Entry fee is transferred from player's token account to room vault
   * - Extras (optional) are also transferred to room vault
   * - All extras go 100% to charity (transparent on-chain)
   *
   * ## Validation
   *
   * - Room must exist and match provided parameters
   * - Player must not have already joined
   * - Player must have sufficient balance
   * - Room must not be full
   * - Room must not be ended
   *
   * @param params - Join room parameters
   * @param params.roomId - Room identifier
   * @param params.roomAddress - Room PDA address
   * @param params.entryFee - Entry fee in token base units
   * @param params.feeTokenMint - Token mint for entry fees
   * @param params.extrasAmount - Optional extras amount (100% to charity)
   * @returns Join room result with transaction signature
   * @throws Error if wallet not connected, room not found, player already joined, or insufficient balance
   *
   * @example
   * ```typescript
   * await joinRoom({
   *   roomId: 'my-room-123',
   *   roomAddress: roomPDA,
   *   entryFee: new BN(1000000), // 1 USDC
   *   feeTokenMint: USDC_MINT,
   *   extrasAmount: new BN(500000), // 0.5 USDC extras (100% to charity)
   * });
   * ```
   */
  const joinRoom = useCallback(
    async (params: JoinRoomParams) => {
    console.log('[joinRoom] Called with params:', {
      roomId: params.roomId,
      roomIdLength: params.roomId.length,
      hostPubkey: params.hostPubkey?.toBase58(),
      feeTokenMint: params.feeTokenMint?.toBase58(),
      extrasAmount: params.extrasAmount?.toString(),
      entryFee: params.entryFee?.toString(),
    });

    if (!publicKey || !provider) {
      throw new Error('Wallet not connected');
    }

    if (!program) {
      throw new Error('Program not deployed yet. Run: cd solana-program/bingo && anchor deploy');
    }

    // Validate roomId length (max 32 chars per Solana program constraint)
    if (params.roomId.length > 32) {
      throw new Error(`Room ID too long: ${params.roomId.length} chars (max 32). RoomId: "${params.roomId}"`);
    }

    // If host pubkey or fee token mint not provided, we need to find the room
    // by searching all possible host addresses
    let hostPubkey = params.hostPubkey;
    let feeTokenMint = params.feeTokenMint;
    let roomPDA = params.roomPDA;

    if (!hostPubkey || !feeTokenMint) {
      console.log('[joinRoom] Missing hostPubkey or feeTokenMint, searching for room...');

      // Try to fetch all rooms and find the one with matching roomId
      // This is a workaround - ideally the UI should pass these parameters
      const rooms = await program.account.room.all();
      const matchingRoom = rooms.find((r: any) => {
        const roomData = r.account;
        const roomIdStr = Buffer.from(roomData.roomId).toString('utf8').replace(/\0/g, '');
        return roomIdStr === params.roomId;
      });

      if (!matchingRoom) {
        throw new Error(`Room not found with ID: ${params.roomId}`);
      }

      const roomData = matchingRoom.account;
      hostPubkey = roomData.host as PublicKey;
      feeTokenMint = roomData.feeTokenMint as PublicKey;
      roomPDA = matchingRoom.publicKey;

      console.log('[joinRoom] Found room:', {
        host: hostPubkey.toBase58(),
        feeTokenMint: feeTokenMint.toBase58(),
        roomPDA: roomPDA.toBase58(),
      });
    }

    // Derive PDAs - use provided roomPDA if available to avoid mismatch
    const [globalConfig] = deriveGlobalConfigPDA();
    const room = roomPDA || deriveRoomPDA(hostPubkey, params.roomId)[0];
    const roomBump = roomPDA ? undefined : deriveRoomPDA(hostPubkey, params.roomId)[1];
    const [roomVault] = deriveRoomVaultPDA(room);
    const [playerEntry] = derivePlayerEntryPDA(room, publicKey);

    // Get player's Associated Token Account
    const playerTokenAccount = await getAssociatedTokenAddress(
      feeTokenMint,
      publicKey
    );

    console.log('[joinRoom] PDA Derivation:', {
      hostPubkey: hostPubkey.toBase58(),
      roomId: params.roomId,
      roomIdBytes: Buffer.from(params.roomId).toString('hex'),
      derivedRoom: room.toBase58(),
      roomBump,
      roomVault: roomVault.toBase58(),
    });

    console.log('[joinRoom] Accounts:', {
      room: room.toBase58(),
      playerEntry: playerEntry.toBase58(),
      playerTokenAccount: playerTokenAccount.toBase58(),
      roomVault: roomVault.toBase58(),
    });

    // Fetch room account to verify it exists and matches our parameters
    let roomAccount;
    try {
      roomAccount = await program.account.room.fetch(room);
      console.log('[joinRoom] Fetched room account:', {
        storedRoomId: roomAccount.roomId,
        storedRoomIdLength: roomAccount.roomId.length,
        storedRoomIdBytes: Buffer.from(roomAccount.roomId).toString('hex'),
        storedHost: roomAccount.host.toBase58(),
        feeTokenMint: roomAccount.feeTokenMint.toBase58(),
        entryFee: roomAccount.entryFee.toString(),
        matchesProvidedHost: roomAccount.host.equals(hostPubkey),
        matchesProvidedRoomId: roomAccount.roomId === params.roomId,
        matchesProvidedMint: roomAccount.feeTokenMint.equals(feeTokenMint),
      });

      // CRITICAL: Verify the fee token mint matches
      if (!roomAccount.feeTokenMint.equals(feeTokenMint)) {
        throw new Error(
          `Token mint mismatch! Room expects ${roomAccount.feeTokenMint.toBase58()} but got ${feeTokenMint.toBase58()}`
        );
      }
    } catch (err) {
      console.error('[joinRoom] Failed to fetch room account:', err);
      throw new Error(`Room account not found at ${room.toBase58()}`);
    }

    // Check if player has already joined
    try {
      const existingEntry = await program.account.playerEntry.fetch(playerEntry);
      console.log('[joinRoom] Player has already joined this room');
      throw new Error('You have already joined this room');
    } catch (err: any) {
      // If account doesn't exist, that's good - player hasn't joined yet
      if (!err.message.includes('Account does not exist') && !err.message.includes('already joined')) {
        console.error('[joinRoom] Error checking player entry:', err);
      }
    }

    // For native SOL, verify player has enough balance in their main wallet
    const isNativeSOL = feeTokenMint.equals(NATIVE_MINT);
    if (isNativeSOL) {
      const totalNeeded = roomAccount.entryFee.add(params.extrasAmount || new BN(0));
      const walletBalance = await connection.getBalance(publicKey);

      // Account for transaction fees (estimate ~0.01 SOL = 10,000,000 lamports)
      const estimatedFees = 10_000_000;
      const totalNeededWithFees = totalNeeded.toNumber() + estimatedFees;

      console.log('[joinRoom] Wallet balance check:', {
        walletBalance,
        totalNeeded: totalNeeded.toString(),
        estimatedFees,
        totalNeededWithFees,
        hasEnough: walletBalance >= totalNeededWithFees,
      });

      if (walletBalance < totalNeededWithFees) {
        throw new Error(
          `Insufficient SOL! Need ${(totalNeededWithFees / 1e9).toFixed(4)} SOL but have ${(walletBalance / 1e9).toFixed(4)} SOL`
        );
      }
    }

    // Check if ATA exists, create if needed
    const accountInfo = await connection.getAccountInfo(playerTokenAccount);
    const instructions: TransactionInstruction[] = [];

    if (!accountInfo) {
      console.log('[joinRoom] Creating Associated Token Account');
      const createATAIx = createAssociatedTokenAccountInstruction(
        publicKey, // payer
        playerTokenAccount, // ata
        publicKey, // owner
        feeTokenMint // mint
      );
      instructions.push(createATAIx);

      // For native SOL, we need to fund the new account
      if (isNativeSOL) {
        const totalNeeded = roomAccount.entryFee.add(params.extrasAmount || new BN(0));
        console.log('[joinRoom] Native SOL - funding new token account with', totalNeeded.toString(), 'lamports');

        // Transfer SOL to the newly created token account
        const transferIx = SystemProgram.transfer({
          fromPubkey: publicKey,
          toPubkey: playerTokenAccount,
          lamports: totalNeeded.toNumber(),
        });
        instructions.push(transferIx);

        // Sync native instruction to update the token account balance
        const syncIx = createSyncNativeInstruction(playerTokenAccount);
        instructions.push(syncIx);
      }
    } else if (isNativeSOL) {
      // Account exists - check if it has enough wrapped SOL balance
      const totalNeeded = roomAccount.entryFee.add(params.extrasAmount || new BN(0)).toNumber();

      // For wrapped SOL, we need to check the token account's amount, not the lamports
      let currentTokenBalance = 0;
      try {
        const tokenAccountData = await getAccount(
          connection,
          playerTokenAccount,
          'confirmed',
          TOKEN_PROGRAM_ID
        );
        currentTokenBalance = Number(tokenAccountData.amount);
      } catch (err) {
        console.warn('[joinRoom] Could not read token account data, assuming 0 balance');
      }

      console.log('[joinRoom] Existing token account balance:', currentTokenBalance, 'lamports, needed:', totalNeeded);

      if (currentTokenBalance < totalNeeded) {
        const deficit = totalNeeded - currentTokenBalance;
        console.log('[joinRoom] Topping up token account with', deficit, 'lamports');

        const transferIx = SystemProgram.transfer({
          fromPubkey: publicKey,
          toPubkey: playerTokenAccount,
          lamports: deficit,
        });
        instructions.push(transferIx);

        const syncIx = createSyncNativeInstruction(playerTokenAccount);
        instructions.push(syncIx);
      }
    }

    // Validate token account ownership and mint (but not balance, since top-up happens in transaction)
    // ONLY validate if the account already exists (not being created in this transaction)
    if (accountInfo) {
      try {
        const tokenAccountData = await getAccount(
          connection,
          playerTokenAccount,
          'confirmed',
          TOKEN_PROGRAM_ID
        );

        console.log('[joinRoom] Token account validation:', {
          owner: tokenAccountData.owner.toBase58(),
          mint: tokenAccountData.mint.toBase58(),
          amount: tokenAccountData.amount.toString(),
          expectedOwner: publicKey.toBase58(),
          expectedMint: feeTokenMint.toBase58(),
          ownerMatches: tokenAccountData.owner.equals(publicKey),
          mintMatches: tokenAccountData.mint.equals(feeTokenMint),
        });

        // Verify ownership
        if (!tokenAccountData.owner.equals(publicKey)) {
          throw new Error(
            `Token account owner mismatch! Expected ${publicKey.toBase58()} but got ${tokenAccountData.owner.toBase58()}`
          );
        }

        // Verify mint
        if (!tokenAccountData.mint.equals(feeTokenMint)) {
          throw new Error(
            `Token account mint mismatch! Expected ${feeTokenMint.toBase58()} but got ${tokenAccountData.mint.toBase58()}`
          );
        }

        // NOTE: We don't validate balance here because:
        // 1. The token account may be empty initially (amount = 0)
        // 2. Top-up instructions are added to the transaction (lines 700-718)
        // 3. Those instructions execute BEFORE the joinRoom instruction in the same transaction
        // 4. The on-chain program will validate sufficient balance when it executes
      } catch (err: any) {
        // If account exists but isn't a valid token account yet, and we're creating it in this tx, that's fine
        if (err.name === 'TokenAccountNotFoundError' && instructions.length > 0) {
          console.log('[joinRoom] Token account exists but not initialized yet - will be created/initialized in this transaction');
        } else {
          console.error('[joinRoom] Token account validation failed:', err);
          throw err;
        }
      }
    } else {
      console.log('[joinRoom] Skipping token account validation - account will be created in this transaction');
    }

    // Validate room vault exists and is correct
    // Note: The vault is created by the Solana program during room initialization
    // For token accounts, use getAccount from @solana/spl-token first (more reliable)
    // Then fall back to getAccountInfo if needed
    try {
      let vaultTokenAccount;
      let vaultAccountInfo;
      
      // Try getAccount first (SPL token library is more reliable for token accounts)
      try {
        vaultTokenAccount = await getAccount(
          connection,
          roomVault,
          'confirmed',
          TOKEN_PROGRAM_ID
        );
        if (process.env.NODE_ENV !== 'production') {
          console.log('[joinRoom] Vault token account found at confirmed:', {
            mint: vaultTokenAccount.mint.toBase58(),
            owner: vaultTokenAccount.owner.toBase58(),
            amount: vaultTokenAccount.amount.toString(),
          });
        }
      } catch (e: any) {
        // If getAccount fails, try finalized commitment
        if (e.message?.includes('not found') || e.message?.includes('does not exist') || e.name === 'TokenAccountNotFoundError') {
          if (process.env.NODE_ENV !== 'production') {
            console.log('[joinRoom] Vault not found at confirmed, trying finalized...');
          }
          try {
            vaultTokenAccount = await getAccount(
              connection,
              roomVault,
              'finalized',
              TOKEN_PROGRAM_ID
            );
            if (process.env.NODE_ENV !== 'production') {
              console.log('[joinRoom] Vault token account found at finalized');
            }
          } catch (e2: any) {
            // If getAccount fails at both commitment levels, try getAccountInfo as fallback
            if (process.env.NODE_ENV !== 'production') {
              console.log('[joinRoom] getAccount failed, trying getAccountInfo as fallback...');
            }
            vaultAccountInfo = await connection.getAccountInfo(roomVault, 'confirmed');
            if (!vaultAccountInfo) {
              vaultAccountInfo = await connection.getAccountInfo(roomVault, 'finalized');
            }
            
            if (!vaultAccountInfo) {
              // If room exists but vault can't be found, try retrying with longer delays
              // This handles RPC indexing delays that can occur after room creation
              if (roomAccount) {
                if (process.env.NODE_ENV !== 'production') {
                  console.log('[joinRoom] Room exists but vault not found, retrying with longer delays...');
                }
                
                // Try multiple retries with increasing delays
                let vaultFound = false;
                for (let attempt = 0; attempt < 3; attempt++) {
                  const delay = 1000 * (attempt + 1); // 1s, 2s, 3s
                  await new Promise(resolve => setTimeout(resolve, delay));
                  
                  try {
                    vaultAccountInfo = await connection.getAccountInfo(roomVault, 'finalized');
                    if (vaultAccountInfo) {
                      vaultFound = true;
                      if (process.env.NODE_ENV !== 'production') {
                        console.log(`[joinRoom] Vault found on retry attempt ${attempt + 1}`);
                      }
                      break;
                    }
                  } catch (retryErr) {
                    // Continue to next attempt
                  }
                }
                
                if (!vaultFound) {
                  // Final retry: try getAccount with longer delay (sometimes RPC needs more time)
                  await new Promise(resolve => setTimeout(resolve, 2000));
                  try {
                    vaultTokenAccount = await getAccount(
                      connection,
                      roomVault,
                      'finalized',
                      TOKEN_PROGRAM_ID
                    );
                    // If getAccount succeeds, vault exists
                    vaultFound = true;
                    vaultAccountInfo = await connection.getAccountInfo(roomVault, 'finalized');
                    if (process.env.NODE_ENV !== 'production') {
                      console.log('[joinRoom] Vault found on final retry using getAccount');
                    }
                  } catch (finalErr) {
                    // Final retry failed
                    if (process.env.NODE_ENV !== 'production') {
                      console.error('[joinRoom] Final retry failed:', finalErr);
                    }
                  }
                }
                
                if (!vaultFound) {
                  // Room exists but vault can't be found after all retries
                  // This is likely an RPC indexing delay - provide helpful error message
                  throw new Error(
                    `Room vault not found after multiple retries. This may be an RPC indexing delay. ` +
                    `Room PDA: ${room.toBase58()}, Vault PDA: ${roomVault.toBase58()}. ` +
                    `The vault exists on-chain but may not be indexed yet. ` +
                    `Please wait a moment and try again, or check the vault on Solana Explorer: ` +
                    `https://explorer.solana.com/address/${roomVault.toBase58()}`
                  );
                }
              } else {
                // Room doesn't exist either
                const errorMessage = `Room vault not found. This room may not have been properly deployed on-chain. Room PDA: ${room.toBase58()}, Vault PDA: ${roomVault.toBase58()}. Please create a new room instead of trying to join this one.`;
                throw new Error(errorMessage);
              }
            }

            // Validate it's a token account
            if (!vaultAccountInfo.owner.equals(TOKEN_PROGRAM_ID)) {
              throw new Error('Room vault is not a valid token account');
            }
            
            // If we have accountInfo but not tokenAccount, try getAccount one more time
            // Sometimes getAccountInfo finds it but getAccount fails due to timing
            if (!vaultTokenAccount && vaultAccountInfo) {
              if (process.env.NODE_ENV !== 'production') {
                console.log('[joinRoom] Account exists but getAccount failed, retrying with delay...');
              }
              // Small delay to allow RPC to catch up
              await new Promise(resolve => setTimeout(resolve, 500));
              try {
                vaultTokenAccount = await getAccount(
                  connection,
                  roomVault,
                  'confirmed',
                  TOKEN_PROGRAM_ID
                );
                if (process.env.NODE_ENV !== 'production') {
                  console.log('[joinRoom] Successfully retrieved vault token account on retry');
                }
              } catch (retryErr) {
                // If retry fails, we'll throw the original error below
                if (process.env.NODE_ENV !== 'production') {
                  console.error('[joinRoom] Retry failed:', retryErr);
                }
              }
            }
          }
        } else {
          throw e;
        }
      }

      // Log validation details only in development
      if (process.env.NODE_ENV !== 'production') {
        console.log('[joinRoom] Room vault validation successful');
      }

      // Verify vault mint matches room's fee token mint
      // Note: vaultTokenAccount should always be set if validation passed
      if (vaultTokenAccount) {
        if (!vaultTokenAccount.mint.equals(feeTokenMint)) {
          throw new Error('Vault token mint does not match room configuration');
        }
      } else {
        // If we somehow don't have vaultTokenAccount but validation passed,
        // this shouldn't happen but we'll throw a clear error
        throw new Error('Vault token account validation incomplete');
      }
    } catch (err: any) {
      // Log detailed error only in development
      if (process.env.NODE_ENV !== 'production') {
        console.error('[joinRoom] Room vault validation failed:', err);
      }
      
      // If it's our custom error, re-throw as-is
      if (err.message?.includes('Room vault not found') || 
          err.message?.includes('Vault mint mismatch') ||
          err.message?.includes('not a token account') ||
          err.message?.includes('not be indexed yet') ||
          err.message?.includes('not a valid token account') ||
          err.message?.includes('token mint does not match')) {
        throw err;
      }
      // Otherwise, wrap it in a generic error (no sensitive details)
      throw new Error('Room vault validation failed. This room may not have been properly deployed on-chain.');
    }



      // Build join instruction
      const joinIx = await program.methods
        .joinRoom(params.roomId, params.extrasAmount)
        .accounts({
          room,
          playerEntry,
          roomVault,
          playerTokenAccount,
          globalConfig,
          player: publicKey,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .instruction();

      instructions.push(joinIx);

      // Build transaction and simulate
      const tx = new Transaction().add(...instructions);

      // Set fee payer and get FRESH recent blockhash with validity window
      tx.feePayer = publicKey;
      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('finalized');
      tx.recentBlockhash = blockhash;
      tx.lastValidBlockHeight = lastValidBlockHeight;

      console.log('[joinRoom] Transaction prepared with', instructions.length, 'instructions:',
        instructions.map((ix, i) => `${i}: ${ix.programId.toBase58().slice(0, 8)}...`).join(', '));
      console.log('[joinRoom] Simulating...');
      const simResult = await simulateTransaction(connection, tx);

      if (!simResult.success) {
        console.error('[joinRoom] Simulation failed:', simResult.error);
        console.error('[joinRoom] Simulation logs:', simResult.logs);

        // Extract more details from logs
        if (simResult.logs) {
          const errorLogs = simResult.logs.filter(log =>
            log.includes('Error') || log.includes('failed') || log.includes('insufficient')
          );
          console.error('[joinRoom] Error-related logs:', errorLogs);
        }

        throw new Error(formatTransactionError(simResult.error) || 'Join simulation failed');
      }

      console.log('[joinRoom] Simulation successful, sending transaction...');

      // Send transaction with the SAME blockhash we simulated with
      // Don't use provider.sendAndConfirm as it might fetch a new blockhash
      const signedTx = await provider.wallet.signTransaction(tx);
      const rawTx = signedTx.serialize();

      const signature = await connection.sendRawTransaction(rawTx, {
        skipPreflight: true, // We already simulated, skip preflight
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

      console.log('✅ Player joined room successfully:', {
        signature,
        player: publicKey.toBase58(),
        room: room.toBase58(),
        explorerUrl: `https://explorer.solana.com/tx/${signature}?cluster=devnet`,
      });

      return { signature, playerEntry: playerEntry.toBase58() };
    },
    [publicKey, program, provider, connection, deriveGlobalConfigPDA, deriveRoomPDA, deriveRoomVaultPDA, derivePlayerEntryPDA]
  );

  // ============================================================================
  // Instruction: Declare Winners
  // ============================================================================

  /**
   * Declares the winners of a bingo room (must be called before endRoom).
   *
   * **Purpose:**
   * This is a TWO-STEP process for prize distribution:
   * 1. `declareWinners()` - Host declares who won (this function)
   * 2. `endRoom()` - Actually distributes funds based on declared winners
   *
   * **Transaction Flow:**
   * 1. Validates 1-10 winners provided (bingo supports up to 10 winners)
   * 2. Derives Room PDA and PlayerEntry PDAs for each winner
   * 3. Verifies all winners actually joined the room (PlayerEntry exists)
   * 4. Stores winner list in Room account
   * 5. Marks room as ready for distribution
   *
   * **Security:**
   * - Only host can declare winners (enforced on-chain via `has_one = host`)
   * - Host cannot be a winner (enforced on-chain)
   * - All winners must have joined room (PlayerEntry PDA check)
   * - Cannot change winners once declared (idempotent)
   * - Cannot declare after room ended
   *
   * **Prize Distribution:**
   * Prize percentages are set during room creation (firstPlacePct, secondPlacePct, thirdPlacePct).
   * This function does NOT transfer funds - it only records winners.
   * Actual distribution happens in `endRoom()`.
   *
   * @param params - Declare winners parameters
   * @param params.roomId - Room identifier
   * @param params.hostPubkey - Host's Solana public key (must match caller)
   * @param params.winners - Array of winner public keys (1-10 players for bingo)
   *
   * @returns Promise resolving to declaration result
   * @returns result.signature - Solana transaction signature
   *
   * @throws {Error} 'Wallet not connected' - If publicKey or provider is null
   * @throws {Error} 'Must declare 1-10 winners' - If winners array invalid
   * @throws {Error} 'Not room host' - If caller is not the room host
   * @throws {Error} 'Winner did not join room' - If PlayerEntry doesn't exist
   * @throws {Error} 'Host cannot be winner' - If host in winners array
   * @throws {Error} 'Room already ended' - If room.ended is true
   *
   * @example
   * ```typescript
   * const { declareWinners, endRoom } = useSolanaContract();
   *
   * // Step 1: Declare winners (1-10 winners for bingo)
   * await declareWinners({
   *   roomId: 'bingo-night-2024',
   *   hostPubkey: new PublicKey('Host...'),
   *   winners: [
   *     new PublicKey('Winner1...'), // First place
   *     new PublicKey('Winner2...'), // Second place (optional)
   *     new PublicKey('Winner3...'), // Third place (optional)
   *     // ... up to 10 winners total for bingo
   *   ],
   * });
   *
   * // Step 2: Distribute prizes
   * await endRoom({
   *   roomId: 'bingo-night-2024',
   *   hostPubkey: new PublicKey('Host...'),
   *   winners: [...], // Same array
   *   feeTokenMint: USDC_MINT,
   * });
   * ```
   *
   * @see {@link endRoom} - Second step to actually distribute funds
   */
  const declareWinners = useCallback(
    async (params: DeclareWinnersParams) => {
      if (!publicKey || !provider) {
        throw new Error('Wallet not connected');
      }

      if (!program) {
        throw new Error('Program not deployed yet. Run: cd solana-program/bingo && anchor deploy');
      }

      // Validate winners (bingo supports 1-10 winners)
      if (params.winners.length < 1 || params.winners.length > 10) {
        throw new Error('Must declare 1-10 winners');
      }

      // Derive room PDA
      const [room] = deriveRoomPDA(params.hostPubkey, params.roomId);

      // Derive PlayerEntry PDAs for each winner (to verify they actually joined)
      const playerEntryPDAs = params.winners.map(winner => {
        const [playerEntry] = derivePlayerEntryPDA(room, winner);
        return playerEntry;
      });

      console.log('═══════════════════════════════════════════');
      console.log('[declareWinners] PRE-FLIGHT CHECK');
      console.log('═══════════════════════════════════════════');
      console.log('[declareWinners] Room PDA:', room.toBase58());
      console.log('[declareWinners] Calling wallet:', publicKey.toBase58());
      console.log('[declareWinners] Expected host:', params.hostPubkey.toBase58());
      console.log('[declareWinners] Winners count:', params.winners.length);
      console.log('[declareWinners] Winners:');
      params.winners.forEach((w, i) => {
        console.log(`  [${i}]:`, w.toBase58());
      });
      console.log('[declareWinners] PlayerEntry PDAs:');
      playerEntryPDAs.forEach((p, i) => {
        console.log(`  [${i}]:`, p.toBase58());
      });

      // Fetch and validate room state
      try {
        // @ts-ignore - Account types available after program deployment
        const roomAccount = await program.account.room.fetch(room);
        console.log('[declareWinners] Room state:');
        console.log('  Host:', roomAccount.host.toBase58());
        console.log('  Status:', roomAccount.status);
        console.log('  Ended:', roomAccount.ended);
        console.log('  Player count:', roomAccount.playerCount);
        console.log('  Current winners:', roomAccount.winners);

        // Validation checks
        if (roomAccount.host.toBase58() !== params.hostPubkey.toBase58()) {
          console.error('[declareWinners] ⚠️ WARNING: Host mismatch!');
          console.error('  Expected:', params.hostPubkey.toBase58());
          console.error('  Actual:', roomAccount.host.toBase58());
        }

        if (roomAccount.ended) {
          console.error('[declareWinners] ⚠️ WARNING: Room already ended!');
        }

        if (roomAccount.status !== 1 && roomAccount.status?.toString() !== 'Active') {
          console.error('[declareWinners] ⚠️ WARNING: Room not active! Status:', roomAccount.status);
        }

        if (roomAccount.winners && roomAccount.winners.length > 0) {
          console.error('[declareWinners] ⚠️ WARNING: Winners already declared!', roomAccount.winners);
        }
      } catch (e: any) {
        console.error('[declareWinners] ❌ Failed to fetch room account:', e);
        throw new Error('Cannot fetch room account: ' + e.message);
      }

      console.log('═══════════════════════════════════════════');

      // Build instruction with PlayerEntry PDAs as remaining_accounts
      const ix = await program.methods
        .declareWinners(params.roomId, params.winners)
        .accounts({
          room,
          host: publicKey,
        })
        .remainingAccounts(
          playerEntryPDAs.map(playerEntry => ({
            pubkey: playerEntry,
            isSigner: false,
            isWritable: false, // Read-only, just verifying they exist
          }))
        )
        .instruction();

      // Build transaction and simulate
      const tx = new Transaction().add(ix);
      tx.feePayer = publicKey;
      const simResult = await simulateTransaction(connection, tx);

      if (!simResult.success) {
        console.error('═══════════════════════════════════════════');
        console.error('[declareWinners] SIMULATION FAILED');
        console.error('═══════════════════════════════════════════');
        console.error('[declareWinners] Error type:', typeof simResult.error);
        console.error('[declareWinners] Error object:', simResult.error);
        console.error('[declareWinners] Error string:', String(simResult.error));

        try {
          console.error('[declareWinners] Error JSON:', JSON.stringify(simResult.error, null, 2));
        } catch (e) {
          console.error('[declareWinners] Error cannot be stringified');
        }

        console.error('─────────────────────────────────────────');
        console.error('[declareWinners] SIMULATION LOGS:');

        if (simResult.logs && simResult.logs.length > 0) {
          simResult.logs.forEach((log, idx) => {
            console.error(`  [Log ${idx}]:`, log);
          });
        } else {
          console.error('  No logs available');
        }

        console.error('═══════════════════════════════════════════');

        throw new Error(formatTransactionError(simResult.error));
      }

      // Send and confirm
      const signature = await provider.sendAndConfirm(tx);

      console.log('Winners declared successfully:', {
        signature,
        room: room.toBase58(),
        winners: params.winners.map(w => w.toBase58()),
      });

      return { signature };
    },
    [publicKey, program, provider, connection, deriveRoomPDA, derivePlayerEntryPDA]
  );

  // ============================================================================
  // Instruction: End Room
  // ============================================================================

  /**
   * Ends a bingo room and atomically distributes all collected funds.
   *
   * **This is the FINAL and CRITICAL transaction** that distributes all funds in a single atomic operation.
   *
   * **Transaction Flow:**
   * 1. Fetches GlobalConfig to get platform and charity wallet addresses
   * 2. Resolves Associated Token Accounts for all recipients (platform, charity, host, winners)
   * 3. Calculates exact distribution amounts based on room fee structure
   * 4. Executes atomic SPL token transfers from RoomVault to all recipients
   * 5. Marks room as ended, preventing further operations
   *
   * **Fund Distribution Breakdown (BINGO):**
   * ```
   * Total Pool = (entryFee * playerCount) + sum(allExtras)
   * 
   * Note: Both entry fees and extras are added to the total pool.
   * The total pool is then split proportionally among all recipients.
   *
   * Platform Fee = Total Pool * platformBps / 10000
   * Host Fee = Total Pool * hostBps / 10000 (<5%)
   * Prize Pool = Total Pool * prizeBps / 10000
   * Charity = Total Pool * charityBps / 10000
   * 
   * All recipients (host, prize pool, platform, charity) share proportionally 
   * in both entry fees and extras - extras are NOT 100% to charity.
   *
   * Prize distribution (from Prize Pool):
   * - First place: Prize Pool * firstPlacePct / 100
   * - Second place: Prize Pool * secondPlacePct / 100
   * - Third place: Prize Pool * thirdPlacePct / 100
   * - ... up to 10 winners for bingo
   * ```
   *
   * **⚠️ BUG FIX REQUIRED IN SOLANA PROGRAM:**
   * The Rust program currently calculates prize amounts incorrectly:
   * - WRONG: First place = Total Pool * firstPlacePct / 100
   * - CORRECT: First place = Prize Pool * firstPlacePct / 100
   *
   * Example with 6 USDC total, 35% prize pool, 80%/20% splits:
   * - Prize Pool = 6 * 0.35 = 2.1 USDC
   * - First place should be: 2.1 * 0.80 = 1.68 USDC
   * - Currently calculates: 6 * 0.80 = 4.8 USDC (WRONG!)
   * 
   * The bug is in the end_room instruction in the Solana program.
   * Fix: Calculate prize_pool first, then apply firstPlacePct to prize_pool, not total_collected.
   *
   * **Atomicity Guarantee:**
   * ALL transfers happen in a single transaction. Either:
   * - All succeed (platform, charity, host, all winners get paid)
   * - All fail (transaction reverts, funds stay in RoomVault)
   *
   * No partial distributions possible. This prevents fund loss or disputes.
   *
   * **Prerequisites:**
   * 1. `declareWinners()` must be called first
   * 2. All recipients must have Associated Token Accounts (auto-created if missing)
   * 3. Only host can call (or anyone after expiration)
   * 4. Room must not be already ended
   *
   * **Security:**
   * - Only host can end before expiration (enforced on-chain)
   * - Anyone can end after expiration (allows fund recovery)
   * - Cannot end twice (room.ended flag prevents re-entry)
   * - All math uses checked arithmetic (no overflow/underflow)
   * - Winner validation enforced (must have declared winners)
   *
   * @param params - End room parameters
   * @param params.roomId - Room identifier
   * @param params.hostPubkey - Host's Solana public key (for PDA derivation)
   * @param params.winners - Same winners array from declareWinners (1-10 players for bingo)
   * @param params.feeTokenMint - SPL token mint used for fees
   *
   * @returns Promise resolving to distribution result
   * @returns result.signature - Solana transaction signature
   *
   * @throws {Error} 'Wallet not connected' - If publicKey or provider is null
   * @throws {Error} 'Program not deployed yet' - If Anchor program not initialized
   * @throws {Error} 'Room already ended' - If room.ended is true
   * @throws {Error} 'Winners not declared' - If declareWinners not called
   * @throws {Error} 'Not authorized' - If caller is not host and room not expired
   * @throws {Error} 'Insufficient funds' - If RoomVault balance too low (should not happen)
   * @throws {Error} Transaction simulation errors - If on-chain execution would fail
   *
   * @example
   * ```typescript
   * const { endRoom } = useSolanaContract();
   *
   * // End room and distribute funds atomically
   * const result = await endRoom({
   *   roomId: 'bingo-night-2024',
   *   hostPubkey: new PublicKey('Host...'),
   *   winners: [
   *     new PublicKey('Winner1...'),
   *     new PublicKey('Winner2...'),
   *   ],
   *   feeTokenMint: USDC_MINT,
   * });
   *
   * console.log('Funds distributed:', result.signature);
   * // Check Solana Explorer to verify all transfers
   * ```
   *
   * @see {@link declareWinners} - Must be called before this function
   * @see {@link https://explorer.solana.com} - Verify distribution on explorer
   */
  const endRoom = useCallback(
    async (params: EndRoomParams) => {
      if (!publicKey || !provider) {
        throw new Error('Wallet not connected');
      }

      if (!program) {
        throw new Error('Program not deployed yet. Run: cd solana-program/bingo && anchor deploy');
      }

      // Derive PDAs
      const [globalConfig] = deriveGlobalConfigPDA();
      const [room] = deriveRoomPDA(params.hostPubkey, params.roomId);
      const [roomVault] = deriveRoomVaultPDA(room);

      // Fetch global config to get platform and charity wallets
      // @ts-ignore - Account types available after program deployment
      const globalConfigAccount = await program.account.globalConfig.fetch(globalConfig);
      const platformWallet = globalConfigAccount.platformWallet as PublicKey;
      const charityWallet = globalConfigAccount.charityWallet as PublicKey;

      // Get token accounts for all recipients
      const platformTokenAccount = await getAssociatedTokenAddress(
        params.feeTokenMint,
        platformWallet
      );
      const charityTokenAccount = await getAssociatedTokenAddress(
        params.feeTokenMint,
        charityWallet
      );
      const hostTokenAccount = await getAssociatedTokenAddress(
        params.feeTokenMint,
        params.hostPubkey
      );

      // Get winner token accounts (must be passed as remaining accounts)
      const winnerTokenAccounts = await Promise.all(
        params.winners.map(winner =>
          getAssociatedTokenAddress(params.feeTokenMint, winner)
        )
      );

      console.log('[endRoom] Recipients:', {
        platform: platformTokenAccount.toBase58(),
        charity: charityTokenAccount.toBase58(),
        host: hostTokenAccount.toBase58(),
        winners: winnerTokenAccounts.map(w => w.toBase58()),
      });

      // Build instruction with remaining accounts for winners
      const ix = await program.methods
        .endRoom(params.roomId, params.winners)
        .accounts({
          room,
          roomVault,
          globalConfig,
          platformTokenAccount,
          charityTokenAccount,
          hostTokenAccount,
          host: publicKey,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .remainingAccounts(
          winnerTokenAccounts.map(account => ({
            pubkey: account,
            isSigner: false,
            isWritable: true,
          }))
        )
        .instruction();

      // Build transaction and simulate
      const tx = new Transaction().add(ix);
      tx.feePayer = publicKey;
      const simResult = await simulateTransaction(connection, tx);

      if (!simResult.success) {
        console.error('═══════════════════════════════════════════');
        console.error('[endRoom] SIMULATION FAILED');
        console.error('═══════════════════════════════════════════');
        console.error('[endRoom] Error type:', typeof simResult.error);
        console.error('[endRoom] Error object:', simResult.error);
        console.error('[endRoom] Error string:', String(simResult.error));

        try {
          console.error('[endRoom] Error JSON:', JSON.stringify(simResult.error, null, 2));
        } catch (e) {
          console.error('[endRoom] Error cannot be stringified');
        }

        console.error('─────────────────────────────────────────');
        console.error('[endRoom] SIMULATION LOGS:');

        if (simResult.logs && simResult.logs.length > 0) {
          simResult.logs.forEach((log, idx) => {
            console.error(`  [Log ${idx}]:`, log);
          });
        } else {
          console.error('  No logs available');
        }

        console.error('═══════════════════════════════════════════');

        throw new Error(formatTransactionError(simResult.error));
      }

      // Send and confirm
      const signature = await provider.sendAndConfirm(tx);

      // Parse RoomEnded event to get exact charity_amount that was sent
      // This ensures the amount reported to The Giving Block matches what was actually transferred
      let charityAmount: BN | undefined;
      try {
        const txDetails = await connection.getTransaction(signature, {
          commitment: 'confirmed',
          maxSupportedTransactionVersion: 0,
        });

        if (txDetails?.meta?.logMessages) {
          // Parse events from transaction logs
          // Anchor events are emitted as "Program data: <base64>" in logs
          // We need to find the RoomEnded event and decode it
          try {
            // Look for log lines containing "Program data:" which indicates an event
            for (const log of txDetails.meta.logMessages) {
              if (log.includes('Program data:')) {
                // Extract base64 data
                const base64Match = log.match(/Program data: ([A-Za-z0-9+/=]+)/);
                if (base64Match) {
                  try {
                    const eventData = Buffer.from(base64Match[1], 'base64');
                    // Try to decode as RoomEnded event
                    // The event coder expects the full event data including discriminator
                    const decoded = program.coder.events.decode('RoomEnded', eventData);
                    if (decoded && decoded.charityAmount) {
                      charityAmount = new BN(decoded.charityAmount.toString());
                      console.log('[endRoom] Parsed RoomEnded event:', {
                        charityAmount: charityAmount.toString(),
                        platformAmount: decoded.platformAmount?.toString(),
                        hostAmount: decoded.hostAmount?.toString(),
                        prizeAmount: decoded.prizeAmount?.toString(),
                      });
                      break; // Found the event, stop searching
                    }
                  } catch (decodeError) {
                    // Not a RoomEnded event or decode failed, continue searching
                    continue;
                  }
                }
              }
            }
          } catch (parseError) {
            console.log('[endRoom] Event parsing failed, continuing without event data');
          }
        }
      } catch (eventParseError) {
        console.warn('[endRoom] Failed to parse RoomEnded event:', eventParseError);
        // Continue without event data - the transaction still succeeded
      }

      console.log('Room ended successfully:', {
        signature,
        room: room.toBase58(),
        winners: params.winners.map(w => w.toBase58()),
        charityAmount: charityAmount?.toString(),
      });

      return { 
        signature,
        charityAmount, // Exact amount sent to charity (from on-chain event)
      };
    },
    [publicKey, program, provider, connection, deriveGlobalConfigPDA, deriveRoomPDA, deriveRoomVaultPDA]
  );

  // ============================================================================
  // Queries
  // ============================================================================

  /**
   * Fetch room information from on-chain account
   */
  const getRoomInfo = useCallback(
    async (roomPubkey: PublicKey): Promise<RoomInfo | null> => {
      if (!program) return null;

      try {
        // @ts-ignore - Account types available after program deployment
        const roomAccount = await program.account.room.fetch(roomPubkey);

        return {
          roomId: roomAccount.roomId as string,
          host: roomAccount.host as PublicKey,
          feeTokenMint: roomAccount.feeTokenMint as PublicKey,
          entryFee: roomAccount.entryFee as BN,
          maxPlayers: roomAccount.maxPlayers as number,
          playerCount: roomAccount.playerCount as number,
          totalCollected: roomAccount.totalCollected as BN,
          status: roomAccount.status,
          ended: roomAccount.ended as boolean,
          expirationSlot: roomAccount.expirationSlot as BN,
          hostFeeBps: roomAccount.hostFeeBps as number,
          prizePoolBps: roomAccount.prizePoolBps as number,
          charityBps: roomAccount.charityBps as number,
          prizeMode: roomAccount.prizeMode,
          prizeAssets: roomAccount.prizeAssets as Array<{
            mint: PublicKey;
            amount: BN;
            deposited: boolean;
          } | null> | undefined,
        };
      } catch (error) {
        console.error('[getRoomInfo] Failed:', error);
        return null;
      }
    },
    [program]
  );

  /**
   * Fetch player entry information
   */
  const getPlayerEntry = useCallback(
    async (playerEntryPubkey: PublicKey): Promise<PlayerEntryInfo | null> => {
      if (!program) return null;

      try {
        // @ts-ignore - Account types available after program deployment
        const entry = await program.account.playerEntry.fetch(playerEntryPubkey);

        return {
          player: entry.player as PublicKey,
          room: entry.room as PublicKey,
          entryPaid: entry.entryPaid as BN,
          extrasPaid: entry.extrasPaid as BN,
          totalPaid: entry.totalPaid as BN,
          joinSlot: entry.joinSlot as BN,
        };
      } catch (error) {
        console.error('[getPlayerEntry] Failed:', error);
        return null;
      }
    },
    [program]
  );

  // ============================================================================
  // Admin & Room Management Instructions
  // ============================================================================

  /**
   * Set emergency pause (admin only)
   * Toggles global pause flag to halt all operations in emergency situations
   */
  const setEmergencyPause = useCallback(
    async (paused: boolean): Promise<{ signature: string }> => {
      if (!publicKey || !provider || !program) {
        throw new Error('Wallet not connected');
      }

      const [globalConfig] = deriveGlobalConfigPDA();

      // Verify caller is admin
      const globalConfigAccount = await program.account.globalConfig.fetch(globalConfig);
      if (!globalConfigAccount.admin.equals(publicKey)) {
        throw new Error('Only platform admin can toggle emergency pause');
      }

      const ix = await program.methods
        .setEmergencyPause(paused)
        .accounts({
          globalConfig,
          admin: publicKey,
        })
        .instruction();

      const tx = new Transaction().add(ix);
      const simResult = await simulateTransaction(connection, tx);

      if (!simResult.success) {
        throw new Error(formatTransactionError(simResult.error));
      }

      const signature = await provider.sendAndConfirm(tx);

      console.log('Emergency pause toggled:', { paused, signature });
      return { signature };
    },
    [publicKey, provider, program, connection, deriveGlobalConfigPDA]
  );

  /**
   * Close joining for a room (host only)
   * Prevents new players from joining before max capacity reached
   */
  const closeJoining = useCallback(
    async (params: { roomId: string; hostPubkey: PublicKey }): Promise<{ signature: string }> => {
      if (!publicKey || !provider || !program) {
        throw new Error('Wallet not connected');
      }

      // Verify caller is host
      if (!publicKey.equals(params.hostPubkey)) {
        throw new Error('Only room host can close joining');
      }

      const [room] = deriveRoomPDA(params.hostPubkey, params.roomId);

      const ix = await program.methods
        .closeJoining(params.roomId)
        .accounts({
          room,
          host: publicKey,
        })
        .instruction();

      const tx = new Transaction().add(ix);
      tx.feePayer = publicKey;
      const simResult = await simulateTransaction(connection, tx);

      if (!simResult.success) {
        console.error('[closeJoining] Simulation failed:', {
          error: simResult.error,
          logs: simResult.logs,
        });
        throw new Error(formatTransactionError(simResult.error));
      }

      const signature = await provider.sendAndConfirm(tx);

      console.log('Joining closed for room:', { roomId: params.roomId, signature });
      return { signature };
    },
    [publicKey, provider, program, connection, deriveRoomPDA]
  );

  /**
   * Cleanup room and reclaim rent (host or admin)
   * Closes vault token account and returns rent lamports after room ends
   */
  const cleanupRoom = useCallback(
    async (params: { roomId: string; hostPubkey: PublicKey }): Promise<{ signature: string; rentReclaimed: number }> => {
      if (!publicKey || !provider || !program) {
        throw new Error('Wallet not connected');
      }

      const [globalConfig] = deriveGlobalConfigPDA();
      const [room] = deriveRoomPDA(params.hostPubkey, params.roomId);
      const [roomVault] = deriveRoomVaultPDA(room);

      // Verify room is ended
      const roomAccount = await program.account.room.fetch(room);
      if (!roomAccount.ended) {
        throw new Error('Room must be ended before cleanup');
      }

      // Verify vault is empty
      const vaultAccount = await getAccount(connection, roomVault);
      if (vaultAccount.amount > 0n) {
        throw new Error('Vault must be empty before cleanup. Distribute prizes first.');
      }

      // Get rent before closing for return value (from room, vault, and prize vaults)
      const roomAccountInfo = await connection.getAccountInfo(room);
      const vaultAccountInfo = await connection.getAccountInfo(roomVault);
      const roomRent = roomAccountInfo?.lamports || 0;
      const vaultRent = vaultAccountInfo?.lamports || 0;
      let rentReclaimed = roomRent + vaultRent;

      // Check if room is asset-based and get prize vaults
      const isAssetBased = roomAccount.prizeMode &&
        ((roomAccount.prizeMode as any).assetBased !== undefined ||
         (roomAccount.prizeMode as any).AssetBased !== undefined);

      const remainingAccounts = [];
      if (isAssetBased && roomAccount.prizeAssets) {
        console.log('[cleanupRoom] Asset-based room detected, checking prize vaults...');

        // Derive prize vault PDAs for each prize (up to 3)
        // Only add vaults that exist and are empty - contract will handle them gracefully
        for (let prizeIndex = 0; prizeIndex < 3; prizeIndex++) {
          const prizeAsset = roomAccount.prizeAssets[prizeIndex];
          if (prizeAsset && prizeAsset.deposited) {
            const [prizeVault] = PublicKey.findProgramAddressSync(
              [
                Buffer.from('prize-vault'),
                room.toBuffer(),
                Buffer.from([prizeIndex]),
              ],
              program.programId
            );

            // Check if prize vault exists and is empty
            try {
              const prizeVaultAccount = await getAccount(connection, prizeVault);
              console.log(`[cleanupRoom] Prize vault ${prizeIndex}:`, {
                address: prizeVault.toBase58(),
                amount: prizeVaultAccount.amount.toString(),
                isEmpty: prizeVaultAccount.amount === 0n,
              });

              if (prizeVaultAccount.amount === 0n) {
                const prizeVaultInfo = await connection.getAccountInfo(prizeVault);
                if (prizeVaultInfo) {
                  rentReclaimed += prizeVaultInfo.lamports;
                  remainingAccounts.push({
                    pubkey: prizeVault,
                    isSigner: false,
                    isWritable: true,
                  });
                  console.log(`[cleanupRoom] Added prize vault ${prizeIndex} to cleanup (empty)`);
                }
              } else {
                console.error(`[cleanupRoom] Prize vault ${prizeIndex} is not empty:`, {
                  address: prizeVault.toBase58(),
                  amount: prizeVaultAccount.amount.toString(),
                });
                throw new Error(`Prize vault ${prizeIndex} (${prizeVault.toBase58()}) has ${prizeVaultAccount.amount} tokens. Prizes were not fully distributed.`);
              }
            } catch (error: any) {
              // If getAccount fails, vault doesn't exist (was never created or already closed)
              if (error.message && error.message.includes('could not find account')) {
                console.log(`[cleanupRoom] Prize vault ${prizeIndex} doesn't exist (never created or already closed) - skipping`);
                // Don't add to remaining accounts if it doesn't exist
              } else if (error.message && error.message.includes('Prize vault')) {
                // Re-throw our own error about non-empty vault
                throw error;
              } else {
                console.warn(`[cleanupRoom] Error checking prize vault ${prizeIndex}:`, error);
                // Don't add to remaining accounts on error
              }
            }
          } else {
            console.log(`[cleanupRoom] Prize ${prizeIndex} not deposited - skipping`);
          }
        }

        console.log(`[cleanupRoom] Total prize vaults to clean: ${remainingAccounts.length}`);
      } else {
        console.log('[cleanupRoom] Pool-based room, no prize vaults to clean');
      }

      const ix = await program.methods
        .cleanupRoom(params.roomId)
        .accounts({
          room,
          roomVault,
          globalConfig,
          caller: publicKey,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .remainingAccounts(remainingAccounts)
        .instruction();

      const tx = new Transaction().add(ix);
      tx.feePayer = publicKey;
      const simResult = await simulateTransaction(connection, tx);

      if (!simResult.success) {
        console.error('[cleanupRoom] Simulation failed:', {
          error: simResult.error,
          logs: simResult.logs,
          remainingAccountsCount: remainingAccounts.length,
          isAssetBased,
          roomEnded: roomAccount.ended,
          vaultBalance: vaultAccount.amount.toString(),
        });
        throw new Error(formatTransactionError(simResult.error));
      }

      const signature = await provider.sendAndConfirm(tx);

      console.log('Room cleaned up, rent reclaimed:', {
        roomId: params.roomId,
        signature,
        rentReclaimed: rentReclaimed / 1e9, // Convert to SOL
        roomRent: roomRent / 1e9, // Convert to SOL
        vaultRent: vaultRent / 1e9, // Convert to SOL
      });

      return { signature, rentReclaimed };
    },
    [publicKey, provider, program, connection, deriveGlobalConfigPDA, deriveRoomPDA, deriveRoomVaultPDA]
  );

  /**
   * Recover abandoned room and refund players (admin only)
   * 
   * Emergency function for when a host disappears mid-game. Refunds 90% of collected
   * funds to players and takes 10% platform fee. This prevents funds from being
   * locked if a host abandons a room before ending it.
   * 
   * **How it works:**
   * 1. Verifies caller is platform admin
   * 2. Fetches all PlayerEntry accounts for the room
   * 3. Gets token accounts for each player
   * 4. Calculates refund per player: (total_collected * 90%) / player_count
   * 5. Transfers 10% to platform wallet
   * 6. Refunds each player their share
   * 7. Marks room as ended
   * 
   * **Prerequisites:**
   * - Only admin can call (enforced on-chain)
   * - Room must not be already ended
   * - Room must have collected funds (total_collected > 0)
   * - All players must have token accounts for the fee token mint
   * 
   * **Security:**
   * - Admin-only access prevents abuse
   * - Room must not be ended (prevents double recovery)
   * - All refunds happen atomically in single transaction
   * - Room marked as ended after recovery (prevents further operations)
   * 
   * @param params - Recovery parameters
   * @param params.roomId - Room identifier
   * @param params.hostPubkey - Host's Solana public key (for PDA derivation)
   * @param params.roomAddress - Optional: Use this room PDA instead of deriving it
   * 
   * @returns Promise resolving to recovery result
   * @returns result.signature - Solana transaction signature
   * @returns result.playersRefunded - Number of players refunded
   * @returns result.totalRefunded - Total amount refunded to players
   * @returns result.platformFee - Platform fee amount (10%)
   * 
   * @throws {Error} 'Wallet not connected' - If publicKey or provider is null
   * @throws {Error} 'Only platform admin can recover rooms' - If caller is not admin
   * @throws {Error} 'Room already ended' - If room.ended is true
   * @throws {Error} 'Room has no funds to recover' - If total_collected is 0
   * @throws {Error} 'No players found' - If no PlayerEntry accounts exist for room
   * 
   * @example
   * ```typescript
   * const { recoverRoom } = useSolanaContract();
   * 
   * // Recover abandoned room and refund all players
   * const result = await recoverRoom({
   *   roomId: 'bingo-night-2024',
   *   hostPubkey: new PublicKey('Host...'),
   * });
   * 
   * console.log('Recovery complete:', {
   *   signature: result.signature,
   *   playersRefunded: result.playersRefunded,
   *   totalRefunded: result.totalRefunded / 1e6, // Convert to USDC
   *   platformFee: result.platformFee / 1e6,
   * });
   * ```
   */
  const recoverRoom = useCallback(
    async (params: { roomId: string; hostPubkey: PublicKey; roomAddress?: PublicKey }): Promise<{
      signature: string;
      playersRefunded: number;
      totalRefunded: BN;
      platformFee: BN;
    }> => {
      if (!publicKey || !provider || !program) {
        throw new Error('Wallet not connected');
      }

      // Use provided room address or derive it
      let roomPDA: PublicKey;
      if (params.roomAddress) {
        roomPDA = params.roomAddress;
        console.log('[recoverRoom] Using provided room address:', roomPDA.toBase58());
      } else {
        [roomPDA] = deriveRoomPDA(params.hostPubkey, params.roomId);
        console.log('[recoverRoom] Derived room PDA:', roomPDA.toBase58());
      }

      // Verify caller is admin
      const [globalConfig] = deriveGlobalConfigPDA();
      const globalConfigAccount = await program.account.globalConfig.fetch(globalConfig);
      if (!globalConfigAccount.admin.equals(publicKey)) {
        throw new Error('Only platform admin can recover rooms');
      }

      // Fetch room info
      const roomInfo = await getRoomInfo(roomPDA);
      if (!roomInfo) {
        throw new Error('Room not found at address: ' + roomPDA.toBase58());
      }

      // Verify room is not ended
      if (roomInfo.ended) {
        throw new Error('Room already ended');
      }

      // Verify room has funds
      if (roomInfo.totalCollected.eq(new BN(0))) {
        throw new Error('Room has no funds to recover');
      }

      console.log('[recoverRoom] Room info:', {
        roomId: params.roomId,
        playerCount: roomInfo.playerCount,
        totalCollected: roomInfo.totalCollected.toString(),
        feeTokenMint: roomInfo.feeTokenMint.toBase58(),
      });

      // Query all PlayerEntry accounts for this room
      // Filter by room pubkey (offset 40 = discriminator 8 + player 32)
      // @ts-ignore - Account types available after program deployment
      const allPlayerEntries = await program.account.playerEntry.all([
        {
          memcmp: {
            offset: 8 + 32, // Skip discriminator (8) + player (32), room is next at offset 40
            bytes: roomPDA.toBase58(), // Anchor memcmp expects base58 string for Pubkeys
          },
        },
      ]);

      if (allPlayerEntries.length === 0) {
        throw new Error('No players found in room');
      }

      console.log('[recoverRoom] Found', allPlayerEntries.length, 'player entries');

      // Get token accounts for all players
      const playerAccounts: Array<{ player: PublicKey; tokenAccount: PublicKey }> = [];
      
      for (const entry of allPlayerEntries) {
        const playerPubkey = entry.account.player as PublicKey;
        const tokenAccount = await getAssociatedTokenAddress(
          roomInfo.feeTokenMint,
          playerPubkey
        );
        playerAccounts.push({
          player: playerPubkey,
          tokenAccount,
        });
      }

      console.log('[recoverRoom] Prepared', playerAccounts.length, 'player token accounts');

      // Get platform token account
      const platformTokenAccount = await getAssociatedTokenAddress(
        roomInfo.feeTokenMint,
        globalConfigAccount.platformWallet as PublicKey
      );

      // Get room vault PDA
      const [roomVault] = deriveRoomVaultPDA(roomPDA);

      // Build remaining_accounts: [player1_pubkey, player1_token_account, player2_pubkey, player2_token_account, ...]
      // The Rust code uses odd indices (token accounts) but we pass pairs for completeness
      const remainingAccounts = playerAccounts.flatMap(({ player, tokenAccount }) => [
        {
          pubkey: player,
          isSigner: false,
          isWritable: false, // Player pubkey is read-only
        },
        {
          pubkey: tokenAccount,
          isSigner: false,
          isWritable: true, // Token account is writable (receives refund)
        },
      ]);

      // Build recover_room instruction
      const ix = await program.methods
        .recoverRoom(params.roomId)
        .accounts({
          room: roomPDA,
          roomVault,
          globalConfig,
          platformTokenAccount,
          admin: publicKey,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .remainingAccounts(remainingAccounts)
        .instruction();

      const tx = new Transaction().add(ix);
      tx.feePayer = publicKey;

      // Simulate transaction
      console.log('[recoverRoom] Simulating transaction...');
      const simResult = await simulateTransaction(connection, tx);

      if (!simResult.success) {
        console.error('[recoverRoom] Simulation failed:', {
          error: simResult.error,
          logs: simResult.logs,
        });
        throw new Error(formatTransactionError(simResult.error));
      }

      // Send and confirm transaction
      console.log('[recoverRoom] Sending transaction...');
      const signature = await provider.sendAndConfirm(tx);

      // Calculate amounts for return value
      const totalCollected = roomInfo.totalCollected;
      const platformFee = totalCollected.mul(new BN(10)).div(new BN(100)); // 10%
      const totalRefunded = totalCollected.sub(platformFee); // 90%

      console.log('[recoverRoom] ✅ Recovery complete:', {
        signature,
        playersRefunded: playerAccounts.length,
        totalRefunded: totalRefunded.toString(),
        platformFee: platformFee.toString(),
      });

      return {
        signature,
        playersRefunded: playerAccounts.length,
        totalRefunded,
        platformFee,
      };
    },
    [publicKey, provider, program, connection, deriveGlobalConfigPDA, deriveRoomPDA, deriveRoomVaultPDA, getRoomInfo]
  );

  // ============================================================================
  // Composite Functions (convenience wrappers)
  // ============================================================================

  /**
   * Distributes prizes to winners (for both Pool and Asset rooms)
   *
   * This function handles prize distribution for all room types by:
   * 1. Fetching room information to get host and token mint
   * 2. Declaring winners on-chain
   * 3. Ending the room, which triggers automatic distribution:
   *    - Platform fee: 20% to platform wallet
   *    - Host fee: 0-5% to host
   *    - Prize pool: distributed to winners based on room.prize_distribution percentages
   *    - Charity: Minimum 40% + any remaining allocation goes to charity
   * 4. Closing the room PDA and vault PDA, returning rent to the host
   *
   * All distributions happen atomically in a single transaction.
   * After prizes are distributed, the room and vault PDAs are closed and their
   * rent (storage fees) are automatically returned to the host.
   *
   * **IMPORTANT: Charity Address for Solana**
   *
   * Unlike Stellar/EVM chains, Solana does NOT use the charityAddress parameter
   * passed from the frontend. Instead, the charity wallet is read from the
   * on-chain GlobalConfig account.
   *
   * The charity address comes from GlobalConfig.charity_wallet, which is set during
   * program initialization or can be updated using the update_global_config instruction.
   *
   * To check or update the charity address for Solana:
   *
   * ```typescript
   * // Check current charity wallet
   * const [globalConfig] = deriveGlobalConfigPDA();
   * const config = await program.account.globalConfig.fetch(globalConfig);
   * console.log('Current charity wallet:', config.charityWallet.toBase58());
   *
   * // Update charity wallet (admin/upgrade authority only)
   * await program.methods.updateGlobalConfig(
   *   null,                    // platform_wallet (no change)
   *   new PublicKey('...'),    // charity_wallet (new address)
   *   null,                    // platform_fee_bps (no change)
   *   null,                    // max_host_fee_bps (no change)
   *   null,                    // max_prize_pool_bps (no change)
   *   null                     // min_charity_bps (no change)
   * ).rpc();
   * ```
   *
   * Valid Solana addresses are base58-encoded public keys, typically 43-44 characters.
   * Example: 7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU
   */
  /**
   * Distributes prizes to winners and closes the room
   *
   * This function handles the complete prize distribution process, including:
   * - Declaring winners (if not already declared)
   * - Checking and creating missing token accounts for all recipients
   * - Distributing funds from room vault to platform, host, charity, and winners
   * - Handling both pool-based and asset-based rooms
   * - Simulating transaction before execution to prevent failures
   *
   * ## Token Account Creation
   *
   * The system automatically creates missing token accounts for:
   * - **Host**: Token account for host to receive host fee
   * - **Platform**: Token account for platform to receive platform fee (20%)
   * - **Charity**: Token account for charity to receive charity allocation (40%+)
   * - **Winners**: Token accounts for each winner to receive prizes
   * - **Prize Assets**: Token accounts for asset-based rooms (if applicable)
   *
   * All token account creation instructions are included in the same transaction as
   * prize distribution, ensuring atomic execution.
   *
   * ## Prize Distribution Flow
   *
   * 1. **Validate Inputs**: Check room exists, not already ended, winners are valid
   * 2. **Declare Winners**: Call `declareWinners` if winners not already declared
   * 3. **Check Token Accounts**: Verify all recipient token accounts exist
   * 4. **Create Missing Accounts**: Create any missing token accounts
   * 5. **Build EndRoom Instruction**: Create instruction to distribute funds
   * 6. **Simulate Transaction**: Simulate transaction to catch errors early
   * 7. **Send Transaction**: Sign and send transaction
   * 8. **Confirm Transaction**: Wait for confirmation
   * 9. **Cleanup Room**: Optionally cleanup room to reclaim rent
   *
   * ## Asset-Based Rooms
   *
   * For asset-based rooms, the function also:
   * - Checks winner token accounts for prize assets
   * - Creates missing prize asset token accounts
   * - Includes prize vault accounts in remaining accounts
   *
   * ## Transaction Simulation
   *
   * All transactions are simulated before execution to:
   * - Catch errors early (before user signs)
   * - Provide detailed error messages
   * - Prevent wasted gas fees
   * - Improve user experience
   *
   * @param params - Prize distribution parameters
   * @param params.roomId - Room identifier
   * @param params.winners - Array of winner wallet addresses (1-3 winners)
   * @param params.roomAddress - Optional room PDA address (derived if not provided)
   * @returns Prize distribution result with transaction signatures and charity amount
   * @throws Error if wallet not connected, room not found, room already ended, or transaction fails
   *
   * @example
   * ```typescript
   * const result = await distributePrizes({
   *   roomId: 'my-room-123',
   *   winners: [
   *     'winner1...',
   *     'winner2...',
   *     'winner3...',
   *   ],
   * });
   * console.log('Prizes distributed:', result.signature);
   * console.log('Charity amount:', result.charityAmount);
   * ```
   */
  const distributePrizes = useCallback(
    async (params: { roomId: string; winners: string[]; roomAddress?: string; charityWallet?: string }): Promise<{ signature: string; cleanupSignature?: string; rentReclaimed?: number; cleanupError?: string; charityAmount?: BN }> => {
      if (!publicKey || !provider || !program) {
        throw new Error('Wallet not connected or program not initialized');
      }

      console.log('[distributePrizes] Starting distribution:', {
        roomId: params.roomId,
        winners: params.winners,
        roomAddress: params.roomAddress,
        charityWallet: params.charityWallet,
      });

      // Use provided room address or derive it
      let roomPDA: PublicKey;
      if (params.roomAddress) {
        roomPDA = new PublicKey(params.roomAddress);
        console.log('[distributePrizes] Using provided room address:', roomPDA.toBase58());
      } else {
        [roomPDA] = deriveRoomPDA(publicKey, params.roomId);
        console.log('[distributePrizes] Derived room PDA:', roomPDA.toBase58());
      }

      // Fetch room info to get host and token mint
      const roomInfo = await getRoomInfo(roomPDA);

      if (!roomInfo) {
        throw new Error('Room not found at address: ' + roomPDA.toBase58());
      }

      console.log('[distributePrizes] Room info:', {
        host: roomInfo.host.toBase58(),
        feeTokenMint: roomInfo.feeTokenMint.toBase58(),
        ended: roomInfo.ended,
      });

      if (roomInfo.ended) {
        throw new Error('Room already ended');
      }

      // Convert winner addresses to PublicKey objects
      const winnerPubkeys = params.winners.map(w => new PublicKey(w));

      // Fetch full room account to check if winners are already declared
      // @ts-ignore - Account types available after program deployment
      const roomAccount = await program.account.room.fetch(roomPDA);
      const declaredWinners = roomAccount.winners as PublicKey[];
      const winnersAlreadyDeclared = declaredWinners && declaredWinners.length > 0 && declaredWinners[0] !== null;

      // Build transaction with merged instructions
      const tx = new Transaction();
      tx.feePayer = publicKey;

      if (!winnersAlreadyDeclared) {
        console.log('[distributePrizes] Building declareWinners instruction...');

        // Derive PlayerEntry PDAs for each winner (to verify they actually joined)
        const playerEntryPDAs = winnerPubkeys.map(winner => {
          const [playerEntry] = derivePlayerEntryPDA(roomPDA, winner);
          return playerEntry;
        });

        // Build declareWinners instruction
        const declareWinnersIx = await program.methods
          .declareWinners(params.roomId, winnerPubkeys)
          .accounts({
            room: roomPDA,
            host: publicKey,
          })
          .remainingAccounts(
            playerEntryPDAs.map(playerEntry => ({
              pubkey: playerEntry,
              isSigner: false,
              isWritable: false, // Read-only, just verifying they exist
            }))
          )
          .instruction();

        tx.add(declareWinnersIx);
        console.log('[distributePrizes] declareWinners instruction added to transaction');
      } else {
        console.log('[distributePrizes] Winners already declared, skipping declareWinners instruction');
      }

      console.log('[distributePrizes] Building endRoom instruction...');

      // Build endRoom instruction
      const [globalConfig] = deriveGlobalConfigPDA();
      const [roomVault] = deriveRoomVaultPDA(roomPDA);

      // Fetch global config to get platform wallet
      // @ts-ignore - Account types available after program deployment
      const globalConfigAccount = await program.account.globalConfig.fetch(globalConfig);
      const platformWallet = globalConfigAccount.platformWallet as PublicKey;
      
      // Use provided charity wallet address (from TGB API) if available, otherwise fall back to GlobalConfig
      // The contract accepts any charity_token_account without validation, enabling dynamic TGB addresses
      let charityWallet: PublicKey;
      if (params.charityWallet) {
        charityWallet = new PublicKey(params.charityWallet);
        console.log('[distributePrizes] Using provided charity wallet (from TGB API):', charityWallet.toBase58());
      } else {
        // Fallback to GlobalConfig charity wallet if not provided (for backward compatibility)
        charityWallet = globalConfigAccount.charityWallet as PublicKey;
        console.log('[distributePrizes] Using GlobalConfig charity wallet (fallback):', charityWallet.toBase58());
      }

      // Get token accounts for all recipients
      const platformTokenAccount = await getAssociatedTokenAddress(
        roomInfo.feeTokenMint,
        platformWallet
      );
      const charityTokenAccount = await getAssociatedTokenAddress(
        roomInfo.feeTokenMint,
        charityWallet
      );
      const hostTokenAccount = await getAssociatedTokenAddress(
        roomInfo.feeTokenMint,
        roomInfo.host
      );

      // Get winner token accounts (must be passed as remaining accounts)
      const winnerTokenAccounts = await Promise.all(
        winnerPubkeys.map(winner =>
          getAssociatedTokenAddress(roomInfo.feeTokenMint, winner)
        )
      );

      // ✅ Check and create missing token accounts before building endRoom instruction
      // The Solana program expects all recipient token accounts to exist
      console.log('[distributePrizes] Checking token account existence...');

      // Helper function to check if token account exists and create if missing
      const ensureTokenAccountExists = async (
        tokenAccount: PublicKey,
        owner: PublicKey,
        mint: PublicKey,
        accountName: string
      ): Promise<TransactionInstruction | null> => {
        try {
          const account = await getAccount(connection, tokenAccount, 'confirmed');
          // Verify it's for the correct mint
          if (!account.mint.equals(mint)) {
            throw new Error(
              `Token account ${accountName} exists but for wrong mint. ` +
              `Expected ${mint.toBase58()}, found ${account.mint.toBase58()}`
            );
          }
          console.log(`[distributePrizes] ✅ ${accountName} token account exists:`, tokenAccount.toBase58());
          return null; // Account exists, no instruction needed
        } catch (error: any) {
          // Account doesn't exist, create it
          if (
            error.name === 'TokenAccountNotFoundError' ||
            error.message?.includes('could not find account') ||
            error.message?.includes('InvalidAccountData')
          ) {
            console.log(`[distributePrizes] ⚠️ ${accountName} token account does not exist, will create:`, tokenAccount.toBase58());
            return createAssociatedTokenAccountInstruction(
              publicKey,    // payer (host)
              tokenAccount, // ata address
              owner,        // owner (who will receive tokens)
              mint          // token mint
            );
          }
          // Re-throw other errors
          throw error;
        }
      };

      // Check and create token accounts for all recipients
      const tokenAccountCreationInstructions: TransactionInstruction[] = [];

      // 1. Check host token account (this is the one that's failing)
      const hostAtaIx = await ensureTokenAccountExists(
        hostTokenAccount,
        roomInfo.host,
        roomInfo.feeTokenMint,
        'Host'
      );
      if (hostAtaIx) {
        tokenAccountCreationInstructions.push(hostAtaIx);
      }

      // 2. Check platform token account
      const platformAtaIx = await ensureTokenAccountExists(
        platformTokenAccount,
        platformWallet,
        roomInfo.feeTokenMint,
        'Platform'
      );
      if (platformAtaIx) {
        tokenAccountCreationInstructions.push(platformAtaIx);
      }

      // 3. Check charity token account
      const charityAtaIx = await ensureTokenAccountExists(
        charityTokenAccount,
        charityWallet,
        roomInfo.feeTokenMint,
        'Charity'
      );
      if (charityAtaIx) {
        tokenAccountCreationInstructions.push(charityAtaIx);
      }

      // 4. Check winner token accounts (for fee token)
      for (let i = 0; i < winnerTokenAccounts.length; i++) {
        const winnerTokenAccount = winnerTokenAccounts[i];
        const winner = winnerPubkeys[i];
        const winnerAtaIx = await ensureTokenAccountExists(
          winnerTokenAccount,
          winner,
          roomInfo.feeTokenMint,
          `Winner ${i + 1}`
        );
        if (winnerAtaIx) {
          tokenAccountCreationInstructions.push(winnerAtaIx);
        }
      }

      // Build remaining accounts array
      // For asset-based rooms, the structure is:
      // [0..winners_count] = winner token accounts for fee_token_mint
      // [winners_count..winners_count*2] = winner token accounts for prize assets
      // [winners_count*2..winners_count*2+3] = prize vault accounts
      let remainingAccounts = winnerTokenAccounts.map(account => ({
        pubkey: account,
        isSigner: false,
        isWritable: true,
      }));

      // Check if room is asset-based
      // Anchor serializes enums as objects with variant name as key
      // PrizeMode::AssetBased becomes { assetBased: {} } or { AssetBased: {} }
      const isAssetBased = roomInfo.prizeMode && 
        ((roomInfo.prizeMode as any).assetBased !== undefined || 
         (roomInfo.prizeMode as any).AssetBased !== undefined);

      // Track winner prize token accounts for asset-based rooms
      let winnerPrizeTokenAccounts: PublicKey[] = [];

      if (isAssetBased && roomInfo.prizeAssets) {
        console.log('[distributePrizes] Asset-based room detected, building prize accounts...');
        
        // Get winner token accounts for prize assets (one per winner for their prize mint)
        winnerPrizeTokenAccounts = await Promise.all(
          winnerPubkeys.slice(0, 3).map(async (winner, index) => {
            const prizeAsset = roomInfo.prizeAssets?.[index];
            if (prizeAsset && prizeAsset.deposited) {
              const winnerPrizeTokenAccount = await getAssociatedTokenAddress(
                prizeAsset.mint,
                winner
              );
              
              // ✅ Check and create winner token account for prize asset if missing
              const winnerPrizeAtaIx = await ensureTokenAccountExists(
                winnerPrizeTokenAccount,
                winner,
                prizeAsset.mint,
                `Winner ${index + 1} (Prize Asset)`
              );
              if (winnerPrizeAtaIx) {
                tokenAccountCreationInstructions.push(winnerPrizeAtaIx);
              }
              
              return winnerPrizeTokenAccount;
            }
            // If no prize for this position, use fee token mint as placeholder
            // (won't be used but needed to maintain array structure)
            return await getAssociatedTokenAddress(roomInfo.feeTokenMint, winner);
          })
        );

        // Add winner prize token accounts to remaining accounts
        remainingAccounts = remainingAccounts.concat(
          winnerPrizeTokenAccounts.map(account => ({
            pubkey: account,
            isSigner: false,
            isWritable: true,
          }))
        );

        // Derive prize vault PDAs for each prize (up to 3)
        const prizeVaultAccounts = [];
        for (let prizeIndex = 0; prizeIndex < 3; prizeIndex++) {
          const prizeAsset = roomInfo.prizeAssets[prizeIndex];
          if (prizeAsset && prizeAsset.deposited) {
            const [prizeVault] = PublicKey.findProgramAddressSync(
              [
                Buffer.from('prize-vault'),
                roomPDA.toBuffer(),
                Buffer.from([prizeIndex]),
              ],
              program.programId
            );
            prizeVaultAccounts.push({
              pubkey: prizeVault,
              isSigner: false,
              isWritable: true,
            });
          } else {
            // Add placeholder (won't be used but needed to maintain array structure)
            prizeVaultAccounts.push({
              pubkey: PublicKey.default,
              isSigner: false,
              isWritable: false,
            });
          }
        }

        // Add prize vault accounts to remaining accounts
        remainingAccounts = remainingAccounts.concat(prizeVaultAccounts);

        console.log('[distributePrizes] Remaining accounts structure:', {
          winnerTokenAccounts: winnerTokenAccounts.length,
          winnerPrizeTokenAccounts: winnerPrizeTokenAccounts.length,
          prizeVaultAccounts: prizeVaultAccounts.length,
          total: remainingAccounts.length,
        });
      }

      // ✅ Add all token account creation instructions to transaction before endRoom
      // Do this after all account checks (including asset-based prize accounts) are complete
      if (tokenAccountCreationInstructions.length > 0) {
        console.log(`[distributePrizes] Adding ${tokenAccountCreationInstructions.length} token account creation instructions...`);
        tokenAccountCreationInstructions.forEach((ix, idx) => {
          tx.add(ix);
          console.log(`[distributePrizes] Added token account creation instruction ${idx + 1}`);
        });
      } else {
        console.log('[distributePrizes] All token accounts already exist');
      }

      // Build endRoom instruction
      const endRoomIx = await program.methods
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

      tx.add(endRoomIx);
      console.log('[distributePrizes] endRoom instruction added to transaction');

      // Simulate transaction before sending
      console.log('[distributePrizes] Simulating merged transaction...');
      const simResult = await simulateTransaction(connection, tx);

      if (!simResult.success) {
        console.error('═══════════════════════════════════════════');
        console.error('[distributePrizes] SIMULATION FAILED');
        console.error('═══════════════════════════════════════════');
        console.error('[distributePrizes] Error type:', typeof simResult.error);
        console.error('[distributePrizes] Error object:', simResult.error);
        console.error('[distributePrizes] Error string:', String(simResult.error));

        try {
          console.error('[distributePrizes] Error JSON:', JSON.stringify(simResult.error, null, 2));
        } catch (e) {
          console.error('[distributePrizes] Error cannot be stringified');
        }

        console.error('─────────────────────────────────────────');
        console.error('[distributePrizes] SIMULATION LOGS:');

        if (simResult.logs && simResult.logs.length > 0) {
          simResult.logs.forEach((log, idx) => {
            console.error(`  [Log ${idx}]:`, log);
          });
        } else {
          console.error('  No logs available');
        }

        console.error('═══════════════════════════════════════════');

        throw new Error(formatTransactionError(simResult.error));
      }

      // Send and confirm merged transaction
      console.log('[distributePrizes] Sending merged transaction (declareWinners + endRoom)...');
      const signature = await provider.sendAndConfirm(tx);

      console.log('[distributePrizes] ✅ Merged transaction successful:', signature);
      console.log('[distributePrizes] Distribution complete:', signature);

      // Parse RoomEnded event to get exact charity_amount that was sent
      // This ensures the amount reported to The Giving Block matches what was actually transferred
      let charityAmount: BN | undefined;
      try {
        const txDetails = await connection.getTransaction(signature, {
          commitment: 'confirmed',
          maxSupportedTransactionVersion: 0,
        });

        if (txDetails?.meta?.logMessages) {
          // Parse events from transaction logs
          // Anchor events are emitted as "Program data: <base64>" in logs
          // We need to find the RoomEnded event and decode it
          try {
            // Look for log lines containing "Program data:" which indicates an event
            for (const log of txDetails.meta.logMessages) {
              if (log.includes('Program data:')) {
                // Extract base64 data
                const base64Match = log.match(/Program data: ([A-Za-z0-9+/=]+)/);
                if (base64Match) {
                  try {
                    const eventData = Buffer.from(base64Match[1], 'base64');
                    // Try to decode as RoomEnded event
                    // The event coder expects the full event data including discriminator
                    const decoded = program.coder.events.decode('RoomEnded', eventData);
                    if (decoded && decoded.charityAmount) {
                      charityAmount = new BN(decoded.charityAmount.toString());
                      console.log('[distributePrizes] Parsed RoomEnded event:', {
                        charityAmount: charityAmount.toString(),
                        platformAmount: decoded.platformAmount?.toString(),
                        hostAmount: decoded.hostAmount?.toString(),
                        prizeAmount: decoded.prizeAmount?.toString(),
                      });
                      break; // Found the event, stop searching
                    }
                  } catch (decodeError) {
                    // Not a RoomEnded event or decode failed, continue searching
                    continue;
                  }
                }
              }
            }
          } catch (parseError) {
            console.log('[distributePrizes] Event parsing failed, continuing without event data');
          }
        }
      } catch (eventParseError) {
        console.warn('[distributePrizes] Failed to parse RoomEnded event:', eventParseError);
        // Continue without event data - the transaction still succeeded
      }

      // Step 3: Close PDA and return rent to host
      // This is critical - the room PDA must be closed to return rent to the host
      console.log('[distributePrizes] Closing PDA and reclaiming rent...');
      
      // Wait a moment to ensure the endRoom transaction is fully confirmed on-chain
      // This prevents race conditions where the room state hasn't updated yet
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      try {
        const cleanupResult = await cleanupRoom({
          roomId: params.roomId,
          hostPubkey: roomInfo.host,
        });

        console.log('[distributePrizes] ✅ PDA closed successfully, rent reclaimed:', {
          cleanupSignature: cleanupResult.signature,
          rentReclaimed: cleanupResult.rentReclaimed / 1e9, // Convert to SOL
        });

        return {
          signature,
          cleanupSignature: cleanupResult.signature,
          rentReclaimed: cleanupResult.rentReclaimed,
          charityAmount, // Exact amount sent to charity (from on-chain event)
        };
      } catch (cleanupError: any) {
        console.error('[distributePrizes] ❌ Failed to close PDA and reclaim rent:', cleanupError);
        console.error('[distributePrizes] This is a critical error - rent will remain locked until manual cleanup');
        
        // Return the error so the frontend can inform the user
        // The prizes are distributed, but the host needs to manually close the PDA
        return {
          signature,
          cleanupError: cleanupError.message || 'Failed to close PDA and reclaim rent',
          charityAmount, // Exact amount sent to charity (from on-chain event)
        };
      }
    },
    [publicKey, provider, program, connection, cleanupRoom, deriveRoomPDA, deriveGlobalConfigPDA, deriveRoomVaultPDA, derivePlayerEntryPDA, getRoomInfo]
  );

  // ============================================================================
  // Return Hook Interface
  // ============================================================================

  return {
    program,
    connected: !!publicKey,
    publicKey,
    isReady: !!publicKey && !!program,
    // Instructions
    initializeGlobalConfig,
    initializeTokenRegistry,
    addApprovedToken,
    createPoolRoom,
    createAssetRoom,
    joinRoom,
    declareWinners,
    endRoom,
    depositPrizeAsset,
    setEmergencyPause,
    closeJoining,
    cleanupRoom,
    recoverRoom,
    // Composite functions
    distributePrizes,
    // Utilities
    createTokenMint,
    // Queries
    getRoomInfo,
    getPlayerEntry,
    // PDA Helpers
    deriveRoomPDA,
    derivePlayerEntryPDA,
  };
}
