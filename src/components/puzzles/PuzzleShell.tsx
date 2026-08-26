//src/components/puzzles/PuzzleShell.tsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import type { PuzzlePageState, PuzzleShellProps } from './puzzleTypes';
import PuzzleHeader from './PuzzleHeader';
import PuzzleActions from './PuzzleActions';
import PuzzleResultPanel from './PuzzleResultPanel';
import PuzzleResumeBanner from './ui/PuzzleResumeBanner';
import PuzzleInstructionsOverlay from './ui/PuzzleInstructionsOverlay';
import { usePuzzleAutosave } from './hooks/usePuzzleAutosave';

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
  onAutosave,
  onSaveProgressOnUnload,
  savedState,
  savedAt,
  initialActiveSeconds,
  isLoading = false,
  scoreResult,
  // When true the shell starts in a permanently locked completed state -
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

  // Only ask the player to choose between resuming and starting over when
  // there's actually saved progress to choose between - a fresh puzzle
  // skips straight in as before. Previously savedState silently put the
  // player straight into 'inProgress' with no visible indication their
  // prior answer had been restored underneath them.
  const [resumeChoiceMade, setResumeChoiceMade] = useState(
    !savedState || initiallyCompleted
  );

  const [showInstructions, setShowInstructions] = useState(false);

  const isReadOnlyForAutosave =
    pageState === 'submitted' ||
    pageState === 'completed' ||
    pageState === 'failedValidation' ||
    !resumeChoiceMade;

  const { handleAnswerChange: autosaveAnswerChange, showSavingIndicator } = usePuzzleAutosave({
    onSave: onAutosave,
    onSaveOnUnload: onSaveProgressOnUnload,
    isReadOnly: isReadOnlyForAutosave,
  });

  // Every place currentAnswer changes goes through this single setter so
  // the autosave hook's internal "latest answer" ref never goes stale -
  // routing only the renderer's onAnswerChange through it and mutating
  // state directly elsewhere (e.g. a reset) would leave autosave holding
  // an outdated answer and re-saving it later.
  const setAnswerAndAutosave = useCallback(
    (answer: Record<string, unknown>) => {
      setCurrentAnswer(answer);
      autosaveAnswerChange(answer);
    },
    [autosaveAnswerChange]
  );

  // When a score result arrives after the player submits THIS session,
  // transition to completed or failedValidation.
  // Also handles the alreadySubmitted case arriving after a late re-submit attempt.
  useEffect(() => {
    if (scoreResult) {
      setPageState(scoreResult.correct ? 'completed' : 'failedValidation');
    }
  }, [scoreResult]);

  // Timer - only runs once the puzzle is genuinely in progress AND (if
  // there was a resume choice to make) the player has made it. Without the
  // resumeChoiceMade check, this would start ticking from 0 the instant the
  // component mounts with saved progress, before the player has even seen
  // the resume banner.
  useEffect(() => {
    if (pageState === 'inProgress' && resumeChoiceMade) {
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
  }, [pageState, resumeChoiceMade, elapsedSeconds]);

  const handleStart = useCallback(() => {
    startTimeRef.current = Date.now();
    setElapsedSeconds(0);
    setPageState('inProgress');
  }, []);

  // Forces a real remount of whichever renderer is active when the player
  // clicks Reset. Necessary because every renderer only reads currentAnswer
  // ONCE, via a lazy useState initializer, and never re-syncs from it
  // afterward - a deliberate choice made to stop autosave lag from
  // overwriting newer in-progress work. That same choice means clearing
  // currentAnswer alone (the old behavior) was silently invisible to every
  // renderer: the prop changed, but nothing ever re-read it. Changing key
  // forces React to unmount and remount the renderer, which re-runs its
  // lazy initializers against the now-cleared currentAnswer for real.
  const [resetKey, setResetKey] = useState(0);

  const handleReset = useCallback(() => {
    setAnswerAndAutosave({});
    setResetKey(k => k + 1);
  }, [setAnswerAndAutosave]);

  const handleSaveAndExit = useCallback(() => {
    // Deliberately calls onSaveProgress directly rather than going through
    // the autosave hook - onSaveProgress is the "player chose to leave"
    // action (its caller navigates away after saving), which is a different
    // thing from the hook's onAutosave channel (silent, no navigation,
    // fires automatically every few seconds). Keeping them fully separate
    // means clicking this button can never end up silently not navigating
    // just because it went through the wrong channel.
    onSaveProgress(currentAnswer);
  }, [currentAnswer, onSaveProgress]);

  const handleSubmit = useCallback(() => {
    setPageState('submitted');
    onSubmit(currentAnswer, elapsedSeconds);
  }, [currentAnswer, elapsedSeconds, onSubmit]);

  const handleAnswerChange = useCallback(
    (answer: Record<string, unknown>) => {
      setAnswerAndAutosave(answer);
    },
    [setAnswerAndAutosave]
  );

  const handleResumeContinue = useCallback(() => {
    if (typeof initialActiveSeconds === 'number' && initialActiveSeconds > 0) {
      setElapsedSeconds(initialActiveSeconds);
      startTimeRef.current = Date.now() - initialActiveSeconds * 1000;
    }
    setResumeChoiceMade(true);
  }, [initialActiveSeconds]);

  const handleResumeStartOver = useCallback(() => {
    // Only clears client-side state - does not delete the saved row
    // server-side, so a mis-tap here can't destroy real progress. The
    // next autosave will simply overwrite it with the blank answer.
    //
    // NOTE: this resets the visible timer to 0, but does NOT reset any
    // server-side time tracking (there isn't a reset-progress endpoint -
    // an earlier version of this file called one, but that was never
    // actually implemented, since server time is meant to be cumulative
    // across attempts rather than resettable - see the "does starting over
    // reset the timer" discussion). That means what's displayed here can
    // undercount what a submission actually gets scored against if the
    // player spent real time on an abandoned attempt before starting over.
    // Flagging this rather than silently leaving it inconsistent - worth a
    // deliberate decision on which way to resolve it, not a silent default.
    setElapsedSeconds(0);
    startTimeRef.current = null;
    setAnswerAndAutosave({});
    setResumeChoiceMade(true);
  }, [setAnswerAndAutosave]);

  const canSubmit = Object.keys(currentAnswer).length > 0;

  // The puzzle area is read-only once submitted or completed
  const isReadOnly =
    pageState === 'submitted' ||
    pageState === 'completed' ||
    pageState === 'failedValidation';

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-gray-200 border-t-[var(--puzzle-primary)]" />
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

      {/* Pre-start blurb - this used to dump the ENTIRE instructions array
          inline (every puzzle type's list grew significantly once it also
          had to serve the How to play overlay: a scoring paragraph plus a
          4-line save/resume block got added to all 13 types), so the
          landing screen for every single puzzle became a full page of text
          before Start was even clicked. Now the full list is one tap away
          via the same overlay instead of being forced on everyone
          up front. */}
      {pageState === 'notStarted' && (
        <div className="flex items-center justify-between gap-3 px-4 py-4 sm:px-6 sm:py-5 bg-[#FBF8F3] border-b border-[#E8E0D3]">
          <p className="text-sm text-[var(--puzzle-primary)] leading-relaxed">
            Ready when you are - press Start Challenge to begin.
          </p>

          <button
            type="button"
            onClick={() => setShowInstructions(true)}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-600 shadow-sm transition hover:bg-slate-50"
          >
            <span aria-hidden="true">?</span> How to play
          </button>
        </div>
      )}

      {/* Result panel - shown once a score is available */}
      {scoreResult && (
        <PuzzleResultPanel
          scoreResult={scoreResult}
          timeTakenSeconds={elapsedSeconds}
        />
      )}

      {/* Instructions button - the only way to see "how to play" again once
          the puzzle has started, since the instructions block above only
          shows during 'notStarted'. Visible in every state where the
          puzzle itself is on screen, including read-only after submission,
          since reviewing the rules after the fact is harmless. */}
      {pageState !== 'notStarted' && pageState !== 'locked' && (
        <div className="flex justify-end px-4 pt-3 sm:px-6 sm:pt-4">
          <button
            type="button"
            onClick={() => setShowInstructions(true)}
            className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-600 shadow-sm transition hover:bg-slate-50"
          >
            <span aria-hidden="true">?</span> How to play
          </button>
        </div>
      )}

      {/* Resume banner - shown instead of the puzzle when there's saved
          progress the player hasn't chosen to continue or discard yet. */}
      {pageState !== 'notStarted' && pageState !== 'locked' && !resumeChoiceMade && (
        <div className="px-4 pt-4 sm:px-6 sm:pt-6">
          <PuzzleResumeBanner
            savedAt={savedAt}
            activeSecondsSoFar={initialActiveSeconds}
            onResume={handleResumeContinue}
            onStartOver={handleResumeStartOver}
          />
        </div>
      )}

      {/* Puzzle area - shown in all active states including read-only completed */}
      {pageState !== 'notStarted' && pageState !== 'locked' && resumeChoiceMade && (
        <div className="px-3 py-4 sm:px-6 sm:py-6">
          {/* Always mounted at a fixed height and faded via opacity, never
              conditionally mounted/unmounted - that was the actual cause of
              the flash/jump players were seeing: the old version added and
              removed this element from the DOM, which shoved the whole
              puzzle board down and back up every time an autosave fired. */}
          <div
            aria-hidden={!showSavingIndicator}
            className={[
              'mb-3 h-4 text-right text-xs font-medium text-slate-400 transition-opacity duration-200',
              showSavingIndicator ? 'opacity-100' : 'opacity-0',
            ].join(' ')}
          >
            Saving…
          </div>

          {puzzleType === 'anagram' && (
            <AnagramRenderer
              key={resetKey}
              puzzleData={puzzleData}
              currentAnswer={currentAnswer}
              onAnswerChange={handleAnswerChange}
              isReadOnly={isReadOnly}
            />
          )}

          {puzzleType === 'sequenceOrdering' && (
            <SequenceOrderingRenderer
              key={resetKey}
              puzzleData={puzzleData}
              currentAnswer={currentAnswer}
              onAnswerChange={handleAnswerChange}
              isReadOnly={isReadOnly}
            />
          )}

          {puzzleType === 'matchPairs' && (
            <MatchPairsRenderer
              key={resetKey}
              puzzleData={puzzleData}
              currentAnswer={currentAnswer}
              onAnswerChange={handleAnswerChange}
              isReadOnly={isReadOnly}
            />
          )}

          {puzzleType === 'wordSearch' && (
            <WordSearchRenderer
              key={resetKey}
              puzzleData={puzzleData}
              currentAnswer={currentAnswer}
              onAnswerChange={handleAnswerChange}
              isReadOnly={isReadOnly}
            />
          )}

          {puzzleType === 'slidingTile' && (
            <SlidingTileRenderer
              key={resetKey}
              puzzleData={puzzleData}
              currentAnswer={currentAnswer}
              onAnswerChange={handleAnswerChange}
              isReadOnly={isReadOnly}
            />
          )}

          {puzzleType === 'sudoku' && (
            <SudokuRenderer
              key={resetKey}
              puzzleData={puzzleData}
              currentAnswer={currentAnswer}
              onAnswerChange={handleAnswerChange}
              isReadOnly={isReadOnly}
            />
          )}

          {puzzleType === 'patternCompletion' && (
            <PatternCompletionRenderer
              key={resetKey}
              puzzleData={puzzleData}
              currentAnswer={currentAnswer}
              onAnswerChange={handleAnswerChange}
              isReadOnly={isReadOnly}
            />
          )}

          {puzzleType === 'wordLadder' && (
            <WordLadderRenderer
              key={resetKey}
              puzzleData={puzzleData}
              currentAnswer={currentAnswer}
              onAnswerChange={handleAnswerChange}
              isReadOnly={isReadOnly}
            />
          )}

          {puzzleType === 'cryptogram' && (
            <CryptogramRenderer
              key={resetKey}
              puzzleData={puzzleData}
              currentAnswer={currentAnswer}
              onAnswerChange={handleAnswerChange}
              isReadOnly={isReadOnly}
            />
          )}

          {puzzleType === 'numberPath' && (
            <NumberPathRenderer
              key={resetKey}
              puzzleData={puzzleData}
              currentAnswer={currentAnswer}
              onAnswerChange={handleAnswerChange}
              isReadOnly={isReadOnly}
            />
          )}

          {puzzleType === 'towersOfHanoi' && (
            <TowersOfHanoiRenderer
              key={resetKey}
              puzzleData={puzzleData}
              currentAnswer={currentAnswer}
              onAnswerChange={handleAnswerChange}
              isReadOnly={isReadOnly}
            />
          )}

          {puzzleType === 'nonogram' && (
            <NonogramRenderer
              key={resetKey}
              puzzleData={puzzleData}
              currentAnswer={currentAnswer}
              onAnswerChange={handleAnswerChange}
              isReadOnly={isReadOnly}
            />
          )}

          {puzzleType === 'memoryPairs' && (
            <MemoryPairsRenderer
              key={resetKey}
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

      {/* Actions - PuzzleActions already returns null for submitted/completed.
          Also hidden while the resume choice is pending - currentAnswer at
          that point is still the old saved answer, not yet confirmed by
          the player, so Submit/Reset shouldn't be actionable against it. */}
      {(pageState === 'notStarted' || resumeChoiceMade) && (
        <PuzzleActions
          pageState={pageState}
          onStart={handleStart}
          onReset={handleReset}
          onSaveAndExit={handleSaveAndExit}
          onSubmit={handleSubmit}
          canSubmit={canSubmit}
        />
      )}

      {showInstructions && (
        <PuzzleInstructionsOverlay
          instructions={instructions}
          onClose={() => setShowInstructions(false)}
        />
      )}
    </div>
  );
};

export default PuzzleShell;