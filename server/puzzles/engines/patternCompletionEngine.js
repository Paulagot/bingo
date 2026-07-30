/**
 * Pattern Completion Puzzle Engine
 * server/puzzles/engines/patternCompletionEngine.js
 *
 * Generates visual pattern-completion puzzles.
 *
 * Difficulty:
 *   Easy   = 3x3, one visual rule, 4 options
 *   Medium = 3x3, two visual rules, 5 options
 *   Hard   = 4x4, richer visual rules, 6 options
 *
 * Cell format:
 * {
 *   shape: 'circle' | 'square' | 'triangle' | 'diamond' | 'star' | 'hexagon',
 *   color: 'red' | 'blue' | 'green' | 'yellow' | 'purple' | 'orange',
 *   rotation: 0 | 90 | 180 | 270,
 *   count: 1 | 2 | 3,
 *   fill: 'solid' | 'outline',
 *   size: 'small' | 'medium' | 'large'
 * }
 */

import { createSeededRandom, shuffleArray, pickRandom, calcTimeBonus } from '../utils/puzzleHelpers.js';
import { PuzzleType, Difficulty } from '../puzzleTypes.js';

// Scoring settings scale with grid size / rule complexity - previously this
// engine paid a flat baseScore (and a hand-rolled, non-difficulty-aware time
// bonus) regardless of whether it was a 3x3 one-rule easy puzzle or a 4x4
// multi-rule hard one.
const DIFFICULTY_SETTINGS = {
  [Difficulty.EASY]:   { baseScore: 60,  bonusIdeal: 15, bonusGood: 30, bonusMax: 90 },
  [Difficulty.MEDIUM]: { baseScore: 80,  bonusIdeal: 20, bonusGood: 40, bonusMax: 150 },
  [Difficulty.HARD]:   { baseScore: 110, bonusIdeal: 30, bonusGood: 60, bonusMax: 250 },
};

// ---------------------------------------------------------------------------
// Visual vocabulary
// ---------------------------------------------------------------------------

const SHAPES = ['circle', 'square', 'triangle', 'diamond', 'star', 'hexagon'];
const ROTATABLE_SHAPES = ['triangle', 'diamond', 'star', 'hexagon'];
const COLORS = ['red', 'blue', 'green', 'yellow', 'purple', 'orange'];
const ROTATIONS = [0, 90, 180, 270];
const COUNTS = [1, 2, 3];
const FILLS = ['solid', 'outline'];
const SIZES = ['small', 'medium', 'large'];

const GRID_SIZE_BY_DIFFICULTY = {
  [Difficulty.EASY]: 3,
  [Difficulty.MEDIUM]: 3,
  [Difficulty.HARD]: 4,
};

const OPTION_COUNT_BY_DIFFICULTY = {
  [Difficulty.EASY]: 4,
  [Difficulty.MEDIUM]: 5,
  [Difficulty.HARD]: 6,
};

// ---------------------------------------------------------------------------
// Cell helpers
// ---------------------------------------------------------------------------

function makeCell({
  shape = 'circle',
  color = 'blue',
  rotation = 0,
  count = 1,
  fill = 'solid',
  size = 'medium',
}) {
  return {
    shape,
    color,
    rotation,
    count,
    fill,
    size,
  };
}

function cloneCell(cell) {
  return {
    shape: cell.shape,
    color: cell.color,
    rotation: cell.rotation,
    count: cell.count,
    fill: cell.fill,
    size: cell.size,
  };
}

function cellKey(cell) {
  if (!cell) return 'null';

  return [
    cell.shape,
    cell.color,
    cell.rotation,
    cell.count,
    cell.fill,
    cell.size,
  ].join('|');
}

function sameCell(a, b) {
  if (!a || !b) return false;
  return cellKey(a) === cellKey(b);
}

function pickN(values, count, rng) {
  const shuffled = shuffleArray(values, rng);

  if (shuffled.length >= count) {
    return shuffled.slice(0, count);
  }

  const result = [...shuffled];

  while (result.length < count) {
    result.push(shuffled[result.length % shuffled.length]);
  }

  return result;
}

function safeIndex(values, index) {
  return values[index % values.length];
}

// ---------------------------------------------------------------------------
// Templates
// ---------------------------------------------------------------------------

