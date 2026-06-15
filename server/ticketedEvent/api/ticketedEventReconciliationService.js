// server/ticketedEvent/api/ticketedEventReconciliationService.js
//
// DB logic for ticketed event reconciliation.
// Reuses the shared fundraisely_quiz_reconciliation and
// fundraisely_quiz_reconciliation_adjustments tables — same schema,
// same saveCompleteReconciliation / calculateStartingTotalsFromLedger
// functions — so the report and audit view tabs work without changes.
//
// Key differences from quiz/elimination:
//   - No leaderboard / prize awards (ticketed_event has neither)
//   - No in-memory socket room — everything goes straight to DB
//   - Adjustments are persisted individually as they are added/edited/deleted,
//     not flushed in bulk at approval time
//   - A "draft" reconciliation row (approved_at IS NULL) is created on the
//     first adjustment so we have a reconciliation_id FK to reference

import { connection, TABLE_PREFIX } from '../../config/database.js';

const RECONCILIATION_TABLE  = `${TABLE_PREFIX}quiz_reconciliation`;
const ADJUSTMENTS_TABLE     = `${TABLE_PREFIX}quiz_reconciliation_adjustments`;
const ROOMS_TABLE           = `${TABLE_PREFIX}web2_quiz_rooms`;

function parseJson(value) {
  if (!value) return null;
  if (typeof value === 'object') return value;
  try { return JSON.parse(value); } catch { return null; }
}

function mapAdjRow(row) {
  return {
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
  };
}

// ─── Get room config (currency, host name) ────────────────────────────────────

export async function getTicketedRoomMeta(roomId) {
  const [rows] = await connection.execute(
    `SELECT club_id, config_json FROM ${ROOMS_TABLE}
     WHERE room_id = ? AND game_type = 'ticketed_event' LIMIT 1`,
    [roomId],
  );
  const row = rows?.[0];
  if (!row) return null;
  const config = parseJson(row.config_json) || {};
  return {
    clubId:          row.club_id,
    currencySymbol:  config.currencySymbol  || '€',
    currency:        config.currency        || 'EUR',
    entryFee:        config.entryFee        || '0',
    fundraisingMode: config.fundraisingMode || 'fixed_fee',
    hostName:        config.hostName        || 'Host',
  };
}

// ─── Reconciliation header ────────────────────────────────────────────────────

export async function getReconciliationByRoomId(roomId) {
  const [rows] = await connection.execute(
    `SELECT id, room_id, club_id,
            starting_entry_fees, starting_extras, starting_total,
            adjustments_net, final_total,
            approved_by, approved_at, notes,
            created_at, updated_at
     FROM ${RECONCILIATION_TABLE}
     WHERE room_id = ? LIMIT 1`,
    [roomId],
  );
  if (!rows.length) return null;
  const r = rows[0];
  return {
    id:                r.id.toString(),
    roomId:            r.room_id,
    clubId:            r.club_id,
    startingEntryFees: parseFloat(r.starting_entry_fees || 0),
    startingExtras:    parseFloat(r.starting_extras     || 0),
    startingTotal:     parseFloat(r.starting_total      || 0),
    adjustmentsNet:    parseFloat(r.adjustments_net     || 0),
    finalTotal:        parseFloat(r.final_total         || 0),
    approvedBy:        r.approved_by || null,
    approvedAt:        r.approved_at ? r.approved_at.toISOString() : null,
    notes:             r.notes || null,
    createdAt:         r.created_at.toISOString(),
    updatedAt:         r.updated_at.toISOString(),
  };
}

// ─── Adjustments ──────────────────────────────────────────────────────────────

export async function getAdjustmentsByRoomId(roomId) {
  const [rows] = await connection.execute(
    `SELECT id, room_id, ts, adjustment_type, amount, currency,
            payment_method, reason_code, note, created_by, created_at
     FROM ${ADJUSTMENTS_TABLE}
     WHERE room_id = ? ORDER BY ts ASC`,
    [roomId],
  );
  return rows.map(mapAdjRow);
}

// ─── Ensure a draft reconciliation row exists ─────────────────────────────────
// Called before inserting the first adjustment.
// If approved_at is already set (approved), returns the existing ID without
// touching it — callers should block edits if already approved.

export async function ensureDraftReconciliation(roomId, clubId) {
  const [existing] = await connection.execute(
    `SELECT id, approved_at FROM ${RECONCILIATION_TABLE} WHERE room_id = ? LIMIT 1`,
    [roomId],
  );

  if (existing.length) {
    return { id: existing[0].id.toString(), approved: !!existing[0].approved_at };
  }

  // Create an unapproved placeholder row — totals will be recalculated at approval
  const [result] = await connection.execute(
    `INSERT INTO ${RECONCILIATION_TABLE}
       (room_id, club_id, starting_entry_fees, starting_extras, starting_total,
        adjustments_net, final_total, approved_by, approved_at, notes,
        final_leaderboard, prize_awards, created_at, updated_at)
     VALUES (?, ?, 0, 0, 0, 0, 0, NULL, NULL, NULL, NULL, NULL,
             UTC_TIMESTAMP(), UTC_TIMESTAMP())`,
    [roomId, clubId],
  );
  return { id: result.insertId.toString(), approved: false };
}

