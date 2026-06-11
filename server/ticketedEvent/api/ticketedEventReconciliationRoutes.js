// server/ticketedEvent/api/ticketedEventReconciliationRoutes.js
//
// Reconciliation endpoints for completed ticketed events.
// Mounted at /api/ticketed-event/reconciliation
//
// All routes require club authentication (authenticateToken).
// No sockets — ticketed events are fully HTTP-based.
//
// Reuses the shared quiz_reconciliation + quiz_reconciliation_adjustments
// tables and saveCompleteReconciliation / calculateStartingTotalsFromLedger
// from quizReconciliationService so the audit view works without changes.

import express from 'express';
import authenticateToken from '../../middleware/auth.js';
import { connection, TABLE_PREFIX } from '../../config/database.js';
import {
  getTicketedRoomMeta,
  getReconciliationByRoomId,
  getAdjustmentsByRoomId,
  ensureDraftReconciliation,
  addAdjustment,
  updateAdjustment,
  deleteAdjustment,
  getPaymentSummary,
} from './ticketedEventReconciliationService.js';
import {
  saveCompleteReconciliation,
  calculateStartingTotalsFromLedger,
} from '../../mgtsystem/services/quizReconciliationService.js';

const router = express.Router();

// All routes require auth
router.use(authenticateToken);

// ─── Helper: verify club owns this ticketed event room ────────────────────────

async function verifyRoomOwnership(clubId, roomId) {
  const [rows] = await connection.execute(
    `SELECT room_id FROM ${TABLE_PREFIX}web2_quiz_rooms
     WHERE room_id = ? AND club_id = ? AND game_type = 'ticketed_event' LIMIT 1`,
    [roomId, clubId],
  );
  return rows.length > 0;
}

const sendError = (res, err) => {
  console.error('[ticketedEventReconciliation] ❌', err);
  const status = err?.statusCode || 500;
  return res.status(status).json({ ok: false, error: err?.message || 'internal_error' });
};

// ─── GET /room/:roomId ────────────────────────────────────────────────────────
// Returns current reconciliation state: header (may be null before first
// approval), adjustments, and payment summary from the ledger.

router.get('/room/:roomId', async (req, res) => {
  try {
    const clubId = req.club_id;
    const { roomId } = req.params;
    if (!clubId) return res.status(401).json({ ok: false, error: 'unauthorized' });
    if (!roomId) return res.status(400).json({ ok: false, error: 'missing_room_id' });

    const owned = await verifyRoomOwnership(clubId, roomId);
    if (!owned) return res.status(403).json({ ok: false, error: 'forbidden' });

    const meta          = await getTicketedRoomMeta(roomId);
    const reconciliation = await getReconciliationByRoomId(roomId);
    const adjustments   = await getAdjustmentsByRoomId(roomId);
    const summary       = await getPaymentSummary(roomId);

    return res.json({
      ok: true,
      meta,
      reconciliation,   // null until first approval; has approvedAt once approved
      adjustments,
      summary,
    });
  } catch (err) {
    return sendError(res, err);
  }
});

// ─── POST /room/:roomId/adjustments ──────────────────────────────────────────
// Add a manual adjustment. Creates a draft reconciliation row if one doesn't
// exist yet (so adjustments have a reconciliation_id FK to reference).

