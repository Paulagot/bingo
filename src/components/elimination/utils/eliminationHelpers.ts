/**
 * Convert a normalised coordinate (0–1) to a pixel position within a container.
 */
export const normToPixel = (norm: number, containerSize: number): number =>
  norm * containerSize;

/**
 * Convert a pixel tap position to normalised coordinates (0–1).
 */
export const pixelToNorm = (
  pixelX: number,
  pixelY: number,
  containerWidth: number,
  containerHeight: number,
): { x: number; y: number } => ({
  x: Math.min(1, Math.max(0, pixelX / containerWidth)),
  y: Math.min(1, Math.max(0, pixelY / containerHeight)),
});

/**
 * Get tap position from a pointer/touch event relative to a container element.
 */
export const getTapPosition = (
  event: React.PointerEvent | React.TouchEvent,
  container: HTMLElement,
): { pixelX: number; pixelY: number; normX: number; normY: number } => {
  const rect = container.getBoundingClientRect();

  let clientX: number;
  let clientY: number;

  if ('touches' in event) {
    clientX = event.touches[0]?.clientX ?? event.changedTouches[0]?.clientX ?? 0;
    clientY = event.touches[0]?.clientY ?? event.changedTouches[0]?.clientY ?? 0;
  } else {
    clientX = event.clientX;
    clientY = event.clientY;
  }

  const pixelX = clientX - rect.left;
  const pixelY = clientY - rect.top;

  return {
    pixelX,
    pixelY,
    normX: Math.min(1, Math.max(0, pixelX / rect.width)),
    normY: Math.min(1, Math.max(0, pixelY / rect.height)),
  };
};

/**
 * Format a score for display.
 */
export const formatScore = (score: number | null | undefined): string =>
  (score ?? 0).toLocaleString();

/**
 * Format an error distance as a percentage-style precision string.
 */
export const formatError = (errorDistance: number | null): string => {
  if (errorDistance === null) return '—';
  const pct = (errorDistance * 100).toFixed(1);
  return `${pct}%`;
};

/**
 * Format milliseconds remaining as MM:SS or just seconds.
 */
export const formatTimeMs = (ms: number): string => {
  const s = Math.max(0, Math.ceil(ms / 1000));
  if (s >= 60) {
    const m = Math.floor(s / 60);
    const rem = s % 60;
    return `${m}:${rem.toString().padStart(2, '0')}`;
  }
  return `${s}`;
};

/**
 * Ordinal suffix for a rank number (1st, 2nd, 3rd, etc.)
 */
export const ordinal = (n: number): string => {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  const suffix = s[(v - 20) % 10] ?? s[v] ?? s[0] ?? 'th';
  return `${n}${suffix}`;
};

/**
 * Human-readable round type label.
 */
export const roundTypeLabel = (type: string): string => {
  const labels: Record<string, string> = {
    true_centre: 'True Centre',
    midpoint_split: 'Midpoint Split',
    stop_the_bar: 'Stop the Bar',
  };
  return labels[type] ?? type;
};