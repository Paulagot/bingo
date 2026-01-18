// server/quiz/api/web2-rooms.js
import express from 'express';
import { connection, TABLE_PREFIX } from '../../config/database.js';
import { authenticateToken } from '../../middleware/auth.js';

const router = express.Router();
const WEB2_ROOMS_TABLE = `${TABLE_PREFIX}web2_quiz_rooms`;
console.log('[web2-rooms API] ✅ web2-rooms router file loaded');


function isAllowedStatus(s) {
  return ['scheduled', 'live', 'completed', 'cancelled'].includes(String(s));
}

function toMysqlDateTime(value) {
  if (value === null || value === undefined || value === '') return null;

  // Accept ISO strings or anything Date can parse
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;

  // Convert to MySQL DATETIME "YYYY-MM-DD HH:mm:ss"
  const pad = (n) => String(n).padStart(2, '0');
  const yyyy = d.getFullYear();
  const mm = pad(d.getMonth() + 1);
  const dd = pad(d.getDate());
  const hh = pad(d.getHours());
  const mi = pad(d.getMinutes());
  const ss = pad(d.getSeconds());
  return `${yyyy}-${mm}-${dd} ${hh}:${mi}:${ss}`;
}

function safeJsonParam(v) {
  // We store as MySQL JSON. mysql2 will pass string fine; cast in SQL.
  if (v === undefined) return undefined; // means "not provided"
  if (v === null) return null; // means "explicitly clear"
  if (typeof v === 'string') {
    // If they pass a JSON string, ensure it's valid JSON
    try {
      JSON.parse(v);
      return v;
    } catch {
      return undefined; // invalid -> treat as not provided
    }
  }
  // object/array/number/bool
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
      where.push('(scheduled_at IS NULL OR scheduled_at >= (NOW() - INTERVAL 12 HOUR))');
    } else if (time === 'past') {
      where.push('(scheduled_at IS NOT NULL AND scheduled_at < NOW())');
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
        status,
        scheduled_at,
        ended_at,
        time_zone,
        config_json,
        room_caps_json,
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
        status,
        scheduled_at,
        ended_at,
        time_zone,
        config_json,
        room_caps_json,
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
 * Update editable fields on a scheduled room:
 * - scheduled_at
 * - time_zone
 * - config_json
 * - room_caps_json
 *
 * Safety:
 * - Must belong to club
 * - Only allow updates while status = 'scheduled' (simple rule for now)
 */
router.patch('/web2/rooms/:roomId', authenticateToken, async (req, res) => {
  try {
    const clubId = req.club_id;
    if (!clubId) return res.status(401).json({ error: 'unauthorized' });

    const roomId = String(req.params.roomId || '').trim();
    if (!roomId) return res.status(400).json({ error: 'missing_room_id' });

    // Load current row (status gating)
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

    const scheduledAt = toMysqlDateTime(req.body?.scheduled_at);
    const timeZone = req.body?.time_zone === undefined ? undefined : String(req.body.time_zone || '').trim();

    const configJson = safeJsonParam(req.body?.config_json);
    const roomCapsJson = safeJsonParam(req.body?.room_caps_json);

    // If user tried to send invalid JSON, reject explicitly
    if (req.body?.config_json !== undefined && configJson === undefined) {
      return res.status(400).json({ error: 'invalid_config_json' });
    }
    if (req.body?.room_caps_json !== undefined && roomCapsJson === undefined) {
      return res.status(400).json({ error: 'invalid_room_caps_json' });
    }

    const sets = [];
    const params = [];

    if (req.body?.scheduled_at !== undefined) {
      // allow null to clear, or valid datetime string
      sets.push(`scheduled_at = ?`);
      params.push(scheduledAt);
    }

    if (req.body?.time_zone !== undefined) {
      sets.push(`time_zone = ?`);
      params.push(timeZone || null);
    }

    if (req.body?.config_json !== undefined) {
      // Cast to JSON so MySQL stores it properly
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

    sets.push(`updated_at = NOW()`);

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

    // Return updated row
    const [rows] = await connection.execute(
      `
      SELECT
        room_id,
        host_id,
        status,
        scheduled_at,
        ended_at,
        time_zone,
        config_json,
        room_caps_json,
        created_at,
        updated_at
      FROM ${WEB2_ROOMS_TABLE}
      WHERE club_id = ? AND room_id = ?
      LIMIT 1
      `,
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
      SET status = 'cancelled', updated_at = NOW()
      WHERE club_id = ? AND room_id = ? AND status = 'scheduled'
      LIMIT 1
    `;

    const [result] = await connection.execute(sql, [clubId, roomId]);

    if (!result || result.affectedRows !== 1) {
      // Either not found, or not scheduled anymore
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

