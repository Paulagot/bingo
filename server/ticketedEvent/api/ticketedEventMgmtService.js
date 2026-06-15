// server/ticketedEvent/api/ticketedEventMgmtService.js
//
// DB operations for ticketed (non-digital) event activities.
// Follows the same patterns as eliminationMgmtService.js.
// All operations are scoped to club_id.
//
// Status flow:
//   scheduled → checkin_open  : host starts check-in on the night
//   checkin_open → completed  : host closes check-in / marks event done

import { connection, TABLE_PREFIX } from '../../config/database.js';

const TABLE      = `${TABLE_PREFIX}web2_quiz_rooms`;
const GAME_TYPE  = 'ticketed_event';

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

// No player cap for ticketed events — use large sentinel
const UNCAPPED_PLAYERS = 999999;

// ─── Schedule ─────────────────────────────────────────────────────────────────

/**
 * Insert a new ticketed event room into the DB.
 * No game is launched — this is purely a ticketing + check-in container.
 */
export async function scheduleTicketedEvent({
  clubId,
  roomId,
  hostId,
  hostName,
  scheduledAt,
  timeZone,
  entryFee,
  fundraisingMode,   // 'fixed_fee' | 'donation'
  currency,
  currencySymbol,
  prizes,            // [{ place, description, value, sponsor }] — optional
  eventSponsors,     // [{ name, role }] — optional, up to 3
  roomCaps,
  venueCapacity,
   eventTitle,    // ← new
  eventLocation,
}) {
  if (!clubId) throw Object.assign(new Error('clubId required'),  { statusCode: 400 });
  if (!roomId) throw Object.assign(new Error('roomId required'),  { statusCode: 400 });
  if (!hostId) throw Object.assign(new Error('hostId required'),  { statusCode: 400 });

  const mode = fundraisingMode === 'donation' ? 'donation' : 'fixed_fee';

  if (mode === 'fixed_fee') {
    const fee = toPositiveNumber(entryFee);
    if (fee === null) throw Object.assign(new Error('ENTRY_FEE_REQUIRED'), { statusCode: 400 });
  }

  const scheduledAtMysql = toMysqlUtcDateTime(scheduledAt);

  // Normalise prizes — filter out empty rows
  const normalisedPrizes = Array.isArray(prizes)
    ? prizes.filter(p => p?.description?.trim())
    : [];

  // Normalise sponsors — filter out empty rows
  const normalisedSponsors = Array.isArray(eventSponsors)
    ? eventSponsors.filter(s => s?.name?.trim())
    : [];

  const configJson = JSON.stringify({
    clubId,
    hostId,
    hostName:        hostName ?? null,
    gameType:        GAME_TYPE,
    fundraisingMode: mode,
    entryFee:        mode === 'fixed_fee' ? String(entryFee) : null,
    currency:        currency  ?? 'EUR',
    currencySymbol:  currencySymbol ?? '€',
    timeZone:        timeZone  ?? null,
    eventDateTime:   scheduledAt ?? null,
    prizes:          normalisedPrizes,
    eventSponsors:   normalisedSponsors,
    roomCaps: {
    ...(roomCaps ?? {}),
    venueCapacity: venueCapacity ?? roomCaps?.venueCapacity ?? null,
    maxPlayers:    roomCaps?.maxPlayers ?? UNCAPPED_PLAYERS,
     eventTitle:    eventTitle    ?? null,  // ← new
  eventLocation: eventLocation ?? null,  // ← new
  },
  });

const capsJson = JSON.stringify({
  ...(roomCaps ?? {}),
  venueCapacity: venueCapacity ?? roomCaps?.venueCapacity ?? null,
});

  // Derive a first prize description for the legacy flat column (nullable)
  const firstPrize = normalisedPrizes[0] ?? null;

  await connection.execute(
    `INSERT INTO ${TABLE}
       (room_id, host_id, club_id, status, game_type,
        scheduled_at, time_zone,
        config_json, room_caps_json,
        prize_description, prize_value,
        reconciliation_status,
        created_at, updated_at)
     VALUES
       (?, ?, ?, 'scheduled', ?,
        ?, ?,
        ?, ?,
        ?, ?,
        'pending',
        UTC_TIMESTAMP(), UTC_TIMESTAMP())`,
    [
      roomId, hostId, clubId, GAME_TYPE,
      scheduledAtMysql, timeZone ?? null,
      configJson, capsJson,
      firstPrize?.description ?? null,
      firstPrize?.value       ?? null,
    ]
  );

  console.log(`[ticketedEventMgmtService] 📅 Scheduled ticketed event ${roomId} — club: ${clubId}`);

  return { roomId, hostId, status: 'scheduled', scheduledAt: scheduledAt ?? null };
}

