/**
 * Puzzle Drop — puzzle play routes
 * server/puzzles/routes/puzzleDropRoutes.js
 *
 * Deliberately NOT reusing puzzleRoutes.js's authenticateAny middleware.
 * That middleware resolves req.user.id from a club or supporter JWT — but
 * Drop buyers are, by design, never given a fundraisely_supporters row
 * (confirmed decision: Drop buyers are fully separate from the
 * supporter/subscriber identity system). Access here is proven by the
 * entitlement's own access_token instead (the same token the magic-link
 * email carries — see spec §5.4), checked directly against
 * fundraisely_puzzle_drop_entitlements on every request.
 *
 * The "player_id" written into fundraisely_puzzle_views /
 * _progress / _submissions for a Drop play session is a synthetic id
 * derived from the entitlement, `dropentitlement_${entitlementId}` —
 * exactly the same synthetic-id convention quizTicketService.js already
 * uses for ticket buyers (`ticket_${ticketId}`) who also have no real
 * supporter/player row. Not a new pattern, just the established one
 * applied to a second no-supporter buyer type.
 *
 * NOTE: this file currently authenticates by raw access_token (query
 * param or Authorization: Bearer) rather than through a real session/JWT.
 * That's intentional at this stage of the build — the magic-link/session
 * wiring described in spec §5.4 depends on the backend supporterAuthService
 * file, which hasn't been reviewed yet. Once that's in hand, requireDropAccess
 * below is the one place that needs updating to read from whatever session
 * mechanism §5.4 lands on; nothing else in this file should need to change.
 */

import express from 'express';
import database from '../../config/database.js';
import { authenticateToken } from '../../middleware/auth.js';
import {
  getEntitlementById,
  getDropRoomConfig,
  getDropItemById,
  getDropItemLeaderboard,
  getPublicDropSummary,
  getPublicDropInfo,
  createDrop,
  getDropDetailForClub,
  updateDrop,
  createDropEntitlements,
  confirmDropPurchase,
  validateDropManualPaymentMethod,
  validateDropCryptoPaymentMethod,
  getEntitlementsBySessionId,
  getEntitlementsForRoomAndEmail,
   completeDrop,
   openDropNow,
  getDropPurchasesForClub,
} from '../services/puzzleDropService.js';
import { verifySolanaTransfer } from '../../quiz/services/cryptoSolanaPaymentVerificationService.js';
import { generatePuzzleForDropItem, getClientPuzzleData } from '../services/puzzleGenerationService.js';
import { validateAndScore } from '../services/puzzleValidationService.js';
import { saveProgress, loadProgress, recordFirstView } from '../services/puzzleProgressService.js';
import { createDropStripeCheckout } from '../../stripe/puzzleDropStripeCheckout.js';
import { sendPuzzleDropConfirmationEmail } from '../services/puzzleDropEmailService.js';
import {
  resolveEntitlements,
  consumeCredit,
} from '../../policy/entitlements.js';

const router = express.Router();

// ⚠️ TEMPORARY DIAGNOSTIC — remove once the routing issue is found.
// router.use((req, res, next) => {
//   console.log('[puzzleDropRoutes] 🔎 incoming:', req.method, req.originalUrl);
//   next();
// });

// ─── PUBLIC ROUTES ────────────────────────────────────────────────────────────

// GET /api/puzzle-drop/public/:dropRoomId/info
router.get('/public/:dropRoomId/info', async (req, res) => {
  try {
    const info = await getPublicDropInfo({ dropRoomId: req.params.dropRoomId });
    if (!info) return res.status(404).json({ error: 'Drop not found or not on sale' });
    res.json(info);
  } catch (err) {
    console.error('[puzzleDropRoutes] GET public info error:', err);
    res.status(500).json({ error: 'Failed to load Drop.' });
  }
});

