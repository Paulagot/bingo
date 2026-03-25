import { useState, useCallback } from 'react';
import PuzzleShell from '../PuzzleShell';
import type { PuzzleType, PuzzleDifficulty, PuzzleScoreResult } from '../puzzleTypes';
import { useAuthStore } from '../../../features/auth';



// ─── Config ───────────────────────────────────────────────────────────────────

const PUZZLE_TYPES: PuzzleType[] = ['anagram', 'sequenceOrdering', 'matchPairs', 'wordSearch', 'slidingTile', 'sudoku',  'patternCompletion', 'wordLadder', 'cryptogram', 'numberPath', 'towersOfHanoi', 'nonogram', 'memoryPairs'];
const DIFFICULTIES: PuzzleDifficulty[] = ['easy', 'medium', 'hard'];

// =============================================================================
// COMPLETE PUZZLE_META — replace the existing PUZZLE_META object in
// src/pages/PuzzleDevTestPage.tsx with this entire block
// =============================================================================

const PUZZLE_META: Record<string, { title: string; instructions: string }> = {

  anagram: {
    title: 'Anagram',
    instructions:
      'The letters of a word have been scrambled. Rearrange them to spell the correct word. ' +
      'Use the category hint if you get stuck. Type your answer in the box and hit Submit.',
  },

  sequenceOrdering: {
    title: 'Sequence Ordering',
    instructions:
      'The items below are in the wrong order. Drag and drop them into the correct sequence — ' +
      'for example chronological order, size order, or logical steps. ' +
      'When you are happy with the order hit Submit.',
  },

  matchPairs: {
    title: 'Match the Pairs',
    instructions:
      'Each item on the left belongs with exactly one item on the right. ' +
      'Click an item on the left to select it, then click its match on the right. ' +
      'A correct pair will lock in place. Match all pairs to complete the puzzle.',
  },

  wordSearch: {
    title: 'Word Search',
    instructions:
      'Find all the hidden words listed below inside the letter grid. ' +
      'Words can run left to right, right to left, top to bottom, bottom to top, or diagonally. ' +
      'Click and drag across the letters to select a word.',
  },

  slidingTile: {
    title: 'Sliding Tile Puzzle',
    instructions:
      'Slide the numbered tiles into order — 1 to 15 reading left to right, top to bottom — ' +
      'with the blank space in the bottom-right corner. ' +
      'Only tiles directly next to the blank space can move. Click a tile to slide it.',
  },

  sudoku: {
    title: 'Sudoku',
    instructions:
      'Fill every row, every column, and every 3×3 box with the digits 1 to 9. ' +
      'Each digit can only appear once in each row, column, and box. ' +
      'The darker-coloured cells are fixed — only the light cells can be changed. ' +
      'Tap a cell to select it, then tap a number on the pad below to fill it in.',
  },

  patternCompletion: {
    title: 'Pattern Completion',
    instructions:
      'Study the 3×3 grid of shapes carefully — there is a pattern in the colours and shapes across the rows and columns. ' +
      'The bottom-right cell is missing. ' +
      'Choose the option below that correctly completes the pattern and hit Submit.',
  },

  wordLadder: {
    title: 'Word Ladder',
    instructions:
      'Transform the top word into the bottom word, one step at a time. ' +
      'Each step must be a valid word that differs from the word above it by exactly one letter — ' +
      'you can change, add, or remove a single letter. ' +
      'Fill in the rungs of the ladder and hit Submit when done.',
  },

  cryptogram: {
    title: 'Cryptogram',
    instructions:
      'A secret phrase has been encoded — every letter has been swapped for a different letter. ' +
      'The same encoded letter always represents the same real letter throughout. ' +
      'Use logic and common words to crack the code. ' +
      'Click a letter in the phrase to select it, then type your guess. ' +
      'Green letters are free hints. Decode the full phrase and hit Submit.',
  },

  numberPath: {
    title: 'Number Path',
    instructions:
      'Each number on the grid appears exactly twice. Your goal is to connect each matching pair ' +
      'with a continuous path, AND fill every single cell on the grid. ' +
      'Paths cannot cross each other or share cells. ' +
      'Click and drag from a number to draw its path. All cells must be covered to win.',
  },

  towersOfHanoi: {
    title: 'Towers of Hanoi',
    instructions:
      'Move the entire stack of disks from peg A to peg C. ' +
      'There are two rules: you can only move one disk at a time (always the top disk on a peg), ' +
      'and you can never place a larger disk on top of a smaller one. ' +
      'Use peg B as a temporary space. ' +
      'Click a peg to pick up its top disk, then click the destination peg to place it. ' +
      'The fewer moves you use the better — can you match the minimum?',
  },

  nonogram: {
    title: 'Nonogram',
    instructions:
      'Fill in the grid to reveal a hidden pixel-art picture. ' +
      'The numbers along each row and column tell you how many consecutive filled cells there are in that line — ' +
      'for example "3" means exactly 3 filled cells in a row, and "2 1" means a group of 2, a gap, then a group of 1. ' +
      'Left-click a cell to fill it. Right-click to mark a cell as definitely empty (shown as ✕). ' +
      'Use logic to work out which cells must be filled. Hit Submit when the grid is complete.',
  },

  memoryPairs: {
    title: 'Memory Pairs',
    instructions:
      'All the cards are face down. Flip two cards at a time to try to find a matching pair. ' +
      'If they match they stay face up — if not, they flip back over. ' +
      'Remember where you have seen each symbol and use it to find the pairs faster. ' +
      'Find all matching pairs to complete the puzzle.',
  },

};

