// server/campaigns/api/campaignProductMgmtRoutes.js
//
// Auth-gated management routes for campaign products and orders.
// club_id is ALWAYS read from req.club.id (set by auth middleware).
// Never trust club_id from the request body.
//
// Mount in your main router:
//   import campaignProductMgmtRoutes from './campaigns/api/campaignProductMgmtRoutes.js';
//   app.use('/api', requireAuth, campaignProductMgmtRoutes);

import { Router } from 'express';
import authenticateToken from '../../middleware/auth.js';
import * as productService    from '../services/campaignProductService.js';
import * as orderService      from '../services/campaignOrderService.js';
import * as reportingService  from '../services/campaignProductReportingService.js';

const router = Router();

// Auth applied per-route via index.js mount

// ─── Helper: send structured errors ─────────────────────────────────────────

function handleError(res, err) {
  const status = err.status ?? 500;
  const code   = err.message ?? 'internal_error';
  console.error(`[CampaignMgmt] ❌ ${code}`, err);
  res.status(status).json({ ok: false, error: code });
}

// ─── Products ────────────────────────────────────────────────────────────────

/**
 * GET /api/campaigns/:campaignId/products
 * List all products (with items) for the campaign.
 */
router.get('/campaigns/:campaignId/products', authenticateToken, async (req, res) => {
  try {
    const clubId = req.club_id;
    const result = await productService.listProducts(req.params.campaignId, clubId);
    res.json({ ok: true, ...result });
  } catch (err) { handleError(res, err); }
});

/**
 * POST /api/campaigns/:campaignId/products
 * Create a product with product items.
 * Body: { name, description?, productType?, price, currency?, isFeatured?, badgeLabel?,
 *         displayOrder?, maxSales?, salesStartAt?, salesEndAt?, items: [...] }
 */
router.post('/campaigns/:campaignId/products', authenticateToken, async (req, res) => {
  try {
    const clubId = req.club_id;
    const result = await productService.createProduct(req.params.campaignId, clubId, req.body);
    res.status(201).json({ ok: true, ...result });
  } catch (err) { handleError(res, err); }
});

/**
 * GET /api/campaigns/:campaignId/products/:productId
 */
router.get('/campaigns/:campaignId/products/:productId', authenticateToken, async (req, res) => {
  try {
    const clubId = req.club_id;
    const result = await productService.getProduct(
      req.params.productId, req.params.campaignId, clubId
    );
    res.json({ ok: true, ...result });
  } catch (err) { handleError(res, err); }
});

/**
 * PATCH /api/campaigns/:campaignId/products/:productId
 * Update product details and replace product items.
 */
router.patch('/campaigns/:campaignId/products/:productId', authenticateToken, async (req, res) => {
  try {
    const clubId = req.club_id;
    const result = await productService.updateProduct(
      req.params.productId, req.params.campaignId, clubId, req.body
    );
    res.json({ ok: true, ...result });
  } catch (err) { handleError(res, err); }
});

/**
 * POST /api/campaigns/:campaignId/products/:productId/hide
 * Soft-delete (set is_active = 0).
 */
router.post('/campaigns/:campaignId/products/:productId/hide', authenticateToken, async (req, res) => {
  try {
    const clubId = req.club_id;
    const result = await productService.hideProduct(
      req.params.productId, req.params.campaignId, clubId
    );
    res.json({ ok: true, ...result });
  } catch (err) { handleError(res, err); }
});

/**
 * POST /api/campaigns/:campaignId/products/:productId/duplicate
 */
router.post('/campaigns/:campaignId/products/:productId/duplicate', authenticateToken, async (req, res) => {
  try {
    const clubId = req.club_id;
    const result = await productService.duplicateProduct(
      req.params.productId, req.params.campaignId, clubId
    );
    res.status(201).json({ ok: true, ...result });
  } catch (err) { handleError(res, err); }
});

/**
 * POST /api/campaigns/:campaignId/products/apply-template
 * Body: { templateKey: 'door_to_door' | 'quiz_only' | 'puzzle_campaign' }
 */
router.post('/campaigns/:campaignId/products/apply-template', authenticateToken, async (req, res) => {
  try {
    const clubId = req.club_id;
    const result = await productService.applyTemplate(
      req.params.campaignId, clubId, req.body.templateKey
    );
    res.status(201).json({ ok: true, ...result });
  } catch (err) { handleError(res, err); }
});

// ─── Orders ──────────────────────────────────────────────────────────────────

/**
 * GET /api/campaigns/:campaignId/product-orders
 * Query: ?paymentStatus=&sellerId=&paymentMethodCategory=
 */
router.get('/campaigns/:campaignId/product-orders', authenticateToken, async (req, res) => {
  try {
    const clubId = req.club_id;
    const filters = {
      paymentStatus:         req.query.paymentStatus,
      sellerId:              req.query.sellerId,
      paymentMethodCategory: req.query.paymentMethodCategory,
    };
    const result = await orderService.listOrders(req.params.campaignId, clubId, filters);
    res.json({ ok: true, ...result });
  } catch (err) { handleError(res, err); }
});

/**
 * POST /api/campaigns/:campaignId/product-orders/:orderId/confirm-cash
 * Confirm a cash_to_player or instant_payment order.
 */
router.post('/campaigns/:campaignId/product-orders/:orderId/confirm-cash', authenticateToken, async (req, res) => {
  try {
    const clubId = req.club_id;
    const result = await orderService.confirmOrder(
      req.params.orderId, req.params.campaignId, clubId
    );
    res.json({ ok: true, ...result });
  } catch (err) { handleError(res, err); }
});

/**
 * POST /api/campaigns/:campaignId/product-orders/:orderId/reject-cash
 * Body: { reason?: string }
 */
router.post('/campaigns/:campaignId/product-orders/:orderId/reject-cash', authenticateToken, async (req, res) => {
  try {
    const clubId = req.club_id;
    const result = await orderService.rejectOrder(
      req.params.orderId, req.params.campaignId, clubId, req.body.reason
    );
    res.json({ ok: true, ...result });
  } catch (err) { handleError(res, err); }
});

// ─── Reporting ───────────────────────────────────────────────────────────────

/**
 * GET /api/campaigns/:campaignId/product-reports
 */
router.get('/campaigns/:campaignId/product-reports', authenticateToken, async (req, res) => {
  try {
    const clubId = req.club_id;
    const result = await reportingService.getFullReport(req.params.campaignId, clubId);
    res.json({ ok: true, report: result });
  } catch (err) { handleError(res, err); }
});

export default router;