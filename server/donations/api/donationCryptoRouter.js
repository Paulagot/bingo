// server/donations/api/donationCryptoRouter.js
//
// POST /api/donations/:clubId/crypto/confirm
//
// Mirrors quizCryptoDonationRouter.js's /confirm shape: same rate limit
// (8 req / 10 min — same abuse profile, a public unauthenticated
// endpoint anyone could hammer with fake txHashes), same "verify
// on-chain then record" structure. Delegates the actual verify+record
// work to cryptoSolanaDonationVerificationService.verifyAndRecordSolanaDonation
// rather than duplicating that logic in the route handler.
//
// clubId is taken from the route param for consistency with the rest
// of the donations API, but is NOT otherwise used in this handler —
// the donationId alone is sufficient to look up everything needed
// (see cryptoSolanaDonationVerificationService for why: the donation
// row already carries its own club_payment_method_id, validated back
// at /checkout time). clubId is accepted here purely so this route's
// URL shape matches its siblings (donationCheckoutRoutes.js,
// donationCryptoQuoteRouter.js) — a future tightening could verify
// donation.club_id === clubId as an extra defensive check if desired.

import express from 'express';
import rateLimit from 'express-rate-limit';
import { verifyAndRecordSolanaDonation } from '../services/cryptoSolanaDonationVerificationService.js';

const router = express.Router();

const limiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 8,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    ok: false,
    error: 'Too many crypto payment confirmation attempts. Please wait a few minutes.',
  },
});

router.post('/:clubId/crypto/confirm', limiter, async (req, res) => {
  try {
    const {
      donationId,
      network = 'mainnet',
      txHash,
      senderWallet,
      recipientWallet,
      tokenCode,
      tokenMint = null,
      rawAmount,
      displayAmount,
    } = req.body || {};

    const result = await verifyAndRecordSolanaDonation({
      donationId,
      network,
      txHash,
      senderWallet,
      recipientWallet,
      tokenCode,
      tokenMint,
      rawAmount,
      displayAmount,
    });

    return res.status(201).json({
      ok: true,
      donationId: result.donationId,
      txHash: result.txHash,
      network: result.resolvedNetwork,
      donationAmount: result.donationAmount,
      donationCurrency: result.donationCurrency,
      convertedDisplayFiat: result.convertedDisplayFiat,
    });
  } catch (err) {
    console.error('[DonationCrypto] POST /:clubId/crypto/confirm error:', err);
    const status = err?.statusCode || 500;
    return res.status(status).json({
      ok: false,
      error: err?.message || 'Failed to confirm crypto donation',
    });
  }
});

export default router;