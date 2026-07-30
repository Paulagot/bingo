// src/components/puzzles/components/PuzzleInstructionsOverlay.tsx
//
// Lets a player re-check "how to play" mid-puzzle. Before this, instructions
// only rendered during the 'notStarted' page state - once Start was
// clicked, there was no way back to them short of abandoning the puzzle.
// Purely informational: doesn't touch currentAnswer, the timer, or
// autosave, so opening/closing it has zero effect on scoring.

import React, { useEffect } from 'react';

interface PuzzleInstructionsOverlayProps {
  instructions: string | string[];
  onClose: () => void;
}

const PuzzleInstructionsOverlay: React.FC<PuzzleInstructionsOverlayProps> = ({
  instructions,
  onClose,
}) => {
  // Escape to close, and lock background scroll while open - standard
  // modal behavior, and it means the puzzle grid behind it can't be
  // scrolled/interacted with accidentally while this is up.
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };

    document.addEventListener('keydown', handleKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="puzzle-instructions-title"
      onClick={onClose}
    >
      <div
        className="max-h-[80vh] w-full max-w-lg overflow-y-auto rounded-3xl bg-white p-6 shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <h2 id="puzzle-instructions-title" className="text-lg font-bold text-slate-900">
            How to play
          </h2>

          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
            aria-label="Close instructions"
          >
            ✕
          </button>
        </div>

        {Array.isArray(instructions) ? (
          <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed text-slate-600">
            {instructions.map((item, index) => (
              <li key={index}>{item}</li>
            ))}
          </ul>
        ) : (
          <p className="text-sm leading-relaxed text-slate-600">{instructions}</p>
        )}

        <button
          type="button"
          onClick={onClose}
          className="mt-6 w-full rounded-full bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-indigo-700"
        >
          Got it
        </button>
      </div>
    </div>
  );
};

export default PuzzleInstructionsOverlay;