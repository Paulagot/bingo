// src/components/puzzles/pages/PuzzlePage.tsx

import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import PuzzleShell from '../PuzzleShell';
import { puzzleService } from '../services/puzzleService';
import type { PuzzleScoreResult, PuzzleInstance } from '../puzzleTypes';

export default function PuzzlePage() {
  const { challengeId, week } = useParams<{ challengeId: string; week: string }>();
  const navigate   = useNavigate();
  const weekNumber = parseInt(week ?? '1', 10);

  const [puzzleInstance, setPuzzleInstance]     = useState<PuzzleInstance | null>(null);
  const [savedProgress, setSavedProgress]       = useState<Record<string, unknown> | null>(null);
  const [scoreResult, setScoreResult]           = useState<PuzzleScoreResult | null>(null);
  const [alreadySubmitted, setAlreadySubmitted] = useState(false);
  const [isLoading, setIsLoading]               = useState(true);
  const [error, setError]                       = useState<string | null>(null);
  const [locked, setLocked]                     = useState<{ unlocksAt: string } | null>(null);

  useEffect(() => {
    if (!challengeId) return;
    setIsLoading(true);
    setError(null);
    setLocked(null);

    puzzleService.loadPuzzle(challengeId, weekNumber)
      .then(data => {
        setPuzzleInstance(data.puzzle);
        if (data.previousSubmission) {
          setAlreadySubmitted(true);
          setScoreResult(data.previousSubmission);
        } else {
          setSavedProgress(data.progress ?? null);
        }
      })
      .catch((err: Error) => {
        if (err.message?.includes('not yet unlocked')) {
          setLocked({ unlocksAt: '' });
        } else {
          setError(err.message ?? 'Failed to load puzzle');
        }
      })
      .finally(() => setIsLoading(false));
  }, [challengeId, weekNumber]);

  const handleSubmit = useCallback(
    async (answer: Record<string, unknown>, timeTaken: number) => {
      if (!puzzleInstance) return;
      try {
        const result = await puzzleService.submitPuzzle(puzzleInstance.id, {
          puzzleType:       puzzleInstance.puzzleType,
          answer,
          timeTakenSeconds: timeTaken,
        });
        setScoreResult(result.score);
        if (result.alreadySubmitted) {
          setAlreadySubmitted(true);
        }
      } catch (err) {
        setError((err as Error).message ?? 'Submission failed');
      }
    },
    [puzzleInstance]
  );

  const handleSaveProgress = useCallback(
    async (progressData: Record<string, unknown>) => {
      if (!puzzleInstance) return;
      try {
        await puzzleService.saveProgress(puzzleInstance.id, progressData);
        navigate(`/challenges/${challengeId}/play`);
      } catch (err) {
        console.error('Save error:', err);
      }
    },
    [puzzleInstance, challengeId, navigate]
  );

  const backHref = `/challenges/${challengeId}/play`;

  if (locked) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center px-4">
        <p className="text-2xl">🔒</p>
        <p className="font-semibold text-gray-800">This week isn't unlocked yet.</p>
        {locked.unlocksAt && (
          <p className="text-sm text-gray-500">
            Unlocks on {new Date(locked.unlocksAt).toLocaleDateString()}
          </p>
        )}
        <Link to={backHref} className="mt-2 px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">
          ← Back to challenge
        </Link>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <p className="text-rose-600 font-medium">{error}</p>
        <Link to={backHref} className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">
          ← Back to challenge
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-3xl mx-auto mb-4">
        <Link
          to={backHref}
          className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
        >
          ← Back to challenge
        </Link>
      </div>

      {(isLoading || puzzleInstance) && (
        <PuzzleShell
          puzzleType={puzzleInstance?.puzzleType ?? 'anagram'}
          title={`Week ${weekNumber}`}
          instructions=""
          difficulty={puzzleInstance?.difficulty ?? 'medium'}
          puzzleData={puzzleInstance?.puzzleData ?? {}}
          onSubmit={handleSubmit}
          onSaveProgress={handleSaveProgress}
          savedState={savedProgress}
          isLoading={isLoading}
          scoreResult={scoreResult}
          initiallyCompleted={alreadySubmitted}
        />
      )}
    </div>
  );
}