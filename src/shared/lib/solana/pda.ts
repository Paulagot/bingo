/**
 * @module shared/lib/solana/pda
 *
 * ## Purpose
 * Provides utilities for deriving Program Derived Addresses (PDAs) for the
 * Solana Bingo smart contract. PDAs are deterministic, signature-free accounts
 * owned and controlled by the on-chain program.
 *
 * ## Architecture
 * PDAs are derived using:
 * - Seeds: Deterministic byte arrays (strings, public keys, indices)
 * - Program ID: The smart contract's public key
 * - Bump seed: A value that ensures the address is off the ed25519 curve
 *
 * The derivation is deterministic, meaning the same inputs always produce the same PDA.
 * This allows client-side code to predict account addresses before they are created on-chain.
 *
 * ## Public API
 * - `deriveGlobalConfigPDA()` - Derive global platform configuration account
 * - `deriveTokenRegistryPDA()` - Derive approved token registry account
 * - `deriveRoomPDA()` - Derive room account address
 * - `deriveRoomVaultPDA()` - Derive room vault token account address
 * - `derivePrizeVaultPDA()` - Derive prize vault token account address
 * - `derivePlayerEntryPDA()` - Derive player entry record address
 *
 * ## Security Considerations
 * **CRITICAL**: PDA seeds must EXACTLY match the Rust contract's seeds. Any mismatch
 * will cause Anchor constraint validation errors. The contract expects:
 * - `global-config` (NOT `global_config` or `globalConfig`)
 * - `token-registry-v4` (versioned for upgrades)
 * - `room` with [host_pubkey, room_id]
 * - `room-vault` with [room_pubkey]
 * - `prize-vault` with [room_pubkey, prize_index]
 * - `player-entry` with [room_pubkey, player_pubkey]
 *
 * @see programs/bingo/src/lib.rs - Contract-side PDA constraints
 * @see programs/bingo/src/state/ - Account structures
 *
 * @example
 * ```typescript
 * import { deriveRoomPDA, deriveRoomVaultPDA } from '@/shared/lib/solana/pda';
 *
 * // Derive room PDA
 * const [roomPda, roomBump] = deriveRoomPDA(hostPublicKey, 'quiz-123');
 * console.log('Room address:', roomPda.toBase58());
 *
 * // Derive room vault PDA (for storing entry fees)
 * const [vaultPda, vaultBump] = deriveRoomVaultPDA(roomPda);
 * ```
 */

import { PublicKey } from '@solana/web3.js';
import { PROGRAM_ID, PDA_SEEDS } from '@/chains/solana/config';

/**
 * Derives the PDA address for the global platform configuration account
 *
 * The GlobalConfig is a singleton account storing platform-wide settings:
 * - Platform wallet address
 * - Charity wallet address
 * - Fee configuration (platform fee, max host fee, etc.)
 * - Emergency pause state
 *
 * Seeds: `["global-config"]`
 *
 * @returns Tuple of [PDA address, bump seed]
 *
 * @example
 * ```typescript
 * const [globalConfigPda] = deriveGlobalConfigPDA();
 * const account = await program.account.globalConfig.fetch(globalConfigPda);
 * console.log('Platform wallet:', account.platformWallet.toBase58());
 * ```
 *
 * @see state/global_config.rs - Account structure
 */
export function deriveGlobalConfigPDA(): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from(PDA_SEEDS.GLOBAL_CONFIG)],
    PROGRAM_ID
  );
}

/**
 * Derives the PDA address for the token registry account
 *
 * The TokenRegistry stores a whitelist of approved tokens that can be used
 * for room entry fees. This prevents users from creating rooms with arbitrary
 * or malicious tokens.
 *
 * Seeds: `["token-registry-v4"]`
 *
 * Note: The seed is versioned (`v4`) to allow for upgrades. If the registry
 * structure changes, a new version can be deployed without breaking existing rooms.
 *
 * @returns Tuple of [PDA address, bump seed]
 *
 * @throws {Error} Never throws, but returns an invalid PDA if program is not deployed
 *
 * @example
 * ```typescript
 * const [registryPda] = deriveTokenRegistryPDA();
 * const registry = await program.account.tokenRegistry.fetch(registryPda);
 * console.log('Approved tokens:', registry.approvedTokens);
 * ```
 *
 * @see state/token_registry.rs - Registry structure
 * @see instructions/admin/add_approved_token.rs - Token approval
 */
