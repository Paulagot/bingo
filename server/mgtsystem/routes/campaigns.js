// server/src/routes/campaigns.js
import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { validateRequired } from '../middleware/validation.js';
import CampaignService from '../services/CampaignService.js';
import EventService from '../services/EventService.js';
import ImpactService from '../services/ImpactService.js';

const router = express.Router();
const campaignService = new CampaignService();
const eventService = new EventService();
const impactService = new ImpactService(); // ✅ INTEGRATED

const getSocketManager = (req) => req.app.get('socketManager');

const VALID_CATEGORIES = [
  'building',
  'equipment',
  'program',
  'emergency',
  'community',
  'education',
  'other',
];

const MAX_IMPACT_AREAS = 3;

function validateImpactAreas(impact_area_ids) {
  // allow undefined/null
  if (impact_area_ids === undefined || impact_area_ids === null) return { ok: true };

  if (!Array.isArray(impact_area_ids)) {
    return { ok: false, error: 'impact_area_ids must be an array' };
  }

  if (impact_area_ids.length > MAX_IMPACT_AREAS) {
    return { ok: false, error: `Select up to ${MAX_IMPACT_AREAS} impact areas` };
  }

  const invalid = impact_area_ids.find(
    (id) => typeof id !== 'string' || id.trim().length === 0
  );
  if (invalid !== undefined) {
    return { ok: false, error: 'impact_area_ids must be an array of non-empty strings' };
  }

  return { ok: true };
}

// Create a new campaign (as draft)
router.post(
  '/api/campaigns',
  authenticateToken,
  validateRequired(['name', 'target_amount']),
  async (req, res) => {
    try {
      const {
        name,
        description,
        target_amount,
        category,
        start_date,
        end_date,
        tags,
        impact_area_ids,
      } = req.body;

      // Validate target_amount is positive
      const parsedTarget = parseFloat(target_amount);
      if (Number.isNaN(parsedTarget) || parsedTarget <= 0) {
        return res.status(400).json({ error: 'Target amount must be greater than 0' });
      }

      // Validate dates if provided
      if (start_date && end_date) {
        const startDate = new Date(start_date);
        const endDate = new Date(end_date);
        if (endDate <= startDate) {
          return res.status(400).json({ error: 'End date must be after start date' });
        }
      }

      // Validate category if provided
      if (category && !VALID_CATEGORIES.includes(category)) {
        return res.status(400).json({
          error: `Invalid category. Must be one of: ${VALID_CATEGORIES.join(', ')}`,
        });
      }

      // Validate impact areas if provided
      const ia = validateImpactAreas(impact_area_ids);
      if (!ia.ok) {
        return res.status(400).json({ error: ia.error });
      }

      // Normalize tags
      const normalizedTags = Array.isArray(tags)
        ? tags
            .map((t) => (typeof t === 'string' ? t.trim() : ''))
            .filter(Boolean)
        : [];

      const campaignData = {
        name: name.trim(),
        description: description ? description.trim() : null,
        target_amount: parsedTarget,
        category: category ? category.trim() : null,
        start_date: start_date || null,
        end_date: end_date || null,
        tags: normalizedTags,
        impact_area_ids: Array.isArray(impact_area_ids)
          ? impact_area_ids.map((id) => id.trim()).filter(Boolean)
          : [],
      };

      // Campaign is created as draft (is_published = FALSE)
      const campaign = await campaignService.createCampaign(req.club_id, campaignData);

      const socketManager = getSocketManager(req);
      if (socketManager && typeof socketManager.emitCampaignCreated === 'function') {
        socketManager.emitCampaignCreated(req.club_id, campaign);
      }

      res.status(201).json({
        message: 'Campaign created as draft successfully',
        campaign,
      });
    } catch (error) {
      console.error('Create campaign error:', error);
      res.status(500).json({ error: 'Failed to create campaign' });
    }
  }
);