// ─── Add adjustment ───────────────────────────────────────────────────────────

export async function addAdjustment({
  roomId, clubId, reconciliationId,
  adjustmentType, amount, currency, paymentMethod,
  reasonCode, note, createdBy,
}) {
  const ts = new Date();
  const [result] = await connection.execute(
    `INSERT INTO ${ADJUSTMENTS_TABLE}
       (room_id, club_id, reconciliation_id, ts, adjustment_type,
        amount, currency, payment_method, reason_code, note, created_by, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, UTC_TIMESTAMP())`,
    [
      roomId, clubId, reconciliationId || null, ts,
      adjustmentType, amount, currency || 'EUR',
      paymentMethod || null, reasonCode || null,
      note || null, createdBy || 'Host',
    ],
  );
  return result.insertId.toString();
}

// ─── Update adjustment ────────────────────────────────────────────────────────

export async function updateAdjustment(roomId, adjustmentId, patch) {
  const fieldMap = {
    adjustmentType: 'adjustment_type',
    amount:         'amount',
    paymentMethod:  'payment_method',
    reasonCode:     'reason_code',
    note:           'note',
  };

  const setClauses = [];
  const values = [];

  for (const [key, col] of Object.entries(fieldMap)) {
    if (key in patch) {
      setClauses.push(`${col} = ?`);
      values.push(patch[key] ?? null);
    }
  }

  if (!setClauses.length) return false;

  values.push(roomId, adjustmentId);
  const [result] = await connection.execute(
    `UPDATE ${ADJUSTMENTS_TABLE}
     SET ${setClauses.join(', ')}
     WHERE room_id = ? AND id = ?`,
    values,
  );
  return result.affectedRows > 0;
}

// ─── Delete adjustment ────────────────────────────────────────────────────────

export async function deleteAdjustment(roomId, adjustmentId) {
  const [result] = await connection.execute(
    `DELETE FROM ${ADJUSTMENTS_TABLE} WHERE room_id = ? AND id = ?`,
    [roomId, adjustmentId],
  );
  return result.affectedRows > 0;
}

// ─── Payment ledger summary (for display before approval) ─────────────────────
// Summarises confirmed rows from quiz_payment_ledger — works for ticketed events
// because every ticket flow writes to that table.

export async function getPaymentSummary(roomId) {
  const LEDGER = `${TABLE_PREFIX}quiz_payment_ledger`;

  const [rows] = await connection.execute(
    `SELECT ledger_type, payment_method, SUM(amount) AS total, COUNT(*) AS cnt
     FROM ${LEDGER}
     WHERE room_id = ? AND status = 'confirmed'
     GROUP BY ledger_type, payment_method
     ORDER BY ledger_type, total DESC`,
    [roomId],
  );

  const [totalsRow] = await connection.execute(
    `SELECT
       SUM(CASE WHEN ledger_type = 'entry_fee' THEN amount ELSE 0 END) AS entry_fees,
       SUM(CASE WHEN ledger_type = 'extra_purchase' THEN amount ELSE 0 END) AS extras,
       COUNT(DISTINCT player_id) AS confirmed_players
     FROM ${LEDGER}
     WHERE room_id = ? AND status = 'confirmed'`,
    [roomId],
  );

  const TICKETS = `${TABLE_PREFIX}quiz_tickets`;
  const [ticketRows] = await connection.execute(
    `SELECT
       COUNT(*) AS total,
       SUM(CASE WHEN redemption_status = 'redeemed' THEN 1 ELSE 0 END) AS checked_in,
       SUM(CASE WHEN redemption_status != 'redeemed' THEN 1 ELSE 0 END) AS not_checked_in
     FROM ${TICKETS}
     WHERE room_id = ? AND payment_status = 'payment_confirmed'`,
    [roomId],
  );

  const t  = totalsRow[0] || {};
  const tk = ticketRows[0] || {};
  const entryFees = parseFloat(t.entry_fees || 0);
  const extras    = parseFloat(t.extras     || 0);

  const byMethod = {};
  for (const row of rows) {
    const method = row.payment_method || 'unknown';
    if (!byMethod[method]) byMethod[method] = { method, entryFees: 0, extras: 0, total: 0 };
    const amt = parseFloat(row.total || 0);
    if (row.ledger_type === 'entry_fee')        byMethod[method].entryFees += amt;
    if (row.ledger_type === 'extra_purchase')    byMethod[method].extras    += amt;
    byMethod[method].total += amt;
  }

  return {
    entryFees,
    extras,
    startingTotal:    entryFees + extras,
    confirmedPlayers: Number(t.confirmed_players || 0),
    byMethod:         Object.values(byMethod),
    tickets: {
      total:        Number(tk.total          || 0),
      checkedIn:    Number(tk.checked_in     || 0),
      notCheckedIn: Number(tk.not_checked_in || 0),
    },
  };
}