// server/donations/api/donationCryptoQuoteRouter.js
//
// GET /api/donations/:clubId/crypto/quote
//
// Mirrors quizCryptoQuoteRouter.js's shape almost exactly — same TTL,
// same token list, same response shape — but resolves currency from
// the CLUB (via DonationCheckoutService's club lookup) instead of a
// quiz room's config_json.
//
// Mounted under the donations API; clubId comes from the route param
// (consistent with donationCheckoutRoutes.js / donationButtonRoutes.js
// convention), not from query/body.

import express from 'express';
import { connection, TABLE_PREFIX } from '../../config/database.js';
import { getTokenPrice } from '../../mgtsystem/services/Tokenpriceservice.js';
import { SOLANA_TOKEN_DECIMALS } from '../../utils/solanaTokenDecimals.js';

const router = express.Router();

const CLUBS_TABLE = `${TABLE_PREFIX}clubs`;

// Same TTL as the quiz quote — long enough to connect a wallet and
// confirm, short enough that price drift stays small.
const QUOTE_TTL_MS = 2 * 60 * 1000;

// Same supported token list as quiz crypto donations. Kept as a
// separate const here (not imported) deliberately — donation buttons
// and quiz rooms could diverge on which tokens they support over time,
// and importing a shared list would silently couple them.
const SUPPORTED_TOKENS = new Set([
  'SOL', 'USDG', 'JUP', 'BONK', 'WIF', 'JTO', 'KMNO', 'TRUMP', 'MEW', 'PYTH',
]);

router.post('/:clubId/crypto/quote', async (req, res) => {
  try {
    const { clubId } = req.params;
    const { token, amount } = req.body || {};

    if (!clubId || !token || !amount) {
      return res.status(400).json({
        ok: false,
        error: 'clubId, token and amount are required',
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

    const [clubRows] = await connection.execute(
      `SELECT reporting_currency FROM ${CLUBS_TABLE} WHERE id = ? LIMIT 1`,
      [clubId]
    );
    const club = clubRows?.[0];
    if (!club) {
      return res.status(404).json({ ok: false, error: 'Club not found' });
    }

    const clubCurrency = club.reporting_currency;

    const pricePerToken = await getTokenPrice(String(token), clubCurrency);
    if (!pricePerToken || pricePerToken <= 0) {
      return res.status(503).json({
        ok: false,
        error: `Price feed unavailable for ${token}/${clubCurrency}. Please try again.`,
      });
    }

    const tokenAmount = fiatAmount / pricePerToken;

    const decimals = SOLANA_TOKEN_DECIMALS[String(token)] ?? 9;
    const rawAmountBigInt = BigInt(Math.round(tokenAmount * Math.pow(10, decimals)));
    const rawAmount = rawAmountBigInt.toString();

    const quotedAt = new Date();
    const expiresAt = new Date(quotedAt.getTime() + QUOTE_TTL_MS);

    return res.status(200).json({
      ok: true,
      quote: {
        fiatAmount,
        fiatCurrency: clubCurrency,
        tokenCode: String(token),
        tokenAmount: Math.round(tokenAmount * 1e8) / 1e8,
        rawAmount,
        pricePerToken: Math.round(pricePerToken * 1e6) / 1e6,
        quotedAt: quotedAt.toISOString(),
        expiresAt: expiresAt.toISOString(),
      },
    });
  } catch (err) {
    console.error('[DonationCryptoQuote] POST /:clubId/crypto/quote error:', err);
    return res.status(500).json({
      ok: false,
      error: 'Failed to generate crypto quote',
    });
  }
});

export default router;