/**
 * Pattern Completion Puzzle Engine
 * server/puzzles/engines/patternCompletionEngine.js
 *
 * Generates a 3×3 matrix puzzle where the bottom-right cell is missing.
 * The player picks the correct missing piece from 4–6 options.
 *
 * Pattern rules are template-based:
 *   - Easy:   single attribute progression (colour OR shape)
 *   - Medium: two attribute progressions (colour AND shape)
 *   - Hard:   rotation or count-based progressions
 */

import { createSeededRandom, shuffleArray, pickRandom } from '../utils/puzzleHelpers.js';
import { PuzzleType, Difficulty } from '../puzzleTypes.js';

// ---------------------------------------------------------------------------
// Shape / colour vocabulary
// ---------------------------------------------------------------------------

const SHAPES = ['circle', 'square', 'triangle', 'diamond', 'star', 'hexagon'];
const COLORS = ['red', 'blue', 'green', 'yellow', 'purple', 'orange'];

// ---------------------------------------------------------------------------
// Pattern templates
// Each template describes how to derive cell values for a 3×3 grid.
// `build(rng)` returns a 3×3 array of cell strings e.g. "circle-red"
// ---------------------------------------------------------------------------

/**
 * Template: colour changes across columns, shape stays constant per row.
 * Easy difficulty.
 */
function templateShapeRowColorCol(rng) {
  const shapes = pickRandom(SHAPES, rng);
  const colors = shuffleArray(COLORS, rng).slice(0, 3);
  const matrix = [];
  for (let r = 0; r < 3; r++) {
    const row = [];
    for (let c = 0; c < 3; c++) {
      row.push(`${shapes}-${colors[c]}`);
    }
    matrix.push(row);
  }
  return matrix;
}

/**
 * Template: shape changes across columns, colour changes across rows.
 * Medium difficulty — two attributes progressing simultaneously.
 */
function templateShapeColColorRow(rng) {
  const shapes = shuffleArray(SHAPES, rng).slice(0, 3);
  const colors = shuffleArray(COLORS, rng).slice(0, 3);
  const matrix = [];
  for (let r = 0; r < 3; r++) {
    const row = [];
    for (let c = 0; c < 3; c++) {
      row.push(`${shapes[c]}-${colors[r]}`);
    }
    matrix.push(row);
  }
  return matrix;
}

/**
 * Template: shape cycles through a fixed set per row, colour constant per row.
 * Easy — shape progression only.
 */
function templateShapeCyclePerRow(rng) {
  const shapeSets = [
    shuffleArray(SHAPES, rng).slice(0, 3),
    shuffleArray(SHAPES, rng).slice(0, 3),
    shuffleArray(SHAPES, rng).slice(0, 3),
  ];
  const colors = shuffleArray(COLORS, rng).slice(0, 3);
  const matrix = [];
  for (let r = 0; r < 3; r++) {
    const row = [];
    for (let c = 0; c < 3; c++) {
      row.push(`${shapeSets[r][c]}-${colors[r]}`);
    }
    matrix.push(row);
  }
  return matrix;
}

/**
 * Template: diagonal colour progression, shape constant throughout.
 * Hard — less obvious rule.
 */
function templateDiagonalColor(rng) {
  const shape  = pickRandom(SHAPES, rng);
  const colors = shuffleArray(COLORS, rng).slice(0, 3);
  // Colour index = (row + col) % 3
  const matrix = [];
  for (let r = 0; r < 3; r++) {
    const row = [];
    for (let c = 0; c < 3; c++) {
      row.push(`${shape}-${colors[(r + c) % 3]}`);
    }
    matrix.push(row);
  }
  return matrix;
}

/**
 * Template: each row is a full set of 3 different shapes, each col a full set
 * of 3 different colours — like a latin square.
 * Hard — both attributes form a complete set in every row AND column.
 */
function templateLatinSquare(rng) {
  const shapes = shuffleArray(SHAPES, rng).slice(0, 3);
  const colors = shuffleArray(COLORS, rng).slice(0, 3);

  // Build shape and color rotation offsets
  const matrix = [];
  for (let r = 0; r < 3; r++) {
    const row = [];
    for (let c = 0; c < 3; c++) {
      const s = shapes[(r + c) % 3];
      const k = colors[(r + c * 2) % 3];
      row.push(`${s}-${k}`);
    }
    matrix.push(row);
  }
  return matrix;
}

