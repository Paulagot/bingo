// server/constants/quizMetadata.js

export const roundTypeDefinitions = {
  general_trivia: {
    id: 'general_trivia',
    name: 'General Trivia',
    icon: '🧠',
    description: 'Classic multiple choice with hints and reviews.',
    gameplay: 'Host reads questions → Teams see answers → 25s  → Review → Leaderboard',
    pros: ['Beginner friendly', 'Steady pace', 'Fair for all teams'],
    timing: '25 seconds per question',
    difficulty: 'Easy',
    bestFor: 'Mixed groups, warm-up rounds, classic quiz feel',
    defaultConfig: { questionsPerRound: 6, timePerQuestion: 25 }
  },
  speed_round: {
    id: 'speed_round',
    name: 'Speed Round',
    icon: '⚡',
    description: 'Race against time to answer as many as possible.',
    gameplay: '60 seconds → Skip allowed → Short answers → Scoring → Power-ups',
    pros: ['High energy', 'Strategic skipping', 'Exciting'],
    timing: '60 seconds per team',
    difficulty: 'Medium',
    bestFor: 'High energy events',
    defaultConfig: { questionsPerRound: 6, timePerQuestion: 10, totalTimeSeconds: 60 }
  },
  wipeout: {
    id: 'wipeout',
    name: 'Wipeout',
    icon: '💀',
    description: 'Lose points for wrong answers — strategic risk/reward.',
    gameplay: 'Wrong answers = -1 point → Strategic guessing',
    pros: ['Strategic', 'High tension', 'Risk vs reward'],
    timing: '25 seconds per question',
    difficulty: 'Hard',
    bestFor: 'Experienced groups',
    defaultConfig: { questionsPerRound: 6, timePerQuestion: 20 }
  },
  head_to_head: {
    id: 'head_to_head',
    name: 'Head to Head',
    icon: '⚔️',
    description: 'One-on-one showdown with buzzers.',
    gameplay: 'Champions buzz → 6 questions → No multiple choice → Steals',
    pros: ['High drama', 'Player spotlight'],
    timing: 'Buzz-in',
    difficulty: 'Hard',
    bestFor: 'Climactic finales',
    defaultConfig: { questionsPerRound: 7, timePerQuestion: 20 }
  },
  media_puzzle: {
    id: 'media_puzzle',
    name: 'Media Puzzle',
    icon: '🧩',
    description: 'Answer questions based on media (image, audio, video).',
    gameplay: 'Multimedia questions → Extra challenge',
    pros: ['Interactive', 'Visually engaging'],
    timing: '45 seconds per question',
    difficulty: 'Medium',
    bestFor: 'Family, kids, hybrid events',
    defaultConfig: { questionsPerRound: 5, timePerQuestion: 45 }
  }
};

export const fundraisingExtraDefinitions = {
  buyHint: {
    id: 'buyHint',
    label: 'Hint',
    icon: '💡',
    description: 'Use a hint to help answer',
    maxPerTeam: 1,
    applicableTo: ['general_trivia', 'wipeout'],
    impact: 'Moderate fundraising boost with high usage',
    strategy: 'Price moderately, players will buy multiples',
    pros: ['High usage', 'Reduces frustration'],
    suggestedPrice: 'Low-Medium',
    excitement: 'Medium'
  },
  buyExtraTime: {
    id: 'buyExtraTime',
    label: 'Extra Time',
    icon: '⏰',
    description: 'Add extra time for speed rounds',
    maxPerTeam: 1,
    applicableTo: ['speed_round'],
    impact: 'Good fundraising in speed rounds',
    strategy: 'Priced higher than hints',
    pros: ['Strategic', 'Creates tension'],
    suggestedPrice: 'Medium',
    excitement: 'High'
  },
  restorePoints: {
    id: 'restorePoints',
    label: 'Restore Points',
    icon: '🎯',
    description: 'Restore points if negative',
    maxPerTeam: 1,
    applicableTo: ['wipeout'],
    impact: 'Good comeback option',
    strategy: 'Priced as safety net',
    pros: ['Second chance', 'Avoid zero score'],
    suggestedPrice: 'Medium',
    excitement: 'Medium'
  },
  robPoints: {
    id: 'robPoints',
    label: 'Rob Points',
    icon: '⚡',
    description: 'Steal 2 points from another team',
    maxPerTeam: 1,
    applicableTo: 'global',
    impact: 'High tension, creates drama',
    strategy: 'Priced as premium option',
    pros: ['Steals lead', 'Strategic targeting'],
    suggestedPrice: 'High',
    excitement: 'High'
  },
  freezeOutTeam: {
    id: 'freezeOutTeam',
    label: 'Freeze Out Team',
    icon: '❄️',
    description: 'Freeze opponent team for 1 question',
    maxPerTeam: 1,
    applicableTo: ['general_trivia', 'wipeout'],
    impact: 'High strategic impact',
    strategy: 'Priced as advanced option',
    pros: ['Shifts advantage', 'Drama'],
    suggestedPrice: 'High',
    excitement: 'High'
  }
};
