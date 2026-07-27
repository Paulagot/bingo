// server/quiz/handlers/reconciliationApprovalHandler.js

import { getQuizRoom } from '../quizRoomManager.js';
import {
  saveCompleteReconciliation,
  calculateStartingTotalsFromLedger,
  getBlockingClaimedPaymentsForRoom,
} from '../../mgtsystem/services/quizReconciliationService.js';
import { computeAdjustmentsNet } from '../../shared/adjustmentClassifier.js';

export function setupReconciliationApprovalHandlers(socket, quizNamespace) {
  socket.on('approve_reconciliation', async (payload, callback) => {
    try {
      const { roomId, approvedBy, approvedById, approvedAt, notes } = payload;

      console.log(`📝 [Socket] Reconciliation approval for room ${roomId} by ${approvedBy}`);

      if (!roomId || !approvedBy || !approvedById || !approvedAt) {
        const error = 'Missing required fields: roomId, approvedBy, approvedById, approvedAt';
        if (callback) callback({ ok: false, error });
        return;
      }

      const room = getQuizRoom(roomId);
      if (!room?.config) {
        const error = 'Quiz room not found or not configured';
        if (callback) callback({ ok: false, error });
        return;
      }

      const config = room.config;
      const clubId = config.clubId;
      if (!clubId) {
        const error = 'Club ID not found in quiz configuration';
        if (callback) callback({ ok: false, error });
        return;
      }

      const isHost = approvedById === config.hostId;
      const isAdmin = config.admins?.some(admin => admin.id === approvedById);
      if (!isHost && !isAdmin) {
        const error = 'Not authorized to approve reconciliation';
        if (callback) callback({ ok: false, error });
        return;
      }

      const blockingClaimedPayments = await getBlockingClaimedPaymentsForRoom(roomId);
      if (blockingClaimedPayments.length > 0) {
        const count = blockingClaimedPayments.length;
        const error = `${count} claimed payment${count === 1 ? '' : 's'} still need confirmation or dispute before reconciliation can be approved.`;
        if (callback) callback({ ok: false, error, code: 'CLAIMED_PAYMENTS_UNRESOLVED', blockingPayments: blockingClaimedPayments });
        return;
      }

      const startingTotals = await calculateStartingTotalsFromLedger(roomId);
      const adjustments = config.reconciliation?.ledger || [];
      const finalLeaderboard = config.reconciliation?.finalLeaderboard ?? null;
      const prizeAwards = config.reconciliation?.prizeAwards ?? null;

      const classified = computeAdjustmentsNet(adjustments);
      if (classified.unclassified.length > 0) {
        const error = `${classified.unclassified.length} reconciliation adjustment(s) could not be classified. Correct their type/reason before approval.`;
        console.warn('[Socket] Approval blocked by unclassified adjustments:', classified.unclassified);
        if (callback) callback({ ok: false, error, code: 'UNCLASSIFIED_ADJUSTMENTS', adjustments: classified.unclassified });
        return;
      }
      const adjustmentsNet = classified.net;

      const reconciliationData = {
        roomId,
        clubId,
        startingEntryFees: startingTotals.entryFees,
        startingExtras: startingTotals.extras,
        startingTotal: startingTotals.total,
        adjustmentsNet,
        finalTotal: startingTotals.total + adjustmentsNet,
        approvedBy,
        approvedById,
        approvedAt,
        notes: notes || null,
        finalLeaderboard,
        prizeAwards,
        adjustments: adjustments.map(adj => ({
          ts: adj.ts,
          type: adj.type,
          amount: adj.amount,
          currency: adj.currency || 'EUR',
          method: adj.method || null,
          reasonCode: adj.reasonCode || null,
          payerId: adj.payerId || null,
          note: adj.note || null,
          createdBy: adj.createdBy,
          meta: adj.meta || null,
        })),
      };

      const result = await saveCompleteReconciliation(reconciliationData);

      if (room.config.reconciliation) {
        room.config.reconciliation.approvedBy = approvedBy;
        room.config.reconciliation.approvedAt = approvedAt;
        room.config.reconciliation.approvedById = approvedById;
        room.config.reconciliation.notes = notes;
      }

      quizNamespace.to(roomId).emit('room_config', { config: room.config });
      if (callback) callback({
        ok: true,
        message: 'Reconciliation approved successfully',
        data: {
          roomId,
          reconciliationId: result.reconciliationId,
          adjustmentCount: result.adjustmentCount,
          finalTotal: reconciliationData.finalTotal,
          approvedAt,
          approvedBy,
        },
      });
    } catch (error) {
      console.error('❌ [Socket] Error approving reconciliation:', error);
      if (callback) callback({ ok: false, error: 'Failed to approve reconciliation', message: error.message });
    }
  });
}