// ─── Types ────────────────────────────────────────────────────────────────────

interface LogEntry {
  time: string;
  type: 'info' | 'success' | 'error' | 'request' | 'response';
  message: string;
  detail?: string;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PuzzleDevTestPage() {
  const { club, entitlements, isAuthenticated } = useAuthStore();

  // Token lives only in localStorage under 'auth_token'
  const tokenFromStore = isAuthenticated ? localStorage.getItem('auth_token') : null;

  // Check all common property names — UUID clubs use club_id
  const clubId = (club as any)?.club_id
    ?? (club as any)?.id
    ?? (club as any)?.clubId
    ?? null;

  const [manualToken, setManualToken]     = useState('');
  const [challengeId, setChallengeId]     = useState('test-challenge-001');
  const [weekNumber, setWeekNumber]       = useState('1');
  const [selectedType, setSelectedType]   = useState<PuzzleType>('anagram');
  const [difficulty, setDifficulty]       = useState<PuzzleDifficulty>('medium');
  const [isStale, setIsStale]             = useState(false);

  // Puzzle state
  const [instanceId, setInstanceId]       = useState<number | null>(null);
  const [puzzleData, setPuzzleData]       = useState<Record<string, unknown> | null>(null);
  const [savedState, setSavedState]       = useState<Record<string, unknown> | null>(null);
  const [scoreResult, setScoreResult]     = useState<PuzzleScoreResult | null>(null);
  const [isLoading, setIsLoading]         = useState(false);
  const [shellKey, setShellKey]           = useState(0);

  const [log, setLog]                     = useState<LogEntry[]>([]);

  const token = tokenFromStore || manualToken;

  const addLog = useCallback((entry: Omit<LogEntry, 'time'>) => {
    setLog(prev => [{ ...entry, time: new Date().toLocaleTimeString() }, ...prev.slice(0, 49)]);
  }, []);

  const authHeaders = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  };

  // ── Step 1: Load puzzle from real backend ──────────────────────────────────

  const handleLoadPuzzle = async () => {
    if (!token) {
      addLog({ type: 'error', message: 'No token — paste one in the Token field below' });
      return;
    }

    setIsLoading(true);
    setScoreResult(null);
    setPuzzleData(null);
    setInstanceId(null);
    setSavedState(null);
    setIsStale(false);
    setShellKey(k => k + 1);

    const url = `/api/puzzles/${challengeId}/${weekNumber}?puzzleType=${selectedType}&difficulty=${difficulty}`;
    addLog({ type: 'request', message: `GET ${url}` });

    try {
      const res  = await fetch(url, { headers: authHeaders });
      const body = await res.json();

      addLog({
        type:    res.ok ? 'response' : 'error',
        message: `${res.status} ${res.statusText}`,
        detail:  JSON.stringify(body, null, 2),
      });

      if (res.ok) {
        setInstanceId(body.puzzle.id);
        setPuzzleData(body.puzzle.puzzleData);
        setSavedState(body.progress ?? null);
        addLog({ type: 'success', message: `Puzzle loaded — instanceId: ${body.puzzle.id}, type: ${body.puzzle.puzzleType}` });
        if (body.progress) addLog({ type: 'info', message: 'Saved progress found — resuming' });
      }
    } catch (err: any) {
      addLog({ type: 'error', message: `Fetch failed: ${err.message}` });
    } finally {
      setIsLoading(false);
    }
  };

