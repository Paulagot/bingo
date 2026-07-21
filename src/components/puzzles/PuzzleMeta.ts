import type { PuzzleDifficulty, PuzzleType } from './puzzleTypes';

type Instructions = string | string[];

interface PuzzleMeta {
  title: string;
  instructions: Instructions | ((difficulty: PuzzleDifficulty) => Instructions);
}

// ─── Shared boilerplate ────────────────────────────────────────────────────
//
// Every implemented puzzle type shares the same save/resume behavior and the
// same base scoring shape (correct + speed bonus), so those lines are
// defined once here rather than repeated (and risking drifting out of sync)
// across all 13 entries below.

const SAVE_AND_RESUME_LINES: string[] = [
  'Your answer saves automatically as you play - you don\u2019t need to do anything to keep your progress.',
  'You can also press Save & Exit at any time to save and come back later.',
  'If you come back to a puzzle you\u2019ve already started, you\u2019ll be asked whether to continue where you left off or start over.',
  'Starting over clears your current answer, but it does not reset your timer - your speed bonus is based on the total time since you first opened the puzzle, including any earlier attempts.',
];

/**
 * @param extra An additional sentence describing any bonus beyond the
 *   standard correctness + speed bonus (e.g. a fewest-moves bonus), or
 *   omitted for puzzle types that only have the standard bonus.
 */
function scoringLines(extra?: string): string[] {
  const base =
    'You only score if your final answer is correct - correct answers earn base points plus a speed bonus, which is highest for fast solves and gets smaller the longer you take.';
  return extra ? [base, extra] : [base];
}

const START_LINES: string[] = [
  'The puzzle is hidden until you press Start Challenge.',
  'The timer begins when you start.',
];

