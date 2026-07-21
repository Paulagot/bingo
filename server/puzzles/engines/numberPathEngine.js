/**
 * Number Path Puzzle Engine
 * server/puzzles/engines/numberPathEngine.js
 *
 * Connect matching number pairs on a grid by drawing non-crossing paths.
 * Grid sizes: 4×4 (easy), 6×6 (medium), 8×8 (hard).
 * Each path must pass through every cell (full coverage).
 */

import { createSeededRandom, calcTimeBonus } from '../utils/puzzleHelpers.js';
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
// Snake-layout builder
//
// Full-coverage, non-crossing layouts are easy to get subtly wrong by hand
// (see git history / bug reports — a stray trailing cell in one hand-typed
// pair silently broke two of the original curated layouts). This builder
// constructs them so they are correct *by construction*:
//
//   1. Walk the whole grid once in a boustrophedon ("snake") order — every
//      step in this walk is orthogonally adjacent to the last, and it visits
//      every cell exactly once.
//   2. Cut that single walk into N contiguous chunks. Because each chunk is
//      a slice of one already-adjacent walk, each chunk is automatically a
//      valid connected path, and the chunks automatically partition the
//      whole grid with no gaps and no overlaps.
//
// Hand-crafted layouts are kept where they already existed (for visual
// variety), but any *new* layout added below should go through this.
// ---------------------------------------------------------------------------

function boustrophedonPath(size) {
  const path = [];
  for (let r = 0; r < size; r++) {
    if (r % 2 === 0) {
      for (let c = 0; c < size; c++) path.push([r, c]);
    } else {
      for (let c = size - 1; c >= 0; c--) path.push([r, c]);
    }
  }
  return path;
}

function buildSnakeLayout(size, chunkSizes) {
  const total = chunkSizes.reduce((a, b) => a + b, 0);
  if (total !== size * size) {
    throw new Error(`buildSnakeLayout(${size}): chunk sizes sum to ${total}, expected ${size * size}`);
  }
  if (chunkSizes.some(n => n < 2)) {
    throw new Error(`buildSnakeLayout(${size}): every chunk must be at least 2 cells (got ${JSON.stringify(chunkSizes)})`);
  }

  const path = boustrophedonPath(size);
  const pairs = [];
  let cursor = 0;
  chunkSizes.forEach((len, i) => {
    pairs.push({ id: i + 1, cells: path.slice(cursor, cursor + len) });
    cursor += len;
  });
  return { size, pairs };
}

// ---------------------------------------------------------------------------
// Pre-built puzzle layouts
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
        // FIX: this pair previously ended with an extra [3,0] — a cell
        // already claimed by pair 1 and not even adjacent to [5,0] before
        // it, which made this layout unsolvable. Path now ends at [5,0].
        { id: 5, cells: [[4,0],[4,1],[4,2],[5,2],[5,1],[5,0]] },
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
    buildSnakeLayout(6, [8, 6, 8, 6, 8]),
  ],
  [Difficulty.HARD]: [
    {
      size: 8,
      pairs: [
        { id: 1, cells: [[0,0],[0,1],[0,2],[1,2],[1,1],[1,0],[2,0],[2,1],[2,2],[3,2],[3,1],[3,0]] },
        { id: 2, cells: [[0,3],[0,4],[0,5],[0,6],[0,7],[1,7],[1,6],[1,5],[1,4],[1,3],[2,3],[2,4]] },
        { id: 3, cells: [[2,5],[2,6],[2,7],[3,7],[3,6],[3,5],[4,5],[4,6],[4,7]] },
        // FIX: this pair previously ended with an extra [4,5] — already
        // claimed by pair 3 — which made this layout unsolvable. Path now
        // ends at [5,5].
        { id: 4, cells: [[3,3],[3,4],[4,4],[4,3],[5,3],[5,4],[5,5]] },
        { id: 5, cells: [[4,0],[4,1],[4,2],[5,2],[5,1],[5,0],[6,0],[6,1]] },
        { id: 6, cells: [[5,6],[5,7],[6,7],[6,6],[7,6],[7,7]] },
        { id: 7, cells: [[6,2],[6,3],[6,4],[6,5],[7,5],[7,4],[7,3],[7,2]] },
        { id: 8, cells: [[7,0],[7,1]] },
      ],
    },
    buildSnakeLayout(8, [8, 6, 10, 6, 8, 10, 8, 8]),
    buildSnakeLayout(8, [4, 12, 6, 10, 4, 12, 8, 8]),
  ],
};

