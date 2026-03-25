/**
 * Word Ladder Puzzle Engine
 * server/puzzles/engines/wordLadderEngine.js
 */

import { createSeededRandom, pickRandom, calcTimeBonus } from '../utils/puzzleHelpers.js';
import { PuzzleType, Difficulty } from '../puzzleTypes.js';

const LADDER_PAIRS = {
  [Difficulty.EASY]: [
    { start: 'CAT', end: 'DOG', minSteps: 4 },
    { start: 'HOT', end: 'COT', minSteps: 2 },
    { start: 'BIG', end: 'PIG', minSteps: 2 },
    { start: 'HAT', end: 'BAT', minSteps: 2 },
    { start: 'TOP', end: 'POP', minSteps: 2 },
    { start: 'WET', end: 'SET', minSteps: 2 },
    { start: 'MAP', end: 'CAP', minSteps: 2 },
    { start: 'RUN', end: 'BUN', minSteps: 2 },
  ],
  [Difficulty.MEDIUM]: [
    { start: 'COLD', end: 'WARM', minSteps: 4 },
    { start: 'LOVE', end: 'HATE', minSteps: 4 },
    { start: 'FISH', end: 'BIRD', minSteps: 4 },
    { start: 'FOUR', end: 'FIVE', minSteps: 4 },
    { start: 'MILK', end: 'WINE', minSteps: 4 },
    { start: 'LEAD', end: 'GOLD', minSteps: 4 },
    { start: 'HARD', end: 'SOFT', minSteps: 4 },
    { start: 'DARK', end: 'LARK', minSteps: 2 },
  ],
  [Difficulty.HARD]: [
    { start: 'BLACK', end: 'WHITE', minSteps: 5 },
    { start: 'BREAD', end: 'TOAST', minSteps: 5 },
    { start: 'SLEEP', end: 'DREAM', minSteps: 5 },
    { start: 'RIVER', end: 'SHORE', minSteps: 5 },
    { start: 'LIGHT', end: 'NIGHT', minSteps: 3 },
    { start: 'STONE', end: 'STORE', minSteps: 3 },
  ],
};

// Compact valid word sets per length for validation
const VALID_3 = new Set(['CAT','BAT','BAD','BID','BIG','PIG','CAR','BAR','BUS','DAY','SAY','SUN','GUN','WET','SET','SAT','DRY','TOP','POP','POT','DOT','DOG','HOG','HOT','HAT','MAN','MAT','MAD','MOB','BOX','FOX','HOP','COT','MOP','HAM','HIT','SIT','TIN','TAN','TAP','TAB','CAB','CUT','GUT','BUN','FUN','CAN','COG','LOG','LOT','LID','LAD','PAT','PAN','PEN','TEN','HEN','NEW','COW','BOW','ROW','SAW','MAP','CAP','RUN','NUN','NUN','BUN','PUN','SUN','NUT','BUT','CUT','RUT','PUT','JUT','GUT']);
const VALID_4 = new Set(['COLD','CORD','CORE','CARE','DARE','LATE','LIME','LINE','WINE','MINE','MILE','BIKE','LIKE','LIFT','LOFT','SOFT','SORT','SORE','MORE','MARE','BARE','BARK','DARK','BARN','BURN','TURN','TORN','CORN','WORN','WORD','WARD','WARM','WORM','FORM','FARM','FARE','FIRE','HIRE','HERE','HARE','HARD','LARD','CARD','CART','DART','DIRT','FISH','DISH','WISH','WASH','CASH','CAST','LAST','MAST','FAST','FACT','FACE','LACE','RACE','RICE','DIVE','LIVE','LOVE','LORE','BORE','BONE','CONE','CANE','LANE','LINT','HINT','MINT','MIST','FIST','LIST','GUST','LUSH','RUSH','FUSE','MUSE','MUTE','CUTE','CURE','SURE','SIRE','SITE','BITE','KITE','MILE','TILE','TALE','MALE','PALE','PILE','PINE','PINT','HATE','CAVE','GAVE','GATE','RATE','RAKE','BAKE','LAKE','SAKE','SANE','CAME','GAME','FAME','SAME','SAFE','CAPE','TAPE','TYPE','HIDE','SIDE','WIDE','RIDE','LEAD','BEAD','DEAD','READ','REAL','REEL','FEEL','FEET','MEET','MEAT','BEAT','BEAN','LEAN','MEAN','MEAL','SEAL','DEAL','DEAR','FEAR','FEAT','HEAT','HEAP','REAP','HEAD','BEAR','BEER','DEER','SEED','WEED','FEED','PEEL','HEEL','HELL','BELL','BILL','BULL','FULL','PULL','POLL','POOL','FOOL','FOOD','FOOT','SOOT','FOUR','POUR','SOUR','TOUR','GOLD','BOLD','BOLT','BELT','MELT','FELT','FELL','TELL','TALL','BALL','CALL','HALL','FALL','FAIL','HAIL','MAIL','NAIL','TAIL','TOIL','FOIL','COIL','COAL','COAT','BOAT','GOAT','ROAD','LOAD','LOAN','MOAN','FIVE','HIVE','GIVE','FATE','MATE','MOTE','NOTE','NOSE','ROSE','ROPE','ROBE','ROLE','MOLE','POLE','HOLE','HOME','BIRD','BIND','FIND','FINE','VINE','DINE','DIME','MILK','SILK','SILL','WILL','WILD','MILD','MIND','KIND','KING','RING','SING','LARK','DARK','MARK','PARK','PART','HART','HARD','SOFT','SIFT','GIFT','GIST','GUST','GUSH','HUSH','MUSH','MUCH','SUCH','SULK','SILK','MILK','MILD','MIND']);
const VALID_5 = new Set(['STONE','STORE','SHORE','SHARE','SPARE','SCORE','SCARE','SNARE','SNAKE','STAKE','STALE','SHALE','WHALE','WHILE','WHITE','WRITE','BREAD','BREAM','DREAM','DREAD','TREAD','TREAT','GREAT','GREET','BLACK','SLACK','STACK','SLEEP','STEEP','STEED','SPEED','SPELL','SHELL','SHIFT','SHIRT','SKIRT','LIGHT','MIGHT','NIGHT','TIGHT','FIGHT','RIGHT','SIGHT','RIVER','LIVER','DIVER','RIDES','SIDES','HIDES','TIDES','TILES','TALES','TOAST','COAST','BOAST','BEAST','FEAST','LEAST','LEASE','PEACE','PLACE','PLANE','PLANT','PLANK','BLANK','BLAND','BLEND','BLEED','BREED','CREED','FREED','GREED','CREEK','CHEEK','CHEAP','CHEAT','WHEAT','SWEAT','SWEET','SWEEP','CREEP','STEER','STEEL','KNEEL','SHORE','SNORE','SCORE','STORE','STOKE','SMOKE','SPOKE','SPORE','SNORE','SHORE','LORE','BORE','CORES','TORES']);

