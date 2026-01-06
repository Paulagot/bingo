//src/components/Quiz/constants/quiztypeconstants.ts
import type { RoundTypeDefinition, RoundTypeId, RoundConfig } from '../types/quiz';

export const roundTypes: RoundTypeDefinition[] = [
  {
    id: 'general_trivia',
    name: 'General Trivia',
    description: 'Standard multiple choice format with hints and reviews.',
    defaultConfig: {
      questionsPerRound: 6,
      timePerQuestion: 30,
      pointsPerDifficulty: { easy: 4, medium: 5, hard: 6 },
    },
  },
  {
    id: 'speed_round',
    name: 'Speed Round',
    description: 'Answer as many questions as fast as possible in limited time.',
    defaultConfig: {
      // Required by your RoundConfig shape:
      questionsPerRound: 40,     // not used for pacing, but required by type
      timePerQuestion: 0,        // explicit: no per-question timer
      totalTimeSeconds: 75,
      skipAllowed: true,         // ✅ matches your type
      pointsPerDifficulty: { easy: 1, medium: 2, hard: 3 },
      pointsLostPerUnanswered: 0, // set >0 if you want skip penalty
      pointsLostPerWrong: 0,      // set >0 if you want wrong-answer penalty
      
    },
  },
  {
    id: 'wipeout',
    name: 'Wipeout',
    description: 'Lose points for wrong answers. Strategic gameplay.',
    defaultConfig: {
      questionsPerRound: 8,
      timePerQuestion: 22,
      pointsPerDifficulty: { easy: 6, medium: 7, hard: 8 },
      pointsLostPerWrong: 2,
      pointsLostPerUnanswered: 3,
    },
  },
  {
    id: 'order_image',
    name: 'Order the Image',
    description: 'Drag and drop images into the correct order. Visual puzzle gameplay.',
    defaultConfig: {
      questionsPerRound: 6,
      timePerQuestion: 30,
      pointsPerDifficulty: { easy: 2, medium: 4, hard: 6 },
    },
  },
];

export const roundTypeDefaults = Object.fromEntries(
  roundTypes.map((t) => [t.id, t.defaultConfig])
) as Record<RoundTypeId, RoundConfig>;

export const roundTypeMap = Object.fromEntries(
  roundTypes.map((t) => [t.id, t])
) as Record<RoundTypeId, RoundTypeDefinition>;