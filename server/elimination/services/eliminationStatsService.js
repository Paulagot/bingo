// server/elimination/services/eliminationStatsService.js
//
// Saves elimination game stats to the quiz_reconciliation table when a game ends.
// Uses the same table as the quiz - no schema changes needed.
//
// Only runs for Web2 rooms that have a clubId (i.e. rooms scheduled via the
// management system and hydrated from DB). Web3 and ad-hoc rooms have no
// clubId and no payment ledger rows, so we skip them silently.
//
// This function is fire-and-forget - it must NEVER throw or block the game loop.
// Wrap every call in .catch().

import { connection, TABLE_PREFIX } from '../../config/database.js';
import { calculateStartingTotalsFromLedger } from '../../mgtsystem/services/quizReconciliationService.js';
import { computeAdjustmentsNet } from '../../shared/adjustmentClassifier.js';

const RECONCILIATION_TABLE = `${TABLE_PREFIX}quiz_reconciliation`;
const ADJUSTMENTS_TABLE    = `${TABLE_PREFIX}quiz_reconciliation_adjustments`;
const PAYMENT_LEDGER_TABLE = `${TABLE_PREFIX}quiz_payment_ledger`;
const ROOMS_TABLE          = `${TABLE_PREFIX}web2_quiz_rooms`;

// Elimination has exactly one reconciliation lifecycle per room. The shared
// quiz_reconciliation table is also used by activities that may have multiple
// periods per room, so room_id must never be treated as globally UNIQUE.
// Always resolve the exact Elimination header id and carry that id through the
// payment ledger and adjustment audit chain.
async function getEliminationReconciliationHeader(roomId) {
  const [rows] = await connection.execute(
    `SELECT id, room_id, club_id, approved_at, created_at, updated_at
     FROM ${RECONCILIATION_TABLE}
     WHERE UPPER(room_id) = UPPER(?)
     ORDER BY (approved_at IS NULL) DESC, id DESC
     LIMIT 1`,
    [roomId]
  );

  return Array.isArray(rows) && rows.length ? rows[0] : null;
}

// ─── Timeline builder ─────────────────────────────────────────────────────────

/**
 * Build the elimination timeline - who got eliminated in each round.
 * Groups players by eliminatedInRound ascending, winner(s) at the end.
 *
 * @param {Object} room - in-memory room object
 * @returns {Array}
 */
function buildTimeline(room) {
  const players = Object.values(room.players);

  // Group eliminated players by round number
  const byRound = {};
  for (const p of players) {
    if (p.eliminated && p.eliminatedInRound != null) {
      if (!byRound[p.eliminatedInRound]) byRound[p.eliminatedInRound] = [];
      byRound[p.eliminatedInRound].push({ playerId: p.playerId, name: p.name });
    }
  }

  const roundNumbers = Object.keys(byRound).map(Number).sort((a, b) => a - b);

  const timeline = roundNumbers.map((round) => ({
    round,
    eliminated: byRound[round],
  }));

  // Survivors (not eliminated) - the winner(s)
  const survivors = players.filter((p) => !p.eliminated);
  if (survivors.length > 0) {
    timeline.push({
      round: null,
      survived: survivors.map((p) => ({ playerId: p.playerId, name: p.name })),
    });
  }

  return timeline;
}

// ─── Final standings builder ──────────────────────────────────────────────────

/**
 * Build final standings sorted by cumulativeScore descending.
 * Eliminated players are ranked by score at time of elimination.
 *
 * @param {Object} room
 * @returns {Array}
 */
function buildFinalStandings(room) {
  const players = Object.values(room.players);

  return players
    .sort((a, b) => b.cumulativeScore - a.cumulativeScore)
    .map((p, i) => ({
      rank:              i + 1,
      playerId:          p.playerId,
      name:              p.name,
      cumulativeScore:   p.cumulativeScore,
      roundScores:       p.roundScores ?? {},
      eliminatedInRound: p.eliminatedInRound ?? null,
    }));
}

// ─── Main export ──────────────────────────────────────────────────────────────