// ✅ INTEGRATED: Publish a campaign (make it public) with trust checking
router.patch('/api/campaigns/:campaignId/publish', 
  authenticateToken,
  async (req, res) => {
    try {
      const { campaignId } = req.params;
      const clubId = req.club_id;

      // ✅ Check trust status before publishing
      const trustStatus = await impactService.checkTrustStatus(clubId);
      
      if (!trustStatus.canCreateCampaign) {
        return res.status(403).json({ 
          error: 'Cannot publish campaign',
          reason: trustStatus.reason,
          outstanding: trustStatus.outstandingImpactReports,
          overdueDays: trustStatus.overdueDays,
          message: 'Complete outstanding impact reports before publishing new campaigns'
        });
      }

      // Publish the campaign
      const campaign = await campaignService.publishCampaign(campaignId, clubId);

      const socketManager = getSocketManager(req);
      if (socketManager && typeof socketManager.emitCampaignUpdated === 'function') {
        socketManager.emitCampaignUpdated(clubId, campaign);
      }

      res.json({
        message: 'Campaign published successfully',
        campaign
      });

    } catch (error) {
      if (error.message === 'Campaign not found') {
        return res.status(404).json({ error: error.message });
      }
      
      console.error('Publish campaign error:', error);
      res.status(500).json({ error: 'Failed to publish campaign' });
    }
  }
);

// Unpublish a campaign (make it draft again)
router.patch('/api/campaigns/:campaignId/unpublish', 
  authenticateToken,
  async (req, res) => {
    try {
      const { campaignId } = req.params;
      const clubId = req.club_id;

      // Unpublish the campaign
      const campaign = await campaignService.unpublishCampaign(campaignId, clubId);

      const socketManager = getSocketManager(req);
      if (socketManager && typeof socketManager.emitCampaignUpdated === 'function') {
        socketManager.emitCampaignUpdated(clubId, campaign);
      }

      res.json({
        message: 'Campaign unpublished successfully',
        campaign
      });

    } catch (error) {
      if (error.message === 'Campaign not found') {
        return res.status(404).json({ error: error.message });
      }
      
      console.error('Unpublish campaign error:', error);
      res.status(500).json({ error: 'Failed to unpublish campaign' });
    }
  }
);

// Get all campaigns for a club
router.get('/clubs/:clubId/campaigns', authenticateToken, async (req, res) => {
  try {
    const { clubId } = req.params;
    const { category, status } = req.query;

    // Verify user belongs to this club
    if (clubId !== req.club_id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    let campaigns = await campaignService.getCampaignsByClub(clubId);

    // Filter by category if provided
    if (category) {
      campaigns = campaigns.filter((campaign) => campaign.category === category);
    }

    // Filter by status if provided (active/ended based on dates)
    if (status) {
      const now = new Date();
      if (status === 'active') {
        campaigns = campaigns.filter(
          (campaign) => !campaign.end_date || new Date(campaign.end_date) >= now
        );
      } else if (status === 'ended') {
        campaigns = campaigns.filter(
          (campaign) => campaign.end_date && new Date(campaign.end_date) < now
        );
      }
    }

    res.json({
      campaigns,
      total: campaigns.length,
    });
  } catch (error) {
    console.error('Get campaigns error:', error);
    res.status(500).json({ error: 'Failed to fetch campaigns' });
  }
});

// Get published campaigns for a club (for public pages)
router.get('/clubs/:clubId/campaigns/published',
  async (req, res) => {
    try {
      const { clubId } = req.params;

      const campaigns = await campaignService.getPublishedCampaignsByClub(clubId);

      res.json({
        campaigns,
        total: campaigns.length
      });

    } catch (error) {
      console.error('Get published campaigns error:', error);
      res.status(500).json({ error: 'Failed to fetch published campaigns' });
    }
  }
);

// Get a specific campaign with stats
router.get('/api/campaigns/:campaignId', authenticateToken, async (req, res) => {
  try {
    const { campaignId } = req.params;

    const campaign = await campaignService.getCampaignStats(campaignId, req.club_id);

    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    res.json({ campaign });
  } catch (error) {
    console.error('Get campaign error:', error);
    res.status(500).json({ error: 'Failed to fetch campaign' });
  }
});

// Update a campaign
router.put('/api/campaigns/:campaignId', authenticateToken, async (req, res) => {
  try {
    const { campaignId } = req.params;
    const updateData = { ...req.body };

    // Validate target_amount if provided
    if (updateData.target_amount !== undefined) {
      const parsed = parseFloat(updateData.target_amount);
      if (Number.isNaN(parsed) || parsed <= 0) {
        return res.status(400).json({ error: 'Target amount must be greater than 0' });
      }
      updateData.target_amount = parsed;
    }

    // Validate dates if both provided
    if (updateData.start_date && updateData.end_date) {
      const startDate = new Date(updateData.start_date);
      const endDate = new Date(updateData.end_date);
      if (endDate <= startDate) {
        return res.status(400).json({ error: 'End date must be after start date' });
      }
    }

    // Validate category if provided
    if (updateData.category && !VALID_CATEGORIES.includes(updateData.category)) {
      return res.status(400).json({
        error: `Invalid category. Must be one of: ${VALID_CATEGORIES.join(', ')}`,
      });
    }

    // Validate impact areas if provided
    if (updateData.impact_area_ids !== undefined) {
      const ia = validateImpactAreas(updateData.impact_area_ids);
      if (!ia.ok) {
        return res.status(400).json({ error: ia.error });
      }
      updateData.impact_area_ids = Array.isArray(updateData.impact_area_ids)
        ? updateData.impact_area_ids.map((id) => id.trim()).filter(Boolean)
        : [];
    }

    // Normalize tags if provided
    if (updateData.tags !== undefined) {
      updateData.tags = Array.isArray(updateData.tags)
        ? updateData.tags
            .map((t) => (typeof t === 'string' ? t.trim() : ''))
            .filter(Boolean)
        : [];
    }

    // Trim string fields
    if (updateData.name) updateData.name = updateData.name.trim();
    if (updateData.description) updateData.description = updateData.description.trim();
    if (updateData.category) updateData.category = updateData.category.trim();

    const campaign = await campaignService.updateCampaign(campaignId, req.club_id, updateData);

    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found or no changes made' });
    }

    const socketManager = getSocketManager(req);
    if (socketManager && typeof socketManager.emitCampaignUpdated === 'function') {
      socketManager.emitCampaignUpdated(req.club_id, campaign);
    }

    res.json({
      message: 'Campaign updated successfully',
      campaign,
    });
  } catch (error) {
    if (error.message === 'No valid fields to update') {
      return res.status(400).json({ error: error.message });
    }

    console.error('Update campaign error:', error);
    res.status(500).json({ error: 'Failed to update campaign' });
  }
});

