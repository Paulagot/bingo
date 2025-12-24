/**
 * PDA (Program Derived Address) Utilities
 * 
 * All PDA derivation logic for the quiz_core program in one place.
 * PDAs are deterministic addresses derived from seeds and the program ID.
 * 
 * ## IMPORTANT: Cross-Program PDAs
 * 
 * GlobalConfig and TokenRegistry are owned by the quiz_admin program,
 * but referenced by quiz_core. We must derive them using quiz_admin's program ID!
 */

import { PublicKey } from '@solana/web3.js';
import { SOLANA_CONTRACT } from '../config/contracts';

// Quiz Core Program ID (for room PDAs)
const QUIZ_CORE_PROGRAM_ID = SOLANA_CONTRACT.PROGRAM_ID;

// Quiz Admin Program ID (for GlobalConfig and TokenRegistry PDAs)
const QUIZ_ADMIN_PROGRAM_ID = new PublicKey('6nYRJBqqMxVvYhDpzcgSSGgxj1xM6uBkQYedkA4fs7Q5');

const SEEDS = SOLANA_CONTRACT.SEEDS;

/**
 * Derive GlobalConfig PDA
 * 
 * ⚠️  OWNED BY QUIZ_ADMIN, NOT QUIZ_CORE!
 * Uses quiz_admin program ID for derivation.
 */
export function deriveGlobalConfigPDA(): [PublicKey, number] {
  console.log('[PDA] Deriving GlobalConfig PDA (from quiz_admin)');
  
  const [pda, bump] = PublicKey.findProgramAddressSync(
    [Buffer.from(SEEDS.GLOBAL_CONFIG)],
    QUIZ_ADMIN_PROGRAM_ID // ← Use quiz_admin program ID!
  );
  
  console.log('[PDA] ✅ GlobalConfig:', pda.toBase58(), 'bump:', bump);
  return [pda, bump];
}

/**
 * Derive TokenRegistry PDA
 * 
 * ⚠️  OWNED BY QUIZ_ADMIN, NOT QUIZ_CORE!
 * Uses quiz_admin program ID for derivation.
 */
export function deriveTokenRegistryPDA(): [PublicKey, number] {
  console.log('[PDA] Deriving TokenRegistry PDA (from quiz_admin)');
  
  const [pda, bump] = PublicKey.findProgramAddressSync(
    [Buffer.from(SEEDS.TOKEN_REGISTRY)],
    QUIZ_ADMIN_PROGRAM_ID // ← Use quiz_admin program ID!
  );
  
  console.log('[PDA] ✅ TokenRegistry:', pda.toBase58(), 'bump:', bump);
  return [pda, bump];
}

/**
 * Derive Room PDA
 * 
 * ✅ OWNED BY QUIZ_CORE
 * Uses quiz_core program ID for derivation.
 */
export function deriveRoomPDA(host: PublicKey, roomId: string): [PublicKey, number] {
  console.log('[PDA] Deriving Room PDA for:', { 
    host: host.toBase58(), 
    roomId,
    roomIdLength: roomId.length,
  });
  
  if (roomId.length > SOLANA_CONTRACT.MAX_ROOM_ID_LENGTH) {
    throw new Error(
      `Room ID too long: ${roomId.length} chars (max ${SOLANA_CONTRACT.MAX_ROOM_ID_LENGTH})`
    );
  }
  
  const [pda, bump] = PublicKey.findProgramAddressSync(
    [
      Buffer.from(SEEDS.ROOM),
      host.toBuffer(),
      Buffer.from(roomId)
    ],
    QUIZ_CORE_PROGRAM_ID // ← Use quiz_core program ID
  );
  
  console.log('[PDA] ✅ Room:', pda.toBase58(), 'bump:', bump);
  return [pda, bump];
}

/**
 * Derive RoomVault PDA
 * 
 * ✅ OWNED BY QUIZ_CORE
 */
export function deriveRoomVaultPDA(room: PublicKey): [PublicKey, number] {
  console.log('[PDA] Deriving RoomVault PDA for room:', room.toBase58());
  
  const [pda, bump] = PublicKey.findProgramAddressSync(
    [
      Buffer.from(SEEDS.ROOM_VAULT),
      room.toBuffer()
    ],
    QUIZ_CORE_PROGRAM_ID // ← Use quiz_core program ID
  );
  
  console.log('[PDA] ✅ RoomVault:', pda.toBase58(), 'bump:', bump);
  return [pda, bump];
}

