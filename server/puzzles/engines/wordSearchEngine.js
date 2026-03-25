/**
 * Word Search Puzzle Engine
 * server/puzzles/engines/wordSearchEngine.js
 *
 * Objective: Find all target words hidden in a letter grid.
 * Supports horizontal, vertical, and diagonal — forwards and backwards.
 */

import { createSeededRandom, shuffleArray, calcTimeBonus } from '../utils/puzzleHelpers.js';
import { PuzzleType, Difficulty } from '../puzzleTypes.js';

// ---------------------------------------------------------------------------
// Word lists by difficulty
// ---------------------------------------------------------------------------

const WORD_LISTS = {
  [Difficulty.EASY]: [
    ['CAT', 'DOG', 'BEE', 'ANT', 'OWL', 'COW'],
    ['RED', 'BLUE', 'SUN', 'SKY', 'STAR', 'MOON'],
    ['BALL', 'JUMP', 'PLAY', 'RUN', 'SWIM', 'SKIP'],
  ],
  [Difficulty.MEDIUM]: [
    ['OCEAN', 'RIVER', 'CLOUD', 'STORM', 'FROST', 'FLAME'],
    ['TIGER', 'EAGLE', 'SHARK', 'COBRA', 'BISON', 'RHINO'],
    ['PIZZA', 'BREAD', 'CREAM', 'HONEY', 'GRAPE', 'LEMON'],
  ],
  [Difficulty.HARD]: [
    ['JUNGLE', 'FROZEN', 'BRONZE', 'SILVER', 'CASTLE', 'BRIDGE', 'PLANET'],
    ['CAPTAIN', 'LANTERN', 'GRAVITY', 'SILENCE', 'VOLCANO', 'PYRAMID'],
  ],
};

const GRID_SIZES = {
  [Difficulty.EASY]:   10,
  [Difficulty.MEDIUM]: 12,
  [Difficulty.HARD]:   15,
};

const DIRECTIONS = [
  [0, 1],   // right
  [0, -1],  // left
  [1, 0],   // down
  [-1, 0],  // up
  [1, 1],   // down-right
  [1, -1],  // down-left
  [-1, 1],  // up-right
  [-1, -1], // up-left
];

// ---------------------------------------------------------------------------
// Grid generation helpers
// ---------------------------------------------------------------------------

function createEmptyGrid(size) {
  return Array.from({ length: size }, () => Array(size).fill(''));
}

function canPlace(grid, word, row, col, dr, dc) {
  const size = grid.length;
  for (let i = 0; i < word.length; i++) {
    const r = row + dr * i;
    const c = col + dc * i;
    if (r < 0 || r >= size || c < 0 || c >= size) return false;
    if (grid[r][c] !== '' && grid[r][c] !== word[i])  return false;
  }
  return true;
}

function placeWord(grid, word, row, col, dr, dc) {
  for (let i = 0; i < word.length; i++) {
    grid[row + dr * i][col + dc * i] = word[i];
  }
  return { word, start: [row, col], end: [row + dr * (word.length - 1), col + dc * (word.length - 1)] };
}

function fillBlanks(grid, rng) {
  const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  for (let r = 0; r < grid.length; r++) {
    for (let c = 0; c < grid[r].length; c++) {
      if (grid[r][c] === '') {
        grid[r][c] = LETTERS[Math.floor(rng() * LETTERS.length)];
      }
    }
  }
}

// ---------------------------------------------------------------------------
// generate
// ---------------------------------------------------------------------------

export function generate(config) {
  const { difficulty = Difficulty.MEDIUM } = config;
  const seed = config.seed ?? `${difficulty}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const rng      = createSeededRandom(seed);
  const lists    = WORD_LISTS[difficulty] ?? WORD_LISTS[Difficulty.MEDIUM];
  const wordList = lists[Math.floor(rng() * lists.length)];
  const size     = GRID_SIZES[difficulty] ?? 12;

  const grid      = createEmptyGrid(size);
  const placed    = [];
  const failed    = [];

  // Use easy/hard direction sets based on difficulty
  const allowedDirections = difficulty === Difficulty.EASY
    ? DIRECTIONS.slice(0, 4)   // only H + V
    : DIRECTIONS;              // all 8

  for (const word of wordList) {
    let placed_this = false;

    // Try up to 200 random positions per word
    for (let attempt = 0; attempt < 200 && !placed_this; attempt++) {
      const [dr, dc] = allowedDirections[Math.floor(rng() * allowedDirections.length)];
      const row      = Math.floor(rng() * size);
      const col      = Math.floor(rng() * size);

      if (canPlace(grid, word, row, col, dr, dc)) {
        const result = placeWord(grid, word, row, col, dr, dc);
        placed.push(result);
        placed_this = true;
      }
    }

    if (!placed_this) failed.push(word);
  }

  fillBlanks(grid, rng);

  const finalWordList = placed.map(p => p.word);
  const words         = placed.map(p => ({ word: p.word, start: p.start, end: p.end }));

  return {
    puzzleType: PuzzleType.WORD_SEARCH,
    difficulty,
    seed,
    puzzleData: {
      grid,
      wordList: shuffleArray(finalWordList, rng), // shuffled so order doesn't hint at location
    },
    solutionData: {
      words,
    },
    meta: {
      gridSize:    size,
      wordCount:   finalWordList.length,
      failedWords: failed, // for debug — remove in prod if desired
    },
  };
}

// ---------------------------------------------------------------------------
// validate
// ---------------------------------------------------------------------------

export function validate(input, solution) {
  const submitted    = input.foundWords;
  const correctWords = solution.words.map(w => w.word);

  if (!Array.isArray(submitted) || submitted.length === 0) {
    return { valid: false, reason: 'No words submitted.' };
  }

  const normalised    = submitted.map(w => w.toUpperCase().trim());
  const missingWords  = correctWords.filter(w => !normalised.includes(w));
  const allFound      = missingWords.length === 0;

  return {
    valid:       allFound,
    reason:      allFound ? undefined : `Missing: ${missingWords.join(', ')}`,
    foundCount:  correctWords.filter(w => normalised.includes(w)).length,
    totalCount:  correctWords.length,
    missingWords,
  };
}

// ---------------------------------------------------------------------------
// score
// ---------------------------------------------------------------------------

export function score({ validationResult, submission }) {
  if (!validationResult.valid) {
    // Partial scoring allowed — award points per word found
    const partial = validationResult.foundCount ?? 0;
    const total   = validationResult.totalCount  ?? 1;
    const baseScore = Math.round((partial / total) * 80);
    return {
      completed:    false,
      correct:      false,
      baseScore,
      bonusScore:   0,
      penaltyScore: 0,
      totalScore:   baseScore,
      mistakes:     total - partial,
    };
  }

  const bonusScore = calcTimeBonus(submission.timeTakenSeconds, 20, 60, 300);

  return {
    completed:    true,
    correct:      true,
    baseScore:    80,
    bonusScore,
    penaltyScore: 0,
    totalScore:   80 + bonusScore,
  };
}

export default { generate, validate, score };