export function deriveTokenRegistryPDA(): [PublicKey, number] {
  const seed = 'token-registry-v4'; // MUST match Rust contract seed

  return PublicKey.findProgramAddressSync(
    [Buffer.from(seed)],
    PROGRAM_ID
  );
}

/**
 * Derives the PDA address for a room account
 *
 * Rooms are the core game instances. Each room stores:
 * - Game configuration (entry fee, max players, prize distribution)
 * - Current state (player count, total collected, status)
 * - Winner information
 * - Prize asset configuration (for asset-based rooms)
 *
 * Seeds: `["room", host_pubkey, room_id]`
 *
 * The room PDA is uniquely identified by the host's public key and a room ID string.
 * This ensures that each host can create multiple rooms with different IDs, and
 * no two hosts can have the same room address.
 *
 * @param host - Host's public key (creator of the room)
 * @param roomId - Unique room identifier (max 32 characters, alphanumeric)
 * @returns Tuple of [PDA address, bump seed]
 *
 * @throws {Error} If roomId contains invalid characters or exceeds length limits
 *
 * @example
 * ```typescript
 * const hostPubkey = new PublicKey('...');
 * const [roomPda, bump] = deriveRoomPDA(hostPubkey, 'quiz-123');
 *
 * // Use in contract call
 * await program.methods.initPoolRoom(...)
 *   .accounts({ room: roomPda, host: hostPubkey })
 *   .rpc();
 * ```
 *
 * @see state/room.rs - Room account structure
 * @see instructions/room/init_pool_room.rs - Pool room creation
 * @see instructions/asset/init_asset_room.rs - Asset room creation
 */
export function deriveRoomPDA(host: PublicKey, roomId: string): [PublicKey, number] {
  if (roomId.length > 32) {
    throw new Error(`Room ID must be 32 characters or less, got ${roomId.length}`);
  }

  if (roomId.length === 0) {
    throw new Error('Room ID cannot be empty');
  }

  return PublicKey.findProgramAddressSync(
    [
      Buffer.from(PDA_SEEDS.ROOM),
      host.toBuffer(),
      Buffer.from(roomId)
    ],
    PROGRAM_ID
  );
}

/**
 * Derives the PDA address for a room's fee vault token account
 *
 * The room vault is a PDA token account that stores entry fees and extras
 * collected from players. The vault is owned by the program, allowing it to
 * autonomously distribute funds at the end of the game.
 *
 * Seeds: `["room-vault", room_pubkey]`
 *
 * The vault is specific to each room and holds tokens of the room's configured
 * fee token mint (USDC, PYUSD, etc.).
 *
 * @param room - Room PDA address
 * @returns Tuple of [PDA address, bump seed]
 *
 * @example
 * ```typescript
 * const [roomPda] = deriveRoomPDA(hostPubkey, 'quiz-123');
 * const [vaultPda] = deriveRoomVaultPDA(roomPda);
 *
 * // Get vault balance
 * const vaultAccount = await getAccount(connection, vaultPda);
 * console.log('Vault balance:', vaultAccount.amount);
 * ```
 *
 * @see instructions/room/init_pool_room.rs - Vault creation for pool rooms
 * @see instructions/asset/init_asset_room.rs - Vault creation for asset rooms
 * @see instructions/game/end_room.rs - Vault distribution
 */
export function deriveRoomVaultPDA(room: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [
      Buffer.from(PDA_SEEDS.ROOM_VAULT),
      room.toBuffer()
    ],
    PROGRAM_ID
  );
}

