// server/quiz/services/quizTicketService.js
// UPDATED: Added capacity checks before ticket purchase

import { connection, TABLE_PREFIX } from '../../config/database.js';
import { nanoid } from 'nanoid';
import { createExpectedPayment } from './quizPaymentLedgerService.js';
import { canPurchaseTickets, getRoomCapacityStatus } from './quizCapacityService.js';

import Stripe from 'stripe';
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-06-20' });


const TICKETS_TABLE = `${TABLE_PREFIX}quiz_tickets`;
const WEB2_ROOMS_TABLE = `${TABLE_PREFIX}web2_quiz_rooms`;

const DEBUG = true;

/**
 * Get room configuration from database
 * Returns null if room not found or is Web3
 */
export async function getRoomConfig(roomId) {
  const sql = `
    SELECT
      room_id,
      club_id,
      status,
      scheduled_at,
      time_zone,
      config_json,
      room_caps_json
    FROM ${WEB2_ROOMS_TABLE}
    WHERE room_id = ?
    LIMIT 1
  `;

  const [rows] = await connection.execute(sql, [roomId]);
  const row = rows?.[0];

  if (!row) {
    if (DEBUG) console.log('[TicketService] ❌ Room not found:', roomId);
    return null;
  }

  const config =
    typeof row.config_json === 'string'
      ? JSON.parse(row.config_json)
      : (row.config_json || {});

  // ✅ Parse room caps (THIS is what you were missing)
  const roomCaps =
    typeof row.room_caps_json === 'string'
      ? JSON.parse(row.room_caps_json)
      : (row.room_caps_json || {});

  // ✅ Block Web3 rooms
  if (config.paymentMethod === 'web3' || config.isWeb3Room === true) {
    if (DEBUG) console.log('[TicketService] ❌ Web3 room - tickets not supported:', roomId);
    return null;
  }

  return {
    roomId: row.room_id,
    clubId: row.club_id,
    status: row.status,
    scheduledAt: row.scheduled_at ?? null,
    timeZone: row.time_zone ?? null,
    config,
    roomCaps,
  };
}

/**
 * Create ticket with payment claim in ONE STEP
 * ✅ NEW: Checks capacity BEFORE creating ticket
 */
