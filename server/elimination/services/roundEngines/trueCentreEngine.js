import {
  randomBetween,
  randomFrom,
  distance,
  errorToScore,
  isValidNormalisedCoord,
} from '../../utils/eliminationHelpers.js';
import { ROUND_TYPE, ROUND_DURATION } from '../../utils/eliminationConstants.js';

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

export const generateRoundConfig = ({ difficulty = 1, lastShape = null } = {}) => {
  // Avoid repeating the last shape type
  const available = lastShape
    ? SHAPE_TYPES.filter(s => s !== lastShape)
    : SHAPE_TYPES;
  const shapeType = randomFrom(available.length > 0 ? available : SHAPE_TYPES);

  // Wide size range — small to large, randomised each round
  // difficulty shrinks the min size so late rounds can produce tiny shapes
  const minSize = Math.max(0.08, 0.08 + (1 - difficulty * 0.04));
  const maxSize = Math.max(minSize + 0.05, 0.45 - (difficulty - 1) * 0.03);
  const baseSize = randomBetween(minSize, maxSize);

  // Rectangles get a randomised aspect ratio — sometimes wide, sometimes tall
  let width, height;
  if (shapeType === 'rectangle') {
    const aspect = randomBetween(1.3, 3.5);
    // 50% chance wide, 50% chance tall
    if (Math.random() > 0.5) {
      width = baseSize * aspect;
      height = baseSize;
    } else {
      width = baseSize;
      height = baseSize * aspect;
    }
  } else {
    width = baseSize;
    height = baseSize;
  }

  // Position: keep shape fully within viewport
  const margin = 0.08;
  const cx = randomBetween(margin + width / 2, 1 - margin - width / 2);
  const cy = randomBetween(margin + height / 2, 1 - margin - height / 2);

  // Rotation: circles never rotate, others rotate 0–180 for variety
  const rotation = shapeType === 'circle' ? 0 : Math.round(randomBetween(0, 180));

  return {
    roundType: ROUND_TYPE.TRUE_CENTRE,
    shapeType,  // returned so caller can pass as lastShape next round
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