// Delete a campaign
router.delete('/api/campaigns/:campaignId', authenticateToken, async (req, res) => {
  try {
    const { campaignId } = req.params;

    const deleted = await campaignService.deleteCampaign(campaignId, req.club_id);

    if (!deleted) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    const socketManager = getSocketManager(req);
    if (socketManager && typeof socketManager.emitCampaignDeleted === 'function') {
      socketManager.emitCampaignDeleted(req.club_id, campaignId);
    }

    res.json({ message: 'Campaign deleted successfully' });
  } catch (error) {
    if (error.message === 'Cannot delete campaign with associated events') {
      return res.status(400).json({ error: error.message });
    }

    console.error('Delete campaign error:', error);
    res.status(500).json({ error: 'Failed to delete campaign' });
  }
});

// Get campaigns by category (additional endpoint for filtering)
router.get(
  '/api/clubs/:clubId/campaigns/category/:category',
  authenticateToken,
  async (req, res) => {
    try {
      const { clubId, category } = req.params;

      // Verify user belongs to this club
      if (clubId !== req.club_id) {
        return res.status(403).json({ error: 'Access denied' });
      }

      if (!VALID_CATEGORIES.includes(category)) {
        return res.status(400).json({
          error: `Invalid category. Must be one of: ${VALID_CATEGORIES.join(', ')}`,
        });
      }

      const campaigns = await campaignService.getCampaignsByClub(clubId);
      const filteredCampaigns = campaigns.filter((campaign) => campaign.category === category);

      res.json({
        campaigns: filteredCampaigns,
        total: filteredCampaigns.length,
        category,
      });
    } catch (error) {
      console.error('Get campaigns by category error:', error);
      res.status(500).json({ error: 'Failed to fetch campaigns' });
    }
  }
);

// GET /api/campaigns/:campaignId/events
router.get('/api/campaigns/:campaignId/events', authenticateToken, async (req, res) => {
  try {
    const { campaignId } = req.params;

    const events = await eventService.getEventsByCampaign(campaignId, req.club_id);

    res.json({
      events,
      total: events.length,
    });
  } catch (error) {
    console.error('Get campaign events error:', error);
    res.status(500).json({ error: 'Failed to fetch campaign events' });
  }
});

export default router;
