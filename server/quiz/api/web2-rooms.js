// server/quiz/api/web2-rooms.js
import express from 'express';
import { connection, TABLE_PREFIX } from '../../config/database.js';
import { authenticateToken } from '../../middleware/auth.js';

const router = express.Router();
const WEB2_ROOMS_TABLE = `${TABLE_PREFIX}web2_quiz_rooms`;
console.log('[web2-rooms API] ✅ web2-rooms router file loaded');


function isAllowedStatus(s) {
  return ['scheduled', 'open', 'live', 'completed', 'cancelled'].includes(String(s));
}

function toMysqlUtcDateTime(value) {
  if (value === null || value === undefined || value === '') return null;

  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;

  const pad = (n) => String(n).padStart(2, '0');
  const yyyy = d.getUTCFullYear();
  const mm = pad(d.getUTCMonth() + 1);
  const dd = pad(d.getUTCDate());
  const hh = pad(d.getUTCHours());
  const mi = pad(d.getUTCMinutes());
  const ss = pad(d.getUTCSeconds());

  return `${yyyy}-${mm}-${dd} ${hh}:${mi}:${ss}`;
}

function safeJsonParam(v) {
  if (v === undefined) return undefined;
  if (v === null) return null;
  if (typeof v === 'string') {
    try {
      JSON.parse(v);
      return v;
    } catch {
      return undefined;
    }
  }
  try {
    return JSON.stringify(v);
  } catch {
    return undefined;
  }
}

/**
 * List WEB2 quiz rooms for the logged-in club (req.club_id)
 * Query params:
 *  - status: scheduled|live|completed|cancelled|all (default: scheduled)
 *  - time: upcoming|past|all (default: upcoming)
 */
router.get('/web2/rooms', authenticateToken, async (req, res) => {
  try {
    const clubId = req.club_id;
    if (!clubId) return res.status(401).json({ error: 'unauthorized' });

    const status = String(req.query.status || 'scheduled');
    const time = String(req.query.time || 'upcoming');

    console.log('[web2-rooms API] 📊 Request params:', { clubId, status, time });

    const where = ['club_id = ?'];
    const params = [clubId];

    if (status !== 'all') {
      if (!isAllowedStatus(status)) {
        return res.status(400).json({ error: 'invalid_status' });
      }
      where.push('status = ?');
      params.push(status);
    }

    if (time === 'upcoming') {
      where.push('(scheduled_at IS NULL OR scheduled_at >= (UTC_TIMESTAMP() - INTERVAL 12 HOUR))');
    } else if (time === 'past') {
      where.push('(scheduled_at IS NOT NULL AND scheduled_at < UTC_TIMESTAMP())');
    } else if (time !== 'all') {
      return res.status(400).json({ error: 'invalid_time_filter' });
    }

    const orderBy =
      time === 'past'
        ? 'ORDER BY scheduled_at DESC, created_at DESC'
        : 'ORDER BY scheduled_at ASC, created_at DESC';

    const sql = `
      SELECT
        room_id,
        host_id,
        game_type,
        status,
        reconciliation_status,
        scheduled_at,
        ended_at,
        time_zone,
        config_json,
        room_caps_json,
        prize_description,
        prize_value,
        created_at,
        updated_at
      FROM ${WEB2_ROOMS_TABLE}
      WHERE ${where.join(' AND ')}
      ${orderBy}
      LIMIT 200
    `;

    const [rows] = await connection.execute(sql, params);
    return res.status(200).json({ rooms: rows });
  } catch (err) {
    console.error('[web2-rooms API] ❌ Failed listing WEB2 rooms:', err);
    return res.status(500).json({ error: 'internal_error' });
  }
});

/**
 * Get a single room (for edit modal)
 */
router.get('/web2/rooms/:roomId', authenticateToken, async (req, res) => {
  try {
    const clubId = req.club_id;
    if (!clubId) return res.status(401).json({ error: 'unauthorized' });

    const roomId = String(req.params.roomId || '').trim();
    if (!roomId) return res.status(400).json({ error: 'missing_room_id' });

    const sql = `
      SELECT
        room_id,
        host_id,
        game_type,
        status,
        reconciliation_status,
        scheduled_at,
        ended_at,
        time_zone,
        config_json,
        room_caps_json,
        prize_description,
        prize_value,
        created_at,
        updated_at
      FROM ${WEB2_ROOMS_TABLE}
      WHERE club_id = ? AND room_id = ?
      LIMIT 1
    `;

    const [rows] = await connection.execute(sql, [clubId, roomId]);
    if (!rows || rows.length === 0) return res.status(404).json({ error: 'not_found' });

    return res.status(200).json({ room: rows[0] });
  } catch (err) {
    console.error('[web2-rooms API] ❌ Failed reading WEB2 room:', err);
    return res.status(500).json({ error: 'internal_error' });
  }
});

/**
 * Update editable fields on a scheduled room
 */
