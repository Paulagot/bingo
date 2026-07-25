import express from 'express';
import { getUnpaidPlayersForRoom, getUnpaidPlayerCountsForRooms, markPlayerPaidLate, writeOffPlayerPayment, } from '../services/quizLatePaymentService.js';

const router = express.Router();

// GET unpaid players for a room (DB-driven)
router.get('/unpaid', async (req, res) => {
  try {
    const roomId = String(req.query.roomId || '').trim();
    if (!roomId) return res.status(400).json({ ok: false, message: 'roomId is required' });

    const players = await getUnpaidPlayersForRoom(roomId);
    return res.json({ ok: true, players });
  } catch (err) {
    console.error('[quizLatePayments] unpaid error', err);
    return res.status(500).json({ ok: false, message: 'Failed to load unpaid players' });
  }
});

// POST unpaid player counts for multiple rooms
router.post('/unpaid-counts', async (req, res) => {
  try {
    const { roomIds } = req.body || {};

    if (!Array.isArray(roomIds) || roomIds.length === 0) {
      return res.status(400).json({
        ok: false,
        message: 'roomIds[] is required',
      });
    }

    const counts = await getUnpaidPlayerCountsForRooms(roomIds);

    return res.json({
      ok: true,
      counts,
    });
  } catch (err) {
    console.error('[quizLatePayments] unpaid-counts error', err);

    return res.status(500).json({
      ok: false,
      message: 'Failed to load unpaid player counts',
    });
  }
});

router.post('/write-off', async (req, res) => {
  try {
    const {
      roomId,
      playerId,
      adminNotes,
      confirmedBy,
      confirmedByName,
      confirmedByRole,
    } = req.body || {};

    if (!roomId || !playerId || !confirmedBy) {
      return res.status(400).json({
        ok: false,
        message: 'roomId, playerId, confirmedBy are required',
      });
    }

    const result = await writeOffPlayerPayment({
      roomId,
      playerId,
      writtenOffBy: confirmedBy,
      writtenOffByName: confirmedByName,
      writtenOffByRole: confirmedByRole,
      adminNotes,
    });

    if (!result.ok) {
      return res.status(400).json({
        ok: false,
        message: result.error || 'No rows updated',
      });
    }

    return res.json({ ok: true, updated: result.updated });
  } catch (err) {
    console.error('[quizLatePayments] write-off error', err);
    return res.status(500).json({
      ok: false,
      message: 'Failed to write off payment',
    });
  }
});

// POST mark player paid late (confirms outstanding rows)
router.post('/mark-late-paid', async (req, res) => {
  try {
    const {
      roomId,
      playerId,
      adminNotes,
      paymentMethod,
      clubPaymentMethodId,
      // identity should come from auth middleware in a perfect world
      confirmedBy,
      confirmedByName,
      confirmedByRole,
    } = req.body || {};

    if (!roomId || !playerId || !confirmedBy) {
      return res.status(400).json({ ok: false, message: 'roomId, playerId, confirmedBy are required' });
    }

    const result = await markPlayerPaidLate({
      roomId,
      playerId,
      confirmedBy,
      confirmedByName,
      confirmedByRole,
      adminNotes,
      paymentMethod,
      clubPaymentMethodId: clubPaymentMethodId ?? null,
    });

    if (!result.ok) {
      return res.status(400).json({ ok: false, message: result.error || 'No rows updated' });
    }

    return res.json({ ok: true, updated: result.updated });
  } catch (err) {
    console.error('[quizLatePayments] mark-late-paid error', err);
    return res.status(500).json({ ok: false, message: 'Failed to mark late payment' });
  }
});

export default router;
