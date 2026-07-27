// src/components/puzzles/pages/PuzzleDropPlayPage.tsx
//
// Drop's equivalent of PuzzlePage.tsx. Same PuzzleShell/getPuzzleMeta reuse,
// same loadedData/isLoading/pageError shape — the actual puzzle-playing
// experience is identical regardless of which product sold access to it.
//
// What's genuinely different from PuzzlePage.tsx, not just renamed:
//   - Auth is entitlementId (URL param) + access_token (?token= query
//     param) instead of a supporter session — see puzzleDropPlayService.ts.
//   - No "locked, unlocks later" state (Drop items have no per-item
//     unlock schedule) — replaced with a "payment pending confirmation"
//     state instead (spec §5.4: clicking the link before the club
//     confirms a manual payment should land here, not on an error).
//   - No "back to my challenge" link after Save & Exit — Drop has no
//     persistent multi-item hub page yet, so this shows an inline
//     "saved" confirmation instead of navigating anywhere.
//   - No club branding fetch — uses the default theme. A public
//     branding-by-room lookup could be added later; skipped here rather
//     than guessed at.
//   - After submitting, shows links to this item's leaderboard and the
//     Drop's overall "wall of fame" (PuzzleDropItemLeaderboardPage.tsx /
//     PuzzleDropWallOfFamePage.tsx) — flagged as a gap and fixed once it
//     was noticed there was previously nowhere to navigate to after
//     completing a puzzle.

