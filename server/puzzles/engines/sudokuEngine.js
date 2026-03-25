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
// Difficulty config — how many cells to REMOVE (81 total cells)
// Easy:   ~46 removed → ~35 givens
// Medium: ~54 removed → ~27 givens
// Hard:   ~59 removed → ~22 givens
// ---------------------------------------------------------------------------

const CELLS_TO_REMOVE = {
  [Difficulty.EASY]:   46,
  [Difficulty.MEDIUM]: 54,
  [Difficulty.HARD]:   59,
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

  // 2. Remove cells to create the puzzle
  const toRemove   = CELLS_TO_REMOVE[difficulty] ?? CELLS_TO_REMOVE[Difficulty.MEDIUM];
  const puzzleGrid = removeCell(solvedBoard, toRemove, rng);
  const fixedCells = buildFixedCells(puzzleGrid);

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
      givens:  81 - toRemove,
      removed: toRemove,
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

  // Full bonus within 3 min, decays to 0 at 15 min
  const bonusScore = calcTimeBonus(submission.timeTakenSeconds, 25, 180, 900);

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