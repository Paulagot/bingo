/**
 * Shared puzzle type constants
 * server/puzzles/types/puzzleTypes.js
 */

export const PuzzleType = {
  SUDOKU:             'sudoku',
  DEDUCTION_GRID:     'deductionGrid',
  SPATIAL_PACKING:    'spatialPacking',
  WORD_SEARCH:        'wordSearch',
  ANAGRAM:            'anagram',
  SEQUENCE_ORDERING:  'sequenceOrdering',
  MATCH_PAIRS:        'matchPairs',
  SPOT_DIFFERENCE:    'spotDifference',
  PATTERN_COMPLETION: 'patternCompletion',
  HIDDEN_OBJECT:      'hiddenObject',
  SLIDING_TILE:       'slidingTile',
  PATTERN_COMPLETION: 'patternCompletion',
  WORD_LADDER:        'wordLadder',
  CRYPTOGRAM:         'cryptogram',
  NUMBER_PATH:        'numberPath',
  TOWERS_OF_HANOI:    'towersOfHanoi',
  NONOGRAM:           'nonogram',
  MEMORY_PAIRS:       'memoryPairs',
};

export const Difficulty = {
  EASY:   'easy',
  MEDIUM: 'medium',
  HARD:   'hard',
};

export const PuzzlePageState = {
  LOCKED:            'locked',
  NOT_STARTED:       'notStarted',
  IN_PROGRESS:       'inProgress',
  SUBMITTED:         'submitted',
  COMPLETED:         'completed',
  FAILED_VALIDATION: 'failedValidation',
};