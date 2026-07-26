// server/ticketedEvent/api/ticketedEventCheckinRoutes.js
//
// Routes for the check-in dashboard — accessible by:
//   1. Logged-in club users (cookie/JWT auth via authenticateToken)
//   2. Door staff via operator token (?token=xyz in query or Authorization header)
//
// Mounted at /api/ticketed-event/checkin
//
// UPDATED (settlement guard):
//   - PATCH .../confirm now reads the ticket BEFORE writing it, and refuses
//     to manually confirm auto-settled payments (Stripe, crypto). Those are
//     settled by a webhook / on-chain confirmations — a person at the door
//     has no way to verify them, which is how an insufficient-funds card got
//     marked as paid and threw the reports out.
//   - GET .../tickets now joins the club payment method row so every ticket
//     carries settlementMode + canConfirmManually. The frontend renders from
//     those flags, so the button and the server guard can never drift.
//   - NEW POST .../collect-at-door — the escape hatch. When an online payment
//     never landed and the guest pays in person, this rewrites the ticket onto
//     a real door method (cash / card tap) instead of lying about the old one.
//
// UNCHANGED: confirm-payment and walk-in handlers still call ensureAdminCaptured()
// so that whoever confirms a payment or adds a walk-in guest is automatically
// recorded in config_json.admins (if not already there). This feeds the
// Impact tab's volunteer count.

import express from 'express';
import jwt from 'jsonwebtoken';
import authenticateToken from '../../middleware/auth.js';
import { connection, TABLE_PREFIX } from '../../config/database.js';
import { getTicketedEvent } from './ticketedEventMgmtService.js';
import { createExpectedPayment, confirmPayment } from '../../mgtsystem/services/quizPaymentLedgerService.js';
import {
  settlementModeFor,
  canConfirmManually,
  settlementLabelFor,
} from '../../shared/paymentSettlement.js';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'fallback-dev-secret';
const TICKETS_TABLE = `${TABLE_PREFIX}quiz_tickets`;
const ROOMS_TABLE   = `${TABLE_PREFIX}web2_quiz_rooms`;

// ⚠️ VERIFY THIS ONE against your schema. Your sample export shows the table
// as `fundraisely_club_payment_methods`; this assumes TABLE_PREFIX = 'fundraisely_'.
// If the prefix differs, this is the only line to change.
const METHODS_TABLE = `${TABLE_PREFIX}club_payment_methods`;

// Providers where money physically changes hands at the door. A Revolut link
// is instant_payment too, but you can't "collect" it in person — same rule as
// WALKIN_ALLOWED_METHODS in WalkinFlow.tsx.
const DOOR_COLLECTABLE_PROVIDERS = new Set(['cash', 'card_tap']);

// ─── Flexible auth middleware ──────────────────────────────────────────────────
// Accepts either:
//   - Standard club session (cookie / Authorization: Bearer <clubJwt>)
//   - Operator token (?token=xyz or Authorization: Bearer <operatorJwt>)
//
// Sets req.club_id (from club session) OR req.operator_room_id (from operator token).

async function flexAuth(req, res, next) {
  // 1. Try operator token from query string or header
  const tokenParam = req.query.token;
  const authHeader  = req.headers['authorization'];
  const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  const rawToken    = tokenParam || bearerToken;

  if (rawToken) {
    try {
      const decoded = jwt.verify(rawToken, JWT_SECRET);
      // Operator token shape: { roomId, role: 'operator', gameType: 'ticketed_event' }
      // OR club JWT shape: { userId, ... }
      if (decoded.role === 'operator' && decoded.roomId) {
        req.operator_room_id = decoded.roomId;
        req.is_operator      = true;
        req.operator         = decoded;
        return next();
      }
      // Might be a club JWT — fall through to standard auth
    } catch {
      // Invalid token — fall through to standard auth
    }
  }

  // 2. Try standard club auth
  return authenticateToken(req, res, next);
}

// ─── Auth guard helper ────────────────────────────────────────────────────────
// After flexAuth, verify the caller has access to the requested room.
async function verifyRoomAccess(req, roomId) {
  if (req.is_operator) {
    // Operator token is scoped to a specific room
    return req.operator_room_id === roomId;
  }
  // Club auth — verify the room belongs to this club
  const clubId = req.club_id;
  if (!clubId) return false;
  const [rows] = await connection.execute(
    `SELECT room_id FROM ${ROOMS_TABLE}
     WHERE room_id = ? AND club_id = ? AND game_type = 'ticketed_event'
     LIMIT 1`,
    [roomId, clubId]
  );
  return rows?.length > 0;
}

