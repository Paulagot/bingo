// server/stripe/stripeRoutes.js
import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.js';
import {
  startStripeConnect,
  getStripeConnectStatus,
  disconnectStripeConnect,
} from './stripeController.js';
import { createWalkinStripeSession, createEliminationWalkinStripeSession } from './stripeWalkinCheckout.js';
import { createCampaignStripeSession } from './campaignStripeCheckoutService.js'; // ✅ NEW

export const stripeRouter = Router();

// ─── Public routes — BEFORE authenticateToken ────────────────────────────────

stripeRouter.post('/walkin-checkout', async (req, res) => {
  try {
    const { roomId, playerName, selectedExtras, donationAmount, appOrigin } = req.body;

    if (!roomId || !playerName) {
      return res.status(400).json({ error: 'roomId and playerName are required' });
    }

    console.log('[walkin-checkout route] body:', {
      roomId, playerName, selectedExtras, donationAmount, appOrigin,
    });

    const result = await createWalkinStripeSession({
      roomId,
      playerName:     playerName.trim(),
      selectedExtras: Array.isArray(selectedExtras) ? selectedExtras : [],
      donationAmount,
      appOrigin,
    });

    return res.json({ ok: true, url: result.url, playerId: result.playerId });
  } catch (err) {
    const msg = err?.message || 'walkin_checkout_failed';
    console.error('[WalkinCheckout] ❌', msg);

    if (msg.includes('full') || msg.includes('capacity')) {
      return res.status(409).json({ error: 'room_full', message: msg });
    }
    if (msg === 'invalid_donation_amount_for_stripe') {
      return res.status(400).json({ error: 'invalid_donation_amount_for_stripe', message: 'Donation amount must be greater than 0 for Stripe checkout.' });
    }
    if (msg === 'invalid_checkout_amount') {
      return res.status(400).json({ error: 'invalid_checkout_amount', message: 'Invalid checkout amount.' });
    }
    return res.status(500).json({ error: 'walkin_checkout_failed', message: msg });
  }
});

stripeRouter.post('/elimination-walkin-checkout', async (req, res) => {
  try {
    const { roomId, playerName, appOrigin } = req.body;

    if (!roomId || !playerName) {
      return res.status(400).json({ error: 'roomId and playerName are required' });
    }

    const result = await createEliminationWalkinStripeSession({
      roomId,
      playerName: playerName.trim(),
      appOrigin,
    });

    return res.json({ ok: true, url: result.url, playerId: result.playerId });
  } catch (err) {
    const msg = err?.message || 'walkin_checkout_failed';
    console.error('[EliminationWalkinCheckout] ❌', msg);

    if (msg === 'stripe_not_ready_or_disabled' || msg === 'stripe_not_available_for_this_room') {
      return res.status(422).json({ error: msg });
    }
    if (msg === 'invalid_checkout_amount') {
      return res.status(400).json({ error: 'invalid_checkout_amount' });
    }
    if (msg === 'Room not found') {
      return res.status(404).json({ error: 'room_not_found' });
    }
    return res.status(500).json({ error: 'walkin_checkout_failed', message: msg });
  }
});

// ✅ NEW: Campaign product Stripe checkout — public, no auth needed
stripeRouter.post('/campaign-checkout', async (req, res) => {
  try {
    const { orderId, campaignId } = req.body ?? {};

    if (!orderId || !campaignId) {
      return res.status(400).json({ error: 'orderId and campaignId are required' });
    }

    const proto  = req.headers['x-forwarded-proto'] || (req.secure ? 'https' : 'http');
    const origin = `${proto}://${req.get('host')}`;

    const result = await createCampaignStripeSession({ orderId, campaignId, origin });

    return res.json({ ok: true, url: result.url, sessionId: result.sessionId });
  } catch (err) {
    const msg = err?.message || 'campaign_checkout_failed';
    console.error('[CampaignCheckout] ❌', msg);

    if (msg === 'invalid_checkout_amount') {
      return res.status(400).json({ error: 'invalid_checkout_amount', message: 'Invalid checkout amount.' });
    }
    if (msg === 'order_not_found') {
      return res.status(404).json({ error: 'order_not_found' });
    }
    if (msg === 'order_not_payable') {
      return res.status(400).json({ error: 'order_not_payable', message: 'Order is not in a payable state.' });
    }
    return res.status(500).json({ error: 'campaign_checkout_failed', message: msg });
  }
});

// ─── Private routes — club admins only ───────────────────────────────────────
stripeRouter.use(authenticateToken);

stripeRouter.post('/connect/start', startStripeConnect);
stripeRouter.get('/connect/status', getStripeConnectStatus);
stripeRouter.post('/connect/disconnect', disconnectStripeConnect);