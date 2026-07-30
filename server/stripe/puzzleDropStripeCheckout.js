// server/stripe/puzzleDropStripeCheckout.js
//
// Mirrors stripeWalkinCheckout.js's createWalkinStripeSession pattern
// (same Stripe Connect session shape, same getReadyStripeForClub call),
// but with one structural difference: walk-in payments write NOTHING to
// the DB until the webhook fires - everything the webhook needs is
// carried in Stripe's metadata. Drop can't do that: itemIds is a variable-
// length array of UUIDs that can exceed what's safe to round-trip through
// Stripe metadata's small string-only fields.
//
// So Drop follows the OTHER established pattern instead - the one
// quizTicketService.createTicketStripeCheckout uses for ticket_purchase:
// create the entitlements + ledger row FIRST (at 'expected' status),
// THEN create the Stripe session, THEN patch the session id onto the
// ledger row. Metadata only needs to carry a small reference id
// (entitlementId), not the purchase payload. The webhook just flips
// status via confirmDropPurchase - the exact same function the admin
// manual-confirm route already uses, so there's no new confirmation
// logic anywhere in this file.

import Stripe from 'stripe';
import { getReadyStripeForClub } from './stripeTicketCheckoutService.js';
import {
  getDropRoomConfig,
  createDropEntitlements,
  attachStripeSessionToLedger,
} from '../puzzles/services/puzzleDropService.js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-06-20' });

const DEBUG = false;

export async function createDropStripeCheckout({
  dropRoomId,
  itemIds,
  buyerName,
  buyerEmail,
  appOrigin,
}) {
  // 1) Room + status gate - same rule the manual-payment purchase route
  // enforces (see puzzleDropRoutes.js): only accept purchases once the
  // Drop is actually on sale.
  const room = await getDropRoomConfig(dropRoomId);
  if (!room) throw new Error('drop_not_found');
  if (room.status !== 'open') throw new Error('drop_not_on_sale');

  // 2) Stripe Connect readiness
  const stripeConn = await getReadyStripeForClub(room.clubId);
  if (!stripeConn) throw new Error('stripe_not_ready_or_disabled');

  // 3) Create entitlements + ledger row NOW, at 'expected' - see file
  // header note for why this can't be deferred to the webhook the way
  // walk-in payments are.
  const result = await createDropEntitlements({
    dropRoomId,
    itemIds,
    buyerName,
    buyerEmail,
    paymentMethod: 'stripe',
    paymentSource: 'player_selected',
    clubPaymentMethodId: stripeConn.clubPaymentMethodId,
    initialStatus: 'expected',
  });

  const totalAmountCents = Math.round(result.totalAmount * 100);
  if (!Number.isFinite(totalAmountCents) || totalAmountCents <= 0) {
    throw new Error('invalid_checkout_amount');
  }

  const primaryEntitlementId = result.entitlements[0].id;
  const origin = appOrigin || process.env.APP_URL || 'http://localhost:5173';

  // 4) Create Stripe session
  const session = await stripe.checkout.sessions.create(
    {
      mode: 'payment',
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: result.currency.toLowerCase(),
            unit_amount: totalAmountCents,
            product_data: {
              name: `Puzzle Drop - ${room.config?.dropTitle || dropRoomId}`,
            },
          },
        },
      ],
      success_url: `${origin}/puzzle-drop/${dropRoomId}/success?entitlementId=${primaryEntitlementId}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/puzzle-drop/${dropRoomId}?cancelled=true`,
      metadata: {
        type: 'puzzle_drop_purchase',
        dropRoomId,
        entitlementId: primaryEntitlementId,
      },
    },
    { stripeAccount: stripeConn.accountId }
  );

  // 5) Patch the session id onto the ledger row - see attachStripeSessionToLedger's
  // comment for why this is a necessary second step rather than known up front.
  await attachStripeSessionToLedger({ ledgerId: result.ledgerId, sessionId: session.id });

  if (DEBUG) {
    console.log('[PuzzleDropStripeCheckout] ✅ Session created', {
      dropRoomId,
      sessionId: session.id,
      primaryEntitlementId,
      totalAmount: result.totalAmount,
      currency: result.currency,
    });
  }

  return { url: session.url, entitlements: result.entitlements };
}