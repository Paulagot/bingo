// server/quiz/api/quizCryptoQuoteRouter.js
//
// GET /api/quiz/crypto-quote
// Returns a one-time fiat → token quote for a fixed-fee crypto payment.
//
// Query params:
//   roomId   — required
//   token    — SolanaTokenCode e.g. 'SOL'
//   amount   — fiat total in room currency e.g. '5.00'
//
// Response:
//   {
//     ok: true,
//     quote: {
//       fiatAmount:    5.00,
//       fiatCurrency:  'USD',
//       tokenCode:     'SOL',
//       tokenAmount:   0.03378,       // display units
//       rawAmount:     '33780000',    // raw on-chain units (string to avoid JS BigInt issues)
//       pricePerToken: 148.02,        // fiat per 1 token at quote time
//       expiresAt:     '2026-05-08T17:32:00.000Z',
//       quotedAt:      '2026-05-08T17:30:00.000Z',
//     }
//   }

import express from 'express';
import { getTokenPrice } from '../../mgtsystem/services/Tokenpriceservice.js';
import { getRoomCurrencyCode } from '../../utils/currencyUtils.js';
import { getRoomForCryptoPayment, parseJsonMaybe } from '../services/cryptoSolanaPaymentVerificationService.js';
import { SOLANA_TOKEN_DECIMALS } from '../../utils/solanaTokenDecimals.js';

const router = express.Router();

// Quote is valid for 2 minutes — enough time for the player to confirm in wallet
const QUOTE_TTL_MS = 2 * 60 * 1000;

// Accepted token codes — must match solanaTokenConfig on frontend
const SUPPORTED_TOKENS = new Set([
  'SOL', 'USDG', 'JUP', 'BONK', 'WIF', 'JTO', 'KMNO', 'TRUMP', 'MEW', 'PYTH',
]);

router.get('/', async (req, res) => {
  try {
    const { roomId, token, amount } = req.query;

    if (!roomId || !token || !amount) {
      return res.status(400).json({
        ok: false,
        error: 'roomId, token and amount are required',
      });
    }

    if (!SUPPORTED_TOKENS.has(String(token))) {
      return res.status(400).json({
        ok: false,
        error: `Unsupported token: ${token}`,
      });
    }

    const fiatAmount = Number(amount);
    if (!Number.isFinite(fiatAmount) || fiatAmount <= 0) {
      return res.status(400).json({
        ok: false,
        error: 'amount must be a positive number',
      });
    }

    // Load room to get currency
    const room = await getRoomForCryptoPayment(String(roomId));
    if (!room) {
      return res.status(404).json({ ok: false, error: 'Room not found' });
    }

    const config = parseJsonMaybe(room.config_json, {});
    const roomCurrency = getRoomCurrencyCode(config);

    // Get live price for this token in the room's currency
    const pricePerToken = await getTokenPrice(String(token), roomCurrency);

    if (!pricePerToken || pricePerToken <= 0) {
      return res.status(503).json({
        ok: false,
        error: `Price feed unavailable for ${token}/${roomCurrency}. Please try again.`,
      });
    }

    // fiatAmount / pricePerToken = token display amount
    const tokenAmount = fiatAmount / pricePerToken;

    // Convert to raw on-chain units
    const decimals = SOLANA_TOKEN_DECIMALS[String(token)] ?? 9;
    const rawAmountBigInt = BigInt(Math.round(tokenAmount * Math.pow(10, decimals)));
    const rawAmount = rawAmountBigInt.toString();

    const quotedAt = new Date();
    const expiresAt = new Date(quotedAt.getTime() + QUOTE_TTL_MS);

    return res.status(200).json({
      ok: true,
      quote: {
        fiatAmount,
        fiatCurrency:  roomCurrency,
        tokenCode:     String(token),
        tokenAmount:   Math.round(tokenAmount * 1e8) / 1e8,  // 8dp max
        rawAmount,
        pricePerToken: Math.round(pricePerToken * 1e6) / 1e6,
        quotedAt:      quotedAt.toISOString(),
        expiresAt:     expiresAt.toISOString(),
      },
    });
  } catch (err) {
    console.error('[CryptoQuote] GET / error:', err);
    return res.status(500).json({
      ok: false,
      error: 'Failed to generate crypto quote',
    });
  }
});

export default router;