// server/donations/api/donationCheckoutRoutes.js
//
// POST /donations/:clubId/checkout is PUBLIC/unauthenticated, per spec
// section 8 — the supporter is never logged in. Rate-limited per spec
// section 11.6 (first public write endpoint of its kind in this area).
//
// GET /donations/:clubId/list is authenticated — club admin only, same
// pattern as donation-buttons/:clubId/manage.
//
// GET /donations/:clubId/config is PUBLIC/unauthenticated — fetched by
// the embed page on load. THIS ROUTE WAS MISSING from a previously
// copied version of this file (confirmed via curl: the request was
// falling through to the SPA catch-all because nothing was registered
// at this path) — added back in below.

import express from 'express';
import rateLimit from 'express-rate-limit';
import authenticateToken from '../../middleware/auth.js';
import DonationCheckoutService from '../services/DonationCheckoutService.js';
import { listDonationsForClub } from '../services/DonationLedgerService.js';

const router = express.Router();
const svc = new DonationCheckoutService();

// Tighter than the crypto-confirm limiter (8/10min) since this creates
// real provider checkout sessions, not just verifies an already-signed
// on-chain tx — a real session has more abuse surface (e.g. spamming
// Stripe session creation against a club's connected account).
const checkoutLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many donation attempts. Please wait a few minutes and try again.' },
});

function mapErrorToStatus(message) {
  if (!message) return 500;
  if (message === 'Club not found') return 404;
  if (message === 'Donation button is not enabled') return 409;
  if (message === 'Donation button not configured') return 404;
  if (message === 'Donation button is disabled') return 409;
  if (message === "This donation button's payment method is no longer available") return 409;
  if (
    message === 'Selected payment method does not belong to this club' ||
    message === 'Selected payment method is disabled' ||
    message === 'Selected payment method is not eligible for trackable donations' ||
    message === 'Donation amount must be a positive number' ||
    message?.startsWith('Donation amount exceeds the maximum') ||
    message === 'This donation button only accepts preset amounts' ||
    message === 'appOrigin is missing or not a recognized FundRaisely domain'
  ) {
    return 400;
  }
  if (
    message === 'Stripe is not ready to accept payments for this club' ||
    message === 'Crypto payment method has no configured wallet address' ||
    message === 'This payment method is not yet supported for donations'
  ) {
    return 422;
  }
  return 500;
}

/**
 * GET /donations/:clubId/config
 * Public — no auth. Fetched by the embed page on load to render the
 * amount picker and know which single provider this button is wired
 * to (see ResolvedDonationMethod in donationCheckout.ts for why this
 * is one method, not a list).
 */
router.get('/donations/:clubId/config', async (req, res) => {
  try {
    const { clubId } = req.params;
    const config = await svc.getPublicConfig({ clubId });
    return res.json({ ok: true, ...config });
  } catch (err) {
    console.error('[donations] GET config error:', err);
    const status = mapErrorToStatus(err?.message);
    return res.status(status).json({ error: err?.message || 'Failed to load donation button' });
  }
});

/**
 * POST /donations/:clubId/checkout
 * Body: { clubPaymentMethodId, amount, donorName?, donorEmail? }
 * Public — no auth. currency is never accepted from the client; the
 * service derives it from the club's reporting_currency.
 */
router.post('/donations/:clubId/checkout', checkoutLimiter, async (req, res) => {
  try {
    const { clubId } = req.params;
    const { clubPaymentMethodId, amount, donorName, donorEmail, appOrigin } = req.body || {};

    if (!clubPaymentMethodId) {
      return res.status(400).json({ error: 'clubPaymentMethodId is required' });
    }
    if (amount === undefined || amount === null) {
      return res.status(400).json({ error: 'amount is required' });
    }

    const result = await svc.startCheckout({
      clubId,
      clubPaymentMethodId,
      amount,
      donorName,
      donorEmail,
      appOrigin,
    });

    return res.status(201).json(result);
  } catch (err) {
    console.error('[donations] POST checkout error:', err);
    const status = mapErrorToStatus(err?.message);
    return res.status(status).json({ error: err?.message || 'Failed to start donation checkout' });
  }
});

/**
 * GET /donations/:clubId/list
 * Club-facing "donations received" view (spec section 8). Authenticated.
 * Query: ?status=confirmed&page=1&pageSize=25
 */
router.get('/donations/:clubId/list', authenticateToken, async (req, res) => {
  try {
    const { clubId } = req.params;
    if (clubId !== req.club_id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const status = req.query.status || null;
    const all = req.query.all === 'true';
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize, 10) || 25));

    const result = await listDonationsForClub({ clubId, status, page, pageSize, all });

    return res.json({
      ok: true,
      donations: result.donations,
      total: result.total,
      page: result.page,
      pageSize: result.pageSize,
    });
  } catch (err) {
    console.error('[donations] GET list error:', err);
    return res.status(500).json({ error: err?.message || 'Failed to fetch donations' });
  }
});

export default router;