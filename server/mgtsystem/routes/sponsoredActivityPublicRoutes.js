import express from 'express';
import rateLimit from 'express-rate-limit';
import { connection, TABLE_PREFIX } from '../../config/database.js';
import { getTokenPrice } from '../services/Tokenpriceservice.js';
import { SOLANA_TOKEN_DECIMALS } from '../../utils/solanaTokenDecimals.js';
import {
  getPublicSponsoredActivity,
  createPublicManualContribution,
  createSponsoredStripeCheckout,
  createSponsoredCryptoContribution,
  getPublicContributionStatus,
  verifyAndConfirmSponsoredCrypto,
} from '../services/sponsoredActivityPublicService.js';

const router = express.Router();
const CLUBS_TABLE = `${TABLE_PREFIX}clubs`;
const SUPPORTED_TOKENS = new Set(['SOL','USDG','USDC','JUP','BONK','WIF','JTO','KMNO','TRUMP','MEW','PYTH']);

const writeLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many attempts. Please wait a few minutes.' },
});
const cryptoConfirmLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 8,
  standardHeaders: true,
  legacyHeaders: false,
  message: { ok: false, error: 'Too many crypto confirmation attempts. Please wait a few minutes.' },
});

function fail(res, error) {
  return res.status(error?.statusCode || 500).json({
    error: error?.message || 'internal_error',
    ...(error?.currentStatus && { currentStatus: error.currentStatus }),
  });
}

router.get('/:roomId', async (req, res) => {
  try {
    const activity = await getPublicSponsoredActivity(req.params.roomId);
    if (!activity) return res.status(404).json({ error: 'not_found' });
    return res.json({ ok: true, activity });
  } catch (error) {
    console.error('[SponsoredActivityPublic] GET activity error:', error);
    return fail(res, error);
  }
});

router.post('/:roomId/manual', writeLimiter, async (req, res) => {
  try {
    const result = await createPublicManualContribution({
      roomId: req.params.roomId,
      ...req.body,
    });
    return res.status(201).json(result);
  } catch (error) {
    console.error('[SponsoredActivityPublic] manual contribution error:', error);
    return fail(res, error);
  }
});

router.post('/:roomId/stripe/checkout', writeLimiter, async (req, res) => {
  try {
    const result = await createSponsoredStripeCheckout({
      roomId: req.params.roomId,
      ...req.body,
    });
    return res.status(201).json(result);
  } catch (error) {
    console.error('[SponsoredActivityPublic] Stripe checkout error:', error);
    return fail(res, error);
  }
});

router.post('/:roomId/crypto/start', writeLimiter, async (req, res) => {
  try {
    const result = await createSponsoredCryptoContribution({
      roomId: req.params.roomId,
      ...req.body,
    });
    return res.status(201).json(result);
  } catch (error) {
    console.error('[SponsoredActivityPublic] crypto start error:', error);
    return fail(res, error);
  }
});

router.post('/:roomId/crypto/quote', writeLimiter, async (req, res) => {
  try {
    const { token, amount } = req.body || {};
    if (!SUPPORTED_TOKENS.has(String(token))) {
      return res.status(400).json({ ok: false, error: `Unsupported token: ${token}` });
    }
    const fiatAmount = Number(amount);
    if (!Number.isFinite(fiatAmount) || fiatAmount <= 0) {
      return res.status(400).json({ ok: false, error: 'amount must be a positive number' });
    }
    const activity = await getPublicSponsoredActivity(req.params.roomId);
    if (!activity) return res.status(404).json({ ok: false, error: 'not_found' });
    const pricePerToken = await getTokenPrice(String(token), activity.currency);
    if (!pricePerToken || pricePerToken <= 0) {
      return res.status(503).json({ ok: false, error: `Price feed unavailable for ${token}/${activity.currency}.` });
    }
    const tokenAmount = fiatAmount / pricePerToken;
    const decimals = SOLANA_TOKEN_DECIMALS[String(token)] ?? 9;
    const rawAmount = BigInt(Math.round(tokenAmount * Math.pow(10, decimals))).toString();
    const quotedAt = new Date();
    const expiresAt = new Date(quotedAt.getTime() + 2 * 60 * 1000);
    return res.json({
      ok: true,
      quote: {
        fiatAmount,
        fiatCurrency: activity.currency,
        tokenCode: String(token),
        tokenAmount: Math.round(tokenAmount * 1e6) / 1e6,
        rawAmount,
        pricePerToken: Math.round(pricePerToken * 1e6) / 1e6,
        quotedAt: quotedAt.toISOString(),
        expiresAt: expiresAt.toISOString(),
      },
    });
  } catch (error) {
    console.error('[SponsoredActivityPublic] crypto quote error:', error);
    return fail(res, error);
  }
});

router.post('/:roomId/crypto/confirm', cryptoConfirmLimiter, async (req, res) => {
  try {
    const result = await verifyAndConfirmSponsoredCrypto({
      roomId: req.params.roomId,
      ...req.body,
    });
    return res.status(201).json(result);
  } catch (error) {
    console.error('[SponsoredActivityPublic] crypto confirm error:', error);
    return fail(res, error);
  }
});

router.get('/:roomId/status', async (req, res) => {
  try {
    const contribution = await getPublicContributionStatus({
      roomId: req.params.roomId,
      contributionId: req.query.contributionId || null,
      externalCheckoutId: req.query.sessionId || null,
    });
    if (!contribution) return res.status(404).json({ error: 'not_found' });
    return res.json({ ok: true, ...contribution });
  } catch (error) {
    return fail(res, error);
  }
});

export default router;
