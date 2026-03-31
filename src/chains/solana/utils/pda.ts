/**
 * PDA (Program Derived Address) Utilities
 *
 * ## What changed (new contract)
 *
 * - deriveGlobalConfigPDA  — REMOVED (no GlobalConfig in new contract)
 * - deriveTokenRegistryPDA — REMOVED (no TokenRegistry in new contract)
 * - deriveRoomPDA, deriveRoomVaultPDA, derivePlayerEntryPDA — UNCHANGED
 * - derivePrizeVaultPDA    — REMOVED (asset rooms are gone)
 * - deriveRoomPDAs batch   — updated to remove removed fields
 * - quiz_admin program ID  — REMOVED entirely
 *
 * Seeds (unchanged from old contract):
 *   Room:        ["room",       host.toBuffer(), Buffer.from(roomId)]
 *   Room vault:  ["room-vault", roomPDA.toBuffer()]
 *   Player entry:["player",     roomPDA.toBuffer(), player.toBuffer()]
 */

import { PublicKey } from '@solana/web3.js';
import { SOLANA_CONTRACT } from '../config/contracts';

const QUIZ_CORE_PROGRAM_ID = SOLANA_CONTRACT.PROGRAM_ID;
const SEEDS = SOLANA_CONTRACT.SEEDS;

// ---------------------------------------------------------------------------
// Room PDA
// ---------------------------------------------------------------------------

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
    [Buffer.from(SEEDS.ROOM), host.toBuffer(), Buffer.from(roomId)],
    QUIZ_CORE_PROGRAM_ID
  );

  console.log('[PDA] ✅ Room:', pda.toBase58(), 'bump:', bump);
  return [pda, bump];
}

// ---------------------------------------------------------------------------
// Room Vault PDA
// ---------------------------------------------------------------------------

export function deriveRoomVaultPDA(room: PublicKey): [PublicKey, number] {
  console.log('[PDA] Deriving RoomVault PDA for room:', room.toBase58());

  const [pda, bump] = PublicKey.findProgramAddressSync(
    [Buffer.from(SEEDS.ROOM_VAULT), room.toBuffer()],
    QUIZ_CORE_PROGRAM_ID
  );

  console.log('[PDA] ✅ RoomVault:', pda.toBase58(), 'bump:', bump);
  return [pda, bump];
}

// ---------------------------------------------------------------------------
// Player Entry PDA
// ---------------------------------------------------------------------------

export function derivePlayerEntryPDA(room: PublicKey, player: PublicKey): [PublicKey, number] {
  console.log('[PDA] Deriving PlayerEntry PDA for:', {
    room: room.toBase58(),
    player: player.toBase58(),
  });

  const [pda, bump] = PublicKey.findProgramAddressSync(
    [Buffer.from(SEEDS.PLAYER), room.toBuffer(), player.toBuffer()],
    QUIZ_CORE_PROGRAM_ID
  );

  console.log('[PDA] ✅ PlayerEntry:', pda.toBase58(), 'bump:', bump);
  return [pda, bump];
}

// ---------------------------------------------------------------------------
// Batch helper — derives all PDAs needed for a room in one call
// ---------------------------------------------------------------------------

export function deriveRoomPDAs(params: {
  host:          PublicKey;
  roomId:        string;
  includePlayer?: PublicKey;
}): {
  room:        PublicKey;
  roomVault:   PublicKey;
  playerEntry?: PublicKey;
} {
  console.log('[PDA] 📦 Batch deriving PDAs for room:', params.roomId);

  const [room]      = deriveRoomPDA(params.host, params.roomId);
  const [roomVault] = deriveRoomVaultPDA(room);

  let playerEntry: PublicKey | undefined;
  if (params.includePlayer) {
    [playerEntry] = derivePlayerEntryPDA(room, params.includePlayer);
  }

  console.log('[PDA] ✅ Batch derivation complete');
  return { room, roomVault, playerEntry };
}