// GET /api/puzzle-drop/public/:dropRoomId/leaderboard-summary
router.get('/public/:dropRoomId/leaderboard-summary', async (req, res) => {
  try {
    const summary = await getPublicDropSummary({ dropRoomId: req.params.dropRoomId });
    if (!summary) return res.status(404).json({ error: 'Drop not found' });
    res.json(summary);
  } catch (err) {
    console.error('[puzzleDropRoutes] GET public summary error:', err);
    res.status(500).json({ error: 'Failed to load leaderboard summary.' });
  }
});

// GET /api/puzzle-drop/public/:dropRoomId/items/:itemNumber/leaderboard
router.get('/public/:dropRoomId/items/:itemNumber/leaderboard', async (req, res) => {
  try {
    const itemNumber = parseInt(req.params.itemNumber, 10);
    if (!Number.isInteger(itemNumber) || itemNumber < 1) {
      return res.status(400).json({ error: 'Invalid item number' });
    }

    const board = await getDropItemLeaderboard({
      dropRoomId: req.params.dropRoomId,
      itemNumber,
    });
    if (!board) return res.status(404).json({ error: 'Leaderboard not found' });
    res.json(board);
  } catch (err) {
    console.error('[puzzleDropRoutes] GET public item leaderboard error:', err);
    res.status(500).json({ error: 'Failed to load leaderboard.' });
  }
});

// GET /api/puzzle-drop/public/:dropRoomId/recover?email=...
router.get('/public/:dropRoomId/recover', async (req, res) => {
  try {
    const { dropRoomId } = req.params;
    const email = String(req.query.email || '').trim();

    if (!email) return res.status(400).json({ error: 'email is required' });

    const entitlements = await getEntitlementsForRoomAndEmail(dropRoomId, email);

    const withItemNumbers = await Promise.all(
      entitlements.map(async (e) => {
        const item = await getDropItemById(e.item_id);
        return {
          entitlementId: e.id,
          itemNumber: item?.item_number ?? null,
          accessToken: e.access_token,
          paymentStatus: e.payment_status,
        };
      })
    );

    res.json({ ok: true, entitlements: withItemNumbers });
  } catch (err) {
    console.error('[puzzleDropRoutes] recover error:', err);
    res.status(500).json({ error: 'Failed to look up your purchases.' });
  }
});

function dropPlayerId(entitlementId) {
  return entitlementId;
}

function getTokenFromRequest(req) {
  const queryToken = req.query?.token;
  if (queryToken) return String(queryToken);

  const authHeader = req.headers?.authorization;
  if (authHeader?.startsWith('Bearer ')) return authHeader.slice(7);

  return null;
}

// ─── CLUB-SIDE CREATION ────────────────────────────────────────────────────
// ─── CLUB-SIDE CREATION ────────────────────────────────────────────────────
router.post('/', authenticateToken, async (req, res) => {
  try {
    const {
      roomId, scheduledAt, timeZone, currency, currencySymbol,
      dropTitle, items, pricingTiers, onnightMethodIds,
    } = req.body;

    if (!roomId) return res.status(400).json({ error: 'roomId is required' });
    if (!scheduledAt) return res.status(400).json({ error: 'scheduledAt is required' });

    const clubId = req.club_id;

    // ── Entitlements gate ──────────────────────────────────────────────────
    // Mirrors challengeRoutes.js POST / exactly: resolve entitlements for
    // this scope, block on no credits, create, then consume the credit
    // (non-fatal if the consume step itself fails — the Drop has already
    // been created at that point, same reasoning as every other activity
    // type's create route).
    const ents = await resolveEntitlements({ userId: clubId, scope: 'puzzle_drop' });

    console.log(`[puzzleDropRoutes] 🔑 Entitlements — plan: ${ents.plan_code} credits: ${ents.game_credits_remaining}`);

    if ((ents.game_credits_remaining ?? 0) <= 0) {
      return res.status(402).json({
        error: 'no_credits',
        message: ents.plan_code === 'FREE'
          ? "You've used your one free Puzzle Drop. Upgrade your plan to run more."
          : "You've used all your activity credits this month. Upgrade for more.",
        upgradeUrl: '/settings/billing',
      });
    }

    const result = await createDrop({
      roomId,
      clubId,
      hostId: req.user?.id ?? clubId,
      hostName: req.user?.name ?? null,
      scheduledAt,
      timeZone,
      currency,
      currencySymbol,
      dropTitle,
      items: items || [],
      pricingTiers: pricingTiers || [],
      onnightMethodIds: onnightMethodIds || [],
    });

    const creditResult = await consumeCredit(clubId, 'puzzle_drop', ents.plan_code);
    if (!creditResult.ok) {
      console.error(
        `[puzzleDropRoutes] ⚠️ Credit consume failed after Drop creation — club: ${clubId} room: ${result.roomId}`,
      );
    } else {
      console.log(`[puzzleDropRoutes] ✅ Credit consumed — club: ${clubId}`);
    }

    res.status(201).json(result);
  } catch (err) {
    console.error('[puzzleDropRoutes] create error:', err);
    res.status(400).json({ error: err.message || 'Failed to create Drop.' });
  }
});

