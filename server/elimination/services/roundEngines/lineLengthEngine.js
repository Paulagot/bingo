import {
  randomBetween,
  clamp,
  errorToScore,
  calcSpeedBonus,
} from '../../utils/eliminationHelpers.js';
import { ROUND_TYPE, ROUND_DURATION } from '../../utils/eliminationConstants.js';

const ORIENTATIONS = ['horizontal', 'vertical', 'diagonal'];

// ─── Generate ─────────────────────────────────────────────────────────────────

export const generateRoundConfig = ({ difficulty = 1 } = {}) => {
  // Target length 0.15–0.7 of viewport — wide range for variety
  const targetLength = randomBetween(0.15, 0.70);

  const orientation = ORIENTATIONS[Math.floor(Math.random() * ORIENTATIONS.length)];

  // Reference line position — top half of screen
  const refX = randomBetween(0.15, 0.85);
  const refY = randomBetween(0.15, 0.40);

  // Player line start — bottom half, randomised
  const playerStartX = randomBetween(0.1, 0.5);
  const playerStartY = randomBetween(0.55, 0.75);

  // Reference visible duration (show then hide)
  const referenceDurationMs = Math.round(
    Math.max(800, randomBetween(2500 - difficulty * 300, 3500 - difficulty * 300))
  );

  return {
    roundType: ROUND_TYPE.LINE_LENGTH,
    targetLength,
    orientation,
    referenceLineX: refX,
    referenceLineY: refY,
    playerStartX,
    playerStartY,
    referenceDurationMs,
    durationMs: ROUND_DURATION[ROUND_TYPE.LINE_LENGTH],
  };
};

// ─── Validate ─────────────────────────────────────────────────────────────────

export const validateSubmission = (submission) => {
  if (!submission) return { valid: false, error: 'No submission provided' };
  if (submission.roundType !== ROUND_TYPE.LINE_LENGTH)
    return { valid: false, error: 'Round type mismatch' };
  if (typeof submission.length !== 'number' || submission.length < 0 || submission.length > 1.5)
    return { valid: false, error: 'Invalid length' };
  return { valid: true };
};

// ─── Score ────────────────────────────────────────────────────────────────────

export const scoreSubmission = (submission, config, roundStartTimestamp) => {
  const diff = Math.abs(submission.length - config.targetLength);
  const errorDistance = clamp(diff, 0, 1);
  const precisionScore = errorToScore(errorDistance, 1.0);
  const speedBonus = calcSpeedBonus(
    submission.submittedAt, roundStartTimestamp,
    config.durationMs, errorDistance, config.roundType,
  );
  return { score: precisionScore + speedBonus, precisionScore, speedBonus, errorDistance, diff };
};

// ─── Reveal ───────────────────────────────────────────────────────────────────

export const formatRevealData = (submission, config, scoringResult) => ({
  roundType: ROUND_TYPE.LINE_LENGTH,
  targetLength: config.targetLength,
  playerLength: submission.length,
  difference: scoringResult.diff,
  orientation: config.orientation,
  errorDistance: scoringResult.errorDistance,
  score: scoringResult.score,
});