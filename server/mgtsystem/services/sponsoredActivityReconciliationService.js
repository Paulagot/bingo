// server/puzzles/services/sponsoredActivityReconciliationService.js
//
// Period-aware reconciliation for Sponsored Activity, built on the SAME shared
// tables ticketed events and subscriptions use (fundraisely_quiz_reconciliation
// / _adjustments) - no schema changes. Direct structural port of
// subscriptionReconciliationService.js; the one deliberate difference is
// getPeriodReceipts: subscriptions are Stripe-only, so that service filters
// payment_method = 'stripe'. Sponsored Activity entitlements confirm via cash, instant
// payment, Stripe, AND crypto (see createSponsored ActivityEntitlements/confirmSponsored ActivityPurchase
// in puzzleSponsored ActivityService.js), so this version sums confirmed 'entry_fee'
// ledger rows for the room regardless of payment_method.
//
// Column reuse (identical meaning to the subscription version):
//   starting_entry_fees → opening balance, carried from the PREVIOUS
//                          period's final_total (0 for the very first period)
//   starting_extras     → this period's confirmed receipts (all payment
//                          methods), summed from quiz_payment_ledger
//   starting_total       → starting_entry_fees + starting_extras
//   adjustments_net       → this period's manual adjustments net, scoped
//                          via reconciliation_id
//   final_total           → starting_total + adjustments_net = closing
//                          balance, and next period's opening balance

import { connection, TABLE_PREFIX } from '../../config/database.js';
import { computeAdjustmentsNet } from '../../shared/adjustmentClassifier.js';

const RECON_TABLE  = `${TABLE_PREFIX}quiz_reconciliation`;
const ADJ_TABLE    = `${TABLE_PREFIX}quiz_reconciliation_adjustments`;
const LEDGER_TABLE = `${TABLE_PREFIX}quiz_payment_ledger`;

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

// ─── Lifetime summary ─────────────────────────────────────────────────────────

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
    currentBalance:  latest.closingBalance,
    lastApprovedAt:  lastApproved?.approvedAt ?? null,
  };
}

// ─── This period's confirmed receipts - ALL payment methods ─────────────────
// CHANGED from the subscription version: no `AND payment_method = 'stripe'`.
// Sponsored Activity's ledger rows for a confirmed purchase can be cash, instant_payment,
// stripe, or crypto (see createSponsored ActivityEntitlements/confirmSponsored ActivityPurchase) - all
// of them count as real money received for this Sponsored Activity, so all are summed.

export async function getPeriodReceipts(roomId, sinceIso) {
  const [[row]] = await connection.execute(
    `SELECT COALESCE(SUM(amount), 0) AS total, COUNT(*) AS cnt
     FROM ${LEDGER_TABLE}
     WHERE room_id = ?
       AND status = 'confirmed'
       AND ledger_type = 'entry_fee'
       AND created_at >= ?`,
    [roomId, sinceIso]
  );
  return { total: Number(row?.total ?? 0), count: Number(row?.cnt ?? 0) };
}

// ─── Read-only preview of the current period ─────────────────────────────────

export async function previewCurrentPeriod(roomId) {
  const latest = await getLatestReconciliation(roomId);

  if (latest && !latest.approvedAt) {
    const adjustments = await getAdjustmentsForReconciliation(latest.id);
    const receipts = await getPeriodReceipts(roomId, latest.periodStart);
    return { period: latest, adjustments, liveReceipts: receipts };
  }

  const openingBalance = latest ? latest.closingBalance : 0;
  const sinceIso = latest ? latest.approvedAt : '1970-01-01T00:00:00.000Z';
  const receipts = await getPeriodReceipts(roomId, sinceIso);

  const preview = {
    id:               null,
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
    periodStart:      sinceIso,
    createdAt:         null,
    updatedAt:         null,
  };

  return { period: preview, adjustments: [], liveReceipts: receipts };
}

// ─── Ensure the current period's draft row exists ────────────────────────────

export async function ensureCurrentDraftReconciliation(roomId, clubId) {
  const latest = await getLatestReconciliation(roomId);

  if (latest && !latest.approvedAt) {
    return { id: latest.id, isNew: false, openingBalance: latest.openingBalance };
  }

  const openingBalance = latest ? latest.closingBalance : 0;

  // Same rationale as subscriptionReconciliationService.js: this must be
  // written into created_at explicitly, and bound as a JS Date object
  // (not a raw ISO string) since mysql2 needs a Date for correct datetime
  // conversion - a plain 'T'/'Z' string caused exactly this insert to
  // 500 there, so the same fix applies here verbatim.
  const periodStartIso = latest ? latest.approvedAt : '1970-01-01T00:00:00.000Z';
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

// ─── Approve - locks the current period and starts the next one's baseline ──

export async function approveCurrentPeriod({ roomId, clubId, reconciliationId, approvedBy, notes }) {
  const draft = await getReconciliationById(roomId, reconciliationId);
  if (!draft) throw Object.assign(new Error('not_found'), { statusCode: 404 });
  if (draft.approvedAt) throw Object.assign(new Error('already_approved'), { statusCode: 409 });

  const receipts = await getPeriodReceipts(roomId, draft.periodStart);

  const adjustments = await getAdjustmentsForReconciliation(reconciliationId);
  const classified = computeAdjustmentsNet(adjustments);
  if (classified.unclassified.length) {
    throw Object.assign(new Error('unclassified_adjustments'), {
      statusCode: 409,
      unclassifiedAdjustmentIds: classified.unclassified.map(a => a.id),
    });
  }
  const adjustmentsNet = classified.net;

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
         updated_at         = UTC_TIMESTAMP()
     WHERE id = ? AND room_id = ?`,
    [
      receipts.total, startingTotal, adjustmentsNet, closingBalance,
      approvedBy, notes ?? null,
      reconciliationId, roomId,
    ]
  );

  // Same audit-trail stamping as the subscription version - no
  // payment_method restriction here either, matching getPeriodReceipts.
  await connection.execute(
    `UPDATE ${LEDGER_TABLE}
     SET reconciliation_id   = ?,
         reconciled_at       = UTC_TIMESTAMP(),
         reconciled_by       = ?,
         reconciled_by_name  = ?
     WHERE room_id = ?
       AND status = 'confirmed'
       AND ledger_type = 'entry_fee'
       AND created_at >= ?
       AND reconciliation_id IS NULL`,
    [reconciliationId, approvedBy, approvedBy, roomId, draft.periodStart]
  );

  return getReconciliationById(roomId, reconciliationId);
}