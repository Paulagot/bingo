import React, { useState, useEffect, useCallback, useRef } from 'react';
import type { PuzzlePageState, PuzzleShellProps } from './puzzleTypes';
import PuzzleHeader from './PuzzleHeader';
import PuzzleActions from './PuzzleActions';
import PuzzleResultPanel from './PuzzleResultPanel';

// Renderers
import AnagramRenderer           from './renderers/AnagramRenderer';
import SequenceOrderingRenderer  from './renderers/SequenceOrderingRenderer';
import MatchPairsRenderer        from './renderers/MatchPairsRenderer';
import WordSearchRenderer        from './renderers/WordSearchRenderer';
import SlidingTileRenderer       from './renderers/SlidingTileRenderer';
import SudokuRenderer            from './renderers/SudokuRenderer';
import PatternCompletionRenderer from './renderers/PatternCompletionRenderer';
import WordLadderRenderer        from './renderers/WordLadderRenderer';
import CryptogramRenderer        from './renderers/CryptogramRenderer';
import NumberPathRenderer        from './renderers/NumberPathRenderer';
import TowersOfHanoiRenderer     from './renderers/TowersOfHanoiRenderer';
import NonogramRenderer          from './renderers/NonogramRenderer';
import MemoryPairsRenderer       from './renderers/MemoryPairsRenderer';

