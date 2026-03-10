// server/quiz/handlers/reconciliationApprovalHandler.js

import { getQuizRoom } from '../quizRoomManager.js';
import { saveCompleteReconciliation, calculateStartingTotalsFromLedger } from '../../mgtsystem/services/quizReconciliationService.js';

/**
 * Setup socket handlers for reconciliation approval
 * Allows admins (who don't have auth tokens) to approve reconciliations via socket
 */
export function setupReconciliationApprovalHandlers(socket, quizNamespace) {
  
  /**
   * approve_reconciliation - Socket event for admin/host to approve reconciliation
   * 
   * Payload: {
   *   roomId: string,
   *   approvedBy: string,      // admin/host name
   *   approvedById: string,    // admin/host member ID
   *   approvedAt: string,      // ISO timestamp
   *   notes: string | null
   * }
   */
  socket.on('approve_reconciliation', async (payload, callback) => {
    try {
      const { roomId, approvedBy, approvedById, approvedAt, notes } = payload;

      console.log(`📝 [Socket] Reconciliation approval request for room ${roomId} by ${approvedBy}`);

      // Validate required fields
      if (!roomId || !approvedBy || !approvedById || !approvedAt) {
        const error = 'Missing required fields: roomId, approvedBy, approvedById, approvedAt';
        console.error(`❌ [Socket] Approval validation failed:`, error);
        if (callback) callback({ ok: false, error });
        return;
      }

      // Get the quiz room to verify it exists and get config
      const room = getQuizRoom(roomId);
      if (!room || !room.config) {
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

      // Verify the approver is authorized (admin or host)
      const isHost = approvedById === config.hostId;
      const isAdmin = config.admins?.some((admin) => admin.id === approvedById);

      if (!isHost && !isAdmin) {
        const error = 'Not authorized to approve reconciliation';
        console.error(`❌ [Socket] Unauthorized approval attempt by ${approvedById}`);
        if (callback) callback({ ok: false, error });
        return;
      }

      console.log(`✅ [Socket] Authorized: ${isHost ? 'Host' : 'Admin'} ${approvedBy} (${approvedById})`);

      // Calculate starting totals from ledger
      const startingTotals = await calculateStartingTotalsFromLedger(roomId);
      console.log(`💰 [Socket] Calculated starting totals from ledger:`, startingTotals);

      // Get adjustments from config
      const adjustments = config.reconciliation?.ledger || [];
      
      // Calculate adjustments net
      const adjustmentsNet = adjustments.reduce((sum, adj) => {
        if (adj.type === 'received' || (adj.type === 'cash_over_short' && adj.reasonCode === 'cash_over')) {
          return sum + Number(adj.amount);
        } else {
          return sum - Number(adj.amount);
        }
      }, 0);

      console.log(`📊 [Socket] Adjustments net: ${adjustmentsNet}`);

      // Prepare reconciliation data
      const reconciliationData = {
        roomId,
        clubId,
        startingEntryFees: startingTotals.entryFees,
        startingExtras: startingTotals.extras,
        startingTotal: startingTotals.total,
        adjustmentsNet,
        finalTotal: startingTotals.total + adjustmentsNet,
        approvedBy,
        approvedAt,
        notes: notes || null,
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

      console.log(`💾 [Socket] Saving reconciliation approval...`);

      // Save to database
      const result = await saveCompleteReconciliation(reconciliationData);

      console.log(`✅ [Socket] Reconciliation saved successfully for room ${roomId}`);

      // Update the room config with approval metadata
      if (room.config.reconciliation) {
        room.config.reconciliation.approvedBy = approvedBy;
        room.config.reconciliation.approvedAt = approvedAt;
        room.config.reconciliation.approvedById = approvedById;
        room.config.reconciliation.notes = notes;
      }

      // Broadcast the updated config to all clients in the room
      quizNamespace.to(roomId).emit('room_config', {
        config: room.config,
      });

      console.log(`📢 [Socket] Broadcasted updated config to room ${roomId}`);

      // Send success response
      const response = {
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
      };

      if (callback) callback(response);

    } catch (error) {
      console.error('❌ [Socket] Error approving reconciliation:', error);
      const errorResponse = {
        ok: false,
        error: 'Failed to approve reconciliation',
        message: error.message,
      };
      if (callback) callback(errorResponse);
    }
  });
}