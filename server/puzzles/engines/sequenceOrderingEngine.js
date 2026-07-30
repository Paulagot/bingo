/**
 * Sequence Ordering Puzzle Engine
 * server/puzzles/engines/sequenceOrderingEngine.js
 *
 * Objective: Player drags/reorders a set of items into the correct sequence.
 * Non-quiz - uses observable/measurable progressions (size, duration, etc.)
 */

import { createSeededRandom, shuffleArray, calcTimeBonus } from '../utils/puzzleHelpers.js';
import { PuzzleType, Difficulty } from '../puzzleTypes.js';

// ---------------------------------------------------------------------------
// Sequence template bank
// Each template defines a prompt and items with a pre-determined correct order.
// The `orderedIds` in solutionData are the IDs in correct order (index 0 = first).
// ---------------------------------------------------------------------------

const SEQUENCE_BANK = {
  [Difficulty.EASY]: [
    {
      prompt: 'Order these from smallest to largest',
      items: [
        { id: 'a', label: '🐝 Bee' },
        { id: 'b', label: '🐇 Rabbit' },
        { id: 'c', label: '🐕 Dog' },
        { id: 'd', label: '🐄 Cow' },
        { id: 'e', label: '🐘 Elephant' },
      ],
      orderedIds: ['a', 'b', 'c', 'd', 'e'],
    },
    {
      prompt: 'Order these meals from morning to night',
      items: [
        { id: 'a', label: '🌅 Breakfast' },
        { id: 'b', label: '☕ Morning snack' },
        { id: 'c', label: '🥪 Lunch' },
        { id: 'd', label: '🍪 Afternoon snack' },
        { id: 'e', label: '🍝 Dinner' },
      ],
      orderedIds: ['a', 'b', 'c', 'd', 'e'],
    },
    {
      prompt: 'Order these from coldest to hottest',
      items: [
        { id: 'a', label: '🧊 Ice cube' },
        { id: 'b', label: '🥛 Milk from the fridge' },
        { id: 'c', label: '🌤️ A sunny day' },
        { id: 'd', label: '☕ Hot chocolate' },
        { id: 'e', label: '🔥 Campfire' },
      ],
      orderedIds: ['a', 'b', 'c', 'd', 'e'],
    },
  ],

  [Difficulty.MEDIUM]: [
    {
      prompt: 'Order these planets from closest to furthest from the Sun',
      items: [
        { id: 'a', label: '🔴 Mars' },
        { id: 'b', label: '🟤 Mercury' },
        { id: 'c', label: '🌍 Earth' },
        { id: 'd', label: '⚪ Venus' },
        { id: 'e', label: '🟠 Jupiter' },
      ],
      orderedIds: ['b', 'd', 'c', 'a', 'e'],
    },
    {
      prompt: 'Order these from fastest to slowest',
      items: [
        { id: 'a', label: '⚡ Lightning' },
        { id: 'b', label: '✈️ Jet plane' },
        { id: 'c', label: '🚄 High-speed train' },
        { id: 'd', label: '🚗 Car on a motorway' },
        { id: 'e', label: '🏃 Person running' },
        { id: 'f', label: '🐌 Snail' },
      ],
      orderedIds: ['a', 'b', 'c', 'd', 'e', 'f'],
    },
    {
      prompt: 'Order these life stages from earliest to latest',
      items: [
        { id: 'a', label: '👶 Baby' },
        { id: 'b', label: '🧒 Child' },
        { id: 'c', label: '🧑 Teenager' },
        { id: 'd', label: '👩 Adult' },
        { id: 'e', label: '👵 Older adult' },
      ],
      orderedIds: ['a', 'b', 'c', 'd', 'e'],
    },
  ],

  [Difficulty.HARD]: [
    {
      prompt: 'Order these historical periods from earliest to latest',
      items: [
        { id: 'a', label: 'Stone Age' },
        { id: 'b', label: 'Ancient Egypt' },
        { id: 'c', label: 'Roman Empire' },
        { id: 'd', label: 'Middle Ages' },
        { id: 'e', label: 'Industrial Revolution' },
        { id: 'f', label: 'Space Age' },
      ],
      orderedIds: ['a', 'b', 'c', 'd', 'e', 'f'],
    },
    {
      prompt: 'Order these inventions from earliest to latest',
      items: [
        { id: 'a', label: 'Printing press' },
        { id: 'b', label: 'Steam engine' },
        { id: 'c', label: 'Telephone' },
        { id: 'd', label: 'Television' },
        { id: 'e', label: 'Personal computer' },
        { id: 'f', label: 'Smartphone' },
      ],
      orderedIds: ['a', 'b', 'c', 'd', 'e', 'f'],
    },
    {
      prompt: 'Order these from lowest to highest in the atmosphere',
      items: [
        { id: 'a', label: '🏠 Rooftop' },
        { id: 'b', label: '⛰️ Mountain peak' },
        { id: 'c', label: '☁️ Clouds' },
        { id: 'd', label: '✈️ Passenger plane' },
        { id: 'e', label: '🛰️ Satellite' },
      ],
      orderedIds: ['a', 'b', 'c', 'd', 'e'],
    },
  ],
};