const PuzzleShell: React.FC<PuzzleShellProps> = ({
  puzzleType,
  title,
  instructions,
  difficulty,
  puzzleData,
  onSubmit,
  onSaveProgress,
  savedState,
  isLoading = false,
  scoreResult,
  // When true the shell starts in a permanently locked completed state —
  // used when the player has already submitted this puzzle in a prior session.
  initiallyCompleted = false,
}) => {
  // Derive the correct initial page state:
  //   • already submitted in a prior session → 'completed' (locked immediately)
  //   • saved progress exists               → 'inProgress' (resume where they left off)
  //   • fresh puzzle                        → 'notStarted'
  const deriveInitialState = (): PuzzlePageState => {
    if (initiallyCompleted) return 'completed';
    if (savedState) return 'inProgress';
    return 'notStarted';
  };

  const [pageState, setPageState] = useState<PuzzlePageState>(deriveInitialState);
  const [currentAnswer, setCurrentAnswer] = useState<Record<string, unknown>>(
    savedState ?? {}
  );
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number | null>(null);

  // When a score result arrives after the player submits THIS session,
  // transition to completed or failedValidation.
  // Also handles the alreadySubmitted case arriving after a late re-submit attempt.
  useEffect(() => {
    if (scoreResult) {
      setPageState(scoreResult.correct ? 'completed' : 'failedValidation');
    }
  }, [scoreResult]);

  // Timer — only runs while the puzzle is in progress
  useEffect(() => {
    if (pageState === 'inProgress') {
      if (!startTimeRef.current) {
        startTimeRef.current = Date.now() - elapsedSeconds * 1000;
      }

      timerRef.current = setInterval(() => {
        const elapsed = Math.floor(
          (Date.now() - (startTimeRef.current ?? Date.now())) / 1000
        );
        setElapsedSeconds(elapsed);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [pageState, elapsedSeconds]);

  const handleStart = useCallback(() => {
    startTimeRef.current = Date.now();
    setElapsedSeconds(0);
    setPageState('inProgress');
  }, []);

  const handleReset = useCallback(() => {
    setCurrentAnswer({});
  }, []);

  const handleSaveAndExit = useCallback(() => {
    onSaveProgress(currentAnswer);
  }, [currentAnswer, onSaveProgress]);

  const handleSubmit = useCallback(() => {
    setPageState('submitted');
    onSubmit(currentAnswer, elapsedSeconds);
  }, [currentAnswer, elapsedSeconds, onSubmit]);

  const handleAnswerChange = useCallback((answer: Record<string, unknown>) => {
    setCurrentAnswer(answer);
  }, []);

  const canSubmit = Object.keys(currentAnswer).length > 0;

  // The puzzle area is read-only once submitted or completed
  const isReadOnly =
    pageState === 'submitted' ||
    pageState === 'completed' ||
    pageState === 'failedValidation';

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-indigo-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow-md overflow-hidden border border-gray-100">
      {/* Header */}
      <PuzzleHeader
        title={title}
        puzzleType={puzzleType}
        difficulty={difficulty}
        pageState={pageState}
        elapsedSeconds={elapsedSeconds}
      />

      {/* Instructions — only shown before the puzzle starts */}
      {pageState === 'notStarted' && (
        <div className="px-6 py-5 bg-indigo-50 border-b border-indigo-100">
          {Array.isArray(instructions) ? (
            <ul className="list-disc pl-5 space-y-2 text-sm text-indigo-800 leading-relaxed">
              {instructions.map((item, index) => (
                <li key={index}>{item}</li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-indigo-800 leading-relaxed">{instructions}</p>
          )}
        </div>
      )}

      {/* Result panel — shown once a score is available */}
      {scoreResult && (
        <PuzzleResultPanel
          scoreResult={scoreResult}
          timeTakenSeconds={elapsedSeconds}
        />
      )}

      {/* Puzzle area — shown in all active states including read-only completed */}
      {pageState !== 'notStarted' && pageState !== 'locked' && (
        <div className="px-6 py-6">
          {puzzleType === 'anagram' && (
            <AnagramRenderer
              puzzleData={puzzleData}
              currentAnswer={currentAnswer}
              onAnswerChange={handleAnswerChange}
              isReadOnly={isReadOnly}
            />
          )}

          {puzzleType === 'sequenceOrdering' && (
            <SequenceOrderingRenderer
              puzzleData={puzzleData}
              currentAnswer={currentAnswer}
              onAnswerChange={handleAnswerChange}
              isReadOnly={isReadOnly}
            />
          )}

          {puzzleType === 'matchPairs' && (
            <MatchPairsRenderer
              puzzleData={puzzleData}
              currentAnswer={currentAnswer}
              onAnswerChange={handleAnswerChange}
              isReadOnly={isReadOnly}
            />
          )}

          {puzzleType === 'wordSearch' && (
            <WordSearchRenderer
              puzzleData={puzzleData}
              currentAnswer={currentAnswer}
              onAnswerChange={handleAnswerChange}
              isReadOnly={isReadOnly}
            />
          )}

          {puzzleType === 'slidingTile' && (
            <SlidingTileRenderer
              puzzleData={puzzleData}
              currentAnswer={currentAnswer}
              onAnswerChange={handleAnswerChange}
              isReadOnly={isReadOnly}
            />
          )}

          {puzzleType === 'sudoku' && (
            <SudokuRenderer
              puzzleData={puzzleData}
              currentAnswer={currentAnswer}
              onAnswerChange={handleAnswerChange}
              isReadOnly={isReadOnly}
            />
          )}

          {puzzleType === 'patternCompletion' && (
            <PatternCompletionRenderer
              puzzleData={puzzleData}
              currentAnswer={currentAnswer}
              onAnswerChange={handleAnswerChange}
              isReadOnly={isReadOnly}
            />
          )}

          {puzzleType === 'wordLadder' && (
            <WordLadderRenderer
              puzzleData={puzzleData}
              currentAnswer={currentAnswer}
              onAnswerChange={handleAnswerChange}
              isReadOnly={isReadOnly}
            />
          )}

          {puzzleType === 'cryptogram' && (
            <CryptogramRenderer
              puzzleData={puzzleData}
              currentAnswer={currentAnswer}
              onAnswerChange={handleAnswerChange}
              isReadOnly={isReadOnly}
            />
          )}

          {puzzleType === 'numberPath' && (
            <NumberPathRenderer
              puzzleData={puzzleData}
              currentAnswer={currentAnswer}
              onAnswerChange={handleAnswerChange}
              isReadOnly={isReadOnly}
            />
          )}

          {puzzleType === 'towersOfHanoi' && (
            <TowersOfHanoiRenderer
              puzzleData={puzzleData}
              currentAnswer={currentAnswer}
              onAnswerChange={handleAnswerChange}
              isReadOnly={isReadOnly}
            />
          )}

          {puzzleType === 'nonogram' && (
            <NonogramRenderer
              puzzleData={puzzleData}
              currentAnswer={currentAnswer}
              onAnswerChange={handleAnswerChange}
              isReadOnly={isReadOnly}
            />
          )}

          {puzzleType === 'memoryPairs' && (
            <MemoryPairsRenderer
              puzzleData={puzzleData}
              currentAnswer={currentAnswer}
              onAnswerChange={handleAnswerChange}
              isReadOnly={isReadOnly}
            />
          )}

          {/* Placeholder for puzzle types that exist in PuzzleMeta / PuzzleType
              but do not have renderers wired here yet */}
          {(puzzleType === 'deductionGrid' ||
            puzzleType === 'spatialPacking' ||
            puzzleType === 'spotDifference' ||
            puzzleType === 'hiddenObject') && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              This puzzle type is recognised, but its renderer is not wired into PuzzleShell yet.
            </div>
          )}
        </div>
      )}

      {/* Actions — PuzzleActions already returns null for submitted/completed */}
      <PuzzleActions
        pageState={pageState}
        onStart={handleStart}
        onReset={handleReset}
        onSaveAndExit={handleSaveAndExit}
        onSubmit={handleSubmit}
        canSubmit={canSubmit}
      />
    </div>
  );
};

export default PuzzleShell;