// ─── CLUB-SIDE EDIT ────────────────────────────────────────────────────────
router.get('/:roomId', authenticateToken, async (req, res) => {
  try {
    const detail = await getDropDetailForClub({ roomId: req.params.roomId, clubId: req.club_id });
    if (!detail) return res.status(404).json({ error: 'Drop not found' });
    res.json(detail);
  } catch (err) {
    console.error('[puzzleDropRoutes] GET detail error:', err);
    res.status(500).json({ error: 'Failed to load Drop.' });
  }
});

router.patch('/:roomId', authenticateToken, async (req, res) => {
  try {
    const {
      scheduledAt, timeZone, currency, currencySymbol,
      dropTitle, items, pricingTiers, onnightMethodIds,
    } = req.body;

    const updated = await updateDrop({
      roomId: req.params.roomId,
      clubId: req.club_id,
      scheduledAt, timeZone, currency, currencySymbol,
      dropTitle, items, pricingTiers, onnightMethodIds,
    });

    res.json(updated);
  } catch (err) {
    console.error('[puzzleDropRoutes] PATCH error:', err);
    const msg = err.message || '';
    if (msg.includes('drop_not_editable')) {
      return res.status(409).json({
        error: 'drop_not_editable',
        message: 'This Drop has already gone on sale and can no longer be edited here.',
      });
    }
    if (msg === 'drop_not_found') return res.status(404).json({ error: msg });
    if (msg === 'access_denied')  return res.status(403).json({ error: msg });
    res.status(400).json({ error: msg || 'Failed to update Drop.' });
  }
});

// ─── PURCHASE (instant/cash) ───────────────────────────────────────────────
router.post('/:dropRoomId/purchase', async (req, res) => {
  try {
    const { dropRoomId } = req.params;
    const { itemIds, buyerName, buyerEmail, paymentReference, clubPaymentMethodId } = req.body;

    if (!Array.isArray(itemIds) || itemIds.length === 0) {
      return res.status(400).json({ error: 'itemIds array is required' });
    }
    if (!buyerEmail) return res.status(400).json({ error: 'buyerEmail is required' });
    if (!clubPaymentMethodId) return res.status(400).json({ error: 'clubPaymentMethodId is required' });

    const room = await getDropRoomConfig(dropRoomId);
    if (!room) return res.status(404).json({ error: 'Drop not found' });

    if (room.status !== 'open') {
      return res.status(409).json({
        error: 'drop_not_on_sale',
        message: 'This Drop is not yet on sale.',
      });
    }

    const validatedMethod = await validateDropManualPaymentMethod({
      clubId: room.clubId,
      linkedPaymentMethods: room.linkedPaymentMethods,
      clubPaymentMethodId,
    });

    const result = await createDropEntitlements({
      dropRoomId,
      itemIds,
      buyerName,
      buyerEmail,
      paymentMethod: validatedMethod.paymentMethod,
      paymentSource: 'player_claimed',
      paymentReference,
      clubPaymentMethodId: validatedMethod.id,
      initialStatus: 'claimed',
    });

    res.json({
      ok: true,
      ledgerId: result.ledgerId,
      totalAmount: result.totalAmount,
      currency: result.currency,
      entitlements: result.entitlements.map((e) => ({
        entitlementId: e.id,
        itemNumber: e.itemNumber,
        accessToken: e.accessToken,
      })),
    });
  } catch (err) {
    console.error('[puzzleDropRoutes] purchase error:', err);
    res.status(400).json({ error: err.message || 'Failed to record purchase.' });
  }
});

