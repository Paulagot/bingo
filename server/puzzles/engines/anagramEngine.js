/**
 * Anagram Builder Puzzle Engine
 * server/puzzles/engines/anagramEngine.js
 *
 * Objective: Player sees scrambled letters and must identify the correct word.
 * Generation: Pulls from a word bank keyed by difficulty.
 */

import { createSeededRandom, shuffleArray, normalizeAnswer, calcTimeBonus } from '../utils/puzzleHelpers.js';
import { PuzzleType, Difficulty } from '../puzzleTypes.js';

// ---------------------------------------------------------------------------
// Word bank — load from DB in production, hardcoded for MVP
// ---------------------------------------------------------------------------

const WORD_BANK = {
  [Difficulty.EASY]: [
    { word: 'TIGER',  clue: 'Animal'    },
    { word: 'OCEAN',  clue: 'Nature'    },
    { word: 'BREAD',  clue: 'Food'      },
    { word: 'FLAME',  clue: 'Element'   },
    { word: 'CLOUD',  clue: 'Weather'   },
    { word: 'CHAIR',  clue: 'Furniture' },
    { word: 'PLANT',  clue: 'Nature'    },
    { word: 'STORM',  clue: 'Weather'   },
    { word: 'GRAPE',  clue: 'Food'      },
    { word: 'PIANO',  clue: 'Music'     },
    { word: 'SWORD',  clue: 'Weapon'    },
    { word: 'LEMON',  clue: 'Fruit'     },
    { word: 'HONEY',  clue: 'Food'      },
    { word: 'EAGLE',  clue: 'Animal'    },
    { word: 'RIVER',  clue: 'Nature'    },
    { word: 'PAINT',  clue: 'Art'       },
    { word: 'WATCH',  clue: 'Object'    },
    { word: 'STONE',  clue: 'Nature'    },
    { word: 'MOUSE',  clue: 'Animal'    },
    { word: 'DANCE',  clue: 'Activity'  },
  ],
  [Difficulty.MEDIUM]: [
    { word: 'PLANET',  clue: 'Space'     },
    { word: 'BRIDGE',  clue: 'Structure' },
    { word: 'CASTLE',  clue: 'Building'  },
    { word: 'FOREST',  clue: 'Nature'    },
    { word: 'BOTTLE',  clue: 'Object'    },
    { word: 'ROCKET',  clue: 'Space'     },
    { word: 'SILVER',  clue: 'Material'  },
    { word: 'WINDOW',  clue: 'Building'  },
    { word: 'GARDEN',  clue: 'Nature'    },
    { word: 'MARKET',  clue: 'Place'     },
    { word: 'CANDLE',  clue: 'Object'    },
    { word: 'BUTTER',  clue: 'Food'      },
    { word: 'WINTER',  clue: 'Season'    },
    { word: 'SPRING',  clue: 'Season'    },
    { word: 'PARROT',  clue: 'Animal'    },
    { word: 'MIRROR',  clue: 'Object'    },
    { word: 'FINGER',  clue: 'Body'      },
    { word: 'CARPET',  clue: 'Furniture' },
    { word: 'SUNSET',  clue: 'Nature'    },
    { word: 'PENCIL',  clue: 'Object'    },
  ],
  [Difficulty.HARD]: [
    { word: 'DOLPHIN',  clue: 'Animal'    },
    { word: 'PYRAMID',  clue: 'Structure' },
    { word: 'CAPTAIN',  clue: 'Person'    },
    { word: 'GRAVITY',  clue: 'Science'   },
    { word: 'LANTERN',  clue: 'Object'    },
    { word: 'SILENCE',  clue: 'Concept'   },
    { word: 'VOLCANO',  clue: 'Nature'    },
    { word: 'WARRIOR',  clue: 'Person'    },
    { word: 'CABINET',  clue: 'Furniture' },
    { word: 'BLANKET',  clue: 'Object'    },
    { word: 'COMPASS',  clue: 'Tool'      },
    { word: 'FEATHER',  clue: 'Nature'    },
    { word: 'HARVEST',  clue: 'Farming'   },
    { word: 'JEWEL',    clue: 'Gemstone'  },
    { word: 'KITCHEN',  clue: 'Room'      },
    { word: 'LOBSTER',  clue: 'Animal'    },
    { word: 'MATCHES',  clue: 'Object'    },
    { word: 'NETWORK',  clue: 'Tech'      },
    { word: 'PASSAGE',  clue: 'Place'     },
    { word: 'QUARTER',  clue: 'Amount'    },
  ],
};

// ---------------------------------------------------------------------------
// generate
// ---------------------------------------------------------------------------

/**
 * @param {{ difficulty: string, seed: string }} config
 * @returns {GeneratedPuzzleInstance}
 */
export function generate(config) {
  const { difficulty = Difficulty.MEDIUM } = config;
  const seed = config.seed ?? `${difficulty}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const rng  = createSeededRandom(seed);
  const bank = WORD_BANK[difficulty] ?? WORD_BANK[Difficulty.MEDIUM];

  const { word, clue } = bank[Math.floor(rng() * bank.length)];

  // Scramble — retry if result accidentally equals the original word
  let scrambled = word;
  let attempts  = 0;
  while (scrambled === word && attempts < 20) {
    scrambled = shuffleArray(word.split(''), rng).join('');
    attempts++;
  }

  return {
    puzzleType: PuzzleType.ANAGRAM,
    difficulty,
    seed,
    puzzleData: {
      scrambled,
      letterBank: scrambled.split(''),
      clue,
    },
    solutionData: {
      answer: word,
    },
    meta: {
      wordLength: word.length,
    },
  };
}

// ---------------------------------------------------------------------------
// validate
// ---------------------------------------------------------------------------

/**
 * @param {{ answer: { answer: string } }} input
 * @param {{ answer: string }}             solution
 * @returns {{ valid: boolean, reason?: string }}
 */
export function validate(input, solution) {
  const submitted = normalizeAnswer(input.answer);
  const correct   = normalizeAnswer(solution.answer);

  if (!submitted) return { valid: false, reason: 'No answer provided.' };

  return {
    valid:  submitted === correct,
    reason: submitted !== correct ? 'Incorrect answer.' : undefined,
  };
}

// ---------------------------------------------------------------------------
// score
// ---------------------------------------------------------------------------

/**
 * @param {{ validationResult: object, submission: object }} args
 * @returns {PuzzleScoreResult}
 */
export function score({ validationResult, submission }) {
  if (!validationResult.valid) {
    return { completed: false, correct: false, baseScore: 0, bonusScore: 0, penaltyScore: 0, totalScore: 0 };
  }

  const bonusScore = calcTimeBonus(submission.timeTakenSeconds, 20, 30, 120);

  return {
    completed:    true,
    correct:      true,
    baseScore:    60,
    bonusScore,
    penaltyScore: 0,
    totalScore:   60 + bonusScore,
  };
}

export default { generate, validate, score };