export async function createTicketWithPayment({
  roomId,
  purchaserName,
  purchaserEmail,
  purchaserPhone = null,
  playerName = null,
  selectedExtras = [],
  paymentMethod,
  paymentReference,
  clubPaymentMethodId = null,
}) {
  // ✅ STEP 0: CHECK CAPACITY FIRST
  const capacityCheck = await canPurchaseTickets(roomId, 1);
  
  if (!capacityCheck.allowed) {
    if (DEBUG) {
      console.log('[TicketService] 🚫 Ticket purchase blocked:', {
        roomId,
        reason: capacityCheck.reason,
        capacity: capacityCheck.capacity,
      });
    }
    
    throw new Error(capacityCheck.reason);
  }
  
  if (DEBUG) {
    console.log('[TicketService] ✅ Capacity check passed:', {
      roomId,
      availableForTickets: capacityCheck.capacity.availableForTickets,
      maxCapacity: capacityCheck.capacity.maxCapacity,
    });
  }
  
  // 1. Get room config
  const roomData = await getRoomConfig(roomId);
  
  if (!roomData) {
    throw new Error('Room not found or not available for ticket purchase');
  }
  
  const { clubId, config } = roomData;
  
  // 2. Calculate pricing
  const entryFee = parseFloat(config.entryFee || 0);
  const currency = config.currencySymbol === '€' ? 'EUR' 
                 : config.currencySymbol === '£' ? 'GBP' 
                 : config.currencySymbol === '$' ? 'USD'
                 : 'EUR';
  
  let extrasTotal = 0;
  const extrasWithPrices = [];
  
  for (const extraId of selectedExtras) {
    const price = config.fundraisingPrices?.[extraId] || 0;
    if (price > 0) {
      extrasTotal += price;
      extrasWithPrices.push({ extraId, price });
    }
  }
  
  const totalAmount = entryFee + extrasTotal;
  
  // 3. Generate unique IDs
  const ticketId = nanoid(12);
  const joinToken = nanoid(16);
  
  // 4. Insert ticket WITH payment claimed (skips pending_payment)
  const sql = `
    INSERT INTO ${TICKETS_TABLE}
      (ticket_id, room_id, club_id, purchaser_name, purchaser_email, purchaser_phone,
       player_name, entry_fee, extras, extras_total, total_amount, currency,
       payment_status, payment_method, payment_reference, club_payment_method_id,
       redemption_status, join_token)
    VALUES
      (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'payment_claimed', ?, ?, ?, 'blocked', ?)
  `;
  
  const params = [
    ticketId,
    roomId,
    clubId,
    purchaserName,
    purchaserEmail,
    purchaserPhone,
    playerName || purchaserName, // Default player name to purchaser name
    entryFee,
    JSON.stringify(extrasWithPrices),
    extrasTotal,
    totalAmount,
    currency,
    paymentMethod,
    paymentReference,
    clubPaymentMethodId,
    joinToken,
  ];
  
  const [result] = await connection.execute(sql, params);
  
  // 5. Create ledger entries (entry fee)
  const playerId = `ticket_${ticketId}`;
  
  const ledgerId = await createExpectedPayment({
    roomId,
    clubId,
    playerId,
    playerName: playerName || purchaserName,
    ledgerType: 'entry_fee',
    amount: entryFee,
    currency,
    paymentMethod,
    paymentSource: 'player_claimed',
    clubPaymentMethodId,
    paymentReference,
    claimedAt: new Date(),
    ticketId: ticketId,
  });
  
  // 6. Create ledger entries (extras)
  for (const extra of extrasWithPrices) {
    await createExpectedPayment({
      roomId,
      clubId,
      playerId,
      playerName: playerName || purchaserName,
      ledgerType: 'extra_purchase',
      amount: extra.price,
      currency,
      paymentMethod,
      paymentSource: 'player_claimed',
      clubPaymentMethodId,
      paymentReference,
      claimedAt: new Date(),
      extraId: extra.extraId,
      extraMetadata: extra,
      ticketId: ticketId,
    });
  }
  
  // 7. Update ticket with ledger ID
  await connection.execute(
    `UPDATE ${TICKETS_TABLE} SET ledger_id = ? WHERE ticket_id = ?`,
    [ledgerId, ticketId]
  );
  
  if (DEBUG) {
    console.log('[TicketService] ✅ Ticket created with payment claimed:', {
      ticketId,
      roomId,
      purchaserName,
      entryFee,
      extrasTotal,
      totalAmount,
      currency,
      paymentReference,
    });
  }
  
  return {
    ticketId,
    joinToken,
    roomId,
    clubId,
    purchaserName,
    purchaserEmail,
    playerName: playerName || purchaserName,
    entryFee,
    extrasTotal,
    totalAmount,
    currency,
    extras: extrasWithPrices,
    paymentStatus: 'payment_claimed',
    redemptionStatus: 'blocked',
    paymentMethod,
    paymentReference,
    clubPaymentMethodId,
  };
}

/**
 * Host confirms ticket payment
 */
