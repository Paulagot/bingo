// ─── Room Status ────────────────────────────────────────────────────────────
export const ROOM_STATUS = {
  WAITING: 'waiting',
  ACTIVE: 'active',
  RESULTS: 'results',
  ENDED: 'ended',
};

// ─── Round Phase ─────────────────────────────────────────────────────────────
export const ROUND_PHASE = {
  INTRO: 'intro',
  ACTIVE: 'active',
  SCORING: 'scoring',
  RESULTS: 'results',
  COMPLETE: 'complete',
};

// ─── Round Types ─────────────────────────────────────────────────────────────
export const ROUND_TYPE = {
  TRUE_CENTRE:       'true_centre',
  MIDPOINT_SPLIT:    'midpoint_split',
  STOP_THE_BAR:      'stop_the_bar',
  DRAW_ANGLE:        'draw_angle',
  FLASH_GRID:        'flash_grid',
  QUICK_COUNT:       'quick_count',
  FLASH_MATHS:       'flash_maths',
  LINE_LENGTH:       'line_length',
  BALANCE_POINT:     'balance_point',
  PATTERN_ALIGN:     'pattern_align',
  SEQUENCE_GAP:      'sequence_gap',
  COLOUR_COUNT:      'colour_count',
  TIME_ESTIMATION:   'time_estimation',
  CHARACTER_COUNT:   'character_count',
  REACTION_TAP: 'reaction_tap',
  MOVING_TARGET_TAP: 'moving_target_tap',
  PATH_TRACE: 'path_trace',
};

// ─── Game Rules ───────────────────────────────────────────────────────────────
// TOTAL_ROUNDS is the single number to change for 8 or 10 round games.
// Everything else derives from it automatically.
export const GAME_RULES = {
  MIN_PLAYERS: 2,
  MAX_PLAYERS: 200,
  TOTAL_ROUNDS: 8,              // ← change to 10 for a 10-round game
  FIRST_ELIMINATING_ROUND: 3,  // rounds 1 & 2 are always safe
};

// ─── Elimination Schedule ─────────────────────────────────────────────────────
// Built dynamically from GAME_RULES so changing TOTAL_ROUNDS recalculates
// the whole schedule automatically.
const buildEliminationSchedule = (totalRounds) => {
  const safeRounds = GAME_RULES.FIRST_ELIMINATING_ROUND - 1;
  const finalistRound = totalRounds - 1;
  const schedule = {};

  for (let r = 1; r <= totalRounds; r++) {
    if (r <= safeRounds) {
      schedule[r] = 0;
    } else if (r === finalistRound || r === totalRounds) {
      schedule[r] = null;
    } else {
      const middleRoundCount = finalistRound - safeRounds - 1;
      const position = r - safeRounds - 1;
      const fraction = middleRoundCount <= 1
        ? 0.05
        : 0.05 + (position / (middleRoundCount - 1)) * 0.25;
      schedule[r] = parseFloat(fraction.toFixed(2));
    }
  }

  return schedule;
};

export const ELIMINATION_SCHEDULE = buildEliminationSchedule(GAME_RULES.TOTAL_ROUNDS);

export const ROUND_7_TARGET_FINALISTS = 3;
export const ROUND_8_TARGET_WINNER = 1;

// ─── Timing (ms) ─────────────────────────────────────────────────────────────
export const TIMING = {
  INTRO_DURATION_MS: 10000,
  INTRO_COUNTDOWN_MS: 5000,
  REVEAL_DURATION_MS: 10000,
  RESULTS_DURATION_MS: 8000,
  DEFAULT_ROUND_DURATION_MS: 15000,
};

