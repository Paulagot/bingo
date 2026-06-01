// server/campaigns/api/campaignPaymentMethodsRoutes.js
//
// Two route groups:
//   Auth-gated (management):
//     GET  /api/campaigns/:campaignId/payment-methods
//     POST /api/campaigns/:campaignId/payment-methods
//
//   Public (no auth):
//     GET  /api/campaign-support/:campaignId/payment-methods
//
// Mount auth-gated routes WITH authenticateToken (same as campaignProductMgmtRoutes).
// Mount public route BEFORE auth middleware (same as campaignSupportRoutes).
//
// In server/index.js add:
//   import { campaignPaymentMethodsMgmtRoutes, campaignPaymentMethodsPublicRoutes }
//     from './campaigns/api/campaignPaymentMethodsRoutes.js';
//   app.use('/api', campaignPaymentMethodsPublicRoutes);           // before auth
//   app.use('/api', campaignPaymentMethodsMgmtRoutes);             // auth inside

import { Router } from 'express';
import authenticateToken from '../../middleware/auth.js';
import * as svc from '../services/campaignPaymentMethodsService.js';

// ─── Management router (auth-gated) ──────────────────────────────────────────

export const campaignPaymentMethodsMgmtRoutes = Router();
// Auth applied per-route via index.js mount

/**
 * GET /api/campaigns/:campaignId/payment-methods
 * Returns all enabled club methods + which are linked to this campaign.
 */
campaignPaymentMethodsMgmtRoutes.get('/campaigns/:campaignId/payment-methods', authenticateToken, async (req, res) => {
  try {
    const clubId = req.club_id;
    const result = await svc.getCampaignPaymentMethods(req.params.campaignId, clubId);
    res.json({ ok: true, ...result });
  } catch (err) {
    const status = err.status ?? 500;
    console.error('[CampaignPaymentMethods] ❌', err.message);
    res.status(status).json({ ok: false, error: err.message });
  }
});

/**
 * POST /api/campaigns/:campaignId/payment-methods
 * Body: { payment_method_ids: number[] }
 * Saves selected method IDs to the campaign.
 */
campaignPaymentMethodsMgmtRoutes.post('/campaigns/:campaignId/payment-methods', authenticateToken, async (req, res) => {
  try {
    const clubId = req.club_id;
    const { payment_method_ids } = req.body ?? {};

    if (!Array.isArray(payment_method_ids)) {
      return res.status(400).json({ ok: false, error: 'payment_method_ids must be an array' });
    }

    const result = await svc.updateCampaignPaymentMethods(
      req.params.campaignId,
      clubId,
      payment_method_ids,
      req.user?.id ?? null
    );

    res.json({ ok: true, linked_payment_methods: result });
  } catch (err) {
    const status = err.status ?? 500;
    console.error('[CampaignPaymentMethods] ❌', err.message);
    res.status(status).json({ ok: false, error: err.message });
  }
});

// ─── Public router (no auth) ──────────────────────────────────────────────────

export const campaignPaymentMethodsPublicRoutes = Router();

/**
 * GET /api/campaign-support/:campaignId/payment-methods
 * Returns enabled payment methods linked to the campaign.
 * Used by CampaignSupportPage to populate the payment step.
 */
campaignPaymentMethodsPublicRoutes.get('/campaign-support/:campaignId/payment-methods', async (req, res) => {
  try {
    const result = await svc.getPublicCampaignPaymentMethods(req.params.campaignId);
    res.json(result);
  } catch (err) {
    const status = err.status ?? 500;
    console.error('[CampaignPaymentMethods public] ❌', err.message);
    res.status(status).json({ ok: false, error: err.message, paymentMethods: [] });
  }
});