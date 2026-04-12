import {
  randomBetween,
  randomFrom,
  errorToScore,
  calcSpeedBonus,
} from '../../utils/eliminationHelpers.js';
import { ROUND_TYPE, ROUND_DURATION } from '../../utils/eliminationConstants.js';

// ─── Generate ─────────────────────────────────────────────────────────────────

export const generateRoundConfig = ({ difficulty = 1 } = {}) => {

  // Grid: 4x4 at round 1, 6x6 at round 8
  const gridSize = Math.min(6, 4 + Math.floor((difficulty - 1) * 2));

  // Flash duration: fixed at 2000ms — difficulty comes from grid and cell count only
  const flashDurationMs = 2000;

  // Cell count: scales with grid size so the density feels consistent
  // Round 1 (4x4): 4-5 cells   Round 5 (5x5): 6-7 cells   Round 8 (6x6): 8-10 cells
  const minCells = 3 + Math.floor((difficulty - 1) * 5);
  const maxCells = Math.min(
    Math.floor(gridSize * gridSize * 0.5), // never more than 50% of grid
    5 + Math.floor((difficulty - 1) * 5),
  );
  const cellCount = Math.floor(randomBetween(minCells, maxCells + 1));

  // Fisher-Yates shuffle to pick which cells flash
  const allCells = [];
  for (let r = 0; r < gridSize; r++) {
    for (let c = 0; c < gridSize; c++) {
      allCells.push({ row: r, col: c });
    }
  }
  for (let i = allCells.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [allCells[i], allCells[j]] = [allCells[j], allCells[i]];
  }
  const flashCells = allCells.slice(0, cellCount);

  return {
    roundType: ROUND_TYPE.FLASH_GRID,
    gridSize,
    flashCells,
    flashDurationMs,
    durationMs: ROUND_DURATION[ROUND_TYPE.FLASH_GRID],
  };
};

// ─── Validate ─────────────────────────────────────────────────────────────────

export const validateSubmission = (submission, config) => {
  if (!submission) return { valid: false, error: 'No submission provided' };
  if (submission.roundType !== ROUND_TYPE.FLASH_GRID)
    return { valid: false, error: 'Round type mismatch' };
  if (!Array.isArray(submission.taps))
    return { valid: false, error: 'Taps must be an array' };
  return { valid: true };
};

// ─── Score ────────────────────────────────────────────────────────────────────

export const scoreSubmission = (submission, config, roundStartTimestamp) => {
  const { flashCells, gridSize } = config;
  const taps = submission.taps ?? [];

  let totalError = 0;
  const cellSize = 1 / gridSize;

  // For each correct cell find the nearest tap
  for (const cell of flashCells) {
    const cellCx = (cell.col + 0.5) * cellSize;
    const cellCy = (cell.row + 0.5) * cellSize;

    if (taps.length === 0) {
      // Missed entirely — max penalty
      totalError += 1.0;
      continue;
    }

    // Find closest tap
    let minDist = Infinity;
    for (const tap of taps) {
      const d = Math.sqrt((tap.x - cellCx) ** 2 + (tap.y - cellCy) ** 2);
      if (d < minDist) minDist = d;
    }
    totalError += Math.min(1.0, minDist / cellSize);
  }

  // Penalty for extra taps
  const extraTaps = Math.max(0, taps.length - flashCells.length);
  totalError += extraTaps * 0.3;

  const errorDistance = Math.min(1.0, totalError / flashCells.length);
  const precisionScore = errorToScore(errorDistance, 1.0);
  const speedBonus = calcSpeedBonus(
    submission.submittedAt, roundStartTimestamp,
    config.durationMs, errorDistance, config.roundType,
  );

  return { score: precisionScore + speedBonus, precisionScore, speedBonus, errorDistance };
};

// ─── Reveal ───────────────────────────────────────────────────────────────────

export const formatRevealData = (submission, config, scoringResult) => ({
  roundType: ROUND_TYPE.FLASH_GRID,
  gridSize: config.gridSize,
  flashCells: config.flashCells,
  playerTaps: submission.taps ?? [],
  errorDistance: scoringResult.errorDistance,
  score: scoringResult.score,
});