import {
  randomBetween,
  randomFrom,
  errorToScore,
  calcSpeedBonus,
  lerp,
} from '../../utils/eliminationHelpers.js';
import { ROUND_TYPE, ROUND_DURATION, GAME_RULES } from '../../utils/eliminationConstants.js';

// ─── Generate ─────────────────────────────────────────────────────────────────

export const generateRoundConfig = ({ difficulty = 1, totalRounds } = {}) => {
  const safeTotalRounds = totalRounds ?? GAME_RULES.TOTAL_ROUNDS;
  const maxDifficulty = 1 + (safeTotalRounds - 1) * 0.15;
  const t = Math.min(1, Math.max(0, (difficulty - 1) / (maxDifficulty - 1)));

  // Grid grows gradually: 4x4 early, 5x5 mid-game, 6x6 late.
  const gridSize = t < 0.34 ? 4 : t < 0.72 ? 5 : 6;

  // Keep enough preview time for the player to encode the pattern. Difficulty
  // should come primarily from grid size and number of highlighted cells.
  // Round 1: 3.2s  →  Round 8: 2.8s.
  const flashDurationMs = Math.round(lerp(3200, 2800, t));

  // Human-friendly memory load: roughly 3-4 cells early and 6-8 late.
  const minCells = Math.round(lerp(3, 6, t));
  const maxCells = Math.round(lerp(4, 8, t));
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
      // Missed entirely - max penalty
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