// src/components/puzzles/components/PuzzleResumeBanner.tsx
//
// Shown when a puzzle loads with saved progress (GET /puzzles/:id/:week
// returned a non-null `progress`), so resuming is an explicit, visible
// choice rather than something that just silently happens. Discarding
// starts the player over from a blank puzzle - it does NOT delete the
// saved row server-side, it only tells the parent to ignore it for this
// session, so a mis-tap doesn't destroy real progress. If you want a hard
// delete-and-restart, wire "Start over" to also call a delete endpoint -
// none exists in the files I've seen, so this only clears client state.

import React from 'react';

interface PuzzleResumeBannerProps {
  /** When the saved progress was last written, e.g. from loadProgress's updatedAt. */
  savedAt?: string | Date | null;
  /** Server-tracked active time so far (progressMeta.activeSeconds from the
   *  GET response) - shown so "continue" feels informed rather than a leap
   *  of faith. Purely informational; doesn't affect scoring either way. */
  activeSecondsSoFar?: number | null;
  onResume: () => void;
  onStartOver: () => void;
}

function formatDurationSoFar(totalSeconds: number | null | undefined): string | null {
  if (!totalSeconds || totalSeconds < 1) return null;

  if (totalSeconds < 60) return `${Math.round(totalSeconds)} seconds`;

  const minutes = Math.round(totalSeconds / 60);
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'}`;

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return remainingMinutes > 0
    ? `${hours}h ${remainingMinutes}m`
    : `${hours} hour${hours === 1 ? '' : 's'}`;
}

function formatRelativeTime(savedAt: string | Date | null | undefined): string {
  if (!savedAt) return 'earlier';

  const savedMs = savedAt instanceof Date ? savedAt.getTime() : new Date(savedAt).getTime();
  if (Number.isNaN(savedMs)) return 'earlier';

  const diffMs = Date.now() - savedMs;
  const diffMinutes = Math.round(diffMs / 60000);

  if (diffMinutes < 1) return 'moments ago';
  if (diffMinutes < 60) return `${diffMinutes} minute${diffMinutes === 1 ? '' : 's'} ago`;

  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;

  const diffDays = Math.round(diffHours / 24);
  return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
}

const PuzzleResumeBanner: React.FC<PuzzleResumeBannerProps> = ({
  savedAt,
  activeSecondsSoFar,
  onResume,
  onStartOver,
}) => {
  const durationText = formatDurationSoFar(activeSecondsSoFar);

  return (
    <div className="mb-4 flex flex-col gap-3 rounded-2xl border border-indigo-200 bg-indigo-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <div className="text-sm font-bold text-indigo-900">
          You have progress saved from {formatRelativeTime(savedAt)}
        </div>
        <div className="mt-0.5 text-xs font-medium text-indigo-600">
          {durationText
            ? `About ${durationText} spent so far. Pick up where you left off, or start this puzzle over.`
            : 'Pick up where you left off, or start this puzzle over.'}
        </div>
      </div>

      <div className="flex shrink-0 gap-2">
        <button
          type="button"
          onClick={onStartOver}
          className="rounded-full border border-indigo-200 bg-white px-4 py-2 text-sm font-bold text-indigo-600 shadow-sm transition hover:bg-indigo-50"
        >
          Start over
        </button>
        <button
          type="button"
          onClick={onResume}
          className="rounded-full bg-indigo-600 px-4 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-indigo-700"
        >
          Continue
        </button>
      </div>
    </div>
  );
};

export default PuzzleResumeBanner;