/**
 * Sequence Ordering Puzzle Engine
 * server/puzzles/engines/sequenceOrderingEngine.js
 *
 * Objective: Player drags/reorders a set of items into the correct sequence.
 * Non-quiz — uses observable/measurable progressions (size, duration, etc.)
 */

import { createSeededRandom, shuffleArray, calcTimeBonus } from '../utils/puzzleHelpers.js';
import { PuzzleType, Difficulty } from '../puzzleTypes.js';

// ---------------------------------------------------------------------------
// Sequence template bank
// Each template defines a prompt and items with a pre-determined correct order.
// The `orderedIds` in solutionData are the IDs in correct order (index 0 = first).
// ---------------------------------------------------------------------------

const SEQUENCE_BANK = {
  [Difficulty.EASY]: [
    {
      prompt: 'Order these animals from smallest to largest',
      items: [
        { id: 'a', label: '🐝 Bee'       },
        { id: 'b', label: '🐇 Rabbit'    },
        { id: 'c', label: '🐈 Cat'       },
        { id: 'd', label: '🐕 Dog'       },
        { id: 'e', label: '🐄 Cow'       },
      ],
      orderedIds: ['a', 'b', 'c', 'd', 'e'],
    },
    {
      prompt: 'Order these by number of sides (fewest first)',
      items: [
        { id: 'a', label: 'Triangle'  },
        { id: 'b', label: 'Square'    },
        { id: 'c', label: 'Pentagon'  },
        { id: 'd', label: 'Hexagon'   },
        { id: 'e', label: 'Octagon'   },
      ],
      orderedIds: ['a', 'b', 'c', 'd', 'e'],
    },
  ],
  [Difficulty.MEDIUM]: [
    {
      prompt: 'Order these by duration — shortest first',
      items: [
        { id: 'a', label: '⚡ A lightning strike (~1ms)'    },
        { id: 'b', label: '👁️ A blink (~150ms)'              },
        { id: 'c', label: '🎵 A musical beat (~500ms)'       },
        { id: 'd', label: '🌅 Sunrise (~2 minutes)'          },
        { id: 'e', label: '🌊 Average wave period (~10s)'    },
        { id: 'f', label: '🏃 A 100m sprint (~10s)'          },
      ],
      orderedIds: ['a', 'b', 'c', 'e', 'f', 'd'],
    },
    {
      prompt: 'Order these planets from closest to the Sun',
      items: [
        { id: 'a', label: '🔴 Mars'    },
        { id: 'b', label: '🟤 Mercury' },
        { id: 'c', label: '🌍 Earth'   },
        { id: 'd', label: '⚪ Venus'   },
        { id: 'e', label: '🟠 Jupiter' },
      ],
      orderedIds: ['b', 'd', 'c', 'a', 'e'],
    },
  ],
  [Difficulty.HARD]: [
    {
      prompt: 'Order these by boiling point — lowest first',
      items: [
        { id: 'a', label: 'Nitrogen (-196°C)'  },
        { id: 'b', label: 'Water (100°C)'      },
        { id: 'c', label: 'Ethanol (78°C)'     },
        { id: 'd', label: 'Mercury (357°C)'    },
        { id: 'e', label: 'Iron (2862°C)'      },
        { id: 'f', label: 'Oxygen (-183°C)'    },
        { id: 'g', label: 'Tungsten (5555°C)'  },
      ],
      orderedIds: ['a', 'f', 'c', 'b', 'd', 'e', 'g'],
    },
  ],
};

// ---------------------------------------------------------------------------
// generate
// ---------------------------------------------------------------------------

export function generate(config) {
  const { difficulty = Difficulty.MEDIUM } = config;
  const seed = config.seed ?? `${difficulty}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const rng  = createSeededRandom(seed);
  const bank = SEQUENCE_BANK[difficulty] ?? SEQUENCE_BANK[Difficulty.MEDIUM];

  const template  = bank[Math.floor(rng() * bank.length)];
  // Present items in shuffled order so the player must reorder them
  const shuffled  = shuffleArray(template.items, rng);

  return {
    puzzleType: PuzzleType.SEQUENCE_ORDERING,
    difficulty,
    seed,
    puzzleData: {
      prompt: template.prompt,
      items:  shuffled,
    },
    solutionData: {
      orderedIds: template.orderedIds,
    },
    meta: {
      itemCount: template.items.length,
    },
  };
}

// ---------------------------------------------------------------------------
// validate
// ---------------------------------------------------------------------------

export function validate(input, solution) {
  const submitted = input.orderedIds;
  const correct   = solution.orderedIds;

  if (!Array.isArray(submitted) || submitted.length === 0) {
    return { valid: false, reason: 'No order submitted.' };
  }

  if (submitted.length !== correct.length) {
    return { valid: false, reason: 'Incorrect number of items.' };
  }

  const isCorrect = submitted.every((id, idx) => id === correct[idx]);

  return {
    valid:  isCorrect,
    reason: isCorrect ? undefined : 'Order is incorrect.',
    // How many positions are correct — useful for partial UI feedback
    correctPositions: submitted.filter((id, idx) => id === correct[idx]).length,
    totalPositions:   correct.length,
  };
}

// ---------------------------------------------------------------------------
// score
// ---------------------------------------------------------------------------

export function score({ validationResult, submission }) {
  if (!validationResult.valid) {
    return { completed: false, correct: false, baseScore: 0, bonusScore: 0, penaltyScore: 0, totalScore: 0 };
  }

  const bonusScore = calcTimeBonus(submission.timeTakenSeconds, 25, 45, 180);

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