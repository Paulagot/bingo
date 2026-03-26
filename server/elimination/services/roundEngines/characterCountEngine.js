import { randomBetween, clamp, errorToScore, calcSpeedBonus } from '../../utils/eliminationHelpers.js';
import { ROUND_TYPE, ROUND_DURATION } from '../../utils/eliminationConstants.js';

const LETTERS = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; // no I/O to avoid confusion
const NUMBERS = '23456789'; // no 0/1 to avoid confusion

export const generateRoundConfig = ({ difficulty = 1 } = {}) => {
  const useNumbers = Math.random() > 0.5;
  const charset = useNumbers ? NUMBERS : LETTERS;

  // Pick target character
  const targetChar = charset[Math.floor(Math.random() * charset.length)];

  // Pick 2-4 distractor characters (different from target)
  const distractorCount = Math.floor(randomBetween(2, 4));
  const distractors = [];
  while (distractors.length < distractorCount) {
    const c = charset[Math.floor(Math.random() * charset.length)];
    if (c !== targetChar && !distractors.includes(c)) distractors.push(c);
  }
  const allChars = [targetChar, ...distractors];

  // Total characters scales with difficulty
  const total = Math.floor(randomBetween(10 + difficulty * 3, 18 + difficulty * 4));

  // Target count: 25-40% of total
  const targetCount = Math.round(total * randomBetween(0.25, 0.40));

  // Generate positions with spacing
  const characters = [];
  const minDist = 0.09;
  let attempts = 0;
  let targetPlaced = 0;

  for (let i = 0; i < total && attempts < 500; attempts++) {
    const x = randomBetween(0.05, 0.95);
    const y = randomBetween(0.05, 0.95);
    if (characters.some(c => Math.hypot(c.x - x, c.y - y) < minDist)) continue;

    const isTarget = targetPlaced < targetCount;
    const value = isTarget
      ? targetChar
      : distractors[Math.floor(Math.random() * distractors.length)];

    const fontSize = randomBetween(0.05, 0.09);
    const rotation = Math.floor(randomBetween(-15, 15)); // slight rotation for variety

    characters.push({ x, y, value, isTarget: isTarget || value === targetChar, fontSize, rotation });
    if (value === targetChar) targetPlaced++;
    i++;
  }

  // Shuffle
  for (let i = characters.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [characters[i], characters[j]] = [characters[j], characters[i]];
  }

  const actualCount = characters.filter(c => c.value === targetChar).length;
  const displayDurationMs = Math.round(Math.max(1500, randomBetween(2500 - difficulty * 200, 4000 - difficulty * 300)));

  return {
    roundType: ROUND_TYPE.CHARACTER_COUNT,
    characters,
    targetCharacter: targetChar,
    actualCount,
    displayDurationMs,
    durationMs: ROUND_DURATION[ROUND_TYPE.CHARACTER_COUNT],
  };
};

export const validateSubmission = (submission) => {
  if (!submission) return { valid: false, error: 'No submission' };
  if (submission.roundType !== ROUND_TYPE.CHARACTER_COUNT) return { valid: false, error: 'Round type mismatch' };
  if (typeof submission.value !== 'number' || !Number.isInteger(submission.value)) return { valid: false, error: 'Invalid value' };
  return { valid: true };
};

export const scoreSubmission = (submission, config, roundStartTimestamp) => {
  const diff = Math.abs(submission.value - config.actualCount);
  const errorDistance = clamp(diff / config.actualCount, 0, 1);
  const precisionScore = errorToScore(errorDistance, 1.0);
  const speedBonus = calcSpeedBonus(submission.submittedAt, roundStartTimestamp, config.durationMs, errorDistance, config.roundType);
  return { score: precisionScore + speedBonus, precisionScore, speedBonus, errorDistance, diff };
};

export const formatRevealData = (submission, config, scoringResult) => ({
  roundType: ROUND_TYPE.CHARACTER_COUNT,
  characters: config.characters,
  targetCharacter: config.targetCharacter,
  actualCount: config.actualCount,
  playerAnswer: submission.value,
  difference: scoringResult.diff,
  errorDistance: scoringResult.errorDistance,
  score: scoringResult.score,
});