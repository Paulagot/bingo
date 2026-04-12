/**
 * Nonogram / Picross Puzzle Engine
 * server/puzzles/engines/nonogramEngine.js
 *
 * Fill grid cells using row and column clues to reveal a hidden picture.
 * Grid sizes: 5×5 (easy), 10×10 (medium), 15×15 (hard).
 */

import { createSeededRandom, pickRandom, calcTimeBonus } from '../utils/puzzleHelpers.js';
import { PuzzleType, Difficulty } from '../puzzleTypes.js';

// ---------------------------------------------------------------------------
// Curated pixel art patterns per difficulty
// 1 = filled, 0 = empty. Each is the SOLUTION grid.
// ---------------------------------------------------------------------------

const PATTERNS = {
  [Difficulty.EASY]: [
    {
      name: 'Heart',
      grid: [
        [0,1,0,1,0],
        [1,1,1,1,1],
        [1,1,1,1,1],
        [0,1,1,1,0],
        [0,0,1,0,0],
      ],
    },
    {
      name: 'Arrow',
      grid: [
        [0,0,1,0,0],
        [0,1,1,1,0],
        [1,1,1,1,1],
        [0,0,1,0,0],
        [0,0,1,0,0],
      ],
    },
    {
      name: 'Cross',
      grid: [
        [0,0,1,0,0],
        [0,0,1,0,0],
        [1,1,1,1,1],
        [0,0,1,0,0],
        [0,0,1,0,0],
      ],
    },
    {
      name: 'Diamond',
      grid: [
        [0,0,1,0,0],
        [0,1,0,1,0],
        [1,0,0,0,1],
        [0,1,0,1,0],
        [0,0,1,0,0],
      ],
    },
  ],
  [Difficulty.MEDIUM]: [
    {
      name: 'House',
      grid: [
        [0,0,1,1,0,0,0,0,0,0],
        [0,1,1,1,1,0,0,0,0,0],
        [1,1,1,1,1,1,0,0,0,0],
        [1,1,0,0,1,1,0,0,0,0],
        [1,1,0,0,1,1,0,0,0,0],
        [1,1,1,1,1,1,0,0,0,0],
        [0,0,0,0,0,0,0,0,0,0],
        [0,0,0,0,0,0,0,0,0,0],
        [0,0,0,0,0,0,0,0,0,0],
        [0,0,0,0,0,0,0,0,0,0],
      ],
    },
    {
      name: 'Smiley',
      grid: [
        [0,0,1,1,1,1,1,1,0,0],
        [0,1,1,1,1,1,1,1,1,0],
        [1,1,0,1,1,1,1,0,1,1],
        [1,1,0,1,1,1,1,0,1,1],
        [1,1,1,1,1,1,1,1,1,1],
        [1,1,0,1,1,1,1,0,1,1],
        [1,1,1,0,0,0,0,1,1,1],
        [0,1,1,1,1,1,1,1,1,0],
        [0,0,1,1,1,1,1,1,0,0],
        [0,0,0,0,0,0,0,0,0,0],
      ],
    },
    {
      name: 'Tree',
      grid: [
        [0,0,0,0,1,0,0,0,0,0],
        [0,0,0,1,1,1,0,0,0,0],
        [0,0,1,1,1,1,1,0,0,0],
        [0,1,1,1,1,1,1,1,0,0],
        [1,1,1,1,1,1,1,1,1,0],
        [0,0,0,0,1,0,0,0,0,0],
        [0,0,0,0,1,0,0,0,0,0],
        [0,0,0,0,0,0,0,0,0,0],
        [0,0,0,0,0,0,0,0,0,0],
        [0,0,0,0,0,0,0,0,0,0],
      ],
    },
  ],
  [Difficulty.HARD]: [
    {
      name: 'Rocket',
      grid: [
        [0,0,0,0,0,0,0,1,0,0,0,0,0,0,0],
        [0,0,0,0,0,0,1,1,1,0,0,0,0,0,0],
        [0,0,0,0,0,1,1,1,1,1,0,0,0,0,0],
        [0,0,0,0,1,1,1,1,1,1,1,0,0,0,0],
        [0,0,0,1,1,1,1,1,1,1,1,1,0,0,0],
        [0,0,0,1,1,1,0,1,0,1,1,1,0,0,0],
        [0,0,0,1,1,1,1,1,1,1,1,1,0,0,0],
        [0,0,0,1,1,1,1,1,1,1,1,1,0,0,0],
        [0,0,0,1,1,1,1,1,1,1,1,1,0,0,0],
        [0,0,1,1,1,1,1,1,1,1,1,1,1,0,0],
        [0,0,1,1,1,1,1,1,1,1,1,1,1,0,0],
        [0,1,1,1,0,1,1,1,1,1,0,1,1,1,0],
        [0,1,1,0,0,0,1,1,1,0,0,0,1,1,0],
        [0,1,0,0,0,0,1,1,1,0,0,0,0,1,0],
        [0,0,0,0,0,0,1,1,1,0,0,0,0,0,0],
      ],
    },
  ],
};

