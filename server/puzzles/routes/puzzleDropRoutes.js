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
  getEntitlementsBySessionId,
} from '../services/puzzleDropService.js';
import { generatePuzzleForDropItem, getClientPuzzleData } from '../services/puzzleGenerationService.js';
import { validateAndScore } from '../services/puzzleValidationService.js';
import { saveProgress, loadProgress, recordFirstView } from '../services/puzzleProgressService.js';
import { createDropStripeCheckout } from '../../stripe/puzzleDropStripeCheckout.js';

const router = express.Router();

// ⚠️ TEMPORARY DIAGNOSTIC — remove once the routing issue is found.
// Logs every request that reaches this router, before any route matching
// happens, so we can tell "never got here" apart from "got here but no
// route matched."
router.use((req, res, next) => {
  console.log('[puzzleDropRoutes] 🔎 incoming:', req.method, req.originalUrl);
  next();
});

// ─── PUBLIC ROUTES ────────────────────────────────────────────────────────────
// Registered first, same ordering rationale as challengeRoutes.js: 'public'
// would otherwise risk being matched as a dynamic param by a route
// registered above it. No auth middleware — the service layer's status
// gate ('open' only) is the guard, same pattern as getPublicChallengeMeta.
//
// Response shapes are IDENTICAL to challengeService.js's getWeekLeaderboard
// / getPublicLeaderboardSummary (field names kept as `weekNumber`/`weeks`/
// `challenge` even though these are items/a drop — see puzzleDropService.js
// comments) so PublicWeekLeaderboardPage.tsx / PublicWallOfFamePage.tsx can
// be reused. Wiring an actual Drop-specific frontend service + routes to
// call these, and deciding the final URL scheme those pages navigate to,
// is deferred to the frontend leaderboard-reuse piece — this is the
// backend half only.

// GET /api/puzzle-drop/public/:dropRoomId/info
// The buyer landing page's one call: branding + items + pricing tiers.
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

