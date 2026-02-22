import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.js';
import {
  startStripeConnect,
  getStripeConnectStatus,
} from './stripeController.js';
import { createWalkinStripeSession } from './stripeWalkinCheckout.js';

export const stripeRouter = Router();

// ✅ Public — must be BEFORE authenticateToken
stripeRouter.post('/walkin-checkout', async (req, res) => {
  try {
    const { roomId, playerName, selectedExtras, appOrigin } = req.body;
    if (!roomId || !playerName) {
      return res.status(400).json({ error: 'roomId and playerName are required' });
    }
    const result = await createWalkinStripeSession({
      roomId,
      playerName: playerName.trim(),
      selectedExtras: Array.isArray(selectedExtras) ? selectedExtras : [],
      appOrigin,
    });
    return res.json({ ok: true, url: result.url, playerId: result.playerId });
  } catch (err) {
    const msg = err?.message || 'walkin_checkout_failed';
    console.error('[WalkinCheckout] ❌', msg);
    if (msg.includes('full') || msg.includes('capacity')) {
      return res.status(409).json({ error: 'room_full', message: msg });
    }
    return res.status(500).json({ error: 'walkin_checkout_failed', message: msg });
  }
});

// ✅ Private: only logged-in club admins
stripeRouter.use(authenticateToken);

stripeRouter.post('/connect/start', startStripeConnect);
stripeRouter.get('/connect/status', getStripeConnectStatus);