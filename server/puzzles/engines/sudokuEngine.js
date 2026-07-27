/**
 * Sudoku Puzzle Engine
 * server/puzzles/engines/sudokuEngine.js
 *
 * Generates a valid 9×9 Sudoku puzzle using backtracking.
 * Removes cells by difficulty while ensuring unique solvability.
 * 0 = empty cell in all grids.
 */

import { createSeededRandom, shuffleArray, calcTimeBonus } from '../utils/puzzleHelpers.js';
import { PuzzleType, Difficulty } from '../puzzleTypes.js';

// ---------------------------------------------------------------------------
// Difficulty config — NOMINAL starting target for how many cells to REMOVE
// (81 total cells). This is a starting point, not a guarantee: generation
// now grades each candidate puzzle against its claimed difficulty (see
// digPuzzleForDifficulty below) and, for easy specifically, will back off
// to fewer removals (more givens) if needed to find a puzzle that's
// actually solvable with basic technique. So an "easy" puzzle may end up
// with somewhat more than 35 givens; medium/hard are not backed off since
// removing more cells only ever makes a puzzle harder, never accidentally
// easier.
// Easy:   ~46 removed → ~35 givens (nominal)
// Medium: ~54 removed → ~27 givens
// Hard:   ~59 removed → ~22 givens
// ---------------------------------------------------------------------------

const CELLS_TO_REMOVE = {
  [Difficulty.EASY]:   46,
  [Difficulty.MEDIUM]: 54,
  [Difficulty.HARD]:   59,
};

// Scoring settings scale with givens count / difficulty — previously flat
// regardless of difficulty, despite hard (22 givens) reliably taking far
// longer than easy (35 givens). This was the single biggest scoring
// imbalance across the whole puzzle set.
const DIFFICULTY_SETTINGS = {
  [Difficulty.EASY]:   { baseScore: 70,  bonusIdeal: 20, bonusGood: 120, bonusMax: 600 },
  [Difficulty.MEDIUM]: { baseScore: 100, bonusIdeal: 25, bonusGood: 180, bonusMax: 900 },
  [Difficulty.HARD]:   { baseScore: 140, bonusIdeal: 35, bonusGood: 260, bonusMax: 1400 },
};

// ---------------------------------------------------------------------------
// Board helpers
// ---------------------------------------------------------------------------

/** Create a blank 9×9 board filled with 0s */
function emptyBoard() {
  return Array.from({ length: 9 }, () => new Array(9).fill(0));
}

/** Deep-clone a 9×9 board */
function cloneBoard(board) {
  return board.map(row => [...row]);
}

/** Check if placing `num` at (row, col) is valid under Sudoku rules */
function isValid(board, row, col, num) {
  // Row check
  if (board[row].includes(num)) return false;

  // Column check
  for (let r = 0; r < 9; r++) {
    if (board[r][col] === num) return false;
  }

  // 3×3 box check
  const boxRow = Math.floor(row / 3) * 3;
  const boxCol = Math.floor(col / 3) * 3;
  for (let r = boxRow; r < boxRow + 3; r++) {
    for (let c = boxCol; c < boxCol + 3; c++) {
      if (board[r][c] === num) return false;
    }
  }

  return true;
}

// ---------------------------------------------------------------------------
// Board generation — fill a complete valid board via backtracking + shuffle
// ---------------------------------------------------------------------------

/**
 * Fill `board` completely using backtracking.
 * `rng` is used to shuffle candidate numbers so each seed gives a unique board.
 * Returns true if successfully filled, false if needs to backtrack.
 */
function fillBoard(board, rng) {
  for (let row = 0; row < 9; row++) {
    for (let col = 0; col < 9; col++) {
      if (board[row][col] !== 0) continue;

      const candidates = shuffleArray([1, 2, 3, 4, 5, 6, 7, 8, 9], rng);

      for (const num of candidates) {
        if (isValid(board, row, col, num)) {
          board[row][col] = num;
          if (fillBoard(board, rng)) return true;
          board[row][col] = 0;
        }
      }

      return false; // no valid number — backtrack
    }
  }
  return true; // all cells filled
}

// ---------------------------------------------------------------------------
// Unique solution check — used when removing cells
// ---------------------------------------------------------------------------

/**
 * Count the number of solutions for `board`, stopping at 2.
 * If count reaches 2 we know it's not uniquely solvable — no need to count more.
 */
