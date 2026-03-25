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
  // Dot count scales with difficulty: 5–35
  const minCount = Math.floor(5 + difficulty * 2);
  const maxCount = Math.floor(12 + difficulty * 4);
  const dotCount = Math.floor(randomBetween(minCount, maxCount));

  // Generate random dot positions — use rejection sampling to avoid heavy overlap
  const dots = [];
  const minDist = randomBetween(0.04, 0.1); // spacing varies for visual interest
  let attempts = 0;
  while (dots.length < dotCount && attempts < 300) {
    attempts++;
    const x = randomBetween(0.05, 0.95);
    const y = randomBetween(0.05, 0.95);
    const tooClose = dots.some(d => Math.hypot(d.x - x, d.y - y) < minDist);
    if (!tooClose) dots.push({ x, y });
  }
  // If we couldn't place all dots without overlap, accept what we have (still valid)
  const actualCount = dots.length;

  // Dot size varies — some rounds have big dots, some tiny
  const dotRadius = randomBetween(0.012, 0.03);

  // Flash duration shortens with difficulty
  const displayDurationMs = Math.round(
    Math.max(400, randomBetween(1800 - difficulty * 300, 2500 - difficulty * 300))
  );

  return {
    roundType: ROUND_TYPE.QUICK_COUNT,
    dotCount: actualCount,
    dots,
    dotRadius,
    displayDurationMs,
    durationMs: ROUND_DURATION[ROUND_TYPE.QUICK_COUNT],
  };
};

// ─── Validate ─────────────────────────────────────────────────────────────────

export const validateSubmission = (submission) => {
  if (!submission) return { valid: false, error: 'No submission provided' };
  if (submission.roundType !== ROUND_TYPE.QUICK_COUNT)
    return { valid: false, error: 'Round type mismatch' };
  if (typeof submission.value !== 'number' || !Number.isInteger(submission.value))
    return { valid: false, error: 'Value must be an integer' };
  if (submission.value < 0 || submission.value > 200)
    return { valid: false, error: 'Value out of range' };
  return { valid: true };
};

// ─── Score ────────────────────────────────────────────────────────────────────

export const scoreSubmission = (submission, config, roundStartTimestamp) => {
  const diff = Math.abs(submission.value - config.dotCount);
  // Normalise: 0 diff = perfect, maxAllowed = dotCount (100% wrong)
  const errorDistance = clamp(diff / config.dotCount, 0, 1);
  const precisionScore = errorToScore(errorDistance, 1.0);
  const speedBonus = calcSpeedBonus(
    submission.submittedAt, roundStartTimestamp,
    config.durationMs, errorDistance, config.roundType,
  );
  return { score: precisionScore + speedBonus, precisionScore, speedBonus, errorDistance, diff };
};

// ─── Reveal ───────────────────────────────────────────────────────────────────

export const formatRevealData = (submission, config, scoringResult) => ({
  roundType: ROUND_TYPE.QUICK_COUNT,
  actualCount: config.dotCount,
  playerGuess: submission.value,
  difference: scoringResult.diff,
  dots: config.dots,
  errorDistance: scoringResult.errorDistance,
  score: scoringResult.score,
});