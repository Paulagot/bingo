// server/web3/routes/web3PublicEventsRoutes.js
//
// Routes for the fundraisely_web3_public_events table.
//
// Auth model — mirrors web3FundraiserRoutes.js:
//   Protected routes (create, update, publish, unpublish, delete, status):
//     - Require x-wallet-session header
//     - validateSessionToken() confirms the session is valid
//     - wallet_address is taken from the session, never from the request body
//   Public routes (list, single):
//     - No auth required — discovery page is public
//
// Mounted in server/index.js as:
//   app.use('/api/web3/public-events', web3PublicEventsRoutes)
//
// ⚠️  ROUTE ORDER MATTERS:
//     Static paths (/host/mine) must be registered BEFORE dynamic paths (/:id)
//     or Express matches /host/mine as /:id with id="host".

import express from 'express';
import { validateSessionToken } from '../services/web3AuthService.js';
import { web3DashboardLimiter, web3AuthLimiter } from '../../middleware/rateLimit.js';
import {
  createEvent,
  updateEvent,
  publishEvent,
  unpublishEvent,
  updateStatus,
  getEventsByWallet,
  getPublicEvents,
  getEventById,
  deleteEvent,
} from '../services/web3PublicEventsService.js';

const router = express.Router();

// ─── Auth middleware helper ───────────────────────────────────────────────────

async function requireWalletSession(req, res, next) {
  const token = req.headers['x-wallet-session'];
  if (!token || typeof token !== 'string') {
    return res.status(401).json({ success: false, error: 'Missing session token' });
  }
  const session = await validateSessionToken(token);
  if (!session) {
    return res.status(401).json({ success: false, error: 'Invalid or expired session token' });
  }
  req.walletAddress = session.wallet_address;
  next();
}

// ─── Public routes ────────────────────────────────────────────────────────────

// GET /api/web3/public-events
// Discovery page — upcoming published events only.
// Query params: ?type=quiz|elimination&chain=solana|base&limit=20&offset=0
router.get('/', web3DashboardLimiter, async (req, res) => {
  try {
    const { type, chain, limit = 20, offset = 0 } = req.query;
    const events = await getPublicEvents({
      type:   type   || null,
      chain:  chain  || null,
      limit:  Math.min(parseInt(limit)  || 20, 100),
      offset: parseInt(offset) || 0,
    });
    return res.json({ success: true, ...events });
  } catch (err) {
    console.error('[web3PublicEventsRoutes] GET / error:', err);
    return res.status(500).json({ success: false, error: 'Failed to load events' });
  }
});

// ─── Protected routes — wallet session required ───────────────────────────────
// ⚠️  /host/mine MUST come before /:id — static before dynamic

// GET /api/web3/public-events/host/mine
// Returns all events for the authenticated wallet (all statuses).
// Used by the "My Events" dashboard tab.
router.get('/host/mine', web3DashboardLimiter, requireWalletSession, async (req, res) => {
  try {
    const events = await getEventsByWallet(req.walletAddress);
    return res.json({ success: true, events });
  } catch (err) {
    console.error('[web3PublicEventsRoutes] GET /host/mine error:', err);
    return res.status(500).json({ success: false, error: 'Failed to load your events' });
  }
});

// GET /api/web3/public-events/:id
// Single event — public. Used for detail view if needed.
// ⚠️  Registered AFTER /host/mine — dynamic segment would swallow it otherwise.
router.get('/:id', web3DashboardLimiter, async (req, res) => {
  try {
    const event = await getEventById(req.params.id);
    if (!event) {
      return res.status(404).json({ success: false, error: 'Event not found' });
    }
    return res.json({ success: true, event });
  } catch (err) {
    console.error('[web3PublicEventsRoutes] GET /:id error:', err);
    return res.status(500).json({ success: false, error: 'Failed to load event' });
  }
});

