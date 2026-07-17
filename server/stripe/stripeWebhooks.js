// server/stripe/stripeWebhooks.js
// CHANGES from previous version:
//   1. Handles checkout.session.expired — hard-deletes ticket + ledger rows
//      for ticket_purchase sessions.
//   2. Confirms campaign product orders on payment_intent.succeeded.
//   3. Handles checkout.session.expired for campaign_product sessions.
//   4. Pre-registers Stripe walk-in players into in-memory elimination rooms.
//   5. Confirms and fulfils peer-to-peer fundraiser orders.
//   6. Cancels expired peer-to-peer Stripe orders.

import Stripe from 'stripe';
import { connection, TABLE_PREFIX } from '../config/database.js';
import {
  sendTicketConfirmationEmail,
  getTicketWithRoomConfig,
} from '../utils/ticketEmail.js';
import { createExpectedPayment } from '../mgtsystem/services/quizPaymentLedgerService.js';
import { deleteExpiredTicket } from './stripeExpiredTicketService.js';
import { confirmOrderByStripeIntent } from '../campaigns/services/campaignOrderService.js';
import { addPlayerWithId } from '../elimination/services/eliminationRoomManager.js';
import {
  confirmDonation,
  markDonationStatus,
} from '../donations/services/DonationLedgerService.js';
import {
  confirmSubscriptionCheckout,
  updateSubscriptionPeriodEnd,
  markSubscriptionPastDue,
  markSubscriptionCancelled,
  getSubscriptionBillingContext,
} from '../puzzles/services/puzzleSubscriptionPaymentService.js';
import { maybeAutoCompleteChallenge } from '../puzzles/services/challengeService.js';
import {
  confirmPeerOrder,
  cancelExpiredPeerOrder,
} from '../peerFundraising/services/peerOrderCompletionService.js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-06-20',
});

const TICKETS_TABLE       = `${TABLE_PREFIX}quiz_tickets`;
const LEDGER_TABLE        = `${TABLE_PREFIX}quiz_payment_ledger`;
const STRIPE_EVENTS_TABLE = `${TABLE_PREFIX}stripe_events`;

const DEBUG = true;

// ─────────────────────────────────────────────────────────────────────────────
// Stripe event idempotency
// ─────────────────────────────────────────────────────────────────────────────

async function alreadyProcessed(eventId) {
  const [rows] = await connection.execute(
    `SELECT event_id
     FROM ${STRIPE_EVENTS_TABLE}
     WHERE event_id = ?
     LIMIT 1`,
    [eventId]
  );

  return rows.length > 0;
}

