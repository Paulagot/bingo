/**
 * Number Path Puzzle Engine
 * server/puzzles/engines/numberPathEngine.js
 *
 * Connect matching number pairs on a grid by drawing non-crossing paths.
 * Grid sizes: 4×4 (easy), 6×6 (medium), 8×8 (hard).
 * Each path must pass through every cell (full coverage).
 */

import { createSeededRandom, shuffleArray, calcTimeBonus } from '../utils/puzzleHelpers.js';
import { PuzzleType, Difficulty } from '../puzzleTypes.js';

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const GRID_SIZES = {
  [Difficulty.EASY]:   4,
  [Difficulty.MEDIUM]: 6,
  [Difficulty.HARD]:   8,
};

const PAIR_COUNTS = {
  [Difficulty.EASY]:   3,
  [Difficulty.MEDIUM]: 5,
  [Difficulty.HARD]:   8,
};

// ---------------------------------------------------------------------------
// Pre-built puzzle layouts
// We use hand-crafted layouts for reliability — generative solvers for
// full-coverage Number Path are complex; curated sets ensure quality.
// Format: { size, pairs: [{id, cells: [[r,c],...]}] }
// pairs[i].cells[0] and pairs[i].cells[-1] are the endpoints shown to player.
// ---------------------------------------------------------------------------

const LAYOUTS = {
  [Difficulty.EASY]: [
    {
      size: 4,
      pairs: [
        { id: 1, cells: [[0,0],[0,1],[0,2],[0,3]] },
        { id: 2, cells: [[1,0],[1,1],[1,2],[1,3]] },
        { id: 3, cells: [[2,0],[2,1],[2,2],[2,3],[3,3],[3,2],[3,1],[3,0]] },
      ],
    },
    {
      size: 4,
      pairs: [
        { id: 1, cells: [[0,0],[1,0],[2,0],[3,0],[3,1]] },
        { id: 2, cells: [[0,1],[0,2],[0,3],[1,3],[2,3],[3,3],[3,2]] },
        { id: 3, cells: [[1,1],[1,2],[2,2],[2,1]] },
      ],
    },
    {
      size: 4,
      pairs: [
        { id: 1, cells: [[0,0],[0,1],[1,1],[1,0],[2,0],[3,0]] },
        { id: 2, cells: [[0,2],[0,3],[1,3],[1,2],[2,2],[2,3],[3,3],[3,2]] },
        { id: 3, cells: [[2,1],[3,1]] },
      ],
    },
  ],
  [Difficulty.MEDIUM]: [
    {
      size: 6,
      pairs: [
        { id: 1, cells: [[0,0],[0,1],[0,2],[1,2],[1,1],[1,0],[2,0],[3,0]] },
        { id: 2, cells: [[0,3],[0,4],[0,5],[1,5],[1,4],[1,3],[2,3],[2,4],[2,5],[3,5]] },
        { id: 3, cells: [[2,1],[2,2],[3,2],[3,1]] },
        { id: 4, cells: [[3,3],[3,4],[4,4],[4,3],[5,3],[5,4],[5,5],[4,5]] },
        { id: 5, cells: [[4,0],[4,1],[4,2],[5,2],[5,1],[5,0],[3,0]] },
      ],
    },
    {
      size: 6,
      pairs: [
        { id: 1, cells: [[0,0],[1,0],[2,0],[2,1],[1,1],[0,1]] },
        { id: 2, cells: [[0,2],[0,3],[0,4],[0,5],[1,5],[1,4],[1,3],[1,2]] },
        { id: 3, cells: [[2,2],[2,3],[3,3],[3,2],[4,2],[4,3]] },
        { id: 4, cells: [[2,4],[2,5],[3,5],[3,4],[4,4],[4,5],[5,5],[5,4]] },
        { id: 5, cells: [[3,0],[3,1],[4,1],[4,0],[5,0],[5,1],[5,2],[5,3]] },
      ],
    },
  ],
  [Difficulty.HARD]: [
    {
      size: 8,
      pairs: [
        { id: 1, cells: [[0,0],[0,1],[0,2],[1,2],[1,1],[1,0],[2,0],[2,1],[2,2],[3,2],[3,1],[3,0]] },
        { id: 2, cells: [[0,3],[0,4],[0,5],[0,6],[0,7],[1,7],[1,6],[1,5],[1,4],[1,3],[2,3],[2,4]] },
        { id: 3, cells: [[2,5],[2,6],[2,7],[3,7],[3,6],[3,5],[4,5],[4,6],[4,7]] },
        { id: 4, cells: [[3,3],[3,4],[4,4],[4,3],[5,3],[5,4],[5,5],[4,5]] },
        { id: 5, cells: [[4,0],[4,1],[4,2],[5,2],[5,1],[5,0],[6,0],[6,1]] },
        { id: 6, cells: [[5,6],[5,7],[6,7],[6,6],[7,6],[7,7]] },
        { id: 7, cells: [[6,2],[6,3],[6,4],[6,5],[7,5],[7,4],[7,3],[7,2]] },
        { id: 8, cells: [[7,0],[7,1]] },
      ],
    },
  ],
};

