/**
 * Match Pairs Puzzle Engine
 * server/puzzles/engines/matchPairsEngine.js
 *
 * Objective: Player matches each item in one column with the correct item
 * in the other column. Logic/association puzzle — not a memory flip game.
 */

import { createSeededRandom, shuffleArray, calcTimeBonus } from '../utils/puzzleHelpers.js';
import { PuzzleType, Difficulty } from '../puzzleTypes.js';

// ---------------------------------------------------------------------------
// Pairing bank — load from DB in production
// Each template has a set of pairs. We'll shuffle right-side items for the player.
// ---------------------------------------------------------------------------

const PAIRS_BANK = {
  [Difficulty.EASY]: [
    {
      theme: 'Animals and their sounds',
      pairs: [
        { leftId: 'l1', leftLabel: '🐄 Cow',     rightId: 'r1', rightLabel: 'Moo'    },
        { leftId: 'l2', leftLabel: '🐸 Frog',    rightId: 'r2', rightLabel: 'Croak'  },
        { leftId: 'l3', leftLabel: '🐝 Bee',     rightId: 'r3', rightLabel: 'Buzz'   },
        { leftId: 'l4', leftLabel: '🦁 Lion',    rightId: 'r4', rightLabel: 'Roar'   },
        { leftId: 'l5', leftLabel: '🐦 Duck',    rightId: 'r5', rightLabel: 'Quack'  },
      ],
    },
    {
      theme: 'Countries and their capitals',
      pairs: [
        { leftId: 'l1', leftLabel: 'Ireland',   rightId: 'r1', rightLabel: 'Dublin'     },
        { leftId: 'l2', leftLabel: 'France',    rightId: 'r2', rightLabel: 'Paris'      },
        { leftId: 'l3', leftLabel: 'Japan',     rightId: 'r3', rightLabel: 'Tokyo'      },
        { leftId: 'l4', leftLabel: 'Brazil',    rightId: 'r4', rightLabel: 'Brasília'   },
        { leftId: 'l5', leftLabel: 'Egypt',     rightId: 'r5', rightLabel: 'Cairo'      },
      ],
    },
  ],
  [Difficulty.MEDIUM]: [
    {
      theme: 'Inventions and inventors',
      pairs: [
        { leftId: 'l1', leftLabel: 'Telephone',    rightId: 'r1', rightLabel: 'Bell'     },
        { leftId: 'l2', leftLabel: 'Light bulb',   rightId: 'r2', rightLabel: 'Edison'   },
        { leftId: 'l3', leftLabel: 'Penicillin',   rightId: 'r3', rightLabel: 'Fleming'  },
        { leftId: 'l4', leftLabel: 'World Wide Web',rightId: 'r4', rightLabel: 'Berners-Lee' },
        { leftId: 'l5', leftLabel: 'Gravity theory',rightId: 'r5', rightLabel: 'Newton'  },
        { leftId: 'l6', leftLabel: 'Radio',        rightId: 'r6', rightLabel: 'Marconi'  },
      ],
    },
    {
      theme: 'Elements and their symbols',
      pairs: [
        { leftId: 'l1', leftLabel: 'Gold',      rightId: 'r1', rightLabel: 'Au' },
        { leftId: 'l2', leftLabel: 'Iron',      rightId: 'r2', rightLabel: 'Fe' },
        { leftId: 'l3', leftLabel: 'Silver',    rightId: 'r3', rightLabel: 'Ag' },
        { leftId: 'l4', leftLabel: 'Potassium', rightId: 'r4', rightLabel: 'K'  },
        { leftId: 'l5', leftLabel: 'Lead',      rightId: 'r5', rightLabel: 'Pb' },
        { leftId: 'l6', leftLabel: 'Sodium',    rightId: 'r6', rightLabel: 'Na' },
      ],
    },
  ],
  [Difficulty.HARD]: [
    {
      theme: 'Phobias and what they describe',
      pairs: [
        { leftId: 'l1', leftLabel: 'Trypophobia',   rightId: 'r1', rightLabel: 'Fear of clustered holes' },
        { leftId: 'l2', leftLabel: 'Somniphobia',   rightId: 'r2', rightLabel: 'Fear of sleep'           },
        { leftId: 'l3', leftLabel: 'Ombrophobia',   rightId: 'r3', rightLabel: 'Fear of rain'            },
        { leftId: 'l4', leftLabel: 'Pogonophobia',  rightId: 'r4', rightLabel: 'Fear of beards'          },
        { leftId: 'l5', leftLabel: 'Nomophobia',    rightId: 'r5', rightLabel: 'Fear of no mobile phone' },
        { leftId: 'l6', leftLabel: 'Arithmophobia', rightId: 'r6', rightLabel: 'Fear of numbers'         },
      ],
    },
  ],
};

// ---------------------------------------------------------------------------
// generate
// ---------------------------------------------------------------------------

export function generate(config) {
  const { difficulty = Difficulty.MEDIUM } = config;
  const seed = config.seed ?? `${difficulty}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const rng   = createSeededRandom(seed);
  const bank  = PAIRS_BANK[difficulty] ?? PAIRS_BANK[Difficulty.MEDIUM];

  const template = bank[Math.floor(rng() * bank.length)];
  const pairs    = template.pairs;

  const leftItems  = pairs.map(p => ({ id: p.leftId,  label: p.leftLabel  }));
  const rightItems = shuffleArray(pairs.map(p => ({ id: p.rightId, label: p.rightLabel })), rng);

  const matches = pairs.map(p => ({ leftId: p.leftId, rightId: p.rightId }));

  return {
    puzzleType: PuzzleType.MATCH_PAIRS,
    difficulty,
    seed,
    puzzleData: {
      theme:      template.theme,
      leftItems,
      rightItems, // shuffled — player must match these to left items
    },
    solutionData: {
      matches,
    },
    meta: {
      pairCount: pairs.length,
    },
  };
}

// ---------------------------------------------------------------------------
// validate
// ---------------------------------------------------------------------------

export function validate(input, solution) {
  const submitted = input.matches;
  const correct   = solution.matches;

  if (!Array.isArray(submitted) || submitted.length === 0) {
    return { valid: false, reason: 'No matches submitted.' };
  }

  if (submitted.length !== correct.length) {
    return { valid: false, reason: 'Incorrect number of matches.' };
  }

  // Build a lookup map from the solution for O(1) checks
  const solutionMap = new Map(correct.map(m => [m.leftId, m.rightId]));

  let correctCount = 0;
  for (const match of submitted) {
    if (solutionMap.get(match.leftId) === match.rightId) correctCount++;
  }

  const allCorrect = correctCount === correct.length;

  return {
    valid:        allCorrect,
    reason:       allCorrect ? undefined : `${correctCount} of ${correct.length} matches are correct.`,
    correctCount,
    totalCount:   correct.length,
  };
}

// ---------------------------------------------------------------------------
// score
// ---------------------------------------------------------------------------

export function score({ validationResult, submission }) {
  if (!validationResult.valid) {
    return { completed: false, correct: false, baseScore: 0, bonusScore: 0, penaltyScore: 0, totalScore: 0 };
  }

  const bonusScore = calcTimeBonus(submission.timeTakenSeconds, 25, 60, 240);

  return {
    completed:    true,
    correct:      true,
    baseScore:    70,
    bonusScore,
    penaltyScore: 0,
    totalScore:   70 + bonusScore,
  };
}

export default { generate, validate, score };