// server/puzzles/services/scheduleGeneratorService.js
//
// Auto-generates a challenge's weekly puzzle schedule so clubs don't have
// to hand-pick 30 dropdowns. Two independent mechanisms:
//
//   TYPE — "shuffled deck": every registered puzzle type goes into a
//   shuffled deck, dealt one per week. When the deck empties it's
//   reshuffled and dealing continues, with the rule that the first card
//   of a fresh deck can't equal the last card dealt (no back-to-back
//   repeats). Guarantees no type repeats until ALL types have appeared,
//   and stays automatically in sync with the engine registry — adding an
//   engine to ENGINE_MAP puts it in rotation with no changes here.
//
//   DIFFICULTY — "weighted ramp": each week's position fraction
//   f = (week-1)/(totalWeeks-1) drives weighted-random difficulty
//   selection. Early weeks are easy-dominant, the middle is
//   medium-dominant, the run-in is hard-dominant, with a small floor on
//   every weight so occasional surprises break up any monotony. Week 1
//   is always easy (gentle onboarding); the final week is always hard
//   (a finale). Because weights come from the FRACTION, the same arc
//   scales to a 4-week or a 52-week challenge.
//
// Type repeats beyond one deck are repeats of TYPE only, never content:
// puzzle instance seeds include the week number (see
// puzzleGenerationService.generatePuzzleForWeek), so week 5's anagram and
// week 18's anagram are different actual puzzles.

import { getSupportedPuzzleTypes } from './puzzleGenerationService.js';

const DIFFICULTIES = ['easy', 'medium', 'hard'];

// Small constant floor added to every difficulty weight mid-challenge so
// no phase is 100% one difficulty — this is what prevents "a wall of easy".
const WEIGHT_FLOOR = 0.12;

// Never serve more than this many consecutive weeks at the same
// difficulty. The weighted ramp gets the *average* mix right, but random
// rolls can still cluster (a raw run of 16 mediums showed up in testing);
// this is the hard cap that guarantees texture.
const MAX_DIFFICULTY_RUN = 3;

function shuffle(array) {
  // Fisher–Yates. Copy first — never mutate the caller's array.
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function pickWeighted(weights) {
  const total = weights.reduce((sum, w) => sum + w, 0);
  let roll = Math.random() * total;
  for (let i = 0; i < weights.length; i++) {
    roll -= weights[i];
    if (roll <= 0) return i;
  }
  return weights.length - 1;
}

/**
 * Difficulty for one week. f in [0, 1] = how far through the challenge
 * this week falls. Triangle-shaped weights + floor:
 *   easy   : 1 at the start, fading to 0 by the midpoint
 *   medium : peaks at the midpoint
 *   hard   : 0 until the midpoint, rising to 1 at the end
 */
function pickDifficulty(f, bannedDifficulty = null) {
  const weights = {
    easy: Math.max(0, 1 - 2 * f) + WEIGHT_FLOOR,
    medium: 1 - Math.abs(1 - 2 * f) + WEIGHT_FLOOR,
    hard: Math.max(0, 2 * f - 1) + WEIGHT_FLOOR,
  };
  // Run cap: zero out the difficulty that has already run MAX times.
  if (bannedDifficulty) weights[bannedDifficulty] = 0;
  const index = pickWeighted(DIFFICULTIES.map(d => weights[d]));
  return DIFFICULTIES[index];
}

/**
 * Generate a full schedule for a challenge.
 *
 * @param {number} totalWeeks
 * @returns {{ week: number, puzzleType: string, difficulty: string }[]}
 */
export function generateSchedule(totalWeeks) {
  const weeks = Number(totalWeeks);
  if (!Number.isInteger(weeks) || weeks < 1) {
    throw new Error(`Cannot generate schedule for totalWeeks=${totalWeeks}`);
  }

  const allTypes = getSupportedPuzzleTypes();
  if (!allTypes.length) {
    throw new Error('No puzzle engines registered — cannot generate a schedule');
  }

  const schedule = [];
  let deck = shuffle(allTypes);
  let lastType = null;
  let lastDifficulty = null;
  let difficultyRun = 0;

  for (let week = 1; week <= weeks; week++) {
    // Reshuffle an empty deck, avoiding a back-to-back repeat across the
    // boundary (only possible when there's more than one type at all).
    if (deck.length === 0) {
      deck = shuffle(allTypes);
      if (allTypes.length > 1 && deck[0] === lastType) {
        // Swap the offending first card with any other card.
        const swapWith = 1 + Math.floor(Math.random() * (deck.length - 1));
        [deck[0], deck[swapWith]] = [deck[swapWith], deck[0]];
      }
    }

    const puzzleType = deck.shift();
    lastType = puzzleType;

    let difficulty;
    if (week === 1) {
      difficulty = 'easy'; // always a gentle start
    } else if (week === weeks) {
      difficulty = 'hard'; // always a finale
    } else {
      const f = weeks === 1 ? 0 : (week - 1) / (weeks - 1);
      const banned = difficultyRun >= MAX_DIFFICULTY_RUN ? lastDifficulty : null;
      difficulty = pickDifficulty(f, banned);
    }

    difficultyRun = difficulty === lastDifficulty ? difficultyRun + 1 : 1;
    lastDifficulty = difficulty;

    schedule.push({ week, puzzleType, difficulty });
  }

  return schedule;
}

export default { generateSchedule };