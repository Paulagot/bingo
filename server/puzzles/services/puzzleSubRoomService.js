// server/puzzles/services/puzzleSubRoomService.js
//
// Management-system room service for puzzle subscription challenges.
// Mirrors ticketedEventMgmtService.js exactly in shape and conventions:
// same TABLE reference, same toMysqlUtcDateTime utility, same non-fatal
// payment-methods pattern, same status-gated update/cancel/complete.
//
// puzzle_sub rooms are the management-system face of
// fundraisely_puzzle_challenges rows. Creating a challenge creates a
// room (status = 'scheduled'). Activating a challenge opens the room
// (status = 'open'). Cancelling/completing mirrors through.
//
// Key differences from ticketed_event:
//   - No payment method selector (subscriptions are Stripe-only, locked).
//     linked_payment_methods_json stays empty; the Stripe connection is
//     gated in challengeService.updateChallengeStatus via
//     getReadyStripeForClub, not via the payment methods table.
//   - No entry_fee / ticket_types / prizes / extras — pricing lives on
//     fundraisely_puzzle_challenges.weekly_price.
//   - scheduled_at = challenge starts_at (first puzzle unlocks).
//     ended_at computed at creation: starts_at + total_weeks × 7 days.
//     Both stored upfront — unlike ticketed_event where ended_at is set
//     when the event actually ends. Known end date is a feature here, not
//     a departure from the pattern.
//   - No reconciliation flow (no quiz_payment_ledger involvement).
//     reconciliation_status = 'pending' is written for schema compliance
//     but will never advance — this is a known limitation flagged in the
//     spec (section 1.4 / 2.9a), to be addressed in a separate reporting
//     pass.
//   - host_id / host_name come from the club admin who created the
//     challenge (req.user.id / req.user.name in challengeRoutes.js),
//     not a separate host concept.

import { v4 as uuidv4 } from 'uuid';
import { connection, TABLE_PREFIX } from '../../config/database.js';
import EventIntegrationsService from '../../mgtsystem/services/EventIntegrationsService.js';

const TABLE     = `${TABLE_PREFIX}web2_quiz_rooms`;
const GAME_TYPE = 'puzzle_sub';
const eventIntegrationsService = new EventIntegrationsService();

