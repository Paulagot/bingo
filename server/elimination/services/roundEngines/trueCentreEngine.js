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

  // Size range — capped to ensure shape always fits comfortably on screen
  const minSize = Math.max(0.08, 0.10 - (difficulty - 1) * 0.01);
  const maxSize = Math.min(0.32, 0.22 + (difficulty === 1 ? 0.10 : 0));
  const baseSize = randomBetween(minSize, maxSize);

  // Rectangles — keep aspect ratio moderate so they don't overflow
  let width, height;
  if (shapeType === 'rectangle') {
    const aspect = randomBetween(1.3, 2.2); // tighter range
    if (Math.random() > 0.5) {
      width = Math.min(0.55, baseSize * aspect);
      height = baseSize;
    } else {
      width = baseSize;
      height = Math.min(0.55, baseSize * aspect);
    }
  } else {
    width = baseSize;
    height = baseSize;
  }

  // Position: generous margin to keep shape fully visible
  const margin = 0.12;
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