// server/peerFundraising/api/peerCryptoRoutes.js
//
// POST /api/peer-support/orders/:orderId/confirm-crypto
//
// Called by CryptoFixedFeeStep (via confirmEndpoint prop) after a supporter
// completes an on-chain Solana payment for a peer fundraiser order.
//
// Flow:
//   CryptoFixedFeeStep sends on-chain
//     → POST here with txHash + order details
//     → verifyPeerCryptoPayment checks the chain
//     → peer_orders.payment_status flipped to 'confirmed'
//     → confirmPeerOrder runs the full peer fulfilment pipeline:
//         confirmPeerOrderReservations
//         → expandPeerOrder (creates entries + join_url per pack item)
//         → retryMissingPeerTicketEmails
//         → completeFulfilmentState
//     → entries with join_url returned to frontend
//
// Crypto slots into the same confirmed-only accounting path as Stripe.
// Nothing here bypasses the fulfilment pipeline - confirmPeerOrder is the
// single source of truth for what "confirmed" means, same as the webhook.
//
// Mount in the public block (before auth middleware) in server/index.js:
//   import peerCryptoRoutes from './peer/api/peerCryptoRoutes.js';
//   app.use('/api', peerCryptoRoutes);

import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { connection, TABLE_PREFIX } from '../../config/database.js';
import { verifyPeerCryptoPayment } from '../services/peerCryptoVerificationService.js';
import { confirmPeerOrder } from '../services/peerOrderCompletionService.js';

const router = Router();

const limiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    ok: false,
    error: 'Too many crypto payment attempts. Please wait a few minutes.',
  },
});

const T_ORDERS  = `${TABLE_PREFIX}peer_orders`;
const T_ENTRIES = `${TABLE_PREFIX}peer_entries`;

/**
 * POST /api/peer-support/orders/:orderId/confirm-crypto
 *
 * Body (sent by CryptoFixedFeeStep):
 * {
 *   txHash, senderWallet, recipientWallet,
 *   tokenCode, tokenMint?,
 *   entryFeeRaw, extrasRaw?,
 *   entryFeeDisplay, extrasDisplay?,
 *   cryptoDisplayAmount,
 *   network?,
 *   clubPaymentMethodId,
 * }
 */
router.post(
  '/peer-support/orders/:orderId/confirm-crypto',
  limiter,
  async (req, res) => {
    try {
      const { orderId } = req.params;

      const {
        txHash,
        senderWallet,
        recipientWallet,
        tokenCode,
        tokenMint           = null,
        entryFeeRaw,
        extrasRaw           = '0',
        entryFeeDisplay,
        extrasDisplay       = 0,
        cryptoDisplayAmount = null,
        network             = 'mainnet',
        clubPaymentMethodId,
      } = req.body ?? {};

      // ── Validate required fields ──────────────────────────────────────────
      if (!txHash)
        return res.status(400).json({ ok: false, error: 'txHash is required' });
      if (!entryFeeRaw)
        return res.status(400).json({ ok: false, error: 'entryFeeRaw is required' });
      if (!clubPaymentMethodId)
        return res.status(400).json({ ok: false, error: 'clubPaymentMethodId is required' });

      // ── Load order ────────────────────────────────────────────────────────
      const [orderRows] = await connection.execute(
        `SELECT * FROM ${T_ORDERS} WHERE id = ? LIMIT 1`,
        [orderId],
      );
      const order = orderRows[0];

      if (!order) {
        return res.status(404).json({ ok: false, error: 'order_not_found' });
      }

      // ── Idempotency: already confirmed ────────────────────────────────────
      // confirmPeerOrder handles the double-Stripe-webhook race internally,
      // but a repeated frontend call (e.g. tab refresh after success) should
      // get a clean 200 without re-running verification.
      if (order.payment_status === 'confirmed') {
        const [entries] = await connection.execute(
          `SELECT id, entry_type, status, entry_code, join_url, room_id
           FROM ${T_ENTRIES}
           WHERE order_id = ?
           ORDER BY created_at ASC`,
          [orderId],
        );
        return res.json({
          ok:                true,
          orderId,
          duplicate:         true,
          ledgerAmount:      Number(order.total_amount),
          ledgerCurrency:    order.currency,
          web3TransactionId: null,
          ticketId:          null,
          joinToken:         null,
          entries,
        });
      }

      // Only pending or claimed orders can be confirmed via crypto.
      // (claimed = supporter self-declared cash; pending = not yet touched.)
      if (!['pending', 'claimed'].includes(order.payment_status)) {
        return res.status(400).json({ ok: false, error: 'order_not_confirmable' });
      }

      // ── Verify on-chain ───────────────────────────────────────────────────
      const verification = await verifyPeerCryptoPayment({
        orderId,
        clubId:              order.club_id,
        clubPaymentMethodId: Number(clubPaymentMethodId),
        network,
        txHash,
        senderWallet,
        recipientWallet,
        tokenCode,
        tokenMint,
        entryFeeRaw,
        extrasRaw,
        totalFiatAmount:     entryFeeDisplay ?? order.total_amount,
        fiatCurrency:        order.currency,
        cryptoDisplayAmount,
      });

      // ── Confirm order + run full peer fulfilment ──────────────────────────
      // confirmPeerOrder is the same function the Stripe webhook calls.
      // It handles: status update, reservations, expandPeerOrder (entries +
      // join_url), ticket emails, and fulfilment state - in one place.
      // Passing externalTransactionId lets the ledger record the tx hash
      // the same way a Stripe payment intent ID is recorded.
      await confirmPeerOrder({
        orderId,
        externalTransactionId: txHash,
        paymentReference:      txHash,
      });

      // ── Return entries for the thank-you screen ───────────────────────────
      const [entries] = await connection.execute(
        `SELECT id, entry_type, status, entry_code, join_url, room_id
         FROM ${T_ENTRIES}
         WHERE order_id = ?
         ORDER BY created_at ASC`,
        [orderId],
      );

      console.log(
        `[PeerCrypto] ✅ Order ${orderId} confirmed via txHash ${txHash.slice(0, 16)}...` +
        ` | ${entries.length} entries created`,
      );

      return res.json({
        ok:                true,
        orderId,
        txHash,
        // Fields CryptoFixedFeeStep reads to show "Recorded as €16.00"
        ledgerAmount:      verification.totalFiat,
        ledgerCurrency:    verification.fiatCurrency,
        web3TransactionId: verification.web3Result?.id ?? null,
        // ticketId / joinToken are null - entries carry join_url instead.
        // PeerSupportPage reads entries via getPublicOrderSummary after this.
        ticketId:          null,
        joinToken:         null,
        entries,
      });

    } catch (err) {
      console.error('[PeerCrypto] POST confirm-crypto error:', err);
      const status = err?.statusCode || 500;
      return res.status(status).json({
        ok:    false,
        error: err?.message ?? 'Failed to confirm crypto payment',
      });
    }
  },
);

export default router;