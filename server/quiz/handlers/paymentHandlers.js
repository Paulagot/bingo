// server/quiz/handlers/paymentHandlers.js
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
    const adminId = payload?.adminId ?? payload?.confirmedBy ?? null;

    if (debug) {
      console.log(`[Payment] ✅ confirm_player_payment`, {
        roomId,
        playerId,
        adminId,
        socketId: socket.id,
      });
    }

    const room = getQuizRoom(roomId);
    if (!room) {
      socket.emit('quiz_error', { message: 'Room not found' });
      return;
    }

    try {
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

      // ✅ Find confirmer from socket context
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

        player.paid = !hasUnconfirmed;
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

  // ═══════════════════════════════════════════════════════════════
  // ✅ NEW: TICKET MANAGEMENT HANDLERS (Socket-based, no auth needed)
  // ═══════════════════════════════════════════════════════════════

  /**
   * Get all tickets for a room (socket-based)
   * Used by in-game admins who don't have auth tokens
   */
  socket.on('get_room_tickets', async ({ roomId }, ack) => {
    const sendAck = typeof ack === 'function' ? ack : () => {};
    
    try {
      if (!roomId) {
        return sendAck({ ok: false, error: 'roomId required' });
      }

      const room = getQuizRoom(roomId);
      if (!room) {
        return sendAck({ ok: false, error: 'Room not found' });
      }

      // ✅ Verify caller is host or admin
      const isHost = room.hostSocketId === socket.id;
      const isAdmin = Array.isArray(room.admins) 
        ? room.admins.some(a => a?.socketId === socket.id)
        : false;
      
      if (!isHost && !isAdmin) {
        if (debug) {
          console.log('[Tickets] ❌ Unauthorized access attempt:', {
            socketId: socket.id,
            roomHostSocketId: room.hostSocketId,
            isHost,
            isAdmin,
          });
        }
        return sendAck({ ok: false, error: 'Unauthorized - must be host or admin' });
      }

      // ✅ Import ticket service
      const { getRoomTickets } = await import('../../mgtsystem/services/quizTicketService.js');
      
      const tickets = await getRoomTickets(roomId);
      
      // Format for frontend
      const formatted = tickets.map(t => {
        const extras = typeof t.extras === 'string' 
          ? JSON.parse(t.extras) 
          : t.extras || [];
        
        return {
          ticketId: t.ticket_id,
          purchaserName: t.purchaser_name,
          purchaserEmail: t.purchaser_email,
          purchaserPhone: t.purchaser_phone,
          playerName: t.player_name,
          entryFee: parseFloat(t.entry_fee),
          extrasTotal: parseFloat(t.extras_total),
          totalAmount: parseFloat(t.total_amount),
          currency: t.currency,
          extras,
          paymentStatus: t.payment_status,
          redemptionStatus: t.redemption_status,
          paymentMethod: t.payment_method,
          paymentReference: t.payment_reference,
          clubPaymentMethodId: t.club_payment_method_id,
          purchasedAt: t.purchased_at,
          confirmedAt: t.confirmed_at,
          confirmedBy: t.confirmed_by,
          redeemedAt: t.redeemed_at,
          redeemedByPlayerId: t.redeemed_by_player_id,
        };
      });
      
      if (debug) {
        console.log('[Tickets] ✅ Retrieved tickets:', {
          roomId,
          count: formatted.length,
          caller: isHost ? 'host' : 'admin',
        });
      }
      
      return sendAck({ ok: true, tickets: formatted });
      
    } catch (err) {
      console.error('[Tickets] ❌ get_room_tickets error:', err);
      return sendAck({ ok: false, error: 'Failed to get tickets' });
    }
  });

  /**
   * Confirm ticket payment (socket-based)
   * Used by in-game admins who don't have auth tokens
   */
  socket.on('confirm_ticket_payment', async ({ roomId, ticketId, adminNotes }, ack) => {
    const sendAck = typeof ack === 'function' ? ack : () => {};
    
    try {
      if (!roomId || !ticketId) {
        return sendAck({ ok: false, error: 'roomId and ticketId required' });
      }

      const room = getQuizRoom(roomId);
      if (!room) {
        return sendAck({ ok: false, error: 'Room not found' });
      }

      // ✅ Reuse the same confirmer identity logic
      const isHostSocket = room.hostSocketId === socket.id;

      const adminFromSocket = Array.isArray(room.admins)
        ? room.admins.find(a => a?.socketId && a.socketId === socket.id)
        : null;

      const hostIdentity = isHostSocket
        ? {
            id: room.hostId || room.createdBy || null,
            name: room.hostName || room.config?.hostName || 'Host',
            role: 'host',
          }
        : null;

      const adminIdentity = adminFromSocket
        ? { id: adminFromSocket.id, name: adminFromSocket.name || 'Admin', role: 'admin' }
        : null;

      const confirmer = hostIdentity || adminIdentity;

      if (debug) {
        console.log('[Tickets] 🔎 Confirmer identity:', confirmer);
      }

      if (!confirmer?.id || !['host', 'admin'].includes(confirmer.role)) {
        return sendAck({ ok: false, error: 'Unauthorized - must be host or admin' });
      }

      // ✅ Import ticket service
      const { confirmTicketPayment } = await import('../../mgtsystem/services/quizTicketService.js');
      
      await confirmTicketPayment({
        ticketId,
        confirmedBy: confirmer.id,
        confirmedByName: confirmer.name,
        confirmedByRole: confirmer.role,
        adminNotes: adminNotes || `Confirmed by ${confirmer.name}`,
      });
      
      if (debug) {
        console.log('[Tickets] ✅ Payment confirmed:', {
          ticketId,
          confirmedBy: confirmer.name,
          role: confirmer.role,
        });
      }
      
      // ✅ Broadcast update to all admins/host in room
      namespace.to(roomId).emit('ticket_payment_confirmed', {
        ticketId,
        confirmedBy: confirmer.name,
        confirmedAt: new Date().toISOString(),
      });
      
      return sendAck({ ok: true, message: 'Payment confirmed' });
      
    } catch (err) {
      console.error('[Tickets] ❌ confirm_ticket_payment error:', err);
      return sendAck({ ok: false, error: err.message || 'Failed to confirm payment' });
    }
  });
}
