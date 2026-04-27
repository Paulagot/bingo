import Stripe from 'stripe';
import { connection, TABLE_PREFIX } from '../config/database.js';
import { sendTicketConfirmationEmail, getTicketWithRoomConfig } from '../utils/ticketEmail.js';
import { createExpectedPayment } from '../mgtsystem/services/quizPaymentLedgerService.js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-06-20' });

const TICKETS_TABLE = `${TABLE_PREFIX}quiz_tickets`;
const LEDGER_TABLE = `${TABLE_PREFIX}quiz_payment_ledger`;
const STRIPE_EVENTS_TABLE = `${TABLE_PREFIX}stripe_events`;

const DEBUG = true;

async function alreadyProcessed(eventId) {
  const [rows] = await connection.execute(
    `SELECT event_id FROM ${STRIPE_EVENTS_TABLE} WHERE event_id = ? LIMIT 1`,
    [eventId]
  );
  return rows.length > 0;
}

async function markProcessed(eventId, eventType) {
  await connection.execute(
    `INSERT INTO ${STRIPE_EVENTS_TABLE} (event_id, event_type, processed_at) VALUES (?, ?, UTC_TIMESTAMP())`,
    [eventId, eventType]
  );
}

async function confirmTicketAndLedger({ ticketId, sessionId, paymentIntentId }) {
  await connection.execute(
    `UPDATE ${TICKETS_TABLE}
     SET
       payment_status = 'payment_confirmed',
       redemption_status = 'ready',
       confirmed_at = UTC_TIMESTAMP(),
       confirmed_by = 'webhook_auto',
       confirmed_by_name = 'Stripe',
       confirmed_by_role = 'admin',
       external_transaction_id = COALESCE(external_transaction_id, ?),
       updated_at = UTC_TIMESTAMP()
     WHERE ticket_id = ?`,
    [paymentIntentId || sessionId, ticketId]
  );

  await connection.execute(
    `UPDATE ${LEDGER_TABLE}
     SET
       status = 'confirmed',
       confirmed_at = UTC_TIMESTAMP(),
       confirmed_by = 'webhook_auto',
       payment_source = 'webhook_auto',
       external_transaction_id = COALESCE(external_transaction_id, ?),
       updated_at = UTC_TIMESTAMP()
     WHERE ticket_id = ?
       AND payment_method = 'stripe'
       AND status IN ('expected','claimed')`,
    [paymentIntentId || sessionId, ticketId]
  );
}

async function confirmWalkinLedger({
  roomId,
  clubId,
  playerId,
  playerName,
  entryFee,
  extrasWithPrices,
  donationAmount,
  fundraisingMode,
  currency,
  clubPaymentMethodId,
  sessionId,
  paymentIntentId,
}) {
  const reference = paymentIntentId || sessionId;
  const isDonationRoom = fundraisingMode === 'donation';

  console.log('[StripeWebhook] 🧾 confirmWalkinLedger input:', {
  roomId,
  playerId,
  playerName,
  entryFee,
  donationAmount,
  fundraisingMode,
  isDonationRoom: fundraisingMode === 'donation',
});

  if (isDonationRoom) {
    const amount = parseFloat(donationAmount || 0);

    await createExpectedPayment({
      roomId,
      clubId,
      playerId,
      playerName,
      ledgerType: 'entry_fee',
      amount,
      currency,
      paymentMethod: 'stripe',
      paymentSource: 'webhook_auto',
      clubPaymentMethodId: clubPaymentMethodId ? parseInt(clubPaymentMethodId) : null,
      paymentReference: reference,
      status: 'confirmed',
      confirmedAt: new Date(),
      confirmedBy: 'webhook_auto',
      confirmedByName: 'Stripe',
      confirmedByRole: 'admin',
      ticketId: null,
      extraMetadata: {
        fundraisingMode: 'donation',
        donationAmount: amount,
      },
    });

    return;
  }

  // existing fixed-fee behavior
  await createExpectedPayment({
    roomId,
    clubId,
    playerId,
    playerName,
    ledgerType: 'entry_fee',
    amount: parseFloat(entryFee),
    currency,
    paymentMethod: 'stripe',
    paymentSource: 'webhook_auto',
    clubPaymentMethodId: clubPaymentMethodId ? parseInt(clubPaymentMethodId) : null,
    paymentReference: reference,
    status: 'confirmed',
    confirmedAt: new Date(),
    confirmedBy: 'webhook_auto',
    confirmedByName: 'Stripe',
    confirmedByRole: 'admin',
    ticketId: null,
  });

  for (const extra of extrasWithPrices) {
    await createExpectedPayment({
      roomId,
      clubId,
      playerId,
      playerName,
      ledgerType: 'extra_purchase',
      amount: parseFloat(extra.price),
      currency,
      paymentMethod: 'stripe',
      paymentSource: 'webhook_auto',
      clubPaymentMethodId: clubPaymentMethodId ? parseInt(clubPaymentMethodId) : null,
      paymentReference: reference,
      status: 'confirmed',
      confirmedAt: new Date(),
      confirmedBy: 'webhook_auto',
      confirmedByName: 'Stripe',
      confirmedByRole: 'admin',
      extraId: extra.extraId,
      extraMetadata: extra,
      ticketId: null,
    });
  }
}

