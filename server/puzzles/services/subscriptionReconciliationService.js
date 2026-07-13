// server/puzzles/services/subscriptionReconciliationService.js
//
// Period-aware reconciliation for puzzle subscriptions, built on the SAME
// shared tables ticketed events use (fundraisely_quiz_reconciliation /
// _adjustments) — no schema changes. What's different is that a
// subscription's room_id can have MANY reconciliation rows over its life
// (one per period, e.g. monthly), not one. Every function here is written
// with that in mind; nothing here modifies or is called by the existing
// quiz/ticketed-event reconciliation code, so this is purely additive.
//
// Column reuse (documented here since it's not obvious from the schema
// alone — same spirit as puzzleSubRoomService.js repurposing config_json):
//   starting_entry_fees → opening balance, carried from the PREVIOUS
//                          period's final_total (0 for the very first period)
//   starting_extras     → this period's confirmed Stripe receipts, summed
//                          from quiz_payment_ledger for the period's date window
//   starting_total       → starting_entry_fees + starting_extras (unchanged formula)
//   adjustments_net       → this period's manual adjustments net (refunds/fees/etc,
//                          scoped via reconciliation_id) — unchanged meaning
//   final_total           → starting_total + adjustments_net = this period's
//                          CLOSING balance, and next period's opening balance
//
// "Transactions in between" = the confirmed ledger receipts (a count + sum,
// not individual adjustment rows — Stripe payments are already the ledger's
// job to record) PLUS whatever manual adjustments get added during the period.

import { connection, TABLE_PREFIX } from '../../config/database.js';

const RECON_TABLE  = `${TABLE_PREFIX}quiz_reconciliation`;
const ADJ_TABLE     = `${TABLE_PREFIX}quiz_reconciliation_adjustments`;
const LEDGER_TABLE  = `${TABLE_PREFIX}quiz_payment_ledger`;

function mapReconciliationRow(row) {
  return {
    id:                String(row.id),
    roomId:            row.room_id,
    clubId:            row.club_id,
    openingBalance:    Number(row.starting_entry_fees ?? 0),
    periodReceipts:    Number(row.starting_extras     ?? 0),
    startingTotal:     Number(row.starting_total       ?? 0),
    adjustmentsNet:    Number(row.adjustments_net      ?? 0),
    closingBalance:    Number(row.final_total          ?? 0),
    approvedBy:        row.approved_by ?? null,
    approvedAt:        row.approved_at ? new Date(row.approved_at).toISOString() : null,
    notes:             row.notes ?? null,
    finalLeaderboard:  typeof row.final_leaderboard === 'string'
      ? JSON.parse(row.final_leaderboard) : (row.final_leaderboard ?? null),
    periodStart:       new Date(row.created_at).toISOString(),
    createdAt:         new Date(row.created_at).toISOString(),
    updatedAt:         row.updated_at ? new Date(row.updated_at).toISOString() : null,
  };
}

// ─── Lookups ──────────────────────────────────────────────────────────────────

export async function getLatestReconciliation(roomId) {
  const [rows] = await connection.execute(
    `SELECT * FROM ${RECON_TABLE} WHERE room_id = ? ORDER BY id DESC LIMIT 1`,
    [roomId]
  );
  return rows[0] ? mapReconciliationRow(rows[0]) : null;
}

export async function getReconciliationHistory(roomId) {
  const [rows] = await connection.execute(
    `SELECT * FROM ${RECON_TABLE} WHERE room_id = ? ORDER BY id ASC`,
    [roomId]
  );
  return rows.map(mapReconciliationRow);
}

export async function getReconciliationById(roomId, reconciliationId) {
  const [rows] = await connection.execute(
    `SELECT * FROM ${RECON_TABLE} WHERE id = ? AND room_id = ? LIMIT 1`,
    [reconciliationId, roomId]
  );
  return rows[0] ? mapReconciliationRow(rows[0]) : null;
}

export async function getAdjustmentsForReconciliation(reconciliationId) {
  const [rows] = await connection.execute(
    `SELECT id, room_id, ts, adjustment_type, amount, currency,
            payment_method, reason_code, note, created_by, created_at
     FROM ${ADJ_TABLE}
     WHERE reconciliation_id = ?
     ORDER BY ts ASC`,
    [reconciliationId]
  );
  return rows.map(row => ({
    id:             String(row.id),
    roomId:         row.room_id,
    ts:             row.ts,
    adjustmentType: row.adjustment_type,
    amount:         Number(row.amount ?? 0),
    currency:       row.currency,
    paymentMethod:  row.payment_method ?? null,
    reasonCode:     row.reason_code    ?? null,
    note:           row.note           ?? null,
    createdBy:      row.created_by     ?? null,
    createdAt:      row.created_at,
  }));
}

// ─── Lifetime summary — the "overall" rollup across every period ─────────────

