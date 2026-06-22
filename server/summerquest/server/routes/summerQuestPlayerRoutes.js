// Summer Quest — Player Routes
// All routes here are scoped to req.sqAuth.sqId (the logged-in player's
// own ID) — never accept a playerId from the request body/params for
// these endpoints, per spec section 18 "Player endpoints must only
// return that player's data."

import express from 'express';
import { summerQuestAuthMiddleware, requireSummerQuestRole } from '../middleware/summerQuestAuth.js';
import { getPlayerDashboard } from '../services/SummerQuestDashboardService.js';
import { upsertDailyLog, getDailyLog, getRecentLogs, SummerQuestLogLockedError } from '../services/SummerQuestDailyLogService.js';
import { checkAndUnlockBadges } from '../services/SummerQuestBadgeService.js';
import { getRotatingTip, getAllNutritionContent, acknowledgeNutritionGuide } from '../services/SummerQuestNutritionService.js';
import { submitWeeklyChallenge, getChallengeSubmission, getAllChallengeSubmissions, SummerQuestChallengeError } from '../services/SummerQuestChallengeService.js';
import { getPlayerProgress } from '../services/SummerQuestProgressService.js';
import { getPlayerFacingTeamBoard } from '../services/SummerQuestTeamBoardService.js';
import { todayDateOnly, getProgrammeWeek } from '../utils/sqDates.js';

const PROGRAMME_START_DATE = process.env.SQ_PROGRAMME_START_DATE || '2026-06-15';

const router = express.Router();

router.use(summerQuestAuthMiddleware, requireSummerQuestRole(['player']));

router.get('/dashboard', async (req, res) => {
  try {
    const dashboard = await getPlayerDashboard(req.sqPool, { playerId: req.sqAuth.sqId });
    const tip = await getRotatingTip(req.sqPool);
    res.json({ ...dashboard, nutritionTip: tip });
  } catch (err) {
    console.error('[summer-quest] player dashboard error:', err);
    res.status(500).json({ error: 'Could not load dashboard.' });
  }
});

router.get('/today', async (req, res) => {
  try {
    const log = await getDailyLog(req.sqPool, { playerId: req.sqAuth.sqId, logDate: todayDateOnly() });
    res.json({ date: todayDateOnly(), log });
  } catch (err) {
    console.error('[summer-quest] player today error:', err);
    res.status(500).json({ error: 'Could not load today.' });
  }
});

// For the "go back and fill in a missed day" flow — any past date,
// not just today. Still scoped to the logged-in player only.
router.get('/log/:logDate', async (req, res) => {
  try {
    const log = await getDailyLog(req.sqPool, { playerId: req.sqAuth.sqId, logDate: req.params.logDate });
    res.json({ date: req.params.logDate, log });
  } catch (err) {
    console.error('[summer-quest] player log-by-date error:', err);
    res.status(500).json({ error: 'Could not load that day.' });
  }
});

router.post('/daily-log', async (req, res) => {
  try {
    const { logDate, ...fields } = req.body;
    const teamId = req.sqAuth.sqTeamId;

    const log = await upsertDailyLog(req.sqPool, {
      playerId: req.sqAuth.sqId,
      teamId,
      logDate: logDate || todayDateOnly(),
      fields,
    });

    const newlyUnlockedBadges = await checkAndUnlockBadges(req.sqPool, { playerId: req.sqAuth.sqId });

    res.json({ log, newlyUnlockedBadges });
  } catch (err) {
    if (err instanceof SummerQuestLogLockedError) {
      return res.status(400).json({ error: err.message });
    }
    console.error('[summer-quest] daily-log save error:', err);
    res.status(500).json({ error: 'Could not save today\u2019s mission.' });
  }
});

router.get('/recent-logs', async (req, res) => {
  try {
    const logs = await getRecentLogs(req.sqPool, { playerId: req.sqAuth.sqId, limit: 14 });
    res.json(logs);
  } catch (err) {
    console.error('[summer-quest] recent logs error:', err);
    res.status(500).json({ error: 'Could not load recent logs.' });
  }
});