// ─── Resolve the club that owns a room ───────────────────────────────────────
// req.club_id only exists on the club-session auth path. Door staff on an
// operator token have no club_id, so anything that needs to scope a query by
// club (e.g. looking up a payment method) has to read it off the room.
async function resolveRoomClubId(req, roomId) {
  if (req.club_id) return req.club_id;
  const [rows] = await connection.execute(
    `SELECT club_id FROM ${ROOMS_TABLE}
     WHERE room_id = ? AND game_type = 'ticketed_event'
     LIMIT 1`,
    [roomId]
  );
  return rows?.[0]?.club_id ?? null;
}

// ─── Resolve who is confirming a payment ─────────────────────────────────────
// For operator tokens: reads staffName embedded in the JWT.
// For logged-in club users: reads req.user populated by authenticateToken.
function resolveConfirmerIdentity(req) {
  if (req.is_operator) {
    const name = req.operator?.staffName || 'Door staff';
    return { id: 'door_staff', name, role: 'admin' };
  }
  return {
    id:   req.user?.id   || req.club_id || 'admin',
    name: req.user?.name || req.user?.email || 'Admin',
    role: req.user?.role || 'admin',
  };
}

// ─── Auto-capture confirmer as a volunteer/admin ──────────────────────────────
// Whenever someone confirms a payment or adds a walk-in, record their name in
// config_json.admins if not already there — so the Impact tab's volunteer
// count reflects everyone who actually helped, not just people explicitly
// added via the Staff tab. Works identically for club users and door staff
// on operator tokens, since it only needs roomId + a name string — it doesn't
// care which auth path produced that name.
async function ensureAdminCaptured(roomId, confirmerName) {
  if (!confirmerName || !confirmerName.trim()) return;

  // Skip generic/system placeholder names — not real volunteers
  const skip = new Set(['admin', 'host', 'system', 'door staff', 'unknown']);
  const trimmedName = confirmerName.trim();
  if (skip.has(trimmedName.toLowerCase())) return;

  try {
    const [rows] = await connection.execute(
      `SELECT config_json FROM ${ROOMS_TABLE} WHERE room_id = ? LIMIT 1`,
      [roomId]
    );
    const room = rows?.[0];
    if (!room) return;

    const config = typeof room.config_json === 'string'
      ? JSON.parse(room.config_json)
      : (room.config_json ?? {});

    const admins = Array.isArray(config.admins) ? config.admins : [];
    const alreadyExists = admins.some(
      a => (a.name || '').trim().toLowerCase() === trimmedName.toLowerCase()
    );
    if (alreadyExists) return;

    const newAdmin = {
      id:        `admin-${Date.now()}`,
      name:      trimmedName,
      createdAt: new Date().toISOString(),
    };

    const updatedConfig = { ...config, admins: [...admins, newAdmin] };
    await connection.execute(
      `UPDATE ${ROOMS_TABLE} SET config_json = ? WHERE room_id = ?`,
      [JSON.stringify(updatedConfig), roomId]
    );
  } catch (err) {
    // Non-fatal — never block a payment confirmation or walk-in over this
    console.error('[ticketedEventCheckin] ensureAdminCaptured failed:', err);
  }
}

// ─── POST /api/ticketed-event/checkin/:roomId/operator-token ──────────────────
// Generate a door-staff operator token. Club auth required.
router.post('/:roomId/operator-token', authenticateToken, async (req, res) => {
  try {
    const clubId = req.club_id;
    if (!clubId) return res.status(401).json({ error: 'unauthorized' });

    const roomId = String(req.params.roomId || '').trim();
    if (!roomId) return res.status(400).json({ error: 'missing_room_id' });

    const room = await getTicketedEvent({ clubId, roomId });
    if (!room) return res.status(404).json({ error: 'not_found' });

    const staffName = String(req.body?.staffName || '').trim() || 'Door staff';

    const token = jwt.sign(
      { roomId, role: 'operator', gameType: 'ticketed_event', staffName },
      JWT_SECRET,
      { expiresIn: '12h' }
    );

    const appOrigin  = process.env.APP_URL || process.env.FRONTEND_URL || 'http://localhost:5173';
    const checkinUrl = `${appOrigin}/ticketed-event/checkin/${roomId}?token=${token}`;

    console.log(`[ticketedEventCheckin] 🎤 Operator token generated — room: ${roomId} club: ${clubId}`);

    return res.status(200).json({ token, checkinUrl });
  } catch (err) {
    console.error('[ticketedEventCheckin] ❌ operator-token error:', err);
    return res.status(500).json({ error: 'internal_error' });
  }
});

