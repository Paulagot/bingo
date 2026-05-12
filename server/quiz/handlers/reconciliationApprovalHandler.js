// server/quiz/handlers/reconciliationApprovalHandler.js

import { getQuizRoom } from '../quizRoomManager.js';
import {
  saveCompleteReconciliation,
  calculateStartingTotalsFromLedger,
  getBlockingClaimedPaymentsForRoom,
} from '../../mgtsystem/services/quizReconciliationService.js';

/**
 * Setup socket handlers for reconciliation approval.
 * Used by both admins (no auth token) and hosts via socket.
 */
export function setupReconciliationApprovalHandlers(socket, quizNamespace) {

  /**
   * approve_reconciliation
   *
   * Payload: {
   *   roomId:       string,
   *   approvedBy:   string,   // name
   *   approvedById: string,   // member ID
   *   approvedAt:   string,   // ISO timestamp
   *   notes:        string | null
   * }
   */
  socket.on('approve_reconciliation', async (payload, callback) => {
    try {
      const { roomId, approvedBy, approvedById, approvedAt, notes } = payload;

      console.log(`📝 [Socket] Reconciliation approval for room ${roomId} by ${approvedBy}`);

      // ── Validate ────────────────────────────────────────────────────────────
      if (!roomId || !approvedBy || !approvedById || !approvedAt) {
        const error = 'Missing required fields: roomId, approvedBy, approvedById, approvedAt';
        console.error(`❌ [Socket] Validation failed:`, error);
        if (callback) callback({ ok: false, error });
        return;
      }

      // ── Get live room ────────────────────────────────────────────────────────
      const room = getQuizRoom(roomId);
      if (!room?.config) {
        const error = 'Quiz room not found or not configured';
        console.error(`❌ [Socket] ${error}`);
        if (callback) callback({ ok: false, error });
        return;
      }

      const config = room.config;
      const clubId = config.clubId;

      if (!clubId) {
        const error = 'Club ID not found in quiz configuration';
        console.error(`❌ [Socket] ${error}`);
        if (callback) callback({ ok: false, error });
        return;
      }

      // ── Authorise ────────────────────────────────────────────────────────────
      const isHost  = approvedById === config.hostId;
      const isAdmin = config.admins?.some(admin => admin.id === approvedById);

      if (!isHost && !isAdmin) {
        const error = 'Not authorized to approve reconciliation';
        console.error(`❌ [Socket] Unauthorized attempt by ${approvedById}`);
        if (callback) callback({ ok: false, error });
        return;
      }

      console.log(`✅ [Socket] Authorized: ${isHost ? 'Host' : 'Admin'} ${approvedBy} (${approvedById})`);

      // ── Block on unresolved claimed payments ─────────────────────────────────
      const blockingClaimedPayments = await getBlockingClaimedPaymentsForRoom(roomId);
      if (blockingClaimedPayments.length > 0) {
        const count = blockingClaimedPayments.length;
        const error =
          `${count} claimed payment${count === 1 ? '' : 's'} still need confirmation or ` +
          `dispute before reconciliation can be approved.`;

        console.warn('⚠️ [Socket] Approval blocked:', { roomId, count, payments: blockingClaimedPayments });
        if (callback) callback({ ok: false, error, code: 'CLAIMED_PAYMENTS_UNRESOLVED', blockingPayments: blockingClaimedPayments });
        return;
      }

      // ── Calculate totals from DB ─────────────────────────────────────────────
      const startingTotals = await calculateStartingTotalsFromLedger(roomId);
      console.log(`💰 [Socket] Starting totals from ledger:`, startingTotals);

      // ── Pull reconciliation data from live room config ───────────────────────
      const adjustments = config.reconciliation?.ledger || [];

      // NEW — read the two missing pieces directly from the live room config
      const finalLeaderboard = config.reconciliation?.finalLeaderboard ?? null;
      const prizeAwards      = config.reconciliation?.prizeAwards      ?? null;

      if (!finalLeaderboard || finalLeaderboard.length === 0) {
        console.warn('⚠️ [Socket] No finalLeaderboard found in room config — leaderboard will be empty in report');
      }
      if (!prizeAwards || prizeAwards.length === 0) {
        console.warn('⚠️ [Socket] No prizeAwards found in room config — prizes will be empty in report');
      }

      // ── Compute adjustments net ──────────────────────────────────────────────
      const adjustmentsNet = adjustments.reduce((sum, adj) => {
        const amt = Number(adj.amount || 0);
        if (
          adj.type === 'received' ||
          (adj.type === 'cash_over_short' && adj.reasonCode === 'cash_over')
        ) {
          return sum + amt;
        }
        return sum - amt;
      }, 0);

      console.log(`📊 [Socket] adjustmentsNet: ${adjustmentsNet}`);

      // ── Save to DB ───────────────────────────────────────────────────────────
      const reconciliationData = {
        roomId,
        clubId,
        startingEntryFees: startingTotals.entryFees,
        startingExtras:    startingTotals.extras,
        startingTotal:     startingTotals.total,
        adjustmentsNet,
        finalTotal:        startingTotals.total + adjustmentsNet,
        approvedBy,
        approvedById,   // ← member ID for ledger stamp
        approvedAt,
        notes: notes || null,
        finalLeaderboard,
        prizeAwards,
        // ─────────────────────────────────────────────────────────────────────
        adjustments: adjustments.map(adj => ({
          ts:         adj.ts,
          type:       adj.type,
          amount:     adj.amount,
          currency:   adj.currency  || 'EUR',
          method:     adj.method    || null,
          reasonCode: adj.reasonCode || null,
          payerId:    adj.payerId   || null,
          note:       adj.note      || null,
          createdBy:  adj.createdBy,
          meta:       adj.meta      || null,
        })),
      };

      console.log(`💾 [Socket] Saving reconciliation approval…`);
      const result = await saveCompleteReconciliation(reconciliationData);
      console.log(`✅ [Socket] Reconciliation saved for room ${roomId}`);

      // ── Update live config and broadcast ────────────────────────────────────
      if (room.config.reconciliation) {
        room.config.reconciliation.approvedBy   = approvedBy;
        room.config.reconciliation.approvedAt   = approvedAt;
        room.config.reconciliation.approvedById = approvedById;
        room.config.reconciliation.notes        = notes;
      }

      quizNamespace.to(roomId).emit('room_config', { config: room.config });
      console.log(`📢 [Socket] Broadcasted updated config to room ${roomId}`);

      if (callback) callback({
        ok: true,
        message: 'Reconciliation approved successfully',
        data: {
          roomId,
          reconciliationId: result.reconciliationId,
          adjustmentCount:  result.adjustmentCount,
          finalTotal:       reconciliationData.finalTotal,
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