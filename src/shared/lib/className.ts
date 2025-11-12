// src/shared/lib/className.ts
// Utility for combining class names

/**
 * Combines class names, filtering out falsy values
 */
export function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ');
}

