import {
  randomBetween,
  errorToScore,
  isValidNormalisedCoord,
  clamp,
  calcSpeedBonus,
  lerp,
} from '../../utils/eliminationHelpers.js';
import { ROUND_TYPE, ROUND_DURATION, GAME_RULES } from '../../utils/eliminationConstants.js';

const PATH_TYPES = ['linear', 'bounce', 'arc'];

// Error is normalised against a fixed arena distance, not target radius.
// This means difficulty affects target size and speed — not the scoring window.
// A miss of MAX_SCORE_DISTANCE units (35% of arena) = zero score.
const MAX_SCORE_DISTANCE = 0.35;

const reflect01 = (value) => {
  let v = value;
  while (v < 0 || v > 1) {
    if (v < 0) v = -v;
    if (v > 1) v = 2 - v;
  }
  return v;
};

export const getMovingTargetPosition = (config, timestampMs) => {
  const startedAt = config.roundStartTimestamp ?? config.startedAt ?? 0;
  const elapsedSec = Math.max(0, (timestampMs - startedAt) / 1000);

  const {
    startPosition,
    velocity,
    phaseOffset = 0,
    arcAmplitude = 0,
    pathType,
  } = config;

  const baseX = startPosition.x + velocity.x * elapsedSec + phaseOffset;
  const baseY = startPosition.y + velocity.y * elapsedSec;

  if (pathType === 'linear') {
    return { x: reflect01(baseX), y: reflect01(baseY) };
  }

  if (pathType === 'bounce') {
    return {
      x: reflect01(baseX),
      y: reflect01(baseY + Math.sin(elapsedSec * Math.PI * 1.6) * arcAmplitude),
    };
  }

  // arc
  return {
    x: reflect01(baseX),
    y: reflect01(baseY + Math.sin(elapsedSec * Math.PI * 1.1) * arcAmplitude),
  };
};

export const generateRoundConfig = ({ difficulty = 1, totalRounds } = {}) => {
  const safeTotalRounds = totalRounds ?? GAME_RULES.TOTAL_ROUNDS;
  const maxDifficulty = 1 + (safeTotalRounds - 1) * 0.15;
  const t = Math.min(1, Math.max(0, (difficulty - 1) / (maxDifficulty - 1)));
  const tCurved = Math.sqrt(t);

  const pathType =
    t < 0.35
      ? 'linear'
      : PATH_TYPES[Math.floor(randomBetween(0, PATH_TYPES.length))] ?? 'linear';

  const targetRadius = lerp(0.09, 0.045, tCurved);
  const speedUnitsPerSec = lerp(0.22, 0.52, tCurved);
  const angle = randomBetween(0, Math.PI * 2);

  return {
    roundType: ROUND_TYPE.MOVING_TARGET_TAP,
    durationMs: ROUND_DURATION[ROUND_TYPE.MOVING_TARGET_TAP],
    pathType,
    startPosition: {
      x: randomBetween(0.18, 0.82),
      y: randomBetween(0.2, 0.8),
    },
    velocity: {
      x: Math.cos(angle) * speedUnitsPerSec,
      y: Math.sin(angle) * speedUnitsPerSec * 0.7,
    },
    targetRadius,
    phaseOffset: randomBetween(-0.18, 0.18),
    arcAmplitude: pathType === 'linear' ? 0 : lerp(0.04, 0.09, tCurved),
  };
};

export const validateSubmission = (submission) => {
  if (!submission) return { valid: false, error: 'No submission provided' };
  if (submission.roundType !== ROUND_TYPE.MOVING_TARGET_TAP) {
    return { valid: false, error: 'Round type mismatch' };
  }
  if (typeof submission.submittedAt !== 'number' || submission.submittedAt <= 0) {
    return { valid: false, error: 'Invalid submittedAt' };
  }
  if (!isValidNormalisedCoord(submission.tapX, submission.tapY)) {
    return { valid: false, error: 'Invalid tap coordinates' };
  }
  if (submission.clientTargetPosition) {
    if (
      typeof submission.clientTargetPosition.x !== 'number' ||
      typeof submission.clientTargetPosition.y !== 'number'
    ) {
      return { valid: false, error: 'Invalid clientTargetPosition' };
    }
  }
  return { valid: true };
};

export const scoreSubmission = (submission, config, roundStartTimestamp) => {
  const startTs = roundStartTimestamp ?? config.roundStartTimestamp ?? null;

  if (startTs == null) {
    return {
      score: 0,
      precisionScore: 0,
      speedBonus: 0,
      errorDistance: 1,
      targetPosition: config.startPosition,
      missDistance: 1,
    };
  }

  // Recompute server-side target position for validation
  const serverTargetPosition = getMovingTargetPosition(
    { ...config, roundStartTimestamp: startTs },
    submission.submittedAt,
  );

  // Use client-reported position if within plausible drift tolerance (0.15 units).
  // This scores against what the player actually saw. If outside tolerance,
  // fall back to server computation — likely tampered.
  let targetPosition = serverTargetPosition;

  if (
    submission.clientTargetPosition &&
    typeof submission.clientTargetPosition.x === 'number' &&
    typeof submission.clientTargetPosition.y === 'number'
  ) {
    const cdx = submission.clientTargetPosition.x - serverTargetPosition.x;
    const cdy = submission.clientTargetPosition.y - serverTargetPosition.y;
    const drift = Math.sqrt(cdx * cdx + cdy * cdy);
    if (drift <= 0.15) {
      targetPosition = submission.clientTargetPosition;
    }
  }

  const dx = submission.tapX - targetPosition.x;
  const dy = submission.tapY - targetPosition.y;
  const missDistance = Math.sqrt(dx * dx + dy * dy);

  // Fixed normalisation — difficulty affects target size/speed, not the scoring window.
  // Round 1 (large target, slow) and Round 8 (small target, fast) use the same
  // distance scale so scores are comparable across difficulty levels.
  const errorDistance = clamp(missDistance / MAX_SCORE_DISTANCE, 0, 1);
  const precisionScore = errorToScore(errorDistance, 1);
  const speedBonus = calcSpeedBonus(
    submission.submittedAt,
    startTs,
    config.durationMs,
    errorDistance,
    config.roundType,
  );

  return {
    score: precisionScore + speedBonus,
    precisionScore,
    speedBonus,
    errorDistance,
    targetPosition,
    missDistance,
  };
};

export const formatRevealData = (submission, config, scoringResult) => ({
  roundType: ROUND_TYPE.MOVING_TARGET_TAP,
  pathType: config.pathType,
  startPosition: config.startPosition,
  velocity: config.velocity,
  phaseOffset: config.phaseOffset,
  arcAmplitude: config.arcAmplitude,
  targetRadius: config.targetRadius,
  playerTap: { x: submission.tapX, y: submission.tapY },
  targetPosition: scoringResult.targetPosition ?? config.startPosition,
  missDistance: scoringResult.missDistance ?? 1,
  errorDistance: scoringResult.errorDistance,
  score: scoringResult.score,
});