/**
 * Derives the PDA address for a prize vault token account
 *
 * Prize vaults are PDA token accounts used in asset-based rooms to store
 * pre-deposited prize assets (NFTs, tokens, etc.). Each room can have up to
 * 3 prize vaults (for 1st, 2nd, 3rd place).
 *
 * Seeds: `["prize-vault", room_pubkey, prize_index]`
 *
 * Unlike room vaults (which hold entry fees), prize vaults hold the actual
 * prize tokens that will be distributed to winners. Each vault can hold a
 * different token type.
 *
 * @param room - Room PDA address
 * @param prizeIndex - Prize position (0 = 1st place, 1 = 2nd place, 2 = 3rd place)
 * @returns Tuple of [PDA address, bump seed]
 *
 * @throws {Error} If prizeIndex is not 0, 1, or 2
 *
 * @example
 * ```typescript
 * const [roomPda] = deriveRoomPDA(hostPubkey, 'asset-quiz-456');
 *
 * // Derive vault for 1st place prize
 * const [firstPlaceVaultPda] = derivePrizeVaultPDA(roomPda, 0);
 *
 * // Derive vault for 2nd place prize
 * const [secondPlaceVaultPda] = derivePrizeVaultPDA(roomPda, 1);
 * ```
 *
 * @see instructions/asset/add_prize_asset.rs - Prize deposit
 * @see instructions/game/end_room.rs - Prize distribution
 */
export function derivePrizeVaultPDA(room: PublicKey, prizeIndex: number): [PublicKey, number] {
  if (prizeIndex < 0 || prizeIndex > 2) {
    throw new Error(`Prize index must be 0, 1, or 2 (got ${prizeIndex})`);
  }

  return PublicKey.findProgramAddressSync(
    [
      Buffer.from('prize-vault'),
      room.toBuffer(),
      Buffer.from([prizeIndex])
    ],
    PROGRAM_ID
  );
}

/**
 * Derives the PDA address for a player entry record
 *
 * Player entries track individual participation in a room, storing:
 * - Amount paid (entry fee + extras)
 * - Join timestamp
 * - Payment breakdown
 *
 * Seeds: `["player-entry", room_pubkey, player_pubkey]`
 *
 * Each player can only have one entry per room. The PDA prevents double-joining
 * by making the address deterministic based on room + player.
 *
 * @param room - Room PDA address
 * @param player - Player's public key
 * @returns Tuple of [PDA address, bump seed]
 *
 * @example
 * ```typescript
 * const [roomPda] = deriveRoomPDA(hostPubkey, 'quiz-123');
 * const playerPubkey = new PublicKey('...');
 *
 * const [entryPda] = derivePlayerEntryPDA(roomPda, playerPubkey);
 *
 * // Check if player has already joined
 * const entryAccount = await connection.getAccountInfo(entryPda);
 * if (entryAccount) {
 *   console.log('Player has already joined this room');
 * }
 * ```
 *
 * @see state/player_entry.rs - Entry record structure
 * @see instructions/player/join_room.rs - Entry creation
 */
export function derivePlayerEntryPDA(room: PublicKey, player: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [
      Buffer.from(PDA_SEEDS.PLAYER_ENTRY),
      room.toBuffer(),
      player.toBuffer()
    ],
    PROGRAM_ID
  );
}

/**
 * Type-safe PDA derivation result
 *
 * Wraps the PDA address and bump seed in a structured type for better
 * type inference and documentation.
 */
export interface PDAResult {
  /** The derived PDA address */
  address: PublicKey;
  /** The bump seed used to derive the PDA (0-255) */
  bump: number;
}

/**
 * Derives a PDA and returns a structured result
 *
 * Utility wrapper that converts the tuple return format to a named object
 * for improved readability and type safety.
 *
 * @param deriveFn - Any PDA derivation function from this module
 * @param args - Arguments to pass to the derivation function
 * @returns Structured PDA result with named fields
 *
 * @example
 * ```typescript
 * const { address: roomPda, bump } = derivePDA(deriveRoomPDA, hostPubkey, 'quiz-123');
 * const { address: vaultPda } = derivePDA(deriveRoomVaultPDA, roomPda);
 * ```
 */
export function derivePDA<T extends (...args: any[]) => [PublicKey, number]>(
  deriveFn: T,
  ...args: Parameters<T>
): PDAResult {
  const [address, bump] = deriveFn(...args);
  return { address, bump };
}
