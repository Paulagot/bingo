// src/components/puzzles/hooks/usePuzzleAutosave.ts
//
// Wraps a puzzle renderer's onAnswerChange with debounced autosave, a
// forced periodic flush, and a flush-on-hide/unload - instead of adding
// this logic separately inside each of the 13 renderer components.
//
// Every renderer already calls onAnswerChange the same way, so hooking in
// here means autosave behaves identically across all puzzle types with
// zero changes needed inside the renderer components themselves - the
// same reasoning as why scoring settings were consolidated into one
// pattern rather than re-implemented per engine.
//
// Deliberately transport-agnostic: it takes an `onSave` callback rather
// than an instanceId + calling puzzleService itself, because PuzzleShell
// (the actual mount point) doesn't own instanceId or talk to the service
// layer directly - it only knows about the onSaveProgress prop its own
// parent gave it. This hook plugs into that same seam rather than adding
// a second, competing way to save.
//
// Usage (inside PuzzleShell):
//
//   const { handleAnswerChange, isSaving } = usePuzzleAutosave({
//     onSave: onSaveProgress,
//     onSaveOnUnload: onSaveProgressOnUnload,
//     isReadOnly,
//   });

import { useCallback, useEffect, useRef, useState } from 'react';

interface UsePuzzleAutosaveOptions {
  /** Same shape as PuzzleShell's existing onSaveProgress prop. May return
   *  a Promise or nothing - both are handled. */
  onSave: ((answer: Record<string, unknown>) => Promise<unknown> | void) | undefined;
  /** Optional - used only for the flush-on-hide/unload path, where a normal
   *  save call is likely to get cancelled mid-flight. If not provided,
   *  falls back to onSave (still attempted, just without the keepalive
   *  guarantee that a dedicated implementation like
   *  puzzleService.saveProgressOnUnload provides). */
  onSaveOnUnload?: (answer: Record<string, unknown>) => void;
  isReadOnly?: boolean;
  /** How long to wait after the last change before saving. */
  debounceMs?: number;
  /** Force a save at least this often even under continuous changes
   *  (dragging a sequence-ordering item repeatedly, painting a nonogram,
   *  etc. would otherwise keep resetting the debounce timer indefinitely). */
  maxWaitMs?: number;
}

interface UsePuzzleAutosaveResult {
  /** Pass this directly as the renderer's onAnswerChange prop. */
  handleAnswerChange: (answer: Record<string, unknown>) => void;
  /** Timestamp of the last successful save, or null if none yet this session. */
  lastSavedAt: number | null;
  /** True the instant a save starts, false the instant it resolves - this
   *  flips very quickly for a typical fast save. Prefer showSavingIndicator
   *  for anything user-visible; this is exposed mainly for programmatic use. */
  isSaving: boolean;
  /** Debounced version of isSaving meant for display: only becomes true if
   *  a save is still in flight after a short delay, so a normal fast save
   *  never flashes anything on screen. Goes false the instant the save
   *  resolves, same as isSaving. */
  showSavingIndicator: boolean;
  /** Force an immediate save of the latest known answer, bypassing the debounce. */
  flushNow: () => void;
}

// How long a save has to be in flight before showing anything to the
// player. Most saves resolve well under this, so this is what actually
// prevents the "Saving…" indicator from flashing in and out on every
// routine autosave - showing it immediately for a save that finishes in
// 80ms is just visual noise, not useful information.
const SAVING_INDICATOR_DELAY_MS = 400;

export function usePuzzleAutosave({
  onSave,
  onSaveOnUnload,
  isReadOnly = false,
  debounceMs = 2000,
  maxWaitMs = 20000,
}: UsePuzzleAutosaveOptions): UsePuzzleAutosaveResult {
  const latestAnswerRef = useRef<Record<string, unknown> | null>(null);
  const dirtyRef = useRef(false);
  const savingRef = useRef(false);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const maxWaitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showSavingIndicator, setShowSavingIndicator] = useState(false);
  const savingIndicatorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Delay showing the indicator, but hide it instantly the moment saving
  // actually finishes - the delay only exists to skip flashing it for fast
  // saves, not to add lag to when it disappears.
  useEffect(() => {
    if (isSaving) {
      savingIndicatorTimerRef.current = setTimeout(() => {
        setShowSavingIndicator(true);
      }, SAVING_INDICATOR_DELAY_MS);
    } else {
      if (savingIndicatorTimerRef.current) clearTimeout(savingIndicatorTimerRef.current);
      setShowSavingIndicator(false);
    }

    return () => {
      if (savingIndicatorTimerRef.current) clearTimeout(savingIndicatorTimerRef.current);
    };
  }, [isSaving]);

  const clearTimers = useCallback(() => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    if (maxWaitTimerRef.current) clearTimeout(maxWaitTimerRef.current);
    debounceTimerRef.current = null;
    maxWaitTimerRef.current = null;
  }, []);

  const flush = useCallback(() => {
    clearTimers();

    if (!onSave || isReadOnly) return;
    if (!dirtyRef.current || !latestAnswerRef.current) return;
    // A save is already in flight - don't fire a second overlapping one.
    // Whatever changed since it started is still marked dirty, so the next
    // debounce/maxWait cycle (or the next flushNow/unload call) will pick
    // it up once this one finishes.
    if (savingRef.current) return;

    const payload = latestAnswerRef.current;
    dirtyRef.current = false;
    savingRef.current = true;
    setIsSaving(true);

    Promise.resolve(onSave(payload))
      .then(() => {
        setLastSavedAt(Date.now());
      })
      .catch((err: unknown) => {
        console.error('[puzzle autosave] save failed, will retry on next change', err);
        // Leave it dirty so a later change (or the max-wait timer) retries.
        // We deliberately don't retry immediately here - if the network is
        // down, hammering the endpoint isn't going to help.
        dirtyRef.current = true;
      })
      .finally(() => {
        savingRef.current = false;
        setIsSaving(false);
      });
  }, [onSave, isReadOnly, clearTimers]);

  const handleAnswerChange = useCallback(
    (answer: Record<string, unknown>) => {
      latestAnswerRef.current = answer;
      dirtyRef.current = true;

      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = setTimeout(flush, debounceMs);

      if (!maxWaitTimerRef.current) {
        maxWaitTimerRef.current = setTimeout(flush, maxWaitMs);
      }
    },
    [debounceMs, maxWaitMs, flush]
  );

  // Flush immediately when the tab is hidden or the page is unloading -
  // this is what stops a sudden interruption from losing whatever changed
  // in the last couple of seconds before the debounce timer would
  // otherwise have fired.
  useEffect(() => {
    if (isReadOnly) return;
    const saveForUnload = onSaveOnUnload ?? onSave;
    if (!saveForUnload) return;

    const flushOnUnload = () => {
      if (!dirtyRef.current || !latestAnswerRef.current) return;
      saveForUnload(latestAnswerRef.current);
      dirtyRef.current = false;
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') flushOnUnload();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pagehide', flushOnUnload);
    window.addEventListener('beforeunload', flushOnUnload);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pagehide', flushOnUnload);
      window.removeEventListener('beforeunload', flushOnUnload);
      clearTimers();
    };
  }, [onSave, onSaveOnUnload, isReadOnly, clearTimers]);

  const flushNow = useCallback(() => {
    flush();
  }, [flush]);

  return { handleAnswerChange, lastSavedAt, isSaving, showSavingIndicator, flushNow };
}