import {
  randomBetween,
  randomFrom,
  clamp,
  errorToScore,
  lerp,
} from '../../utils/eliminationHelpers.js';
import { ROUND_TYPE, ROUND_DURATION, GAME_RULES } from '../../utils/eliminationConstants.js';

const DIRECTIONS = ['left_to_right', 'right_to_left'];

// ─── Speed config ─────────────────────────────────────────────────────────────
// Speed is measured in full bar widths per second.
const MIN_SPEED = 0.8;   // never slower than this
const MAX_SPEED = 3.5;   // hard cap

// ─── Generate ─────────────────────────────────────────────────────────────────

export const generateRoundConfig = ({ difficulty = 1, totalRounds } = {}) => {
  const durationMs = ROUND_DURATION[ROUND_TYPE.STOP_THE_BAR];

  // Normalise difficulty to 0–1 across the full round range
  const safeTotalRounds = totalRounds ?? GAME_RULES.TOTAL_ROUNDS;
  const maxDifficulty = 1 + (safeTotalRounds - 1) * 0.15;
  const t = Math.min(1, Math.max(0, (difficulty - 1) / (maxDifficulty - 1)));

  // Soften the curve with sqrt so early rounds feel the improvement quickly
  // but late rounds don't spike to an unplayable speed.
  // Round 1: t=0, tCurved=0  →  Round 4: t=0.43, tCurved=0.66  →  Round 8: t=1, tCurved=1
  const tCurved = Math.sqrt(t);

  // Speed: approachable early, challenging but fair at the end.
  // Round 1: 0.85–1.1 widths/sec  →  Round 4: ~1.3–1.6  →  Round 8: 1.6–2.1 widths/sec
  const baseSpeed = lerp(0.8, 1.8, tCurved);
  const speedWidthsPerSec = clamp(
    baseSpeed + randomBetween(0.05, 0.3),
    MIN_SPEED,
    MAX_SPEED,
  );

  // Number of full passes the bar makes during the round
  const totalWidths = speedWidthsPerSec * (durationMs / 1000);
  const passes = Math.floor(totalWidths);

  const movementDirection = randomFrom(DIRECTIONS);

  // Target position: early rounds keep target comfortably central,
  // later rounds allow it near edges where timing is harder to judge
  const edgeMargin = lerp(0.25, 0.08, tCurved);
  const targetPosition = randomBetween(edgeMargin, 1 - edgeMargin);

  // Target width: wide early, narrower late — also uses softened curve
  // Round 1: 8%–14% of bar  →  Round 8: 3%–7% of bar
  const targetWidth = clamp(
    randomBetween(lerp(0.08, 0.03, tCurved), lerp(0.14, 0.07, tCurved)),
    0.025,
    0.14,
  );

  // Bar thickness — cosmetic only
  const barThickness = randomBetween(3, 8);

  return {
    roundType: ROUND_TYPE.STOP_THE_BAR,
    durationMs,
    passes,
    speedWidthsPerSec,
    movementDirection,
    targetPosition,
    targetWidth,
    barThickness,
    speedProfile: 'linear',
    roundStartTimestamp: null,
  };
};

// ─── Validate ─────────────────────────────────────────────────────────────────

export const validateSubmission = (submission, config) => {
  if (!submission) return { valid: false, error: 'No submission provided' };
  if (submission.roundType !== ROUND_TYPE.STOP_THE_BAR)
    return { valid: false, error: 'Round type mismatch' };
  if (typeof submission.submittedAt !== 'number' || submission.submittedAt <= 0)
    return { valid: false, error: 'Invalid submittedAt timestamp' };
  return { valid: true };
};

// ─── Score ────────────────────────────────────────────────────────────────────

/**
 * Derive marker position from timestamp using bouncing logic.
 * Matches the client-side computeBarPosition utility exactly.
 *
 * Odd passes travel right→left (reverse), even passes left→right.
 */
export const scoreSubmission = (submission, config) => {
  const { roundStartTimestamp, durationMs, speedWidthsPerSec } = config;

  const elapsed = clamp(submission.submittedAt - roundStartTimestamp, 0, durationMs);
  const elapsedSec = elapsed / 1000;

  const totalDistance = elapsedSec * speedWidthsPerSec;
  const passIndex = Math.floor(totalDistance);
  const progressInPass = totalDistance - passIndex;

  const isReverse = passIndex % 2 === 1;
  const playerStopPosition = isReverse ? 1 - progressInPass : progressInPass;

  const errorDistance = Math.abs(playerStopPosition - config.targetPosition);
  const score = errorToScore(errorDistance, 1.0);

  return { score, errorDistance, playerStopPosition };
};

// ─── Reveal ───────────────────────────────────────────────────────────────────

export const formatRevealData = (submission, config, scoringResult) => ({
  roundType: ROUND_TYPE.STOP_THE_BAR,
  targetPosition: config.targetPosition,
  playerStopPosition: scoringResult.playerStopPosition,
  errorDistance: scoringResult.errorDistance,
  score: scoringResult.score,
});