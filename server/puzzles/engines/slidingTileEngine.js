/**
 * Sliding Tile Puzzle Engine
 * server/puzzles/engines/slidingTileEngine.js
 *
 * Classic 15-puzzle: 4×4 grid, tiles 1–15, one empty space (0).
 * Scrambled by applying N valid random moves from the solved state —
 * this guarantees the puzzle is always solvable.
 */

import { createSeededRandom, calcTimeBonus } from '../utils/puzzleHelpers.js';
import { PuzzleType, Difficulty } from '../puzzleTypes.js';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SIZE = 4; // 4×4 grid

const SCRAMBLE_MOVES = {
  [Difficulty.EASY]:   20,
  [Difficulty.MEDIUM]: 50,
  [Difficulty.HARD]:   100,
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Build the solved grid: tiles 1–15 left-to-right, top-to-bottom, 0 at end.
 * Returns a flat array of 16 numbers for easy manipulation.
 */
function buildSolvedFlat() {
  return [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 0];
}

/** Convert flat array to 4×4 2D grid */
function flatToGrid(flat) {
  const grid = [];
  for (let r = 0; r < SIZE; r++) {
    grid.push(flat.slice(r * SIZE, r * SIZE + SIZE));
  }
  return grid;
}

/** Convert 4×4 2D grid to flat array */
function gridToFlat(grid) {
  return grid.flat();
}

/** Find the index of the empty tile (0) in a flat array */
function findEmpty(flat) {
  return flat.indexOf(0);
}

/**
 * Return valid neighbour indices for the empty space.
 * A neighbour is any tile directly above/below/left/right.
 */
function getNeighbours(emptyIdx) {
  const row = Math.floor(emptyIdx / SIZE);
  const col = emptyIdx % SIZE;
  const neighbours = [];

  if (row > 0)          neighbours.push(emptyIdx - SIZE); // above
  if (row < SIZE - 1)   neighbours.push(emptyIdx + SIZE); // below
  if (col > 0)          neighbours.push(emptyIdx - 1);    // left
  if (col < SIZE - 1)   neighbours.push(emptyIdx + 1);    // right

  return neighbours;
}

/**
 * Apply one move: swap the empty space with the tile at `tileIdx`.
 * Returns a new flat array (does not mutate input).
 */
function applyMove(flat, tileIdx) {
  const next = [...flat];
  const emptyIdx = findEmpty(next);
  [next[emptyIdx], next[tileIdx]] = [next[tileIdx], next[emptyIdx]];
  return next;
}

/**
 * Scramble the solved state by applying N valid random moves.
 * We track the last move to avoid immediately undoing it (makes scrambles better).
 */
function scramble(flat, moves, rng) {
  let current     = [...flat];
  let lastMoved   = -1; // tile index that was last swapped into empty

  for (let i = 0; i < moves; i++) {
    const emptyIdx   = findEmpty(current);
    const neighbours = getNeighbours(emptyIdx);

    // Exclude the tile we just moved to avoid trivial back-and-forth
    const candidates = neighbours.filter(n => n !== lastMoved);
    const pick       = candidates.length > 0 ? candidates : neighbours;

    const chosen = pick[Math.floor(rng() * pick.length)];
    lastMoved    = emptyIdx; // the empty space moves to where chosen was
    current      = applyMove(current, chosen);
  }

  return current;
}

/**
 * Compare two flat grids for equality.
 */
function gridsEqual(a, b) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

// ---------------------------------------------------------------------------
// generate
// ---------------------------------------------------------------------------

/**
 * @param {{ difficulty: string, seed?: string }} config
 * @returns {GeneratedPuzzleInstance}
 */
export function generate(config) {
  const { difficulty = Difficulty.MEDIUM } = config;
  const seed = config.seed
    ?? `slidingTile-${difficulty}-${Date.now()}-${Math.random().toString(36).slice(2)}`;

  const rng        = createSeededRandom(seed);
  const moves      = SCRAMBLE_MOVES[difficulty] ?? SCRAMBLE_MOVES[Difficulty.MEDIUM];
  const solvedFlat = buildSolvedFlat();
  const solvedGrid = flatToGrid(solvedFlat);

  // Scramble — ensure the result isn't accidentally already solved
  let scrambledFlat = scramble(solvedFlat, moves, rng);
  if (gridsEqual(scrambledFlat, solvedFlat)) {
    // Apply one extra valid move to guarantee it's not solved
    const emptyIdx   = findEmpty(scrambledFlat);
    const neighbours = getNeighbours(emptyIdx);
    scrambledFlat    = applyMove(scrambledFlat, neighbours[0]);
  }

  return {
    puzzleType:   PuzzleType.SLIDING_TILE,
    difficulty,
    seed,
    puzzleData: {
      grid:  flatToGrid(scrambledFlat),
      size:  SIZE,
      moves, // how many scramble moves were applied (informational)
    },
    solutionData: {
      solvedGrid,
    },
    meta: {
      size:         SIZE,
      scrambleMoves: moves,
    },
  };
}

// ---------------------------------------------------------------------------
// validate
// ---------------------------------------------------------------------------

/**
 * @param {{ grid: number[][] }} playerAnswer
 * @param {{ solvedGrid: number[][] }} solutionData
 * @returns {{ valid: boolean, reason?: string }}
 */
export function validate(playerAnswer, solutionData) {
  const submitted = playerAnswer?.grid;
  const solution  = solutionData?.solvedGrid;

  if (!submitted || !Array.isArray(submitted)) {
    return { valid: false, reason: 'No grid submitted.' };
  }

  if (submitted.length !== SIZE) {
    return { valid: false, reason: `Grid must have ${SIZE} rows.` };
  }

  for (let r = 0; r < SIZE; r++) {
    if (!Array.isArray(submitted[r]) || submitted[r].length !== SIZE) {
      return { valid: false, reason: `Row ${r} is invalid.` };
    }
  }

  const submittedFlat = gridToFlat(submitted);
  const solutionFlat  = gridToFlat(solution);

  if (!gridsEqual(submittedFlat, solutionFlat)) {
    return { valid: false, reason: 'Grid does not match the solved state.' };
  }

  return { valid: true };
}

// ---------------------------------------------------------------------------
// score
// ---------------------------------------------------------------------------

/**
 * @param {{ validationResult: object, submission: { timeTakenSeconds: number } }} args
 * @returns {PuzzleScoreResult}
 */
export function score({ validationResult, submission }) {
  if (!validationResult.valid) {
    return {
      completed:    false,
      correct:      false,
      baseScore:    0,
      bonusScore:   0,
      penaltyScore: 0,
      totalScore:   0,
    };
  }

  // Time bonus: full 30 pts within 60s, decays to 0 at 300s
  const bonusScore = calcTimeBonus(submission.timeTakenSeconds, 30, 60, 300);

  return {
    completed:    true,
    correct:      true,
    baseScore:    100,
    bonusScore,
    penaltyScore: 0,
    totalScore:   100 + bonusScore,
  };
}

export default { generate, validate, score };