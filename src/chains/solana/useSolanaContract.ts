/**
 * Bingo Smart Contract Integration Hook
 *
 * Primary interface for all Solana blockchain interactions in the Bingo platform. Provides
 * type-safe methods to create bingo rooms, join as players, and distribute prizes via the
 * deployed Anchor program. Handles complex PDA derivation for Room, RoomVault, and PlayerEntry
 * accounts, manages SPL token transfers for entry fees, and simulates transactions before sending
 * to prevent failed transactions. Used by CreateRoomPage for room initialization and RoomPage for
 * player joins. Integrates with transactionHelpers.ts for validation and config.ts for network
 * settings. Exposes query methods (getRoomInfo, getPlayerEntry) for fetching on-chain state and
 * PDA derivation helpers for building custom transactions. Core blockchain layer of the application.
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
import { PROGRAM_ID, PDA_SEEDS, TX_CONFIG } from './config';
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
  type CreateAssetRoomParams,
  type DepositPrizeAssetParams,
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

      // Derive token registry PDA
      const [tokenRegistry, bump] = deriveTokenRegistryPDA();

      console.log('[initializeTokenRegistry] Token registry PDA:', tokenRegistry.toBase58());
      console.log('[initializeTokenRegistry] Bump:', bump);
      console.log('[initializeTokenRegistry] Program ID:', program.programId.toBase58());
      console.log('[initializeTokenRegistry] Seed used:', 'token-registry-v4');

      // Check if already initialized
      try {
        const registryAccount = await connection.getAccountInfo(tokenRegistry);
        if (registryAccount) {
          // Check if it's owned by the correct program
          if (registryAccount.owner.toBase58() === program.programId.toBase58()) {
            console.log('[initializeTokenRegistry] Token registry already initialized');
            return { signature: 'already-initialized' };
          } else {
            console.warn('[initializeTokenRegistry] ⚠️ Token registry exists but owned by old program:', {
              oldOwner: registryAccount.owner.toBase58(),
              currentProgram: program.programId.toBase58(),
            });
            throw new Error(
              `⚠️ DEVNET CLEANUP NEEDED: Token registry was created by old program deployment.\n\n` +
              `To fix this, run in your bingo-solana-contracts repo:\n` +
              `cd C:\\Users\\isich\\bingo-solana-contracts\n` +
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
      // Fixed: Program now has synchronized declare_id! and keypair, so Anchor auto-derivation works
      console.log('[initializeTokenRegistry] 🏗️ Building instruction with Anchor...');
      console.log('[initializeTokenRegistry] Program object:', program.programId.toString());
      console.log('[initializeTokenRegistry] Passing tokenRegistry:', tokenRegistry.toBase58());

      const ix = await program.methods
        .initializeTokenRegistry()
        .accounts({
          tokenRegistry,
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

      const [tokenRegistry] = deriveTokenRegistryPDA();

      console.log('[addApprovedToken] Token registry PDA:', tokenRegistry.toBase58());
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
      const ix = await program.methods
        .addApprovedToken(tokenMint)
        .accounts({
          tokenRegistry,
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
      console.log('[createPoolRoom] Checking if global config is initialized...');
      try {
        await initializeGlobalConfig(publicKey, params.charityWallet);
      } catch (error: any) {
        // Only fail if it's not already initialized
        const isAlreadyInit = error.message?.includes('already-initialized') ||
                             error.message?.includes('already been processed') ||
                             error.message?.includes('custom program error: 0x0'); // Account already initialized
        if (!isAlreadyInit) {
          console.error('[createPoolRoom] Failed to initialize global config:', error);
          throw error;
        }
        console.log('[createPoolRoom] Global config already initialized (caught expected error)');
      }

      console.log('[createPoolRoom] Checking if token registry is initialized...');
      try {
        await initializeTokenRegistry();
      } catch (error: any) {
        // Get full transaction logs if available
        if (error.getLogs && typeof error.getLogs === 'function') {
          const logs = await error.getLogs();
          console.error('[createPoolRoom] Full transaction logs:', logs);
        }

        // Log complete error details
        console.error('[createPoolRoom] Full error object:', {
          message: error.message,
          name: error.name,
          stack: error.stack,
          logs: error.logs,
        });

        // Only fail if it's not already initialized
        if (!error.message?.includes('already-initialized')) {
          console.error('[createPoolRoom] Failed to initialize token registry:', error);
          throw new Error(`Token registry initialization failed: ${error.message}`);
        }
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
      const [globalConfig] = deriveGlobalConfigPDA();
      const [room] = deriveRoomPDA(publicKey, params.roomId);
      const [roomVault] = deriveRoomVaultPDA(room);
      const [tokenRegistry] = deriveTokenRegistryPDA();

      console.log('[createPoolRoom] PDAs derived:', {
        globalConfig: globalConfig.toBase58(),
        room: room.toBase58(),
        roomVault: roomVault.toBase58(),
        tokenRegistry: tokenRegistry.toBase58(),
      });

      // Build instruction using Anchor's methods API
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
          tokenRegistry,
          globalConfig,
          host: publicKey,
          systemProgram: SystemProgram.programId,
          tokenProgram: TOKEN_PROGRAM_ID,
          rent: SYSVAR_RENT_PUBKEY,
        })
        .instruction();

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

      console.log('[createPoolRoom] Simulating transaction...');
      const simResult = await simulateTransaction(connection, tx);

      if (!simResult.success) {
        console.error('[createPoolRoom] Simulation failed:', simResult.error);
        console.error('[createPoolRoom] Full simulation result:', JSON.stringify(simResult, null, 2));
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
    [publicKey, program, provider, connection, deriveGlobalConfigPDA, deriveRoomPDA, deriveRoomVaultPDA, initializeGlobalConfig, initializeTokenRegistry, addApprovedToken]
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
      return createAssetRoomImpl(program, provider, connection, publicKey, params);
    },
    [publicKey, provider, program, connection]
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

      console.log('Room ended successfully:', {
        signature,
        room: room.toBase58(),
        winners: params.winners.map(w => w.toBase58()),
      });

      return { signature };
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

      // Get rent before closing for return value
      const vaultAccountInfo = await connection.getAccountInfo(roomVault);
      const rentReclaimed = vaultAccountInfo?.lamports || 0;

      const ix = await program.methods
        .cleanupRoom(params.roomId)
        .accounts({
          room,
          roomVault,
          globalConfig,
          caller: publicKey,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .instruction();

      const tx = new Transaction().add(ix);
      tx.feePayer = publicKey;
      const simResult = await simulateTransaction(connection, tx);

      if (!simResult.success) {
        throw new Error(formatTransactionError(simResult.error));
      }

      const signature = await provider.sendAndConfirm(tx);

      console.log('Room cleaned up, rent reclaimed:', {
        roomId: params.roomId,
        signature,
        rentReclaimed: rentReclaimed / 1e9, // Convert to SOL
      });

      return { signature, rentReclaimed };
    },
    [publicKey, provider, program, connection, deriveGlobalConfigPDA, deriveRoomPDA, deriveRoomVaultPDA]
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
   *
   * All distributions happen atomically in a single transaction.
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
  const distributePrizes = useCallback(
    async (params: { roomId: string; winners: string[]; roomAddress?: string }): Promise<{ signature: string }> => {
      if (!publicKey || !provider || !program) {
        throw new Error('Wallet not connected or program not initialized');
      }

      console.log('[distributePrizes] Starting distribution:', {
        roomId: params.roomId,
        winners: params.winners,
        roomAddress: params.roomAddress,
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

      if (winnersAlreadyDeclared) {
        console.log('[distributePrizes] Winners already declared, skipping to endRoom...');
      } else {
        console.log('[distributePrizes] Declaring winners...');

        // Step 1: Declare winners
        await declareWinners({
          roomId: params.roomId,
          hostPubkey: roomInfo.host,
          winners: winnerPubkeys,
        });

        console.log('[distributePrizes] Winners declared!');
      }

      console.log('[distributePrizes] Ending room...');

      // Step 2: End room (triggers all distributions)
      const result = await endRoom({
        roomId: params.roomId,
        hostPubkey: roomInfo.host,
        winners: winnerPubkeys,
        feeTokenMint: roomInfo.feeTokenMint,
      });

      console.log('[distributePrizes] Distribution complete:', result.signature);

      return result;
    },
    [publicKey, provider, program, declareWinners, endRoom, deriveRoomPDA, getRoomInfo]
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
    // Composite functions
    distributePrizes,
    // Queries
    getRoomInfo,
    getPlayerEntry,
    // PDA Helpers
    deriveRoomPDA,
    derivePlayerEntryPDA,
  };
}