// fundraisely_puzzle_submissions.player_id is varchar(36) — NOT varchar(64)
// like the ledger table's player_id. A prefixed synthetic id (the
// ticket_${ticketId} convention quizTicketService.js uses) would not fit,
// since entitlement ids are already full 36-char UUIDs. So Drop uses the
// entitlement's own id directly as player_id: no prefix needed, already
// guaranteed unique per item-purchase, and fits the column exactly.
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
// POST /api/puzzle-drop
// Body: { roomId, scheduledAt, timeZone, currency, currencySymbol, dropTitle,
//         items: [{puzzleType, difficulty}], pricingTiers: [{quantity, price, label}],
//         onnightMethodIds: number[] }
//
// Counterpart to eliminationMgmtService.scheduleRoom / ticketedEventMgmtService
// .scheduleEvent — called from PuzzleDropActivityStep's registry createRoom(),
// which generates roomId client-side the same way every other activity type
// does (uuidv4().replace(/-/g,'').slice(0,16).toUpperCase()) and passes it in,
// rather than letting the server mint it. hostId/hostName/clubId come from
// the authenticated request, never the body.
router.post('/', authenticateToken, async (req, res) => {
  try {
    const {
      roomId, scheduledAt, timeZone, currency, currencySymbol,
      dropTitle, items, pricingTiers, onnightMethodIds,
    } = req.body;

    if (!roomId) return res.status(400).json({ error: 'roomId is required' });
    if (!scheduledAt) return res.status(400).json({ error: 'scheduledAt is required' });

    const result = await createDrop({
      roomId,
      clubId: req.club_id,
      hostId: req.user?.id ?? req.club_id,
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

    res.status(201).json(result);
  } catch (err) {
    console.error('[puzzleDropRoutes] create error:', err);
    res.status(400).json({ error: err.message || 'Failed to create Drop.' });
  }
});

// ─── CLUB-SIDE EDIT ────────────────────────────────────────────────────────
// GET /api/puzzle-drop/:roomId — combined room+items+tiers read, for
// seeding EditFundraiserModal's PuzzleDropActivityStep.
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

// PATCH /api/puzzle-drop/:roomId — edit a Drop. Only succeeds while
// status === 'scheduled' (updateDrop's own guard) — see that function's
// header comment for why this is safe.
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

// ─── PURCHASE ──────────────────────────────────────────────────────────────
// POST /api/puzzle-drop/:dropRoomId/purchase
// Body: { itemIds: string[], buyerName, buyerEmail, paymentReference, clubPaymentMethodId }
//
// Instant-payment / cash claim path ONLY. This is what PaymentInstructions'
// onConfirmPaid callback calls (spec §5.3) — the buyer has already worked
// through the copy-reference → pay → confirm UI client-side, so this call
// creates entitlements directly at 'claimed', same single-step shape as
// quizTicketService.createTicketWithPayment. A club admin still has to
// confirm before puzzle_instance_id is generated and the puzzle becomes
// playable — see the /confirm route below.
//
// Crypto and Stripe are NOT handled here — they go through their own
// confirmed-payment paths (crypto: a dedicated /crypto/confirm route,
// mirroring CryptoFixedFeeStep's confirmEndpoint contract; Stripe:
// deferred pending a decision on which of the two patterns spec §5.2
// allows to follow). Both of those, once verified, call
// createDropEntitlements with initialStatus: 'confirmed' instead.
//
// Magic-link email: NOT sent from this route yet. Spec §5.4 says the
// access email must go out immediately on purchase regardless of
// confirmation state — but Drop's access mechanism, as built in this
// file's requireDropAccess, is simpler than the subscription's JWT-based
// magic-link system: it's just a URL carrying entitlementId + the
// entitlement's own access_token, no verify/exchange step needed. Sending
// that email still needs a mailer call this codebase's email utility
// (referenced elsewhere as ../../utils/ticketEmail.js) hasn't been shown
// yet — wiring the actual send is the next piece of work, not guessed at
// here to avoid assuming a transport/signature with zero evidence for it.
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

    // Status gate — a Drop only accepts purchases once it's actually on
    // sale ('open', flipped lazily by getDropRoomConfig once scheduled_at
    // has passed). This didn't exist before and is added now specifically
    // because it's the precondition that makes updateDrop's wholesale
    // items/pricing-tiers replacement (while status === 'scheduled') safe
    // — without this gate, a purchase could theoretically land against an
    // item that a club then edits away.
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
// POST /api/puzzle-drop/:dropRoomId/stripe/checkout
// Body: { itemIds, buyerName, buyerEmail, appOrigin }
//
// Creates the entitlements + ledger row (at 'expected') and a Stripe
// Checkout Session, returning the URL for the frontend to redirect to.
// See puzzleDropStripeCheckout.js's header comment for why this differs
// from the instant-payment /purchase route above — Drop's itemIds can't
// safely round-trip through Stripe metadata, so entitlements are created
// up front rather than deferred to the webhook.
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
//
// The post-checkout success page's one call: Stripe's success_url can
// only carry small values (entitlementId, session_id) — not the full set
// of access tokens for a multi-item purchase. This looks up every
// entitlement sharing that session's ledger row and returns their tokens,
// once confirmed. If the webhook hasn't landed yet, returns pending: true
// so the frontend can poll briefly rather than error out — Stripe
// webhooks and the browser's redirect back from Checkout are not
// guaranteed to arrive in any particular order.
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

// ─── ADMIN CONFIRM ─────────────────────────────────────────────────────────
// POST /api/puzzle-drop/entitlements/:entitlementId/confirm
// Club admin confirms a manual (instant/cash) payment — mirrors
// quizTicketService.confirmTicketPayment. Confirms every entitlement that
// shares the same purchase (same ledger_id), not just the one named in
// the URL — see confirmDropPurchase's comment for why.
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


/**
 * Loads the entitlement for :entitlementId, checks the supplied token
 * matches its access_token, and attaches it to req.dropEntitlement.
 * 404s rather than 401s on a token mismatch — deliberately not confirming
 * whether the entitlementId itself exists to someone probing without the
 * right token.
 */
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

/**
 * GET /api/puzzle-drop/entitlements/:entitlementId/puzzle
 *
 * Returns the puzzle instance for this entitlement's item, plus saved
 * progress — same response shape as puzzleRoutes.js's GET route, so the
 * frontend puzzle-player component can be reused unmodified.
 *
 * If payment isn't confirmed yet, returns 402 with the entitlement's
 * status rather than puzzle data — this is the "payment pending host
 * confirmation" state the spec (§5.4) says the magic link should land on
 * when clicked before the club has confirmed a manual payment. Same link
 * works once confirmed; no new email needed.
 */
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

    // Idempotent — returns the existing instance if one was already
    // generated (e.g. by the purchase/confirm flow at entitlement
    // creation time per spec §6). Safe to call unconditionally here
    // regardless of whether entitlement.puzzle_instance_id is populated.
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

/**
 * POST /api/puzzle-drop/entitlements/:entitlementId/save
 * Body: { instanceId, progressData }
 */
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

/**
 * POST /api/puzzle-drop/entitlements/:entitlementId/submit
 * Body: { instanceId, puzzleType, answer, timeTakenSeconds }
 *
 * Reuses puzzleValidationService.validateAndScore completely unmodified —
 * same server-trusted timing, same scoring logic, same answer-never-sent-
 * to-client rule as the subscription (spec §2/§6: "Engines: zero changes").
 */
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

export default router;