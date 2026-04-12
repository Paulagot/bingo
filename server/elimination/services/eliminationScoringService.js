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
import { rankByScore, calcSpeedBonus } from '../utils/eliminationHelpers.js';

// ─── Engine Registry ──────────────────────────────────────────────────────────
const ENGINES = {
  [ROUND_TYPE.TRUE_CENTRE]:       trueCentreEngine,
  [ROUND_TYPE.MIDPOINT_SPLIT]:    midpointSplitEngine,
  [ROUND_TYPE.STOP_THE_BAR]:      stopTheBarEngine,
  [ROUND_TYPE.DRAW_ANGLE]:        drawAngleEngine,
  [ROUND_TYPE.FLASH_GRID]:        flashGridEngine,
  [ROUND_TYPE.QUICK_COUNT]:       quickCountEngine,
  [ROUND_TYPE.FLASH_MATHS]:       flashMathsEngine,
  [ROUND_TYPE.LINE_LENGTH]:       lineLengthEngine,
  [ROUND_TYPE.BALANCE_POINT]:     balancePointEngine,
  [ROUND_TYPE.PATTERN_ALIGN]:     patternAlignEngine,
  [ROUND_TYPE.SEQUENCE_GAP]:      sequenceGapEngine,
  [ROUND_TYPE.COLOUR_COUNT]:      colourCountEngine,
  [ROUND_TYPE.TIME_ESTIMATION]:   timeEstimationEngine,
  [ROUND_TYPE.CHARACTER_COUNT]:   characterCountEngine,
  [ROUND_TYPE.REACTION_TAP]: reactionTapEngine,
  [ROUND_TYPE.MOVING_TARGET_TAP]: movingTargetTapEngine,
  [ROUND_TYPE.PATH_TRACE]: pathTraceEngine,
};

const getEngine = (roundType) => {
  const engine = ENGINES[roundType];
  if (!engine) throw new Error(`No engine registered for round type: ${roundType}`);
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
  getEngine(config.roundType).validateSubmission(submission, config);

/**
 * Score a single submission.
 * @returns {{ score: number, errorDistance: number, ...engineExtras }}
 */
export const scoreOne = (submission, config) =>
  getEngine(config.roundType).scoreSubmission(
    submission,
    config,
    config.roundStartTimestamp ?? null,
  );

/**
 * Build reveal data for a single player result.
 */
export const buildReveal = (submission, config, scoringResult) =>
  getEngine(config.roundType).formatRevealData(submission, config, scoringResult);

/**
 * Score all submissions for a round.
 * Handles players who did not submit (assigns score 0).
 *
 * @param {Object} submissions  - { playerId: submissionObj }
 * @param {Object} config       - round config
 * @param {string[]} activePlayerIds
 * @returns {Object[]} ranked results
 */
export const scoreRound = (submissions, config, activePlayerIds) => {
  const scoreMap = {};
  const detailMap = {};

  for (const playerId of activePlayerIds) {
    const submission = submissions[playerId];
    if (!submission) {
      scoreMap[playerId] = 0;
      detailMap[playerId] = {
        score: 0,
        errorDistance: null,
        speedBonus: 0,
        precisionScore: 0,
        playerStopPosition: undefined,
        actualElapsed: undefined,
      };
    } else {
      const result = scoreOne(submission, config);

      // New engines calculate speedBonus internally and return it.
      // Old engines (true_centre, midpoint_split, stop_the_bar) do not — apply it here.
      let precisionScore, speedBonus, totalScore;

      if (result.speedBonus !== undefined) {
        precisionScore = result.precisionScore ?? result.score;
        speedBonus = result.speedBonus;
        totalScore = result.score;
      } else {
        precisionScore = result.score;
        speedBonus = calcSpeedBonus(
          submission.submittedAt,
          config.roundStartTimestamp ?? config.startedAt ?? submission.submittedAt,
          config.durationMs,
          result.errorDistance,
          config.roundType,
        );
        totalScore = precisionScore + speedBonus;
      }

      scoreMap[playerId] = totalScore;
      detailMap[playerId] = {
        score: totalScore,
        precisionScore,
        diff: result.diff, 
        speedBonus,
        errorDistance: result.errorDistance,
        playerStopPosition: result.playerStopPosition,
        actualElapsed: result.actualElapsed,   // ← carried through for time_estimation reveal
      };
    }
  }

  const ranked = rankByScore(scoreMap);

  return ranked.map((entry) => {
    const submission = submissions[entry.playerId];
    const detail = detailMap[entry.playerId] ?? {
      score: 0,
      errorDistance: null,
      speedBonus: 0,
      playerStopPosition: undefined,
      actualElapsed: undefined,
    };

    // Pass all engine-specific extras through to formatRevealData.
    // Each engine only uses what it needs — extras are ignored.
    const rawResult = submission
      ? {
          score: detail.precisionScore ?? detail.score,
          errorDistance: detail.errorDistance,
          diff: detail.diff, 
          playerStopPosition: detail.playerStopPosition,
          actualElapsed: detail.actualElapsed,   // ← time_estimation needs this
        }
      : { score: 0, errorDistance: null };

    const revealData = submission
      ? buildReveal(submission, config, rawResult)
      : null;

    return {
      ...entry,
      speedBonus: detail.speedBonus ?? 0,
      revealData,
      didSubmit: !!submission,
    };
  });
};