// src/components/puzzles/pages/PuzzleDropPlayPage.tsx
//
// Puzzle Drop wrapper around the SHARED PuzzleShell.
//
// IMPORTANT:
// PuzzleShell + all puzzle renderers are shared with Puzzle Subscription.
// Keep Drop-specific branding/navigation/competitive UX HERE rather than
// changing the shared gameplay engine.
//
// Drop-specific behaviour:
// - entitlementId + token authentication
// - payment-pending state for manual payments
// - loads Drop info after entitlement resolution so club branding is preserved
// - Drop-specific leaderboard / Wall of Fame / share actions after submission
// - shared PuzzleShell remains untouched

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';

import PuzzleShell from '../PuzzleShell';
import { getPuzzleMeta } from '../PuzzleMeta';

import {
  puzzleDropPlayService,
  PaymentPendingError,
} from '../services/puzzleDropPlayService';

import {
  publicPuzzleDropService,
  type PublicDropInfo,
} from '../services/publicPuzzleDropService';

import type {
  PuzzleInstance,
  PuzzleProgressMeta,
  PuzzleScoreResult,
} from '../puzzleTypes';

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

const PUZZLE_TYPE_LABELS: Record<string, string> = {
  anagram: 'Anagram',
  sequenceOrdering: 'Sequence Ordering',
  matchPairs: 'Matching Pairs',
  wordSearch: 'Word Search',
  slidingTile: 'Sliding Tiles',
  sudoku: 'Sudoku',
  patternCompletion: 'Pattern Completion',
  wordLadder: 'Word Ladder',
  cryptogram: 'Cryptogram',
  numberPath: 'Number Path',
  towersOfHanoi: 'Towers of Hanoi',
  nonogram: 'Nonogram',
  memoryPairs: 'Memory Pairs',
};

