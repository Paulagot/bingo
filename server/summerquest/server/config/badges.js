// Summer Quest — Badge Definitions
// Source of truth for badge metadata, seeded into fundraisely_tt_badges.
// Unlock LOGIC lives separately in services/SummerQuestBadgeService.js —
// this file is just the static display data.

export const BADGES = [
  { key: 'first_mission', name: 'First Mission', description: 'Complete your first daily log.', icon: 'Flag', colour: 'orange', sortOrder: 1 },
  { key: 'three_day_streak', name: '3-Day Streak', description: 'Complete 3 training days in a row.', icon: 'Flame', colour: 'orange', sortOrder: 2 },
  { key: 'full_week_hero', name: 'Full Week Hero', description: 'Complete Monday-Friday in one week.', icon: 'Star', colour: 'gold', sortOrder: 3 },
  { key: 'comeback_player', name: 'Comeback Player', description: 'Return after a missed day.', icon: 'RotateCcw', colour: 'green', sortOrder: 4 },
  { key: 'ball_mastery_builder', name: 'Ball Mastery Builder', description: 'Complete 10 ball mastery sessions.', icon: 'CircleDot', colour: 'orange', sortOrder: 5 },
  { key: 'passing_pro', name: 'Passing Pro', description: 'Complete 10 passing sessions.', icon: 'Target', colour: 'blue', sortOrder: 6 },
  { key: 'speed_star', name: 'Speed Star', description: 'Complete a sprint benchmark or 10 speed sessions.', icon: 'Zap', colour: 'green', sortOrder: 7 },
  { key: 'keepy_uppy_queen', name: 'Keepy-Uppy Queen', description: 'Submit a keepy-uppy score.', icon: 'Sparkles', colour: 'purple', sortOrder: 8 },
  { key: 'weak_foot_warrior', name: 'Weak Foot Warrior', description: 'Complete the Week 5 challenge.', icon: 'Footprints', colour: 'pink', sortOrder: 9 },
  { key: 'halfway_hero', name: 'Halfway Hero', description: 'Complete the Week 8 re-test.', icon: 'ClipboardCheck', colour: 'gold', sortOrder: 10 },
  { key: 'skills_showcaser', name: 'Skills Showcaser', description: 'Complete the Week 11 skills showcase.', icon: 'Sparkles', colour: 'purple', sortOrder: 11 },
  { key: 'summer_finisher', name: 'Summer Finisher', description: 'Complete the Week 12 final assessment.', icon: 'Trophy', colour: 'gold', sortOrder: 12 },
  { key: 'team_player', name: 'Team Player', description: 'Complete a Saturday free play/match day log.', icon: 'Users', colour: 'blue', sortOrder: 13 },
  { key: 'hydration_hero', name: 'Hydration Hero', description: 'Read the nutrition and hydration guide.', icon: 'Droplet', colour: 'blue', sortOrder: 14 },
];