export async function stripeWebhookHandler(req, res) {
   console.log('[StripeWebhook] 🔔 Webhook received!');
  console.log('[StripeWebhook] Method:', req.method);
  console.log('[StripeWebhook] Headers:', {
    'stripe-signature': req.headers['stripe-signature'] ? 'present' : 'MISSING',
    'stripe-account': req.headers['stripe-account'] || 'NOT PRESENT (platform account)',
  });
  console.log('[StripeWebhook] Body type:', typeof req.body);
  console.log('[StripeWebhook] Body is Buffer:', Buffer.isBuffer(req.body));
  const sig = req.headers['stripe-signature'];
  const connectAccountId = req.headers['stripe-account'];

  let event;
  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error('[StripeWebhook] ❌ Signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    if (DEBUG) console.log('[StripeWebhook] Event:', event.type, '| Connect account:', connectAccountId || 'platform');

    if (await alreadyProcessed(event.id)) {
      if (DEBUG) console.log('[StripeWebhook] 🔁 Duplicate event ignored:', event.id);
      return res.json({ received: true, duplicate: true });
    }

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const type = session?.metadata?.type;
      const sessionId = session?.id;
      const paymentIntentId = session?.payment_intent || null;

      // ── Ticket purchase ──────────────────────────────────────
      if (type === 'ticket_purchase') {
        const ticketId = session?.metadata?.ticketId;

        if (!ticketId) {
          console.warn('[StripeWebhook] ⚠️ ticket_purchase missing ticketId', { sessionId });
        } else {
          await confirmTicketAndLedger({ ticketId, sessionId, paymentIntentId });
          if (DEBUG) console.log('[StripeWebhook] ✅ Confirmed ticket + ledger:', { ticketId, sessionId });

          try {
            console.log('[StripeWebhook] 📧 Sending confirmation email for ticket:', ticketId);
            const ticketRow = await getTicketWithRoomConfig(ticketId);
            console.log('[StripeWebhook] 📧 Ticket row found:', !!ticketRow);

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

              if (DEBUG) console.log('[StripeWebhook] ✅ Email sent to:', ticketRow.purchaser_email);
            }
          } catch (emailErr) {
            console.error('[StripeWebhook] ⚠️ Email send failed (non-fatal):', emailErr.message);
            console.error('[StripeWebhook] ⚠️ Full error:', emailErr);
          }
        }

      // ── Walk-in payment ──────────────────────────────────────
    } else if (type === 'walkin_payment') {
  const {
    roomId,
    clubId,
    playerId,
    playerName,
    entryFee,
    currency,
    clubPaymentMethodId,
    donationAmount,
    fundraisingMode,
  } = session.metadata || {};

  const extrasWithPrices = JSON.parse(session.metadata?.extrasWithPrices || '[]');
  console.log('[StripeWebhook] 🧾 Walk-in metadata received:', {
  roomId,
  clubId,
  playerId,
  playerName,
  entryFee,
  donationAmount,
  fundraisingMode,
  currency,
  clubPaymentMethodId,
  extrasWithPrices,
  sessionMetadata: session.metadata,
});

  await confirmWalkinLedger({
    roomId,
    clubId,
    playerId,
    playerName,
    entryFee,
    extrasWithPrices,
    donationAmount,
    fundraisingMode,
    currency,
    clubPaymentMethodId,
    sessionId,
    paymentIntentId,
  });

  if (DEBUG) {
    console.log('[StripeWebhook] ✅ Walk-in ledger confirmed:', {
      roomId,
      playerId,
      playerName,
      fundraisingMode,
      donationAmount,
    });
  }

      } else {
        console.warn('[StripeWebhook] ⚠️ Unknown metadata type:', type, { sessionId });
      }
    }

    await markProcessed(event.id, event.type);
    return res.json({ received: true });

  } catch (err) {
    console.error('[StripeWebhook] ❌ Handler error:', err);
    return res.status(500).json({ error: 'webhook_failed' });
  }
}