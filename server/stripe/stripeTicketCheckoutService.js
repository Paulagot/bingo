// server/stripe/stripeTicketCheckoutService.js
// CHANGES from original:
//   1. Stripe checkout session now expires after 30 minutes (expires_after: { minutes: 30 })
//   2. expires_at column set on ticket row at creation time (UTC + 30 min)
//   3. No other logic changed

import Stripe from 'stripe';
import { nanoid } from 'nanoid';
import { connection, TABLE_PREFIX } from '../config/database.js';
import { canPurchaseTickets } from '../mgtsystem/services/quizCapacityService.js';
import { createExpectedPayment } from '../mgtsystem/services/quizPaymentLedgerService.js';
import { getRoomConfig } from '../mgtsystem/services/quizTicketService.js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-06-20' });

const TICKETS_TABLE = `${TABLE_PREFIX}quiz_tickets`;
const PAYMENT_METHODS_TABLE = `${TABLE_PREFIX}club_payment_methods`;

// Session expires after 30 minutes — Stripe minimum is 30, maximum is 24 hours
const CHECKOUT_EXPIRY_MINUTES = 30;

const DEBUG = true;

function currencyFromSymbol(symbol) {
  if (symbol === '€') return 'EUR';
  if (symbol === '£') return 'GBP';
  if (symbol === '$') return 'USD';
  return 'EUR';
}

export async function getReadyStripeForClub(clubId) {
  const sql = `
    SELECT id, is_enabled, method_config
    FROM ${PAYMENT_METHODS_TABLE}
    WHERE club_id = ?
      AND method_category = 'stripe'
    LIMIT 1
  `;

  const [rows] = await connection.execute(sql, [clubId]);
  const row = rows?.[0];
  if (!row) return null;

  const cfg =
    typeof row.method_config === 'string'
      ? JSON.parse(row.method_config)
      : row.method_config;

  const c = cfg?.connect;

  const ready = !!(c?.detailsSubmitted && c?.chargesEnabled && c?.payoutsEnabled);
  const enabled = row.is_enabled === 1 || row.is_enabled === true;

  if (!enabled || !ready || !c?.accountId) return null;

  return {
    clubPaymentMethodId: row.id,
    accountId: c.accountId,
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
}) {
  // 0) Capacity first
  const cap = await canPurchaseTickets(roomId, 1);
  if (!cap.allowed) throw new Error(cap.reason);

  // 1) Room config
  const roomData = await getRoomConfig(roomId);
  if (!roomData) throw new Error('Room not found or not available for ticket purchase');

  const { clubId, config } = roomData;

  // 2) Stripe readiness
  const stripeConn = await getReadyStripeForClub(clubId);
  if (!stripeConn) throw new Error('stripe_not_ready_or_disabled');

  // 3) Pricing
  const isDonationRoom = config?.fundraisingMode === 'donation';
  const currency = currencyFromSymbol(config.currencySymbol || '€');

  let entryFee = 0;
  let extrasTotal = 0;
  let extrasWithPrices = [];
  let totalAmount = 0;

  if (isDonationRoom) {
    const parsedDonation = Number(donationAmount);

    if (!Number.isFinite(parsedDonation) || parsedDonation <= 0) {
      throw new Error('invalid_donation_amount_for_stripe_ticket');
    }

    entryFee = parsedDonation;
    extrasTotal = 0;
    extrasWithPrices = [];
    totalAmount = parsedDonation;

    if (DEBUG) {
      console.log('[StripeTicket] 💖 Donation ticket checkout:', {
        roomId,
        purchaserName,
        playerName: playerName || purchaserName,
        donationAmount: parsedDonation,
        currency,
      });
    }
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

  // 4) Create ticket — reserved but blocked until webhook confirms
  //    expires_at is set so the cleanup job / webhook can hard-delete it
  //    if the user abandons or payment fails.
  const ticketId = nanoid(12);
  const joinToken = nanoid(16);

  // Calculate expiry timestamp as a MySQL-compatible UTC string
  const expiresAt = new Date(Date.now() + CHECKOUT_EXPIRY_MINUTES * 60 * 1000)
    .toISOString()
    .slice(0, 19)
    .replace('T', ' '); // '2025-01-15 14:32:00'

  await connection.execute(
    `
    INSERT INTO ${TICKETS_TABLE}
      (ticket_id, room_id, club_id, purchaser_name, purchaser_email, purchaser_phone,
       player_name, entry_fee, extras, extras_total, total_amount, currency,
       payment_status, payment_method, payment_reference, club_payment_method_id,
       redemption_status, join_token, expires_at)
    VALUES
      (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'payment_claimed', 'stripe', NULL, ?, 'blocked', ?, ?)
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
      expiresAt,  // ✅ NEW
    ]
  );

  // 5) Create ledger rows as EXPECTED. Webhook confirms them.
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
    extraMetadata: isDonationRoom
      ? { fundraisingMode: 'donation', donationAmount: entryFee }
      : null,
  });

  if (!isDonationRoom) {
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
  }

  await connection.execute(
    `UPDATE ${TICKETS_TABLE} SET ledger_id = ? WHERE ticket_id = ?`,
    [entryLedgerId, ticketId]
  );

  // 6) Create Stripe Checkout Session
  //    expires_after.minutes tells Stripe to expire the session after 30 min,
  //    which triggers the checkout.session.expired webhook we handle in stripeWebhooks.js
  const origin = appOrigin || process.env.APP_URL || 'http://localhost:5173';

  const session = await stripe.checkout.sessions.create(
    {
      mode: 'payment',
      expires_after: { minutes: CHECKOUT_EXPIRY_MINUTES }, // ✅ NEW
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: currency.toLowerCase(),
            unit_amount: totalAmountCents,
            product_data: {
              name: isDonationRoom ? `Quiz Donation Ticket` : `Quiz Ticket`,
            },
          },
        },
      ],
      success_url: `${origin}/tickets/${ticketId}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url:  `${origin}/tickets/${ticketId}/cancel?session_id={CHECKOUT_SESSION_ID}`,
      metadata: {
        type: 'ticket_purchase',
        ticketId,
        roomId,
        clubId,
        fundraisingMode: isDonationRoom ? 'donation' : 'fixed_fee',
        donationAmount: isDonationRoom ? String(entryFee) : '',
        entryFee: String(entryFee),
        extrasTotal: String(extrasTotal),
        totalAmount: String(totalAmount),
        selectedExtras: JSON.stringify(isDonationRoom ? [] : selectedExtras),
        extrasWithPrices: JSON.stringify(extrasWithPrices),
        currency,
      },
    },
    { stripeAccount: stripeConn.accountId }
  );

  // 7) Save session.id so webhook can match it
  await connection.execute(
    `UPDATE ${TICKETS_TABLE}
     SET payment_reference = ?, updated_at = UTC_TIMESTAMP()
     WHERE ticket_id = ?`,
    [session.id, ticketId]
  );

  await connection.execute(
    `UPDATE ${TABLE_PREFIX}quiz_payment_ledger
     SET payment_reference = ?, updated_at = UTC_TIMESTAMP()
     WHERE ticket_id = ?`,
    [session.id, ticketId]
  );

  if (DEBUG) {
    console.log('[StripeTicket] ✅ Created session:', {
      ticketId,
      sessionId: session.id,
      roomId,
      totalAmount,
      currency,
      expiresAt,
      fundraisingMode: isDonationRoom ? 'donation' : 'fixed_fee',
    });
  }

  return { url: session.url, ticketId };
}