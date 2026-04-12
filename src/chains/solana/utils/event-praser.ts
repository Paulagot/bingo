/**
 * Solana Event Parsing Utilities — IDL-verified (newquiz.json)
 *
 * ## RoomEnded event — what changed
 *
 * Old fields: room, winners, platform_amount, host_amount, charity_amount,
 *             intent_id_hash, prize_amount, total_players, timestamp
 *
 * New fields: room, room_id, winners, total_distributed, charity_amount,
 *             intent_id_hash, timestamp
 *
 * platform_amount, host_amount, prize_amount, total_players are GONE.
 * room_id (string) is NEW.
 * total_distributed (u64) is NEW.
 */

import { BN } from '@coral-xyz/anchor';
import { PublicKey } from '@solana/web3.js';

// ---------------------------------------------------------------------------
// RoomEnded
// ---------------------------------------------------------------------------

export interface RoomEndedEvent {
  room:             PublicKey;
  roomId:           string;
  winners:          PublicKey[];
  totalDistributed: BN;
  charityAmount:    BN;
  intentIdHash:     number[];
  timestamp:        BN;
}

/**
 * Parse RoomEnded event from transaction logs.
 *
 * Anchor emits events as "Program data: <base64>" log lines.
 * The first 8 bytes are the event discriminator from the IDL.
 *
 * RoomEnded discriminator (from newquiz.json):
 *   [204, 239, 146, 218, 190, 21, 193, 184]
 *
 * Layout after discriminator:
 *   room             pubkey    32 bytes
 *   room_id          string    4-byte length prefix + N bytes
 *   winners          vec<pubkey>  4-byte length + N*32 bytes
 *   total_distributed u64      8 bytes (little-endian)
 *   charity_amount   u64       8 bytes (little-endian)
 *   intent_id_hash   [u8;32]   32 bytes
 *   timestamp        i64       8 bytes (little-endian)
 */
export function parseRoomEndedEvent(
  logs:     string[],
  decimals: number = 6
): {
  event:               RoomEndedEvent | null;
  charityAmountDecimal: string | null;
} {
  console.log('[EventParser] 🔍 Parsing RoomEnded event...');

  if (!logs || logs.length === 0) {
    console.warn('[EventParser] ⚠️ No logs provided');
    return { event: null, charityAmountDecimal: null };
  }

  const DISCRIMINATOR = [204, 239, 146, 218, 190, 21, 193, 184];

  for (const log of logs) {
    if (!log.includes('Program data:')) continue;

    try {
      const base64Data = log.split('Program data: ')[1]?.trim();
      if (!base64Data) continue;

      const buffer = Buffer.from(base64Data, 'base64');

      // Check discriminator
      const discriminator = Array.from(buffer.slice(0, 8));
      const isMatch = discriminator.every((byte, i) => byte === DISCRIMINATOR[i]);
      if (!isMatch) continue;

      console.log('[EventParser] ✅ Found RoomEnded event');

      let offset = 8;

      // room (pubkey — 32 bytes)
      const room = new PublicKey(buffer.slice(offset, offset + 32));
      offset += 32;

      // room_id (string — 4-byte LE length + bytes)
      const roomIdLen = buffer.readUInt32LE(offset);
      offset += 4;
      const roomId = buffer.slice(offset, offset + roomIdLen).toString('utf8');
      offset += roomIdLen;

      // winners (vec<pubkey> — 4-byte LE length + N*32 bytes)
      const winnersLen = buffer.readUInt32LE(offset);
      offset += 4;
      const winners: PublicKey[] = [];
      for (let i = 0; i < winnersLen; i++) {
        winners.push(new PublicKey(buffer.slice(offset, offset + 32)));
        offset += 32;
      }

      // total_distributed (u64 — 8 bytes LE)
      const totalDistributed = new BN(buffer.slice(offset, offset + 8), 'le');
      offset += 8;

      // charity_amount (u64 — 8 bytes LE)
      const charityAmount = new BN(buffer.slice(offset, offset + 8), 'le');
      offset += 8;

      // intent_id_hash ([u8;32])
      const intentIdHash = Array.from(buffer.slice(offset, offset + 32));
      offset += 32;

      // timestamp (i64 — 8 bytes LE)
      const timestamp = new BN(buffer.slice(offset, offset + 8), 'le');
      offset += 8;

      const event: RoomEndedEvent = {
        room,
        roomId,
        winners,
        totalDistributed,
        charityAmount,
        intentIdHash,
        timestamp,
      };

      const charityAmountDecimal = (
        Number(charityAmount.toString()) / Math.pow(10, decimals)
      ).toFixed(decimals);

      console.log('[EventParser] 📊 RoomEnded parsed:');
      console.log('[EventParser]   Room:              ', room.toBase58());
      console.log('[EventParser]   Room ID:           ', roomId);
      console.log('[EventParser]   Winners:           ', winners.length);
      console.log('[EventParser]   Total distributed: ', totalDistributed.toString());
      console.log('[EventParser]   Charity amount:    ', charityAmountDecimal);

      return { event, charityAmountDecimal };
    } catch (error: any) {
      console.error('[EventParser] ❌ Error parsing log:', error.message);
      continue;
    }
  }

  console.warn('[EventParser] ⚠️ RoomEnded event not found in logs');
  return { event: null, charityAmountDecimal: null };
}

