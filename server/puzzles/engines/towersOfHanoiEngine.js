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

// Scoring settings scale with disk count / minimum moves - previously flat
// regardless of difficulty, despite minMoves ranging from 7 (easy) to 31
// (hard): a hard solve legitimately takes far longer than an easy one but
// paid the same base score and used the same tight bonus decay window.
const DIFFICULTY_SETTINGS = {
  [Difficulty.EASY]:   { baseScore: 60,  bonusIdeal: 15, bonusGood: 30, bonusMax: 120 },
  [Difficulty.MEDIUM]: { baseScore: 90,  bonusIdeal: 25, bonusGood: 50, bonusMax: 220 },
  [Difficulty.HARD]:   { baseScore: 130, bonusIdeal: 45, bonusGood: 90, bonusMax: 380 },
};

// validate() already computes the exact, server-verified move count (it's
// replayed from the move list, not trusted from client state), so this
// efficiency bonus is fully trustworthy - unlike the time bonus, it can't be
// faked by lying in the submission payload.
function moveEfficiencyBonus(moveCount, minMoves) {
  if (!Number.isFinite(moveCount) || !Number.isFinite(minMoves) || minMoves <= 0) return 0;
  if (moveCount <= minMoves) return 20; // optimal (or better, which shouldn't happen but is harmless)
  const overMoves = moveCount - minMoves;
  return Math.max(0, Math.round(20 * (1 - overMoves / minMoves)));
}

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
      initialPegs,
      diskCount,
      minMoves,
    },
    meta: { diskCount, minMoves },
  };
}

// Sanity cap so a malicious/buggy client can't force the server to loop forever.
const MAX_MOVES_MULTIPLIER = 20;

/**
 * Replays a move list from the known initial layout and returns either
 * the resulting peg state or a reason the replay failed. This is the
 * single source of truth for scoring - client-submitted `pegs` are never
 * trusted directly.
 */
function replayMoves(moves, initialPegs, diskCount) {
  if (!moves || !Array.isArray(moves)) {
    return { ok: false, reason: 'No move history submitted.' };
  }
  if (moves.length === 0) {
    return { ok: false, reason: 'Move history is empty.' };
  }
  if (moves.length > diskCount * MAX_MOVES_MULTIPLIER + 50) {
    return { ok: false, reason: 'Move history is implausibly long.' };
  }

  const pegsState = initialPegs.map(p => [...p]);

  for (let i = 0; i < moves.length; i++) {
    const move = moves[i];
    if (!move || typeof move !== 'object') {
      return { ok: false, reason: `Move ${i + 1} is malformed.` };
    }

    const { from, to } = move;
    if (!Number.isInteger(from) || !Number.isInteger(to) ||
        from < 0 || from > 2 || to < 0 || to > 2 || from === to) {
      return { ok: false, reason: `Move ${i + 1} is invalid.` };
    }

    const fromPeg = pegsState[from];
    const toPeg   = pegsState[to];
    if (fromPeg.length === 0) {
      return { ok: false, reason: `Move ${i + 1}: no disk to move from peg ${from + 1}.` };
    }

    const disk = fromPeg[fromPeg.length - 1];
    const topOfTo = toPeg[toPeg.length - 1];
    if (topOfTo !== undefined && topOfTo < disk) {
      return { ok: false, reason: `Move ${i + 1}: cannot place disk ${disk} on smaller disk ${topOfTo}.` };
    }

    toPeg.push(fromPeg.pop());
  }

  return { ok: true, pegsState };
}

function pegsEqual(a, b) {
  if (a.length !== b.length) return false;
  for (let p = 0; p < a.length; p++) {
    if (a[p].length !== b[p].length) return false;
    for (let d = 0; d < a[p].length; d++) {
      if (a[p][d] !== b[p][d]) return false;
    }
  }
  return true;
}

export function validate(playerAnswer, solutionData) {
  const moves = playerAnswer?.moves;
  const { diskCount, solvedPegs } = solutionData;

  // initialPegs is fully deterministic from diskCount, so if older stored
  // solutionData predates this field, rebuild it rather than crashing.
  const initialPegs = solutionData.initialPegs ?? [
    Array.from({ length: diskCount }, (_, i) => diskCount - i),
    [],
    [],
  ];

  const replay = replayMoves(moves, initialPegs, diskCount);
  if (!replay.ok) {
    return { valid: false, reason: replay.reason };
  }

  if (!pegsEqual(replay.pegsState, solvedPegs)) {
    return { valid: false, reason: 'Submitted moves do not result in a solved puzzle.' };
  }

  return { valid: true, moveCount: moves.length };
}

export function score({ validationResult, submission, difficulty, solutionData }) {
  if (!validationResult.valid) return { completed: false, correct: false, baseScore: 0, bonusScore: 0, penaltyScore: 0, totalScore: 0 };

  const settings = DIFFICULTY_SETTINGS[difficulty] ?? DIFFICULTY_SETTINGS[Difficulty.MEDIUM];
  const timeBonus = calcTimeBonus(submission.timeTakenSeconds, settings.bonusIdeal, settings.bonusGood, settings.bonusMax);
  const efficiencyBonus = moveEfficiencyBonus(validationResult.moveCount, solutionData?.minMoves);
  const bonusScore = timeBonus + efficiencyBonus;

  return { completed: true, correct: true, baseScore: settings.baseScore, bonusScore, penaltyScore: 0, totalScore: settings.baseScore + bonusScore };
}

export default { generate, validate, score };