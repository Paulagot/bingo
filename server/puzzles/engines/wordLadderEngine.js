/**
 * Word Ladder Puzzle Engine
 * server/puzzles/engines/wordLadderEngine.js
 *
 * Player must transform a start word into an end word.
 * Each step must:
 *   - be the same length
 *   - be a real allowed word
 *   - change exactly one letter from the previous word
 *
 * Difficulty:
 *   Easy   = 4-letter words, 4 moves
 *   Medium = 4-letter words, 5 moves
 *   Hard   = 5-letter words, 6 moves
 */

import { createSeededRandom, shuffleArray, calcTimeBonus } from '../utils/puzzleHelpers.js';
import { PuzzleType, Difficulty } from '../puzzleTypes.js';

// ---------------------------------------------------------------------------
// Ladder bank
// ---------------------------------------------------------------------------
//
// solutionPath includes both start and end.
// moves = solutionPath.length - 1.
// player middle blanks = solutionPath.length - 2.
//

const WORD_LADDER_BANK = {
  [Difficulty.EASY]: [
    {
      theme: 'Animal trail',
      startWord: 'COLD',
      endWord: 'WARM',
      solutionPath: ['COLD', 'CORD', 'WORD', 'WARD', 'WARM'],
    },
    {
      theme: 'Day to night',
      startWord: 'DARK',
      endWord: 'DAWN',
      solutionPath: ['DARK', 'DARN', 'DAWN'],
      // This one is too short, so do not use unless you want quick warmups.
      disabled: true,
    },
    {
      theme: 'Change the mood',
      startWord: 'SOUR',
      endWord: 'SWEET',
      disabled: true,
      solutionPath: ['SOUR', 'SOAR', 'SEAR', 'SEAT', 'SWAT', 'SWEET'],
    },
    {
      theme: 'From rain to shine',
      startWord: 'RAIN',
      endWord: 'SHIN',
      solutionPath: ['RAIN', 'RUIN', 'SUIN', 'SHIN'],
      disabled: true,
    },
    {
      theme: 'Food swap',
      startWord: 'CAKE',
      endWord: 'FISH',
      solutionPath: ['CAKE', 'FAKE', 'FATE', 'FIST', 'FISH'],
    },
    {
      theme: 'Garden path',
      startWord: 'SEED',
      endWord: 'TREE',
      solutionPath: ['SEED', 'SEEK', 'TEEK', 'TREK', 'TREE'],
      disabled: true,
    },
    {
      theme: 'Quick change',
      startWord: 'HEAD',
      endWord: 'TAIL',
      solutionPath: ['HEAD', 'HEAL', 'TEAL', 'TALL', 'TAIL'],
    },
  ],

  [Difficulty.MEDIUM]: [
    {
      theme: 'Weather shift',
      startWord: 'RAIN',
      endWord: 'SNOW',
      solutionPath: ['RAIN', 'RUIN', 'ROIN', 'ROON', 'SOON', 'SNOW'],
      disabled: true,
    },
    {
      theme: 'From fire to cold',
      startWord: 'FIRE',
      endWord: 'COLD',
      solutionPath: ['FIRE', 'FIVE', 'HIVE', 'HIDE', 'HOLD', 'COLD'],
    },
    {
      theme: 'From work to play',
      startWord: 'WORK',
      endWord: 'PLAY',
      solutionPath: ['WORK', 'PORK', 'PARK', 'PART', 'PLAT', 'PLAY'],
    },
    {
      theme: 'From lost to found',
      startWord: 'LOST',
      endWord: 'FIND',
      solutionPath: ['LOST', 'LIST', 'FIST', 'FINS', 'FIND'],
      disabled: true,
    },
    {
      theme: 'From slow to fast',
      startWord: 'SLOW',
      endWord: 'FAST',
      solutionPath: ['SLOW', 'SLOT', 'SOOT', 'FOOT', 'FORT', 'FAST'],
    },
  ],

  [Difficulty.HARD]: [
    {
      theme: 'Stone to money',
      startWord: 'STONE',
      endWord: 'MONEY',
      solutionPath: ['STONE', 'SHONE', 'SHORE', 'SCORE', 'SCARE', 'MAREY', 'MONEY'],
      disabled: true,
    },
    {
      theme: 'From light to night',
      startWord: 'LIGHT',
      endWord: 'NIGHT',
      solutionPath: ['LIGHT', 'MIGHT', 'NIGHT'],
      disabled: true,
    },
    {
      theme: 'Shape shift',
      startWord: 'SHAPE',
      endWord: 'TRACE',
      solutionPath: ['SHAPE', 'SHARE', 'SCARE', 'SCORE', 'STORE', 'STARE', 'TRACE'],
      disabled: true,
    },
    {
      theme: 'Ocean change',
      startWord: 'WATER',
      endWord: 'EARTH',
      solutionPath: ['WATER', 'WAVER', 'WAGER', 'EAGER', 'EATER', 'EARTH'],
      disabled: true,
    },
    {
      theme: 'Brain teaser',
      startWord: 'SMART',
      endWord: 'BRAIN',
      solutionPath: ['SMART', 'START', 'STARK', 'STACK', 'BLACK', 'BRACK', 'BRAIN'],
      disabled: true,
    },
  ],
};