// ─── GET /api/ticketed-event/checkin/:roomId/info ─────────────────────────────
// Load room info + ticket summary for the check-in dashboard.
router.get('/:roomId/info', flexAuth, async (req, res) => {
  try {
    const roomId = String(req.params.roomId || '').trim();
    if (!roomId) return res.status(400).json({ error: 'missing_room_id' });

    const hasAccess = await verifyRoomAccess(req, roomId);
    if (!hasAccess) return res.status(403).json({ error: 'forbidden' });

    const [rows] = await connection.execute(
      `SELECT room_id, host_id, club_id, status, game_type,
              scheduled_at, time_zone, config_json, reconciliation_status
       FROM ${ROOMS_TABLE}
       WHERE room_id = ? AND game_type = 'ticketed_event'
       LIMIT 1`,
      [roomId]
    );

    const room = rows?.[0];
    if (!room) return res.status(404).json({ error: 'room_not_found' });

    const config = typeof room.config_json === 'string'
      ? JSON.parse(room.config_json)
      : (room.config_json ?? {});

    return res.status(200).json({
      roomId:               room.room_id,
      hostId:               room.host_id,
      clubId:               room.club_id,
      status:               room.status,
      gameType:             room.game_type,
      scheduledAt:          room.scheduled_at,
      timeZone:             room.time_zone,
      reconciliationStatus: room.reconciliation_status,
      config: {
        entryFee:        config.entryFee        ?? null,
        fundraisingMode: config.fundraisingMode ?? 'fixed_fee',
        currencySymbol:  config.currencySymbol  ?? '€',
        currency:        config.currency        ?? 'EUR',
        hostName:        config.hostName        ?? null,
        prizes:          config.prizes          ?? [],
        eventSponsors:   config.eventSponsors   ?? [],
      },
    });
  } catch (err) {
    console.error('[ticketedEventCheckin] ❌ info error:', err);
    return res.status(500).json({ error: 'internal_error' });
  }
});

// ─── GET /api/ticketed-event/checkin/:roomId/tickets ─────────────────────────
// List all tickets for the room — for the attendee list in the check-in dashboard.
//
// The LEFT JOIN pulls the club payment method row so we can classify each
// ticket's settlement mode from method_category + method_config, rather than
// from the collapsed category string stored on the ticket. Older tickets with
// no club_payment_method_id fall back to ticket.payment_method, which is
// still a category string and still classifies correctly.
router.get('/:roomId/tickets', flexAuth, async (req, res) => {
  try {
    const roomId = String(req.params.roomId || '').trim();
    if (!roomId) return res.status(400).json({ error: 'missing_room_id' });

    const hasAccess = await verifyRoomAccess(req, roomId);
    if (!hasAccess) return res.status(403).json({ error: 'forbidden' });

    const [tickets] = await connection.execute(
      `SELECT
         t.ticket_id, t.purchaser_name, t.purchaser_email,
         t.player_name, t.entry_fee, t.extras_total, t.total_amount, t.currency,
         t.payment_status, t.redemption_status, t.payment_method, t.payment_reference,
         t.club_payment_method_id,
         t.created_at, t.confirmed_at, t.confirmed_by_name,
         t.redeemed_at, t.join_token,
         m.method_category, m.provider_name, m.method_label, m.method_config
       FROM ${TICKETS_TABLE} t
       LEFT JOIN ${METHODS_TABLE} m
         ON m.id = t.club_payment_method_id
       WHERE t.room_id = ?
       ORDER BY t.created_at DESC`,
      [roomId]
    );

    const formatted = tickets.map(t => {
      const settlementMode = settlementModeFor({
        // Fall back to the ticket's own category for rows created before
        // club_payment_method_id was populated (the join returns null there).
        methodCategory: t.method_category ?? t.payment_method,
        methodConfig:   t.method_config,
      });

      return {
        ticketId:         t.ticket_id,
        purchaserName:    t.purchaser_name,
        purchaserEmail:   t.purchaser_email,
        playerName:       t.player_name,
        entryFee:         parseFloat(t.entry_fee    ?? 0),
        extrasTotal:      parseFloat(t.extras_total ?? 0),
        totalAmount:      parseFloat(t.total_amount ?? 0),
        currency:         t.currency,
        paymentStatus:    t.payment_status,
        redemptionStatus: t.redemption_status,
        paymentMethod:    t.payment_method,
        paymentReference: t.payment_reference,
        // Was previously reading t.created_at while the SELECT aliased it to
        // purchased_at, so this field always came back undefined. Fixed.
        purchasedAt:      t.created_at,
        confirmedAt:      t.confirmed_at,
        confirmedByName:  t.confirmed_by_name,
        redeemedAt:       t.redeemed_at,
        joinToken:        t.join_token,

        // ── Settlement policy, computed server-side ──────────────────────
        // The frontend renders the Confirm button from canConfirmManually,
        // and the confirm route guards on the same function. One source.
        methodLabel:        t.method_label ?? null,
        settlementMode,                                   // 'auto' | 'manual'
        canConfirmManually: settlementMode !== 'auto'
                            && t.payment_status === 'payment_claimed',
      };
    });

    return res.status(200).json({ ok: true, tickets: formatted });
  } catch (err) {
    console.error('[ticketedEventCheckin] ❌ tickets error:', err);
    return res.status(500).json({ error: 'internal_error' });
  }
});