// ─── STRIPE CHECKOUT ────────────────────────────────────────────────────────
router.post('/:dropRoomId/stripe/checkout', async (req, res) => {
  try {
    const { dropRoomId } = req.params;
    const { itemIds, buyerName, buyerEmail, appOrigin } = req.body;

    if (!Array.isArray(itemIds) || itemIds.length === 0) {
      return res.status(400).json({ error: 'itemIds array is required' });
    }
    if (!buyerEmail) return res.status(400).json({ error: 'buyerEmail is required' });

    const result = await createDropStripeCheckout({
      dropRoomId,
      itemIds,
      buyerName,
      buyerEmail,
      appOrigin,
    });

    res.json({ ok: true, url: result.url });
  } catch (err) {
    console.error('[puzzleDropRoutes] stripe checkout error:', err);
    const msg = err.message || '';
    if (msg === 'drop_not_on_sale') {
      return res.status(409).json({ error: msg, message: 'This Drop is not yet on sale.' });
    }
    if (msg === 'stripe_not_ready_or_disabled') {
      return res.status(422).json({ error: msg, message: 'Card payment is not available for this Drop right now.' });
    }
    res.status(400).json({ error: msg || 'Failed to start checkout.' });
  }
});

// GET /api/puzzle-drop/:dropRoomId/stripe/session/:sessionId
router.get('/:dropRoomId/stripe/session/:sessionId', async (req, res) => {
  try {
    const { dropRoomId, sessionId } = req.params;
    const entitlements = await getEntitlementsBySessionId({ dropRoomId, sessionId });

    if (!entitlements.length) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const allConfirmed = entitlements.every((e) => e.payment_status === 'confirmed');

    const withItemNumbers = await Promise.all(
      entitlements.map(async (e) => {
        const item = await getDropItemById(e.item_id);
        return {
          entitlementId: e.id,
          itemNumber: item?.item_number ?? null,
          accessToken: e.access_token,
          paymentStatus: e.payment_status,
        };
      })
    );

    res.json({ ok: true, pending: !allConfirmed, entitlements: withItemNumbers });
  } catch (err) {
    console.error('[puzzleDropRoutes] stripe session lookup error:', err);
    res.status(500).json({ error: 'Failed to look up session.' });
  }
});

