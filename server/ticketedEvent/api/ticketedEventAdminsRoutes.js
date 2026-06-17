// server/ticketedEvent/api/ticketedEventAdminsRoutes.js
//
// NEW FILE — manages door staff / admins for ticketed_event rooms.
// Persists to web2_quiz_rooms.config_json.admins (same shape used by
// quiz/elimination: [{ id, name, createdAt }]) so the Impact tab's existing
// volunteer-counting logic works unchanged.
//
// Mount this router at /api/ticketed-event/admins in your main app file:
//   import ticketedEventAdminsRoutes from './ticketedEvent/api/ticketedEventAdminsRoutes.js';
//   app.use('/api/ticketed-event/admins', ticketedEventAdminsRoutes);
//
// Routes:
//   GET    /room/:roomId           — list admins
//   POST   /room/:roomId           — add an admin { name }
//   DELETE /room/:roomId/:adminId  — remove an admin

import express from 'express';
import { connection, TABLE_PREFIX } from '../../config/database.js';
import { authenticateToken } from '../../middleware/auth.js';

const router = express.Router();
const ROOMS_TABLE = `${TABLE_PREFIX}web2_quiz_rooms`;

function parseConfig(raw) {
  if (!raw) return {};
  if (typeof raw === 'object') return raw;
  try { return JSON.parse(raw); } catch { return {}; }
}

async function getRoomConfig(roomId) {
  const [[room]] = await connection.execute(
    `SELECT room_id, club_id, config_json, game_type FROM ${ROOMS_TABLE} WHERE room_id = ? LIMIT 1`,
    [roomId]
  );
  if (!room) return null;
  return { ...room, config: parseConfig(room.config_json) };
}

async function saveRoomConfig(roomId, config) {
  await connection.execute(
    `UPDATE ${ROOMS_TABLE} SET config_json = ?, updated_at = NOW() WHERE room_id = ?`,
    [JSON.stringify(config), roomId]
  );
}

// ── GET /room/:roomId — list admins ────────────────────────────────────────
// Public (no auth) — door staff with only an operator token still need to
// see the current staff list when opening the dashboard.
router.get('/room/:roomId', async (req, res) => {
  try {
    const { roomId } = req.params;
    const room = await getRoomConfig(roomId);
    if (!room) return res.status(404).json({ error: 'Room not found' });

    const admins = Array.isArray(room.config.admins) ? room.config.admins : [];
    res.json({ ok: true, admins });
  } catch (err) {
    console.error('[TicketedEventAdmins] GET error:', err);
    res.status(500).json({ error: 'internal_error' });
  }
});

// ── POST /room/:roomId — add an admin ──────────────────────────────────────
// Auth required — only the logged-in host can add door staff (door staff
// themselves connect via operator token, which doesn't pass authenticateToken,
// so they can't add other staff — only the host can, from the dashboard).
router.post('/room/:roomId', authenticateToken, async (req, res) => {
  try {
    const { roomId } = req.params;
    const { name }    = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'name is required' });
    }

    const room = await getRoomConfig(roomId);
    if (!room) return res.status(404).json({ error: 'Room not found' });
    if (room.club_id !== req.club_id) return res.status(403).json({ error: 'Forbidden' });

    const admins = Array.isArray(room.config.admins) ? room.config.admins : [];

    const newAdmin = {
      id:        `admin-${Date.now()}`,
      name:      name.trim(),
      createdAt: new Date().toISOString(),
    };

    const updatedConfig = { ...room.config, admins: [...admins, newAdmin] };
    await saveRoomConfig(roomId, updatedConfig);

    res.json({ ok: true, admin: newAdmin, admins: updatedConfig.admins });
  } catch (err) {
    console.error('[TicketedEventAdmins] POST error:', err);
    res.status(500).json({ error: 'internal_error' });
  }
});

// ── DELETE /room/:roomId/:adminId — remove an admin ────────────────────────
router.delete('/room/:roomId/:adminId', authenticateToken, async (req, res) => {
  try {
    const { roomId, adminId } = req.params;

    const room = await getRoomConfig(roomId);
    if (!room) return res.status(404).json({ error: 'Room not found' });
    if (room.club_id !== req.club_id) return res.status(403).json({ error: 'Forbidden' });

    const admins = Array.isArray(room.config.admins) ? room.config.admins : [];
    const updatedAdmins = admins.filter(a => a.id !== adminId);

    const updatedConfig = { ...room.config, admins: updatedAdmins };
    await saveRoomConfig(roomId, updatedConfig);

    res.json({ ok: true, admins: updatedAdmins });
  } catch (err) {
    console.error('[TicketedEventAdmins] DELETE error:', err);
    res.status(500).json({ error: 'internal_error' });
  }
});

export default router;