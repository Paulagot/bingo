// server/campaigns/services/campaignPuzzleAccessService.js
//
// Creates puzzle access records for puzzle_entry campaign entries.
// MVP stub — flesh out when puzzle challenge game is ready.

import { connection, TABLE_PREFIX } from '../../config/database.js';
import { nanoid } from 'nanoid';

const T_ENTRIES = `${TABLE_PREFIX}campaign_entries`;

export async function createPuzzleAccessForEntry(entryId, context) {
  const { order, productItem } = context;

  // Assign a random puzzle from the event pool.
  // Replace this with your actual puzzle pool query when puzzle tables exist.
  const puzzleAccessId = nanoid(16);
  const accessToken    = nanoid(20);
  const puzzleUrl      = `/puzzle/${productItem.target_room_id}?access=${accessToken}`;
  const entryCode      = `PZ-${nanoid(8).toUpperCase()}`;

  // For MVP, store access details on the entry itself.
  // When puzzle access table exists, insert there and store linked_puzzle_access_id.
  await connection.execute(
    `UPDATE ${T_ENTRIES}
     SET entry_code  = ?,
         join_url    = ?,
         metadata_json = JSON_SET(COALESCE(metadata_json,'{}'),
           '$.puzzleAccessId', ?,
           '$.accessToken',    ?,
           '$.roomId',         ?)
     WHERE id = ?`,
    [entryCode, puzzleUrl, puzzleAccessId, accessToken, productItem.target_room_id, entryId]
  );

  console.log(`[PuzzleAccess] ✅ Puzzle access created for entry ${entryId}`);
  return { puzzleAccessId, accessToken, puzzleUrl };
}