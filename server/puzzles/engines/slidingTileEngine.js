/**
 * Sliding Tile Puzzle Engine
 * server/puzzles/engines/slidingTileEngine.js
 *
 * Image-based sliding puzzle.
 *
 * The backend does NOT physically cut the image into tiles.
 * It sends one square image URL plus the shuffled grid.
 * The frontend uses CSS background-position to show the correct image slice
 * on each numbered tile.
 *
 * Scrambled by applying valid random moves from the solved state.
 * This guarantees the puzzle is always solvable.
 */

import { createSeededRandom, calcTimeBonus } from '../utils/puzzleHelpers.js';
import { PuzzleType, Difficulty } from '../puzzleTypes.js';

// ---------------------------------------------------------------------------
// Difficulty config
// ---------------------------------------------------------------------------

const SIZE_BY_DIFFICULTY = {
  [Difficulty.EASY]: 3,
  [Difficulty.MEDIUM]: 4,
  [Difficulty.HARD]: 4,
};

const SCRAMBLE_MOVES = {
  [Difficulty.EASY]: 14,
  [Difficulty.MEDIUM]: 40,
  [Difficulty.HARD]: 75,
};

// These files should exist in:
// public/images/puzzles/sliding/
//
// Example:
// public/images/puzzles/sliding/castle.webp
//
// In the frontend they are referenced as:
// /images/puzzles/sliding/castle.webp

const IMAGE_BANK = {
  [Difficulty.EASY]: [
    {
      title: 'Rebuild the balloons',
      imageUrl: '/images/puzzles/sliding/balloons.webp',
    },
    {
      title: 'Rebuild the ice cream van',
      imageUrl: '/images/puzzles/sliding/ice-cream-van.webp',
    },
    {
      title: 'Rebuild the puppy picture',
      imageUrl: '/images/puzzles/sliding/puppy.webp',
    },
  ],

  [Difficulty.MEDIUM]: [
    {
      title: 'Rebuild the treasure map',
      imageUrl: '/images/puzzles/sliding/treasure-map.webp',
    },
    {
      title: 'Rebuild the football pitch',
      imageUrl: '/images/puzzles/sliding/football-pitch.webp',
    },
    {
      title: 'Rebuild the castle',
      imageUrl: '/images/puzzles/sliding/castle.webp',
    },
  ],

  [Difficulty.HARD]: [
    {
      title: 'Rebuild the jungle path',
      imageUrl: '/images/puzzles/sliding/jungle-path.webp',
    },
    {
      title: 'Rebuild the space scene',
      imageUrl: '/images/puzzles/sliding/space-scene.webp',
    },
    {
      title: 'Rebuild the city skyline',
      imageUrl: '/images/puzzles/sliding/city-skyline.webp',
    },
  ],
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildSolvedFlat(size) {
  const solved = Array.from({ length: size * size - 1 }, (_, index) => index + 1);
  solved.push(0);
  return solved;
}

function flatToGrid(flat, size) {
  const grid = [];

  for (let r = 0; r < size; r++) {
    grid.push(flat.slice(r * size, r * size + size));
  }

  return grid;
}

function gridToFlat(grid) {
  return grid.flat();
}

function findEmpty(flat) {
  return flat.indexOf(0);
}

function getNeighbours(emptyIdx, size) {
  const row = Math.floor(emptyIdx / size);
  const col = emptyIdx % size;
  const neighbours = [];

  if (row > 0) neighbours.push(emptyIdx - size);
  if (row < size - 1) neighbours.push(emptyIdx + size);
  if (col > 0) neighbours.push(emptyIdx - 1);
  if (col < size - 1) neighbours.push(emptyIdx + 1);

  return neighbours;
}

function applyMove(flat, tileIdx) {
  const next = [...flat];
  const emptyIdx = findEmpty(next);

  if (emptyIdx < 0 || tileIdx < 0 || tileIdx >= next.length) {
    return next;
  }

  const emptyValue = next[emptyIdx];
  const tileValue = next[tileIdx];

  next[emptyIdx] = tileValue;
  next[tileIdx] = emptyValue;

  return next;
}

function scramble(flat, moves, rng, size) {
  let current = [...flat];
  let lastEmptyIdx = -1;

  for (let i = 0; i < moves; i++) {
    const emptyIdx = findEmpty(current);
    const neighbours = getNeighbours(emptyIdx, size);

    // Avoid immediately undoing the previous move where possible.
    const candidates = neighbours.filter(index => index !== lastEmptyIdx);
    const pick = candidates.length > 0 ? candidates : neighbours;

    const chosen = pick[Math.floor(rng() * pick.length)];

    lastEmptyIdx = emptyIdx;
    current = applyMove(current, chosen);
  }

  return current;
}

function gridsEqual(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b)) return false;
  if (a.length !== b.length) return false;

  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }

  return true;
}