export async function getLifetimeSummary(roomId) {
  const history = await getReconciliationHistory(roomId);
  if (!history.length) {
    return { periodCount: 0, totalReceipts: 0, totalAdjustments: 0, currentBalance: 0, lastApprovedAt: null };
  }

  const totalReceipts    = history.reduce((sum, p) => sum + p.periodReceipts, 0);
  const totalAdjustments = history.reduce((sum, p) => sum + p.adjustmentsNet, 0);
  const latest           = history[history.length - 1];
  const lastApproved     = [...history].reverse().find(p => p.approvedAt);

  return {
    periodCount:     history.length,
    totalReceipts,
    totalAdjustments,
    // Current balance is the latest period's closing figure, whether that
    // period is approved yet or not — an unapproved draft's final_total
    // is still a live running total, just not locked yet.
    currentBalance:  latest.closingBalance,
    lastApprovedAt:  lastApproved?.approvedAt ?? null,
  };
}

// ─── This period's confirmed Stripe receipts ─────────────────────────────────
// "entry_fee" / "stripe" is exactly what writePuzzleSubscriptionLedgerEntry
// in stripeWebhooks.js writes for every subscription payment (first cycle
// and renewals alike) — see that function's createExpectedPayment call.

export async function getPeriodReceipts(roomId, sinceIso) {
  const [[row]] = await connection.execute(
    `SELECT COALESCE(SUM(amount), 0) AS total, COUNT(*) AS cnt
     FROM ${LEDGER_TABLE}
     WHERE room_id = ?
       AND status = 'confirmed'
       AND ledger_type = 'entry_fee'
       AND payment_method = 'stripe'
       AND created_at >= ?`,
    [roomId, sinceIso]
  );
  return { total: Number(row?.total ?? 0), count: Number(row?.cnt ?? 0) };
}

// ─── Read-only preview of the current period ─────────────────────────────────
// Used by GET /current — NEVER inserts anything. If the latest period is
// still open (unapproved), that IS the current period, returned as-is.
// If the latest is approved (or none exists yet), there's no draft row
// for the "next" period until someone actually writes something (an
// adjustment or an approval) — so this computes what that period WOULD
// look like right now, without creating it. Viewing the tab should never
// itself open a new period; only ensureCurrentDraftReconciliation (called
// from the write routes) does that.

export async function previewCurrentPeriod(roomId) {
  const latest = await getLatestReconciliation(roomId);

  if (latest && !latest.approvedAt) {
    const adjustments = await getAdjustmentsForReconciliation(latest.id);
    const receipts = await getPeriodReceipts(roomId, latest.periodStart);
    return { period: latest, adjustments, liveReceipts: receipts };
  }

  // No draft exists yet for the next period — synthesize a preview.
  // sinceIso: receipts since the last approval, or "all time" (epoch) if
  // this subscription has never been reconciled before.
  const openingBalance = latest ? latest.closingBalance : 0;
  const sinceIso = latest ? latest.approvedAt : '1970-01-01T00:00:00.000Z';
  const receipts = await getPeriodReceipts(roomId, sinceIso);

  const preview = {
    id:               null, // no row exists yet — created on first write
    roomId,
    clubId:           latest ? latest.clubId : null,
    openingBalance,
    periodReceipts:   receipts.total,
    startingTotal:    openingBalance + receipts.total,
    adjustmentsNet:   0,
    closingBalance:   openingBalance + receipts.total,
    approvedBy:       null,
    approvedAt:       null,
    notes:            null,
    finalLeaderboard: null,
    periodStart:      sinceIso,
    createdAt:         null,
    updatedAt:         null,
  };

  return { period: preview, adjustments: [], liveReceipts: receipts };
}

// ─── Ensure the current period's draft row exists ────────────────────────────
// Mirrors ensureDraftReconciliation's role for ticketed events, but checks
// the MOST RECENT row rather than assuming there's only ever one. If the
// latest period is still open (unapproved), that IS the current period —
// return it. If it's approved (or none exists yet), start a new period,
// carrying the previous period's closing balance forward as this one's
// opening balance.

