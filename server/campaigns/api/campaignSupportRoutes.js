// server/campaigns/api/campaignSupportRoutes.js
//
// Public campaign support routes — NO auth required.
// Protected only by rate limiting.
// Never exposes club management data.
//
// Mount in your main router (before requireAuth middleware):
//   import campaignSupportRoutes from './campaigns/api/campaignSupportRoutes.js';
//   app.use('/api', campaignSupportRoutes);

import { Router } from 'express';
import * as supportService  from '../services/campaignSupportService.js';
import * as orderService    from '../services/campaignOrderService.js';
import { sendCampaignOrderConfirmationEmail } from '../services/campaignOrderEmailService.js';
import Stripe from 'stripe';

const router = Router();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-06-20' });

function handleError(res, err) {
  const status = err.status ?? 500;
  const code   = err.message ?? 'internal_error';
  console.error(`[CampaignSupport] ❌ ${code}`, err);
  res.status(status).json({ ok: false, error: code });
}

// ─── Campaign landing ─────────────────────────────────────────────────────────

/**
 * GET /api/campaign-support/:campaignId
 * Query: ?sellerId=
 * Returns: campaign summary, active products, seller attribution.
 */
router.get('/campaign-support/:campaignId', async (req, res) => {
  try {
    const payload = await supportService.getCampaignSupportPayload(
      req.params.campaignId,
      req.query.sellerId ?? null
    );
    res.json({ ok: true, ...payload });
  } catch (err) { handleError(res, err); }
});

// ─── Create order ─────────────────────────────────────────────────────────────

/**
 * POST /api/campaign-support/:campaignId/orders
 * Body:
 *   sellerId?, supporterName, supporterEmail, supporterPhone?,
 *   paymentMethodCategory, items: [{ productId, quantity }]
 *
 * Creates order with payment_status = 'pending'.
 * For card payments, frontend should then call create-card-payment.
 */
router.post('/campaign-support/:campaignId/orders', async (req, res) => {
  try {
    // Resolve club_id from campaign (not from client)
    const { getCampaignClubId } = await import('../utils/campaignUtils.js');
    const clubId = await getCampaignClubId(req.params.campaignId);

    const {
      sellerId = null, supporterName, supporterEmail, supporterPhone = null,
      paymentMethodCategory, clubPaymentMethodId = null, paymentProvider = null,
      items = [],
    } = req.body;

    const result = await orderService.createOrder({
      campaignId: req.params.campaignId,
      clubId,
      sellerId,
      supporterName,
      supporterEmail,
      supporterPhone,
      paymentMethodCategory,
      clubPaymentMethodId: clubPaymentMethodId ? Number(clubPaymentMethodId) : null,
      paymentProvider,
      source: sellerId ? 'seller_qr' : 'campaign_page',
      items,
    });

    res.status(201).json({ ok: true, ...result });
  } catch (err) { handleError(res, err); }
});

/**
 * POST /api/campaign-support/orders/:orderId/send-confirmation-email
 *
 * Called by the frontend immediately before showing the thank-you screen.
 * Fires the order-level confirmation email to the supporter.
 * Always returns 200 — email failures are logged but never surfaced to the UI.
 */
router.post('/orders/:orderId/send-confirmation-email', async (req, res) => {
  const { orderId } = req.params;
 
  if (!orderId) {
    return res.status(400).json({ error: 'orderId_required' });
  }
 
  // Fire and forget — non-fatal by design
  sendCampaignOrderConfirmationEmail(orderId).catch(err => {
    console.error(`[OrderEmail] ❌ Failed to send order confirmation for ${orderId}:`, err.message);
  });
 
  return res.json({ sent: true });
});

// ─── Claim payment ────────────────────────────────────────────────────────────

/**
 * POST /api/campaign-support/orders/:orderId/claim-payment
 * Body: { paymentReference? }
 * Transitions order pending → claimed.
 * Used for instant_payment and cash_to_player.
 */
router.post('/campaign-support/orders/:orderId/claim-payment', async (req, res) => {
  try {
    const result = await orderService.claimPayment(
      req.params.orderId,
      {
        paymentReference:    req.body.paymentReference,
        clubPaymentMethodId: req.body.clubPaymentMethodId ? Number(req.body.clubPaymentMethodId) : null,
      }
    );
    res.json({ ok: true, ...result });
  } catch (err) { handleError(res, err); }
});

// ─── Card payment (Stripe) ────────────────────────────────────────────────────

/**
 * POST /api/campaign-support/orders/:orderId/create-card-payment
 * Creates a Stripe PaymentIntent for the order total.
 * Returns { clientSecret } for the frontend Stripe.js.
 */
router.post('/campaign-support/orders/:orderId/create-card-payment', async (req, res) => {
  try {
    const { order } = await orderService.getOrder(req.params.orderId);

    if (order.paymentStatus !== 'pending')
      throw Object.assign(new Error('payment_status_invalid'), { status: 400 });

    const amountInCents = Math.round(order.totalAmount * 100);
    if (amountInCents < 50)
      throw Object.assign(new Error('invalid_price'), { status: 400 });

    const intent = await stripe.paymentIntents.create({
      amount:   amountInCents,
      currency: order.currency.toLowerCase(),
      metadata: {
        orderId:    order.id,
        campaignId: order.campaignId,
        clubId:     order.clubId,
        supporter:  order.supporterEmail,
      },
    });

    await orderService.attachStripeIntent(order.id, intent.id);

    res.json({ ok: true, clientSecret: intent.client_secret, orderId: order.id });
  } catch (err) { handleError(res, err); }
});

// ─── Order summary ────────────────────────────────────────────────────────────

/**
 * GET /api/campaign-support/orders/:orderId/summary
 * Public order confirmation page.
 * Returns order, items, and entry join URLs for confirmed entries.
 */
router.get('/campaign-support/orders/:orderId/summary', async (req, res) => {
  try {
    const { order } = await orderService.getOrder(req.params.orderId);

    // Get generated entries for this order (confirmed only)
    const { connection, TABLE_PREFIX } = await import('../../config/database.js');
    const T_ENTRIES = `${TABLE_PREFIX}campaign_entries`;

    const [entries] = await connection.execute(
      `SELECT id, entry_type, status, entry_code, join_url, room_id FROM ${T_ENTRIES}
       WHERE order_id = ? ORDER BY created_at ASC`,
      [order.id]
    );

    // Strip internal fields for public response
    const safeOrder = {
      id:                    order.id,
      supporterName:         order.supporterName,
      supporterEmail:        order.supporterEmail,
      paymentStatus:         order.paymentStatus,
      paymentMethodCategory: order.paymentMethodCategory,
      totalAmount:           order.totalAmount,
      currency:              order.currency,
      items:                 order.items.map(i => ({
        productName: i.productNameSnapshot,
        quantity:    i.quantity,
        lineTotal:   i.lineTotal,
      })),
    };

    res.json({ ok: true, order: safeOrder, entries });
  } catch (err) { handleError(res, err); }
});

export default router;