/**
 * Fetch transaction and parse RoomEnded event with retries.
 */
export async function fetchAndParseRoomEndedEvent(
  connection: any,
  signature:  string,
  decimals:   number = 6,
  maxRetries: number = 10
): Promise<{
  event:               RoomEndedEvent | null;
  charityAmountDecimal: string | null;
}> {
  console.log('[EventParser] 🔍 Fetching transaction:', signature);

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const tx = await connection.getTransaction(signature, {
        maxSupportedTransactionVersion: 0,
        commitment:                     'confirmed',
      });

      if (!tx) {
        console.log(`[EventParser] ⏳ Not confirmed yet (attempt ${attempt + 1}/${maxRetries})`);
        await new Promise((r) => setTimeout(r, Math.min(1000 * Math.pow(2, attempt), 5000)));
        continue;
      }

      if (!tx.meta) {
        console.warn('[EventParser] ⚠️ Transaction has no metadata');
        return { event: null, charityAmountDecimal: null };
      }

      const logs = tx.meta.logMessages || [];
      console.log('[EventParser] 📜 Found', logs.length, 'log messages');

      return parseRoomEndedEvent(logs, decimals);
    } catch (error: any) {
      console.error('[EventParser] ❌ Fetch error:', error.message);
      if (attempt === maxRetries - 1) {
        return { event: null, charityAmountDecimal: null };
      }
      await new Promise((r) => setTimeout(r, 1000));
    }
  }

  return { event: null, charityAmountDecimal: null };
}

// ---------------------------------------------------------------------------
// WinnersDeclared (discriminator unchanged from IDL)
// ---------------------------------------------------------------------------

export interface WinnersDeclaredEvent {
  room:      PublicKey;
  roomId:    string;
  winners:   PublicKey[];
  timestamp: BN;
}