export async function ensureCurrentDraftReconciliation(roomId, clubId) {
  const latest = await getLatestReconciliation(roomId);

  if (latest && !latest.approvedAt) {
    return { id: latest.id, isNew: false, openingBalance: latest.openingBalance };
  }

  const openingBalance = latest ? latest.closingBalance : 0;

  // Anchor this period's "start" explicitly — the exact point receipts
  // get counted from. For period 1 (no history), that's epoch — "since
  // forever" — matching previewCurrentPeriod's own fallback exactly.
  // For period 2+, it's the previous period's approval moment.
  //
  // This MUST be written into created_at directly rather than left to
  // default to UTC_TIMESTAMP(): this row might not get created until
  // long after the period conceptually started (e.g. nobody touches a
  // new period until the first adjustment gets added days later), and
  // getPeriodReceipts — called from both this read-write path and the
  // read-only preview — keys off this exact column. Defaulting to NOW()
  // here silently excluded every payment that arrived between the true
  // period start and whenever someone first happened to touch it — which
  // is exactly the bug that showed real receipts as €0.
  const periodStartIso = latest ? latest.approvedAt : '1970-01-01T00:00:00.000Z';
  // Bind as a JS Date, not the raw ISO string — mysql2 converts Date
  // objects correctly for datetime columns, but a raw 'T'/'Z' ISO string
  // is not guaranteed valid MySQL datetime syntax and was almost
  // certainly what caused this insert to 500. Every other timestamp
  // write in this codebase goes through a toMysqlDateTime-style
  // conversion for exactly this reason — this one just used a plain JS
  // Date instead of also building that string, which works just as well.
  const periodStartForSql = new Date(periodStartIso);

  const [result] = await connection.execute(
    `INSERT INTO ${RECON_TABLE}
       (room_id, club_id, starting_entry_fees, starting_extras, starting_total,
        adjustments_net, final_total, approved_by, approved_at, notes,
        final_leaderboard, prize_awards, created_at, updated_at)
     VALUES (?, ?, ?, 0, ?, 0, ?, NULL, NULL, NULL, NULL, NULL,
             ?, UTC_TIMESTAMP())`,
    [roomId, clubId, openingBalance, openingBalance, openingBalance, periodStartForSql]
  );

  return { id: String(result.insertId), isNew: true, openingBalance };
}

// ─── Approve — locks the current period and starts the next one's baseline ──

export async function approveCurrentPeriod({ roomId, clubId, reconciliationId, approvedBy, notes, finalLeaderboard }) {
  const draft = await getReconciliationById(roomId, reconciliationId);
  if (!draft) throw Object.assign(new Error('not_found'), { statusCode: 404 });
  if (draft.approvedAt) throw Object.assign(new Error('already_approved'), { statusCode: 409 });

  // Receipts since this period's draft was opened — NOT since the
  // subscription began, that's what openingBalance already accounts for.
  const receipts = await getPeriodReceipts(roomId, draft.periodStart);

  const adjustments = await getAdjustmentsForReconciliation(reconciliationId);
  let moneyIn = 0, moneyOut = 0;
  for (const a of adjustments) {
    switch (a.adjustmentType) {
      case 'received':     moneyIn  += a.amount; break;
      case 'refund':
      case 'fee':
      case 'prize_payout': moneyOut += a.amount; break;
      case 'cash_over_short':
        if (a.reasonCode === 'cash_over')  moneyIn  += a.amount;
        else if (a.reasonCode === 'cash_short') moneyOut += a.amount;
        break;
    }
  }
  const adjustmentsNet = moneyIn - moneyOut;

  const startingTotal = draft.openingBalance + receipts.total;
  const closingBalance = startingTotal + adjustmentsNet;

  await connection.execute(
    `UPDATE ${RECON_TABLE}
     SET starting_extras   = ?,
         starting_total     = ?,
         adjustments_net    = ?,
         final_total        = ?,
         approved_by        = ?,
         approved_at        = UTC_TIMESTAMP(),
         notes              = ?,
         final_leaderboard  = ?,
         updated_at         = UTC_TIMESTAMP()
     WHERE id = ? AND room_id = ?`,
    [
      receipts.total, startingTotal, adjustmentsNet, closingBalance,
      approvedBy, notes ?? null,
      finalLeaderboard ? JSON.stringify(finalLeaderboard) : null,
      reconciliationId, roomId,
    ]
  );

  // Stamp every ledger row that fed this period's receipts — this is
  // the audit trail piece: which reconciliation a payment was settled
  // under, and who approved it. reconciled_by / reconciled_by_name mirror
  // the existing confirmed_by / confirmed_by_name split on this table —
  // reconciled_by would ideally be a resolved user id, but approvedBy
  // here is the same free-text name the reconciliation row's own
  // approved_by column already stores, so both columns get that string
  // for now rather than inventing an id we don't have.
  // reconciliation_id IS NULL guards against re-stamping rows a previous
  // period already claimed, in case of any date-boundary overlap.
  await connection.execute(
    `UPDATE ${LEDGER_TABLE}
     SET reconciliation_id   = ?,
         reconciled_at       = UTC_TIMESTAMP(),
         reconciled_by       = ?,
         reconciled_by_name  = ?
     WHERE room_id = ?
       AND status = 'confirmed'
       AND ledger_type = 'entry_fee'
       AND payment_method = 'stripe'
       AND created_at >= ?
       AND reconciliation_id IS NULL`,
    [reconciliationId, approvedBy, approvedBy, roomId, draft.periodStart]
  );

  return getReconciliationById(roomId, reconciliationId);
}