import database from '../../config/database.js';

/**
 * Record the FIRST time a player is served a playable puzzle instance.
 * Lives in its own table (not fundraisely_puzzle_progress) because a
 * progress row is created on save with real progress_data — piggybacking
 * on it would force the GET route to insert placeholder progress rows,
 * changing what loadProgress returns to the frontend.
 *
 * INSERT IGNORE + composite PK means calling this on every GET is safe:
 * only the first call ever writes; reloads never move the clock.
 */
export async function recordFirstView({ instanceId, playerId, clubId }) {
  await database.connection.execute(
    `INSERT IGNORE INTO fundraisely_puzzle_views
       (instance_id, player_id, club_id, first_viewed_at)
     VALUES (?, ?, ?, UTC_TIMESTAMP())`,
    [instanceId, playerId, clubId ?? null]
  );
}

/**
 * Returns the first-view timestamp (ms since epoch, UTC) for this
 * player+instance, or null if never recorded (e.g. plays that predate the
 * views table migration).
 */
export async function getFirstViewedAtMs(instanceId, playerId) {
  const [rows] = await database.connection.execute(
    `SELECT first_viewed_at
     FROM fundraisely_puzzle_views
     WHERE instance_id = ? AND player_id = ?
     LIMIT 1`,
    [instanceId, playerId]
  );

  if (!rows?.length || !rows[0].first_viewed_at) return null;

  const value = rows[0].first_viewed_at;
  // MySQL DATETIME has no timezone info — stored as UTC by recordFirstView,
  // so parse it as UTC (same convention as challengeService's
  // fromMysqlDateTimeAsUtc).
  if (value instanceof Date) return value.getTime();
  return new Date(`${String(value).replace(' ', 'T')}Z`).getTime();
}

export async function saveProgress({ instanceId, playerId, clubId, progressData }) {
  await database.connection.execute(
    `INSERT INTO fundraisely_puzzle_progress (instance_id, player_id, club_id, progress_data)
     VALUES (?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       progress_data = VALUES(progress_data),
       updated_at    = UTC_TIMESTAMP()`,
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