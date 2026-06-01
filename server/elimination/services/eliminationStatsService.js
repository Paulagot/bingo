// server/elimination/services/eliminationStatsService.js
//
// Saves elimination game stats to the quiz_reconciliation table when a game ends.
// Uses the same table as the quiz — no schema changes needed.
//
// Only runs for Web2 rooms that have a clubId (i.e. rooms scheduled via the
// management system and hydrated from DB). Web3 and ad-hoc rooms have no
// clubId and no payment ledger rows, so we skip them silently.
//
// This function is fire-and-forget — it must NEVER throw or block the game loop.
// Wrap every call in .catch().

import { connection, TABLE_PREFIX } from '../../config/database.js';
import { calculateStartingTotalsFromLedger } from '../../mgtsystem/services/quizReconciliationService.js';

const RECONCILIATION_TABLE = `${TABLE_PREFIX}quiz_reconciliation`;
const ROOMS_TABLE          = `${TABLE_PREFIX}web2_quiz_rooms`;

// ─── Timeline builder ─────────────────────────────────────────────────────────

/**
 * Build the elimination timeline — who got eliminated in each round.
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

  // Survivors (not eliminated) — the winner(s)
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
 * Called at game end — non-fatal, always fire-and-forget.
 *
 * @param {Object} room - the in-memory room object (before deleteRoom is called)
 * @param {string} winnerId - the winning player's ID
 */
