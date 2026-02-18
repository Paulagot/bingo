// server/quiz/api/quzTicketsRouter.js
// UPDATED: Shows capacity info and blocks purchases when full

import express from 'express';
import authenticateToken from '../../middleware/auth.js';
import {
  createTicketWithPayment,
  confirmTicketPayment,
  getTicket,
  getTicketByToken,
  getRoomTickets,
  getRoomConfig,
  getRoomSchedule,
  computeJoinWindow,
  JOIN_WINDOW_MINUTES,
} from '../services/quizTicketService.js';

import {
  getRoomCapacityStatus,
  getCapacityMessage,
} from '../services/quizCapacityService.js';

const router = express.Router();

const DEBUG = true;

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
        error: 'Room not found or not available for ticket purchase' 
      });
    }
    
    const { config, clubId, status } = roomData;
    
    const capacity = await getRoomCapacityStatus(roomId, 0);
    const capacityMessage = getCapacityMessage(capacity);
    
    return res.status(200).json({
      roomId,
      clubId,
      status,
      hostName: config.hostName,
      entryFee: parseFloat(config.entryFee || 0),
      currencySymbol: config.currencySymbol || '€',
      fundraisingOptions: config.fundraisingOptions || {},
      fundraisingPrices: config.fundraisingPrices || {},
      eventDateTime: config.eventDateTime,
      timeZone: config.timeZone,
      capacity: {
        maxCapacity: capacity.maxCapacity,
        availableForTickets: capacity.availableForTickets,
        totalTickets: capacity.totalTickets,
        ticketSalesOpen: capacity.ticketSalesOpen,
        ticketSalesCloseReason: capacity.ticketSalesCloseReason,
        message: capacityMessage,
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
      paymentMethod,
      paymentReference,
      clubPaymentMethodId,
    } = req.body;
    
    if (!roomId || !purchaserName || !purchaserEmail || !paymentMethod || !paymentReference) {
      return res.status(400).json({ 
        error: 'roomId, purchaserName, purchaserEmail, paymentMethod, and paymentReference are required' 
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
    
    const errorMessage = err.message;
    
    if (errorMessage.includes('SOLD OUT') || 
        errorMessage.includes('spot') || 
        errorMessage.includes('capacity') ||
        errorMessage.includes('Ticket sales closed')) {
      return res.status(409).json({
        error: 'capacity_exceeded',
        message: errorMessage,
      });
    }
    
    return res.status(500).json({ 
      error: 'Failed to create ticket',
      message: errorMessage 
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

    const extras = typeof ticket.extras === 'string'
      ? JSON.parse(ticket.extras)
      : ticket.extras || [];

    const roomRow = await getRoomSchedule(ticket.room_id);
    const windowInfo = roomRow ? computeJoinWindow(roomRow) : null;

    const ticketReady =
      ticket.payment_status === 'payment_confirmed' &&
      ticket.redemption_status === 'ready';

    const canJoinNow = !!(ticketReady && windowInfo?.canJoinNow);

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
      scheduledAt: windowInfo?.scheduledAt ? windowInfo.scheduledAt.toISOString() : null,
      joinOpensAt: windowInfo?.joinOpensAt ? windowInfo.joinOpensAt.toISOString() : null,
      canJoinNow,
      joinWindowMinutes: JOIN_WINDOW_MINUTES,
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

    // ✅ Prefer values sent by the frontend (host dashboard / admin dashboard)
    //    Fall back to the JWT user if the body fields are missing.
    const {
      confirmedBy: bodyConfirmedBy,
      confirmedByName: bodyConfirmedByName,
      confirmedByRole: bodyConfirmedByRole,
      adminNotes,
    } = req.body;

    const confirmedBy   = bodyConfirmedBy   || req.user?.id   || null;
    const confirmedByName = bodyConfirmedByName || req.user?.name || 'Admin';
    const confirmedByRole = bodyConfirmedByRole || 'admin';

    if (!confirmedBy) {
      return res.status(400).json({
        error: 'confirmedBy is required — pass it in the request body or ensure the JWT user is valid',
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

    // Verify ticket belongs to this club
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
      console.log('[Tickets API] ✅ Payment confirmed by:', confirmedByName, `(${confirmedByRole})`);
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