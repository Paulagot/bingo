// server/stripe/stripeTicketCheckoutService.js
// UPDATED: ticketTypeId + ticketTypeName accepted, price resolved from ticketTypes,
//          both columns written to the ticket row and Stripe metadata.

import Stripe from 'stripe';
import { nanoid } from 'nanoid';
import { connection, TABLE_PREFIX } from '../config/database.js';
import { canPurchaseTickets } from '../mgtsystem/services/quizCapacityService.js';
import { createExpectedPayment } from '../mgtsystem/services/quizPaymentLedgerService.js';
import { getRoomConfig } from '../mgtsystem/services/quizTicketService.js';
import { currencyFromSymbol } from '../utils/currencyUtils.js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-06-20' });

const TICKETS_TABLE          = `${TABLE_PREFIX}quiz_tickets`;
const PAYMENT_METHODS_TABLE  = `${TABLE_PREFIX}club_payment_methods`;
const CHECKOUT_EXPIRY_MINUTES = 30;
const DEBUG = false;

export async function getReadyStripeForClub(clubId) {
  const sql = `
    SELECT id, is_enabled, method_config
    FROM ${PAYMENT_METHODS_TABLE}
    WHERE club_id = ? AND method_category = 'stripe'
    LIMIT 1
  `;
  const [rows] = await connection.execute(sql, [clubId]);
  const row = rows?.[0];
  if (!row) return null;

  const cfg = typeof row.method_config === 'string' ? JSON.parse(row.method_config) : row.method_config;
  const c   = cfg?.connect;
  const ready   = !!(c?.detailsSubmitted && c?.chargesEnabled && c?.payoutsEnabled);
  const enabled = row.is_enabled === 1 || row.is_enabled === true;

  if (!enabled || !ready || !c?.accountId) return null;
  return { clubPaymentMethodId: row.id, accountId: c.accountId };
}

/**
 * Resolve the correct ticket type price for a ticketed_event Stripe checkout.
 * Falls back to first type if ticketTypeId is not matched.
 * Returns { ticketTypeId, ticketTypeName, price } or throws.
 */
function resolveTicketTypeForStripe(config, ticketTypeId) {
  const types = Array.isArray(config.ticketTypes) && config.ticketTypes.length > 0
    ? config.ticketTypes
    : config.entryFee
      ? [{ id: 'general', name: 'General Admission', price: String(config.entryFee), isEnabled: true, quantity: null, saleEndsAt: null }]
      : [];

  if (types.length === 0) throw new Error('ticket_type_not_found — no ticket types configured');

  let type = ticketTypeId ? types.find(t => t.id === ticketTypeId) : null;
  if (!type) type = types[0];
  if (!type) throw new Error('ticket_type_not_found');

  // Basic availability checks (full check happens in quizTicketService on manual payments;
  // Stripe pre-creates the row so we do a lightweight check here)
  if (type.isEnabled === false) throw new Error(`ticket_type_unavailable — "${type.name}" is not currently available`);
  if (type.saleEndsAt && Date.now() > new Date(type.saleEndsAt).getTime()) {
    throw new Error(`ticket_type_unavailable — "${type.name}" sale has ended`);
  }

  return {
    ticketTypeId:   type.id,
    ticketTypeName: type.name,
    price:          parseFloat(type.price) || 0,
  };
}

