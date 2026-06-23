// src/components/mgtsystem/config/solanaTokenDecimals.ts
//
// Frontend mirror of server/utils/solanaTokenDecimals.js — kept as a
// plain constant (not fetched) since decimals are fixed per token and
// changing them is a deploy, not a runtime event. If a
// solanaTokenConfig.ts with decimals already exists elsewhere in the
// frontend, prefer importing from there instead of this file to avoid
// two sources of truth — this file exists only as a safe default if
// that import isn't convenient from this folder.

export const SOLANA_TOKEN_DECIMALS = {
  SOL: 9,
  USDG: 6,
  JUP: 6,
  BONK: 5,
  WIF: 6,
  JTO: 9,
  KMNO: 6,
  TRUMP: 6,
  MEW: 5,
  PYTH: 6,
} as const;