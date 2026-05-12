// server/quiz/api/quizTicketCryptoFixedFeeRouter.js
//
// POST /api/quiz/tickets/crypto-fixed-fee/confirm
// Ticket fixed-fee crypto payment — verifies on-chain, creates confirmed ticket.

import express from 'express';
import rateLimit from 'express-rate-limit';

import {
  verifyAndRecordSolanaFixedFeePayment,
} from '../services/cryptoSolanaPaymentVerificationService.js';

import {
  createCryptoFixedFeeTicketWithConfirmedPayment,
} from '../../mgtsystem/services/quizTicketService.js';

const router = express.Router();

const limiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 8,
  standardHeaders: true,
  legacyHeaders: false,
  message: { ok: false, error: 'Too many crypto payment attempts. Please wait a few minutes.' },
});

router.get('/test', (_req, res) => {
  res.json({ ok: true, route: 'quiz ticket crypto fixed-fee route is registered' });
});

router.post('/confirm', limiter, async (req, res) => {
  try {
    const {
      roomId,
      purchaserName,
      purchaserEmail,
      purchaserPhone = null,
      playerName = null,
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

    if (!roomId)
      return res.status(400).json({ ok: false, error: 'roomId is required' });
    if (!purchaserName || !purchaserEmail)
      return res.status(400).json({ ok: false, error: 'purchaserName and purchaserEmail are required' });
    if (!clubPaymentMethodId)
      return res.status(400).json({ ok: false, error: 'clubPaymentMethodId is required' });
    if (!txHash || !senderWallet || !recipientWallet)
      return res.status(400).json({ ok: false, error: 'txHash, senderWallet and recipientWallet are required' });
    if (!tokenCode || !entryFeeRaw)
      return res.status(400).json({ ok: false, error: 'tokenCode and entryFeeRaw are required' });

    const tempPlayerId = `ticket_pending_${Date.now()}`;

    const verified = await verifyAndRecordSolanaFixedFeePayment({
      roomId,
      playerId:           tempPlayerId,
      playerName:         playerName || purchaserName,
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
      metadataSource: 'web2_ticket_fixed_fee_crypto',
      metadataJson: {
        purchaserName,
        purchaserEmail,
        purchaserPhone,
        playerName: playerName || purchaserName,
        selectedExtras,
      },
    });

    const ticket = await createCryptoFixedFeeTicketWithConfirmedPayment({
      roomId,
      purchaserName,
      purchaserEmail,
      purchaserPhone,
      playerName:            playerName || purchaserName,
      entryFeeFiat:          verified.entryFeeFiat,
      extrasFiat:            verified.extrasFiat,
      totalFiat:             verified.totalFiat,
      currency:              verified.fiatCurrency,
      selectedExtras,
      clubPaymentMethodId,
      paymentReference:      txHash,
      externalTransactionId: txHash,
      web3TransactionId:     verified.web3Result?.id ?? null,
      tokenCode,
      cryptoDisplayAmount,                          // ← now passed through
      entryFeeDisplay,
      extrasDisplay,
      entryFeeRaw:           String(entryFeeRaw),
      extrasRaw:             String(extrasRaw),
      network:               verified.resolvedNetwork,
      senderWallet,
      recipientWallet:       verified.savedWallet,
    });

    return res.status(201).json({
      ok:                true,
      ticket,
      ticketId:          ticket.ticketId,
      joinToken:         ticket.joinToken,
      web3TransactionId: verified.web3Result?.id ?? null,
      duplicate:         !!verified.web3Result?.duplicate,
      ledgerId:          ticket.ledgerId,
      ledgerAmount:      verified.totalFiat,
      ledgerCurrency:    verified.fiatCurrency,
      roomCurrency:      verified.roomCurrency,
      roomCurrencySymbol: verified.roomCurrencySymbol,
      txHash,
      paymentMethod: {
        id:    verified.method.id,
        label: verified.method.method_label,
      },
    });
  } catch (err) {
    console.error('[TicketCryptoFixedFee] POST /confirm error:', err);
    const status = err?.statusCode || 500;
    return res.status(status).json({
      ok:    false,
      error: err?.message || 'Failed to confirm crypto ticket payment',
    });
  }
});

export default router;