// ─── GET /api/ticketed-event/checkin/:roomId/door-methods ────────────────────
// Payment methods that can actually be collected at the door — cash and card
// tap only. Used by the "Collect at door" flow when an online payment fails.
router.get('/:roomId/door-methods', flexAuth, async (req, res) => {
  try {
    const roomId = String(req.params.roomId || '').trim();
    if (!roomId) return res.status(400).json({ error: 'missing_room_id' });

    const hasAccess = await verifyRoomAccess(req, roomId);
    if (!hasAccess) return res.status(403).json({ error: 'forbidden' });

    const clubId = await resolveRoomClubId(req, roomId);
    if (!clubId) return res.status(404).json({ error: 'room_not_found' });

    const [rows] = await connection.execute(
      `SELECT id, method_category, provider_name, method_label, method_config
       FROM ${METHODS_TABLE}
       WHERE club_id = ? AND is_enabled = 1
       ORDER BY display_order ASC, id ASC`,
      [clubId]
    );

    const methods = (rows ?? [])
      .filter(m => DOOR_COLLECTABLE_PROVIDERS.has(String(m.provider_name || '').toLowerCase()))
      .map(m => ({
        id:             m.id,
        methodCategory: m.method_category,
        providerName:   m.provider_name,
        methodLabel:    m.method_label,
      }));

    return res.status(200).json({ ok: true, methods });
  } catch (err) {
    console.error('[ticketedEventCheckin] ❌ door-methods error:', err);
    return res.status(500).json({ error: 'internal_error' });
  }
});

