// server/quiz/api/quizTicketsRouter.js
// UPDATED:
//   - GET /room/:roomId/info now queries sold counts per ticket type,
//     evaluates availability (isEnabled, saleEndsAt, quantity), and
//     returns only available types to buyers.
//   - POST /create-with-payment and POST /stripe/checkout pass
//     ticketTypeId + ticketTypeName to service layer.
//
// Everything else (auth routes, confirm, status) is UNCHANGED.

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
const DEBUG  = false;

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

// ─────────────────────────────────────────────────────────────────────────────
// HELPER: evaluate which ticket types are currently available to buyers
//
// A type is available when ALL of:
//   1. isEnabled === true
//   2. saleEndsAt is null OR saleEndsAt > now
//   3. quantity is null OR sold_count < quantity
//      AND the overall venue still has capacity (handled separately by capacity check)
//
// Returns the available types, each decorated with:
//   - soldCount:  number of tickets sold for this type
//   - remaining:  min(type.quantity - soldCount, venueAvailable) — null if no type limit
// ─────────────────────────────────────────────────────────────────────────────
async function getAvailableTicketTypes(roomId, config, venueAvailableForTickets) {
  const allTypes = Array.isArray(config.ticketTypes) && config.ticketTypes.length > 0
    ? config.ticketTypes
    : config.entryFee
      // Legacy room — synthesise single type
      ? [{ id: 'general', name: 'General Admission', price: String(config.entryFee), isEnabled: true, quantity: null, saleEndsAt: null }]
      : [];

  if (allTypes.length === 0) return [];

  // Query sold count per type in one go
  const TICKETS_TABLE = `${TABLE_PREFIX}quiz_tickets`;
  const [soldRows] = await connection.execute(
    `SELECT ticket_type_id, COUNT(*) AS sold
     FROM ${TICKETS_TABLE}
     WHERE room_id = ?
       AND payment_status IN ('payment_claimed', 'payment_confirmed')
       AND ticket_type_id IS NOT NULL
     GROUP BY ticket_type_id`,
    [roomId]
  );

  const soldByType = {};
  for (const row of soldRows) {
    soldByType[row.ticket_type_id] = Number(row.sold);
  }

  const now = Date.now();

  const available = [];
  for (const t of allTypes) {
    // 1. Enabled check
    if (t.isEnabled === false) continue;

    // 2. Sale end date check (UTC comparison)
    if (t.saleEndsAt) {
      const endsAt = new Date(t.saleEndsAt).getTime();
      if (!isNaN(endsAt) && now > endsAt) continue;
    }

    // 3. Per-type quantity check
    const soldCount = soldByType[t.id] ?? 0;
    if (t.quantity != null && soldCount >= t.quantity) continue;

    // Compute remaining for display
    let remaining = null;
    if (t.quantity != null) {
      // Remaining for this type, capped by overall venue availability
      remaining = Math.min(t.quantity - soldCount, venueAvailableForTickets);
    }

    available.push({
      id:        t.id,
      name:      t.name,
      price:     t.price,
      soldCount,
      remaining, // null = only limited by venue cap
    });
  }

  return available;
}

/* -------------------------------------------------------------------------- */
/*                      PUBLIC ROUTES (No auth required)                      */
/* -------------------------------------------------------------------------- */

/**
 * GET /api/quiz/tickets/room/:roomId/info
 */
