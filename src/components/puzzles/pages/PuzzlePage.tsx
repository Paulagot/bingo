// src/components/puzzles/pages/PuzzlePage.tsx

import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import PuzzleShell from '../PuzzleShell';
import { getPuzzleMeta } from '../PuzzleMeta';
import { puzzleService } from '../services/puzzleService';
import type { PuzzleInstance, PuzzleScoreResult } from '../puzzleTypes';
import PuzzlePageShell from '../ui/PuzzlePageShell';
import PuzzlePrimaryButton from '../ui/PuzzlePrimaryButton';

export default function PuzzlePage() {
  const { challengeId, week } = useParams<{
    challengeId: string;
    week: string;
  }>();

  const navigate = useNavigate();
  const weekNumber = parseInt(week ?? '1', 10);

  const [puzzleInstance, setPuzzleInstance] = useState<PuzzleInstance | null>(null);
  const [savedProgress, setSavedProgress] = useState<Record<string, unknown> | null>(null);
  const [scoreResult, setScoreResult] = useState<PuzzleScoreResult | null>(null);
  const [alreadySubmitted, setAlreadySubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [locked, setLocked] = useState<{ unlocksAt: string } | null>(null);

  const resolvedChallengeId = challengeId ?? '';
  const backHref = `/challenges/${resolvedChallengeId}/play`;

  useEffect(() => {
    if (!challengeId) {
      setPageError('Challenge not found.');
      setIsLoading(false);
      return;
    }

    const currentChallengeId = challengeId;
    const currentWeekNumber = weekNumber;

    setIsLoading(true);
    setPageError(null);
    setSaveError(null);
    setLocked(null);
    setPuzzleInstance(null);
    setScoreResult(null);
    setAlreadySubmitted(false);

    puzzleService
      .loadPuzzle(currentChallengeId, currentWeekNumber)
      .then(data => {
        setPuzzleInstance(data.puzzle);

        if (data.previousSubmission) {
          setAlreadySubmitted(true);
          setScoreResult(data.previousSubmission);
          setSavedProgress(null);
        } else {
          setSavedProgress(data.progress ?? null);
        }
      })
      .catch((err: Error) => {
        if (err.message?.includes('not yet unlocked')) {
          setLocked({ unlocksAt: '' });
          return;
        }

        setPageError(err.message ?? 'Failed to load puzzle');
      })
      .finally(() => setIsLoading(false));
  }, [challengeId, weekNumber]);

  const handleSubmit = useCallback(
    async (answer: Record<string, unknown>, timeTaken: number) => {
      if (!puzzleInstance) return;

      setPageError(null);

      try {
        const result = await puzzleService.submitPuzzle(puzzleInstance.id, {
          puzzleType: puzzleInstance.puzzleType,
          answer,
          timeTakenSeconds: timeTaken,
        });

        setScoreResult(result.score);

        if (result.alreadySubmitted) {
          setAlreadySubmitted(true);
        }
      } catch (err) {
        setPageError((err as Error).message ?? 'Submission failed');
      }
    },
    [puzzleInstance]
  );

  const handleSaveProgress = useCallback(
    async (progressData: Record<string, unknown>) => {
      if (!puzzleInstance || !challengeId) return;

      setSaveError(null);

      try {
        await puzzleService.saveProgress(puzzleInstance.id, progressData);
        navigate(`/challenges/${challengeId}/play`);
      } catch (err) {
        console.error('Save error:', err);
        setSaveError('We could not save your progress just now. Please try again.');
      }
    },
    [puzzleInstance, challengeId, navigate]
  );

  const resolvedPuzzleType = puzzleInstance?.puzzleType ?? 'anagram';
  const resolvedDifficulty = puzzleInstance?.difficulty ?? 'medium';

  const { title, instructions } = getPuzzleMeta(
    resolvedPuzzleType,
    resolvedDifficulty
  );

  if (locked) {
    return (
      <PuzzlePageShell
        rightHeaderContent={
          <div className="rounded-2xl border border-[#E8E0D3] bg-white px-4 py-2 shadow-sm">
            <p className="text-sm font-semibold text-[#071A44]">Locked</p>
            <p className="text-xs text-[#6E6A63]">Come back soon</p>
          </div>
        }
      >
        <div className="mx-auto flex min-h-[55vh] max-w-xl items-center justify-center">
          <div className="w-full rounded-[36px] border border-[#E8E0D3] bg-white p-8 text-center shadow-sm">
            <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-[26px] bg-[#F8F6F1] text-4xl shadow-sm">
              🔒
            </div>

            <p className="mb-3 text-sm font-semibold uppercase tracking-[0.18em] text-[#E36B2C]">
              Not unlocked yet
            </p>

            <h1 className="font-serif text-4xl leading-tight text-[#071A44]">
              This week&apos;s puzzle is locked
            </h1>

            {locked.unlocksAt ? (
              <p className="mt-4 text-sm leading-relaxed text-[#6E6A63]">
                Unlocks on {new Date(locked.unlocksAt).toLocaleDateString()}.
              </p>
            ) : (
              <p className="mt-4 text-sm leading-relaxed text-[#6E6A63]">
                This puzzle has not unlocked yet. Check back when the next
                weekly challenge is available.
              </p>
            )}

            <Link
              to={backHref}
              className="mt-7 inline-flex items-center justify-center rounded-full border border-[#D8D1C4] bg-white px-6 py-3 text-sm font-semibold text-[#071A44] transition hover:bg-[#F8F5EF]"
            >
              ← Back to challenge
            </Link>
          </div>
        </div>
      </PuzzlePageShell>
    );
  }

  if (pageError) {
    return (
      <PuzzlePageShell
        rightHeaderContent={
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-2 shadow-sm">
            <p className="text-sm font-semibold text-rose-700">
              Puzzle problem
            </p>
            <p className="text-xs text-rose-500">Please try again</p>
          </div>
        }
      >
        <div className="mx-auto flex min-h-[55vh] max-w-xl items-center justify-center">
          <div className="w-full rounded-[36px] border border-[#E8E0D3] bg-white p-8 text-center shadow-sm">
            <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-[26px] bg-rose-50 text-4xl shadow-sm">
              😕
            </div>

            <p className="mb-3 text-sm font-semibold uppercase tracking-[0.18em] text-[#E36B2C]">
              Something went wrong
            </p>

            <h1 className="font-serif text-4xl leading-tight text-[#071A44]">
              Couldn&apos;t load puzzle
            </h1>

            <p className="mt-4 text-sm leading-relaxed text-[#6E6A63]">
              {pageError}
            </p>

            <div className="mt-7 flex flex-wrap justify-center gap-3">
              <PuzzlePrimaryButton
                type="button"
                onClick={() => window.location.reload()}
              >
                Try again
              </PuzzlePrimaryButton>

              <Link
                to={backHref}
                className="inline-flex items-center justify-center rounded-full border border-[#D8D1C4] bg-white px-6 py-3 text-sm font-semibold text-[#071A44] transition hover:bg-[#F8F5EF]"
              >
                ← Back to challenge
              </Link>
            </div>
          </div>
        </div>
      </PuzzlePageShell>
    );
  }

  return (
    <PuzzlePageShell
      rightHeaderContent={
        <div className="rounded-2xl border border-[#D8E8D8] bg-[#EEF8EF] px-4 py-2 shadow-sm">
          <p className="text-sm font-semibold text-[#2E6A46]">
            Week {weekNumber}
          </p>
          <p className="text-xs capitalize text-[#5F7D6A]">
            {resolvedDifficulty} puzzle
          </p>
        </div>
      }
    >
      <div className="mx-auto max-w-5xl">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <Link
            to={backHref}
            className="inline-flex items-center justify-center rounded-full border border-[#D8D1C4] bg-white px-5 py-2.5 text-sm font-semibold text-[#071A44] shadow-sm transition hover:bg-[#F8F5EF]"
          >
            ← Back to challenge
          </Link>

          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-[#E8E0D3] bg-white px-4 py-2 text-xs font-semibold capitalize text-[#6E6A63] shadow-sm">
              {resolvedPuzzleType}
            </span>

            <span className="rounded-full border border-[#E8E0D3] bg-white px-4 py-2 text-xs font-semibold capitalize text-[#6E6A63] shadow-sm">
              {resolvedDifficulty}
            </span>

            {alreadySubmitted ? (
              <span className="rounded-full border border-[#D8E8D8] bg-[#EEF8EF] px-4 py-2 text-xs font-semibold text-[#2E6A46] shadow-sm">
                Submitted
              </span>
            ) : null}
          </div>
        </div>

        <section className="mb-5 rounded-[32px] border border-[#E8E0D3] bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="mb-2 text-sm font-semibold uppercase tracking-[0.18em] text-[#E36B2C]">
                Puzzle challenge
              </p>

              <h1 className="font-serif text-3xl leading-tight text-[#071A44] sm:text-4xl">
                {title}
              </h1>

              <p className="mt-2 text-sm capitalize text-[#6E6A63]">
                Week {weekNumber} · {resolvedDifficulty} difficulty
              </p>
            </div>

            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[22px] bg-[#FFF2D9] text-3xl shadow-sm">
              🧩
            </div>
          </div>

          {saveError ? (
            <div className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3">
              <p className="text-sm font-medium text-rose-700">{saveError}</p>
            </div>
          ) : null}
        </section>

        <div className="overflow-hidden rounded-[32px] border border-[#E8E0D3] bg-white p-3 shadow-sm sm:p-4">
          {(isLoading || puzzleInstance) && (
            <div className="rounded-[24px] bg-[#FBF8F3] p-2 sm:p-4">
              <PuzzleShell
                puzzleType={resolvedPuzzleType}
                title={title}
                instructions={instructions}
                difficulty={resolvedDifficulty}
                puzzleData={puzzleInstance?.puzzleData ?? {}}
                onSubmit={handleSubmit}
                onSaveProgress={handleSaveProgress}
                savedState={savedProgress}
                isLoading={isLoading}
                scoreResult={scoreResult}
                initiallyCompleted={alreadySubmitted}
              />
            </div>
          )}
        </div>
      </div>
    </PuzzlePageShell>
  );
}