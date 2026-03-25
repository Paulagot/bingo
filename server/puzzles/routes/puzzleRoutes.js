/**
 * Puzzle Routes
 * server/puzzles/routes/puzzleRoutes.js
 */

import express from 'express';

import database from '../../config/database.js';
import { generatePuzzleForWeek, getClientPuzzleData } from '../services/puzzleGenerationService.js';
import { validateAndScore } from '../services/puzzleValidationService.js';
import { saveProgress, loadProgress } from '../services/puzzleProgressService.js';
import authenticateAny from '../../middleware/authenticateAny.js';

const router = express.Router();

/**
 * GET /api/puzzles/:challengeId/:weekNumber
 *
 * Returns the puzzle instance for this week plus any saved progress.
 * Also returns a previousSubmission object if the player has already
 * submitted this puzzle — the frontend uses this to lock the shell
 * immediately on load rather than showing a playable puzzle.
 */
router.get('/:challengeId/:weekNumber', authenticateAny, async (req, res) => {
  try {
    const { challengeId, weekNumber } = req.params;
    const playerId = req.user?.id;
    const weekNum  = parseInt(weekNumber, 10);

    // ── 1. Get club_id from the challenge record ──────────────────────────
    const [[challenge]] = await database.connection.execute(
      'SELECT club_id FROM fundraisely_puzzle_challenges WHERE id = ? LIMIT 1',
      [challengeId]
    );

    if (!challenge) {
      // Dev/test fallback — no real challenge row
      const fallbackClubId = req.club_id;
      if (!fallbackClubId) {
        return res.status(404).json({ error: 'Challenge not found' });
      }

      const { puzzleType, difficulty } = req.query;
      if (!puzzleType) return res.status(400).json({ error: 'puzzleType query param is required' });

      const instance   = await generatePuzzleForWeek({
        challengeId,
        weekNumber: weekNum,
        puzzleType,
        difficulty: difficulty ?? 'medium',
        clubId:     fallbackClubId,
      });
      const clientData = getClientPuzzleData(instance);
      const progress   = playerId ? await loadProgress(instance.id, playerId) : null;

      return res.json({
        puzzle:             clientData,
        progress:           progress?.progressData ?? null,
        previousSubmission: null,
      });
    }

    const clubId = challenge.club_id;

    // ── 2. Get puzzle config from the schedule ────────────────────────────
    const [[schedule]] = await database.connection.execute(
      `SELECT puzzle_type, difficulty, unlocks_at
       FROM fundraisely_puzzle_schedule
       WHERE challenge_id = ? AND week_number = ?
       LIMIT 1`,
      [challengeId, weekNum]
    );

    if (!schedule) {
      return res.status(404).json({ error: 'Week not scheduled' });
    }

    // ── 3. Check week is unlocked ─────────────────────────────────────────
    if (schedule.unlocks_at && new Date(schedule.unlocks_at) > new Date()) {
      return res.status(403).json({
        error:     'Week not yet unlocked',
        unlocksAt: schedule.unlocks_at,
      });
    }

    // ── 4. Generate (or fetch cached) puzzle instance ─────────────────────
    const instance   = await generatePuzzleForWeek({
      challengeId,
      weekNumber:  weekNum,
      puzzleType:  schedule.puzzle_type,
      difficulty:  schedule.difficulty,
      clubId,
    });
    const clientData = getClientPuzzleData(instance);

    // ── 5. Check for a prior submission ───────────────────────────────────
    // If the player already submitted, return their score so the frontend
    // can lock the shell immediately without waiting for a submit attempt.
    let previousSubmission = null;
    if (playerId) {
      const [submissionRows] = await database.connection.execute(
        `SELECT is_correct, total_score, base_score, bonus_score, penalty_score
         FROM fundraisely_puzzle_submissions
         WHERE instance_id = ? AND player_id = ?
         LIMIT 1`,
        [instance.id, playerId]
      );

      if (submissionRows.length > 0) {
        const s = submissionRows[0];
        previousSubmission = {
          completed:    true,
          correct:      s.is_correct === 1,
          baseScore:    s.base_score,
          bonusScore:   s.bonus_score,
          penaltyScore: s.penalty_score,
          totalScore:   s.total_score,
        };
      }
    }

    // ── 6. Load saved progress (only relevant if not yet submitted) ───────
    const progress = (!previousSubmission && playerId)
      ? await loadProgress(instance.id, playerId)
      : null;

    return res.json({
      puzzle:             clientData,
      progress:           progress?.progressData ?? null,
      previousSubmission,
    });

  } catch (err) {
    console.error('[puzzles] GET error:', err);
    res.status(500).json({ error: 'Failed to load puzzle.' });
  }
});

/**
 * POST /api/puzzles/:instanceId/save
 * Body: { progressData }
 */
router.post('/:instanceId/save', authenticateAny, async (req, res) => {
  try {
    const { instanceId }  = req.params;
    const { progressData } = req.body;
    const playerId = req.user?.id;
    const clubId   = req.club_id;

    if (!playerId)     return res.status(401).json({ error: 'Unauthorised' });
    if (!clubId)       return res.status(403).json({ error: 'Club not identified' });
    if (!progressData) return res.status(400).json({ error: 'progressData is required' });

    await saveProgress({ instanceId, playerId, clubId, progressData });
    res.json({ ok: true });
  } catch (err) {
    console.error('[puzzles] save error:', err);
    res.status(500).json({ error: 'Failed to save progress.' });
  }
});

/**
 * POST /api/puzzles/:instanceId/submit
 * Body: { puzzleType, answer, timeTakenSeconds }
 */
router.post('/:instanceId/submit', authenticateAny, async (req, res) => {
  try {
    const { instanceId } = req.params;
    const { puzzleType, answer, timeTakenSeconds } = req.body;
    const playerId = req.user?.id;
    const clubId   = req.club_id;

    if (!playerId)   return res.status(401).json({ error: 'Unauthorised' });
    if (!clubId)     return res.status(403).json({ error: 'Club not identified' });
    if (!puzzleType) return res.status(400).json({ error: 'puzzleType is required' });
    if (!answer)     return res.status(400).json({ error: 'answer is required' });

    const result = await validateAndScore({
      instanceId,
      playerId,
      clubId,
      puzzleType,
      answer,
      timeTakenSeconds,
    });

    res.json(result);
  } catch (err) {
    console.error('[puzzles] submit error:', err);
    res.status(500).json({ error: 'Failed to submit puzzle.' });
  }
});

export default router;