// Scoring settings scale with item count / difficulty - previously flat
// regardless of difficulty.
const DIFFICULTY_SETTINGS = {
  [Difficulty.EASY]:   { baseScore: 55, bonusIdeal: 20, bonusGood: 35, bonusMax: 120 },
  [Difficulty.MEDIUM]: { baseScore: 70, bonusIdeal: 25, bonusGood: 45, bonusMax: 180 },
  [Difficulty.HARD]:   { baseScore: 90, bonusIdeal: 30, bonusGood: 60, bonusMax: 260 },
};

// ---------------------------------------------------------------------------
// generate
// ---------------------------------------------------------------------------

export function generate(config) {
  const { difficulty = Difficulty.MEDIUM } = config;
  const seed = config.seed ?? `${difficulty}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const rng  = createSeededRandom(seed);
  const bank = SEQUENCE_BANK[difficulty] ?? SEQUENCE_BANK[Difficulty.MEDIUM];

  const template  = bank[Math.floor(rng() * bank.length)];
  // Present items in shuffled order so the player must reorder them
  const shuffled  = shuffleArray(template.items, rng);

  return {
    puzzleType: PuzzleType.SEQUENCE_ORDERING,
    difficulty,
    seed,
    puzzleData: {
      prompt: template.prompt,
      items:  shuffled,
    },
    solutionData: {
      orderedIds: template.orderedIds,
    },
    meta: {
      itemCount: template.items.length,
    },
  };
}

// ---------------------------------------------------------------------------
// validate
// ---------------------------------------------------------------------------

export function validate(input, solution) {
  const submitted = input.orderedIds;
  const correct   = solution.orderedIds;

  if (!Array.isArray(submitted) || submitted.length === 0) {
    return { valid: false, reason: 'No order submitted.' };
  }

  if (submitted.length !== correct.length) {
    return { valid: false, reason: 'Incorrect number of items.' };
  }

  const isCorrect = submitted.every((id, idx) => id === correct[idx]);

  return {
    valid:  isCorrect,
    reason: isCorrect ? undefined : 'Order is incorrect.',
    // How many positions are correct - useful for partial UI feedback
    correctPositions: submitted.filter((id, idx) => id === correct[idx]).length,
    totalPositions:   correct.length,
  };
}

// ---------------------------------------------------------------------------
// score
// ---------------------------------------------------------------------------

export function score({ validationResult, submission, difficulty }) {
  if (!validationResult.valid) {
    return { completed: false, correct: false, baseScore: 0, bonusScore: 0, penaltyScore: 0, totalScore: 0 };
  }

  const settings = DIFFICULTY_SETTINGS[difficulty] ?? DIFFICULTY_SETTINGS[Difficulty.MEDIUM];
  const bonusScore = calcTimeBonus(submission.timeTakenSeconds, settings.bonusIdeal, settings.bonusGood, settings.bonusMax);

  return {
    completed:    true,
    correct:      true,
    baseScore:    settings.baseScore,
    bonusScore,
    penaltyScore: 0,
    totalScore:   settings.baseScore + bonusScore,
  };
}

export default { generate, validate, score };