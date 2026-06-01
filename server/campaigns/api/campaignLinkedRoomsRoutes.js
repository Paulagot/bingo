// server/campaigns/api/campaignLinkedRoomsRoutes.js
//
// Auth-gated route that returns the rooms linked to a campaign.
// Used by CampaignProductEditorModal to populate the room dropdown.
//
// Rooms are linked to a campaign via the campaign_id column on
// FL_web2_quiz_rooms — the same table used by quiz and elimination.
//
// Mount in server/index.js (auth-gated, same as elimination mgmt):
//   import campaignLinkedRoomsRoutes from './campaigns/api/campaignLinkedRoomsRoutes.js';
//   app.use('/api', requireAuth, campaignLinkedRoomsRoutes);

import { Router } from 'express';
import authenticateToken from '../../middleware/auth.js';
import { connection, TABLE_PREFIX } from '../../config/database.js';

const router = Router();

// Auth applied per-route via index.js mount

const T_ROOMS     = `${TABLE_PREFIX}web2_quiz_rooms`;
const T_CAMPAIGNS = `${TABLE_PREFIX}campaigns`;

function parseJson(v, fallback = null) {
  if (!v) return fallback;
  if (typeof v === 'object') return v;
  try { return JSON.parse(v); } catch { return fallback; }
}

/**
 * GET /api/campaigns/:campaignId/linked-rooms
 *
 * Returns rooms linked to this campaign that belong to the authenticated club.
 * Only returns non-cancelled rooms.
 *
 * Response:
 *   { ok: true, rooms: [{ room_id, game_type, status, label, scheduled_at }] }
 */
router.get('/campaigns/:campaignId/linked-rooms', authenticateToken, async (req, res) => {
  try {
    const clubId     = req.club_id;
    const campaignId = req.params.campaignId;

    if (!campaignId) {
      return res.status(400).json({ ok: false, error: 'missing_campaign_id' });
    }

    // Verify campaign ownership
    const [campRows] = await connection.execute(
      `SELECT id FROM ${T_CAMPAIGNS} WHERE id = ? AND club_id = ? LIMIT 1`,
      [campaignId, clubId]
    );
    if (!campRows[0]) {
      return res.status(404).json({ ok: false, error: 'campaign_not_found' });
    }

    // Return only scheduled rooms for this club.
    // Completed/cancelled/live rooms cannot be added to new products.
    const [rows] = await connection.execute(
      `SELECT
         room_id,
         game_type,
         status,
         scheduled_at,
         time_zone,
         config_json
       FROM ${T_ROOMS}
       WHERE club_id  = ?
         AND status   = 'scheduled'
       ORDER BY scheduled_at DESC, created_at DESC
       LIMIT 100`,
      [clubId]
    );

    const rooms = rows.map(row => {
      const config = parseJson(row.config_json, {});

      const eventName = config.eventName
                     ?? config.quizName
                     ?? config.roomName
                     ?? null;

      const gameTypeLabel = {
        quiz:        'Quiz',
        elimination: 'Last Player Standing',
        puzzle:      'Puzzle Challenge',
      }[row.game_type] ?? row.game_type ?? 'Event';

      const label = eventName
        ? `${eventName} (${gameTypeLabel})`
        : `${gameTypeLabel} — ${row.room_id}`;

      return {
        room_id:      row.room_id,
        game_type:    row.game_type ?? 'quiz',
        status:       row.status,
        label,
        scheduled_at: row.scheduled_at ?? null,
        time_zone:    row.time_zone    ?? null,
      };
    });

    res.json({ ok: true, rooms });

  } catch (err) {
    console.error('[LinkedRooms] ❌', err.message);
    res.status(500).json({ ok: false, error: err.message ?? 'internal_error' });
  }
});

export default router;