/**
 * Easy:
 * Shape changes across columns.
 * Colour stays the same.
 */
function templateEasyShapeAcross(rng, gridSize) {
  const shapes = pickN(SHAPES, gridSize, rng);
  const color = pickRandom(COLORS, rng);

  const matrix = [];

  for (let r = 0; r < gridSize; r++) {
    const row = [];

    for (let c = 0; c < gridSize; c++) {
      row.push(makeCell({
        shape: shapes[c],
        color,
        rotation: 0,
        count: 1,
        fill: 'solid',
        size: 'medium',
      }));
    }

    matrix.push(row);
  }

  return {
    matrix,
    ruleType: 'easy-shape-across',
    ruleLabel: 'Shape changes across each row.',
  };
}

/**
 * Easy:
 * Colour changes across columns.
 * Shape stays the same.
 */
function templateEasyColorAcross(rng, gridSize) {
  const shape = pickRandom(SHAPES, rng);
  const colors = pickN(COLORS, gridSize, rng);

  const matrix = [];

  for (let r = 0; r < gridSize; r++) {
    const row = [];

    for (let c = 0; c < gridSize; c++) {
      row.push(makeCell({
        shape,
        color: colors[c],
        rotation: 0,
        count: 1,
        fill: 'solid',
        size: 'medium',
      }));
    }

    matrix.push(row);
  }

  return {
    matrix,
    ruleType: 'easy-color-across',
    ruleLabel: 'Colour changes across each row.',
  };
}

/**
 * Easy:
 * Count increases across columns.
 */
function templateEasyCountAcross(rng, gridSize) {
  const shape = pickRandom(['circle', 'square', 'star'], rng);
  const color = pickRandom(COLORS, rng);

  const matrix = [];

  for (let r = 0; r < gridSize; r++) {
    const row = [];

    for (let c = 0; c < gridSize; c++) {
      row.push(makeCell({
        shape,
        color,
        rotation: 0,
        count: Math.min(c + 1, 3),
        fill: 'solid',
        size: 'small',
      }));
    }

    matrix.push(row);
  }

  return {
    matrix,
    ruleType: 'easy-count-across',
    ruleLabel: 'Number of symbols increases across each row.',
  };
}

/**
 * Medium:
 * Shape changes across columns.
 * Colour changes down rows.
 */
function templateMediumShapeColColorRow(rng, gridSize) {
  const shapes = pickN(SHAPES, gridSize, rng);
  const colors = pickN(COLORS, gridSize, rng);

  const matrix = [];

  for (let r = 0; r < gridSize; r++) {
    const row = [];

    for (let c = 0; c < gridSize; c++) {
      row.push(makeCell({
        shape: shapes[c],
        color: colors[r],
        rotation: 0,
        count: 1,
        fill: 'solid',
        size: 'medium',
      }));
    }

    matrix.push(row);
  }

  return {
    matrix,
    ruleType: 'medium-shape-column-color-row',
    ruleLabel: 'Shape changes across, colour changes down.',
  };
}

/**
 * Medium:
 * Rotation changes across columns.
 * Colour changes down rows.
 */
function templateMediumRotationAcrossColorRow(rng, gridSize) {
  const shape = pickRandom(ROTATABLE_SHAPES, rng);
  const colors = pickN(COLORS, gridSize, rng);
  const rotations = pickN(ROTATIONS, gridSize, rng);

  const matrix = [];

  for (let r = 0; r < gridSize; r++) {
    const row = [];

    for (let c = 0; c < gridSize; c++) {
      row.push(makeCell({
        shape,
        color: colors[r],
        rotation: rotations[c],
        count: 1,
        fill: 'solid',
        size: 'medium',
      }));
    }

    matrix.push(row);
  }

  return {
    matrix,
    ruleType: 'medium-rotation-across-color-row',
    ruleLabel: 'Rotation changes across, colour changes down.',
  };
}

/**
 * Medium:
 * Size changes across columns.
 * Shape changes down rows.
 */
