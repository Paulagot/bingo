// src/components/puzzles/pages/PuzzlePage.tsx

import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import PuzzleShell from '../PuzzleShell';
import { getPuzzleMeta } from '../PuzzleMeta';
import { puzzleService } from '../services/puzzleService';
import {
  supporterAuthService,
  type PublicChallenge,
} from '../services/SupporterAuthService';
import type { PuzzleInstance, PuzzleProgressMeta, PuzzleScoreResult } from '../puzzleTypes';
import PuzzlePageShell from '../ui/PuzzlePageShell';
import PuzzlePrimaryButton from '../ui/PuzzlePrimaryButton';
import { resolvePuzzleTheme } from '../ui/puzzleTheme';

interface LoadedPuzzleData {
  instance: PuzzleInstance;
  savedProgress: Record<string, unknown> | null;
  progressMeta: PuzzleProgressMeta | null;
  previousSubmission: PuzzleScoreResult | null;
}

export default function PuzzlePage() {
  const { challengeId, week } = useParams<{
    challengeId: string;
    week: string;
  }>();

  const navigate = useNavigate();
  const weekNumber = parseInt(week ?? '1', 10);

  // Everything that arrives together from loadPuzzle lives in one state
  // object, set with a single setState call. This matters: PuzzleShell is
  // force-remounted (via `key`) the instant puzzleInstance's id changes, so
  // it can pick up savedProgress/progressMeta with fresh state initializers
  // instead of getting stuck with stale ones (see the key comment below).
  // That guarantee only holds if puzzleInstance and savedProgress/
  // progressMeta can never be "half updated" relative to each other across
  // renders - which three separate setState calls in the same .then() do
  // NOT guarantee unless React happens to batch them. One object, one
  // setState call, removes that dependency on batching behavior entirely.
  const [loadedData, setLoadedData] = useState<LoadedPuzzleData | null>(null);
  // Only for a fresh submission made in THIS session - seeded from
  // loadedData.previousSubmission via the scoreResult derivation below, not
  // its own separate load-time setState call, for the same reason.
  const [submittedScoreResult, setSubmittedScoreResult] = useState<PuzzleScoreResult | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [locked, setLocked] = useState<{ unlocksAt: string } | null>(null);

  const puzzleInstance = loadedData?.instance ?? null;
  const savedProgress = loadedData?.savedProgress ?? null;
  const progressMeta = loadedData?.progressMeta ?? null;
  const alreadySubmitted = Boolean(submittedScoreResult) || Boolean(loadedData?.previousSubmission);
  const scoreResult = submittedScoreResult ?? loadedData?.previousSubmission ?? null;

  // Club branding - fetched independently of the puzzle itself.
  // puzzleService.loadPuzzle returns puzzle data only, never club
  // branding, so this page needs its own small getPublicChallenge call
  // (same one PlayerChallengePage and PuzzleJoinPage use) purely to
  // resolve the theme. Deliberately NOT wired into the puzzle-loading
  // error/locked states below - a branding fetch failure should never
  // block or error out the actual puzzle-playing experience, it should
  // just silently fall back to the default FundRaisely look.
  const [challenge, setChallenge] = useState<PublicChallenge | null>(null);
  const theme = resolvePuzzleTheme(challenge);

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
    setLoadedData(null);
    setSubmittedScoreResult(null);

    puzzleService
      .loadPuzzle(currentChallengeId, currentWeekNumber)
      .then(data => {
        setLoadedData({
          instance: data.puzzle,
          // No resume UI makes sense once already submitted - same
          // behavior as before, just derived in one place now.
          savedProgress: data.previousSubmission ? null : (data.progress ?? null),
          progressMeta: data.previousSubmission ? null : (data.progressMeta ?? null),
          previousSubmission: data.previousSubmission ?? null,
        });
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

  useEffect(() => {
    if (!challengeId) return;

    supporterAuthService
      .getPublicChallenge(challengeId)
      .then(setChallenge)
      .catch(() => {
        // Branding is a nice-to-have here, not a requirement - leave
        // challenge as null and let resolvePuzzleTheme fall back to
        // the default FundRaisely look.
      });
  }, [challengeId]);

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

        setSubmittedScoreResult(result.score);
      } catch (err) {
        setPageError((err as Error).message ?? 'Submission failed');
      }
    },
    [puzzleInstance]
  );

  // Explicit "Save & Exit" - the player chose to leave, so navigating away
  // afterward is correct here. This is NOT what autosave uses (see
  // handleAutosave below) - wiring this into a periodic autosave would
  // silently boot the player back to the challenge list every time it fired.
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

  // Silent background save for PuzzleShell's autosave (debounced on every
  // answer change, plus a periodic forced flush) - same endpoint as
  // handleSaveProgress, but deliberately no navigation and no surfaced error.
  // A failed background save shouldn't interrupt the player the way a failed
  // explicit Save & Exit should; the next autosave cycle (or an eventual
  // explicit Save & Exit) will just retry.
  const handleAutosave = useCallback(
    async (progressData: Record<string, unknown>) => {
      if (!puzzleInstance) return;

      try {
        await puzzleService.saveProgress(puzzleInstance.id, progressData);
      } catch (err) {
        console.error('Autosave error:', err);
      }
    },
    [puzzleInstance]
  );

  // Best-effort save fired only when the tab is hiding or the page is
  // unloading - uses the keepalive-flagged request variant since a normal
  // fetch is frequently cancelled mid-flight at exactly that moment.
  const handleAutosaveOnUnload = useCallback(
    (progressData: Record<string, unknown>) => {
      if (!puzzleInstance) return;
      puzzleService.saveProgressOnUnload(puzzleInstance.id, progressData);
    },
    [puzzleInstance]
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
        theme={theme}
        clubName={challenge?.club_name}
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
        theme={theme}
        clubName={challenge?.club_name}
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
      theme={theme}
      clubName={challenge?.club_name}
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
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <Link
            to={backHref}
            className="inline-flex items-center justify-center rounded-full border border-[#D8D1C4] bg-white px-5 py-2.5 text-sm font-semibold text-[#071A44] shadow-sm transition hover:bg-[#F8F5EF]"
          >
            ← Back to challenge
          </Link>

          {/* Puzzle type and difficulty dropped here - PuzzleShell's own
              header (title + difficulty badge) shows the exact same thing
              a few pixels below, and on mobile this whole intro area was
              adding three separate mentions of the puzzle name and
              difficulty before the actual game came into view. */}
          {alreadySubmitted ? (
            <span className="rounded-full border border-[#D8E8D8] bg-[#EEF8EF] px-4 py-2 text-xs font-semibold text-[#2E6A46] shadow-sm">
              Submitted
            </span>
          ) : null}
        </div>

        {saveError ? (
          <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3">
            <p className="text-sm font-medium text-rose-700">{saveError}</p>
          </div>
        ) : null}

        <div className="overflow-hidden rounded-[32px] border border-[#E8E0D3] bg-white p-3 shadow-sm sm:p-4">
          {(isLoading || puzzleInstance) && (
            <div className="rounded-[24px] bg-[#FBF8F3] p-2 sm:p-4">
              <PuzzleShell
                // PuzzleShell derives currentAnswer/pageState/resumeChoiceMade
                // from savedState via useState initializers, which only run
                // on a component's first render. Without this key, PuzzleShell
                // mounts once immediately (while isLoading is still true and
                // savedState is still null), and those pieces of state stay
                // stuck at their "nothing saved yet" values forever, even
                // after the real saved progress arrives a moment later - the
                // puzzle would silently fail to resume every time. Keying on
                // the instance id forces a fresh mount (fresh state
                // initializers) exactly when real data becomes available.
                key={puzzleInstance?.id ?? 'loading'}
                puzzleType={resolvedPuzzleType}
                title={title}
                instructions={instructions}
                difficulty={resolvedDifficulty}
                puzzleData={puzzleInstance?.puzzleData ?? {}}
                onSubmit={handleSubmit}
                onSaveProgress={handleSaveProgress}
                onAutosave={handleAutosave}
                onSaveProgressOnUnload={handleAutosaveOnUnload}
                savedState={savedProgress}
                savedAt={progressMeta?.savedAt}
                initialActiveSeconds={progressMeta?.activeSeconds}
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