export const PUZZLE_META: Record<PuzzleType, PuzzleMeta> = {
  anagram: {
    title: 'Anagram Challenge',
    instructions: (difficulty) => {
      const difficultyLine =
        difficulty === 'easy'
          ? 'Easy words are shorter and more familiar.'
          : difficulty === 'medium'
          ? 'Medium words are longer and slightly less obvious.'
          : 'Hard words are longer and may be more abstract or tricky.';

      return [
        'Unscramble the letters to form the correct word.',
        'Tap a letter in the scrambled bank to add it to your answer, or just type on your keyboard.',
        'Tap a filled letter in your answer to remove it, or press Backspace.',
        'Use the category clue at the top to help you work out the word.',
        ...START_LINES,
        ...scoringLines(),
        difficultyLine,
        ...SAVE_AND_RESUME_LINES,
      ];
    },
  },

  cryptogram: {
    title: 'Cryptogram Challenge',
    instructions: (difficulty) => {
      const difficultyLine =
        difficulty === 'easy'
          ? 'Easy phrases are shorter, with fewer unique letters to work out.'
          : difficulty === 'medium'
          ? 'Medium phrases are longer, with more letter patterns to solve.'
          : 'Hard phrases are long, with many unique letters and complex patterns.';

      return [
        'Decode the encrypted phrase by figuring out which real letter each encoded letter stands for.',
        'Tap an encoded letter, then choose its real letter from the picker that appears.',
        'Each encoded letter always stands for the same real letter throughout the whole phrase.',
        'Spaces and punctuation are shown exactly as they appear - only letters are encoded.',
        'A few starter letters are already filled in for you as a free hint.',
        'Watch the decoded preview update as you go to see how your answer is coming together.',
        ...START_LINES,
        ...scoringLines(),
        difficultyLine,
        ...SAVE_AND_RESUME_LINES,
      ];
    },
  },

  sudoku: {
    title: 'Sudoku Challenge',
    instructions: (difficulty) => {
      const difficultyLine =
        difficulty === 'easy'
          ? 'Easy grids start with more numbers already filled in.'
          : difficulty === 'medium'
          ? 'Medium grids give you fewer starting numbers to work from.'
          : 'Hard grids give you very few starting numbers - expect to work most of it out yourself.';

      return [
        'Fill every empty cell with a number from 1 to 9.',
        'Each row, each column, and each bold-outlined 3\u00d73 box must contain every number exactly once - no repeats.',
        'Tap a cell to select it, then tap a number on the number pad (or type on your keyboard) to fill it in. Tap \u2715 or press Backspace to clear a cell.',
        'Cells you\u2019re given to start with are locked and can\u2019t be changed.',
        'If a number conflicts with another cell in its row, column, or box, that cell is highlighted in red - this is just a helper and won\u2019t stop you from continuing, but every conflict needs fixing before your grid is correct.',
        ...START_LINES,
        ...scoringLines(),
        difficultyLine,
        ...SAVE_AND_RESUME_LINES,
      ];
    },
  },

  sequenceOrdering: {
    title: 'Sequence Ordering Challenge',
    instructions: [
      'You\u2019re given a set of items in the wrong order, along with a rule for how they should be ordered (for example, smallest to largest, or earliest to latest).',
      'Drag an item to move it, or use the \u2191 and \u2193 buttons on each item - handy if dragging feels awkward on a touch screen.',
      'The item at the top of your list is treated as first in the sequence.',
      'There is only one correct order - double-check the rule at the top before submitting.',
      ...START_LINES,
      ...scoringLines(),
      ...SAVE_AND_RESUME_LINES,
    ],
  },

  matchPairs: {
    title: 'Match Pairs Challenge',
    instructions: [
      'You\u2019ll see two columns of items that need to be linked together.',
      'Tap an item on the left, then tap the item on the right it belongs with, to connect them as a pair.',
      'Tap a pairing again to undo it before submitting if you change your mind.',
      'Every item has exactly one correct match.',
      ...START_LINES,
      ...scoringLines(),
      ...SAVE_AND_RESUME_LINES,
    ],
  },

  wordSearch: {
    title: 'Word Search Challenge',
    instructions: (difficulty) => {
      const difficultyLine =
        difficulty === 'easy'
          ? 'Easy grids are smaller, and words only run left-to-right or top-to-bottom.'
          : difficulty === 'medium'
          ? 'Medium grids are bigger, and words can also run diagonally or backwards.'
          : 'Hard grids are large, with longer words running in any of the 8 directions, including diagonally.';

      return [
        'A grid of letters hides every word on the list somewhere inside it.',
        'Words can run left-to-right, right-to-left, top-to-bottom, bottom-to-top, or diagonally, depending on the difficulty.',
        'Click and drag - or on a touch screen, tap and drag your finger - across the letters to select a word once you spot it.',
        'Found words are highlighted on the grid and crossed off the list.',
        ...START_LINES,
        'You still earn points for every word you find, even if you don\u2019t find them all - finding every word quickly earns the biggest bonus.',
        difficultyLine,
        ...SAVE_AND_RESUME_LINES,
      ];
    },
  },

  slidingTile: {
    title: 'Sliding Tile Challenge',
    instructions: (difficulty) => {
      const difficultyLine =
        difficulty === 'easy'
          ? 'Easy puzzles use a smaller grid and a lighter scramble.'
          : difficulty === 'medium'
          ? 'Medium puzzles use a bigger grid with a deeper scramble.'
          : 'Hard puzzles use the biggest grid with the deepest scramble.';

      return [
        'The tiles are scrambled, leaving one empty space in the grid.',
        'Tap a tile next to the empty space to slide it into the gap - only tiles beside the blank (marked with a small green dot) can move.',
        'Keep sliding tiles, one at a time, until the numbers (or picture) are back in the correct order.',
        'If it\u2019s a picture puzzle, you can show or hide a small preview of the finished image to help guide you.',
        ...START_LINES,
        ...scoringLines('Solving in fewer moves earns an extra bonus on top of your speed bonus.'),
        difficultyLine,
        ...SAVE_AND_RESUME_LINES,
      ];
    },
  },

  patternCompletion: {
    title: 'Pattern Completion Challenge',
    instructions: [
      'You\u2019re shown a grid with one tile missing.',
      'Look across each row and down each column to work out the rule connecting the shapes, colours, or counts.',
      'Tap an option below to preview it in the missing space - tap it again if you change your mind.',
      'Choose the one option that correctly completes the pattern.',
      ...START_LINES,
      ...scoringLines(),
      ...SAVE_AND_RESUME_LINES,
    ],
  },

  wordLadder: {
    title: 'Word Ladder Challenge',
    instructions: (difficulty) => {
      const difficultyLine =
        difficulty === 'easy'
          ? 'Easy ladders use shorter words and fewer steps.'
          : difficulty === 'medium'
          ? 'Medium ladders use slightly longer chains of words.'
          : 'Hard ladders use longer words and more steps.';

      return [
        'You\u2019re given a start word and an end word of the same length.',
        'Change exactly one letter at a time to turn the start word into the end word.',
        'Every word you create along the way must be a real, valid word - not just any combination of letters.',
        'Type each step into the blank rows between the start and end word; you can add or remove rows if you need more or fewer steps than shown.',
        ...START_LINES,
        ...scoringLines('Reaching the end word in the fewest possible steps earns an extra bonus on top of your speed bonus.'),
        difficultyLine,
        ...SAVE_AND_RESUME_LINES,
      ];
    },
  },

  numberPath: {
    title: 'Number Path Challenge',
    instructions: (difficulty) => {
      const difficultyLine =
        difficulty === 'easy'
          ? 'Easy grids are smaller, with fewer pairs to connect.'
          : difficulty === 'medium'
          ? 'Medium grids are bigger, with more pairs to connect.'
          : 'Hard grids are the biggest, with the most pairs to connect.';

      return [
        'The grid has pairs of matching numbers that need to be connected.',
        'Click or drag - touch works too - from a numbered cell, through empty cells, to its matching number to draw that pair\u2019s path.',
        'A path can only travel between cells that are directly next to each other, and no two paths are allowed to cross or share a cell.',
        'Every single cell on the grid must end up covered by some path - not just the cells directly between each pair of numbers.',
        ...START_LINES,
        ...scoringLines(),
        difficultyLine,
        ...SAVE_AND_RESUME_LINES,
      ];
    },
  },

  towersOfHanoi: {
    title: 'Towers of Hanoi Challenge',
    instructions: (difficulty) => {
      const difficultyLine =
        difficulty === 'easy'
          ? 'Easy puzzles use 3 disks.'
          : difficulty === 'medium'
          ? 'Medium puzzles use 4 disks.'
          : 'Hard puzzles use 5 disks, which need noticeably more moves to solve.';

      return [
        'All the disks start stacked on the first peg, largest at the bottom, smallest on top.',
        'Tap a peg to pick up its top disk, then tap another peg to place that disk there.',
        'You can only move one disk at a time, and only ever the top disk of a stack.',
        'You can never place a larger disk on top of a smaller one.',
        'Move the entire stack, in the same order, onto the last peg to solve the puzzle.',
        ...START_LINES,
        ...scoringLines('There\u2019s a known minimum number of moves for every puzzle - getting close to (or matching) that minimum earns an extra bonus on top of your speed bonus.'),
        difficultyLine,
        ...SAVE_AND_RESUME_LINES,
      ];
    },
  },

  nonogram: {
    title: 'Nonogram Challenge',
    instructions: (difficulty) => {
      const difficultyLine =
        difficulty === 'easy'
          ? 'Easy pictures use a smaller 7\u00d77 grid.'
          : difficulty === 'medium'
          ? 'Medium pictures use a 10\u00d710 grid.'
          : 'Hard pictures use a larger 15\u00d715 grid with more detail to work out.';

      return [
        'The grid hides a picture made of filled and empty squares - reveal it using the number clues beside each row and column.',
        'Each number in a clue is a run of consecutive filled squares in that row or column, in order, with at least one empty square between each run. For example, a clue of "3 1" means a run of 3 filled squares, then a gap, then a single filled square, and nothing else in that line.',
        'Click, or tap and drag, to fill squares. Switch to "Cross" mode to mark squares you\u2019re sure are empty - this is just a helper and doesn\u2019t affect your answer.',
        'Combine the row and column clues together - a square is only certain once both its row clue and column clue support it.',
        'The picture is complete once every row and column clue is satisfied.',
        ...START_LINES,
        ...scoringLines(),
        difficultyLine,
        ...SAVE_AND_RESUME_LINES,
      ];
    },
  },

  memoryPairs: {
    title: 'Memory Pairs Challenge',
    instructions: (difficulty) => {
      const difficultyLine =
        difficulty === 'easy'
          ? 'Easy grids have 8 pairs to find.'
          : difficulty === 'medium'
          ? 'Medium grids have 12 pairs to find.'
          : 'Hard grids have 18 pairs to find.';

      return [
        'All cards start face down in a grid.',
        'Tap two cards per turn to flip them and see what\u2019s underneath.',
        'If the two cards match, they stay face up. If they don\u2019t, they flip back over after a moment - try to remember what you\u2019ve seen and where.',
        'Match every pair on the grid to complete the puzzle.',
        ...START_LINES,
        ...scoringLines('Finding every pair in as few flips as possible earns an extra bonus on top of your speed bonus.'),
        difficultyLine,
        ...SAVE_AND_RESUME_LINES,
      ];
    },
  },

  // ─── Not yet playable ────────────────────────────────────────────────────
  //
  // These four puzzle types are recognised (they're valid PuzzleType values,
  // and a club could schedule one), but PuzzleShell has no renderer wired up
  // for them yet - it shows a "not wired in yet" placeholder in the puzzle
  // area regardless of what's written here. Describing detailed mechanics
  // for a puzzle that doesn't actually render would be actively misleading,
  // so these stay deliberately honest and generic until real renderers
  // exist, rather than describing invented behavior.

  deductionGrid: {
    title: 'Deduction Grid Challenge',
    instructions: [
      'This puzzle type isn\u2019t available to play yet - check back soon!',
    ],
  },

  spatialPacking: {
    title: 'Spatial Packing Challenge',
    instructions: [
      'This puzzle type isn\u2019t available to play yet - check back soon!',
    ],
  },

  spotDifference: {
    title: 'Spot the Difference Challenge',
    instructions: [
      'This puzzle type isn\u2019t available to play yet - check back soon!',
    ],
  },

  hiddenObject: {
    title: 'Hidden Object Challenge',
    instructions: [
      'This puzzle type isn\u2019t available to play yet - check back soon!',
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
        ...SAVE_AND_RESUME_LINES,
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