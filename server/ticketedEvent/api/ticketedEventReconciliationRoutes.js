// server/ticketedEvent/api/ticketedEventReconciliationRoutes.js
//
// Reconciliation endpoints for completed ticketed events.
// All routes require authenticateToken middleware.
//
// GET  /room/:roomId              — state (meta + reconciliation + adjustments + summary)
// GET  /room/:roomId/payment-view — ledger view: confirmed groups + claimed + disputed
// POST /room/:roomId/adjustments  — add adjustment row
// PATCH /room/:roomId/adjustments/:id — update adjustment row
// DELETE /room/:roomId/adjustments/:id — delete adjustment row
// POST /room/:roomId/approve      — approve and lock reconciliation
// POST /room/:roomId/dispute-payment — mark a claimed payment as disputed
//
// v2 CHANGES (the duplicate-reconciliation fix):
//   1. /approve no longer uses INSERT … ON DUPLICATE KEY UPDATE. That
//      pattern only updates in place if room_id has a UNIQUE index —
//      it doesn't (and can't: subscriptions/drops need many rows per
//      room), so every approval silently INSERTED a second header row,
//      orphaning the draft the adjustments were linked to (produced
//      ghost drafts 81/83/85/87/90, then 92/93 live). Approval now
//      UPDATEs the draft row by its exact id — the same pattern
//      approveCurrentPeriod already uses for subs/drops — and returns
//      409 if already approved, so re-approval can't stack duplicates
//      either (the D153E66F 73/76/77 triple).
//   2. adjustmentsNet is computed via the shared classifier
//      (server/shared/adjustmentClassifier.js) — the single source of
//      truth — instead of a local switch. Unclassified adjustments are
//      logged and excluded rather than silently ignored.
//   3. The ledger stamp uses the KNOWN reconciliation id, not a
//      "SELECT id … LIMIT 1" subquery that could grab the wrong row.
//   4. Adjustments with a NULL reconciliation_id for the room are
//      claimed at approval so the audit chain is complete.

import express from 'express';
import { connection, TABLE_PREFIX } from '../../config/database.js';
import { authenticateToken } from '../../middleware/auth.js';
import {
  ensureDraftReconciliation,
  addAdjustment as addAdjustmentRow,
  updateAdjustment as updateAdjustmentRow,
  deleteAdjustment as deleteAdjustmentRow,
  getFinalTotalsForRooms,
} from './ticketedEventReconciliationService.js';
import { computeAdjustmentsNet } from '../../shared/adjustmentClassifier.js';

const router = express.Router();
router.use(authenticateToken);

const LEDGER_TABLE       = `${TABLE_PREFIX}quiz_payment_ledger`;
const TICKETS_TABLE      = `${TABLE_PREFIX}quiz_tickets`;
const ROOMS_TABLE        = `${TABLE_PREFIX}web2_quiz_rooms`;
const RECON_TABLE        = `${TABLE_PREFIX}quiz_reconciliation`;
const ADJUSTMENTS_TABLE  = `${TABLE_PREFIX}quiz_reconciliation_adjustments`;
const CPM_TABLE          = `${TABLE_PREFIX}club_payment_methods`;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function parseConfig(raw) {
  if (!raw) return {};
  if (typeof raw === 'object') return raw;
  try { return JSON.parse(raw); } catch { return {}; }
}

// ─── GET /room/:roomId ────────────────────────────────────────────────────────
// Returns: { meta, reconciliation, adjustments, summary }


// POST /final-totals
// Body: { roomIds: string[] }
// Returns latest reconciliation final total for each room.
router.post('/final-totals', async (req, res) => {
  try {
    const { roomIds } = req.body || {};

    if (!Array.isArray(roomIds) || roomIds.length === 0) {
      return res.status(400).json({
        ok: false,
        message: 'roomIds[] is required',
      });
    }

    const totals = await getFinalTotalsForRooms(roomIds);

    return res.json({
      ok: true,
      totals,
    });
  } catch (err) {
    console.error('[ticketedEventReconciliation] final-totals error', err);

    return res.status(500).json({
      ok: false,
      message: 'Failed to load reconciliation totals',
    });
  }
});