/**
 * Derive PlayerEntry PDA
 * 
 * ✅ OWNED BY QUIZ_CORE
 */
export function derivePlayerEntryPDA(room: PublicKey, player: PublicKey): [PublicKey, number] {
  console.log('[PDA] Deriving PlayerEntry PDA for:', {
    room: room.toBase58(),
    player: player.toBase58(),
  });
  
  const [pda, bump] = PublicKey.findProgramAddressSync(
    [
      Buffer.from(SEEDS.PLAYER),
      room.toBuffer(),
      player.toBuffer()
    ],
    QUIZ_CORE_PROGRAM_ID // ← Use quiz_core program ID
  );
  
  console.log('[PDA] ✅ PlayerEntry:', pda.toBase58(), 'bump:', bump);
  return [pda, bump];
}

/**
 * Derive PrizeVault PDA (for asset rooms only)
 * 
 * ✅ OWNED BY QUIZ_CORE
 * 
 * Prize vaults are per-prize token accounts that hold escrowed assets
 * for asset-based rooms. Each room can have up to 3 prize vaults.
 * 
 * Seeds: ["prize-vault", room_key, prize_index]
 * 
 * @param room - Room PDA address
 * @param prizeIndex - Prize index (0 = 1st place, 1 = 2nd place, 2 = 3rd place)
 * @returns [Prize Vault PDA, bump]
 */
export function derivePrizeVaultPDA(room: PublicKey, prizeIndex: number): [PublicKey, number] {
  console.log('[PDA] Deriving PrizeVault PDA for:', {
    room: room.toBase58(),
    prizeIndex,
    place: prizeIndex + 1, // Human-readable (1st, 2nd, 3rd)
  });
  
  if (prizeIndex < 0 || prizeIndex >= SOLANA_CONTRACT.ASSET_ROOM.MAX_PRIZES) {
    throw new Error(
      `Invalid prize index: ${prizeIndex} (must be 0-${SOLANA_CONTRACT.ASSET_ROOM.MAX_PRIZES - 1})`
    );
  }
  
  // Use hardcoded seed since SEEDS.PRIZE_VAULT might not be defined yet
  const [pda, bump] = PublicKey.findProgramAddressSync(
    [
      Buffer.from('prize-vault'), // ← Hardcoded seed (matches Rust: b"prize-vault")
      room.toBuffer(),
      Buffer.from([prizeIndex])
    ],
    QUIZ_CORE_PROGRAM_ID // ← Use quiz_core program ID
  );
  
  console.log('[PDA] ✅ PrizeVault:', pda.toBase58(), 'bump:', bump);
  return [pda, bump];
}

/**
 * Batch derive all PDAs for a room at once
 * 
 * Useful for preparing all accounts needed for a transaction in one call.
 */
export function deriveRoomPDAs(params: {
  host: PublicKey;
  roomId: string;
  includePlayer?: PublicKey;
  includePrizeVaults?: boolean;
}): {
  globalConfig: PublicKey;
  tokenRegistry: PublicKey;
  room: PublicKey;
  roomVault: PublicKey;
  playerEntry?: PublicKey;
  prizeVaults?: PublicKey[];
} {
  console.log('[PDA] 📦 Batch deriving PDAs for room:', params.roomId);
  
  const [globalConfig] = deriveGlobalConfigPDA();
  const [tokenRegistry] = deriveTokenRegistryPDA();
  const [room] = deriveRoomPDA(params.host, params.roomId);
  const [roomVault] = deriveRoomVaultPDA(room);
  
  let playerEntry: PublicKey | undefined;
  if (params.includePlayer) {
    [playerEntry] = derivePlayerEntryPDA(room, params.includePlayer);
  }
  
  let prizeVaults: PublicKey[] | undefined;
  if (params.includePrizeVaults) {
    prizeVaults = [];
    for (let i = 0; i < SOLANA_CONTRACT.ASSET_ROOM.MAX_PRIZES; i++) {
      const [vault] = derivePrizeVaultPDA(room, i);
      prizeVaults.push(vault);
    }
  }
  
  console.log('[PDA] ✅ Batch derivation complete');
  
  return {
    globalConfig,
    tokenRegistry,
    room,
    roomVault,
    playerEntry,
    prizeVaults,
  };
}