/**
 * Save elimination game statistics to quiz_reconciliation.
 * Called at game end - non-fatal, always fire-and-forget.
 *
 * @param {Object} room - the in-memory room object (before deleteRoom is called)
 * @param {string} winnerId - the winning player's ID
 */
export async function saveEliminationGameStats(room, winnerId) {
  // Only run for managed Web2 rooms with a clubId and DB record
  if (!room.clubId || !room.roomId) {
    // console.log(
    //   `[EliminationStats] Skipping stats save - no clubId (roomId: ${room.roomId}, paymentMode: ${room.paymentMode})`
    // );
    return;
  }

  // console.log(`[EliminationStats] Saving game stats for room ${room.roomId}`);

  try {
    // ── Calculate starting totals from the payment ledger ──────────────────
    let startingTotals = { entryFees: 0, extras: 0, total: 0 };
    try {
      startingTotals = await calculateStartingTotalsFromLedger(room.roomId);
    } catch (ledgerErr) {
      console.warn(
        `[EliminationStats] Could not calculate starting totals (non-fatal):`,
        ledgerErr.message
      );
    }

    // ── Build the final_leaderboard JSON ───────────────────────────────────
    const winner = room.players[winnerId];
    const allPlayers = Object.values(room.players);

    const finalLeaderboard = {
      type:         'elimination',
      totalRounds:  room.totalRounds,
      totalPlayers: allPlayers.length,
      totalAdmins:  (room.admins ?? []).length,
      winner: {
        playerId: winnerId,
        name:     winner?.name ?? 'Unknown',
      },
      timeline:      buildTimeline(room),
      finalStandings: buildFinalStandings(room),
    };

    // ── Create or refresh the ONE Elimination reconciliation draft ─────────
    // Do NOT use INSERT ... ON DUPLICATE KEY UPDATE here. room_id is not a
    // globally unique key on the shared reconciliation table.
    const existingHeader = await getEliminationReconciliationHeader(room.roomId);
    let reconciliationId = existingHeader?.id ?? null;

    if (existingHeader && existingHeader.approved_at) {
      // Stats save can be retried after approval during recovery/reconnect.
      // Never manufacture a second reconciliation header or overwrite an
      // already-approved financial record.
      console.warn(
        `[EliminationStats] Reconciliation ${existingHeader.id} for room ${room.roomId} is already approved; header not rewritten.`
      );
    } else if (existingHeader) {
      await connection.execute(
        `UPDATE ${RECONCILIATION_TABLE}
         SET club_id              = ?,
             starting_entry_fees  = ?,
             starting_extras      = ?,
             starting_total       = ?,
             adjustments_net      = 0,
             final_total          = ?,
             final_leaderboard    = CAST(? AS JSON),
             updated_at           = UTC_TIMESTAMP()
         WHERE id = ?
         LIMIT 1`,
        [
          room.clubId,
          startingTotals.entryFees,
          startingTotals.extras,
          startingTotals.total,
          startingTotals.total,
          JSON.stringify(finalLeaderboard),
          existingHeader.id,
        ]
      );
    } else {
      const [insertResult] = await connection.execute(
        `INSERT INTO ${RECONCILIATION_TABLE}
          (room_id, club_id,
           starting_entry_fees, starting_extras, starting_total,
           adjustments_net, final_total,
           approved_by, approved_at, notes,
           final_leaderboard, prize_awards,
           created_at, updated_at)
         VALUES
          (?, ?,
           ?, ?, ?,
           0, ?,
           NULL, NULL, NULL,
           CAST(? AS JSON), NULL,
           UTC_TIMESTAMP(), UTC_TIMESTAMP())`,
        [
          room.roomId,
          room.clubId,
          startingTotals.entryFees,
          startingTotals.extras,
          startingTotals.total,
          startingTotals.total,
          JSON.stringify(finalLeaderboard),
        ]
      );
      reconciliationId = insertResult.insertId;
    }

    // If any adjustment was somehow written before the header was available,
    // claim it now. This also repairs legacy Elimination rows with NULL links.
    if (reconciliationId) {
      await connection.execute(
        `UPDATE ${ADJUSTMENTS_TABLE}
         SET reconciliation_id = ?
         WHERE room_id = ?
           AND reconciliation_id IS NULL`,
        [reconciliationId, room.roomId]
      );
    }

    // ── Mark the DB room record completed / reconciliation pending ──────────
    await connection.execute(
      `UPDATE ${ROOMS_TABLE}
       SET status                 = 'completed',
           reconciliation_status = 'reconciling',
           ended_at              = UTC_TIMESTAMP(),
           updated_at            = UTC_TIMESTAMP()
       WHERE room_id = ? AND game_type = 'elimination'
       LIMIT 1`,
      [room.roomId]
    );

    // console.log(
    //   `[EliminationStats] ✅ Stats saved - room: ${room.roomId}`,
    //   `reconciliationId: ${reconciliationId ?? 'none'}`,
    //   `players: ${allPlayers.length}`,
    //   `winner: ${winner?.name}`,
    //   `startingTotal: ${startingTotals.total}`
    // );
  } catch (err) {
    // Non-fatal - log and move on. The game loop must not be interrupted.
    console.error(`[EliminationStats] ❌ Failed to save stats for room ${room.roomId}:`, err.message);
  }
}

