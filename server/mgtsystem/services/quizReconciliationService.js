// server/mgtsystem/services/quizReconciliationService.js
import { connection, TABLE_PREFIX } from '../../config/database.js';

const RECONCILIATION_TABLE = `${TABLE_PREFIX}quiz_reconciliation`;
const ADJUSTMENTS_TABLE    = `${TABLE_PREFIX}quiz_reconciliation_adjustments`;
const PAYMENT_LEDGER_TABLE = `${TABLE_PREFIX}quiz_payment_ledger`;

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Safely parse a value that may already be an object or a JSON string.
 * Returns null if falsy or unparseable.
 */
function parseJson(value) {
  if (!value) return null;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// STARTING TOTALS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Calculate starting totals from payment ledger database.
 * @param {string} roomId
 * @returns {{ fundraisingMode, entryFees, donations, extras, total }}
 */
export async function calculateStartingTotalsFromLedger(roomId) {
  const [roomRows] = await connection.execute(
    `SELECT config_json FROM ${TABLE_PREFIX}web2_quiz_rooms WHERE room_id = ? LIMIT 1`,
    [roomId]
  );

  const rawConfig = parseJson(roomRows[0]?.config_json) || {};
  const fundraisingMode = rawConfig?.fundraisingMode === 'donation' ? 'donation' : 'fixed_fee';

  const [rows] = await connection.execute(
    `SELECT ledger_type, SUM(amount) AS total_amount
     FROM ${PAYMENT_LEDGER_TABLE}
     WHERE room_id = ? AND status = 'confirmed'
     GROUP BY ledger_type`,
    [roomId]
  );

  let entryFees = 0;
  let extras    = 0;

  for (const row of rows) {
    const amount = Number(row.total_amount || 0);
    if (row.ledger_type === 'entry_fee')       entryFees = amount;
    else if (row.ledger_type === 'extra_purchase') extras = amount;
  }

  return {
    fundraisingMode,
    entryFees,
    donations: fundraisingMode === 'donation' ? entryFees : 0,
    extras,
    total: entryFees + extras,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// RECONCILIATION CRUD
// ─────────────────────────────────────────────────────────────────────────────

export async function getReconciliationByRoomId(roomId) {
  const [rows] = await connection.execute(
    `SELECT
       id, room_id, club_id,
       starting_entry_fees, starting_extras, starting_total,
       adjustments_net, final_total,
       approved_by, approved_at, notes,
       final_leaderboard, prize_awards,
       archive_generated_at, archive_sha256,
       created_at, updated_at
     FROM ${RECONCILIATION_TABLE}
     WHERE room_id = ?
     LIMIT 1`,
    [roomId]
  );

  if (rows.length === 0) return null;
  const row = rows[0];

  return {
    id:                 row.id.toString(),
    roomId:             row.room_id,
    clubId:             row.club_id,
    startingEntryFees:  parseFloat(row.starting_entry_fees),
    startingExtras:     parseFloat(row.starting_extras),
    startingTotal:      parseFloat(row.starting_total),
    adjustmentsNet:     parseFloat(row.adjustments_net),
    finalTotal:         parseFloat(row.final_total),
    approvedBy:         row.approved_by,
    approvedAt:         row.approved_at ? row.approved_at.toISOString() : null,
    notes:              row.notes,
    // ── NEW ──────────────────────────────────────────────────────────────────
    finalLeaderboard:   parseJson(row.final_leaderboard) || [],
    prizeAwards:        parseJson(row.prize_awards)       || [],
    // ─────────────────────────────────────────────────────────────────────────
    archiveGeneratedAt: row.archive_generated_at ? row.archive_generated_at.toISOString() : null,
    archiveSha256:      row.archive_sha256,
    createdAt:          row.created_at.toISOString(),
    updatedAt:          row.updated_at.toISOString(),
  };
}

export async function getReconciliationsByClubId(clubId, options = {}) {
  const { approvedOnly = false, limit = 50, offset = 0 } = options;

  let sql = `
    SELECT
      id, room_id, club_id,
      starting_entry_fees, starting_extras, starting_total,
      adjustments_net, final_total,
      approved_by, approved_at, notes,
      archive_generated_at, created_at, updated_at
    FROM ${RECONCILIATION_TABLE}
    WHERE club_id = ?
  `;

  const params = [clubId];
  if (approvedOnly) sql += ' AND approved_at IS NOT NULL';
  sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
  params.push(limit, offset);

  const [rows] = await connection.execute(sql, params);

  return rows.map(row => ({
    id:                 row.id.toString(),
    roomId:             row.room_id,
    clubId:             row.club_id,
    startingEntryFees:  parseFloat(row.starting_entry_fees),
    startingExtras:     parseFloat(row.starting_extras),
    startingTotal:      parseFloat(row.starting_total),
    adjustmentsNet:     parseFloat(row.adjustments_net),
    finalTotal:         parseFloat(row.final_total),
    approvedBy:         row.approved_by,
    approvedAt:         row.approved_at ? row.approved_at.toISOString() : null,
    notes:              row.notes,
    archiveGeneratedAt: row.archive_generated_at ? row.archive_generated_at.toISOString() : null,
    createdAt:          row.created_at.toISOString(),
    updatedAt:          row.updated_at.toISOString(),
  }));
}

/**
 * Insert or update the reconciliation header row.
 * Now accepts finalLeaderboard and prizeAwards.
 */
export async function upsertReconciliation(reconciliationData) {
  const {
    roomId,
    clubId,
    startingEntryFees = 0,
    startingExtras    = 0,
    startingTotal,
    adjustmentsNet    = 0,
    finalTotal,
    approvedBy,
    approvedAt,
    notes             = null,
    finalLeaderboard  = null,   // NEW
    prizeAwards       = null,   // NEW
  } = reconciliationData;

  if (!roomId || !clubId || typeof finalTotal === 'undefined') {
    throw new Error('Missing required fields: roomId, clubId, finalTotal');
  }

  const sql = `
    INSERT INTO ${RECONCILIATION_TABLE} (
      room_id, club_id,
      starting_entry_fees, starting_extras, starting_total,
      adjustments_net, final_total,
      approved_by, approved_at, notes,
      final_leaderboard, prize_awards
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      starting_entry_fees = VALUES(starting_entry_fees),
      starting_extras     = VALUES(starting_extras),
      starting_total      = VALUES(starting_total),
      adjustments_net     = VALUES(adjustments_net),
      final_total         = VALUES(final_total),
      approved_by         = VALUES(approved_by),
      approved_at         = VALUES(approved_at),
      notes               = VALUES(notes),
      final_leaderboard   = VALUES(final_leaderboard),
      prize_awards        = VALUES(prize_awards),
      updated_at          = UTC_TIMESTAMP()
  `;

  const [result] = await connection.execute(sql, [
    roomId, clubId,
    startingEntryFees, startingExtras, startingTotal,
    adjustmentsNet, finalTotal,
    approvedBy || null,
    approvedAt ? new Date(approvedAt) : null,
    notes,
    finalLeaderboard ? JSON.stringify(finalLeaderboard) : null,
    prizeAwards      ? JSON.stringify(prizeAwards)      : null,
  ]);

  if (result.insertId) return result.insertId.toString();

  const [rows] = await connection.execute(
    `SELECT id FROM ${RECONCILIATION_TABLE} WHERE room_id = ?`,
    [roomId]
  );
  return rows[0].id.toString();
}

export async function updateArchiveMetadata(roomId, archiveData) {
  const { archiveGeneratedAt, archiveSha256 } = archiveData;

  const [result] = await connection.execute(
    `UPDATE ${RECONCILIATION_TABLE}
     SET archive_generated_at = ?,
         archive_sha256        = ?,
         updated_at            = UTC_TIMESTAMP()
     WHERE room_id = ?`,
    [
      archiveGeneratedAt ? new Date(archiveGeneratedAt) : new Date(),
      archiveSha256 || null,
      roomId,
    ]
  );

  return result.affectedRows > 0;
}

export async function deleteReconciliation(roomId) {
  await connection.execute(`DELETE FROM ${ADJUSTMENTS_TABLE} WHERE room_id = ?`, [roomId]);
  const [result] = await connection.execute(
    `DELETE FROM ${RECONCILIATION_TABLE} WHERE room_id = ?`,
    [roomId]
  );
  return result.affectedRows > 0;
}

// ─────────────────────────────────────────────────────────────────────────────
// ADJUSTMENTS CRUD
// ─────────────────────────────────────────────────────────────────────────────

function mapAdjustmentRow(row) {
  return {
    id:             row.id.toString(),
    roomId:         row.room_id,
    ts:             row.ts.toISOString(),
    adjustmentType: row.adjustment_type,
    amount:         parseFloat(row.amount),
    currency:       row.currency,
    paymentMethod:  row.payment_method,
    reasonCode:     row.reason_code,
    payerId:        row.payer_id,
    note:           row.note,
    createdBy:      row.created_by,
    prizeAwardId:   row.prize_award_id,
    prizeMetadata:  parseJson(row.prize_metadata),
    createdAt:      row.created_at.toISOString(),
  };
}

export async function getAdjustmentsByRoomId(roomId) {
  const [rows] = await connection.execute(
    `SELECT id, room_id, ts, adjustment_type, amount, currency, payment_method,
            reason_code, payer_id, note, created_by, prize_award_id, prize_metadata, created_at
     FROM ${ADJUSTMENTS_TABLE}
     WHERE room_id = ?
     ORDER BY ts ASC`,
    [roomId]
  );
  return rows.map(mapAdjustmentRow);
}

export async function getAdjustmentsByType(roomId, adjustmentType) {
  const [rows] = await connection.execute(
    `SELECT id, room_id, ts, adjustment_type, amount, currency, payment_method,
            reason_code, payer_id, note, created_by, prize_award_id, prize_metadata, created_at
     FROM ${ADJUSTMENTS_TABLE}
     WHERE room_id = ? AND adjustment_type = ?
     ORDER BY ts ASC`,
    [roomId, adjustmentType]
  );
  return rows.map(mapAdjustmentRow);
}

export async function getAdjustmentTotals(roomId) {
  const [rows] = await connection.execute(
    `SELECT adjustment_type, COUNT(*) AS count, SUM(amount) AS total
     FROM ${ADJUSTMENTS_TABLE}
     WHERE room_id = ?
     GROUP BY adjustment_type`,
    [roomId]
  );

  const totals = {};
  rows.forEach(row => {
    totals[row.adjustment_type] = {
      count: parseInt(row.count),
      total: parseFloat(row.total),
    };
  });
  return totals;
}

export async function replaceAdjustments(roomId, clubId, adjustments, reconciliationId) {
  await connection.execute(`DELETE FROM ${ADJUSTMENTS_TABLE} WHERE room_id = ?`, [roomId]);
  if (!adjustments || adjustments.length === 0) return true;

  const sql = `
    INSERT INTO ${ADJUSTMENTS_TABLE} (
      room_id, club_id, reconciliation_id, ts, adjustment_type, amount, currency,
      payment_method, reason_code, payer_id, note, created_by,
      prize_award_id, prize_metadata
    ) VALUES ?
  `;

  const values = adjustments.map(adj => [
    roomId, clubId, reconciliationId || null,
    new Date(adj.ts), adj.type, adj.amount, adj.currency || 'EUR',
    adj.method || null, adj.reasonCode || null, adj.payerId || null,
    adj.note || null, adj.createdBy,
    adj.meta?.prizeAwardId || null,
    adj.meta ? JSON.stringify(adj.meta) : null,
  ]);

  await connection.query(sql, [values]);
  return true;
}

// ─────────────────────────────────────────────────────────────────────────────
// COMBINED SAVE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Stamp all confirmed payment ledger rows for a room with:
 *   - reconciliation_id   → FK to quiz_reconciliation.id
 *   - reconciled_at       → approval timestamp
 *   - reconciled_by       → approver member ID
 *   - reconciled_by_name  → approver display name
 *
 * Only rows with status = 'confirmed' are stamped.
 * Safe to call multiple times — re-approval overwrites the stamp.
 *
 * @param {string} roomId
 * @param {string} reconciliationId  - numeric ID as string from upsertReconciliation
 * @param {string} approvedAt        - ISO timestamp string
 * @param {string} approvedById      - member ID of the approver
 * @param {string} approvedBy        - display name of the approver
 * @returns {number} affectedRows
 */
async function stampReconciliationOnLedger(
  roomId,
  reconciliationId,
  approvedAt,
  approvedById,
  approvedBy,
) {
  const [result] = await connection.execute(
    `UPDATE ${PAYMENT_LEDGER_TABLE}
     SET reconciliation_id  = ?,
         reconciled_at      = ?,
         reconciled_by      = ?,
         reconciled_by_name = ?
     WHERE room_id = ?
       AND status   = 'confirmed'`,
    [
      reconciliationId,
      new Date(approvedAt),
      approvedById || null,
      approvedBy   || null,
      roomId,
    ],
  );

  console.log(
    `🔖 Stamped ${result.affectedRows} confirmed ledger row(s) for room ${roomId} ` +
    `with reconciliation_id ${reconciliationId}`,
  );

  return result.affectedRows;
}

/**
 * Save the full reconciliation in one call.
 * Accepts finalLeaderboard and prizeAwards to persist alongside the header.
 * Stamps confirmed payment ledger rows with the reconciliation ID and approver.
 */
export async function saveCompleteReconciliation(reconciliationData) {
  const {
    roomId, clubId,
    startingEntryFees, startingExtras, startingTotal,
    adjustmentsNet, finalTotal,
    approvedBy, approvedAt, notes,
    approvedById     = null,   // member ID of the approver — used for ledger stamp
    adjustments      = [],
    finalLeaderboard = null,
    prizeAwards      = null,
  } = reconciliationData;

  try {
    const reconciliationId = await upsertReconciliation({
      roomId, clubId,
      startingEntryFees, startingExtras, startingTotal,
      adjustmentsNet, finalTotal,
      approvedBy, approvedAt, notes,
      finalLeaderboard,
      prizeAwards,
    });

  await replaceAdjustments(roomId, clubId, adjustments, reconciliationId);

    // Stamp confirmed payment ledger rows
    await stampReconciliationOnLedger(
      roomId,
      reconciliationId,
      approvedAt,
      approvedById,
      approvedBy,
    );

    console.log(`✅ Saved complete reconciliation for room ${roomId}`);
    return { reconciliationId, adjustmentCount: adjustments.length };
  } catch (error) {
    console.error('❌ Error saving complete reconciliation:', error);
    throw error;
  }
}

export async function getCompleteReconciliation(roomId) {
  const reconciliation = await getReconciliationByRoomId(roomId);
  if (!reconciliation) return null;
  const adjustments = await getAdjustmentsByRoomId(roomId);
  return { ...reconciliation, adjustments };
}

export async function getReconciliationExportData(roomId) {
  const reconciliation = await getReconciliationByRoomId(roomId);
  if (!reconciliation) throw new Error(`Reconciliation not found for room ${roomId}`);

  const adjustments    = await getAdjustmentsByRoomId(roomId);
  const paymentLedger  = await getPaymentLedgerByRoomId(roomId);

  return {
    reconciliation: {
      approvedBy:       reconciliation.approvedBy,
      approvedAt:       reconciliation.approvedAt,
      notes:            reconciliation.notes,
      startingTotal:    reconciliation.startingTotal,
      adjustmentsNet:   reconciliation.adjustmentsNet,
      finalTotal:       reconciliation.finalTotal,
      finalLeaderboard: reconciliation.finalLeaderboard,   // NEW
      prizeAwards:      reconciliation.prizeAwards,        // NEW
    },
    adjustments,
    paymentLedger,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// REPORT PAYLOAD RECONSTRUCTION
// Rebuilds the { config, players } shape that deriveCore() expects,
// entirely from the database — no live room needed.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Reconstruct the full report payload from persisted data.
 * Safe to call any time after approval, even after room cleanup.
 *
 * @param {string} roomId
 * @returns {{ config: object, players: object[], allRoundsStats: [] }}
 */
export async function getReportPayloadByRoomId(roomId) {
  // 1. Reconciliation header (includes leaderboard + prizes now)
  const rec = await getReconciliationByRoomId(roomId);
  if (!rec) throw new Error(`Reconciliation not found for room ${roomId}`);

  // 2. Manual adjustment ledger
  const adjustments = await getAdjustmentsByRoomId(roomId);

  // 3. Payment ledger (all player payment rows)
  const paymentLedger = await getPaymentLedgerByRoomId(roomId);

  // 4. Room config for metadata (currencySymbol, entryFee, fundraisingMode, hostName)
  const [roomRows] = await connection.execute(
    `SELECT config_json FROM ${TABLE_PREFIX}web2_quiz_rooms WHERE room_id = ? LIMIT 1`,
    [roomId]
  );
  const rawConfig = parseJson(roomRows[0]?.config_json) || {};

  // 5. Build the config shape deriveCore() reads
  const config = {
    roomId,
    currencySymbol:  rawConfig.currencySymbol  || '€',
    entryFee:        rawConfig.entryFee        || '0',
    fundraisingMode: rawConfig.fundraisingMode || 'fixed_fee',
    hostName:        rawConfig.hostName        || '',
    reconciliation: {
      approvedBy:       rec.approvedBy,
      approvedAt:       rec.approvedAt,
      notes:            rec.notes,
      // Leaderboard and prizes — now read from DB columns
      finalLeaderboard: rec.finalLeaderboard || [],
      prizeAwards:      rec.prizeAwards      || [],
      // Remap adjustment rows back to the ledger shape deriveCore expects
      ledger: adjustments.map(a => ({
        id:         a.id,
        ts:         a.ts,
        type:       a.adjustmentType,
        method:     a.paymentMethod,
        amount:     a.amount,
        currency:   a.currency,
        reasonCode: a.reasonCode,
        note:       a.note,
        createdBy:  a.createdBy,
        meta:       a.prizeMetadata || {},
      })),
    },
  };

  // 6. Reconstruct players array from payment_ledger rows
  //
  //    Rules:
  //    - One player object per unique player_id
  //    - paid = true when at least one entry_fee row has status = 'confirmed'
  //    - paymentMethod taken from that confirmed entry_fee row
  //    - donationAmount from extra_metadata.donationAmount (donation-mode rooms)
  //    - extraPayments keyed by extra_id (falls back to ledger row id)
  //    - disqualified is not in the ledger — defaults false (acceptable for reports)

  const playerMap = new Map();

  for (const entry of paymentLedger) {
    if (!playerMap.has(entry.playerId)) {
      playerMap.set(entry.playerId, {
        id:             entry.playerId,
        name:           entry.playerName,
        paid:           false,
        disqualified:   false,
        paymentMethod:  entry.paymentMethod || null,
        extraPayments:  {},
        donationAmount: null,
      });
    }

    const player = playerMap.get(entry.playerId);

    if (entry.status === 'confirmed') {
      if (entry.ledgerType === 'entry_fee') {
        player.paid          = true;
        player.paymentMethod = entry.paymentMethod;

        // Donation amount stored in extra_metadata for donation-mode rooms
        const meta = parseJson(entry.extraMetadata);
        if (meta?.fundraisingMode === 'donation' && meta?.donationAmount != null) {
          player.donationAmount = Number(meta.donationAmount);
        }

      } else if (entry.ledgerType === 'extra_purchase') {
        // extra_id is always populated for extra purchase rows
        const key = entry.extraId || entry.id;
        player.extraPayments[key] = {
          method: entry.paymentMethod,
          amount: entry.amount,
        };
      }
    }
  }

  const players = [...playerMap.values()];

  return { config, players, allRoundsStats: [] };
}

// ─────────────────────────────────────────────────────────────────────────────
// PAYMENT LEDGER READ
// ─────────────────────────────────────────────────────────────────────────────

export async function getBlockingClaimedPaymentsForRoom(roomId) {
  const [rows] = await connection.execute(
    `SELECT
       player_id,
       MAX(player_name)          AS player_name,
       payment_method,
       payment_reference,
       club_payment_method_id,
       COUNT(*)                  AS rows_count,
       SUM(amount)               AS total_amount
     FROM ${PAYMENT_LEDGER_TABLE}
     WHERE room_id = ? AND status = 'claimed'
     GROUP BY player_id, payment_method, payment_reference, club_payment_method_id
     ORDER BY player_name ASC`,
    [roomId]
  );

  return rows.map(row => ({
    playerId:             row.player_id,
    playerName:           row.player_name,
    paymentMethod:        row.payment_method,
    paymentReference:     row.payment_reference,
    clubPaymentMethodId:  row.club_payment_method_id,
    rowsCount:            Number(row.rows_count   || 0),
    totalAmount:          Number(row.total_amount || 0),
  }));
}

export async function getPaymentLedgerByRoomId(roomId) {
  const [rows] = await connection.execute(
    `SELECT
       id, room_id, player_id, player_name,
       ledger_type, amount, currency, status,
       payment_method, payment_reference, club_payment_method_id,
       extra_id, extra_metadata,
       claimed_at, confirmed_at, created_at
     FROM ${PAYMENT_LEDGER_TABLE}
     WHERE room_id = ?
     ORDER BY created_at ASC`,
    [roomId]
  );

  return rows.map(row => ({
    id:                   row.id.toString(),
    roomId:               row.room_id,
    playerId:             row.player_id,
    playerName:           row.player_name,
    ledgerType:           row.ledger_type,
    amount:               parseFloat(row.amount),
    currency:             row.currency,
    status:               row.status,
    paymentMethod:        row.payment_method,
    paymentReference:     row.payment_reference,
    clubPaymentMethodId:  row.club_payment_method_id,
    extraId:              row.extra_id   || null,        // NEW (was missing)
    extraMetadata:        parseJson(row.extra_metadata), // NEW (was missing)
    claimedAt:            row.claimed_at   ? row.claimed_at.toISOString()   : null,
    confirmedAt:          row.confirmed_at ? row.confirmed_at.toISOString() : null,
    createdAt:            row.created_at.toISOString(),
  }));
}

export async function getPaymentLedgerTotals(roomId) {
  const [rows] = await connection.execute(
    `SELECT ledger_type, status, COUNT(*) AS count, SUM(amount) AS total
     FROM ${PAYMENT_LEDGER_TABLE}
     WHERE room_id = ?
     GROUP BY ledger_type, status`,
    [roomId]
  );

  const totals = {
    entryFees: { expected: 0, claimed: 0, confirmed: 0 },
    extras:    { expected: 0, claimed: 0, confirmed: 0 },
  };

  rows.forEach(row => {
    const type   = row.ledger_type === 'entry_fee' ? 'entryFees' : 'extras';
    const status = row.status;
    if (totals[type] && status in totals[type]) {
      totals[type][status] = parseFloat(row.total);
    }
  });

  return totals;
}

export async function getPaymentLedgerSummary(roomId) {
  // Totals by payment method, split by entry fee vs extras, confirmed only
  const [rows] = await connection.execute(
    `SELECT
       payment_method,
       ledger_type,
       COUNT(DISTINCT player_id) AS player_count,
       COUNT(*)                  AS row_count,
       SUM(amount)               AS total
     FROM ${PAYMENT_LEDGER_TABLE}
     WHERE room_id = ? AND status = 'confirmed'
     GROUP BY payment_method, ledger_type
     ORDER BY payment_method ASC`,
    [roomId]
  );

  // Also get total player count (distinct confirmed payers)
  const [playerRows] = await connection.execute(
    `SELECT
       COUNT(DISTINCT player_id) AS confirmed_players,
       COUNT(DISTINCT CASE WHEN ledger_type = 'entry_fee' THEN player_id END) AS paid_players
     FROM ${PAYMENT_LEDGER_TABLE}
     WHERE room_id = ? AND status = 'confirmed'`,
    [roomId]
  );

  // Group by payment_method
  const byMethod = {};
  for (const row of rows) {
    const method = row.payment_method || 'unknown';
    if (!byMethod[method]) {
      byMethod[method] = { entryFees: 0, extras: 0, extrasCount: 0, total: 0, playerCount: 0 };
    }
    const amt = Number(row.total || 0);
    if (row.ledger_type === 'entry_fee') {
      byMethod[method].entryFees    += amt;
      byMethod[method].playerCount   = Number(row.player_count || 0);
    } else if (row.ledger_type === 'extra_purchase') {
      byMethod[method].extras      += amt;
      byMethod[method].extrasCount += Number(row.row_count || 0);
    }
    byMethod[method].total += amt;
  }

  // Overall totals
  let totalEntryFees = 0;
  let totalExtras    = 0;
  let totalExtrasCount = 0;
  for (const d of Object.values(byMethod)) {
    totalEntryFees   += d.entryFees;
    totalExtras      += d.extras;
    totalExtrasCount += d.extrasCount;
  }

  return {
    byMethod,
    totals: {
      entryFees:   totalEntryFees,
      extras:      totalExtras,
      extrasCount: totalExtrasCount,
      total:       totalEntryFees + totalExtras,
    },
    confirmedPlayers: Number(playerRows[0]?.confirmed_players || 0),
    paidPlayers:      Number(playerRows[0]?.paid_players      || 0),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// STATISTICS
// ─────────────────────────────────────────────────────────────────────────────

export async function getClubReconciliationStats(clubId) {
  const [rows] = await connection.execute(
    `SELECT
       COUNT(*)                                                    AS total_reconciliations,
       SUM(CASE WHEN approved_at IS NOT NULL THEN 1 ELSE 0 END)   AS approved_count,
       SUM(CASE WHEN approved_at IS NULL     THEN 1 ELSE 0 END)   AS pending_count,
       SUM(final_total)                                            AS total_revenue,
       AVG(final_total)                                            AS avg_revenue_per_quiz
     FROM ${RECONCILIATION_TABLE}
     WHERE club_id = ?`,
    [clubId]
  );
  const stats = rows[0];

  return {
    totalReconciliations: parseInt(stats.total_reconciliations || 0),
    approvedCount:        parseInt(stats.approved_count        || 0),
    pendingCount:         parseInt(stats.pending_count         || 0),
    totalRevenue:         parseFloat(stats.total_revenue       || 0),
    avgRevenuePerQuiz:    parseFloat(stats.avg_revenue_per_quiz || 0),
  };
}

export async function getReconciliationStatus(roomId) {
  const [rows] = await connection.execute(
    `SELECT room_id, approved_at, approved_by, final_total, archive_generated_at
     FROM ${RECONCILIATION_TABLE}
     WHERE room_id = ?
     LIMIT 1`,
    [roomId]
  );

  if (rows.length === 0) return { exists: false, approved: false };

  const rec = rows[0];
  return {
    exists:           true,
    approved:         !!rec.approved_at,
    approvedBy:       rec.approved_by,
    approvedAt:       rec.approved_at ? rec.approved_at.toISOString() : null,
    finalTotal:       parseFloat(rec.final_total),
    archiveGenerated: !!rec.archive_generated_at,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// FINANCIAL REPORT (unchanged logic, kept for completeness)
// ─────────────────────────────────────────────────────────────────────────────

export async function getQuizFinancialReport(roomId) {
  try {
    const [roomRows] = await connection.execute(
      `SELECT config_json FROM ${TABLE_PREFIX}web2_quiz_rooms WHERE room_id = ? LIMIT 1`,
      [roomId]
    );
    const rawConfig      = parseJson(roomRows[0]?.config_json) || {};
    const fundraisingMode = rawConfig?.fundraisingMode === 'donation' ? 'donation' : 'fixed_fee';

    // 1. Reconciliation summary
    const [reconciliationRows] = await connection.execute(
      `SELECT starting_entry_fees, starting_extras, starting_total,
              adjustments_net, final_total, approved_by, approved_at
       FROM ${RECONCILIATION_TABLE}
       WHERE room_id = ? LIMIT 1`,
      [roomId]
    );
    const reconciliation = reconciliationRows[0] || null;

    // 2. Ticket stats
    const [ticketStatsRows] = await connection.execute(
      `SELECT
         COUNT(*) AS total_tickets,
         SUM(CASE WHEN redemption_status = 'redeemed' THEN 1 ELSE 0 END) AS redeemed_tickets,
         SUM(CASE WHEN redemption_status != 'redeemed' THEN 1 ELSE 0 END) AS unredeemed_tickets,
         SUM(total_amount)  AS total_ticket_revenue,
         SUM(entry_fee)     AS ticket_entry_fees,
         SUM(extras_total)  AS ticket_extras
       FROM ${TABLE_PREFIX}quiz_tickets
       WHERE room_id = ? AND payment_status = 'payment_confirmed'`,
      [roomId]
    );
    const ticketStats = ticketStatsRows[0] || {};

    // 2b. Ticket method breakdown
    const [ticketMethodRows] = await connection.execute(
      `SELECT COALESCE(payment_method, 'unknown') AS payment_method,
              COUNT(*) AS tickets, SUM(entry_fee) AS entry_fees,
              SUM(extras_total) AS extras, SUM(total_amount) AS total
       FROM ${TABLE_PREFIX}quiz_tickets
       WHERE room_id = ? AND payment_status = 'payment_confirmed'
       GROUP BY COALESCE(payment_method, 'unknown')
       ORDER BY total DESC`,
      [roomId]
    );
    const ticketPaymentMethods = ticketMethodRows.map(r => ({
      method:     r.payment_method,
      tickets:    Number(r.tickets    || 0),
      entryFees:  Number(r.entry_fees || 0),
      extras:     Number(r.extras     || 0),
      total:      Number(r.total      || 0),
    }));

    // 3. On-the-night payments
    const [onNightRows] = await connection.execute(
      `SELECT payment_method,
              COUNT(DISTINCT player_id) AS unique_players,
              COUNT(*) AS records, SUM(amount) AS total
       FROM ${PAYMENT_LEDGER_TABLE}
       WHERE room_id = ? AND status = 'confirmed' AND is_late = 0
         AND (ticket_id IS NULL OR ticket_id = '')
       GROUP BY payment_method`,
      [roomId]
    );
    const onNightPaymentsByMethod = onNightRows.map(r => ({
      method:        r.payment_method,
      uniquePlayers: Number(r.unique_players || 0),
      records:       Number(r.records        || 0),
      total:         Number(r.total          || 0),
    }));

    const [onNightTotalsRows] = await connection.execute(
      `SELECT COUNT(DISTINCT player_id) AS unique_players,
              COUNT(*) AS records, SUM(amount) AS total
       FROM ${PAYMENT_LEDGER_TABLE}
       WHERE room_id = ? AND status = 'confirmed' AND is_late = 0
         AND (ticket_id IS NULL OR ticket_id = '')`,
      [roomId]
    );
    const onNightTotals = onNightTotalsRows[0] || {};

    // 4. Late payments
    const [lateRows] = await connection.execute(
      `SELECT payment_method,
              COUNT(DISTINCT player_id) AS unique_players,
              COUNT(*) AS records, SUM(amount) AS total
       FROM ${PAYMENT_LEDGER_TABLE}
       WHERE room_id = ? AND status = 'confirmed' AND is_late = 1
         AND (ticket_id IS NULL OR ticket_id = '')
       GROUP BY payment_method`,
      [roomId]
    );
    const latePaymentsByMethod = lateRows.map(r => ({
      method:        r.payment_method,
      uniquePlayers: Number(r.unique_players || 0),
      records:       Number(r.records        || 0),
      total:         Number(r.total          || 0),
    }));

    const [lateTotalsRows] = await connection.execute(
      `SELECT COUNT(DISTINCT player_id) AS unique_players,
              COUNT(*) AS records, SUM(amount) AS total
       FROM ${PAYMENT_LEDGER_TABLE}
       WHERE room_id = ? AND status = 'confirmed' AND is_late = 1
         AND (ticket_id IS NULL OR ticket_id = '')`,
      [roomId]
    );
    const lateTotals = lateTotalsRows[0] || {};

    // 5. Instant payment breakdown
    const [instantPaymentRows] = await connection.execute(
      `SELECT pl.club_payment_method_id, cpm.method_label, cpm.provider_name,
              COUNT(DISTINCT CASE WHEN pl.is_late = 0 THEN pl.player_id END) AS non_late_players,
              SUM(CASE WHEN pl.is_late = 0 THEN pl.amount ELSE 0 END)        AS non_late_total,
              COUNT(DISTINCT CASE WHEN pl.is_late = 1 THEN pl.player_id END) AS late_players,
              SUM(CASE WHEN pl.is_late = 1 THEN pl.amount ELSE 0 END)        AS late_total,
              COUNT(DISTINCT pl.player_id) AS players,
              SUM(pl.amount)               AS total_amount
       FROM ${PAYMENT_LEDGER_TABLE} pl
       LEFT JOIN ${TABLE_PREFIX}club_payment_methods cpm ON pl.club_payment_method_id = cpm.id
       WHERE pl.room_id = ? AND pl.status = 'confirmed'
         AND pl.payment_method = 'instant_payment'
         AND (pl.ticket_id IS NULL OR pl.ticket_id = '')
       GROUP BY pl.club_payment_method_id, cpm.method_label, cpm.provider_name
       ORDER BY total_amount DESC`,
      [roomId]
    );
    const instantPaymentBreakdown = instantPaymentRows.map(r => ({
      paymentMethodId: r.club_payment_method_id,
      label:           r.method_label || 'Unknown Method',
      provider:        r.provider_name || null,
      players:         Number(r.players           || 0),
      nonLatePlayers:  Number(r.non_late_players   || 0),
      latePlayers:     Number(r.late_players       || 0),
      total:           Number(r.total_amount       || 0),
      nonLateTotal:    Number(r.non_late_total     || 0),
      lateTotal:       Number(r.late_total         || 0),
    }));

    // 6. Outstanding payments
    const [outstandingRows] = await connection.execute(
      `SELECT status,
              COUNT(DISTINCT player_id) AS unique_players,
              COUNT(*) AS records, SUM(amount) AS total
       FROM ${PAYMENT_LEDGER_TABLE}
       WHERE room_id = ? AND status IN ('expected','claimed','disputed')
         AND (ticket_id IS NULL OR ticket_id = '')
       GROUP BY status ORDER BY status ASC`,
      [roomId]
    );
    const outstandingPayments = {
      byStatus: outstandingRows.map(r => ({
        status:        r.status,
        uniquePlayers: Number(r.unique_players || 0),
        records:       Number(r.records        || 0),
        total:         Number(r.total          || 0),
      })),
      uniquePlayers: outstandingRows.reduce((s, r) => s + Number(r.unique_players || 0), 0),
      records:       outstandingRows.reduce((s, r) => s + Number(r.records        || 0), 0),
      total:         outstandingRows.reduce((s, r) => s + Number(r.total          || 0), 0),
    };

    // 7. Write-offs
    const [writeOffRows] = await connection.execute(
      `SELECT player_id, MAX(player_name) AS player_name,
              COUNT(*) AS records, SUM(amount) AS total,
              MAX(admin_notes) AS admin_notes, MAX(updated_at) AS updated_at
       FROM ${PAYMENT_LEDGER_TABLE}
       WHERE room_id = ? AND status = 'written_off'
         AND (ticket_id IS NULL OR ticket_id = '')
       GROUP BY player_id ORDER BY player_name ASC`,
      [roomId]
    );
    const writeOffs = {
      rows: writeOffRows.map(r => ({
        playerId:    r.player_id,
        playerName:  r.player_name,
        records:     Number(r.records || 0),
        total:       Number(r.total   || 0),
        adminNotes:  r.admin_notes || null,
        updatedAt:   r.updated_at
          ? (typeof r.updated_at.toISOString === 'function'
              ? r.updated_at.toISOString()
              : String(r.updated_at))
          : null,
      })),
      uniquePlayers: writeOffRows.length,
      records:       writeOffRows.reduce((s, r) => s + Number(r.records || 0), 0),
      total:         writeOffRows.reduce((s, r) => s + Number(r.total   || 0), 0),
    };

    return {
      reconciliation: reconciliation ? {
        fundraisingMode,
        startingEntryFees: Number(reconciliation.starting_entry_fees || 0),
        startingExtras:    Number(reconciliation.starting_extras     || 0),
        startingTotal:     Number(reconciliation.starting_total      || 0),
        adjustmentsNet:    Number(reconciliation.adjustments_net     || 0),
        finalTotal:        Number(reconciliation.final_total         || 0),
        approvedBy:        reconciliation.approved_by,
        approvedAt:        reconciliation.approved_at
          ? reconciliation.approved_at.toISOString()
          : null,
      } : null,
      tickets: {
        totalSold:    Number(ticketStats.total_tickets       || 0),
        redeemed:     Number(ticketStats.redeemed_tickets    || 0),
        unredeemed:   Number(ticketStats.unredeemed_tickets  || 0),
        totalRevenue: Number(ticketStats.total_ticket_revenue || 0),
        entryFees:    Number(ticketStats.ticket_entry_fees   || 0),
        extras:       Number(ticketStats.ticket_extras       || 0),
        byMethod:     ticketPaymentMethods,
      },
      onNightPayments: {
        byMethod:      onNightPaymentsByMethod,
        total:         Number(onNightTotals.total          || 0),
        uniquePlayers: Number(onNightTotals.unique_players || 0),
        records:       Number(onNightTotals.records        || 0),
      },
      latePayments: {
        byMethod:      latePaymentsByMethod,
        total:         Number(lateTotals.total          || 0),
        uniquePlayers: Number(lateTotals.unique_players || 0),
        records:       Number(lateTotals.records        || 0),
      },
      instantPaymentBreakdown,
      outstandingPayments,
      writeOffs,
    };
  } catch (error) {
    console.error('❌ Error generating financial report:', error);
    throw error;
  }
}

export async function getPaymentLedgerReconciliationView(roomId) {
  // ── 1. Tickets ────────────────────────────────────────────────────────────
  const [ticketRows] = await connection.execute(
    `SELECT
       t.redemption_status,
       t.payment_method,
       COUNT(*)          AS ticket_count,
       SUM(t.total_amount) AS total_value
     FROM ${TABLE_PREFIX}quiz_tickets t
     WHERE t.room_id = ?
       AND t.payment_status = 'payment_confirmed'
     GROUP BY t.redemption_status, t.payment_method`,
    [roomId]
  );

  const tickets = {
    total: 0, totalValue: 0,
    redeemed: 0, redeemedValue: 0,
    unredeemed: 0, unredeemedValue: 0,
   byMethod: {},
  };

  for (const row of ticketRows) {
    const count = Number(row.ticket_count || 0);
    const value = Number(row.total_value  || 0);
    const method = row.payment_method || 'unknown';

    tickets.total      += count;
    tickets.totalValue += value;

    if (row.redemption_status === 'redeemed') {
      tickets.redeemed      += count;
      tickets.redeemedValue += value;
    } else {
      tickets.unredeemed      += count;
      tickets.unredeemedValue += value;
    }

    if (!tickets.byMethod[method]) {
      tickets.byMethod[method] = { method, count: 0, value: 0 };
    }
    tickets.byMethod[method].count += count;
    tickets.byMethod[method].value += value;
  }

  const ticketsByMethod = Object.values(tickets.byMethod);
  const hasTickets = tickets.total > 0;

  const [ticketDetailRows] = await connection.execute(
  `SELECT
     t.ticket_id,
     t.player_name,
     t.purchaser_name,
     t.payment_method,
     t.total_amount,
     t.redemption_status,
     t.confirmed_at,
     t.confirmed_by_name
   FROM ${TABLE_PREFIX}quiz_tickets t
   WHERE t.room_id = ?
     AND t.payment_status = 'payment_confirmed'
   ORDER BY t.player_name ASC`,
  [roomId]
);

const [onNightRows] = await connection.execute(
  `SELECT
     pl.player_id,
     pl.player_name,
     pl.payment_method,
     pl.status,
     COALESCE(pl.confirmed_by, 'unconfirmed')       AS confirmed_by_id,
     COALESCE(pl.confirmed_by_name, '')              AS confirmed_by_name,
     COALESCE(pl.confirmed_by_role, '')              AS confirmed_by_role,
     pl.payment_reference,
     cpm.method_label,
     SUM(pl.amount)                                  AS total_amount
   FROM ${TABLE_PREFIX}quiz_payment_ledger pl
   LEFT JOIN ${TABLE_PREFIX}club_payment_methods cpm
     ON pl.club_payment_method_id = cpm.id
   WHERE pl.room_id = ?
     AND (pl.ticket_id IS NULL OR pl.ticket_id = '')
   GROUP BY
     pl.player_id, pl.player_name, pl.payment_method,
     pl.status, pl.confirmed_by, pl.confirmed_by_name,
     pl.confirmed_by_role, pl.payment_reference, cpm.method_label
   ORDER BY pl.status ASC, pl.confirmed_by_name ASC, pl.player_name ASC`,
  [roomId]
);

// Groups: confirmed (by person) → claimed → disputed → expected
const confirmedGroups = new Map(); // key = confirmedById
const claimedPlayers = [];
const disputedPlayers = [];
const expectedPlayers = [];

for (const row of onNightRows) {
  const player = {
    playerId:         row.player_id,
    playerName:       row.player_name,
    paymentMethod:    row.payment_method,
    methodLabel:      row.method_label || null,
    paymentReference: row.payment_reference || null,
    amount:           Number(row.total_amount || 0),
    status:           row.status,
  };

  if (row.status === 'confirmed') {
    const id   = row.confirmed_by_id;
    const name = id === 'system' ? 'System (auto)' : (row.confirmed_by_name || 'Unknown');
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

  } else if (row.status === 'claimed') {
    claimedPlayers.push(player);
  } else if (row.status === 'disputed') {
    disputedPlayers.push(player);
  } else {
    expectedPlayers.push(player);
  }
}

const onTheNight = {
  confirmedGroups: [...confirmedGroups.values()].sort((a, b) => b.totalAmount - a.totalAmount),
  claimed:   claimedPlayers,
  disputed:  disputedPlayers,
  expected:  expectedPlayers,
  totalConfirmed: [...confirmedGroups.values()].reduce((s, g) => s + g.totalAmount, 0),
  totalClaimed:   claimedPlayers.reduce((s, p) => s + p.amount, 0),
  totalDisputed:  disputedPlayers.reduce((s, p) => s + p.amount, 0),
  totalExpected:  expectedPlayers.reduce((s, p) => s + p.amount, 0),
};
  // ── 2. Confirmed-by breakdown ─────────────────────────────────────────────
  const [confirmedByRows] = await connection.execute(
    `SELECT
       COALESCE(confirmed_by, 'system')           AS confirmed_by_id,
       COALESCE(confirmed_by_name, 'System')      AS confirmed_by_name,
       COALESCE(confirmed_by_role, 'system')      AS confirmed_by_role,
       payment_method,
       COUNT(*)                                   AS row_count,
       SUM(amount)                                AS total_amount
     FROM ${TABLE_PREFIX}quiz_payment_ledger
     WHERE room_id = ? AND status = 'confirmed'
     GROUP BY confirmed_by, confirmed_by_name, confirmed_by_role, payment_method
     ORDER BY confirmed_by_name ASC, total_amount DESC`,
    [roomId]
  );

  // Group by person, nest methods inside
  const confirmedByMap = new Map();
  for (const row of confirmedByRows) {
    const id = row.confirmed_by_id === 'system' ? 'system' : row.confirmed_by_id;
    const name = id === 'system' ? 'System (auto)' : row.confirmed_by_name;

    if (!confirmedByMap.has(id)) {
      confirmedByMap.set(id, {
        confirmedById:   id,
        confirmedByName: name,
        confirmedByRole: row.confirmed_by_role,
        totalAmount:     0,
        rowCount:        0,
        byMethod:        [],
      });
    }

    const person = confirmedByMap.get(id);
    const amt    = Number(row.total_amount || 0);
    const cnt    = Number(row.row_count    || 0);

    person.totalAmount += amt;
    person.rowCount    += cnt;
    person.byMethod.push({
      method: row.payment_method || 'unknown',
      amount: amt,
      count:  cnt,
    });
  }

  const confirmedBy = [...confirmedByMap.values()].sort(
    (a, b) => b.totalAmount - a.totalAmount
  );

  // ── 3. By payment method (all statuses) ───────────────────────────────────
  const [byMethodRows] = await connection.execute(
    `SELECT
       payment_method,
       status,
       SUM(amount) AS total
     FROM ${TABLE_PREFIX}quiz_payment_ledger
     WHERE room_id = ?
     GROUP BY payment_method, status
     ORDER BY payment_method ASC`,
    [roomId]
  );

  const byMethodMap = new Map();
  for (const row of byMethodRows) {
    const method = row.payment_method || 'unknown';
    if (!byMethodMap.has(method)) {
      byMethodMap.set(method, {
        method,
        confirmed: 0,
        expected:  0,
        claimed:   0,
        disputed:  0,
        total:     0,
      });
    }
    const m   = byMethodMap.get(method);
    const amt = Number(row.total || 0);

    if (row.status === 'confirmed')                          m.confirmed += amt;
    else if (row.status === 'expected')                      m.expected  += amt;
    else if (row.status === 'claimed')                       m.claimed   += amt;
    else if (row.status === 'disputed')                      m.disputed  += amt;

    m.total += amt;
  }
  const byMethod = [...byMethodMap.values()];

  // ── 4. Reconciliation summary ─────────────────────────────────────────────
  const [summaryRows] = await connection.execute(
    `SELECT
       ledger_type,
       status,
       SUM(amount) AS total
     FROM ${TABLE_PREFIX}quiz_payment_ledger
     WHERE room_id = ?
     GROUP BY ledger_type, status`,
    [roomId]
  );

  const summary = {
    entryFees: { expected: 0, confirmed: 0, gap: 0 },
    extras:    { expected: 0, confirmed: 0, gap: 0 },
    total:     { expected: 0, confirmed: 0, gap: 0 },
  };

  for (const row of summaryRows) {
    const amt      = Number(row.total || 0);
    const isEntry  = row.ledger_type === 'entry_fee';
    const isExtra  = row.ledger_type === 'extra_purchase';
    const isConfirmed = row.status === 'confirmed';
    // expected bucket = everything not confirmed
    const isExpected  = row.status !== 'confirmed';

    if (isEntry) {
      if (isConfirmed) summary.entryFees.confirmed += amt;
      if (isExpected)  summary.entryFees.expected  += amt;
    }
    if (isExtra) {
      if (isConfirmed) summary.extras.confirmed += amt;
      if (isExpected)  summary.extras.expected  += amt;
    }
  }

  summary.entryFees.gap = summary.entryFees.expected - summary.entryFees.confirmed;
  summary.extras.gap    = summary.extras.expected    - summary.extras.confirmed;
  summary.total.confirmed = summary.entryFees.confirmed + summary.extras.confirmed;
  summary.total.expected  = summary.entryFees.expected  + summary.extras.expected;
  summary.total.gap       = summary.entryFees.gap       + summary.extras.gap;

  // ── 5. Exceptions ─────────────────────────────────────────────────────────
  const [exceptionRows] = await connection.execute(
    `SELECT
       pl.player_id,
       pl.player_name,
       pl.status,
       pl.ledger_type,
       pl.amount,
       pl.currency,
       pl.payment_method,
       pl.payment_reference,
       pl.extra_id,
       pl.is_late,
       pl.claimed_at,
       pl.admin_notes,
       cpm.method_label
     FROM ${TABLE_PREFIX}quiz_payment_ledger pl
     LEFT JOIN ${TABLE_PREFIX}club_payment_methods cpm
       ON pl.club_payment_method_id = cpm.id
     WHERE pl.room_id = ?
       AND pl.status IN ('claimed', 'disputed', 'expected')
     ORDER BY pl.status ASC, pl.player_name ASC`,
    [roomId]
  );

  const exceptions = exceptionRows.map(row => ({
    playerId:         row.player_id,
    playerName:       row.player_name,
    status:           row.status,
    ledgerType:       row.ledger_type,
    amount:           Number(row.amount || 0),
    currency:         row.currency,
    paymentMethod:    row.payment_method,
    methodLabel:      row.method_label || null,
    paymentReference: row.payment_reference || null,
    extraId:          row.extra_id || null,
    isLate:           !!row.is_late,
    claimedAt:        row.claimed_at ? row.claimed_at.toISOString() : null,
    adminNotes:       row.admin_notes || null,
  }));

  // ── Totals ─────────────────────────────────────────────────────────────────
  const totalConfirmed = summary.total.confirmed;
  const totalExpected  = summary.total.expected;
  const totalGap       = summary.total.gap;

return {
  hasTickets,
  tickets: {
    ...tickets,
    byMethod: ticketsByMethod,
    detail: ticketDetailRows.map(r => ({
      ticketId:         r.ticket_id,
      playerName:       r.player_name,
      purchaserName:    r.purchaser_name,
      paymentMethod:    r.payment_method,
      amount:           Number(r.total_amount || 0),
      redemptionStatus: r.redemption_status,
      confirmedAt:      r.confirmed_at ? r.confirmed_at.toISOString() : null,
      confirmedByName:  r.confirmed_by_name || null,
    })),
  },
  onTheNight,
  confirmedBy,
  byMethod,
  summary,
  exceptions,
  totalConfirmed,
  totalExpected,
  totalGap,
};
}

export async function getReconciliationAuditView(roomId) {
  // ── 1. Reconciliation header ───────────────────────────────────────────────
  const [recRows] = await connection.execute(
    `SELECT
       r.id, r.room_id, r.club_id,
       r.starting_entry_fees, r.starting_extras, r.starting_total,
       r.adjustments_net, r.final_total,
       r.approved_by, r.approved_at, r.notes,
       r.final_leaderboard, r.prize_awards
     FROM ${RECONCILIATION_TABLE} r
     WHERE r.room_id = ?
     LIMIT 1`,
    [roomId]
  );

  if (!recRows.length) return null;
  const rec = recRows[0];
  const approvedAt = rec.approved_at ? rec.approved_at.toISOString() : null;

  // ── 2. Manual adjustments ─────────────────────────────────────────────────
  const [adjRows] = await connection.execute(
    `SELECT
       id, ts, adjustment_type, amount, currency,
       payment_method, reason_code, note, created_by,
       prize_award_id, prize_metadata
     FROM ${ADJUSTMENTS_TABLE}
     WHERE room_id = ?
     ORDER BY ts ASC`,
    [roomId]
  );

  const adjustments = adjRows.map(row => ({
    id:             row.id.toString(),
    ts:             row.ts.toISOString(),
    adjustmentType: row.adjustment_type,
    amount:         Number(row.amount || 0),
    currency:       row.currency,
    paymentMethod:  row.payment_method,
    reasonCode:     row.reason_code,
    note:           row.note || null,
    createdBy:      row.created_by,
    prizeAwardId:   row.prize_award_id || null,
    prizeMetadata:  parseJson(row.prize_metadata),
  }));

  // ── 3. On-the-night — confirmed at reconciliation time ────────────────────
  // Rows confirmed before or at approval, no ticket_id
  const [confirmedRows] = await connection.execute(
    `SELECT
       pl.player_id,
       pl.player_name,
       pl.payment_method,
       pl.amount,
       pl.payment_reference,
       COALESCE(pl.confirmed_by, 'system')       AS confirmed_by_id,
       COALESCE(pl.confirmed_by_name, 'System')  AS confirmed_by_name,
       COALESCE(pl.confirmed_by_role, 'system')  AS confirmed_by_role,
       cpm.method_label,
       SUM(pl.amount)                            AS total_amount
     FROM ${PAYMENT_LEDGER_TABLE} pl
     LEFT JOIN ${TABLE_PREFIX}club_payment_methods cpm
       ON pl.club_payment_method_id = cpm.id
     WHERE pl.room_id = ?
       AND pl.status = 'confirmed'
       AND pl.is_late = 0
       AND (pl.ticket_id IS NULL OR pl.ticket_id = '')
     GROUP BY
       pl.player_id, pl.player_name, pl.payment_method,
        pl.amount,
       pl.confirmed_by, pl.confirmed_by_name, pl.confirmed_by_role,
       pl.payment_reference, cpm.method_label
     ORDER BY pl.confirmed_by_name ASC, pl.player_name ASC`,
    [roomId]
  );

  // Group by confirmer
  const confirmedGroupMap = new Map();
  for (const row of confirmedRows) {
    const id   = row.confirmed_by_id;
    const name = id === 'system' ? 'System (auto)' : (row.confirmed_by_name || 'Unknown');
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
    const amt = Number(row.total_amount || 0);
    group.totalAmount += amt;
    group.players.push({
      playerId:         row.player_id,
      playerName:       row.player_name,
      paymentMethod:    row.payment_method,
      methodLabel:      row.method_label || null,
      paymentReference: row.payment_reference || null,
      amount:           amt,
    });
  }

  const confirmedGroups = [...confirmedGroupMap.values()]
    .sort((a, b) => b.totalAmount - a.totalAmount);

  // ── 4. Late payments (confirmed after approval or is_late = 1) ────────────
  const [lateRows] = await connection.execute(
    `SELECT
       pl.player_id,
       pl.player_name,
       pl.payment_method,
       pl.payment_reference,
       COALESCE(pl.confirmed_by_name, 'Unknown') AS confirmed_by_name,
       COALESCE(pl.confirmed_by_role, '')         AS confirmed_by_role,
       cpm.method_label,
       SUM(pl.amount)                             AS total_amount
     FROM ${PAYMENT_LEDGER_TABLE} pl
     LEFT JOIN ${TABLE_PREFIX}club_payment_methods cpm
       ON pl.club_payment_method_id = cpm.id
     WHERE pl.room_id = ?
       AND pl.status = 'confirmed'
       AND pl.is_late = 1
       AND (pl.ticket_id IS NULL OR pl.ticket_id = '')
     GROUP BY
       pl.player_id, pl.player_name, pl.payment_method,
        pl.amount,
       pl.confirmed_by_name, pl.confirmed_by_role,
       pl.payment_reference, cpm.method_label
     ORDER BY pl.player_name ASC`,
    [roomId]
  );

  const latePlayers = lateRows.map(row => ({
    playerId:         row.player_id,
    playerName:       row.player_name,
    paymentMethod:    row.payment_method,
    methodLabel:      row.method_label || null,
    paymentReference: row.payment_reference || null,
    confirmedByName:  row.confirmed_by_name,
    confirmedByRole:  row.confirmed_by_role,
    amount:           Number(row.total_amount || 0),
  }));

  // ── 5. Written off ─────────────────────────────────────────────────────────
  const [writtenOffRows] = await connection.execute(
    `SELECT
       pl.player_id,
       pl.player_name,
       pl.payment_method,
       pl.admin_notes,
       SUM(pl.amount) AS total_amount
     FROM ${PAYMENT_LEDGER_TABLE} pl
     WHERE pl.room_id = ?
       AND pl.status = 'written_off'
       AND (pl.ticket_id IS NULL OR pl.ticket_id = '')
     GROUP BY pl.player_id, pl.player_name, pl.payment_method, pl.admin_notes
     ORDER BY pl.player_name ASC`,
    [roomId]
  );

  const writtenOff = writtenOffRows.map(row => ({
    playerId:      row.player_id,
    playerName:    row.player_name,
    paymentMethod: row.payment_method,
    adminNotes:    row.admin_notes || null,
    amount:        Number(row.total_amount || 0),
  }));

  // ── 6. Still outstanding ───────────────────────────────────────────────────
  const [outstandingRows] = await connection.execute(
    `SELECT
       pl.player_id,
       pl.player_name,
       pl.payment_method,
       pl.status,
       pl.payment_reference,
       cpm.method_label,
       SUM(pl.amount) AS total_amount
     FROM ${PAYMENT_LEDGER_TABLE} pl
     LEFT JOIN ${TABLE_PREFIX}club_payment_methods cpm
       ON pl.club_payment_method_id = cpm.id
     WHERE pl.room_id = ?
       AND pl.status IN ('disputed', 'expected', 'claimed')
       AND (pl.ticket_id IS NULL OR pl.ticket_id = '')
     GROUP BY
       pl.player_id, pl.player_name, pl.payment_method,
       pl.status, pl.payment_reference, cpm.method_label
     ORDER BY pl.status ASC, pl.player_name ASC`,
    [roomId]
  );

  const outstanding = outstandingRows.map(row => ({
    playerId:         row.player_id,
    playerName:       row.player_name,
    paymentMethod:    row.payment_method,
    methodLabel:      row.method_label || null,
    paymentReference: row.payment_reference || null,
    status:           row.status,
    amount:           Number(row.total_amount || 0),
  }));

  // ── 7. Ticket detail ───────────────────────────────────────────────────────
  const [ticketRows] = await connection.execute(
    `SELECT
       t.ticket_id, t.player_name, t.purchaser_name,
       t.payment_method, t.total_amount, t.redemption_status,
       t.confirmed_at, t.confirmed_by_name
     FROM ${TABLE_PREFIX}quiz_tickets t
     WHERE t.room_id = ?
       AND t.payment_status = 'payment_confirmed'
     ORDER BY t.player_name ASC`,
    [roomId]
  );

  const tickets = ticketRows.map(row => ({
    ticketId:         row.ticket_id,
    playerName:       row.player_name,
    purchaserName:    row.purchaser_name,
    paymentMethod:    row.payment_method,
    amount:           Number(row.total_amount || 0),
    redemptionStatus: row.redemption_status,
    confirmedAt:      row.confirmed_at ? row.confirmed_at.toISOString() : null,
    confirmedByName:  row.confirmed_by_name || null,
  }));

  // ── 8. By payment method ───────────────────────────────────────────────────
  const [byMethodRows] = await connection.execute(
    `SELECT
       payment_method,
       status,
       is_late,
       SUM(amount) AS total
     FROM ${PAYMENT_LEDGER_TABLE}
     WHERE room_id = ?
     GROUP BY payment_method, status, is_late
     ORDER BY payment_method ASC`,
    [roomId]
  );

  const byMethodMap = new Map();
  for (const row of byMethodRows) {
    const method = row.payment_method || 'unknown';
    if (!byMethodMap.has(method)) {
      byMethodMap.set(method, {
        method,
        confirmedOnNight: 0,
        confirmedLate:    0,
        expected:         0,
        claimed:          0,
        disputed:         0,
        writtenOff:       0,
        total:            0,
      });
    }
    const m   = byMethodMap.get(method);
    const amt = Number(row.total || 0);

    if (row.status === 'confirmed' && !row.is_late) m.confirmedOnNight += amt;
    else if (row.status === 'confirmed' && row.is_late) m.confirmedLate += amt;
    else if (row.status === 'expected')    m.expected   += amt;
    else if (row.status === 'claimed')     m.claimed    += amt;
    else if (row.status === 'disputed')    m.disputed   += amt;
    else if (row.status === 'written_off') m.writtenOff += amt;

    m.total += amt;
  }
  const byMethod = [...byMethodMap.values()];

  // ── Totals ─────────────────────────────────────────────────────────────────
  const totalConfirmedOnNight = confirmedGroups.reduce((s, g) => s + g.totalAmount, 0);
  const totalLate             = latePlayers.reduce((s, p) => s + p.amount, 0);
  const totalOutstanding      = outstanding.reduce((s, p) => s + p.amount, 0);
  const totalWrittenOff       = writtenOff.reduce((s, p) => s + p.amount, 0);
  const totalTickets          = tickets.reduce((s, t) => s + t.amount, 0);

  return {
    reconciliation: {
      id:               rec.id.toString(),
      approvedBy:       rec.approved_by,
      approvedAt,
      notes:            rec.notes || null,
      startingEntryFees: Number(rec.starting_entry_fees || 0),
      startingExtras:    Number(rec.starting_extras     || 0),
      startingTotal:     Number(rec.starting_total      || 0),
      adjustmentsNet:    Number(rec.adjustments_net     || 0),
      finalTotal:        Number(rec.final_total         || 0),
      finalLeaderboard:  parseJson(rec.final_leaderboard) || [],
      prizeAwards:       parseJson(rec.prize_awards)       || [],
    },
    adjustments,
    confirmedGroups,
    latePlayers,
    writtenOff,
    outstanding,
    tickets,
    hasTickets: tickets.length > 0,
    byMethod,
    totals: {
      confirmedOnNight: totalConfirmedOnNight,
      late:             totalLate,
      outstanding:      totalOutstanding,
      writtenOff:       totalWrittenOff,
      tickets:          totalTickets,
      collected:        totalConfirmedOnNight + totalLate + totalTickets,
    },
  };
}



