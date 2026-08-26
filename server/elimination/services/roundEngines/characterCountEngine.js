import { randomBetween, clamp, errorToScore, calcSpeedBonus } from '../../utils/eliminationHelpers.js';
import { ROUND_TYPE, ROUND_DURATION } from '../../utils/eliminationConstants.js';

// ─── Character sets ───────────────────────────────────────────────────────────

// Groups of visually similar characters - used to pick hard distractors
const SIMILAR_GROUPS = [
  ['B', '8', 'D'],
  ['O', 'Q', '0'],
  ['S', '5'],
  ['I', '1', 'J'],
  ['G', '6'],
  ['Z', '2'],
  ['U', 'V'],
  ['P', 'F'],
  ['M', 'N'],
  ['C', 'G'],
  ['7', 'T'],
  ['3', 'E'],
  ['4', 'A'],
  ['9', 'g'],
];

const EASY_LETTERS   = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
const EASY_NUMBERS   = '23456789';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Find visually similar characters for a given target.
 * Returns an array of chars from the same similarity group.
 */
const getSimilarChars = (target) => {
  const group = SIMILAR_GROUPS.find(g => g.includes(target));
  if (!group) return [];
  return group.filter(c => c !== target);
};

/**
 * Pick distractors for a target character.
 * At low difficulty: random chars from charset.
 * At high difficulty: prefer visually similar chars, pad with random if needed.
 */
const pickDistractors = (target, charset, count, difficulty) => {
  const maxDifficulty = 8;
  const similarBias = Math.min(1, difficulty / maxDifficulty); // 0 → 1

  const similar = getSimilarChars(target);
  const distractors = [];

  // Fill from similar chars first based on difficulty bias
  const similarTarget = Math.round(count * similarBias);
  for (const c of similar) {
    if (distractors.length >= similarTarget) break;
    if (c !== target && !distractors.includes(c)) distractors.push(c);
  }

  // Pad remainder with random chars from charset
  const pool = (charset + EASY_LETTERS + EASY_NUMBERS)
    .split('')
    .filter(c => c !== target && !distractors.includes(c));

  while (distractors.length < count && pool.length > 0) {
    const idx = Math.floor(Math.random() * pool.length);
    distractors.push(pool[idx]);
    pool.splice(idx, 1);
  }

  return distractors.slice(0, count);
};

// ─── Generate ─────────────────────────────────────────────────────────────────

export const generateRoundConfig = ({ difficulty = 1, totalRounds } = {}) => {
  const safeTotalRounds = totalRounds ?? 8;
  const maxDifficulty = 1 + (safeTotalRounds - 1) * 0.15;
  const t = Math.min(1, Math.max(0, (difficulty - 1) / (maxDifficulty - 1))); // 0→1

  const useNumbers = Math.random() > 0.5;
  const charset = useNumbers ? EASY_NUMBERS : EASY_LETTERS;

  // Target character
  const targetChar = charset[Math.floor(Math.random() * charset.length)];

  // Distractor count: 2 random easy, 3 random medium, 4-5 similar hard
  const distractorCount = Math.round(2 + t * 3); // 2→5
  const distractors = pickDistractors(targetChar, charset, distractorCount, difficulty);
  const allChars = [targetChar, ...distractors];

  // Total characters: 10–15 easy, 15–22 medium, 20–25 hard
  const minTotal = Math.round(10 + t * 10); // 10→20
  const maxTotal = Math.round(15 + t * 10); // 15→25
  const total = Math.floor(randomBetween(minTotal, maxTotal));

  // Target count: 25-40% of total
  const targetCount = Math.round(total * randomBetween(0.25, 0.40));

  // Font size: easy 0.08–0.095, medium 0.065–0.08, hard 0.055–0.07
  const minFontSize = Math.max(0.055, 0.08  - t * 0.025); // 0.08→0.055
  const maxFontSize = Math.max(0.07,  0.095 - t * 0.025); // 0.095→0.07

  // Rotation: ±10° easy, ±20° medium, ±30° hard
  const maxRotation = Math.round(10 + t * 20); // 10°→30°

  // Spacing: 0.11 easy, 0.09 medium, 0.07 hard
  const minDist = Math.max(0.07, 0.11 - t * 0.04); // 0.11→0.07

  // Generate positions
  const characters = [];
  let attempts = 0;
  let targetPlaced = 0;

  for (let i = 0; i < total && attempts < 800; attempts++) {
    const x = randomBetween(0.05, 0.95);
    const y = randomBetween(0.05, 0.95);
    if (characters.some(c => Math.hypot(c.x - x, c.y - y) < minDist)) continue;

    const isTarget = targetPlaced < targetCount;
    const value = isTarget
      ? targetChar
      : distractors[Math.floor(Math.random() * distractors.length)];

    const fontSize = randomBetween(minFontSize, maxFontSize);
    const rotation = Math.floor(randomBetween(-maxRotation, maxRotation));

    characters.push({
      x, y, value,
      isTarget: value === targetChar,
      fontSize,
      rotation,
    });

    if (value === targetChar) targetPlaced++;
    i++;
  }

  // Shuffle so targets aren't front-loaded
  for (let i = characters.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [characters[i], characters[j]] = [characters[j], characters[i]];
  }

  const actualCount = characters.filter(c => c.value === targetChar).length;

  // Display time: easy 4000–5000ms, medium 3000–4000ms, hard 2000–3000ms
  const minDisplay = Math.round(4000 - t * 2000); // 4000→2000ms
  const maxDisplay = Math.round(5000 - t * 2000); // 5000→3000ms
  const displayDurationMs = Math.round(randomBetween(minDisplay, maxDisplay));

  return {
    roundType: ROUND_TYPE.CHARACTER_COUNT,
    characters,
    targetCharacter: targetChar,
    actualCount,
    displayDurationMs,
    durationMs: ROUND_DURATION[ROUND_TYPE.CHARACTER_COUNT],
  };
};

// ─── Validate ─────────────────────────────────────────────────────────────────

export const validateSubmission = (submission) => {
  if (!submission) return { valid: false, error: 'No submission' };
  if (submission.roundType !== ROUND_TYPE.CHARACTER_COUNT) return { valid: false, error: 'Round type mismatch' };
  if (typeof submission.value !== 'number' || !Number.isInteger(submission.value)) return { valid: false, error: 'Invalid value' };
  return { valid: true };
};

// ─── Score ────────────────────────────────────────────────────────────────────

export const scoreSubmission = (submission, config, roundStartTimestamp) => {
  const diff = Math.abs(submission.value - config.actualCount);
  const errorDistance = clamp(diff / config.actualCount, 0, 1);
  const precisionScore = errorToScore(errorDistance, 1.0);
  const speedBonus = calcSpeedBonus(submission.submittedAt, roundStartTimestamp, config.durationMs, errorDistance, config.roundType);
  return { score: precisionScore + speedBonus, precisionScore, speedBonus, errorDistance, diff };
};

// ─── Reveal ───────────────────────────────────────────────────────────────────

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