// src/constants/quizMetadata.ts

import type { RoundTypeId, RoundConfig } from '../components/Quiz/types/quiz';

// ✅ Centralized Round Type Definitions with proper typing
type RoundTypeDefinition = {
  id: RoundTypeId;
  name: string;
  icon: string;
  description: string;
  gameplay: string;
  pros: string[];
  timing: string;
  difficulty: string;
  bestFor: string;
  defaultConfig: Partial<RoundConfig>; 
  extras?: string[]; // ✅ allow missing optional fields
  videoId?: string; // ✅ allow missing optional fields
};

export const roundTypeDefinitions: Record<RoundTypeId, RoundTypeDefinition> = {
  general_trivia: {
    id: 'general_trivia',
    name: 'General Trivia',
    icon: '🧠',
    description: 'Classic multiple choice trivia game. Points awarded for correct answers. Customizable Categories and difficulty levels Hints, Freeze out are available as fundraising extras.',
    gameplay: 'Host reads questions → teams see question & answers → automatically serves host and players next question after 25s → Host controlled review of questions with answers → Host presents Leaderboard',
    pros: [ 'Steady pace', 'Fair for all teams', 'Customizable levels of difficulty'],
    timing: '25 seconds per question',
    difficulty: 'Easy',
    bestFor: 'Mixed groups, warm-up rounds, classic quiz feel, family events',
    defaultConfig: {
  questionsPerRound: 6,
  timePerQuestion: 25,
  pointsPerDifficulty: {
    easy: 1,
    medium: 2,
    hard: 3
  }
},
    extras: ['Hint', 'Freeze-out-Team'],// ✅ Optional extras
    videoId: 'YOUR_YOUTUBE_VIDEO_ID' // ✅ Optional video ID
  },
  // speed_round: {
  //   id: 'speed_round',
  //   name: 'Speed Round',
  //   icon: '⚡',
  //   description: 'Race against time to answer as many as possible, questions range from easy to hard. Extra Time fundraising option.',
  //   gameplay: 'Host starts the round → players are servered qustions for 2 Min → players can skip a question if they dont know the answer → players see automatic Scoring → Host reads round scores → Host presents Leaderboard (correct answers = 2 points)',
  //   pros: ['High energy', 'Strategic skipping', 'Exciting'],
  //   timing: '2 minutes total',
  //   difficulty: 'Medium',
  //   bestFor: 'Mixed groups, Fast energy-building rounds, family events',
  //   defaultConfig: { totalTimeSeconds: 120 },
  //   extras: ['Extra-time' ], // ✅ Optional extras
  //   videoId: 'YOUR_YOUTUBE_VIDEO_ID'
  // },
  wipeout: {
    id: 'wipeout',
    name: 'Wipeout',
    icon: '💀',
    description: 'Multiple choice trivia game. Points awarded for correct answers. Lose points for wrong answers or no answer. Hints, Freeze out and Restore points fundraising extras.',
    gameplay: ' Host reads questions → teams see question & answers → automatically serves host and players next question after 18s → Host controlled review of questions with answers → Host presents Leaderboard (correct answers = 2 point, wrong answers = -2 point)',
    pros: ['Strategic', 'High tension', 'Risk vs reward'],
    timing: '18 seconds per question',
    difficulty: 'Easy',
    bestFor: 'Mixed groups, competitive play, family events',
    defaultConfig:   {
     questionsPerRound: 8,
      timePerQuestion: 18,
      pointsPerDifficulty: {
  easy: 2,
  medium: 3,
  hard: 4},},
    extras: ['Hint', 'Freeze-out-Team', 'Restore Points'],
    videoId: 'YOUR_YOUTUBE_VIDEO_ID'
  },
  // head_to_head: {
  //   id: 'head_to_head',
  //   name: 'Head to Head',
  //   icon: '⚔️',
  //   description: 'Showdown with buzzers, questions range from easy to hard. Restore points fundraising extra.',
  //   gameplay: 'Host reads questions → first to buzz → 3 seconds to answer → wrong answer and other team can buzz to steal → Host controlled scroing → Host presents Leaderboard(correct answers = 2 points, wrong answers = -1 point, steal = 4 points)',
  //   pros: ['High drama', 'Player spotlight'],
  //   timing: 'Buzz-in',
  //   difficulty: 'Hard',
  //   bestFor: 'Smaller Groups, climactic rounds, competitive play, family events',
  //   defaultConfig: { questionsPerRound: 10, totalTimeSeconds: 120, timeToAnswer: 3},
  //   extras: ['Restore Points'],
  //   videoId: 'YOUR_YOUTUBE_VIDEO_ID'
  // },
  // media_puzzle: {
  //   id: 'media_puzzle',
  //   name: 'Media Puzzle',
  //   icon: '🧩',
  //   description: 'Answer questions based on media (image, audio, video).',
  //   gameplay: 'Multimedia questions → Extra challenge',
  //   pros: ['Interactive', 'Visually engaging'],
  //   timing: '45 seconds per question',
  //   difficulty: 'Medium',
  //   bestFor: 'Family, kids, hybrid events',
  //   defaultConfig: { questionsPerRound: 5, timePerQuestion: 30 },
  //   videoId: 'YOUR_YOUTUBE_VIDEO_ID'
  // }
};

