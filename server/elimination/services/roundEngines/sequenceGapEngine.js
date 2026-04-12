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

const PATTERN_TYPES = ['linear', 'step', 'growing'];

const generateSequence = (patternType, t) => {
  // Sequence length: 4 (easy) → 7 (hard)
  const len = Math.round(lerp(4, 7, t));

  let seq = [];

  if (patternType === 'linear') {
    // Bigger starting numbers and larger steps at high difficulty
    const start = Math.floor(randomBetween(1, Math.round(lerp(15, 50, t))));
    const step  = Math.floor(randomBetween(2, Math.round(lerp(6, 15, t))));
    seq = Array.from({ length: len }, (_, i) => start + i * step);

  } else if (patternType === 'step') {
    // Alternating +a, +b, +a, +b ...
    // Wider and more similar step values at high difficulty (harder to distinguish the pattern)
    const start = Math.floor(randomBetween(1, Math.round(lerp(15, 40, t))));
    const stepA = Math.floor(randomBetween(2, Math.round(lerp(6, 12, t))));
    const stepB = Math.floor(randomBetween(2, Math.round(lerp(6, 12, t))));
    seq = [start];
    for (let i = 1; i < len; i++) {
      seq.push(seq[i - 1] + (i % 2 === 1 ? stepA : stepB));
    }

  } else {
    // Growing — increment increases each step
    // Larger starting increment and growth at high difficulty
    const start = Math.floor(randomBetween(1, Math.round(lerp(10, 30, t))));
    seq = [start];
    let increment = Math.floor(randomBetween(1, Math.round(lerp(3, 6, t))));
    for (let i = 1; i < len; i++) {
      seq.push(seq[i - 1] + increment);
      increment += Math.floor(randomBetween(1, Math.round(lerp(3, 5, t))));
    }
  }

  return seq;
};

// ─── Generate ─────────────────────────────────────────────────────────────────

export const generateRoundConfig = ({ difficulty = 1, totalRounds } = {}) => {
  // ── Dynamic difficulty pattern (Section 0.2) ──────────────────────────────
  const safeTotalRounds = totalRounds ?? GAME_RULES.TOTAL_ROUNDS;
  const maxDifficulty   = 1 + (safeTotalRounds - 1) * 0.15;
  const t               = Math.min(1, Math.max(0, (difficulty - 1) / (maxDifficulty - 1)));
  const tCurved         = Math.sqrt(t); // softer curve for timing mechanics

  const patternType = PATTERN_TYPES[Math.floor(Math.random() * PATTERN_TYPES.length)];
  const sequence    = generateSequence(patternType, t);

  // ── Missing index ─────────────────────────────────────────────────────────
  // Easy: bias toward edges (more neighbours to reason from)
  // Hard: bias toward middle (fewer contextual clues)
  // We do this by shrinking the safe range inward as t increases
  const edgePad    = Math.round(lerp(1, Math.floor(sequence.length / 3), t));
  const minIdx     = edgePad;
  const maxIdx     = sequence.length - 1 - edgePad;
  const safeMin    = Math.min(minIdx, maxIdx); // guard against short sequences
  const safeMax    = Math.max(minIdx, maxIdx);
  const missingIndex = Math.floor(randomBetween(safeMin, safeMax + 1));

  const actualValue     = sequence[missingIndex];
  const displaySequence = sequence.map((v, i) => (i === missingIndex ? null : v));

  // ── Display duration: 4500ms (easy) → 3000ms (hard), sqrt-curved ─────────
  const displayDurationMs = Math.round(lerp(4500, 3000, tCurved));

  return {
    roundType: ROUND_TYPE.SEQUENCE_GAP,
    sequence: displaySequence,
    missingIndex,
    actualValue,
    patternType,
    displayDurationMs,
    durationMs: ROUND_DURATION[ROUND_TYPE.SEQUENCE_GAP],
  };
};

// ─── Validate ─────────────────────────────────────────────────────────────────

export const validateSubmission = (submission) => {
  if (!submission) return { valid: false, error: 'No submission' };
  if (submission.roundType !== ROUND_TYPE.SEQUENCE_GAP) return { valid: false, error: 'Round type mismatch' };
  if (typeof submission.value !== 'number') return { valid: false, error: 'Invalid value' };
  return { valid: true };
};

// ─── Score ────────────────────────────────────────────────────────────────────

export const scoreSubmission = (submission, config, roundStartTimestamp) => {
  const diff          = Math.abs(submission.value - config.actualValue);
  const errorDistance = clamp(diff / Math.max(1, config.actualValue), 0, 1);
  const precisionScore = errorToScore(errorDistance, 1.0);
  const speedBonus    = calcSpeedBonus(
    submission.submittedAt, roundStartTimestamp,
    config.durationMs, errorDistance, config.roundType, .25,
  );
  return { score: precisionScore + speedBonus, precisionScore, speedBonus, errorDistance, diff };
};

// ─── Reveal ───────────────────────────────────────────────────────────────────

export const formatRevealData = (submission, config, scoringResult) => ({
  roundType:     ROUND_TYPE.SEQUENCE_GAP,
  sequence:      config.sequence,
  actualValue:   config.actualValue,
  missingIndex:  config.missingIndex,
  playerAnswer:  submission.value,
  difference:    scoringResult.diff,
  patternType:   config.patternType,
  errorDistance: scoringResult.errorDistance,
  score:         scoringResult.score,
});