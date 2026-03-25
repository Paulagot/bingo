import {
  randomBetween,
  clamp,
  errorToScore,
  calcSpeedBonus,
} from '../../utils/eliminationHelpers.js';
import { ROUND_TYPE, ROUND_DURATION } from '../../utils/eliminationConstants.js';

// ─── Generate ─────────────────────────────────────────────────────────────────

export const generateRoundConfig = ({ difficulty = 1 } = {}) => {
  // 3–5 weights, scales with difficulty
  const weightCount = Math.min(5, 3 + Math.floor((difficulty - 1) * 0.4));

  // Generate weights with minimum spacing so they never overlap visually
  const minSpacing = 0.18;
  const weights = [];
  let attempts = 0;
  while (weights.length < weightCount && attempts < 200) {
    attempts++;
    const position = randomBetween(0.08, 0.92);
    const tooClose = weights.some(w => Math.abs(w.position - position) < minSpacing);
    if (!tooClose) {
      // Integer weights 1–8 — easy to understand visually
      const weight = Math.floor(randomBetween(1, 9));
      weights.push({ position: Math.round(position * 100) / 100, weight });
    }
  }
  // Sort by position so they appear left-to-right naturally
  weights.sort((a, b) => a.position - b.position);

  // Compute true centre of mass: sum(w * x) / sum(w)
  const totalWeight = weights.reduce((s, w) => s + w.weight, 0);
  const centreOfMass = weights.reduce((s, w) => s + w.weight * w.position, 0) / totalWeight;

  // Line Y position on screen
  const lineY = randomBetween(0.40, 0.65);

  return {
    roundType: ROUND_TYPE.BALANCE_POINT,
    weights,
    centreOfMass: Math.round(centreOfMass * 1000) / 1000,
    lineY,
    totalWeight: Math.round(totalWeight * 10) / 10,
    durationMs: ROUND_DURATION[ROUND_TYPE.BALANCE_POINT],
  };
};

// ─── Validate ─────────────────────────────────────────────────────────────────

export const validateSubmission = (submission) => {
  if (!submission) return { valid: false, error: 'No submission provided' };
  if (submission.roundType !== ROUND_TYPE.BALANCE_POINT)
    return { valid: false, error: 'Round type mismatch' };
  if (typeof submission.x !== 'number' || submission.x < 0 || submission.x > 1)
    return { valid: false, error: 'Invalid x position' };
  return { valid: true };
};

// ─── Score ────────────────────────────────────────────────────────────────────

export const scoreSubmission = (submission, config, roundStartTimestamp) => {
  const errorDistance = Math.abs(submission.x - config.centreOfMass);
  const precisionScore = errorToScore(errorDistance, 1.0);
  const speedBonus = calcSpeedBonus(
    submission.submittedAt, roundStartTimestamp,
    config.durationMs, errorDistance, config.roundType,
  );
  return { score: precisionScore + speedBonus, precisionScore, speedBonus, errorDistance };
};

// ─── Reveal ───────────────────────────────────────────────────────────────────

export const formatRevealData = (submission, config, scoringResult) => ({
  roundType: ROUND_TYPE.BALANCE_POINT,
  centreOfMass: config.centreOfMass,
  playerX: submission.x,
  weights: config.weights,
  errorDistance: scoringResult.errorDistance,
  score: scoringResult.score,
});