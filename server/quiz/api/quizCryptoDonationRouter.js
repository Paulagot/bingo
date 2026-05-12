// server/quiz/api/quizCryptoDonationRouter.js

import express from 'express';
import rateLimit from 'express-rate-limit';

import { createExpectedPayment } from '../../mgtsystem/services/quizPaymentLedgerService.js';
import {
  verifyAndRecordSolanaCryptoDonation,
  asNumber,
} from '../services/cryptoSolanaPaymentVerificationService.js';

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

router.get('/test', (_req, res) => {
  res.json({ ok: true, route: 'quiz crypto donation route is registered' });
});

router.post('/confirm', limiter, async (req, res) => {
  try {
    const {
      roomId,
      playerId,
      playerName,
      clubPaymentMethodId,
      network = 'mainnet',
      txHash,
      senderWallet,
      recipientWallet,
      tokenCode,
      tokenMint = null,
      rawAmount,
      displayAmount,
      includedDonationExtras = [],
    } = req.body || {};

    // Verify on-chain and convert to the room's fiat currency.
    // verified.donationFiat     = converted amount e.g. 72.40
    // verified.donationCurrency = room's ISO code  e.g. 'USD'
    const verified = await verifyAndRecordSolanaCryptoDonation({
      roomId,
      playerId,
      playerName,
      clubPaymentMethodId,
      network,
      txHash,
      senderWallet,
      recipientWallet,
      tokenCode,
      tokenMint,
      rawAmount,
      displayAmount,
      metadataSource: 'web2_walkin_crypto_donation',
      metadataJson: { includedDonationExtras },
    });

    const donationFiat     = asNumber(verified.donationFiat, 0);
    const donationCurrency = verified.donationCurrency ?? 'EUR';

    const now = new Date();

    if (donationFiat <= 0) {
      console.warn(
        '[CryptoDonation] ⚠️ Fiat conversion returned zero/null — recording ledger as 0.00',
        { roomId, playerId, txHash, tokenCode, displayAmount, donationCurrency, donationFiat }
      );
    }

    const ledgerId = await createExpectedPayment({
      roomId,
      clubId:   verified.room.club_id,
      playerId,
      playerName,
      ledgerType: 'entry_fee',

      amount:   donationFiat,      // in room's currency
      currency: donationCurrency,  // e.g. 'USD', 'GBP', 'EUR'

      paymentMethod:  'crypto',
      paymentSource:  'onchain_auto',
      clubPaymentMethodId,
      paymentReference:      txHash,
      externalTransactionId: txHash,

      claimedAt:       now,
      confirmedAt:     now,
      confirmedBy:     'system',
      confirmedByName: 'System',
      confirmedByRole: 'system',
      status:          'confirmed',

      ticketId: null,

      extraMetadata: {
        autoConfirmed:    true,
        fundraisingMode:  'donation',
        donationAmount:   donationFiat,
        donationCurrency,
        source:           'crypto',
        chain:            'solana',
        network:          verified.resolvedNetwork,
        token:            tokenCode,
        cryptoAmount:     String(displayAmount || ''),
        cryptoRawAmount:  String(rawAmount || ''),
        web3TransactionId: verified.web3Result?.id ?? null,
        includedDonationExtras,
      },
    });

    return res.status(201).json({
      ok: true,
      ledgerId,
      web3TransactionId: verified.web3Result?.id,
      duplicate:         !!verified.web3Result?.duplicate,
      ledgerAmount:      donationFiat,
      ledgerCurrency:    donationCurrency,
      roomCurrency:      verified.roomCurrency,
      roomCurrencySymbol: verified.roomCurrencySymbol,
      txHash,
      paymentMethod: {
        id:    verified.method.id,
        label: verified.method.method_label,
      },
    });
  } catch (err) {
    console.error('[CryptoDonation] POST /confirm error:', err);
    const status = err?.statusCode || 500;
    return res.status(status).json({
      ok: false,
      error: err?.message || 'Failed to confirm crypto donation',
    });
  }
});

export default router;