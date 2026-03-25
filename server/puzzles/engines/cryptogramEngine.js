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

/**
 * Apply a cipher map to a string — non-alpha characters pass through unchanged.
 */
function applycipher(text, map) {
  return text.split('').map(ch => map.get(ch) ?? ch).join('');
}

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
  const encoded = applycipher(phrase, encode);

  // Build a frequency hint: show how many unique letters are in the phrase
  const uniqueLetters = new Set(phrase.replace(/[^A-Z]/g, '').split('')).size;

  // Pre-reveal one letter as a starter hint (the most frequent letter)
  const letterFreq = {};
  for (const ch of phrase) {
    if (/[A-Z]/.test(ch)) letterFreq[ch] = (letterFreq[ch] ?? 0) + 1;
  }
  const mostFrequent = Object.entries(letterFreq).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'E';
  const revealedCipherLetter = encode.get(mostFrequent);

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
      hint: {
        cipherLetter:   revealedCipherLetter,  // the encoded letter
        plainLetter:    mostFrequent,           // what it decodes to
      },
    },
    solutionData: {
      plainText:  phrase,
      cipherMap:  cipherMapObj,   // encode map for server-side validation
    },
    meta: { phraseLength: phrase.length, uniqueLetters },
  };
}

// ---------------------------------------------------------------------------
// validate
// ---------------------------------------------------------------------------

export function validate(playerAnswer, solutionData) {
  const submitted = (playerAnswer?.decoded ?? '').trim().toUpperCase().replace(/\s+/g, ' ');
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

export function score({ validationResult, submission }) {
  if (!validationResult.valid) return { completed: false, correct: false, baseScore: 0, bonusScore: 0, penaltyScore: 0, totalScore: 0 };
  // Full bonus within 2 min, decays to 0 at 10 min
  const bonusScore = calcTimeBonus(submission.timeTakenSeconds, 25, 120, 600);
  return { completed: true, correct: true, baseScore: 75, bonusScore, penaltyScore: 0, totalScore: 75 + bonusScore };
}

export default { generate, validate, score };