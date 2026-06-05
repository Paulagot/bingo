// server/elimination/api/eliminationMgmtService.js
//
// DB operations for the elimination management system.
// All operations are scoped to club_id — never expose rows across clubs.
// Status transitions:
//   scheduled → open  : hydrateEliminationRoom (host clicks Launch)
//   open      → live  : markEliminationRoomAsLive (called from socket handler on START_GAME)
//   live      → ended : saveEliminationGameStats (end of game)

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

/**
 * Normalise the prizes array from the payload.
 * Accepts either:
 *   - New shape: prizes array  [{ place, value, description, sponsor }]
 *   - Old shape: flat fields   prizeDescription / prizeValue  (legacy / migration)
 *
 * Always returns { prizes, prizeDescription, prizeValue } so the INSERT/UPDATE
 * can write both config_json.prizes AND the flat DB columns in one go.
 */
function normalisePrizes({ prizes, prizeDescription, prizeValue }) {
  // New shape — prizes array sent from frontend
  if (Array.isArray(prizes) && prizes.length > 0) {
    const winner = prizes[0]; // elimination always has exactly one prize (place 1)
    return {
      prizes,
      prizeDescription: winner.description?.trim() ?? null,
      prizeValue:       toPositiveNumber(winner.value) ?? null,
    };
  }

  // Legacy fallback — flat fields (e.g. old rooms being re-saved)
  if (prizeDescription) {
    return {
      prizes: [{
        place:       1,
        value:       toPositiveNumber(prizeValue) ?? null,
        description: prizeDescription.trim(),
        sponsor:     null,
      }],
      prizeDescription: prizeDescription.trim(),
      prizeValue:       toPositiveNumber(prizeValue) ?? null,
    };
  }

  return { prizes: [], prizeDescription: null, prizeValue: null };
}

// ─── Schedule ─────────────────────────────────────────────────────────────────

