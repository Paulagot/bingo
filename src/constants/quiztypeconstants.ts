// src/constants/quiztypeconstants.ts

import type { RoundTypeDefinition, RoundTypeId, RoundConfig } from '../types/quiz';

export const roundTypes: RoundTypeDefinition[] = [
  {
    id: 'general_trivia',
    name: 'General Trivia',
    description: 'Standard multiple choice format with hints and reviews.',
    defaultConfig: {
      questionsPerRound: 6,
      timePerQuestion: 25,
      pointsPerQuestion: 2
    }
  },
  // {
  //   id: 'speed_round',
  //   name: 'Speed Round',
  //   description: 'Answer as many questions as fast as possible in limited time.',
  //   defaultConfig: {
  //     questionsPerRound: 6,
  //     timePerQuestion: 10,
  //     totalTimeSeconds: 120,
  //     pointsPerQuestion: 3,
  //     pointslostperunanswered: 2
  //   }
  // },
  {
    id: 'wipeout',
    name: 'Wipeout',
    description: 'Lose points for wrong answers. Strategic gameplay.',
    defaultConfig: {
      questionsPerRound: 8,
      timePerQuestion: 18,
      pointsPerQuestion: 2,
      pointsLostPerWrong: 1,
      pointslostperunanswered: 2
    }
  },
  // {
  //   id: 'media_puzzle',
  //   name: 'Picture & Media Puzzle',
  //   description: 'Questions based on images, audio, or video.',
  //   defaultConfig: {
  //     questionsPerRound: 5,
  //     timePerQuestion: 45
  //   }
  // },
  // {
  //   id: 'head_to_head',
  //   name: 'Head to Head',
  //   description: 'Players face off in a buzzing format with no visible options.',
  //   defaultConfig: {
  //     questionsPerRound: 7,
  //     timePerQuestion: 20
  //   }
  // }
];

export const roundTypeDefaults = Object.fromEntries(
  roundTypes.map((t) => [t.id, t.defaultConfig])
) as Record<RoundTypeId, RoundConfig>;


export const roundTypeMap = Object.fromEntries(
  roundTypes.map((t) => [t.id, t])
) as Record<RoundTypeId, RoundTypeDefinition>;

