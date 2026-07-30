/**
 * Cryptogram Puzzle Engine
 * server/puzzles/engines/cryptogramEngine.js
 *
 * A short phrase is encoded by substituting each letter with a different one.
 * Player decodes the phrase by figuring out the cipher.
 */

import { createSeededRandom, shuffleArray, pickRandom, calcTimeBonus } from '../utils/puzzleHelpers.js';
import { PuzzleType, Difficulty } from '../puzzleTypes.js';

// ---------------------------------------------------------------------------
// Phrase banks by difficulty
// ---------------------------------------------------------------------------

const PHRASES = {
  [Difficulty.EASY]: [
    'THE SUN RISES IN THE EAST',
    'EVERY DOG HAS ITS DAY',
    'BETTER LATE THAN NEVER',
    'ALL THAT GLITTERS IS NOT GOLD',
    'ACTIONS SPEAK LOUDER THAN WORDS',
    'LOOK BEFORE YOU LEAP',
    'TIME FLIES WHEN YOU HAVE FUN',
    'THE EARLY BIRD CATCHES THE WORM',
  ],
  [Difficulty.MEDIUM]: [
    'FORTUNE FAVOURS THE BRAVE',
    'KNOWLEDGE IS POWER',
    'WHERE THERE IS A WILL THERE IS A WAY',
    'THE PEN IS MIGHTIER THAN THE SWORD',
    'GREAT MINDS THINK ALIKE',
    'PRACTICE MAKES PERFECT',
    'TWO WRONGS DO NOT MAKE A RIGHT',
    'NECESSITY IS THE MOTHER OF INVENTION',
  ],
  [Difficulty.HARD]: [
    'IN THE MIDDLE OF DIFFICULTY LIES OPPORTUNITY',
    'IMAGINATION IS MORE IMPORTANT THAN KNOWLEDGE',
    'THE ONLY WAY TO DO GREAT WORK IS TO LOVE WHAT YOU DO',
    'IT DOES NOT MATTER HOW SLOWLY YOU GO AS LONG AS YOU DO NOT STOP',
    'SUCCESS IS NOT FINAL FAILURE IS NOT FATAL IT IS THE COURAGE TO CONTINUE THAT COUNTS',
    'THE GREATEST GLORY IN LIVING LIES NOT IN NEVER FALLING BUT IN RISING EVERY TIME WE FALL',
  ],
};

// Number of starter letters revealed for free, scaled by difficulty - a
// short easy phrase with only one free letter is still a genuinely hard
// substitution-cipher puzzle for a casual/quick daily play; hard phrases
// have enough length that one hint is plenty.
const STARTER_HINT_COUNTS = {
  [Difficulty.EASY]:   3,
  [Difficulty.MEDIUM]: 2,
  [Difficulty.HARD]:   1,
};

// ---------------------------------------------------------------------------
// Phrase bank self-check - runs once at module load.
// ---------------------------------------------------------------------------

function assertValidPhrase(difficulty, phrase, index) {
  const label = `${difficulty} phrase #${index}`;
  if (typeof phrase !== 'string' || phrase.trim() === '') {
    throw new Error(`${label}: must be a non-empty string.`);
  }
  if (!/^[A-Z ]+$/.test(phrase)) {
    throw new Error(`${label}: must contain only A-Z and spaces ("${phrase}").`);
  }
  const uniqueLetters = new Set(phrase.replace(/[^A-Z]/g, '')).size;
  if (uniqueLetters < STARTER_HINT_COUNTS[difficulty] + 1) {
    throw new Error(`${label}: only has ${uniqueLetters} unique letters, not enough to leave a puzzle after ${STARTER_HINT_COUNTS[difficulty]} starter hints.`);
  }
}

function validateAllPhrases() {
  for (const difficulty of Object.keys(PHRASES)) {
    PHRASES[difficulty].forEach((phrase, i) => assertValidPhrase(difficulty, phrase, i));
  }
}

validateAllPhrases();

// ---------------------------------------------------------------------------
// Build a substitution cipher from a seed
// ---------------------------------------------------------------------------

/**
 * Generate a random letter-to-letter substitution map.
 * Every letter maps to a DIFFERENT letter (no fixed points).
 * Returns { encode: Map<string,string>, decode: Map<string,string> }
 */
function buildCipher(rng) {
  const alpha   = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
  let shuffled  = shuffleArray([...alpha], rng);

  // Ensure no letter maps to itself (derangement)
  for (let i = 0; i < alpha.length; i++) {
    if (shuffled[i] === alpha[i]) {
      // Swap with next (wrapping) to break the fixed point
      const j        = (i + 1) % alpha.length;
      const tmp      = shuffled[i];
      shuffled[i]    = shuffled[j];
      shuffled[j]    = tmp;
    }
  }

  const encode = new Map();
  const decode = new Map();
  for (let i = 0; i < alpha.length; i++) {
    encode.set(alpha[i],    shuffled[i]);
    decode.set(shuffled[i], alpha[i]);
  }
  return { encode, decode };
}

