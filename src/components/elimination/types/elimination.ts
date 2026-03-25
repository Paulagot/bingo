// ─── Round Types ──────────────────────────────────────────────────────────────
export type RoundType = 'true_centre' | 'midpoint_split' | 'stop_the_bar' | 'draw_angle' | 'flash_grid' | 'quick_count' | 'flash_maths' | 'line_length' | 'balance_point' | 'pattern_align';

export type RoomStatus = 'waiting' | 'active' | 'results' | 'ended';

export type RoundPhase = 'intro' | 'active' | 'scoring' | 'results' | 'complete';

// ─── Round Configs (discriminated union) ──────────────────────────────────────
export interface TrueCentreConfig {
  roundType: 'true_centre';
  shapeType: 'circle' | 'square' | 'rectangle' | 'triangle' | 'pentagon' | 'hexagon' | 'diamond';
  shapePosition: { x: number; y: number };
  shapeSize: { width: number; height: number };
  rotation: number;
  trueCentre: { x: number; y: number };
  durationMs: number;
}

export interface MidpointSplitConfig {
  roundType: 'midpoint_split';
  pointA: { x: number; y: number };
  pointB: { x: number; y: number };
  actualMidpoint: { x: number; y: number };
  layoutType: 'horizontal' | 'vertical' | 'diagonal_up' | 'diagonal_down';
  anchorSize: number;
  lineThickness: number;
  durationMs: number;
}

export interface StopTheBarConfig {
  roundType: 'stop_the_bar';
  durationMs: number;
  passes: number;
  speedWidthsPerSec: number;
  movementDirection: 'left_to_right' | 'right_to_left';
  targetPosition: number;
  targetWidth: number;
  barThickness: number;
  speedProfile: 'linear';
  roundStartTimestamp: number;
}

export interface DrawAngleConfig {
  roundType: 'draw_angle';
  targetAngle: number;
  initialAngle: number;
  anchorX: number;
  anchorY: number;
  guideVisibleMs: number;
  lineLength: number;
  durationMs: number;
}

export interface FlashGridConfig {
  roundType: 'flash_grid';
  gridSize: number;
  flashCells: { row: number; col: number }[];
  flashDurationMs: number;
  durationMs: number;
}

export interface QuickCountConfig {
  roundType: 'quick_count';
  dotCount: number;
  dots: { x: number; y: number }[];
  dotRadius: number;
  displayDurationMs: number;
  durationMs: number;
}

export interface FlashMathsConfig {
  roundType: 'flash_maths';
  numbers: number[];
  actualSum: number;
  displayDurationMs: number;
  positions: { x: number; y: number; fontSize: number }[];
  durationMs: number;
}

export interface LineLengthConfig {
  roundType: 'line_length';
  targetLength: number;
  orientation: 'horizontal' | 'vertical' | 'diagonal';
  referenceLineX: number;
  referenceLineY: number;
  playerStartX: number;
  playerStartY: number;
  referenceDurationMs: number;
  durationMs: number;
}

export interface BalancePointConfig {
  roundType: 'balance_point';
  weights: { position: number; weight: number }[];
  centreOfMass: number;
  lineY: number;
  totalWeight: number;
  durationMs: number;
}

export interface PatternAlignConfig {
  roundType: 'pattern_align';
  shapeType: string;
  shapeSize: number;
  targetX: number;
  targetY: number;
  targetRotation: number;
  playerStartX: number;
  playerStartY: number;
  playerStartRotation: number;
  targetVisibleMs: number;
  durationMs: number;
}

export type RoundConfig = TrueCentreConfig | MidpointSplitConfig | StopTheBarConfig | DrawAngleConfig | FlashGridConfig | QuickCountConfig | FlashMathsConfig | LineLengthConfig | BalancePointConfig | PatternAlignConfig;

// ─── Submissions (discriminated union) ────────────────────────────────────────
export interface TrueCentreSubmission {
  roundId: string;
  playerId: string;
  roundType: 'true_centre';
  submittedAt: number;
  tapX: number;
  tapY: number;
}

export interface MidpointSplitSubmission {
  roundId: string;
  playerId: string;
  roundType: 'midpoint_split';
  submittedAt: number;
  tapX: number;
  tapY: number;
}

export interface StopTheBarSubmission {
  roundId: string;
  playerId: string;
  roundType: 'stop_the_bar';
  submittedAt: number;
}

export interface DrawAngleSubmission { roundId: string; playerId: string; roundType: 'draw_angle'; submittedAt: number; angle: number; }
export interface FlashGridSubmission { roundId: string; playerId: string; roundType: 'flash_grid'; submittedAt: number; taps: { x: number; y: number }[]; }
export interface QuickCountSubmission { roundId: string; playerId: string; roundType: 'quick_count'; submittedAt: number; value: number; }
export interface FlashMathsSubmission { roundId: string; playerId: string; roundType: 'flash_maths'; submittedAt: number; value: number; }
export interface LineLengthSubmission { roundId: string; playerId: string; roundType: 'line_length'; submittedAt: number; length: number; }
export interface BalancePointSubmission { roundId: string; playerId: string; roundType: 'balance_point'; submittedAt: number; x: number; }
export interface PatternAlignSubmission { roundId: string; playerId: string; roundType: 'pattern_align'; submittedAt: number; position: { x: number; y: number }; rotation: number; }

export type RoundSubmission =
  | TrueCentreSubmission
  | MidpointSplitSubmission
  | StopTheBarSubmission
  | DrawAngleSubmission
  | FlashGridSubmission
  | QuickCountSubmission
  | FlashMathsSubmission
  | LineLengthSubmission
  | BalancePointSubmission
  | PatternAlignSubmission;

