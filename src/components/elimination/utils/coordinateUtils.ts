/**
 * Convert a normalised point (0–1) to SVG/canvas percentage string.
 */
export const normToPct = (n: number): string => `${(n * 100).toFixed(3)}%`;

/**
 * Euclidean distance between two normalised points.
 */
export const normDistance = (
  x1: number, y1: number,
  x2: number, y2: number,
): number => Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);

/**
 * Linear interpolation between two values.
 */
export const lerp = (a: number, b: number, t: number): number =>
  a + (b - a) * Math.min(1, Math.max(0, t));

/**
 * Compute bar marker position with bouncing passes.
 * Matches the server-side scoreSubmission logic exactly.
 *
 * @param speedWidthsPerSec - bar widths per second
 * @param roundStartTimestamp - epoch ms when round went active
 * @param durationMs - total round duration
 * @param nowMs - current time in epoch ms
 */
export const computeBarPosition = (
  speedWidthsPerSec: number,
  roundStartTimestamp: number,
  durationMs: number,
  nowMs: number,
): number => {
  const elapsed = Math.min(durationMs, Math.max(0, nowMs - roundStartTimestamp));
  const elapsedSec = elapsed / 1000;

  const totalDistance = elapsedSec * speedWidthsPerSec;
  const passIndex = Math.floor(totalDistance);
  const progressInPass = totalDistance - passIndex;

  // Odd passes reverse direction
  const isReverse = passIndex % 2 === 1;
  return isReverse ? 1 - progressInPass : progressInPass;
};