router.patch('/web2/rooms/:roomId', authenticateToken, async (req, res) => {
  try {
    const clubId = req.club_id;
    if (!clubId) return res.status(401).json({ error: 'unauthorized' });

    const roomId = String(req.params.roomId || '').trim();
    if (!roomId) return res.status(400).json({ error: 'missing_room_id' });

    const [existingRows] = await connection.execute(
      `SELECT room_id, status FROM ${WEB2_ROOMS_TABLE} WHERE club_id = ? AND room_id = ? LIMIT 1`,
      [clubId, roomId]
    );

    if (!existingRows || existingRows.length === 0) return res.status(404).json({ error: 'not_found' });

    const existing = existingRows[0];
    if (existing.status !== 'scheduled') {
      return res.status(409).json({
        error: 'room_not_editable',
        message: 'Only scheduled rooms can be edited.',
        status: existing.status,
      });
    }

    const scheduledAt = toMysqlUtcDateTime(req.body?.scheduled_at);
    const timeZone = req.body?.time_zone === undefined ? undefined : String(req.body.time_zone || '').trim();

    const configJson = safeJsonParam(req.body?.config_json);
    const roomCapsJson = safeJsonParam(req.body?.room_caps_json);

    if (req.body?.config_json !== undefined && configJson === undefined) {
      return res.status(400).json({ error: 'invalid_config_json' });
    }
    if (req.body?.room_caps_json !== undefined && roomCapsJson === undefined) {
      return res.status(400).json({ error: 'invalid_room_caps_json' });
    }

    const sets = [];
    const params = [];

    if (req.body?.scheduled_at !== undefined) {
      sets.push(`scheduled_at = ?`);
      params.push(scheduledAt);
    }

    if (req.body?.time_zone !== undefined) {
      sets.push(`time_zone = ?`);
      params.push(timeZone || null);
    }

    if (req.body?.config_json !== undefined) {
      sets.push(`config_json = CAST(? AS JSON)`);
      params.push(configJson === null ? null : configJson);
    }

    if (req.body?.room_caps_json !== undefined) {
      sets.push(`room_caps_json = CAST(? AS JSON)`);
      params.push(roomCapsJson === null ? null : roomCapsJson);
    }

    if (sets.length === 0) {
      return res.status(400).json({ error: 'no_fields_to_update' });
    }

    sets.push(`updated_at = UTC_TIMESTAMP()`);

    const updateSql = `
      UPDATE ${WEB2_ROOMS_TABLE}
      SET ${sets.join(', ')}
      WHERE club_id = ? AND room_id = ? AND status = 'scheduled'
      LIMIT 1
    `;

    const updateParams = [...params, clubId, roomId];
    const [updateRes] = await connection.execute(updateSql, updateParams);

    if (!updateRes || updateRes.affectedRows !== 1) {
      return res.status(409).json({ error: 'update_failed_or_room_changed' });
    }

    const [rows] = await connection.execute(
      `SELECT
         room_id,
         host_id,
         game_type,
         status,
         reconciliation_status,
         scheduled_at,
         ended_at,
         time_zone,
         config_json,
         room_caps_json,
         prize_description,
         prize_value,
         created_at,
         updated_at
       FROM ${WEB2_ROOMS_TABLE}
       WHERE club_id = ? AND room_id = ?
       LIMIT 1`,
      [clubId, roomId]
    );

    return res.status(200).json({ room: rows[0] });
  } catch (err) {
    console.error('[web2-rooms API] ❌ Failed updating WEB2 room:', err);
    return res.status(500).json({ error: 'internal_error' });
  }
});

/**
 * Cancel a scheduled room
 */
router.post('/web2/rooms/:roomId/cancel', authenticateToken, async (req, res) => {
  try {
    const clubId = req.club_id;
    if (!clubId) return res.status(401).json({ error: 'unauthorized' });

    const roomId = String(req.params.roomId || '').trim();
    if (!roomId) return res.status(400).json({ error: 'missing_room_id' });

    console.log('[web2-rooms API] ✅ Cancel handler matched:', { roomId, clubId });

    const sql = `
      UPDATE ${WEB2_ROOMS_TABLE}
      SET status = 'cancelled', updated_at = UTC_TIMESTAMP()
      WHERE club_id = ? AND room_id = ? AND status IN ('scheduled', 'open')
      LIMIT 1
    `;

    const [result] = await connection.execute(sql, [clubId, roomId]);

    if (!result || result.affectedRows !== 1) {
      const [rows] = await connection.execute(
        `SELECT status FROM ${WEB2_ROOMS_TABLE} WHERE club_id = ? AND room_id = ? LIMIT 1`,
        [clubId, roomId]
      );

      if (!rows || rows.length === 0) return res.status(404).json({ error: 'not_found' });

      return res.status(409).json({
        error: 'room_not_cancellable',
        message: 'Only scheduled rooms can be cancelled.',
        status: rows[0].status,
      });
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('[web2-rooms API] ❌ Failed cancelling WEB2 room:', err);
    return res.status(500).json({ error: 'internal_error' });
  }
});

export default router;

