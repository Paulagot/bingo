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
  socket.on('confirm_player_payment', async (payload) => {
    const { roomId, playerId, adminNotes } = payload || {};
    const adminId = payload?.adminId ?? payload?.confirmedBy ?? null; // ✅ accept both

    if (debug) {
      console.log(`[Payment] ✅ confirm_player_payment`, {
        roomId,
        playerId,
        adminId,
        socketId: socket.id,
      });
    }

    // ✅ define room OUTSIDE try so it’s in scope everywhere
    const room = getQuizRoom(roomId);
    if (!room) {
      socket.emit('quiz_error', { message: 'Room not found' });
      return;
    }

    try {
      // ✅ useful identity debug (room exists here)
      if (debug) {
        console.log('[Payment] 🔎 identity check', {
          socketId: socket.id,
          roomHostSocketId: room.hostSocketId,
          roomHostId: room.hostId,
          admins: (room.admins || []).map(a => ({ id: a.id, name: a.name, socketId: a.socketId })),
          payloadKeys: Object.keys(payload || {}),
          payloadAdminId: payload?.adminId,
          payloadConfirmedBy: payload?.confirmedBy,
        });
      }

      // ✅ Find confirmer from socket context first
      const isHostSocket = room.hostSocketId === socket.id;

      const adminFromSocket = Array.isArray(room.admins)
        ? room.admins.find(a => a?.socketId && a.socketId === socket.id)
        : null;

      const hostIdentity = isHostSocket
        ? {
            id: room.hostId || room.createdBy || adminId || null,
            name: room.hostName || room.config?.hostName || 'Host',
            role: 'host',
          }
        : null;

      const adminIdentity = adminFromSocket
        ? { id: adminFromSocket.id, name: adminFromSocket.name || 'Admin', role: 'admin' }
        : null;

      const legacyIdentity =
        !hostIdentity && !adminIdentity && adminId
          ? { id: adminId, name: 'Admin', role: 'admin' }
          : null;

      const confirmer = hostIdentity || adminIdentity || legacyIdentity;

      if (debug) console.log('[Payment] ✅ resolved confirmer', confirmer);

      if (!confirmer?.id || !['host', 'admin'].includes(confirmer.role)) {
        socket.emit('quiz_error', { message: 'Only host/admin can confirm payments' });
        return;
      }

      // ✅ Update ledger
      const res = await confirmPayment({
        roomId,
        playerId,
        confirmedBy: confirmer.id,
        confirmedByName: confirmer.name,
        confirmedByRole: confirmer.role,
        adminNotes,
      });

   if (!res?.ok) {
  socket.emit('quiz_error', { message: 'No payment found to confirm' });
  return;
}

if (debug) console.log('[Payment] ✅ Ledger rows confirmed:', res.updated);

      // ✅ Update in-memory player
    const player = room.players.find(p => p.id === playerId);
if (player) {
  // ✅ Re-check ledger after confirmation
  const ledger = await getPlayerLedger(roomId, playerId);
  const hasUnconfirmed = ledger.some(
    r => r.status === 'expected' || r.status === 'claimed'
  );

  player.paid = !hasUnconfirmed; // ✅ only true if ALL rows confirmed
  player.paymentConfirmedBy = confirmer.id;
  player.paymentConfirmedByName = confirmer.name;
  player.paymentConfirmedRole = confirmer.role;
  player.paymentConfirmedAt = new Date().toISOString();

  if (debug) {
    console.log('[Payment] 🔎 Ledger status after confirm:', ledger.map(r => ({
      id: r.id,
      type: r.ledger_type,
      extra: r.extra_id,
      status: r.status,
    })));
  }
}


      const playersLite = room.players.map(p => ({
        id: p.id,
        name: p.name,
        paid: !!p.paid,
        paymentClaimed: !!p.paymentClaimed,
        paymentReference: p.paymentReference || null,
        clubPaymentMethodId: p.clubPaymentMethodId || null,
        paymentConfirmedBy: p.paymentConfirmedBy || null,
        paymentConfirmedByName: p.paymentConfirmedByName || null,
        paymentConfirmedRole: p.paymentConfirmedRole || null,
        paymentMethod: p.paymentMethod || null,
        extras: p.extras || [],
        extraPayments: p.extraPayments || {},
        disqualified: !!p.disqualified,
      }));

      namespace.to(roomId).emit('player_list_updated', { players: playersLite });

      // Notify player
      const playerSocket = namespace.sockets.get(player?.socketId);
      if (playerSocket) {
        playerSocket.emit('payment_confirmed', { message: 'Your payment has been confirmed!' });
      }

      if (debug) console.log(`[Payment] ✅ Payment confirmed`, { roomId, playerId, confirmer });
    } catch (err) {
      console.error(`[Payment] ❌ confirm_player_payment error:`, err);
      socket.emit('quiz_error', { message: 'Failed to confirm payment' });
    }
  });

  socket.on('get_player_ledger', async ({ roomId, playerId }, callback) => {
    try {
      const ledger = await getPlayerLedger(roomId, playerId);
      if (typeof callback === 'function') callback({ ok: true, ledger });
      else socket.emit('player_ledger_result', { playerId, ledger });
    } catch (err) {
      console.error(`[Payment] ❌ get_player_ledger error:`, err);
      if (typeof callback === 'function') callback({ ok: false, error: err.message });
    }
  });
}