export async function confirmTicketPayment({
  ticketId,
  confirmedBy,
  confirmedByName,
  confirmedByRole,
  adminNotes = null,
}) {
  const ticket = await getTicket(ticketId);
  if (!ticket) throw new Error('Ticket not found');
  if (ticket.payment_status === 'payment_confirmed') throw new Error('Ticket payment already confirmed');

  const sql = `
    UPDATE ${TICKETS_TABLE}
    SET
      payment_status = 'payment_confirmed',
      redemption_status = 'ready',
      confirmed_at = NOW(),
      confirmed_by = ?,
      confirmed_by_name = ?,
      confirmed_by_role = ?,
      admin_notes = ?,
      updated_at = NOW()
    WHERE ticket_id = ?
  `;

  await connection.execute(sql, [
    confirmedBy,
    confirmedByName || null,
    confirmedByRole || null,
    adminNotes,
    ticketId
  ]);

  const playerId = `ticket_${ticketId}`;
  const { confirmPayment } = await import('./quizPaymentLedgerService.js');

  await confirmPayment({
    roomId: ticket.room_id,
    playerId,
    confirmedBy,
    confirmedByName,
    confirmedByRole,
    adminNotes,
  });

  if (DEBUG) {
    console.log('[TicketService] ✅ Ticket payment confirmed:', {
      ticketId,
      confirmedBy,
      confirmedByName,
    });
  }

  // ✅ Send confirmation email (non-fatal if it fails)
  try {
    const { sendTicketConfirmationEmail, getTicketWithRoomConfig } = await import('../../utils/ticketEmail.js');
    const ticketRow = await getTicketWithRoomConfig(ticketId);

    if (ticketRow) {
      const config = typeof ticketRow.config_json === 'string'
        ? JSON.parse(ticketRow.config_json)
        : ticketRow.config_json;

      const extras = typeof ticketRow.extras === 'string'
        ? JSON.parse(ticketRow.extras)
        : ticketRow.extras || [];

      await sendTicketConfirmationEmail({
        ticketId,
        purchaserEmail: ticketRow.purchaser_email,
        purchaserName: ticketRow.purchaser_name,
        playerName: ticketRow.player_name,
        entryFee: ticketRow.entry_fee,
        extrasTotal: ticketRow.extras_total,
        totalAmount: ticketRow.total_amount,
        currency: ticketRow.currency,
        currencySymbol: config?.currencySymbol || '€',
        extras,
        clubId: ticketRow.club_id,
        hostName: config?.hostName,
        eventDateTime: config?.eventDateTime,
        timeZone: config?.timeZone,
      });

      console.log('[TicketService] ✅ Confirmation email sent to:', ticketRow.purchaser_email);
    }
  } catch (emailErr) {
    console.error('[TicketService] ⚠️ Email send failed (non-fatal):', emailErr.message);
  }

  return { ok: true, ticketId };
}

/**
 * Get ticket by ID
 */
export async function getTicket(ticketId) {
  const sql = `SELECT * FROM ${TICKETS_TABLE} WHERE ticket_id = ? LIMIT 1`;
  const [rows] = await connection.execute(sql, [ticketId]);
  return rows?.[0] || null;
}

/**
 * Get ticket by join token
 */
export async function getTicketByToken(joinToken) {
  const sql = `SELECT * FROM ${TICKETS_TABLE} WHERE join_token = ? LIMIT 1`;
  const [rows] = await connection.execute(sql, [joinToken]);
  return rows?.[0] || null;
}

/**
 * Get all tickets for a room
 */
export async function getRoomTickets(roomId) {
  const sql = `
    SELECT * FROM ${TICKETS_TABLE}
    WHERE room_id = ?
    ORDER BY created_at DESC
  `;
  
  const [rows] = await connection.execute(sql, [roomId]);
  return rows;
}

/**
 * Redeem ticket (use to join room)
 * ✅ NEW: Tickets always have priority - they already reserved capacity
 */