// ---------------------------------------------------------------------------
// generate
// ---------------------------------------------------------------------------

export function generate(config) {
  const { difficulty = Difficulty.MEDIUM } = config;
  const seed = config.seed ?? `numberPath-${difficulty}-${Date.now()}-${Math.random().toString(36).slice(2)}`;

  const rng     = createSeededRandom(seed);
  const layouts = LAYOUTS[difficulty] ?? LAYOUTS[Difficulty.MEDIUM];
  const layout  = layouts[Math.floor(rng() * layouts.length)];
  const size    = layout.size;

  // Build endpoint cells for puzzleData — only start/end of each path shown
  const endpoints = layout.pairs.map(p => ({
    id:    p.id,
    start: p.cells[0],
    end:   p.cells[p.cells.length - 1],
  }));

  // Build solved grid for solutionData — each cell tagged with its path id
  const solvedGrid = Array.from({ length: size }, () => new Array(size).fill(0));
  for (const p of layout.pairs) {
    for (const [r, c] of p.cells) {
      solvedGrid[r][c] = p.id;
    }
  }

  return {
    puzzleType: PuzzleType.NUMBER_PATH,
    difficulty,
    seed,
    puzzleData: {
      size,
      endpoints,   // [{id, start:[r,c], end:[r,c]}]
    },
    solutionData: {
      solvedGrid,  // 2D grid where each cell = path id
      paths: layout.pairs.map(p => ({ id: p.id, cells: p.cells })),
    },
    meta: { size, pairCount: layout.pairs.length },
  };
}

// ---------------------------------------------------------------------------
// validate
// ---------------------------------------------------------------------------

/**
 * Player submits: { paths: [{id, cells:[[r,c],...]}] }
 * We check:
 *   1. Every submitted path starts/ends at the correct endpoints
 *   2. Each step is adjacent (no diagonal)
 *   3. No two paths share a cell
 *   4. All grid cells are covered
 */
export function validate(playerAnswer, solutionData) {
  const submitted = playerAnswer?.paths;
  if (!submitted || !Array.isArray(submitted)) {
    return { valid: false, reason: 'No paths submitted.' };
  }

  const solvedGrid = solutionData.solvedGrid;
  const size       = solvedGrid.length;
  const solution   = solutionData.paths;

  // Build endpoint lookup
  const endpointMap = {};
  for (const p of solution) {
    endpointMap[p.id] = {
      start: p.cells[0],
      end:   p.cells[p.cells.length - 1],
    };
  }

  const usedCells = new Set();

  for (const path of submitted) {
    const { id, cells } = path;
    if (!cells || cells.length < 2) return { valid: false, reason: `Path ${id} is too short.` };

    const ep = endpointMap[id];
    if (!ep) return { valid: false, reason: `Unknown path id ${id}.` };

    const first = cells[0];
    const last  = cells[cells.length - 1];
    const matchesForward  = first[0] === ep.start[0] && first[1] === ep.start[1] && last[0] === ep.end[0] && last[1] === ep.end[1];
    const matchesBackward = first[0] === ep.end[0]   && first[1] === ep.end[1]   && last[0] === ep.start[0] && last[1] === ep.start[1];

    if (!matchesForward && !matchesBackward) {
      return { valid: false, reason: `Path ${id} does not connect the correct endpoints.` };
    }

    for (let i = 0; i < cells.length; i++) {
      const [r, c] = cells[i];
      if (r < 0 || r >= size || c < 0 || c >= size) return { valid: false, reason: `Path ${id} goes out of bounds.` };

      const key = `${r},${c}`;
      if (usedCells.has(key)) return { valid: false, reason: `Cell (${r},${c}) is used by more than one path.` };
      usedCells.add(key);

      if (i > 0) {
        const [pr, pc] = cells[i - 1];
        const dr = Math.abs(r - pr);
        const dc = Math.abs(c - pc);
        if (dr + dc !== 1) return { valid: false, reason: `Path ${id} has a non-adjacent step.` };
      }
    }
  }

  // Check full coverage
  if (usedCells.size !== size * size) {
    return { valid: false, reason: `Not all cells are covered (${usedCells.size} of ${size * size}).` };
  }

  return { valid: true };
}

// ---------------------------------------------------------------------------
// score
// ---------------------------------------------------------------------------

export function score({ validationResult, submission }) {
  if (!validationResult.valid) return { completed: false, correct: false, baseScore: 0, bonusScore: 0, penaltyScore: 0, totalScore: 0 };
  const bonusScore = calcTimeBonus(submission.timeTakenSeconds, 25, 60, 300);
  return { completed: true, correct: true, baseScore: 85, bonusScore, penaltyScore: 0, totalScore: 85 + bonusScore };
}

export default { generate, validate, score };