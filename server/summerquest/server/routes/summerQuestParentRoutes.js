// Summer Quest — Parent Routes
// All routes accept a :playerId param but every service call underneath
// re-verifies ownership (assertParentOwnsPlayer) — never trust the
// param alone. See spec section 18.

import express from 'express';
import { summerQuestAuthMiddleware, requireSummerQuestRole } from '../middleware/summerQuestAuth.js';
import { getParentDashboard } from '../services/SummerQuestParentDashboardService.js';
import {
  getPlayersForParent,
  getPlayerForParent,
  resetPlayerCode,
  SummerQuestOwnershipError,
} from '../services/SummerQuestParentPlayerAccessService.js';
import {
  getWeekSummaryForSignoff,
  submitWeeklySignoff,
  SummerQuestSignoffError,
} from '../services/SummerQuestSignoffService.js';
import { hashSecret, generatePlayerCode } from '../services/sqAuthUtils.js';
import { getActiveTeamId } from '../services/sqActiveTeam.js';

const router = express.Router();

router.use(summerQuestAuthMiddleware, requireSummerQuestRole(['parent']));

function handleOwnershipError(err, res) {
  if (err instanceof SummerQuestOwnershipError) {
    res.status(403).json({ error: err.message });
    return true;
  }
  return false;
}

router.get('/dashboard', async (req, res) => {
  try {
    const dashboard = await getParentDashboard(req.sqPool, { parentId: req.sqAuth.sqId });
    res.json(dashboard);
  } catch (err) {
    console.error('[summer-quest] parent dashboard error:', err);
    res.status(500).json({ error: 'Could not load dashboard.' });
  }
});

router.get('/players', async (req, res) => {
  try {
    const players = await getPlayersForParent(req.sqPool, { parentId: req.sqAuth.sqId });
    res.json(players);
  } catch (err) {
    console.error('[summer-quest] parent players error:', err);
    res.status(500).json({ error: 'Could not load players.' });
  }
});

router.get('/players/:playerId', async (req, res) => {
  try {
    const player = await getPlayerForParent(req.sqPool, {
      parentId: req.sqAuth.sqId,
      playerId: req.params.playerId,
    });
    res.json(player);
  } catch (err) {
    if (handleOwnershipError(err, res)) return;
    console.error('[summer-quest] parent player detail error:', err);
    res.status(500).json({ error: 'Could not load player.' });
  }
});

router.post('/players/:playerId/reset-code', async (req, res) => {
  try {
    const newCode = generatePlayerCode();
    const newCodeHash = await hashSecret(newCode);
    await resetPlayerCode(req.sqPool, {
      parentId: req.sqAuth.sqId,
      playerId: req.params.playerId,
      newPlayerCodeHash: newCodeHash,
    });
    // Returned once here only — never stored or logged in plain text
    // beyond this response. See spec section 18 "Never return player code"
    // (that rule is about ongoing storage/exposure; a fresh reset has to
    // be shown to the parent exactly once so they can tell their child).
    res.json({ newPlayerCode: newCode });
  } catch (err) {
    if (handleOwnershipError(err, res)) return;
    console.error('[summer-quest] reset code error:', err);
    res.status(500).json({ error: 'Could not reset player code.' });
  }
});

router.get('/players/:playerId/weeks/:weekNumber', async (req, res) => {
  try {
    const summary = await getWeekSummaryForSignoff(req.sqPool, {
      parentId: req.sqAuth.sqId,
      playerId: req.params.playerId,
      weekNumber: Number(req.params.weekNumber),
    });
    res.json(summary);
  } catch (err) {
    if (handleOwnershipError(err, res)) return;
    console.error('[summer-quest] week summary error:', err);
    res.status(500).json({ error: 'Could not load week summary.' });
  }
});

router.post('/players/:playerId/weeks/:weekNumber/signoff', async (req, res) => {
  try {
    const { signedName, note } = req.body;
    const teamId = await getActiveTeamId(req.sqPool);
    const signoff = await submitWeeklySignoff(req.sqPool, {
      parentId: req.sqAuth.sqId,
      teamId,
      playerId: req.params.playerId,
      weekNumber: Number(req.params.weekNumber),
      signedName,
      note,
    });
    res.status(201).json(signoff);
  } catch (err) {
    if (handleOwnershipError(err, res)) return;
    if (err instanceof SummerQuestSignoffError) {
      return res.status(400).json({ error: err.message });
    }
    console.error('[summer-quest] signoff submit error:', err);
    res.status(500).json({ error: 'Could not save sign-off.' });
  }
});

export default router;