  // ── Step 2: Save progress ──────────────────────────────────────────────────

  const handleSaveProgress = async (state: Record<string, unknown>) => {
    setSavedState(state);
    if (!instanceId) {
      addLog({ type: 'info', message: 'Progress saved locally (no instanceId yet)' });
      return;
    }

    const url = `/api/puzzles/${instanceId}/save`;
    addLog({ type: 'request', message: `POST ${url}`, detail: JSON.stringify({ progressData: state }) });

    try {
      const res  = await fetch(url, {
        method:  'POST',
        headers: authHeaders,
        body:    JSON.stringify({ progressData: state }),
      });
      const body = await res.json();

      addLog({
        type:    res.ok ? 'success' : 'error',
        message: res.ok ? 'Progress saved to DB' : `Save failed: ${body.error}`,
        detail:  JSON.stringify(body),
      });
    } catch (err: any) {
      addLog({ type: 'error', message: `Save fetch failed: ${err.message}` });
    }
  };

  // ── Step 3: Submit answer ──────────────────────────────────────────────────

  const handleSubmit = async (answer: Record<string, unknown>, timeTaken: number) => {
    if (!instanceId) {
      addLog({ type: 'error', message: 'No instanceId — load the puzzle first' });
      return;
    }

    const url  = `/api/puzzles/${instanceId}/submit`;
    const body = { puzzleType: selectedType, answer, timeTakenSeconds: timeTaken };
    addLog({ type: 'request', message: `POST ${url}`, detail: JSON.stringify(body, null, 2) });

    try {
      const res      = await fetch(url, { method: 'POST', headers: authHeaders, body: JSON.stringify(body) });
      const resBody  = await res.json();

      addLog({
        type:    res.ok ? 'response' : 'error',
        message: `${res.status} ${res.statusText}`,
        detail:  JSON.stringify(resBody, null, 2),
      });

      if (res.ok) {
        setScoreResult(resBody.score as PuzzleScoreResult);
        addLog({
          type:    resBody.score.correct ? 'success' : 'info',
          message: resBody.score.correct
            ? `✅ Correct! Score: ${resBody.score.totalScore} (base ${resBody.score.baseScore} + bonus ${resBody.score.bonusScore})`
            : `❌ Incorrect. Score: 0`,
        });
      }
    } catch (err: any) {
      addLog({ type: 'error', message: `Submit fetch failed: ${err.message}` });
    }
  };

  // ── Log colour map ─────────────────────────────────────────────────────────

  const logColour: Record<LogEntry['type'], string> = {
    info:     'text-gray-400',
    success:  'text-emerald-400',
    error:    'text-red-400',
    request:  'text-sky-400',
    response: 'text-indigo-300',
  };

  const logPrefix: Record<LogEntry['type'], string> = {
    info:     '·',
    success:  '✓',
    error:    '✗',
    request:  '→',
    response: '←',
  };

