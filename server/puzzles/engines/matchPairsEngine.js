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

const MATCH_PAIRS_BANK = {
  [Difficulty.EASY]: [
    {
      prompt: 'Match the animal to the sound it makes',
      leftItems: [
        { id: 'dog', label: '🐶 Dog' },
        { id: 'cat', label: '🐱 Cat' },
        { id: 'cow', label: '🐄 Cow' },
        { id: 'duck', label: '🦆 Duck' },
        { id: 'lion', label: '🦁 Lion' },
      ],
      rightItems: [
        { id: 'moo', label: 'Moo' },
        { id: 'quack', label: 'Quack' },
        { id: 'meow', label: 'Meow' },
        { id: 'roar', label: 'Roar' },
        { id: 'bark', label: 'Bark' },
      ],
      pairs: [
        { leftId: 'dog', rightId: 'bark' },
        { leftId: 'cat', rightId: 'meow' },
        { leftId: 'cow', rightId: 'moo' },
        { leftId: 'duck', rightId: 'quack' },
        { leftId: 'lion', rightId: 'roar' },
      ],
    },
    {
      prompt: 'Match the food to where it belongs',
      leftItems: [
        { id: 'pizza', label: '🍕 Pizza' },
        { id: 'icecream', label: '🍦 Ice cream' },
        { id: 'apple', label: '🍎 Apple' },
        { id: 'tea', label: '☕ Tea' },
        { id: 'chips', label: '🍟 Chips' },
      ],
      rightItems: [
        { id: 'fruit', label: 'Fruit bowl' },
        { id: 'freezer', label: 'Freezer' },
        { id: 'takeaway', label: 'Takeaway box' },
        { id: 'mug', label: 'Mug' },
        { id: 'basket', label: 'Snack basket' },
      ],
      pairs: [
        { leftId: 'pizza', rightId: 'takeaway' },
        { leftId: 'icecream', rightId: 'freezer' },
        { leftId: 'apple', rightId: 'fruit' },
        { leftId: 'tea', rightId: 'mug' },
        { leftId: 'chips', rightId: 'basket' },
      ],
    },
    {
      prompt: 'Match the shape to its number of sides',
      leftItems: [
        { id: 'triangle', label: '🔺 Triangle' },
        { id: 'square',   label: '🟦 Square' },
        { id: 'pentagon', label: '⬠ Pentagon' },
        { id: 'hexagon',  label: '⬡ Hexagon' },
        { id: 'octagon',  label: '🛑 Octagon' },
      ],
      rightItems: [
        { id: '3', label: '3 sides' },
        { id: '4', label: '4 sides' },
        { id: '5', label: '5 sides' },
        { id: '6', label: '6 sides' },
        { id: '8', label: '8 sides' },
      ],
      pairs: [
        { leftId: 'triangle', rightId: '3' },
        { leftId: 'square',   rightId: '4' },
        { leftId: 'pentagon', rightId: '5' },
        { leftId: 'hexagon',  rightId: '6' },
        { leftId: 'octagon',  rightId: '8' },
      ],
    },
  ],

  [Difficulty.MEDIUM]: [
    {
      prompt: 'Match the country to its famous landmark',
      leftItems: [
        { id: 'france', label: '🇫🇷 France' },
        { id: 'italy', label: '🇮🇹 Italy' },
        { id: 'egypt', label: '🇪🇬 Egypt' },
        { id: 'india', label: '🇮🇳 India' },
        { id: 'usa', label: '🇺🇸 USA' },
        { id: 'brazil', label: '🇧🇷 Brazil' },
      ],
      rightItems: [
        { id: 'tajmahal', label: 'Taj Mahal' },
        { id: 'colosseum', label: 'Colosseum' },
        { id: 'pyramids', label: 'Pyramids of Giza' },
        { id: 'statue', label: 'Statue of Liberty' },
        { id: 'eiffel', label: 'Eiffel Tower' },
        { id: 'christ', label: 'Christ the Redeemer' },
      ],
      pairs: [
        { leftId: 'france', rightId: 'eiffel' },
        { leftId: 'italy', rightId: 'colosseum' },
        { leftId: 'egypt', rightId: 'pyramids' },
        { leftId: 'india', rightId: 'tajmahal' },
        { leftId: 'usa', rightId: 'statue' },
        { leftId: 'brazil', rightId: 'christ' },
      ],
    },
    {
      prompt: 'Match the sport to the item used',
      leftItems: [
        { id: 'tennis', label: '🎾 Tennis' },
        { id: 'golf', label: '⛳ Golf' },
        { id: 'hockey', label: '🏑 Hockey' },
        { id: 'boxing', label: '🥊 Boxing' },
        { id: 'cycling', label: '🚴 Cycling' },
        { id: 'archery', label: '🏹 Archery' },
      ],
      rightItems: [
        { id: 'gloves', label: 'Gloves' },
        { id: 'club', label: 'Club' },
        { id: 'bow', label: 'Bow' },
        { id: 'racket', label: 'Racket' },
        { id: 'bike', label: 'Bike' },
        { id: 'stick', label: 'Stick' },
      ],
      pairs: [
        { leftId: 'tennis', rightId: 'racket' },
        { leftId: 'golf', rightId: 'club' },
        { leftId: 'hockey', rightId: 'stick' },
        { leftId: 'boxing', rightId: 'gloves' },
        { leftId: 'cycling', rightId: 'bike' },
        { leftId: 'archery', rightId: 'bow' },
      ],
    },
    {
      prompt: 'Match the movie character type to the usual item',
      leftItems: [
        { id: 'wizard', label: '🧙 Wizard' },
        { id: 'pirate', label: '🏴‍☠️ Pirate' },
        { id: 'detective', label: '🕵️ Detective' },
        { id: 'chef', label: '👨‍🍳 Chef' },
        { id: 'astronaut', label: '👩‍🚀 Astronaut' },
        { id: 'knight', label: '⚔️ Knight' },
      ],
      rightItems: [
        { id: 'magnifier', label: 'Magnifying glass' },
        { id: 'sword', label: 'Sword' },
        { id: 'spacesuit', label: 'Spacesuit' },
        { id: 'wand', label: 'Wand' },
        { id: 'hat', label: 'Chef hat' },
        { id: 'treasure', label: 'Treasure map' },
      ],
      pairs: [
        { leftId: 'wizard', rightId: 'wand' },
        { leftId: 'pirate', rightId: 'treasure' },
        { leftId: 'detective', rightId: 'magnifier' },
        { leftId: 'chef', rightId: 'hat' },
        { leftId: 'astronaut', rightId: 'spacesuit' },
        { leftId: 'knight', rightId: 'sword' },
      ],
    },
  ],

  [Difficulty.HARD]: [
    {
      prompt: 'Match the famous scientist to what they are known for',
      leftItems: [
        { id: 'curie', label: 'Marie Curie' },
        { id: 'einstein', label: 'Albert Einstein' },
        { id: 'newton', label: 'Isaac Newton' },
        { id: 'darwin', label: 'Charles Darwin' },
        { id: 'tesla', label: 'Nikola Tesla' },
        { id: 'lovelace', label: 'Ada Lovelace' },
      ],
      rightItems: [
        { id: 'evolution', label: 'Evolution' },
        { id: 'gravity', label: 'Gravity' },
        { id: 'radioactivity', label: 'Radioactivity' },
        { id: 'computing', label: 'Early computing' },
        { id: 'relativity', label: 'Relativity' },
        { id: 'electricity', label: 'Electricity systems' },
      ],
      pairs: [
        { leftId: 'curie', rightId: 'radioactivity' },
        { leftId: 'einstein', rightId: 'relativity' },
        { leftId: 'newton', rightId: 'gravity' },
        { leftId: 'darwin', rightId: 'evolution' },
        { leftId: 'tesla', rightId: 'electricity' },
        { leftId: 'lovelace', rightId: 'computing' },
      ],
    },
    {
      prompt: 'Match the literary character to the story',
      leftItems: [
        { id: 'scrooge', label: 'Ebenezer Scrooge' },
        { id: 'dorothy', label: 'Dorothy Gale' },
        { id: 'sherlock', label: 'Sherlock Holmes' },
        { id: 'mowgli', label: 'Mowgli' },
        { id: 'alice', label: 'Alice' },
        { id: 'longjohn', label: 'Long John Silver' },
      ],
      rightItems: [
        { id: 'wonderland', label: 'Alice in Wonderland' },
        { id: 'jungle', label: 'The Jungle Book' },
        { id: 'christmas', label: 'A Christmas Carol' },
        { id: 'oz', label: 'The Wizard of Oz' },
        { id: 'treasure', label: 'Treasure Island' },
        { id: 'detective', label: 'Detective stories' },
      ],
      pairs: [
        { leftId: 'scrooge', rightId: 'christmas' },
        { leftId: 'dorothy', rightId: 'oz' },
        { leftId: 'sherlock', rightId: 'detective' },
        { leftId: 'mowgli', rightId: 'jungle' },
        { leftId: 'alice', rightId: 'wonderland' },
        { leftId: 'longjohn', rightId: 'treasure' },
      ],
    },
    {
      prompt: 'Match the word to its meaning',
      leftItems: [
        { id: 'benevolent', label: 'Benevolent' },
        { id: 'frugal', label: 'Frugal' },
        { id: 'elated', label: 'Elated' },
        { id: 'reluctant', label: 'Reluctant' },
        { id: 'vivid', label: 'Vivid' },
        { id: 'ancient', label: 'Ancient' },
      ],
      rightItems: [
        { id: 'old', label: 'Very old' },
        { id: 'bright', label: 'Bright and clear' },
        { id: 'kind', label: 'Kind and generous' },
        { id: 'carefulmoney', label: 'Careful with money' },
        { id: 'happy', label: 'Very happy' },
        { id: 'hesitant', label: 'Hesitant or unwilling' },
      ],
      pairs: [
        { leftId: 'benevolent', rightId: 'kind' },
        { leftId: 'frugal', rightId: 'carefulmoney' },
        { leftId: 'elated', rightId: 'happy' },
        { leftId: 'reluctant', rightId: 'hesitant' },
        { leftId: 'vivid', rightId: 'bright' },
        { leftId: 'ancient', rightId: 'old' },
      ],
    },
  ],
};