// ─── Load reconciliation for a room ──────────────────────────────────────────

/**
 * Fetch the reconciliation record + adjustments for a room.
 * Used by the GET /api/elimination/rooms/:roomId/reconciliation route.
 *
 * @param {string} roomId
 * @returns {{ reconciliation, adjustments } | null}
 */
export async function getEliminationReconciliation(roomId) {
  const header = await getEliminationReconciliationHeader(roomId);
  if (!header) return null;

  const [recRows] = await connection.execute(
    `SELECT
       id, room_id, club_id,
       starting_entry_fees, starting_extras, starting_total,
       adjustments_net, final_total,
       approved_by, approved_at, notes,
       final_leaderboard,
       created_at, updated_at
     FROM ${RECONCILIATION_TABLE}
     WHERE id = ?
     LIMIT 1`,
    [header.id]
  );

  if (!recRows?.length) return null;
  const rec = recRows[0];

  // Include linked rows plus legacy NULL-link rows for this same Elimination
  // room. Approval will claim the NULL rows to this exact reconciliation id.
  const [adjRows] = await connection.execute(
    `SELECT
       id, room_id, club_id, reconciliation_id, ts,
       adjustment_type, amount, currency,
       payment_method, reason_code,
       payer_id, note, created_by,
       prize_award_id, prize_metadata,
       created_at
     FROM ${ADJUSTMENTS_TABLE}
     WHERE room_id = ?
       AND (reconciliation_id = ? OR reconciliation_id IS NULL)
     ORDER BY created_at ASC, id ASC`,
    [rec.room_id, rec.id]
  );

  let finalLeaderboard = null;
  try {
    finalLeaderboard = typeof rec.final_leaderboard === 'string'
      ? JSON.parse(rec.final_leaderboard)
      : rec.final_leaderboard;
  } catch { /* leave null */ }

  return {
    reconciliation: {
      id:                 rec.id,
      roomId:             rec.room_id,
      clubId:             rec.club_id,
      startingEntryFees:  parseFloat(rec.starting_entry_fees) || 0,
      startingExtras:     parseFloat(rec.starting_extras)     || 0,
      startingTotal:      parseFloat(rec.starting_total)      || 0,
      adjustmentsNet:     parseFloat(rec.adjustments_net)     || 0,
      finalTotal:         parseFloat(rec.final_total)         || 0,
      approvedBy:         rec.approved_by   ?? null,
      approvedAt:         rec.approved_at   ? rec.approved_at.toISOString() : null,
      notes:              rec.notes         ?? null,
      finalLeaderboard,
      createdAt:          rec.created_at.toISOString(),
      updatedAt:          rec.updated_at.toISOString(),
    },
    adjustments: adjRows.map((a) => ({
      id:               a.id,
      roomId:           a.room_id,
      clubId:           a.club_id,
      reconciliationId: a.reconciliation_id ?? null,
      ts:               a.ts ? a.ts.toISOString() : null,
      type:             a.adjustment_type,
      amount:           parseFloat(a.amount) || 0,
      currency:         a.currency,
      paymentMethod:    a.payment_method,
      reasonCode:       a.reason_code,
      payerId:          a.payer_id,
      note:             a.note,
      createdBy:        a.created_by,
      prizeAwardId:     a.prize_award_id,
      prizeMetadata:    a.prize_metadata,
      createdAt:        a.created_at.toISOString(),
    })),
  };
}

