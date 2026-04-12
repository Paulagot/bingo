import {
  randomBetween,
  randomFrom,
  distance,
  errorToScore,
  isValidNormalisedCoord,
  lerp,
} from '../../utils/eliminationHelpers.js';
import { ROUND_TYPE, ROUND_DURATION, GAME_RULES } from '../../utils/eliminationConstants.js';

const SHAPE_TYPES = ['circle', 'square', 'rectangle', 'triangle', 'pentagon', 'hexagon', 'diamond'];

/**
 * Pick a shape that isn't the same as the last one used.
 * Ensures every True Centre round looks visually distinct.
 */
const pickShape = (lastShape = null) => {
  const available = lastShape
    ? SHAPE_TYPES.filter(s => s !== lastShape)
    : SHAPE_TYPES;
  return randomFrom(available);
};

// ─── Generate ─────────────────────────────────────────────────────────────────

export const generateRoundConfig = ({ difficulty = 1, lastShape = null, totalRounds } = {}) => {
  const safeTotalRounds = totalRounds ?? GAME_RULES.TOTAL_ROUNDS;
  const maxDifficulty = 1 + (safeTotalRounds - 1) * 0.15;
  const t = Math.min(1, Math.max(0, (difficulty - 1) / (maxDifficulty - 1)));
  const available = lastShape
    ? SHAPE_TYPES.filter(s => s !== lastShape)
    : SHAPE_TYPES;
  const shapeType = randomFrom(available.length > 0 ? available : SHAPE_TYPES);

 

  const minSize = lerp(0.28, 0.13, t);
  const maxSize = lerp(0.55, 0.28, t);
  const baseSize = randomBetween(minSize, maxSize);

  let width, height;
  if (shapeType === 'rectangle') {
    const aspect = randomBetween(1.3, 2.2);
    if (Math.random() > 0.5) {
      width = Math.min(0.60, baseSize * aspect);
      height = baseSize;
    } else {
      width = baseSize;
      height = Math.min(0.60, baseSize * aspect);
    }
  } else {
    width = baseSize;
    height = baseSize;
  }

  const margin = 0.12;
  const cx = randomBetween(margin + width / 2, 1 - margin - width / 2);
  const cy = randomBetween(margin + height / 2, 1 - margin - height / 2);

  // Rotation also scales with difficulty — easier rounds have less rotation
  const maxRotation = Math.round(lerp(45, 180, t));
  const rotation = shapeType === 'circle' ? 0 : Math.round(randomBetween(0, maxRotation));

  return {
    roundType: ROUND_TYPE.TRUE_CENTRE,
    shapeType,
    shapePosition: { x: cx, y: cy },
    shapeSize: { width, height },
    rotation,
    trueCentre: { x: cx, y: cy },
    durationMs: ROUND_DURATION[ROUND_TYPE.TRUE_CENTRE],
  };
};

// ─── Validate ─────────────────────────────────────────────────────────────────

export const validateSubmission = (submission, config) => {
  if (!submission) return { valid: false, error: 'No submission provided' };
  if (submission.roundType !== ROUND_TYPE.TRUE_CENTRE)
    return { valid: false, error: 'Round type mismatch' };
  if (!isValidNormalisedCoord(submission.tapX, submission.tapY))
    return { valid: false, error: 'Invalid tap coordinates' };
  return { valid: true };
};

// ─── Score ────────────────────────────────────────────────────────────────────

export const scoreSubmission = (submission, config) => {
  const errorDistance = distance(
    submission.tapX, submission.tapY,
    config.trueCentre.x, config.trueCentre.y,
  );
  return { score: errorToScore(errorDistance), errorDistance };
};

// ─── Reveal ───────────────────────────────────────────────────────────────────

export const formatRevealData = (submission, config, scoringResult) => ({
  roundType: ROUND_TYPE.TRUE_CENTRE,
  trueCentre: config.trueCentre,
  playerTap: { x: submission.tapX, y: submission.tapY },
  errorDistance: scoringResult.errorDistance,
  score: scoringResult.score,
});