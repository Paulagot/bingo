import {
  randomBetween,
  randomFrom,
  distance,
  errorToScore,
  calcSpeedBonus,
  lerp,
} from '../../utils/eliminationHelpers.js';
import {
  ROUND_TYPE,
  ROUND_DURATION,
  GAME_RULES,
} from '../../utils/eliminationConstants.js';

const SHAPE_TYPES = ['square', 'triangle', 'pentagon', 'diamond', 'hexagon', 'rectangle'];

const clampNorm = (v) => Math.min(0.9, Math.max(0.1, v));

const angularDiff360 = (a, b) => {
  const diff = Math.abs(a - b) % 360;
  return Math.min(diff, 360 - diff);
};

// ─── Generate ─────────────────────────────────────────────────────────────────

export const generateRoundConfig = ({ difficulty = 1, totalRounds } = {}) => {
  // ── Dynamic difficulty pattern (Section 0.2) ──────────────────────────────
  const safeTotalRounds = totalRounds ?? GAME_RULES.TOTAL_ROUNDS;
  const maxDifficulty = 1 + (safeTotalRounds - 1) * 0.15;
  const t = Math.min(1, Math.max(0, (difficulty - 1) / (maxDifficulty - 1)));
  const tCurved = Math.sqrt(t);

  const shapeType = randomFrom(SHAPE_TYPES);

  const targetX = randomBetween(0.25, 0.75);
  const targetY = randomBetween(0.20, 0.60);
  const targetRotation = Math.round(randomBetween(0, 355));

  // ── Player start offset: further away at high difficulty ──────────────────
  const maxOffset = lerp(0.12, 0.28, t);
  const playerStartX = clampNorm(targetX + randomBetween(-maxOffset, maxOffset));
  const playerStartY = clampNorm(targetY + randomBetween(-maxOffset, maxOffset));

  // ── Rotation offset: wider at high difficulty ─────────────────────────────
  const minRotOffset = Math.round(lerp(20, 60, t));
  const maxRotOffset = Math.round(lerp(80, 160, t));
  const playerStartRotation = Math.round(
    (targetRotation + randomBetween(minRotOffset, maxRotOffset)) % 360
  );

  // ── Shape size: bigger range, shrinks at high difficulty ──────────────────
  const shapeSize = randomBetween(
    lerp(0.24, 0.16, t),
    lerp(0.38, 0.24, t),
  );

  // ── Target visible duration: 3000ms (easy) → 1200ms (hard), sqrt-curved ───
  const targetVisibleMs = Math.round(lerp(3000, 1200, tCurved));

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
  const rotError = rotDiff / 180;

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
  shapeType: config.shapeType,
  shapeSize: config.shapeSize,
  targetX: config.targetX,
  targetY: config.targetY,
  targetRotation: config.targetRotation,
  playerX: submission?.position?.x,
  playerY: submission?.position?.y,
  playerRotation: submission?.rotation,
  positionError: scoringResult.positionError,
  rotationDiff: scoringResult.rotationDiff,
  errorDistance: scoringResult.errorDistance,
  score: scoringResult.score,
});