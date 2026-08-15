/**
 * Nonogram / Picross Puzzle Engine
 * server/puzzles/engines/nonogramEngine.js
 *
 * Fill grid cells using row and column clues to reveal a hidden picture.
 * Grid sizes: 7×7 (easy), 10×10 (medium), 15×15 (hard).
 *
 * Patterns are authored as ASCII art ('#' = filled, '.' = empty) for
 * readability, then parsed into 0/1 grids at module load.
 */

import { createSeededRandom, pickRandom, calcTimeBonus } from '../utils/puzzleHelpers.js';
import { PuzzleType, Difficulty } from '../puzzleTypes.js';

// ---------------------------------------------------------------------------
// ASCII art -> grid helper
// ---------------------------------------------------------------------------

function art(name, text) {
  const grid = text
    .trim()
    .split('\n')
    .map(line => line.trim().split('').map(ch => (ch === '#' ? 1 : 0)));

  const size = grid.length;
  for (const row of grid) {
    if (row.length !== size) {
      throw new Error(`Nonogram pattern "${name}" is not square (expected ${size} cols, got ${row.length}).`);
    }
  }
  return { name, grid };
}

// ---------------------------------------------------------------------------
// Curated pixel art patterns per difficulty
// ---------------------------------------------------------------------------

const PATTERNS = {
  [Difficulty.EASY]: [
    art('Heart', `
      .##.##.
      #######
      #######
      #######
      .#####.
      ..###..
      ...#...
    `),
    art('Star', `
      ...#...
      ...#...
      #######
      .#####.
      .##.##.
      .#...#.
      #.....#
    `),
    art('Boat', `
      ...#...
      ...##..
      ...###.
      ...####
      ...#...
      .#####.
      #######
    `),
    art('Cat', `
      #.....#
      ##...##
      #######
      #.#.#.#
      ###.###
      #######
      .#####.
    `),
    art('Umbrella', `
      ..###..
      .#####.
      #######
      ...#...
      ...#...
      ...#...
      ...##..
    `),
  ],
  [Difficulty.MEDIUM]: [
    art('House', `
      ....##....
      ...####...
      ..######..
      .########.
      ##########
      #..####..#
      #..####..#
      ####..####
      ####..####
      ##########
    `),
    art('Smiley', `
      ..######..
      .########.
      ##.####.##
      ##.####.##
      ##########
      ##.####.##
      ###....###
      .########.
      ..######..
      ..........
    `),
    art('Tree', `
      ....##....
      ...####...
      ..######..
      .########.
      ##########
      ..######..
      ....##....
      ....##....
      ....##....
      ....##....
    `),
    art('Fish', `
      ..........
      .######...
      #######...
      #.######..
      #########.
      ##########
      #########.
      .#######..
      ..####....
      ..........
    `),
    art('Butterfly', `
      ...#..#...
      ..######..
      .########.
      ##########
      ...####...
      ...####...
      .########.
      ##########
      ..######..
      ....##....
    `),
  ],
  [Difficulty.HARD]: [
    art('Rocket', `
      .......#.......
      ......###......
      .....#####.....
      ....#######....
      ...#########...
      ...###.#.###...
      ...#########...
      ...#########...
      ...#########...
      ..###########..
      ..###########..
      .###.#####.###.
      .##...###...##.
      .#....###....#.
      ......###......
    `),
    art('Whale', `
      ..#............
      .###...........
      .########......
      ##########.....
      ############...
      ##.##########..
      ##############.
      ###############
      ############...
      ###############
      ##############.
      #############..
      .###########...
      ..#######......
      ....###........
    `),
    art('Anchor', `
      ......###......
      .....#...#.....
      .....#...#.....
      .....#####.....
      .......#.......
      ....#######....
      .......#.......
      .......#.......
      .......#.......
      .......#.......
      .......#.......
      .....#####.....
      ...###.#.###...
      .###.......###.
      .##.........##.
    `),
  ],
};

// Base score and time-bonus window scale with grid size / difficulty.
const DIFFICULTY_SETTINGS = {
  [Difficulty.EASY]:   { baseScore: 60,  bonusIdeal: 15, bonusGood: 45,  bonusMax: 300 },
  [Difficulty.MEDIUM]: { baseScore: 90,  bonusIdeal: 25, bonusGood: 120, bonusMax: 900 },
  [Difficulty.HARD]:   { baseScore: 150, bonusIdeal: 40, bonusGood: 240, bonusMax: 1800 },
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

function cluesEqual(a, b) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i].length !== b[i].length) return false;
    for (let j = 0; j < a[i].length; j++) {
      if (a[i][j] !== b[i][j]) return false;
    }
  }
  return true;
}

// Any non-1 value (0, 2 for "marked empty", undefined, etc.) counts as empty.
function normalizeGrid(rawGrid, size) {
  return rawGrid.map(row => Array.from({ length: size }, (_, c) => (row[c] === 1 ? 1 : 0)));
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
      rowClues,
      colClues,
      size,
    },
    meta: { size, patternName: pattern.name },
  };
}

// ---------------------------------------------------------------------------
// validate
// ---------------------------------------------------------------------------

export function validate(playerAnswer, solutionData) {
  const submitted = playerAnswer?.grid;
  const { size, rowClues, colClues } = solutionData;

  if (!submitted || !Array.isArray(submitted) || submitted.length !== size) {
    return { valid: false, reason: 'Invalid grid submitted.' };
  }
  for (let r = 0; r < size; r++) {
    if (!Array.isArray(submitted[r]) || submitted[r].length !== size) {
      return { valid: false, reason: `Row ${r} is invalid.` };
    }
  }

  const normalized = normalizeGrid(submitted, size);
  const submittedClues = buildClues(normalized);

  // Accept any grid whose clues match - not just the one canonical solution -
  // since a hand-authored picture can have more than one valid fill.
  if (!cluesEqual(submittedClues.rowClues, rowClues) || !cluesEqual(submittedClues.colClues, colClues)) {
    return { valid: false, reason: 'Grid does not match the clues yet.' };
  }

  return { valid: true };
}

// ---------------------------------------------------------------------------
// score
// ---------------------------------------------------------------------------

export function score({ validationResult, submission, difficulty }) {
  if (!validationResult.valid) return { completed: false, correct: false, baseScore: 0, bonusScore: 0, penaltyScore: 0, totalScore: 0 };

  const settings = DIFFICULTY_SETTINGS[difficulty] ?? DIFFICULTY_SETTINGS[Difficulty.MEDIUM];
  const bonusScore = calcTimeBonus(submission.timeTakenSeconds, settings.bonusIdeal, settings.bonusGood, settings.bonusMax);

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