router.post('/room/:roomId/adjustments', async (req, res) => {
  try {
    const clubId = req.club_id;
    const { roomId } = req.params;
    if (!clubId) return res.status(401).json({ ok: false, error: 'unauthorized' });

    const owned = await verifyRoomOwnership(clubId, roomId);
    if (!owned) return res.status(403).json({ ok: false, error: 'forbidden' });

    // Block if already approved
    const existing = await getReconciliationByRoomId(roomId);
    if (existing?.approvedAt) {
      return res.status(409).json({ ok: false, error: 'reconciliation_already_approved' });
    }

    const meta = await getTicketedRoomMeta(roomId);
    if (!meta) return res.status(404).json({ ok: false, error: 'room_not_found' });

    // Ensure draft reconciliation row exists
    const { id: reconciliationId } = await ensureDraftReconciliation(roomId, clubId);

    const {
      adjustmentType = 'received',
      amount = 0,
      paymentMethod = 'cash',
      reasonCode = 'late_payment',
      note = null,
      createdBy,
    } = req.body || {};

    const insertId = await addAdjustment({
      roomId, clubId, reconciliationId,
      adjustmentType,
      amount: parseFloat(amount) || 0,
      currency: meta.currency || 'EUR',
      paymentMethod,
      reasonCode,
      note: note?.trim() || null,
      createdBy: createdBy || meta.hostName || 'Host',
    });

    // Return the new row so the frontend can add it to state
    const [rows] = await connection.execute(
      `SELECT id, room_id, ts, adjustment_type, amount, currency,
              payment_method, reason_code, note, created_by, created_at
       FROM ${TABLE_PREFIX}quiz_reconciliation_adjustments
       WHERE id = ? LIMIT 1`,
      [insertId],
    );

    const row = rows[0];
    return res.status(201).json({
      ok: true,
      adjustment: {
        id:             row.id.toString(),
        roomId:         row.room_id,
        ts:             row.ts instanceof Date ? row.ts.toISOString() : String(row.ts),
        adjustmentType: row.adjustment_type,
        amount:         parseFloat(row.amount),
        currency:       row.currency,
        paymentMethod:  row.payment_method,
        reasonCode:     row.reason_code,
        note:           row.note,
        createdBy:      row.created_by,
        createdAt:      row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at),
      },
    });
  } catch (err) {
    return sendError(res, err);
  }
});

// ─── PATCH /room/:roomId/adjustments/:adjustmentId ───────────────────────────
// Update one field on an existing adjustment (e.g. amount on blur, note on blur).

router.patch('/room/:roomId/adjustments/:adjustmentId', async (req, res) => {
  try {
    const clubId = req.club_id;
    const { roomId, adjustmentId } = req.params;
    if (!clubId) return res.status(401).json({ ok: false, error: 'unauthorized' });

    const owned = await verifyRoomOwnership(clubId, roomId);
    if (!owned) return res.status(403).json({ ok: false, error: 'forbidden' });

    const existing = await getReconciliationByRoomId(roomId);
    if (existing?.approvedAt) {
      return res.status(409).json({ ok: false, error: 'reconciliation_already_approved' });
    }

    const updated = await updateAdjustment(roomId, adjustmentId, req.body || {});
    if (!updated) return res.status(404).json({ ok: false, error: 'adjustment_not_found' });

    return res.json({ ok: true });
  } catch (err) {
    return sendError(res, err);
  }
});

// ─── DELETE /room/:roomId/adjustments/:adjustmentId ──────────────────────────

router.delete('/room/:roomId/adjustments/:adjustmentId', async (req, res) => {
  try {
    const clubId = req.club_id;
    const { roomId, adjustmentId } = req.params;
    if (!clubId) return res.status(401).json({ ok: false, error: 'unauthorized' });

    const owned = await verifyRoomOwnership(clubId, roomId);
    if (!owned) return res.status(403).json({ ok: false, error: 'forbidden' });

    const existing = await getReconciliationByRoomId(roomId);
    if (existing?.approvedAt) {
      return res.status(409).json({ ok: false, error: 'reconciliation_already_approved' });
    }

    const deleted = await deleteAdjustment(roomId, adjustmentId);
    if (!deleted) return res.status(404).json({ ok: false, error: 'adjustment_not_found' });

    return res.json({ ok: true });
  } catch (err) {
    return sendError(res, err);
  }
});

// ─── POST /room/:roomId/approve ───────────────────────────────────────────────
// Finalise reconciliation:
//   1. calculateStartingTotalsFromLedger — authoritative totals from DB
//   2. Calculate adjustments net from current adjustment rows
//   3. saveCompleteReconciliation — upserts header, replaces adjustments,
//      stamps confirmed ledger rows with reconciliation_id
//
// No leaderboard or prize awards for ticketed events.

