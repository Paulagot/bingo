// server/campaigns/api/campaignSellerRoutes.js
//
// Auth-gated management routes (per-route auth, not router.use):
//   GET    /api/campaigns/:campaignId/sellers
//   POST   /api/campaigns/:campaignId/sellers
//   PATCH  /api/campaigns/:campaignId/sellers/:sellerId
//   DELETE /api/campaigns/:campaignId/sellers/:sellerId
//
// Public route (no auth — seller ID is the access key):
//   GET    /api/campaign-support/:campaignId/sellers/:sellerId
//
// Mount in index.js:
//   import { campaignSellerMgmtRoutes, campaignSellerPublicRoutes } from './campaigns/api/campaignSellerRoutes.js';
//   app.use('/api', campaignSellerPublicRoutes);          // in public block
//   app.use('/api', campaignSellerMgmtRoutes);            // in mgmt block

import { Router } from 'express';
import authenticateToken from '../../middleware/auth.js';
import * as svc from '../services/campaignSellerService.js';

// ─── Management ───────────────────────────────────────────────────────────────

export const campaignSellerMgmtRoutes = Router();

campaignSellerMgmtRoutes.get('/campaigns/:campaignId/sellers', authenticateToken, async (req, res) => {
  try {
    const result = await svc.listSellers(req.params.campaignId, req.club_id);
    res.json({ ok: true, ...result });
  } catch (err) {
    res.status(err.status ?? 500).json({ ok: false, error: err.message });
  }
});

campaignSellerMgmtRoutes.post('/campaigns/:campaignId/sellers', authenticateToken, async (req, res) => {
  try {
    const { sellerName, notes } = req.body ?? {};
    const result = await svc.createSeller(req.params.campaignId, req.club_id, { sellerName, notes });
    res.status(201).json({ ok: true, ...result });
  } catch (err) {
    res.status(err.status ?? 500).json({ ok: false, error: err.message });
  }
});

campaignSellerMgmtRoutes.patch('/campaigns/:campaignId/sellers/:sellerId', authenticateToken, async (req, res) => {
  try {
    const { sellerName, notes, isActive } = req.body ?? {};
    const result = await svc.updateSeller(
      req.params.sellerId, req.params.campaignId, req.club_id,
      { sellerName, notes, isActive }
    );
    res.json({ ok: true, ...result });
  } catch (err) {
    res.status(err.status ?? 500).json({ ok: false, error: err.message });
  }
});

campaignSellerMgmtRoutes.delete('/campaigns/:campaignId/sellers/:sellerId', authenticateToken, async (req, res) => {
  try {
    const result = await svc.deleteSeller(req.params.sellerId, req.params.campaignId, req.club_id);
    res.json({ ok: true, ...result });
  } catch (err) {
    res.status(err.status ?? 500).json({ ok: false, error: err.message });
  }
});

// ─── Public ───────────────────────────────────────────────────────────────────

export const campaignSellerPublicRoutes = Router();

campaignSellerPublicRoutes.get('/campaign-support/:campaignId/sellers/:sellerId', async (req, res) => {
  try {
    const result = await svc.getPublicSellerStats(req.params.campaignId, req.params.sellerId);
    res.json({ ok: true, ...result });
  } catch (err) {
    res.status(err.status ?? 500).json({ ok: false, error: err.message });
  }
});