// ---------------------------------------------------------------------------
// Safer curated bank
// ---------------------------------------------------------------------------
//
// The above shows possible ideas, but some ladders include obscure/non-words.
// This production bank below uses common, safer paths.
//
// Easy = 4 moves.
// Medium = 5 moves.
// Hard = 6 moves.
//

const CURATED_WORD_LADDER_BANK = {
  [Difficulty.EASY]: [
    {
      theme: 'Cold to warm',
      startWord: 'COLD',
      endWord: 'WARM',
      solutionPath: ['COLD', 'CORD', 'WORD', 'WARD', 'WARM'],
    },
    {
      theme: 'Head to tail',
      startWord: 'HEAD',
      endWord: 'TAIL',
      // FIX: original path jumped HEAD,HEAL,TEAL,TALL,TAIL - TEAL->TALL
      // changes two letters at once (pos2 E->A AND pos3 A->L). Bridged
      // with TELL so every step changes exactly one letter.
      solutionPath: ['HEAD', 'HEAL', 'TEAL', 'TELL', 'TALL', 'TAIL'],
    },
    {
      theme: 'Cake to fish',
      startWord: 'CAKE',
      endWord: 'FISH',
      // FIX: original path jumped FATE->FIST - changes THREE letters at
      // once (pos2 A->I, pos3 T->S, pos4 E->T). This one was missed in an
      // earlier manual review pass and only caught once the automated
      // self-check above existed - exactly the case that check is for.
      // Replaced with a different, fully-verified route (CASE/CASH/WASH/
      // WISH bridge CAKE to FISH, which share no letters in common
      // positions, so no shorter bridge was readily available).
      solutionPath: ['CAKE', 'CASE', 'CASH', 'WASH', 'WISH', 'FISH'],
    },
    {
      theme: 'Same to safe',
      startWord: 'SAME',
      endWord: 'SAFE',
      solutionPath: ['SAME', 'CAME', 'CAVE', 'SAVE', 'SAFE'],
    },
  ],

  [Difficulty.MEDIUM]: [
    {
      theme: 'Work to play',
      startWord: 'WORK',
      endWord: 'PLAY',
      // FIX: original path jumped PART->PLAT - changes two letters at once
      // (pos2 A->L AND pos3 R->A). Bridged with PERT, PEAT.
      solutionPath: ['WORK', 'PORK', 'PARK', 'PART', 'PERT', 'PEAT', 'PLAT', 'PLAY'],
    },
    {
      theme: 'Fire to cold',
      startWord: 'FIRE',
      endWord: 'COLD',
      // FIX: original path jumped HIDE->HOLD - changes THREE letters at
      // once (pos2 I->O, pos3 D->L, pos4 E->D), the worst break in this
      // bank. No clean short bridge existed for that pair, so replaced
      // with a different, shorter, fully-verified route instead.
      solutionPath: ['FIRE', 'FORE', 'FORD', 'CORD', 'COLD'],
    },
    {
      theme: 'Slow to fast',
      startWord: 'SLOW',
      endWord: 'FAST',
      // FIX: original path jumped FORT->FAST - changes two letters at once
      // (pos2 O->A AND pos3 R->S). Bridged with PORT, PART, PAST
      // (deliberately avoiding the shorter FORT->FART->FAST bridge, which
      // works letter-wise but isn't family-puzzle-appropriate).
      solutionPath: ['SLOW', 'SLOT', 'SOOT', 'FOOT', 'FORT', 'PORT', 'PART', 'PAST', 'FAST'],
    },
    {
      theme: 'Love to hate',
      startWord: 'LOVE',
      endWord: 'HATE',
      solutionPath: ['LOVE', 'HOVE', 'HAVE', 'HATE'],
      disabled: true,
    },
  ],

  [Difficulty.HARD]: [
    {
      theme: 'Stone to shore',
      startWord: 'STONE',
      endWord: 'SHORE',
      solutionPath: ['STONE', 'SHONE', 'SHORE'],
      disabled: true,
    },
    {
      theme: 'Heart to brain',
      startWord: 'HEART',
      endWord: 'BRAIN',
      solutionPath: ['HEART', 'HEARD', 'BEARD', 'BOARD', 'BROAD', 'BRAIN'],
      disabled: true,
    },
    {
      theme: 'Angel to devil',
      startWord: 'ANGEL',
      endWord: 'DEVIL',
      solutionPath: ['ANGEL', 'ANGER', 'DANGER', 'DANGLE', 'DINGLE', 'DINGE', 'DEVIL'],
      disabled: true,
    },
  ],
};

