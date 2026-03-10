// server/mgtsystem/services/quizReconciliationService.js
import { connection, TABLE_PREFIX } from '../../config/database.js';

const RECONCILIATION_TABLE = `${TABLE_PREFIX}quiz_reconciliation`;
const ADJUSTMENTS_TABLE = `${TABLE_PREFIX}quiz_reconciliation_adjustments`;
const PAYMENT_LEDGER_TABLE = `${TABLE_PREFIX}quiz_payment_ledger`;

/**
 * Calculate starting totals from payment ledger database
 * @param {string} roomId - Quiz room identifier
 * @returns {Object} Starting totals { entryFees, extras, total }
 */
export async function calculateStartingTotalsFromLedger(roomId) {
  const sql = `
    SELECT 
      ledger_type,
      SUM(amount) as total_amount
    FROM ${PAYMENT_LEDGER_TABLE}
    WHERE room_id = ?
      AND status = 'confirmed'
    GROUP BY ledger_type
  `;

  const [rows] = await connection.execute(sql, [roomId]);

  let entryFees = 0;
  let extras = 0;

  for (const row of rows) {
    const amount = Number(row.total_amount || 0);
    if (row.ledger_type === 'entry_fee') {
      entryFees = amount;
    } else if (row.ledger_type === 'extra_purchase') {
      extras = amount;
    }
  }

  return {
    entryFees,
    extras,
    total: entryFees + extras,
  };
}

/**
 * Get complete financial report for a quiz
 * @param {string} roomId - Quiz room identifier
 * @returns {Object} Complete financial report
 */
