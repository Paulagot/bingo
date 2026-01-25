import express from 'express';
import { authenticateToken } from '../../middleware/auth.js';
import EventIntegrationsService from '../services/EventIntegrationsService.js';

const router = express.Router();
const svc = new EventIntegrationsService();

/**
 * ---------------------------------------------
 * Collection routes (STATIC) - keep these first
 * ---------------------------------------------
 */

/**
 * GET /api/events
 * List events for logged-in club (used for dropdown)
 */
router.get('/api/events', authenticateToken, async (req, res) => {
  try {
    const clubId = req.club_id;
    const events = await svc.listClubEvents({ clubId });
    res.json({ events, total: events.length });
  } catch (err) {
    console.error('[events] list error:', err);
    res.status(500).json({ error: 'Failed to fetch events' });
  }
});

/**
 * POST /api/event-integrations/lookup
 * Body: { integration_type, external_refs: string[] }
 * Returns links to events (with titles) for a batch of external refs (e.g. room_ids)
 */
router.post('/api/event-integrations/lookup', authenticateToken, async (req, res) => {
  try {
    const clubId = req.club_id;
    const { integration_type, external_refs } = req.body || {};

    if (!integration_type || !Array.isArray(external_refs) || external_refs.length === 0) {
      return res.status(400).json({ error: 'integration_type and external_refs[] are required' });
    }

    const links = await svc.lookupByExternalRefs({ clubId, integration_type, external_refs });
    res.json({ links, total: links.length });
  } catch (err) {
    if (String(err?.message || '').startsWith('Invalid integration_type')) {
      return res.status(400).json({ error: err.message });
    }

    console.error('[eventIntegrations] lookup error:', err);
    res.status(500).json({ error: 'Failed to lookup event integrations' });
  }
});

/**
 * --------------------------------------------------------
 * Parameterised routes - keep these AFTER collection routes
 * --------------------------------------------------------
 */

/**
 * GET /api/events/:eventId/integrations
 * List all digital sessions linked to an event (scoped to logged in club)
 */
router.get('/api/events/:eventId/integrations', authenticateToken, async (req, res) => {
  try {
    const { eventId } = req.params;
    const clubId = req.club_id;

    const integrations = await svc.listIntegrations({ eventId, clubId });
    res.json({ integrations, total: integrations.length });
  } catch (err) {
    if (err?.message === 'Event not found') {
      return res.status(404).json({ error: 'Event not found' });
    }
    if (err?.message === 'Access denied') {
      return res.status(403).json({ error: 'Access denied' });
    }

    console.error('[eventIntegrations] list error:', err);
    return res.status(500).json({ error: 'Failed to fetch event integrations' });
  }
});

/**
 * POST /api/events/:eventId/integrations
 * Body: { integration_type, external_ref }
 */
router.post('/api/events/:eventId/integrations', authenticateToken, async (req, res) => {
  try {
    const { eventId } = req.params;
    const clubId = req.club_id;
    const { integration_type, external_ref } = req.body || {};

    if (!integration_type || !external_ref) {
      return res.status(400).json({ error: 'integration_type and external_ref are required' });
    }

    const integration = await svc.addIntegration({
      eventId,
      clubId,
      integration_type,
      external_ref
    });

    res.status(201).json({ message: 'Integration linked', integration });
  } catch (err) {
    // Duplicate link (unique constraint)
    if (String(err?.message || '').includes('Duplicate')) {
      return res.status(409).json({ error: 'This integration is already linked to this event' });
    }

    // Friendly known errors
    if (err?.message === 'Event not found') return res.status(404).json({ error: err.message });
    if (err?.message === 'Quiz room not found') return res.status(404).json({ error: err.message });
    if (err?.message === 'Access denied') return res.status(403).json({ error: err.message });
    if (String(err?.message || '').startsWith('Invalid integration_type')) {
      return res.status(400).json({ error: err.message });
    }

    console.error('[eventIntegrations] add error:', err);
    res.status(500).json({ error: 'Failed to link integration' });
  }
});

/**
 * DELETE /api/events/:eventId/integrations/:integrationId
 */
router.delete('/api/events/:eventId/integrations/:integrationId', authenticateToken, async (req, res) => {
  try {
    const { eventId, integrationId } = req.params;
    const clubId = req.club_id;

    const ok = await svc.removeIntegration({ eventId, integrationId, clubId });
    if (!ok) return res.status(404).json({ error: 'Integration not found' });

    res.json({ message: 'Integration unlinked' });
  } catch (err) {
    console.error('[eventIntegrations] delete error:', err);
    res.status(500).json({ error: 'Failed to unlink integration' });
  }
});

export default router;

