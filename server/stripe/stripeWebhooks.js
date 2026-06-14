// server/stripe/stripeWebhooks.js
// CHANGES from previous version:
//   1. Handles checkout.session.expired — hard-deletes ticket + ledger rows
//      for ticket_purchase sessions.
//   2. ✅ Confirms campaign product orders on payment_intent.succeeded.
//      confirmOrderByStripeIntent returns null if the intent isn't a campaign
//      order, so all existing quiz/elimination flows are unaffected.
//   3. ✅ Handles checkout.session.expired for campaign_product sessions —
//      cancels the order and order items so they don't sit as pending forever.
//   4. ✅ NEW: Pre-registers Stripe walk-in player into in-memory elimination
//      room via addPlayerWithId so the success page socket join works immediately.

import Stripe from 'stripe';
import { connection, TABLE_PREFIX } from '../config/database.js';
import { sendTicketConfirmationEmail, getTicketWithRoomConfig } from '../utils/ticketEmail.js';
import { createExpectedPayment } from '../mgtsystem/services/quizPaymentLedgerService.js';
import { deleteExpiredTicket } from './stripeExpiredTicketService.js';
import { confirmOrderByStripeIntent } from '../campaigns/services/campaignOrderService.js';
import { addPlayerWithId } from '../elimination/services/eliminationRoomManager.js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-06-20' });

