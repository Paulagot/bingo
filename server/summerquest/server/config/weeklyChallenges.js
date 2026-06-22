// Summer Quest — Weekly Challenge Config
// Single source of truth for the 12 weekly challenges.
// Used by: seed script (to populate metadata if you choose to store it
// in DB later) and as the canonical list the backend validates
// challenge_key against. The frontend has its own copy of this same
// shape in src/modules/summer-quest/config/weeklyChallenges.ts —
// keep them in sync manually since this is JS and that's TS.

export const WEEKLY_CHALLENGES = [
  {
    week: 1,
    key: 'keepy_uppy',
    title: 'Keepy-Uppy Challenge',
    description: 'Record your best score.',
    inputType: 'number',
    unit: 'juggles',
    icon: 'CircleDot',
    colour: 'purple',
  },
  {
    week: 2,
    key: 'dribble_slalom',
    title: 'Dribble Slalom',
    description: 'Time yourself through cones.',
    inputType: 'decimal',
    unit: 'seconds',
    icon: 'Route',
    colour: 'orange',
  },
  {
    week: 3,
    key: 'passing_accuracy',
    title: 'Passing Accuracy',
    description: 'Record your wall pass target score.',
    inputType: 'number_or_text',
    unit: 'score',
    icon: 'Target',
    colour: 'blue',
  },
  {
    week: 4,
    key: 'sprint_improvement',
    title: 'Sprint Improvement',
    description: 'Beat your Week 1 10m time.',
    inputType: 'decimal',
    unit: 'seconds',
    icon: 'Zap',
    colour: 'green',
  },
  {
    week: 5,
    key: 'weak_foot_day',
    title: 'Weak Foot Warrior',
    description: 'Complete exercises with your weak foot.',
    inputType: 'yes_no_note',
    icon: 'Footprints',
    colour: 'pink',
  },
  {
    week: 6,
    key: 'one_v_one',
    title: '1v1 Challenge',
    description: 'Challenge a parent, sibling, or friend.',
    inputType: 'select_note',
    icon: 'Swords',
    colour: 'red',
  },
  {
    week: 7,
    key: 'game_day',
    title: 'Game Day Focus',
    description: 'Play a full match and focus on one skill.',
    inputType: 'skill_focus',
    icon: 'Goal',
    colour: 'green',
  },
  {
    week: 8,
    key: 'halfway_test',
    title: 'Halfway Test',
    description: 'Re-test your sprint benchmarks.',
    inputType: 'benchmark_set',
    icon: 'ClipboardCheck',
    colour: 'gold',
  },
  {
    week: 9,
    key: 'heads_up_dribbling',
    title: 'Heads-Up Dribbling',
    description: 'Call colours while sprinting.',
    inputType: 'yes_no_note',
    icon: 'Eye',
    colour: 'teal',
  },
  {
    week: 10,
    key: 'endurance_test',
    title: 'Endurance Test',
    description: '10 x 20m sprints. Record your time.',
    inputType: 'decimal',
    unit: 'seconds',
    icon: 'Timer',
    colour: 'red',
  },
  {
    week: 11,
    key: 'skills_showcase',
    title: 'Skills Showcase',
    description: 'Show your three best moves.',
    inputType: 'three_text_fields',
    icon: 'Sparkles',
    colour: 'purple',
  },
  {
    week: 12,
    key: 'final_assessment',
    title: 'Final Assessment',
    description: 'Compare your progress to Week 1.',
    inputType: 'final_assessment',
    icon: 'Trophy',
    colour: 'gold',
  },
];

export function getChallengeForWeek(weekNumber) {
  return WEEKLY_CHALLENGES.find((c) => c.week === weekNumber) || null;
}
