// server/mgtsystem/routes/events.js

import express from 'express';
import { authenticateToken } from '../../middleware/auth.js';
import EventService from '../services/EventService.js';
import ImpactService from '../services/ImpactService.js';
import CampaignService from '../services/CampaignService.js';

const router = express.Router();
const eventService    = new EventService();
const impactService   = new ImpactService();
const campaignService = new CampaignService();

const VALID_EVENT_STATUSES = ['draft', 'live', 'ended'];

/** Convert empty strings to null for datetime / nullable columns */
function nullIfEmpty(val) {
  return val === '' || val === undefined ? null : val;
}



// ── Create a new event (as draft) ──────────────────────────────────────────────
router.post('/events',
  authenticateToken,
  async (req, res) => {
    try {
      const {
        title, type, description, venue, max_participants, goal_amount,
        event_date, campaign_id, summary,
        location_type, location_label, online_url,
        primary_action_type, primary_action_label, primary_action_url,
        start_datetime, end_datetime, time_zone,
        payment_methods_json,
      } = req.body;

      if (!title || !goal_amount || !event_date) {
        return res.status(400).json({ error: 'title, goal_amount and event_date are required' });
      }
      if (goal_amount <= 0) {
        return res.status(400).json({ error: 'Goal amount must be greater than 0' });
      }

      const eventDate = new Date(event_date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (eventDate < today) {
        return res.status(400).json({ error: 'Event date cannot be in the past' });
      }

      let pmJson = null;
      if (payment_methods_json) {
        pmJson = typeof payment_methods_json === 'string'
          ? payment_methods_json
          : JSON.stringify(payment_methods_json);
      }

      const eventData = {
        title:                title.trim(),
        type:                 type ? type.trim() : 'fundraising_event',
        description:          description ? description.trim() : null,
        summary:              summary ? summary.trim() : null,
        venue:                venue ? venue.trim() : null,
        location_type:        location_type || 'in_person',
        location_label:       location_label ? location_label.trim() : null,
        online_url:           online_url ? online_url.trim() : null,
        primary_action_type:  primary_action_type || 'attend',
        primary_action_label: primary_action_label ? primary_action_label.trim() : null,
        primary_action_url:   primary_action_url ? primary_action_url.trim() : null,
        max_participants:     max_participants ? parseInt(max_participants) : null,
        goal_amount:          parseFloat(goal_amount),
        event_date,
        start_datetime:       nullIfEmpty(start_datetime),
        end_datetime:         nullIfEmpty(end_datetime),
        time_zone:            nullIfEmpty(time_zone),
        campaign_id:          campaign_id || null,
        payment_methods_json: pmJson,
      };

      const event = await eventService.createEvent(req.club_id, eventData);
      res.status(201).json({ message: 'Event created as draft successfully', event });

    } catch (error) {
      if (error.message === 'Campaign not found') return res.status(404).json({ error: error.message });
      if (error.message === 'Campaign does not belong to your club') return res.status(403).json({ error: error.message });
      console.error('Create event error:', error);
      res.status(500).json({ error: 'Failed to create event' });
    }
  }
);

// ── Publish an event ────────────────────────────────────────────────────────────
router.patch('/events/:eventId/publish',
  authenticateToken,
  async (req, res) => {
    try {
      const { eventId } = req.params;
      const clubId = req.club_id;
      const event = await eventService.getEventById(eventId, clubId);
      if (!event) return res.status(404).json({ error: 'Event not found' });

      if (event.campaign_id) {
        const campaign = await campaignService.getCampaignById(event.campaign_id, clubId);
        if (!campaign) return res.status(404).json({ error: 'Campaign not found' });
        if (!campaign.is_published) {
          return res.status(403).json({
            error: 'Cannot publish event', reason: 'Campaign must be published first',
            message: `This event is part of "${campaign.name}" campaign. Please publish the campaign before publishing this event.`,
            campaignId: campaign.id, campaignName: campaign.name, requiresCampaignPublish: true,
          });
        }
      }

      const trustStatus = await impactService.checkTrustStatus(clubId);
      if (!trustStatus.canCreateEvent) {
        return res.status(403).json({
          error: 'Cannot publish event', reason: trustStatus.reason,
          message: trustStatus.reason, outstanding: trustStatus.outstandingImpactReports,
          overdueDays: trustStatus.overdueDays, requiresTrustFix: true,
        });
      }

      const publishedEvent = await eventService.publishEvent(eventId, clubId);
      res.json({ message: 'Event published successfully', event: publishedEvent });
    } catch (error) {
      console.error('Publish event error:', error);
      res.status(500).json({ error: 'Failed to publish event' });
    }
  }
);

// ── Unpublish an event ──────────────────────────────────────────────────────────
router.patch('/events/:eventId/unpublish',
  authenticateToken,
  async (req, res) => {
    try {
      const { eventId } = req.params;
      const event = await eventService.unpublishEvent(eventId, req.club_id);
      res.json({ message: 'Event unpublished successfully', event });
    } catch (error) {
      if (error.message === 'Event not found') return res.status(404).json({ error: error.message });
      console.error('Unpublish event error:', error);
      res.status(500).json({ error: 'Failed to unpublish event' });
    }
  }
);

// ── Get all events for a club ───────────────────────────────────────────────────
router.get('/clubs/:clubId/events',
  authenticateToken,
  async (req, res) => {
    try {
      const { clubId } = req.params;
      const { status } = req.query;
      if (clubId !== req.club_id) return res.status(403).json({ error: 'Access denied' });
      const events = (status && VALID_EVENT_STATUSES.includes(status))
        ? await eventService.getEventsByStatus(clubId, status)
        : await eventService.getEventsByClub(clubId);
      res.json({ events, total: events.length });
    } catch (error) {
      console.error('Get events error:', error);
      res.status(500).json({ error: 'Failed to fetch events' });
    }
  }
);

// ── Get published events for a club (public) ────────────────────────────────────
router.get('/clubs/:clubId/events/published',
  async (req, res) => {
    try {
      const events = await eventService.getPublishedEventsByClub(req.params.clubId);
      res.json({ events, total: events.length });
    } catch (error) {
      console.error('Get published events error:', error);
      res.status(500).json({ error: 'Failed to fetch published events' });
    }
  }
);

// ── Get upcoming events for a club ──────────────────────────────────────────────
router.get('/clubs/:clubId/events/upcoming',
  authenticateToken,
  async (req, res) => {
    try {
      const { clubId } = req.params;
      const { limit = 5 } = req.query;
      if (clubId !== req.club_id) return res.status(403).json({ error: 'Access denied' });
      const events = await eventService.getUpcomingEvents(clubId, parseInt(limit));
      res.json({ events, total: events.length });
    } catch (error) {
      console.error('Get upcoming events error:', error);
      res.status(500).json({ error: 'Failed to fetch upcoming events' });
    }
  }
);

// ── Get a specific event ────────────────────────────────────────────────────────
router.get('/events/:eventId',
  authenticateToken,
  async (req, res) => {
    try {
      const event = await eventService.getEventById(req.params.eventId, req.club_id);
      if (!event) return res.status(404).json({ error: 'Event not found' });
      res.json({ event });
    } catch (error) {
      console.error('Get event error:', error);
      res.status(500).json({ error: 'Failed to fetch event' });
    }
  }
);

// ── Get event financial details ─────────────────────────────────────────────────
router.get('/events/:eventId/financials',
  authenticateToken,
  async (req, res) => {
    try {
      const financials = await eventService.getEventFinancials(req.params.eventId, req.club_id);
      if (!financials) return res.status(404).json({ error: 'Event not found' });
      res.json(financials);
    } catch (error) {
      console.error('Get event financials error:', error);
      res.status(500).json({ error: 'Failed to fetch event financials' });
    }
  }
);

// ── Update an event ─────────────────────────────────────────────────────────────
router.put('/events/:eventId',
  authenticateToken,
  async (req, res) => {
    try {
      const { eventId } = req.params;
      const updateData = { ...req.body };

      // Null out empty strings for all datetime / nullable fields
      // (belt-and-braces on top of the service layer doing the same)
      [
        'start_datetime', 'end_datetime', 'event_date',
        'time_zone', 'online_url', 'location_label',
        'summary', 'description', 'campaign_id',
      ].forEach(f => {
        if (f in updateData) updateData[f] = nullIfEmpty(updateData[f]);
      });

      if (updateData.goal_amount !== undefined) {
        if (updateData.goal_amount <= 0) return res.status(400).json({ error: 'Goal amount must be greater than 0' });
        updateData.goal_amount = parseFloat(updateData.goal_amount);
      }
      if (updateData.actual_amount !== undefined) {
        if (updateData.actual_amount < 0) return res.status(400).json({ error: 'Actual amount cannot be negative' });
        updateData.actual_amount = parseFloat(updateData.actual_amount);
      }
      if (updateData.event_date) {
        const eventDate = new Date(updateData.event_date);
        const today = new Date(); today.setHours(0, 0, 0, 0);
        if (eventDate < today) return res.status(400).json({ error: 'Event date cannot be in the past' });
      }

      if (updateData.title)            updateData.title            = updateData.title.trim();
      if (updateData.description)      updateData.description      = updateData.description.trim();
      if (updateData.venue)            updateData.venue            = updateData.venue.trim();
      if (updateData.max_participants) updateData.max_participants  = parseInt(updateData.max_participants);

      // Normalise payment_methods_json if passed as object
      if (updateData.payment_methods_json && typeof updateData.payment_methods_json === 'object') {
        updateData.payment_methods_json = JSON.stringify(updateData.payment_methods_json);
      }

      const event = await eventService.updateEvent(eventId, req.club_id, updateData);
      if (!event) return res.status(404).json({ error: 'Event not found or no changes made' });
      res.json({ message: 'Event updated successfully', event });
    } catch (error) {
      if (error.message === 'No valid fields to update') return res.status(400).json({ error: error.message });
      if (error.message === 'Campaign not found') return res.status(404).json({ error: error.message });
      if (error.message === 'Campaign does not belong to your club') return res.status(403).json({ error: error.message });
      console.error('Update event error:', error);
      res.status(500).json({ error: 'Failed to update event' });
    }
  }
);

// ── Delete an event ─────────────────────────────────────────────────────────────
router.delete('/events/:eventId',
  authenticateToken,
  async (req, res) => {
    try {
      const deleted = await eventService.deleteEvent(req.params.eventId, req.club_id);
      if (!deleted) return res.status(404).json({ error: 'Event not found' });
      res.json({ message: 'Event deleted successfully' });
    } catch (error) {
      if (error.message === 'Cannot delete event with associated financial records') {
        return res.status(400).json({ error: error.message });
      }
      console.error('Delete event error:', error);
      res.status(500).json({ error: 'Failed to delete event' });
    }
  }
);

export default router;