import express from 'express';
import authenticateToken from '../../middleware/auth.js';

import {
  getPersonalisedRoundByRoom,
  upsertPersonalisedRound,
  deletePersonalisedRound,
} from '../services/quizPersonalisedRoundService.js';

const router = express.Router();
const DEBUG = true;

// All routes are host/admin authenticated (same pattern as other mgtsystem features)
router.use(authenticateToken);

/**
 * GET /api/quiz/personalised-round/:roomId
 * Returns round + questions or null
 */
router.get('/:roomId', async (req, res) => {
  try {
    const { roomId } = req.params;
    const clubId = req.club_id;

    if (!roomId) return res.status(400).json({ error: 'roomId required' });

    const round = await getPersonalisedRoundByRoom({ roomId, clubId });
    return res.status(200).json({ ok: true, round });

  } catch (err) {
    console.error('[PersonalisedRound API] ❌ get error:', err);
    return res.status(err.status || 500).json({
      error: 'internal_error',
      message: err.message,
      details: err.details || undefined,
    });
  }
});

/**
 * PUT /api/quiz/personalised-round/:roomId
 * Upsert round + replace questions
 * body: { title?, position: 'first'|'last', isEnabled?, questions: [...] }
 */
router.put('/:roomId', async (req, res) => {
  try {
    const { roomId } = req.params;
    const clubId = req.club_id;

    if (!roomId) return res.status(400).json({ error: 'roomId required' });

    const saved = await upsertPersonalisedRound({
      roomId,
      clubId,
      payload: req.body || {},
    });

    if (DEBUG) console.log('[PersonalisedRound API] ✅ saved', { roomId });

    return res.status(200).json({ ok: true, round: saved });

  } catch (err) {
    console.error('[PersonalisedRound API] ❌ save error:', err);
    return res.status(err.status || 500).json({
      error: 'save_failed',
      message: err.message,
      details: err.details || undefined,
    });
  }
});

/**
 * DELETE /api/quiz/personalised-round/:roomId
 * Deletes the round + cascades questions
 */
router.delete('/:roomId', async (req, res) => {
  try {
    const { roomId } = req.params;
    const clubId = req.club_id;

    if (!roomId) return res.status(400).json({ error: 'roomId required' });

    const result = await deletePersonalisedRound({ roomId, clubId });
    return res.status(200).json({ ok: true, ...result });

  } catch (err) {
    console.error('[PersonalisedRound API] ❌ delete error:', err);
    return res.status(err.status || 500).json({
      error: 'delete_failed',
      message: err.message,
    });
  }
});

export default router;