// ─── POST /api/ticketed-event/checkin/:roomId/scan ───────────────────────────
// QR code scan — redeem a ticket by its join_token.
// This is the endpoint the QR scanner calls when a guest scans in.
//
// The frontend sends either:
//   { joinToken: "raw-token" }      — manual entry or raw-token QR
//   { ticketId:  "TICKET-ABC123" }  — scanned from the ticket status page URL
//
router.post('/:roomId/scan', flexAuth, async (req, res) => {
  try {
    const roomId    = String(req.params.roomId   || '').trim();
    const joinToken = String(req.body?.joinToken  || '').trim();
    const ticketId  = String(req.body?.ticketId   || '').trim();

    if (!roomId)                 return res.status(400).json({ error: 'missing_room_id' });
    if (!joinToken && !ticketId) return res.status(400).json({ error: 'missing_join_token' });

    const hasAccess = await verifyRoomAccess(req, roomId);
    if (!hasAccess) return res.status(403).json({ error: 'forbidden' });

    // Find the ticket — match by join_token OR ticket_id, whichever was provided
    const [rows] = await connection.execute(
      `SELECT ticket_id, purchaser_name, player_name,
              payment_status, redemption_status, redeemed_at
       FROM ${TICKETS_TABLE}
       WHERE room_id = ?
         AND (
               (? != '' AND join_token = ?)
            OR (? != '' AND ticket_id  = ?)
             )
       LIMIT 1`,
      [roomId, joinToken, joinToken, ticketId, ticketId]
    );

    const ticket = rows?.[0];

    if (!ticket) {
      return res.status(404).json({
        ok:      false,
        error:   'ticket_not_found',
        message: 'This QR code is not valid for this event.',
      });
    }

    // Block if payment not confirmed
    if (ticket.payment_status !== 'payment_confirmed') {
      return res.status(400).json({
        ok:            false,
        error:         'payment_not_confirmed',
        message:       `Payment not yet confirmed for ${ticket.purchaser_name}. Please confirm payment before checking in.`,
        ticketId:      ticket.ticket_id,
        purchaserName: ticket.purchaser_name,
        paymentStatus: ticket.payment_status,
      });
    }

    // Already redeemed — return a warning with who/when
    if (ticket.redemption_status === 'redeemed') {
      return res.status(200).json({
        ok:           true,
        alreadyUsed:  true,
        message:      `Already checked in${ticket.redeemed_at ? ` at ${new Date(ticket.redeemed_at).toLocaleTimeString('en-IE')}` : ''}.`,
        ticketId:      ticket.ticket_id,
        purchaserName: ticket.purchaser_name,
        playerName:    ticket.player_name,
        redeemedAt:    ticket.redeemed_at,
      });
    }

    // Mark as redeemed
    await connection.execute(
      `UPDATE ${TICKETS_TABLE}
       SET redemption_status = 'redeemed',
           redeemed_at       = UTC_TIMESTAMP()
       WHERE ticket_id = ?
       LIMIT 1`,
      [ticket.ticket_id]
    );

    console.log(`[ticketedEventCheckin] ✅ Checked in: ${ticket.purchaser_name} (${ticket.ticket_id}) for room ${roomId}`);

    return res.status(200).json({
      ok:           true,
      alreadyUsed:  false,
      message:      `Welcome, ${ticket.purchaser_name}! ✓`,
      ticketId:      ticket.ticket_id,
      purchaserName: ticket.purchaser_name,
      playerName:    ticket.player_name,
      redeemedAt:    new Date().toISOString(),
    });
  } catch (err) {
    console.error('[ticketedEventCheckin] ❌ scan error:', err);
    return res.status(500).json({ error: 'internal_error' });
  }
});

