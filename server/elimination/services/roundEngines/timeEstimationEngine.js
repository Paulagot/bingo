import { randomBetween, clamp, errorToScore, lerp } from '../../utils/eliminationHelpers.js';
import { ROUND_TYPE, ROUND_DURATION, GAME_RULES } from '../../utils/eliminationConstants.js';

// ─── Generate ─────────────────────────────────────────────────────────────────

export const generateRoundConfig = ({ difficulty = 1, totalRounds } = {}) => {
  const safeTotalRounds = totalRounds ?? GAME_RULES.TOTAL_ROUNDS;
  const maxDifficulty = 1 + (safeTotalRounds - 1) * 0.15;
  const t = Math.min(1, Math.max(0, (difficulty - 1) / (maxDifficulty - 1)));

  // Shorter durations are harder to estimate — difficulty makes targets shorter.
  // Round 1: 6–8s whole seconds (easy to count)
  // Round 8: 3–5s half-seconds (harder to feel precisely)
  const minTarget = Math.round(lerp(6000, 3000, t));
  const maxTarget = Math.round(lerp(8000, 5000, t));

  // Whole seconds in early rounds, half-seconds in later rounds
  const roundTo = t < 0.5 ? 1000 : 500;
  const targetTimeMs = Math.round(randomBetween(minTarget, maxTarget) / roundTo) * roundTo;

  return {
    roundType: ROUND_TYPE.TIME_ESTIMATION,
    targetTimeMs,
    roundStartTimestamp: null, // filled by activateRound — not used for scoring
    durationMs: ROUND_DURATION[ROUND_TYPE.TIME_ESTIMATION],
  };
};

// ─── Validate ─────────────────────────────────────────────────────────────────

export const validateSubmission = (submission) => {
  if (!submission) return { valid: false, error: 'No submission' };
  if (submission.roundType !== ROUND_TYPE.TIME_ESTIMATION)
    return { valid: false, error: 'Round type mismatch' };
  if (typeof submission.submittedAt !== 'number')
    return { valid: false, error: 'Invalid timestamp' };
  return { valid: true };
};

// ─── Score ────────────────────────────────────────────────────────────────────

export const scoreSubmission = (submission, config, roundStartTimestamp) => {
  // Use the server-recorded START press time as the reference point.
  // This is injected into the submission by closeAndScoreRound from
  // roundState.startPressTimestamps[playerId] — it is never client-supplied.
  //
  // Fall back to roundStartTimestamp only if startPressedAt is missing
  // (e.g. player never pressed START and was auto-submitted at round end).
  const startTs = submission.startPressedAt ?? roundStartTimestamp ?? config.roundStartTimestamp;

  if (!startTs || !submission.submittedAt) {
    return {
      score: 0,
      precisionScore: 0,
      speedBonus: 0,
      errorDistance: 1,
      diff: config.targetTimeMs,
      actualElapsed: 0,
    };
  }

  console.log('[TimeEstimation] startTs source:', {
  usedStartPressedAt: !!submission.startPressedAt,
  startPressedAt: submission.startPressedAt,
  roundStartTimestamp,
  configRoundStartTimestamp: config.roundStartTimestamp,
  startTsUsed: startTs,
});

  const actualElapsed = submission.submittedAt - startTs;
  const diff = Math.abs(actualElapsed - config.targetTimeMs);

  // Normalise: 0 = perfect, 1 = off by the full target duration
  const errorDistance = clamp(diff / config.targetTimeMs, 0, 1);
  const precisionScore = errorToScore(errorDistance, 1.0);

  // No speed bonus — the timing IS the entire mechanic
  return {
    score: precisionScore,
    precisionScore,
    speedBonus: 0,
    errorDistance,
    diff,
    actualElapsed,
  };
};

// ─── Reveal ───────────────────────────────────────────────────────────────────

export const formatRevealData = (submission, config, scoringResult) => ({
  roundType: ROUND_TYPE.TIME_ESTIMATION,
  targetTimeMs: config.targetTimeMs,
  playerTimeMs: scoringResult.actualElapsed,
  difference: scoringResult.diff,
  errorDistance: scoringResult.errorDistance,
  score: scoringResult.score,
});