// ---------------------------------------------------------------------------
// Layout self-check — runs once at module load. If a layout is broken this
// throws immediately (loudly, in dev/CI) instead of silently shipping an
// unsolvable puzzle to a player.
// ---------------------------------------------------------------------------

function assertValidLayout(difficulty, layout, layoutIndex) {
  const label = `${difficulty} layout #${layoutIndex}`;
  const { size, pairs } = layout;

  if (size !== GRID_SIZES[difficulty]) {
    throw new Error(`${label}: size ${size} does not match expected ${GRID_SIZES[difficulty]} for ${difficulty}.`);
  }
  if (pairs.length !== PAIR_COUNTS[difficulty]) {
    throw new Error(`${label}: has ${pairs.length} pairs, expected ${PAIR_COUNTS[difficulty]} for ${difficulty}.`);
  }

  const seen = new Map(); // "r,c" -> pair id that claimed it

  for (const p of pairs) {
    if (!Array.isArray(p.cells) || p.cells.length < 2) {
      throw new Error(`${label}, pair ${p.id}: needs at least 2 cells.`);
    }
    for (let i = 0; i < p.cells.length; i++) {
      const [r, c] = p.cells[i];
      if (r < 0 || r >= size || c < 0 || c >= size) {
        throw new Error(`${label}, pair ${p.id}: cell (${r},${c}) is out of bounds.`);
      }
      if (i > 0) {
        const [pr, pc] = p.cells[i - 1];
        const dist = Math.abs(r - pr) + Math.abs(c - pc);
        if (dist !== 1) {
          throw new Error(`${label}, pair ${p.id}: step ${i} (${pr},${pc})->(${r},${c}) is not adjacent.`);
        }
      }
      const key = `${r},${c}`;
      if (seen.has(key)) {
        throw new Error(`${label}: cell (${r},${c}) is claimed by both pair ${seen.get(key)} and pair ${p.id}.`);
      }
      seen.set(key, p.id);
    }
  }

  if (seen.size !== size * size) {
    throw new Error(`${label}: covers ${seen.size} of ${size * size} cells — grid is not fully covered.`);
  }
}

function validateAllLayouts() {
  for (const difficulty of Object.keys(LAYOUTS)) {
    LAYOUTS[difficulty].forEach((layout, i) => assertValidLayout(difficulty, layout, i));
  }
}

validateAllLayouts();

// ---------------------------------------------------------------------------
// Scoring settings scale with grid size / difficulty
// ---------------------------------------------------------------------------

const DIFFICULTY_SETTINGS = {
  [Difficulty.EASY]:   { baseScore: 55,  bonusIdeal: 15, bonusGood: 40,  bonusMax: 200 },
  [Difficulty.MEDIUM]: { baseScore: 85,  bonusIdeal: 25, bonusGood: 60,  bonusMax: 300 },
  [Difficulty.HARD]:   { baseScore: 130, bonusIdeal: 45, bonusGood: 120, bonusMax: 600 },
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
 *   3. No two paths share a cell (this also catches a path crossing itself)
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
    if (!path || typeof path !== 'object') {
      return { valid: false, reason: 'A submitted path is malformed.' };
    }
    const { id, cells } = path;
    if (!Array.isArray(cells) || cells.length < 2) {
      return { valid: false, reason: `Path ${id} is too short.` };
    }

    const ep = endpointMap[id];
    if (!ep) return { valid: false, reason: `Unknown path id ${id}.` };

    const first = cells[0];
    const last  = cells[cells.length - 1];
    if (!Array.isArray(first) || first.length !== 2 || !Array.isArray(last) || last.length !== 2) {
      return { valid: false, reason: `Path ${id} has malformed endpoint cells.` };
    }

    const matchesForward  = first[0] === ep.start[0] && first[1] === ep.start[1] && last[0] === ep.end[0] && last[1] === ep.end[1];
    const matchesBackward = first[0] === ep.end[0]   && first[1] === ep.end[1]   && last[0] === ep.start[0] && last[1] === ep.start[1];

    if (!matchesForward && !matchesBackward) {
      return { valid: false, reason: `Path ${id} does not connect the correct endpoints.` };
    }

    for (let i = 0; i < cells.length; i++) {
      const cell = cells[i];
      if (!Array.isArray(cell) || cell.length !== 2 || !Number.isInteger(cell[0]) || !Number.isInteger(cell[1])) {
        return { valid: false, reason: `Path ${id} has a malformed cell at step ${i + 1}.` };
      }
      const [r, c] = cell;
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