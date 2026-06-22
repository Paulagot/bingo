// Summer Quest — Theme Config
// Matches spec section 4. Scoped under --sq- prefix so these CSS vars
// never collide with Fundraisely's own design tokens, even though this
// lives in the same app shell.

export const SQ_THEME = {
  colours: {
    orange: '#F47A20',
    orangeDark: '#D95F0E',
    black: '#111111',
    charcoal: '#242424',
    white: '#FFFFFF',
    cream: '#FFF8F1',
    softOrange: '#FFE6D1',
    green: '#2E8B45',
    blue: '#2F80ED',
    purple: '#7C3AED',
    pink: '#EC4899',
    gold: '#F6C453',
    red: '#EF4444',
    grey: '#6B7280',
    border: '#E8D8C8',
  },
} as const;

// CSS variable block to inject once, scoped to .sq-root so it can't leak
// into / be overridden by the rest of the Fundraisely app.
export const SQ_THEME_CSS = `
.sq-root {
  --sq-orange: ${SQ_THEME.colours.orange};
  --sq-orange-dark: ${SQ_THEME.colours.orangeDark};
  --sq-black: ${SQ_THEME.colours.black};
  --sq-charcoal: ${SQ_THEME.colours.charcoal};
  --sq-white: ${SQ_THEME.colours.white};
  --sq-cream: ${SQ_THEME.colours.cream};
  --sq-soft-orange: ${SQ_THEME.colours.softOrange};
  --sq-green: ${SQ_THEME.colours.green};
  --sq-blue: ${SQ_THEME.colours.blue};
  --sq-purple: ${SQ_THEME.colours.purple};
  --sq-pink: ${SQ_THEME.colours.pink};
  --sq-gold: ${SQ_THEME.colours.gold};
  --sq-red: ${SQ_THEME.colours.red};
  --sq-grey: ${SQ_THEME.colours.grey};
  --sq-border: ${SQ_THEME.colours.border};
  background: var(--sq-cream);
  min-height: 100vh;
  width: 100%;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  font-family: 'Nunito', 'Inter', sans-serif;
}
`;
