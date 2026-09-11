/**
 * Dev-only Puzzle Test Routes
 * server/puzzles/routes/puzzleDevRoutes.js
 *
 * Lets you generate any puzzle type at any difficulty and submit answers
 * without needing a real challenge, subscription, or week schedule.
 *
 * Mount behind an environment guard in your main router file:
 *
 *   if (process.env.NODE_ENV !== 'production') {
 *     const puzzleDevRoutes = (await import('./puzzles/routes/puzzleDevRoutes.js')).default;
 *     app.use('/api/puzzles/dev', puzzleDevRoutes);
 *   }
 *
 * All routes still require a valid auth token (authenticateAny) so the
 * middleware normalisation is exercised, but there are no subscription,
 * credit, or schedule checks.
 */

import express from 'express';
import { v4 as uuidv4 } from 'uuid';

import { generatePuzzleForWeek, getClientPuzzleData } from '../services/puzzleGenerationService.js';
import { validateAndScore } from '../services/puzzleValidationService.js';
import { saveProgress, loadProgress } from '../services/puzzleProgressService.js';
import authenticateAny from '../../middleware/authenticateAny.js';

const router = express.Router();

// In-memory store for dev instances so we can score them without a real DB row.
// Keyed by instance ID. Cleared on server restart - that's fine for dev.
const devInstances = new Map();

/**
 * POST /api/puzzles/dev/generate
 * Body: { puzzleType, difficulty? }
 *
 * Generates a fresh puzzle instance. Returns the client-safe puzzle data
 * plus an instanceId you can use for save/submit.
 */
router.post('/generate', authenticateAny, async (req, res) => {
  try {
    const { puzzleType, difficulty = 'medium' } = req.body;

    if (!puzzleType) {
      return res.status(400).json({ error: 'puzzleType is required' });
    }

    // Use a throwaway challengeId + week so the generation service works
    // without a real schedule row.
   const fakeChallengeId = uuidv4();
    const clubId = req.club_id ?? 'dev-club';

    const instance = await generatePuzzleForWeek({
      challengeId: fakeChallengeId,
      weekNumber:  1,
      puzzleType,
      difficulty,
      clubId,
    });

    // Stash the full instance (including solutionData) so /submit can score it
    devInstances.set(instance.id, instance);

    // Keep the map from growing without bound
    if (devInstances.size > 200) {
      const oldest = devInstances.keys().next().value;
      devInstances.delete(oldest);
    }

    const clientData = getClientPuzzleData(instance);

    return res.json({
      puzzle: clientData,
      progress: null,
      progressMeta: null,
      previousSubmission: null,
    });
  } catch (err) {
    console.error('[puzzles/dev] generate error:', err);
    res.status(500).json({ error: 'Failed to generate puzzle.', detail: err.message });
  }
});

/**
 * POST /api/puzzles/dev/:instanceId/save
 * Body: { progressData }
 */
router.post('/:instanceId/save', authenticateAny, async (req, res) => {
  try {
    const { instanceId } = req.params;
    const { progressData } = req.body;
    const playerId = req.user?.id;
    const clubId = req.club_id ?? 'dev-club';

    if (!progressData) return res.status(400).json({ error: 'progressData is required' });

    if (playerId) {
      await saveProgress({ instanceId, playerId, clubId, progressData });
    }

    res.json({ ok: true });
  } catch (err) {
    console.error('[puzzles/dev] save error:', err);
    res.status(500).json({ error: 'Failed to save progress.', detail: err.message });
  }
});

/**
 * POST /api/puzzles/dev/:instanceId/submit
 * Body: { puzzleType, answer, timeTakenSeconds }
 */
router.post('/:instanceId/submit', authenticateAny, async (req, res) => {
  try {
    const { instanceId } = req.params;
    const { puzzleType, answer, timeTakenSeconds } = req.body;
    const playerId = req.user?.id ?? 'dev-player';
    const clubId = req.club_id ?? 'dev-club';

    if (!puzzleType) return res.status(400).json({ error: 'puzzleType is required' });
    if (!answer) return res.status(400).json({ error: 'answer is required' });

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
    console.error('[puzzles/dev] submit error:', err);
    res.status(500).json({ error: 'Failed to submit puzzle.', detail: err.message });
  }
});

export default router;