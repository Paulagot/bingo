import {
  randomBetween,
  randomFrom,
  midpoint,
  distance,
  errorToScore,
  isValidNormalisedCoord,
  lerp,
} from '../../utils/eliminationHelpers.js';
import {
  ROUND_TYPE,
  ROUND_DURATION,
  GAME_RULES,
} from '../../utils/eliminationConstants.js';

const LAYOUT_TYPES = ['horizontal', 'vertical', 'diagonal_up', 'diagonal_down'];

// ─── Generate ─────────────────────────────────────────────────────────────────

export const generateRoundConfig = ({ difficulty = 1, totalRounds } = {}) => {
  // ── Dynamic difficulty pattern (Section 0.2) ──────────────────────────────
  const safeTotalRounds = totalRounds ?? GAME_RULES.TOTAL_ROUNDS;
  const maxDifficulty = 1 + (safeTotalRounds - 1) * 0.15;
  const t = Math.min(1, Math.max(0, (difficulty - 1) / (maxDifficulty - 1)));

  const layoutType = randomFrom(LAYOUT_TYPES);
  const margin = 0.12;

  // ── Separation: closer at high difficulty (harder to eyeball the midpoint) ─
  const minSep = lerp(0.35, 0.20, t);
  const maxSep = 0.75;

  let ax, ay, bx, by;

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

  bx = Math.min(bx, 1 - margin);
  by = Math.min(Math.max(by, margin), 1 - margin);

  const pointA = { x: ax, y: ay };
  const pointB = { x: bx, y: by };
  const actualMidpoint = midpoint(ax, ay, bx, by);

  // ── Anchor size: smaller at high difficulty (harder to judge position) ─────
  const anchorSize = randomBetween(
    lerp(0.040, 0.018, t),
    lerp(0.055, 0.028, t),
  );

  // ── Line thickness: thinner at high difficulty ────────────────────────────
  const lineThickness = randomBetween(
    lerp(1.6, 0.6, t),
    lerp(2.2, 1.0, t),
  );

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