// ─── List ─────────────────────────────────────────────────────────────────────

export async function listTicketedEvents({ clubId, status = 'all', time = 'all' }) {
  if (!clubId) throw Object.assign(new Error('clubId required'), { statusCode: 400 });

  const where  = ['club_id = ?', `game_type = '${GAME_TYPE}'`];
  const params = [clubId];

  const VALID_STATUSES = ['scheduled', 'open', 'live', 'completed', 'cancelled'];
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
       scheduled_at, time_zone, config_json, room_caps_json,
       prize_description, prize_value,
       reconciliation_status,
       linked_payment_methods_json,
       created_at, updated_at
     FROM ${TABLE}
     WHERE ${where.join(' AND ')}
     ORDER BY ${orderBy}
     LIMIT 200`,
    params
  );

  return rows.map(row => ({
    ...row,
    config_json: typeof row.config_json === 'string'
      ? JSON.parse(row.config_json)
      : (row.config_json ?? {}),
  }));
}

// ─── Get single ───────────────────────────────────────────────────────────────

export async function getTicketedEvent({ clubId, roomId }) {
  if (!clubId) throw Object.assign(new Error('clubId required'), { statusCode: 400 });
  if (!roomId) throw Object.assign(new Error('roomId required'), { statusCode: 400 });

  const [rows] = await connection.execute(
    `SELECT
       room_id, host_id, club_id, status, game_type,
       scheduled_at, time_zone, config_json, room_caps_json,
       prize_description, prize_value,
       reconciliation_status,
       linked_payment_methods_json,
       created_at, updated_at
     FROM ${TABLE}
     WHERE club_id = ? AND room_id = ? AND game_type = '${GAME_TYPE}'
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

export async function updateTicketedEvent({
  clubId, roomId,
  scheduledAt, timeZone, entryFee, fundraisingMode,
  currency, currencySymbol,
  prizes, eventSponsors,
}) {
  if (!clubId) throw Object.assign(new Error('clubId required'), { statusCode: 400 });
  if (!roomId) throw Object.assign(new Error('roomId required'), { statusCode: 400 });

  // Fetch current config to merge into
  const current = await getTicketedEvent({ clubId, roomId });
  if (!current) throw Object.assign(new Error('not_found'), { statusCode: 404 });

  const currentConfig = typeof current.config_json === 'object'
    ? current.config_json
    : {};

  const mode = fundraisingMode !== undefined
    ? (fundraisingMode === 'donation' ? 'donation' : 'fixed_fee')
    : currentConfig.fundraisingMode;

  if (mode === 'fixed_fee' && entryFee !== undefined) {
    if (!toPositiveNumber(entryFee)) {
      throw Object.assign(new Error('ENTRY_FEE_REQUIRED'), { statusCode: 400 });
    }
  }

  const normalisedPrizes = prizes !== undefined
    ? prizes.filter(p => p?.description?.trim())
    : currentConfig.prizes ?? [];

  const normalisedSponsors = eventSponsors !== undefined
    ? eventSponsors.filter(s => s?.name?.trim())
    : currentConfig.eventSponsors ?? [];

  const mergedConfig = {
    ...currentConfig,
    fundraisingMode: mode,
    entryFee:        mode === 'fixed_fee'
      ? (entryFee !== undefined ? String(entryFee) : currentConfig.entryFee)
      : null,
    currency:        currency       ?? currentConfig.currency,
    currencySymbol:  currencySymbol ?? currentConfig.currencySymbol,
    timeZone:        timeZone       ?? currentConfig.timeZone,
    eventDateTime:   scheduledAt    ?? currentConfig.eventDateTime,
    prizes:          normalisedPrizes,
    eventSponsors:   normalisedSponsors,
  };

  const firstPrize = normalisedPrizes[0] ?? null;

  const sets = [
    'config_json = ?',
    'prize_description = ?',
    'prize_value = ?',
    'updated_at = UTC_TIMESTAMP()',
  ];
  const params = [
    JSON.stringify(mergedConfig),
    firstPrize?.description ?? null,
    firstPrize?.value       ?? null,
  ];

  if (scheduledAt !== undefined) {
    sets.push('scheduled_at = ?');
    params.push(toMysqlUtcDateTime(scheduledAt));
  }
  if (timeZone !== undefined) {
    sets.push('time_zone = ?');
    params.push(timeZone ?? null);
  }

  params.push(clubId, roomId);

  const [result] = await connection.execute(
    `UPDATE ${TABLE}
     SET ${sets.join(', ')}
     WHERE club_id = ? AND room_id = ? AND game_type = '${GAME_TYPE}'
       AND status = 'scheduled'
     LIMIT 1`,
    params
  );

  if (!result?.affectedRows) {
    const [rows] = await connection.execute(
      `SELECT status FROM ${TABLE}
       WHERE club_id = ? AND room_id = ? AND game_type = '${GAME_TYPE}' LIMIT 1`,
      [clubId, roomId]
    );
    if (!rows?.length) throw Object.assign(new Error('not_found'), { statusCode: 404 });
    throw Object.assign(
      new Error('room_not_editable — only scheduled events can be edited'),
      { statusCode: 409, currentStatus: rows[0].status }
    );
  }

  return getTicketedEvent({ clubId, roomId });
}

// ─── Cancel ───────────────────────────────────────────────────────────────────

export async function cancelTicketedEvent({ clubId, roomId }) {
  if (!clubId) throw Object.assign(new Error('clubId required'), { statusCode: 400 });
  if (!roomId) throw Object.assign(new Error('roomId required'), { statusCode: 400 });

  const [result] = await connection.execute(
    `UPDATE ${TABLE}
     SET status = 'cancelled', updated_at = UTC_TIMESTAMP()
     WHERE club_id = ? AND room_id = ? AND game_type = '${GAME_TYPE}'
       AND status IN ('scheduled', 'open')
     LIMIT 1`,
    [clubId, roomId]
  );

  if (!result?.affectedRows) {
    const [rows] = await connection.execute(
      `SELECT status FROM ${TABLE}
       WHERE club_id = ? AND room_id = ? AND game_type = '${GAME_TYPE}' LIMIT 1`,
      [clubId, roomId]
    );
    if (!rows?.length) throw Object.assign(new Error('not_found'), { statusCode: 404 });
    throw Object.assign(
      new Error('room_not_cancellable — only scheduled or open events can be cancelled'),
      { statusCode: 409, currentStatus: rows[0].status }
    );
  }

  return { ok: true };
}

// ─── Open check-in (replaces "Launch" for ticketed events) ───────────────────

/**
 * STATUS TRANSITION: scheduled → open
 * Called when the host starts check-in on the night.
 * No socket room is created — purely a DB status change.
 */
export async function openCheckIn({ clubId, roomId }) {
  if (!clubId) throw Object.assign(new Error('clubId required'), { statusCode: 400 });
  if (!roomId) throw Object.assign(new Error('roomId required'), { statusCode: 400 });

  const row = await getTicketedEvent({ clubId, roomId });
  if (!row) throw Object.assign(new Error('not_found'), { statusCode: 404 });

  if (row.status !== 'scheduled') {
    return { roomId, status: row.status, alreadyOpen: true };
  }

  await connection.execute(
    `UPDATE ${TABLE}
     SET status = 'open', updated_at = UTC_TIMESTAMP()
     WHERE room_id = ? AND game_type = '${GAME_TYPE}' AND status = 'scheduled'
     LIMIT 1`,
    [roomId]
  );

  console.log(`[ticketedEventMgmtService] 🟡 Check-in opened for room ${roomId}`);
  return { roomId, status: 'open', alreadyOpen: false };
}

// ─── Complete (close check-in) ────────────────────────────────────────────────

/**
 * STATUS TRANSITION: open → completed
 * Called when the host closes check-in / marks the event as done.
 */
export async function completeTicketedEvent({ clubId, roomId }) {
  if (!clubId) throw Object.assign(new Error('clubId required'), { statusCode: 400 });
  if (!roomId) throw Object.assign(new Error('roomId required'), { statusCode: 400 });

  const [result] = await connection.execute(
    `UPDATE ${TABLE}
     SET status = 'completed',
         ended_at = UTC_TIMESTAMP(),
         reconciliation_status = 'pending',
         updated_at = UTC_TIMESTAMP()
     WHERE club_id = ? AND room_id = ? AND game_type = '${GAME_TYPE}'
       AND status IN ('scheduled', 'open')
     LIMIT 1`,
    [clubId, roomId]
  );

  if (!result?.affectedRows) {
    throw Object.assign(new Error('not_found_or_wrong_status'), { statusCode: 409 });
  }

  console.log(`[ticketedEventMgmtService] ✅ Ticketed event ${roomId} → completed`);
  return { ok: true };
}