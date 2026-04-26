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
  res.json({
    ok: true,
    route: 'quiz ticket crypto donation route is registered',
  });
});

/**
 * POST /api/quiz/tickets/crypto-donation/confirm
 *
 * Verifies a Solana crypto donation transaction, records the web3 transaction,
 * creates a confirmed/ready ticket, and creates a confirmed quiz ledger row.
 *
 * This is for donation-only ticket purchases.
 */
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

    if (!roomId) {
      return res.status(400).json({
        ok: false,
        error: 'roomId is required',
      });
    }

    if (!purchaserName || !purchaserEmail) {
      return res.status(400).json({
        ok: false,
        error: 'purchaserName and purchaserEmail are required',
      });
    }

    if (!clubPaymentMethodId) {
      return res.status(400).json({
        ok: false,
        error: 'clubPaymentMethodId is required',
      });
    }

    if (!txHash || !senderWallet || !recipientWallet) {
      return res.status(400).json({
        ok: false,
        error: 'txHash, senderWallet and recipientWallet are required',
      });
    }

    if (!tokenCode || !rawAmount || Number(rawAmount) <= 0) {
      return res.status(400).json({
        ok: false,
        error: 'tokenCode and positive rawAmount are required',
      });
    }

    const tempPlayerId = `ticket_pending_${Date.now()}`;

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

    const donationEur = asNumber(verified.web3Result?.donationEur, 0);

    if (donationEur <= 0) {
      console.warn(
        '[TicketCryptoDonation] ⚠️ Crypto ticket donation converted to less than €0.01; recording ticket/ledger as €0.00',
        {
          roomId,
          txHash,
          tokenCode,
          displayAmount,
          rawAmount,
          web3TransactionId: verified.web3Result?.id,
          donationEur,
        }
      );
    }

    const ticket = await createCryptoDonationTicketWithConfirmedPayment({
      roomId,

      purchaserName,
      purchaserEmail,
      purchaserPhone,
      playerName: playerName || purchaserName,

      amountEur: donationEur,
      currency: 'EUR',

      clubPaymentMethodId,
      paymentReference: txHash,
      externalTransactionId: txHash,
      web3TransactionId: verified.web3Result?.id ?? null,

      tokenCode,
      cryptoAmount: displayAmount,
      cryptoRawAmount: rawAmount,
      network: verified.resolvedNetwork,
      senderWallet,
      recipientWallet: verified.savedWallet,

      includedDonationExtras,
    });

    return res.status(201).json({
      ok: true,

      ticket,

      ticketId: ticket.ticketId,
      joinToken: ticket.joinToken,

      web3TransactionId: verified.web3Result?.id ?? null,
      duplicate: !!verified.web3Result?.duplicate,

      ledgerId: ticket.ledgerId,
      ledgerAmount: donationEur,
      ledgerCurrency: 'EUR',

      roomCurrency: verified.roomCurrency,
      roomCurrencySymbol: verified.roomCurrencySymbol,

      txHash,

      paymentMethod: {
        id: verified.method.id,
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