// Matches toMysqlUtcDateTime in ticketedEventMgmtService.js exactly —
// duplicated rather than shared because there's no shared utils module
// for these services yet, and this is a one-liner that doesn't justify
// a new import chain.
function toMysqlUtcDateTime(value) {
  if (value === null || value === undefined || value === '') return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  const pad = n => String(n).padStart(2, '0');
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth()+1)}-${pad(d.getUTCDate())} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`;
}

// ─── Create ───────────────────────────────────────────────────────────────────

/**
 * Create the management room for a puzzle subscription challenge.
 * Called from challengeService.createChallenge immediately after the
 * challenge row is inserted, so a room always exists for every challenge.
 *
 * Returns the generated roomId so challengeService can write it back
 * onto the challenge row.
 */
export async function createPuzzleSubRoom({
  challengeId,
  clubId,
  hostId,
  hostName,
  title,
  weeklyPrice,
  currency,
  totalWeeks,
  startsAt,
}) {
  if (!challengeId) throw Object.assign(new Error('challengeId required'), { statusCode: 400 });
  if (!clubId)      throw Object.assign(new Error('clubId required'),      { statusCode: 400 });
  if (!hostId)      throw Object.assign(new Error('hostId required'),      { statusCode: 400 });

  const roomId = uuidv4().replace(/-/g, '').slice(0, 16).toUpperCase();

  // Compute ends_at from starts_at + total_weeks × 7 days.
  // Stored upfront for display — unlike ticketed_event where ended_at is
  // set reactively when the event ends. For a fixed-length subscription
  // the end date is always known at creation time.
  const startsAtMs = startsAt ? new Date(startsAt).getTime() : null;
  const endsAtMysql = startsAtMs && totalWeeks
    ? toMysqlUtcDateTime(new Date(startsAtMs + totalWeeks * 7 * 24 * 60 * 60 * 1000))
    : null;

  const configJson = JSON.stringify({
    gameType:    GAME_TYPE,
    challengeId,
    clubId,
    hostId,
    hostName:    hostName ?? null,
    title:       title    ?? null,
    // weeklyPrice stored as-is from fundraisely_puzzle_challenges —
    // already in smallest currency unit (same as how it's stored on
    // the challenge row — see challengeService.createChallenge comment).
    weeklyPrice: weeklyPrice ?? null,
    currency:    currency   ?? 'eur',
    totalWeeks:  totalWeeks ?? null,
    // eventDateTime / startsAt — both stored so the management dashboard
    // can display start date without parsing the challenges table too.
    eventDateTime: startsAt ?? null,
    startsAt:      startsAt ?? null,
    // Computed end date — same value as ended_at on the room row, stored
    // in config_json too so it's accessible without a second column lookup.
    endsAt: endsAtMysql,
  });

  // room_caps_json — subscriptions have no venue capacity concept, but
  // the column exists and other services may read it. Store a minimal
  // shape rather than NULL so JSON_EXTRACT calls don't crash.
  const capsJson = JSON.stringify({ maxPlayers: 999999 });

  await connection.execute(
    `INSERT INTO ${TABLE}
       (room_id, host_id, club_id, status, game_type,
        scheduled_at, ended_at, time_zone,
        config_json, room_caps_json,
        reconciliation_status,
        created_at, updated_at)
     VALUES
       (?, ?, ?, 'scheduled', ?,
        ?, ?, NULL,
        ?, ?,
        'pending',
        UTC_TIMESTAMP(), UTC_TIMESTAMP())`,
    [
      roomId, hostId, clubId, GAME_TYPE,
      toMysqlUtcDateTime(startsAt),
      endsAtMysql,
      configJson,
      capsJson,
    ]
  );

  console.log(`[puzzleSubRoomService] 📅 Created room ${roomId} for challenge ${challengeId} — ${totalWeeks} weeks, ends ${endsAtMysql ?? 'TBD'}`);

  return roomId;
}

// ─── Get ──────────────────────────────────────────────────────────────────────

export async function getPuzzleSubRoom({ roomId, clubId }) {
  const [rows] = await connection.execute(
    `SELECT
       room_id, host_id, club_id, status, game_type,
       scheduled_at, ended_at, time_zone,
       config_json, room_caps_json,
       reconciliation_status,
       linked_payment_methods_json,
       created_at, updated_at
     FROM ${TABLE}
     WHERE room_id = ? AND club_id = ? AND game_type = '${GAME_TYPE}'
     LIMIT 1`,
    [roomId, clubId]
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

/**
 * Look up the room for a challenge (by challengeId, not roomId).
 * Used by challengeService when it only has the challengeId in hand.
 */
export async function getPuzzleSubRoomByChallenge({ challengeId, clubId }) {
  const [rows] = await connection.execute(
    `SELECT r.*
     FROM ${TABLE} r
     JOIN fundraisely_puzzle_challenges c ON c.room_id = r.room_id
     WHERE c.id = ? AND r.club_id = ? AND r.game_type = '${GAME_TYPE}'
     LIMIT 1`,
    [challengeId, clubId]
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

// ─── List ─────────────────────────────────────────────────────────────────────

export async function listPuzzleSubRooms({ clubId, status = 'all' }) {
  if (!clubId) throw Object.assign(new Error('clubId required'), { statusCode: 400 });

  const where  = ['club_id = ?', `game_type = '${GAME_TYPE}'`];
  const params = [clubId];

  const VALID_STATUSES = ['scheduled', 'open', 'completed', 'cancelled'];
  if (status !== 'all' && VALID_STATUSES.includes(status)) {
    where.push('status = ?');
    params.push(status);
  }

  const [rows] = await connection.execute(
    `SELECT
       room_id, host_id, club_id, status, game_type,
       scheduled_at, ended_at, time_zone,
       config_json, room_caps_json,
       reconciliation_status,
       linked_payment_methods_json,
       created_at, updated_at
     FROM ${TABLE}
     WHERE ${where.join(' AND ')}
     ORDER BY scheduled_at ASC
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

// ─── Open (challenge activated) ───────────────────────────────────────────────

/**
 * Flip room status scheduled → open when a challenge is activated.
 * Called from challengeService.updateChallengeStatus after Stripe
 * Product/Price provisioning succeeds.
 */
export async function openPuzzleSubRoom({ challengeId, clubId }) {
  if (!challengeId) throw Object.assign(new Error('challengeId required'), { statusCode: 400 });

  const [result] = await connection.execute(
    `UPDATE ${TABLE} r
     JOIN fundraisely_puzzle_challenges c ON c.room_id = r.room_id
     SET r.status = 'open', r.updated_at = UTC_TIMESTAMP()
     WHERE c.id = ? AND r.club_id = ? AND r.game_type = '${GAME_TYPE}'
       AND r.status = 'scheduled'`,
    [challengeId, clubId]
  );

  if (!result?.affectedRows) {
    console.warn(`[puzzleSubRoomService] ⚠️ openPuzzleSubRoom — no room updated for challenge ${challengeId}. Room may already be open or does not exist.`);
  }

  return { ok: (result?.affectedRows ?? 0) > 0 };
}

// ─── Cancel ───────────────────────────────────────────────────────────────────

