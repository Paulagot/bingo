//src/components/puzzles/ui/puzzleTheme.ts

import type { CSSProperties } from 'react';

export interface PuzzleBrandTheme {
  logoUrl: string | null;
  primaryColor: string;
  backgroundColor: string;
  textOnPrimaryColor: string;
}

// Matches today's hardcoded look exactly, so any club with no
// branding set renders pixel-identical to the current FundRaisely UI.
export const FUNDRAISELY_DEFAULT_THEME: PuzzleBrandTheme = {
  logoUrl: null,
  primaryColor: '#071A44',
  backgroundColor: '#FBF8F3',
  textOnPrimaryColor: '#ffffff',
};

const HEX_PATTERN = /^#[0-9a-fA-F]{6}$/;

function safeHex(value: string | null | undefined, fallback: string): string {
  return value && HEX_PATTERN.test(value) ? value : fallback;
}

// Two call sites use two different casing conventions for the same
// data: SupporterAuthService's PublicChallenge is snake_case
// (club_logo_url, matching the raw SQL column aliases), while
// publicLeaderboardService's PublicChallengeMeta is camelCase
// (clubLogoUrl, matching that service's existing convention for
// totalWeeks etc). Rather than forcing one service to adopt the
// other's casing, resolvePuzzleTheme accepts either - every field is
// optional and both spellings are checked.
interface BrandSource {
  club_logo_url?: string | null;
  club_primary_color?: string | null;
  club_background_color?: string | null;
  club_text_on_primary_color?: string | null;
  clubLogoUrl?: string | null;
  clubPrimaryColor?: string | null;
  clubBackgroundColor?: string | null;
  clubTextOnPrimaryColor?: string | null;
}

export function resolvePuzzleTheme(source?: BrandSource | null): PuzzleBrandTheme {
  if (!source) return FUNDRAISELY_DEFAULT_THEME;

  const logoUrl = source.club_logo_url ?? source.clubLogoUrl ?? null;
  const primaryColor = source.club_primary_color ?? source.clubPrimaryColor;
  const backgroundColor = source.club_background_color ?? source.clubBackgroundColor;
  const textOnPrimaryColor = source.club_text_on_primary_color ?? source.clubTextOnPrimaryColor;

  return {
    logoUrl,
    primaryColor: safeHex(primaryColor, FUNDRAISELY_DEFAULT_THEME.primaryColor),
    backgroundColor: safeHex(backgroundColor, FUNDRAISELY_DEFAULT_THEME.backgroundColor),
    textOnPrimaryColor: safeHex(textOnPrimaryColor, FUNDRAISELY_DEFAULT_THEME.textOnPrimaryColor),
  };
}

// Applied at the shell root; children reference these via
// `var(--puzzle-primary)` etc. in Tailwind arbitrary-value classes.
export function themeCssVars(theme: PuzzleBrandTheme): CSSProperties {
  return {
    '--puzzle-primary': theme.primaryColor,
    '--puzzle-bg-accent': theme.backgroundColor,
    '--puzzle-text-on-primary': theme.textOnPrimaryColor,
  } as CSSProperties;
}