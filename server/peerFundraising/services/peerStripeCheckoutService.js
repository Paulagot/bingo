// server/peerFundraising/services/peerStripeCheckoutService.js
import Stripe from 'stripe';
import { connection, TABLE_PREFIX } from '../../config/database.js';
import { getReadyStripeForClub } from '../../stripe/stripeTicketCheckoutService.js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-06-20' });
const O = `${TABLE_PREFIX}peer_orders`, F = `${TABLE_PREFIX}peer_fundraisers`;

export async function createPeerStripeSession({ orderId, origin }) {
  const [rows] = await connection.execute(
    `SELECT o.*,f.public_slug,c.name club_name,c.slug club_slug
     FROM ${O} o JOIN ${F} f ON f.id=o.peer_fundraiser_id
     JOIN ${TABLE_PREFIX}clubs c ON c.id=o.club_id WHERE o.id=? LIMIT 1`, [orderId]);
  const o = rows[0];
  if (!o) throw Object.assign(new Error('order_not_found'), { status: 404 });
  if (o.payment_status !== 'pending') throw Object.assign(new Error('order_not_payable'), { status: 400 });

  // ── THE FIX ────────────────────────────────────────────────────────────
  // Every other paid flow (tickets, walk-ins, subscriptions) resolves the
  // club's connected Stripe account and creates the Checkout Session ON
  // that account via { stripeAccount }. This lookup was missing here
  // entirely, so peer payments were created on the platform account
  // instead of the club's - money went to us, not the club.
  const stripeConn = await getReadyStripeForClub(o.club_id);
  if (!stripeConn) throw Object.assign(new Error('stripe_not_ready_or_disabled'), { status: 422 });

  const cents = Math.round(Number(o.total_amount) * 100);
  if (cents < 50) throw Object.assign(new Error('invalid_checkout_amount'), { status: 400 });

  const appOrigin = process.env.APP_ORIGIN || process.env.BASE_URL || origin.replace(':3001', ':5173');
  const clubSlug = o.club_slug || String(o.club_name).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

  const session = await stripe.checkout.sessions.create(
    {
      mode: 'payment',
      payment_method_types: ['card'],
      customer_email: o.supporter_email,
      line_items: [{
        price_data: {
          currency: o.currency.toLowerCase(),
          product_data: {
            name: `${o.club_name} - ${o.public_slug}`,
            description: `Peer-to-peer order ${orderId.slice(0, 8)}`,
          },
          unit_amount: cents,
        },
        quantity: 1,
      }],
      success_url: `${appOrigin}/fundraise/${clubSlug}/${o.public_slug}/order-success?orderId=${orderId}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appOrigin}/fundraise/${clubSlug}/${o.public_slug}?cancelled=1`,
      metadata: {
        type: 'peer_fundraiser_order',
        orderId,
        peerFundraiserId: o.peer_fundraiser_id,
        participantId: o.participant_id || '',
        clubId: o.club_id,
        clubPaymentMethodId: String(stripeConn.clubPaymentMethodId),
      },
      expires_at: Math.floor(Date.now() / 1000) + 30 * 60,
    },
    { stripeAccount: stripeConn.accountId }   // ← creates the session on the CLUB's account
  );

  await connection.execute(
    `UPDATE ${O}
     SET stripe_checkout_session_id=?,
         stripe_payment_intent_id=?,
         payment_provider='stripe',
         payment_method_category='stripe',
         club_payment_method_id=COALESCE(club_payment_method_id,?)
     WHERE id=?`,
    [session.id, session.payment_intent || null, stripeConn.clubPaymentMethodId, orderId]
  );

  return { url: session.url, sessionId: session.id };
}
