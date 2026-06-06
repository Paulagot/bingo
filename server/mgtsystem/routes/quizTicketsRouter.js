// server/quiz/api/quizTicketsRouter.js
// UPDATED: Shows capacity info, blocks purchases when full, and validates ticket-safe payment methods

import express from 'express';
import authenticateToken from '../../middleware/auth.js';
import {
  createTicketWithPayment,
  confirmTicketPayment,
  getTicket,
  getRoomTickets,
  getRoomConfig,
  getRoomSchedule,
  computeJoinWindow,
  JOIN_WINDOW_MINUTES,
} from '../services/quizTicketService.js';

import { connection, TABLE_PREFIX } from '../../config/database.js';

import {
  getRoomCapacityStatus,
  getCapacityMessage,
} from '../services/quizCapacityService.js';

import { createTicketAndStripeSession } from '../../stripe/stripeTicketCheckoutService.js';

const router = express.Router();

const DEBUG = false;

const INVALID_TICKET_PAYMENT_METHOD_ERRORS = new Set([
  'valid_club_payment_method_required_for_ticket',
  'payment_method_not_linked_to_this_quiz',
  'payment_method_not_found_for_club',
  'payment_method_disabled',
  'ticket_manual_payment_method_must_be_manual',
  'cash_not_allowed_for_ticket_purchase',
  'payment_method_not_allowed_for_ticket_purchase',
  'ticket_crypto_payment_method_must_be_crypto',
  'unsupported_crypto_ticket_payment_method',
  'pay_at_door_not_allowed_for_ticket_purchase',
]);

function isInvalidTicketPaymentMethodError(message = '') {
  return INVALID_TICKET_PAYMENT_METHOD_ERRORS.has(message);
}

/* -------------------------------------------------------------------------- */
/*                      PUBLIC ROUTES (No auth required)                      */
/* -------------------------------------------------------------------------- */

/**
 * GET /api/quiz/tickets/room/:roomId/info
 * Get room info for ticket purchase page (public)
 */
router.get('/room/:roomId/info', async (req, res) => {
  try {
    const { roomId } = req.params;
 
    if (!roomId) {
      return res.status(400).json({ error: 'roomId required' });
    }
 
    const roomData = await getRoomConfig(roomId);
 
    if (!roomData) {
      return res.status(404).json({
        error: 'Room not found or not available for ticket purchase',
      });
    }
 
    const { config, clubId, status } = roomData;
 
    const { getQuizRoom } = await import('../../quiz/quizRoomManager.js');
    const memRoom = getQuizRoom(roomId);
    const currentPlayersInRoom = memRoom
      ? Object.keys(memRoom.players || {}).length
      : 0;
    const capacity = await getRoomCapacityStatus(roomId, currentPlayersInRoom);
    const capacityMessage = getCapacityMessage(capacity);
 
    // ── For ticketed events, join fundraisely_events via event_integrations ──
    // This gives us the event title, date, and location to display on the
    // ticket purchase page instead of the generic room config fields.
    let eventDetails = null;
 
    if (roomData.gameType === 'ticketed_event') {
      try {
        const INTEGRATIONS_TABLE = `${TABLE_PREFIX}event_integrations`;
        const EVENTS_TABLE       = `${TABLE_PREFIX}events`;
 
        const [eventRows] = await connection.execute(
          `SELECT
             e.id            AS event_id,
             e.title,
             e.summary,
             e.location_type,
             e.location_label,
             e.online_url,
             e.start_datetime,
             e.end_datetime,
             e.time_zone,
             e.event_date
           FROM ${INTEGRATIONS_TABLE} i
           JOIN ${EVENTS_TABLE} e ON e.id = i.event_id
           WHERE i.external_ref    = ?
             AND i.integration_type = 'ticketed_event'
           LIMIT 1`,
          [roomId]
        );
 
        if (eventRows?.[0]) {
          const ev = eventRows[0];
          eventDetails = {
            eventId:       ev.event_id,
            title:         ev.title,
            summary:       ev.summary       || null,
            locationLabel: ev.location_label || null,
            locationType:  ev.location_type  || null,
            onlineUrl:     ev.online_url     || null,
            startDatetime: ev.start_datetime  || null,
            endDatetime:   ev.end_datetime    || null,
            timeZone:      ev.time_zone       || null,
            eventDate:     ev.event_date      || null,
          };
        }
      } catch (eventErr) {
        // Non-fatal — ticket page still works without event details
        console.error('[Tickets API] ⚠️ Failed to load event details for ticketed_event:', eventErr);
      }
    }
 
    return res.status(200).json({
      roomId,
      clubId,
      status,
      hostName:          config.hostName,
      fundraisingMode:   config.fundraisingMode || 'fixed_fee',
      entryFee:          parseFloat(config.entryFee || 0),
      currencySymbol:    config.currencySymbol || '€',
      fundraisingOptions: config.fundraisingOptions || {},
      fundraisingPrices:  config.fundraisingPrices  || {},
      eventDateTime:     config.eventDateTime,
      timeZone:          config.timeZone,
      gameType:          roomData.gameType,
      clubName:          roomData.clubName,
      // Event details — populated for ticketed_event rooms, null otherwise
      eventDetails,
      capacity: {
        maxCapacity:            capacity.maxCapacity,
        availableForTickets:    capacity.availableForTickets,
        totalTickets:           capacity.totalTickets,
        ticketSalesOpen:        capacity.ticketSalesOpen,
        ticketSalesCloseReason: capacity.ticketSalesCloseReason,
        message:                capacityMessage,
      },
    });
  } catch (err) {
    console.error('[Tickets API] ❌ Error fetching room info:', err);
    return res.status(500).json({ error: 'internal_error' });
  }
});