router.get('/room/:roomId/info', async (req, res) => {
  try {
    const { roomId } = req.params;
    if (!roomId) return res.status(400).json({ error: 'roomId required' });

    const roomData = await getRoomConfig(roomId);
    if (!roomData) {
      return res.status(404).json({ error: 'Room not found or not available for ticket purchase' });
    }

    const { config, clubId, status } = roomData;

    const { getQuizRoom } = await import('../../quiz/quizRoomManager.js');
    const memRoom = getQuizRoom(roomId);
    const currentPlayersInRoom = memRoom ? Object.keys(memRoom.players || {}).length : 0;
    const capacity = await getRoomCapacityStatus(roomId, currentPlayersInRoom);
    const capacityMessage = getCapacityMessage(capacity);

    // ── Event details for ticketed_event rooms ────────────────────────────
    let eventDetails = null;
    if (roomData.gameType === 'ticketed_event') {
      try {
        const INTEGRATIONS_TABLE = `${TABLE_PREFIX}event_integrations`;
        const EVENTS_TABLE       = `${TABLE_PREFIX}events`;

        const [eventRows] = await connection.execute(
          `SELECT
             e.id AS event_id, e.title, e.summary,
             e.location_type, e.location_label, e.online_url,
             e.start_datetime, e.end_datetime, e.time_zone, e.event_date
           FROM ${INTEGRATIONS_TABLE} i
           JOIN ${EVENTS_TABLE} e ON e.id = i.event_id
           WHERE i.external_ref = ? AND i.integration_type = 'ticketed_event'
           LIMIT 1`,
          [roomId]
        );

        if (eventRows?.[0]) {
          const ev = eventRows[0];
          eventDetails = {
            eventId:       ev.event_id,
            title:         ev.title,
            summary:       ev.summary        || null,
            locationLabel: ev.location_label || null,
            locationType:  ev.location_type  || null,
            onlineUrl:     ev.online_url      || null,
            startDatetime: ev.start_datetime  || null,
            endDatetime:   ev.end_datetime    || null,
            timeZone:      ev.time_zone       || null,
            eventDate:     ev.event_date      || null,
          };
        }
      } catch (eventErr) {
        console.error('[Tickets API] ⚠️ Failed to load event details:', eventErr);
      }
    }

    // ── Ticket types — filtered to available only ─────────────────────────
    let ticketTypes = undefined;

    if (roomData.gameType === 'ticketed_event') {
      // Only evaluate availability when sales are actually open —
      // avoids an unnecessary DB query for completed/cancelled rooms.
      if (capacity.ticketSalesOpen) {
        ticketTypes = await getAvailableTicketTypes(
          roomId,
          config,
          capacity.availableForTickets
        );
      } else {
        ticketTypes = [];
      }
    }

    return res.status(200).json({
      roomId,
      clubId,
      status,
      hostName:           config.hostName,
      fundraisingMode:    config.fundraisingMode || 'fixed_fee',
      entryFee:           parseFloat(config.entryFee || 0),
      currencySymbol:     config.currencySymbol || '€',
      fundraisingOptions: config.fundraisingOptions || {},
      fundraisingPrices:  config.fundraisingPrices  || {},
      eventDateTime:      config.eventDateTime,
      timeZone:           config.timeZone,
      gameType:           roomData.gameType,
      clubName:           roomData.clubName,
      ticketTypes,        // available types only; undefined for non-ticketed-event rooms
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
      ticketTypeId,    // ← new
      ticketTypeName,  // ← new
    } = req.body;

    if (!roomId || !purchaserName || !purchaserEmail || !paymentMethod || !paymentReference || !clubPaymentMethodId) {
      return res.status(400).json({
        error: 'roomId, purchaserName, purchaserEmail, paymentMethod, paymentReference, and clubPaymentMethodId are required',
      });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(purchaserEmail)) {
      return res.status(400).json({ error: 'Invalid email address' });
    }

    const ticket = await createTicketWithPayment({
      roomId,
      purchaserName:       purchaserName.trim(),
      purchaserEmail:      purchaserEmail.trim(),
      purchaserPhone:      purchaserPhone?.trim() || null,
      playerName:          playerName?.trim() || null,
      selectedExtras:      Array.isArray(selectedExtras) ? selectedExtras : [],
      donationAmount,
      paymentMethod,
      paymentReference,
      clubPaymentMethodId: clubPaymentMethodId || null,
      ticketTypeId:        ticketTypeId   || null,
      ticketTypeName:      ticketTypeName || null,
    });

    if (DEBUG) console.log('[Tickets API] ✅ Ticket created:', ticket.ticketId);

    return res.status(200).json({
      ok: true,
      ticket: {
        ticketId:         ticket.ticketId,
        joinToken:        ticket.joinToken,
        roomId:           ticket.roomId,
        purchaserName:    ticket.purchaserName,
        purchaserEmail:   ticket.purchaserEmail,
        playerName:       ticket.playerName,
        entryFee:         ticket.entryFee,
        extrasTotal:      ticket.extrasTotal,
        totalAmount:      ticket.totalAmount,
        currency:         ticket.currency,
        extras:           ticket.extras,
        paymentStatus:    ticket.paymentStatus,
        redemptionStatus: ticket.redemptionStatus,
        paymentMethod:    ticket.paymentMethod,
        paymentReference: ticket.paymentReference,
        ticketTypeId:     ticket.ticketTypeId,
        ticketTypeName:   ticket.ticketTypeName,
      },
    });
  } catch (err) {
    console.error('[Tickets API] ❌ Error creating ticket:', err);
    const errorMessage = err?.message || 'Failed to create ticket';

    if (isInvalidTicketPaymentMethodError(errorMessage)) {
      return res.status(400).json({ error: 'invalid_payment_method_for_ticket', message: errorMessage });
    }
    if (errorMessage.includes('ticket_type_unavailable') || errorMessage.includes('ticket_type_not_found')) {
      return res.status(409).json({ error: 'ticket_type_unavailable', message: errorMessage });
    }
    if (errorMessage.includes('SOLD OUT') || errorMessage.includes('spot') || errorMessage.includes('capacity') || errorMessage.includes('Ticket sales closed')) {
      return res.status(409).json({ error: 'capacity_exceeded', message: errorMessage });
    }
    return res.status(500).json({ error: 'Failed to create ticket', message: errorMessage });
  }
});

/**
 * POST /api/quiz/tickets/stripe/checkout
 */
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
      ticketTypeId,    // ← new
      ticketTypeName,  // ← new
    } = req.body;

    if (!roomId || !purchaserName || !purchaserEmail) {
      return res.status(400).json({ error: 'missing_required_fields' });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(purchaserEmail)) {
      return res.status(400).json({ error: 'Invalid email address' });
    }

    const result = await createTicketAndStripeSession({
      roomId,
      purchaserName:  purchaserName.trim(),
      purchaserEmail: purchaserEmail.trim(),
      purchaserPhone: purchaserPhone?.trim() || null,
      playerName:     playerName?.trim() || null,
      selectedExtras: Array.isArray(selectedExtras) ? selectedExtras : [],
      donationAmount,
      appOrigin,
      ticketTypeId:   ticketTypeId   || null,
      ticketTypeName: ticketTypeName || null,
    });

    return res.status(200).json({ ok: true, url: result.url, ticketId: result.ticketId });
  } catch (err) {
    const msg = err?.message || 'stripe_checkout_failed';
    if (isInvalidTicketPaymentMethodError(msg)) {
      return res.status(400).json({ error: 'invalid_payment_method_for_ticket', message: msg });
    }
    if (msg.includes('ticket_type_unavailable') || msg.includes('ticket_type_not_found')) {
      return res.status(409).json({ error: 'ticket_type_unavailable', message: msg });
    }
    if (msg.includes('SOLD OUT') || msg.includes('capacity') || msg.includes('Ticket sales closed')) {
      return res.status(409).json({ error: 'capacity_exceeded', message: msg });
    }
    return res.status(500).json({ error: 'stripe_checkout_failed', message: msg });
  }
});

