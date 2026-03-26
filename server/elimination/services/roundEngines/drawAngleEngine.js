import {
  randomBetween,

  errorToScore,
  calcSpeedBonus,
} from '../../utils/eliminationHelpers.js';
import { ROUND_TYPE, ROUND_DURATION } from '../../utils/eliminationConstants.js';

// ─── Generate ─────────────────────────────────────────────────────────────────

export const generateRoundConfig = ({ difficulty = 1 } = {}) => {
  // Target angle 0–180° — harder difficulties use angles closer to each other
  const targetAngle = Math.round(randomBetween(5, 175));

  // Initial angle offset so player always has to move: at least 20° away
  let initialAngle = Math.round(randomBetween(5, 175));
  while (Math.abs(initialAngle - targetAngle) < 20) {
    initialAngle = Math.round(randomBetween(5, 175));
  }

  // Anchor near centre — keep well away from edges so line never exits viewport
  const anchorX = randomBetween(0.40, 0.60);
  const anchorY = randomBetween(0.40, 0.60);

  // Guide visibility: V1 always shows guide briefly
  const guideVisibleMs = Math.round(randomBetween(1500, 2500));

  return {
    roundType: ROUND_TYPE.DRAW_ANGLE,
    targetAngle,
    initialAngle,
    anchorX,
    anchorY,
    guideVisibleMs,
    lineLength: randomBetween(0.25, 0.4), // normalised line length
    durationMs: ROUND_DURATION[ROUND_TYPE.DRAW_ANGLE],
  };
};

// ─── Validate ─────────────────────────────────────────────────────────────────

export const validateSubmission = (submission) => {
  if (!submission) return { valid: false, error: 'No submission provided' };
  if (submission.roundType !== ROUND_TYPE.DRAW_ANGLE)
    return { valid: false, error: 'Round type mismatch' };
  if (typeof submission.angle !== 'number')
    return { valid: false, error: 'Invalid angle' };
  return { valid: true };
};

// ─── Score ────────────────────────────────────────────────────────────────────

const angularDiff = (a, b) => {
  const diff = Math.abs(a - b) % 180;
  return Math.min(diff, 180 - diff);
};

export const scoreSubmission = (submission, config, roundStartTimestamp) => {
  const diff = angularDiff(submission.angle, config.targetAngle);
  // Normalise: 0° diff = perfect, 90° = worst possible
  const errorDistance = diff / 90;
  const precisionScore = errorToScore(errorDistance, 1.0);
  const speedBonus = calcSpeedBonus(
    submission.submittedAt, roundStartTimestamp,
    config.durationMs, errorDistance, config.roundType,
  );
  return { score: precisionScore + speedBonus, precisionScore, speedBonus, errorDistance, diff };
};

// ─── Reveal ───────────────────────────────────────────────────────────────────

export const formatRevealData = (submission, config, scoringResult) => ({
  roundType: ROUND_TYPE.DRAW_ANGLE,
  targetAngle: config.targetAngle,
  playerAngle: submission.angle,
  difference: scoringResult.diff,
  errorDistance: scoringResult.errorDistance,
  score: scoringResult.score,
});