/**
 * POST /api/quiz/tickets/create-with-payment
 * Create ticket with payment claim in one step (public)
 */
router.post('/create-with-payment', async (req, res) => {
  try {
    const {
      roomId,
      purchaserName,
      purchaserEmail,
      purchaserPhone,
      playerName,
      selectedExtras,
      donationAmount,
      paymentMethod,
      paymentReference,
      clubPaymentMethodId,
    } = req.body;

    if (
      !roomId ||
      !purchaserName ||
      !purchaserEmail ||
      !paymentMethod ||
      !paymentReference ||
      !clubPaymentMethodId
    ) {
      return res.status(400).json({
        error:
          'roomId, purchaserName, purchaserEmail, paymentMethod, paymentReference, and clubPaymentMethodId are required',
      });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(purchaserEmail)) {
      return res.status(400).json({ error: 'Invalid email address' });
    }

    const ticket = await createTicketWithPayment({
      roomId,
      purchaserName: purchaserName.trim(),
      purchaserEmail: purchaserEmail.trim(),
      purchaserPhone: purchaserPhone?.trim() || null,
      playerName: playerName?.trim() || null,
      selectedExtras: Array.isArray(selectedExtras) ? selectedExtras : [],
      donationAmount,
      paymentMethod,
      paymentReference,
      clubPaymentMethodId: clubPaymentMethodId || null,
    });

    if (DEBUG) {
      console.log('[Tickets API] ✅ Ticket created with payment:', ticket.ticketId);
    }

    return res.status(200).json({
      ok: true,
      ticket: {
        ticketId: ticket.ticketId,
        joinToken: ticket.joinToken,
        roomId: ticket.roomId,
        purchaserName: ticket.purchaserName,
        purchaserEmail: ticket.purchaserEmail,
        playerName: ticket.playerName,
        entryFee: ticket.entryFee,
        extrasTotal: ticket.extrasTotal,
        totalAmount: ticket.totalAmount,
        currency: ticket.currency,
        extras: ticket.extras,
        paymentStatus: ticket.paymentStatus,
        redemptionStatus: ticket.redemptionStatus,
        paymentMethod: ticket.paymentMethod,
        paymentReference: ticket.paymentReference,
      },
    });
  } catch (err) {
    console.error('[Tickets API] ❌ Error creating ticket:', err);

    const errorMessage = err?.message || 'Failed to create ticket';

    if (isInvalidTicketPaymentMethodError(errorMessage)) {
      return res.status(400).json({
        error: 'invalid_payment_method_for_ticket',
        message: errorMessage,
      });
    }

    if (
      errorMessage.includes('SOLD OUT') ||
      errorMessage.includes('spot') ||
      errorMessage.includes('capacity') ||
      errorMessage.includes('Ticket sales closed')
    ) {
      return res.status(409).json({
        error: 'capacity_exceeded',
        message: errorMessage,
      });
    }

    return res.status(500).json({
      error: 'Failed to create ticket',
      message: errorMessage,
    });
  }
});

