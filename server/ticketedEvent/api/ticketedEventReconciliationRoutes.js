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

import express from 'express';
import { connection, TABLE_PREFIX } from '../../config/database.js';
import { authenticateToken } from '../../middleware/auth.js';

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

    // Reconciliation record (may not exist yet)
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
    // payment_reference is included in SELECT + GROUP BY so we can derive saleType.
    // 'WALKIN' is set explicitly by POST /checkin/:roomId/walkin on every walk-in row.
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

      // saleType: walk-ins are identified by payment_reference = 'WALKIN'.
      // The walk-in checkin endpoint always sets this value, making it a
      // reliable signal that requires no frontend guesswork.
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
        saleType,           // ← 'walk_in' | 'advance'
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

    const [result] = await connection.execute(
      `INSERT INTO ${ADJUSTMENTS_TABLE}
         (room_id, club_id, adjustment_type, amount, currency,
          payment_method, reason_code, note, created_by, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [roomId, room.club_id, adjustmentType, amount, currency,
       paymentMethod ?? null, reasonCode ?? null, note ?? null, createdBy ?? null]
    );

    const [[row]] = await connection.execute(
      `SELECT * FROM ${ADJUSTMENTS_TABLE} WHERE id = ?`,
      [result.insertId]
    );

    res.json({
      adjustment: {
        id:             String(row.id),
        roomId:         row.room_id,
        ts:             row.created_at,
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
  const allowed = ['adjustment_type', 'amount', 'payment_method', 'reason_code', 'note'];
  const updates = {};

  const fieldMap = {
    adjustmentType: 'adjustment_type',
    paymentMethod:  'payment_method',
    reasonCode:     'reason_code',
    amount:         'amount',
    note:           'note',
  };

  for (const [key, col] of Object.entries(fieldMap)) {
    if (req.body[key] !== undefined) updates[col] = req.body[key];
  }

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ error: 'No valid fields to update' });
  }

  try {
    const setClauses = Object.keys(updates).map(col => `${col} = ?`).join(', ');
    await connection.execute(
      `UPDATE ${ADJUSTMENTS_TABLE} SET ${setClauses}, updated_at = NOW()
       WHERE id = ? AND room_id = ?`,
      [...Object.values(updates), id, roomId]
    );
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
    await connection.execute(
      `DELETE FROM ${ADJUSTMENTS_TABLE} WHERE id = ? AND room_id = ?`,
      [id, roomId]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error('[TicketedRecon] DELETE adjustment error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── POST /room/:roomId/approve ───────────────────────────────────────────────

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

    // Recalculate totals fresh
    const [[totals]] = await connection.execute(
      `SELECT
         SUM(CASE WHEN ledger_type = 'entry_fee'     THEN amount ELSE 0 END) AS entry_fees,
         SUM(CASE WHEN ledger_type = 'extra_purchase' THEN amount ELSE 0 END) AS extras,
         SUM(amount) AS starting_total
       FROM ${LEDGER_TABLE}
       WHERE room_id = ? AND status = 'confirmed'`,
      [roomId]
    );

    const [adjustmentRows] = await connection.execute(
      `SELECT adjustment_type, reason_code, amount FROM ${ADJUSTMENTS_TABLE} WHERE room_id = ?`,
      [roomId]
    );

    let moneyIn = 0, moneyOut = 0;
    for (const a of adjustmentRows) {
      const amt = Number(a.amount || 0);
      switch (a.adjustment_type) {
        case 'received':     moneyIn  += amt; break;
        case 'refund':
        case 'fee':
        case 'prize_payout': moneyOut += amt; break;
        case 'cash_over_short':
          if (a.reason_code === 'cash_over')  moneyIn  += amt;
          else if (a.reason_code === 'cash_short') moneyOut += amt;
          break;
      }
    }

    const startingTotal  = Number(totals.starting_total  ?? 0);
    const adjustmentsNet = moneyIn - moneyOut;
    const finalTotal     = startingTotal + adjustmentsNet;
    const [[room]]       = await connection.execute(
      `SELECT club_id FROM ${ROOMS_TABLE} WHERE room_id = ?`, [roomId]
    );

    // Upsert reconciliation record
    await connection.execute(
      `INSERT INTO ${RECON_TABLE}
         (room_id, club_id, starting_entry_fees, starting_extras, starting_total,
          adjustments_net, final_total, approved_by, approved_at, notes,
          created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), ?, NOW(), NOW())
       ON DUPLICATE KEY UPDATE
         starting_entry_fees = VALUES(starting_entry_fees),
         starting_extras     = VALUES(starting_extras),
         starting_total      = VALUES(starting_total),
         adjustments_net     = VALUES(adjustments_net),
         final_total         = VALUES(final_total),
         approved_by         = VALUES(approved_by),
         approved_at         = NOW(),
         notes               = VALUES(notes),
         updated_at          = NOW()`,
      [
        roomId, room.club_id,
        Number(totals.entry_fees ?? 0),
        Number(totals.extras     ?? 0),
        startingTotal, adjustmentsNet, finalTotal,
        approvedBy.trim(), notes?.trim() ?? null,
      ]
    );

    // Stamp reconciliation_status on the room
    await connection.execute(
      `UPDATE ${ROOMS_TABLE} SET reconciliation_status = 'closed', updated_at = NOW()
       WHERE room_id = ?`,
      [roomId]
    );

    res.json({
      ok: true,
      data: {
        roomId,
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