// ─── Reconciliation helpers ──────────────────────────────────────────────────

/**
 * Refresh the starting_total in quiz_reconciliation from the live payment ledger.
 * Called whenever a payment is confirmed post-game so the reconciliation record
 * stays in sync with the actual confirmed payments.
 *
 * @param {string} roomId
 * @returns {{ entryFees, extras, total }} - the fresh totals, or null if no record
 */
export async function refreshReconciliationStartingTotal(roomId) {
  const header = await getEliminationReconciliationHeader(roomId);
  if (!header) return null;

  // Approved reconciliations are immutable. Late-payment handling should happen
  // before approval; once closed, do not silently alter the approved totals.
  if (header.approved_at) return null;

  let freshTotals = { entryFees: 0, extras: 0, total: 0 };
  try {
    freshTotals = await calculateStartingTotalsFromLedger(header.room_id);
  } catch (err) {
    console.warn(`[EliminationStats] refreshReconciliationStartingTotal ledger error (non-fatal):`, err.message);
  }

  await connection.execute(
    `UPDATE ${RECONCILIATION_TABLE}
     SET starting_entry_fees = ?,
         starting_extras     = ?,
         starting_total      = ?,
         updated_at          = UTC_TIMESTAMP()
     WHERE id = ?
     LIMIT 1`,
    [freshTotals.entryFees, freshTotals.extras, freshTotals.total, header.id]
  );

  // console.log(
  //   `[EliminationStats] 🔄 Refreshed starting totals - room: ${header.room_id}`,
  //   `reconciliationId: ${header.id}`,
  //   `total: ${freshTotals.total}`
  // );

  return freshTotals;
}

