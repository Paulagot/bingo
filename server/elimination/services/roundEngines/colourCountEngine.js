import { randomBetween, clamp, errorToScore, calcSpeedBonus } from '../../utils/eliminationHelpers.js';
import { ROUND_TYPE, ROUND_DURATION } from '../../utils/eliminationConstants.js';

// High-contrast, accessible colours
const COLOURS = [
  { id: 'red',    hex: '#ff3b5c', label: 'RED'    },
  { id: 'blue',   hex: '#00aaff', label: 'BLUE'   },
  { id: 'yellow', hex: '#ffd60a', label: 'YELLOW' },
  { id: 'green',  hex: '#30d158', label: 'GREEN'  },
];

const SHAPE_TYPES = ['circle', 'square'];

export const generateRoundConfig = ({ difficulty = 1 } = {}) => {
  // Total shapes scales with difficulty
  const totalShapes = Math.floor(randomBetween(8 + difficulty * 3, 14 + difficulty * 4));

  // Pick target colour
  const targetColour = COLOURS[Math.floor(Math.random() * COLOURS.length)];

  // Target count: 25–45% of total (not too few, not a majority)
  const targetFraction = randomBetween(0.25, 0.45);
  const actualCount = Math.round(totalShapes * targetFraction);

  // Generate shapes with minimum spacing to avoid overlap
  const shapes = [];
  const minDist = 0.10;
  let attempts = 0;

  for (let i = 0; i < totalShapes && attempts < 500; attempts++) {
    const x = randomBetween(0.05, 0.95);
    const y = randomBetween(0.05, 0.95);
    if (shapes.some(s => Math.hypot(s.x - x, s.y - y) < minDist)) continue;

    const isTarget = shapes.filter(s => s.colour === targetColour.id).length < actualCount;
    const colour = isTarget
      ? targetColour
      : COLOURS.filter(c => c.id !== targetColour.id)[Math.floor(Math.random() * 3)];

    const shapeType = SHAPE_TYPES[Math.floor(Math.random() * 2)];
    const size = randomBetween(0.04, 0.07);

    shapes.push({ x, y, colour: colour.id, hex: colour.hex, shapeType, size });
    i++;
  }

  // Shuffle so target shapes aren't all first
  for (let i = shapes.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shapes[i], shapes[j]] = [shapes[j], shapes[i]];
  }

  const displayDurationMs = Math.round(Math.max(1500, randomBetween(2500 - difficulty * 200, 3500 - difficulty * 200)));

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