router.get('/room/:roomId', async (req, res) => {
  const { roomId } = req.params;
  try {
    // Room meta
    const [[room]] = await connection.execute(
      `SELECT room_id, club_id, config_json, host_id, status FROM ${ROOMS_TABLE} WHERE room_id = ?`,
      [roomId]
    );
    if (!room) return res.status(404).json({ error: 'Room not found' });
    if (room.status !== 'completed') return res.status(400).json({ error: 'Room not yet completed' });

    const config = parseConfig(room.config_json);
    const meta = {
      clubId:         room.club_id,
      currencySymbol: config.currencySymbol ?? '€',
      currency:       config.currency        ?? 'EUR',
      entryFee:       config.entryFee        ?? '0',
      fundraisingMode: config.fundraisingMode ?? 'fixed_fee',
      hostName:       config.hostName         ?? 'Host',
    };

    // Reconciliation record (may not exist yet). ORDER BY id DESC so the
    // newest row wins deterministically even if historical duplicates
    // exist from before the v2 fix.
    const [[recon]] = await connection.execute(
      `SELECT * FROM ${RECON_TABLE} WHERE room_id = ? ORDER BY id DESC LIMIT 1`,
      [roomId]
    );

    // Adjustments
    const [adjustments] = await connection.execute(
      `SELECT * FROM ${ADJUSTMENTS_TABLE} WHERE room_id = ? ORDER BY created_at ASC`,
      [roomId]
    );

    // Summary from ledger — confirmed ticket payments only
    const [[summaryRow]] = await connection.execute(
      `SELECT
         SUM(CASE WHEN ledger_type = 'entry_fee'     THEN amount ELSE 0 END) AS entry_fees,
         SUM(CASE WHEN ledger_type = 'extra_purchase' THEN amount ELSE 0 END) AS extras,
         SUM(amount) AS starting_total,
         COUNT(DISTINCT player_id) AS confirmed_players
       FROM ${LEDGER_TABLE}
       WHERE room_id = ? AND status = 'confirmed'`,
      [roomId]
    );

    // Ticket counts — total, checkedIn
    const [[ticketCounts]] = await connection.execute(
      `SELECT
         COUNT(*) AS total,
         SUM(redemption_status = 'redeemed') AS checked_in,
         SUM(redemption_status != 'redeemed') AS not_checked_in
       FROM ${TICKETS_TABLE}
       WHERE room_id = ? AND payment_status = 'payment_confirmed'`,
      [roomId]
    );

    // By payment method breakdown
    const [byMethod] = await connection.execute(
      `SELECT payment_method AS method,
              SUM(CASE WHEN ledger_type = 'entry_fee'     THEN amount ELSE 0 END) AS entry_fees,
              SUM(CASE WHEN ledger_type = 'extra_purchase' THEN amount ELSE 0 END) AS extras,
              SUM(amount) AS total
       FROM ${LEDGER_TABLE}
       WHERE room_id = ? AND status = 'confirmed'
       GROUP BY payment_method
       ORDER BY total DESC`,
      [roomId]
    );

    // By ticket type breakdown — null ticket_type_id = legacy room with no types
    const [byTicketType] = await connection.execute(
      `SELECT
         COALESCE(ticket_type_id,   'general')          AS ticket_type_id,
         COALESCE(ticket_type_name, 'General Admission') AS ticket_type_name,
         COUNT(*)          AS ticket_count,
         SUM(entry_fee)    AS entry_fees,
         SUM(total_amount) AS total
       FROM ${TICKETS_TABLE}
       WHERE room_id = ?
         AND payment_status = 'payment_confirmed'
       GROUP BY ticket_type_id, ticket_type_name
       ORDER BY total DESC`,
      [roomId]
    );

    const summary = {
      entryFees:        Number(summaryRow?.entry_fees      ?? 0),
      extras:           Number(summaryRow?.extras          ?? 0),
      startingTotal:    Number(summaryRow?.starting_total  ?? 0),
      confirmedPlayers: Number(summaryRow?.confirmed_players ?? 0),
      byMethod: byMethod.map(r => ({
        method:     r.method,
        entryFees:  Number(r.entry_fees ?? 0),
        extras:     Number(r.extras     ?? 0),
        total:      Number(r.total      ?? 0),
      })),
      byTicketType: byTicketType.map(r => ({
        ticketTypeId:   r.ticket_type_id,
        ticketTypeName: r.ticket_type_name,
        ticketCount:    Number(r.ticket_count ?? 0),
        entryFees:      Number(r.entry_fees   ?? 0),
        total:          Number(r.total        ?? 0),
      })),
      tickets: {
        total:        Number(ticketCounts?.total        ?? 0),
        checkedIn:    Number(ticketCounts?.checked_in   ?? 0),
        notCheckedIn: Number(ticketCounts?.not_checked_in ?? 0),
      },
    };

    res.json({
      meta,
      reconciliation: recon
        ? {
            id:                String(recon.id),
            roomId:            recon.room_id,
            clubId:            recon.club_id,
            startingEntryFees: Number(recon.starting_entry_fees ?? 0),
            startingExtras:    Number(recon.starting_extras     ?? 0),
            startingTotal:     Number(recon.starting_total      ?? 0),
            adjustmentsNet:    Number(recon.adjustments_net     ?? 0),
            finalTotal:        Number(recon.final_total         ?? 0),
            approvedBy:        recon.approved_by   ?? null,
            approvedAt:        recon.approved_at   ?? null,
            notes:             recon.notes         ?? null,
          }
        : null,
      adjustments: adjustments.map(a => ({
        id:             String(a.id),
        roomId:         a.room_id,
        ts:             a.created_at,
        adjustmentType: a.adjustment_type,
        amount:         Number(a.amount ?? 0),
        currency:       a.currency ?? meta.currency,
        paymentMethod:  a.payment_method  ?? null,
        reasonCode:     a.reason_code     ?? null,
        note:           a.note            ?? null,
        createdBy:      a.created_by      ?? null,
        createdAt:      a.created_at,
      })),
      summary,
    });
  } catch (err) {
    console.error('[TicketedRecon] GET /room/:roomId error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── GET /room/:roomId/payment-view ───────────────────────────────────────────
// Returns the on-the-night view:
//   confirmedGroups — all confirmed ledger rows, grouped by who confirmed them.
//     Each player row includes saleType: 'walk_in' | 'advance' based on
//     payment_reference = 'WALKIN' (set by the walk-in checkin endpoint).
//   claimed  — rows still in 'claimed' status needing manual resolution
//   disputed — rows marked disputed

router.get('/room/:roomId/payment-view', async (req, res) => {
  const { roomId } = req.params;
  try {
    // ── Confirmed rows — grouped by confirmer
    const [confirmedRows] = await connection.execute(
      `SELECT
         l.player_id,
         l.player_name,
         l.ticket_id,
         l.payment_method,
         l.payment_reference,
         COALESCE(l.confirmed_by,      'system')  AS confirmed_by_id,
         COALESCE(l.confirmed_by_name, 'System')  AS confirmed_by_name,
         COALESCE(l.confirmed_by_role, 'system')  AS confirmed_by_role,
         cpm.method_label,
         SUM(l.amount)                            AS total_amount
       FROM ${LEDGER_TABLE} l
       LEFT JOIN ${CPM_TABLE} cpm ON l.club_payment_method_id = cpm.id
       WHERE l.room_id = ?
         AND l.status  = 'confirmed'
       GROUP BY
         l.player_id,
         l.player_name,
         l.ticket_id,
         l.payment_method,
         l.payment_reference,
         l.confirmed_by,
         l.confirmed_by_name,
         l.confirmed_by_role,
         cpm.method_label
       ORDER BY l.confirmed_by_name ASC, l.player_name ASC`,
      [roomId]
    );

    // Group confirmed rows by confirmer
    const confirmedGroupMap = new Map();
    for (const row of confirmedRows) {
      const id   = row.confirmed_by_id;
      const name = row.confirmed_by_name;
      const role = row.confirmed_by_role;

      if (!confirmedGroupMap.has(id)) {
        confirmedGroupMap.set(id, {
          confirmedById:   id,
          confirmedByName: name,
          confirmedByRole: role,
          totalAmount:     0,
          players:         [],
        });
      }

      const group = confirmedGroupMap.get(id);
      const amt   = Number(row.total_amount || 0);
      group.totalAmount += amt;

      const saleType = row.payment_reference === 'WALKIN' ? 'walk_in' : 'advance';

      group.players.push({
        playerId:         row.player_id,
        playerName:       row.player_name,
        ticketId:         row.ticket_id         ?? null,
        paymentMethod:    row.payment_method,
        methodLabel:      row.method_label       ?? null,
        paymentReference: row.payment_reference  ?? null,
        amount:           amt,
        status:           'confirmed',
        saleType,
      });
    }

    const confirmedGroups = [...confirmedGroupMap.values()]
      .sort((a, b) => b.totalAmount - a.totalAmount);

    // ── Claimed rows — need manual confirm or dispute
    const [claimedRows] = await connection.execute(
      `SELECT
         l.player_id,
         l.player_name,
         l.ticket_id,
         l.payment_method,
         l.payment_reference,
         cpm.method_label,
         SUM(l.amount) AS total_amount
       FROM ${LEDGER_TABLE} l
       LEFT JOIN ${CPM_TABLE} cpm ON l.club_payment_method_id = cpm.id
       WHERE l.room_id = ?
         AND l.status  = 'claimed'
       GROUP BY
         l.player_id, l.player_name, l.ticket_id,
         l.payment_method, l.payment_reference, cpm.method_label
       ORDER BY l.player_name ASC`,
      [roomId]
    );

    const claimed = claimedRows.map(row => ({
      playerId:         row.player_id,
      playerName:       row.player_name,
      ticketId:         row.ticket_id         ?? null,
      paymentMethod:    row.payment_method,
      methodLabel:      row.method_label       ?? null,
      paymentReference: row.payment_reference  ?? null,
      amount:           Number(row.total_amount || 0),
    }));

    // ── Disputed rows — info only
    const [disputedRows] = await connection.execute(
      `SELECT
         l.player_id,
         l.player_name,
         l.ticket_id,
         l.payment_method,
         l.admin_notes,
         SUM(l.amount) AS total_amount
       FROM ${LEDGER_TABLE} l
       WHERE l.room_id = ?
         AND l.status  = 'disputed'
       GROUP BY
         l.player_id, l.player_name, l.ticket_id,
         l.payment_method, l.admin_notes
       ORDER BY l.player_name ASC`,
      [roomId]
    );

    const disputed = disputedRows.map(row => ({
      playerId:      row.player_id,
      playerName:    row.player_name,
      ticketId:      row.ticket_id ?? null,
      paymentMethod: row.payment_method,
      adminNotes:    row.admin_notes ?? null,
      amount:        Number(row.total_amount || 0),
    }));

    const totalClaimed  = claimed.reduce((s, r) => s + r.amount, 0);
    const totalDisputed = disputed.reduce((s, r) => s + r.amount, 0);

    res.json({
      ok: true,
      onTheNight: {
        confirmedGroups,
        claimed,
        disputed,
        totalClaimed,
        totalDisputed,
      },
    });
  } catch (err) {
    console.error('[TicketedRecon] GET /room/:roomId/payment-view error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── POST /room/:roomId/adjustments ──────────────────────────────────────────

router.post('/room/:roomId/adjustments', async (req, res) => {
  const { roomId } = req.params;
  const { adjustmentType, amount, paymentMethod, reasonCode, note, createdBy } = req.body;
  try {
    const [[room]] = await connection.execute(
      `SELECT club_id, config_json FROM ${ROOMS_TABLE} WHERE room_id = ?`,
      [roomId]
    );
    if (!room) return res.status(404).json({ error: 'Room not found' });

    const config   = parseConfig(room.config_json);
    const currency = config.currency ?? 'EUR';

    // Ensure a draft reconciliation row exists so this adjustment has a
    // reconciliation_id to link to.
    const draft = await ensureDraftReconciliation(roomId, room.club_id);
    if (draft.approved) {
      return res.status(409).json({ error: 'Reconciliation already approved — adjustments are locked' });
    }

    const insertedId = await addAdjustmentRow({
      roomId,
      clubId: room.club_id,
      reconciliationId: draft.id,
      adjustmentType,
      amount,
      currency,
      paymentMethod: paymentMethod ?? null,
      reasonCode: reasonCode ?? null,
      note: note ?? null,
      createdBy: createdBy ?? null,
    });

    const [[row]] = await connection.execute(
      `SELECT id, room_id, ts, adjustment_type, amount, currency,
              payment_method, reason_code, note, created_by, created_at
       FROM ${ADJUSTMENTS_TABLE} WHERE id = ?`,
      [insertedId]
    );

    res.json({
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
    console.error('[TicketedRecon] POST adjustments error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── PATCH /room/:roomId/adjustments/:id ─────────────────────────────────────

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
    const ok = await updateAdjustmentRow(roomId, id, patch);
    if (!ok) return res.status(404).json({ error: 'Adjustment not found' });
    res.json({ ok: true });
  } catch (err) {
    console.error('[TicketedRecon] PATCH adjustment error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── DELETE /room/:roomId/adjustments/:id ────────────────────────────────────

router.delete('/room/:roomId/adjustments/:id', async (req, res) => {
  const { roomId, id } = req.params;
  try {
    const ok = await deleteAdjustmentRow(roomId, id);
    if (!ok) return res.status(404).json({ error: 'Adjustment not found' });
    res.json({ ok: true });
  } catch (err) {
    console.error('[TicketedRecon] DELETE adjustment error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── POST /room/:roomId/approve ───────────────────────────────────────────────
// v2: approves the draft row IN PLACE (UPDATE by id) instead of the old
// INSERT … ON DUPLICATE KEY UPDATE, which — with no unique index on
// room_id — inserted a duplicate header on every approval.

router.post('/room/:roomId/approve', async (req, res) => {
  const { roomId }   = req.params;
  const { approvedBy, notes } = req.body;

  if (!approvedBy?.trim()) {
    return res.status(400).json({ error: 'approvedBy is required' });
  }

  try {
    // Check no outstanding claimed payments
    const [[claimedCheck]] = await connection.execute(
      `SELECT COUNT(*) AS cnt FROM ${LEDGER_TABLE}
       WHERE room_id = ? AND status = 'claimed'`,
      [roomId]
    );
    if (Number(claimedCheck.cnt) > 0) {
      return res.status(400).json({
        error: `${claimedCheck.cnt} claimed payment(s) must be resolved before approving`,
      });
    }

    const [[room]] = await connection.execute(
      `SELECT club_id FROM ${ROOMS_TABLE} WHERE room_id = ?`, [roomId]
    );
    if (!room) return res.status(404).json({ error: 'Room not found' });

    // ── Get (or create) the draft and refuse re-approval ────────────────
    // ensureDraftReconciliation returns the existing row for this room
    // (creating one only if none exists — e.g. an approval with zero
    // adjustments). If it's already approved, block: re-approval was the
    // other path that stacked duplicate rows (D153E66F's 73/76/77).
    const draft = await ensureDraftReconciliation(roomId, room.club_id);
    if (draft.approved) {
      return res.status(409).json({ error: 'Reconciliation already approved' });
    }
    const reconciliationId = draft.id;

    // ── Recalculate starting totals fresh from the ledger ───────────────
    const [[totals]] = await connection.execute(
      `SELECT
         SUM(CASE WHEN ledger_type = 'entry_fee'     THEN amount ELSE 0 END) AS entry_fees,
         SUM(CASE WHEN ledger_type = 'extra_purchase' THEN amount ELSE 0 END) AS extras,
         SUM(amount) AS starting_total
       FROM ${LEDGER_TABLE}
       WHERE room_id = ? AND status = 'confirmed'`,
      [roomId]
    );

    // ── Net adjustments via the shared classifier ───────────────────────
    const [adjustmentRows] = await connection.execute(
      `SELECT id, adjustment_type, reason_code, amount
       FROM ${ADJUSTMENTS_TABLE} WHERE room_id = ?`,
      [roomId]
    );

    const { net: adjustmentsNet, unclassified } = computeAdjustmentsNet(adjustmentRows);
    if (unclassified.length > 0) {
      console.warn(
        `[TicketedRecon] ${unclassified.length} unclassified adjustment(s) excluded from net`,
        `for room ${roomId}:`,
        unclassified.map(u => `id=${u.id} type=${u.adjustment_type} reason=${u.reason_code}`)
      );
    }

    const startingTotal = Number(totals.starting_total ?? 0);
    const finalTotal    = startingTotal + adjustmentsNet;

    // ── Approve IN PLACE on the draft row ───────────────────────────────
    const [updateResult] = await connection.execute(
      `UPDATE ${RECON_TABLE}
       SET starting_entry_fees = ?,
           starting_extras     = ?,
           starting_total      = ?,
           adjustments_net     = ?,
           final_total         = ?,
           approved_by         = ?,
           approved_at         = NOW(),
           notes               = ?,
           updated_at          = NOW()
       WHERE id = ? AND approved_at IS NULL`,
      [
        Number(totals.entry_fees ?? 0),
        Number(totals.extras     ?? 0),
        startingTotal, adjustmentsNet, finalTotal,
        approvedBy.trim(), notes?.trim() ?? null,
        reconciliationId,
      ]
    );
    if (updateResult.affectedRows === 0) {
      // Raced with another approval between the draft check and now
      return res.status(409).json({ error: 'Reconciliation already approved' });
    }

    // Adjustments added before any draft existed carry a NULL
    // reconciliation_id — claim them so the audit chain is complete.
    await connection.execute(
      `UPDATE ${ADJUSTMENTS_TABLE}
       SET reconciliation_id = ?
       WHERE room_id = ? AND reconciliation_id IS NULL`,
      [reconciliationId, roomId]
    );

    // Stamp reconciliation_status on the room
    await connection.execute(
      `UPDATE ${ROOMS_TABLE} SET reconciliation_status = 'closed', updated_at = NOW()
       WHERE room_id = ?`,
      [roomId]
    );

    // Stamp every confirmed ledger row with the KNOWN reconciliation id
    // (the old code used a "SELECT id … LIMIT 1" subquery, which was
    // ambiguous whenever duplicate header rows existed).
    await connection.execute(
      `UPDATE ${LEDGER_TABLE}
       SET reconciliation_id  = ?,
           reconciled_at      = NOW(),
           reconciled_by      = ?,
           reconciled_by_name = ?
       WHERE room_id = ? AND status = 'confirmed' AND reconciliation_id IS NULL`,
      [reconciliationId, approvedBy.trim(), approvedBy.trim(), roomId]
    );

    res.json({
      ok: true,
      data: {
        roomId,
        reconciliationId: String(reconciliationId),
        startingTotal,
        adjustmentsNet,
        finalTotal,
        approvedBy: approvedBy.trim(),
        approvedAt: new Date().toISOString(),
      },
    });
  } catch (err) {
    console.error('[TicketedRecon] POST approve error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── POST /room/:roomId/dispute-payment ───────────────────────────────────────

router.post('/room/:roomId/dispute-payment', async (req, res) => {
  const { roomId }          = req.params;
  const { playerId, reason } = req.body;

  if (!playerId || !reason?.trim()) {
    return res.status(400).json({ error: 'playerId and reason are required' });
  }

  try {
    await connection.execute(
      `UPDATE ${LEDGER_TABLE}
       SET status = 'disputed', admin_notes = ?, updated_at = NOW()
       WHERE room_id = ? AND player_id = ? AND status = 'claimed'`,
      [reason.trim(), roomId, playerId]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error('[TicketedRecon] POST dispute-payment error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;