const WORD_SETS = { 3: VALID_3, 4: VALID_4, 5: VALID_5 };

export function generate(config) {
  const { difficulty = Difficulty.MEDIUM } = config;
  const seed = config.seed ?? `wordLadder-${difficulty}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const rng  = createSeededRandom(seed);
  const bank = LADDER_PAIRS[difficulty] ?? LADDER_PAIRS[Difficulty.MEDIUM];
  const pair = pickRandom(bank, rng);

  return {
    puzzleType: PuzzleType.WORD_LADDER,
    difficulty,
    seed,
    puzzleData: {
      startWord:  pair.start,
      endWord:    pair.end,
      wordLength: pair.start.length,
      minSteps:   pair.minSteps,
    },
    solutionData: {
      startWord:  pair.start,
      endWord:    pair.end,
      wordLength: pair.start.length,
    },
    meta: { minSteps: pair.minSteps },
  };
}

export function validate(playerAnswer, solutionData) {
  const steps     = playerAnswer?.steps;
  const startWord = solutionData.startWord;
  const endWord   = solutionData.endWord;
  const wordLen   = solutionData.wordLength;

  if (!steps || !Array.isArray(steps) || steps.length < 2) {
    return { valid: false, reason: 'No ladder submitted.' };
  }

  const upper = steps.map(s => (s ?? '').trim().toUpperCase());

  if (upper[0] !== startWord) return { valid: false, reason: `First word must be ${startWord}.` };
  if (upper[upper.length - 1] !== endWord) return { valid: false, reason: `Last word must be ${endWord}.` };

  const validSet = WORD_SETS[wordLen] ?? new Set();

  for (let i = 0; i < upper.length; i++) {
    const word = upper[i];
    if (word.length !== wordLen) return { valid: false, reason: `"${word}" must be ${wordLen} letters.` };
    if (i > 0 && i < upper.length - 1 && !validSet.has(word)) {
      return { valid: false, reason: `"${word}" is not a recognised word.` };
    }
    if (i > 0) {
      let diffs = 0;
      for (let c = 0; c < wordLen; c++) {
        if (upper[i][c] !== upper[i - 1][c]) diffs++;
      }
      if (diffs !== 1) return { valid: false, reason: `"${upper[i-1]}" → "${word}" must change exactly 1 letter.` };
    }
  }
  return { valid: true };
}

export function score({ validationResult, submission }) {
  if (!validationResult.valid) return { completed: false, correct: false, baseScore: 0, bonusScore: 0, penaltyScore: 0, totalScore: 0 };
  const bonusScore = calcTimeBonus(submission.timeTakenSeconds, 20, 60, 300);
  return { completed: true, correct: true, baseScore: 80, bonusScore, penaltyScore: 0, totalScore: 80 + bonusScore };
}

export default { generate, validate, score };