// ─── PATCH /api/ticketed-event/checkin/:roomId/tickets/:ticketId/confirm ──────
// Confirm a ticket payment — accessible to door staff via operator token.
//
// This handler used to go straight to UPDATE without reading the ticket, which
// meant any ticket in any state could be stamped payment_confirmed by anyone
// with room access — including a Stripe payment that had actually declined.
router.patch('/:roomId/tickets/:ticketId/confirm', flexAuth, async (req, res) => {
  try {
    const roomId   = String(req.params.roomId   || '').trim();
    const ticketId = String(req.params.ticketId || '').trim();
    if (!roomId || !ticketId) return res.status(400).json({ error: 'missing_params' });

    const hasAccess = await verifyRoomAccess(req, roomId);
    if (!hasAccess) return res.status(403).json({ error: 'forbidden' });

    // ── 1. Read the ticket first ──────────────────────────────────────────
    const [rows] = await connection.execute(
      `SELECT t.ticket_id, t.purchaser_name, t.payment_method, t.payment_status,
              t.confirmed_at, t.confirmed_by_name,
              m.method_category, m.method_config
       FROM ${TICKETS_TABLE} t
       LEFT JOIN ${METHODS_TABLE} m
         ON m.id = t.club_payment_method_id
       WHERE t.ticket_id = ? AND t.room_id = ?
       LIMIT 1`,
      [ticketId, roomId]
    );
    const ticket = rows?.[0];
    if (!ticket) return res.status(404).json({ error: 'ticket_not_found' });

    // ── 2. Already settled ────────────────────────────────────────────────
    if (ticket.payment_status === 'payment_confirmed') {
      return res.status(409).json({
        error:       'already_confirmed',
        message:     `Already confirmed by ${ticket.confirmed_by_name || 'a staff member'}.`,
        confirmedAt: ticket.confirmed_at,
      });
    }
    if (ticket.payment_status === 'refunded') {
      return res.status(409).json({
        error:   'ticket_refunded',
        message: 'This ticket was refunded and cannot be confirmed.',
      });
    }

    // ── 3. The fix: gateway-settled payments are not human-confirmable ────
    const methodForClassification = {
      methodCategory: ticket.method_category ?? ticket.payment_method,
      methodConfig:   ticket.method_config,
    };

    if (!canConfirmManually(methodForClassification)) {
      console.warn(
        `[ticketedEventCheckin] 🚫 Blocked manual confirm — ticket: ${ticketId} ` +
        `category: ${ticket.method_category ?? ticket.payment_method} room: ${roomId}`
      );
      return res.status(403).json({
        error:          'manual_confirmation_not_allowed',
        paymentMethod:  ticket.payment_method,
        settlementMode: 'auto',
        message:
          `${ticket.purchaser_name}'s ${settlementLabelFor(methodForClassification)} ` +
          `confirms on its own once it clears, so it can't be confirmed by hand. ` +
          `If it failed, use Collect at door to take cash or card instead.`,
      });
    }

    // ── 4. Proceed ────────────────────────────────────────────────────────
    const confirmer       = resolveConfirmerIdentity(req);
    const confirmedByName = req.body?.confirmedByName || confirmer.name;
    const confirmedById   = req.body?.confirmedBy     || confirmer.id;
    const confirmedByRole = req.body?.confirmedByRole || confirmer.role;

    // The extra payment_status guard closes the race where two door staff
    // hit Confirm at the same moment and the second overwrites the first.
    await connection.execute(
      `UPDATE ${TICKETS_TABLE}
       SET payment_status    = 'payment_confirmed',
           redemption_status = 'ready',
           confirmed_at      = UTC_TIMESTAMP(),
           confirmed_by      = ?,
           confirmed_by_name = ?,
           confirmed_by_role = ?
       WHERE ticket_id = ? AND room_id = ?
         AND payment_status <> 'payment_confirmed'
       LIMIT 1`,
      [confirmedById, confirmedByName, confirmedByRole, ticketId, roomId]
    );

    // Update the ledger — marks all entries for this ticket as confirmed
    const playerId = `ticket_${ticketId}`;
    await confirmPayment({
      roomId,
      playerId,
      confirmedBy:     confirmedById,
      confirmedByName,
      confirmedByRole,
    });

    // Capture this confirmer as a volunteer if not already recorded
    await ensureAdminCaptured(roomId, confirmedByName);

    return res.status(200).json({ ok: true, message: 'Payment confirmed.' });
  } catch (err) {
    console.error('[ticketedEventCheckin] ❌ confirm error:', err);
    return res.status(500).json({ error: 'internal_error' });
  }
});

