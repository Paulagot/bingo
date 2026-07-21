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

// Any single gap between saves longer than this is capped rather than
// counted in full — this is what stops a backgrounded/idle tab (or someone
// stepping away) from inflating active_seconds, without punishing the
// player for it either. It also bounds how much a single "leave the save
// call running in a background tab" trick could add per ping.
const MAX_HEARTBEAT_GAP_SECONDS = 120;

function parseMysqlDateTimeAsUtcMs(value) {
  if (!value) return null;
  if (value instanceof Date) return value.getTime();
  return new Date(`${String(value).replace(' ', 'T')}Z`).getTime();
}

export async function saveProgress({ instanceId, playerId, clubId, progressData }) {
  const [rows] = await database.connection.execute(
    `SELECT active_seconds, last_ping_at
     FROM fundraisely_puzzle_progress
     WHERE instance_id = ? AND player_id = ?
     LIMIT 1`,
    [instanceId, playerId]
  );

  const prev = rows?.[0];
  const lastPingMs = parseMysqlDateTimeAsUtcMs(prev?.last_ping_at);
  const nowMs = Date.now();

  let deltaSeconds = 0;
  if (lastPingMs !== null) {
    deltaSeconds = Math.max(0, Math.round((nowMs - lastPingMs) / 1000));
    deltaSeconds = Math.min(deltaSeconds, MAX_HEARTBEAT_GAP_SECONDS);
  }
  // No previous ping (first save this session) contributes 0 — we don't
  // know how long they'd already been looking at the puzzle before their
  // first autosave fired, so we deliberately undercount rather than guess.

  const nextActiveSeconds = (prev?.active_seconds ?? 0) + deltaSeconds;

  await database.connection.execute(
    `INSERT INTO fundraisely_puzzle_progress
       (instance_id, player_id, club_id, progress_data, active_seconds, last_ping_at)
     VALUES (?, ?, ?, ?, ?, UTC_TIMESTAMP())
     ON DUPLICATE KEY UPDATE
       progress_data  = VALUES(progress_data),
       active_seconds = ?,
       last_ping_at   = UTC_TIMESTAMP(),
       updated_at     = UTC_TIMESTAMP()`,
    [instanceId, playerId, clubId, JSON.stringify(progressData), nextActiveSeconds, nextActiveSeconds]
  );
}

export async function loadProgress(instanceId, playerId) {
  const [rows] = await database.connection.execute(
    `SELECT progress_data, active_seconds, last_ping_at, updated_at
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
    activeSeconds: rows[0].active_seconds ?? 0,
    lastPingAtMs: parseMysqlDateTimeAsUtcMs(rows[0].last_ping_at),
    updatedAt: rows[0].updated_at,
  };
}

/**
 * Best-effort, server-tracked "how long has this player actually been
 * engaged with this puzzle" — NOT simple wall-clock since first view, so a
 * genuine interruption (mid-puzzle break) doesn't tank their time bonus.
 *
 * Made up of:
 *   - active_seconds accumulated from autosave heartbeats so far, PLUS
 *   - the capped gap between the last heartbeat and right now (the final,
 *     not-yet-saved stretch of play between their last autosave and
 *     hitting Submit).
 *
 * Falls back to elapsed-since-first-view (capped) if the player submitted
 * before any autosave ever fired — e.g. a puzzle solved fast enough that
 * the autosave interval never ticked. Falls back to null (caller decides
 * what to do — see puzzleValidationService) if there's no tracking data at
 * all, which will only happen for sessions that predate this feature.
 */
export async function getTrustedElapsedSeconds({ instanceId, playerId }) {
  const progress = await loadProgress(instanceId, playerId);
  const nowMs = Date.now();

  if (progress?.lastPingAtMs) {
    const finalGapSeconds = Math.min(
      MAX_HEARTBEAT_GAP_SECONDS,
      Math.max(0, Math.round((nowMs - progress.lastPingAtMs) / 1000))
    );
    return progress.activeSeconds + finalGapSeconds;
  }

  const firstViewedAtMs = await getFirstViewedAtMs(instanceId, playerId);
  if (firstViewedAtMs !== null) {
    // No autosave ever fired for this session — most likely a quick solve.
    // Cap generously (10 min) rather than trusting raw wall-clock, since we
    // have no heartbeat data to tell "quick solve" apart from "opened it,
    // walked away for hours, came straight back and submitted."
    const rawElapsed = Math.max(0, Math.round((nowMs - firstViewedAtMs) / 1000));
    return Math.min(rawElapsed, 600);
  }

  return null;
}