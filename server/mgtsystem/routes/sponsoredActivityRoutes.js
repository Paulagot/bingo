// server/mgtsystem/routes/sponsoredActivityRoutes.js

import express from 'express';
import authenticateToken from '../../middleware/auth.js';
import {
  createSponsoredActivity,
  getSponsoredActivity,
  updateSponsoredActivity,
} from '../services/sponsoredActivityService.js';
import {
  listSponsoredContributions,
  getSponsoredContributionSummary,
  createManualSponsoredContribution,
  confirmSponsoredContribution,
  disputeSponsoredContribution,
  openSponsoredActivityNow,
  closeSponsoredActivity,
} from '../services/sponsoredActivityContributionService.js';

const router = express.Router();

router.use(authenticateToken);

const fail = (res, error) => {
  const status = error?.statusCode || 500;

  return res.status(status).json({
    error: error?.message || 'internal_error',
    ...(error?.publicMessage && {
      message: error.publicMessage,
    }),
    ...(error?.currentStatus && {
      currentStatus: error.currentStatus,
    }),
    ...(error?.upgradeUrl && {
      upgradeUrl: error.upgradeUrl,
    }),
    ...(error?.planCode && {
      planCode: error.planCode,
    }),
    ...(error?.creditKey && {
      creditKey: error.creditKey,
    }),
    ...(Number.isFinite(error?.creditsRemaining) && {
      creditsRemaining: error.creditsRemaining,
    }),
  });
};

function actor(req) {
  return {
    id: req.user?.id || req.club_id,
    name: req.user?.name || req.user?.email || 'Admin',
    role: req.user?.role === 'host' ? 'host' : 'admin',
  };
}

/*
|--------------------------------------------------------------------------
| Activity setup and management
|--------------------------------------------------------------------------
*/

router.post('/', async (req, res) => {
  try {
    // clubId is deliberately applied after req.body so a client cannot
    // override the authenticated club by submitting its own clubId.
    const result = await createSponsoredActivity({
      ...req.body,
      clubId: req.club_id,
      hostId: req.body?.hostId || req.user?.id || req.club_id,
      hostName:
        req.body?.hostName ||
        req.user?.name ||
        req.user?.email ||
        null,
    });

    return res.status(201).json(result);
  } catch (error) {
    return fail(res, error);
  }
});

router.get('/:roomId', async (req, res) => {
  try {
    const room = await getSponsoredActivity({
      clubId: req.club_id,
      roomId: req.params.roomId,
    });

    if (!room) {
      return res.status(404).json({
        error: 'not_found',
      });
    }

    return res.json({ room });
  } catch (error) {
    return fail(res, error);
  }
});

router.patch('/:roomId', async (req, res) => {
  try {
    const result = await updateSponsoredActivity({
      ...req.body,
      clubId: req.club_id,
      roomId: req.params.roomId,
    });

    return res.json(result);
  } catch (error) {
    return fail(res, error);
  }
});

/*
|--------------------------------------------------------------------------
| Contributions
|--------------------------------------------------------------------------
*/

router.get('/:roomId/summary', async (req, res) => {
  try {
    const result = await getSponsoredContributionSummary({
      roomId: req.params.roomId,
      clubId: req.club_id,
    });

    return res.json(result);
  } catch (error) {
    return fail(res, error);
  }
});

router.get('/:roomId/contributions', async (req, res) => {
  try {
    const result = await listSponsoredContributions({
      roomId: req.params.roomId,
      clubId: req.club_id,
      status: req.query.status || null,
      search: req.query.search || '',
    });

    return res.json(result);
  } catch (error) {
    return fail(res, error);
  }
});

router.post('/:roomId/contributions', async (req, res) => {
  try {
    const result = await createManualSponsoredContribution({
      ...req.body,
      roomId: req.params.roomId,
      clubId: req.club_id,
      createdBy: actor(req).id,
    });

    return res.status(201).json(result);
  } catch (error) {
    return fail(res, error);
  }
});

router.patch(
  '/:roomId/contributions/:contributionId/confirm',
  async (req, res) => {
    try {
      const result = await confirmSponsoredContribution({
        roomId: req.params.roomId,
        clubId: req.club_id,
        contributionId: req.params.contributionId,
        confirmer: actor(req),
      });

      return res.json(result);
    } catch (error) {
      return fail(res, error);
    }
  },
);

router.patch(
  '/:roomId/contributions/:contributionId/dispute',
  async (req, res) => {
    try {
      const result = await disputeSponsoredContribution({
        roomId: req.params.roomId,
        clubId: req.club_id,
        contributionId: req.params.contributionId,
        disputeReason: req.body?.reason,
        disputedBy: actor(req),
      });

      return res.json(result);
    } catch (error) {
      return fail(res, error);
    }
  },
);

/*
|--------------------------------------------------------------------------
| Lifecycle
|--------------------------------------------------------------------------
*/

router.post('/:roomId/open', async (req, res) => {
  try {
    const result = await openSponsoredActivityNow({
      roomId: req.params.roomId,
      clubId: req.club_id,
    });

    return res.json(result);
  } catch (error) {
    return fail(res, error);
  }
});

router.post('/:roomId/close', async (req, res) => {
  try {
    const result = await closeSponsoredActivity({
      roomId: req.params.roomId,
      clubId: req.club_id,
    });

    return res.json(result);
  } catch (error) {
    return fail(res, error);
  }
});

export default router;