router.post('/stripe/checkout', async (req, res) => {
  try {
    const {
      roomId,
      purchaserName,
      purchaserEmail,
      purchaserPhone,
      playerName,
      selectedExtras,
      donationAmount,
      appOrigin,
    } = req.body;

    if (!roomId || !purchaserName || !purchaserEmail) {
      return res.status(400).json({ error: 'missing_required_fields' });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(purchaserEmail)) {
      return res.status(400).json({ error: 'Invalid email address' });
    }

    const result = await createTicketAndStripeSession({
      roomId,
      purchaserName: purchaserName.trim(),
      purchaserEmail: purchaserEmail.trim(),
      purchaserPhone: purchaserPhone?.trim() || null,
      playerName: playerName?.trim() || null,
      selectedExtras: Array.isArray(selectedExtras) ? selectedExtras : [],
      donationAmount,
      appOrigin,
    });

    return res.status(200).json({
      ok: true,
      url: result.url,
      ticketId: result.ticketId,
    });
  } catch (err) {
    const msg = err?.message || 'stripe_checkout_failed';

    if (isInvalidTicketPaymentMethodError(msg)) {
      return res.status(400).json({
        error: 'invalid_payment_method_for_ticket',
        message: msg,
      });
    }

    if (
      msg.includes('SOLD OUT') ||
      msg.includes('capacity') ||
      msg.includes('Ticket sales closed')
    ) {
      return res.status(409).json({
        error: 'capacity_exceeded',
        message: msg,
      });
    }

    return res.status(500).json({
      error: 'stripe_checkout_failed',
      message: msg,
    });
  }
});

/**
 * GET /api/quiz/tickets/:ticketId/status
 * Check ticket status (public)
 */
router.get('/:ticketId/status', async (req, res) => {
  try {
    const { ticketId } = req.params;
 
    if (!ticketId) {
      return res.status(400).json({ error: 'ticketId required' });
    }
 
    const ticket = await getTicket(ticketId);
 
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }
 
    const extras =
      typeof ticket.extras === 'string'
        ? JSON.parse(ticket.extras)
        : ticket.extras || [];
 
    const roomRow = await getRoomSchedule(ticket.room_id);
    const windowInfo = roomRow ? computeJoinWindow(roomRow) : null;
 
    const ticketReady =
      ticket.payment_status === 'payment_confirmed' &&
      ticket.redemption_status === 'ready';
 
    const canJoinNow = !!(ticketReady && windowInfo?.canJoinNow);
 
    // ── Fetch game_type and club_name from the room + clubs tables ──────────
    // getRoomSchedule only returns status/scheduled_at/time_zone, so we do a
    // lightweight extra query here for the two fields the frontend needs.
    let gameType = 'quiz';
    let clubName = null;
    let hostName = null;
 
    try {
      const ROOMS_TABLE = `${TABLE_PREFIX}web2_quiz_rooms`;
      const CLUBS_TABLE = `${TABLE_PREFIX}clubs`;
 
      const [metaRows] = await connection.execute(
        `SELECT r.game_type, r.config_json, c.name AS club_name
         FROM ${ROOMS_TABLE} r
         LEFT JOIN ${CLUBS_TABLE} c ON c.id = r.club_id
         WHERE r.room_id = ?
         LIMIT 1`,
        [ticket.room_id]
      );
 
      if (metaRows?.[0]) {
        gameType = metaRows[0].game_type || 'quiz';
        clubName = metaRows[0].club_name || null;
 
        try {
          const config =
            typeof metaRows[0].config_json === 'string'
              ? JSON.parse(metaRows[0].config_json)
              : metaRows[0].config_json || {};
          hostName = config.hostName || null;
        } catch {
          // ignore parse error
        }
      }
    } catch {
      // Non-fatal — fall back to defaults
    }
 
    return res.status(200).json({
      ticketId: ticket.ticket_id,
      roomId: ticket.room_id,
      purchaserName: ticket.purchaser_name,
      playerName: ticket.player_name,
      entryFee: parseFloat(ticket.entry_fee),
      extrasTotal: parseFloat(ticket.extras_total),
      totalAmount: parseFloat(ticket.total_amount),
      currency: ticket.currency,
      extras,
      paymentStatus: ticket.payment_status,
      redemptionStatus: ticket.redemption_status,
      paymentMethod: ticket.payment_method,
      paymentReference: ticket.payment_reference,
      confirmedAt: ticket.confirmed_at,
      redeemedAt: ticket.redeemed_at,
      joinToken: ticket.join_token,
      roomStatus: windowInfo?.roomStatus || null,
      scheduledAt: windowInfo?.scheduledAt
        ? windowInfo.scheduledAt.toISOString()
        : null,
      joinOpensAt: windowInfo?.joinOpensAt
        ? windowInfo.joinOpensAt.toISOString()
        : null,
      canJoinNow,
      joinWindowMinutes: JOIN_WINDOW_MINUTES,
      // ── New fields ──────────────────────────────────────────────────────────
      gameType,     // 'quiz' | 'elimination'
      clubName,     // e.g. 'Dublin GAA Quiz Club' — null if not found
      hostName,     // from config_json.hostName
    });
  } catch (err) {
    console.error('[Tickets API] ❌ Error fetching ticket status:', err);
    return res.status(500).json({ error: 'internal_error' });
  }
});

