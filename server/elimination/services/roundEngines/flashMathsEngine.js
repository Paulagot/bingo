import {
  randomBetween,
  randomFrom,
  clamp,
  errorToScore,
  calcSpeedBonus,
} from '../../utils/eliminationHelpers.js';
import { ROUND_TYPE, ROUND_DURATION } from '../../utils/eliminationConstants.js';

// ─── Generate ─────────────────────────────────────────────────────────────────

export const generateRoundConfig = ({ difficulty = 1 } = {}) => {
  // 5–8 numbers, all single digit (1–9) — harder to track many small numbers
  const termCount = Math.min(8, 5 + Math.floor((difficulty - 1) * 0.5));

  // All numbers 1–9 (single digit) — harder to track many of them
  const numbers = Array.from({ length: termCount }, () =>
    Math.floor(randomBetween(1, 10))
  );

  const actualSum = numbers.reduce((a, b) => a + b, 0);

  // Flash duration: shorter = harder
  // Extra second added for readability
  const displayDurationMs = Math.round(
    Math.max(3000, randomBetween(4000 - difficulty * 200, 6000 - difficulty * 200))
  );

  // Layout: spread numbers across screen randomly
  const positions = numbers.map(() => ({
    x: randomBetween(0.1, 0.9),
    y: randomBetween(0.1, 0.9),
    fontSize: randomBetween(0.06, 0.12), // normalised font size
  }));

  return {
    roundType: ROUND_TYPE.FLASH_MATHS,
    numbers,
    actualSum,
    displayDurationMs,
    positions,
    durationMs: ROUND_DURATION[ROUND_TYPE.FLASH_MATHS],
  };
};

// ─── Validate ─────────────────────────────────────────────────────────────────

export const validateSubmission = (submission) => {
  if (!submission) return { valid: false, error: 'No submission provided' };
  if (submission.roundType !== ROUND_TYPE.FLASH_MATHS)
    return { valid: false, error: 'Round type mismatch' };
  if (typeof submission.value !== 'number' || !Number.isInteger(submission.value))
    return { valid: false, error: 'Value must be an integer' };
  return { valid: true };
};

// ─── Score ────────────────────────────────────────────────────────────────────

export const scoreSubmission = (submission, config, roundStartTimestamp) => {
  const diff = Math.abs(submission.value - config.actualSum);
  const errorDistance = clamp(diff / config.actualSum, 0, 1);
  const precisionScore = errorToScore(errorDistance, 1.0);
  const speedBonus = calcSpeedBonus(
    submission.submittedAt, roundStartTimestamp,
    config.durationMs, errorDistance, config.roundType,
  );
  return { score: precisionScore + speedBonus, precisionScore, speedBonus, errorDistance, diff };
};

// ─── Reveal ───────────────────────────────────────────────────────────────────

export const formatRevealData = (submission, config, scoringResult) => ({
  roundType: ROUND_TYPE.FLASH_MATHS,
  numbers: config.numbers,
  actualSum: config.actualSum,
  playerAnswer: submission.value,
  difference: scoringResult.diff,
  errorDistance: scoringResult.errorDistance,
  score: scoringResult.score,
});