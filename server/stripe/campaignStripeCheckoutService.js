// server/stripe/campaignStripeCheckoutService.js
//
// Creates a Stripe Checkout session for a campaign product order.
// Mirrors stripeTicketCheckoutService.js — redirect to hosted page,
// webhook confirms on checkout.session.completed.

import Stripe from 'stripe';
import { connection, TABLE_PREFIX } from '../config/database.js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-06-20' });

const T_ORDERS = `${TABLE_PREFIX}campaign_product_orders`;

/**
 * Create a Stripe Checkout session for a campaign product order.
 *
 * @param {object} opts
 * @param {string} opts.orderId
 * @param {string} opts.origin   — e.g. 'https://fundraisely.ie'
 * @param {string} opts.campaignId
 */
export async function createCampaignStripeSession({ orderId, origin, campaignId }) {
  // Load the order
  const [rows] = await connection.execute(
    `SELECT * FROM ${T_ORDERS} WHERE id = ? LIMIT 1`, [orderId]
  );
  const order = rows[0];
  if (!order) throw new Error('order_not_found');
  if (order.payment_status !== 'pending') throw new Error('order_not_payable');

  const totalAmountCents = Math.round(Number(order.total_amount) * 100);
  if (!totalAmountCents || totalAmountCents < 50) throw new Error('invalid_checkout_amount');

  const currency = (order.currency ?? 'EUR').toLowerCase();

  // Use APP_ORIGIN env var if set, otherwise fall back to request origin.
  // In dev the server is on :3001 but the app is on :5173 — APP_ORIGIN handles this.
  const appOrigin = process.env.APP_ORIGIN
    || process.env.BASE_URL
    || origin.replace(':3001', ':5173');

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    payment_method_types: ['card'],
    line_items: [
      {
        price_data: {
          currency,
          product_data: {
            name: `Campaign Products — Order ${orderId.slice(0, 8)}`,
            description: `Supporter: ${order.supporter_name}`,
          },
          unit_amount: totalAmountCents,
        },
        quantity: 1,
      },
    ],
    customer_email: order.supporter_email,
    success_url: `${appOrigin}/campaigns/${campaignId}/order-success?orderId=${orderId}&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url:  `${appOrigin}/campaigns/${campaignId}/support?cancelled=1`,
    metadata: {
      type:       'campaign_product',
      orderId,
      campaignId,
      clubId:     order.club_id,
      supporter:  order.supporter_email,
    },
    expires_at: Math.floor(Date.now() / 1000) + 30 * 60, // 30 min
  });

  // Save the Stripe session ID on the order so the webhook can match it
  await connection.execute(
    `UPDATE ${T_ORDERS}
     SET stripe_payment_intent_id = ?,
         payment_provider         = 'stripe'
     WHERE id = ?`,
    [session.payment_intent ?? session.id, orderId]
  );

  console.log('[CampaignStripe] ✅ Session created:', {
    orderId,
    sessionId: session.id,
    amount: totalAmountCents,
    currency,
  });

  return { url: session.url, sessionId: session.id, orderId };
}