// ---------------------------------------------------------------------------
// Final production bank
// ---------------------------------------------------------------------------
//
// I am keeping the live bank deliberately conservative.
// Every word in a path must be valid and common enough for players.
// Hard 5-letter ladders are much harder to curate safely, so this bank uses
// 4-letter medium-style ladders for now unless you have a dictionary service.
// This avoids impossible or unfair puzzles.
//
// If you later add a real word graph/dictionary generator, hard can become
// genuine 5-letter dynamic ladders.
//

const LIVE_WORD_LADDER_BANK = {
  [Difficulty.EASY]: [
    {
      theme: 'Cold to warm',
      startWord: 'COLD',
      endWord: 'WARM',
      solutionPath: ['COLD', 'CORD', 'WORD', 'WARD', 'WARM'],
    },
    {
      theme: 'Head to tail',
      startWord: 'HEAD',
      endWord: 'TAIL',
      // FIX: see CURATED_WORD_LADDER_BANK above - TEAL->TALL was a
      // two-letter jump. Bridged with TELL.
      solutionPath: ['HEAD', 'HEAL', 'TEAL', 'TELL', 'TALL', 'TAIL'],
    },
    {
      theme: 'Same to safe',
      startWord: 'SAME',
      endWord: 'SAFE',
      solutionPath: ['SAME', 'CAME', 'CAVE', 'SAVE', 'SAFE'],
    },
  ],

  [Difficulty.MEDIUM]: [
    {
      theme: 'Work to play',
      startWord: 'WORK',
      endWord: 'PLAY',
      // FIX: PART->PLAT was a two-letter jump. Bridged with PERT, PEAT.
      solutionPath: ['WORK', 'PORK', 'PARK', 'PART', 'PERT', 'PEAT', 'PLAT', 'PLAY'],
    },
    {
      theme: 'Fire to cold',
      startWord: 'FIRE',
      endWord: 'COLD',
      // FIX: HIDE->HOLD was a three-letter jump - the worst break in this
      // bank. Replaced with a different, shorter, fully-verified route.
      solutionPath: ['FIRE', 'FORE', 'FORD', 'CORD', 'COLD'],
    },
    {
      theme: 'Slow to fast',
      startWord: 'SLOW',
      endWord: 'FAST',
      // FIX: FORT->FAST was a two-letter jump. Bridged with PORT, PART, PAST.
      solutionPath: ['SLOW', 'SLOT', 'SOOT', 'FOOT', 'FORT', 'PORT', 'PART', 'PAST', 'FAST'],
    },
  ],

  [Difficulty.HARD]: [
    {
      theme: 'Cold to fire',
      startWord: 'COLD',
      endWord: 'FIRE',
      solutionPath: ['COLD', 'CORD', 'WORD', 'WORE', 'WIRE', 'FIRE'],
    },
    {
      theme: 'Lost to find',
      startWord: 'LOST',
      endWord: 'FIND',
      solutionPath: ['LOST', 'LIST', 'FIST', 'FIND'],
      disabled: true,
    },
    {
      theme: 'Game to win',
      startWord: 'GAME',
      endWord: 'WINS',
      solutionPath: ['GAME', 'FAME', 'FINE', 'WINE', 'WINS'],
      disabled: true,
    },
  ],
};

// ---------------------------------------------------------------------------
// Bank self-check - runs once at module load, same fail-fast pattern used by
// nonogramEngine and numberPathEngine. This is what would have caught the
// broken ladders (steps that silently changed two or three letters at once)
// immediately at server startup instead of shipping an unsolvable puzzle
// that even a player who knew the answer couldn't submit. Only checks
// non-disabled entries - anything marked `disabled: true` is deliberately
// excluded from the runtime pool and doesn't need to be valid to sit here
// as a reference/draft. Relies on function hoisting: normaliseWord and
// differByOneLetter are declared further down this file but are available
// here at call time since `function` declarations are hoisted.
// ---------------------------------------------------------------------------