// ---------------------------------------------------------------------------
// Build row/column clues from a solution grid
// ---------------------------------------------------------------------------

function buildClues(grid) {
  const rows = grid.length;
  const cols = grid[0].length;

  const rowClues = grid.map(row => {
    const clue = [];
    let count  = 0;
    for (const cell of row) {
      if (cell === 1) { count++; }
      else if (count > 0) { clue.push(count); count = 0; }
    }
    if (count > 0) clue.push(count);
    return clue.length > 0 ? clue : [0];
  });

  const colClues = [];
  for (let c = 0; c < cols; c++) {
    const clue = [];
    let count  = 0;
    for (let r = 0; r < rows; r++) {
      if (grid[r][c] === 1) { count++; }
      else if (count > 0) { clue.push(count); count = 0; }
    }
    if (count > 0) clue.push(count);
    colClues.push(clue.length > 0 ? clue : [0]);
  }

  return { rowClues, colClues };
}

// ---------------------------------------------------------------------------
// generate
// ---------------------------------------------------------------------------

export function generate(config) {
  const { difficulty = Difficulty.MEDIUM } = config;
  const seed = config.seed ?? `nonogram-${difficulty}-${Date.now()}-${Math.random().toString(36).slice(2)}`;

  const rng      = createSeededRandom(seed);
  const patterns = PATTERNS[difficulty] ?? PATTERNS[Difficulty.MEDIUM];
  const pattern  = pickRandom(patterns, rng);

  const { rowClues, colClues } = buildClues(pattern.grid);
  const size = pattern.grid.length;

  return {
    puzzleType: PuzzleType.NONOGRAM,
    difficulty,
    seed,
    puzzleData: {
      size,
      rowClues,
      colClues,
      patternName: pattern.name,
    },
    solutionData: {
      solutionGrid: pattern.grid,
    },
    meta: { size, patternName: pattern.name },
  };
}

// ---------------------------------------------------------------------------
// validate
// ---------------------------------------------------------------------------

export function validate(playerAnswer, solutionData) {
  const submitted = playerAnswer?.grid;
  const solution  = solutionData.solutionGrid;
  const size      = solution.length;

  if (!submitted || !Array.isArray(submitted) || submitted.length !== size) {
    return { valid: false, reason: 'Invalid grid submitted.' };
  }

  for (let r = 0; r < size; r++) {
    const row = submitted[r];
    if (!Array.isArray(row) || row.length !== solution[r].length) {
      return { valid: false, reason: `Row ${r} is invalid.` };
    }
    for (let c = 0; c < row.length; c++) {
      if (row[c] !== solution[r][c]) {
        return { valid: false, reason: 'One or more cells are incorrect.' };
      }
    }
  }

  return { valid: true };
}

// ---------------------------------------------------------------------------
// score
// ---------------------------------------------------------------------------

export function score({ validationResult, submission }) {
  if (!validationResult.valid) return { completed: false, correct: false, baseScore: 0, bonusScore: 0, penaltyScore: 0, totalScore: 0 };
  const bonusScore = calcTimeBonus(submission.timeTakenSeconds, 25, 120, 900);
  return { completed: true, correct: true, baseScore: 90, bonusScore, penaltyScore: 0, totalScore: 90 + bonusScore };
}

export default { generate, validate, score };