function templateMediumSizeAcrossShapeRow(rng, gridSize) {
  const sizes = ['small', 'medium', 'large'];
  const shapes = pickN(SHAPES, gridSize, rng);
  const color = pickRandom(COLORS, rng);

  const matrix = [];

  for (let r = 0; r < gridSize; r++) {
    const row = [];

    for (let c = 0; c < gridSize; c++) {
      row.push(makeCell({
        shape: shapes[r],
        color,
        rotation: 0,
        count: 1,
        fill: 'solid',
        size: safeIndex(sizes, c),
      }));
    }

    matrix.push(row);
  }

  return {
    matrix,
    ruleType: 'medium-size-across-shape-row',
    ruleLabel: 'Size changes across, shape changes down.',
  };
}

/**
 * Hard:
 * 4x4 latin square.
 * Shape and colour both cycle, but at different offsets.
 */
function templateHardLatinSquare(rng, gridSize) {
  const shapes = pickN(SHAPES, gridSize, rng);
  const colors = pickN(COLORS, gridSize, rng);

  const matrix = [];

  for (let r = 0; r < gridSize; r++) {
    const row = [];

    for (let c = 0; c < gridSize; c++) {
      row.push(makeCell({
        shape: shapes[(r + c) % gridSize],
        color: colors[(r + c * 2) % gridSize],
        rotation: 0,
        count: 1,
        fill: 'solid',
        size: 'medium',
      }));
    }

    matrix.push(row);
  }

  return {
    matrix,
    ruleType: 'hard-latin-square',
    ruleLabel: 'Each row and column completes a set.',
  };
}

/**
 * Hard:
 * Shape cycles diagonally.
 * Colour cycles diagonally.
 * Rotation changes across columns.
 */
function templateHardShapeColorRotation(rng, gridSize) {
  const shapes = pickN(ROTATABLE_SHAPES, gridSize, rng);
  const colors = pickN(COLORS, gridSize, rng);
  const rotations = pickN(ROTATIONS, gridSize, rng);

  const matrix = [];

  for (let r = 0; r < gridSize; r++) {
    const row = [];

    for (let c = 0; c < gridSize; c++) {
      row.push(makeCell({
        shape: shapes[(r + c) % gridSize],
        color: colors[(r + c) % gridSize],
        rotation: rotations[c],
        count: 1,
        fill: 'solid',
        size: 'medium',
      }));
    }

    matrix.push(row);
  }

  return {
    matrix,
    ruleType: 'hard-shape-color-rotation',
    ruleLabel: 'Shape, colour and rotation all change together.',
  };
}

/**
 * Hard:
 * Count changes across columns.
 * Fill alternates.
 * Colour cycles by row and column.
 */
function templateHardCountFillColor(rng, gridSize) {
  const shape = pickRandom(['circle', 'square', 'star'], rng);
  const colors = pickN(COLORS, gridSize, rng);

  const matrix = [];

  for (let r = 0; r < gridSize; r++) {
    const row = [];

    for (let c = 0; c < gridSize; c++) {
      row.push(makeCell({
        shape,
        color: colors[(r + c) % gridSize],
        rotation: 0,
        count: (c % 3) + 1,
        fill: (r + c) % 2 === 0 ? 'solid' : 'outline',
        size: 'small',
      }));
    }

    matrix.push(row);
  }

  return {
    matrix,
    ruleType: 'hard-count-fill-color',
    ruleLabel: 'Count, fill and colour all follow a pattern.',
  };
}

// ---------------------------------------------------------------------------
// Template registry
// ---------------------------------------------------------------------------

const TEMPLATES = {
  [Difficulty.EASY]: [
    templateEasyShapeAcross,
    templateEasyColorAcross,
    templateEasyCountAcross,
  ],

  [Difficulty.MEDIUM]: [
    templateMediumShapeColColorRow,
    templateMediumRotationAcrossColorRow,
    templateMediumSizeAcrossShapeRow,
  ],

  [Difficulty.HARD]: [
    templateHardLatinSquare,
    templateHardShapeColorRotation,
    templateHardCountFillColor,
  ],
};

// ---------------------------------------------------------------------------
// Distractor generation
// ---------------------------------------------------------------------------