/* -------------------------------------------------------------------------- */
/*                    AUTHENTICATED ROUTES (Host/Admin only)                  */
/* -------------------------------------------------------------------------- */

router.use(authenticateToken);

/**
 * GET /api/quiz/tickets/room/:roomId
 * Get all tickets for a room (authenticated)
 */
router.get('/room/:roomId', async (req, res) => {
  try {
    const { roomId } = req.params;
    const clubId = req.club_id;

    if (!roomId) {
      return res.status(400).json({ error: 'roomId required' });
    }

    const roomData = await getRoomConfig(roomId);

    if (!roomData) {
      return res.status(404).json({ error: 'Room not found' });
    }

    if (roomData.clubId !== clubId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const tickets = await getRoomTickets(roomId);
    const capacity = await getRoomCapacityStatus(roomId, 0);

    const formatted = tickets.map((t) => {
      const extras =
        typeof t.extras === 'string' ? JSON.parse(t.extras) : t.extras || [];

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

    return res.status(200).json({
      ok: true,
      tickets: formatted,
      capacitySummary: {
        maxCapacity: capacity.maxCapacity,
        totalTickets: capacity.totalTickets,
        claimedTickets: capacity.claimedTickets,
        confirmedTickets: capacity.confirmedTickets,
        redeemedTickets: capacity.redeemedTickets,
        availableForTickets: capacity.availableForTickets,
        ticketSalesOpen: capacity.ticketSalesOpen,
        message: getCapacityMessage(capacity),
      },
    });
  } catch (err) {
    console.error('[Tickets API] ❌ Error fetching room tickets:', err);
    return res.status(500).json({ error: 'internal_error' });
  }
});

/**
 * PATCH /api/quiz/tickets/:ticketId/confirm
 * Host or admin confirms a ticket payment (authenticated)
 *
 * The frontend sends confirmedBy / confirmedByName / confirmedByRole in the
 * request body. We trust those values (the route is already auth-guarded) and
 * fall back to the JWT user only when they are absent.
 */
router.patch('/:ticketId/confirm', async (req, res) => {
  try {
    const { ticketId } = req.params;
    const clubId = req.club_id;

    if (!ticketId) {
      return res.status(400).json({ error: 'ticketId required' });
    }

    const {
      confirmedBy: bodyConfirmedBy,
      confirmedByName: bodyConfirmedByName,
      confirmedByRole: bodyConfirmedByRole,
      adminNotes,
    } = req.body;

    const confirmedBy = bodyConfirmedBy || req.user?.id || null;
    const confirmedByName = bodyConfirmedByName || req.user?.name || 'Admin';
    const confirmedByRole = bodyConfirmedByRole || 'admin';

    if (!confirmedBy) {
      return res.status(400).json({
        error:
          'confirmedBy is required — pass it in the request body or ensure the JWT user is valid',
      });
    }

    if (DEBUG) {
      console.log('[Tickets API] 🔍 Confirm request:', {
        ticketId,
        confirmedBy,
        confirmedByName,
        confirmedByRole,
      });
    }

    const ticket = await getTicket(ticketId);

    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    if (ticket.club_id !== clubId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    await confirmTicketPayment({
      ticketId,
      confirmedBy,
      confirmedByName,
      confirmedByRole,
      adminNotes: adminNotes || null,
    });

    if (DEBUG) {
      console.log(
        '[Tickets API] ✅ Payment confirmed by:',
        confirmedByName,
        `(${confirmedByRole})`
      );
    }

    return res.status(200).json({
      ok: true,
      message: 'Payment confirmed. Ticket is now ready for redemption.',
    });
  } catch (err) {
    console.error('[Tickets API] ❌ Error confirming payment:', err);
    return res.status(500).json({
      error: 'Failed to confirm payment',
      message: err.message,
    });
  }
});

export default router;