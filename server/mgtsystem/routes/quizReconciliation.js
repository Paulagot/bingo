// server/mgtsystem/routes/quizReconciliation.js
import express from 'express';
import {
  getReconciliationByRoomId,
  getReconciliationsByClubId,
  getCompleteReconciliation,
  saveCompleteReconciliation,
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
} from '../services/quizReconciliationService.js';
import { authenticateToken } from '../../middleware/auth.js';

const router = express.Router();

/**
 * ============================================================================
 * FINANCIAL REPORT ENDPOINT
 * ============================================================================
 */

router.get('/room/:roomId/financial-report', authenticateToken, async (req, res) => {
  try {
    const { roomId } = req.params;

    if (!roomId) {
      return res.status(400).json({
        ok: false,
        error: 'roomId is required',
      });
    }

    console.log(`📊 Fetching financial report for room: ${roomId}`);

    const existing = await getReconciliationByRoomId(roomId);

    if (!existing) {
      return res.status(404).json({
        ok: false,
        error: 'Reconciliation not found for this room',
      });
    }

    if (req.user.club_id !== existing.clubId) {
      return res.status(403).json({
        ok: false,
        error: 'Not authorized to view this report',
      });
    }

    const report = await getQuizFinancialReport(roomId);

    console.log(`✅ Generated financial report for room ${roomId}`);

    res.json({
      ok: true,
      report,
    });
  } catch (error) {
    console.error('❌ Error fetching financial report:', error);
    res.status(500).json({
      ok: false,
      error: 'Failed to fetch financial report',
      message: error.message,
    });
  }
});

/**
 * ============================================================================
 * RECONCILIATION SUMMARY ENDPOINTS
 * ============================================================================
 */

router.get('/room/:roomId', async (req, res) => {
  try {
    const { roomId } = req.params;

    if (!roomId) {
      return res.status(400).json({
        ok: false,
        error: 'roomId is required',
      });
    }

    console.log(`📋 Fetching reconciliation for room: ${roomId}`);

    const reconciliation = await getReconciliationByRoomId(roomId);

    if (!reconciliation) {
      return res.status(404).json({
        ok: false,
        error: 'Reconciliation not found for this room',
      });
    }

    console.log(`✅ Found reconciliation for room ${roomId}`);

    res.json({
      ok: true,
      reconciliation,
    });
  } catch (error) {
    console.error('❌ Error fetching reconciliation:', error);
    res.status(500).json({
      ok: false,
      error: 'Failed to fetch reconciliation',
      message: error.message,
    });
  }
});

router.get('/room/:roomId/complete', async (req, res) => {
  try {
    const { roomId } = req.params;

    if (!roomId) {
      return res.status(400).json({
        ok: false,
        error: 'roomId is required',
      });
    }

    console.log(`📋 Fetching complete reconciliation for room: ${roomId}`);

    const data = await getCompleteReconciliation(roomId);

    if (!data) {
      return res.status(404).json({
        ok: false,
        error: 'Reconciliation not found for this room',
      });
    }

    console.log(`✅ Found complete reconciliation with ${data.adjustments.length} adjustments`);

    res.json({
      ok: true,
      data,
    });
  } catch (error) {
    console.error('❌ Error fetching complete reconciliation:', error);
    res.status(500).json({
      ok: false,
      error: 'Failed to fetch complete reconciliation',
      message: error.message,
    });
  }
});

router.get('/room/:roomId/status', async (req, res) => {
  try {
    const { roomId } = req.params;

    if (!roomId) {
      return res.status(400).json({
        ok: false,
        error: 'roomId is required',
      });
    }

    const status = await getReconciliationStatus(roomId);

    res.json({
      ok: true,
      ...status,
    });
  } catch (error) {
    console.error('❌ Error checking reconciliation status:', error);
    res.status(500).json({
      ok: false,
      error: 'Failed to check reconciliation status',
      message: error.message,
    });
  }
});

router.get('/club/:clubId', authenticateToken, async (req, res) => {
  try {
    const { clubId } = req.params;
    const { approvedOnly, limit, offset } = req.query;

    if (req.user.club_id !== clubId) {
      return res.status(403).json({
        ok: false,
        error: "Not authorized to view this club's reconciliations",
      });
    }

    console.log(`📋 Fetching reconciliations for club: ${clubId}`);

    const options = {
      approvedOnly: approvedOnly === 'true',
      limit: limit ? parseInt(limit) : 50,
      offset: offset ? parseInt(offset) : 0,
    };

    const reconciliations = await getReconciliationsByClubId(clubId, options);

    console.log(`✅ Found ${reconciliations.length} reconciliations for club ${clubId}`);

    res.json({
      ok: true,
      reconciliations,
      count: reconciliations.length,
    });
  } catch (error) {
    console.error('❌ Error fetching club reconciliations:', error);
    res.status(500).json({
      ok: false,
      error: 'Failed to fetch reconciliations',
      message: error.message,
    });
  }
});

