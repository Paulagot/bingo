// server/puzzles/routes/subscriptionReconciliationRoutes.js
//
// Period-aware reconciliation endpoints for puzzle subscriptions.
// Mounted at /api/subscription-reconciliation.
//
// GET  /room/:roomId/current      - current (draft or just-approved) period + its adjustments + live receipts
// GET  /room/:roomId/history      - every period, oldest first
// GET  /room/:roomId/summary      - lifetime rollup across all periods
// POST /room/:roomId/adjustments  - add adjustment to the CURRENT period (opens one if needed)
// PATCH /room/:roomId/adjustments/:id
// DELETE /room/:roomId/adjustments/:id
// POST /room/:roomId/approve      - lock the current period, start the next one's baseline

import express from 'express';
import { connection, TABLE_PREFIX } from '../../config/database.js';
import { authenticateToken } from '../../middleware/auth.js';
import {
  getLatestReconciliation,
  getReconciliationHistory,
  getReconciliationById,
  getAdjustmentsForReconciliation,
  getLifetimeSummary,
  getPeriodReceipts,
  previewCurrentPeriod,
  ensureCurrentDraftReconciliation,
  approveCurrentPeriod,
} from '../services/subscriptionReconciliationService.js';
// Reused as-is - these are already generic (room_id + reconciliation_id),
// nothing ticketed-event-specific in their SQL. No need to duplicate them
// a third time.
import {
  addAdjustment,
  updateAdjustment,
  deleteAdjustment,
} from '../../ticketedEvent/api/ticketedEventReconciliationService.js';

const router = express.Router();
router.use(authenticateToken);

const ROOMS_TABLE = `${TABLE_PREFIX}web2_quiz_rooms`;

async function getOwnedRoomClubId(roomId, req, res) {
  const [[room]] = await connection.execute(
    `SELECT club_id FROM ${ROOMS_TABLE} WHERE room_id = ? AND game_type = 'puzzle_sub' LIMIT 1`,
    [roomId]
  );
  if (!room) {
    res.status(404).json({ error: 'Room not found' });
    return null;
  }
  if (req.user?.club_id && req.user.club_id !== room.club_id) {
    res.status(403).json({ error: 'Forbidden' });
    return null;
  }
  return room.club_id;
}

// ─── GET current period ───────────────────────────────────────────────────────

router.get('/room/:roomId/current', async (req, res) => {
  const { roomId } = req.params;
  try {
    const clubId = await getOwnedRoomClubId(roomId, req, res);
    if (!clubId) return;

    const { period, adjustments, liveReceipts } = await previewCurrentPeriod(roomId);
    res.json({ reconciliation: period, adjustments, liveReceipts });
  } catch (err) {
    console.error('[SubRecon] GET current error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── GET history ──────────────────────────────────────────────────────────────

router.get('/room/:roomId/history', async (req, res) => {
  const { roomId } = req.params;
  try {
    const clubId = await getOwnedRoomClubId(roomId, req, res);
    if (!clubId) return;

    const history = await getReconciliationHistory(roomId);
    res.json({ history });
  } catch (err) {
    console.error('[SubRecon] GET history error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── GET lifetime summary ──────────────────────────────────────────────────────

router.get('/room/:roomId/summary', async (req, res) => {
  const { roomId } = req.params;
  try {
    const clubId = await getOwnedRoomClubId(roomId, req, res);
    if (!clubId) return;

    const summary = await getLifetimeSummary(roomId);
    res.json({ summary });
  } catch (err) {
    console.error('[SubRecon] GET summary error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── POST add adjustment (to the current period) ─────────────────────────────

router.post('/room/:roomId/adjustments', async (req, res) => {
  const { roomId } = req.params;
  const { adjustmentType, amount, paymentMethod, reasonCode, note, createdBy } = req.body;
  try {
    const clubId = await getOwnedRoomClubId(roomId, req, res);
    if (!clubId) return;

    const draft = await ensureCurrentDraftReconciliation(roomId, clubId);

    const insertedId = await addAdjustment({
      roomId,
      clubId,
      reconciliationId: draft.id,
      adjustmentType,
      amount,
      currency: (req.body.currency || 'EUR'),
      paymentMethod: paymentMethod ?? null,
      reasonCode: reasonCode ?? null,
      note: note ?? null,
      createdBy: createdBy ?? null,
    });

    const [[row]] = await connection.execute(
      `SELECT id, room_id, ts, adjustment_type, amount, currency,
              payment_method, reason_code, note, created_by, created_at
       FROM ${TABLE_PREFIX}quiz_reconciliation_adjustments WHERE id = ?`,
      [insertedId]
    );

    res.json({
      reconciliationId: draft.id,
      adjustment: {
        id:             String(row.id),
        roomId:         row.room_id,
        ts:             row.ts,
        adjustmentType: row.adjustment_type,
        amount:         Number(row.amount ?? 0),
        currency:       row.currency,
        paymentMethod:  row.payment_method  ?? null,
        reasonCode:     row.reason_code     ?? null,
        note:           row.note            ?? null,
        createdBy:      row.created_by      ?? null,
        createdAt:      row.created_at,
      },
    });
  } catch (err) {
    console.error('[SubRecon] POST adjustments error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── PATCH / DELETE adjustment ─────────────────────────────────────────────────

router.patch('/room/:roomId/adjustments/:id', async (req, res) => {
  const { roomId, id } = req.params;
  const fieldKeys = ['adjustmentType', 'paymentMethod', 'reasonCode', 'amount', 'note'];
  const patch = {};
  for (const key of fieldKeys) {
    if (req.body[key] !== undefined) patch[key] = req.body[key];
  }
  if (Object.keys(patch).length === 0) {
    return res.status(400).json({ error: 'No valid fields to update' });
  }
  try {
    const clubId = await getOwnedRoomClubId(roomId, req, res);
    if (!clubId) return;

    const ok = await updateAdjustment(roomId, id, patch);
    if (!ok) return res.status(404).json({ error: 'Adjustment not found' });
    res.json({ ok: true });
  } catch (err) {
    console.error('[SubRecon] PATCH adjustment error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/room/:roomId/adjustments/:id', async (req, res) => {
  const { roomId, id } = req.params;
  try {
    const clubId = await getOwnedRoomClubId(roomId, req, res);
    if (!clubId) return;

    const ok = await deleteAdjustment(roomId, id);
    if (!ok) return res.status(404).json({ error: 'Adjustment not found' });
    res.json({ ok: true });
  } catch (err) {
    console.error('[SubRecon] DELETE adjustment error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── POST approve - lock the current period ───────────────────────────────────

router.post('/room/:roomId/approve', async (req, res) => {
  const { roomId } = req.params;
  const { approvedBy, notes, finalLeaderboard } = req.body;

  if (!approvedBy?.trim()) {
    return res.status(400).json({ error: 'approvedBy is required' });
  }

  try {
    const clubId = await getOwnedRoomClubId(roomId, req, res);
    if (!clubId) return;

    const draft = await ensureCurrentDraftReconciliation(roomId, clubId);

    const approved = await approveCurrentPeriod({
      roomId,
      clubId,
      reconciliationId: draft.id,
      approvedBy: approvedBy.trim(),
      notes: notes?.trim() || null,
      finalLeaderboard: finalLeaderboard ?? null,
    });

    res.json({ ok: true, reconciliation: approved });
  } catch (err) {
    console.error('[SubRecon] POST approve error:', err);
    if (err.message === 'already_approved') {
      return res.status(409).json({ error: 'This period has already been approved.' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;