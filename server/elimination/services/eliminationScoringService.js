// server/elimination/services/eliminationScoringService.js

import * as trueCentreEngine from './roundEngines/trueCentreEngine.js';
import * as midpointSplitEngine from './roundEngines/midpointSplitEngine.js';
import * as stopTheBarEngine from './roundEngines/stopTheBarEngine.js';
import * as drawAngleEngine from './roundEngines/drawAngleEngine.js';
import * as flashGridEngine from './roundEngines/flashGridEngine.js';
import * as quickCountEngine from './roundEngines/quickCountEngine.js';
import * as flashMathsEngine from './roundEngines/flashMathsEngine.js';
import * as lineLengthEngine from './roundEngines/lineLengthEngine.js';
import * as balancePointEngine from './roundEngines/balancePointEngine.js';
import * as patternAlignEngine from './roundEngines/patternAlignEngine.js';
import * as sequenceGapEngine from './roundEngines/sequenceGapEngine.js';
import * as colourCountEngine from './roundEngines/colourCountEngine.js';
import * as timeEstimationEngine from './roundEngines/timeEstimationEngine.js';
import * as characterCountEngine from './roundEngines/characterCountEngine.js';
import * as reactionTapEngine from './roundEngines/reactionTapEngine.js';
import * as movingTargetTapEngine from './roundEngines/movingTargetTapEngine.js';
import * as pathTraceEngine from './roundEngines/pathTraceEngine.js';

import { ROUND_TYPE } from '../utils/eliminationConstants.js';
import {
  rankByScore,
  calcSpeedBonus,
} from '../utils/eliminationHelpers.js';

// ─── Engine Registry ──────────────────────────────────────────────────────────

const ENGINES = {
  [ROUND_TYPE.TRUE_CENTRE]: trueCentreEngine,
  [ROUND_TYPE.MIDPOINT_SPLIT]: midpointSplitEngine,
  [ROUND_TYPE.STOP_THE_BAR]: stopTheBarEngine,
  [ROUND_TYPE.DRAW_ANGLE]: drawAngleEngine,
  [ROUND_TYPE.FLASH_GRID]: flashGridEngine,
  [ROUND_TYPE.QUICK_COUNT]: quickCountEngine,
  [ROUND_TYPE.FLASH_MATHS]: flashMathsEngine,
  [ROUND_TYPE.LINE_LENGTH]: lineLengthEngine,
  [ROUND_TYPE.BALANCE_POINT]: balancePointEngine,
  [ROUND_TYPE.PATTERN_ALIGN]: patternAlignEngine,
  [ROUND_TYPE.SEQUENCE_GAP]: sequenceGapEngine,
  [ROUND_TYPE.COLOUR_COUNT]: colourCountEngine,
  [ROUND_TYPE.TIME_ESTIMATION]: timeEstimationEngine,
  [ROUND_TYPE.CHARACTER_COUNT]: characterCountEngine,
  [ROUND_TYPE.REACTION_TAP]: reactionTapEngine,
  [ROUND_TYPE.MOVING_TARGET_TAP]: movingTargetTapEngine,
  [ROUND_TYPE.PATH_TRACE]: pathTraceEngine,
};

const getEngine = (roundType) => {
  const engine = ENGINES[roundType];

  if (!engine) {
    throw new Error(
      `No engine registered for round type: ${roundType}`,
    );
  }

  return engine;
};

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Generate a round config using the appropriate engine.
 */
export const generateConfig = (roundType, opts = {}) =>
  getEngine(roundType).generateRoundConfig(opts);

/**
 * Validate a submission against the active round config.
 */
export const validateSubmission = (submission, config) =>
  getEngine(config.roundType).validateSubmission(
    submission,
    config,
  );

/**
 * Score a single submission.
 *
 * Each engine may return engine-specific fields in addition to score /
 * errorDistance. Those fields must be preserved so the same engine can
 * later build an accurate reveal.
 *
 * @returns {{
 *   score: number,
 *   errorDistance: number,
 *   ...engineExtras
 * }}
 */
export const scoreOne = (submission, config) =>
  getEngine(config.roundType).scoreSubmission(
    submission,
    config,
    config.roundStartTimestamp ?? null,
  );

/**
 * Build reveal data for a single player's result.
 *
 * scoringResult is intentionally allowed to contain engine-specific fields.
 * Each engine's formatRevealData() decides which fields it needs.
 */
export const buildReveal = (
  submission,
  config,
  scoringResult,
) =>
  getEngine(config.roundType).formatRevealData(
    submission,
    config,
    scoringResult,
  );