export async function approveEliminationReconciliation(roomId, approvedBy, notes = null) {
  // ── Step 1: Resolve the exact reconciliation header ──────────────────────
  const header = await getEliminationReconciliationHeader(roomId);

  if (!header) {
    const [debugRows] = await connection.execute(
      `SELECT id, room_id, approved_at, created_at
       FROM ${RECONCILIATION_TABLE}
       ORDER BY created_at DESC
       LIMIT 5`
    );
    console.error(
      `[EliminationStats] No reconciliation record for "${roomId}".`,
      `Recent records:`, debugRows.map(r => ({ id: r.id, roomId: r.room_id }))
    );
    throw new Error(`No reconciliation record found for room ${roomId}`);
  }

  if (header.approved_at) {
    throw new Error(`Reconciliation ${header.id} for room ${header.room_id} is already approved`);
  }

  const reconciliationId = header.id;
  const dbRoomId = header.room_id;

  // ── Step 2: Recalculate starting_total from live payment ledger ──────────
  let freshTotals = { entryFees: 0, extras: 0, total: 0 };
  try {
    freshTotals = await calculateStartingTotalsFromLedger(dbRoomId);
    // console.log(
    //   `[EliminationStats] Live starting totals for "${dbRoomId}":`,
    //   `entry: ${freshTotals.entryFees}, extras: ${freshTotals.extras}, total: ${freshTotals.total}`
    // );
  } catch (err) {
    console.warn(`[EliminationStats] Could not recalculate starting totals (non-fatal):`, err.message);
  }

  const startingTotal = freshTotals.total;

  // ── Step 3: Recalculate adjustments for THIS reconciliation ──────────────
  // Legacy Elimination adjustment rows may still have reconciliation_id NULL;
  // include them now and claim them below during approval.
  const [adjRows] = await connection.execute(
    `SELECT id, adjustment_type, reason_code, amount
     FROM ${ADJUSTMENTS_TABLE}
     WHERE room_id = ?
       AND (reconciliation_id = ? OR reconciliation_id IS NULL)
     ORDER BY id ASC`,
    [dbRoomId, reconciliationId]
  );

  const classified = computeAdjustmentsNet(Array.isArray(adjRows) ? adjRows : []);
  if (classified.unclassified.length > 0) {
    console.error('[EliminationStats] Unclassified adjustments block approval:', classified.unclassified);
    throw new Error('One or more reconciliation adjustments have an invalid type or reason code.');
  }

  const adjustmentsNet = classified.net;
  const finalTotal = startingTotal + adjustmentsNet;

  // ── Step 4: Approve the exact reconciliation row ─────────────────────────
  const [approvalResult] = await connection.execute(
    `UPDATE ${RECONCILIATION_TABLE}
     SET starting_entry_fees = ?,
         starting_extras     = ?,
         starting_total      = ?,
         adjustments_net     = ?,
         final_total         = ?,
         approved_by         = ?,
         approved_at         = UTC_TIMESTAMP(),
         notes               = ?,
         updated_at          = UTC_TIMESTAMP()
     WHERE id = ?
       AND approved_at IS NULL
     LIMIT 1`,
    [
      freshTotals.entryFees,
      freshTotals.extras,
      startingTotal,
      adjustmentsNet,
      finalTotal,
      approvedBy,
      notes,
      reconciliationId,
    ]
  );

  if (approvalResult.affectedRows !== 1) {
    throw new Error(`Failed to approve reconciliation ${reconciliationId}; it may already be approved`);
  }

  // ── Step 5: Stamp confirmed payment ledger rows with the exact id ────────
  const [ledgerStampResult] = await connection.execute(
    `UPDATE ${PAYMENT_LEDGER_TABLE}
     SET reconciliation_id  = ?,
         reconciled_at      = UTC_TIMESTAMP(),
         reconciled_by      = ?,
         reconciled_by_name = ?
     WHERE room_id = ?
       AND status = 'confirmed'`,
    [
      reconciliationId,
      approvedBy ?? null,
      approvedBy ?? null,
      dbRoomId,
    ]
  );

  // ── Step 6: Stamp/repair adjustment rows with the exact id ───────────────
  // Elimination is one reconciliation per room, so it is safe to repair legacy
  // NULL or incorrect links for this room to the exact approved header.
  const [adjustmentStampResult] = await connection.execute(
    `UPDATE ${ADJUSTMENTS_TABLE}
     SET reconciliation_id = ?
     WHERE room_id = ?
       AND (reconciliation_id IS NULL OR reconciliation_id <> ?)`,
    [reconciliationId, dbRoomId, reconciliationId]
  );

  // ── Step 7: Close reconciliation on the room record ──────────────────────
  await connection.execute(
    `UPDATE ${ROOMS_TABLE}
     SET reconciliation_status = 'closed',
         updated_at             = UTC_TIMESTAMP()
     WHERE room_id = ? AND game_type = 'elimination'
     LIMIT 1`,
    [dbRoomId]
  );

  // console.log(
  //   `[EliminationStats] ✅ Reconciliation approved - room: ${dbRoomId}`,
  //   `reconciliationId: ${reconciliationId}`,
  //   `by: ${approvedBy}`,
  //   `starting: ${startingTotal}`,
  //   `net adjustments: ${adjustmentsNet}`,
  //   `final: ${finalTotal}`,
  //   `ledger rows stamped: ${ledgerStampResult.affectedRows}`,
  //   `adjustment rows repaired/stamped: ${adjustmentStampResult.affectedRows}`
  // );

  return {
    ok: true,
    reconciliationId,
    adjustmentsNet,
    finalTotal,
    ledgerRowsStamped: ledgerStampResult.affectedRows,
    adjustmentRowsStamped: adjustmentStampResult.affectedRows,
  };
}

