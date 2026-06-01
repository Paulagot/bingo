// server/campaigns/api/campaignCryptoRoutes.js
//
// POST /api/campaign-support/orders/:orderId/confirm-crypto
//
// Called by CampaignSupportPage after CryptoFixedFeeStep completes on-chain payment.
//
// This route replaces the previous version which naively trusted whatever ticketId
// came back from /api/quiz/tickets/crypto-fixed-fee/confirm. That old flow had
// three problems:
//   1. It validated the payment method against a room's linked methods — campaign
//      methods are campaign-level, not room-level, so it threw for most orders.
//   2. It only created a quiz ticket for firstRoomId — bundles got one ticket.
//   3. It hardcoded game_type='quiz' in the web3 ledger regardless of game type.
//
// This route:
//   - Verifies the on-chain Solana transaction using the campaign's payment method
//     directly (not room-linked validation).
//   - Does NOT create any quiz ticket — expandOrderIntoEntries does all ticket
//     creation via campaignTicketBridgeService, which correctly apportions the
//     price and grants extras for every room in the bundle.
//   - Records the web3 transaction with the correct game_type.
//   - Returns { ledgerAmount, ledgerCurrency, web3TransactionId } so the
//     CryptoFixedFeeStep UI can show "Payment verified — recorded as €36.00".
//
// Mount in the public block (before auth middleware) in server/index.js:
//   import campaignCryptoRoutes from './campaigns/api/campaignCryptoRoutes.js';
//   app.use('/api', campaignCryptoRoutes);

import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { connection, TABLE_PREFIX } from '../../config/database.js';
import { verifyCampaignCryptoPayment } from '../services/campaignCryptoVerificationService.js';

const router = Router();

const limiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { ok: false, error: 'Too many crypto payment attempts. Please wait a few minutes.' },
});

const T_ORDERS  = `${TABLE_PREFIX}campaign_product_orders`;
const T_ENTRIES = `${TABLE_PREFIX}campaign_entries`;

/**
 * POST /api/campaign-support/orders/:orderId/confirm-crypto
 *
 * Body (sent by CryptoFixedFeeStep via CampaignSupportPage):
 * {
 *   txHash, senderWallet, recipientWallet,
 *   tokenCode, tokenMint?,
 *   entryFeeRaw, extrasRaw?,
 *   entryFeeDisplay (= cartTotal), extrasDisplay (= 0),
 *   cryptoDisplayAmount,
 *   network?,
 *   clubPaymentMethodId,
 *   // legacy fields from old quiz ticket route — ignored:
 *   web3TransactionId?, ticketId?, joinToken?
 * }
 */
router.post('/campaign-support/orders/:orderId/confirm-crypto', limiter, async (req, res) => {
  try {
    const { orderId } = req.params;
    const {
      txHash,
      senderWallet,
      recipientWallet,
      tokenCode,
      tokenMint          = null,
      entryFeeRaw,
      extrasRaw          = '0',
      entryFeeDisplay,   // = cartTotal from CampaignSupportPage
      extrasDisplay      = 0,
      cryptoDisplayAmount = null,
      network            = 'mainnet',
      clubPaymentMethodId,
    } = req.body ?? {};

    // ── Validate required fields ────────────────────────────────────────────
    if (!txHash)
      return res.status(400).json({ ok: false, error: 'txHash is required' });
    if (!entryFeeRaw)
      return res.status(400).json({ ok: false, error: 'entryFeeRaw is required' });
    if (!clubPaymentMethodId)
      return res.status(400).json({ ok: false, error: 'clubPaymentMethodId is required' });

    // ── Load order ──────────────────────────────────────────────────────────
    const [orderRows] = await connection.execute(
      `SELECT * FROM ${T_ORDERS} WHERE id = ? LIMIT 1`, [orderId]
    );
    const order = orderRows[0];
    if (!order) return res.status(404).json({ ok: false, error: 'order_not_found' });

    // ── Idempotency ─────────────────────────────────────────────────────────
    if (order.payment_status === 'confirmed') {
      const [entries] = await connection.execute(
        `SELECT id, entry_type, status, entry_code, join_url, room_id
         FROM ${T_ENTRIES} WHERE order_id = ? ORDER BY created_at ASC`,
        [orderId]
      );
      return res.json({
        ok:                true,
        orderId,
        duplicate:         true,
        ledgerAmount:      Number(order.total_amount),
        ledgerCurrency:    order.currency,
        web3TransactionId: null,
        entries,
      });
    }

    if (!['pending', 'claimed'].includes(order.payment_status)) {
      return res.status(400).json({ ok: false, error: 'order_not_confirmable' });
    }

    // ── Verify on-chain payment ─────────────────────────────────────────────
    // Uses campaign-level payment method validation (not room-linked).
    // Works for any game type — quiz, elimination, or bundles of both.
    const verification = await verifyCampaignCryptoPayment({
      orderId,
      clubId:            order.club_id,
      clubPaymentMethodId: Number(clubPaymentMethodId),
      network,
      txHash,
      senderWallet,
      recipientWallet,
      tokenCode,
      tokenMint,
      entryFeeRaw,
      extrasRaw,
      totalFiatAmount:   entryFeeDisplay ?? order.total_amount,
      fiatCurrency:      order.currency,
      cryptoDisplayAmount,
    });

    // ── Confirm the order ───────────────────────────────────────────────────
    await connection.execute(
      `UPDATE ${T_ORDERS}
       SET payment_status    = 'confirmed',
           payment_reference = ?,
           confirmed_at      = UTC_TIMESTAMP()
       WHERE id = ?`,
      [txHash, orderId]
    );

    // ── Expand entries — creates all tickets via bridge (no quiz route) ─────
    // existingTicketId is NOT passed — the bridge creates fresh tickets for
    // every product item in the bundle, apportions the price by room fee
    // ratio, and grants room extras. This correctly handles:
    //   - quiz-only products
    //   - elimination-only products
    //   - bundles of quiz + elimination
    const { expandOrderIntoEntries } = await import('../services/campaignEntryExpansionService.js');
    await expandOrderIntoEntries(orderId, {
      // No existingTicketId — the old quiz ticket route is no longer called.
      // All tickets are created fresh by the bridge.
    });

    const [entries] = await connection.execute(
      `SELECT id, entry_type, status, entry_code, join_url, room_id
       FROM ${T_ENTRIES} WHERE order_id = ? ORDER BY created_at ASC`,
      [orderId]
    );

    console.log(
      `[CampaignCrypto] ✅ Order ${orderId} confirmed via txHash ${txHash.slice(0, 16)}...` +
      ` | ${entries.length} entries created`
    );

    return res.json({
      ok:                true,
      orderId,
      txHash,
      // Fields CryptoFixedFeeStep needs to show "Recorded as €36.00"
      ledgerAmount:      verification.totalFiat,
      ledgerCurrency:    verification.fiatCurrency,
      web3TransactionId: verification.web3Result?.id ?? null,
      // ticketId / joinToken are null — entries have join_url instead
      // CampaignSupportPage reads entries from getOrderSummary after this
      ticketId:          null,
      joinToken:         null,
      entries,
    });

  } catch (err) {
    console.error('[CampaignCrypto] POST confirm error:', err);
    const status = err?.statusCode || 500;
    return res.status(status).json({
      ok:    false,
      error: err?.message ?? 'Failed to confirm crypto payment',
    });
  }
});

export default router;