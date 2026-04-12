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

const ORIENTATIONS = ['horizontal', 'vertical', 'diagonal'];

// ─── Generate ─────────────────────────────────────────────────────────────────

export const generateRoundConfig = ({ difficulty = 1, totalRounds } = {}) => {
  // ── Dynamic difficulty pattern (Section 0.2) ──────────────────────────────
  const safeTotalRounds = totalRounds ?? GAME_RULES.TOTAL_ROUNDS;
  const maxDifficulty = 1 + (safeTotalRounds - 1) * 0.15;
  const t = Math.min(1, Math.max(0, (difficulty - 1) / (maxDifficulty - 1)));
  const tCurved = Math.sqrt(t);

  // ── Target length: bias toward shorter at high difficulty ─────────────────
  // Short lines are harder to memorise and reproduce accurately
  const targetLength = randomBetween(
    lerp(0.30, 0.20, t),
    lerp(0.70, 0.45, t),
  );

  const orientation = ORIENTATIONS[Math.floor(Math.random() * ORIENTATIONS.length)];

  const refX = randomBetween(0.15, 0.85);
  const refY = randomBetween(0.15, 0.40);

  // ── Player start: further from centre at high difficulty ──────────────────
  const playerStartX = randomBetween(
    lerp(0.10, 0.05, t),
    lerp(0.50, 0.25, t),
  );
  const playerStartY = randomBetween(0.55, 0.75);

  // ── Reference duration: 3200ms (easy) → 900ms (hard), sqrt-curved ────────
  const referenceDurationMs = Math.round(lerp(3200, 900, tCurved));

  return {
    roundType: ROUND_TYPE.LINE_LENGTH,
    targetLength,
    orientation,
    referenceLineX: refX,
    referenceLineY: refY,
    playerStartX,
    playerStartY,
    referenceDurationMs,
    durationMs: ROUND_DURATION[ROUND_TYPE.LINE_LENGTH],
  };
};

// ─── Validate ─────────────────────────────────────────────────────────────────

export const validateSubmission = (submission) => {
  if (!submission) return { valid: false, error: 'No submission provided' };
  if (submission.roundType !== ROUND_TYPE.LINE_LENGTH)
    return { valid: false, error: 'Round type mismatch' };
  if (typeof submission.length !== 'number' || submission.length < 0 || submission.length > 1.5)
    return { valid: false, error: 'Invalid length' };
  return { valid: true };
};

// ─── Score ────────────────────────────────────────────────────────────────────

export const scoreSubmission = (submission, config, roundStartTimestamp) => {
  const diff = Math.abs(submission.length - config.targetLength);
  const errorDistance = clamp(diff, 0, 1);
  const precisionScore = errorToScore(errorDistance, 1.0);
  const speedBonus = calcSpeedBonus(
    submission.submittedAt, roundStartTimestamp,
    config.durationMs, errorDistance, config.roundType,
  );
  return { score: precisionScore + speedBonus, precisionScore, speedBonus, errorDistance, diff };
};

// ─── Reveal ───────────────────────────────────────────────────────────────────

export const formatRevealData = (submission, config, scoringResult) => ({
  roundType: ROUND_TYPE.LINE_LENGTH,
  targetLength: config.targetLength,
  playerLength: submission.length,
  difference: scoringResult.diff,
  orientation: config.orientation,
  errorDistance: scoringResult.errorDistance,
  score: scoringResult.score,
});