function assertValidLadder(bankName, difficulty, entry, index) {
  const label = `${bankName}.${difficulty}[${index}] ("${entry.theme}")`;

  if (!Array.isArray(entry.solutionPath) || entry.solutionPath.length < 2) {
    throw new Error(`${label}: solutionPath must have at least 2 words.`);
  }

  const path = entry.solutionPath.map(normaliseWord);
  const wordLength = path[0].length;

  for (let i = 0; i < path.length; i++) {
    if (path[i].length !== wordLength) {
      throw new Error(`${label}: "${path[i]}" is ${path[i].length} letters, expected ${wordLength} (every word in a ladder must be the same length).`);
    }
  }

  if (path[0] !== normaliseWord(entry.startWord)) {
    throw new Error(`${label}: solutionPath[0] ("${path[0]}") does not match startWord ("${entry.startWord}").`);
  }
  if (path[path.length - 1] !== normaliseWord(entry.endWord)) {
    throw new Error(`${label}: solutionPath's last word ("${path[path.length - 1]}") does not match endWord ("${entry.endWord}").`);
  }

  for (let i = 1; i < path.length; i++) {
    if (!differByOneLetter(path[i - 1], path[i])) {
      throw new Error(`${label}: step ${i} ("${path[i - 1]}" -> "${path[i]}") does not change exactly one letter.`);
    }
  }
}

function validateLadderBank(bankName, bank) {
  for (const difficulty of Object.keys(bank)) {
    bank[difficulty].forEach((entry, i) => {
      if (entry.disabled) return;
      assertValidLadder(bankName, difficulty, entry, i);
    });
  }
}

validateLadderBank('CURATED_WORD_LADDER_BANK', CURATED_WORD_LADDER_BANK);
validateLadderBank('LIVE_WORD_LADDER_BANK', LIVE_WORD_LADDER_BANK);

// Flatten all valid solution words into an allowed dictionary.
// This is conservative. It means the engine validates against known words
// used in curated ladders. Later you can replace this with a bigger dictionary.
function buildAllowedWords() {
  const words = new Set();

  for (const difficulty of Object.values(Difficulty)) {
    const entries = LIVE_WORD_LADDER_BANK[difficulty] ?? [];

    for (const entry of entries) {
      if (entry.disabled) continue;

      for (const word of entry.solutionPath) {
        words.add(word.toUpperCase());
      }
    }
  }

  return words;
}

const ALLOWED_WORDS = buildAllowedWords();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function normaliseWord(value) {
  return String(value ?? '')
    .toUpperCase()
    .replace(/[^A-Z]/g, '');
}

function differByOneLetter(a, b) {
  const wordA = normaliseWord(a);
  const wordB = normaliseWord(b);

  if (wordA.length !== wordB.length) return false;

  let differences = 0;

  for (let i = 0; i < wordA.length; i++) {
    if (wordA[i] !== wordB[i]) differences++;

    if (differences > 1) return false;
  }

  return differences === 1;
}

function getValidBank(difficulty) {
  const bank = LIVE_WORD_LADDER_BANK[difficulty] ?? LIVE_WORD_LADDER_BANK[Difficulty.EASY];
  return bank.filter(entry => !entry.disabled);
}

function pickPuzzle(difficulty, rng) {
  const bank = getValidBank(difficulty);
  const shuffled = shuffleArray(bank, rng);
  return shuffled[0];
}

function getExpectedMiddleSteps(solutionPath) {
  return Math.max(0, solutionPath.length - 2);
}

function getMoveCount(solutionPath) {
  return Math.max(0, solutionPath.length - 1);
}

function validateStepShape(steps, wordLength) {
  if (!Array.isArray(steps)) {
    return { valid: false, reason: 'No ladder submitted.' };
  }

  if (steps.length < 3) {
    return { valid: false, reason: 'The ladder must include a start word, at least one step, and an end word.' };
  }

  for (const step of steps) {
    const word = normaliseWord(step);

    if (word.length !== wordLength) {
      return {
        valid: false,
        reason: `Every word must be ${wordLength} letters long.`,
      };
    }
  }

  return { valid: true };
}

// Scoring settings scale with word length / step count - previously flat
// regardless of difficulty (4-letter/4-step easy scored the same as
// 5-letter/6-step hard).
const DIFFICULTY_SETTINGS = {
  [Difficulty.EASY]:   { baseScore: 60,  bonusIdeal: 20, bonusGood: 35, bonusMax: 130, stepBonus: 15 },
  [Difficulty.MEDIUM]: { baseScore: 85,  bonusIdeal: 25, bonusGood: 45, bonusMax: 240, stepBonus: 20 },
  [Difficulty.HARD]:   { baseScore: 115, bonusIdeal: 35, bonusGood: 60, bonusMax: 340, stepBonus: 30 },
};