// ─── POST /api/ticketed-event/checkin/:roomId/tickets/:ticketId/collect-at-door ─
// The guest's online payment never landed and they're paying in person.
// Rewrites the ticket onto a real door method rather than lying about the old
// one, keeping the original method in payment_reference so reconciliation can
// see what happened.
router.post('/:roomId/tickets/:ticketId/collect-at-door', flexAuth, async (req, res) => {
  try {
    const roomId   = String(req.params.roomId   || '').trim();
    const ticketId = String(req.params.ticketId || '').trim();
    if (!roomId || !ticketId) return res.status(400).json({ error: 'missing_params' });

    const hasAccess = await verifyRoomAccess(req, roomId);
    if (!hasAccess) return res.status(403).json({ error: 'forbidden' });

    const clubPaymentMethodId = req.body?.clubPaymentMethodId;
    if (!clubPaymentMethodId) {
      return res.status(400).json({
        error:   'missing_payment_method',
        message: 'Choose cash or card tap.',
      });
    }

    const clubId = await resolveRoomClubId(req, roomId);
    if (!clubId) return res.status(404).json({ error: 'room_not_found' });

    // Look up the method on the club — never trust a category string from the
    // client, since that's what would let someone re-collect "as Stripe".
    const [methodRows] = await connection.execute(
      `SELECT id, method_category, provider_name, method_label, is_enabled
       FROM ${METHODS_TABLE}
       WHERE id = ? AND club_id = ?
       LIMIT 1`,
      [clubPaymentMethodId, clubId]
    );
    const method = methodRows?.[0];

    if (!method || !method.is_enabled) {
      return res.status(400).json({
        error:   'invalid_payment_method',
        message: 'That payment method is not available for this club.',
      });
    }
    if (!DOOR_COLLECTABLE_PROVIDERS.has(String(method.provider_name || '').toLowerCase())) {
      return res.status(400).json({
        error:   'invalid_door_method',
        message: 'Only cash and card tap can be collected at the door.',
      });
    }

    const [ticketRows] = await connection.execute(
      `SELECT ticket_id, purchaser_name, payment_method, payment_status
       FROM ${TICKETS_TABLE}
       WHERE ticket_id = ? AND room_id = ?
       LIMIT 1`,
      [ticketId, roomId]
    );
    const ticket = ticketRows?.[0];
    if (!ticket) return res.status(404).json({ error: 'ticket_not_found' });

    if (ticket.payment_status === 'payment_confirmed') {
      return res.status(409).json({
        error:   'already_confirmed',
        message: 'This ticket is already paid.',
      });
    }
    if (ticket.payment_status === 'refunded') {
      return res.status(409).json({
        error:   'ticket_refunded',
        message: 'This ticket was refunded and cannot be collected.',
      });
    }

    const confirmer     = resolveConfirmerIdentity(req);
    const originalMethod = ticket.payment_method;

    await connection.execute(
      `UPDATE ${TICKETS_TABLE}
       SET payment_method         = ?,
           club_payment_method_id = ?,
           payment_reference      = ?,
           payment_status         = 'payment_confirmed',
           redemption_status      = 'ready',
           confirmed_at           = UTC_TIMESTAMP(),
           confirmed_by           = ?,
           confirmed_by_name      = ?,
           confirmed_by_role      = ?
       WHERE ticket_id = ? AND room_id = ?
         AND payment_status <> 'payment_confirmed'
       LIMIT 1`,
      [
        method.method_category,       // canonical category — what the ledger accepts
        method.id,
        `DOOR:was_${originalMethod || 'unknown'}`,
        confirmer.id, confirmer.name, confirmer.role,
        ticketId, roomId,
      ]
    );

    // ⚠️ The ledger row still carries the ORIGINAL payment_method. confirmPayment()
    // only flips status. Until quizPaymentLedgerService exposes something like
    // updatePaymentMethod(), reconciliation will show a Stripe line for money
    // that actually arrived as cash. The ticket row is correct either way.
    const playerId = `ticket_${ticketId}`;
    await confirmPayment({
      roomId,
      playerId,
      confirmedBy:     confirmer.id,
      confirmedByName: confirmer.name,
      confirmedByRole: confirmer.role,
    });

    await ensureAdminCaptured(roomId, confirmer.name);

    console.log(
      `[ticketedEventCheckin] 💶 Door re-collect: ${ticket.purchaser_name} (${ticketId}) ` +
      `${originalMethod} → ${method.method_category}/${method.provider_name} by ${confirmer.name}`
    );

    return res.status(200).json({
      ok:            true,
      ticketId,
      paymentMethod: method.method_category,
      methodLabel:   method.method_label,
      message:       `Collected from ${ticket.purchaser_name}.`,
    });
  } catch (err) {
    console.error('[ticketedEventCheckin] ❌ collect-at-door error:', err);
    return res.status(500).json({ error: 'internal_error' });
  }
});