router.post('/room/:roomId/approve', async (req, res) => {
  try {
    const clubId = req.club_id;
    const { roomId } = req.params;
    if (!clubId) return res.status(401).json({ ok: false, error: 'unauthorized' });
    if (!roomId) return res.status(400).json({ ok: false, error: 'missing_room_id' });

    const owned = await verifyRoomOwnership(clubId, roomId);
    if (!owned) return res.status(403).json({ ok: false, error: 'forbidden' });

    // Block double-approval
    const existing = await getReconciliationByRoomId(roomId);
    if (existing?.approvedAt) {
      return res.status(409).json({ ok: false, error: 'already_approved', approvedAt: existing.approvedAt });
    }

    const { approvedBy, notes } = req.body || {};
    if (!approvedBy?.trim()) {
      return res.status(400).json({ ok: false, error: 'approvedBy is required' });
    }

    const approvedAt = new Date().toISOString();

    // 1. Authoritative starting totals from payment ledger
    const startingTotals = await calculateStartingTotalsFromLedger(roomId);
    console.log(`[ticketedEventRecon] 💰 Starting totals for ${roomId}:`, startingTotals);

    // 2. Current adjustments from DB
    const adjustments = await getAdjustmentsByRoomId(roomId);

    // 3. Compute adjustments net
    let adjustmentsNet = 0;
    for (const adj of adjustments) {
      const amt = Number(adj.amount || 0);
      if (
        adj.adjustmentType === 'received' ||
        (adj.adjustmentType === 'cash_over_short' && adj.reasonCode === 'cash_over')
      ) {
        adjustmentsNet += amt;
      } else {
        adjustmentsNet -= amt;
      }
    }

    const finalTotal = startingTotals.total + adjustmentsNet;

    // 4. Map adjustments to the shape saveCompleteReconciliation expects
    const adjustmentsPayload = adjustments.map(adj => ({
      ts:         adj.ts,
      type:       adj.adjustmentType,
      amount:     adj.amount,
      currency:   adj.currency || 'EUR',
      method:     adj.paymentMethod || null,
      reasonCode: adj.reasonCode || null,
      payerId:    null,
      note:       adj.note || null,
      createdBy:  adj.createdBy || 'Host',
      meta:       null,
    }));

    // 5. Save — reuses quiz reconciliation service (no leaderboard for events)
    const result = await saveCompleteReconciliation({
      roomId,
      clubId,
      startingEntryFees: startingTotals.entryFees,
      startingExtras:    startingTotals.extras,
      startingTotal:     startingTotals.total,
      adjustmentsNet,
      finalTotal,
      approvedBy:        approvedBy.trim(),
      approvedById:      req.user?.id || req.user?.member_id || null,
      approvedAt,
      notes:             notes?.trim() || null,
      adjustments:       adjustmentsPayload,
      finalLeaderboard:  null,   // ticketed events have no leaderboard
      prizeAwards:       null,
    });

    // 6. Update reconciliation_status on the room row so the drawer refreshes
    await connection.execute(
      `UPDATE ${TABLE_PREFIX}web2_quiz_rooms
       SET reconciliation_status = 'closed', updated_at = UTC_TIMESTAMP()
       WHERE room_id = ?`,
      [roomId],
    );

    console.log(`[ticketedEventRecon] ✅ Approved reconciliation for ${roomId} — total: ${finalTotal}`);

    return res.json({
      ok: true,
      data: {
        roomId,
        reconciliationId: result.reconciliationId,
        adjustmentCount:  result.adjustmentCount,
        startingTotal:    startingTotals.total,
        adjustmentsNet,
        finalTotal,
        approvedAt,
        approvedBy:       approvedBy.trim(),
      },
    });
  } catch (err) {
    return sendError(res, err);
  }
});

// ─── GET /room/:roomId/payment-view ──────────────────────────────────────────
// Proxy to the shared reconciliation-view endpoint so the frontend only needs
// one auth context. Returns onTheNight (confirmedGroups, claimed, disputed,
// expected) and byMethod — same shape as quiz/elimination uses.

