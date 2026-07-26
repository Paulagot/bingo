import express from 'express';
import authenticateToken from '../../middleware/auth.js';
import { createSponsoredActivity, getSponsoredActivity, updateSponsoredActivity } from '../services/sponsoredActivityService.js';
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

const fail = (res, e) => res.status(e?.statusCode || 500).json({
  error: e?.message || 'internal_error',
  ...(e?.currentStatus && { currentStatus: e.currentStatus }),
});

function actor(req) {
  return {
    id: req.user?.id || req.club_id,
    name: req.user?.name || req.user?.email || 'Admin',
    role: req.user?.role === 'host' ? 'host' : 'admin',
  };
}

router.post('/', async (req,res) => {
  try { res.status(201).json(await createSponsoredActivity({ clubId:req.club_id, ...req.body })); }
  catch(e){ fail(res,e); }
});
router.get('/:roomId', async (req,res) => {
  try {
    const room = await getSponsoredActivity({ clubId:req.club_id, roomId:req.params.roomId });
    if(!room) return res.status(404).json({error:'not_found'});
    res.json({room});
  } catch(e){ fail(res,e); }
});
router.patch('/:roomId', async (req,res) => {
  try { res.json(await updateSponsoredActivity({ clubId:req.club_id, roomId:req.params.roomId, ...req.body })); }
  catch(e){ fail(res,e); }
});

router.get('/:roomId/summary', async (req, res) => {
  try { res.json(await getSponsoredContributionSummary({ roomId: req.params.roomId, clubId: req.club_id })); }
  catch (e) { fail(res, e); }
});
router.get('/:roomId/contributions', async (req, res) => {
  try {
    res.json(await listSponsoredContributions({
      roomId: req.params.roomId,
      clubId: req.club_id,
      status: req.query.status || null,
      search: req.query.search || '',
    }));
  } catch (e) { fail(res, e); }
});
router.post('/:roomId/contributions', async (req, res) => {
  try {
    const result = await createManualSponsoredContribution({
      roomId: req.params.roomId,
      clubId: req.club_id,
      createdBy: actor(req).id,
      ...req.body,
    });
    res.status(201).json(result);
  } catch (e) { fail(res, e); }
});
router.patch('/:roomId/contributions/:contributionId/confirm', async (req, res) => {
  try {
    res.json(await confirmSponsoredContribution({
      roomId: req.params.roomId,
      clubId: req.club_id,
      contributionId: req.params.contributionId,
      confirmer: actor(req),
    }));
  } catch (e) { fail(res, e); }
});
router.patch('/:roomId/contributions/:contributionId/dispute', async (req, res) => {
  try {
    res.json(await disputeSponsoredContribution({
      roomId: req.params.roomId,
      clubId: req.club_id,
      contributionId: req.params.contributionId,
      disputeReason: req.body?.reason,
      disputedBy: actor(req),
    }));
  } catch (e) { fail(res, e); }
});
router.post('/:roomId/open', async (req, res) => {
  try { res.json(await openSponsoredActivityNow({ roomId: req.params.roomId, clubId: req.club_id })); }
  catch (e) { fail(res, e); }
});
router.post('/:roomId/close', async (req, res) => {
  try { res.json(await closeSponsoredActivity({ roomId: req.params.roomId, clubId: req.club_id })); }
  catch (e) { fail(res, e); }
});

export default router;
