// server/utils/solanaTokenDecimals.js
//
// Mirrors the decimals field from the frontend solanaTokenConfig.ts.
// Used server-side to convert display amounts to raw on-chain units
// without importing frontend code.
//
// Keep in sync with src/chains/solana/config/solanaTokenConfig.ts

export const SOLANA_TOKEN_DECIMALS = {
  SOL:   9,
  USDG:  6,
  JUP:   6,
  BONK:  5,
  WIF:   6,
  JTO:   9,
  KMNO:  6,
  TRUMP: 6,
  MEW:   5,
  PYTH:  6,
};