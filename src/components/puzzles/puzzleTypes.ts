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

export interface PuzzleProgressMeta {
  /** Server-tracked active time so far, in seconds. Cosmetic only - scoring
   *  already uses the server's own value at submit time regardless of what
   *  this displays. Used to seed the resumed puzzle's visible timer instead
   *  of restarting it at 0. */
  activeSeconds: number;
  /** When this progress was last saved (ISO string), shown in the resume
   *  banner ("saved 4 minutes ago"). */
  savedAt: string | null;
}

export interface PuzzleLoadResponse {
  puzzle:             PuzzleInstance;
  progress:           Record<string, unknown> | null;
  /** Present alongside `progress` whenever there's saved progress to resume -
   *  null otherwise (fresh puzzle, or already submitted). */
  progressMeta:       PuzzleProgressMeta | null;
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
  instructions: string | string[];
  difficulty:         PuzzleDifficulty;
  puzzleData:         Record<string, unknown>;
  onSubmit:           (answer: Record<string, unknown>, timeTaken: number) => void;
  /** Explicit "Save & Exit" action - the caller is expected to navigate the
   *  player away after this resolves (PuzzlePage does). Do NOT wire this up
   *  as a periodic/background autosave source - use onAutosave for that,
   *  which has no such side effect. */
  onSaveProgress:     (state: Record<string, unknown>) => void;
  /** Silent background save used by debounced/periodic autosave. Must NOT
   *  navigate or have any other visible side effect - this fires every few
   *  seconds while the player is mid-puzzle. Optional: if omitted, autosave
   *  simply doesn't run and only the explicit Save & Exit button saves. */
  onAutosave?:        (state: Record<string, unknown>) => void | Promise<unknown>;
  /** Best-effort save specifically for the tab-hide/unload moment (e.g.
   *  puzzleService.saveProgressOnUnload, which uses `keepalive` so the
   *  request isn't cancelled mid-flight). Falls back to onAutosave if
   *  omitted - still attempted, just without the keepalive guarantee. */
  onSaveProgressOnUnload?: (state: Record<string, unknown>) => void;
  savedState?:        Record<string, unknown> | null;
  /** When the saved progress being offered was last written - shown in the
   *  resume banner. From PuzzleLoadResponse.progressMeta.savedAt. */
  savedAt?:           string | null;
  /** Server-tracked active time so far, in seconds - seeds the resumed
   *  puzzle's visible timer. Cosmetic only; does not affect scoring.
   *  From PuzzleLoadResponse.progressMeta.activeSeconds. */
  initialActiveSeconds?: number | null;
  isLoading?:         boolean;
  scoreResult?:       PuzzleScoreResult | null;
  /**
   * When true the shell starts in a permanently locked completed state.
   * Used when the player has already submitted this puzzle in a prior session.
   */
  initiallyCompleted?: boolean;
}