export async function cancelPuzzleSubRoom({ challengeId, clubId }) {
  if (!challengeId) throw Object.assign(new Error('challengeId required'), { statusCode: 400 });

  const [result] = await connection.execute(
    `UPDATE ${TABLE} r
     JOIN fundraisely_puzzle_challenges c ON c.room_id = r.room_id
     SET r.status = 'cancelled', r.updated_at = UTC_TIMESTAMP()
     WHERE c.id = ? AND r.club_id = ? AND r.game_type = '${GAME_TYPE}'
       AND r.status IN ('scheduled', 'open')`,
    [challengeId, clubId]
  );

  return { ok: (result?.affectedRows ?? 0) > 0 };
}

// ─── Complete ─────────────────────────────────────────────────────────────────

/**
 * Flip room status → completed when all weeks have elapsed.
 * Called from challengeService.updateChallengeStatus when status = 'completed'.
 * ended_at was pre-set at creation time; we stamp it again here with
 * UTC_TIMESTAMP() in case the actual completion is slightly later than
 * the computed date (e.g. the last webhook arrived a few seconds late).
 */
export async function completePuzzleSubRoom({ challengeId, clubId }) {
  if (!challengeId) throw Object.assign(new Error('challengeId required'), { statusCode: 400 });

  const [result] = await connection.execute(
    `UPDATE ${TABLE} r
     JOIN fundraisely_puzzle_challenges c ON c.room_id = r.room_id
     SET r.status = 'completed',
         r.ended_at = UTC_TIMESTAMP(),
         r.updated_at = UTC_TIMESTAMP()
     WHERE c.id = ? AND r.club_id = ? AND r.game_type = '${GAME_TYPE}'
       AND r.status IN ('scheduled', 'open')`,
    [challengeId, clubId]
  );

  return { ok: (result?.affectedRows ?? 0) > 0 };
}

// ─── Update config ─────────────────────────────────────────────────────────────

/**
 * Update challenge metadata in the room's config_json — called when a
 * club edits the challenge title, weekly price, or schedule before activation.
 * Only works on 'scheduled' rooms (locked once open, same as ticketed_event).
 */
export async function updatePuzzleSubRoom({
  challengeId,
  clubId,
  title,
  weeklyPrice,
  currency,
  totalWeeks,
  startsAt,
}) {
  if (!challengeId) throw Object.assign(new Error('challengeId required'), { statusCode: 400 });

  const room = await getPuzzleSubRoomByChallenge({ challengeId, clubId });
  if (!room) throw Object.assign(new Error('not_found'), { statusCode: 404 });
  if (room.status !== 'scheduled') {
    throw Object.assign(
      new Error('room_not_editable — only scheduled challenges can be edited'),
      { statusCode: 409, currentStatus: room.status }
    );
  }

  const currentConfig = room.config_json ?? {};

  const resolvedStartsAt  = startsAt    ?? currentConfig.startsAt;
  const resolvedTotalWeeks = totalWeeks ?? currentConfig.totalWeeks;

  const startsAtMs = resolvedStartsAt ? new Date(resolvedStartsAt).getTime() : null;
  const endsAtMysql = startsAtMs && resolvedTotalWeeks
    ? toMysqlUtcDateTime(new Date(startsAtMs + resolvedTotalWeeks * 7 * 24 * 60 * 60 * 1000))
    : currentConfig.endsAt ?? null;

  const mergedConfig = {
    ...currentConfig,
    title:        title        ?? currentConfig.title,
    weeklyPrice:  weeklyPrice  ?? currentConfig.weeklyPrice,
    currency:     currency     ?? currentConfig.currency,
    totalWeeks:   resolvedTotalWeeks,
    startsAt:     resolvedStartsAt,
    eventDateTime: resolvedStartsAt,
    endsAt:       endsAtMysql,
  };

  const sets    = ['config_json = ?', 'updated_at = UTC_TIMESTAMP()'];
  const params  = [JSON.stringify(mergedConfig)];

  if (startsAt !== undefined) {
    sets.push('scheduled_at = ?');
    params.push(toMysqlUtcDateTime(startsAt));
  }
  if (endsAtMysql) {
    sets.push('ended_at = ?');
    params.push(endsAtMysql);
  }

  params.push(room.room_id, clubId);

  await connection.execute(
    `UPDATE ${TABLE}
     SET ${sets.join(', ')}
     WHERE room_id = ? AND club_id = ? AND game_type = '${GAME_TYPE}'
       AND status = 'scheduled'
     LIMIT 1`,
    params
  );

  // Sync updated payment methods / dates to any linked events.
  // Non-fatal — room is updated either way.
  try {
    await eventIntegrationsService.syncRoomPaymentMethodsToLinkedEvents({
      roomId: room.room_id,
      clubId,
    });
  } catch (err) {
    console.warn(`[puzzleSubRoomService] ⚠️ Failed to sync to linked events for ${room.room_id}:`, err.message);
  }

  return getPuzzleSubRoom({ roomId: room.room_id, clubId });
}