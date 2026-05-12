// server/mgtsystem/routes/quizReconciliation.js
import express from 'express';
import {
  getReconciliationByRoomId,
  getReconciliationsByClubId,
  getCompleteReconciliation,
  saveCompleteReconciliation,
  getBlockingClaimedPaymentsForRoom,
  updateArchiveMetadata,
  deleteReconciliation,
  getAdjustmentsByRoomId,
  getAdjustmentsByType,
  getAdjustmentTotals,
  getReconciliationExportData,
  getPaymentLedgerByRoomId,
  getPaymentLedgerTotals,
  getClubReconciliationStats,
  getReconciliationStatus,
  calculateStartingTotalsFromLedger,
  getQuizFinancialReport,
  getReconciliationAuditView,
  getPaymentLedgerSummary, 
  getPaymentLedgerReconciliationView,   // NEW
} from '../services/quizReconciliationService.js';
import { authenticateToken } from '../../middleware/auth.js';
import { connection, TABLE_PREFIX } from '../../config/database.js';

const router = express.Router();

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function parseJson(value) {
  if (!value) return null;
  if (typeof value === 'object') return value;
  try { return JSON.parse(value); } catch { return null; }
}

// ─────────────────────────────────────────────────────────────────────────────
// FINANCIAL REPORT
// ─────────────────────────────────────────────────────────────────────────────

router.get('/room/:roomId/financial-report', authenticateToken, async (req, res) => {
  try {
    const { roomId } = req.params;
    if (!roomId) return res.status(400).json({ ok: false, error: 'roomId is required' });

    const existing = await getReconciliationByRoomId(roomId);
    if (!existing) return res.status(404).json({ ok: false, error: 'Reconciliation not found' });
    if (req.user.club_id !== existing.clubId) return res.status(403).json({ ok: false, error: 'Forbidden' });

    const report = await getQuizFinancialReport(roomId);
    res.json({ ok: true, report });
  } catch (error) {
    console.error('❌ Error fetching financial report:', error);
    res.status(500).json({ ok: false, error: 'Failed to fetch financial report', message: error.message });
  }
});



// ─────────────────────────────────────────────────────────────────────────────
// RECONCILIATION SUMMARY ENDPOINTS
// ─────────────────────────────────────────────────────────────────────────────

router.get('/room/:roomId', async (req, res) => {
  try {
    const { roomId } = req.params;
    if (!roomId) return res.status(400).json({ ok: false, error: 'roomId is required' });

    const reconciliation = await getReconciliationByRoomId(roomId);
    if (!reconciliation) return res.status(404).json({ ok: false, error: 'Reconciliation not found' });

    res.json({ ok: true, reconciliation });
  } catch (error) {
    console.error('❌ Error fetching reconciliation:', error);
    res.status(500).json({ ok: false, error: 'Failed to fetch reconciliation', message: error.message });
  }
});

router.get('/room/:roomId/complete', async (req, res) => {
  try {
    const { roomId } = req.params;
    if (!roomId) return res.status(400).json({ ok: false, error: 'roomId is required' });

    const data = await getCompleteReconciliation(roomId);
    if (!data) return res.status(404).json({ ok: false, error: 'Reconciliation not found' });

    res.json({ ok: true, data });
  } catch (error) {
    console.error('❌ Error fetching complete reconciliation:', error);
    res.status(500).json({ ok: false, error: 'Failed to fetch complete reconciliation', message: error.message });
  }
});

router.get('/room/:roomId/status', async (req, res) => {
  try {
    const { roomId } = req.params;
    if (!roomId) return res.status(400).json({ ok: false, error: 'roomId is required' });

    const status = await getReconciliationStatus(roomId);
    res.json({ ok: true, ...status });
  } catch (error) {
    console.error('❌ Error checking reconciliation status:', error);
    res.status(500).json({ ok: false, error: 'Failed to check status', message: error.message });
  }
});

router.get('/club/:clubId', authenticateToken, async (req, res) => {
  try {
    const { clubId } = req.params;
    const { approvedOnly, limit, offset } = req.query;

    if (req.user.club_id !== clubId) return res.status(403).json({ ok: false, error: 'Forbidden' });

    const reconciliations = await getReconciliationsByClubId(clubId, {
      approvedOnly: approvedOnly === 'true',
      limit:  limit  ? parseInt(limit)  : 50,
      offset: offset ? parseInt(offset) : 0,
    });

    res.json({ ok: true, reconciliations, count: reconciliations.length });
  } catch (error) {
    console.error('❌ Error fetching club reconciliations:', error);
    res.status(500).json({ ok: false, error: 'Failed to fetch reconciliations', message: error.message });
  }
});

