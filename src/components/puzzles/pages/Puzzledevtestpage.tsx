import { useState, useCallback } from 'react';
import PuzzleShell from '../PuzzleShell';
import type { PuzzleType, PuzzleDifficulty, PuzzleScoreResult } from '../puzzleTypes';
import { useAuthStore } from '../../../features/auth';
import { getPuzzleMeta } from '../PuzzleMeta';
import PuzzlePageShell from '../ui/PuzzlePageShell';

// ─── Config ───────────────────────────────────────────────────────────────────

const PUZZLE_TYPES: PuzzleType[] = [
  'anagram', 'sequenceOrdering', 'matchPairs', 'wordSearch', 'slidingTile',
  'sudoku', 'patternCompletion', 'wordLadder', 'cryptogram', 'numberPath',
  'towersOfHanoi', 'nonogram', 'memoryPairs',
];
const DIFFICULTIES: PuzzleDifficulty[] = ['easy', 'medium', 'hard'];

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

  const tokenFromStore = isAuthenticated ? localStorage.getItem('auth_token') : null;

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
  const [devMode, setDevMode]             = useState(true);
  const [showLog, setShowLog]             = useState(false);

  // Puzzle state
  const [instanceId, setInstanceId]       = useState<string | null>(null);
  const [puzzleData, setPuzzleData]       = useState<Record<string, unknown> | null>(null);
  const [savedState, setSavedState]       = useState<Record<string, unknown> | null>(null);
  const [scoreResult, setScoreResult]     = useState<PuzzleScoreResult | null>(null);
  const [isLoading, setIsLoading]         = useState(false);
  const [shellKey, setShellKey]           = useState(0);

  const [log, setLog]                     = useState<LogEntry[]>([]);

  const token = tokenFromStore || manualToken;

  // Use the same getPuzzleMeta that production PuzzlePage uses - this
  // ensures the title, instructions (including difficulty-specific lines,
  // scoring rules, and save/resume text) are identical to what players see.
  const { title, instructions } = getPuzzleMeta(selectedType, difficulty);

  const addLog = useCallback((entry: Omit<LogEntry, 'time'>) => {
    setLog(prev => [{ ...entry, time: new Date().toLocaleTimeString() }, ...prev.slice(0, 49)]);
  }, []);

  const authHeaders = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  };

  // ── Step 1: Load puzzle ────────────────────────────────────────────────────

  const handleLoadPuzzle = async () => {
    if (!token) {
      addLog({ type: 'error', message: 'No token - paste one in the Token field below' });
      return;
    }

    setIsLoading(true);
    setScoreResult(null);
    setPuzzleData(null);
    setInstanceId(null);
    setSavedState(null);
    setIsStale(false);
    setShellKey(k => k + 1);

    if (devMode) {
      const url = '/api/puzzles/dev/generate';
      const payload = { puzzleType: selectedType, difficulty };
      addLog({ type: 'request', message: `POST ${url}`, detail: JSON.stringify(payload) });

      try {
        const res = await fetch(url, {
          method: 'POST',
          headers: authHeaders,
          body: JSON.stringify(payload),
        });
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
          addLog({ type: 'success', message: `Puzzle loaded (dev) - instanceId: ${body.puzzle.id}, type: ${body.puzzle.puzzleType}` });
        }
      } catch (err: any) {
        addLog({ type: 'error', message: `Fetch failed: ${err.message}` });
      } finally {
        setIsLoading(false);
      }
    } else {
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
          addLog({ type: 'success', message: `Puzzle loaded - instanceId: ${body.puzzle.id}, type: ${body.puzzle.puzzleType}` });
          if (body.progress) addLog({ type: 'info', message: 'Saved progress found - resuming' });
        }
      } catch (err: any) {
        addLog({ type: 'error', message: `Fetch failed: ${err.message}` });
      } finally {
        setIsLoading(false);
      }
    }
  };

  // ── Step 2: Save progress ──────────────────────────────────────────────────

  const handleSaveProgress = async (state: Record<string, unknown>) => {
    setSavedState(state);
    if (!instanceId) {
      addLog({ type: 'info', message: 'Progress saved locally (no instanceId yet)' });
      return;
    }

    const basePath = devMode ? `/api/puzzles/dev/${instanceId}/save` : `/api/puzzles/${instanceId}/save`;
    addLog({ type: 'request', message: `POST ${basePath}`, detail: JSON.stringify({ progressData: state }) });

    try {
      const res  = await fetch(basePath, {
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
      addLog({ type: 'error', message: 'No instanceId - load the puzzle first' });
      return;
    }

    const basePath = devMode ? `/api/puzzles/dev/${instanceId}/submit` : `/api/puzzles/${instanceId}/submit`;
    const payload = { puzzleType: selectedType, answer, timeTakenSeconds: timeTaken };
    addLog({ type: 'request', message: `POST ${basePath}`, detail: JSON.stringify(payload, null, 2) });

    try {
      const res      = await fetch(basePath, { method: 'POST', headers: authHeaders, body: JSON.stringify(payload) });
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
    <PuzzlePageShell
      clubName="Dev Testing"
      rightHeaderContent={
        <div className="flex items-center gap-2">
          {devMode && (
            <span className="rounded-full border border-violet-300 bg-violet-100 px-3 py-1 text-xs font-semibold text-violet-700">
              DEV MODE
            </span>
          )}
          {puzzleData && (
            <span className="rounded-full border border-emerald-300 bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
              {selectedType} · {difficulty}
            </span>
          )}
        </div>
      }
    >
      {/* ── Dev controls ─────────────────────────────────────────────────── */}
      <div className="mb-6 rounded-[28px] border border-[#E8E0D3] bg-white px-5 py-5 shadow-sm sm:px-6 space-y-4">

        {/* Top row: mode toggle + auth status */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <span className="text-amber-600 text-lg">🛠️</span>
            <div>
              <p className="text-sm font-semibold text-[#071A44]">Puzzle Test Controls</p>
              <p className="text-xs text-[#6E6A63]">
                {tokenFromStore
                  ? `Logged in${clubId ? ` · Club ${(clubId as string).slice(0, 8)}…` : ''}`
                  : 'Not logged in - go to /login first, or paste a token below'}
              </p>
              {entitlements && (
                <p className="text-xs text-[#6E6A63] mt-0.5">
                  Credits: {(entitlements as any).game_credits_remaining ?? 'n/a'} · Plan: {(entitlements as any).plan_name ?? 'n/a'}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs font-medium text-[#6E6A63]">
              {devMode ? 'Dev' : 'Normal'}
            </span>
            <button
              onClick={() => setDevMode(d => !d)}
              className={`relative inline-flex h-7 w-12 shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                devMode ? 'bg-violet-600' : 'bg-gray-300'
              }`}
            >
              <span
                className={`inline-block h-6 w-6 transform rounded-full bg-white shadow transition duration-200 ease-in-out ${
                  devMode ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Token - only if not auto-detected */}
        {!tokenFromStore && (
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-[#6E6A63] uppercase tracking-widest">
              Auth Token <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={manualToken}
              onChange={e => setManualToken(e.target.value)}
              placeholder="Paste your Bearer token here..."
              className="w-full text-xs font-mono px-3 py-2 border border-[#E8E0D3] rounded-xl focus:outline-none focus:border-[#E36B2C] bg-[#FBF8F3]"
            />
          </div>
        )}

        {/* Challenge + Week - only in normal mode */}
        {!devMode && (
          <div className="flex gap-4">
            <div className="flex flex-col gap-1 flex-1">
              <label className="text-xs font-semibold text-[#6E6A63] uppercase tracking-widest">Challenge ID</label>
              <input
                type="text"
                value={challengeId}
                onChange={e => setChallengeId(e.target.value)}
                className="px-3 py-2 text-sm border border-[#E8E0D3] rounded-xl focus:outline-none focus:border-[#E36B2C]"
              />
            </div>
            <div className="flex flex-col gap-1 w-24">
              <label className="text-xs font-semibold text-[#6E6A63] uppercase tracking-widest">Week</label>
              <input
                type="number"
                min={1}
                max={10}
                value={weekNumber}
                onChange={e => setWeekNumber(e.target.value)}
                className="px-3 py-2 text-sm border border-[#E8E0D3] rounded-xl focus:outline-none focus:border-[#E36B2C]"
              />
            </div>
          </div>
        )}

        {/* Puzzle type */}
        <div className="flex flex-col gap-2">
          <label className="text-xs font-semibold text-[#6E6A63] uppercase tracking-widest">Puzzle Type</label>
          <div className="flex gap-2 flex-wrap">
            {PUZZLE_TYPES.map(type => (
              <button
                key={type}
                onClick={() => { setSelectedType(type); setIsStale(true); }}
                className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${
                  selectedType === type
                    ? 'bg-[#071A44] text-white border-[#071A44]'
                    : 'bg-white text-[#6E6A63] border-[#E8E0D3] hover:border-[#071A44]'
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        {/* Difficulty */}
        <div className="flex flex-col gap-2">
          <label className="text-xs font-semibold text-[#6E6A63] uppercase tracking-widest">Difficulty</label>
          <div className="flex gap-2">
            {DIFFICULTIES.map(d => (
              <button
                key={d}
                onClick={() => { setDifficulty(d); setIsStale(true); }}
                className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-all capitalize ${
                  difficulty === d
                    ? 'bg-[#071A44] text-white border-[#071A44]'
                    : 'bg-white text-[#6E6A63] border-[#E8E0D3] hover:border-[#071A44]'
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
          className={`w-full py-3 rounded-full font-semibold text-sm transition-all ${
            isLoading || !token
              ? 'bg-[#E8E0D3] text-[#6E6A63] cursor-not-allowed'
              : isStale
              ? 'bg-[#E36B2C] text-white hover:bg-[#D05A1B] active:scale-[0.99]'
              : 'bg-[#071A44] text-white hover:bg-[#0A2460] active:scale-[0.99]'
          }`}
        >
          {isLoading
            ? 'Loading...'
            : isStale
            ? 'Settings changed - Reload Puzzle'
            : puzzleData
            ? 'Reload Puzzle'
            : devMode
            ? 'Generate Puzzle'
            : 'Load Puzzle from Server'}
        </button>
      </div>

      {/* ── Puzzle area - identical to production PuzzlePage ──────────────── */}
      {puzzleData && (
        <div className="mx-auto max-w-5xl">
          <div className="overflow-hidden rounded-[32px] border border-[#E8E0D3] bg-white p-3 shadow-sm sm:p-4">
            <div className="rounded-[24px] bg-[#FBF8F3] p-2 sm:p-4">
              <PuzzleShell
                key={shellKey}
                puzzleType={selectedType}
                title={title}
                instructions={instructions}
                difficulty={difficulty}
                puzzleData={puzzleData}
                onSubmit={handleSubmit}
                onSaveProgress={handleSaveProgress}
                savedState={savedState}
                isLoading={isLoading}
                scoreResult={scoreResult}
              />
            </div>
          </div>
        </div>
      )}

      {!puzzleData && !isLoading && (
        <div className="mx-auto flex min-h-[30vh] max-w-xl items-center justify-center">
          <div className="w-full rounded-[36px] border border-[#E8E0D3] bg-white p-8 text-center shadow-sm">
            <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-[26px] bg-[#F8F6F1] text-4xl shadow-sm">
              🧩
            </div>
            <h2 className="font-serif text-2xl text-[#071A44] mb-2">
              {devMode ? 'Ready to test' : 'Load a puzzle'}
            </h2>
            <p className="text-sm text-[#6E6A63]">
              {devMode
                ? 'Pick a puzzle type and difficulty above, then hit Generate Puzzle.'
                : 'Enter a challenge ID and week number above, then hit Load.'}
            </p>
          </div>
        </div>
      )}

      {/* ── Dev log (collapsible) ────────────────────────────────────────── */}
      <div className="mt-6 rounded-[28px] border border-[#E8E0D3] bg-gray-900 overflow-hidden shadow-sm">
        <button
          onClick={() => setShowLog(l => !l)}
          className="w-full flex items-center justify-between px-5 py-3 border-b border-gray-800"
        >
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">
            API Log {log.length > 0 && `(${log.length})`}
          </p>
          <div className="flex items-center gap-3">
            {log.length > 0 && (
              <span
                onClick={e => { e.stopPropagation(); setLog([]); }}
                className="text-xs text-gray-600 hover:text-gray-400 transition-colors cursor-pointer"
              >
                Clear
              </span>
            )}
            <span className="text-xs text-gray-600">{showLog ? '▲' : '▼'}</span>
          </div>
        </button>
        {showLog && (
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
        )}
      </div>
    </PuzzlePageShell>
  );
}