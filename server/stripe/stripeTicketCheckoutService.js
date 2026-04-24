// server/quiz/services/stripeTicketCheckoutService.js
import Stripe from 'stripe';
import { nanoid } from 'nanoid';
import { connection, TABLE_PREFIX } from '../config/database.js';
import { canPurchaseTickets } from '../mgtsystem/services/quizCapacityService.js';
import { createExpectedPayment } from '../mgtsystem/services/quizPaymentLedgerService.js';
import { getRoomConfig } from '../mgtsystem/services/quizTicketService.js'; // you already have

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-06-20' });

const TICKETS_TABLE = `${TABLE_PREFIX}quiz_tickets`;
const PAYMENT_METHODS_TABLE = `${TABLE_PREFIX}club_payment_methods`;

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

  const cfg = typeof row.method_config === 'string' ? JSON.parse(row.method_config) : row.method_config;
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
  const entryFee = parseFloat(config.entryFee || 0);
  const currency = currencyFromSymbol(config.currencySymbol || '€');

  let extrasTotal = 0;
  const extrasWithPrices = [];

  for (const extraId of selectedExtras) {
    const price = Number(config.fundraisingPrices?.[extraId] || 0);
    if (price > 0) {
      extrasTotal += price;
      extrasWithPrices.push({ extraId, price });
    }
  }

  const totalAmount = entryFee + extrasTotal;

  // Stripe uses smallest unit
  const totalAmountCents = Math.round(totalAmount * 100);

  // 4) Create ticket (reserved but blocked until webhook confirms)
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

  // 5) Create ledger rows as EXPECTED (webhook will confirm)
  const tempPlayerId = `ticket_${ticketId}`;

  // IMPORTANT: fix your createExpectedPayment dedupe bug separately:
  // return existing[0].id (not ledger_id)

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

  await connection.execute(
    `UPDATE ${TICKETS_TABLE} SET ledger_id = ? WHERE ticket_id = ?`,
    [entryLedgerId, ticketId]
  );

  // 6) Create Stripe Checkout Session ON CLUB CONNECTED ACCOUNT
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
            product_data: { name: `Quiz Ticket` },
          },
        },
      ],
      success_url: `${origin}/tickets/${ticketId}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/tickets/${ticketId}/cancel?session_id={CHECKOUT_SESSION_ID}`,

      metadata: {
        type: 'ticket_purchase',
        ticketId,
        roomId,
        clubId,
      },
    },
    { stripeAccount: stripeConn.accountId }
  );

  // 7) Save session.id so webhook can also match by reference if needed
  await connection.execute(
    `UPDATE ${TICKETS_TABLE} SET payment_reference = ?, updated_at = UTC_TIMESTAMP() WHERE ticket_id = ?`,
    [session.id, ticketId]
  );

  await connection.execute(
    `UPDATE ${TABLE_PREFIX}quiz_payment_ledger
     SET payment_reference = ?, updated_at = UTC_TIMESTAMP()
     WHERE ticket_id = ?`,
    [session.id, ticketId]
  );

  if (DEBUG) console.log('[StripeTicket] ✅ Created session:', { ticketId, sessionId: session.id });

  return { url: session.url, ticketId };
}