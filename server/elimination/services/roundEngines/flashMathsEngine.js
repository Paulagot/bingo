import {
  randomBetween,
  randomFrom,
  clamp,
  errorToScore,
  calcSpeedBonus,
  lerp,
} from '../../utils/eliminationHelpers.js';
import { ROUND_TYPE, ROUND_DURATION, GAME_RULES } from '../../utils/eliminationConstants.js';

// ─── Generate ─────────────────────────────────────────────────────────────────

export const generateRoundConfig = ({ difficulty = 1, totalRounds } = {}) => {
  // Normalise difficulty to 0–1 across the full round range
  const safeTotalRounds = totalRounds ?? GAME_RULES.TOTAL_ROUNDS;
  const maxDifficulty = 1 + (safeTotalRounds - 1) * 0.15;
  const t = Math.min(1, Math.max(0, (difficulty - 1) / (maxDifficulty - 1)));

  // Term count: genuinely increases across rounds
  // Round 1: 5 numbers  →  Round 8: 8 numbers
  const termCount = Math.round(lerp(5, 8, t));

  // All numbers 1–9 (single digit)
  const numbers = Array.from({ length: termCount }, () =>
    Math.floor(randomBetween(1, 10))
  );

  const actualSum = numbers.reduce((a, b) => a + b, 0);

  // Flash duration: players must see AND mentally add every value. The extra
  // terms already create the difficulty, so late rounds should not become a
  // reading-speed test.
  // Round 1: 6.0–7.0s  →  Round 8: 5.0–6.0s.
  const minDisplay = Math.round(lerp(6000, 5000, t));
  const maxDisplay = Math.round(lerp(7000, 6000, t));
  const displayDurationMs = Math.round(randomBetween(minDisplay, maxDisplay));

  // Layout: spread numbers across screen randomly
  const positions = numbers.map(() => ({
    x: randomBetween(0.1, 0.9),
    y: randomBetween(0.1, 0.9),
    fontSize: randomBetween(0.06, 0.12),
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