function countSolutions(board, limit = 2) {
  let count = 0;

  function solve(b) {
    if (count >= limit) return;

    for (let row = 0; row < 9; row++) {
      for (let col = 0; col < 9; col++) {
        if (b[row][col] !== 0) continue;

        for (let num = 1; num <= 9; num++) {
          if (isValid(b, row, col, num)) {
            b[row][col] = num;
            solve(b);
            b[row][col] = 0;
          }
        }

        return; // empty cell found — recurse handled above, return here
      }
    }

    count++; // reached a complete fill — valid solution found
  }

  solve(cloneBoard(board));
  return count;
}

// ---------------------------------------------------------------------------
// Basic-technique solver — used to actually GRADE difficulty
// ---------------------------------------------------------------------------
//
// countSolutions/removeCell above only guarantee a puzzle has exactly one
// valid completion — that makes it a well-formed puzzle, not necessarily an
// EASY one. Clue count (how many cells are removed) is a weak proxy for
// difficulty: two puzzles with the same number of givens can require wildly
// different levels of deduction depending on exactly which cells got
// removed. The only way to actually know a puzzle is "easy" is to check
// whether it's solvable using only the most basic techniques a beginner
// would use — no guessing, no advanced patterns.
//
// This solver applies exactly two techniques, repeatedly, until neither
// makes further progress:
//   - naked single:  an empty cell with only one possible candidate value
//   - hidden single: a value that can only go in one empty cell within a
//                     given row, column, or box, even if that cell has
//                     other candidates too
// If that's enough to fully solve the grid, the puzzle is genuinely easy by
// conventional Sudoku grading. If not, it needs at least one more advanced
// deduction (or a guess) somewhere, and should not be labeled easy — no
// matter how many cells are filled in.

function getCandidates(grid, r, c) {
  if (grid[r][c] !== 0) return [];

  const used = new Set();
  for (let i = 0; i < 9; i++) {
    used.add(grid[r][i]);
    used.add(grid[i][c]);
  }

  const boxRow = Math.floor(r / 3) * 3;
  const boxCol = Math.floor(c / 3) * 3;
  for (let rr = boxRow; rr < boxRow + 3; rr++) {
    for (let cc = boxCol; cc < boxCol + 3; cc++) {
      used.add(grid[rr][cc]);
    }
  }

  const candidates = [];
  for (let n = 1; n <= 9; n++) {
    if (!used.has(n)) candidates.push(n);
  }
  return candidates;
}

/** All 27 units (9 rows, 9 columns, 9 boxes) as lists of [row, col] cells. */
function buildUnits() {
  const units = [];

  for (let r = 0; r < 9; r++) {
    units.push(Array.from({ length: 9 }, (_, c) => [r, c]));
  }
  for (let c = 0; c < 9; c++) {
    units.push(Array.from({ length: 9 }, (_, r) => [r, c]));
  }
  for (let boxRow = 0; boxRow < 9; boxRow += 3) {
    for (let boxCol = 0; boxCol < 9; boxCol += 3) {
      const cells = [];
      for (let r = boxRow; r < boxRow + 3; r++) {
        for (let c = boxCol; c < boxCol + 3; c++) cells.push([r, c]);
      }
      units.push(cells);
    }
  }

  return units;
}

const UNITS = buildUnits();

/** Fills in every hidden single it can find in one pass. Returns whether any progress was made. */
function applyHiddenSingles(grid) {
  let progress = false;

  for (const unit of UNITS) {
    for (let n = 1; n <= 9; n++) {
      let onlyCell = null;
      let count = 0;

      for (const [r, c] of unit) {
        if (grid[r][c] !== 0) continue;
        if (getCandidates(grid, r, c).includes(n)) {
          count++;
          onlyCell = [r, c];
          if (count > 1) break;
        }
      }

      if (count === 1 && onlyCell) {
        const [r, c] = onlyCell;
        if (grid[r][c] === 0) {
          grid[r][c] = n;
          progress = true;
        }
      }
    }
  }

  return progress;
}

/**
 * Attempts to fully solve a (cloned) grid using ONLY naked singles and
 * hidden singles. Returns { solved, grid } — solved=false means the
 * puzzle needs something beyond these two basic techniques to finish.
 */
