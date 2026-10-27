// src/components/puzzles/utils/formatDuration.ts

export function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);

  if (m === 0) return `${s}s`;

  return `${m}m ${s}s`;
}