export async function redeemTicket({
  joinToken,
  playerId,
}) {
  // 1. Get ticket
  const ticket = await getTicketByToken(joinToken);
  
  if (!ticket) {
    throw new Error('Invalid ticket token');
  }
  
  // 2. Validate redemption status
  if (ticket.redemption_status === 'redeemed') {
    throw new Error('Ticket already redeemed');
  }
  
  if (ticket.redemption_status === 'blocked') {
    throw new Error('Ticket payment not yet confirmed by host');
  }
  
  if (ticket.redemption_status !== 'ready') {
    throw new Error('Ticket not ready for redemption');
  }
  
  // ✅ NOTE: We don't check capacity here because tickets ALWAYS have priority
  // They already reserved their spot when purchased
  
  // 3. Mark as redeemed
  const sql = `
    UPDATE ${TICKETS_TABLE}
    SET
      redemption_status = 'redeemed',
      redeemed_at = NOW(),
      redeemed_by_player_id = ?,
      updated_at = NOW()
    WHERE ticket_id = ?
  `;
  
  await connection.execute(sql, [playerId, ticket.ticket_id]);
  
  // 4. Update ledger entries to link to real player ID
  const tempPlayerId = `ticket_${ticket.ticket_id}`;
  
  await connection.execute(
    `UPDATE ${TABLE_PREFIX}quiz_payment_ledger 
     SET player_id = ?, player_name = ? 
     WHERE room_id = ? AND player_id = ?`,
    [playerId, ticket.player_name, ticket.room_id, tempPlayerId]
  );
  
  if (DEBUG) {
    console.log('[TicketService] ✅ Ticket redeemed:', {
      ticketId: ticket.ticket_id,
      playerId,
      playerName: ticket.player_name,
    });
  }
  
  // 5. Return ticket data for player join
  const extras = typeof ticket.extras === 'string' 
    ? JSON.parse(ticket.extras) 
    : ticket.extras || [];
  
  return {
    ticketId: ticket.ticket_id,
    roomId: ticket.room_id,
    playerName: ticket.player_name,
    entryFee: parseFloat(ticket.entry_fee),
    extras: extras.map(e => e.extraId),
    extraPayments: Object.fromEntries(
      extras.map(e => [e.extraId, {
        method: ticket.payment_method,
        amount: e.price,
      }])
    ),
    paymentMethod: ticket.payment_method,
    paid: true, // Always true for confirmed tickets
  };
}

export async function getRoomSchedule(roomId) {
  const sql = `
    SELECT room_id, status, scheduled_at, time_zone
    FROM ${WEB2_ROOMS_TABLE}
    WHERE room_id = ?
    LIMIT 1
  `;
  const [rows] = await connection.execute(sql, [roomId]);
  return rows?.[0] || null;
}

// configurable join window
export const JOIN_WINDOW_MINUTES = 10;

export function computeJoinWindow(roomRow) {
  const scheduledAt = roomRow?.scheduled_at ? new Date(roomRow.scheduled_at) : null;
  const joinOpensAt = scheduledAt
    ? new Date(scheduledAt.getTime() - JOIN_WINDOW_MINUTES * 60 * 1000)
    : null;

  const now = new Date();
  const roomStatus = roomRow?.status || null;

  // ✅ Allow join if time window is open OR room is live
  const canJoinByTime = !!joinOpensAt && now.getTime() >= joinOpensAt.getTime();
  const canJoinByStatus = roomStatus === 'live';
  
  // ✅ Block only if room is completed/cancelled
  const isRoomBlocked = roomStatus === 'completed' || roomStatus === 'cancelled';
  
  const canJoinNow = !isRoomBlocked && (canJoinByTime || canJoinByStatus);

  return {
    roomStatus,
    scheduledAt,
    joinOpensAt,
    canJoinNow,
  };
}