router.get('/badges', async (req, res) => {
  try {
    const [allBadges] = await req.sqPool.execute(
      `SELECT badge_key, name, description, icon, colour, sort_order FROM fundraisely_tt_badges ORDER BY sort_order ASC`
    );
    const [unlocked] = await req.sqPool.execute(
      `SELECT badge_key, unlocked_at FROM fundraisely_tt_player_badges WHERE player_id = ?`,
      [req.sqAuth.sqId]
    );
    const unlockedMap = new Map(unlocked.map((row) => [row.badge_key, row.unlocked_at]));

    const badges = allBadges.map((badge) => ({
      ...badge,
      unlocked: unlockedMap.has(badge.badge_key),
      unlockedAt: unlockedMap.get(badge.badge_key) || null,
    }));

    res.json(badges);
  } catch (err) {
    console.error('[summer-quest] badges error:', err);
    res.status(500).json({ error: 'Could not load badges.' });
  }
});

router.get('/nutrition', async (req, res) => {
  try {
    const content = await getAllNutritionContent(req.sqPool);
    res.json(content);
  } catch (err) {
    console.error('[summer-quest] nutrition error:', err);
    res.status(500).json({ error: 'Could not load nutrition guide.' });
  }
});

router.post('/nutrition/acknowledge', async (req, res) => {
  try {
    await acknowledgeNutritionGuide(req.sqPool, { playerId: req.sqAuth.sqId });
    res.json({ ok: true });
  } catch (err) {
    console.error('[summer-quest] nutrition acknowledge error:', err);
    res.status(500).json({ error: 'Could not save.' });
  }
});

router.get('/challenges/current', async (req, res) => {
  try {
    const weekNumber = getProgrammeWeek(todayDateOnly(), PROGRAMME_START_DATE);
    const submission = await getChallengeSubmission(req.sqPool, { playerId: req.sqAuth.sqId, weekNumber });
    res.json({ weekNumber, submission });
  } catch (err) {
    console.error('[summer-quest] current challenge error:', err);
    res.status(500).json({ error: 'Could not load this week\u2019s challenge.' });
  }
});

router.get('/challenges', async (req, res) => {
  try {
    const submissions = await getAllChallengeSubmissions(req.sqPool, { playerId: req.sqAuth.sqId });
    res.json(submissions);
  } catch (err) {
    console.error('[summer-quest] challenges list error:', err);
    res.status(500).json({ error: 'Could not load challenges.' });
  }
});

router.post('/challenges/:weekNumber', async (req, res) => {
  try {
    const weekNumber = Number(req.params.weekNumber);
    const result = await submitWeeklyChallenge(req.sqPool, {
      playerId: req.sqAuth.sqId,
      teamId: req.sqAuth.sqTeamId,
      weekNumber,
      body: req.body,
    });

    const newlyUnlockedBadges = await checkAndUnlockBadges(req.sqPool, { playerId: req.sqAuth.sqId });

    res.json({ submission: result, newlyUnlockedBadges });
  } catch (err) {
    if (err instanceof SummerQuestChallengeError) {
      return res.status(400).json({ error: err.message });
    }
    console.error('[summer-quest] challenge submit error:', err);
    res.status(500).json({ error: 'Could not save your challenge result.' });
  }
});

router.get('/progress', async (req, res) => {
  try {
    const progress = await getPlayerProgress(req.sqPool, { playerId: req.sqAuth.sqId });
    res.json(progress);
  } catch (err) {
    console.error('[summer-quest] progress error:', err);
    res.status(500).json({ error: 'Could not load progress.' });
  }
});

router.get('/team-board', async (req, res) => {
  try {
    const board = await getPlayerFacingTeamBoard(req.sqPool, { teamId: req.sqAuth.sqTeamId });
    res.json(board);
  } catch (err) {
    console.error('[summer-quest] team board error:', err);
    res.status(500).json({ error: 'Could not load the team board.' });
  }
});

export default router;
