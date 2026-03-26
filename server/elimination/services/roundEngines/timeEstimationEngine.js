import { randomBetween, clamp, errorToScore } from '../../utils/eliminationHelpers.js';
import { ROUND_TYPE, ROUND_DURATION } from '../../utils/eliminationConstants.js';

export const generateRoundConfig = ({ difficulty = 1 } = {}) => {
  // Target time 3–8 seconds, wider range at higher difficulty
  const minTarget = Math.round(3000 + (difficulty - 1) * 200);
  const maxTarget = Math.round(7000 + (difficulty - 1) * 500);
  const targetTimeMs = Math.round(randomBetween(minTarget, maxTarget) / 500) * 500; // round to 0.5s

  return {
    roundType: ROUND_TYPE.TIME_ESTIMATION,
    targetTimeMs,
    roundStartTimestamp: null, // filled by activateRound
    durationMs: ROUND_DURATION[ROUND_TYPE.TIME_ESTIMATION],
  };
};

export const validateSubmission = (submission) => {
  if (!submission) return { valid: false, error: 'No submission' };
  if (submission.roundType !== ROUND_TYPE.TIME_ESTIMATION) return { valid: false, error: 'Round type mismatch' };
  if (typeof submission.submittedAt !== 'number') return { valid: false, error: 'Invalid timestamp' };
  return { valid: true };
};

export const scoreSubmission = (submission, config, roundStartTimestamp) => {
  // Server computes actual elapsed time — never trust client
  // Use config.roundStartTimestamp as fallback if third arg is null
  const startTs = roundStartTimestamp ?? config.roundStartTimestamp;
  if (!startTs || !submission.submittedAt) {
    return { score: 0, precisionScore: 0, speedBonus: 0, errorDistance: 1, diff: config.targetTimeMs, actualElapsed: 0 };
  }
  const actualElapsed = submission.submittedAt - startTs;
  const diff = Math.abs(actualElapsed - config.targetTimeMs);

  // Normalise: perfect = 0ms off, max error = targetTimeMs (100% off)
  const errorDistance = clamp(diff / config.targetTimeMs, 0, 1);
  const precisionScore = errorToScore(errorDistance, 1.0);

  // No speed bonus — the whole mechanic IS timing
  return { score: precisionScore, precisionScore, speedBonus: 0, errorDistance, diff, actualElapsed };
};

export const formatRevealData = (submission, config, scoringResult) => ({
  roundType: ROUND_TYPE.TIME_ESTIMATION,
  targetTimeMs: config.targetTimeMs,
  playerTimeMs: scoringResult.actualElapsed,
  difference: scoringResult.diff,
  errorDistance: scoringResult.errorDistance,
  score: scoringResult.score,
});