function mutateCell(cell, rng) {
  const mutationTypes = shuffleArray(
    ['shape', 'color', 'rotation', 'count', 'fill', 'size'],
    rng
  );

  const mutated = cloneCell(cell);

  for (const mutation of mutationTypes) {
    if (mutation === 'shape') {
      const alternatives = SHAPES.filter(value => value !== cell.shape);
      mutated.shape = pickRandom(alternatives, rng);
      return mutated;
    }

    if (mutation === 'color') {
      const alternatives = COLORS.filter(value => value !== cell.color);
      mutated.color = pickRandom(alternatives, rng);
      return mutated;
    }

    if (mutation === 'rotation') {
      const alternatives = ROTATIONS.filter(value => value !== cell.rotation);
      mutated.rotation = pickRandom(alternatives, rng);
      return mutated;
    }

    if (mutation === 'count') {
      const alternatives = COUNTS.filter(value => value !== cell.count);
      mutated.count = pickRandom(alternatives, rng);
      return mutated;
    }

    if (mutation === 'fill') {
      mutated.fill = cell.fill === 'solid' ? 'outline' : 'solid';
      return mutated;
    }

    if (mutation === 'size') {
      const alternatives = SIZES.filter(value => value !== cell.size);
      mutated.size = pickRandom(alternatives, rng);
      return mutated;
    }
  }

  return mutated;
}

function generateDistractors(correct, fullMatrix, count, rng) {
  const distractors = new Map();

  const existingCells = fullMatrix
    .flat()
    .filter(cell => cell && !sameCell(cell, correct));

  // First use plausible cells from the same puzzle.
  for (const cell of shuffleArray(existingCells, rng)) {
    distractors.set(cellKey(cell), cloneCell(cell));

    if (distractors.size >= count) {
      return [...distractors.values()].slice(0, count);
    }
  }

  // Then mutate the correct answer until enough unique distractors exist.
  let safety = 0;

  while (distractors.size < count && safety < 150) {
    const mutated = mutateCell(correct, rng);

    if (!sameCell(mutated, correct)) {
      distractors.set(cellKey(mutated), mutated);
    }

    safety++;
  }

  return [...distractors.values()].slice(0, count);
}

// ---------------------------------------------------------------------------
// generate
// ---------------------------------------------------------------------------

export function generate(config) {
  const { difficulty = Difficulty.MEDIUM } = config;

  const seed = config.seed
    ?? `patternCompletion-${difficulty}-${Date.now()}-${Math.random().toString(36).slice(2)}`;

  const rng = createSeededRandom(seed);

  const gridSize = GRID_SIZE_BY_DIFFICULTY[difficulty] ?? 3;
  const optionCount = OPTION_COUNT_BY_DIFFICULTY[difficulty] ?? 4;

  const templates = TEMPLATES[difficulty] ?? TEMPLATES[Difficulty.MEDIUM];
  const template = templates[Math.floor(rng() * templates.length)];

  const built = template(rng, gridSize);
  const fullMatrix = built.matrix;

  const missingRow = gridSize - 1;
  const missingCol = gridSize - 1;
  const correctAnswer = fullMatrix[missingRow][missingCol];

  const puzzleMatrix = fullMatrix.map((row, r) =>
    row.map((cell, c) =>
      r === missingRow && c === missingCol ? null : cell
    )
  );

  const distractorCount = optionCount - 1;
  const distractors = generateDistractors(correctAnswer, fullMatrix, distractorCount, rng);
  const options = shuffleArray([correctAnswer, ...distractors], rng);

  return {
    puzzleType: PuzzleType.PATTERN_COMPLETION,
    difficulty,
    seed,

    puzzleData: {
      matrix: puzzleMatrix,
      options,
      gridSize,
      optionCount: options.length,
      ruleType: built.ruleType,
    },

    solutionData: {
      correctOption: correctAnswer,
    },

    meta: {
      templateName: template.name,
      ruleType: built.ruleType,
      ruleLabel: built.ruleLabel,
      gridSize,
      optionCount: options.length,
    },
  };
}

// ---------------------------------------------------------------------------
// validate
// ---------------------------------------------------------------------------

export function validate(playerAnswer, solutionData) {
  const submitted = playerAnswer?.selectedOption;
  const correct = solutionData?.correctOption;

  if (!submitted) {
    return { valid: false, reason: 'No option selected.' };
  }

  return {
    valid: sameCell(submitted, correct),
    reason: !sameCell(submitted, correct) ? 'Incorrect option selected.' : undefined,
  };
}

// ---------------------------------------------------------------------------
// score
// ---------------------------------------------------------------------------

export function score({ validationResult, submission, difficulty }) {
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