import type { RoundTypeId, RoundConfig } from '../types/quiz';

export interface QuizTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  rounds: Array<{
    type: RoundTypeId;
    category: string;                      // Must match availableCategories
    difficulty: 'easy' | 'medium' | 'hard';
    customConfig?: Partial<RoundConfig>;
  }>;
  // Tags only: Audience / Topic / Duration
  // e.g., ['Audience: Kids','Topic: Mixed','Duration: ≈60m']
  tags: string[];
}

/**
 * Categories must match your availableCategories:
 * general_trivia / wipeout: 'General Knowledge','Olympic Sports','Pop Music','History','World Capitals','Pop Culture','Web3','Children'
 * speed_round:               'Math','Emojis','Pop Music','Sport'
 * NOTE: 'family movies' is lowercase to match your source.
 */

const quizTemplates: QuizTemplate[] = [
  // ─────────────────────────────────────────────────────────────────────────────
  // KEEP DEMO EXACTLY AS-IS
  // ─────────────────────────────────────────────────────────────────────────────
  {
    id: 'demo-quiz',
    name: 'Demo Quiz',
    description: 'Quick demo: 1 short Wipeout + 1 Speed Round.',
    icon: '🚀',
    difficulty: 'Easy',

    rounds: [
        {
      type: 'order_image',  // ✅ NEW round type
      category: 'Film',  // or 'Historical Events', 'Size Comparison', 'Age Order'
      difficulty: 'easy',  // easy, medium, or hard
      customConfig: {
        questionsPerRound: 2,  // Number of ordering questions
        timePerQuestion: 15,   // 30 seconds per question
        pointsPerDifficulty: { easy: 2, medium: 4, hard: 6 },
      },
    },   
      {
        type: 'wipeout',
        category: 'General Knowledge',
        difficulty: 'medium',
        customConfig: {
          questionsPerRound: 4,
          timePerQuestion: 11,
          pointsPerDifficulty: { easy: 2, medium: 3, hard: 4 },
          pointsLostPerWrong: 2,
          pointsLostPerUnanswered: 3,
        },
      },
               {
      type: 'hidden_object',
      category: 'kids',
      difficulty: 'hard',
     customConfig: {
    questionsPerRound: 2,            // ✅ 2 puzzles in this round
    timePerQuestion: 0,
    totalTimeSeconds: 0,
    hiddenObject: {
      timeLimitSeconds: 20,          // ✅ Each puzzle: 45 seconds
      secondsToPoints: 1
    }
    }},
      {
        type: 'speed_round',
        category: 'Math',
        difficulty: 'medium',
        customConfig: {
          questionsPerRound: 40,
          totalTimeSeconds: 20,
          skipAllowed: true,
          pointsPerDifficulty: { easy: 2, medium: 3, hard: 4 },
          pointsLostPerWrong: 0,
          pointsLostPerUnanswered: 0,
        },
      },
 
    ],
    tags: ['Audience: Mixed','Topic: General','Duration: ≈7m'],
  },

  {
  id: 'test',
  name: 'TEST – Hidden Object',
  description: 'Temporary template to validate hidden object round end-to-end (delete later).',
  icon: '🧪',
  difficulty: 'Medium',
  rounds: [
        {
      type: 'order_image',  // ✅ NEW round type
      category: 'Technology',  // or 'Historical Events', 'Size Comparison', 'Age Order'
      difficulty: 'easy',  // easy, medium, or hard
      customConfig: {
        questionsPerRound: 5,  // Number of ordering questions
        timePerQuestion: 30,   // 30 seconds per question
        pointsPerDifficulty: { easy: 2, medium: 4, hard: 6 },
      }},
      
    // {
    //   type: 'hidden_object',
    //   category: 'all',
    //   difficulty: 'hard',
    //   customConfig: {
    //     // keep consistent with your RoundConfig shape
    //     questionsPerRound: 5,
    //     timePerQuestion: 0,
    //     totalTimeSeconds: 10, // ✅ round duration
    //     // optional if you added nested config:
    //     // hiddenObject: { secondsToPoints: 1 }
    //   }
    // },
    //  {
    //   type: 'hidden_object',
    //   category: 'kids',
    //   difficulty: 'hard',
    //   customConfig: {
    //     // keep consistent with your RoundConfig shape
    //     questionsPerRound: 1,
    //     timePerQuestion: 0,
    //     totalTimeSeconds: 45, // ✅ round duration
    //     // optional if you added nested config:
    //     // hiddenObject: { secondsToPoints: 1 }
    //   }
    // },

  ],
  tags: ['Audience: Test', 'Topic: Hidden Object', 'Duration: ≈3m']
},

 {
    id: 'Sample',
    name: 'Sample Quiz',
    description: 'template for testing purposes. Play each round type once and see how they work.',
    icon: '🏃‍♂️',
    difficulty: 'Easy',
    rounds: [
      { type: 'order_image', category: 'Art', difficulty: 'easy' },
      { type: 'wipeout', category: 'Children', difficulty: 'easy' },
      { type: 'hidden_object',    category: 'Kids',     difficulty: 'hard' },
      { type: 'speed_round',    category: 'Math',   difficulty: 'easy' }     
      
    ],
    tags: ['Audience: Kids', 'Topic: Mixed', 'Duration: ≈35m']
  },


 // ~~~ KIDS: "Kids Sprint"
  // Q-time: 9+4+9+5+6 = 33 min → no break → total ≈ 45 min
  {
    id: 'kids-sprint-45',
    name: 'Kids Sprint',
    description: 'Short and energetic — the perfect starter quiz for younger kids. One of every round type keeps things fresh and fun.',
    icon: '🏃',
    difficulty: 'Easy',
    rounds: [
      { type: 'general_trivia', category: 'Children', difficulty: 'easy' },
      { type: 'speed_round',    category: 'Emojis',   difficulty: 'easy' },
      { type: 'wipeout',        category: 'Children', difficulty: 'easy' },
      { type: 'hidden_object',  category: 'all',      difficulty: 'easy' },
      { type: 'order_image',    category: 'Nature',   difficulty: 'easy' },
    ],
    tags: ['Audience: Kids', 'Topic: Mixed', 'Duration: ≈45m']
  },
 
  // ~~~ KIDS: "Kids Emoji Blitz"
  // Q-time: 9+4+9+5+4+6 = 37 min → no break → total ≈ 50 min
  {
    id: 'kids-emoji-blitz-50',
    name: 'Kids Emoji Blitz',
    description: 'Two emoji speed rounds keep energy sky-high — great for kids who love reacting fast.',
    icon: '😊',
    difficulty: 'Easy',
    rounds: [
      { type: 'general_trivia', category: 'Children', difficulty: 'easy' },
      { type: 'speed_round',    category: 'Emojis',   difficulty: 'easy' },
      { type: 'wipeout',        category: 'Children', difficulty: 'easy' },
      { type: 'hidden_object',  category: 'all',      difficulty: 'easy' },
      { type: 'speed_round',    category: 'Math',     difficulty: 'easy' },
      { type: 'order_image',    category: 'Nature',   difficulty: 'easy' },
    ],
    tags: ['Audience: Kids', 'Topic: Mixed', 'Duration: ≈50m']
  },
 
  // ~~~ KIDS: "Kids Club Night"
  // Q-time: 9+9+4+9+5+6 = 42 min → 1 break → 57 min ≈ 60 min
  {
    id: 'kids-club-night-60',
    name: 'Kids Club Night',
    description: 'Fun school or club night with children\'s trivia, a wipeout challenge, emoji speed, and visual rounds.',
    icon: '🧒',
    difficulty: 'Easy',
    rounds: [
      { type: 'general_trivia', category: 'Children', difficulty: 'easy' },
      { type: 'wipeout',        category: 'Children', difficulty: 'easy' },
      { type: 'speed_round',    category: 'Emojis',   difficulty: 'easy' },
      { type: 'general_trivia', category: 'Children', difficulty: 'easy' },
      { type: 'hidden_object',  category: 'all',      difficulty: 'easy' },
      { type: 'order_image',    category: 'Film',     difficulty: 'easy' },
    ],
    tags: ['Audience: Kids', 'Topic: Mixed', 'Duration: ≈60m']
  },
 
  // ~~~ KIDS: "Kids Math Mania"
  // Q-time: 9+4+9+5+4+6 = 37 min → no break → total ≈ 50 min
  {
    id: 'kids-math-mania-50',
    name: 'Kids Math Mania',
    description: 'Numbers, quick thinking, and visual puzzles in a friendly format that makes maths genuinely fun.',
    icon: '🔢',
    difficulty: 'Easy',
    rounds: [
      { type: 'general_trivia', category: 'Children', difficulty: 'easy' },
      { type: 'speed_round',    category: 'Math',     difficulty: 'easy' },
      { type: 'wipeout',        category: 'Children', difficulty: 'easy' },
      { type: 'hidden_object',  category: 'all',      difficulty: 'easy' },
      { type: 'speed_round',    category: 'Emojis',   difficulty: 'easy' },
      { type: 'order_image',    category: 'Science',  difficulty: 'easy' },
    ],
    tags: ['Audience: Kids', 'Topic: Math', 'Duration: ≈50m']
  },
 
  // ~~~ KIDS: "Kids Capitals & Flags"
  // Q-time: 9+4+9+5+6 = 33 min → no break → total ≈ 45 min
  {
    id: 'kids-capitals-flags-45',
    name: 'Kids Capitals & Flags',
    description: 'Gentle geography for young explorers — flags speed, geography ordering, and children\'s trivia.',
    icon: '🗺️',
    difficulty: 'Easy',
    rounds: [
      { type: 'general_trivia', category: 'Children',          difficulty: 'easy' },
      { type: 'speed_round',    category: 'Flags of the World', difficulty: 'easy' },
      { type: 'wipeout',        category: 'Children',          difficulty: 'easy' },
      { type: 'hidden_object',  category: 'all',               difficulty: 'easy' },
      { type: 'order_image',    category: 'Geography',         difficulty: 'easy' },
    ],
    tags: ['Audience: Kids', 'Topic: Geography', 'Duration: ≈45m']
  },
 
  // ~~~ KIDS: "Kids Pop Lite"
  // Q-time: 9+4+9+5+6+4 = 37 min → no break → total ≈ 50 min
  {
    id: 'kids-pop-lite-50',
    name: 'Kids Pop Lite',
    description: 'Artist names, song facts, and pop culture — emoji speed, find-it-fast, and music ordering. No audio needed.',
    icon: '🎤',
    difficulty: 'Easy',
    rounds: [
      { type: 'general_trivia', category: 'Children',  difficulty: 'easy' },
      { type: 'speed_round',    category: 'Emojis',    difficulty: 'easy' },
      { type: 'wipeout',        category: 'Children',  difficulty: 'easy' },
      { type: 'hidden_object',  category: 'all',       difficulty: 'easy' },
      { type: 'order_image',    category: 'Music',     difficulty: 'easy' },
      { type: 'speed_round',    category: 'Pop Music', difficulty: 'easy' },
    ],
    tags: ['Audience: Kids', 'Topic: Pop Culture', 'Duration: ≈50m']
  },
 
  // ~~~ KIDS: "Kids Fundraiser"
  // Q-time: 9+4+9+9+5+6+4 = 46 min → 1 break → 61 min ≈ 65 min
  {
    id: 'kids-fundraiser-65',
    name: 'Kids Fundraiser',
    description: 'Designed for school fundraisers — three trivia rounds, speed, visual fun, and wipeout with big participation.',
    icon: '🎒',
    difficulty: 'Easy',
    rounds: [
      { type: 'general_trivia', category: 'Children', difficulty: 'easy' },
      { type: 'speed_round',    category: 'Emojis',   difficulty: 'easy' },
      { type: 'wipeout',        category: 'Children', difficulty: 'easy' },
      { type: 'hidden_object',  category: 'all',      difficulty: 'easy' },
      { type: 'order_image',    category: 'Food & Drink', difficulty: 'easy' },
      { type: 'general_trivia', category: 'Children', difficulty: 'easy' },
      { type: 'speed_round',    category: 'Math',     difficulty: 'easy' },
    ],
    tags: ['Audience: Kids', 'Topic: Mixed', 'Duration: ≈65m']
  },
 
  // ~~~ KIDS: "Kids Adventure Mix"
  // Q-time: 9+4+9+5+6+9 = 42 min → 1 break → 57 min ≈ 60 min
  {
    id: 'kids-adventure-mix-60',
    name: 'Kids Adventure Mix',
    description: 'Something for every kid — trivia, emoji speed, find-it-fast, image ordering, and wipeout all in one.',
    icon: '🧭',
    difficulty: 'Easy',
    rounds: [
      { type: 'general_trivia', category: 'Children', difficulty: 'easy' },
      { type: 'speed_round',    category: 'Emojis',   difficulty: 'easy' },
      { type: 'hidden_object',  category: 'all',      difficulty: 'easy' },
      { type: 'order_image',    category: 'Nature',   difficulty: 'easy' },
      { type: 'wipeout',        category: 'Children', difficulty: 'easy' },
      { type: 'general_trivia', category: 'Children', difficulty: 'easy' },
    ],
    tags: ['Audience: Kids', 'Topic: Mixed', 'Duration: ≈60m']
  },
 
  // ~~~ KIDS: "Kids Science Stars"
  // Q-time: 9+4+9+5+6+6 = 39 min → no break → total ≈ 52 min
  {
    id: 'kids-science-stars-50',
    name: 'Kids Science Stars',
    description: 'Space, nature, and science ordering for curious young minds — with maths speed and find-it-fast.',
    icon: '🔭',
    difficulty: 'Easy',
    rounds: [
      { type: 'general_trivia', category: 'Children', difficulty: 'easy' },
      { type: 'speed_round',    category: 'Math',     difficulty: 'easy' },
      { type: 'wipeout',        category: 'Children', difficulty: 'easy' },
      { type: 'hidden_object',  category: 'all',      difficulty: 'easy' },
      { type: 'order_image',    category: 'Space',    difficulty: 'easy' },
      { type: 'order_image',    category: 'Nature',   difficulty: 'easy' },
    ],
    tags: ['Audience: Kids', 'Topic: Science', 'Duration: ≈52m']
  },
 
  // ~~~ KIDS: "Kids Marathon"
  // Q-time: 9+9+4+5+6+9+4+6 = 52 min → 1 break → 52+15 = 67 min ≈ 70 min
  {
    id: 'kids-marathon-70',
    name: 'Kids Marathon',
    description: 'The big kids night — two trivia rounds, double wipeout, two speed rounds, and two visual rounds.',
    icon: '🪀',
    difficulty: 'Easy',
    rounds: [
      { type: 'general_trivia', category: 'Children', difficulty: 'easy' },
      { type: 'wipeout',        category: 'Children', difficulty: 'easy' },
      { type: 'speed_round',    category: 'Emojis',   difficulty: 'easy' },
      { type: 'hidden_object',  category: 'all',      difficulty: 'easy' },
      { type: 'order_image',    category: 'Film',     difficulty: 'easy' },
      { type: 'general_trivia', category: 'Children', difficulty: 'easy' },
      { type: 'speed_round',    category: 'Math',     difficulty: 'easy' },
      { type: 'order_image',    category: 'Nature',   difficulty: 'easy' },
    ],
    tags: ['Audience: Kids', 'Topic: Mixed', 'Duration: ≈70m']
  },
 
  // ═══════════════════════════════════════════════════════════════════════════
  // TEENS (10)
  // general_trivia + wipeout → 'Children' only
  // difficulty → hard primary, medium acceptable | speed_round: medium or hard
  // ═══════════════════════════════════════════════════════════════════════════
 
  // ~~~ TEENS: "Teens Speed Rush"
  // Q-time: 9+4+9+5+6 = 33 min → no break → total ≈ 45 min
  {
    id: 'teens-speed-rush-45',
    name: 'Teens Speed Rush',
    description: 'Compact and fast — hard children\'s trivia, wipeout, emoji speed, find-it-fast, and image ordering.',
    icon: '⚡',
    difficulty: 'Hard',
    rounds: [
      { type: 'general_trivia', category: 'Children', difficulty: 'hard' },
      { type: 'speed_round',    category: 'Emojis',   difficulty: 'hard' },
      { type: 'wipeout',        category: 'Children', difficulty: 'hard' },
      { type: 'hidden_object',  category: 'all',      difficulty: 'hard' },
      { type: 'order_image',    category: 'TV',       difficulty: 'hard' },
    ],
    tags: ['Audience: Teens', 'Topic: Mixed', 'Duration: ≈45m']
  },
 
  // ~~~ TEENS: "Teens Hype Night"
  // Q-time: 9+4+9+5+6+4 = 37 min → no break → total ≈ 50 min
  {
    id: 'teens-hype-night-50',
    name: 'Teens Hype Night',
    description: 'High-energy teen night — hard trivia, wipeout, two speed rounds, find-it-fast, and film ordering.',
    icon: '🔥',
    difficulty: 'Hard',
    rounds: [
      { type: 'general_trivia', category: 'Children', difficulty: 'hard' },
      { type: 'speed_round',    category: 'Emojis',   difficulty: 'hard' },
      { type: 'wipeout',        category: 'Children', difficulty: 'hard' },
      { type: 'hidden_object',  category: 'all',      difficulty: 'hard' },
      { type: 'order_image',    category: 'Film',     difficulty: 'hard' },
      { type: 'speed_round',    category: 'Pop Music', difficulty: 'hard' },
    ],
    tags: ['Audience: Teens', 'Topic: Pop Culture', 'Duration: ≈50m']
  },
 
  // ~~~ TEENS: "Teens Emoji Gauntlet"
  // Q-time: 9+4+9+5+6+9 = 42 min → 1 break → 57 min ≈ 60 min
  {
    id: 'teens-emoji-gauntlet-60',
    name: 'Teens Emoji Gauntlet',
    description: 'Emoji sprints, hard wipeout, find-it-fast, TV ordering, and a second trivia anchor — a full teen night.',
    icon: '🧩',
    difficulty: 'Hard',
    rounds: [
      { type: 'speed_round',    category: 'Emojis',   difficulty: 'hard' },
      { type: 'general_trivia', category: 'Children', difficulty: 'hard' },
      { type: 'wipeout',        category: 'Children', difficulty: 'hard' },
      { type: 'hidden_object',  category: 'all',      difficulty: 'hard' },
      { type: 'order_image',    category: 'TV',       difficulty: 'hard' },
      { type: 'general_trivia', category: 'Children', difficulty: 'medium' },
    ],
    tags: ['Audience: Teens', 'Topic: Mixed', 'Duration: ≈60m']
  },
 
  // ~~~ TEENS: "Teens Sport & Music"
  // Q-time: 9+4+9+5+6+4 = 37 min → no break → total ≈ 50 min
  {
    id: 'teens-sport-music-50',
    name: 'Teens Sport & Music',
    description: 'Sport speed, music ordering, find-it-fast, and hard children\'s wipeout — for the sporty music fan.',
    icon: '🏅',
    difficulty: 'Hard',
    rounds: [
      { type: 'general_trivia', category: 'Children', difficulty: 'hard' },
      { type: 'speed_round',    category: 'Sport',    difficulty: 'hard' },
      { type: 'wipeout',        category: 'Children', difficulty: 'hard' },
      { type: 'hidden_object',  category: 'all',      difficulty: 'hard' },
      { type: 'order_image',    category: 'Music',    difficulty: 'hard' },
      { type: 'speed_round',    category: 'Pop Music', difficulty: 'medium' },
    ],
    tags: ['Audience: Teens', 'Topic: Sports', 'Duration: ≈50m']
  },
 
  // ~~~ TEENS: "Teens Pop Spotlight"
  // Q-time: 9+4+9+5+6+9 = 42 min → 1 break → 57 min ≈ 60 min
  {
    id: 'teens-pop-spotlight-60',
    name: 'Teens Pop Spotlight',
    description: 'Pop music speed, music ordering, wipeout — a pop-dedicated night with a visual edge.',
    icon: '🎵',
    difficulty: 'Hard',
    rounds: [
      { type: 'general_trivia', category: 'Children', difficulty: 'hard' },
      { type: 'speed_round',    category: 'Pop Music', difficulty: 'hard' },
      { type: 'wipeout',        category: 'Children', difficulty: 'hard' },
      { type: 'hidden_object',  category: 'all',      difficulty: 'hard' },
      { type: 'order_image',    category: 'Music',    difficulty: 'hard' },
      { type: 'general_trivia', category: 'Children', difficulty: 'medium' },
    ],
    tags: ['Audience: Teens', 'Topic: Pop Culture', 'Duration: ≈60m']
  },
 
  // ~~~ TEENS: "Teens Mix & Match"
  // Q-time: 9+4+9+5+6+9+4 = 46 min → 1 break → 61 min ≈ 65 min
  {
    id: 'teens-mix-match-65',
    name: 'Teens Mix & Match',
    description: 'Broad mix for teens — sport speed, hard wipeout, visual ordering, find-it-fast, and trivia anchors.',
    icon: '🎧',
    difficulty: 'Hard',
    rounds: [
      { type: 'general_trivia', category: 'Children', difficulty: 'hard' },
      { type: 'speed_round',    category: 'Sport',    difficulty: 'hard' },
      { type: 'wipeout',        category: 'Children', difficulty: 'hard' },
      { type: 'hidden_object',  category: 'all',      difficulty: 'hard' },
      { type: 'order_image',    category: 'Sport',    difficulty: 'hard' },
      { type: 'general_trivia', category: 'Children', difficulty: 'medium' },
      { type: 'speed_round',    category: 'Emojis',   difficulty: 'hard' },
    ],
    tags: ['Audience: Teens', 'Topic: Mixed', 'Duration: ≈65m']
  },
 
  // ~~~ TEENS: "Teens Quiz Battle"
  // Q-time: 9+4+9+5+6+9+4+9 = 55 min → 1 break → 70 min ≈ 70 min
  {
    id: 'teens-quiz-battle-70',
    name: 'Teens Quiz Battle',
    description: 'The hardest teen format — double trivia, double wipeout, all visual rounds, and two speed bursts.',
    icon: '🗡️',
    difficulty: 'Hard',
    rounds: [
      { type: 'general_trivia', category: 'Children', difficulty: 'hard' },
      { type: 'speed_round',    category: 'Emojis',   difficulty: 'hard' },
      { type: 'wipeout',        category: 'Children', difficulty: 'hard' },
      { type: 'hidden_object',  category: 'all',      difficulty: 'hard' },
      { type: 'order_image',    category: 'Film',     difficulty: 'hard' },
      { type: 'general_trivia', category: 'Children', difficulty: 'hard' },
      { type: 'speed_round',    category: 'Pop Music', difficulty: 'hard' },
      { type: 'wipeout',        category: 'Children', difficulty: 'medium' },
    ],
    tags: ['Audience: Teens', 'Topic: Mixed', 'Duration: ≈70m']
  },
 
  // ~~~ TEENS: "Teens Fundraiser"
  // Q-time: 9+4+9+5+6+9+4 = 46 min → 1 break → 61 min ≈ 65 min
  {
    id: 'teens-fundraiser-65',
    name: 'Teens Fundraiser',
    description: 'Balanced fundraiser night — every round type, two speed bursts, and mixed difficulty to suit all teens.',
    icon: '💬',
    difficulty: 'Hard',
    rounds: [
      { type: 'general_trivia', category: 'Children', difficulty: 'hard' },
      { type: 'speed_round',    category: 'Emojis',   difficulty: 'hard' },
      { type: 'wipeout',        category: 'Children', difficulty: 'hard' },
      { type: 'hidden_object',  category: 'all',      difficulty: 'hard' },
      { type: 'order_image',    category: 'Film',     difficulty: 'medium' },
      { type: 'general_trivia', category: 'Children', difficulty: 'medium' },
      { type: 'speed_round',    category: 'Pop Music', difficulty: 'medium' },
    ],
    tags: ['Audience: Teens', 'Topic: Mixed', 'Duration: ≈65m']
  },
 
  // ~~~ TEENS: "Teens History & Geography"
  // Q-time: 9+4+9+5+6+9 = 42 min → 1 break → 57 min ≈ 60 min
  {
    id: 'teens-history-geography-60',
    name: 'Teens History & Geography',
    description: 'Flags speed, world history and geography ordering, hard wipeout — for teens with curious minds.',
    icon: '📜',
    difficulty: 'Hard',
    rounds: [
      { type: 'general_trivia', category: 'Children',          difficulty: 'hard' },
      { type: 'speed_round',    category: 'Flags of the World', difficulty: 'hard' },
      { type: 'wipeout',        category: 'Children',          difficulty: 'hard' },
      { type: 'hidden_object',  category: 'all',               difficulty: 'hard' },
      { type: 'order_image',    category: 'World History',     difficulty: 'hard' },
      { type: 'general_trivia', category: 'Children',          difficulty: 'medium' },
    ],
    tags: ['Audience: Teens', 'Topic: History', 'Duration: ≈60m']
  },
 
  // ~~~ TEENS: "Teens Science & Tech"
  // Q-time: 9+4+9+5+6+6 = 39 min → no break → total ≈ 52 min
  {
    id: 'teens-science-tech-50',
    name: 'Teens Science & Tech',
    description: 'Space, science, tech ordering, maths speed, and hard wipeout — for the STEM-curious teen.',
    icon: '🔬',
    difficulty: 'Hard',
    rounds: [
      { type: 'general_trivia', category: 'Children', difficulty: 'hard' },
      { type: 'speed_round',    category: 'Math',     difficulty: 'hard' },
      { type: 'wipeout',        category: 'Children', difficulty: 'hard' },
      { type: 'hidden_object',  category: 'all',      difficulty: 'hard' },
      { type: 'order_image',    category: 'Space',    difficulty: 'hard' },
      { type: 'order_image',    category: 'Technology', difficulty: 'hard' },
    ],
    tags: ['Audience: Teens', 'Topic: Science', 'Duration: ≈52m']
  },
 
  // ═══════════════════════════════════════════════════════════════════════════
  // FAMILY FRIENDLY (10)
  // Full category range | easy/medium mix
  // ═══════════════════════════════════════════════════════════════════════════
 
  // ~~~ FAMILY: "Family Fiesta"
  // Q-time: 9+4+9+5+6 = 33 min → no break → total ≈ 45 min
  {
    id: 'family-fiesta-45',
    name: 'Family Fiesta',
    description: 'A quick, accessible family night — one of every round type, easy difficulty, great for all ages.',
    icon: '👨‍👩‍👧‍👦',
    difficulty: 'Easy',
    rounds: [
      { type: 'general_trivia', category: 'General Knowledge', difficulty: 'easy' },
      { type: 'speed_round',    category: 'Emojis',            difficulty: 'easy' },
      { type: 'wipeout',        category: 'General Knowledge', difficulty: 'easy' },
      { type: 'hidden_object',  category: 'all',               difficulty: 'easy' },
      { type: 'order_image',    category: 'Food & Drink',      difficulty: 'easy' },
    ],
    tags: ['Audience: Family Friendly', 'Topic: Mixed', 'Duration: ≈45m']
  },
 
  // ~~~ FAMILY: "Family Emoji Dash"
  // Q-time: 9+4+9+5+4+6 = 37 min → no break → total ≈ 50 min
  {
    id: 'family-emoji-dash-50',
    name: 'Family Emoji Dash',
    description: 'Two emoji speed rounds, gentle trivia, find-it-fast, and nature ordering — a crowd pleaser for all ages.',
    icon: '🙂',
    difficulty: 'Easy',
    rounds: [
      { type: 'speed_round',    category: 'Emojis',            difficulty: 'easy' },
      { type: 'general_trivia', category: 'General Knowledge', difficulty: 'easy' },
      { type: 'wipeout',        category: 'General Knowledge', difficulty: 'easy' },
      { type: 'hidden_object',  category: 'all',               difficulty: 'easy' },
      { type: 'speed_round',    category: 'Emojis',            difficulty: 'easy' },
      { type: 'order_image',    category: 'Nature',            difficulty: 'easy' },
    ],
    tags: ['Audience: Family Friendly', 'Topic: Mixed', 'Duration: ≈50m']
  },
 
  // ~~~ FAMILY: "Family Weekender"
  // Q-time: 9+4+9+5+6+9 = 42 min → 1 break → 57 min ≈ 60 min
  {
    id: 'family-weekender-60',
    name: 'Family Weekender',
    description: 'A classic family night with trivia, wipeout, speed, find-it-fast, and image ordering — one for everyone.',
    icon: '🎈',
    difficulty: 'Easy',
    rounds: [
      { type: 'general_trivia', category: 'General Knowledge', difficulty: 'easy' },
      { type: 'speed_round',    category: 'Emojis',            difficulty: 'easy' },
      { type: 'wipeout',        category: 'General Knowledge', difficulty: 'medium' },
      { type: 'hidden_object',  category: 'all',               difficulty: 'easy' },
      { type: 'order_image',    category: 'Nature',            difficulty: 'easy' },
      { type: 'general_trivia', category: 'Pop Culture',       difficulty: 'easy' },
    ],
    tags: ['Audience: Family Friendly', 'Topic: Mixed', 'Duration: ≈60m']
  },
 
  // ~~~ FAMILY: "Family Geography Night"
  // Q-time: 9+4+9+5+6+9 = 42 min → 1 break → 57 min ≈ 60 min
  {
    id: 'family-geography-60',
    name: 'Family Geography Night',
    description: 'World capitals, flags speed, geography ordering, find-it-fast, and wipeout — the whole world in one night.',
    icon: '🌍',
    difficulty: 'Medium',
    rounds: [
      { type: 'general_trivia', category: 'World Capitals',    difficulty: 'medium' },
      { type: 'speed_round',    category: 'Flags of the World', difficulty: 'easy' },
      { type: 'wipeout',        category: 'History',           difficulty: 'medium' },
      { type: 'hidden_object',  category: 'all',               difficulty: 'easy' },
      { type: 'order_image',    category: 'Geography',         difficulty: 'medium' },
      { type: 'general_trivia', category: 'General Knowledge', difficulty: 'easy' },
    ],
    tags: ['Audience: Family Friendly', 'Topic: Geography', 'Duration: ≈60m']
  },
 
  // ~~~ FAMILY: "Family Pop Parade"
  // Q-time: 9+4+9+5+6+9 = 42 min → 1 break → 57 min ≈ 60 min
  {
    id: 'family-pop-parade-60',
    name: 'Family Pop Parade',
    description: 'Artists, chart moments, music ordering, and wipeout — no audio playback needed.',
    icon: '🎤',
    difficulty: 'Easy',
    rounds: [
      { type: 'general_trivia', category: 'Pop Music',         difficulty: 'easy' },
      { type: 'speed_round',    category: 'Pop Music',         difficulty: 'easy' },
      { type: 'wipeout',        category: 'Pop Culture',       difficulty: 'medium' },
      { type: 'hidden_object',  category: 'all',               difficulty: 'easy' },
      { type: 'order_image',    category: 'Music',             difficulty: 'easy' },
      { type: 'general_trivia', category: 'General Knowledge', difficulty: 'easy' },
    ],
    tags: ['Audience: Family Friendly', 'Topic: Pop Culture', 'Duration: ≈60m']
  },
 
  // ~~~ FAMILY: "Family History Trail"
  // Q-time: 9+4+9+5+6+9 = 42 min → 1 break → 57 min ≈ 60 min
  {
    id: 'family-history-trail-60',
    name: 'Family History Trail',
    description: 'Approachable history, emoji speed, find-it-fast, world history ordering, and wipeout for the brave.',
    icon: '🏛️',
    difficulty: 'Medium',
    rounds: [
      { type: 'general_trivia', category: 'History',           difficulty: 'medium' },
      { type: 'speed_round',    category: 'Emojis',            difficulty: 'easy' },
      { type: 'wipeout',        category: 'General Knowledge', difficulty: 'medium' },
      { type: 'hidden_object',  category: 'all',               difficulty: 'medium' },
      { type: 'order_image',    category: 'World History',     difficulty: 'medium' },
      { type: 'general_trivia', category: 'Pop Culture',       difficulty: 'medium' },
    ],
    tags: ['Audience: Family Friendly', 'Topic: History', 'Duration: ≈60m']
  },
 
  // ~~~ FAMILY: "Family Sport Night"
  // Q-time: 9+4+9+5+6+9 = 42 min → 1 break → 57 min ≈ 60 min
  {
    id: 'family-sport-night-60',
    name: 'Family Sport Night',
    description: 'Sport speed, olympic trivia, wipeout, find-it-fast, and sport ordering — for sporty families.',
    icon: '🏟️',
    difficulty: 'Medium',
    rounds: [
      { type: 'speed_round',    category: 'Sport',             difficulty: 'easy' },
      { type: 'general_trivia', category: 'Olympic Sports',    difficulty: 'medium' },
      { type: 'wipeout',        category: 'General Knowledge', difficulty: 'medium' },
      { type: 'hidden_object',  category: 'all',               difficulty: 'medium' },
      { type: 'order_image',    category: 'Sport',             difficulty: 'easy' },
      { type: 'general_trivia', category: 'Pop Culture',       difficulty: 'medium' },
    ],
    tags: ['Audience: Family Friendly', 'Topic: Sports', 'Duration: ≈60m']
  },
 
  // ~~~ FAMILY: "Family Quiz Mix"
  // Q-time: 9+4+9+5+6+9+4 = 46 min → 1 break → 61 min ≈ 65 min
  {
    id: 'family-quiz-mix-65',
    name: 'Family Quiz Mix',
    description: 'The mixed-bag family night — two trivia anchors, wipeout, two speed rounds, find-it-fast, and ordering.',
    icon: '🧩',
    difficulty: 'Medium',
    rounds: [
      { type: 'general_trivia', category: 'General Knowledge', difficulty: 'easy' },
      { type: 'speed_round',    category: 'Emojis',            difficulty: 'easy' },
      { type: 'wipeout',        category: 'General Knowledge', difficulty: 'medium' },
      { type: 'hidden_object',  category: 'all',               difficulty: 'easy' },
      { type: 'order_image',    category: 'Film',              difficulty: 'easy' },
      { type: 'general_trivia', category: 'Pop Culture',       difficulty: 'medium' },
      { type: 'speed_round',    category: 'Pop Music',         difficulty: 'easy' },
    ],
    tags: ['Audience: Family Friendly', 'Topic: Mixed', 'Duration: ≈65m']
  },
 
  // ~~~ FAMILY: "Family Capitals Quest"
  // Q-time: 9+4+9+5+6+9 = 42 min → 1 break → 57 min ≈ 60 min
  {
    id: 'family-capitals-quest-60',
    name: 'Family Capitals Quest',
    description: 'Friendly geography — flags sprint, find-it-fast, geography ordering, wipeout, and capitals trivia.',
    icon: '🗺️',
    difficulty: 'Medium',
    rounds: [
      { type: 'general_trivia', category: 'World Capitals',    difficulty: 'medium' },
      { type: 'speed_round',    category: 'Flags of the World', difficulty: 'easy' },
      { type: 'wipeout',        category: 'General Knowledge', difficulty: 'medium' },
      { type: 'hidden_object',  category: 'all',               difficulty: 'easy' },
      { type: 'order_image',    category: 'Geography',         difficulty: 'easy' },
      { type: 'general_trivia', category: 'Pop Culture',       difficulty: 'medium' },
    ],
    tags: ['Audience: Family Friendly', 'Topic: Geography', 'Duration: ≈60m']
  },
 
  // ~~~ FAMILY: "Parents Night"
  // Q-time: 9+4+9+5+6+9+4 = 46 min → 1 break → 61 min ≈ 65 min
  {
    id: 'parents-night-65',
    name: 'Parents Night',
    description: 'Family-friendly overall with a grown-up edge — all round types, two speed bursts, and medium difficulty.',
    icon: '🧑‍🍼',
    difficulty: 'Medium',
    rounds: [
      { type: 'general_trivia', category: 'Pop Culture',       difficulty: 'medium' },
      { type: 'speed_round',    category: 'Emojis',            difficulty: 'easy' },
      { type: 'wipeout',        category: 'General Knowledge', difficulty: 'medium' },
      { type: 'hidden_object',  category: 'all',               difficulty: 'medium' },
      { type: 'order_image',    category: 'Film',              difficulty: 'medium' },
      { type: 'general_trivia', category: 'History',           difficulty: 'medium' },
      { type: 'speed_round',    category: 'Pop Music',         difficulty: 'easy' },
    ],
    tags: ['Audience: Family Friendly', 'Topic: Mixed', 'Duration: ≈65m']
  },
 
  // ═══════════════════════════════════════════════════════════════════════════
  // ADULTS (18) — 2 online short formats + 4 long formats (90–100 min)
  // Full category range | medium/hard difficulty
  // ═══════════════════════════════════════════════════════════════════════════
 
  // ~~~ ADULTS: "Online Quick Night" (short online)
  // Q-time: 9+4+9+5+6 = 33 min → no break → total ≈ 45 min
  {
    id: 'online-quick-night-45',
    name: 'Online Quick Night',
    description: 'A tight online quiz with all five round types — perfect for remote groups and virtual events.',
    icon: '💻',
    difficulty: 'Medium',
    rounds: [
      { type: 'general_trivia', category: 'General Knowledge', difficulty: 'medium' },
      { type: 'speed_round',    category: 'Emojis',            difficulty: 'medium' },
      { type: 'wipeout',        category: 'Pop Culture',       difficulty: 'medium' },
      { type: 'hidden_object',  category: 'all',               difficulty: 'medium' },
      { type: 'order_image',    category: 'Film',              difficulty: 'medium' },
    ],
    tags: ['Audience: Adults', 'Topic: Mixed', 'Duration: ≈45m', 'Format: Online']
  },
 
  // ~~~ ADULTS: "Online Blitz" (short online)
  // Q-time: 9+4+9+5+6+4 = 37 min → no break → total ≈ 50 min
  {
    id: 'online-blitz-50',
    name: 'Online Blitz',
    description: 'Fast-paced online format — pop culture theme, two speed rounds, all five round types, built for video calls.',
    icon: '⚡',
    difficulty: 'Medium',
    rounds: [
      { type: 'speed_round',    category: 'Pop Music',         difficulty: 'medium' },
      { type: 'general_trivia', category: 'Pop Culture',       difficulty: 'medium' },
      { type: 'wipeout',        category: 'Pop Culture',       difficulty: 'medium' },
      { type: 'hidden_object',  category: 'all',               difficulty: 'medium' },
      { type: 'order_image',    category: 'Music',             difficulty: 'medium' },
      { type: 'speed_round',    category: 'Emojis',            difficulty: 'medium' },
    ],
    tags: ['Audience: Adults', 'Topic: Pop Culture', 'Duration: ≈50m', 'Format: Online']
  },
 
  // ~~~ ADULTS: "General Challenge"
  // Q-time: 9+4+9+5+6+9 = 42 min → 1 break → 57 min ≈ 60 min
  {
    id: 'general-challenge-60',
    name: 'General Challenge',
    description: 'A balanced, no-theme crowd-pleaser with every round type and approachable medium difficulty.',
    icon: '🎯',
    difficulty: 'Medium',
    rounds: [
      { type: 'general_trivia', category: 'General Knowledge', difficulty: 'medium' },
      { type: 'speed_round',    category: 'Emojis',            difficulty: 'easy' },
      { type: 'wipeout',        category: 'General Knowledge', difficulty: 'medium' },
      { type: 'hidden_object',  category: 'all',               difficulty: 'medium' },
      { type: 'order_image',    category: 'Science',           difficulty: 'medium' },
      { type: 'general_trivia', category: 'Pop Culture',       difficulty: 'medium' },
    ],
    tags: ['Audience: Adults', 'Topic: General', 'Duration: ≈60m']
  },
 
  // ~~~ ADULTS: "Pub Classic"
  // Q-time: 9+4+9+5+6+9+9 = 51 min → 1 break → 66 min ≈ 65 min
  {
    id: 'pub-classic-65',
    name: 'Pub Classic',
    description: 'The traditional pub quiz — general knowledge, history, capitals, wipeout, speed, and all visual rounds.',
    icon: '🍺',
    difficulty: 'Medium',
    rounds: [
      { type: 'general_trivia', category: 'General Knowledge', difficulty: 'medium' },
      { type: 'speed_round',    category: 'Pop Music',         difficulty: 'easy' },
      { type: 'wipeout',        category: 'General Knowledge', difficulty: 'medium' },
      { type: 'hidden_object',  category: 'all',               difficulty: 'medium' },
      { type: 'order_image',    category: 'World History',     difficulty: 'medium' },
      { type: 'general_trivia', category: 'History',           difficulty: 'medium' },
      { type: 'general_trivia', category: 'World Capitals',    difficulty: 'medium' },
    ],
    tags: ['Audience: Adults', 'Topic: General', 'Duration: ≈65m']
  },
 
  // ~~~ ADULTS: "Pop Night"
  // Q-time: 9+4+9+5+6+9 = 42 min → 1 break → 57 min ≈ 60 min
  {
    id: 'adults-pop-night-60',
    name: 'Pop Night',
    description: 'Artists, lyrics, chart trivia — music ordering, wipeout, and no audio playback needed.',
    icon: '🎶',
    difficulty: 'Medium',
    rounds: [
      { type: 'general_trivia', category: 'Pop Music',         difficulty: 'medium' },
      { type: 'speed_round',    category: 'Pop Music',         difficulty: 'hard' },
      { type: 'wipeout',        category: 'Pop Culture',       difficulty: 'medium' },
      { type: 'hidden_object',  category: 'all',               difficulty: 'medium' },
      { type: 'order_image',    category: 'Music',             difficulty: 'medium' },
      { type: 'general_trivia', category: 'General Knowledge', difficulty: 'medium' },
    ],
    tags: ['Audience: Adults', 'Topic: Pop Culture', 'Duration: ≈60m']
  },
 
  // ~~~ ADULTS: "Sports Night"
  // Q-time: 9+4+9+5+6+9 = 42 min → 1 break → 57 min ≈ 60 min
  {
    id: 'sports-night-60',
    name: 'Sports Night',
    description: 'Olympic sports, sport speed, wipeout, find-it-fast, and sport ordering — a proper sports pub night.',
    icon: '🏅',
    difficulty: 'Medium',
    rounds: [
      { type: 'general_trivia', category: 'Olympic Sports',    difficulty: 'medium' },
      { type: 'speed_round',    category: 'Sport',             difficulty: 'medium' },
      { type: 'wipeout',        category: 'Olympic Sports',    difficulty: 'medium' },
      { type: 'hidden_object',  category: 'all',               difficulty: 'medium' },
      { type: 'order_image',    category: 'Sport',             difficulty: 'medium' },
      { type: 'general_trivia', category: 'History',           difficulty: 'medium' },
    ],
    tags: ['Audience: Adults', 'Topic: Sports', 'Duration: ≈60m']
  },
 
  // ~~~ ADULTS: "History Deep-Dive"
  // Q-time: 9+4+9+5+6+9+9 = 51 min → 1 break → 66 min ≈ 65 min
  {
    id: 'adults-history-deepdive-65',
    name: 'History Deep-Dive',
    description: 'For history buffs — hard trivia, wipeout, find-it-fast, chronological ordering, and a capitals anchor.',
    icon: '🏛️',
    difficulty: 'Hard',
    rounds: [
      { type: 'general_trivia', category: 'History',           difficulty: 'hard' },
      { type: 'speed_round',    category: 'Emojis',            difficulty: 'medium' },
      { type: 'wipeout',        category: 'History',           difficulty: 'hard' },
      { type: 'hidden_object',  category: 'all',               difficulty: 'hard' },
      { type: 'order_image',    category: 'World History',     difficulty: 'hard' },
      { type: 'general_trivia', category: 'World Capitals',    difficulty: 'medium' },
      { type: 'general_trivia', category: 'General Knowledge', difficulty: 'hard' },
    ],
    tags: ['Audience: Adults', 'Topic: History', 'Duration: ≈65m']
  },
 
  // ~~~ ADULTS: "Capitals Master"
  // Q-time: 9+4+9+5+6+9 = 42 min → 1 break → 57 min ≈ 60 min
  {
    id: 'adults-capitals-master-60',
    name: 'Capitals Master',
    description: 'Geography-heavy — flags speed, world capitals wipeout, geography ordering, find-it-fast.',
    icon: '🗺️',
    difficulty: 'Hard',
    rounds: [
      { type: 'general_trivia', category: 'World Capitals',    difficulty: 'hard' },
      { type: 'speed_round',    category: 'Flags of the World', difficulty: 'hard' },
      { type: 'wipeout',        category: 'World Capitals',    difficulty: 'hard' },
      { type: 'hidden_object',  category: 'all',               difficulty: 'hard' },
      { type: 'order_image',    category: 'Geography',         difficulty: 'hard' },
      { type: 'general_trivia', category: 'History',           difficulty: 'medium' },
    ],
    tags: ['Audience: Adults', 'Topic: Geography', 'Duration: ≈60m']
  },
 
  // ~~~ ADULTS: "Film & TV Night"
  // Q-time: 9+4+9+5+6+6+9 = 48 min → 1 break → 63 min ≈ 65 min
  {
    id: 'adults-film-tv-65',
    name: 'Film & TV Night',
    description: 'Pop culture trivia, film and TV ordering, speed, wipeout, and hidden objects — the full cinema experience.',
    icon: '🎬',
    difficulty: 'Medium',
    rounds: [
      { type: 'general_trivia', category: 'Pop Culture',       difficulty: 'medium' },
      { type: 'speed_round',    category: 'Emojis',            difficulty: 'medium' },
      { type: 'wipeout',        category: 'Pop Culture',       difficulty: 'medium' },
      { type: 'hidden_object',  category: 'all',               difficulty: 'medium' },
      { type: 'order_image',    category: 'Film',              difficulty: 'medium' },
      { type: 'order_image',    category: 'TV',                difficulty: 'medium' },
      { type: 'general_trivia', category: 'Pop Music',         difficulty: 'medium' },
    ],
    tags: ['Audience: Adults', 'Topic: Pop Culture', 'Duration: ≈65m']
  },
 
  // ~~~ ADULTS: "Olympic Special"
  // Q-time: 9+4+9+5+6+9 = 42 min → 1 break → 57 min ≈ 60 min
  {
    id: 'adults-olympic-special-60',
    name: 'Olympic Special',
    description: 'Sport sprint, Olympic trivia, wipeout, find-it-fast, and sport ordering — go for gold.',
    icon: '🥇',
    difficulty: 'Medium',
    rounds: [
      { type: 'general_trivia', category: 'Olympic Sports',    difficulty: 'medium' },
      { type: 'speed_round',    category: 'Sport',             difficulty: 'medium' },
      { type: 'wipeout',        category: 'Olympic Sports',    difficulty: 'hard' },
      { type: 'hidden_object',  category: 'all',               difficulty: 'medium' },
      { type: 'order_image',    category: 'Sport',             difficulty: 'hard' },
      { type: 'general_trivia', category: 'General Knowledge', difficulty: 'medium' },
    ],
    tags: ['Audience: Adults', 'Topic: Sports', 'Duration: ≈60m']
  },
 
  // --- LONG ADULT FORMATS ---
 
  // ~~~ ADULTS: "Pub Classic XL"
  // Q-time: 9+9+4+9+5+6+9+4+9 = 64 min → 2 breaks → 64+30 = 94 min ≈ 90 min
  {
    id: 'pub-classic-xl-90',
    name: 'Pub Classic XL',
    description: 'The big one — three trivia anchors, double wipeout, two speed bursts, find-it-fast, and history ordering.',
    icon: '🍻',
    difficulty: 'Hard',
    rounds: [
      { type: 'general_trivia', category: 'General Knowledge', difficulty: 'medium' },
      { type: 'wipeout',        category: 'General Knowledge', difficulty: 'medium' },
      { type: 'speed_round',    category: 'Pop Music',         difficulty: 'medium' },
      { type: 'general_trivia', category: 'History',           difficulty: 'medium' },
      { type: 'hidden_object',  category: 'all',               difficulty: 'medium' },
      { type: 'order_image',    category: 'World History',     difficulty: 'medium' },
      { type: 'general_trivia', category: 'World Capitals',    difficulty: 'hard' },
      { type: 'speed_round',    category: 'Emojis',            difficulty: 'hard' },
      { type: 'wipeout',        category: 'General Knowledge', difficulty: 'hard' },
    ],
    tags: ['Audience: Adults', 'Topic: General', 'Duration: ≈90m']
  },
 
  // ~~~ ADULTS: "Quiz Marathon"
  // Q-time: 9+4+9+9+5+6+4+9+9 = 64 min → 2 breaks → 64+30 = 94 min ≈ 90 min
  {
    id: 'adults-quiz-marathon-90',
    name: 'Quiz Marathon',
    description: 'The full endurance quiz — three trivia anchors, double wipeout, two speed bursts, ordering, and find-it-fast.',
    icon: '🏁',
    difficulty: 'Hard',
    rounds: [
      { type: 'general_trivia', category: 'General Knowledge', difficulty: 'medium' },
      { type: 'speed_round',    category: 'Emojis',            difficulty: 'medium' },
      { type: 'wipeout',        category: 'General Knowledge', difficulty: 'hard' },
      { type: 'general_trivia', category: 'History',           difficulty: 'hard' },
      { type: 'hidden_object',  category: 'all',               difficulty: 'hard' },
      { type: 'order_image',    category: 'World History',     difficulty: 'hard' },
      { type: 'speed_round',    category: 'Pop Music',         difficulty: 'medium' },
      { type: 'wipeout',        category: 'General Knowledge', difficulty: 'hard' },
      { type: 'general_trivia', category: 'Pop Culture',       difficulty: 'medium' },
    ],
    tags: ['Audience: Adults', 'Topic: Mixed', 'Duration: ≈90m']
  },
 
  // ~~~ ADULTS: "Charity Gala Night"
  // Q-time: 9+4+9+9+5+6+9+4+9 = 64 min → 2 breaks → 64+30 = 94 min ≈ 90 min
  {
    id: 'adults-charity-gala-90',
    name: 'Charity Gala Night',
    description: 'A polished, high-energy quiz for charity galas and fundraisers — every round type, built for big rooms.',
    icon: '🎗️',
    difficulty: 'Medium',
    rounds: [
      { type: 'general_trivia', category: 'General Knowledge', difficulty: 'medium' },
      { type: 'speed_round',    category: 'Pop Music',         difficulty: 'medium' },
      { type: 'wipeout',        category: 'Pop Culture',       difficulty: 'medium' },
      { type: 'general_trivia', category: 'Pop Music',         difficulty: 'medium' },
      { type: 'hidden_object',  category: 'all',               difficulty: 'easy' },
      { type: 'order_image',    category: 'Film',              difficulty: 'medium' },
      { type: 'general_trivia', category: 'History',           difficulty: 'medium' },
      { type: 'speed_round',    category: 'Emojis',            difficulty: 'medium' },
      { type: 'wipeout',        category: 'General Knowledge', difficulty: 'medium' },
    ],
    tags: ['Audience: Adults', 'Topic: Mixed', 'Duration: ≈90m']
  },
 
  // ~~~ ADULTS: "The Grand Night Out"
  // Q-time: 9+4+9+9+5+6+9+4+9+6 = 70 min → 2 breaks → 70+30 = 100 min ≈ 100 min
  {
    id: 'adults-grand-night-out-100',
    name: 'The Grand Night Out',
    description: 'The ultimate quiz night — three trivia anchors, double wipeout, two speed bursts, two ordering rounds, and find-it-fast.',
    icon: '🌟',
    difficulty: 'Hard',
    rounds: [
      { type: 'general_trivia', category: 'General Knowledge', difficulty: 'medium' },
      { type: 'speed_round',    category: 'Pop Music',         difficulty: 'medium' },
      { type: 'wipeout',        category: 'General Knowledge', difficulty: 'medium' },
      { type: 'general_trivia', category: 'History',           difficulty: 'hard' },
      { type: 'hidden_object',  category: 'all',               difficulty: 'medium' },
      { type: 'order_image',    category: 'World History',     difficulty: 'hard' },
      { type: 'general_trivia', category: 'World Capitals',    difficulty: 'hard' },
      { type: 'speed_round',    category: 'Emojis',            difficulty: 'hard' },
      { type: 'wipeout',        category: 'General Knowledge', difficulty: 'hard' },
      { type: 'order_image',    category: 'Science',           difficulty: 'hard' },
    ],
    tags: ['Audience: Adults', 'Topic: Mixed', 'Duration: ≈100m']
  },
 
  // ═══════════════════════════════════════════════════════════════════════════
  // WEB3 (4)
  // Max 2 × general_trivia + 1 × wipeout in 'Web3' category per quiz (12 q/level).
  // ═══════════════════════════════════════════════════════════════════════════
 
  // ~~~ WEB3: "Crypto Sprint" (short/online)
  // Q-time: 9+4+9+5+6 = 33 min → no break → total ≈ 45 min
  {
    id: 'web3-crypto-sprint-45',
    name: 'Crypto Sprint',
    description: 'Short Web3 quiz for online crypto communities and DAO events — all five round types, fast and focused.',
    icon: '₿',
    difficulty: 'Medium',
    rounds: [
      { type: 'general_trivia', category: 'Web3',         difficulty: 'easy' },
      { type: 'speed_round',    category: 'Math',         difficulty: 'medium' },
      { type: 'wipeout',        category: 'Web3',         difficulty: 'medium' },
      { type: 'hidden_object',  category: 'all',          difficulty: 'medium' },
      { type: 'order_image',    category: 'Technology',   difficulty: 'medium' },
    ],
    tags: ['Audience: Adults', 'Topic: Web3', 'Duration: ≈45m', 'Format: Online']
  },
 
  // ~~~ WEB3: "Future Shock"
  // Q-time: 9+4+9+5+6+9 = 42 min → 1 break → 57 min ≈ 60 min
  {
    id: 'future-shock-60',
    name: 'Future Shock',
    description: 'Web3 with approachable anchors — modern and curious, with visual rounds and speed challenges.',
    icon: '🪙',
    difficulty: 'Medium',
    rounds: [
      { type: 'general_trivia', category: 'Web3',              difficulty: 'easy' },
      { type: 'speed_round',    category: 'Emojis',            difficulty: 'hard' },
      { type: 'wipeout',        category: 'Web3',              difficulty: 'medium' },
      { type: 'hidden_object',  category: 'all',               difficulty: 'medium' },
      { type: 'order_image',    category: 'Technology',        difficulty: 'medium' },
      { type: 'general_trivia', category: 'General Knowledge', difficulty: 'medium' },
    ],
    tags: ['Audience: Adults', 'Topic: Web3', 'Duration: ≈60m']
  },
 
  // ~~~ WEB3: "Web3 Wise"
  // Q-time: 9+4+9+5+6+9 = 42 min → 1 break → 57 min ≈ 60 min
  {
    id: 'web3-wise-60',
    name: 'Web3 Wise',
    description: 'Harder Web3 questions with a tech ordering round, maths speed, and hard wipeout — for the true believer.',
    icon: '⛓️',
    difficulty: 'Hard',
    rounds: [
      { type: 'general_trivia', category: 'Web3',              difficulty: 'medium' },
      { type: 'speed_round',    category: 'Math',              difficulty: 'hard' },
      { type: 'wipeout',        category: 'Web3',              difficulty: 'hard' },
      { type: 'hidden_object',  category: 'all',               difficulty: 'hard' },
      { type: 'order_image',    category: 'Technology',        difficulty: 'hard' },
      { type: 'general_trivia', category: 'Pop Culture',       difficulty: 'medium' },
    ],
    tags: ['Audience: Adults', 'Topic: Web3', 'Duration: ≈60m']
  },
 
  // ~~~ WEB3: "Web3 Deep Dive"
  // Q-time: 9+4+9+9+5+6+9 = 51 min → 1 break → 66 min ≈ 65 min
  // Web3 q usage: easy(6) + medium(6) + hard(8) = 20 total across 3 separate difficulty pools — within 12/level limit
  {
    id: 'web3-deep-dive-65',
    name: 'Web3 Deep Dive',
    description: 'The most Web3-heavy quiz — all three difficulty levels, tech ordering, maths speed, and brutal hard wipeout.',
    icon: '🔗',
    difficulty: 'Hard',
    rounds: [
      { type: 'general_trivia', category: 'Web3',              difficulty: 'easy' },
      { type: 'speed_round',    category: 'Math',              difficulty: 'hard' },
      { type: 'general_trivia', category: 'Web3',              difficulty: 'medium' },
      { type: 'wipeout',        category: 'Web3',              difficulty: 'hard' },
      { type: 'hidden_object',  category: 'all',               difficulty: 'hard' },
      { type: 'order_image',    category: 'Technology',        difficulty: 'hard' },
      { type: 'general_trivia', category: 'General Knowledge', difficulty: 'hard' },
    ],
    tags: ['Audience: Adults', 'Topic: Web3', 'Duration: ≈65m']
  },
 
];
 
export default quizTemplates;


