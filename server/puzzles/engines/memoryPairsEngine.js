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

// Scoring settings scale with pair count / difficulty — previously this
// engine paid a flat baseScore regardless of difficulty, so 8-pair easy and
// 18-pair hard scored identically.
const DIFFICULTY_SETTINGS = {
  [Difficulty.EASY]:   { baseScore: 60,  bonusIdeal: 15, bonusGood: 45, bonusMax: 150 },
  [Difficulty.MEDIUM]: { baseScore: 85,  bonusIdeal: 20, bonusGood: 60, bonusMax: 250 },
  [Difficulty.HARD]:   { baseScore: 120, bonusIdeal: 30, bonusGood: 90, bonusMax: 400 },
};

// Soft, capped bonus for finishing close to the theoretical minimum number
// of attempts (= pairCount, i.e. never flipping a wrong pair). `attempts`
// comes from the client the same way timeTakenSeconds does, so — like the
// time bonus — this is a minor, gameable-but-low-stakes signal, not an
// authoritative one. It rewards genuinely careful play without letting
// anyone inflate the *base* (correctness) score.
function attemptsEfficiencyBonus(attempts, pairCount) {
  if (!Number.isFinite(attempts) || attempts <= 0 || !pairCount) return 0;
  const ratio = Math.min(1, pairCount / attempts); // 1 = perfect run
  return Math.round(ratio * 25);
}

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
      cards: cards.map(c => ({ id: c.id })), // IDs only, to keep card *order* separate from the emoji lookup
      // NOTE: cardEmojis IS sent to the client as-is — the renderer needs
      // the full mapping up front to reveal a card's face the instant it's
      // flipped, without a round-trip per flip. That means a player who
      // opens devtools can technically read every pair before playing.
      // This is a known, accepted trade-off for a casual/family game (it's
      // how virtually every client-rendered memory-match game works) rather
      // than a bug — but if this puzzle type ever needs to be cheat-proof,
      // the real fix is a per-flip "reveal" endpoint rather than trying to
      // hide this array, and that's a larger change than a comment.
      cardEmojis: cards.map(c => c.emoji),
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

export function score({ validationResult, submission, difficulty }) {
  if (!validationResult.valid) return { completed: false, correct: false, baseScore: 0, bonusScore: 0, penaltyScore: 0, totalScore: 0 };

  const settings = DIFFICULTY_SETTINGS[difficulty] ?? DIFFICULTY_SETTINGS[Difficulty.MEDIUM];
  const timeBonus = calcTimeBonus(submission.timeTakenSeconds, settings.bonusIdeal, settings.bonusGood, settings.bonusMax);

  const pairCount = submission?.answer?.foundPairs?.length ?? undefined;
  const attemptsBonus = attemptsEfficiencyBonus(submission?.answer?.attempts, pairCount);

  const bonusScore = timeBonus + attemptsBonus;

  return {
    completed: true,
    correct: true,
    baseScore: settings.baseScore,
    bonusScore,
    penaltyScore: 0,
    totalScore: settings.baseScore + bonusScore,
  };
}

export default { generate, validate, score };