// POST /api/web3/public-events
// Create a new event listing (saved as draft).
router.post('/', web3AuthLimiter, requireWalletSession, async (req, res) => {
  try {
    const event = await createEvent({
      ...req.body,
      wallet_address: req.walletAddress, // always from session, never from body
    });
    return res.status(201).json({ success: true, event });
  } catch (err) {
    console.error('[web3PublicEventsRoutes] POST / error:', err);
    if (err.statusCode === 400) {
      return res.status(400).json({ success: false, error: err.message });
    }
    return res.status(500).json({ success: false, error: 'Failed to create event' });
  }
});

// PATCH /api/web3/public-events/:id
// Update a draft event. Only the owning wallet can update.
router.patch('/:id', web3AuthLimiter, requireWalletSession, async (req, res) => {
  try {
    const event = await updateEvent({
      id:             req.params.id,
      wallet_address: req.walletAddress,
      updates:        req.body,
    });
    if (!event) {
      return res.status(404).json({ success: false, error: 'Event not found or not yours' });
    }
    return res.json({ success: true, event });
  } catch (err) {
    console.error('[web3PublicEventsRoutes] PATCH /:id error:', err);
    if (err.statusCode === 400) {
      return res.status(400).json({ success: false, error: err.message });
    }
    return res.status(500).json({ success: false, error: 'Failed to update event' });
  }
});

// PATCH /api/web3/public-events/:id/publish
// Publish a draft — sets status = 'published', records published_at.
router.patch('/:id/publish', web3AuthLimiter, requireWalletSession, async (req, res) => {
  try {
    const event = await publishEvent({ id: req.params.id, wallet_address: req.walletAddress });
    if (!event) {
      return res.status(404).json({ success: false, error: 'Event not found or not yours' });
    }
    return res.json({ success: true, event });
  } catch (err) {
    console.error('[web3PublicEventsRoutes] PATCH /:id/publish error:', err);
    if (err.statusCode === 400) {
      return res.status(400).json({ success: false, error: err.message });
    }
    return res.status(500).json({ success: false, error: 'Failed to publish event' });
  }
});

// PATCH /api/web3/public-events/:id/unpublish
// Pull a listing back to draft — clears published_at.
router.patch('/:id/unpublish', web3AuthLimiter, requireWalletSession, async (req, res) => {
  try {
    const event = await unpublishEvent({ id: req.params.id, wallet_address: req.walletAddress });
    if (!event) {
      return res.status(404).json({ success: false, error: 'Event not found or not yours' });
    }
    return res.json({ success: true, event });
  } catch (err) {
    console.error('[web3PublicEventsRoutes] PATCH /:id/unpublish error:', err);
    return res.status(500).json({ success: false, error: 'Failed to unpublish event' });
  }
});

// PATCH /api/web3/public-events/:id/status
// Set status to 'live' (on launch) or 'ended' (on game close).
// Body: { status: 'live' | 'ended' }
router.patch('/:id/status', web3AuthLimiter, requireWalletSession, async (req, res) => {
  try {
    const { status } = req.body;
    if (!['live', 'ended'].includes(status)) {
      return res.status(400).json({ success: false, error: 'status must be live or ended' });
    }
    const event = await updateStatus({
      id:             req.params.id,
      wallet_address: req.walletAddress,
      status,
    });
    if (!event) {
      return res.status(404).json({ success: false, error: 'Event not found or not yours' });
    }
    return res.json({ success: true, event });
  } catch (err) {
    console.error('[web3PublicEventsRoutes] PATCH /:id/status error:', err);
    return res.status(500).json({ success: false, error: 'Failed to update status' });
  }
});

// DELETE /api/web3/public-events/:id
// Hard delete — only allowed on draft events.
router.delete('/:id', web3AuthLimiter, requireWalletSession, async (req, res) => {
  try {
    const deleted = await deleteEvent({ id: req.params.id, wallet_address: req.walletAddress });
    if (!deleted) {
      return res.status(404).json({ success: false, error: 'Event not found, not yours, or already published' });
    }
    return res.json({ success: true });
  } catch (err) {
    console.error('[web3PublicEventsRoutes] DELETE /:id error:', err);
    return res.status(500).json({ success: false, error: 'Failed to delete event' });
  }
});

export default router;