export function parseWinnersDeclaredEvent(logs: string[]): WinnersDeclaredEvent | null {
  console.log('[EventParser] 🔍 Parsing WinnersDeclared event...');

  if (!logs || logs.length === 0) return null;

  const DISCRIMINATOR = [60, 25, 114, 88, 126, 49, 88, 136];

  for (const log of logs) {
    if (!log.includes('Program data:')) continue;

    try {
      const base64Data = log.split('Program data: ')[1]?.trim();
      if (!base64Data) continue;

      const buffer       = Buffer.from(base64Data, 'base64');
      const discriminator = Array.from(buffer.slice(0, 8));
      const isMatch      = discriminator.every((byte, i) => byte === DISCRIMINATOR[i]);
      if (!isMatch) continue;

      console.log('[EventParser] ✅ Found WinnersDeclared event');

      let offset = 8;

      // room (pubkey)
      const room = new PublicKey(buffer.slice(offset, offset + 32));
      offset += 32;

      // room_id (string)
      const roomIdLen = buffer.readUInt32LE(offset);
      offset += 4;
      const roomId = buffer.slice(offset, offset + roomIdLen).toString('utf8');
      offset += roomIdLen;

      // winners (vec<pubkey>)
      const winnersLen = buffer.readUInt32LE(offset);
      offset += 4;
      const winners: PublicKey[] = [];
      for (let i = 0; i < winnersLen; i++) {
        winners.push(new PublicKey(buffer.slice(offset, offset + 32)));
        offset += 32;
      }

      // timestamp (i64)
      const timestamp = new BN(buffer.slice(offset, offset + 8), 'le');

      console.log('[EventParser] 📊 WinnersDeclared:', {
        room:    room.toBase58(),
        roomId,
        winners: winners.map((w) => w.toBase58()),
      });

      return { room, roomId, winners, timestamp };
    } catch (error: any) {
      console.error('[EventParser] ❌ Error parsing WinnersDeclared:', error.message);
      continue;
    }
  }

  console.warn('[EventParser] ⚠️ WinnersDeclared event not found');
  return null;
}

// ---------------------------------------------------------------------------
// RoomRefunded (new event in newquiz contract)
// discriminator: [130, 254, 121, 123, 177, 246, 157, 201]
// fields: room, room_id, player_count, platform_retained, timestamp
// ---------------------------------------------------------------------------

export interface RoomRefundedEvent {
  room:              PublicKey;
  roomId:            string;
  playerCount:       number;
  platformRetained:  BN;
  timestamp:         BN;
}

export function parseRoomRefundedEvent(logs: string[]): RoomRefundedEvent | null {
  console.log('[EventParser] 🔍 Parsing RoomRefunded event...');

  if (!logs || logs.length === 0) return null;

  const DISCRIMINATOR = [130, 254, 121, 123, 177, 246, 157, 201];

  for (const log of logs) {
    if (!log.includes('Program data:')) continue;

    try {
      const base64Data = log.split('Program data: ')[1]?.trim();
      if (!base64Data) continue;

      const buffer       = Buffer.from(base64Data, 'base64');
      const discriminator = Array.from(buffer.slice(0, 8));
      const isMatch      = discriminator.every((byte, i) => byte === DISCRIMINATOR[i]);
      if (!isMatch) continue;

      console.log('[EventParser] ✅ Found RoomRefunded event');

      let offset = 8;

      // room (pubkey)
      const room = new PublicKey(buffer.slice(offset, offset + 32));
      offset += 32;

      // room_id (string)
      const roomIdLen = buffer.readUInt32LE(offset);
      offset += 4;
      const roomId = buffer.slice(offset, offset + roomIdLen).toString('utf8');
      offset += roomIdLen;

      // player_count (u32)
      const playerCount = buffer.readUInt32LE(offset);
      offset += 4;

      // platform_retained (u64)
      const platformRetained = new BN(buffer.slice(offset, offset + 8), 'le');
      offset += 8;

      // timestamp (i64)
      const timestamp = new BN(buffer.slice(offset, offset + 8), 'le');

      console.log('[EventParser] 📊 RoomRefunded:', {
        room:             room.toBase58(),
        roomId,
        playerCount,
        platformRetained: platformRetained.toString(),
      });

      return { room, roomId, playerCount, platformRetained, timestamp };
    } catch (error: any) {
      console.error('[EventParser] ❌ Error parsing RoomRefunded:', error.message);
      continue;
    }
  }

  console.warn('[EventParser] ⚠️ RoomRefunded event not found');
  return null;
}