// ---------------------------------------------------------------------------
// Template self-check — runs once at module load. Catches exactly the class
// of bug that shipped previously (fields referenced by generate()/validate()
// that don't actually exist on the template) before it can crash a request.
// ---------------------------------------------------------------------------

function assertValidTemplate(difficulty, template, index) {
  const label = `${difficulty} template #${index}`;

  if (typeof template.prompt !== 'string' || template.prompt.trim() === '') {
    throw new Error(`${label}: missing a non-empty "prompt".`);
  }
  if (!Array.isArray(template.leftItems) || !Array.isArray(template.rightItems) || !Array.isArray(template.pairs)) {
    throw new Error(`${label}: leftItems, rightItems, and pairs must all be arrays.`);
  }

  const leftIds  = new Set(template.leftItems.map(i => i.id));
  const rightIds = new Set(template.rightItems.map(i => i.id));

  if (leftIds.size !== template.leftItems.length) {
    throw new Error(`${label}: leftItems has duplicate ids.`);
  }
  if (rightIds.size !== template.rightItems.length) {
    throw new Error(`${label}: rightItems has duplicate ids.`);
  }
  for (const item of [...template.leftItems, ...template.rightItems]) {
    if (typeof item.label !== 'string' || item.label.trim() === '') {
      throw new Error(`${label}: item "${item.id}" has no label.`);
    }
  }

  if (template.pairs.length !== template.leftItems.length || template.pairs.length !== template.rightItems.length) {
    throw new Error(`${label}: pairs count (${template.pairs.length}) must match leftItems (${template.leftItems.length}) and rightItems (${template.rightItems.length}).`);
  }

  const pairedLeft  = new Set();
  const pairedRight = new Set();
  for (const p of template.pairs) {
    if (!leftIds.has(p.leftId))  throw new Error(`${label}: pair references unknown leftId "${p.leftId}".`);
    if (!rightIds.has(p.rightId)) throw new Error(`${label}: pair references unknown rightId "${p.rightId}".`);
    if (pairedLeft.has(p.leftId))  throw new Error(`${label}: leftId "${p.leftId}" is paired more than once.`);
    if (pairedRight.has(p.rightId)) throw new Error(`${label}: rightId "${p.rightId}" is paired more than once.`);
    pairedLeft.add(p.leftId);
    pairedRight.add(p.rightId);
  }
  // Every declared item must be used in exactly one pair — no orphans.
  for (const id of leftIds)  if (!pairedLeft.has(id))  throw new Error(`${label}: leftItem "${id}" is never paired.`);
  for (const id of rightIds) if (!pairedRight.has(id)) throw new Error(`${label}: rightItem "${id}" is never paired.`);
}

