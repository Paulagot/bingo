/**
 * Memory Pairs Puzzle Engine
 * server/puzzles/engines/memoryPairsEngine.js
 *
 * Flip cards to find all matching emoji pairs.
 * Easy: 8 pairs (4×4), Medium: 12 pairs (4×6), Hard: 18 pairs (6×6).
 */

import { createSeededRandom, shuffleArray, calcTimeBonus } from '../utils/puzzleHelpers.js';
import { PuzzleType, Difficulty } from '../puzzleTypes.js';

// ---------------------------------------------------------------------------
// Emoji pool — 36 distinct symbols, plenty for any difficulty
// ---------------------------------------------------------------------------

const EMOJI_POOL = [
  '🌟','🎯','🎨','🎭','🎪','🎬','🎤','🎸',
  '🌈','🌊','🌺','🌻','🍀','🍁','🍄','🦋',
  '🐬','🦊','🦁','🐧','🦄','🐢','🦖','🦕',
  '🚀','⚡','🔥','❄️','🌙','☀️','🌍','🎃',
  '🏆','💎','🔮','🎲',
];

const PAIR_COUNTS = {
  [Difficulty.EASY]:   8,   // 4×4 grid
  [Difficulty.MEDIUM]: 12,  // 4×6 grid
  [Difficulty.HARD]:   18,  // 6×6 grid
};

export function generate(config) {
  const { difficulty = Difficulty.MEDIUM } = config;
  const seed = config.seed ?? `memoryPairs-${difficulty}-${Date.now()}-${Math.random().toString(36).slice(2)}`;

  const rng       = createSeededRandom(seed);
  const pairCount = PAIR_COUNTS[difficulty] ?? 12;

  // Pick pairCount emoji from pool
  const emojis    = shuffleArray([...EMOJI_POOL], rng).slice(0, pairCount);

  // Duplicate and shuffle to make the card grid
  const cards     = shuffleArray([...emojis, ...emojis], rng).map((emoji, i) => ({
    id:    i,
    emoji,
  }));

  // Grid dimensions
  const total = cards.length;
  const cols  = difficulty === Difficulty.EASY ? 4 : difficulty === Difficulty.MEDIUM ? 6 : 6;
  const rows  = total / cols;

  return {
    puzzleType: PuzzleType.MEMORY_PAIRS,
    difficulty,
    seed,
    puzzleData: {
      cards: cards.map(c => ({ id: c.id })), // IDs only — emoji sent separately
      cardEmojis: cards.map(c => c.emoji),   // parallel array — stripped server-side before send
      rows,
      cols,
      pairCount,
    },
    solutionData: {
      cardEmojis: cards.map(c => c.emoji),
      pairCount,
    },
    meta: { pairCount, rows, cols },
  };
}

// ---------------------------------------------------------------------------
// validate
// ---------------------------------------------------------------------------

/**
 * Player submits: { foundPairs: [{cardId1, cardId2},...] }
 * All pairs must be found and each pair must be a genuine emoji match.
 */
export function validate(playerAnswer, solutionData) {
  const foundPairs  = playerAnswer?.foundPairs;
  const cardEmojis  = solutionData.cardEmojis;
  const pairCount   = solutionData.pairCount;

  if (!foundPairs || !Array.isArray(foundPairs)) {
    return { valid: false, reason: 'No pairs submitted.' };
  }

  if (foundPairs.length !== pairCount) {
    return { valid: false, reason: `Expected ${pairCount} pairs, got ${foundPairs.length}.` };
  }

  for (const { cardId1, cardId2 } of foundPairs) {
    const e1 = cardEmojis[cardId1];
    const e2 = cardEmojis[cardId2];
    if (!e1 || !e2) return { valid: false, reason: `Invalid card id.` };
    if (e1 !== e2)  return { valid: false, reason: `Cards ${cardId1} and ${cardId2} are not a matching pair.` };
    if (cardId1 === cardId2) return { valid: false, reason: `Cannot pair a card with itself.` };
  }

  return { valid: true };
}

// ---------------------------------------------------------------------------
// score
// ---------------------------------------------------------------------------

export function score({ validationResult, submission }) {
  if (!validationResult.valid) return { completed: false, correct: false, baseScore: 0, bonusScore: 0, penaltyScore: 0, totalScore: 0 };
  // Full bonus within 60s, decays to 0 at 5 min
  const bonusScore = calcTimeBonus(submission.timeTakenSeconds, 20, 60, 300);
  return { completed: true, correct: true, baseScore: 80, bonusScore, penaltyScore: 0, totalScore: 80 + bonusScore };
}

export default { generate, validate, score };