// ─── Save a single adjustment entry ──────────────────────────────────────────

/**
 * Insert or replace a single manual adjustment row.
 * Called by the socket handler when the host adds/edits a ledger entry.
 *
 * @param {Object} params
 * @returns {number} insertId
 */
export async function saveAdjustmentEntry({
  roomId,
  clubId,
  adjustmentType,   // 'received' | 'refund' | 'fee' | 'cash_over_short' | 'prize_payout' | 'expense'
  amount,
  currency = 'EUR',
  paymentMethod = null,
  reasonCode = null,
  payerId = null,
  note = null,
  createdBy = null,
  prizeAwardId = null,
  prizeMetadata = null,
  ts = null,
}) {
  const header = await getEliminationReconciliationHeader(roomId);
  const reconciliationId = header && !header.approved_at ? header.id : null;

  const [result] = await connection.execute(
    `INSERT INTO ${ADJUSTMENTS_TABLE}
       (room_id, club_id, reconciliation_id, ts, adjustment_type, amount, currency,
        payment_method, reason_code, payer_id, note,
        created_by, prize_award_id, prize_metadata, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, UTC_TIMESTAMP())`,
    [
      roomId,
      clubId ?? null,
      reconciliationId,
      ts ? new Date(ts) : new Date(),
      adjustmentType,
      amount,
      currency,
      paymentMethod,
      reasonCode,
      payerId,
      note,
      createdBy,
      prizeAwardId,
      prizeMetadata ? JSON.stringify(prizeMetadata) : null,
    ]
  );

  return result.insertId;
}

// ─── Update a single adjustment entry ─────────────────────────────────────────

/**
 * Update an existing manual adjustment row in place.
 * Financial records keep the same primary key - edits must never be implemented
 * as delete + insert because that can duplicate rows and destroys audit identity.
 *
 * @returns {{ ok: boolean }}
 */
export async function updateAdjustmentEntry({
  adjustmentId,
  roomId,
  adjustmentType,
  amount,
  currency = 'EUR',
  paymentMethod = null,
  reasonCode = null,
  payerId = null,
  note = null,
  createdBy = null,
  prizeAwardId = null,
  prizeMetadata = null,
  ts = null,
}) {
  const header = await getEliminationReconciliationHeader(roomId);
  const reconciliationId = header && !header.approved_at ? header.id : null;

  const [result] = await connection.execute(
    `UPDATE ${ADJUSTMENTS_TABLE}
     SET reconciliation_id = COALESCE(reconciliation_id, ?),
         ts = ?,
         adjustment_type = ?,
         amount = ?,
         currency = ?,
         payment_method = ?,
         reason_code = ?,
         payer_id = ?,
         note = ?,
         created_by = ?,
         prize_award_id = ?,
         prize_metadata = ?
     WHERE id = ? AND room_id = ?
     LIMIT 1`,
    [
      reconciliationId,
      ts ? new Date(ts) : new Date(),
      adjustmentType,
      amount,
      currency,
      paymentMethod,
      reasonCode,
      payerId,
      note,
      createdBy,
      prizeAwardId,
      prizeMetadata ? JSON.stringify(prizeMetadata) : null,
      adjustmentId,
      roomId,
    ]
  );

  return { ok: result.affectedRows > 0 };
}

// ─── Delete an adjustment entry ───────────────────────────────────────────────

/**
 * Delete a single adjustment entry (host removes a ledger item).
 * Validates room_id to prevent cross-room deletions.
 *
 * @param {number|string} adjustmentId
 * @param {string} roomId
 * @returns {{ ok: boolean }}
 */
export async function deleteAdjustmentEntry(adjustmentId, roomId) {
  const [result] = await connection.execute(
    `DELETE FROM ${ADJUSTMENTS_TABLE} WHERE id = ? AND room_id = ? LIMIT 1`,
    [adjustmentId, roomId]
  );

  return { ok: result.affectedRows > 0 };
}