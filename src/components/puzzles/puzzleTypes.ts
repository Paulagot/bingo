// ─── Puzzle Types ────────────────────────────────────────────────────────────

export type PuzzleType =
  | 'sudoku'
  | 'deductionGrid'
  | 'spatialPacking'
  | 'wordSearch'
  | 'anagram'
  | 'sequenceOrdering'
  | 'matchPairs'
  | 'spotDifference'
  | 'patternCompletion'
  | 'hiddenObject'
  | 'slidingTile'
  | 'wordLadder'
  | 'cryptogram'
  | 'numberPath'
  | 'towersOfHanoi'
  | 'nonogram'
  | 'memoryPairs';

export type PuzzleDifficulty = 'easy' | 'medium' | 'hard';

export type PuzzlePageState =
  | 'locked'
  | 'notStarted'
  | 'inProgress'
  | 'submitted'
  | 'completed'
  | 'failedValidation';

// ─── Shared Engine Shapes ─────────────────────────────────────────────────────

export interface GeneratedPuzzleInstance {
  puzzleType:   PuzzleType;
  difficulty:   PuzzleDifficulty;
  seed:         string;
  puzzleData:   Record<string, unknown>;
  solutionData: Record<string, unknown>;
  meta?:        Record<string, unknown>;
}

export interface PlayerSubmission {
  puzzleType:       PuzzleType;
  answer:           Record<string, unknown>;
  timeTakenSeconds?: number;
  hintsUsed?:       number;
}

export interface PuzzleScoreResult {
  completed:    boolean;
  correct:      boolean;
  baseScore:    number;
  bonusScore:   number;
  penaltyScore: number;
  totalScore:   number;
  mistakes?:    number;
}

export interface ValidationResult {
  valid:   boolean;
  errors?: string[];
}

// ─── Service Response Shapes ──────────────────────────────────────────────────

export interface PuzzleLoadResponse {
  puzzle:             PuzzleInstance;
  progress:           Record<string, unknown> | null;
  /** Present when the player has already submitted this puzzle in a prior session. */
  previousSubmission: PuzzleScoreResult | null;
}

export interface PuzzleSubmitResponse {
  alreadySubmitted: boolean;
  validation:       ValidationResult;
  score:            PuzzleScoreResult;
}

export interface PuzzleInstance {
  id:         string;
  puzzleType: PuzzleType;
  difficulty: PuzzleDifficulty;
  puzzleData: Record<string, unknown>;
}

// ─── Anagram ──────────────────────────────────────────────────────────────────

export interface AnagramPuzzleData {
  scrambled:  string;
  letterBank: string[];
  clue?:      string;
}

export interface AnagramAnswer {
  answer: string;
}

// ─── Sequence Ordering ────────────────────────────────────────────────────────

export interface SequenceItem {
  id:    string;
  label: string;
}

export interface SequenceOrderingPuzzleData {
  prompt: string;
  items:  SequenceItem[];
}

export interface SequenceOrderingAnswer {
  orderedIds: string[];
}

// ─── Match Pairs ──────────────────────────────────────────────────────────────

export interface PairItem {
  id:    string;
  label: string;
}

export interface MatchPairsPuzzleData {
  leftItems:  PairItem[];
  rightItems: PairItem[];
}

export interface MatchPairsMatch {
  leftId:  string;
  rightId: string;
}

export interface MatchPairsAnswer {
  matches: MatchPairsMatch[];
}

// ─── Word Search ──────────────────────────────────────────────────────────────

export interface WordSearchPuzzleData {
  grid:     string[][];
  wordList: string[];
}

export interface WordSearchAnswer {
  foundWords: string[];
}

// ─── Sliding Tile ─────────────────────────────────────────────────────────────

export interface SlidingTilePuzzleData {
  grid:  number[][];
  size:  number;
  moves: number;
}

export interface SlidingTileAnswer {
  grid:      number[][];
  moveCount: number;
  solved:    boolean;
}

// ─── Sudoku ───────────────────────────────────────────────────────────────────

export interface SudokuPuzzleData {
  grid:       number[][];
  fixedCells: boolean[][];
}

export interface SudokuAnswer {
  grid:     number[][];
  complete: boolean;
}

// ─── Pattern Completion ───────────────────────────────────────────────────────

export interface PatternCompletionPuzzleData {
  matrix:  (string | null)[][];
  options: string[];
}

export interface PatternCompletionAnswer {
  selectedOption: string;
}

// ─── Word Ladder ──────────────────────────────────────────────────────────────

export interface WordLadderPuzzleData {
  startWord:  string;
  endWord:    string;
  wordLength: number;
  minSteps:   number;
}

export interface WordLadderAnswer {
  steps: string[];
}

// ─── Cryptogram ───────────────────────────────────────────────────────────────

export interface CryptogramPuzzleData {
  encoded:       string;
  uniqueLetters: number;
  hint:          { cipherLetter: string; plainLetter: string };
}

export interface CryptogramAnswer {
  letterMap: Record<string, string>;
  decoded:   string;
}

// ─── Number Path ──────────────────────────────────────────────────────────────

export interface NumberPathEndpoint {
  id:    number;
  start: [number, number];
  end:   [number, number];
}

export interface NumberPathPuzzleData {
  size:      number;
  endpoints: NumberPathEndpoint[];
}

export interface NumberPathAnswer {
  paths: Array<{ id: number; cells: [number, number][] }>;
}

// ─── Towers of Hanoi ──────────────────────────────────────────────────────────

export interface TowersOfHanoiPuzzleData {
  diskCount:   number;
  minMoves:    number;
  initialPegs: number[][];
}

export interface TowersOfHanoiAnswer {
  pegs:  number[][];
  moves: Array<{ from: number; to: number }>;
}

// ─── Nonogram ─────────────────────────────────────────────────────────────────

export interface NonogramPuzzleData {
  size:        number;
  rowClues:    number[][];
  colClues:    number[][];
  patternName: string;
}

export interface NonogramAnswer {
  grid: number[][];
}

// ─── Memory Pairs ─────────────────────────────────────────────────────────────

export interface MemoryPairsPuzzleData {
  cards:      Array<{ id: number }>;
  cardEmojis: string[];
  rows:       number;
  cols:       number;
  pairCount:  number;
}

export interface MemoryPairsAnswer {
  foundPairs: Array<{ cardId1: number; cardId2: number }>;
  attempts:   number;
}

// ─── Puzzle Shell Props ───────────────────────────────────────────────────────

export interface PuzzleShellProps {
  puzzleType:         PuzzleType;
  title:              string;
  instructions:       string;
  difficulty:         PuzzleDifficulty;
  puzzleData:         Record<string, unknown>;
  onSubmit:           (answer: Record<string, unknown>, timeTaken: number) => void;
  onSaveProgress:     (state: Record<string, unknown>) => void;
  savedState?:        Record<string, unknown> | null;
  isLoading?:         boolean;
  scoreResult?:       PuzzleScoreResult | null;
  /**
   * When true the shell starts in a permanently locked completed state.
   * Used when the player has already submitted this puzzle in a prior session.
   */
  initiallyCompleted?: boolean;
}