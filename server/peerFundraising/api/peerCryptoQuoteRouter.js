// server/peerFundraising/api/peerCryptoQuoteRouter.js
//
// GET /api/peer-support/fundraiser/:fundraiserId/crypto-quote
//
// Peer-level equivalent of /api/quiz/crypto-quote.
// Uses the fundraiser's currency instead of a room's config_json, so it works
// for any pack structure - including multi-room bundles and donation-only packs
// that have no single anchor room.
//
// Query params:
//   token  - SolanaTokenCode e.g. 'SOL'
//   amount - fiat total in fundraiser currency e.g. '16.00'
//
// Response: identical shape to /api/quiz/crypto-quote so useCryptoQuote on the
// frontend works without modification - it only needs to hit a different URL.
//
// Mount in the public block in server/index.js:
//   import peerCryptoQuoteRouter from './peer/api/peerCryptoQuoteRouter.js';
//   app.use('/api', peerCryptoQuoteRouter);

import express from 'express';
import { getTokenPrice } from '../../mgtsystem/services/Tokenpriceservice.js';
import { SOLANA_TOKEN_DECIMALS } from '../../utils/solanaTokenDecimals.js';
import { connection, TABLE_PREFIX } from '../../config/database.js';

const router = express.Router();

const QUOTE_TTL_MS = 2 * 60 * 1000;

const SUPPORTED_TOKENS = new Set([
  'SOL', 'USDG', 'JUP', 'BONK', 'WIF', 'JTO', 'KMNO', 'TRUMP', 'MEW', 'PYTH',
]);

const T_FUNDRAISERS = `${TABLE_PREFIX}peer_fundraisers`;

router.get(
  '/peer-support/fundraiser/:fundraiserId/crypto-quote',
  async (req, res) => {
    try {
      const { fundraiserId } = req.params;
      const { token, amount } = req.query;

      if (!token || !amount) {
        return res.status(400).json({
          ok: false,
          error: 'token and amount are required',
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

      // Load fundraiser for its currency - no room needed
      const [rows] = await connection.execute(
        `SELECT id, currency FROM ${T_FUNDRAISERS} WHERE id = ? LIMIT 1`,
        [fundraiserId],
      );
      const fundraiser = rows[0];

      if (!fundraiser) {
        return res.status(404).json({ ok: false, error: 'peer_fundraiser_not_found' });
      }

      const fiatCurrency = fundraiser.currency || 'EUR';

      const pricePerToken = await getTokenPrice(String(token), fiatCurrency);

      if (!pricePerToken || pricePerToken <= 0) {
        return res.status(503).json({
          ok: false,
          error: `Price feed unavailable for ${token}/${fiatCurrency}. Please try again.`,
        });
      }

      const tokenAmount = fiatAmount / pricePerToken;
      const decimals = SOLANA_TOKEN_DECIMALS[String(token)] ?? 9;
      const rawAmountBigInt = BigInt(Math.round(tokenAmount * Math.pow(10, decimals)));
      const rawAmount = rawAmountBigInt.toString();

      const quotedAt = new Date();
      const expiresAt = new Date(quotedAt.getTime() + QUOTE_TTL_MS);

      return res.json({
        ok: true,
        quote: {
          fiatAmount,
          fiatCurrency,
          tokenCode:     String(token),
          tokenAmount:   Math.round(tokenAmount * 1e8) / 1e8,
          rawAmount,
          pricePerToken: Math.round(pricePerToken * 1e6) / 1e6,
          quotedAt:      quotedAt.toISOString(),
          expiresAt:     expiresAt.toISOString(),
        },
      });

    } catch (err) {
      console.error('[PeerCryptoQuote] GET error:', err);
      return res.status(500).json({
        ok: false,
        error: 'Failed to generate crypto quote',
      });
    }
  },
);

export default router;