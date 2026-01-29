// Payment Handlers - Separate from player handlers
import { 
  createExpectedPayment,
  claimPayment, 
  confirmPayment, 
  getPlayerLedger 
} from '../../mgtsystem/services/quizPaymentLedgerService.js';
import { getQuizRoom } from '../quizRoomManager.js';
import { normalizePaymentMethod } from '../../utils/paymentMethods.js';

const debug = true;

/**
 * Setup payment-specific socket handlers
 */
export function setupPaymentHandlers(socket, namespace) {


  /**
   * Admin confirms payment (manual approval)
   */
  socket.on('confirm_player_payment', async ({ roomId, playerId, adminId, adminNotes }) => {
    if (debug) console.log(`[Payment] ✅ confirm_player_payment`, { roomId, playerId, adminId });
    
    try {
      const room = getQuizRoom(roomId);
      if (!room) {
        socket.emit('quiz_error', { message: 'Room not found' });
        return;
      }
      
      // Verify requester is host/admin
      const isHost = room.hostId === adminId || room.hostSocketId === socket.id;
      const isAdmin = room.admins.some(a => a.id === adminId);
      
      if (!isHost && !isAdmin) {
        socket.emit('quiz_error', { message: 'Only host/admin can confirm payments' });
        return;
      }
      
      // Update ledger
      const success = await confirmPayment({
        roomId,
        playerId,
        confirmedBy: adminId,
        adminNotes,
      });
      
      if (!success) {
        socket.emit('quiz_error', { message: 'No pending payment found to confirm' });
        return;
      }
      
      // Update in-memory player
      const player = room.players.find(p => p.id === playerId);
      if (player) {
        player.paid = true;
        player.paymentConfirmedBy = adminId;
        player.paymentConfirmedAt = new Date().toISOString();
      }
      
      // Broadcast updated player list
const playersLite = room.players.map(p => ({
  id: p.id,
  name: p.name,
  paid: !!p.paid,
  paymentClaimed: !!p.paymentClaimed,
  paymentReference: p.paymentReference || null,      // ✅ ADD
  clubPaymentMethodId: p.clubPaymentMethodId || null, // ✅ ADD
  paymentConfirmedBy: p.paymentConfirmedBy,
  paymentMethod: p.paymentMethod,
  extras: p.extras || [],
  extraPayments: p.extraPayments || {},              // ✅ ADD (good to have)
  disqualified: !!p.disqualified,
}));
      
      namespace.to(roomId).emit('player_list_updated', { players: playersLite });
      
      // Notify player
      const playerSocket = namespace.sockets.get(player?.socketId);
      if (playerSocket) {
        playerSocket.emit('payment_confirmed', {
          message: 'Your payment has been confirmed by the host!',
        });
      }
      
      if (debug) {
        console.log(`[Payment] ✅ Payment confirmed for ${playerId} by ${adminId}`);
      }
    } catch (err) {
      console.error(`[Payment] ❌ confirm_player_payment error:`, err);
      socket.emit('quiz_error', { message: 'Failed to confirm payment' });
    }
  });

  /**
   * Get payment ledger for a player (for admin view)
   */
  socket.on('get_player_ledger', async ({ roomId, playerId }, callback) => {
    try {
      const ledger = await getPlayerLedger(roomId, playerId);
      
      if (typeof callback === 'function') {
        callback({ ok: true, ledger });
      } else {
        socket.emit('player_ledger_result', { playerId, ledger });
      }
    } catch (err) {
      console.error(`[Payment] ❌ get_player_ledger error:`, err);
      if (typeof callback === 'function') {
        callback({ ok: false, error: err.message });
      }
    }
  });
}