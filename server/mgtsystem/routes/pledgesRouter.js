// server/pledges/api/pledgesRouter.js
// Handles club league pledge registrations
// Pattern: thin router → delegates to pledgeService

import express from 'express';
import authenticateToken from '../../middleware/auth.js';
import {
  createPledge,
  getPledgesByClub,
  getPledgeCount,
} from '../services/pledgeService.js';

const router = express.Router();

const DEBUG = true;

/* -------------------------------------------------------------------------- */
/*                      PUBLIC ROUTES (No auth required)                      */
/* -------------------------------------------------------------------------- */

/**
 * POST /api/pledges/clubs-league
 * Submit a new club league pledge (public)
 */
router.post('/clubs-league', async (req, res) => {
  try {
    const { clubName, email, role, roleOther, campaign } = req.body;

    // Basic validation
    if (!clubName || !email || !role || !campaign) {
      return res.status(400).json({
        message: 'clubName, email, role, and campaign are required',
      });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return res.status(400).json({ message: 'Invalid email address' });
    }

    if (campaign !== 'clubs_league_2026') {
      return res.status(400).json({ message: 'Invalid campaign' });
    }

    const pledge = await createPledge({
      clubName: clubName.trim(),
      email: email.trim(),
      role,
      roleOther: role === 'Other' ? roleOther?.trim() || null : null,
      campaign,
    });

    if (DEBUG) {
      console.log('[Pledges API] ✅ Pledge created:', pledge.pledgeId);
    }

    return res.status(201).json({
      ok: true,
      pledge: {
        pledgeId: pledge.pledgeId,
        clubName: pledge.clubName,
        campaign: pledge.campaign,
      },
    });

  } catch (err) {
    console.error('[Pledges API] ❌ Error creating pledge:', err);

    // Duplicate email for this campaign
    if (err.code === '23505' || err.message?.includes('already pledged')) {
      return res.status(409).json({
        message: 'This email has already pledged for this campaign.',
      });
    }

    return res.status(500).json({
      message: 'Something went wrong. Please try again.',
    });
  }
});

/**
 * GET /api/pledges/clubs-league/count
 * Public count — how many clubs have pledged (for display on landing page)
 */
router.get('/clubs-league/count', async (_req, res) => {
  try {
    const total = await getPledgeCount('clubs_league_2026');
    return res.status(200).json({ total });
  } catch (err) {
    console.error('[Pledges API] ❌ Error fetching count:', err);
    return res.status(500).json({ message: 'internal_error' });
  }
});

/* -------------------------------------------------------------------------- */
/*                    AUTHENTICATED ROUTES (Admin only)                       */
/* -------------------------------------------------------------------------- */

router.use(authenticateToken);

/**
 * GET /api/pledges/clubs-league
 * Get all pledges for admin dashboard (authenticated)
 */
router.get('/clubs-league', async (req, res) => {
  try {
    const clubId = req.club_id;

    const pledges = await getPledgesByClub('clubs_league_2026', clubId);

    return res.status(200).json({
      ok: true,
      total: pledges.length,
      pledges,
    });

  } catch (err) {
    console.error('[Pledges API] ❌ Error fetching pledges:', err);
    return res.status(500).json({ message: 'internal_error' });
  }
});

export default router;