export async function saveEliminationGameStats(room, winnerId) {
  // Only run for managed Web2 rooms with a clubId and DB record
  if (!room.clubId || !room.roomId) {
    console.log(
      `[EliminationStats] Skipping stats save — no clubId (roomId: ${room.roomId}, paymentMode: ${room.paymentMode})`
    );
    return;
  }

  console.log(`[EliminationStats] Saving game stats for room ${room.roomId}`);

  try {
    // ── Calculate starting totals from the payment ledger ──────────────────
    // This reads confirmed entries from quiz_payment_ledger for this room.
    // Returns { entryFees, extras, total } — all zero if no payments were taken.
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

    // ── Upsert into quiz_reconciliation ────────────────────────────────────
    // Use INSERT ... ON DUPLICATE KEY UPDATE so re-runs are idempotent.
    // The room_id column has a unique index (same as quiz).
    const sql = `
      INSERT INTO ${RECONCILIATION_TABLE}
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
         UTC_TIMESTAMP(), UTC_TIMESTAMP())
      ON DUPLICATE KEY UPDATE
        starting_entry_fees = VALUES(starting_entry_fees),
        starting_extras     = VALUES(starting_extras),
        starting_total      = VALUES(starting_total),
        final_total         = VALUES(final_total),
        final_leaderboard   = VALUES(final_leaderboard),
        updated_at          = UTC_TIMESTAMP()
    `;

    const params = [
      room.roomId,
      room.clubId,
      startingTotals.entryFees,
      startingTotals.extras,
      startingTotals.total,
      startingTotals.total,       // final_total starts equal to starting — host adjusts later
      JSON.stringify(finalLeaderboard),
    ];

    await connection.execute(sql, params);

    // ── Mark the DB room record as 'completed' ─────────────────────────────
    // The in-memory room is still alive (pendingReconciliation = true),
    // but the DB record gets updated so the management list shows it correctly.
    // Mark room completed and move reconciliation_status to 'reconciling'
    // so the management list clearly shows this room needs reconciliation.
    await connection.execute(
      `UPDATE ${ROOMS_TABLE}
       SET status                = 'completed',
           reconciliation_status = 'reconciling',
           ended_at              = UTC_TIMESTAMP(),
           updated_at            = UTC_TIMESTAMP()
       WHERE room_id = ? AND game_type = 'elimination'
       LIMIT 1`,
      [room.roomId]
    );

    console.log(
      `[EliminationStats] ✅ Stats saved — room: ${room.roomId}`,
      `players: ${allPlayers.length}`,
      `winner: ${winner?.name}`,
      `startingTotal: ${startingTotals.total}`
    );
  } catch (err) {
    // Non-fatal — log and move on. The game loop must not be interrupted.
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
  const ADJUSTMENTS_TABLE = `${TABLE_PREFIX}quiz_reconciliation_adjustments`;

  const [[recRows], [adjRows]] = await Promise.all([
    connection.execute(
      `SELECT
         id, room_id, club_id,
         starting_entry_fees, starting_extras, starting_total,
         adjustments_net, final_total,
         approved_by, approved_at, notes,
         final_leaderboard,
         created_at, updated_at
       FROM ${RECONCILIATION_TABLE}
       WHERE room_id = ?
       LIMIT 1`,
      [roomId]
    ),
    connection.execute(
      `SELECT
         id, room_id, club_id, ts,
         adjustment_type, amount, currency,
         payment_method, reason_code,
         payer_id, note, created_by,
         prize_award_id, prize_metadata,
         created_at
       FROM ${ADJUSTMENTS_TABLE}
       WHERE room_id = ?
       ORDER BY created_at ASC`,
      [roomId]
    ),
  ]);

  if (!recRows?.length) return null;

  const rec = recRows[0];

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
      id:             a.id,
      roomId:         a.room_id,
      clubId:         a.club_id,
      ts:             a.ts ? a.ts.toISOString() : null,
      type:           a.adjustment_type,
      amount:         parseFloat(a.amount) || 0,
      currency:       a.currency,
      paymentMethod:  a.payment_method,
      reasonCode:     a.reason_code,
      payerId:        a.payer_id,
      note:           a.note,
      createdBy:      a.created_by,
      prizeAwardId:   a.prize_award_id,
      prizeMetadata:  a.prize_metadata,
      createdAt:      a.created_at.toISOString(),
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
 * @returns {{ entryFees, extras, total }} — the fresh totals, or null if no record
 */
export async function refreshReconciliationStartingTotal(roomId) {
  // Check a reconciliation record exists first (case-insensitive)
  const [existingRows] = await connection.execute(
    `SELECT room_id FROM ${RECONCILIATION_TABLE}
     WHERE UPPER(room_id) = UPPER(?) LIMIT 1`,
    [roomId]
  );

  if (!Array.isArray(existingRows) || !existingRows.length) {
    // No record yet — nothing to refresh (game stats may not have saved yet)
    return null;
  }

  const dbRoomId = existingRows[0].room_id; // use exact DB casing

  // Recalculate from the payment ledger
  let freshTotals = { entryFees: 0, extras: 0, total: 0 };
  try {
    freshTotals = await calculateStartingTotalsFromLedger(dbRoomId);
  } catch (err) {
    console.warn(`[EliminationStats] refreshReconciliationStartingTotal ledger error (non-fatal):`, err.message);
  }

  // Update the reconciliation record with fresh starting totals.
  // We don't update adjustments_net or final_total here — those are set at approval.
  await connection.execute(
    `UPDATE ${RECONCILIATION_TABLE}
     SET
       starting_entry_fees = ?,
       starting_extras     = ?,
       starting_total      = ?,
       updated_at          = UTC_TIMESTAMP()
     WHERE room_id = ?
     LIMIT 1`,
    [freshTotals.entryFees, freshTotals.extras, freshTotals.total, dbRoomId]
  );

  console.log(
    `[EliminationStats] 🔄 Refreshed starting totals — room: ${dbRoomId}`,
    `total: ${freshTotals.total}`
  );

  return freshTotals;
}

export async function approveEliminationReconciliation(roomId, approvedBy, notes = null) {
  const ADJUSTMENTS_TABLE = `${TABLE_PREFIX}quiz_reconciliation_adjustments`;

  // ── Step 1: Verify the record exists (case-insensitive) ───────────────────
  const [existingRows] = await connection.execute(
    `SELECT room_id FROM ${RECONCILIATION_TABLE}
     WHERE UPPER(room_id) = UPPER(?) LIMIT 1`,
    [roomId]
  );

  if (!Array.isArray(existingRows) || !existingRows.length) {
    const [debugRows] = await connection.execute(
      `SELECT room_id FROM ${RECONCILIATION_TABLE} ORDER BY created_at DESC LIMIT 5`
    );
    console.error(
      `[EliminationStats] No reconciliation record for "${roomId}".`,
      `Recent records:`, debugRows.map(r => r.room_id)
    );
    throw new Error(`No reconciliation record found for room ${roomId}`);
  }

  const dbRoomId = existingRows[0].room_id; // exact casing as stored

  // ── Step 2: Recalculate starting_total from live payment ledger ───────────
  // This picks up any payments confirmed after the game ended, so the
  // final total correctly reflects all confirmed payments.
  let freshTotals = { entryFees: 0, extras: 0, total: 0 };
  try {
    freshTotals = await calculateStartingTotalsFromLedger(dbRoomId);
    console.log(
      `[EliminationStats] Live starting totals for "${dbRoomId}":`,
      `entry: ${freshTotals.entryFees}, extras: ${freshTotals.extras}, total: ${freshTotals.total}`
    );
  } catch (err) {
    console.warn(`[EliminationStats] Could not recalculate starting totals (non-fatal):`, err.message);
  }

  const startingTotal = freshTotals.total;

  // ── Step 3: Recalculate adjustments_net from the adjustments table ────────
  const [adjRows] = await connection.execute(
    `SELECT adjustment_type, reason_code, SUM(amount) AS total
     FROM ${ADJUSTMENTS_TABLE}
     WHERE room_id = ?
     GROUP BY adjustment_type, reason_code`,
    [dbRoomId]
  );

  let adjustmentsNet = 0;
  for (const row of (Array.isArray(adjRows) ? adjRows : [])) {
    const amt = parseFloat(row.total) || 0;
    switch (row.adjustment_type) {
      case 'received':
        adjustmentsNet += amt;
        break;
      case 'refund':
      case 'fee':
      case 'prize_payout':
        adjustmentsNet -= amt;
        break;
      case 'cash_over_short':
        if (row.reason_code === 'cash_over') adjustmentsNet += amt;
        else if (row.reason_code === 'cash_short') adjustmentsNet -= amt;
        break;
    }
  }

  const finalTotal = startingTotal + adjustmentsNet;

  // ── Step 4: Write everything to DB ──────────────────────────────────────
  // Update the reconciliation record and close the room in one go.
  await connection.execute(
    `UPDATE ${RECONCILIATION_TABLE}
     SET
       starting_entry_fees = ?,
       starting_extras     = ?,
       starting_total      = ?,
       adjustments_net     = ?,
       final_total         = ?,
       approved_by         = ?,
       approved_at         = UTC_TIMESTAMP(),
       notes               = ?,
       updated_at          = UTC_TIMESTAMP()
     WHERE room_id = ?
     LIMIT 1`,
    [
      freshTotals.entryFees,
      freshTotals.extras,
      startingTotal,
      adjustmentsNet,
      finalTotal,
      approvedBy,
      notes,
      dbRoomId,
    ]
  );

  // Mark the room record as closed — reconciliation_status moves to 'closed'
  // so the management dashboard shows this room is fully reconciled.
  await connection.execute(
    `UPDATE ${ROOMS_TABLE}
     SET reconciliation_status = 'closed',
         updated_at             = UTC_TIMESTAMP()
     WHERE room_id = ? AND game_type = 'elimination'
     LIMIT 1`,
    [dbRoomId]
  );

  console.log(
    `[EliminationStats] ✅ Reconciliation approved — room: ${dbRoomId}`,
    `by: ${approvedBy}`,
    `starting: ${startingTotal}`,
    `net adjustments: ${adjustmentsNet}`,
    `final: ${finalTotal}`
  );

  // ── Step 5: Read back the reconciliation record id ────────────────────────
  // Then stamp all confirmed payment ledger rows with the reconciliation id
  // and approver details — same pattern as the quiz uses.
  try {
    const [recIdRows] = await connection.execute(
      `SELECT id FROM ${RECONCILIATION_TABLE} WHERE room_id = ? LIMIT 1`,
      [dbRoomId]
    );

    const reconciliationId = recIdRows?.[0]?.id ?? null;

    if (reconciliationId) {
      const PAYMENT_LEDGER_TABLE = `${TABLE_PREFIX}quiz_payment_ledger`;

      const [stampResult] = await connection.execute(
        `UPDATE ${PAYMENT_LEDGER_TABLE}
         SET reconciliation_id  = ?,
             reconciled_at      = UTC_TIMESTAMP(),
             reconciled_by      = ?,
             reconciled_by_name = ?
         WHERE room_id = ?
           AND status  = 'confirmed'`,
        [
          reconciliationId,
          approvedBy ?? null,   // member ID when available — display name otherwise
          approvedBy ?? null,   // reconciled_by_name — same value for elimination hosts
          dbRoomId,
        ]
      );

      console.log(
        `[EliminationStats] 🔖 Stamped ${stampResult.affectedRows} confirmed ledger row(s)`,
        `for room ${dbRoomId} with reconciliation_id ${reconciliationId}`
      );
    } else {
      console.warn(`[EliminationStats] Could not read back reconciliation id for room ${dbRoomId} — ledger not stamped`);
    }
  } catch (stampErr) {
    // Non-fatal — the reconciliation record is already approved, just log
    console.error(`[EliminationStats] Ledger stamp failed (non-fatal) for room ${dbRoomId}:`, stampErr.message);
  }

  return { ok: true, adjustmentsNet, finalTotal };
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
  adjustmentType,   // 'received' | 'refund' | 'fee' | 'cash_over_short' | 'prize_payout'
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
  const ADJUSTMENTS_TABLE = `${TABLE_PREFIX}quiz_reconciliation_adjustments`;

  const [result] = await connection.execute(
    `INSERT INTO ${ADJUSTMENTS_TABLE}
       (room_id, club_id, ts, adjustment_type, amount, currency,
        payment_method, reason_code, payer_id, note,
        created_by, prize_award_id, prize_metadata, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, UTC_TIMESTAMP())`,
    [
      roomId,
      clubId ?? null,
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
  const ADJUSTMENTS_TABLE = `${TABLE_PREFIX}quiz_reconciliation_adjustments`;

  const [result] = await connection.execute(
    `DELETE FROM ${ADJUSTMENTS_TABLE} WHERE id = ? AND room_id = ? LIMIT 1`,
    [adjustmentId, roomId]
  );

  return { ok: result.affectedRows > 0 };
}