// Runtime self-check for the *generated* cipher (the phrase bank check above
// is static; this one runs every call since the cipher is procedural).
function assertValidCipher(encode) {
  if (encode.size !== 26) {
    throw new Error(`Generated cipher only maps ${encode.size} of 26 letters.`);
  }
  const seen = new Set();
  for (const [plain, cipher] of encode) {
    if (plain === cipher) {
      throw new Error(`Generated cipher has a fixed point: ${plain} -> ${cipher}.`);
    }
    if (seen.has(cipher)) {
      throw new Error(`Generated cipher is not a bijection: ${cipher} is used more than once.`);
    }
    seen.add(cipher);
  }
}

/**
 * Apply a cipher map to a string - non-alpha characters pass through unchanged.
 */
function applyCipher(text, map) {
  return text.split('').map(ch => map.get(ch) ?? ch).join('');
}

// ---------------------------------------------------------------------------
// Scoring settings scale with phrase length / difficulty
// ---------------------------------------------------------------------------

const DIFFICULTY_SETTINGS = {
  [Difficulty.EASY]:   { baseScore: 55,  bonusIdeal: 20, bonusGood: 75,  bonusMax: 360 },
  [Difficulty.MEDIUM]: { baseScore: 75,  bonusIdeal: 25, bonusGood: 120, bonusMax: 600 },
  [Difficulty.HARD]:   { baseScore: 110, bonusIdeal: 45, bonusGood: 240, bonusMax: 1200 },
};

// ---------------------------------------------------------------------------
// generate
// ---------------------------------------------------------------------------

export function generate(config) {
  const { difficulty = Difficulty.MEDIUM } = config;
  const seed = config.seed ?? `cryptogram-${difficulty}-${Date.now()}-${Math.random().toString(36).slice(2)}`;

  const rng    = createSeededRandom(seed);
  const bank   = PHRASES[difficulty] ?? PHRASES[Difficulty.MEDIUM];
  const phrase = pickRandom(bank, rng);

  const { encode, decode } = buildCipher(rng);
  assertValidCipher(encode);

  const encoded = applyCipher(phrase, encode);

  // Build a frequency hint: show how many unique letters are in the phrase
  const uniqueLetters = new Set(phrase.replace(/[^A-Z]/g, '').split('')).size;

  // Pre-reveal the N most frequent letters as starter hints, N scaled by
  // difficulty (see STARTER_HINT_COUNTS above).
  const letterFreq = {};
  for (const ch of phrase) {
    if (/[A-Z]/.test(ch)) letterFreq[ch] = (letterFreq[ch] ?? 0) + 1;
  }
  const byFrequency = Object.entries(letterFreq)
    .sort((a, b) => b[1] - a[1])
    .map(([letter]) => letter);

  const hintCount = Math.min(STARTER_HINT_COUNTS[difficulty] ?? 1, byFrequency.length);
  const hints = byFrequency.slice(0, hintCount).map(plainLetter => ({
    cipherLetter: encode.get(plainLetter),
    plainLetter,
  }));

  // Build the cipher map as a plain object for storage
  const cipherMapObj = {};
  for (const [k, v] of encode.entries()) cipherMapObj[k] = v;

  return {
    puzzleType: PuzzleType.CRYPTOGRAM,
    difficulty,
    seed,
    puzzleData: {
      encoded,                    // the encoded phrase shown to the player
      uniqueLetters,              // how many unique letters to solve
      hints,                      // [{cipherLetter, plainLetter}, ...] starter hints
    },
    solutionData: {
      plainText:  phrase,
      cipherMap:  cipherMapObj,   // encode map for server-side validation
    },
    meta: { phraseLength: phrase.length, uniqueLetters, hintCount },
  };
}

// ---------------------------------------------------------------------------
// validate
// ---------------------------------------------------------------------------

export function validate(playerAnswer, solutionData) {
  const rawDecoded = playerAnswer?.decoded;
  const submitted = (typeof rawDecoded === 'string' ? rawDecoded : '').trim().toUpperCase().replace(/\s+/g, ' ');
  const correct   = solutionData.plainText.trim().toUpperCase().replace(/\s+/g, ' ');

  if (!submitted) return { valid: false, reason: 'No answer submitted.' };

  return {
    valid:  submitted === correct,
    reason: submitted !== correct ? 'Decoded phrase does not match.' : undefined,
  };
}

// ---------------------------------------------------------------------------
// score
// ---------------------------------------------------------------------------

export function score({ validationResult, submission, difficulty }) {
  if (!validationResult.valid) return { completed: false, correct: false, baseScore: 0, bonusScore: 0, penaltyScore: 0, totalScore: 0 };

  const settings = DIFFICULTY_SETTINGS[difficulty] ?? DIFFICULTY_SETTINGS[Difficulty.MEDIUM];
  const bonusScore = calcTimeBonus(submission.timeTakenSeconds, settings.bonusIdeal, settings.bonusGood, settings.bonusMax);

  return {
    completed: true,
    correct: true,
    baseScore: settings.baseScore,
    bonusScore,
    penaltyScore: 0,
    totalScore: settings.baseScore + bonusScore,
  };
}

export default { generate, validate, score };