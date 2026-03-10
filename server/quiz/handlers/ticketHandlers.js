// server/quiz/handlers/ticketHandlers.js

import {  redeemTicket,
  getTicketByToken,
  getRoomSchedule,
  computeJoinWindow } from '../../mgtsystem/services/quizTicketService.js';
import { getQuizRoom } from '../quizRoomManager.js';

const DEBUG = true;

/**
 * Setup ticket-specific socket handlers
 */
export function setupTicketHandlers(socket, namespace) {
  
  /**
   * Validate ticket token before join
   * Returns ticket info if valid, error if not
   */
  socket.on('validate_ticket_token', async ({ joinToken }, callback) => {
    try {
      if (!joinToken) {
        return callback({ ok: false, error: 'Join token required' });
      }
      
      const ticket = await getTicketByToken(joinToken);
      
      if (!ticket) {
        return callback({ ok: false, error: 'Invalid ticket token' });
      }
      
      // Check redemption status
      if (ticket.redemption_status === 'redeemed') {
        return callback({ 
          ok: false, 
          error: 'Ticket already used' 
        });
      }
      
      if (ticket.redemption_status === 'blocked') {
        return callback({ 
          ok: false, 
          error: 'Payment not yet confirmed by host. Please wait for approval.' 
        });
      }
      
      if (ticket.redemption_status !== 'ready') {
        return callback({ 
          ok: false, 
          error: 'Ticket not ready for use' 
        });
      }

            // ✅ Join window gate
      const roomRow = await getRoomSchedule(ticket.room_id);
      if (!roomRow) {
        return callback({ ok: false, error: 'Room not found' });
      }

      const windowInfo = computeJoinWindow(roomRow);

      // Block if room completed/cancelled
      if (windowInfo.roomStatus === 'completed' || windowInfo.roomStatus === 'cancelled') {
        return callback({
          ok: false,
          error: `This quiz is ${windowInfo.roomStatus}.`,
          code: 'ROOM_NOT_JOINABLE',
        });
      }

      if (!windowInfo.canJoinNow) {
        return callback({
          ok: false,
          code: 'TOO_EARLY',
          error: 'You can join a few minutes before the quiz starts.',
          joinOpensAt: windowInfo.joinOpensAt ? windowInfo.joinOpensAt.toISOString() : null,
          scheduledAt: windowInfo.scheduledAt ? windowInfo.scheduledAt.toISOString() : null,
          roomStatus: windowInfo.roomStatus,
        });
      }

      
      // Return ticket info
      const extras = typeof ticket.extras === 'string' 
        ? JSON.parse(ticket.extras) 
        : ticket.extras || [];
      
      return callback({
        ok: true,
        ticket: {
          ticketId: ticket.ticket_id,
          roomId: ticket.room_id,
          playerName: ticket.player_name,
          entryFee: parseFloat(ticket.entry_fee),
          extras: extras.map(e => e.extraId),
          totalAmount: parseFloat(ticket.total_amount),
          currency: ticket.currency,
           roomStatus: windowInfo.roomStatus,
          scheduledAt: windowInfo.scheduledAt?.toISOString?.() || null,
          joinOpensAt: windowInfo.joinOpensAt?.toISOString?.() || null,
        },
      });
      
    } catch (err) {
      console.error('[Ticket Handlers] ❌ validate_ticket_token error:', err);
      return callback({ 
        ok: false, 
        error: 'Failed to validate ticket' 
      });
    }
  });
  
  /**
   * Redeem ticket and join room
   * This integrates with existing join_quiz_room flow
   */
  socket.on('redeem_ticket_and_join', async ({ joinToken, playerId }, callback) => {
  try {
    if (!joinToken || !playerId) {
      return callback({
        ok: false,
        error: 'Join token and player ID required',
      });
    }

    // 1) Load ticket (so we can gate BEFORE burning it)
    const ticket = await getTicketByToken(joinToken);

    if (!ticket) {
      return callback({ ok: false, error: 'Invalid ticket token' });
    }

    // 2) Validate ticket status (same logic as validate_ticket_token)
    if (ticket.redemption_status === 'redeemed') {
      return callback({ ok: false, error: 'Ticket already used' });
    }

    if (ticket.redemption_status === 'blocked') {
      return callback({
        ok: false,
        error: 'Payment not yet confirmed by host. Please wait for approval.',
      });
    }

    if (ticket.redemption_status !== 'ready' || ticket.payment_status !== 'payment_confirmed') {
      return callback({ ok: false, error: 'Ticket not ready for use' });
    }

    // 3) Join window gate (scheduled_at - 10 mins) OR status live
    const roomRow = await getRoomSchedule(ticket.room_id);
    if (!roomRow) {
      return callback({ ok: false, error: 'Room not found' });
    }

    const windowInfo = computeJoinWindow(roomRow);

    // Block truly not-joinable rooms
    if (windowInfo.roomStatus === 'completed' || windowInfo.roomStatus === 'cancelled') {
      return callback({
        ok: false,
        code: 'ROOM_NOT_JOINABLE',
        error: `This quiz is ${windowInfo.roomStatus}.`,
      });
    }

    if (!windowInfo.canJoinNow) {
      return callback({
        ok: false,
        code: 'TOO_EARLY',
        error: 'You can join a few minutes before the quiz starts.',
        scheduledAt: windowInfo.scheduledAt ? windowInfo.scheduledAt.toISOString() : null,
        joinOpensAt: windowInfo.joinOpensAt ? windowInfo.joinOpensAt.toISOString() : null,
        roomStatus: windowInfo.roomStatus,
      });
    }

    // 4) ✅ Now it’s safe: redeem ticket (this burns it)
    const ticketData = await redeemTicket({ joinToken, playerId });

    if (DEBUG) {
      console.log('[Ticket Handlers] ✅ Ticket redeemed:', {
        ticketId: ticketData.ticketId,
        playerId,
        playerName: ticketData.playerName,
      });
    }

    // 5) ✅ Allow join even if host hasn't opened room yet
    // (Do NOT block on getQuizRoom / memory state here)

    return callback({
      ok: true,
      roomId: ticketData.roomId,
      playerData: {
        id: playerId,
        name: ticketData.playerName,
        paid: true,
        paymentMethod: ticketData.paymentMethod,
        paymentClaimed: true,
        paymentConfirmedBy: 'ticket_system',
        credits: 0,
        extras: ticketData.extras,
        extraPayments: ticketData.extraPayments,
      },
    });
  } catch (err) {
    console.error('[Ticket Handlers] ❌ redeem_ticket_and_join error:', err);
    return callback({
      ok: false,
      error: err.message || 'Failed to redeem ticket',
    });
  }
});
  
}