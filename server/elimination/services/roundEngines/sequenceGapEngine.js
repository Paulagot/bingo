import { randomBetween, clamp, errorToScore, calcSpeedBonus } from '../../utils/eliminationHelpers.js';
import { ROUND_TYPE, ROUND_DURATION } from '../../utils/eliminationConstants.js';

const PATTERN_TYPES = ['linear', 'step', 'growing'];

const generateSequence = (patternType, difficulty) => {
  const len = Math.floor(randomBetween(4, 5 + difficulty * 0.5)); // 4-7 numbers
  let seq = [];

  if (patternType === 'linear') {
    const start = Math.floor(randomBetween(1, 20 + difficulty * 5));
    const step = Math.floor(randomBetween(2, 5 + difficulty * 2));
    seq = Array.from({ length: len }, (_, i) => start + i * step);

  } else if (patternType === 'step') {
    // Alternating: +a, +b, +a, +b ...
    const start = Math.floor(randomBetween(1, 15));
    const stepA = Math.floor(randomBetween(2, 5));
    const stepB = Math.floor(randomBetween(2, 8));
    seq = [start];
    for (let i = 1; i < len; i++) {
      seq.push(seq[i-1] + (i % 2 === 1 ? stepA : stepB));
    }

  } else { // growing
    const start = Math.floor(randomBetween(1, 10));
    seq = [start];
    let increment = Math.floor(randomBetween(1, 3));
    for (let i = 1; i < len; i++) {
      seq.push(seq[i-1] + increment);
      increment += Math.floor(randomBetween(1, 3));
    }
  }

  return seq;
};

export const generateRoundConfig = ({ difficulty = 1 } = {}) => {
  const patternType = PATTERN_TYPES[Math.floor(Math.random() * PATTERN_TYPES.length)];
  const sequence = generateSequence(patternType, difficulty);

  // Pick missing index — not first or last (too easy)
  const missingIndex = Math.floor(randomBetween(1, sequence.length - 1));
  const actualValue = sequence[missingIndex];

  // Replace with null in display sequence
  const displaySequence = sequence.map((v, i) => i === missingIndex ? null : v);

  const displayDurationMs = Math.round(Math.max(2000, randomBetween(3500 - difficulty * 300, 5000 - difficulty * 300)));

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

export const validateSubmission = (submission) => {
  if (!submission) return { valid: false, error: 'No submission' };
  if (submission.roundType !== ROUND_TYPE.SEQUENCE_GAP) return { valid: false, error: 'Round type mismatch' };
  if (typeof submission.value !== 'number') return { valid: false, error: 'Invalid value' };
  return { valid: true };
};

export const scoreSubmission = (submission, config, roundStartTimestamp) => {
  const diff = Math.abs(submission.value - config.actualValue);
  const errorDistance = clamp(diff / Math.max(1, config.actualValue), 0, 1);
  const precisionScore = errorToScore(errorDistance, 1.0);
  const speedBonus = calcSpeedBonus(submission.submittedAt, roundStartTimestamp, config.durationMs, errorDistance, config.roundType);
  return { score: precisionScore + speedBonus, precisionScore, speedBonus, errorDistance, diff };
};

export const formatRevealData = (submission, config, scoringResult) => ({
  roundType: ROUND_TYPE.SEQUENCE_GAP,
  sequence: config.sequence,
  actualValue: config.actualValue,
  missingIndex: config.missingIndex,
  playerAnswer: submission.value,
  difference: scoringResult.diff,
  patternType: config.patternType,
  errorDistance: scoringResult.errorDistance,
  score: scoringResult.score,
});