/**
 * GET /api/quiz/tickets/:ticketId/status
 */
router.get('/:ticketId/status', async (req, res) => {
  try {
    const { ticketId } = req.params;
    if (!ticketId) return res.status(400).json({ error: 'ticketId required' });

    const ticket = await getTicket(ticketId);
    if (!ticket) return res.status(404).json({ error: 'Ticket not found' });

    const extras = typeof ticket.extras === 'string' ? JSON.parse(ticket.extras) : ticket.extras || [];
    const roomRow    = await getRoomSchedule(ticket.room_id);
    const windowInfo = roomRow ? computeJoinWindow(roomRow) : null;

    const ticketReady = ticket.payment_status === 'payment_confirmed' && ticket.redemption_status === 'ready';
    const canJoinNow  = !!(ticketReady && windowInfo?.canJoinNow);

    let gameType = 'quiz', clubName = null, hostName = null;
    try {
      const ROOMS_TABLE = `${TABLE_PREFIX}web2_quiz_rooms`;
      const CLUBS_TABLE = `${TABLE_PREFIX}clubs`;
      const [metaRows] = await connection.execute(
        `SELECT r.game_type, r.config_json, c.name AS club_name
         FROM ${ROOMS_TABLE} r
         LEFT JOIN ${CLUBS_TABLE} c ON c.id = r.club_id
         WHERE r.room_id = ? LIMIT 1`,
        [ticket.room_id]
      );
      if (metaRows?.[0]) {
        gameType = metaRows[0].game_type || 'quiz';
        clubName = metaRows[0].club_name || null;
        try {
          const cfg = typeof metaRows[0].config_json === 'string'
            ? JSON.parse(metaRows[0].config_json)
            : metaRows[0].config_json || {};
          hostName = cfg.hostName || null;
        } catch { /* ignore */ }
      }
    } catch { /* non-fatal */ }

    return res.status(200).json({
      ticketId:         ticket.ticket_id,
      roomId:           ticket.room_id,
      purchaserName:    ticket.purchaser_name,
      playerName:       ticket.player_name,
      entryFee:         parseFloat(ticket.entry_fee),
      extrasTotal:      parseFloat(ticket.extras_total),
      totalAmount:      parseFloat(ticket.total_amount),
      currency:         ticket.currency,
      extras,
      paymentStatus:    ticket.payment_status,
      redemptionStatus: ticket.redemption_status,
      paymentMethod:    ticket.payment_method,
      paymentReference: ticket.payment_reference,
      confirmedAt:      ticket.confirmed_at,
      redeemedAt:       ticket.redeemed_at,
      joinToken:        ticket.join_token,
      roomStatus:       windowInfo?.roomStatus || null,
      scheduledAt:      windowInfo?.scheduledAt ? windowInfo.scheduledAt.toISOString() : null,
      joinOpensAt:      windowInfo?.joinOpensAt ? windowInfo.joinOpensAt.toISOString() : null,
      canJoinNow,
      joinWindowMinutes: JOIN_WINDOW_MINUTES,
      gameType,
      clubName,
      hostName,
      ticketTypeId:     ticket.ticket_type_id   || null,
      ticketTypeName:   ticket.ticket_type_name || null,
    });
  } catch (err) {
    console.error('[Tickets API] ❌ Error fetching ticket status:', err);
    return res.status(500).json({ error: 'internal_error' });
  }
});

