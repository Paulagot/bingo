// server/ticketedEvent/api/ticketedEventCheckinRoutes.js
//
// Routes for the check-in dashboard — accessible by:
//   1. Logged-in club users (cookie/JWT auth via authenticateToken)
//   2. Door staff via operator token (?token=xyz in query or Authorization header)
//
// Mounted at /api/ticketed-event/checkin
//
// UPDATED: confirm-payment and walk-in handlers now call ensureAdminCaptured()
// so that whoever confirms a payment or adds a walk-in guest is automatically
// recorded in config_json.admins (if not already there). This feeds the
// Impact tab's volunteer count — previously door staff who confirmed
// payments were never persisted anywhere as a "volunteer".

import express from 'express';
import jwt from 'jsonwebtoken';
import authenticateToken from '../../middleware/auth.js';
import { connection, TABLE_PREFIX } from '../../config/database.js';
import { getTicketedEvent } from './ticketedEventMgmtService.js';
import { createExpectedPayment, confirmPayment } from '../../mgtsystem/services/quizPaymentLedgerService.js';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'fallback-dev-secret';
const TICKETS_TABLE = `${TABLE_PREFIX}quiz_tickets`;
const ROOMS_TABLE   = `${TABLE_PREFIX}web2_quiz_rooms`;

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
router.get('/:roomId/tickets', flexAuth, async (req, res) => {
  try {
    const roomId = String(req.params.roomId || '').trim();
    if (!roomId) return res.status(400).json({ error: 'missing_room_id' });

    const hasAccess = await verifyRoomAccess(req, roomId);
    if (!hasAccess) return res.status(403).json({ error: 'forbidden' });

    const [tickets] = await connection.execute(
      `SELECT
         ticket_id, purchaser_name, purchaser_email,
         player_name, entry_fee, extras_total, total_amount, currency,
         payment_status, redemption_status, payment_method, payment_reference,
         created_at AS purchased_at, confirmed_at, confirmed_by_name,
         redeemed_at, join_token
       FROM ${TICKETS_TABLE}
       WHERE room_id = ?
       ORDER BY created_at DESC`,
      [roomId]
    );

    const formatted = tickets.map(t => ({
      ticketId:         t.ticket_id,
      purchaserName:    t.purchaser_name,
      purchaserEmail:   t.purchaser_email,
      playerName:       t.player_name,
      entryFee:         parseFloat(t.entry_fee   ?? 0),
      extrasTotal:      parseFloat(t.extras_total ?? 0),
      totalAmount:      parseFloat(t.total_amount ?? 0),
      currency:         t.currency,
      paymentStatus:    t.payment_status,
      redemptionStatus: t.redemption_status,
      paymentMethod:    t.payment_method,
      paymentReference: t.payment_reference,
      purchasedAt:      t.created_at,
      confirmedAt:      t.confirmed_at,
      confirmedByName:  t.confirmed_by_name,
      redeemedAt:       t.redeemed_at,
      joinToken:        t.join_token,
    }));

    return res.status(200).json({ ok: true, tickets: formatted });
  } catch (err) {
    console.error('[ticketedEventCheckin] ❌ tickets error:', err);
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
 
    if (!roomId)               return res.status(400).json({ error: 'missing_room_id' });
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
// Confirm a ticket payment — same as quiz ticket confirm but accessible to
// door staff via operator token.
router.patch('/:roomId/tickets/:ticketId/confirm', flexAuth, async (req, res) => {
  try {
    const roomId   = String(req.params.roomId   || '').trim();
    const ticketId = String(req.params.ticketId || '').trim();
    if (!roomId || !ticketId) return res.status(400).json({ error: 'missing_params' });

    const hasAccess = await verifyRoomAccess(req, roomId);
    if (!hasAccess) return res.status(403).json({ error: 'forbidden' });
const confirmer = resolveConfirmerIdentity(req);
    const confirmedByName = req.body?.confirmedByName || confirmer.name;
    const confirmedById   = req.body?.confirmedBy     || confirmer.id;
    const confirmedByRole = req.body?.confirmedByRole || confirmer.role;

    // 1. Update the ticket row
    await connection.execute(
      `UPDATE ${TICKETS_TABLE}
       SET payment_status    = 'payment_confirmed',
           redemption_status = 'ready',
           confirmed_at      = UTC_TIMESTAMP(),
           confirmed_by      = ?,
           confirmed_by_name = ?,
           confirmed_by_role = ?
       WHERE ticket_id = ? AND room_id = ?
       LIMIT 1`,
      [confirmedById, confirmedByName, confirmedByRole, ticketId, roomId]
    );

    // 2. Update the ledger — marks all entries for this ticket as confirmed
    const playerId = `ticket_${ticketId}`;
    await confirmPayment({
      roomId,
      playerId,
      confirmedBy:     confirmedById,
      confirmedByName,
      confirmedByRole,
    });

    // 3. Capture this confirmer as a volunteer if not already recorded
    await ensureAdminCaptured(roomId, confirmedByName);

    return res.status(200).json({ ok: true, message: 'Payment confirmed.' });
  } catch (err) {
    console.error('[ticketedEventCheckin] ❌ confirm error:', err);
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
    const currencySymbol = config.currencySymbol  ?? '€';
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
        paymentMethod || 'cash',
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
      paymentMethod:   paymentMethod || 'cash',
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
      paymentMethod: paymentMethod || 'cash',
    });
  } catch (err) {
    console.error('[ticketedEventCheckin] ❌ walkin error:', err);
    return res.status(500).json({ error: 'internal_error', message: err.message });
  }
});

export default router;