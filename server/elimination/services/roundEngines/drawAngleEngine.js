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
  const tCurved = Math.sqrt(t); // softer curve for timing mechanics

  const targetAngle = Math.round(randomBetween(5, 175));

  // ── Initial offset: further from target at high difficulty ────────────────
  // Easy: at least 20° away. Hard: at least 60° away — more rotation needed,
  // more chance of overshooting
  const minOffset = Math.round(lerp(20, 60, t));
  let initialAngle = Math.round(randomBetween(5, 175));
  let attempts = 0;
  while (Math.abs(initialAngle - targetAngle) < minOffset && attempts < 200) {
    initialAngle = Math.round(randomBetween(5, 175));
    attempts++;
  }

  const anchorX = randomBetween(0.40, 0.60);
  const anchorY = randomBetween(0.40, 0.60);

  // ── Guide visibility: shorter at high difficulty (less time to memorise) ──
  // Uses tCurved so it doesn't drop too aggressively in early rounds
  const guideVisibleMs = Math.round(lerp(2500, 800, tCurved));

  // ── Line length: longer range, shorter at high difficulty ─────────────────
  const lineLength = randomBetween(
    lerp(0.40, 0.32, t),
    lerp(0.50, 0.38, t),
  );

  return {
    roundType: ROUND_TYPE.DRAW_ANGLE,
    targetAngle,
    initialAngle,
    anchorX,
    anchorY,
    guideVisibleMs,
    lineLength,
    durationMs: ROUND_DURATION[ROUND_TYPE.DRAW_ANGLE],
  };
};

// ─── Validate ─────────────────────────────────────────────────────────────────

export const validateSubmission = (submission) => {
  if (!submission) return { valid: false, error: 'No submission provided' };
  if (submission.roundType !== ROUND_TYPE.DRAW_ANGLE)
    return { valid: false, error: 'Round type mismatch' };
  if (typeof submission.angle !== 'number')
    return { valid: false, error: 'Invalid angle' };
  return { valid: true };
};

// ─── Score ────────────────────────────────────────────────────────────────────

const angularDiff = (a, b) => {
  const diff = Math.abs(a - b) % 180;
  return Math.min(diff, 180 - diff);
};

export const scoreSubmission = (submission, config, roundStartTimestamp) => {
  const diff = angularDiff(submission.angle, config.targetAngle);
  const errorDistance = diff / 90;
  const precisionScore = errorToScore(errorDistance, 1.0);
  const speedBonus = calcSpeedBonus(
    submission.submittedAt, roundStartTimestamp,
    config.durationMs, errorDistance, config.roundType,
  );
  return { score: precisionScore + speedBonus, precisionScore, speedBonus, errorDistance, diff };
};

// ─── Reveal ───────────────────────────────────────────────────────────────────

export const formatRevealData = (submission, config, scoringResult) => ({
  roundType: ROUND_TYPE.DRAW_ANGLE,
  targetAngle: config.targetAngle,
  playerAngle: submission.angle,
  difference: scoringResult.diff,
  errorDistance: scoringResult.errorDistance,
  score: scoringResult.score,
});