async function markProcessed(eventId, eventType) {
  await connection.execute(
    `INSERT INTO ${STRIPE_EVENTS_TABLE}
      (event_id, event_type, processed_at)
     VALUES (?, ?, UTC_TIMESTAMP())`,
    [eventId, eventType]
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Standard ticket confirmation
// ─────────────────────────────────────────────────────────────────────────────

async function confirmTicketAndLedger({
  ticketId,
  sessionId,
  paymentIntentId,
}) {
  await connection.execute(
    `UPDATE ${TICKETS_TABLE}
     SET
       payment_status          = 'payment_confirmed',
       redemption_status       = 'ready',
       confirmed_at            = UTC_TIMESTAMP(),
       confirmed_by            = 'webhook_auto',
       confirmed_by_name       = 'Stripe',
       confirmed_by_role       = 'admin',
       external_transaction_id = COALESCE(external_transaction_id, ?),
       updated_at              = UTC_TIMESTAMP()
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
       AND status         IN ('expected', 'claimed')`,
    [paymentIntentId || sessionId, ticketId]
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Quiz walk-in ledger
// ─────────────────────────────────────────────────────────────────────────────

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
  const reference  = paymentIntentId || sessionId;
  const isDonation = fundraisingMode === 'donation';

  console.log('[StripeWebhook] confirmWalkinLedger input:', {
    roomId,
    playerId,
    playerName,
    entryFee,
    donationAmount,
    fundraisingMode,
    isDonationRoom: isDonation,
  });

  if (isDonation) {
    const amount = parseFloat(donationAmount || 0);

    await createExpectedPayment({
      roomId,
      clubId,
      playerId,
      playerName,
      ledgerType:          'entry_fee',
      amount,
      currency,
      paymentMethod:       'stripe',
      paymentSource:       'webhook_auto',
      clubPaymentMethodId: clubPaymentMethodId
        ? parseInt(clubPaymentMethodId, 10)
        : null,
      paymentReference: reference,
      status:           'confirmed',
      confirmedAt:      new Date(),
      confirmedBy:      'webhook_auto',
      confirmedByName:  'Stripe',
      confirmedByRole:  'admin',
      ticketId:         null,
      extraMetadata: {
        fundraisingMode: 'donation',
        donationAmount: amount,
      },
    });

    return;
  }

  await createExpectedPayment({
    roomId,
    clubId,
    playerId,
    playerName,
    ledgerType:          'entry_fee',
    amount:              parseFloat(entryFee),
    currency,
    paymentMethod:       'stripe',
    paymentSource:       'webhook_auto',
    clubPaymentMethodId: clubPaymentMethodId
      ? parseInt(clubPaymentMethodId, 10)
      : null,
    paymentReference: reference,
    status:           'confirmed',
    confirmedAt:      new Date(),
    confirmedBy:      'webhook_auto',
    confirmedByName:  'Stripe',
    confirmedByRole:  'admin',
    ticketId:         null,
  });

  for (const extra of extrasWithPrices) {
    await createExpectedPayment({
      roomId,
      clubId,
      playerId,
      playerName,
      ledgerType:          'extra_purchase',
      amount:              parseFloat(extra.price),
      currency,
      paymentMethod:       'stripe',
      paymentSource:       'webhook_auto',
      clubPaymentMethodId: clubPaymentMethodId
        ? parseInt(clubPaymentMethodId, 10)
        : null,
      paymentReference: reference,
      status:           'confirmed',
      confirmedAt:      new Date(),
      confirmedBy:      'webhook_auto',
      confirmedByName:  'Stripe',
      confirmedByRole:  'admin',
      extraId:          extra.extraId,
      extraMetadata:    extra,
      ticketId:         null,
    });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Puzzle subscription ledger
// ─────────────────────────────────────────────────────────────────────────────

async function writePuzzleSubscriptionLedgerEntry({
  stripeSubscriptionId,
  externalTransactionId,
  paymentReference,
  context,
}) {
  try {
    const billing = await getSubscriptionBillingContext({
      stripeSubscriptionId,
    });

    if (!billing || !billing.room_id) {
      console.warn(
        '[StripeWebhook] Puzzle subscription ledger skipped — no billing context or room ID:',
        {
          stripeSubscriptionId,
          context,
        }
      );

      return;
    }

    await createExpectedPayment({
      roomId:               billing.room_id,
      clubId:               billing.club_id,
      playerId:             billing.player_id,
      playerName:           billing.player_name,
      ledgerType:           'entry_fee',
      amount:               Number(billing.weekly_price) / 100,
      currency:             (billing.currency || 'eur').toUpperCase(),
      paymentMethod:        'stripe',
      paymentSource:        'webhook_auto',
      externalTransactionId,
      paymentReference,
      status:               'confirmed',
      confirmedAt:          new Date(),
      confirmedBy:          'webhook_auto',
      confirmedByName:      'Stripe Webhook',
      confirmedByRole:      'system',
    });

    if (DEBUG) {
      console.log(
        '[StripeWebhook] Puzzle subscription ledger row written:',
        {
          context,
          stripeSubscriptionId,
          roomId:   billing.room_id,
          playerId: billing.player_id,
        }
      );
    }
  } catch (ledgerErr) {
    console.error(
      '[StripeWebhook] Puzzle subscription ledger write failed (non-fatal):',
      {
        context,
        stripeSubscriptionId,
        error: ledgerErr.message,
      }
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Expired campaign product order
// Remove this once the old campaign-product feature is fully deleted.
// ─────────────────────────────────────────────────────────────────────────────

async function cancelExpiredCampaignOrder(orderId, sessionId) {
  const T_ORDERS  = `${TABLE_PREFIX}campaign_product_orders`;
  const T_ENTRIES = `${TABLE_PREFIX}campaign_entries`;

  const [result] = await connection.execute(
    `UPDATE ${T_ORDERS}
     SET
       payment_status = 'cancelled',
       metadata_json = JSON_SET(
         COALESCE(metadata_json, '{}'),
         '$.cancelReason',
         'stripe_session_expired',
         '$.expiredSessionId',
         ?
       )
     WHERE id = ?
       AND payment_status = 'pending'`,
    [sessionId, orderId]
  );

  if (result.affectedRows === 0) {
    console.log(
      `[StripeWebhook] Campaign order ${orderId} is not pending — expiry skipped`
    );

    return { cancelled: false };
  }

  await connection.execute(
    `UPDATE ${T_ENTRIES}
     SET status = 'cancelled'
     WHERE order_id = ?
       AND status = 'pending_payment'`,
    [orderId]
  );

  console.log(
    `[StripeWebhook] Cancelled expired campaign order ${orderId}`
  );

  return { cancelled: true };
}

// ─────────────────────────────────────────────────────────────────────────────
// Main webhook handler
// ─────────────────────────────────────────────────────────────────────────────

export async function stripeWebhookHandler(req, res) {
  console.log('[StripeWebhook] Webhook received');
  console.log('[StripeWebhook] Method:', req.method);
  console.log('[StripeWebhook] Headers:', {
    'stripe-signature': req.headers['stripe-signature']
      ? 'present'
      : 'MISSING',
    'stripe-account':
      req.headers['stripe-account'] ||
      'NOT PRESENT (platform account)',
  });
  console.log('[StripeWebhook] Body type:', typeof req.body);
  console.log(
    '[StripeWebhook] Body is Buffer:',
    Buffer.isBuffer(req.body)
  );

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
    console.error(
      '[StripeWebhook] Signature verification failed:',
      err.message
    );

    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    if (DEBUG) {
      console.log(
        '[StripeWebhook] Event:',
        event.type,
        '| Connect account:',
        connectAccountId || 'platform'
      );
    }

    if (await alreadyProcessed(event.id)) {
      if (DEBUG) {
        console.log(
          '[StripeWebhook] Duplicate event ignored:',
          event.id
        );
      }

      return res.json({
        received: true,
        duplicate: true,
      });
    }

    // ─────────────────────────────────────────────────────────────────────────
    // payment_intent.succeeded
    // ─────────────────────────────────────────────────────────────────────────

    if (event.type === 'payment_intent.succeeded') {
      const paymentIntent = event.data.object;

      if (DEBUG) {
        console.log(
          '[StripeWebhook] payment_intent.succeeded:',
          paymentIntent.id
        );
      }

      // Old campaign product order support.
      // This can be removed once those tables and services are deleted.
      try {
        const campaignOrder = await confirmOrderByStripeIntent(
          paymentIntent.id
        );

        if (campaignOrder) {
          console.log(
            '[StripeWebhook] Campaign order confirmed:',
            campaignOrder.id
          );
        }
      } catch (campaignErr) {
        console.error(
          '[StripeWebhook] Campaign order confirmation failed (non-fatal):',
          campaignErr.message
        );
      }

      // New peer-to-peer order.
      //
      // NOTE: previously this ALSO called confirmPeerOrder here, alongside
      // the checkout.session.completed handler below — Stripe fires both
      // event types for every Checkout Session payment, so peer orders
      // were being confirmed/expanded twice, nearly simultaneously, for
      // every single purchase. expandPeerOrder is now safe against that
      // (row-level locking — see peerEntryExpansionService.js), but there's
      // no reason to keep doing the redundant work: checkout.session.completed
      // carries the full orderId directly in metadata and is sufficient on
      // its own for Checkout-Session-based peer orders. Skipping the peer
      // lookup here entirely removes the double-invocation at its source
      // rather than just tolerating it safely downstream.
      // (Campaign's confirmOrderByStripeIntent above is unaffected — that
      // flow doesn't have this same double-event overlap.)
    }

    // ─────────────────────────────────────────────────────────────────────────
    // checkout.session.completed
    // ─────────────────────────────────────────────────────────────────────────

    else if (event.type === 'checkout.session.completed') {
      const session         = event.data.object;
      const type            = session?.metadata?.type;
      const sessionId       = session?.id;
      const paymentIntentId = session?.payment_intent || null;

      // ── Peer-to-peer fundraiser order ──────────────────────────────────────

      if (type === 'peer_fundraiser_order') {
        const orderId = session?.metadata?.orderId;

        if (!orderId) {
          console.warn(
            '[StripeWebhook] peer_fundraiser_order is missing orderId',
            { sessionId }
          );
        } else {
          try {
            const confirmed = await confirmPeerOrder({
              orderId,
              stripePaymentIntentId: paymentIntentId ?? null,
              externalTransactionId:
                paymentIntentId ?? sessionId,
              paymentReference:
                paymentIntentId ?? sessionId,
            });

            if (confirmed) {
              console.log(
                '[StripeWebhook] Peer order confirmed through checkout.session.completed:',
                orderId
              );
            }
          } catch (peerErr) {
            console.error(
              '[StripeWebhook] Peer order confirmation failed (non-fatal):',
              peerErr.message
            );
          }
        }
      }

      // ── Old campaign product purchase ──────────────────────────────────────

      else if (type === 'campaign_product') {
        const orderId = session?.metadata?.orderId;

        if (!orderId) {
          console.warn(
            '[StripeWebhook] campaign_product is missing orderId',
            { sessionId }
          );
        } else {
          try {
            const confirmed = await confirmOrderByStripeIntent(
              paymentIntentId ?? sessionId
            );

            if (confirmed) {
              console.log(
                '[StripeWebhook] Campaign order confirmed through checkout.session.completed:',
                orderId
              );
            }
          } catch (err) {
            console.error(
              '[StripeWebhook] Campaign order confirmation failed (non-fatal):',
              err.message
            );
          }
        }
      }

      // ── Standard advance ticket purchase ───────────────────────────────────

      else if (type === 'ticket_purchase') {
        const ticketId = session?.metadata?.ticketId;

        if (!ticketId) {
          console.warn(
            '[StripeWebhook] ticket_purchase is missing ticketId',
            { sessionId }
          );
        } else {
          await confirmTicketAndLedger({
            ticketId,
            sessionId,
            paymentIntentId,
          });

          if (DEBUG) {
            console.log(
              '[StripeWebhook] Confirmed ticket and ledger:',
              {
                ticketId,
                sessionId,
              }
            );
          }

          try {
            const ticketRow = await getTicketWithRoomConfig(
              ticketId
            );

            if (ticketRow) {
              const config =
                typeof ticketRow.config_json === 'string'
                  ? JSON.parse(ticketRow.config_json)
                  : ticketRow.config_json;

              const extras =
                typeof ticketRow.extras === 'string'
                  ? JSON.parse(ticketRow.extras)
                  : ticketRow.extras || [];

              await sendTicketConfirmationEmail({
                eventTitle:
                  config?.eventTitle || null,
                eventLocation:
                  config?.eventLocation || null,
                ticketId,
                purchaserEmail:
                  ticketRow.purchaser_email,
                purchaserName:
                  ticketRow.purchaser_name,
                playerName:
                  ticketRow.player_name,
                entryFee:
                  ticketRow.entry_fee,
                extrasTotal:
                  ticketRow.extras_total,
                totalAmount:
                  ticketRow.total_amount,
                currency:
                  ticketRow.currency,
                currencySymbol:
                  config?.currencySymbol || '€',
                extras,
                clubId:
                  ticketRow.club_id,
                hostName:
                  config?.hostName,
                eventDateTime:
                  config?.eventDateTime,
                timeZone:
                  config?.timeZone,
                gameType:
                  ticketRow.game_type || 'quiz',
                clubName:
                  ticketRow.club_name || null,
              });

              if (DEBUG) {
                console.log(
                  '[StripeWebhook] Ticket email sent to:',
                  ticketRow.purchaser_email
                );
              }
            }
          } catch (emailErr) {
            console.error(
              '[StripeWebhook] Ticket email failed (non-fatal):',
              emailErr.message
            );
          }
        }
      }

      // ── Quiz walk-in payment ────────────────────────────────────────────────

      else if (type === 'walkin_payment') {
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

        let extrasWithPrices = [];

        try {
          extrasWithPrices = JSON.parse(
            session.metadata?.extrasWithPrices || '[]'
          );
        } catch {
          extrasWithPrices = [];
        }

        console.log(
          '[StripeWebhook] Quiz walk-in metadata received:',
          {
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
          }
        );

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
          console.log(
            '[StripeWebhook] Quiz walk-in ledger confirmed:',
            {
              roomId,
              playerId,
              playerName,
              fundraisingMode,
              donationAmount,
            }
          );
        }
      }

      // ── Club donation ──────────────────────────────────────────────────────

      else if (type === 'club_donation') {
        const donationId = session?.metadata?.donationId;

        if (!donationId) {
          console.warn(
            '[StripeWebhook] club_donation is missing donationId',
            { sessionId }
          );
        } else {
          const updated = await confirmDonation({
            externalCheckoutId:      sessionId,
            externalTransactionId:   paymentIntentId,
          });

          if (DEBUG) {
            console.log(
              '[StripeWebhook] Club donation confirmed:',
              {
                donationId,
                sessionId,
                updated,
              }
            );
          }
        }
      }

      // ── Puzzle subscription ────────────────────────────────────────────────

      else if (type === 'puzzle_subscription') {
        const {
          subscriptionId,
          challengeId,
          clubId,
          playerId,
        } = session.metadata || {};

        if (
          !subscriptionId ||
          !challengeId ||
          !playerId
        ) {
          console.warn(
            '[StripeWebhook] puzzle_subscription is missing metadata',
            {
              sessionId,
              subscriptionId,
              challengeId,
              playerId,
            }
          );
        } else {
          await confirmSubscriptionCheckout({
            subscriptionId,
            challengeId,
            playerId,
            clubId,
            stripeSubscriptionId:
              session.subscription,
            stripeCustomerId:
              session.customer,
          });

          if (DEBUG) {
            console.log(
              '[StripeWebhook] Puzzle subscription confirmed:',
              {
                subscriptionId,
                challengeId,
                playerId,
                stripeSubscriptionId:
                  session.subscription,
              }
            );
          }

          await writePuzzleSubscriptionLedgerEntry({
            stripeSubscriptionId:
              session.subscription,
            externalTransactionId:
              session.invoice || session.id,
            paymentReference:
              session.subscription,
            context:
              'checkout',
          });
        }
      }

      // ── Elimination walk-in payment ────────────────────────────────────────

      else if (type === 'elimination_walkin_payment') {
        const {
          roomId,
          clubId,
          playerId,
          playerName,
          entryFee,
          currency,
          clubPaymentMethodId,
        } = session.metadata || {};

        const reference =
          paymentIntentId || sessionId;

        await createExpectedPayment({
          roomId,
          clubId,
          playerId,
          playerName,
          ledgerType:
            'entry_fee',
          amount:
            parseFloat(entryFee),
          currency:
            currency ?? 'EUR',
          paymentMethod:
            'stripe',
          paymentSource:
            'webhook_auto',
          clubPaymentMethodId:
            clubPaymentMethodId
              ? parseInt(clubPaymentMethodId, 10)
              : null,
          paymentReference:
            reference,
          status:
            'confirmed',
          confirmedAt:
            new Date(),
          confirmedBy:
            'webhook_auto',
          confirmedByName:
            'Stripe',
          confirmedByRole:
            'admin',
          ticketId:
            null,
        });

        console.log(
          '[StripeWebhook] Elimination walk-in ledger confirmed:',
          {
            roomId,
            playerId,
            playerName,
            entryFee,
          }
        );

        try {
          addPlayerWithId(
            roomId,
            playerId,
            {
              name:             playerName,
              paid:             true,
              paymentMethod:    'stripe',
              paymentReference: reference,
            }
          );

          console.log(
            '[StripeWebhook] Player pre-registered in elimination room:',
            {
              roomId,
              playerId,
              playerName,
            }
          );
        } catch (roomErr) {
          console.warn(
            '[StripeWebhook] Could not pre-register player in room (non-fatal):',
            {
              roomId,
              playerId,
              playerName,
              error: roomErr.message,
            }
          );
        }
      } else {
        console.warn(
          '[StripeWebhook] Unknown checkout metadata type:',
          type,
          { sessionId }
        );
      }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // checkout.session.expired
    // ─────────────────────────────────────────────────────────────────────────

    else if (event.type === 'checkout.session.expired') {
      const session   = event.data.object;
      const type      = session?.metadata?.type;
      const sessionId = session?.id;

      // ── Standard ticket purchase ───────────────────────────────────────────

      if (type === 'ticket_purchase') {
        const ticketId = session?.metadata?.ticketId;

        if (!ticketId) {
          console.warn(
            '[StripeWebhook] Expired ticket_purchase is missing ticketId',
            { sessionId }
          );
        } else {
          const result = await deleteExpiredTicket(
            ticketId,
            'webhook_expired'
          );

          if (DEBUG) {
            console.log(
              '[StripeWebhook] Expired ticket cleaned up:',
              {
                ticketId,
                sessionId,
                deleted: result.deleted,
                reason:  result.reason,
              }
            );
          }
        }
      }

      // ── Club donation ──────────────────────────────────────────────────────

      else if (type === 'club_donation') {
        const donationId = session?.metadata?.donationId;

        if (!donationId) {
          console.warn(
            '[StripeWebhook] Expired club_donation is missing donationId',
            { sessionId }
          );
        } else {
          const updated = await markDonationStatus({
            externalCheckoutId: sessionId,
            status:             'expired',
          });

          if (DEBUG) {
            console.log(
              '[StripeWebhook] Expired club donation marked:',
              {
                donationId,
                sessionId,
                updated,
              }
            );
          }
        }
      }

      // ── Peer fundraiser order ──────────────────────────────────────────────

      else if (type === 'peer_fundraiser_order') {
        const orderId = session?.metadata?.orderId;

        if (!orderId) {
          console.warn(
            '[StripeWebhook] Expired peer_fundraiser_order is missing orderId',
            { sessionId }
          );
        } else {
          const result = await cancelExpiredPeerOrder(
            orderId,
            sessionId
          );

          if (DEBUG) {
            console.log(
              '[StripeWebhook] Expired peer order handled:',
              {
                orderId,
                sessionId,
                cancelled: result.cancelled,
              }
            );
          }
        }
      }

      // ── Old campaign product order ─────────────────────────────────────────

      else if (type === 'campaign_product') {
        const orderId = session?.metadata?.orderId;

        if (!orderId) {
          console.warn(
            '[StripeWebhook] Expired campaign_product is missing orderId',
            { sessionId }
          );
        } else {
          const result = await cancelExpiredCampaignOrder(
            orderId,
            sessionId
          );

          if (DEBUG) {
            console.log(
              '[StripeWebhook] Expired campaign order handled:',
              {
                orderId,
                sessionId,
                cancelled: result.cancelled,
              }
            );
          }
        }
      }

      // ── Quiz walk-in ────────────────────────────────────────────────────────

      else if (type === 'walkin_payment') {
        if (DEBUG) {
          console.log(
            '[StripeWebhook] Expired walkin_payment has no DB rows to clean:',
            {
              sessionId,
              playerId:
                session?.metadata?.playerId,
            }
          );
        }
      }

      // ── Elimination walk-in ────────────────────────────────────────────────

      else if (
        type ===
        'elimination_walkin_payment'
      ) {
        if (DEBUG) {
          console.log(
            '[StripeWebhook] Expired elimination_walkin_payment has no DB rows to clean:',
            {
              sessionId,
              playerId:
                session?.metadata?.playerId,
              roomId:
                session?.metadata?.roomId,
            }
          );
        }
      } else {
        console.warn(
          '[StripeWebhook] checkout.session.expired has unknown type:',
          type,
          { sessionId }
        );
      }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Puzzle subscription renewal succeeded
    // ─────────────────────────────────────────────────────────────────────────

    else if (event.type === 'invoice.payment_succeeded') {
      const invoice = event.data.object;
      const stripeSubscriptionId =
        invoice.subscription;

      if (!stripeSubscriptionId) {
        if (DEBUG) {
          console.log(
            '[StripeWebhook] invoice.payment_succeeded has no subscription — ignored',
            {
              invoiceId: invoice.id,
            }
          );
        }
      } else {
        const updated =
          await updateSubscriptionPeriodEnd({
            stripeSubscriptionId,
            currentPeriodEnd:
              invoice.period_end ??
              invoice.lines?.data?.[0]?.period?.end ??
              null,
            billingReason:
              invoice.billing_reason,
          });

        if (DEBUG) {
          console.log(
            '[StripeWebhook] invoice.payment_succeeded processed:',
            {
              stripeSubscriptionId,
              matched: updated,
            }
          );
        }

        if (
          updated &&
          invoice.billing_reason ===
            'subscription_cycle'
        ) {
          await writePuzzleSubscriptionLedgerEntry({
            stripeSubscriptionId,
            externalTransactionId:
              invoice.id,
            paymentReference:
              invoice.payment_intent,
            context:
              'renewal',
          });
        }
      }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Puzzle subscription renewal failed
    // ─────────────────────────────────────────────────────────────────────────

    else if (event.type === 'invoice.payment_failed') {
      const invoice = event.data.object;
      const stripeSubscriptionId =
        invoice.subscription;

      if (!stripeSubscriptionId) {
        if (DEBUG) {
          console.log(
            '[StripeWebhook] invoice.payment_failed has no subscription — ignored',
            {
              invoiceId: invoice.id,
            }
          );
        }
      } else {
        const updated =
          await markSubscriptionPastDue({
            stripeSubscriptionId,
          });

        if (DEBUG) {
          console.log(
            '[StripeWebhook] invoice.payment_failed processed:',
            {
              stripeSubscriptionId,
              matched: updated,
            }
          );
        }
      }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Puzzle subscription deleted or cancelled
    // ─────────────────────────────────────────────────────────────────────────

    else if (
      event.type ===
      'customer.subscription.deleted'
    ) {
      const subscription =
        event.data.object;
      const stripeSubscriptionId =
        subscription.id;

      const billingContext =
        await getSubscriptionBillingContext({
          stripeSubscriptionId,
        });

      const updated =
        await markSubscriptionCancelled({
          stripeSubscriptionId,
        });

      if (DEBUG) {
        console.log(
          '[StripeWebhook] customer.subscription.deleted processed:',
          {
            stripeSubscriptionId,
            matched: updated,
          }
        );
      }

      if (billingContext?.challenge_id) {
        try {
          const [[challengeRow]] =
            await connection.execute(
              `SELECT
                 status,
                 starts_at,
                 total_weeks
               FROM ${TABLE_PREFIX}puzzle_challenges
               WHERE id = ?
               LIMIT 1`,
              [billingContext.challenge_id]
            );

          if (challengeRow) {
            await maybeAutoCompleteChallenge({
              challengeId:
                billingContext.challenge_id,
              clubId:
                billingContext.club_id,
              status:
                challengeRow.status,
              startsAt:
                challengeRow.starts_at,
              totalWeeks:
                challengeRow.total_weeks,
            });
          }
        } catch (autoCompleteErr) {
          console.warn(
            '[StripeWebhook] Auto-complete check failed:',
            autoCompleteErr.message
          );
        }
      }
    } else if (DEBUG) {
      console.log(
        '[StripeWebhook] Unhandled event type:',
        event.type
      );
    }

    await markProcessed(
      event.id,
      event.type
    );

    return res.json({
      received: true,
    });
  } catch (err) {
    console.error(
      '[StripeWebhook] Handler error:',
      err
    );

    return res.status(500).json({
      error: 'webhook_failed',
    });
  }
}