export async function createTicketAndStripeSession({
  roomId,
  purchaserName,
  purchaserEmail,
  purchaserPhone = null,
  playerName = null,
  selectedExtras = [],
  donationAmount = null,
  appOrigin,
  ticketTypeId   = null,   // ← new
  ticketTypeName = null,   // ← new
}) {
  // 0) Capacity check
  const cap = await canPurchaseTickets(roomId, 1);
  if (!cap.allowed) throw new Error(cap.reason);

  // 1) Room config
  const roomData = await getRoomConfig(roomId);
  if (!roomData) throw new Error('Room not found or not available for ticket purchase');

  const { clubId, config, gameType } = roomData;
  const isTicketedEvent = gameType === 'ticketed_event';

  // 2) Stripe readiness
  const stripeConn = await getReadyStripeForClub(clubId);
  if (!stripeConn) throw new Error('stripe_not_ready_or_disabled');

  // 3) Pricing
  const isDonationRoom = config?.fundraisingMode === 'donation';
  const currency       = currencyFromSymbol(config.currencySymbol || '€');

  let entryFee         = 0;
  let extrasTotal      = 0;
  let extrasWithPrices = [];
  let totalAmount      = 0;

  if (isDonationRoom) {
    const parsedDonation = Number(donationAmount);
    if (!Number.isFinite(parsedDonation) || parsedDonation <= 0) {
      throw new Error('invalid_donation_amount_for_stripe_ticket');
    }
    entryFee    = parsedDonation;
    totalAmount = parsedDonation;

  } else if (isTicketedEvent) {
    // Resolve ticket type — sets ticketTypeId, ticketTypeName, price
    const resolved = resolveTicketTypeForStripe(config, ticketTypeId);
    ticketTypeId   = resolved.ticketTypeId;
    ticketTypeName = resolved.ticketTypeName;
    entryFee       = resolved.price;
    totalAmount    = entryFee;

  } else {
    entryFee = parseFloat(config.entryFee || 0);
    for (const extraId of selectedExtras) {
      const price = Number(config.fundraisingPrices?.[extraId] || 0);
      if (price > 0) {
        extrasTotal += price;
        extrasWithPrices.push({ extraId, price });
      }
    }
    totalAmount = entryFee + extrasTotal;
  }

  const totalAmountCents = Math.round(totalAmount * 100);
  if (!Number.isFinite(totalAmountCents) || totalAmountCents <= 0) {
    throw new Error('invalid_checkout_amount');
  }

  // 4) Create ticket row (reserved, blocked until webhook confirms)
  const ticketId  = nanoid(12);
  const joinToken = nanoid(16);

  const expiresAt = new Date(Date.now() + CHECKOUT_EXPIRY_MINUTES * 60 * 1000)
    .toISOString().slice(0, 19).replace('T', ' ');

  await connection.execute(
    `INSERT INTO ${TICKETS_TABLE}
       (ticket_id, room_id, club_id, purchaser_name, purchaser_email, purchaser_phone,
        player_name, entry_fee, extras, extras_total, total_amount, currency,
        payment_status, payment_method, payment_reference, club_payment_method_id,
        redemption_status, join_token, expires_at,
        ticket_type_id, ticket_type_name)
     VALUES
       (?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?,
        'payment_claimed', 'stripe', NULL, ?,
        'blocked', ?, ?,
        ?, ?)`,
    [
      ticketId, roomId, clubId, purchaserName, purchaserEmail, purchaserPhone,
      playerName || purchaserName,
      entryFee,
      JSON.stringify(extrasWithPrices),
      extrasTotal, totalAmount, currency,
      stripeConn.clubPaymentMethodId,
      joinToken, expiresAt,
      isTicketedEvent ? (ticketTypeId   || null) : null,
      isTicketedEvent ? (ticketTypeName || null) : null,
    ]
  );

  // 5) Ledger rows (EXPECTED — webhook confirms them)
  const tempPlayerId = `ticket_${ticketId}`;

  const entryLedgerId = await createExpectedPayment({
    roomId, clubId,
    playerId:   tempPlayerId,
    playerName: playerName || purchaserName,
    ledgerType: 'entry_fee',
    amount:     entryFee,
    currency,
    paymentMethod:         'stripe',
    paymentSource:         'player_selected',
    clubPaymentMethodId:   stripeConn.clubPaymentMethodId,
    ticketId,
    status: 'expected',
    extraMetadata: isDonationRoom
      ? { fundraisingMode: 'donation', donationAmount: entryFee }
      : isTicketedEvent
      ? { ticketTypeId, ticketTypeName }
      : null,
  });

  if (!isDonationRoom && !isTicketedEvent) {
    for (const extra of extrasWithPrices) {
      await createExpectedPayment({
        roomId, clubId,
        playerId:            tempPlayerId,
        playerName:          playerName || purchaserName,
        ledgerType:          'extra_purchase',
        amount:              extra.price,
        currency,
        paymentMethod:       'stripe',
        paymentSource:       'player_selected',
        clubPaymentMethodId: stripeConn.clubPaymentMethodId,
        ticketId,
        status:              'expected',
        extraId:             extra.extraId,
        extraMetadata:       extra,
      });
    }
  }

  await connection.execute(
    `UPDATE ${TICKETS_TABLE} SET ledger_id = ? WHERE ticket_id = ?`,
    [entryLedgerId, ticketId]
  );

  // 6) Stripe Checkout Session
  const origin = appOrigin || process.env.APP_URL || 'http://localhost:5173';

  // Build a meaningful product name
  let productName;
  if (isTicketedEvent) {
    productName = ticketTypeName
      ? `${ticketTypeName} Ticket`
      : 'Event Ticket';
    if (config.roomCaps?.eventTitle) productName += ` — ${config.roomCaps.eventTitle}`;
  } else if (isDonationRoom) {
    productName = `${gameType === 'elimination' ? 'Elimination' : 'Quiz'} Donation Ticket`;
  } else {
    productName = `${gameType === 'elimination' ? 'Elimination' : 'Quiz'} Ticket`;
  }

  const session = await stripe.checkout.sessions.create(
    {
      mode: 'payment',
      line_items: [{
        quantity: 1,
        price_data: {
          currency:     currency.toLowerCase(),
          unit_amount:  totalAmountCents,
          product_data: { name: productName },
        },
      }],
      success_url: `${origin}/tickets/${ticketId}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url:  `${origin}/tickets/${ticketId}/cancel?session_id={CHECKOUT_SESSION_ID}`,
      metadata: {
        type:             'ticket_purchase',
        ticketId,
        roomId,
        clubId,
        fundraisingMode:  isDonationRoom ? 'donation' : 'fixed_fee',
        donationAmount:   isDonationRoom ? String(entryFee) : '',
        entryFee:         String(entryFee),
        extrasTotal:      String(extrasTotal),
        totalAmount:      String(totalAmount),
        selectedExtras:   JSON.stringify(isDonationRoom || isTicketedEvent ? [] : selectedExtras),
        extrasWithPrices: JSON.stringify(extrasWithPrices),
        currency,
        ticketTypeId:     ticketTypeId   || '',   // ← new
        ticketTypeName:   ticketTypeName || '',   // ← new
      },
    },
    { stripeAccount: stripeConn.accountId }
  );

  // 7) Save session.id for webhook matching
  await connection.execute(
    `UPDATE ${TICKETS_TABLE} SET payment_reference = ?, updated_at = UTC_TIMESTAMP() WHERE ticket_id = ?`,
    [session.id, ticketId]
  );
  await connection.execute(
    `UPDATE ${TABLE_PREFIX}quiz_payment_ledger SET payment_reference = ?, updated_at = UTC_TIMESTAMP() WHERE ticket_id = ?`,
    [session.id, ticketId]
  );

  if (DEBUG) {
    console.log('[StripeTicket] ✅ Created session:', { ticketId, sessionId: session.id, roomId, totalAmount, currency, ticketTypeId, ticketTypeName });
  }

  return { url: session.url, ticketId };
}