/* -------------------------------------------------------------------------- */
/*                    AUTHENTICATED ROUTES                                     */
/* -------------------------------------------------------------------------- */

router.use(authenticateToken);

router.get('/room/:roomId', async (req, res) => {
  try {
    const { roomId } = req.params;
    const clubId = req.club_id;
    if (!roomId) return res.status(400).json({ error: 'roomId required' });

    const roomData = await getRoomConfig(roomId);
    if (!roomData) return res.status(404).json({ error: 'Room not found' });
    if (roomData.clubId !== clubId) return res.status(403).json({ error: 'Forbidden' });

    const tickets  = await getRoomTickets(roomId);
    const capacity = await getRoomCapacityStatus(roomId, 0);

    const formatted = tickets.map(t => {
      const extras = typeof t.extras === 'string' ? JSON.parse(t.extras) : t.extras || [];
      return {
        ticketId:           t.ticket_id,
        purchaserName:      t.purchaser_name,
        purchaserEmail:     t.purchaser_email,
        purchaserPhone:     t.purchaser_phone,
        playerName:         t.player_name,
        entryFee:           parseFloat(t.entry_fee),
        extrasTotal:        parseFloat(t.extras_total),
        totalAmount:        parseFloat(t.total_amount),
        currency:           t.currency,
        extras,
        paymentStatus:      t.payment_status,
        redemptionStatus:   t.redemption_status,
        paymentMethod:      t.payment_method,
        paymentReference:   t.payment_reference,
        clubPaymentMethodId:t.club_payment_method_id,
        purchasedAt:        t.purchased_at,
        confirmedAt:        t.confirmed_at,
        confirmedBy:        t.confirmed_by,
        redeemedAt:         t.redeemed_at,
        redeemedByPlayerId: t.redeemed_by_player_id,
        ticketTypeId:       t.ticket_type_id   || null,
        ticketTypeName:     t.ticket_type_name || null,
      };
    });

    return res.status(200).json({
      ok: true,
      tickets: formatted,
      capacitySummary: {
        maxCapacity:         capacity.maxCapacity,
        totalTickets:        capacity.totalTickets,
        claimedTickets:      capacity.claimedTickets,
        confirmedTickets:    capacity.confirmedTickets,
        redeemedTickets:     capacity.redeemedTickets,
        availableForTickets: capacity.availableForTickets,
        ticketSalesOpen:     capacity.ticketSalesOpen,
        message:             getCapacityMessage(capacity),
      },
    });
  } catch (err) {
    console.error('[Tickets API] ❌ Error fetching room tickets:', err);
    return res.status(500).json({ error: 'internal_error' });
  }
});

router.patch('/:ticketId/confirm', async (req, res) => {
  try {
    const { ticketId } = req.params;
    const clubId = req.club_id;
    if (!ticketId) return res.status(400).json({ error: 'ticketId required' });

    const {
      confirmedBy:     bodyConfirmedBy,
      confirmedByName: bodyConfirmedByName,
      confirmedByRole: bodyConfirmedByRole,
      adminNotes,
    } = req.body;

    const confirmedBy     = bodyConfirmedBy     || req.user?.id   || null;
    const confirmedByName = bodyConfirmedByName || req.user?.name || 'Admin';
    const confirmedByRole = bodyConfirmedByRole || 'admin';

    if (!confirmedBy) return res.status(400).json({ error: 'confirmedBy is required' });

    const ticket = await getTicket(ticketId);
    if (!ticket) return res.status(404).json({ error: 'Ticket not found' });
    if (ticket.club_id !== clubId) return res.status(403).json({ error: 'Forbidden' });

    await confirmTicketPayment({ ticketId, confirmedBy, confirmedByName, confirmedByRole, adminNotes: adminNotes || null });

    return res.status(200).json({ ok: true, message: 'Payment confirmed. Ticket is now ready for redemption.' });
  } catch (err) {
    console.error('[Tickets API] ❌ Error confirming payment:', err);
    return res.status(500).json({ error: 'Failed to confirm payment', message: err.message });
  }
});

export default router;