function TrophyIcon({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path
        d="M8 4h8v4.4c0 3-1.7 5.1-4 5.1s-4-2.1-4-5.1V4Zm0 2H5v1.5c0 2.1 1.2 3.6 3.2 4M16 6h3v1.5c0 2.1-1.2 3.6-3.2 4M12 13.5V18m-3 2h6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ShareIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
      <path
        d="M12 3v11m0-11 4 4m-4-4L8 7M5 10v8a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-8"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
      <path
        d="m6 12 4 4 8-9"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-7 w-7" aria-hidden="true">
      <circle
        cx="12"
        cy="12"
        r="8"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path
        d="M12 7v5l3 2"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

export default function PuzzleDropPlayPage() {
  const { entitlementId } = useParams<{ entitlementId: string }>();
  const [searchParams] = useSearchParams();

  const token = searchParams.get('token') ?? '';

  const [loadedData, setLoadedData] = useState<LoadedPuzzleData | null>(null);
  const [dropInfo, setDropInfo] = useState<PublicDropInfo | null>(null);

  const [submittedScoreResult, setSubmittedScoreResult] =
    useState<PuzzleScoreResult | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveConfirmed, setSaveConfirmed] = useState(false);
  const [paymentPending, setPaymentPending] = useState<string | null>(null);
  const [shareCopied, setShareCopied] = useState(false);

  const puzzleInstance = loadedData?.instance ?? null;
  const savedProgress = loadedData?.savedProgress ?? null;
  const progressMeta = loadedData?.progressMeta ?? null;

  const alreadySubmitted =
    Boolean(submittedScoreResult) ||
    Boolean(loadedData?.previousSubmission);

  const scoreResult =
    submittedScoreResult ??
    loadedData?.previousSubmission ??
    null;

  // Same club-branding source used by the Drop landing page.
  // If the branding fetch fails, this safely falls back to the standard theme.
  const theme = useMemo(
    () => resolvePuzzleTheme(dropInfo),
    [dropInfo],
  );

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
    setDropInfo(null);
    setSubmittedScoreResult(null);

    puzzleDropPlayService
      .loadPuzzle(currentEntitlementId, currentToken)
      .then(async data => {
        setLoadedData({
          instance: data.puzzle,
          savedProgress: data.previousSubmission
            ? null
            : (data.progress ?? null),
          progressMeta: data.previousSubmission
            ? null
            : (data.progressMeta ?? null),
          previousSubmission: data.previousSubmission ?? null,
          itemNumber: data.itemNumber,
          dropRoomId: data.dropRoomId,
        });

        // Branding/content failure must never stop someone playing a puzzle
        // they have legitimately unlocked.
        try {
          const info = await publicPuzzleDropService.getInfo(data.dropRoomId);
          setDropInfo(info);
        } catch (err) {
          console.warn(
            '[PuzzleDropPlayPage] Could not load Drop branding:',
            err,
          );
        }
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
    async (
      answer: Record<string, unknown>,
      timeTaken: number,
    ) => {
      if (!puzzleInstance || !entitlementId || !token) return;

      setPageError(null);

      try {
        const result = await puzzleDropPlayService.submitPuzzle(
          entitlementId,
          token,
          puzzleInstance.id,
          {
            puzzleType: puzzleInstance.puzzleType,
            answer,
            timeTakenSeconds: timeTaken,
          },
        );

        setSubmittedScoreResult(result.score);
      } catch (err) {
        setPageError(
          (err as Error).message ?? 'Submission failed',
        );
      }
    },
    [puzzleInstance, entitlementId, token],
  );

  const handleSaveProgress = useCallback(
    async (progressData: Record<string, unknown>) => {
      if (!puzzleInstance || !entitlementId || !token) return;

      setSaveError(null);

      try {
        await puzzleDropPlayService.saveProgress(
          entitlementId,
          token,
          puzzleInstance.id,
          progressData,
        );

        setSaveConfirmed(true);
        window.setTimeout(
          () => setSaveConfirmed(false),
          3000,
        );
      } catch (err) {
        console.error('Save error:', err);
        setSaveError(
          'We could not save your progress just now. Please try again.',
        );
      }
    },
    [puzzleInstance, entitlementId, token],
  );

  const handleAutosave = useCallback(
    async (progressData: Record<string, unknown>) => {
      if (!puzzleInstance || !entitlementId || !token) return;

      try {
        await puzzleDropPlayService.saveProgress(
          entitlementId,
          token,
          puzzleInstance.id,
          progressData,
        );
      } catch (err) {
        console.error('Autosave error:', err);
      }
    },
    [puzzleInstance, entitlementId, token],
  );

  const handleAutosaveOnUnload = useCallback(
    (progressData: Record<string, unknown>) => {
      if (!puzzleInstance || !entitlementId || !token) return;

      puzzleDropPlayService.saveProgressOnUnload(
        entitlementId,
        token,
        puzzleInstance.id,
        progressData,
      );
    },
    [puzzleInstance, entitlementId, token],
  );

  const resolvedPuzzleType =
    puzzleInstance?.puzzleType ?? 'anagram';

  const resolvedDifficulty =
    puzzleInstance?.difficulty ?? 'medium';

  const puzzleName =
    PUZZLE_TYPE_LABELS[resolvedPuzzleType] ??
    resolvedPuzzleType;

  const { title, instructions } = getPuzzleMeta(
    resolvedPuzzleType,
    resolvedDifficulty,
  );

  async function handleShare() {
    if (!loadedData) return;

    // NEVER share the private entitlement URL/token.
    // Share the public Drop instead.
    const shareUrl =
      `${window.location.origin}/puzzle-drop/${loadedData.dropRoomId}`;

    const shareData = {
      title: dropInfo?.title ?? 'Puzzle Drop',
      text: `I took on ${puzzleName}. Think you can beat my score?`,
      url: shareUrl,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
        return;
      }

      await navigator.clipboard.writeText(shareUrl);
      setShareCopied(true);
      window.setTimeout(
        () => setShareCopied(false),
        1800,
      );
    } catch (err) {
      if ((err as DOMException)?.name !== 'AbortError') {
        console.warn(
          '[PuzzleDropPlayPage] Share failed:',
          err,
        );
      }
    }
  }

  // Payment pending happens before loadPuzzle returns the room metadata.
  // If PaymentPendingError is later extended to include dropRoomId, we can
  // brand this state too. For now it safely uses the fallback puzzle theme.
  if (paymentPending) {
    return (
      <PuzzlePageShell
        theme={theme}
        clubName={dropInfo?.clubName ?? undefined}
        rightHeaderContent={
          <div className="rounded-2xl border border-[#F3D79B] bg-[#FFF2D9] px-4 py-2 shadow-sm">
            <p className="text-sm font-semibold text-[#8A5A00]">
              Payment pending
            </p>
            <p className="text-xs text-[#A6842E]">
              Awaiting confirmation
            </p>
          </div>
        }
      >
        <div className="mx-auto flex min-h-[55vh] max-w-xl items-center justify-center">
          <div className="w-full rounded-[36px] border border-[#E8E0D3] bg-white p-8 text-center shadow-sm">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[22px] bg-[#FFF2D9] text-[#8A5A00]">
              <ClockIcon />
            </div>

            <p className="mt-5 text-xs font-bold uppercase tracking-[0.18em] text-[#E36B2C]">
              Almost there
            </p>

            <h1 className="mt-2 font-serif text-4xl leading-tight text-[#071A44]">
              Payment pending confirmation
            </h1>

            <p className="mt-4 text-sm leading-relaxed text-[#6E6A63]">
              The organiser hasn't confirmed your payment yet. This same
              link will unlock your puzzle automatically once they do —
              there is no need to request a new one.
            </p>
          </div>
        </div>
      </PuzzlePageShell>
    );
  }

  // Only use the full-page error state when the puzzle itself could not load.
  // A later submission error is shown inline below so the player does not lose
  // the puzzle UI they were using.
  if (pageError && !puzzleInstance) {
    return (
      <PuzzlePageShell
        theme={theme}
        clubName={dropInfo?.clubName ?? undefined}
        rightHeaderContent={
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-2 shadow-sm">
            <p className="text-sm font-semibold text-rose-700">
              Puzzle problem
            </p>
            <p className="text-xs text-rose-500">
              Please try again
            </p>
          </div>
        }
      >
        <div className="mx-auto flex min-h-[55vh] max-w-xl items-center justify-center">
          <div className="w-full rounded-[36px] border border-[#E8E0D3] bg-white p-8 text-center shadow-sm">
            <h1 className="font-serif text-4xl leading-tight text-[#071A44]">
              Couldn't load puzzle
            </h1>

            <p className="mt-4 text-sm leading-relaxed text-[#6E6A63]">
              {pageError}
            </p>

            <PuzzlePrimaryButton
              type="button"
              onClick={() => window.location.reload()}
              className="mt-7"
            >
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
      clubName={dropInfo?.clubName ?? undefined}
      rightHeaderContent={
        loadedData ? (
          <Link
            to={`/puzzle-drop/${loadedData.dropRoomId}/leaderboard`}
            className="hidden min-h-11 items-center justify-center gap-2 rounded-full border border-[#D8D1C4] bg-white px-5 py-2.5 text-sm font-semibold text-[#071A44] shadow-sm transition hover:bg-[#F8F5EF] sm:inline-flex"
          >
            <TrophyIcon className="h-4 w-4" />
            Leaderboards
          </Link>
        ) : undefined
      }
    >
      <div className="mx-auto w-full min-w-0 max-w-5xl overflow-x-hidden px-0">
        {/* ── DROP CONTEXT ─────────────────────────────────────────────────── */}
        {loadedData ? (
          <section className="mb-3 w-full min-w-0 overflow-hidden rounded-[22px] border border-[#E8E0D3] bg-white p-4 shadow-sm sm:mb-4 sm:rounded-[28px] sm:p-5">
            <div className="min-w-0">
              <div className="flex min-w-0 items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#E36B2C] sm:text-xs">
                    Puzzle {loadedData.itemNumber}
                  </p>

                  <h1 className="mt-1 break-words font-serif text-[1.65rem] leading-tight text-[#071A44] sm:text-3xl">
                    {puzzleName}
                  </h1>
                </div>

                {alreadySubmitted ? (
                  <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-[#D8E8D8] bg-[#EEF8EF] px-3 py-1.5 text-[10px] font-semibold text-[#2E6A46] sm:px-4 sm:py-2 sm:text-xs">
                    <CheckIcon />
                    Submitted
                  </span>
                ) : null}
              </div>

              <div className="mt-1 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                <span className="text-[11px] font-semibold capitalize text-[#8A847B] sm:text-xs">
                  {resolvedDifficulty} difficulty
                </span>

                {dropInfo?.title ? (
                  <>
                    <span className="text-[#C4BCAF]">·</span>
                    <span className="min-w-0 break-words text-[11px] font-semibold text-[var(--puzzle-primary)] sm:text-xs">
                      {dropInfo.title}
                    </span>
                  </>
                ) : null}
              </div>

              {!alreadySubmitted ? (
                <p className="mt-2 text-xs font-semibold text-[var(--puzzle-primary)]">
                  Crack it. Claim your spot.
                </p>
              ) : null}

              {/* Mobile only: keep navigation out of PuzzlePageShell's
                  constrained header row so it can never create horizontal overflow. */}
              <Link
                to={`/puzzle-drop/${loadedData.dropRoomId}/leaderboard`}
                className="mt-3 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-xl border border-[#D8D1C4] bg-[#FBF8F3] px-4 py-2 text-xs font-semibold text-[#071A44] sm:hidden"
              >
                <TrophyIcon className="h-4 w-4" />
                View leaderboards
              </Link>
            </div>
          </section>
        ) : null}

        {/* ── SUBMISSION ERROR — keep puzzle visible ──────────────────────── */}
        {pageError && puzzleInstance ? (
          <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3">
            <p className="text-sm font-medium text-rose-700">
              {pageError}
            </p>
          </div>
        ) : null}

        {/* ── POST-SUBMIT DROP EXPERIENCE ─────────────────────────────────── */}
        {alreadySubmitted && loadedData ? (
          <section className="mb-3 w-full min-w-0 max-w-full overflow-hidden rounded-[22px] border border-[#D8E8D8] bg-[linear-gradient(135deg,#F3FAF4_0%,#FBF8F3_100%)] p-4 shadow-sm sm:mb-4 sm:rounded-[28px] sm:p-6">
            <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-center sm:justify-between sm:gap-5">
              <div className="min-w-0 flex-1">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--puzzle-primary)] text-[var(--puzzle-text-on-primary)] sm:h-11 sm:w-11 sm:rounded-2xl">
                  <TrophyIcon />
                </div>

                <h2 className="mt-3 break-words font-serif text-[1.7rem] leading-[1.08] text-[#071A44] sm:mt-4 sm:text-3xl">
                  Score posted. Now for the bragging rights.
                </h2>

                <p className="mt-2 max-w-xl break-words text-xs leading-relaxed text-[#5F5A54] sm:text-sm">
                  See where you landed on the {puzzleName} leaderboard,
                  then challenge someone to beat you.
                </p>
              </div>

              <div className="flex w-full min-w-0 flex-col gap-2 sm:w-auto sm:min-w-[220px] sm:shrink-0">
                <Link
                  to={`/puzzle-drop/${loadedData.dropRoomId}/items/${loadedData.itemNumber}/leaderboard`}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-[var(--puzzle-primary)] px-5 py-3 text-sm font-semibold text-[var(--puzzle-text-on-primary)] shadow-sm transition hover:opacity-95"
                >
                  <TrophyIcon className="h-4 w-4" />
                  View my leaderboard
                </Link>

                <button
                  type="button"
                  onClick={handleShare}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-[var(--puzzle-primary)] bg-white px-5 py-3 text-sm font-semibold text-[var(--puzzle-primary)]"
                >
                  <ShareIcon />
                  {shareCopied
                    ? 'Link copied!'
                    : 'Challenge a friend'}
                </button>

                <Link
                  to={`/puzzle-drop/${loadedData.dropRoomId}/leaderboard`}
                  className="inline-flex min-h-10 items-center justify-center text-xs font-semibold text-[#6E6A63] underline underline-offset-4"
                >
                  See the full Wall of Fame
                </Link>
              </div>
            </div>
          </section>
        ) : null}

        {/* ── SAVE FEEDBACK ────────────────────────────────────────────────── */}
        {saveConfirmed ? (
          <div className="mb-4 rounded-2xl border border-[#D8E8D8] bg-[#EEF8EF] px-4 py-3">
            <p className="text-sm font-medium text-[#2E6A46]">
              ✓ Progress saved — keep this puzzle link and come back
              whenever you're ready.
            </p>
          </div>
        ) : null}

        {saveError ? (
          <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3">
            <p className="text-sm font-medium text-rose-700">
              {saveError}
            </p>
          </div>
        ) : null}

        {/* ── SHARED GAMEPLAY ────────────────────────────────────────────────
            PuzzleShell and every renderer remain untouched so Puzzle
            Subscription continues to use exactly the same gameplay engine. */}
        <div className="w-full min-w-0 max-w-full overflow-hidden rounded-[20px] border border-[#E8E0D3] bg-white shadow-sm sm:rounded-[32px]">
          {(isLoading || puzzleInstance) && (
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
          )}
        </div>
      </div>
    </PuzzlePageShell>
  );
}