// ─── Round Durations by type (ms) ────────────────────────────────────────────
export const ROUND_DURATION = {
  [ROUND_TYPE.TRUE_CENTRE]:       15000,
  [ROUND_TYPE.MIDPOINT_SPLIT]:    15000,
  [ROUND_TYPE.STOP_THE_BAR]:      12000,
  [ROUND_TYPE.DRAW_ANGLE]:        18000,
  [ROUND_TYPE.FLASH_GRID]:        20000,
  [ROUND_TYPE.QUICK_COUNT]:       18000,
  [ROUND_TYPE.FLASH_MATHS]:       20000,
  [ROUND_TYPE.LINE_LENGTH]:       18000,
  [ROUND_TYPE.BALANCE_POINT]:     15000,
  [ROUND_TYPE.PATTERN_ALIGN]:     20000,
  [ROUND_TYPE.SEQUENCE_GAP]:      18000,
  [ROUND_TYPE.COLOUR_COUNT]:      18000,
  [ROUND_TYPE.TIME_ESTIMATION]:   15000,
  [ROUND_TYPE.CHARACTER_COUNT]:   18000,
   [ROUND_TYPE.REACTION_TAP]: 11000,
  [ROUND_TYPE.MOVING_TARGET_TAP]: 15000,
  [ROUND_TYPE.PATH_TRACE]: 19000,
};

// ─── Socket Events: Client → Server ──────────────────────────────────────────
export const CLIENT_EVENTS = {
  JOIN_ROOM: 'join_elimination_room',
  LEAVE_ROOM: 'leave_elimination_room',
  START_GAME: 'start_elimination_game',
  SUBMIT_ANSWER: 'submit_round_answer',
  SUBMIT_START_PRESS: 'submit_time_estimation_start',  // ← time estimation START press
  RECONNECT_PLAYER: 'reconnect_elimination_player',
};

// ─── Socket Events: Server → Client ──────────────────────────────────────────
export const SERVER_EVENTS = {
  ROOM_STATE: 'elimination_room_state',
  WAITING_ROOM_UPDATE: 'elimination_waiting_room_update',
  GAME_STARTED: 'elimination_game_started',
  ROUND_INTRO: 'elimination_round_intro',
  ROUND_STARTED: 'elimination_round_started',
  SUBMISSION_RECEIVED: 'elimination_submission_received',
  ROUND_REVEAL: 'elimination_round_reveal',
  ROUND_RESULTS: 'elimination_round_results',
  PLAYERS_ELIMINATED: 'elimination_players_eliminated',
  NEXT_ROUND: 'elimination_next_round',
  WINNER_DECLARED: 'elimination_winner_declared',
  ROOM_ENDED: 'elimination_room_ended',
  ERROR: 'elimination_error',
};

// ─── Round Pool ───────────────────────────────────────────────────────────────
export const ALL_ROUND_TYPES = [
  ROUND_TYPE.TRUE_CENTRE,
  ROUND_TYPE.MIDPOINT_SPLIT,
  ROUND_TYPE.STOP_THE_BAR,
  ROUND_TYPE.DRAW_ANGLE,
  ROUND_TYPE.FLASH_GRID,
  ROUND_TYPE.QUICK_COUNT,
  ROUND_TYPE.FLASH_MATHS,
  ROUND_TYPE.LINE_LENGTH,
  ROUND_TYPE.BALANCE_POINT,
  ROUND_TYPE.PATTERN_ALIGN,
  ROUND_TYPE.SEQUENCE_GAP,
  ROUND_TYPE.COLOUR_COUNT,
  ROUND_TYPE.TIME_ESTIMATION,
  ROUND_TYPE.CHARACTER_COUNT,
   ROUND_TYPE.REACTION_TAP,
  ROUND_TYPE.MOVING_TARGET_TAP,
  ROUND_TYPE.PATH_TRACE,
];

export const DEFAULT_ROUND_SEQUENCE = [
  ROUND_TYPE.TRUE_CENTRE,
  ROUND_TYPE.QUICK_COUNT,
  ROUND_TYPE.STOP_THE_BAR,
  ROUND_TYPE.MIDPOINT_SPLIT,
  ROUND_TYPE.FLASH_MATHS,
  ROUND_TYPE.DRAW_ANGLE,
  ROUND_TYPE.BALANCE_POINT,
  ROUND_TYPE.PATTERN_ALIGN,
];