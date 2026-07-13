// server/peerFundraising/services/peerPuzzleAccessService.js
//
// Creates puzzle access records for puzzle_entry peer entries.
// MVP stub — mirrors campaignPuzzleAccessService.js. Peer had no equivalent
// at all; puzzle_entry items previously fell through to the generic
// entry-code branch in peerEntryExpansionService.js, so any puzzle-based
// pack produced an entry with no real puzzle access at all.

import { connection, TABLE_PREFIX } from '../../config/database.js';
import { nanoid } from 'nanoid';

const E = `${TABLE_PREFIX}peer_entries`;

export async function createPuzzleAccessForPeerEntry(entryId, context) {
  const { packItem } = context;

  // Assign a random puzzle from the event pool.
  // Replace this with a real puzzle pool query when puzzle tables exist —
  // same TODO as campaignPuzzleAccessService.js.
  const puzzleAccessId = nanoid(16);
  const accessToken    = nanoid(20);
  const puzzleUrl      = `/puzzle/${packItem.target_room_id}?access=${accessToken}`;
  const entryCode      = `PE-${nanoid(8).toUpperCase()}`;

  await connection.execute(
    `UPDATE ${E}
     SET entry_code   = ?,
         join_url     = ?,
         status       = 'confirmed',
         confirmed_at = UTC_TIMESTAMP(),
         metadata_json = JSON_SET(COALESCE(metadata_json,'{}'),
           '$.puzzleAccessId', ?,
           '$.accessToken',    ?,
           '$.roomId',         ?)
     WHERE id = ?`,
    [entryCode, puzzleUrl, puzzleAccessId, accessToken, packItem.target_room_id, entryId]
  );

  console.log(`[PeerPuzzleAccess] ✅ Puzzle access created for entry ${entryId}`);
  return { puzzleAccessId, accessToken, puzzleUrl };
}