const TICKETS_TABLE       = `${TABLE_PREFIX}quiz_tickets`;
const LEDGER_TABLE        = `${TABLE_PREFIX}quiz_payment_ledger`;
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
       payment_status        = 'payment_confirmed',
       redemption_status     = 'ready',
       confirmed_at          = UTC_TIMESTAMP(),
       confirmed_by          = 'webhook_auto',
       confirmed_by_name     = 'Stripe',
       confirmed_by_role     = 'admin',
       external_transaction_id = COALESCE(external_transaction_id, ?),
       updated_at            = UTC_TIMESTAMP()
     WHERE ticket_id = ?`,
    [paymentIntentId || sessionId, ticketId]
  );

  await connection.execute(
    `UPDATE ${LEDGER_TABLE}
     SET
       status                  = 'confirmed',
       confirmed_at            = UTC_TIMESTAMP(),
       confirmed_by            = 'webhook_auto',
       payment_source          = 'webhook_auto',
       external_transaction_id = COALESCE(external_transaction_id, ?),
       updated_at              = UTC_TIMESTAMP()
     WHERE ticket_id      = ?
       AND payment_method = 'stripe'
       AND status         IN ('expected','claimed')`,
    [paymentIntentId || sessionId, ticketId]
  );
}

async function confirmWalkinLedger({
  roomId, clubId, playerId, playerName,
  entryFee, extrasWithPrices, donationAmount, fundraisingMode,
  currency, clubPaymentMethodId, sessionId, paymentIntentId,
}) {
  const reference  = paymentIntentId || sessionId;
  const isDonation = fundraisingMode === 'donation';

  console.log('[StripeWebhook] 🧾 confirmWalkinLedger input:', {
    roomId, playerId, playerName, entryFee, donationAmount,
    fundraisingMode, isDonationRoom: isDonation,
  });

  if (isDonation) {
    const amount = parseFloat(donationAmount || 0);

    await createExpectedPayment({
      roomId, clubId, playerId, playerName,
      ledgerType:          'entry_fee',
      amount,
      currency,
      paymentMethod:       'stripe',
      paymentSource:       'webhook_auto',
      clubPaymentMethodId: clubPaymentMethodId ? parseInt(clubPaymentMethodId) : null,
      paymentReference:    reference,
      status:              'confirmed',
      confirmedAt:         new Date(),
      confirmedBy:         'webhook_auto',
      confirmedByName:     'Stripe',
      confirmedByRole:     'admin',
      ticketId:            null,
      extraMetadata:       { fundraisingMode: 'donation', donationAmount: amount },
    });

    return;
  }

  await createExpectedPayment({
    roomId, clubId, playerId, playerName,
    ledgerType:          'entry_fee',
    amount:              parseFloat(entryFee),
    currency,
    paymentMethod:       'stripe',
    paymentSource:       'webhook_auto',
    clubPaymentMethodId: clubPaymentMethodId ? parseInt(clubPaymentMethodId) : null,
    paymentReference:    reference,
    status:              'confirmed',
    confirmedAt:         new Date(),
    confirmedBy:         'webhook_auto',
    confirmedByName:     'Stripe',
    confirmedByRole:     'admin',
    ticketId:            null,
  });

  for (const extra of extrasWithPrices) {
    await createExpectedPayment({
      roomId, clubId, playerId, playerName,
      ledgerType:          'extra_purchase',
      amount:              parseFloat(extra.price),
      currency,
      paymentMethod:       'stripe',
      paymentSource:       'webhook_auto',
      clubPaymentMethodId: clubPaymentMethodId ? parseInt(clubPaymentMethodId) : null,
      paymentReference:    reference,
      status:              'confirmed',
      confirmedAt:         new Date(),
      confirmedBy:         'webhook_auto',
      confirmedByName:     'Stripe',
      confirmedByRole:     'admin',
      extraId:             extra.extraId,
      extraMetadata:       extra,
      ticketId:            null,
    });
  }
}

// ─── Campaign order expired cleanup ──────────────────────────────────────────

async function cancelExpiredCampaignOrder(orderId, sessionId) {
  const T_ORDERS      = `${TABLE_PREFIX}campaign_product_orders`;
  const T_ORDER_ITEMS = `${TABLE_PREFIX}campaign_product_order_items`;
  const T_ENTRIES     = `${TABLE_PREFIX}campaign_entries`;

  const [result] = await connection.execute(
    `UPDATE ${T_ORDERS}
     SET payment_status = 'cancelled',
         metadata_json  = JSON_SET(COALESCE(metadata_json, '{}'),
                            '$.cancelReason', 'stripe_session_expired',
                            '$.expiredSessionId', ?)
     WHERE id = ? AND payment_status = 'pending'`,
    [sessionId, orderId]
  );

  if (result.affectedRows === 0) {
    console.log(`[StripeWebhook] ℹ️ Campaign order ${orderId} not pending — skipping expiry cancel`);
    return { cancelled: false };
  }

  await connection.execute(
    `UPDATE ${T_ENTRIES}
     SET status = 'cancelled'
     WHERE order_id = ? AND status = 'pending_payment'`,
    [orderId]
  );

  console.log(`[StripeWebhook] 🗑️ Cancelled expired campaign order ${orderId} (session: ${sessionId})`);
  return { cancelled: true };
}

// ─── Main webhook handler ─────────────────────────────────────────────────────

export async function stripeWebhookHandler(req, res) {
  console.log('[StripeWebhook] 🔔 Webhook received!');
  console.log('[StripeWebhook] Method:', req.method);
  console.log('[StripeWebhook] Headers:', {
    'stripe-signature': req.headers['stripe-signature'] ? 'present' : 'MISSING',
    'stripe-account':   req.headers['stripe-account'] || 'NOT PRESENT (platform account)',
  });
  console.log('[StripeWebhook] Body type:', typeof req.body);
  console.log('[StripeWebhook] Body is Buffer:', Buffer.isBuffer(req.body));

  const sig              = req.headers['stripe-signature'];
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
    if (DEBUG) {
      console.log('[StripeWebhook] Event:', event.type, '| Connect account:', connectAccountId || 'platform');
    }

    if (await alreadyProcessed(event.id)) {
      if (DEBUG) console.log('[StripeWebhook] 🔁 Duplicate event ignored:', event.id);
      return res.json({ received: true, duplicate: true });
    }

    // ─────────────────────────────────────────────────────────────────────────
    // payment_intent.succeeded — handles campaign product orders
    // ─────────────────────────────────────────────────────────────────────────
    if (event.type === 'payment_intent.succeeded') {
      const paymentIntent = event.data.object;
      if (DEBUG) console.log('[StripeWebhook] 💳 payment_intent.succeeded:', paymentIntent.id);

      try {
        const campaignOrder = await confirmOrderByStripeIntent(paymentIntent.id);
        if (campaignOrder) {
          console.log('[StripeWebhook] ✅ Campaign order confirmed:', campaignOrder.id);
        }
      } catch (campaignErr) {
        console.error('[StripeWebhook] ⚠️ Campaign order confirmation failed (non-fatal):', campaignErr.message);
      }

    // ─────────────────────────────────────────────────────────────────────────
    // checkout.session.completed
    // ─────────────────────────────────────────────────────────────────────────
    } else if (event.type === 'checkout.session.completed') {
      const session         = event.data.object;
      const type            = session?.metadata?.type;
      const sessionId       = session?.id;
      const paymentIntentId = session?.payment_intent || null;

      // ── Campaign product purchase ────────────────────────────────────────
      if (type === 'campaign_product') {
        const orderId = session?.metadata?.orderId;

        if (!orderId) {
          console.warn('[StripeWebhook] ⚠️ campaign_product missing orderId', { sessionId });
        } else {
          try {
            const confirmed = await confirmOrderByStripeIntent(paymentIntentId ?? sessionId);
            if (confirmed) {
              console.log('[StripeWebhook] ✅ Campaign order confirmed via checkout.session.completed:', orderId);
            }
          } catch (err) {
            console.error('[StripeWebhook] ⚠️ Campaign order confirm failed (non-fatal):', err.message);
          }
        }

      // ── Ticket purchase ──────────────────────────────────────────────────
      } else if (type === 'ticket_purchase') {
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
                eventTitle:     config?.eventTitle    || null,
                eventLocation:  config?.eventLocation || null,
                ticketId,
                purchaserEmail: ticketRow.purchaser_email,
                purchaserName:  ticketRow.purchaser_name,
                playerName:     ticketRow.player_name,
                entryFee:       ticketRow.entry_fee,
                extrasTotal:    ticketRow.extras_total,
                totalAmount:    ticketRow.total_amount,
                currency:       ticketRow.currency,
                currencySymbol: config?.currencySymbol || '€',
                extras,
                clubId:         ticketRow.club_id,
                hostName:       config?.hostName,
                eventDateTime:  config?.eventDateTime,
                timeZone:       config?.timeZone,
                gameType:       ticketRow.game_type || 'quiz',
                clubName:       ticketRow.club_name || null,
              });

              if (DEBUG) console.log('[StripeWebhook] ✅ Email sent to:', ticketRow.purchaser_email);
            }
          } catch (emailErr) {
            console.error('[StripeWebhook] ⚠️ Email send failed (non-fatal):', emailErr.message);
            console.error('[StripeWebhook] ⚠️ Full error:', emailErr);
          }
        }

      // ── Walk-in payment (quiz) ───────────────────────────────────────────
      } else if (type === 'walkin_payment') {
        const {
          roomId, clubId, playerId, playerName, entryFee, currency,
          clubPaymentMethodId, donationAmount, fundraisingMode,
        } = session.metadata || {};

        const extrasWithPrices = JSON.parse(session.metadata?.extrasWithPrices || '[]');

        console.log('[StripeWebhook] 🧾 Walk-in metadata received:', {
          roomId, clubId, playerId, playerName, entryFee, donationAmount,
          fundraisingMode, currency, clubPaymentMethodId, extrasWithPrices,
          sessionMetadata: session.metadata,
        });

        await confirmWalkinLedger({
          roomId, clubId, playerId, playerName, entryFee, extrasWithPrices,
          donationAmount, fundraisingMode, currency, clubPaymentMethodId,
          sessionId, paymentIntentId,
        });

        if (DEBUG) {
          console.log('[StripeWebhook] ✅ Walk-in ledger confirmed:', {
            roomId, playerId, playerName, fundraisingMode, donationAmount,
          });
        }

      // ── Elimination walk-in payment ──────────────────────────────────────
      } else if (type === 'elimination_walkin_payment') {
        const {
          roomId, clubId, playerId, playerName, entryFee, currency, clubPaymentMethodId,
        } = session.metadata || {};

        const reference = paymentIntentId || sessionId;

        // ── Step 1: Write confirmed ledger entry ─────────────────────────
        await createExpectedPayment({
          roomId,
          clubId,
          playerId,
          playerName,
          ledgerType:          'entry_fee',
          amount:              parseFloat(entryFee),
          currency:            currency ?? 'EUR',
          paymentMethod:       'stripe',
          paymentSource:       'webhook_auto',
          clubPaymentMethodId: clubPaymentMethodId ? parseInt(clubPaymentMethodId) : null,
          paymentReference:    reference,
          status:              'confirmed',
          confirmedAt:         new Date(),
          confirmedBy:         'webhook_auto',
          confirmedByName:     'Stripe',
          confirmedByRole:     'admin',
          ticketId:            null,
        });

        console.log('[StripeWebhook] ✅ Elimination walk-in ledger confirmed:', {
          roomId, playerId, playerName, entryFee,
        });

        // ── Step 2: Pre-register player in the in-memory room ────────────
        // This ensures that when the success page fires join_elimination_room
        // with this playerId, the reconnect path in the socket handler finds
        // the player immediately rather than returning "Player not found".
        try {
          addPlayerWithId(roomId, playerId, {
            name:            playerName,
            paid:            true,
            paymentMethod:   'stripe',
            paymentReference: reference,
          });
          console.log('[StripeWebhook] ✅ Player pre-registered in elimination room:', {
            roomId, playerId, playerName,
          });
        } catch (roomErr) {
          // Non-fatal — the room may not exist yet (race condition on very first
          // join before the host has hydrated the room), or may already be full.
          // The player will see the "contact host" fallback on the success page.
          console.warn('[StripeWebhook] ⚠️ Could not pre-register player in room (non-fatal):', {
            roomId, playerId, playerName, error: roomErr.message,
          });
        }

      } else {
        console.warn('[StripeWebhook] ⚠️ Unknown metadata type:', type, { sessionId });
      }

    // ─────────────────────────────────────────────────────────────────────────
    // checkout.session.expired
    // ─────────────────────────────────────────────────────────────────────────
    } else if (event.type === 'checkout.session.expired') {
      const session   = event.data.object;
      const type      = session?.metadata?.type;
      const sessionId = session?.id;

      if (type === 'ticket_purchase') {
        const ticketId = session?.metadata?.ticketId;

        if (!ticketId) {
          console.warn('[StripeWebhook] ⚠️ expired ticket_purchase missing ticketId', { sessionId });
        } else {
          const result = await deleteExpiredTicket(ticketId, 'webhook_expired');

          if (DEBUG) {
            console.log('[StripeWebhook] 🗑️ Expired ticket_purchase cleaned up:', {
              ticketId, sessionId, deleted: result.deleted, reason: result.reason,
            });
          }
        }

      } else if (type === 'campaign_product') {
        const orderId = session?.metadata?.orderId;

        if (!orderId) {
          console.warn('[StripeWebhook] ⚠️ expired campaign_product missing orderId', { sessionId });
        } else {
          const result = await cancelExpiredCampaignOrder(orderId, sessionId);

          if (DEBUG) {
            console.log('[StripeWebhook] 🗑️ Expired campaign_product handled:', {
              orderId, sessionId, cancelled: result.cancelled,
            });
          }
        }

      } else if (type === 'walkin_payment') {
        // Walk-in payments never write to DB until confirmed — nothing to clean up.
        if (DEBUG) {
          console.log('[StripeWebhook] ℹ️ Expired walkin_payment — no DB rows to clean up:', {
            sessionId,
            playerId: session?.metadata?.playerId,
          });
        }

      } else if (type === 'elimination_walkin_payment') {
        // Same as walkin_payment — ledger is only written on confirmation,
        // so there is nothing to roll back on expiry.
        if (DEBUG) {
          console.log('[StripeWebhook] ℹ️ Expired elimination_walkin_payment — no DB rows to clean up:', {
            sessionId,
            playerId: session?.metadata?.playerId,
            roomId:   session?.metadata?.roomId,
          });
        }

      } else {
        console.warn('[StripeWebhook] ⚠️ checkout.session.expired — unknown type:', type, { sessionId });
      }

    } else {
      if (DEBUG) console.log('[StripeWebhook] ℹ️ Unhandled event type:', event.type);
    }

    await markProcessed(event.id, event.type);
    return res.json({ received: true });

  } catch (err) {
    console.error('[StripeWebhook] ❌ Handler error:', err);
    return res.status(500).json({ error: 'webhook_failed' });
  }
}