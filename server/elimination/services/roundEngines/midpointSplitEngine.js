import {
  randomBetween,
  randomFrom,
  midpoint,
  distance,
  errorToScore,
  isValidNormalisedCoord,
} from '../../utils/eliminationHelpers.js';
import { ROUND_TYPE, ROUND_DURATION } from '../../utils/eliminationConstants.js';

const LAYOUT_TYPES = ['horizontal', 'vertical', 'diagonal_up', 'diagonal_down'];

// ─── Generate ─────────────────────────────────────────────────────────────────

export const generateRoundConfig = ({ difficulty = 1 } = {}) => {
  const layoutType = randomFrom(LAYOUT_TYPES);
  const margin = 0.12;

  let ax, ay, bx, by;

  // Separation range: wide variance so some rounds have nearby points,
  // others have points nearly at opposite corners — looks very different
  const minSep = 0.25 + (difficulty - 1) * 0.02;
  const maxSep = 0.75;

  switch (layoutType) {
    case 'horizontal':
      ay = by = randomBetween(margin, 1 - margin);
      ax = randomBetween(margin, 0.45 - minSep / 2);
      bx = ax + randomBetween(minSep, Math.min(maxSep, 1 - margin - ax));
      break;

    case 'vertical':
      ax = bx = randomBetween(margin, 1 - margin);
      ay = randomBetween(margin, 0.45 - minSep / 2);
      by = ay + randomBetween(minSep, Math.min(maxSep, 1 - margin - ay));
      break;

    case 'diagonal_up':
      ax = randomBetween(margin, 0.45);
      ay = randomBetween(0.5, 1 - margin);
      bx = ax + randomBetween(minSep, Math.min(0.55, 1 - margin - ax));
      by = ay - randomBetween(minSep * 0.5, Math.min(0.6, ay - margin));
      break;

    case 'diagonal_down':
    default:
      ax = randomBetween(margin, 0.45);
      ay = randomBetween(margin, 0.5);
      bx = ax + randomBetween(minSep, Math.min(0.55, 1 - margin - ax));
      by = ay + randomBetween(minSep * 0.5, Math.min(0.6, 1 - margin - ay));
      break;
  }

  // Clamp to viewport
  bx = Math.min(bx, 1 - margin);
  by = Math.min(Math.max(by, margin), 1 - margin);

  const pointA = { x: ax, y: ay };
  const pointB = { x: bx, y: by };
  const actualMidpoint = midpoint(ax, ay, bx, by);

  // Randomise visual properties for variety each round
  const anchorSize = randomBetween(0.022, 0.055);  // anchor dot radius (normalised)
  const lineThickness = randomBetween(0.8, 2.2);    // SVG stroke width

  return {
    roundType: ROUND_TYPE.MIDPOINT_SPLIT,
    pointA,
    pointB,
    actualMidpoint,
    layoutType,
    anchorSize,
    lineThickness,
    durationMs: ROUND_DURATION[ROUND_TYPE.MIDPOINT_SPLIT],
  };
};

// ─── Validate ─────────────────────────────────────────────────────────────────

export const validateSubmission = (submission, config) => {
  if (!submission) return { valid: false, error: 'No submission provided' };
  if (submission.roundType !== ROUND_TYPE.MIDPOINT_SPLIT)
    return { valid: false, error: 'Round type mismatch' };
  if (!isValidNormalisedCoord(submission.tapX, submission.tapY))
    return { valid: false, error: 'Invalid tap coordinates' };
  return { valid: true };
};

// ─── Score ────────────────────────────────────────────────────────────────────

export const scoreSubmission = (submission, config) => {
  const errorDistance = distance(
    submission.tapX, submission.tapY,
    config.actualMidpoint.x, config.actualMidpoint.y,
  );
  return { score: errorToScore(errorDistance), errorDistance };
};

// ─── Reveal ───────────────────────────────────────────────────────────────────

export const formatRevealData = (submission, config, scoringResult) => ({
  roundType: ROUND_TYPE.MIDPOINT_SPLIT,
  pointA: config.pointA,
  pointB: config.pointB,
  actualMidpoint: config.actualMidpoint,
  playerMarker: { x: submission.tapX, y: submission.tapY },
  errorDistance: scoringResult.errorDistance,
  score: scoringResult.score,
});