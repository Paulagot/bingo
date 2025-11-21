/**
 *  Smart Contract Integration Hook
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
import { useConnection, useWallet, WalletContext } from '@solana/wallet-adapter-react';
import { useContext, useCallback, useMemo } from 'react';
import type { DependencyList } from 'react';
import { Program, AnchorProvider, BN } from '@coral-xyz/anchor';
import {
  PublicKey,
  Transaction,
} from '@solana/web3.js';
import { TX_CONFIG } from '@/shared/lib/solana/config';
// Phase 1 utilities - use shared utilities instead of duplicating code
import {
  derivePlayerEntryPDA,
} from '@/shared/lib/solana/pda';

// Import IDL - Generated from deployed Solana program
import BingoIDL from '@/idl/solana_bingo.json';
import type { Idl } from '@coral-xyz/anchor';
// Phase 2 types - use centralized type definitions
import type {
  CreatePoolRoomParams,
  RoomCreationResult,
  RoomInfo,
  PlayerEntryInfo,
  SolanaContractContext,
  DistributePrizesParams,
  DistributePrizesResult,
} from '@/features/web3/solana/model/types';
// Note: JoinRoomParams, CreateAssetRoomParams, etc. are defined locally below
// with additional hook-specific fields for backward compatibility

// Import createTokenMint types
import type { CreateTokenMintParams, CreateTokenMintResult } from '@/features/web3/solana/api/admin';
// Import types from centralized types
import type {
  CreateAssetRoomParams,
  DepositPrizeAssetParams,
} from '@/features/web3/solana/model/types';
// Phase 3: Extracted API modules - using barrel exports
import {
  getRoomInfo as getRoomInfoAPI,
  closeJoining as closeJoiningAPI,
  cleanupRoom as cleanupRoomAPI,
  createPoolRoom as createPoolRoomAPI,
  createAssetRoom as createAssetRoomAPI,
} from '@/features/web3/solana/api/room';
import {
  declareWinners as declareWinnersAPI,
  endRoom as endRoomAPI,
  distributePrizes as distributePrizesAPI,
  depositPrizeAsset as depositPrizeAssetAPI,
} from '@/features/web3/solana/api/prizes';
import {
  getPlayerEntry as getPlayerEntryAPI,
  joinRoom as joinRoomAPI,
} from '@/features/web3/solana/api/player';
import {
  initializeGlobalConfig as initializeGlobalConfigAPI,
  initializeTokenRegistry as initializeTokenRegistryAPI,
  addApprovedToken as addApprovedTokenAPI,
  updateGlobalConfig as updateGlobalConfigAPI,
  setEmergencyPause as setEmergencyPauseAPI,
  recoverRoom as recoverRoomAPI,
  createTokenMint as createTokenMintAPI,
} from '@/features/web3/solana/api/admin';

import { getAccount, getMint } from '@solana/spl-token';
import {
 
  deriveRoomVaultPDA,
  deriveGlobalConfigPDA,
} from '@/shared/lib/solana/pda';
import { getAssociatedTokenAccountAddress } from '@/shared/lib/solana/token-accounts';


// ============================================================================
// Types - Using centralized types from Phase 2
// ============================================================================
// ✅ CreatePoolRoomParams, CreateAssetRoomParams, RoomCreationResult, etc.
// are now imported from @/features/web3/solana/model/types above
// 
// Hook-specific types with additional fields are defined below for backward compatibility
// These extend or replace the centralized types to maintain backward compatibility

/**
 * Extended JoinRoomParams with hook-specific fields
 * The centralized JoinRoomParams only has roomId, entryFee, and extrasAmount.
 * This extended version adds hostPubkey, feeTokenMint, and roomPDA for backward compatibility.
 */
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

// Keeping local extended versions for backward compatibility with hook-specific fields
export interface RoomInfoExtended extends RoomInfo {
  // Additional fields specific to hook implementation
  ended: boolean;
  expirationSlot: BN;
  prizeMode?: any; // PrizeMode enum (PoolSplit | AssetBased)
}

