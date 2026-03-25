import database from '../../config/database.js';

export async function saveProgress({ instanceId, playerId, clubId, progressData }) {
  await database.connection.execute(
    `INSERT INTO fundraisely_puzzle_progress (instance_id, player_id, club_id, progress_data)
     VALUES (?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       progress_data = VALUES(progress_data),
       updated_at    = NOW()`,
    [instanceId, playerId, clubId, JSON.stringify(progressData)]
  );
}

export async function loadProgress(instanceId, playerId) {
  const [rows] = await database.connection.execute(
    `SELECT progress_data, updated_at
     FROM fundraisely_puzzle_progress
     WHERE instance_id = ? AND player_id = ?
     LIMIT 1`,
    [instanceId, playerId]
  );

  if (!rows?.length) return null;

  return {
    progressData: typeof rows[0].progress_data === 'string'
      ? JSON.parse(rows[0].progress_data)
      : rows[0].progress_data,
    updatedAt: rows[0].updated_at,
  };
}