router.get('/club/:clubId/stats', authenticateToken, async (req, res) => {
  try {
    const { clubId } = req.params;
    if (req.user.club_id !== clubId) return res.status(403).json({ ok: false, error: 'Forbidden' });

    const stats = await getClubReconciliationStats(clubId);
    res.json({ ok: true, stats });
  } catch (error) {
    console.error('❌ Error fetching club stats:', error);
    res.status(500).json({ ok: false, error: 'Failed to fetch statistics', message: error.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// APPROVE  (HTTP path — used by authenticated hosts)
// Reads finalLeaderboard and prizeAwards from web2_quiz_rooms.config_json
// so the client doesn't need to send them.
// ─────────────────────────────────────────────────────────────────────────────

router.post('/room/:roomId/approve', authenticateToken, async (req, res) => {
  try {
    const { roomId } = req.params;
    const payload    = req.body;

    if (roomId !== payload.roomId) {
      return res.status(400).json({ ok: false, error: 'Room ID mismatch' });
    }
    if (req.user.club_id !== payload.clubId) {
      return res.status(403).json({ ok: false, error: 'Not authorized for this club' });
    }
    if (!payload.clubId || !payload.approvedBy || !payload.approvedAt) {
      return res.status(400).json({ ok: false, error: 'Missing required fields: clubId, approvedBy, approvedAt' });
    }
    if (typeof payload.finalTotal !== 'number' || typeof payload.startingTotal !== 'number') {
      return res.status(400).json({ ok: false, error: 'Invalid amount values' });
    }

    // ── Block on unresolved claimed payments ─────────────────────────────────
    const blockingClaimedPayments = await getBlockingClaimedPaymentsForRoom(roomId);
    if (blockingClaimedPayments.length > 0) {
      const count = blockingClaimedPayments.length;
      return res.status(409).json({
        ok: false,
        code: 'CLAIMED_PAYMENTS_UNRESOLVED',
        error:
          `${count} claimed instant payment${count === 1 ? '' : 's'} must be confirmed or ` +
          `marked as disputed before reconciliation can be approved.`,
        blockingPayments: blockingClaimedPayments,
      });
    }

    // ── Calculate authoritative totals from ledger ───────────────────────────
    const startingTotals = await calculateStartingTotalsFromLedger(roomId);
    console.log(`💰 Calculated starting totals:`, startingTotals);

    // ── NEW: Read leaderboard + prizes from the room config in the DB ────────
    // We read from web2_quiz_rooms rather than trusting the client payload,
    // so the snapshot is always sourced from the authoritative server state.
    const [roomRows] = await connection.execute(
      `SELECT config_json FROM ${TABLE_PREFIX}web2_quiz_rooms WHERE room_id = ? LIMIT 1`,
      [roomId]
    );
    const roomConfig     = parseJson(roomRows[0]?.config_json) || {};
    const finalLeaderboard = roomConfig?.reconciliation?.finalLeaderboard ?? null;
    const prizeAwards      = roomConfig?.reconciliation?.prizeAwards      ?? null;

    if (!finalLeaderboard || finalLeaderboard.length === 0) {
      console.warn(`⚠️ No finalLeaderboard in config_json for room ${roomId} — leaderboard will be empty in report`);
    }
    if (!prizeAwards || prizeAwards.length === 0) {
      console.warn(`⚠️ No prizeAwards in config_json for room ${roomId} — prizes will be empty in report`);
    }
    // ─────────────────────────────────────────────────────────────────────────

    const result = await saveCompleteReconciliation({
      roomId:            payload.roomId,
      clubId:            payload.clubId,
      startingEntryFees: startingTotals.entryFees,
      startingExtras:    startingTotals.extras,
      startingTotal:     startingTotals.total,
      adjustmentsNet:    payload.adjustmentsNet || 0,
      finalTotal:        startingTotals.total + (payload.adjustmentsNet || 0),
      approvedBy:        payload.approvedBy,
      approvedById:      req.user.id || req.user.member_id || null, // ← from JWT for ledger stamp
      approvedAt:        payload.approvedAt,
      notes:             payload.notes || null,
      adjustments:       payload.adjustments || [],
      finalLeaderboard,
      prizeAwards,
    });

    console.log(`✅ Reconciliation saved for room ${roomId}`);

    res.json({
      ok: true,
      message: 'Reconciliation saved successfully',
      data: {
        roomId:           payload.roomId,
        reconciliationId: result.reconciliationId,
        adjustmentCount:  result.adjustmentCount,
        finalTotal:       payload.finalTotal,
        approvedAt:       payload.approvedAt,
      },
    });
  } catch (error) {
    console.error('❌ Error saving reconciliation approval:', error);
    res.status(500).json({ ok: false, error: 'Failed to save reconciliation', message: error.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// ARCHIVE METADATA
// ─────────────────────────────────────────────────────────────────────────────

router.patch('/room/:roomId/archive', authenticateToken, async (req, res) => {
  try {
    const { roomId } = req.params;
    const { archiveGeneratedAt, archiveSha256 } = req.body;

    const updated = await updateArchiveMetadata(roomId, { archiveGeneratedAt, archiveSha256 });
    if (!updated) return res.status(404).json({ ok: false, error: 'Reconciliation not found' });

    res.json({ ok: true, message: 'Archive metadata updated' });
  } catch (error) {
    console.error('❌ Error updating archive metadata:', error);
    res.status(500).json({ ok: false, error: 'Failed to update archive metadata', message: error.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// DELETE
// ─────────────────────────────────────────────────────────────────────────────

router.delete('/room/:roomId', authenticateToken, async (req, res) => {
  try {
    const { roomId } = req.params;

    const existing = await getReconciliationByRoomId(roomId);
    if (!existing) return res.status(404).json({ ok: false, error: 'Reconciliation not found' });
    if (req.user.club_id !== existing.clubId) return res.status(403).json({ ok: false, error: 'Forbidden' });

    const deleted = await deleteReconciliation(roomId);
    if (!deleted) return res.status(404).json({ ok: false, error: 'Reconciliation not found' });

    res.json({ ok: true, message: 'Reconciliation deleted' });
  } catch (error) {
    console.error('❌ Error deleting reconciliation:', error);
    res.status(500).json({ ok: false, error: 'Failed to delete reconciliation', message: error.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// ADJUSTMENTS
// ─────────────────────────────────────────────────────────────────────────────

router.get('/room/:roomId/adjustments', async (req, res) => {
  try {
    const { roomId } = req.params;
    const { type }   = req.query;
    if (!roomId) return res.status(400).json({ ok: false, error: 'roomId is required' });

    const adjustments = type
      ? await getAdjustmentsByType(roomId, type)
      : await getAdjustmentsByRoomId(roomId);

    res.json({ ok: true, adjustments, count: adjustments.length });
  } catch (error) {
    console.error('❌ Error fetching adjustments:', error);
    res.status(500).json({ ok: false, error: 'Failed to fetch adjustments', message: error.message });
  }
});

router.get('/room/:roomId/adjustments/totals', async (req, res) => {
  try {
    const { roomId } = req.params;
    if (!roomId) return res.status(400).json({ ok: false, error: 'roomId is required' });

    const totals = await getAdjustmentTotals(roomId);
    res.json({ ok: true, totals });
  } catch (error) {
    console.error('❌ Error fetching adjustment totals:', error);
    res.status(500).json({ ok: false, error: 'Failed to fetch adjustment totals', message: error.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// EXPORT
// ─────────────────────────────────────────────────────────────────────────────

router.get('/room/:roomId/export', authenticateToken, async (req, res) => {
  try {
    const { roomId } = req.params;
    if (!roomId) return res.status(400).json({ ok: false, error: 'roomId is required' });

    const exportData = await getReconciliationExportData(roomId);
    res.json({ ok: true, ...exportData, players: [], allRoundsStats: [] });
  } catch (error) {
    console.error('❌ Error fetching export data:', error);
    if (error.message.includes('not found')) {
      return res.status(404).json({ ok: false, error: error.message });
    }
    res.status(500).json({ ok: false, error: 'Failed to fetch export data', message: error.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// PAYMENT LEDGER
// ─────────────────────────────────────────────────────────────────────────────

router.get('/room/:roomId/payment-ledger', async (req, res) => {
  try {
    const { roomId } = req.params;
    if (!roomId) return res.status(400).json({ ok: false, error: 'roomId is required' });

    const paymentLedger = await getPaymentLedgerByRoomId(roomId);
    res.json({ ok: true, paymentLedger, count: paymentLedger.length });
  } catch (error) {
    console.error('❌ Error fetching payment ledger:', error);
    res.status(500).json({ ok: false, error: 'Failed to fetch payment ledger', message: error.message });
  }
});

router.get('/room/:roomId/payment-ledger/totals', async (req, res) => {
  try {
    const { roomId } = req.params;
    if (!roomId) return res.status(400).json({ ok: false, error: 'roomId is required' });

    const totals = await getPaymentLedgerTotals(roomId);
    res.json({ ok: true, totals });
  } catch (error) {
    console.error('❌ Error fetching payment ledger totals:', error);
    res.status(500).json({ ok: false, error: 'Failed to fetch payment ledger totals', message: error.message });
  }
});

router.get('/room/:roomId/payment-ledger/summary', async (req, res) => {
  try {
    const { roomId } = req.params;
    const summary = await getPaymentLedgerSummary(roomId);
    res.json({ ok: true, summary });
  } catch (error) {
    console.error('❌ Error fetching payment ledger summary:', error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

router.get('/room/:roomId/payment-ledger/reconciliation-view', authenticateToken, async (req, res) => {
  try {
    const { roomId } = req.params;
    if (!roomId) return res.status(400).json({ ok: false, error: 'roomId is required' });
    const view = await getPaymentLedgerReconciliationView(roomId);
    res.json({ ok: true, view });
  } catch (error) {
    console.error('❌ Error fetching reconciliation view:', error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

// Add route:
router.get('/room/:roomId/audit-view', authenticateToken, async (req, res) => {
  try {
    const { roomId } = req.params;
    if (!roomId) return res.status(400).json({ ok: false, error: 'roomId is required' });

    const view = await getReconciliationAuditView(roomId);
    if (!view) return res.status(404).json({ ok: false, error: 'No reconciliation found for this room' });

    res.json({ ok: true, view });
  } catch (error) {
    console.error('❌ Error fetching reconciliation audit view:', error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

export default router;