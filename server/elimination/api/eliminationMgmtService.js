// server/elimination/api/eliminationMgmtService.js
//
// DB operations for the elimination management system.
// Mirrors the pattern used by web2-rooms.js for quiz rooms.
// All operations are scoped to club_id — never expose rows across clubs.

import { connection, TABLE_PREFIX } from '../../config/database.js';

const TABLE = `${TABLE_PREFIX}web2_quiz_rooms`;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toMysqlUtcDateTime(value) {
  if (value === null || value === undefined || value === '') return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`;
}

function toPositiveNumber(value) {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function safeJsonParam(v) {
  if (v === undefined) return undefined;
  if (v === null) return null;
  if (typeof v === 'string') {
    try { JSON.parse(v); return v; } catch { return undefined; }
  }
  try { return JSON.stringify(v); } catch { return undefined; }
}

const ALLOWED_STATUSES = ['scheduled', 'open', 'live', 'completed', 'cancelled'];

function isAllowedStatus(s) {
  return ALLOWED_STATUSES.includes(String(s));
}

// ─── Schedule ─────────────────────────────────────────────────────────────────

/**
 * Insert a new scheduled elimination room.
 *
 * config_json shape saved here:
 * {
 *   gameType:         'elimination',
 *   paymentMode:      'web2',
 *   entryFee:         number,
 *   currency:         'EUR' | 'GBP' | 'USD' | 'CAD' | 'NGN',
 *   maxPlayers:       number,
 *   hostId:           string,
 *   hostName:         string,
 *   prizeDescription: string,   // also mirrored to dedicated column
 *   prizeValue:       number | null,
 * }
 *
 * @returns {{ roomId, hostId, status, scheduledAt }}
 */
export async function scheduleEliminationRoom({
  clubId,
  roomId,
  hostId,
  hostName,
  scheduledAt,
  timeZone,
  entryFee,
  currency,
  maxPlayers,
  prizeDescription,
  prizeValue,
}) {
  // ── Validate required fields ───────────────────────────────────────────────
  if (!clubId)   throw Object.assign(new Error('clubId required'),   { statusCode: 400 });
  if (!roomId)   throw Object.assign(new Error('roomId required'),   { statusCode: 400 });
  if (!hostId)   throw Object.assign(new Error('hostId required'),   { statusCode: 400 });

  const fee = toPositiveNumber(entryFee);
  if (!fee) throw Object.assign(new Error('ENTRY_FEE_REQUIRED'), { statusCode: 400 });

  const players = toPositiveNumber(maxPlayers);
  if (!players || players < 2 || players > 500) {
    throw Object.assign(
      new Error('MAX_PLAYERS_INVALID — must be between 2 and 500'),
      { statusCode: 400 }
    );
  }

  if (!prizeDescription || !String(prizeDescription).trim()) {
    throw Object.assign(new Error('PRIZE_DESCRIPTION_REQUIRED'), { statusCode: 400 });
  }

  const SUPPORTED_CURRENCIES = ['EUR', 'GBP', 'USD', 'CAD', 'NGN'];
  const resolvedCurrency = SUPPORTED_CURRENCIES.includes(currency) ? currency : 'EUR';

  const scheduledAtMysql = toMysqlUtcDateTime(scheduledAt);
  const status =
    scheduledAtMysql && new Date(scheduledAt).getTime() > Date.now()
      ? 'scheduled'
      : 'live';

  const configJson = {
    gameType:         'elimination',
    paymentMode:      'web2',
    entryFee:         fee,
    currency:         resolvedCurrency,
    maxPlayers:       players,
    hostId,
    hostName:         hostName ?? null,
    prizeDescription: String(prizeDescription).trim(),
    prizeValue:       toPositiveNumber(prizeValue) ?? null,
  };

  const sql = `
    INSERT INTO ${TABLE}
      (room_id, host_id, club_id, game_type, status,
       scheduled_at, time_zone,
       config_json, room_caps_json,
       prize_description, prize_value)
    VALUES
      (?, ?, ?, 'elimination', ?,
       ?, ?,
       ?, NULL,
       ?, ?)
  `;

  const params = [
    roomId,
    hostId,
    clubId,
    status,
    scheduledAtMysql,
    timeZone ?? null,
    JSON.stringify(configJson),
    String(prizeDescription).trim(),
    toPositiveNumber(prizeValue) ?? null,
  ];

  await connection.execute(sql, params);

  return { roomId, hostId, status, scheduledAt: scheduledAtMysql };
}

// ─── List ─────────────────────────────────────────────────────────────────────

/**
 * List elimination rooms for a club.
 * Mirrors quiz web2-rooms.js list pattern exactly.
 *
 * @param {{ clubId, status?, time? }}
 */
export async function listEliminationRooms({ clubId, status = 'all', time = 'all' }) {
  if (!clubId) throw Object.assign(new Error('clubId required'), { statusCode: 400 });

  const where = [`club_id = ?`, `game_type = 'elimination'`];
  const params = [clubId];

  if (status !== 'all') {
    if (!isAllowedStatus(status)) {
      throw Object.assign(new Error('invalid_status'), { statusCode: 400 });
    }
    where.push('status = ?');
    params.push(status);
  }

  if (time === 'upcoming') {
    where.push('(scheduled_at IS NULL OR scheduled_at >= (UTC_TIMESTAMP() - INTERVAL 12 HOUR))');
  } else if (time === 'past') {
    where.push('(scheduled_at IS NOT NULL AND scheduled_at < UTC_TIMESTAMP())');
  }

  const orderBy =
    time === 'past'
      ? 'ORDER BY scheduled_at DESC, created_at DESC'
      : 'ORDER BY scheduled_at ASC, created_at DESC';

  const sql = `
    SELECT
      room_id, host_id, club_id, game_type, status,
      scheduled_at, ended_at, time_zone,
      config_json, room_caps_json,
      prize_description, prize_value,
      created_at, updated_at
    FROM ${TABLE}
    WHERE ${where.join(' AND ')}
    ${orderBy}
    LIMIT 200
  `;

  const [rows] = await connection.execute(sql, params);
  return rows;
}

// ─── Get single ───────────────────────────────────────────────────────────────

/**
 * Fetch a single elimination room — club-scoped for security.
 */
export async function getEliminationRoom({ clubId, roomId }) {
  if (!clubId || !roomId) {
    throw Object.assign(new Error('clubId and roomId required'), { statusCode: 400 });
  }

  const sql = `
    SELECT
      room_id, host_id, club_id, game_type, status,
      scheduled_at, ended_at, time_zone,
      config_json, room_caps_json,
      prize_description, prize_value,
      created_at, updated_at
    FROM ${TABLE}
    WHERE club_id = ? AND room_id = ? AND game_type = 'elimination'
    LIMIT 1
  `;

  const [rows] = await connection.execute(sql, [clubId, roomId]);
  return rows?.[0] ?? null;
}

// ─── Update (scheduled rooms only) ───────────────────────────────────────────

/**
 * Edit a scheduled elimination room.
 * Only allowed while status = 'scheduled'.
 * Mirrors the quiz PATCH pattern from web2-rooms.js.
 */
export async function updateEliminationRoom({
  clubId,
  roomId,
  scheduledAt,
  timeZone,
  entryFee,
  currency,
  maxPlayers,
  prizeDescription,
  prizeValue,
  configJson: rawConfigJson,
}) {
  if (!clubId || !roomId) {
    throw Object.assign(new Error('clubId and roomId required'), { statusCode: 400 });
  }

  // Status gate — load current row first
  const [existingRows] = await connection.execute(
    `SELECT room_id, status, config_json FROM ${TABLE}
     WHERE club_id = ? AND room_id = ? AND game_type = 'elimination' LIMIT 1`,
    [clubId, roomId]
  );

  if (!existingRows?.length) {
    throw Object.assign(new Error('not_found'), { statusCode: 404 });
  }

  const existing = existingRows[0];
  if (existing.status !== 'scheduled') {
    throw Object.assign(
      new Error('room_not_editable — only scheduled rooms can be edited'),
      { statusCode: 409, currentStatus: existing.status }
    );
  }

  // Merge incoming fields over existing config_json
  const currentConfig =
    typeof existing.config_json === 'string'
      ? JSON.parse(existing.config_json)
      : (existing.config_json ?? {});

  const SUPPORTED_CURRENCIES = ['EUR', 'GBP', 'USD', 'CAD', 'NGN'];

  const mergedConfig = {
    ...currentConfig,
    ...(entryFee      !== undefined && { entryFee:  toPositiveNumber(entryFee) ?? currentConfig.entryFee }),
    ...(currency      !== undefined && { currency:  SUPPORTED_CURRENCIES.includes(currency) ? currency : currentConfig.currency }),
    ...(maxPlayers    !== undefined && { maxPlayers: toPositiveNumber(maxPlayers) ?? currentConfig.maxPlayers }),
    ...(prizeDescription !== undefined && { prizeDescription: String(prizeDescription).trim() }),
    ...(prizeValue    !== undefined && { prizeValue: toPositiveNumber(prizeValue) ?? null }),
  };

  // Allow a full config_json override if caller passes one (e.g. edit wizard)
  const finalConfig = rawConfigJson !== undefined
    ? (safeJsonParam(rawConfigJson) ?? JSON.stringify(mergedConfig))
    : JSON.stringify(mergedConfig);

  const sets = [];
  const params = [];

  if (scheduledAt !== undefined) {
    sets.push('scheduled_at = ?');
    params.push(toMysqlUtcDateTime(scheduledAt));
  }

  if (timeZone !== undefined) {
    sets.push('time_zone = ?');
    params.push(timeZone ? String(timeZone).trim() : null);
  }

  // Always update config_json when any config field changes
  sets.push('config_json = CAST(? AS JSON)');
  params.push(finalConfig);

  // Mirror prize fields to dedicated columns
  if (prizeDescription !== undefined) {
    sets.push('prize_description = ?');
    params.push(String(prizeDescription).trim() || null);
  }

  if (prizeValue !== undefined) {
    sets.push('prize_value = ?');
    params.push(toPositiveNumber(prizeValue) ?? null);
  }

  if (!sets.length) {
    throw Object.assign(new Error('no_fields_to_update'), { statusCode: 400 });
  }

  sets.push('updated_at = UTC_TIMESTAMP()');

  const updateSql = `
    UPDATE ${TABLE}
    SET ${sets.join(', ')}
    WHERE club_id = ? AND room_id = ? AND game_type = 'elimination' AND status = 'scheduled'
    LIMIT 1
  `;

  const [result] = await connection.execute(updateSql, [...params, clubId, roomId]);

  if (!result?.affectedRows) {
    throw Object.assign(
      new Error('update_failed_or_room_changed'),
      { statusCode: 409 }
    );
  }

  // Return fresh row
  return getEliminationRoom({ clubId, roomId });
}

// ─── Cancel ───────────────────────────────────────────────────────────────────

/**
 * Cancel a scheduled or open elimination room.
 * Mirrors the quiz cancel pattern.
 */
export async function cancelEliminationRoom({ clubId, roomId }) {
  if (!clubId || !roomId) {
    throw Object.assign(new Error('clubId and roomId required'), { statusCode: 400 });
  }

  const sql = `
    UPDATE ${TABLE}
    SET status = 'cancelled', updated_at = UTC_TIMESTAMP()
    WHERE club_id = ? AND room_id = ? AND game_type = 'elimination'
      AND status IN ('scheduled', 'open')
    LIMIT 1
  `;

  const [result] = await connection.execute(sql, [clubId, roomId]);

  if (!result?.affectedRows) {
    // Find out why — not found, or wrong status
    const [rows] = await connection.execute(
      `SELECT status FROM ${TABLE}
       WHERE club_id = ? AND room_id = ? AND game_type = 'elimination' LIMIT 1`,
      [clubId, roomId]
    );
    if (!rows?.length) throw Object.assign(new Error('not_found'), { statusCode: 404 });
    throw Object.assign(
      new Error('room_not_cancellable — only scheduled or open rooms can be cancelled'),
      { statusCode: 409, currentStatus: rows[0].status }
    );
  }

  return { ok: true };
}

// ─── Hydrate ──────────────────────────────────────────────────────────────────

/**
 * Load a DB elimination room into the socket server's in-memory store.
 * Called when a host clicks "Launch" on the dashboard.
 *
 * Returns the full config so the frontend can open the game tab with
 * the correct roomId and hostId.
 *
 * @returns {{ roomId, hostId, status, config, hydrated, alreadyExisted }}
 */
export async function hydrateEliminationRoom({ clubId, roomId, createRoomFromConfig }) {
  if (!clubId || !roomId) {
    throw Object.assign(new Error('clubId and roomId required'), { statusCode: 400 });
  }

  const row = await getEliminationRoom({ clubId, roomId });
  if (!row) throw Object.assign(new Error('not_found'), { statusCode: 404 });

  const config =
    typeof row.config_json === 'string'
      ? JSON.parse(row.config_json)
      : (row.config_json ?? {});

  // Ensure IDs are present in config for downstream use
  config.hostId  = row.host_id;
  config.clubId  = row.club_id;
  config.roomId  = row.room_id;

  // createRoomFromConfig is injected by the route handler to avoid a
  // circular import between the DB service and the socket room manager.
  const room = createRoomFromConfig(row.room_id, row.host_id, config.hostName, config);
  const alreadyExisted = !room || room.createdAt !== config.createdAt;

  return {
    roomId:        row.room_id,
    hostId:        row.host_id,
    status:        row.status,
    config,
    hydrated:      true,
    alreadyExisted,
  };
}