/**
 * Score all submissions for a round.
 *
 * Players who did not submit receive score 0.
 *
 * IMPORTANT:
 * The original result returned by each round engine is preserved in
 * engineResult. This prevents engine-specific reveal information from being
 * lost between scoreSubmission() and formatRevealData().
 *
 * For example Moving Target Tap returns:
 *   - targetPosition
 *   - missDistance
 *
 * Those values are required to accurately show where the moving target was
 * when the player tapped.
 *
 * Existing score behaviour is intentionally unchanged:
 *
 *   - New engines that calculate speedBonus internally keep doing so.
 *   - Older engines still receive their speed bonus here.
 *   - Ranking continues to use total score.
 *   - Reveal score continues to use precisionScore where that was the
 *     previous behaviour.
 *
 * @param {Object} submissions
 *   { playerId: submissionObj }
 *
 * @param {Object} config
 *   Round configuration.
 *
 * @param {string[]} activePlayerIds
 *   IDs of players participating in this round.
 *
 * @returns {Object[]} ranked results
 */
export const scoreRound = (
  submissions,
  config,
  activePlayerIds,
) => {
  const scoreMap = {};
  const detailMap = {};

  // ─── Score every active player ──────────────────────────────────────────────

  for (const playerId of activePlayerIds) {
    const submission = submissions[playerId];

    // ── No submission ────────────────────────────────────────────────────────

    if (!submission) {
      scoreMap[playerId] = 0;

      detailMap[playerId] = {
        score: 0,
        precisionScore: 0,
        speedBonus: 0,
        errorDistance: null,

        // Keep a consistent shape.
        engineResult: null,
      };

      continue;
    }

    // ── Score through the appropriate round engine ───────────────────────────

    const result = scoreOne(submission, config);

    /*
     * Some newer engines calculate both precision and speed internally and
     * return speedBonus themselves.
     *
     * Older engines return only their precision-style score, so their speed
     * bonus is added here.
     *
     * DO NOT change this distinction casually — it preserves existing scoring
     * behaviour across all round types.
     */
    let precisionScore;
    let speedBonus;
    let totalScore;

    if (result.speedBonus !== undefined) {
      // Newer engine.
      precisionScore =
        result.precisionScore ?? result.score;

      speedBonus = result.speedBonus;

      // result.score already includes any internally-calculated bonus.
      totalScore = result.score;
    } else {
      // Legacy engine.
      precisionScore = result.score;

      speedBonus = calcSpeedBonus(
        submission.submittedAt,
        config.roundStartTimestamp ??
          config.startedAt ??
          submission.submittedAt,
        config.durationMs,
        result.errorDistance,
        config.roundType,
      );

      totalScore = precisionScore + speedBonus;
    }

    // Ranking always uses the final total score.
    scoreMap[playerId] = totalScore;

    /*
     * Preserve the complete result from scoreSubmission().
     *
     * Previously only a small whitelist of fields was copied here:
     *
     *   diff
     *   errorDistance
     *   playerStopPosition
     *   actualElapsed
     *
     * That meant engine-specific fields such as:
     *
     *   targetPosition
     *   missDistance
     *
     * were discarded before formatRevealData() was called.
     *
     * Keeping engineResult fixes that without changing the established
     * scoring values used by the other rounds.
     */
    detailMap[playerId] = {
      score: totalScore,
      precisionScore,
      speedBonus,
      errorDistance: result.errorDistance,

      engineResult: result,
    };
  }

  // ─── Rank using total score ─────────────────────────────────────────────────

  const ranked = rankByScore(scoreMap);

  // ─── Build reveal payload for each ranked player ────────────────────────────

  return ranked.map((entry) => {
    const submission = submissions[entry.playerId];

    const detail = detailMap[entry.playerId] ?? {
      score: 0,
      precisionScore: 0,
      speedBonus: 0,
      errorDistance: null,
      engineResult: null,
    };

    /*
     * Reconstruct the scoring result supplied to the engine's reveal formatter.
     *
     * Start with the COMPLETE original engine result so engine-specific
     * information survives.
     *
     * Then deliberately override score with precisionScore to preserve the
     * behaviour that existed before this change.
     *
     * Example:
     *
     * Moving Target engineResult:
     *
     * {
     *   score,
     *   precisionScore,
     *   speedBonus,
     *   errorDistance,
     *   targetPosition,
     *   missDistance
     * }
     *
     * targetPosition and missDistance now reach formatRevealData().
     */
    const rawResult = submission
      ? {
          ...(detail.engineResult ?? {}),

          score:
            detail.precisionScore ??
            detail.engineResult?.score ??
            detail.score,

          errorDistance:
            detail.engineResult?.errorDistance ??
            detail.errorDistance,
        }
      : {
          score: 0,
          errorDistance: null,
        };

    const revealData = submission
      ? buildReveal(
          submission,
          config,
          rawResult,
        )
      : null;

    return {
      ...entry,

      speedBonus: detail.speedBonus ?? 0,

      revealData,

      didSubmit: !!submission,
    };
  });
};