// ---------------------------------------------------------------------------
// Template registry by difficulty
// ---------------------------------------------------------------------------

const TEMPLATES = {
  [Difficulty.EASY]:   [templateShapeRowColorCol, templateShapeCyclePerRow],
  [Difficulty.MEDIUM]: [templateShapeColColorRow],
  [Difficulty.HARD]:   [templateDiagonalColor, templateLatinSquare],
};

// ---------------------------------------------------------------------------
// Distractor generation
// Build wrong options that look plausible but don't fit the pattern.
// ---------------------------------------------------------------------------

/**
 * Generate `count` distractors that are NOT the correct answer.
 * Strategy: swap either the shape or the colour of the correct answer.
 */
function generateDistractors(correct, allCells, count, rng) {
  const [correctShape, correctColor] = correct.split('-');
  const distractors                  = new Set();

  // Collect all shapes and colours present in the puzzle
  const usedShapes = new Set();
  const usedColors = new Set();
  for (const cell of allCells) {
    if (!cell) continue;
    const [s, k] = cell.split('-');
    usedShapes.add(s);
    usedColors.add(k);
  }

  // Wrong colour, correct shape
  for (const k of usedColors) {
    if (k !== correctColor) distractors.add(`${correctShape}-${k}`);
  }

  // Correct colour, wrong shape
  for (const s of usedShapes) {
    if (s !== correctShape) distractors.add(`${s}-${correctColor}`);
  }

  // Wrong shape, wrong colour (from used vocab)
  for (const s of usedShapes) {
    for (const k of usedColors) {
      if (s !== correctShape && k !== correctColor) distractors.add(`${s}-${k}`);
    }
  }

  // Remove correct answer from distractor pool just in case
  distractors.delete(correct);

  const pool    = shuffleArray([...distractors], rng);
  return pool.slice(0, count);
}

// ---------------------------------------------------------------------------
// generate
// ---------------------------------------------------------------------------

export function generate(config) {
  const { difficulty = Difficulty.MEDIUM } = config;
  const seed = config.seed
    ?? `patternCompletion-${difficulty}-${Date.now()}-${Math.random().toString(36).slice(2)}`;

  const rng       = createSeededRandom(seed);
  const templates = TEMPLATES[difficulty] ?? TEMPLATES[Difficulty.MEDIUM];
  const template  = templates[Math.floor(rng() * templates.length)];

  // Build the full 3×3 matrix
  const fullMatrix = template(rng);

  // The answer is always the bottom-right cell [2][2]
  const correctAnswer = fullMatrix[2][2];

  // Build puzzle matrix with null at [2][2]
  const puzzleMatrix = fullMatrix.map((row, r) =>
    row.map((cell, c) => (r === 2 && c === 2 ? null : cell))
  );

  // All cells except the missing one (for distractor generation)
  const allCells = fullMatrix.flat();

  // 3 distractors + 1 correct = 4 options total
  const distractorCount = 3;
  const distractors     = generateDistractors(correctAnswer, allCells, distractorCount, rng);
  const options         = shuffleArray([correctAnswer, ...distractors], rng);

  return {
    puzzleType: PuzzleType.PATTERN_COMPLETION,
    difficulty,
    seed,
    puzzleData: {
      matrix:  puzzleMatrix,   // 3×3, null at [2][2]
      options,                 // shuffled array of strings
    },
    solutionData: {
      correctOption: correctAnswer,
    },
    meta: {
      templateName: template.name,
    },
  };
}

// ---------------------------------------------------------------------------
// validate
// ---------------------------------------------------------------------------

export function validate(playerAnswer, solutionData) {
  const submitted = playerAnswer?.selectedOption;
  const correct   = solutionData?.correctOption;

  if (!submitted) {
    return { valid: false, reason: 'No option selected.' };
  }

  return {
    valid:  submitted === correct,
    reason: submitted !== correct ? 'Incorrect option selected.' : undefined,
  };
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

  // Full bonus within 20s, decays to 0 at 120s
  const bonusScore = submission.timeTakenSeconds <= 20
    ? 20
    : submission.timeTakenSeconds >= 120
      ? 0
      : Math.round(20 * (1 - (submission.timeTakenSeconds - 20) / 100));

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