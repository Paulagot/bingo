// server/quiz/api/quizCryptoFixedFeeRouter.js
//
// POST /api/quiz/crypto-fixed-fee/confirm
// Walk-in fixed-fee crypto payment — verifies on-chain, writes ledger, player joins immediately.

import express from 'express';
import rateLimit from 'express-rate-limit';

import { createExpectedPayment } from '../../mgtsystem/services/quizPaymentLedgerService.js';
import {
  verifyAndRecordSolanaFixedFeePayment,
} from '../services/cryptoSolanaPaymentVerificationService.js';

const router = express.Router();

const limiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 8,
  standardHeaders: true,
  legacyHeaders: false,
  message: { ok: false, error: 'Too many crypto payment attempts. Please wait a few minutes.' },
});

router.get('/test', (_req, res) => {
  res.json({ ok: true, route: 'quiz crypto fixed-fee route is registered' });
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
      entryFeeRaw,
      extrasRaw = '0',
      entryFeeDisplay,
      extrasDisplay = 0,
      cryptoDisplayAmount = null,
      selectedExtras = [],
    } = req.body || {};

    if (!roomId || !playerId || !playerName)
      return res.status(400).json({ ok: false, error: 'roomId, playerId and playerName are required' });
    if (!clubPaymentMethodId)
      return res.status(400).json({ ok: false, error: 'clubPaymentMethodId is required' });
    if (!txHash || !senderWallet || !recipientWallet)
      return res.status(400).json({ ok: false, error: 'txHash, senderWallet and recipientWallet are required' });
    if (!tokenCode || !entryFeeRaw)
      return res.status(400).json({ ok: false, error: 'tokenCode and entryFeeRaw are required' });

    const verified = await verifyAndRecordSolanaFixedFeePayment({
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
      entryFeeRaw,
      extrasRaw,
      entryFeeDisplay,
      extrasDisplay,
      cryptoDisplayAmount,
      metadataSource: 'web2_walkin_fixed_fee_crypto',
      metadataJson: { selectedExtras },
    });

    const now = new Date();

    // Write entry fee ledger row
    const entryLedgerId = await createExpectedPayment({
      roomId,
      clubId:                verified.room.club_id,
      playerId,
      playerName,
      ledgerType:            'entry_fee',
      amount:                verified.entryFeeFiat,
      currency:              verified.fiatCurrency,
      paymentMethod:         'crypto',
      paymentSource:         'onchain_auto',
      clubPaymentMethodId,
      paymentReference:      txHash,
      externalTransactionId: txHash,
      claimedAt:             now,
      confirmedAt:           now,
      confirmedBy:           'system',
      confirmedByName:       'System',
      confirmedByRole:       'system',
      status:                'confirmed',
      ticketId:              null,
      extraMetadata: {
        autoConfirmed:     true,
        fundraisingMode:   'fixed_fee',
        source:            'crypto',
        chain:             'solana',
        network:           verified.resolvedNetwork,
        token:             tokenCode,
        cryptoAmount:      String(cryptoDisplayAmount || ''),
        cryptoRawAmount:   String(entryFeeRaw),
        web3TransactionId: verified.web3Result?.id ?? null,
        selectedExtras,
      },
    });

    // Write one ledger row per extra
    const extrasLedgerIds = [];
    if (Array.isArray(selectedExtras) && selectedExtras.length > 0 && verified.extrasFiat > 0) {
      const perExtraFiat = verified.extrasFiat / selectedExtras.length;

      for (const extraId of selectedExtras) {
        const lid = await createExpectedPayment({
          roomId,
          clubId:                verified.room.club_id,
          playerId,
          playerName,
          ledgerType:            'extra_purchase',
          amount:                Math.round(perExtraFiat * 100) / 100,
          currency:              verified.fiatCurrency,
          paymentMethod:         'crypto',
          paymentSource:         'onchain_auto',
          clubPaymentMethodId,
          paymentReference:      txHash,
          externalTransactionId: txHash,
          claimedAt:             now,
          confirmedAt:           now,
          confirmedBy:           'system',
          confirmedByName:       'System',
          confirmedByRole:       'system',
          status:                'confirmed',
          extraId,
          ticketId:              null,
          extraMetadata: {
            autoConfirmed:     true,
            source:            'crypto',
            token:             tokenCode,
            cryptoAmount:      String(cryptoDisplayAmount || ''),
            web3TransactionId: verified.web3Result?.id ?? null,
          },
        });
        extrasLedgerIds.push(lid);
      }
    }

    return res.status(201).json({
      ok:                true,
      web3TransactionId: verified.web3Result?.id,
      duplicate:         !!verified.web3Result?.duplicate,
      entryLedgerId,
      extrasLedgerIds,
      ledgerAmount:      verified.totalFiat,
      ledgerCurrency:    verified.fiatCurrency,
      entryFeeFiat:      verified.entryFeeFiat,
      extrasFiat:        verified.extrasFiat,
      roomCurrency:      verified.roomCurrency,
      roomCurrencySymbol: verified.roomCurrencySymbol,
      txHash,
      paymentMethod: {
        id:    verified.method.id,
        label: verified.method.method_label,
      },
    });
  } catch (err) {
    console.error('[CryptoFixedFee] POST /confirm error:', err);
    const status = err?.statusCode || 500;
    return res.status(status).json({
      ok:    false,
      error: err?.message || 'Failed to confirm crypto payment',
    });
  }
});

export default router;