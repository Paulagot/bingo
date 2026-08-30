// server/peerFundraising/api/peerCryptoDonationRoutes.js
//
// POST /api/peer-support/:fundraiserId/donations/crypto-checkout
//   Creates a pending donation row and returns the club's Solana wallet address.
//   Called before the wallet sends anything on-chain.
//
// POST /api/peer-support/donations/:donationId/crypto-confirm
//   Verifies the on-chain transaction and confirms the donation.
//   Uses verifyAndRecordSolanaDonation (shared with the standard donation
//   button crypto path) then confirmPublicPeerCryptoDonation.
//
// Both endpoints must be mounted BEFORE the /:clubSlug/:fundraiserSlug
// wildcard routes in peerRoutes.js, otherwise Express matches those first.
//
// Mount in server/index.js public block (before auth middleware), alongside
// the existing peer crypto routes:
//   import peerCryptoDonationRoutes from './peerFundraising/api/peerCryptoDonationRoutes.js';
//   app.use('/api', peerCryptoDonationRoutes);  // before app.use('/api', peerRoutes)

import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { verifyAndRecordSolanaDonation } from '../../donations/services/cryptoSolanaDonationVerificationService.js';
import {
  createPublicPeerCryptoDonation,
  confirmPublicPeerCryptoDonation,
} from '../services/peerDonationService.js';

const router = Router();

const limiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    ok: false,
    error: 'Too many crypto donation attempts. Please wait a few minutes.',
  },
});

// ─── Create pending crypto donation ──────────────────────────────────────────
//
// Body:
//   { clubPaymentMethodId, donorName, donorEmail, amount, participantId? }
//
// Returns:
//   { donationId, walletAddress, amount, currency }

router.post(
  '/peer-support/:fundraiserId/donations/crypto-checkout',
  limiter,
  async (req, res) => {
    try {
      const { fundraiserId } = req.params;
      const {
        clubPaymentMethodId,
        donorName,
        donorEmail,
        amount,
        participantId = null,
      } = req.body ?? {};

      if (!clubPaymentMethodId) {
        return res.status(400).json({ ok: false, error: 'clubPaymentMethodId is required' });
      }

      const result = await createPublicPeerCryptoDonation({
        fundraiserId,
        participantId,
        clubPaymentMethodId,
        donorName,
        donorEmail,
        amount,
      });

      return res.status(201).json({ ok: true, ...result });
    } catch (err) {
      console.error('[PeerCryptoDonation] POST crypto-checkout error:', err);
      return res.status(err?.status || err?.statusCode || 500).json({
        ok: false,
        error: err?.message || 'Could not create crypto donation',
      });
    }
  },
);

// ─── Confirm crypto donation after on-chain payment ───────────────────────────
//
// Body (sent by SponsoredCryptoPaymentStep / custom confirm handler):
//   { network, txHash, senderWallet, recipientWallet,
//     tokenCode, tokenMint?, rawAmount, displayAmount }
//
// Flow:
//   1. verifyAndRecordSolanaDonation - on-chain check (reused from standard
//      donation button crypto path, no changes needed there)
//   2. confirmPublicPeerCryptoDonation - calls confirmPeerDonationAutomatic,
//      same function the Stripe webhook calls

router.post(
  '/peer-support/donations/:donationId/crypto-confirm',
  limiter,
  async (req, res) => {
    try {
      const { donationId } = req.params;
      const {
        network = 'mainnet',
        txHash,
        senderWallet,
        recipientWallet,
        tokenCode,
        tokenMint = null,
        // CryptoFixedFeeStep sends entryFeeRaw + extrasRaw, not rawAmount.
        // Sum them to get the total raw amount for on-chain verification.
        entryFeeRaw,
        extrasRaw = '0',
        cryptoDisplayAmount,
      } = req.body ?? {};

      const rawAmount = (
        BigInt(String(entryFeeRaw || '0')) + BigInt(String(extrasRaw || '0'))
      ).toString();
      const displayAmount = cryptoDisplayAmount;

      if (!txHash || !senderWallet || !recipientWallet) {
        return res.status(400).json({
          ok: false,
          error: 'txHash, senderWallet and recipientWallet are required',
        });
      }

      // 1. Verify on-chain - reuses the same service as the standard
      // donation button crypto path. verifyAndRecordSolanaDonation loads
      // the donation by donationId, checks it's pending + crypto,
      // looks up the club wallet, verifies the tx, and calls confirmDonation.
      const verification = await verifyAndRecordSolanaDonation({
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

      // 2. Also call confirmPeerDonationAutomatic so peer-specific fields
      // (peer_fundraiser_id etc.) are reflected in any peer reporting.
      // confirmPeerDonationAutomatic uses a COALESCE update so it won't
      // overwrite the txHash already written by verifyAndRecordSolanaDonation.
      await confirmPublicPeerCryptoDonation({
        donationId,
        txHash,
      });

      console.log(
        `[PeerCryptoDonation] ✅ Donation ${donationId} confirmed via txHash ${txHash.slice(0, 16)}...`,
      );

      return res.json({
        ok:               true,
        donationId,
        txHash,
        donationAmount:   verification.donationAmount,
        donationCurrency: verification.donationCurrency,
        // ledgerAmount / ledgerCurrency match what SponsoredCryptoPaymentStep
        // expects to show "Recorded as €X.XX"
        ledgerAmount:     verification.donationAmount,
        ledgerCurrency:   verification.donationCurrency,
      });
    } catch (err) {
      console.error('[PeerCryptoDonation] POST crypto-confirm error:', err);
      return res.status(err?.status || err?.statusCode || 500).json({
        ok: false,
        error: err?.message || 'Could not confirm crypto donation',
      });
    }
  },
);

export default router;