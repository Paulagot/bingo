/**
 * Shared puzzle utilities
 * server/puzzles/utils/puzzleHelpers.js
 */

/**
 * Seeded pseudo-random number generator (Mulberry32).
 * Ensures reproducible puzzle generation — same seed = same puzzle every time.
 * This is critical: all players in a challenge/week must get the same puzzle.
 */
export function createSeededRandom(seed) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(31, h) + seed.charCodeAt(i) | 0;
  }

  return function () {
    h |= 0;
    h = h + 0x6D2B79F5 | 0;
    let t = Math.imul(h ^ h >>> 15, 1 | h);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

/**
 * Build a deterministic seed string for a given challenge + week + puzzle type.
 * Always call this when generating — never use Math.random() directly in engines.
 */
export function generateSeed(challengeId, weekNumber, puzzleType) {
  return `${challengeId}-w${weekNumber}-${puzzleType}`;
}

/**
 * Fisher-Yates shuffle using a seeded rng — produces the same shuffle for the same seed.
 */
export function shuffleArray(array, rng) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Pick a random item from an array with a seeded rng.
 */
export function pickRandom(array, rng) {
  return array[Math.floor(rng() * array.length)];
}

/**
 * Normalize a string answer for comparison — lowercase, trim, collapse spaces.
 */
export function normalizeAnswer(str) {
  return (str ?? '').trim().toLowerCase().replace(/\s+/g, ' ');
}

/**
 * Calculate a time-based bonus score with linear decay.
 * @param {number} timeTakenSeconds
 * @param {number} maxBonus        - max points awarded
 * @param {number} fullBonusCutoff - seconds within which full bonus is given
 * @param {number} zeroBonusCutoff - seconds after which bonus is 0
 */
export function calcTimeBonus(timeTakenSeconds, maxBonus, fullBonusCutoff, zeroBonusCutoff) {
  if (timeTakenSeconds == null) return 0;
  if (timeTakenSeconds <= fullBonusCutoff) return maxBonus;
  if (timeTakenSeconds >= zeroBonusCutoff) return 0;
  const ratio = 1 - (timeTakenSeconds - fullBonusCutoff) / (zeroBonusCutoff - fullBonusCutoff);
  return Math.round(maxBonus * ratio);
}