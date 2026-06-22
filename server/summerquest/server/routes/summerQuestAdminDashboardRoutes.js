// Summer Quest — Admin Dashboard / Players / Exports Routes
// Accessible to both coach_admin and super_admin (spec section 5.2).
// Invite management stays in summerQuestAdminInviteRoutes.js
// (super_admin only) — kept separate since that file has a stricter
// role gate than this one.

import express from 'express';
import { summerQuestAuthMiddleware, requireSummerQuestRole } from '../middleware/summerQuestAuth.js';
import { getActiveTeamId } from '../services/sqActiveTeam.js';
import { getAdminDashboardSummary } from '../services/SummerQuestAdminDashboardService.js';
import { getAdminPlayerTable, getAdminPlayerDetail } from '../services/SummerQuestAdminPlayerService.js';
import { getAdminFacingTeamBoard } from '../services/SummerQuestTeamBoardService.js';
import {
  exportPlayerSummariesCsv,
  exportDailyLogsCsv,
  exportWeeklyChallengesCsv,
  exportSignoffsCsv,
} from '../services/SummerQuestExportService.js';

const router = express.Router();

router.use(summerQuestAuthMiddleware, requireSummerQuestRole(['super_admin', 'coach_admin']));

router.get('/dashboard', async (req, res) => {
  try {
    const teamId = await getActiveTeamId(req.sqPool);
    const summary = await getAdminDashboardSummary(req.sqPool, { teamId });
    res.json(summary);
  } catch (err) {
    console.error('[summer-quest] admin dashboard error:', err);
    res.status(500).json({ error: 'Could not load dashboard.' });
  }
});

router.get('/players', async (req, res) => {
  try {
    const teamId = await getActiveTeamId(req.sqPool);
    const table = await getAdminPlayerTable(req.sqPool, { teamId });
    res.json(table);
  } catch (err) {
    console.error('[summer-quest] admin players error:', err);
    res.status(500).json({ error: 'Could not load players.' });
  }
});

router.get('/players/:playerId', async (req, res) => {
  try {
    const teamId = await getActiveTeamId(req.sqPool);
    const detail = await getAdminPlayerDetail(req.sqPool, { teamId, playerId: req.params.playerId });
    if (!detail) return res.status(404).json({ error: 'Player not found.' });
    res.json(detail);
  } catch (err) {
    console.error('[summer-quest] admin player detail error:', err);
    res.status(500).json({ error: 'Could not load player.' });
  }
});

router.get('/team-board', async (req, res) => {
  try {
    const teamId = await getActiveTeamId(req.sqPool);
    const board = await getAdminFacingTeamBoard(req.sqPool, { teamId });
    res.json(board);
  } catch (err) {
    console.error('[summer-quest] admin team board error:', err);
    res.status(500).json({ error: 'Could not load team board.' });
  }
});

function sendCsv(res, filename, csvString) {
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(csvString);
}

router.get('/exports/player-summaries.csv', async (req, res) => {
  try {
    const teamId = await getActiveTeamId(req.sqPool);
    const csv = await exportPlayerSummariesCsv(req.sqPool, { teamId });
    sendCsv(res, 'player-summaries.csv', csv);
  } catch (err) {
    console.error('[summer-quest] export player summaries error:', err);
    res.status(500).json({ error: 'Could not generate export.' });
  }
});

router.get('/exports/daily-logs.csv', async (req, res) => {
  try {
    const teamId = await getActiveTeamId(req.sqPool);
    const csv = await exportDailyLogsCsv(req.sqPool, { teamId });
    sendCsv(res, 'daily-logs.csv', csv);
  } catch (err) {
    console.error('[summer-quest] export daily logs error:', err);
    res.status(500).json({ error: 'Could not generate export.' });
  }
});

router.get('/exports/weekly-challenges.csv', async (req, res) => {
  try {
    const teamId = await getActiveTeamId(req.sqPool);
    const csv = await exportWeeklyChallengesCsv(req.sqPool, { teamId });
    sendCsv(res, 'weekly-challenges.csv', csv);
  } catch (err) {
    console.error('[summer-quest] export weekly challenges error:', err);
    res.status(500).json({ error: 'Could not generate export.' });
  }
});

router.get('/exports/signoffs.csv', async (req, res) => {
  try {
    const teamId = await getActiveTeamId(req.sqPool);
    const csv = await exportSignoffsCsv(req.sqPool, { teamId });
    sendCsv(res, 'signoffs.csv', csv);
  } catch (err) {
    console.error('[summer-quest] export signoffs error:', err);
    res.status(500).json({ error: 'Could not generate export.' });
  }
});

export default router;
