// server/quiz/api/quizTicketCryptoDonationRouter.js

import express from 'express';
import rateLimit from 'express-rate-limit';

import {
  verifyAndRecordSolanaCryptoDonation,
  asNumber,
} from '../services/cryptoSolanaPaymentVerificationService.js';

import {
  createCryptoDonationTicketWithConfirmedPayment,
} from '../../mgtsystem/services/quizTicketService.js';

const router = express.Router();

const limiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 8,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    ok: false,
    error: 'Too many crypto ticket confirmation attempts. Please wait a few minutes.',
  },
});

router.get('/test', (_req, res) => {
  res.json({ ok: true, route: 'quiz ticket crypto donation route is registered' });
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
      rawAmount,
      displayAmount,
      includedDonationExtras = [],
    } = req.body || {};

    if (!roomId)
      return res.status(400).json({ ok: false, error: 'roomId is required' });
    if (!purchaserName || !purchaserEmail)
      return res.status(400).json({ ok: false, error: 'purchaserName and purchaserEmail are required' });
    if (!clubPaymentMethodId)
      return res.status(400).json({ ok: false, error: 'clubPaymentMethodId is required' });
    if (!txHash || !senderWallet || !recipientWallet)
      return res.status(400).json({ ok: false, error: 'txHash, senderWallet and recipientWallet are required' });
    if (!tokenCode || !rawAmount || Number(rawAmount) <= 0)
      return res.status(400).json({ ok: false, error: 'tokenCode and positive rawAmount are required' });

    const tempPlayerId = `ticket_pending_${Date.now()}`;

    // Verify the on-chain transaction and get the fiat amount in the room's currency.
    // verified.donationFiat = e.g. 72.40 for a USD room
    // verified.donationCurrency = e.g. 'USD'
    const verified = await verifyAndRecordSolanaCryptoDonation({
      roomId,
      playerId: tempPlayerId,
      playerName: playerName || purchaserName,
      clubPaymentMethodId,
      network,
      txHash,
      senderWallet,
      recipientWallet,
      tokenCode,
      tokenMint,
      rawAmount,
      displayAmount,
      metadataSource: 'web2_ticket_crypto_donation',
      metadataJson: {
        purchaserName,
        purchaserEmail,
        purchaserPhone,
        playerName: playerName || purchaserName,
        includedDonationExtras,
      },
    });

    const donationFiat     = asNumber(verified.donationFiat, 0);
    const donationCurrency = verified.donationCurrency ?? 'EUR';

    if (donationFiat <= 0) {
      console.warn(
        '[TicketCryptoDonation] ⚠️ Fiat conversion returned zero/null — recording ticket at 0.00',
        { roomId, txHash, tokenCode, displayAmount, donationCurrency, donationFiat }
      );
    }

    // Create the ticket row and ledger row in the room's currency
    const ticket = await createCryptoDonationTicketWithConfirmedPayment({
      roomId,
      purchaserName,
      purchaserEmail,
      purchaserPhone,
      playerName: playerName || purchaserName,

      donationFiat,
      currency: donationCurrency,

      clubPaymentMethodId,
      paymentReference:     txHash,
      externalTransactionId: txHash,
      web3TransactionId:    verified.web3Result?.id ?? null,

      tokenCode,
      cryptoAmount:    displayAmount,
      cryptoRawAmount: rawAmount,
      network:         verified.resolvedNetwork,
      senderWallet,
      recipientWallet: verified.savedWallet,

      includedDonationExtras,
    });

    return res.status(201).json({
      ok: true,
      ticket,
      ticketId:         ticket.ticketId,
      joinToken:        ticket.joinToken,
      web3TransactionId: verified.web3Result?.id ?? null,
      duplicate:        !!verified.web3Result?.duplicate,
      ledgerId:         ticket.ledgerId,
      ledgerAmount:     donationFiat,
      ledgerCurrency:   donationCurrency,
      roomCurrency:     verified.roomCurrency,
      roomCurrencySymbol: verified.roomCurrencySymbol,
      txHash,
      paymentMethod: {
        id:    verified.method.id,
        label: verified.method.method_label,
      },
    });
  } catch (err) {
    console.error('[TicketCryptoDonation] POST /confirm error:', err);
    const status = err?.statusCode || 500;
    return res.status(status).json({
      ok: false,
      error: err?.message || 'Failed to confirm crypto ticket donation',
    });
  }
});

export default router;