function solveWithBasicTechniques(inputGrid) {
  const grid = cloneBoard(inputGrid);

  // eslint-disable-next-line no-constant-condition
  while (true) {
    let progress = false;

    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if (grid[r][c] !== 0) continue;
        const candidates = getCandidates(grid, r, c);
        if (candidates.length === 0) {
          // Contradiction — shouldn't happen for a genuinely valid unique
          // puzzle, but guard against it rather than looping forever.
          return { solved: false, grid };
        }
        if (candidates.length === 1) {
          grid[r][c] = candidates[0];
          progress = true;
        }
      }
    }

    if (progress) continue; // cheaper technique first — rescan before trying hidden singles

    if (applyHiddenSingles(grid)) continue;

    break; // no further progress possible with these two techniques
  }

  const solved = grid.every(row => row.every(cell => cell !== 0));
  return { solved, grid };
}

// ---------------------------------------------------------------------------
// Cell removal — dig holes while preserving unique solvability
// ---------------------------------------------------------------------------

/**
 * Remove `target` cells from a solved board, checking uniqueness after each removal.
 * Uses the seeded rng to shuffle the removal order — reproducible per seed.
 */
function removeCell(solvedBoard, target, rng) {
  const puzzle = cloneBoard(solvedBoard);

  // Build a shuffled list of all cell positions
  const positions = [];
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      positions.push([r, c]);
    }
  }
  const shuffled = shuffleArray(positions, rng);

  let removed = 0;

  for (const [r, c] of shuffled) {
    if (removed >= target) break;

    const backup = puzzle[r][c];
    puzzle[r][c] = 0;

    // Only keep the removal if the puzzle still has exactly one solution
    if (countSolutions(puzzle) === 1) {
      removed++;
    } else {
      puzzle[r][c] = backup; // restore — would break uniqueness
    }
  }

  return puzzle;
}

// ---------------------------------------------------------------------------
// Difficulty-aware digging — retries removeCell until the result is
// actually graded as matching its claimed difficulty
// ---------------------------------------------------------------------------

// Easy must be fully solvable with basic technique alone (see solver above).
// Medium/hard must NOT be — otherwise a "medium" or "hard" instance could
// just as easily turn out to be trivially easy by chance, which is the same
// broken promise in the other direction.
const DIFFICULTY_REQUIRES_BASIC_SOLVABLE = {
  [Difficulty.EASY]:   true,
  [Difficulty.MEDIUM]: false,
  [Difficulty.HARD]:   false,
};

const MAX_DIG_ATTEMPTS_PER_TARGET = 15;
// If we can't find a genuinely easy (basic-technique-solvable) puzzle at
// the nominal clue count after MAX_DIG_ATTEMPTS_PER_TARGET tries, leave a
// few more givens and try again — more givens makes basic technique more
// likely to be sufficient. Never back off below this floor (51 givens),
// which should in practice never actually get hit.
const EASY_BACKOFF_STEP = 2;
const EASY_MIN_REMOVE = 30;

/**
 * Generates a puzzle at the given difficulty and keeps retrying (digging a
 * fresh random pattern each time) until the result is actually graded as
 * matching that difficulty — not just "removed roughly the right number of
 * cells." This is what generate() calls instead of a single removeCell().
 *
 * This runs once per puzzle instance (generatePuzzleForWeek generates and
 * caches one instance per challenge+week, reused by every player), not on
 * every page load, so the extra grading/retry cost here is paid once, not
 * per player.
 */
function digPuzzleForDifficulty(solvedBoard, difficulty, rng) {
  const requireBasicSolvable = DIFFICULTY_REQUIRES_BASIC_SOLVABLE[difficulty] ?? false;
  let targetRemoved = CELLS_TO_REMOVE[difficulty] ?? CELLS_TO_REMOVE[Difficulty.MEDIUM];

  let fallback = null;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    for (let attempt = 0; attempt < MAX_DIG_ATTEMPTS_PER_TARGET; attempt++) {
      const candidate = removeCell(solvedBoard, targetRemoved, rng);
      const { solved } = solveWithBasicTechniques(candidate);
      const meetsRequirement = solved === requireBasicSolvable;

      if (meetsRequirement) {
        return { grid: candidate, verified: true };
      }

      if (!fallback) fallback = candidate;
    }

    if (requireBasicSolvable && targetRemoved > EASY_MIN_REMOVE) {
      targetRemoved = Math.max(EASY_MIN_REMOVE, targetRemoved - EASY_BACKOFF_STEP);
      continue;
    }

    // Exhausted every attempt (and, for easy, every backoff step). This
    // should be exceptionally rare — fall back to the closest attempt found
    // rather than failing puzzle generation outright; a puzzle slightly off
    // its intended difficulty is far better than no puzzle at all.
    console.warn(
      `[sudokuEngine] Could not generate a puzzle verified as "${difficulty}" after exhausting all attempts — serving the closest one found instead.`
    );
    return { grid: fallback ?? removeCell(solvedBoard, targetRemoved, rng), verified: false };
  }
}

