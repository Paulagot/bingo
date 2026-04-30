// server/quiz/handlers/ticketHandlers.js

import {
  redeemTicket,
  getTicketByToken,
  getRoomSchedule,
  computeJoinWindow,
} from '../../mgtsystem/services/quizTicketService.js';

const DEBUG = false;

function parseJsonMaybe(value, fallback = []) {
  if (!value) return fallback;
  if (typeof value === 'object') return value;

  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function toMoneyNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function normaliseExtrasForClient(rawExtras) {
  const extras = Array.isArray(rawExtras) ? rawExtras : [];

  return extras
    .map((extra) => {
      if (typeof extra === 'string') return extra;
      return extra?.extraId;
    })
    .filter(Boolean);
}

/**
 * Setup ticket-specific socket handlers
 */
export function setupTicketHandlers(socket, namespace) {
  /**
   * Validate ticket token before join.
   * Returns ticket info if valid.
   */
  socket.on('validate_ticket_token', async ({ joinToken }, callback) => {
    const sendCallback = typeof callback === 'function' ? callback : () => {};

    try {
      if (!joinToken) {
        return sendCallback({ ok: false, error: 'Join token required' });
      }

      const ticket = await getTicketByToken(joinToken);

      if (!ticket) {
        return sendCallback({ ok: false, error: 'Invalid ticket token' });
      }

      if (ticket.redemption_status === 'redeemed') {
        return sendCallback({
          ok: false,
          error: 'Ticket already used',
        });
      }

      if (ticket.redemption_status === 'blocked') {
        return sendCallback({
          ok: false,
          error: 'Payment not yet confirmed by host. Please wait for approval.',
        });
      }

      if (ticket.redemption_status !== 'ready') {
        return sendCallback({
          ok: false,
          error: 'Ticket not ready for use',
        });
      }

      const roomRow = await getRoomSchedule(ticket.room_id);

      if (!roomRow) {
        return sendCallback({ ok: false, error: 'Room not found' });
      }

      const windowInfo = computeJoinWindow(roomRow);

      if (
        windowInfo.roomStatus === 'completed' ||
        windowInfo.roomStatus === 'cancelled'
      ) {
        return sendCallback({
          ok: false,
          error: `This quiz is ${windowInfo.roomStatus}.`,
          code: 'ROOM_NOT_JOINABLE',
        });
      }

      if (!windowInfo.canJoinNow) {
        return sendCallback({
          ok: false,
          code: 'TOO_EARLY',
          error: 'You can join a few minutes before the quiz starts.',
          joinOpensAt: windowInfo.joinOpensAt
            ? windowInfo.joinOpensAt.toISOString()
            : null,
          scheduledAt: windowInfo.scheduledAt
            ? windowInfo.scheduledAt.toISOString()
            : null,
          roomStatus: windowInfo.roomStatus,
        });
      }

      const extras = parseJsonMaybe(ticket.extras, []);

      const entryFee = toMoneyNumber(ticket.entry_fee, 0);
      const extrasTotal = toMoneyNumber(ticket.extras_total, 0);
      const totalAmount = toMoneyNumber(
        ticket.total_amount,
        entryFee + extrasTotal
      );

      if (DEBUG) {
        console.log('[Ticket Handlers] 🎟️ Ticket token validated:', {
          ticketId: ticket.ticket_id,
          roomId: ticket.room_id,
          playerName: ticket.player_name,
          paymentMethod: ticket.payment_method,
          entryFee,
          extrasTotal,
          totalAmount,
          currency: ticket.currency,
          paymentReference: ticket.payment_reference,
          clubPaymentMethodId: ticket.club_payment_method_id,
          externalTransactionId: ticket.external_transaction_id,
          extras,
        });
      }

      return sendCallback({
        ok: true,
        ticket: {
          ticketId: ticket.ticket_id,
          roomId: ticket.room_id,
          playerName: ticket.player_name,

          entryFee,
          extrasTotal,
          totalAmount,

          /**
           * This is used by the frontend display.
           * The actual donation-room truth is finalised again in redeemTicket().
           */
          donationAmount: entryFee,

          paymentMethod: ticket.payment_method,
          paymentReference: ticket.payment_reference || null,
          clubPaymentMethodId: ticket.club_payment_method_id || null,
          externalTransactionId: ticket.external_transaction_id || null,

          extras: normaliseExtrasForClient(extras),
          currency: ticket.currency || 'EUR',

          roomStatus: windowInfo.roomStatus,
          scheduledAt: windowInfo.scheduledAt?.toISOString?.() || null,
          joinOpensAt: windowInfo.joinOpensAt?.toISOString?.() || null,
        },
      });
    } catch (err) {
      console.error('[Ticket Handlers] ❌ validate_ticket_token error:', err);

      return sendCallback({
        ok: false,
        error: err?.message || 'Failed to validate ticket',
      });
    }
  });

  /**
   * Redeem ticket and join room.
   *
   * This does not directly join the socket room.
   * It returns playerData to JoinRoomFlow, which then emits join_quiz_room.
   */
  socket.on('redeem_ticket_and_join', async ({ joinToken, playerId }, callback) => {
    const sendCallback = typeof callback === 'function' ? callback : () => {};

    try {
      if (!joinToken || !playerId) {
        return sendCallback({
          ok: false,
          error: 'Join token and player ID required',
        });
      }

      const ticket = await getTicketByToken(joinToken);

      if (!ticket) {
        return sendCallback({ ok: false, error: 'Invalid ticket token' });
      }

      if (ticket.redemption_status === 'redeemed') {
        return sendCallback({ ok: false, error: 'Ticket already used' });
      }

      if (ticket.redemption_status === 'blocked') {
        return sendCallback({
          ok: false,
          error: 'Payment not yet confirmed by host. Please wait for approval.',
        });
      }

      if (
        ticket.redemption_status !== 'ready' ||
        ticket.payment_status !== 'payment_confirmed'
      ) {
        return sendCallback({ ok: false, error: 'Ticket not ready for use' });
      }

      const roomRow = await getRoomSchedule(ticket.room_id);

      if (!roomRow) {
        return sendCallback({ ok: false, error: 'Room not found' });
      }

      const windowInfo = computeJoinWindow(roomRow);

      if (
        windowInfo.roomStatus === 'completed' ||
        windowInfo.roomStatus === 'cancelled'
      ) {
        return sendCallback({
          ok: false,
          code: 'ROOM_NOT_JOINABLE',
          error: `This quiz is ${windowInfo.roomStatus}.`,
        });
      }

      if (!windowInfo.canJoinNow) {
        return sendCallback({
          ok: false,
          code: 'TOO_EARLY',
          error: 'You can join a few minutes before the quiz starts.',
          scheduledAt: windowInfo.scheduledAt
            ? windowInfo.scheduledAt.toISOString()
            : null,
          joinOpensAt: windowInfo.joinOpensAt
            ? windowInfo.joinOpensAt.toISOString()
            : null,
          roomStatus: windowInfo.roomStatus,
        });
      }

      /**
       * Now it is safe to redeem/burn the ticket.
       */
      const ticketData = await redeemTicket({ joinToken, playerId });

      if (DEBUG) {
        console.log('[Ticket Handlers] ✅ Ticket redeemed:', {
          ticketId: ticketData.ticketId,
          playerId,
          playerName: ticketData.playerName,
        });

        console.log('[Ticket Handlers] 🎟️ Redeemed ticket data passed to join:', {
          ticketId: ticketData.ticketId,
          playerName: ticketData.playerName,
          paymentMethod: ticketData.paymentMethod,
          entryFee: ticketData.entryFee,
          donationAmount: ticketData.donationAmount,
          extrasTotal: ticketData.extrasTotal,
          totalAmount: ticketData.totalAmount,
          currency: ticketData.currency,
          clubPaymentMethodId: ticketData.clubPaymentMethodId,
          paymentReference: ticketData.paymentReference,
          externalTransactionId: ticketData.externalTransactionId,
          paymentConfirmedBy: ticketData.paymentConfirmedBy,
          paymentConfirmedByName: ticketData.paymentConfirmedByName,
          paymentConfirmedRole: ticketData.paymentConfirmedRole,
          extras: ticketData.extras,
          extraPayments: ticketData.extraPayments,
        });
      }

      return sendCallback({
        ok: true,
        roomId: ticketData.roomId,
        playerData: {
          id: playerId,
          name: ticketData.playerName,

          paid: true,
          paymentClaimed: true,

          paymentMethod: ticketData.paymentMethod,
          paymentReference: ticketData.paymentReference || null,
          clubPaymentMethodId: ticketData.clubPaymentMethodId || null,
          externalTransactionId: ticketData.externalTransactionId || null,

          paymentConfirmedBy:
            ticketData.paymentConfirmedBy || 'ticket_system',
          paymentConfirmedByName:
            ticketData.paymentConfirmedByName || 'System',
          paymentConfirmedRole:
            ticketData.paymentConfirmedRole || 'system',
          paymentConfirmedAt:
            ticketData.paymentConfirmedAt || null,

          entryFee: Number(ticketData.entryFee || 0),
          extrasTotal: Number(ticketData.extrasTotal || 0),
          totalAmount: Number(ticketData.totalAmount || 0),

          /**
           * Critical for active player cards, impact statement, and in-memory reporting.
           */
          donationAmount: Number(
            ticketData.donationAmount ??
              ticketData.entryFee ??
              ticketData.totalAmount ??
              0
          ),
          donationCurrency: ticketData.currency || 'EUR',

          credits: 0,

          extras: Array.isArray(ticketData.extras) ? ticketData.extras : [],
          extraPayments: ticketData.extraPayments || {},

          ticketId: ticketData.ticketId,
        },
      });
    } catch (err) {
      console.error('[Ticket Handlers] ❌ redeem_ticket_and_join error:', err);

      return sendCallback({
        ok: false,
        error: err?.message || 'Failed to redeem ticket',
      });
    }
  });
}