// NEW
export async function createTicketStripeCheckout({
  roomId,
  purchaserName,
  purchaserEmail,
  purchaserPhone = null,
  playerName = null,
  selectedExtras = [],
  appOrigin,
}) {
  // 0) capacity check
  const capacityCheck = await canPurchaseTickets(roomId, 1);
  if (!capacityCheck.allowed) throw new Error(capacityCheck.reason);

  // 1) room config
  const roomData = await getRoomConfig(roomId);
  if (!roomData) throw new Error('Room not found or not available for ticket purchase');

  const { clubId, config } = roomData;

  // 2) compute prices
  const entryFee = parseFloat(config.entryFee || 0);
  const currency =
    config.currencySymbol === '€' ? 'EUR'
    : config.currencySymbol === '£' ? 'GBP'
    : config.currencySymbol === '$' ? 'USD'
    : 'EUR';

  let extrasTotal = 0;
  const extrasWithPrices = [];

  for (const extraId of selectedExtras) {
    const price = config.fundraisingPrices?.[extraId] || 0;
    if (price > 0) {
      extrasTotal += price;
      extrasWithPrices.push({ extraId, price });
    }
  }

  const totalAmount = entryFee + extrasTotal;

  // ✅ Stripe wants amount in the smallest unit (cents)
  const totalAmountCents = Math.round(totalAmount * 100);

  // 3) get connected stripe account (ready + enabled)
  const stripeConn = await getEnabledReadyStripeForClub(clubId);
  if (!stripeConn?.accountId) throw new Error('stripe_not_ready_or_disabled');

  // 4) create ticket (reserved, but blocked until webhook confirms)
  const ticketId = nanoid(12);
  const joinToken = nanoid(16);

  await connection.execute(
    `
    INSERT INTO ${TICKETS_TABLE}
      (ticket_id, room_id, club_id, purchaser_name, purchaser_email, purchaser_phone,
       player_name, entry_fee, extras, extras_total, total_amount, currency,
       payment_status, payment_method, payment_reference, club_payment_method_id,
       redemption_status, join_token)
    VALUES
      (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'payment_claimed', 'stripe', NULL, ?, 'blocked', ?)
    `,
    [
      ticketId,
      roomId,
      clubId,
      purchaserName,
      purchaserEmail,
      purchaserPhone,
      playerName || purchaserName,
      entryFee,
      JSON.stringify(extrasWithPrices),
      extrasTotal,
      totalAmount,
      currency,
      stripeConn.clubPaymentMethodId,
      joinToken,
    ]
  );

  // 5) create ledger rows as EXPECTED (not claimed yet)
  const tempPlayerId = `ticket_${ticketId}`;

  const entryLedgerId = await createExpectedPayment({
    roomId,
    clubId,
    playerId: tempPlayerId,
    playerName: playerName || purchaserName,
    ledgerType: 'entry_fee',
    amount: entryFee,
    currency,
    paymentMethod: 'stripe',
    paymentSource: 'player_selected',
    clubPaymentMethodId: stripeConn.clubPaymentMethodId,
    ticketId,
    status: 'expected',
  });

  for (const extra of extrasWithPrices) {
    await createExpectedPayment({
      roomId,
      clubId,
      playerId: tempPlayerId,
      playerName: playerName || purchaserName,
      ledgerType: 'extra_purchase',
      amount: extra.price,
      currency,
      paymentMethod: 'stripe',
      paymentSource: 'player_selected',
      clubPaymentMethodId: stripeConn.clubPaymentMethodId,
      ticketId,
      status: 'expected',
      extraId: extra.extraId,
      extraMetadata: extra,
    });
  }

  // set ticket.ledger_id to entry fee ledger row (like you do today)
  await connection.execute(
    `UPDATE ${TICKETS_TABLE} SET ledger_id = ? WHERE ticket_id = ?`,
    [entryLedgerId, ticketId]
  );

  // 6) Create Stripe checkout session ON CONNECTED ACCOUNT
  const origin = appOrigin || process.env.APP_URL || 'http://localhost:5173';

  const session = await stripe.checkout.sessions.create(
    {
      mode: 'payment',
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: currency.toLowerCase(),
            unit_amount: totalAmountCents,
            product_data: { name: `Quiz Ticket (${roomId})` },
          },
        },
      ],
      success_url: `${origin}/quiz/${roomId}/tickets/success?ticketId=${ticketId}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/quiz/${roomId}/tickets/cancel?ticketId=${ticketId}&session_id={CHECKOUT_SESSION_ID}`,

      metadata: {
        type: 'ticket_purchase',
        ticketId,
        roomId,
        clubId,
        tempPlayerId,
      },
    },
    { stripeAccount: stripeConn.accountId }
  );

  // 7) store session id on ticket + ledger rows (reference)
  await connection.execute(
    `UPDATE ${TICKETS_TABLE} 
     SET payment_reference = ?, updated_at = NOW()
     WHERE ticket_id = ?`,
    [session.id, ticketId]
  );

  await connection.execute(
    `UPDATE ${TABLE_PREFIX}quiz_payment_ledger
     SET payment_reference = ?, updated_at = NOW()
     WHERE ticket_id = ?`,
    [session.id, ticketId]
  );

  return {
    url: session.url,
    ticketId,
    joinToken,
  };
}
