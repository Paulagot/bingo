import { v4 as uuidv4 } from 'uuid';

// ─── ID Generation ────────────────────────────────────────────────────────────
export const generateRoomId = () => `room_${uuidv4()}`;
export const generateRoundId = () => `round_${uuidv4()}`;
export const generatePlayerId = () => `player_${uuidv4()}`;

// ─── Coordinate Helpers ───────────────────────────────────────────────────────

/**
 * Euclidean distance between two normalised points (0–1 space).
 */
export const distance = (x1, y1, x2, y2) =>
  Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);

/**
 * Clamp a value between min and max.
 */
export const clamp = (value, min = 0, max = 1) =>
  Math.min(max, Math.max(min, value));

/**
 * Midpoint between two normalised points.
 */
export const midpoint = (x1, y1, x2, y2) => ({
  x: (x1 + x2) / 2,
  y: (y1 + y2) / 2,
});

/**
 * Check that a normalised coordinate is within bounds.
 */
export const isValidNormalisedCoord = (x, y) =>
  typeof x === 'number' &&
  typeof y === 'number' &&
  x >= 0 && x <= 1 &&
  y >= 0 && y <= 1;

// ─── Random Helpers ───────────────────────────────────────────────────────────

/**
 * Random float between min (inclusive) and max (exclusive).
 */
export const randomBetween = (min, max) =>
  min + Math.random() * (max - min);

/**
 * Random float within a safe viewport margin (avoids shapes spawning at edges).
 * margin: 0–0.5 (default 0.15)
 */
export const randomSafeCoord = (margin = 0.15) =>
  randomBetween(margin, 1 - margin);

/**
 * Pick a random element from an array.
 */
export const randomFrom = (arr) =>
  arr[Math.floor(Math.random() * arr.length)];

// ─── Scoring Helpers ──────────────────────────────────────────────────────────

/**
 * Convert a distance-based error (0–√2 in normalised space) into a score.
 * Lower error → higher score. Max score = 1000.
 * We use an exponential decay so precision is heavily rewarded.
 */
export const errorToScore = (errorDistance, maxError = Math.SQRT2) => {
  const ratio = clamp(errorDistance / maxError);
  return Math.round(1000 * Math.exp(-5 * ratio));
};

// ─── Speed Bonus ─────────────────────────────────────────────────────────────

/**
 * Calculate a speed bonus (0–100 points) for precision-based rounds.
 *
 * Rules:
 * - Only awarded when errorDistance < PRECISION_THRESHOLD (within 15% of correct)
 * - Scales with how early in the round the player submitted
 * - Max bonus = 100 points (on top of up to 1000 precision points)
 * - NOT applied to stop_the_bar (timing IS the mechanic there)
 *
 * @param {number} submittedAt    - epoch ms when player submitted
 * @param {number} startedAt      - epoch ms when round went active
 * @param {number} durationMs     - total round duration
 * @param {number} errorDistance  - normalised error (0–1+)
 * @param {string} roundType      - excluded for stop_the_bar
 * @returns {number} bonus points (0–100)
 */
const PRECISION_THRESHOLD = 0.15;  // only bonus if within 15% of correct
const MAX_SPEED_BONUS = 100;       // max bonus points

export const calcSpeedBonus = (submittedAt, startedAt, durationMs, errorDistance, roundType) => {
  // No speed bonus for stop_the_bar — timing is already the whole mechanic
  if (roundType === 'stop_the_bar') return 0;

  // Only award when player was sufficiently precise
  if (errorDistance == null || errorDistance > PRECISION_THRESHOLD) return 0;

  // How much of the round had elapsed when they submitted (0 = instant, 1 = last second)
  const elapsed = clamp(submittedAt - startedAt, 0, durationMs);
  const timeUsedFraction = elapsed / durationMs;

  // Speed bonus: full bonus for submitting in first half, tapers to 0 by end
  // Uses a simple linear decay: bonus = MAX * (1 - timeUsedFraction)
  const bonus = Math.round(MAX_SPEED_BONUS * (1 - timeUsedFraction));
  return Math.max(0, bonus);
};

// ─── Ranking ──────────────────────────────────────────────────────────────────

/**
 * Sort players by score descending (higher = better).
 * Returns array of { playerId, score, rank }.
 */
export const rankByScore = (scoreMap) => {
  const sorted = Object.entries(scoreMap)
    .map(([playerId, score]) => ({ playerId, score }))
    .sort((a, b) => b.score - a.score);

  return sorted.map((entry, index) => ({
    ...entry,
    rank: index + 1,
  }));
};

// ─── Timestamp Helpers ────────────────────────────────────────────────────────
export const now = () => Date.now();
export const isoNow = () => new Date().toISOString();

// ─── Elimination Count ────────────────────────────────────────────────────────

/**
 * How many players to eliminate given the active count and the fraction.
 * Always eliminates at least 1 when fraction > 0.
 * Never eliminates more than leaves 1 survivor.
 */
export const calcEliminationCount = (activeCount, fraction) => {
  if (!fraction || fraction <= 0) return 0;
  const raw = Math.ceil(activeCount * fraction);
  return Math.min(raw, activeCount - 1);
};

/**
 * How many players to eliminate to reach a target survivor count.
 */
export const calcEliminationToTarget = (activeCount, targetSurvivors) => {
  const toElim = activeCount - targetSurvivors;
  return Math.max(0, Math.min(toElim, activeCount - 1));
};