// ---------------------------------------------------------------------------
// Fixed-cells map — which cells are pre-filled (locked) for the player
// ---------------------------------------------------------------------------

/**
 * Build a 9×9 boolean grid: true = given (locked), false = empty (player fills).
 */
function buildFixedCells(puzzleGrid) {
  return puzzleGrid.map(row => row.map(cell => cell !== 0));
}

// ---------------------------------------------------------------------------
// generate
// ---------------------------------------------------------------------------

export function generate(config) {
  const { difficulty = Difficulty.MEDIUM } = config;
  const seed = config.seed
    ?? `sudoku-${difficulty}-${Date.now()}-${Math.random().toString(36).slice(2)}`;

  const rng = createSeededRandom(seed);

  // 1. Fill a complete valid board
  const solvedBoard = emptyBoard();
  fillBoard(solvedBoard, rng);

  // 2. Remove cells to create the puzzle — retries until the result is
  //    actually graded as matching the requested difficulty, not just
  //    "removed roughly the right number of cells" (see
  //    digPuzzleForDifficulty for why that distinction matters).
  const nominalToRemove = CELLS_TO_REMOVE[difficulty] ?? CELLS_TO_REMOVE[Difficulty.MEDIUM];
  const { grid: puzzleGrid, verified } = digPuzzleForDifficulty(solvedBoard, difficulty, rng);
  const fixedCells = buildFixedCells(puzzleGrid);

  const actualRemoved = puzzleGrid.reduce(
    (sum, row) => sum + row.filter(cell => cell === 0).length,
    0
  );

  return {
    puzzleType: PuzzleType.SUDOKU,
    difficulty,
    seed,
    puzzleData: {
      grid:       puzzleGrid,   // 9×9, 0 = empty
      fixedCells,               // 9×9 boolean
    },
    solutionData: {
      solutionGrid: solvedBoard, // 9×9, fully solved
    },
    meta: {
      givens:  81 - actualRemoved,
      removed: actualRemoved,
      nominalRemoved: nominalToRemove,
      // False means every retry/backoff attempt was exhausted and the
      // closest-available puzzle was served instead of a fully verified
      // one — see the console.warn in digPuzzleForDifficulty. Should be
      // true in the overwhelming majority of cases; useful to have visible
      // in meta for spotting it if it isn't.
      difficultyVerified: verified,
    },
  };
}

// ---------------------------------------------------------------------------
// validate
// ---------------------------------------------------------------------------

export function validate(playerAnswer, solutionData) {
  const submitted = playerAnswer?.grid;
  const solution  = solutionData?.solutionGrid;

  if (!submitted || !Array.isArray(submitted)) {
    return { valid: false, reason: 'No grid submitted.' };
  }

  if (submitted.length !== 9) {
    return { valid: false, reason: 'Grid must have 9 rows.' };
  }

  // Check every cell is filled and matches solution
  for (let r = 0; r < 9; r++) {
    if (!Array.isArray(submitted[r]) || submitted[r].length !== 9) {
      return { valid: false, reason: `Row ${r} is invalid.` };
    }
    for (let c = 0; c < 9; c++) {
      if (submitted[r][c] === 0 || submitted[r][c] == null) {
        return { valid: false, reason: 'All cells must be filled.' };
      }
      if (submitted[r][c] !== solution[r][c]) {
        return { valid: false, reason: 'One or more cells are incorrect.' };
      }
    }
  }

  return { valid: true };
}

// ---------------------------------------------------------------------------
// score
// ---------------------------------------------------------------------------

export function score({ validationResult, submission, difficulty }) {
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