router.get('/room/:roomId/payment-view', async (req, res) => {
  try {
    const clubId = req.club_id;
    const { roomId } = req.params;
    if (!clubId) return res.status(401).json({ ok: false, error: 'unauthorized' });

    const owned = await verifyRoomOwnership(clubId, roomId);
    if (!owned) return res.status(403).json({ ok: false, error: 'forbidden' });

    // Reuse the existing quiz reconciliation view — works for ticketed events
    // because all ticket payments write to quiz_payment_ledger.
    const LEDGER  = `${TABLE_PREFIX}quiz_payment_ledger`;
    const CPM     = `${TABLE_PREFIX}club_payment_methods`;

    // ── On-the-night payments grouped by status ────────────────────────────
    const [onNightRows] = await connection.execute(
      `SELECT
         pl.player_id,
         pl.player_name,
         pl.ticket_id,
         pl.payment_method,
         pl.status,
         COALESCE(pl.confirmed_by, 'unconfirmed')  AS confirmed_by_id,
         COALESCE(pl.confirmed_by_name, '')         AS confirmed_by_name,
         COALESCE(pl.confirmed_by_role, '')         AS confirmed_by_role,
         pl.payment_reference,
         cpm.method_label,
         SUM(pl.amount)                             AS total_amount
       FROM ${LEDGER} pl
       LEFT JOIN ${CPM} cpm ON pl.club_payment_method_id = cpm.id
       WHERE pl.room_id = ?
       GROUP BY
         pl.player_id, pl.player_name, pl.ticket_id, pl.payment_method,
         pl.status, pl.confirmed_by, pl.confirmed_by_name,
         pl.confirmed_by_role, pl.payment_reference, cpm.method_label
       ORDER BY pl.status ASC, pl.player_name ASC`,
      [roomId],
    );

    const confirmedGroups = new Map();
    const claimedPlayers  = [];
    const disputedPlayers = [];

    for (const row of onNightRows) {
      const player = {
        playerId:         row.player_id,
        playerName:       row.player_name,
        ticketId:         row.ticket_id || null,
        paymentMethod:    row.payment_method,
        methodLabel:      row.method_label || null,
        paymentReference: row.payment_reference || null,
        amount:           Number(row.total_amount || 0),
        status:           row.status,
      };

      if (row.status === 'confirmed') {
        // Only show manual confirmations in the breakdown (exclude webhook_auto / system)
        const isAutoConfirmed = ['webhook_auto', 'system', 'system_zero_donation'].includes(row.confirmed_by_id);
        const isManual = ['cash', 'card', 'card_tap', 'instant_payment', 'pay_admin'].includes(row.payment_method);

        if (isManual && !isAutoConfirmed) {
          const id   = row.confirmed_by_id;
          const name = row.confirmed_by_name || 'Unknown';
          const role = row.confirmed_by_role;

          if (!confirmedGroups.has(id)) {
            confirmedGroups.set(id, {
              confirmedById:   id,
              confirmedByName: name,
              confirmedByRole: role,
              totalAmount:     0,
              players:         [],
            });
          }
          const group = confirmedGroups.get(id);
          group.totalAmount += player.amount;
          group.players.push(player);
        }

      } else if (row.status === 'claimed') {
        claimedPlayers.push(player);
      } else if (row.status === 'disputed') {
        disputedPlayers.push(player);
      }
    }

    const confirmedGroupsArr = [...confirmedGroups.values()]
      .sort((a, b) => b.totalAmount - a.totalAmount);

    return res.json({
      ok: true,
      onTheNight: {
        confirmedGroups: confirmedGroupsArr,
        claimed:         claimedPlayers,
        disputed:        disputedPlayers,
        totalClaimed:    claimedPlayers.reduce((s, p) => s + p.amount, 0),
        totalDisputed:   disputedPlayers.reduce((s, p) => s + p.amount, 0),
      },
    });
  } catch (err) {
    return sendError(res, err);
  }
});

// ─── POST /room/:roomId/dispute-payment ───────────────────────────────────────
// Mark a claimed ledger row as disputed with a reason.
// Only claimed rows can be disputed (Stripe/crypto are already confirmed).

router.post('/room/:roomId/dispute-payment', async (req, res) => {
  try {
    const clubId = req.club_id;
    const { roomId } = req.params;
    if (!clubId) return res.status(401).json({ ok: false, error: 'unauthorized' });

    const owned = await verifyRoomOwnership(clubId, roomId);
    if (!owned) return res.status(403).json({ ok: false, error: 'forbidden' });

    const { playerId, reason } = req.body || {};
    if (!playerId) return res.status(400).json({ ok: false, error: 'playerId required' });

    const LEDGER = `${TABLE_PREFIX}quiz_payment_ledger`;

    const [result] = await connection.execute(
      `UPDATE ${LEDGER}
       SET status     = 'disputed',
           admin_notes = ?,
           updated_at  = UTC_TIMESTAMP()
       WHERE room_id  = ?
         AND player_id = ?
         AND status   = 'claimed'`,
      [reason?.trim() || null, roomId, playerId],
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ ok: false, error: 'no_claimed_rows_found' });
    }

    return res.json({ ok: true, affectedRows: result.affectedRows });
  } catch (err) {
    return sendError(res, err);
  }
});

export default router;