// ✅ Inferred type export (so you can reuse it elsewhere)
export type { RoundTypeDefinition };

// ✅ Centralized Fundraising Extras Definitions

export const fundraisingExtraDefinitions = {
  buyHint: {
    id: 'buyHint',
    label: 'Hint',
    icon: '💡',
    description: 'Allows a player use a hint to help answer a difficult question',
    maxPerTeam: 1,
    applicableTo: ['general_trivia', 'wipeout'] as RoundTypeId[] | 'global',
    impact: 'Moderate fundraising boost with easy usage',
    strategy: 'Price moderately to encourage use',
    pros: [ 'Reduces frustration'],
    suggestedPrice: 'Low-Medium',
    excitement: 'Medium',
    playerStrategy: 'This is a great option for players who are unsure about an answer, and it can be used in General Trivia and Wipeout rounds. it can help players avoid losing points in Wipeout rounds. But dont forget, you can only use one extra per round.  Be Strategic!',
  },
  // buyExtraTime: {
  //   id: 'buyExtraTime',
  //   label: 'Extra Time',
  //   icon: '⏰',
  //   description: 'Allows a player add 15 seconds extra for speed round questions',
  //   maxPerTeam: 1,
  //   applicableTo: ['speed_round'] as RoundTypeId[],
  //   impact: 'Good fundraising in speed rounds',
  //   strategy: 'Priced higher than hints',
  //   pros: ['Strategic', 'Creates tension'],
  //   suggestedPrice: 'Medium',
  //   excitement: 'High',
  //   playerStrategy: "You can only use this in a Speed Round. Use it wisely to extend your time and answer more questions. Remember, you can only use one extra per round, so choose your moment carefully!"
  // },
  restorePoints: {
    id: 'restorePoints',
    label: 'Restore Points',
    icon: '🎯',
    description: 'Allows player restore lost points if their answerer is wrong',
    maxPerTeam: 1,
    applicableTo: ['wipeout'] as RoundTypeId[],
    impact: 'Good comeback option',
    strategy: 'Priced as safety net',
    pros: ['Second chance', 'Avoid zero score'],
    suggestedPrice: 'Medium',
    excitement: 'Medium',
    totalRestorePoints: 3,
    playerStrategy: 'You can restore up to 3 points if you answer a question wrong. This is a great option for players who want to avoid losing points in Wipeout rounds. Use this extra when the leaderboard is tight, or you are at risk of going to zero!'
  },
  robPoints: {
    id: 'robPoints',
    label: 'Rob Points',
    icon: '⚡',
    description: 'Allows a team or player Steal 2 points from another team',
    maxPerTeam: 1,
    applicableTo: 'global',
    impact: 'High tension, creates drama',
    strategy: 'Priced as premium option',
    pros: ['Steals lead', 'Strategic targeting'],
    suggestedPrice: 'High',
    excitement: 'High',
    pointsToRob: 2,
    playerStrategy: 'Use this to steal 2 points from another team. This is a great option for players who want to take the lead or disrupt another team\'s momentum. Use this extra when the leaderboard is tight, or you want to shift the advantage to your team.' },
  freezeOutTeam: {
    id: 'freezeOutTeam',
    label: 'Freeze Out Team',
    icon: '❄️',
    description: 'Allows a player Freeze opponent team for 1 question',
    maxPerTeam: 1,
    applicableTo: ['general_trivia', 'wipeout'] as RoundTypeId[],
    impact: 'High strategic impact',
    strategy: 'Priced as advanced option',
    pros: ['Shifts advantage', 'Drama'],
    suggestedPrice: 'High',
    excitement: 'High',
    playerStrategy: 'Use this to freeze out an opponent team for one question. Use this extra in a general triva or wipeout round, but you can only use one extra per round, so choose wisely.'
  }
} as const;

export const availableDifficulties = ['easy', 'medium', 'hard'] as const;

export const availableCategories: Record<RoundTypeId, string[]> = {
  general_trivia: ['General Knowledge','Family', 'Science', 'History', 'Sport', 'Pop Culture', 'Web3', 'Blockchain'],
  wipeout: ['General Knowledge','Family', 'Science', 'History', 'Sport', 'Pop Culture', 'Web3', 'Blockchain'],
  // speed_round: [...],
  // media_puzzle: [...],
  // head_to_head: [...]
};

// ✅ Inferred type for fundraising extras
export type FundraisingExtraDefinition = typeof fundraisingExtraDefinitions[keyof typeof fundraisingExtraDefinitions];