export async function getQuizFinancialReport(roomId) {
  try {
    /**
     * --------------------------------------------------------------------------
     * 1) Reconciliation summary
     * --------------------------------------------------------------------------
     */
    const reconciliationSql = `
      SELECT 
        starting_entry_fees,
        starting_extras,
        starting_total,
        adjustments_net,
        final_total,
        approved_by,
        approved_at
      FROM ${RECONCILIATION_TABLE}
      WHERE room_id = ?
      LIMIT 1
    `;

    const [reconciliationRows] = await connection.execute(reconciliationSql, [roomId]);
    const reconciliation = reconciliationRows[0] || null;

    /**
     * --------------------------------------------------------------------------
     * 2) Ticket statistics (confirmed ticket payments)
     * --------------------------------------------------------------------------
     */
    const ticketStatsSql = `
      SELECT 
        COUNT(*) as total_tickets,
        SUM(CASE WHEN redemption_status = 'redeemed' THEN 1 ELSE 0 END) as redeemed_tickets,
        SUM(CASE WHEN redemption_status != 'redeemed' THEN 1 ELSE 0 END) as unredeemed_tickets,
        SUM(total_amount) as total_ticket_revenue,
        SUM(entry_fee) as ticket_entry_fees,
        SUM(extras_total) as ticket_extras
      FROM ${TABLE_PREFIX}quiz_tickets
      WHERE room_id = ?
        AND payment_status = 'payment_confirmed'
    `;

    const [ticketStatsRows] = await connection.execute(ticketStatsSql, [roomId]);
    const ticketStats = ticketStatsRows[0] || {
      total_tickets: 0,
      redeemed_tickets: 0,
      unredeemed_tickets: 0,
      total_ticket_revenue: 0,
      ticket_entry_fees: 0,
      ticket_extras: 0,
    };

    /**
     * --------------------------------------------------------------------------
     * 3) On-the-night payments (NON-LATE)
     * Rules:
     *  - status = confirmed
     *  - is_late = 0
     *  - no ticket_id (so not ticket sales)
     *  - counts are UNIQUE PLAYERS (not ledger rows)
     * --------------------------------------------------------------------------
     */

    const onNightByMethodSql = `
      SELECT 
        payment_method,
        COUNT(DISTINCT player_id) as unique_players,
        COUNT(*) as records,
        SUM(amount) as total
      FROM ${PAYMENT_LEDGER_TABLE}
      WHERE room_id = ?
        AND status = 'confirmed'
        AND is_late = 0
        AND (ticket_id IS NULL OR ticket_id = '')
      GROUP BY payment_method
    `;

    const [onNightRows] = await connection.execute(onNightByMethodSql, [roomId]);

    const onNightPaymentsByMethod = onNightRows.map(row => ({
      method: row.payment_method,
      uniquePlayers: Number(row.unique_players || 0),
      records: Number(row.records || 0),
      total: Number(row.total || 0),
    }));

    // Overall on-night totals (avoid double-counting players across methods)
    const onNightTotalsSql = `
      SELECT 
        COUNT(DISTINCT player_id) as unique_players,
        COUNT(*) as records,
        SUM(amount) as total
      FROM ${PAYMENT_LEDGER_TABLE}
      WHERE room_id = ?
        AND status = 'confirmed'
        AND is_late = 0
        AND (ticket_id IS NULL OR ticket_id = '')
    `;

    const [onNightTotalsRows] = await connection.execute(onNightTotalsSql, [roomId]);
    const onNightTotals = onNightTotalsRows[0] || {};

    /**
     * --------------------------------------------------------------------------
     * 4) Late payments (SEPARATE section)
     * Rules:
     *  - status = confirmed
     *  - is_late = 1
     *  - no ticket_id
     * --------------------------------------------------------------------------
     */
    const lateByMethodSql = `
      SELECT 
        payment_method,
        COUNT(DISTINCT player_id) as unique_players,
        COUNT(*) as records,
        SUM(amount) as total
      FROM ${PAYMENT_LEDGER_TABLE}
      WHERE room_id = ?
        AND status = 'confirmed'
        AND is_late = 1
        AND (ticket_id IS NULL OR ticket_id = '')
      GROUP BY payment_method
    `;

    const [lateRows] = await connection.execute(lateByMethodSql, [roomId]);

    const latePaymentsByMethod = lateRows.map(row => ({
      method: row.payment_method,
      uniquePlayers: Number(row.unique_players || 0),
      records: Number(row.records || 0),
      total: Number(row.total || 0),
    }));

    const lateTotalsSql = `
      SELECT 
        COUNT(DISTINCT player_id) as unique_players,
        COUNT(*) as records,
        SUM(amount) as total
      FROM ${PAYMENT_LEDGER_TABLE}
      WHERE room_id = ?
        AND status = 'confirmed'
        AND is_late = 1
        AND (ticket_id IS NULL OR ticket_id = '')
    `;

    const [lateTotalsRows] = await connection.execute(lateTotalsSql, [roomId]);
    const lateTotals = lateTotalsRows[0] || {};

/**
 * --------------------------------------------------------------------------
 * 5) Instant payment breakdown (COMBINED: on-the-night + late)
 * Rules:
 *  - status = confirmed
 *  - payment_method = instant_payment
 *  - no ticket_id
 *  - breakdown is by club_payment_method_id (your preset methods)
 *  - include nonLate vs late counts/totals + combined total
 * --------------------------------------------------------------------------
 */
/**
 * 5) Instant payment breakdown (COMBINED: on-the-night + late)
 * Count UNIQUE PLAYERS (not ledger rows)
 */
const instantPaymentBreakdownSql = `
  SELECT 
    pl.club_payment_method_id,
    cpm.method_label,
    cpm.provider_name,

    COUNT(DISTINCT CASE WHEN pl.is_late = 0 THEN pl.player_id END) as non_late_players,
    SUM(CASE WHEN pl.is_late = 0 THEN pl.amount ELSE 0 END) as non_late_total,

    COUNT(DISTINCT CASE WHEN pl.is_late = 1 THEN pl.player_id END) as late_players,
    SUM(CASE WHEN pl.is_late = 1 THEN pl.amount ELSE 0 END) as late_total,

    COUNT(DISTINCT pl.player_id) as players,
    SUM(pl.amount) as total_amount

  FROM ${PAYMENT_LEDGER_TABLE} pl
  LEFT JOIN ${TABLE_PREFIX}club_payment_methods cpm 
    ON pl.club_payment_method_id = cpm.id
  WHERE pl.room_id = ?
    AND pl.status = 'confirmed'
    AND pl.payment_method = 'instant_payment'
    AND (pl.ticket_id IS NULL OR pl.ticket_id = '')
  GROUP BY pl.club_payment_method_id, cpm.method_label, cpm.provider_name
  ORDER BY total_amount DESC
`;

const [instantPaymentRows] = await connection.execute(instantPaymentBreakdownSql, [roomId]);

const instantPaymentBreakdown = instantPaymentRows.map(row => ({
  paymentMethodId: row.club_payment_method_id,
  label: row.method_label || 'Unknown Method',
  provider: row.provider_name || null,

  // ✅ player counts (not records)
  players: Number(row.players || 0),
  nonLatePlayers: Number(row.non_late_players || 0),
  latePlayers: Number(row.late_players || 0),

  // totals
  total: Number(row.total_amount || 0),
  nonLateTotal: Number(row.non_late_total || 0),
  lateTotal: Number(row.late_total || 0),
}));

    /**
     * --------------------------------------------------------------------------
     * Return report
     * --------------------------------------------------------------------------
     */
    return {
      reconciliation: reconciliation
        ? {
            startingEntryFees: Number(reconciliation.starting_entry_fees || 0),
            startingExtras: Number(reconciliation.starting_extras || 0),
            startingTotal: Number(reconciliation.starting_total || 0),
            adjustmentsNet: Number(reconciliation.adjustments_net || 0),
            finalTotal: Number(reconciliation.final_total || 0),
            approvedBy: reconciliation.approved_by,
            approvedAt: reconciliation.approved_at ? reconciliation.approved_at.toISOString() : null,
          }
        : null,

      tickets: {
        totalSold: Number(ticketStats.total_tickets || 0),
        redeemed: Number(ticketStats.redeemed_tickets || 0),
        unredeemed: Number(ticketStats.unredeemed_tickets || 0),
        totalRevenue: Number(ticketStats.total_ticket_revenue || 0),
        entryFees: Number(ticketStats.ticket_entry_fees || 0),
        extras: Number(ticketStats.ticket_extras || 0),
      },

      onNightPayments: {
        byMethod: onNightPaymentsByMethod,
        total: Number(onNightTotals.total || 0),
        uniquePlayers: Number(onNightTotals.unique_players || 0),
        records: Number(onNightTotals.records || 0),
      },

      // NEW SECTION
      latePayments: {
        byMethod: latePaymentsByMethod,
        total: Number(lateTotals.total || 0),
        uniquePlayers: Number(lateTotals.unique_players || 0),
        records: Number(lateTotals.records || 0),
      },

      instantPaymentBreakdown,
    };
  } catch (error) {
    console.error('❌ Error generating financial report:', error);
    throw error;
  }
}