// ─── CRYPTO CONFIRM ─────────────────────────────────────────────────────────
// POST /api/puzzle-drop/:dropRoomId/crypto/confirm?itemIds=<JSON array>
//
// itemIds is read from the QUERY STRING, not the body — CryptoFixedFeeStep.tsx
// builds its own POST body internally and has no field for it. The real
// body fields it sends (ticket mode): clubPaymentMethodId, network, txHash,
// senderWallet, tokenMint, entryFeeRaw, purchaserName, purchaserEmail, playerName.
router.post('/:dropRoomId/crypto/confirm', async (req, res) => {
  try {
    const { dropRoomId } = req.params;
    const {
      clubPaymentMethodId, txHash, network, senderWallet, tokenMint,
      entryFeeRaw, purchaserName, purchaserEmail, playerName,
    } = req.body;

    let itemIds = [];
    try {
      itemIds = JSON.parse(req.query.itemIds || '[]');
    } catch {
      return res.status(400).json({ error: 'itemIds query param must be valid JSON' });
    }

    const buyerEmail = purchaserEmail;
    const buyerName = purchaserName || playerName;

    if (!Array.isArray(itemIds) || itemIds.length === 0) {
      return res.status(400).json({ error: 'itemIds is required (as a JSON array in the query string)' });
    }
    if (!buyerEmail) return res.status(400).json({ error: 'purchaserEmail is required' });
    if (!clubPaymentMethodId) return res.status(400).json({ error: 'clubPaymentMethodId is required' });
    if (!txHash) return res.status(400).json({ error: 'txHash is required' });
    if (!senderWallet) return res.status(400).json({ error: 'senderWallet is required' });
    if (!entryFeeRaw) return res.status(400).json({ error: 'entryFeeRaw is required' });

    const room = await getDropRoomConfig(dropRoomId);
    if (!room) return res.status(404).json({ error: 'Drop not found' });

    if (room.status !== 'open') {
      return res.status(409).json({ error: 'drop_not_on_sale', message: 'This Drop is not yet on sale.' });
    }

    const validatedMethod = await validateDropCryptoPaymentMethod({
      clubId: room.clubId,
      linkedPaymentMethods: room.linkedPaymentMethods,
      clubPaymentMethodId,
    });

    const walletAddress = validatedMethod.methodConfig?.walletAddress;
    if (!walletAddress) {
      return res.status(500).json({ error: 'club_wallet_not_configured' });
    }

    const [[existingLedgerRow]] = await database.connection.execute(
      `SELECT id FROM fundraisely_quiz_payment_ledger WHERE external_transaction_id = ? LIMIT 1`,
      [txHash]
    );
    if (existingLedgerRow) {
      return res.status(409).json({ error: 'tx_already_used', message: 'This transaction has already been used.' });
    }

    const verification = await verifySolanaTransfer({
      txHash,
      network: network || 'mainnet-beta',
      senderWallet,
      recipientWallet: walletAddress,
      tokenMint: tokenMint || null,
      rawAmount: entryFeeRaw,
    });

    if (!verification?.ok) {
      return res.status(402).json({
        error: 'payment_not_verified',
        message: verification?.error || 'Could not verify this transaction on-chain.',
      });
    }

const result = await createDropEntitlements({
      dropRoomId,
      itemIds,
      buyerName,
      buyerEmail,
      paymentMethod: 'crypto',
      paymentSource: 'onchain_auto',
      paymentReference: txHash,
      externalTransactionId: txHash,
      clubPaymentMethodId: validatedMethod.id,
      initialStatus: 'confirmed',
    });

    // NEW — crypto confirms entitlements directly, bypassing confirmDropPurchase,
    // so the email needs to be sent here instead.
    try {
      await sendPuzzleDropConfirmationEmail({
        clubId: room.clubId,
        dropRoomId,
        dropTitle: room.config?.dropTitle,
        buyerEmail,
        buyerName,
        ledgerId: result.ledgerId,
        items: result.entitlements.map((e) => ({
          entitlementId: e.id,
          itemNumber: e.itemNumber,
          puzzleType: e.puzzleType,
          accessToken: e.accessToken,
        })),
      });
    } catch (emailErr) {
      console.error('[puzzleDropRoutes] ⚠️ Confirmation email failed (non-fatal):', emailErr.message);
    }

    res.json({
      ok: true,
      ledgerAmount: result.totalAmount,
      ledgerCurrency: result.currency,
      web3TransactionId: result.ledgerId,
    });
  } catch (err) {
    console.error('[puzzleDropRoutes] crypto confirm error:', err);
    res.status(400).json({ error: err.message || 'Failed to confirm crypto payment.' });
  }
});

