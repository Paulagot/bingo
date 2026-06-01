// routes/feedbackRoutes.js
// Public routes — no auth middleware. Players are not logged in.
//
// POST /api/feedback          → submit player feedback
// GET  /api/feedback/:roomId  → aggregate summary for a room

import { Router } from 'express';
import { FeedbackService } from '../services/FeedbackService.js';

export function createFeedbackRouter(db) {
  const router = Router();
  const feedbackService = new FeedbackService(db);

  // ── POST /api/feedback ──────────────────────────────────────────────────
  router.post('/', async (req, res) => {
    try {
      const payload = req.body;

      // Reject if the player dismissed without answering anything
      const hasAnyAnswer =
        payload.enjoyed_game !== undefined ||
        payload.play_again   !== undefined ||
        payload.recommend    !== undefined;

      if (!hasAnyAnswer) {
        return res.status(400).json({ ok: false, error: 'No answers provided' });
      }

      const result = await feedbackService.submitFeedback(payload);

      if (!result.ok) {
        return res.status(400).json(result);
      }

      return res.status(201).json(result);
    } catch (err) {
      console.error('[Feedback] POST error:', err);
      return res.status(500).json({ ok: false, error: 'Server error' });
    }
  });

  // ── GET /api/feedback/:roomId ───────────────────────────────────────────
  router.get('/:roomId', async (req, res) => {
    try {
      const { roomId } = req.params;
      if (!roomId) {
        return res.status(400).json({ ok: false, error: 'roomId required' });
      }

      const summary = await feedbackService.getRoomFeedbackSummary(roomId);
      return res.json({ ok: true, ...summary });
    } catch (err) {
      console.error('[Feedback] GET summary error:', err);
      return res.status(500).json({ ok: false, error: 'Server error' });
    }
  });

  return router;
}