router.get('/club/:clubId/stats', authenticateToken, async (req, res) => {
  try {
    const { clubId } = req.params;

    if (req.user.club_id !== clubId) {
      return res.status(403).json({
        ok: false,
        error: "Not authorized to view this club's statistics",
      });
    }

    console.log(`📊 Fetching reconciliation stats for club: ${clubId}`);

    const stats = await getClubReconciliationStats(clubId);

    console.log(`✅ Retrieved stats for club ${clubId}`);

    res.json({
      ok: true,
      stats,
    });
  } catch (error) {
    console.error('❌ Error fetching club stats:', error);
    res.status(500).json({
      ok: false,
      error: 'Failed to fetch statistics',
      message: error.message,
    });
  }
});

router.post('/room/:roomId/approve', authenticateToken, async (req, res) => {
  try {
    const { roomId } = req.params;
    const payload = req.body;

    if (roomId !== payload.roomId) {
      return res.status(400).json({
        ok: false,
        error: 'Room ID mismatch',
      });
    }

    if (req.user.club_id !== payload.clubId) {
      return res.status(403).json({
        ok: false,
        error: 'Not authorized to approve reconciliation for this club',
      });
    }

    if (!payload.clubId || !payload.approvedBy || !payload.approvedAt) {
      return res.status(400).json({
        ok: false,
        error: 'Missing required fields: clubId, approvedBy, approvedAt',
      });
    }

    if (typeof payload.finalTotal !== 'number' || typeof payload.startingTotal !== 'number') {
      return res.status(400).json({
        ok: false,
        error: 'Invalid amount values',
      });
    }

    console.log(`📝 Saving reconciliation approval for room ${roomId}...`);

    const startingTotals = await calculateStartingTotalsFromLedger(roomId);

    console.log(`💰 Calculated starting totals from ledger:`, startingTotals);

    const result = await saveCompleteReconciliation({
      roomId: payload.roomId,
      clubId: payload.clubId,
      startingEntryFees: startingTotals.entryFees,
      startingExtras: startingTotals.extras,
      startingTotal: startingTotals.total,
      adjustmentsNet: payload.adjustmentsNet || 0,
      finalTotal: startingTotals.total + (payload.adjustmentsNet || 0),
      approvedBy: payload.approvedBy,
      approvedAt: payload.approvedAt,
      notes: payload.notes || null,
      adjustments: payload.adjustments || [],
    });

    console.log(`✅ Reconciliation saved successfully for room ${roomId}`);

    res.json({
      ok: true,
      message: 'Reconciliation saved successfully',
      data: {
        roomId: payload.roomId,
        reconciliationId: result.reconciliationId,
        adjustmentCount: result.adjustmentCount,
        finalTotal: payload.finalTotal,
        approvedAt: payload.approvedAt,
      },
    });
  } catch (error) {
    console.error('❌ Error saving reconciliation approval:', error);
    res.status(500).json({
      ok: false,
      error: 'Failed to save reconciliation',
      message: error.message,
    });
  }
});

router.patch('/room/:roomId/archive', authenticateToken, async (req, res) => {
  try {
    const { roomId } = req.params;
    const { archiveGeneratedAt, archiveSha256 } = req.body;

    console.log(`📦 Updating archive metadata for room ${roomId}...`);

    const updated = await updateArchiveMetadata(roomId, {
      archiveGeneratedAt,
      archiveSha256,
    });

    if (!updated) {
      return res.status(404).json({
        ok: false,
        error: 'Reconciliation not found',
      });
    }

    console.log(`✅ Archive metadata updated for room ${roomId}`);

    res.json({
      ok: true,
      message: 'Archive metadata updated successfully',
    });
  } catch (error) {
    console.error('❌ Error updating archive metadata:', error);
    res.status(500).json({
      ok: false,
      error: 'Failed to update archive metadata',
      message: error.message,
    });
  }
});