// ─── ADMIN CONFIRM ─────────────────────────────────────────────────────────
router.post('/entitlements/:entitlementId/confirm', authenticateToken, async (req, res) => {
  try {
    const { entitlementId } = req.params;
    const confirmedBy = req.user?.id ?? req.club_id;
    const confirmedByName = req.user?.name ?? null;
    const confirmedByRole = req.user?.role ?? 'admin';

    const result = await confirmDropPurchase({
      entitlementId,
      confirmedBy,
      confirmedByName,
      confirmedByRole,
    });

    res.json(result);
  } catch (err) {
    console.error('[puzzleDropRoutes] confirm error:', err);
    res.status(400).json({ error: err.message || 'Failed to confirm purchase.' });
  }
});

// ─── PLAY ROUTES ───────────────────────────────────────────────────────────

async function requireDropAccess(req, res, next) {
  try {
    const { entitlementId } = req.params;
    const token = getTokenFromRequest(req);

    if (!token) {
      return res.status(401).json({ error: 'Access token required' });
    }

    const entitlement = await getEntitlementById(entitlementId);
    if (!entitlement || entitlement.access_token !== token) {
      return res.status(404).json({ error: 'Not found' });
    }

    req.dropEntitlement = entitlement;
    next();
  } catch (err) {
    console.error('[puzzleDropRoutes] auth error:', err);
    res.status(500).json({ error: 'Failed to verify access.' });
  }
}

router.get('/entitlements/:entitlementId/puzzle', requireDropAccess, async (req, res) => {
  try {
    const entitlement = req.dropEntitlement;

    if (entitlement.payment_status !== 'confirmed') {
      return res.status(402).json({
        error: 'payment_not_confirmed',
        paymentStatus: entitlement.payment_status,
        message: 'This payment is still awaiting confirmation from the host.',
      });
    }

    const item = await getDropItemById(entitlement.item_id);
    if (!item) {
      return res.status(404).json({ error: 'Puzzle item not found' });
    }

    const room = await getDropRoomConfig(entitlement.drop_room_id);
    if (!room) {
      return res.status(404).json({ error: 'Drop not found' });
    }

    const instance = await generatePuzzleForDropItem({
      dropRoomId: entitlement.drop_room_id,
      itemNumber: item.item_number,
      puzzleType: item.puzzle_type,
      difficulty: item.difficulty,
      clubId: room.clubId,
    });

    const clientData = getClientPuzzleData(instance);
    const playerId = dropPlayerId(entitlement.id);

    const [submissionRows] = await database.connection.execute(
      `SELECT is_correct, total_score, base_score, bonus_score, penalty_score
       FROM fundraisely_puzzle_submissions
       WHERE instance_id = ? AND player_id = ?
       LIMIT 1`,
      [instance.id, playerId]
    );

    let previousSubmission = null;
    if (submissionRows.length > 0) {
      const s = submissionRows[0];
      previousSubmission = {
        completed: true,
        correct: s.is_correct === 1,
        baseScore: s.base_score,
        bonusScore: s.bonus_score,
        penaltyScore: s.penalty_score,
        totalScore: s.total_score,
      };
    }

    if (!previousSubmission) {
      await recordFirstView({ instanceId: instance.id, playerId, clubId: room.clubId });
    }

    const progress = !previousSubmission
      ? await loadProgress(instance.id, playerId)
      : null;

    return res.json({
      puzzle: clientData,
      progress: progress?.progressData ?? null,
      progressMeta: progress
        ? { activeSeconds: progress.activeSeconds, savedAt: progress.updatedAt }
        : null,
      previousSubmission,
      itemNumber: item.item_number,
      dropRoomId: entitlement.drop_room_id,
    });
  } catch (err) {
    console.error('[puzzleDropRoutes] GET puzzle error:', err);
    res.status(500).json({ error: 'Failed to load puzzle.' });
  }
});

