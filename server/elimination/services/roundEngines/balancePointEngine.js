import {
  randomBetween,
 
  errorToScore,
  calcSpeedBonus,
  lerp,
} from '../../utils/eliminationHelpers.js';
import { ROUND_TYPE, ROUND_DURATION, GAME_RULES } from '../../utils/eliminationConstants.js';

// ─── Generate ─────────────────────────────────────────────────────────────────

export const generateRoundConfig = ({ difficulty = 1, totalRounds } = {}) => {
  // ── Dynamic difficulty pattern (Section 0.2) ──────────────────────────────
  const safeTotalRounds = totalRounds ?? GAME_RULES.TOTAL_ROUNDS;
  const maxDifficulty = 1 + (safeTotalRounds - 1) * 0.15;
  const t = Math.min(1, Math.max(0, (difficulty - 1) / (maxDifficulty - 1)));

  // ── Weight count: 3 (easy) → 6 (hard) ────────────────────────────────────
  // More weights = harder to estimate the weighted average mentally
  const weightCount = Math.round(lerp(3, 6, t));

  // ── Weight range: 1–4 (easy) → 1–9 (hard) ────────────────────────────────
  // Wider weight spread means more extreme, harder-to-eyeball imbalances
  const maxWeight = Math.round(lerp(4, 9, t));

  // ── Minimum spacing shrinks with difficulty ───────────────────────────────
  // Closer weights are harder to distinguish visually
  const minSpacing = lerp(0.20, 0.12, t);

  // ── Generate positions with minimum spacing ───────────────────────────────
  const weights = [];
  let attempts = 0;
  while (weights.length < weightCount && attempts < 300) {
    attempts++;
    const position = randomBetween(0.08, 0.92);
    const tooClose = weights.some(w => Math.abs(w.position - position) < minSpacing);
    if (!tooClose) {
      const weight = Math.floor(randomBetween(1, maxWeight + 1));
      weights.push({ position: Math.round(position * 100) / 100, weight });
    }
  }
  weights.sort((a, b) => a.position - b.position);

  // ── Compute true centre of mass ───────────────────────────────────────────
  const totalWeight = weights.reduce((s, w) => s + w.weight, 0);
  const centreOfMass = weights.reduce((s, w) => s + w.weight * w.position, 0) / totalWeight;

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
    config.durationMs, errorDistance, config.roundType, 0.30,
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