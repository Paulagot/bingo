// Summer Quest — Parent Player Access Service
// Every function here takes BOTH parentId and playerId and verifies
// ownership before returning anything. This is the single place that
// enforces "a parent can only see their own child" (spec section 18) —
// routes should never query fundraisely_tt_players directly by
// playerId alone for parent-facing endpoints.

export class SummerQuestOwnershipError extends Error {}

export async function assertParentOwnsPlayer(pool, { parentId, playerId }) {
  const [rows] = await pool.execute(
    `SELECT id FROM fundraisely_tt_players WHERE id = ? AND parent_id = ? LIMIT 1`,
    [playerId, parentId]
  );
  if (rows.length === 0) {
    throw new SummerQuestOwnershipError('Player not found for this account.');
  }
}

export async function getPlayersForParent(pool, { parentId }) {
  const [rows] = await pool.execute(
    `SELECT id, display_name, internal_name, squad, is_active, created_at
     FROM fundraisely_tt_players
     WHERE parent_id = ?
     ORDER BY created_at ASC`,
    [parentId]
  );
  return rows;
}

export async function getPlayerForParent(pool, { parentId, playerId }) {
  await assertParentOwnsPlayer(pool, { parentId, playerId });
  const [rows] = await pool.execute(
    `SELECT id, display_name, internal_name, squad, is_active, created_at
     FROM fundraisely_tt_players
     WHERE id = ? AND parent_id = ?
     LIMIT 1`,
    [playerId, parentId]
  );
  return rows[0] || null;
}

export async function resetPlayerCode(pool, { parentId, playerId, newPlayerCodeHash }) {
  await assertParentOwnsPlayer(pool, { parentId, playerId });
  await pool.execute(
    `UPDATE fundraisely_tt_players SET player_code_hash = ?, updated_at = NOW() WHERE id = ?`,
    [newPlayerCodeHash, playerId]
  );
}
