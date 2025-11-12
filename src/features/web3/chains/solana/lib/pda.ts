// src/features/web3/chains/solana/lib/pda.ts
// Program Derived Address (PDA) derivation utilities

import { PublicKey } from '@solana/web3.js';
import { PROGRAM_ID, PDA_SEEDS } from '../config';

/**
 * Derives GlobalConfig PDA
 * Seeds: ["global-config"]
 */
export function deriveGlobalConfigPDA(): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from(PDA_SEEDS.GLOBAL_CONFIG)],
    PROGRAM_ID
  );
}

/**
 * Derives Room PDA
 * Seeds: ["room", host_pubkey, room_id]
 */
export function deriveRoomPDA(host: PublicKey, roomId: string): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from(PDA_SEEDS.ROOM), host.toBuffer(), Buffer.from(roomId)],
    PROGRAM_ID
  );
}

/**
 * Derives RoomVault PDA (token account owned by room)
 * Seeds: ["room-vault", room_pubkey]
 */
export function deriveRoomVaultPDA(room: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from(PDA_SEEDS.ROOM_VAULT), room.toBuffer()],
    PROGRAM_ID
  );
}

/**
 * Derives PlayerEntry PDA
 * Seeds: ["player", room_pubkey, player_pubkey]
 */
export function derivePlayerEntryPDA(room: PublicKey, player: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from(PDA_SEEDS.PLAYER), room.toBuffer(), player.toBuffer()],
    PROGRAM_ID
  );
}

/**
 * Derives TokenRegistry PDA
 * Seeds: ["approved_tokens"]
 */
export function deriveTokenRegistryPDA(): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from(PDA_SEEDS.APPROVED_TOKENS)],
    PROGRAM_ID
  );
}

