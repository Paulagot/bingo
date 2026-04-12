/**
 * Towers of Hanoi Puzzle Engine
 * server/puzzles/engines/towersOfHanoiEngine.js
 *
 * Move all disks from peg A to peg C using peg B as a buffer.
 * Rules: only one disk at a time, never place a larger disk on a smaller one.
 * Difficulty controls disk count: 3 (easy), 4 (medium), 5 (hard).
 * Minimum moves: 2^n - 1.
 */

import { calcTimeBonus } from '../utils/puzzleHelpers.js';
import { PuzzleType, Difficulty } from '../puzzleTypes.js';

const DISK_COUNTS = {
  [Difficulty.EASY]:   3,
  [Difficulty.MEDIUM]: 4,
  [Difficulty.HARD]:   5,
};

export function generate(config) {
  const { difficulty = Difficulty.MEDIUM } = config;
  const seed = config.seed ?? `towersOfHanoi-${difficulty}-${Date.now()}-${Math.random().toString(36).slice(2)}`;

  const diskCount = DISK_COUNTS[difficulty] ?? 4;
  const minMoves  = Math.pow(2, diskCount) - 1;

  // Initial state: all disks on peg 0 (largest=diskCount at bottom, 1 at top)
  // Disks represented as numbers 1..diskCount (1 = smallest)
  const initialPegs = [
    Array.from({ length: diskCount }, (_, i) => diskCount - i), // peg A: [n, n-1, ..., 1]
    [],  // peg B
    [],  // peg C
  ];

  // Solved state: all disks on peg 2
  const solvedPegs = [
    [],
    [],
    Array.from({ length: diskCount }, (_, i) => diskCount - i),
  ];

  return {
    puzzleType: PuzzleType.TOWERS_OF_HANOI,
    difficulty,
    seed,
    puzzleData: {
      diskCount,
      minMoves,
      initialPegs,
    },
    solutionData: {
      solvedPegs,
      diskCount,
    },
    meta: { diskCount, minMoves },
  };
}

export function validate(playerAnswer, solutionData) {
  const pegs      = playerAnswer?.pegs;   // [[],[],[]] — final state of the 3 pegs
  const moves     = playerAnswer?.moves;  // [{from:0,to:2},...]
  const diskCount = solutionData.diskCount;

  if (!pegs || !Array.isArray(pegs) || pegs.length !== 3) {
    return { valid: false, reason: 'Invalid peg state submitted.' };
  }

  // Check final state matches solved state
  const solvedC = solutionData.solvedPegs[2];
  const submittedC = pegs[2];

  if (!submittedC || submittedC.length !== diskCount) {
    return { valid: false, reason: 'All disks must be on peg C.' };
  }

  for (let i = 0; i < diskCount; i++) {
    if (submittedC[i] !== solvedC[i]) {
      return { valid: false, reason: 'Disks are not in the correct order on peg C.' };
    }
  }

  // Optionally validate each move in the move history
  if (moves && Array.isArray(moves)) {
    const pegsState = [
      Array.from({ length: diskCount }, (_, i) => diskCount - i),
      [],
      [],
    ];

    for (let i = 0; i < moves.length; i++) {
      const { from, to } = moves[i];
      if (from < 0 || from > 2 || to < 0 || to > 2 || from === to) {
        return { valid: false, reason: `Move ${i + 1} is invalid.` };
      }
      const fromPeg = pegsState[from];
      const toPeg   = pegsState[to];
      if (!fromPeg || fromPeg.length === 0) return { valid: false, reason: `Move ${i + 1}: no disk to move from peg ${from + 1}.` };
      const disk    = fromPeg[fromPeg.length - 1];
      if (toPeg.length > 0 && toPeg[toPeg.length - 1] < disk) {
        return { valid: false, reason: `Move ${i + 1}: cannot place disk ${disk} on smaller disk ${toPeg[toPeg.length - 1]}.` };
      }
      pegsState[to].push(pegsState[from].pop());
    }
  }

  return { valid: true };
}

export function score({ validationResult, submission }) {
  if (!validationResult.valid) return { completed: false, correct: false, baseScore: 0, bonusScore: 0, penaltyScore: 0, totalScore: 0 };
  const bonusScore = calcTimeBonus(submission.timeTakenSeconds, 20, 30, 180);
  return { completed: true, correct: true, baseScore: 90, bonusScore, penaltyScore: 0, totalScore: 90 + bonusScore };
}

export default { generate, validate, score };