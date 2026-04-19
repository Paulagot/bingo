import type { PuzzleDifficulty, PuzzleType } from './puzzleTypes';

type Instructions = string | string[];

interface PuzzleMeta {
  title: string;
  instructions: Instructions | ((difficulty: PuzzleDifficulty) => Instructions);
}

export const PUZZLE_META: Record<PuzzleType, PuzzleMeta> = {
  anagram: {
    title: 'Anagram Challenge',
    instructions: (difficulty) => {
      const difficultyLine =
        difficulty === 'easy'
          ? 'Words are shorter and more familiar.'
          : difficulty === 'medium'
          ? 'Words are longer and slightly less obvious.'
          : 'Words are longer and may be more abstract or tricky.';

      return [
        'Unscramble the letters to form the correct word.',
        'Use the category clue to help you.',
        'The puzzle is hidden until you press Start Challenge.',
        'The timer begins when you start.',
        'You only score if your answer is correct.',
        'Correct answers earn base points plus a speed bonus.',
        'Full speed bonus is awarded for fast answers and decreases over time.',
        difficultyLine,
      ];
    },
  },

  cryptogram: {
    title: 'Cryptogram Challenge',
    instructions: (difficulty) => {
      const difficultyLine =
        difficulty === 'easy'
          ? 'Shorter phrases with fewer unique letters.'
          : difficulty === 'medium'
          ? 'Longer phrases with more letter patterns to solve.'
          : 'Long phrases with many unique letters and complex patterns.';

      return [
        'Decode the encrypted phrase by figuring out the letter substitution.',
        'Each encoded letter always represents the same real letter.',
        'Spaces and punctuation stay the same.',
        'A starter hint is provided to help you begin.',
        'Use patterns and repeated letters to work out the solution.',
        'The puzzle is hidden until you press Start Challenge.',
        'The timer begins when you start.',
        'You only score if your decoded phrase is completely correct.',
        'Correct answers earn base points plus a speed bonus.',
        'Full bonus is awarded for faster solves and decreases over time.',
        difficultyLine,
      ];
    },
  },

  sudoku: {
    title: 'Sudoku Challenge',
    instructions: [
      'Fill the grid so each row, column, and box contains valid numbers.',
      'The puzzle is hidden until you press Start Challenge.',
      'The timer begins when you start.',
      'Solve the puzzle as quickly as possible.',
    ],
  },

  sequenceOrdering: {
    title: 'Sequence Ordering Challenge',
    instructions: [
      'Arrange the items in the correct order.',
      'Use logic and patterns to determine the sequence.',
      'The timer begins when you press Start Challenge.',
    ],
  },

  matchPairs: {
    title: 'Match Pairs Challenge',
    instructions: [
      'Match each item with its correct pair.',
      'Use logic and elimination to find the correct matches.',
      'The timer begins when you press Start Challenge.',
    ],
  },

  wordSearch: {
    title: 'Word Search Challenge',
    instructions: [
      'Find all hidden words in the grid.',
      'Words may appear in different directions.',
      'The timer begins when you press Start Challenge.',
    ],
  },

  slidingTile: {
    title: 'Sliding Tile Challenge',
    instructions: [
      'Rearrange the tiles into the correct order.',
      'Only one tile can move at a time into the empty space.',
      'The timer begins when you press Start Challenge.',
    ],
  },

  patternCompletion: {
    title: 'Pattern Completion Challenge',
    instructions: [
      'Identify the missing part of the pattern.',
      'Use logic and repetition to determine the correct answer.',
      'The timer begins when you press Start Challenge.',
    ],
  },

  wordLadder: {
    title: 'Word Ladder Challenge',
    instructions: [
      'Change one letter at a time to move from the start word to the end word.',
      'Each step must be a valid word.',
      'The timer begins when you press Start Challenge.',
    ],
  },

  numberPath: {
    title: 'Number Path Challenge',
    instructions: [
      'Connect the numbers using the correct path rules.',
      'Use logic to complete the path correctly.',
      'The timer begins when you press Start Challenge.',
    ],
  },

  towersOfHanoi: {
    title: 'Towers of Hanoi Challenge',
    instructions: [
      'Move the full stack to the target peg.',
      'Only move one disk at a time and never place a larger disk on a smaller one.',
      'The timer begins when you press Start Challenge.',
    ],
  },

  nonogram: {
    title: 'Nonogram Challenge',
    instructions: [
      'Use the row and column clues to reveal the hidden picture.',
      'Mark the correct cells carefully using logic.',
      'The timer begins when you press Start Challenge.',
    ],
  },

  memoryPairs: {
    title: 'Memory Pairs Challenge',
    instructions: [
      'Flip cards and match all pairs.',
      'Use memory and speed to finish in the fewest moves possible.',
      'The timer begins when you press Start Challenge.',
    ],
  },
    deductionGrid: {
    title: 'Deduction Grid Challenge',
    instructions: [
      'Use the clues to work out the correct matches in the grid.',
      'Eliminate impossible options and narrow down the correct answers.',
      'The timer begins when you press Start Challenge.',
    ],
  },

  spatialPacking: {
    title: 'Spatial Packing Challenge',
    instructions: [
      'Fit all pieces into the available space correctly.',
      'Rotate and place pieces carefully to complete the puzzle.',
      'The timer begins when you press Start Challenge.',
    ],
  },

  spotDifference: {
    title: 'Spot the Difference Challenge',
    instructions: [
      'Find all differences between the two images.',
      'Look carefully and work as quickly as you can.',
      'The timer begins when you press Start Challenge.',
    ],
  },

  hiddenObject: {
    title: 'Hidden Object Challenge',
    instructions: [
      'Find all hidden objects in the scene.',
      'Search carefully and work as quickly as you can.',
      'The timer begins when you press Start Challenge.',
    ],
  },
};

export function getPuzzleMeta(
  puzzleType: PuzzleType,
  difficulty: PuzzleDifficulty
) {
  const meta =
    PUZZLE_META[puzzleType] ??
    ({
      title: 'Puzzle Challenge',
      instructions: [
        'Read the puzzle carefully and solve it as quickly as you can.',
        'The timer begins when you press Start Challenge.',
        'Score is based on correctness and speed.',
      ],
    } as PuzzleMeta);

  return {
    title: meta.title,
    instructions:
      typeof meta.instructions === 'function'
        ? meta.instructions(difficulty)
        : meta.instructions,
  };
}