function validateAllTemplates() {
  for (const difficulty of Object.keys(MATCH_PAIRS_BANK)) {
    MATCH_PAIRS_BANK[difficulty].forEach((template, i) => assertValidTemplate(difficulty, template, i));
  }
}

validateAllTemplates();

// ---------------------------------------------------------------------------
// Scoring settings scale with pair count / difficulty
// ---------------------------------------------------------------------------

const DIFFICULTY_SETTINGS = {
  [Difficulty.EASY]:   { baseScore: 50, bonusIdeal: 15, bonusGood: 40,  bonusMax: 150 },
  [Difficulty.MEDIUM]: { baseScore: 70, bonusIdeal: 25, bonusGood: 60,  bonusMax: 240 },
  [Difficulty.HARD]:   { baseScore: 95, bonusIdeal: 35, bonusGood: 90,  bonusMax: 360 },
};

// ---------------------------------------------------------------------------
// generate
// ---------------------------------------------------------------------------

export function generate(config) {
  const { difficulty = Difficulty.MEDIUM } = config;
  const seed = config.seed ?? `matchPairs-${difficulty}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const rng   = createSeededRandom(seed);
  const bank  = MATCH_PAIRS_BANK[difficulty] ?? MATCH_PAIRS_BANK[Difficulty.MEDIUM];

  const template = bank[Math.floor(rng() * bank.length)];
  const pairs    = template.pairs;

  // Left column stays in template order; only the right column is shuffled,
  // so the player has to actually think about the matches.
  const leftItems  = template.leftItems;
  const rightItems = shuffleArray(template.rightItems, rng);

  const matches = pairs.map(p => ({ leftId: p.leftId, rightId: p.rightId }));

  return {
    puzzleType: PuzzleType.MATCH_PAIRS,
    difficulty,
    seed,
    puzzleData: {
      prompt: template.prompt,
      leftItems,
      rightItems, // shuffled — player must match these to left items
    },
    solutionData: {
      matches,
    },
    meta: {
      prompt: template.prompt,
      pairCount: pairs.length,
    },
  };
}

// ---------------------------------------------------------------------------
// validate
// ---------------------------------------------------------------------------

export function validate(input, solution) {
  const submitted = input?.matches;
  const correct   = solution.matches;

  if (!Array.isArray(submitted) || submitted.length === 0) {
    return { valid: false, reason: 'No matches submitted.' };
  }

  // De-duplicate by leftId (last write wins) so a submission can't inflate
  // its correct count by repeating a known-correct pair while skipping one
  // it doesn't know.
  const submittedMap = new Map();
  for (const m of submitted) {
    if (!m || typeof m !== 'object' || typeof m.leftId !== 'string' || typeof m.rightId !== 'string') {
      return { valid: false, reason: 'A submitted match is malformed.' };
    }
    submittedMap.set(m.leftId, m.rightId);
  }

  const solutionMap = new Map(correct.map(m => [m.leftId, m.rightId]));

  let correctCount = 0;
  for (const [leftId, rightId] of solutionMap) {
    if (submittedMap.get(leftId) === rightId) correctCount++;
  }

  const totalCount  = correct.length;
  const allCorrect  = correctCount === totalCount;

  return {
    valid:        allCorrect,
    reason:       allCorrect ? undefined : `${correctCount} of ${totalCount} matches are correct.`,
    correctCount,
    totalCount,
  };
}

// ---------------------------------------------------------------------------
// score
// ---------------------------------------------------------------------------

export function score({ validationResult, submission, difficulty }) {
  if (!validationResult.valid) {
    return { completed: false, correct: false, baseScore: 0, bonusScore: 0, penaltyScore: 0, totalScore: 0 };
  }

  const settings = DIFFICULTY_SETTINGS[difficulty] ?? DIFFICULTY_SETTINGS[Difficulty.MEDIUM];
  const bonusScore = calcTimeBonus(submission.timeTakenSeconds, settings.bonusIdeal, settings.bonusGood, settings.bonusMax);

  return {
    completed:    true,
    correct:      true,
    baseScore:    settings.baseScore,
    bonusScore,
    penaltyScore: 0,
    totalScore:   settings.baseScore + bonusScore,
  };
}

export default { generate, validate, score };