import { useCallback, useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import PuzzleShell from '../PuzzleShell';
import { getPuzzleMeta } from '../PuzzleMeta';
import { puzzleDropPlayService, PaymentPendingError } from '../services/puzzleDropPlayService';
import type { PuzzleInstance, PuzzleProgressMeta, PuzzleScoreResult } from '../puzzleTypes';
import PuzzlePageShell from '../ui/PuzzlePageShell';
import PuzzlePrimaryButton from '../ui/PuzzlePrimaryButton';
import { resolvePuzzleTheme } from '../ui/puzzleTheme';

interface LoadedPuzzleData {
  instance: PuzzleInstance;
  savedProgress: Record<string, unknown> | null;
  progressMeta: PuzzleProgressMeta | null;
  previousSubmission: PuzzleScoreResult | null;
  itemNumber: number;
  dropRoomId: string;
}

export default function PuzzleDropPlayPage() {
  const { entitlementId } = useParams<{ entitlementId: string }>();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? '';

  const [loadedData, setLoadedData] = useState<LoadedPuzzleData | null>(null);
  const [submittedScoreResult, setSubmittedScoreResult] = useState<PuzzleScoreResult | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveConfirmed, setSaveConfirmed] = useState(false);
  const [paymentPending, setPaymentPending] = useState<string | null>(null);

  const puzzleInstance = loadedData?.instance ?? null;
  const savedProgress = loadedData?.savedProgress ?? null;
  const progressMeta = loadedData?.progressMeta ?? null;
  const alreadySubmitted = Boolean(submittedScoreResult) || Boolean(loadedData?.previousSubmission);
  const scoreResult = submittedScoreResult ?? loadedData?.previousSubmission ?? null;

  // No club branding fetch — default theme only. See file header note.
  const theme = resolvePuzzleTheme(null);

  useEffect(() => {
    if (!entitlementId || !token) {
      setPageError('This link is missing or invalid.');
      setIsLoading(false);
      return;
    }

    const currentEntitlementId = entitlementId;
    const currentToken = token;

    setIsLoading(true);
    setPageError(null);
    setSaveError(null);
    setPaymentPending(null);
    setLoadedData(null);
    setSubmittedScoreResult(null);

    puzzleDropPlayService
      .loadPuzzle(currentEntitlementId, currentToken)
      .then(data => {
        setLoadedData({
          instance: data.puzzle,
          savedProgress: data.previousSubmission ? null : (data.progress ?? null),
          progressMeta: data.previousSubmission ? null : (data.progressMeta ?? null),
          previousSubmission: data.previousSubmission ?? null,
          itemNumber: data.itemNumber,
          dropRoomId: data.dropRoomId,
        });
      })
      .catch((err: Error) => {
        if (err instanceof PaymentPendingError) {
          setPaymentPending(err.paymentStatus);
          return;
        }
        setPageError(err.message ?? 'Failed to load puzzle');
      })
      .finally(() => setIsLoading(false));
  }, [entitlementId, token]);

  const handleSubmit = useCallback(
    async (answer: Record<string, unknown>, timeTaken: number) => {
      if (!puzzleInstance || !entitlementId || !token) return;
      setPageError(null);

      try {
        const result = await puzzleDropPlayService.submitPuzzle(entitlementId, token, puzzleInstance.id, {
          puzzleType: puzzleInstance.puzzleType,
          answer,
          timeTakenSeconds: timeTaken,
        });
        setSubmittedScoreResult(result.score);
      } catch (err) {
        setPageError((err as Error).message ?? 'Submission failed');
      }
    },
    [puzzleInstance, entitlementId, token]
  );

  // Explicit "Save & Exit" — no hub page to navigate to yet (see file
  // header note), so this shows an inline confirmation instead.
  const handleSaveProgress = useCallback(
    async (progressData: Record<string, unknown>) => {
      if (!puzzleInstance || !entitlementId || !token) return;
      setSaveError(null);

      try {
        await puzzleDropPlayService.saveProgress(entitlementId, token, puzzleInstance.id, progressData);
        setSaveConfirmed(true);
        window.setTimeout(() => setSaveConfirmed(false), 3000);
      } catch (err) {
        console.error('Save error:', err);
        setSaveError('We could not save your progress just now. Please try again.');
      }
    },
    [puzzleInstance, entitlementId, token]
  );

  const handleAutosave = useCallback(
    async (progressData: Record<string, unknown>) => {
      if (!puzzleInstance || !entitlementId || !token) return;
      try {
        await puzzleDropPlayService.saveProgress(entitlementId, token, puzzleInstance.id, progressData);
      } catch (err) {
        console.error('Autosave error:', err);
      }
    },
    [puzzleInstance, entitlementId, token]
  );

  const handleAutosaveOnUnload = useCallback(
    (progressData: Record<string, unknown>) => {
      if (!puzzleInstance || !entitlementId || !token) return;
      puzzleDropPlayService.saveProgressOnUnload(entitlementId, token, puzzleInstance.id, progressData);
    },
    [puzzleInstance, entitlementId, token]
  );

  const resolvedPuzzleType = puzzleInstance?.puzzleType ?? 'anagram';
  const resolvedDifficulty = puzzleInstance?.difficulty ?? 'medium';
  const { title, instructions } = getPuzzleMeta(resolvedPuzzleType, resolvedDifficulty);

  if (paymentPending) {
    return (
      <PuzzlePageShell
        theme={theme}
        rightHeaderContent={
          <div className="rounded-2xl border border-[#F3D79B] bg-[#FFF2D9] px-4 py-2 shadow-sm">
            <p className="text-sm font-semibold text-[#8A5A00]">Payment pending</p>
            <p className="text-xs text-[#A6842E]">Awaiting confirmation</p>
          </div>
        }
      >
        <div className="mx-auto flex min-h-[55vh] max-w-xl items-center justify-center">
          <div className="w-full rounded-[36px] border border-[#E8E0D3] bg-white p-8 text-center shadow-sm">
            <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-[26px] bg-[#FFF2D9] text-4xl shadow-sm">
              ⏳
            </div>
            <p className="mb-3 text-sm font-semibold uppercase tracking-[0.18em] text-[#E36B2C]">
              Almost there
            </p>
            <h1 className="font-serif text-4xl leading-tight text-[#071A44]">
              Payment pending confirmation
            </h1>
            <p className="mt-4 text-sm leading-relaxed text-[#6E6A63]">
              The organiser hasn't confirmed your payment yet. This same link will unlock your
              puzzle automatically once they do — no need to request a new one.
            </p>
          </div>
        </div>
      </PuzzlePageShell>
    );
  }

  if (pageError) {
    return (
      <PuzzlePageShell
        theme={theme}
        rightHeaderContent={
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-2 shadow-sm">
            <p className="text-sm font-semibold text-rose-700">Puzzle problem</p>
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
            <p className="mt-4 text-sm leading-relaxed text-[#6E6A63]">{pageError}</p>
            <PuzzlePrimaryButton type="button" onClick={() => window.location.reload()} className="mt-7">
              Try again
            </PuzzlePrimaryButton>
          </div>
        </div>
      </PuzzlePageShell>
    );
  }

  return (
    <PuzzlePageShell
      theme={theme}
      rightHeaderContent={
        <div className="rounded-2xl border border-[#D8E8D8] bg-[#EEF8EF] px-4 py-2 shadow-sm">
          <p className="text-sm font-semibold text-[#2E6A46]">
            Puzzle {loadedData?.itemNumber ?? ''}
          </p>
          <p className="text-xs capitalize text-[#5F7D6A]">{resolvedDifficulty} puzzle</p>
        </div>
      }
    >
      <div className="mx-auto max-w-5xl">
        <div className="mb-4 flex flex-wrap items-center justify-end gap-3">
          {alreadySubmitted ? (
            <span className="rounded-full border border-[#D8E8D8] bg-[#EEF8EF] px-4 py-2 text-xs font-semibold text-[#2E6A46] shadow-sm">
              Submitted
            </span>
          ) : null}
        </div>

        {/* Previously this was a dead end — the score showed with nowhere
            to go afterward. Now offers both a per-item leaderboard link
            and the Drop's overall wall-of-fame. */}
        {alreadySubmitted && loadedData?.dropRoomId && (
          <div className="mb-4 rounded-2xl border border-[#D8E8D8] bg-[#EEF8EF] p-4">
            <p className="mb-3 text-sm font-medium text-[#2E6A46]">
              🎉 Nice work — see how you stack up:
            </p>
            <div className="flex flex-wrap gap-2">
              <Link
                to={`/puzzle-drop/${loadedData.dropRoomId}/items/${loadedData.itemNumber}/leaderboard`}
                className="inline-flex items-center justify-center rounded-full bg-[var(--puzzle-primary)] px-5 py-2.5 text-sm font-semibold text-[var(--puzzle-text-on-primary)] shadow-sm transition hover:opacity-95"
              >
                View this puzzle's leaderboard →
              </Link>
              <Link
                to={`/puzzle-drop/${loadedData.dropRoomId}/leaderboard`}
                className="inline-flex items-center justify-center rounded-full border border-[#D8D1C4] bg-white px-5 py-2.5 text-sm font-semibold text-[#071A44] shadow-sm transition hover:bg-[#F8F5EF]"
              >
                See all puzzles →
              </Link>
            </div>
          </div>
        )}

        {saveConfirmed ? (
          <div className="mb-4 rounded-2xl border border-[#D8E8D8] bg-[#EEF8EF] px-4 py-3">
            <p className="text-sm font-medium text-[#2E6A46]">✓ Progress saved — come back to this link any time.</p>
          </div>
        ) : null}

        {saveError ? (
          <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3">
            <p className="text-sm font-medium text-rose-700">{saveError}</p>
          </div>
        ) : null}

        <div className="overflow-hidden rounded-[32px] border border-[#E8E0D3] bg-white p-3 shadow-sm sm:p-4">
          {(isLoading || puzzleInstance) && (
            <div className="rounded-[24px] bg-[#FBF8F3] p-2 sm:p-4">
              <PuzzleShell
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