// ---------------------------------------------------------------------------
// generate
// ---------------------------------------------------------------------------

export function generate(config) {
  const { difficulty = Difficulty.MEDIUM } = config;

  const seed = config.seed
    ?? `wordLadder-${difficulty}-${Date.now()}-${Math.random().toString(36).slice(2)}`;

  const rng = createSeededRandom(seed);
  const selected = pickPuzzle(difficulty, rng);

  if (!selected) {
    throw new Error(`No word ladder configured for difficulty: ${difficulty}`);
  }

  const solutionPath = selected.solutionPath.map(normaliseWord);
  const startWord = normaliseWord(selected.startWord);
  const endWord = normaliseWord(selected.endWord);
  const wordLength = startWord.length;
  const minSteps = getMoveCount(solutionPath);
  const middleStepCount = getExpectedMiddleSteps(solutionPath);

  return {
    puzzleType: PuzzleType.WORD_LADDER,
    difficulty,
    seed,

    puzzleData: {
      theme: selected.theme,
      startWord,
      endWord,
      wordLength,
      minSteps,
      middleStepCount,
      starterRows: middleStepCount,
      maxExtraSteps: difficulty === Difficulty.EASY ? 2 : 3,
    },

    solutionData: {
      solutionPath,
      allowedWords: [...ALLOWED_WORDS],
      minSteps,
      wordLength,
    },

    meta: {
      theme: selected.theme,
      wordLength,
      minSteps,
      middleStepCount,
    },
  };
}

// ---------------------------------------------------------------------------
// validate
// ---------------------------------------------------------------------------

export function validate(playerAnswer, solutionData) {
  const submittedRaw = playerAnswer?.steps;
  const solutionPath = solutionData?.solutionPath ?? [];
  const allowedWords = new Set((solutionData?.allowedWords ?? []).map(normaliseWord));
  const wordLength = Number(solutionData?.wordLength ?? solutionPath?.[0]?.length ?? 4);

  const shapeValidation = validateStepShape(submittedRaw, wordLength);
  if (!shapeValidation.valid) return shapeValidation;

  const submitted = submittedRaw.map(normaliseWord);
  const startWord = solutionPath[0];
  const endWord = solutionPath[solutionPath.length - 1];

  if (submitted[0] !== startWord) {
    return { valid: false, reason: `The ladder must start with ${startWord}.` };
  }

  if (submitted[submitted.length - 1] !== endWord) {
    return { valid: false, reason: `The ladder must end with ${endWord}.` };
  }

  for (let i = 0; i < submitted.length; i++) {
    const word = submitted[i];

    if (!allowedWords.has(word)) {
      return { valid: false, reason: `${word} is not in the allowed word list.` };
    }
  }

  for (let i = 1; i < submitted.length; i++) {
    if (!differByOneLetter(submitted[i - 1], submitted[i])) {
      return {
        valid: false,
        reason: `${submitted[i - 1]} to ${submitted[i]} must change exactly one letter.`,
      };
    }
  }

  return {
    valid: true,
    usedSteps: submitted.length - 1,
    minSteps: Number(solutionData?.minSteps ?? solutionPath.length - 1),
    isOptimal: submitted.length === solutionPath.length,
  };
}

// ---------------------------------------------------------------------------
// score
// ---------------------------------------------------------------------------

export function score({ validationResult, submission, difficulty }) {
  if (!validationResult.valid) {
    return {
      completed: false,
      correct: false,
      baseScore: 0,
      bonusScore: 0,
      penaltyScore: 0,
      totalScore: 0,
    };
  }

  const settings = DIFFICULTY_SETTINGS[difficulty] ?? DIFFICULTY_SETTINGS[Difficulty.MEDIUM];
  const timeTakenSeconds = Number(submission.timeTakenSeconds ?? 0);

  const timeBonus = calcTimeBonus(timeTakenSeconds, settings.bonusIdeal, settings.bonusGood, settings.bonusMax);
  const stepBonus = validationResult.isOptimal ? settings.stepBonus : 0;

  return {
    completed: true,
    correct: true,
    baseScore: settings.baseScore,
    bonusScore: timeBonus + stepBonus,
    penaltyScore: 0,
    totalScore: settings.baseScore + timeBonus + stepBonus,
  };
}

export default { generate, validate, score };