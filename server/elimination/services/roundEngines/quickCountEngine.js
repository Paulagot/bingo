import {
  randomBetween,
  clamp,
  errorToScore,
  calcSpeedBonus,
  lerp,
} from '../../utils/eliminationHelpers.js';
import {
  ROUND_TYPE,
  ROUND_DURATION,
  GAME_RULES,
} from '../../utils/eliminationConstants.js';

// ─── Generate ─────────────────────────────────────────────────────────────────

export const generateRoundConfig = ({ difficulty = 1, totalRounds } = {}) => {
  // ── Dynamic difficulty pattern (Section 0.2) ──────────────────────────────
  const safeTotalRounds = totalRounds ?? GAME_RULES.TOTAL_ROUNDS;
  const maxDifficulty = 1 + (safeTotalRounds - 1) * 0.15;
  const t = Math.min(1, Math.max(0, (difficulty - 1) / (maxDifficulty - 1)));
  const tCurved = Math.sqrt(t);

  // ── Dot count: 5–15 (easy) → 20–30 (hard) ────────────────────────────────
  const minCount = Math.round(lerp(5, 15, t));
  const maxCount = Math.round(lerp(15, 25, t));
  const dotCount = Math.floor(randomBetween(minCount, maxCount));

  // ── Dot spacing: looser (easy) → tighter (hard) ───────────────────────────
  // Tightly packed dots are harder to count accurately
  const minDist = randomBetween(
    lerp(0.08, 0.04, t),
    lerp(0.12, 0.06, t),
  );

  const dots = [];
  let attempts = 0;
  while (dots.length < dotCount && attempts < 400) {
    attempts++;
    const x = randomBetween(0.05, 0.95);
    const y = randomBetween(0.05, 0.95);
    const tooClose = dots.some(d => Math.hypot(d.x - x, d.y - y) < minDist);
    if (!tooClose) dots.push({ x, y });
  }
  const actualCount = dots.length;

  // ── Dot radius: smaller at high difficulty ────────────────────────────────
  const dotRadius = randomBetween(
    lerp(0.022, 0.010, t),
    lerp(0.032, 0.016, t),
  );

  // ── Display duration: 3200ms (easy) → 1400ms (hard), sqrt-curved ─────────
  const displayDurationMs = Math.round(lerp(3200, 2000, tCurved));

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
  const errorDistance = clamp(diff / config.dotCount, 0, 1);
  const precisionScore = errorToScore(errorDistance, 1.0);
  const speedBonus = calcSpeedBonus(
    submission.submittedAt, roundStartTimestamp,
    config.durationMs, errorDistance, config.roundType,
    0.25, // wider threshold — count-based answers are harder to nail exactly
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