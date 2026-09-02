import { randomBetween, clamp, errorToScore, calcSpeedBonus, lerp } from '../../utils/eliminationHelpers.js';
import { ROUND_TYPE, ROUND_DURATION, GAME_RULES } from '../../utils/eliminationConstants.js';

// High-contrast, accessible colours
const COLOURS = [
  { id: 'red',    hex: '#ff3b5c', label: 'RED'    },
  { id: 'blue',   hex: '#00aaff', label: 'BLUE'   },
  { id: 'yellow', hex: '#ffd60a', label: 'YELLOW' },
  { id: 'green',  hex: '#30d158', label: 'GREEN'  },
];

const SHAPE_TYPES = ['circle', 'square'];

export const generateRoundConfig = ({ difficulty = 1, totalRounds } = {}) => {
  const safeTotalRounds = totalRounds ?? GAME_RULES.TOTAL_ROUNDS;
  const maxDifficulty = 1 + (safeTotalRounds - 1) * 0.15;
  const t = Math.min(1, Math.max(0, (difficulty - 1) / (maxDifficulty - 1)));

  // Counting one colour should get harder through a moderate increase in visual
  // load, not by removing the board before the player can scan it.
  const minShapes = Math.round(lerp(11, 17, t));
  const maxShapes = Math.round(lerp(17, 23, t));
  const totalShapes = Math.floor(randomBetween(minShapes, maxShapes + 1));

  const targetColour = COLOURS[Math.floor(Math.random() * COLOURS.length)];

  // Target count: 25–45% of total (not too few, not a majority).
  const targetFraction = randomBetween(0.25, 0.45);
  const requestedTargetCount = Math.round(totalShapes * targetFraction);

  const shapes = [];
  const minDist = lerp(0.11, 0.085, t);
  let attempts = 0;

  for (let i = 0; i < totalShapes && attempts < 600; attempts++) {
    const x = randomBetween(0.05, 0.95);
    const y = randomBetween(0.05, 0.95);
    if (shapes.some(s => Math.hypot(s.x - x, s.y - y) < minDist)) continue;

    const isTarget = shapes.filter(s => s.colour === targetColour.id).length < requestedTargetCount;
    const colour = isTarget
      ? targetColour
      : COLOURS.filter(c => c.id !== targetColour.id)[Math.floor(Math.random() * 3)];

    const shapeType = SHAPE_TYPES[Math.floor(Math.random() * 2)];
    const size = randomBetween(lerp(0.05, 0.045, t), lerp(0.075, 0.065, t));

    shapes.push({ x, y, colour: colour.id, hex: colour.hex, shapeType, size });
    i++;
  }

  for (let i = shapes.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shapes[i], shapes[j]] = [shapes[j], shapes[i]];
  }

  // Round 1: 5.0–6.0s  →  Round 8: 4.4–5.4s.
  const minDisplay = Math.round(lerp(5000, 4400, t));
  const maxDisplay = Math.round(lerp(6000, 5400, t));
  const displayDurationMs = Math.round(randomBetween(minDisplay, maxDisplay));

  return {
    roundType: ROUND_TYPE.COLOUR_COUNT,
    shapes,
    targetColour: targetColour.id,
    targetHex: targetColour.hex,
    targetLabel: targetColour.label,
    actualCount: shapes.filter(s => s.colour === targetColour.id).length,
    displayDurationMs,
    durationMs: ROUND_DURATION[ROUND_TYPE.COLOUR_COUNT],
  };
};

export const validateSubmission = (submission) => {
  if (!submission) return { valid: false, error: 'No submission' };
  if (submission.roundType !== ROUND_TYPE.COLOUR_COUNT) return { valid: false, error: 'Round type mismatch' };
  if (typeof submission.value !== 'number' || !Number.isInteger(submission.value)) return { valid: false, error: 'Invalid value' };
  return { valid: true };
};

export const scoreSubmission = (submission, config, roundStartTimestamp) => {
  const diff = Math.abs(submission.value - config.actualCount);
  const errorDistance = clamp(diff / config.actualCount, 0, 1);
  const precisionScore = errorToScore(errorDistance, 1.0);
  const speedBonus = calcSpeedBonus(submission.submittedAt, roundStartTimestamp, config.durationMs, errorDistance, config.roundType);
  return { score: precisionScore + speedBonus, precisionScore, speedBonus, errorDistance, diff };
};

export const formatRevealData = (submission, config, scoringResult) => ({
  roundType: ROUND_TYPE.COLOUR_COUNT,
  shapes: config.shapes,
  targetColour: config.targetColour,
  targetHex: config.targetHex,
  targetLabel: config.targetLabel,
  actualCount: config.actualCount,
  playerAnswer: submission.value,
  difference: scoringResult.diff,
  errorDistance: scoringResult.errorDistance,
  score: scoringResult.score,
});