/**
 * ============================================================================
 * RECONCILIATION SUMMARY OPERATIONS
 * ============================================================================
 */

export async function getReconciliationByRoomId(roomId) {
  const sql = `
    SELECT 
      id,
      room_id,
      club_id,
      starting_entry_fees,
      starting_extras,
      starting_total,
      adjustments_net,
      final_total,
      approved_by,
      approved_at,
      notes,
      archive_generated_at,
      archive_sha256,
      created_at,
      updated_at
    FROM ${RECONCILIATION_TABLE}
    WHERE room_id = ?
    LIMIT 1
  `;

  const [rows] = await connection.execute(sql, [roomId]);

  if (rows.length === 0) return null;

  const row = rows[0];
  return {
    id: row.id.toString(),
    roomId: row.room_id,
    clubId: row.club_id,
    startingEntryFees: parseFloat(row.starting_entry_fees),
    startingExtras: parseFloat(row.starting_extras),
    startingTotal: parseFloat(row.starting_total),
    adjustmentsNet: parseFloat(row.adjustments_net),
    finalTotal: parseFloat(row.final_total),
    approvedBy: row.approved_by,
    approvedAt: row.approved_at ? row.approved_at.toISOString() : null,
    notes: row.notes,
    archiveGeneratedAt: row.archive_generated_at ? row.archive_generated_at.toISOString() : null,
    archiveSha256: row.archive_sha256,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

export async function getReconciliationsByClubId(clubId, options = {}) {
  const { approvedOnly = false, limit = 50, offset = 0 } = options;

  let sql = `
    SELECT 
      id,
      room_id,
      club_id,
      starting_entry_fees,
      starting_extras,
      starting_total,
      adjustments_net,
      final_total,
      approved_by,
      approved_at,
      notes,
      archive_generated_at,
      created_at,
      updated_at
    FROM ${RECONCILIATION_TABLE}
    WHERE club_id = ?
  `;

  const params = [clubId];

  if (approvedOnly) {
    sql += ' AND approved_at IS NOT NULL';
  }

  sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
  params.push(limit, offset);

  const [rows] = await connection.execute(sql, params);

  return rows.map(row => ({
    id: row.id.toString(),
    roomId: row.room_id,
    clubId: row.club_id,
    startingEntryFees: parseFloat(row.starting_entry_fees),
    startingExtras: parseFloat(row.starting_extras),
    startingTotal: parseFloat(row.starting_total),
    adjustmentsNet: parseFloat(row.adjustments_net),
    finalTotal: parseFloat(row.final_total),
    approvedBy: row.approved_by,
    approvedAt: row.approved_at ? row.approved_at.toISOString() : null,
    notes: row.notes,
    archiveGeneratedAt: row.archive_generated_at ? row.archive_generated_at.toISOString() : null,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  }));
}

export async function upsertReconciliation(reconciliationData) {
  const {
    roomId,
    clubId,
    startingEntryFees = 0,
    startingExtras = 0,
    startingTotal,
    adjustmentsNet = 0,
    finalTotal,
    approvedBy,
    approvedAt,
    notes = null,
  } = reconciliationData;

  if (!roomId || !clubId || typeof finalTotal === 'undefined') {
    throw new Error('Missing required fields: roomId, clubId, finalTotal');
  }

  const sql = `
    INSERT INTO ${RECONCILIATION_TABLE} (
      room_id,
      club_id,
      starting_entry_fees,
      starting_extras,
      starting_total,
      adjustments_net,
      final_total,
      approved_by,
      approved_at,
      notes
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      starting_entry_fees = VALUES(starting_entry_fees),
      starting_extras = VALUES(starting_extras),
      starting_total = VALUES(starting_total),
      adjustments_net = VALUES(adjustments_net),
      final_total = VALUES(final_total),
      approved_by = VALUES(approved_by),
      approved_at = VALUES(approved_at),
      notes = VALUES(notes),
      updated_at = CURRENT_TIMESTAMP
  `;

  const approvedAtDate = approvedAt ? new Date(approvedAt) : null;

  const [result] = await connection.execute(sql, [
    roomId,
    clubId,
    startingEntryFees,
    startingExtras,
    startingTotal,
    adjustmentsNet,
    finalTotal,
    approvedBy || null,
    approvedAtDate,
    notes,
  ]);

  if (result.insertId) {
    return result.insertId.toString();
  } else {
    const [rows] = await connection.execute(
      `SELECT id FROM ${RECONCILIATION_TABLE} WHERE room_id = ?`,
      [roomId]
    );
    return rows[0].id.toString();
  }
}

export async function updateArchiveMetadata(roomId, archiveData) {
  const { archiveGeneratedAt, archiveSha256 } = archiveData;

  const sql = `
    UPDATE ${RECONCILIATION_TABLE}
    SET 
      archive_generated_at = ?,
      archive_sha256 = ?,
      updated_at = CURRENT_TIMESTAMP
    WHERE room_id = ?
  `;

  const generatedAtDate = archiveGeneratedAt ? new Date(archiveGeneratedAt) : new Date();

  const [result] = await connection.execute(sql, [generatedAtDate, archiveSha256 || null, roomId]);

  return result.affectedRows > 0;
}

export async function deleteReconciliation(roomId) {
  await connection.execute(`DELETE FROM ${ADJUSTMENTS_TABLE} WHERE room_id = ?`, [roomId]);

  const [result] = await connection.execute(`DELETE FROM ${RECONCILIATION_TABLE} WHERE room_id = ?`, [roomId]);

  return result.affectedRows > 0;
}

/**
 * ============================================================================
 * ADJUSTMENT OPERATIONS
 * ============================================================================
 */

export async function getAdjustmentsByRoomId(roomId) {
  const sql = `
    SELECT 
      id,
      room_id,
      ts,
      adjustment_type,
      amount,
      currency,
      payment_method,
      reason_code,
      payer_id,
      note,
      created_by,
      prize_award_id,
      prize_metadata,
      created_at
    FROM ${ADJUSTMENTS_TABLE}
    WHERE room_id = ?
    ORDER BY ts ASC
  `;

  const [rows] = await connection.execute(sql, [roomId]);

  return rows.map(row => ({
    id: row.id.toString(),
    roomId: row.room_id,
    ts: row.ts.toISOString(),
    adjustmentType: row.adjustment_type,
    amount: parseFloat(row.amount),
    currency: row.currency,
    paymentMethod: row.payment_method,
    reasonCode: row.reason_code,
    payerId: row.payer_id,
    note: row.note,
    createdBy: row.created_by,
    prizeAwardId: row.prize_award_id,
    prizeMetadata: row.prize_metadata ? JSON.parse(row.prize_metadata) : null,
    createdAt: row.created_at.toISOString(),
  }));
}

export async function getAdjustmentsByType(roomId, adjustmentType) {
  const sql = `
    SELECT 
      id,
      room_id,
      ts,
      adjustment_type,
      amount,
      currency,
      payment_method,
      reason_code,
      payer_id,
      note,
      created_by,
      prize_award_id,
      prize_metadata,
      created_at
    FROM ${ADJUSTMENTS_TABLE}
    WHERE room_id = ? AND adjustment_type = ?
    ORDER BY ts ASC
  `;

  const [rows] = await connection.execute(sql, [roomId, adjustmentType]);

  return rows.map(row => ({
    id: row.id.toString(),
    roomId: row.room_id,
    ts: row.ts.toISOString(),
    adjustmentType: row.adjustment_type,
    amount: parseFloat(row.amount),
    currency: row.currency,
    paymentMethod: row.payment_method,
    reasonCode: row.reason_code,
    payerId: row.payer_id,
    note: row.note,
    createdBy: row.created_by,
    prizeAwardId: row.prize_award_id,
    prizeMetadata: row.prize_metadata ? JSON.parse(row.prize_metadata) : null,
    createdAt: row.created_at.toISOString(),
  }));
}

export async function getAdjustmentTotals(roomId) {
  const sql = `
    SELECT 
      adjustment_type,
      COUNT(*) as count,
      SUM(amount) as total
    FROM ${ADJUSTMENTS_TABLE}
    WHERE room_id = ?
    GROUP BY adjustment_type
  `;

  const [rows] = await connection.execute(sql, [roomId]);

  const totals = {};
  rows.forEach(row => {
    totals[row.adjustment_type] = {
      count: parseInt(row.count),
      total: parseFloat(row.total),
    };
  });

  return totals;
}

export async function replaceAdjustments(roomId, adjustments) {
  try {
    await connection.execute(`DELETE FROM ${ADJUSTMENTS_TABLE} WHERE room_id = ?`, [roomId]);

    if (adjustments && adjustments.length > 0) {
      const sql = `
        INSERT INTO ${ADJUSTMENTS_TABLE} (
          room_id,
          ts,
          adjustment_type,
          amount,
          currency,
          payment_method,
          reason_code,
          payer_id,
          note,
          created_by,
          prize_award_id,
          prize_metadata
        ) VALUES ?
      `;

      const values = adjustments.map(adj => [
        roomId,
        new Date(adj.ts),
        adj.type,
        adj.amount,
        adj.currency || 'EUR',
        adj.method || null,
        adj.reasonCode || null,
        adj.payerId || null,
        adj.note || null,
        adj.createdBy,
        adj.meta?.prizeAwardId || null,
        adj.meta ? JSON.stringify(adj.meta) : null,
      ]);

      await connection.query(sql, [values]);
    }

    return true;
  } catch (error) {
    throw error;
  }
}

/**
 * ============================================================================
 * COMBINED OPERATIONS (RECONCILIATION + ADJUSTMENTS)
 * ============================================================================
 */

export async function saveCompleteReconciliation(reconciliationData) {
  const {
    roomId,
    clubId,
    startingEntryFees,
    startingExtras,
    startingTotal,
    adjustmentsNet,
    finalTotal,
    approvedBy,
    approvedAt,
    notes,
    adjustments = [],
  } = reconciliationData;

  try {
    const reconciliationId = await upsertReconciliation({
      roomId,
      clubId,
      startingEntryFees,
      startingExtras,
      startingTotal,
      adjustmentsNet,
      finalTotal,
      approvedBy,
      approvedAt,
      notes,
    });

    await replaceAdjustments(roomId, adjustments);

    console.log(`✅ Saved complete reconciliation for room ${roomId}`);

    return {
      reconciliationId,
      adjustmentCount: adjustments.length,
    };
  } catch (error) {
    console.error('❌ Error saving complete reconciliation:', error);
    throw error;
  }
}

export async function getCompleteReconciliation(roomId) {
  const reconciliation = await getReconciliationByRoomId(roomId);
  if (!reconciliation) return null;

  const adjustments = await getAdjustmentsByRoomId(roomId);

  return {
    ...reconciliation,
    adjustments,
  };
}

export async function getReconciliationExportData(roomId) {
  const reconciliation = await getReconciliationByRoomId(roomId);

  if (!reconciliation) {
    throw new Error(`Reconciliation not found for room ${roomId}`);
  }

  const adjustments = await getAdjustmentsByRoomId(roomId);
  const paymentLedger = await getPaymentLedgerByRoomId(roomId);

  return {
    reconciliation: {
      approvedBy: reconciliation.approvedBy,
      approvedAt: reconciliation.approvedAt,
      notes: reconciliation.notes,
      startingTotal: reconciliation.startingTotal,
      adjustmentsNet: reconciliation.adjustmentsNet,
      finalTotal: reconciliation.finalTotal,
    },
    adjustments,
    paymentLedger,
  };
}

/**
 * ============================================================================
 * PAYMENT LEDGER OPERATIONS
 * ============================================================================
 */

export async function getPaymentLedgerByRoomId(roomId) {
  const sql = `
    SELECT 
      id,
      room_id,
      player_id,
      player_name,
      ledger_type,
      amount,
      currency,
      status,
      payment_method,
      payment_reference,
      club_payment_method_id,
      claimed_at,
      confirmed_at,
      created_at
    FROM ${PAYMENT_LEDGER_TABLE}
    WHERE room_id = ?
    ORDER BY created_at ASC
  `;

  const [rows] = await connection.execute(sql, [roomId]);

  return rows.map(row => ({
    id: row.id.toString(),
    roomId: row.room_id,
    playerId: row.player_id,
    playerName: row.player_name,
    ledgerType: row.ledger_type,
    amount: parseFloat(row.amount),
    currency: row.currency,
    status: row.status,
    paymentMethod: row.payment_method,
    paymentReference: row.payment_reference,
    clubPaymentMethodId: row.club_payment_method_id,
    claimedAt: row.claimed_at ? row.claimed_at.toISOString() : null,
    confirmedAt: row.confirmed_at ? row.confirmed_at.toISOString() : null,
    createdAt: row.created_at.toISOString(),
  }));
}

export async function getPaymentLedgerTotals(roomId) {
  const sql = `
    SELECT 
      ledger_type,
      status,
      COUNT(*) as count,
      SUM(amount) as total
    FROM ${PAYMENT_LEDGER_TABLE}
    WHERE room_id = ?
    GROUP BY ledger_type, status
  `;

  const [rows] = await connection.execute(sql, [roomId]);

  const totals = {
    entryFees: { expected: 0, claimed: 0, confirmed: 0 },
    extras: { expected: 0, claimed: 0, confirmed: 0 },
  };

  rows.forEach(row => {
    const type = row.ledger_type === 'entry_fee' ? 'entryFees' : 'extras';
    const status = row.status;
    totals[type][status] = parseFloat(row.total);
  });

  return totals;
}

/**
 * ============================================================================
 * STATISTICS & REPORTING
 * ============================================================================
 */

export async function getClubReconciliationStats(clubId) {
  const sql = `
    SELECT 
      COUNT(*) as total_reconciliations,
      SUM(CASE WHEN approved_at IS NOT NULL THEN 1 ELSE 0 END) as approved_count,
      SUM(CASE WHEN approved_at IS NULL THEN 1 ELSE 0 END) as pending_count,
      SUM(final_total) as total_revenue,
      AVG(final_total) as avg_revenue_per_quiz
    FROM ${RECONCILIATION_TABLE}
    WHERE club_id = ?
  `;

  const [rows] = await connection.execute(sql, [clubId]);
  const stats = rows[0];

  return {
    totalReconciliations: parseInt(stats.total_reconciliations || 0),
    approvedCount: parseInt(stats.approved_count || 0),
    pendingCount: parseInt(stats.pending_count || 0),
    totalRevenue: parseFloat(stats.total_revenue || 0),
    avgRevenuePerQuiz: parseFloat(stats.avg_revenue_per_quiz || 0),
  };
}

export async function getReconciliationStatus(roomId) {
  const sql = `
    SELECT 
      room_id,
      approved_at,
      approved_by,
      final_total,
      archive_generated_at
    FROM ${RECONCILIATION_TABLE}
    WHERE room_id = ?
    LIMIT 1
  `;

  const [rows] = await connection.execute(sql, [roomId]);

  if (rows.length === 0) {
    return {
      exists: false,
      approved: false,
    };
  }

  const rec = rows[0];
  return {
    exists: true,
    approved: !!rec.approved_at,
    approvedBy: rec.approved_by,
    approvedAt: rec.approved_at ? rec.approved_at.toISOString() : null,
    finalTotal: parseFloat(rec.final_total),
    archiveGenerated: !!rec.archive_generated_at,
  };
}

