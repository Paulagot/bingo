// server/quiz/quizMetadata.js




export const roundTypeDefinitions = {
  general_trivia: {
    id: 'general_trivia',
    name: 'General Trivia',
    icon: '🧠',
    description: 'Classic multiple choice, questions range from easy to hard. 2 points for a correct answer.',
    gameplay: 'Host reads questions → teams see question & answers → automatically serves host and players next question after 25s → Host controlled review of questions with answers → Host presents Leaderboard',
    pros: ['Beginner friendly', 'Steady pace', 'Fair for all teams'],
    timing: '25 seconds per question',
    difficulty: 'Easy',
    bestFor: 'Mixed groups, warm-up rounds, classic quiz feel, family events',
    defaultConfig: {
  questionsPerRound: 6,
  timePerQuestion: 28,
  pointsPerDifficulty: {
    easy: 2,
    medium: 3,
    hard: 4
  }
},
    extras: ['Hint', 'Freeze-out-Team'],// ✅ Optional extras
    videoId: 'YOUR_YOUTUBE_VIDEO_ID' // ✅ Optional video ID
  },
  speed_round: {
    id: 'speed_round',
    name: 'Speed Round',
    icon: '⚡',
    description: 'Race against time to answer as many as possible, questions range from easy to hard. Extra Time fundraising option.',
    gameplay: 'Host starts the round → players are servered qustions for 2 Min → players can skip a question if they dont know the answer → players see automatic Scoring → Host reads round scores → Host presents Leaderboard (correct answers = 2 points)',
    pros: ['High energy', 'Strategic skipping', 'Exciting'],
    timing: '2 minutes total',
    difficulty: 'Medium',
    bestFor: 'Mixed groups, Fast energy-building rounds, family events',
    defaultConfig: { totalTimeSeconds: 120 },
    extras: ['Extra-time' ], // ✅ Optional extras
    videoId: 'YOUR_YOUTUBE_VIDEO_ID'
  },
  wipeout: {
    id: 'wipeout',
    name: 'Wipeout',
    icon: '💀',
    description: 'Lose points for wrong answers, questions range from easy to hard. Hints, Freeze out and Restore points fundraising extras.',
    gameplay: ' Host reads questions → teams see question & answers → automatically serves host and players next question after 18s → Host controlled review of questions with answers → Host presents Leaderboard (correct answers = 2 point, wrong answers = -2 point)',
    pros: ['Strategic', 'High tension', 'Risk vs reward'],
    timing: '20 seconds per question',
    difficulty: 'Easy',
    bestFor: 'Mixed groups, competitive play, family events',
    defaultConfig: { questionsPerRound: 8, timePerQuestion: 22 },
    extras: ['Hint', 'Freeze-out-Team', 'Restore Points'],
    videoId: 'YOUR_YOUTUBE_VIDEO_ID'
  },
  head_to_head: {
    id: 'head_to_head',
    name: 'Head to Head',
    icon: '⚔️',
    description: 'Showdown with buzzers, questions range from easy to hard. Restore points fundraising extra.',
    gameplay: 'Host reads questions → first to buzz → 3 seconds to answer → wrong answer and other team can buzz to steal → Host controlled scroing → Host presents Leaderboard(correct answers = 2 points, wrong answers = -1 point, steal = 4 points)',
    pros: ['High drama', 'Player spotlight'],
    timing: 'Buzz-in',
    difficulty: 'Hard',
    bestFor: 'Smaller Groups, climactic rounds, competitive play, family events',
    defaultConfig: { questionsPerRound: 10, totalTimeSeconds: 120, timeToAnswer: 3},
    extras: ['Restore Points'],
    videoId: 'YOUR_YOUTUBE_VIDEO_ID'
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
    defaultConfig: { questionsPerRound: 5, timePerQuestion: 30 },
    videoId: 'YOUR_YOUTUBE_VIDEO_ID'
  }
};

export const fundraisingExtraDefinitions = {
  buyHint: {
      id: 'buyHint',
      label: 'Hint',
      icon: '💡',
      description: 'Allows a player use a hint to help answer a difficult question',
      maxPerTeam: 1,
      applicableTo: ['general_trivia', 'wipeout'] ,
      impact: 'Moderate fundraising boost with easy usage',
      strategy: 'Price moderately to encourage use',
      pros: [ 'Reduces frustration'],
      suggestedPrice: 'Low-Medium',
      excitement: 'Medium'
    },
    buyExtraTime: {
      id: 'buyExtraTime',
      label: 'Extra Time',
      icon: '⏰',
      description: 'Allows a player add 15 seconds extra for speed round questions',
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
      description: 'Allows player restore lost points if their answerer is wrong',
      maxPerTeam: 1,
      applicableTo: ['wipeout'] ,
      impact: 'Good comeback option',
      strategy: 'Priced as safety net',
      pros: ['Second chance', 'Avoid zero score'],
      suggestedPrice: 'Medium',
      excitement: 'Medium',
      totalRestorePoints: 3
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
      pointsToRob: 2
    },
    freezeOutTeam: {
      id: 'freezeOutTeam',
      label: 'Freeze Out Team',
      icon: '❄️',
      description: 'Allows a player Freeze opponent team for 1 question',
      maxPerTeam: 1,
      applicableTo: ['general_trivia', 'wipeout'] ,
      impact: 'High strategic impact',
      strategy: 'Priced as advanced option',
      pros: ['Shifts advantage', 'Drama'],
      suggestedPrice: 'High',
      excitement: 'High'
    }
  };