// ─── POST /api/ticketed-event/checkin/:roomId/walkin ──────────────────────────
// Create a walk-in ticket — payment confirmed + redeemed immediately.
// Used by door staff for guests paying on the night.
router.post('/:roomId/walkin', flexAuth, async (req, res) => {
  try {
    const roomId = String(req.params.roomId || '').trim();
    if (!roomId) return res.status(400).json({ error: 'missing_room_id' });

    const hasAccess = await verifyRoomAccess(req, roomId);
    if (!hasAccess) return res.status(403).json({ error: 'forbidden' });

    const {
      purchaserName,
      purchaserEmail,
      playerName,
      totalAmount,
      paymentMethod,
      clubPaymentMethodId,
      confirmedByName,
    } = req.body || {};

    if (!purchaserName?.trim()) {
      return res.status(400).json({ error: 'purchaser_name_required' });
    }

    // A walk-in is money taken in person, so it can never be an auto-settled
    // method. The UI already filters to cash/card_tap; this stops anything
    // else being written in as an instantly-confirmed walk-in.
    const walkinMethod = paymentMethod || 'cash';
    if (!canConfirmManually(walkinMethod)) {
      return res.status(400).json({
        error:   'invalid_walkin_method',
        message: 'Walk-ins can only be taken as cash or card tap.',
      });
    }

    // Get club_id from the room so we can write the ticket correctly
    const [roomRows] = await connection.execute(
      `SELECT club_id, config_json FROM ${ROOMS_TABLE}
       WHERE room_id = ? AND game_type = 'ticketed_event' LIMIT 1`,
      [roomId]
    );
    const room = roomRows?.[0];
    if (!room) return res.status(404).json({ error: 'room_not_found' });

    const config = typeof room.config_json === 'string'
      ? JSON.parse(room.config_json)
      : (room.config_json ?? {});

    const currency       = config.currency       ?? 'EUR';
    const currencySymbol = config.currencySymbol ?? '€';
    const entryFee       = parseFloat(config.entryFee ?? totalAmount ?? 0);
    const amount         = parseFloat(totalAmount ?? entryFee ?? 0);

    // Generate ticket ID and join token
    const { v4: uuidv4 } = await import('uuid');
    const ticketId  = `WI-${uuidv4().replace(/-/g, '').slice(0, 12).toUpperCase()}`;
    const joinToken = `WI-${uuidv4().replace(/-/g, '').toUpperCase()}`;
    const confirmer = resolveConfirmerIdentity(req);

    await connection.execute(
      `INSERT INTO ${TICKETS_TABLE}
         (ticket_id, room_id, club_id,
          purchaser_name, purchaser_email, player_name,
          entry_fee, extras_total, total_amount, currency,
          payment_status, payment_method, club_payment_method_id,
          payment_reference,
          redemption_status, join_token,
          confirmed_at, confirmed_by_name, confirmed_by_role,
          redeemed_at, created_at, updated_at)
       VALUES
         (?, ?, ?,
          ?, ?, ?,
          ?, 0, ?, ?,
          'payment_confirmed', ?, ?,
          'WALKIN',
          'redeemed', ?,
          UTC_TIMESTAMP(), ?, ?,
          UTC_TIMESTAMP(), UTC_TIMESTAMP(), UTC_TIMESTAMP())`,
      [
        ticketId, roomId, room.club_id,
        purchaserName.trim(),
        purchaserEmail?.trim() || '',
        (playerName || purchaserName).trim(),
        entryFee, amount, currency,
        walkinMethod,
        clubPaymentMethodId || null,
        joinToken,
        confirmer.name,
        confirmer.role,
      ]
    );

    console.log(`[ticketedEventCheckin] 🚶 Walk-in: ${purchaserName} (${ticketId}) added by ${confirmer.name} for room ${roomId}`);

    // Write ledger entry — same as all other ticket flows
    const playerId = `ticket_${ticketId}`;
    const ledgerId = await createExpectedPayment({
      roomId,
      clubId:          room.club_id,
      playerId,
      playerName:      (playerName || purchaserName).trim(),
      ledgerType:      'entry_fee',
      amount,
      currency,
      paymentMethod:   walkinMethod,
      paymentSource:   'admin_assigned',
      status:          'confirmed',
      clubPaymentMethodId: clubPaymentMethodId || null,
      paymentReference:    'WALKIN',
      claimedAt:       new Date(),
      confirmedAt:     new Date(),
      confirmedBy:     confirmer.id,
      confirmedByName: confirmer.name,
      confirmedByRole: confirmer.role,
      ticketId,
    });

    // Link ledger back to ticket
    await connection.execute(
      `UPDATE ${TICKETS_TABLE} SET ledger_id = ? WHERE ticket_id = ?`,
      [ledgerId, ticketId]
    );

    // Capture this door-staff member as a volunteer if not already recorded
    await ensureAdminCaptured(roomId, confirmer.name);

    return res.status(201).json({
      ok:            true,
      ticketId,
      purchaserName: purchaserName.trim(),
      totalAmount:   amount,
      currency:      currencySymbol,
      paymentMethod: walkinMethod,
    });
  } catch (err) {
    console.error('[ticketedEventCheckin] ❌ walkin error:', err);
    return res.status(500).json({ error: 'internal_error', message: err.message });
  }
});

export default router;