import {
  randomBetween,
  randomFrom,
  distance,
  errorToScore,
  calcSpeedBonus,
} from '../../utils/eliminationHelpers.js';
import { ROUND_TYPE, ROUND_DURATION } from '../../utils/eliminationConstants.js';

const SHAPE_TYPES = ['square', 'triangle', 'pentagon', 'diamond', 'hexagon', 'rectangle'];

// Angular difference handling wrap-around (0–360)
const angularDiff360 = (a, b) => {
  const diff = Math.abs(a - b) % 360;
  return Math.min(diff, 360 - diff);
};

// ─── Generate ─────────────────────────────────────────────────────────────────

export const generateRoundConfig = ({ difficulty = 1 } = {}) => {
  const shapeType = randomFrom(SHAPE_TYPES);

  // Target — random position and rotation
  const targetX = randomBetween(0.25, 0.75);
  const targetY = randomBetween(0.20, 0.60);
  const targetRotation = Math.round(randomBetween(0, 355));

  // Player starts offset from target — more offset at higher difficulty
  const maxOffset = 0.15 + (difficulty - 1) * 0.04;
  const playerStartX = clampNorm(targetX + randomBetween(-maxOffset, maxOffset));
  const playerStartY = clampNorm(targetY + randomBetween(-maxOffset, maxOffset));
  const playerStartRotation = Math.round(
    (targetRotation + randomBetween(20, 80 + difficulty * 15)) % 360
  );

  // Shape size
  const shapeSize = randomBetween(0.15, 0.30);

  // Target visible duration
  const targetVisibleMs = Math.round(
    Math.max(600, randomBetween(2000 - difficulty * 250, 3000 - difficulty * 200))
  );

  return {
    roundType: ROUND_TYPE.PATTERN_ALIGN,
    shapeType,
    shapeSize,
    targetX,
    targetY,
    targetRotation,
    playerStartX,
    playerStartY,
    playerStartRotation,
    targetVisibleMs,
    durationMs: ROUND_DURATION[ROUND_TYPE.PATTERN_ALIGN],
  };
};

const clampNorm = (v) => Math.min(0.9, Math.max(0.1, v));

// ─── Validate ─────────────────────────────────────────────────────────────────

export const validateSubmission = (submission) => {
  if (!submission) return { valid: false, error: 'No submission provided' };
  if (submission.roundType !== ROUND_TYPE.PATTERN_ALIGN)
    return { valid: false, error: 'Round type mismatch' };
  if (!submission.position || typeof submission.position.x !== 'number')
    return { valid: false, error: 'Invalid position' };
  if (typeof submission.rotation !== 'number')
    return { valid: false, error: 'Invalid rotation' };
  return { valid: true };
};

// ─── Score ────────────────────────────────────────────────────────────────────

export const scoreSubmission = (submission, config, roundStartTimestamp) => {
  const posError = distance(
    submission.position.x, submission.position.y,
    config.targetX, config.targetY,
  );
  const rotDiff = angularDiff360(submission.rotation, config.targetRotation);
  const rotError = rotDiff / 180; // normalise to 0–1 (max 180° off)

  // Position and rotation weighted equally
  const errorDistance = (posError + rotError) / 2;
  const precisionScore = errorToScore(errorDistance, 1.0);
  const speedBonus = calcSpeedBonus(
    submission.submittedAt, roundStartTimestamp,
    config.durationMs, errorDistance, config.roundType,
  );

  return {
    score: precisionScore + speedBonus,
    precisionScore, speedBonus, errorDistance,
    positionError: posError,
    rotationError: rotError,
    rotationDiff: rotDiff,
  };
};

// ─── Reveal ───────────────────────────────────────────────────────────────────

export const formatRevealData = (submission, config, scoringResult) => ({
  roundType: ROUND_TYPE.PATTERN_ALIGN,
  targetX: config.targetX,
  targetY: config.targetY,
  targetRotation: config.targetRotation,
  playerX: submission.position.x,
  playerY: submission.position.y,
  playerRotation: submission.rotation,
  positionError: scoringResult.positionError,
  rotationDiff: scoringResult.rotationDiff,
  errorDistance: scoringResult.errorDistance,
  score: scoringResult.score,
});