/**
 * Insert a new elimination room into the DB.
 * Status starts as 'scheduled'. No socket room is created yet.
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
  // Accept both new prizes array and legacy flat fields
  prizes,
  prizeDescription: prizeDescriptionRaw,
  prizeValue:       prizeValueRaw,
  roomCaps,
}) {
  if (!clubId) throw Object.assign(new Error('clubId required'),         { statusCode: 400 });
  if (!roomId) throw Object.assign(new Error('roomId required'),         { statusCode: 400 });
  if (!hostId) throw Object.assign(new Error('hostId required'),         { statusCode: 400 });

  const fee = toPositiveNumber(entryFee);
  if (fee === null) throw Object.assign(new Error('ENTRY_FEE_REQUIRED'), { statusCode: 400 });

  // maxPlayers is set by the route from entitlements — just sanity-check it.
  const max = typeof maxPlayers === 'number' && maxPlayers > 0 ? maxPlayers : null;
  if (max === null) throw Object.assign(new Error('MAX_PLAYERS_INVALID'), { statusCode: 400 });

  // Normalise prizes — handles both new array shape and legacy flat fields
  const normalised = normalisePrizes({
    prizes,
    prizeDescription: prizeDescriptionRaw,
    prizeValue:       prizeValueRaw,
  });

  if (!normalised.prizeDescription)
    throw Object.assign(new Error('PRIZE_DESCRIPTION_REQUIRED'), { statusCode: 400 });

  const scheduledAtMysql = toMysqlUtcDateTime(scheduledAt);

  const configJson = JSON.stringify({
    hostId,
    hostName:    hostName ?? null,
    entryFee:    fee,
    currency:    currency ?? 'EUR',
    maxPlayers:  max,
    paymentMode: 'web2',
    gameType:    'elimination',
    roomCaps:    roomCaps ?? { maxPlayers: max },
    // prizes array — same shape as quiz config_json.prizes
    prizes:      normalised.prizes,
  });

  await connection.execute(
    `INSERT INTO ${TABLE}
     (room_id, host_id, club_id, status, game_type, scheduled_at, time_zone,
      config_json, room_caps_json, prize_description, prize_value,
      reconciliation_status, created_at, updated_at)
     VALUES (?, ?, ?, 'scheduled', 'elimination', ?, ?,
             ?, ?, ?, ?,
             'pending', UTC_TIMESTAMP(), UTC_TIMESTAMP())`,
    [
      roomId, hostId, clubId, scheduledAtMysql, timeZone ?? null,
      configJson,
      JSON.stringify(roomCaps ?? { maxPlayers: max }),
      normalised.prizeDescription, normalised.prizeValue,
    ]
  );

  console.log(`[eliminationMgmtService] 📅 Scheduled elimination room ${roomId} — club: ${clubId} maxPlayers: ${max} plan: ${roomCaps?.planCode ?? 'unknown'}`);

  return {
    roomId,
    hostId,
    status:      'scheduled',
    scheduledAt: scheduledAt ?? null,
  };
}

// ─── List ─────────────────────────────────────────────────────────────────────

export async function listEliminationRooms({ clubId, status = 'all', time = 'all' }) {
  if (!clubId) throw Object.assign(new Error('clubId required'), { statusCode: 400 });

  const where  = ['club_id = ?', "game_type = 'elimination'"];
  const params = [clubId];

  const VALID_STATUSES = ['scheduled', 'open', 'live', 'ended', 'cancelled'];
  if (status !== 'all' && VALID_STATUSES.includes(status)) {
    where.push('status = ?');
    params.push(status);
  }

  if (time === 'upcoming') {
    where.push('(scheduled_at IS NULL OR scheduled_at >= (NOW() - INTERVAL 12 HOUR))');
  } else if (time === 'past') {
    where.push('(scheduled_at IS NOT NULL AND scheduled_at < NOW())');
  }

  const orderBy = time === 'past' ? 'scheduled_at DESC' : 'scheduled_at ASC';

  const [rows] = await connection.execute(
    `SELECT
       room_id, host_id, club_id, status, game_type,
       scheduled_at, time_zone, config_json,
       entry_fee, currency, max_players,
       prize_description, prize_value,
       reconciliation_status,
       created_at, updated_at
     FROM ${TABLE}
     WHERE ${where.join(' AND ')}
     ORDER BY ${orderBy}`,
    params
  );

  return rows.map((row) => ({
    ...row,
    config_json: typeof row.config_json === 'string'
      ? JSON.parse(row.config_json)
      : (row.config_json ?? {}),
  }));
}

// ─── Get single ───────────────────────────────────────────────────────────────

export async function getEliminationRoom({ clubId, roomId }) {
  if (!clubId) throw Object.assign(new Error('clubId required'), { statusCode: 400 });
  if (!roomId) throw Object.assign(new Error('roomId required'), { statusCode: 400 });

  const [rows] = await connection.execute(
    `SELECT
       room_id, host_id, club_id, status, game_type,
       scheduled_at, time_zone, config_json,
       room_caps_json,
       prize_description, prize_value,
       reconciliation_status,
       created_at, updated_at
     FROM ${TABLE}
     WHERE club_id = ? AND room_id = ? AND game_type = 'elimination'
     LIMIT 1`,
    [clubId, roomId]
  );

  const row = rows?.[0];
  if (!row) return null;

  return {
    ...row,
    config_json: typeof row.config_json === 'string'
      ? JSON.parse(row.config_json)
      : (row.config_json ?? {}),
  };
}

// ─── Update ───────────────────────────────────────────────────────────────────

export async function updateEliminationRoom({
  clubId, roomId, scheduledAt, timeZone, entryFee, currency,
  maxPlayers,
  // Accept both new prizes array and legacy flat fields
  prizes,
  prizeDescription: prizeDescriptionRaw,
  prizeValue:       prizeValueRaw,
  configJson,
}) {
  if (!clubId) throw Object.assign(new Error('clubId required'), { statusCode: 400 });
  if (!roomId) throw Object.assign(new Error('roomId required'), { statusCode: 400 });

  const sets   = [];
  const params = [];

  if (scheduledAt !== undefined) {
    sets.push('scheduled_at = ?');
    params.push(toMysqlUtcDateTime(scheduledAt));
  }
  if (timeZone !== undefined) {
    sets.push('time_zone = ?');
    params.push(timeZone ?? null);
  }
  if (entryFee !== undefined) {
    const fee = toPositiveNumber(entryFee);
    if (fee === null) throw Object.assign(new Error('ENTRY_FEE_REQUIRED'), { statusCode: 400 });
    sets.push('entry_fee = ?');
    params.push(fee);
  }
  if (currency !== undefined) {
    sets.push('currency = ?');
    params.push(currency);
  }
  if (maxPlayers !== undefined) {
    const max = toPositiveNumber(maxPlayers);
    if (max === null) throw Object.assign(new Error('MAX_PLAYERS_INVALID'), { statusCode: 400 });
    sets.push('max_players = ?');
    params.push(max);
  }

  // Handle prizes — either new array shape or legacy flat fields
  const hasPrizesPayload = prizes !== undefined || prizeDescriptionRaw !== undefined || prizeValueRaw !== undefined;
  if (hasPrizesPayload) {
    const normalised = normalisePrizes({
      prizes,
      prizeDescription: prizeDescriptionRaw,
      prizeValue:       prizeValueRaw,
    });
    // Update the flat DB columns for backward compat
    sets.push('prize_description = ?');
    params.push(normalised.prizeDescription);
    sets.push('prize_value = ?');
    params.push(normalised.prizeValue);
    // The prizes array is merged into config_json below via the configJson path
    // — build an updated configJson if none was explicitly passed
    if (configJson === undefined) {
      // Fetch the current config so we can merge prizes into it
      const current = await getEliminationRoom({ clubId, roomId });
      if (current) {
        const mergedConfig = {
          ...(typeof current.config_json === 'object' ? current.config_json : {}),
          prizes: normalised.prizes,
        };
        sets.push('config_json = ?');
        params.push(JSON.stringify(mergedConfig));
      }
    }
  }

  // Explicit configJson override (used by other callers)
  if (configJson !== undefined) {
    sets.push('config_json = ?');
    params.push(typeof configJson === 'string' ? configJson : JSON.stringify(configJson));
  }

  if (sets.length === 0) {
    throw Object.assign(new Error('no_fields_to_update'), { statusCode: 400 });
  }

  sets.push('updated_at = UTC_TIMESTAMP()');
  params.push(clubId, roomId);

  const [result] = await connection.execute(
    `UPDATE ${TABLE}
     SET ${sets.join(', ')}
     WHERE club_id = ? AND room_id = ? AND game_type = 'elimination'
       AND status = 'scheduled'
     LIMIT 1`,
    params
  );

  if (!result?.affectedRows) {
    const [rows] = await connection.execute(
      `SELECT status FROM ${TABLE}
       WHERE club_id = ? AND room_id = ? AND game_type = 'elimination' LIMIT 1`,
      [clubId, roomId]
    );
    if (!rows?.length) throw Object.assign(new Error('not_found'), { statusCode: 404 });
    throw Object.assign(
      new Error('room_not_editable — only scheduled rooms can be edited'),
      { statusCode: 409, currentStatus: rows[0].status }
    );
  }

  return getEliminationRoom({ clubId, roomId });
}

// ─── Cancel ───────────────────────────────────────────────────────────────────

export async function cancelEliminationRoom({ clubId, roomId }) {
  if (!clubId) throw Object.assign(new Error('clubId required'), { statusCode: 400 });
  if (!roomId) throw Object.assign(new Error('roomId required'), { statusCode: 400 });

  const [result] = await connection.execute(
    `UPDATE ${TABLE}
     SET status = 'cancelled', updated_at = UTC_TIMESTAMP()
     WHERE club_id = ? AND room_id = ? AND game_type = 'elimination'
       AND status IN ('scheduled', 'open')
     LIMIT 1`,
    [clubId, roomId]
  );

  if (!result?.affectedRows) {
    const [rows] = await connection.execute(
      `SELECT status FROM ${TABLE}
       WHERE club_id = ? AND room_id = ? AND game_type = 'elimination' LIMIT 1`,
      [clubId, rowId]
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
 * Called when the host clicks "Launch" on the dashboard.
 *
 * ✅ STATUS TRANSITION: scheduled → open
 *    Written to DB here so the management list reflects the correct state
 *    immediately. The guard (AND status = 'scheduled') makes this idempotent —
 *    re-launching an already-open room is a no-op on the DB row.
 *
 * Returns { roomId, hostId, status, config, hydrated, alreadyExisted }
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

  config.hostId  = row.host_id;
  config.clubId  = row.club_id;
  config.roomId  = row.room_id;

  // ── STATUS TRANSITION: scheduled → open ──────────────────────────────────
  // Only transitions from 'scheduled'. Already-open rooms are untouched.
  // Non-fatal — a DB write failure must never prevent the host from launching.
  let newStatus = row.status;
  if (row.status === 'scheduled') {
    try {
      const [updateResult] = await connection.execute(
        `UPDATE ${TABLE}
         SET status = 'open', updated_at = UTC_TIMESTAMP()
         WHERE room_id = ? AND game_type = 'elimination' AND status = 'scheduled'
         LIMIT 1`,
        [roomId]
      );
      if (updateResult.affectedRows > 0) {
        newStatus = 'open';
        console.log(`[eliminationMgmtService] 🟡 Room ${roomId} → open`);
      }
    } catch (err) {
      console.error('[eliminationMgmtService] ⚠️ Failed to mark room open (non-fatal):', err.message);
    }
  }

  // createRoomFromConfig is injected by the route handler to avoid a
  // circular import between the DB service and the socket room manager.
  const room = createRoomFromConfig(row.room_id, row.host_id, config.hostName, config);
  const alreadyExisted = !room || room.createdAt !== config.createdAt;

  return {
    roomId:               row.room_id,
    hostId:               row.host_id,
    status:               newStatus,
    reconciliationStatus: row.reconciliation_status ?? 'pending',
    config,
    hydrated:             true,
    alreadyExisted,
  };
}

// ─── Mark Live ────────────────────────────────────────────────────────────────

/**
 * STATUS TRANSITION: open → live
 * Called from eliminationSocketHandler when the host fires START_GAME.
 * Exported so the socket handler can import it directly.
 */
export async function markEliminationRoomAsLive(roomId) {
  if (!roomId) return false;
  try {
    const [result] = await connection.execute(
      `UPDATE ${TABLE}
       SET status = 'live', updated_at = UTC_TIMESTAMP()
       WHERE room_id = ? AND game_type = 'elimination'
         AND status IN ('scheduled', 'open')
       LIMIT 1`,
      [roomId]
    );
    const changed = result.affectedRows > 0;
    if (changed) console.log(`[eliminationMgmtService] 🔴 Room ${roomId} → live`);
    return changed;
  } catch (err) {
    console.error('[eliminationMgmtService] ⚠️ Failed to mark room live (non-fatal):', err.message);
    return false;
  }
}
