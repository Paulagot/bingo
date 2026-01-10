// server/quiz/api/web2-rooms.js
import express from 'express';
import { connection, TABLE_PREFIX } from '../../config/database.js';
import { authenticateToken } from '../../middleware/auth.js';

const router = express.Router();
const WEB2_ROOMS_TABLE = `${TABLE_PREFIX}web2_quiz_rooms`;

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
      where.push('status = ?');
      params.push(status);
    }

    if (time === 'upcoming') {
      // include "live" rooms too, but if you want strictly scheduled future only, change this logic
      where.push('(scheduled_at IS NULL OR scheduled_at >= (NOW() - INTERVAL 12 HOUR))');
    } else if (time === 'past') {
      where.push('(scheduled_at IS NOT NULL AND scheduled_at < NOW())');
    }

    const orderBy =
      time === 'past' ? 'ORDER BY scheduled_at DESC, created_at DESC' : 'ORDER BY scheduled_at ASC, created_at DESC';

    const sql = `
      SELECT
        room_id,
        host_id,
        status,
        scheduled_at,
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

    console.log('[web2-rooms API] 🔍 SQL Query:', sql);
    console.log('[web2-rooms API] 🔍 SQL Params:', params);

    const [rows] = await connection.execute(sql, params);

    console.log('[web2-rooms API] ✅ Found', rows.length, 'rooms');
    
    // Log first room's data structure (if exists)
    if (rows.length > 0) {
      console.log('[web2-rooms API] 📦 First room sample:');
      console.log('  - room_id:', rows[0].room_id);
      console.log('  - host_id:', rows[0].host_id);
      console.log('  - status:', rows[0].status);
      console.log('  - config_json type:', typeof rows[0].config_json);
      console.log('  - config_json length:', rows[0].config_json?.length || 0);
      console.log('  - room_caps_json type:', typeof rows[0].room_caps_json);
      
      // Try to parse and show preview
      try {
        const configPreview = typeof rows[0].config_json === 'string' 
          ? JSON.parse(rows[0].config_json) 
          : rows[0].config_json;
        
        console.log('  - config_json parsed preview:', {
          selectedTemplate: configPreview.selectedTemplate,
          hostName: configPreview.hostName,
          entryFee: configPreview.entryFee,
          prizeCount: configPreview.prizes?.length || 0,
          roundsCount: configPreview.roundDefinitions?.length || 0
        });
      } catch (parseErr) {
        console.log('  - ⚠️ Failed to parse config_json:', parseErr.message);
        console.log('  - config_json raw (first 200 chars):', String(rows[0].config_json).substring(0, 200));
      }
    }

    return res.status(200).json({ rooms: rows });
  } catch (err) {
    console.error('[web2-rooms API] ❌ Failed listing WEB2 rooms:', err);
    return res.status(500).json({ error: 'internal_error' });
  }
});

export default router;