  return (
    <div className="min-h-screen bg-slate-100 py-8 px-4">

      {/* Banner */}
      <div className="max-w-3xl mx-auto mb-4 bg-amber-50 border border-amber-300 rounded-xl px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-amber-600 text-lg">🛠️</span>
          <div>
            <p className="text-sm font-semibold text-amber-800">Puzzle API Test Page</p>
            <p className="text-xs text-amber-600">
              {tokenFromStore
                ? `🟢 Logged in${clubId ? ` · Club ID: ${clubId}` : ' · Club ID not found'}`
                : '🟡 Not logged in — go to /login first, or paste a token below'}
            </p>
            {entitlements && (
              <p className="text-xs text-amber-500 mt-0.5">
                Credits: {(entitlements as any).game_credits_remaining ?? 'n/a'} · Plan: {(entitlements as any).plan_name ?? 'n/a'}
              </p>
            )}
          </div>
        </div>
        {puzzleData && (
          <span className="text-xs bg-emerald-100 text-emerald-700 font-semibold px-2 py-1 rounded-full border border-emerald-300">
            Instance #{instanceId}
          </span>
        )}
      </div>

      {/* Config panel */}
      <div className="max-w-3xl mx-auto mb-6 bg-white rounded-xl border border-gray-200 px-5 py-5 space-y-4">

        {/* Token — only show if not auto-detected */}
        {!tokenFromStore && (
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-widest">
              Auth Token <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={manualToken}
              onChange={e => setManualToken(e.target.value)}
              placeholder="Paste your Bearer token here..."
              className="w-full text-xs font-mono px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-indigo-500 bg-gray-50"
            />
            <p className="text-xs text-gray-400">
              Get this from DevTools → Application → Local Storage, or your network requests.
            </p>
          </div>
        )}

        {/* Challenge + Week */}
        <div className="flex gap-4">
          <div className="flex flex-col gap-1 flex-1">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-widest">Challenge ID</label>
            <input
              type="text"
              value={challengeId}
              onChange={e => setChallengeId(e.target.value)}
              className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:border-indigo-500"
            />
          </div>
          <div className="flex flex-col gap-1 w-24">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-widest">Week</label>
            <input
              type="number"
              min={1}
              max={10}
              value={weekNumber}
              onChange={e => setWeekNumber(e.target.value)}
              className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        {/* Puzzle type */}
        <div className="flex flex-col gap-2">
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-widest">Puzzle Type</label>
          <div className="flex gap-2 flex-wrap">
            {PUZZLE_TYPES.map(type => (
              <button
                key={type}
                onClick={() => { setSelectedType(type); setIsStale(true); }}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-all ${
                  selectedType === type
                    ? 'bg-indigo-600 text-white border-indigo-600'
                    : 'bg-white text-gray-600 border-gray-300 hover:border-indigo-400'
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        {/* Difficulty */}
        <div className="flex flex-col gap-2">
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-widest">Difficulty</label>
          <div className="flex gap-2">
            {DIFFICULTIES.map(d => (
              <button
                key={d}
                onClick={() => { setDifficulty(d); setIsStale(true); }}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-all ${
                  difficulty === d
                    ? 'bg-indigo-600 text-white border-indigo-600'
                    : 'bg-white text-gray-600 border-gray-300 hover:border-indigo-400'
                }`}
              >
                {d}
              </button>
            ))}
          </div>
        </div>

        {/* Load button */}
        <button
          onClick={handleLoadPuzzle}
          disabled={isLoading || !token}
          className={`w-full py-3 rounded-xl font-semibold text-sm transition-all ${
            isLoading || !token
              ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
              : isStale
              ? 'bg-amber-500 text-white hover:bg-amber-600 active:scale-[0.99]'
              : 'bg-indigo-600 text-white hover:bg-indigo-700 active:scale-[0.99]'
          }`}
        >
          {isLoading ? 'Loading from server...' : isStale ? '⚠️ Settings changed — Reload Puzzle' : puzzleData ? '↺ Reload Puzzle' : '▶ Load Puzzle from Server'}
        </button>
      </div>

      {/* Puzzle shell — only shown once loaded */}
      {puzzleData && (
        <PuzzleShell
          key={shellKey}
          puzzleType={selectedType}
          title={PUZZLE_META[selectedType].title}
          instructions={PUZZLE_META[selectedType].instructions}
          difficulty={difficulty}
          puzzleData={puzzleData}
          onSubmit={handleSubmit}
          onSaveProgress={handleSaveProgress}
          savedState={savedState}
          isLoading={isLoading}
          scoreResult={scoreResult}
        />
      )}

      {!puzzleData && !isLoading && (
        <div className="max-w-3xl mx-auto text-center py-12 text-gray-400 text-sm">
          Configure the options above and click <strong>Load Puzzle from Server</strong> to begin.
        </div>
      )}

      {/* Dev log */}
      <div className="max-w-3xl mx-auto mt-6 bg-gray-900 rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">API Log</p>
          <button
            onClick={() => setLog([])}
            className="text-xs text-gray-600 hover:text-gray-400 transition-colors"
          >
            Clear
          </button>
        </div>
        <div className="px-4 py-3 space-y-1 max-h-80 overflow-y-auto">
          {log.length === 0 && (
            <p className="text-xs text-gray-600 italic">API calls will appear here...</p>
          )}
          {log.map((entry, i) => (
            <div key={i}>
              <p className={`text-xs font-mono ${logColour[entry.type]}`}>
                <span className="text-gray-600 mr-2">{entry.time}</span>
                <span className="mr-2">{logPrefix[entry.type]}</span>
                {entry.message}
              </p>
              {entry.detail && (
                <pre className="text-xs font-mono text-gray-500 ml-8 whitespace-pre-wrap break-all">
                  {entry.detail}
                </pre>
              )}
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}