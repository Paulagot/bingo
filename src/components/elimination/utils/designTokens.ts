// ─── Base colours ─────────────────────────────────────────────────────────────
export const BASE_BG = '#0a0b0f';           // near-black with warmth
export const SURFACE = 'rgba(255,255,255,0.04)';
export const BORDER = 'rgba(255,255,255,0.08)';
export const TEXT_PRIMARY = '#ffffff';
export const TEXT_SECONDARY = 'rgba(255,255,255,0.55)';
export const TEXT_DIM = 'rgba(255,255,255,0.28)';
export const DANGER = '#ff3b5c';
export const GOLD = '#ffd700';

// ─── Fonts ────────────────────────────────────────────────────────────────────
export const FONT_DISPLAY = "'Bebas Neue', 'Impact', sans-serif";
export const FONT_BODY = "'Inter', system-ui, sans-serif";

// ─── Per-round colour palette ─────────────────────────────────────────────────
// Each round gets a full colour identity. The entire UI tints to match.
export interface RoundColour {
  primary: string;      // main accent — shapes, highlights
  glow: string;         // used in box shadows and filter glows
  tint: string;         // very subtle background tint (5–8% opacity)
  fill: string;         // shape fill (10–15% opacity)
  label: string;        // what to call this colour round
}

export const ROUND_COLOURS: RoundColour[] = [
  { primary: '#00e5ff', glow: '#00e5ff', tint: 'rgba(0,229,255,0.05)',    fill: 'rgba(0,229,255,0.10)',    label: 'Cyan' },
  { primary: '#ff3f81', glow: '#ff3f81', tint: 'rgba(255,63,129,0.05)',   fill: 'rgba(255,63,129,0.10)',   label: 'Pink' },
  { primary: '#ffd60a', glow: '#ffd60a', tint: 'rgba(255,214,10,0.05)',   fill: 'rgba(255,214,10,0.09)',   label: 'Amber' },
  { primary: '#30d158', glow: '#30d158', tint: 'rgba(48,209,88,0.05)',    fill: 'rgba(48,209,88,0.09)',    label: 'Green' },
  { primary: '#bf5af2', glow: '#bf5af2', tint: 'rgba(191,90,242,0.05)',   fill: 'rgba(191,90,242,0.10)',   label: 'Purple' },
  { primary: '#ff9f0a', glow: '#ff9f0a', tint: 'rgba(255,159,10,0.05)',   fill: 'rgba(255,159,10,0.09)',   label: 'Orange' },
  { primary: '#64d2ff', glow: '#64d2ff', tint: 'rgba(100,210,255,0.05)',  fill: 'rgba(100,210,255,0.10)',  label: 'Blue' },
  { primary: '#ff6961', glow: '#ff6961', tint: 'rgba(255,105,97,0.05)',   fill: 'rgba(255,105,97,0.10)',   label: 'Red' },
];

/**
 * Get the colour identity for a round number (1-indexed).
 * Falls back gracefully for rounds > palette length.
 */
export const getRoundColour = (roundNumber: number): RoundColour =>
  ROUND_COLOURS[(roundNumber - 1) % ROUND_COLOURS.length]!;

/**
 * Derive round colour from a round ID string (for components that only have roundId).
 */
export const getColourFromId = (roundId: string): RoundColour => {
  let h = 0;
  for (let i = 0; i < roundId.length; i++) h = (h * 31 + roundId.charCodeAt(i)) >>> 0;
  return ROUND_COLOURS[h % ROUND_COLOURS.length]!;
};