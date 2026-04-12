import { useEffect, useRef } from 'react';

/**
 * Auto-submits when the round timer expires.
 * Also returns whether the button should be "flashing" (last 5 seconds).
 */
export const useAutoSubmit = (
  hasSubmitted: boolean,
  endsAt: number | null,
  onAutoSubmit: () => void,
): { isFlashing: boolean } => {
  const firedRef = useRef(false);

  useEffect(() => {
    firedRef.current = false;
  }, [endsAt]);

  useEffect(() => {
    if (hasSubmitted || !endsAt || firedRef.current) return;

    const msLeft = endsAt - Date.now();
    if (msLeft <= 0) {
      firedRef.current = true;
      onAutoSubmit();
      return;
    }

    // Fire 2000ms before endsAt — gives manual early submitters a meaningful
    // speed bonus window. Server has 1.5s grace period on top of this.
    const EARLY_MS = 2000;
    const t = setTimeout(() => {
      if (!firedRef.current && !hasSubmitted) {
        firedRef.current = true;
        onAutoSubmit();
      }
    }, Math.max(0, msLeft - EARLY_MS));

    return () => clearTimeout(t);
  }, [hasSubmitted, endsAt, onAutoSubmit]);

  const msLeft = endsAt ? endsAt - Date.now() : Infinity;
  const isFlashing = !hasSubmitted && msLeft < 5000;

  return { isFlashing };
};