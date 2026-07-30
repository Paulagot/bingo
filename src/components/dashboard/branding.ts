// src/components/dashboard/branding.ts
//
// Single source of truth for the Fundraisely admin-dashboard palette.
// These are the exact colours the events dashboard already uses inline;
// pulling them into one named object means the peer dashboard (and every
// future dashboard) reuse identical tokens instead of re-typing hex codes,
// and a future rebrand becomes a one-file change.
//
// `as const` freezes every value to its literal string type (e.g. the type
// of `brand.teal` is '#157f85', not just `string`). That's exactly what you
// want for design tokens - it stops a typo elsewhere from silently passing.

export const brand = {
  bg:         '#f6f1e8', // page background (cream)
  surface:    '#ffffff', // cards, panels
  teal:       '#157f85', // primary action
  tealDark:   '#0e6268', // primary hover
  navy:       '#102532', // headings
  slate:      '#52636f', // body / muted text
  border:     '#dce1df', // card + panel borders
  borderSoft: '#f1f0ee', // dividers
  tan:        'rgba(210,181,130,0.2)',  // soft accent fill (buttons)
  tanStrong:  'rgba(210,181,130,0.35)', // accent fill hover
  danger:     '#b42318', // logout / destructive text
  dangerBorder: '#f2c5c2',
  dangerHover:  '#fff4f3',
} as const;

export type Brand = typeof brand;