// ─── Reveal Data (new round types) ───────────────────────────────────────────
export interface DrawAngleReveal { roundType: 'draw_angle'; targetAngle: number; playerAngle: number; difference: number; errorDistance: number; score: number; }
export interface FlashGridReveal { roundType: 'flash_grid'; gridSize: number; flashCells: { row: number; col: number }[]; playerTaps: { x: number; y: number }[]; errorDistance: number; score: number; }
export interface QuickCountReveal { roundType: 'quick_count'; actualCount: number; playerGuess: number; difference: number; dots: { x: number; y: number }[]; errorDistance: number; score: number; }
export interface FlashMathsReveal { roundType: 'flash_maths'; numbers: number[]; actualSum: number; playerAnswer: number; difference: number; errorDistance: number; score: number; }
export interface LineLengthReveal { roundType: 'line_length'; targetLength: number; playerLength: number; difference: number; orientation: string; errorDistance: number; score: number; }
export interface BalancePointReveal { roundType: 'balance_point'; centreOfMass: number; playerX: number; weights: { position: number; weight: number }[]; errorDistance: number; score: number; }
export interface PatternAlignReveal { roundType: 'pattern_align'; targetX: number; targetY: number; targetRotation: number; playerX: number; playerY: number; playerRotation: number; positionError: number; rotationDiff: number; errorDistance: number; score: number; }

// ─── Results ──────────────────────────────────────────────────────────────────
export interface RoundResult {
  playerId: string;
  score: number;
  speedBonus: number;
  rank: number;
  survived: boolean;
  didSubmit: boolean;
  revealData: TrueCentreReveal | MidpointSplitReveal | StopTheBarReveal | DrawAngleReveal | FlashGridReveal | QuickCountReveal | FlashMathsReveal | LineLengthReveal | BalancePointReveal | PatternAlignReveal | null;
}

export interface TrueCentreReveal {
  roundType: 'true_centre';
  trueCentre: { x: number; y: number };
  playerTap: { x: number; y: number };
  errorDistance: number;
  score: number;
}

export interface MidpointSplitReveal {
  roundType: 'midpoint_split';
  pointA: { x: number; y: number };
  pointB: { x: number; y: number };
  actualMidpoint: { x: number; y: number };
  playerMarker: { x: number; y: number };
  errorDistance: number;
  score: number;
}

export interface StopTheBarReveal {
  roundType: 'stop_the_bar';
  targetPosition: number;
  playerStopPosition: number;
  errorDistance: number;
  score: number;
}

// ─── Player ───────────────────────────────────────────────────────────────────
export interface EliminationPlayer {
  playerId: string;
  name: string;
  connected: boolean;
  eliminated: boolean;
  eliminatedInRound: number | null;
  cumulativeScore: number;
  roundScores: Record<number, number>;
  hasSubmittedCurrentRound?: boolean;
}

// ─── Room ─────────────────────────────────────────────────────────────────────
export interface EliminationRoom {
  roomId: string;
  hostId: string;
  hostName: string;
  status: RoomStatus;
  players: EliminationPlayer[];
  activeRoundIndex: number;
  totalRounds: number;
  eliminatedPlayerIds: string[];
  winnerPlayerId: string | null;
  createdAt: string;
  startedAt: string | null;
  endedAt: string | null;
}

// ─── Active Round ─────────────────────────────────────────────────────────────
export interface ActiveRound {
  roundId: string;
  roundNumber: number;
  roundType: RoundType;
  phase: RoundPhase;
  config: RoundConfig;
  startedAt: number;
  endsAt: number;
}

// ─── Leaderboard ──────────────────────────────────────────────────────────────
export interface LeaderboardEntry {
  playerId: string;
  name: string;
  score: number;
  rank: number;
  survived: boolean;
  eliminated: boolean;
}

// ─── Game State (local frontend state) ───────────────────────────────────────
export type GameView =
  | 'lobby'
  | 'waiting'
  | 'round_intro'
  | 'round_active'
  | 'round_reveal'
  | 'round_results'
  | 'eliminated'
  | 'game_over'
  | 'winner';

export interface EliminationGameState {
  room: EliminationRoom | null;
  localPlayer: EliminationPlayer | null;
  activeRound: ActiveRound | null;
  lastResults: RoundResult[] | null;
  eliminatedThisRound: string[];
  winner: { winnerId: string; winnerName: string; finalStandings: RoundResult[] } | null;
  view: GameView;
  error: string | null;
}

// ─── Socket Event Payloads ────────────────────────────────────────────────────
export interface RoundIntroPayload {
  roundNumber: number;
  totalRounds: number;
  roundType: RoundType;
  roundId: string;
  introDurationMs: number;
  introCountdownMs: number;
  activePlayers: number;
  eliminationCount: number;
  eliminationMode: 'none' | 'percentage' | 'reduce_to_three' | 'final';
}

export interface RoundStartedPayload {
  roundId: string;
  roundNumber: number;
  roundType: RoundType;
  config: RoundConfig;
  startedAt: number;
  endsAt: number;
}

export interface RoundRevealPayload {
  roundId: string;
  roundNumber: number;
  roundType: RoundType;
  results: RoundResult[];
  revealDurationMs: number;
}

export interface RoundResultsPayload {
  roundId: string;
  roundNumber: number;
  results: RoundResult[];
}

export interface EliminatedPayload {
  roundNumber: number;
  eliminatedPlayerIds: string[];
  activePlayers: number;
}

export interface WinnerPayload {
  winnerId: string;
  winnerName: string;
  finalStandings: RoundResult[];
  roomSnapshot: EliminationRoom;
}