function pickImage(difficulty, rng) {
  const bank = IMAGE_BANK[difficulty] ?? IMAGE_BANK[Difficulty.MEDIUM];
  return bank[Math.floor(rng() * bank.length)];
}

// ---------------------------------------------------------------------------
// generate
// ---------------------------------------------------------------------------

export function generate(config) {
  const { difficulty = Difficulty.MEDIUM } = config;

  const seed = config.seed
    ?? `slidingTile-${difficulty}-${Date.now()}-${Math.random().toString(36).slice(2)}`;

  const rng = createSeededRandom(seed);

  const size = SIZE_BY_DIFFICULTY[difficulty] ?? SIZE_BY_DIFFICULTY[Difficulty.MEDIUM];
  const moves = SCRAMBLE_MOVES[difficulty] ?? SCRAMBLE_MOVES[Difficulty.MEDIUM];
  const image = pickImage(difficulty, rng);

  const solvedFlat = buildSolvedFlat(size);
  const solvedGrid = flatToGrid(solvedFlat, size);

  let scrambledFlat = scramble(solvedFlat, moves, rng, size);

  // Very unlikely, but do not let it start solved.
  if (gridsEqual(scrambledFlat, solvedFlat)) {
    const emptyIdx = findEmpty(scrambledFlat);
    const neighbours = getNeighbours(emptyIdx, size);
    scrambledFlat = applyMove(scrambledFlat, neighbours[0]);
  }

  return {
    puzzleType: PuzzleType.SLIDING_TILE,
    difficulty,
    seed,

    puzzleData: {
      title: image.title,
      mode: 'image',
      grid: flatToGrid(scrambledFlat, size),
      size,
      imageUrl: image.imageUrl,
      moves,
    },

    solutionData: {
      solvedGrid,
      size,
    },

    meta: {
      mode: 'image',
      size,
      scrambleMoves: moves,
      imageUrl: image.imageUrl,
    },
  };
}

// ---------------------------------------------------------------------------
// validate
// ---------------------------------------------------------------------------

export function validate(playerAnswer, solutionData) {
  const submitted = playerAnswer?.grid;
  const solution = solutionData?.solvedGrid;
  const size = solutionData?.size ?? solution?.length;

  if (!submitted || !Array.isArray(submitted)) {
    return { valid: false, reason: 'No grid submitted.' };
  }

  if (!solution || !Array.isArray(solution)) {
    return { valid: false, reason: 'No solution grid found.' };
  }

  if (!size || submitted.length !== size) {
    return { valid: false, reason: `Grid must have ${size} rows.` };
  }

  for (let r = 0; r < size; r++) {
    if (!Array.isArray(submitted[r]) || submitted[r].length !== size) {
      return { valid: false, reason: `Row ${r} is invalid.` };
    }
  }

  const submittedFlat = gridToFlat(submitted);
  const solutionFlat = gridToFlat(solution);

  if (!gridsEqual(submittedFlat, solutionFlat)) {
    return { valid: false, reason: 'Grid does not match the solved state.' };
  }

  return { valid: true };
}

// ---------------------------------------------------------------------------
// score
// ---------------------------------------------------------------------------

export function score({ validationResult, submission }) {
  if (!validationResult.valid) {
    return {
      completed: false,
      correct: false,
      baseScore: 0,
      bonusScore: 0,
      penaltyScore: 0,
      totalScore: 0,
    };
  }

  const bonusScore = calcTimeBonus(submission.timeTakenSeconds, 30, 60, 300);

  return {
    completed: true,
    correct: true,
    baseScore: 100,
    bonusScore,
    penaltyScore: 0,
    totalScore: 100 + bonusScore,
  };
}

export default { generate, validate, score };