router.delete('/room/:roomId', authenticateToken, async (req, res) => {
  try {
    const { roomId } = req.params;

    console.log(`🗑️ Deleting reconciliation for room ${roomId}...`);

    const existing = await getReconciliationByRoomId(roomId);

    if (!existing) {
      return res.status(404).json({
        ok: false,
        error: 'Reconciliation not found',
      });
    }

    if (req.user.club_id !== existing.clubId) {
      return res.status(403).json({
        ok: false,
        error: 'Not authorized to delete this reconciliation',
      });
    }

    const deleted = await deleteReconciliation(roomId);

    if (!deleted) {
      return res.status(404).json({
        ok: false,
        error: 'Reconciliation not found',
      });
    }

    console.log(`✅ Reconciliation deleted for room ${roomId}`);

    res.json({
      ok: true,
      message: 'Reconciliation deleted successfully',
    });
  } catch (error) {
    console.error('❌ Error deleting reconciliation:', error);
    res.status(500).json({
      ok: false,
      error: 'Failed to delete reconciliation',
      message: error.message,
    });
  }
});

router.get('/room/:roomId/adjustments', async (req, res) => {
  try {
    const { roomId } = req.params;
    const { type } = req.query;

    if (!roomId) {
      return res.status(400).json({
        ok: false,
        error: 'roomId is required',
      });
    }

    console.log(`📋 Fetching adjustments for room: ${roomId}`);

    let adjustments;
    if (type) {
      adjustments = await getAdjustmentsByType(roomId, type);
      console.log(`✅ Found ${adjustments.length} ${type} adjustments`);
    } else {
      adjustments = await getAdjustmentsByRoomId(roomId);
      console.log(`✅ Found ${adjustments.length} total adjustments`);
    }

    res.json({
      ok: true,
      adjustments,
      count: adjustments.length,
    });
  } catch (error) {
    console.error('❌ Error fetching adjustments:', error);
    res.status(500).json({
      ok: false,
      error: 'Failed to fetch adjustments',
      message: error.message,
    });
  }
});

router.get('/room/:roomId/adjustments/totals', async (req, res) => {
  try {
    const { roomId } = req.params;

    if (!roomId) {
      return res.status(400).json({
        ok: false,
        error: 'roomId is required',
      });
    }

    console.log(`📊 Fetching adjustment totals for room: ${roomId}`);

    const totals = await getAdjustmentTotals(roomId);

    console.log(`✅ Retrieved adjustment totals for room ${roomId}`);

    res.json({
      ok: true,
      totals,
    });
  } catch (error) {
    console.error('❌ Error fetching adjustment totals:', error);
    res.status(500).json({
      ok: false,
      error: 'Failed to fetch adjustment totals',
      message: error.message,
    });
  }
});

router.get('/room/:roomId/export', authenticateToken, async (req, res) => {
  try {
    const { roomId } = req.params;

    if (!roomId) {
      return res.status(400).json({
        ok: false,
        error: 'roomId is required',
      });
    }

    console.log(`📥 Fetching export data for room: ${roomId}`);

    const exportData = await getReconciliationExportData(roomId);

    console.log(
      `✅ Retrieved export data with ${exportData.adjustments.length} adjustments and ${exportData.paymentLedger.length} payments`
    );

    res.json({
      ok: true,
      ...exportData,
      players: [],
      allRoundsStats: [],
    });
  } catch (error) {
    console.error('❌ Error fetching export data:', error);

    if (error.message.includes('not found')) {
      return res.status(404).json({
        ok: false,
        error: error.message,
      });
    }

    res.status(500).json({
      ok: false,
      error: 'Failed to fetch export data',
      message: error.message,
    });
  }
});

router.get('/room/:roomId/payment-ledger', async (req, res) => {
  try {
    const { roomId } = req.params;

    if (!roomId) {
      return res.status(400).json({
        ok: false,
        error: 'roomId is required',
      });
    }

    console.log(`📋 Fetching payment ledger for room: ${roomId}`);

    const paymentLedger = await getPaymentLedgerByRoomId(roomId);

    console.log(`✅ Found ${paymentLedger.length} payment entries`);

    res.json({
      ok: true,
      paymentLedger,
      count: paymentLedger.length,
    });
  } catch (error) {
    console.error('❌ Error fetching payment ledger:', error);
    res.status(500).json({
      ok: false,
      error: 'Failed to fetch payment ledger',
      message: error.message,
    });
  }
});

router.get('/room/:roomId/payment-ledger/totals', async (req, res) => {
  try {
    const { roomId } = req.params;

    if (!roomId) {
      return res.status(400).json({
        ok: false,
        error: 'roomId is required',
      });
    }

    console.log(`📊 Fetching payment ledger totals for room: ${roomId}`);

    const totals = await getPaymentLedgerTotals(roomId);

    console.log(`✅ Retrieved payment ledger totals`);

    res.json({
      ok: true,
      totals,
    });
  } catch (error) {
    console.error('❌ Error fetching payment ledger totals:', error);
    res.status(500).json({
      ok: false,
      error: 'Failed to fetch payment ledger totals',
      message: error.message,
    });
  }
});

export default router;