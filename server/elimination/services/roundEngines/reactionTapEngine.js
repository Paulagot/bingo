import {
  randomBetween,
  errorToScore,
  isValidNormalisedCoord,
  clamp,
  lerp,
} from '../../utils/eliminationHelpers.js';
import { ROUND_TYPE, ROUND_DURATION, GAME_RULES } from '../../utils/eliminationConstants.js';

// ─── Scoring constants ────────────────────────────────────────────────────────
//
// Reaction time is measured from when the target became visible to the client
// (submission.targetVisibleAt), falling back to server validTargetAt if not
// provided. This eliminates server→client clock drift from the score.
//
// Timing range: 150ms (fastest human) → 0 error. 1000ms+ → 1.0 error.
// Position: normalised against full arena half-diagonal (0.5), so tapping
// further from centre always scores worse regardless of target size.
// Weight: 70% speed, 30% accuracy.

const MIN_HUMAN_REACTION_MS = 150;
const MAX_SCORABLE_REACTION_MS = 1000;
const EARLY_TAP_PENALTY_ERROR = 1;
const DISTANCE_WEIGHT = 0.3;
const MAX_ARENA_DISTANCE = 0.5;

export const generateRoundConfig = ({ difficulty = 1, totalRounds } = {}) => {
  const safeTotalRounds = totalRounds ?? GAME_RULES.TOTAL_ROUNDS;
  const maxDifficulty = 1 + (safeTotalRounds - 1) * 0.15;
  const t = Math.min(1, Math.max(0, (difficulty - 1) / (maxDifficulty - 1)));
  const tCurved = Math.sqrt(t);

  // Higher difficulty = shorter, less predictable delay window
  const preTargetDelayMs = Math.round(randomBetween(
    lerp(800, 500, tCurved),
    lerp(2200, 1500, tCurved),
  ));

  // Higher difficulty = smaller target (harder to tap precisely)
  const targetRadius = lerp(0.1, 0.05, tCurved);

  const targetPosition = {
    x: randomBetween(0.18, 0.82),
    y: randomBetween(0.22, 0.78),
  };

  return {
    roundType: ROUND_TYPE.REACTION_TAP,
    durationMs: ROUND_DURATION[ROUND_TYPE.REACTION_TAP],
    preTargetDelayMs,
    targetRadius,
    targetPosition,
  };
};

export const validateSubmission = (submission) => {
  if (!submission) return { valid: false, error: 'No submission provided' };
  if (submission.roundType !== ROUND_TYPE.REACTION_TAP) {
    return { valid: false, error: 'Round type mismatch' };
  }
  if (typeof submission.submittedAt !== 'number' || submission.submittedAt <= 0) {
    return { valid: false, error: 'Invalid submittedAt' };
  }
  if (!isValidNormalisedCoord(submission.tapX, submission.tapY)) {
    return { valid: false, error: 'Invalid tap coordinates' };
  }
  return { valid: true };
};

export const scoreSubmission = (submission, config, roundStartTimestamp) => {
  const startTs = roundStartTimestamp ?? config.roundStartTimestamp ?? null;
  //  console.log('[ReactionTap] submittedAt:', submission.submittedAt, '| targetVisibleAt:', submission.targetVisibleAt, '| validTargetAt:', startTs ? startTs + config.preTargetDelayMs : null, '| reactionMs will be:', submission.targetVisibleAt ? submission.submittedAt - Math.max(submission.targetVisibleAt, (startTs ?? 0) + config.preTargetDelayMs) : submission.submittedAt - ((startTs ?? 0) + config.preTargetDelayMs));

  if (startTs == null) {
    return {
      score: 0,
      precisionScore: 0,
      speedBonus: 0,
      errorDistance: 1,
      reactionMs: null,
      earlyTap: false,
      positionError: 1,
    };
  }

  const validTargetAt = startTs + config.preTargetDelayMs;

  // Use the client-stamped time when the target became visible if provided.
  // This removes server→client clock drift from the reaction time measurement.
  // If not provided (older clients), fall back to server validTargetAt.
  // Cap targetVisibleAt to validTargetAt — a client cannot legitimately
  // report seeing the target before the server made it valid.
  const targetVisibleAt = submission.targetVisibleAt
    ? Math.max(submission.targetVisibleAt, validTargetAt)
    : validTargetAt;

  const reactionMs = submission.submittedAt - targetVisibleAt;
  const earlyTap = reactionMs < 0;

  // Position error: normalised against full arena half-diagonal.
  // Penalises distance from centre continuously — not just within the target radius.
  const dx = submission.tapX - config.targetPosition.x;
  const dy = submission.tapY - config.targetPosition.y;
  const distanceToCentre = Math.sqrt(dx * dx + dy * dy);
  const positionError = clamp(distanceToCentre / MAX_ARENA_DISTANCE, 0, 1);

  // Timing error: relative to human-realistic range.
  // 150ms → 0 error (perfect). 1000ms → 1.0 error (zero timing score).
  const timingError = earlyTap
    ? EARLY_TAP_PENALTY_ERROR
    : clamp(
        (reactionMs - MIN_HUMAN_REACTION_MS) / (MAX_SCORABLE_REACTION_MS - MIN_HUMAN_REACTION_MS),
        0,
        1,
      );

  const errorDistance = earlyTap
    ? 1
    : clamp(
        (timingError * (1 - DISTANCE_WEIGHT)) + (positionError * DISTANCE_WEIGHT),
        0,
        1,
      );

  const precisionScore = errorToScore(errorDistance, 1);

  return {
    score: precisionScore,
    precisionScore,
    speedBonus: 0,
    errorDistance,
    reactionMs,
    earlyTap,
    positionError,
  };
};

export const formatRevealData = (submission, config, scoringResult) => ({
  roundType: ROUND_TYPE.REACTION_TAP,
  targetPosition: config.targetPosition,
  targetRadius: config.targetRadius,
  playerTap: { x: submission.tapX, y: submission.tapY },
  reactionMs: scoringResult.reactionMs,
  earlyTap: scoringResult.earlyTap,
  positionError: scoringResult.positionError,
  errorDistance: scoringResult.errorDistance,
  score: scoringResult.score,
});