router.post('/entitlements/:entitlementId/save', requireDropAccess, async (req, res) => {
  try {
    const entitlement = req.dropEntitlement;
    const { instanceId, progressData } = req.body;

    if (entitlement.payment_status !== 'confirmed') {
      return res.status(402).json({ error: 'payment_not_confirmed' });
    }
    if (!instanceId) return res.status(400).json({ error: 'instanceId is required' });
    if (!progressData) return res.status(400).json({ error: 'progressData is required' });

    const room = await getDropRoomConfig(entitlement.drop_room_id);
    if (!room) return res.status(404).json({ error: 'Drop not found' });

    const playerId = dropPlayerId(entitlement.id);
    await saveProgress({ instanceId, playerId, clubId: room.clubId, progressData });
    res.json({ ok: true });
  } catch (err) {
    console.error('[puzzleDropRoutes] save error:', err);
    res.status(500).json({ error: 'Failed to save progress.' });
  }
});

router.post('/entitlements/:entitlementId/submit', requireDropAccess, async (req, res) => {
  try {
    const entitlement = req.dropEntitlement;
    const { instanceId, puzzleType, answer, timeTakenSeconds } = req.body;

    if (entitlement.payment_status !== 'confirmed') {
      return res.status(402).json({ error: 'payment_not_confirmed' });
    }
    if (!instanceId) return res.status(400).json({ error: 'instanceId is required' });
    if (!puzzleType) return res.status(400).json({ error: 'puzzleType is required' });
    if (!answer) return res.status(400).json({ error: 'answer is required' });

    const room = await getDropRoomConfig(entitlement.drop_room_id);
    if (!room) return res.status(404).json({ error: 'Drop not found' });

    const playerId = dropPlayerId(entitlement.id);

    const result = await validateAndScore({
      instanceId,
      playerId,
      clubId: room.clubId,
      puzzleType,
      answer,
      timeTakenSeconds,
    });

    res.json(result);
  } catch (err) {
    console.error('[puzzleDropRoutes] submit error:', err);
    res.status(500).json({ error: 'Failed to submit puzzle.' });
  }
});

// ─── CLUB-SIDE: mark completed ─────────────────────────────────────────────
router.post('/:roomId/complete', authenticateToken, async (req, res) => {
  try {
    const result = await completeDrop({ roomId: req.params.roomId, clubId: req.club_id });
    res.json(result);
  } catch (err) {
    console.error('[puzzleDropRoutes] complete error:', err);
    const msg = err.message || '';
    if (msg === 'drop_not_found') return res.status(404).json({ error: msg });
    if (msg === 'access_denied')  return res.status(403).json({ error: msg });
    if (msg === 'drop_already_completed') {
      return res.status(409).json({ error: msg, message: 'This Drop is already marked as completed.' });
    }
    res.status(400).json({ error: msg || 'Failed to complete Drop.' });
  }
});

// ─── CLUB-SIDE: purchases list ──────────────────────────────────────────────
router.get('/:roomId/purchases', authenticateToken, async (req, res) => {
  try {
    const result = await getDropPurchasesForClub({ roomId: req.params.roomId, clubId: req.club_id });
    if (!result) return res.status(404).json({ error: 'Drop not found' });
    res.json(result);
  } catch (err) {
    console.error('[puzzleDropRoutes] GET purchases error:', err);
    res.status(500).json({ error: 'Failed to load purchases.' });
  }
});

router.post('/:roomId/open', authenticateToken, async (req, res) => {
  try {
    const result = await openDropNow({ roomId: req.params.roomId, clubId: req.club_id });
    res.json(result);
  } catch (err) {
    console.error('[puzzleDropRoutes] open error:', err);
    const msg = err.message || '';
    if (msg === 'drop_not_found') return res.status(404).json({ error: msg });
    if (msg === 'access_denied')  return res.status(403).json({ error: msg });
    if (msg === 'drop_not_schedulable') {
      return res.status(409).json({ error: msg, message: 'This Drop is already open or has ended.' });
    }
    res.status(400).json({ error: msg || 'Failed to open Drop.' });
  }
});

export default router;