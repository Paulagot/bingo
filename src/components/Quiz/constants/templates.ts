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
        type: 'wipeout',
        category: 'General Knowledge',
        difficulty: 'medium',
        customConfig: {
          questionsPerRound: 4,
          timePerQuestion: 10,
          pointsPerDifficulty: { easy: 2, medium: 3, hard: 4 },
          pointsLostPerWrong: 2,
          pointsLostPerUnanswered: 3,
        },
      },
      {
        type: 'speed_round',
        category: 'Math',
        difficulty: 'hard',
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

  // ─────────────────────────────────────────────────────────────────────────────
  // KIDS (10)
  // ─────────────────────────────────────────────────────────────────────────────
  // ~~~ KIDS: “Kids Sprint 35” (4 rounds, fast format)
  {
    id: 'kids-sprint-35',
    name: 'Kids Sprint',
    description: 'Short, energetic set for younger kids.',
    icon: '🏃‍♂️',
    difficulty: 'Easy',
    rounds: [
      { type: 'general_trivia', category: 'Children', difficulty: 'easy' },
      { type: 'speed_round',    category: 'Emojis',   difficulty: 'easy' },
      { type: 'general_trivia', category: 'Children', difficulty: 'easy' },
      { type: 'speed_round',    category: 'Math',     difficulty: 'easy' }
    ],
    tags: ['Audience: Kids', 'Topic: Mixed', 'Duration: ≈35m']
  },

  // ~~~ KIDS: “Kids Club Night” (5 rounds)
  {
    id: 'kids-club-45',
    name: 'Kids Club Night',
    description: 'Fun school/club set with Math and emoji speed.',
    icon: '🧒',
    difficulty: 'Easy',
    rounds: [
      { type: 'general_trivia', category: 'Children',       difficulty: 'easy' },
      { type: 'general_trivia', category: 'Children',       difficulty: 'easy' },
      { type: 'speed_round',    category: 'Math',           difficulty: 'easy' },
      { type: 'general_trivia', category: 'Pop Culture',    difficulty: 'easy' },
      { type: 'speed_round',    category: 'Emojis',         difficulty: 'easy' }
    ],
    tags: ['Audience: Kids', 'Topic: Mixed', 'Duration: ≈45m']
  },

  // ~~~ KIDS: “Kids Marathon” (6 rounds)
  {
    id: 'kids-marathon-60',
    name: 'Kids Marathon',
    description: 'Longer kid-friendly night for school halls and clubs.',
    icon: '🪀',
    difficulty: 'Easy',
    rounds: [
      { type: 'general_trivia', category: 'Children',          difficulty: 'easy' },
      { type: 'general_trivia', category: 'Children',          difficulty: 'easy' },
      { type: 'speed_round',    category: 'Emojis',            difficulty: 'easy' },
      { type: 'general_trivia', category: 'General Knowledge', difficulty: 'easy' },
      { type: 'general_trivia', category: 'Pop Culture',       difficulty: 'easy' },
      { type: 'speed_round',    category: 'Math',              difficulty: 'easy' }
    ],
    tags: ['Audience: Kids', 'Topic: Mixed', 'Duration: ≈60m']
  },

  // ~~~ KIDS: “Kids Capitals & Culture”
  {
    id: 'kids-capitals-50',
    name: 'Kids Capitals & Culture',
    description: 'Gentle geography with familiar culture anchors.',
    icon: '🗺️',
    difficulty: 'Easy',
    rounds: [
      { type: 'general_trivia', category: 'World Capitals', difficulty: 'easy' },
      { type: 'general_trivia', category: 'Children',       difficulty: 'easy' },
      { type: 'speed_round',    category: 'Emojis',         difficulty: 'easy' },
      { type: 'general_trivia', category: 'Pop Culture',    difficulty: 'easy' },
      { type: 'general_trivia', category: 'General Knowledge', difficulty: 'easy' }
    ],
    tags: ['Audience: Kids', 'Topic: Geography', 'Duration: ≈50m']
  },

  // ~~~ KIDS: “Kids Brainwave”
  {
    id: 'kids-brainwave-55',
    name: 'Kids Brainwave',
    description: 'A touch more challenge for older primary classes.',
    icon: '🧠',
    difficulty: 'Medium',
    rounds: [
      { type: 'general_trivia', category: 'Children',          difficulty: 'easy' },
      { type: 'general_trivia', category: 'General Knowledge', difficulty: 'medium' },
      { type: 'speed_round',    category: 'Math',              difficulty: 'easy' },
      { type: 'general_trivia', category: 'Pop Culture',       difficulty: 'medium' },
      { type: 'general_trivia', category: 'Children',          difficulty: 'easy' }
    ],
    tags: ['Audience: Kids', 'Topic: Mixed', 'Duration: ≈55m']
  },

  // ~~~ KIDS: “Kids Fundraiser”
  {
    id: 'kids-fundraiser-60',
    name: 'Kids Fundraiser',
    description: 'Designed for fun school fundraisers with big participation.',
    icon: '🎒',
    difficulty: 'Easy',
    rounds: [
      { type: 'general_trivia', category: 'Children',          difficulty: 'easy' },
      { type: 'speed_round',    category: 'Emojis',            difficulty: 'easy' },
      { type: 'general_trivia', category: 'General Knowledge', difficulty: 'easy' },
      { type: 'general_trivia', category: 'Children',          difficulty: 'easy' },
      { type: 'speed_round',    category: 'Emojis',            difficulty: 'easy' },
      { type: 'general_trivia', category: 'Pop Culture',       difficulty: 'easy' }
    ],
    tags: ['Audience: Kids', 'Topic: Mixed', 'Duration: ≈60m']
  },

  // ~~~ KIDS: “Kids Emoji Blitz”
  {
    id: 'kids-emoji-blitz-40',
    name: 'Kids Emoji Blitz',
    description: 'Fast emoji puzzles with friendly anchors.',
    icon: '😊',
    difficulty: 'Easy',
    rounds: [
      { type: 'speed_round',    category: 'Emojis',          difficulty: 'easy' },
      { type: 'general_trivia', category: 'Children',        difficulty: 'easy' },
      { type: 'speed_round',    category: 'Emojis',          difficulty: 'easy' },
      { type: 'general_trivia', category: 'General Knowledge', difficulty: 'easy' }
    ],
    tags: ['Audience: Kids', 'Topic: Mixed', 'Duration: ≈40m']
  },

  // ~~~ KIDS: “Kids Math Mania”
  {
    id: 'kids-math-mania-45',
    name: 'Kids Math Mania',
    description: 'Numbers and quick thinking in a friendly format.',
    icon: '🔢',
    difficulty: 'Easy',
    rounds: [
      { type: 'general_trivia', category: 'Children', difficulty: 'easy' },
      { type: 'speed_round',    category: 'Math',     difficulty: 'easy' },
      { type: 'general_trivia', category: 'Children', difficulty: 'easy' },
      { type: 'general_trivia', category: 'Pop Culture', difficulty: 'easy' }
    ],
    tags: ['Audience: Kids', 'Topic: Math', 'Duration: ≈45m']
  },

  // ~~~ KIDS: “Kids Pop Lite”
  {
    id: 'kids-pop-lite-50',
    name: 'Kids Pop Lite',
    description: 'Artist names and song facts—no audio playback.',
    icon: '🎤',
    difficulty: 'Easy',
    rounds: [
      { type: 'general_trivia', category: 'Pop Music',      difficulty: 'easy' },
      { type: 'general_trivia', category: 'Children',       difficulty: 'easy' },
      { type: 'speed_round',    category: 'Emojis',         difficulty: 'easy' },
      { type: 'general_trivia', category: 'General Knowledge', difficulty: 'easy' },
      { type: 'speed_round',    category: 'Emojis',         difficulty: 'easy' }
    ],
    tags: ['Audience: Kids', 'Topic: Pop Culture', 'Duration: ≈50m']
  },

  // ~~~ KIDS: “Kids Adventure Mix”
  {
    id: 'kids-adventure-55',
    name: 'Kids Adventure Mix',
    description: 'Friendly variety with movie and emoji sprints.',
    icon: '🧭',
    difficulty: 'Easy',
    rounds: [
      { type: 'general_trivia', category: 'Children',       difficulty: 'easy' },
      { type: 'speed_round',    category: 'Emojis',         difficulty: 'easy' },
      { type: 'general_trivia', category: 'General Knowledge', difficulty: 'easy' },
      { type: 'speed_round',    category: 'Emojis',         difficulty: 'easy' },
      { type: 'general_trivia', category: 'Pop Culture',    difficulty: 'easy' }
    ],
    tags: ['Audience: Kids', 'Topic: Mixed', 'Duration: ≈55m']
  },
  // ─────────────────────────────────────────────────────────────────────────────
  // TEENS (10)
  // ─────────────────────────────────────────────────────────────────────────────
  // -----------------------------------------------------------------------------
// CHUNK 2 — TEENS TEMPLATES (REBUILT)
// -----------------------------------------------------------------------------

// Duration reference:
// Trivia: 9m
// Wipeout: 9m
// Speed: 5m
// Breaks: +15m when inserted

// Teens difficulty mapping:
// • Children difficulty = medium | hard
// • Other categories difficulty = medium (unless template theme is "Hard")

// -----------------------------------------------------------------------------

// ~~~ TEENS: “Teens Hype Night”
// ~~~ TEENS: “Teens Hype Night”
{
  id: 'teens-hype-60',
  name: 'Teens Hype Night',
  description: 'High-energy mix with emoji and pop culture sprints.',
  icon: '🔥',
  difficulty: 'Medium',
  rounds: [
    { type: 'speed_round',    category: 'Emojis',          difficulty: 'medium' },
    { type: 'general_trivia', category: 'Pop Culture',     difficulty: 'medium' },
    { type: 'general_trivia', category: 'Pop Music',       difficulty: 'medium' },
    { type: 'wipeout',        category: 'Pop Culture',     difficulty: 'medium' },
    { type: 'speed_round',    category: 'Pop Music',       difficulty: 'medium' },
    { type: 'general_trivia', category: 'General Knowledge', difficulty: 'medium' }
  ],
  tags: ['Audience: Teens', 'Topic: Pop Culture', 'Duration: ≈60m']
},

// ~~~ TEENS: “Teens Mix & Match”
{
  id: 'teens-mix-70',
  name: 'Teens Mix & Match',
  description: 'Broader mix with sport speed and wipeout challenge.',
  icon: '🎧',
  difficulty: 'Medium',
  rounds: [
    { type: 'general_trivia', category: 'Pop Culture',      difficulty: 'medium' },
    { type: 'speed_round',    category: 'Sport',            difficulty: 'medium' },
    { type: 'general_trivia', category: 'Pop Music',        difficulty: 'medium' },
    { type: 'wipeout',        category: 'General Knowledge', difficulty: 'medium' },
    { type: 'general_trivia', category: 'History',          difficulty: 'medium' },
    { type: 'speed_round',    category: 'Emojis',           difficulty: 'medium' }
  ],
  tags: ['Audience: Teens', 'Topic: Mixed', 'Duration: ≈70m']
},

// ~~~ TEENS: “Teens Speed Rush”
{
  id: 'teens-speed-55',
  name: 'Teens Speed Rush',
  description: 'Compact night with two speed bursts and wipeout finale.',
  icon: '⚡',
  difficulty: 'Medium',
  rounds: [
    { type: 'speed_round',    category: 'Emojis',            difficulty: 'medium' },
    { type: 'general_trivia', category: 'Pop Culture',       difficulty: 'medium' },
    { type: 'speed_round',    category: 'Pop Music',         difficulty: 'medium' },
    { type: 'wipeout',        category: 'Pop Culture',       difficulty: 'medium' }
  ],
  tags: ['Audience: Teens', 'Topic: Mixed', 'Duration: ≈55m']
},

// ~~~ TEENS: “Teens Quiz Battle” (Hard)
{
  id: 'teens-quiz-battle-75',
  name: 'Teens Quiz Battle',
  description: 'Harder anchors and a wipeout closer for keen quizzers.',
  icon: '🗡️',
  difficulty: 'Hard',
  rounds: [
    { type: 'general_trivia', category: 'Pop Culture',      difficulty: 'medium' },
    { type: 'general_trivia', category: 'Pop Music',        difficulty: 'medium' },
    { type: 'speed_round',    category: 'Emojis',           difficulty: 'hard' },
    { type: 'general_trivia', category: 'History',          difficulty: 'hard' },
    { type: 'wipeout',        category: 'General Knowledge', difficulty: 'hard' },
    { type: 'general_trivia', category: 'World Capitals',   difficulty: 'hard' },
    { type: 'speed_round',    category: 'Pop Music',        difficulty: 'medium' }
  ],
  tags: ['Audience: Teens', 'Topic: Mixed', 'Duration: ≈75m']
},

// ~~~ TEENS: “Teens Sport & Music”
{
  id: 'teens-sport-music-60',
  name: 'Teens Sport & Music',
  description: 'Sport speed round with music and culture anchors.',
  icon: '🏅',
  difficulty: 'Medium',
  rounds: [
    { type: 'speed_round',    category: 'Sport',            difficulty: 'medium' },
    { type: 'general_trivia', category: 'Pop Music',        difficulty: 'medium' },
    { type: 'wipeout',        category: 'Sport',            difficulty: 'medium' },
    { type: 'general_trivia', category: 'Pop Culture',      difficulty: 'medium' },
    { type: 'general_trivia', category: 'General Knowledge', difficulty: 'medium' }
  ],
  tags: ['Audience: Teens', 'Topic: Sports', 'Duration: ≈60m']
},

// ~~~ TEENS: “Teens Fundraiser”
{
  id: 'teens-fundraiser-65',
  name: 'Teens Fundraiser',
  description: 'Balanced night that encourages extras and participation.',
  icon: '💬',
  difficulty: 'Medium',
  rounds: [
    { type: 'general_trivia', category: 'General Knowledge', difficulty: 'medium' },
    { type: 'speed_round',    category: 'Emojis',            difficulty: 'medium' },
    { type: 'general_trivia', category: 'Pop Culture',       difficulty: 'medium' },
    { type: 'general_trivia', category: 'History',           difficulty: 'medium' },
    { type: 'wipeout',        category: 'General Knowledge', difficulty: 'medium' },
    { type: 'speed_round',    category: 'Pop Music',         difficulty: 'medium' }
  ],
  tags: ['Audience: Teens', 'Topic: Mixed', 'Duration: ≈65m']
},

// ~~~ TEENS: “Teens Pop Spotlight”
{
  id: 'teens-pop-spotlight-60',
  name: 'Teens Pop Spotlight',
  description: 'Artists, lyrics, and chart moments—no audio playback.',
  icon: '🎵',
  difficulty: 'Medium',
  rounds: [
    { type: 'general_trivia', category: 'Pop Music',        difficulty: 'medium' },
    { type: 'speed_round',    category: 'Pop Music',        difficulty: 'medium' },
    { type: 'wipeout',        category: 'Pop Culture',      difficulty: 'medium' },
    { type: 'general_trivia', category: 'General Knowledge', difficulty: 'medium' },
    { type: 'speed_round',    category: 'Emojis',           difficulty: 'medium' }
  ],
  tags: ['Audience: Teens', 'Topic: Pop Culture', 'Duration: ≈60m']
},

// ~~~ TEENS: “Teens Emoji Gauntlet”
{
  id: 'teens-emoji-gauntlet-50',
  name: 'Teens Emoji Gauntlet',
  description: 'Emoji puzzles, pop culture, and a fast finish.',
  icon: '🧩',
  difficulty: 'Medium',
  rounds: [
    { type: 'speed_round',    category: 'Emojis',            difficulty: 'medium' },
    { type: 'general_trivia', category: 'Pop Culture',       difficulty: 'medium' },
    { type: 'wipeout',        category: 'Pop Culture',       difficulty: 'medium' },
    { type: 'speed_round',    category: 'Emojis',            difficulty: 'medium' }
  ],
  tags: ['Audience: Teens', 'Topic: Mixed', 'Duration: ≈50m']
},

// ~~~ TEENS: “Teens History Challenge”
{
  id: 'teens-history-challenge-65',
  name: 'Teens History Challenge',
  description: 'Approachable history with a fast emoji interlude.',
  icon: '📜',
  difficulty: 'Medium',
  rounds: [
    { type: 'general_trivia', category: 'History',            difficulty: 'medium' },
    { type: 'speed_round',    category: 'Emojis',             difficulty: 'medium' },
    { type: 'wipeout',        category: 'History',            difficulty: 'medium' },
    { type: 'general_trivia', category: 'General Knowledge',  difficulty: 'medium' },
    { type: 'general_trivia', category: 'World Capitals',     difficulty: 'medium' }
  ],
  tags: ['Audience: Teens', 'Topic: History', 'Duration: ≈65m']
},

// ~~~ TEENS: “Teens Capitals Sprint”
{
  id: 'teens-capitals-sprint-55',
  name: 'Teens Capitals Sprint',
  description: 'Geography anchors with quick-fire culture.',
  icon: '🧭',
  difficulty: 'Medium',
  rounds: [
    { type: 'general_trivia', category: 'World Capitals',     difficulty: 'medium' },
    { type: 'speed_round',    category: 'Emojis',             difficulty: 'medium' },
    { type: 'wipeout',        category: 'General Knowledge',  difficulty: 'medium' },
    { type: 'general_trivia', category: 'Pop Culture',        difficulty: 'medium' }
  ],
  tags: ['Audience: Teens', 'Topic: Geography', 'Duration: ≈55m']
},

  // ─────────────────────────────────────────────────────────────────────────────
  // FAMILY FRIENDLY (10)
  // ─────────────────────────────────────────────────────────────────────────────

//
// Duration reference:
// general_trivia = 9m
// wipeout = 9m
// speed_round = 5m
// Breaks: 15m added automatically by the UI
// Rounded to nearest 5 minutes
//

// ~~~ FAMILY: “Family Fiesta”
{
  id: 'family-fiesta-60',
  name: 'Family Fiesta',
  description: 'Accessible and upbeat—great for mixed ages.',
  icon: '👨‍👩‍👧‍👦',
  difficulty: 'Easy',
  rounds: [
    { type: 'general_trivia', category: 'General Knowledge', difficulty: 'easy' },
    { type: 'general_trivia', category: 'Pop Culture',        difficulty: 'easy' },
    { type: 'speed_round',    category: 'family movies',      difficulty: 'easy' },
    { type: 'wipeout',        category: 'General Knowledge',  difficulty: 'medium' },
    { type: 'general_trivia', category: 'History',            difficulty: 'easy' }
  ],
  tags: ['Audience: Family Friendly', 'Topic: Mixed', 'Duration: ≈60m']
},

// ~~~ FAMILY: “Family Weekender”
{
  id: 'family-weekender-75',
  name: 'Family Weekender',
  description: 'Longer family night with two quick sprints.',
  icon: '🎈',
  difficulty: 'Easy',
  rounds: [
    { type: 'general_trivia', category: 'General Knowledge', difficulty: 'easy' },
    { type: 'speed_round',    category: 'family movies',     difficulty: 'easy' },
    { type: 'general_trivia', category: 'Pop Culture',       difficulty: 'easy' },
    { type: 'wipeout',        category: 'General Knowledge', difficulty: 'medium' },
    { type: 'general_trivia', category: 'World Capitals',    difficulty: 'easy' },
    { type: 'speed_round',    category: 'Math',              difficulty: 'easy' },
    { type: 'general_trivia', category: 'History',           difficulty: 'easy' }
  ],
  tags: ['Audience: Family Friendly', 'Topic: Mixed', 'Duration: ≈75m']
},

// ~~~ FAMILY: “Parents Night”
{
  id: 'parents-night-60',
  name: 'Parents Night',
  description: 'Family-friendly overall with a grown-up edge.',
  icon: '🧑‍🍼',
  difficulty: 'Medium',
  rounds: [
    { type: 'general_trivia', category: 'Pop Culture',        difficulty: 'medium' },
    { type: 'general_trivia', category: 'History',            difficulty: 'medium' },
    { type: 'speed_round',    category: 'family movies',      difficulty: 'easy' },
    { type: 'wipeout',        category: 'General Knowledge',  difficulty: 'medium' },
    { type: 'general_trivia', category: 'World Capitals',     difficulty: 'medium' }
  ],
  tags: ['Audience: Family Friendly', 'Topic: Mixed', 'Duration: ≈60m']
},

// ~~~ FAMILY: “Family Geography Night”
{
  id: 'family-geography-55',
  name: 'Family Geography Night',
  description: 'World capitals with friendly anchors and one sprint.',
  icon: '🌍',
  difficulty: 'Medium',
  rounds: [
    { type: 'general_trivia', category: 'World Capitals',    difficulty: 'medium' },
    { type: 'general_trivia', category: 'General Knowledge', difficulty: 'easy' },
    { type: 'speed_round',    category: 'Emojis',            difficulty: 'easy' },
    { type: 'wipeout',        category: 'History',           difficulty: 'medium' },
    { type: 'general_trivia', category: 'Pop Culture',       difficulty: 'medium' }
  ],
  tags: ['Audience: Family Friendly', 'Topic: Geography', 'Duration: ≈55m']
},

// ~~~ FAMILY: “Family Pop Parade”
{
  id: 'family-pop-parade-60',
  name: 'Family Pop Parade',
  description: 'Artist names and chart moments—no audio playback.',
  icon: '🎤',
  difficulty: 'Easy',
  rounds: [
    { type: 'general_trivia', category: 'Pop Music',         difficulty: 'easy' },
    { type: 'general_trivia', category: 'General Knowledge', difficulty: 'easy' },
    { type: 'speed_round',    category: 'family movies',     difficulty: 'easy' },
    { type: 'wipeout',        category: 'Pop Culture',       difficulty: 'medium' },
    { type: 'general_trivia', category: 'World Capitals',    difficulty: 'easy' }
  ],
  tags: ['Audience: Family Friendly', 'Topic: Pop Culture', 'Duration: ≈60m']
},

// ~~~ FAMILY: “Family Emoji Dash”
{
  id: 'family-emoji-dash-50',
  name: 'Family Emoji Dash',
  description: 'Emoji puzzles and gentle anchors for mixed ages.',
  icon: '🙂',
  difficulty: 'Easy',
  rounds: [
    { type: 'speed_round',    category: 'Emojis',            difficulty: 'easy' },
    { type: 'general_trivia', category: 'General Knowledge', difficulty: 'easy' },
    { type: 'wipeout',        category: 'General Knowledge', difficulty: 'medium' },
    { type: 'speed_round',    category: 'Emojis',            difficulty: 'easy' }
  ],
  tags: ['Audience: Family Friendly', 'Topic: Mixed', 'Duration: ≈50m']
},

// ~~~ FAMILY: “Family History Trail”
{
  id: 'family-history-trail-65',
  name: 'Family History Trail',
  description: 'Approachable history with pop culture support.',
  icon: '🏛️',
  difficulty: 'Medium',
  rounds: [
    { type: 'general_trivia', category: 'History',            difficulty: 'medium' },
    { type: 'general_trivia', category: 'General Knowledge',  difficulty: 'easy' },
    { type: 'speed_round',    category: 'family movies',      difficulty: 'easy' },
    { type: 'wipeout',        category: 'General Knowledge',  difficulty: 'medium' },
    { type: 'general_trivia', category: 'Pop Culture',        difficulty: 'medium' }
  ],
  tags: ['Audience: Family Friendly', 'Topic: History', 'Duration: ≈65m']
},

// ~~~ FAMILY: “Family Capitals Quest”
{
  id: 'family-capitals-quest-60',
  name: 'Family Capitals Quest',
  description: 'Friendly geography with emoji sprint.',
  icon: '🗺️',
  difficulty: 'Medium',
  rounds: [
    { type: 'general_trivia', category: 'World Capitals',    difficulty: 'medium' },
    { type: 'speed_round',    category: 'Emojis',            difficulty: 'easy' },
    { type: 'wipeout',        category: 'General Knowledge', difficulty: 'medium' },
    { type: 'general_trivia', category: 'Pop Culture',       difficulty: 'medium' }
  ],
  tags: ['Audience: Family Friendly', 'Topic: Geography', 'Duration: ≈60m']
},

// ~~~ FAMILY: “Family Sport Night”
{
  id: 'family-sport-night-55',
  name: 'Family Sport Night',
  description: 'Sport sprint with culture and GK anchors.',
  icon: '🏟️',
  difficulty: 'Medium',
  rounds: [
    { type: 'speed_round',    category: 'Sport',             difficulty: 'easy' },
    { type: 'general_trivia', category: 'Pop Culture',       difficulty: 'medium' },
    { type: 'wipeout',        category: 'General Knowledge', difficulty: 'medium' },
    { type: 'general_trivia', category: 'History',           difficulty: 'medium' }
  ],
  tags: ['Audience: Family Friendly', 'Topic: Sports', 'Duration: ≈55m']
},

// ~~~ FAMILY: “Family Quiz Mix”
{
  id: 'family-quiz-mix-70',
  name: 'Family Quiz Mix',
  description: 'Mixed-level anchors to keep all ages engaged.',
  icon: '🧩',
  difficulty: 'Medium',
  rounds: [
    { type: 'general_trivia', category: 'General Knowledge', difficulty: 'easy' },
    { type: 'general_trivia', category: 'Pop Culture',       difficulty: 'medium' },
    { type: 'speed_round',    category: 'family movies',     difficulty: 'easy' },
    { type: 'wipeout',        category: 'General Knowledge', difficulty: 'medium' },
    { type: 'general_trivia', category: 'World Capitals',    difficulty: 'medium' }
  ],
  tags: ['Audience: Family Friendly', 'Topic: Mixed', 'Duration: ≈70m']
},

// -----------------------------------------------------------------------------
// CHUNK 4 — ADULTS TEMPLATES (REGENERATED)
// -----------------------------------------------------------------------------

//
// Duration reference:
// general_trivia = 9m
// wipeout = 9m
// speed_round = 5m
// Breaks: 15m auto
// Rounded to nearest 5 minutes
//


// ~~~ ADULTS: “Pub Classic 2.0”
{
  id: 'pub-classic-75',
  name: 'Pub Classic 2.0',
  description: 'Traditional balance with a pop culture sprint.',
  icon: '🍺',
  difficulty: 'Medium',
  rounds: [
    { type: 'general_trivia', category: 'General Knowledge', difficulty: 'medium' },
    { type: 'general_trivia', category: 'History',           difficulty: 'medium' },
    { type: 'wipeout',        category: 'General Knowledge', difficulty: 'medium' },
    { type: 'general_trivia', category: 'Pop Culture',       difficulty: 'medium' },
    { type: 'general_trivia', category: 'World Capitals',    difficulty: 'medium' },
    { type: 'speed_round',    category: 'Pop Music',         difficulty: 'easy' },
    { type: 'speed_round',    category: 'Emojis',            difficulty: 'easy' }
  ],
  tags: ['Audience: Adults', 'Topic: General', 'Duration: ≈75m']
},

// ~~~ ADULTS: “Pub Classic XL”
{
  id: 'pub-classic-90',
  name: 'Pub Classic XL',
  description: 'The big one: double wipeout and multiple speed bursts.',
  icon: '🍻',
  difficulty: 'Hard',
  rounds: [
    { type: 'general_trivia', category: 'General Knowledge', difficulty: 'medium' },
    { type: 'general_trivia', category: 'History',           difficulty: 'medium' },
    { type: 'wipeout',        category: 'General Knowledge', difficulty: 'medium' },
    { type: 'general_trivia', category: 'Pop Culture',       difficulty: 'medium' },
    { type: 'speed_round',    category: 'Pop Music',         difficulty: 'medium' },
    { type: 'wipeout',        category: 'General Knowledge', difficulty: 'hard' },
    { type: 'general_trivia', category: 'World Capitals',    difficulty: 'hard' }
  ],
  tags: ['Audience: Adults', 'Topic: General', 'Duration: ≈90m']
},

// ~~~ ADULTS: “Sports Night Reloaded”
{
  id: 'sports-reloaded-65',
  name: 'Sports Night Reloaded',
  description: 'Olympic sports focus with a sport sprint.',
  icon: '🏅',
  difficulty: 'Medium',
  rounds: [
    { type: 'general_trivia', category: 'Olympic Sports', difficulty: 'medium' },
    { type: 'speed_round',    category: 'Sport',           difficulty: 'medium' },
    { type: 'wipeout',        category: 'Olympic Sports', difficulty: 'medium' },
    { type: 'general_trivia', category: 'History',         difficulty: 'medium' },
    { type: 'general_trivia', category: 'General Knowledge', difficulty: 'medium' }
  ],
  tags: ['Audience: Adults', 'Topic: Sports', 'Duration: ≈65m']
},

// ~~~ ADULTS: “General Challenge”
{
  id: 'general-challenge-60',
  name: 'General Challenge',
  description: 'A balanced, no-theme crowd-pleaser.',
  icon: '🎯',
  difficulty: 'Medium',
  rounds: [
    { type: 'general_trivia', category: 'General Knowledge', difficulty: 'medium' },
    { type: 'speed_round',    category: 'Emojis',            difficulty: 'easy' },
    { type: 'general_trivia', category: 'Pop Culture',       difficulty: 'medium' },
    { type: 'general_trivia', category: 'History',           difficulty: 'medium' },
    { type: 'wipeout',        category: 'General Knowledge', difficulty: 'medium' }
  ],
  tags: ['Audience: Adults', 'Topic: General', 'Duration: ≈60m']
},

// ~~~ ADULTS: “Pop Night”
{
  id: 'adults-pop-night-60',
  name: 'Pop Night',
  description: 'Artists, lyrics, and chart trivia—no audio playback.',
  icon: '🎶',
  difficulty: 'Medium',
  rounds: [
    { type: 'general_trivia', category: 'Pop Music',         difficulty: 'medium' },
    { type: 'speed_round',    category: 'Pop Music',         difficulty: 'hard' },
    { type: 'wipeout',        category: 'Pop Culture',       difficulty: 'medium' },
    { type: 'general_trivia', category: 'General Knowledge', difficulty: 'medium' }
  ],
  tags: ['Audience: Adults', 'Topic: Pop Culture', 'Duration: ≈60m']
},

// ~~~ ADULTS: “History Deep Dive”
{
  id: 'adults-history-deepdive-75',
  name: 'History Deep-Dive',
  description: 'History focus with supportive anchors.',
  icon: '🏛️',
  difficulty: 'Hard',
  rounds: [
    { type: 'general_trivia', category: 'History',           difficulty: 'hard' },
    { type: 'general_trivia', category: 'World Capitals',    difficulty: 'medium' },
    { type: 'speed_round',    category: 'Emojis',            difficulty: 'medium' },
    { type: 'general_trivia', category: 'General Knowledge', difficulty: 'hard' },
    { type: 'wipeout',        category: 'History',           difficulty: 'hard' }
  ],
  tags: ['Audience: Adults', 'Topic: History', 'Duration: ≈75m']
},

// ~~~ ADULTS: “Capitals Master”
{
  id: 'adults-capitals-master-70',
  name: 'Capitals Master',
  description: 'Geography-heavy with a brisk emoji section.',
  icon: '🗺️',
  difficulty: 'Hard',
  rounds: [
    { type: 'general_trivia', category: 'World Capitals',    difficulty: 'hard' },
    { type: 'general_trivia', category: 'History',           difficulty: 'medium' },
    { type: 'speed_round',    category: 'Emojis',            difficulty: 'medium' },
    { type: 'general_trivia', category: 'General Knowledge', difficulty: 'hard' },
    { type: 'wipeout',        category: 'General Knowledge', difficulty: 'hard' }
  ],
  tags: ['Audience: Adults', 'Topic: Geography', 'Duration: ≈70m']
},

// ~~~ ADULTS: “Sports Fixture”
{
  id: 'adults-sports-fixture-65',
  name: 'Sports Fixture',
  description: 'Olympic sports anchors with a sport sprint.',
  icon: '⛳',
  difficulty: 'Medium',
  rounds: [
    { type: 'general_trivia', category: 'Olympic Sports', difficulty: 'medium' },
    { type: 'speed_round',    category: 'Sport',          difficulty: 'medium' },
    { type: 'general_trivia', category: 'General Knowledge', difficulty: 'medium' },
    { type: 'wipeout',        category: 'General Knowledge', difficulty: 'medium' },
    { type: 'general_trivia', category: 'Pop Culture',    difficulty: 'medium' }
  ],
  tags: ['Audience: Adults', 'Topic: Sports', 'Duration: ≈65m']
},

// ~~~ ADULTS: “Quiz Marathon”
{
  id: 'adults-quiz-marathon-90',
  name: 'Quiz Marathon',
  description: 'Extended night with two wipeouts and an emoji sprint.',
  icon: '🏁',
  difficulty: 'Hard',
  rounds: [
    { type: 'general_trivia', category: 'General Knowledge', difficulty: 'medium' },
    { type: 'wipeout',        category: 'General Knowledge', difficulty: 'hard' },
    { type: 'general_trivia', category: 'History',           difficulty: 'hard' },
    { type: 'general_trivia', category: 'World Capitals',    difficulty: 'medium' },
    { type: 'speed_round',    category: 'Emojis',            difficulty: 'medium' },
    { type: 'wipeout',        category: 'General Knowledge', difficulty: 'hard' },
    { type: 'general_trivia', category: 'Pop Culture',       difficulty: 'medium' }
  ],
  tags: ['Audience: Adults', 'Topic: Mixed', 'Duration: ≈90m']
},

// -----------------------------------------------------------------------------
// WEB3 TEMPLATE (Also Adults)
// -----------------------------------------------------------------------------

{
  id: 'future-shock-65',
  name: 'Future Shock',
  description: 'Web3 with approachable anchors—modern and curious.',
  icon: '🪙',
  difficulty: 'Medium',
  rounds: [
    { type: 'speed_round',    category: 'Emojis',            difficulty: 'hard' },
    { type: 'general_trivia', category: 'Web3',              difficulty: 'easy' },
    { type: 'general_trivia', category: 'Pop Culture',       difficulty: 'medium' },
    { type: 'wipeout',        category: 'Web3',              difficulty: 'medium' },
    { type: 'speed_round',    category: 'Math',              difficulty: 'hard' },
    { type: 'general_trivia', category: 'General Knowledge', difficulty: 'medium' }
  ],
  tags: ['Audience: Adults', 'Topic: Web3', 'Duration: ≈65m']
},
{
  id: 'Web3-wise-65',
  name: 'Web3 Wise',
  description: 'Web3 with a touch of modern quetions.',
  icon: '🪙',
  difficulty: 'Hard',
  rounds: [
    { type: 'speed_round',    category: 'Emojis',            difficulty: 'hard' },
    { type: 'general_trivia', category: 'Web3',              difficulty: 'medium' },
    { type: 'general_trivia', category: 'Pop Culture',       difficulty: 'medium' },
    { type: 'wipeout',        category: 'Web3',              difficulty: 'hard' },
    { type: 'speed_round',    category: 'Sport',              difficulty: 'hard' },
    { type: 'general_trivia', category: 'Pop Music',         difficulty: 'medium' }
  ],
  tags: ['Audience: Adults', 'Topic: Web3', 'Duration: ≈65m']
},

];

export default quizTemplates;


