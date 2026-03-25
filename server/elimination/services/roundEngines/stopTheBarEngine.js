import {
  randomBetween,
  randomFrom,
  clamp,
  errorToScore,
} from '../../utils/eliminationHelpers.js';
import { ROUND_TYPE, ROUND_DURATION } from '../../utils/eliminationConstants.js';

const DIRECTIONS = ['left_to_right', 'right_to_left'];

// ─── Speed config ─────────────────────────────────────────────────────────────
// Speed is measured in full bar widths per second.
// MIN_SPEED: bar completes at least one pass per this many ms
// Each difficulty level adds speed. Passes = how many times bar bounces.

const MIN_SPEED = 0.8;   // bar widths/sec — never slower than this
const MAX_SPEED = 3.5;   // bar widths/sec — cap

// ─── Generate ─────────────────────────────────────────────────────────────────

export const generateRoundConfig = ({ difficulty = 1 } = {}) => {
  const durationMs = ROUND_DURATION[ROUND_TYPE.STOP_THE_BAR];

  // Speed increases with difficulty, with a minimum floor
  const speedWidthsPerSec = clamp(
    MIN_SPEED + (difficulty - 1) * 0.35 + randomBetween(0.1, 0.4),
    MIN_SPEED,
    MAX_SPEED,
  );

  // Number of full passes the bar makes during the round
  // At 1.5 w/s for 12s = 18 widths = 9 bounces — quite fast
  const totalWidths = speedWidthsPerSec * (durationMs / 1000);
  const passes = Math.floor(totalWidths); // integer passes for clean math

  const movementDirection = randomFrom(DIRECTIONS);

  // Target: somewhere in middle third — harder difficulties push toward edges
  const edgeMargin = Math.max(0.08, 0.2 - (difficulty - 1) * 0.02);
  const targetPosition = randomBetween(edgeMargin, 1 - edgeMargin);

  // Target width: narrows with difficulty
  const targetWidth = clamp(
    randomBetween(0.04, 0.12) * (1 - (difficulty - 1) * 0.04),
    0.025,
    0.12,
  );

  // Bar thickness varies for visual variety
  const barThickness = randomBetween(3, 8); // pixels (cosmetic only)

  return {
    roundType: ROUND_TYPE.STOP_THE_BAR,
    durationMs,
    passes,           // total number of full 0→1 or 1→0 sweeps
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
 * Derive marker position using bouncing logic.
 * The bar travels back and forth — odd passes go start→end, even passes end→start.
 */
export const scoreSubmission = (submission, config) => {
  const { roundStartTimestamp, durationMs, passes, speedWidthsPerSec } = config;

  const elapsed = clamp(submission.submittedAt - roundStartTimestamp, 0, durationMs);
  const elapsedSec = elapsed / 1000;

  // Total distance travelled in bar widths
  const totalDistance = elapsedSec * speedWidthsPerSec;

  // Which pass are we on, and how far through it
  const passIndex = Math.floor(totalDistance);
  const progressInPass = totalDistance - passIndex;

  // Odd passes go right→left (reverse), even go left→right
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