export interface PlayerEntryInfoExtended extends PlayerEntryInfo {
  // PlayerEntryInfo matches centralized type, but keeping for backward compatibility
  room: PublicKey;
  entryPaid: BN;
  extrasPaid: BN;
  totalPaid: BN;
  joinSlot: BN;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Helper to create safe default return when WalletProvider is not available
 */
function createSafeDefaultReturn() {
  // Return a safe default object with all required properties
  // All functions will return errors indicating wallet is not connected
  const notAvailable = async () => {
    throw new Error('Solana wallet provider is not available. This is expected in web2 flow.');
  };

  return {
    publicKey: null,
    connected: false,
    isReady: false,
    connection: null,
    initializeGlobalConfig: notAvailable,
    updateGlobalConfig: notAvailable,
    setEmergencyPause: notAvailable,
    initializeTokenRegistry: notAvailable,
    addApprovedToken: notAvailable,
    recoverRoom: notAvailable,
    createPoolRoom: notAvailable,
    createAssetRoom: notAvailable,
    joinRoom: notAvailable,
    closeJoining: notAvailable,
    cleanupRoom: notAvailable,
    endRoom: notAvailable,
    declareWinners: notAvailable,
    distributePrizes: notAvailable,
    depositPrizeAsset: notAvailable,
    getRoomInfo: notAvailable,
    getPlayerEntry: notAvailable,
    createTokenMint: notAvailable,
  };
}

/**
 * Converts RoomInfo to RoomInfoExtended for backward compatibility
 */
function toRoomInfoExtended(roomInfo: RoomInfo | null): RoomInfoExtended | null {
  if (!roomInfo) return null;
  
  return {
    ...roomInfo,
    ended: (roomInfo as any).ended ?? false,
    expirationSlot: (roomInfo as any).expirationSlot ?? new BN(0),
    prizeMode: (roomInfo as any).prizeMode,
  } as RoomInfoExtended;
}

/**
 * Converts PlayerEntryInfo to PlayerEntryInfoExtended for backward compatibility
 */
function toPlayerEntryInfoExtended(playerEntry: PlayerEntryInfo | null): PlayerEntryInfoExtended | null {
  if (!playerEntry) return null;
  
  return {
    ...playerEntry,
    room: (playerEntry as any).room,
    entryPaid: (playerEntry as any).entryPaid ?? new BN(0),
    extrasPaid: (playerEntry as any).extrasPaid ?? new BN(0),
    totalPaid: (playerEntry as any).totalPaid ?? new BN(0),
    joinSlot: (playerEntry as any).joinSlot ?? new BN(0),
  } as PlayerEntryInfoExtended;
}

function bigIntToDecimalString(amount: bigint, decimals: number): string {
  const negative = amount < 0n;
  const value = negative ? -amount : amount;

  const base = 10n ** BigInt(decimals);
  const whole = value / base;
  const fraction = value % base;

  const wholeStr = whole.toString();
  const fractionStr = fraction.toString().padStart(decimals, '0').replace(/0+$/, '');

  const result = fractionStr.length > 0 ? `${wholeStr}.${fractionStr}` : wholeStr;
  return negative ? `-${result}` : result;
}


// ============================================================================
// Main Hook
// ============================================================================

// In useSolanaContract.ts, replace lines 300-326:
export function useSolanaContract() {
  const walletContext = useContext(WalletContext);
  
  // ✅ Check if we have the REAL provider (not the default proxy)
  // The @solana/wallet-adapter-react creates a default context value
  // that is a Proxy which throws on property access
  const hasWalletProvider = (() => {
    if (!walletContext || typeof walletContext !== 'object') return false;
    
    // If we can access properties without throwing, we have a real provider
    try {
      // The default proxy throws immediately on ANY property access
      // So if this doesn't throw, we have a real provider
      const descriptor = Object.getOwnPropertyDescriptor(walletContext, 'publicKey');
      return descriptor !== undefined || 'publicKey' in walletContext;
    } catch {
      return false;
    }
  })();

  if (!hasWalletProvider) {
    return createSafeDefaultReturn();
  }

  const { connection } = useConnection();
  const wallet = useWallet();
  const { publicKey, signTransaction } = wallet;
  // ... rest of hook

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
  // Context Creation Helper
  // ============================================================================

  /**
   * Memoized Solana contract context
   * Single source of truth for all API operations
   */
  const context = useMemo((): SolanaContractContext => {
    return {
      program,
      provider,
      publicKey,
      connected: !!publicKey,
      isReady: !!publicKey && !!program,
      connection,
    };
  }, [program, provider, publicKey, connection]);

    /**
   * Preview charity payout for a room by reading on-chain vault balance
   * and applying fee BPS (similar to EVM previewCharityPayout).
   *
   * This is used to:
   * - Show host a preview of how much goes to charity
   * - Build a TGB request amount for /api/tgb/create-deposit-address
   */
const previewCharityPayout = useCallback(
  async (params: { roomId: string; roomAddress?: PublicKey }) => {
    const { program, connection } = context;

    if (!program || !connection) {
      throw new Error('[useSolanaContract:previewCharityPayout] Program or connection not available');
    }

    const { roomId, roomAddress } = params;

    console.log('🔍 [previewCharityPayout] DEBUG START ===========================');
    console.log('🔍 [previewCharityPayout] Input:', { roomId, roomAddress: roomAddress?.toBase58() });

    // 1) Find room PDA
    let roomPDA: PublicKey;
    if (roomAddress) {
      roomPDA = roomAddress;
      console.log('🔍 [previewCharityPayout] Using provided roomAddress:', roomPDA.toBase58());
    } else {
      console.log('🔍 [previewCharityPayout] Searching for room by roomId...');
      const rooms = await (program.account as any).room.all();
      console.log('🔍 [previewCharityPayout] Found', rooms.length, 'rooms total');
      
      const matchingRoom = rooms.find((r: any) => {
        const roomData = r.account;
        const roomIdStr = Buffer.from(roomData.roomId)
          .toString('utf8')
          .replace(/\0/g, '');
        console.log('🔍 [previewCharityPayout] Checking room:', roomIdStr, '===', roomId, '?', roomIdStr === roomId);
        return roomIdStr === roomId;
      });

      if (!matchingRoom) {
        throw new Error(
          `[useSolanaContract:previewCharityPayout] Room "${roomId}" not found`
        );
      }

      roomPDA = matchingRoom.publicKey;
      console.log('🔍 [previewCharityPayout] Found room PDA:', roomPDA.toBase58());
    }

    // 2) Fetch room + global config
    console.log('🔍 [previewCharityPayout] Fetching room account...');
    const roomAccount = await (program.account as any).room.fetch(roomPDA);
    console.log('🔍 [previewCharityPayout] Room account:', {
      host: roomAccount.host?.toBase58(),
      feeTokenMint: roomAccount.feeTokenMint?.toBase58(),
      entryFee: roomAccount.entryFee?.toString(),
      hostFeeBps: roomAccount.hostFeeBps?.toString(),
      prizePoolBps: roomAccount.prizePoolBps?.toString(),
      playerCount: roomAccount.playerCount?.toString(),
    });

    const [roomVault] = deriveRoomVaultPDA(roomPDA);
    console.log('🔍 [previewCharityPayout] Room vault PDA:', roomVault.toBase58());

    const [globalConfigPDA] = deriveGlobalConfigPDA();
    console.log('🔍 [previewCharityPayout] Global config PDA:', globalConfigPDA.toBase58());

    const globalConfigAccount = await (program.account as any).globalConfig.fetch(globalConfigPDA);
    console.log('🔍 [previewCharityPayout] Global config:', {
      platformWallet: globalConfigAccount.platformWallet?.toBase58(),
      charityWallet: globalConfigAccount.charityWallet?.toBase58(),
      platformFeeBps: globalConfigAccount.platformFeeBps?.toString(),
    });

    // 3) Get vault token account + mint info
    const feeTokenMint = roomAccount.feeTokenMint as PublicKey;
    console.log('🔍 [previewCharityPayout] Fee token mint:', feeTokenMint.toBase58());

   const roomVaultTokenAccount = roomVault;
    console.log('🔍 [previewCharityPayout] Vault token account address:', roomVaultTokenAccount.toBase58());

    // ✅ TRY to get account, handle errors gracefully
    let vaultAccount;
    let vaultBalance = 0n;
    
    try {
      console.log('🔍 [previewCharityPayout] Attempting to fetch vault token account...');
      vaultAccount = await getAccount(connection, roomVaultTokenAccount);
      vaultBalance = vaultAccount.amount;
      console.log('✅ [previewCharityPayout] Vault account found! Balance:', vaultBalance.toString());
    } catch (error: any) {
      console.error('❌ [previewCharityPayout] Vault token account error:', error.name, error.message);
      
      // Check if it's specifically account not found
      if (error.name === 'TokenAccountNotFoundError' || 
          error.message?.includes('could not find account')) {
        console.warn('⚠️  [previewCharityPayout] Vault token account does not exist yet (no fees collected?)');
        vaultBalance = 0n;
      } else {
        // Some other error - re-throw
        console.error('❌ [previewCharityPayout] Unexpected error fetching vault:', error);
        throw error;
      }
    }

    console.log('🔍 [previewCharityPayout] Total in vault (raw):', vaultBalance.toString());

    const mintInfo = await getMint(connection, feeTokenMint);
    const decimals = mintInfo.decimals;
    console.log('🔍 [previewCharityPayout] Token decimals:', decimals);

    // 4) Compute BPS and charity amount
    const platformFeeBps = Number(globalConfigAccount.platformFeeBps ?? 2000);
    const hostFeeBps = Number(roomAccount.hostFeeBps ?? 0);
    const prizePoolBps = Number(roomAccount.prizePoolBps ?? 0);

    console.log('🔍 [previewCharityPayout] Fee structure (BPS):', {
      platform: platformFeeBps,
      host: hostFeeBps,
      prizePool: prizePoolBps,
      total: platformFeeBps + hostFeeBps + prizePoolBps,
    });

    const charityBps = 10_000 - platformFeeBps - hostFeeBps - prizePoolBps;
    console.log('🔍 [previewCharityPayout] Charity BPS:', charityBps);

    if (charityBps <= 0) {
      throw new Error(
        `[useSolanaContract:previewCharityPayout] Invalid fee configuration, charityBps=${charityBps}`
      );
    }

    const charityAmountRaw = (vaultBalance * BigInt(charityBps)) / 10_000n;
    console.log('🔍 [previewCharityPayout] Charity amount (raw):', charityAmountRaw.toString());

    const amountDecimal = bigIntToDecimalString(charityAmountRaw, decimals);
    console.log('🔍 [previewCharityPayout] Charity amount (decimal):', amountDecimal);

    const result = {
      roomPDA,
      amountRaw: charityAmountRaw,
      amountDecimal,
      decimals,
      charityBps,
    };

    console.log('✅ [previewCharityPayout] DEBUG END =============================');
    console.log('✅ [previewCharityPayout] Returning:', result);

    return result;
  },
  [context]
);


  // ============================================================================
  // Generic API Wrapper Factory
  // ============================================================================

  /**
   * Creates a useCallback-wrapped API function with automatic context injection
   * and improved error handling with operation names for debugging.
   * 
   * @param operationName - Name of the operation (for error messages)
   * @param apiFunction - The API function to wrap
   * @param dependencies - React dependencies array
   * @returns Wrapped function with useCallback
   */
  function createApiWrapper<TParams extends any[], TResult>(
    operationName: string,
    apiFunction: (context: SolanaContractContext, ...args: TParams) => Promise<TResult>,
    dependencies: DependencyList
  ): (...args: TParams) => Promise<TResult> {
    return useCallback(
      async (...args: TParams): Promise<TResult> => {
        try {
          return await apiFunction(context, ...args);
        } catch (error: any) {
          // Enhance error message with operation name for better debugging
          const enhancedError = new Error(
            `[useSolanaContract:${operationName}] ${error.message || 'Unknown error'}`
          );
          // Preserve original error stack and properties
          if (error.stack) {
            enhancedError.stack = error.stack;
          }
          Object.assign(enhancedError, error);
          throw enhancedError;
        }
      },
      [context, ...dependencies]
    );
  }

  // ============================================================================
  // PDA Derivation Helpers
  // ============================================================================
  // ✅ Using Phase 1 utilities from @/shared/lib/solana/pda
  // These are imported at the top of the file to eliminate code duplication
  // All PDA derivation now uses the centralized, tested utilities
  // Note: deriveTokenRegistryPDA is also available from Phase 1 utilities

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

  // ============================================================================
  // Admin Operations
  // ============================================================================

  /**
   * Initializes the global config (one-time setup)
   * ✅ Now uses extracted API module from @/features/web3/solana/api/admin/initialize-global-config
   *
   * The global config must be initialized before creating any rooms.
   * This sets the platform and charity wallet addresses.
   *
   * @param platformWallet - Wallet to receive platform fees
   * @param charityWallet - Wallet to receive charity donations
   * @returns Transaction signature
   */
  const initializeGlobalConfig = createApiWrapper(
    'initializeGlobalConfig',
    async (ctx, platformWallet: PublicKey, charityWallet: PublicKey) => {
      const result = await initializeGlobalConfigAPI(ctx, {
        platformWallet,
        charityWallet,
      });
      return { signature: result.signature };
    },
    []
  );

  /**
   * Updates the global configuration (admin only)
   * ✅ Now uses extracted API module from @/features/web3/solana/api/admin/update-global-config
   * 
   * Used to update max_prize_pool_bps from 3500 (35%) to 4000 (40%) to allow
   * hosts to allocate up to 40% - host fee for prizes.
   */
  const updateGlobalConfig = createApiWrapper(
    'updateGlobalConfig',
    async (ctx, updates: {
      platformWallet?: PublicKey | null;
      charityWallet?: PublicKey | null;
      platformFeeBps?: number | null;
      maxHostFeeBps?: number | null;
      maxPrizePoolBps?: number | null;
      minCharityBps?: number | null;
    }) => {
      // Filter out null values and convert to proper type
      const filteredUpdates: any = {};
      if (updates.platformWallet !== null && updates.platformWallet !== undefined) {
        filteredUpdates.platformWallet = updates.platformWallet;
      }
      if (updates.charityWallet !== null && updates.charityWallet !== undefined) {
        filteredUpdates.charityWallet = updates.charityWallet;
      }
      if (updates.platformFeeBps !== null && updates.platformFeeBps !== undefined) {
        filteredUpdates.platformFeeBps = updates.platformFeeBps;
      }
      if (updates.maxHostFeeBps !== null && updates.maxHostFeeBps !== undefined) {
        filteredUpdates.maxHostFeeBps = updates.maxHostFeeBps;
      }
      if (updates.maxPrizePoolBps !== null && updates.maxPrizePoolBps !== undefined) {
        filteredUpdates.maxPrizePoolBps = updates.maxPrizePoolBps;
      }
      if (updates.minCharityBps !== null && updates.minCharityBps !== undefined) {
        filteredUpdates.minCharityBps = updates.minCharityBps;
      }
      return await updateGlobalConfigAPI(ctx, filteredUpdates);
    },
    []
  );

  /**
   * Initializes the token registry (one-time setup)
   * ✅ Now uses extracted API module from @/features/web3/solana/api/admin/initialize-token-registry
   *
   * The token registry must be initialized before creating any rooms.
   * This is a one-time operation that creates the registry PDA account.
   *
   * @returns Transaction signature
   */
  const initializeTokenRegistry = createApiWrapper(
    'initializeTokenRegistry',
    async (ctx) => {
      const result = await initializeTokenRegistryAPI(ctx);
      return { signature: result.signature };
    },
    []
  );

  /**
   * Add an approved token to the token registry
   * ✅ Now uses extracted API module from @/features/web3/solana/api/admin/add-approved-token
   *
   * @param tokenMint - The mint address of the token to approve
   * @returns Transaction signature
   */
  const addApprovedToken = createApiWrapper(
    'addApprovedToken',
    async (ctx, tokenMint: PublicKey) => {
      const result = await addApprovedTokenAPI(ctx, { tokenMint });
      return { signature: result.signature };
    },
    []
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
  // ============================================================================
  // Room Operations
  // ============================================================================

  /**
   * Creates a new pool-based fundraising room
   * ✅ Now uses extracted API module from @/features/web3/solana/api/room/create-pool-room
   */
  const createPoolRoom = createApiWrapper(
    'createPoolRoom',
    async (ctx, params: CreatePoolRoomParams): Promise<RoomCreationResult> => {
      return await createPoolRoomAPI(ctx, params);
    },
    []
  );

  /**
   * Creates an asset-based room where prizes are pre-deposited SPL tokens.
   * ✅ Now uses extracted API module from @/features/web3/solana/api/room/create-asset-room
   */
  const createAssetRoom = createApiWrapper(
    'createAssetRoom',
    async (ctx, params: CreateAssetRoomParams): Promise<RoomCreationResult> => {
      return await createAssetRoomAPI(ctx, params);
    },
    []
  );

  // ============================================================================
  // Prize Operations
  // ============================================================================

  /**
   * Deposits a prize asset into an asset-based room.
   * ✅ Now uses extracted API module from @/features/web3/solana/api/prizes/deposit-prize-asset
   */
  const depositPrizeAsset = createApiWrapper(
    'depositPrizeAsset',
    async (ctx, params: DepositPrizeAssetParams) => {
      return await depositPrizeAssetAPI(ctx, params);
    },
    []
  );

  // ============================================================================
  // Utility Operations
  // ============================================================================

  /**
   * Creates a new SPL token mint using your Phantom wallet.
   * ✅ Now uses extracted API module from @/features/web3/solana/api/admin/create-token-mint
   * Use this to create test tokens for prize assets.
   */
  const createTokenMint = useCallback(
    async (params?: Omit<CreateTokenMintParams, 'connection' | 'publicKey' | 'signTransaction'>): Promise<CreateTokenMintResult> => {
      if (!publicKey || !signTransaction) {
        throw new Error('[useSolanaContract:createTokenMint] Wallet not connected');
      }

      try {
        const signTx = async (tx: Transaction) => {
          return signTransaction(tx);
        };

        return await createTokenMintAPI({
          connection,
          publicKey,
          signTransaction: signTx,
          ...params,
        });
      } catch (error: any) {
        const enhancedError = new Error(
          `[useSolanaContract:createTokenMint] ${error.message || 'Unknown error'}`
        );
        if (error.stack) {
          enhancedError.stack = error.stack;
        }
        Object.assign(enhancedError, error);
        throw enhancedError;
      }
    },
    [publicKey, signTransaction, connection]
  );

  // ============================================================================
  // Player Operations
  // ============================================================================

  /**
   * Joins an existing bingo room by paying the entry fee and optional extras.
   * ✅ Now uses extracted API module from @/features/web3/solana/api/player/join-room
   *
   * @param params - Join room parameters
   * @param params.roomId - Room identifier
   * @param params.hostPubkey - Room host's pubkey (optional)
   * @param params.entryFee - Entry fee in token base units (optional)
   * @param params.feeTokenMint - Token mint for entry fees (optional)
   * @param params.extrasAmount - Optional extras amount (100% to charity)
   * @param params.roomPDA - Optional room PDA address
   * @returns Join room result with transaction signature and player entry PDA
   * @throws Error if wallet not connected, room not found, player already joined, or insufficient balance
   */
  const joinRoom = createApiWrapper(
    'joinRoom',
    async (ctx, params: JoinRoomParams) => {
      return await joinRoomAPI(ctx, params);
    },
    []
  );

  /**
   * Distributes prizes to winners after game ends
   * ✅ Now uses extracted API module from @/features/web3/solana/api/prizes/distribute-prizes
   *
   * @param params - Prize distribution parameters
   * @param params.roomId - Room identifier
   * @param params.winners - Array of winner public keys (1-10 winners)
   * @param params.roomAddress - Optional room PDA address
   * @param params.charityWallet - Optional charity wallet override
   * @returns Distribution result with transaction signature
   * @throws Error if wallet not connected, room not found, or winners invalid
   */
  const distributePrizes = createApiWrapper(
    'distributePrizes',
    async (ctx, params: DistributePrizesParams): Promise<DistributePrizesResult> => {
      return await distributePrizesAPI(ctx, params);
    },
    []
  );

  // ============================================================================
  // Query Operations
  // ============================================================================

  /**
   * Fetches room information from on-chain account
   * ✅ Now uses extracted API module from @/features/web3/solana/api/room/get-room-info
   */
  const getRoomInfo = createApiWrapper(
    'getRoomInfo',
    async (ctx, roomAddress: PublicKey) => {
      const result = await getRoomInfoAPI(ctx, roomAddress);
      // Convert to extended type for backward compatibility
      return toRoomInfoExtended(result);
    },
    []
  );

  /**
   * Fetches player entry information from on-chain account
   * ✅ Now uses extracted API module from @/features/web3/solana/api/player/get-player-entry
   */
  const getPlayerEntry = createApiWrapper(
    'getPlayerEntry',
    async (ctx, roomAddress: PublicKey, playerAddress: PublicKey) => {
      // Derive player entry PDA
      const [playerEntryPDA] = derivePlayerEntryPDA(roomAddress, playerAddress);
      const result = await getPlayerEntryAPI(ctx, playerEntryPDA);
      // Convert to extended type for backward compatibility
      return toPlayerEntryInfoExtended(result);
    },
    []
  );

  /**
   * Sets emergency pause state (admin only)
   * ✅ Now uses extracted API module from @/features/web3/solana/api/admin/set-emergency-pause
   */
  const setEmergencyPause = createApiWrapper(
    'setEmergencyPause',
    async (ctx, paused: boolean) => {
      const result = await setEmergencyPauseAPI(ctx, paused);
      return { signature: result.signature };
    },
    []
  );

  /**
   * Recovers a room and refunds players (admin only)
   * ✅ Now uses extracted API module from @/features/web3/solana/api/admin/recover-room
   */
  const recoverRoom = createApiWrapper(
    'recoverRoom',
    async (ctx, params: { roomId: string; hostPubkey: PublicKey; roomAddress?: PublicKey }) => {
      const result = await recoverRoomAPI(ctx, params);
      return {
        signature: result.signature,
        playersRefunded: result.playersRefunded,
        totalRefunded: result.totalRefunded,
        platformFee: result.platformFee,
      };
    },
    []
  );

  /**
   * Closes joining for a room (host only)
   * ✅ Now uses extracted API module from @/features/web3/solana/api/room/close-joining
   */
  const closeJoining = createApiWrapper(
    'closeJoining',
    async (ctx, params: { roomId: string; hostPubkey: PublicKey }) => {
      const result = await closeJoiningAPI(ctx, params);
      return { signature: result.signature };
    },
    []
  );

  /**
   * Cleans up a room after it's ended (host only)
   * ✅ Now uses extracted API module from @/features/web3/solana/api/room/cleanup-room
   */
  const cleanupRoom = createApiWrapper(
    'cleanupRoom',
    async (ctx, params: { roomId: string; hostPubkey: PublicKey }) => {
      const result = await cleanupRoomAPI(ctx, params);
      return { signature: result.signature, rentReclaimed: result.rentReclaimed };
    },
    []
  );

  /**
   * Ends a room and distributes prizes
   * ✅ Now uses extracted API module from @/features/web3/solana/api/prizes/end-room
   */
  const endRoom = createApiWrapper(
    'endRoom',
    async (ctx, params: EndRoomParams) => {
      const result = await endRoomAPI(ctx, {
        roomId: params.roomId,
        hostPubkey: params.hostPubkey,
        winners: params.winners,
        feeTokenMint: params.feeTokenMint,
      });
      return { signature: result.signature };
    },
    []
  );

  /**
   * Declares winners for a room (host only)
   * ✅ Now uses extracted API module from @/features/web3/solana/api/prizes/declare-winners
   */
  const declareWinners = createApiWrapper(
    'declareWinners',
    async (ctx, params: DeclareWinnersParams) => {
      const result = await declareWinnersAPI(ctx, {
        roomId: params.roomId,
        hostPubkey: params.hostPubkey,
        winners: params.winners,
      });
      return { signature: result.signature };
    },
    []
  );

  // ============================================================================
  // Return Hook Interface
  // ============================================================================


  return {
    // Connection state
    publicKey,
    connected: !!publicKey,
    isReady: !!publicKey && !!program,

    // Admin operations
    initializeGlobalConfig,
    updateGlobalConfig,
    setEmergencyPause,
    initializeTokenRegistry,
    addApprovedToken,
    recoverRoom,

    // Room operations
    createPoolRoom,
    createAssetRoom,
    joinRoom,
    closeJoining,
    cleanupRoom,
    endRoom,

    // Prize operations
    declareWinners,
    distributePrizes,
    depositPrizeAsset,

    // Query operations
    getRoomInfo,
    getPlayerEntry,

    // Utility operations
    createTokenMint,

      // New: Solana charity preview (for TGB + UI)
    previewCharityPayout,
  };
}

// ============================================================================
// Helper Functions
// ============================================================================

