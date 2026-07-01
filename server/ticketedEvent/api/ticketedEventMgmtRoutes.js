// server/ticketedEvent/api/ticketedEventMgmtRoutes.js
//
// UPDATED: ticketTypes passed through on POST /schedule and PATCH /rooms/:roomId

import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import authenticateToken from '../../middleware/auth.js';
import {
  resolveEntitlements,
  consumeCredit,
} from '../../policy/entitlements.js';
import {
  scheduleTicketedEvent,
  listTicketedEvents,
  getTicketedEvent,
  updateTicketedEvent,
  cancelTicketedEvent,
  openCheckIn,
  completeTicketedEvent,
} from './ticketedEventMgmtService.js';

const router = express.Router();

console.log('[ticketedEventMgmtRoutes] ✅ Router loaded');

router.use(authenticateToken);

// ─── Error helper ─────────────────────────────────────────────────────────────
const sendError = (res, err) => {
  const status  = err?.statusCode ?? 500;
  const message = err?.message    ?? 'internal_error';

  const ERROR_MAP = {
    'clubId required':             [400, 'bad_request'],
    'roomId required':             [400, 'bad_request'],
    'hostId required':             [400, 'bad_request'],
    'ENTRY_FEE_REQUIRED':          [400, 'entry_fee_required'],
    'not_found':                   [404, 'not_found'],
    'room_not_editable':           [409, 'room_not_editable'],
    'room_not_cancellable':        [409, 'room_not_cancellable'],
    'not_found_or_wrong_status':   [409, 'not_found_or_wrong_status'],
  };

  for (const [key, [mappedStatus, errorCode]] of Object.entries(ERROR_MAP)) {
    if (message.startsWith(key)) {
      return res.status(mappedStatus).json({
        error: errorCode,
        ...(err?.currentStatus && { currentStatus: err.currentStatus }),
      });
    }
  }

  console.error('[ticketedEventMgmtRoutes] ❌ Unhandled error:', err);
  return res.status(status).json({ error: 'internal_error' });
};

// ─── POST /schedule ───────────────────────────────────────────────────────────
router.post('/schedule', async (req, res) => {
  try {
    const clubId = req.club_id;
    if (!clubId) return res.status(401).json({ error: 'unauthorized' });

    const {
      roomId: providedRoomId,
      hostId,
      hostName,
      scheduledAt,
      timeZone,
      entryFee,
      fundraisingMode,
      currency,
      currencySymbol,
      ticketTypes,      // ← new
      prizes,
      eventSponsors,
      venueCapacity,
      eventTitle,
      eventLocation,
      // Payment methods — ticketed events DO have an advance/onnight
      // split, same as quiz/elimination. See PaymentMethodSelector.tsx
      // (mode="split").
      ticketMethodIds  = [],
      onnightMethodIds = [],
    } = req.body;

    const roomId = providedRoomId || uuidv4().replace(/-/g, '').slice(0, 16).toUpperCase();

    console.log(`[ticketedEventMgmtRoutes] 📅 Schedule ticketed event — club: ${clubId} room: ${roomId} ticket types: ${Array.isArray(ticketTypes) ? ticketTypes.length : 0}`);

    const ents = await resolveEntitlements({ userId: clubId, scope: 'ticketed_event' });

    console.log(`[ticketedEventMgmtRoutes] 🔑 Entitlements — plan: ${ents.plan_code} credits: ${ents.game_credits_remaining}`);

    if ((ents.game_credits_remaining ?? 0) <= 0) {
      return res.status(402).json({
        error: 'no_credits',
        message: ents.plan_code === 'FREE'
          ? "You've used your one lifetime ticketed event. Upgrade your plan to run more."
          : "You've used all your activity credits this month. Upgrade for more.",
        upgradeUrl: '/settings/billing',
      });
    }

    const venueMax = Number.isFinite(Number(venueCapacity)) && Number(venueCapacity) > 0
      ? Math.round(Number(venueCapacity))
      : null;

    if (!venueMax) {
      return res.status(400).json({ error: 'venue_capacity_required' });
    }

    const roomCaps = {
      venueCapacity: venueMax,
      maxPlayers:    venueMax,
      planCode:      ents.plan_code,
    };

    const result = await scheduleTicketedEvent({
      clubId, roomId, hostId, hostName,
      scheduledAt, timeZone,
      entryFee, fundraisingMode,
      currency, currencySymbol,
      ticketTypes,      // ← new
      prizes, eventSponsors,
      roomCaps,
      eventTitle,
      eventLocation,
      ticketMethodIds,
      onnightMethodIds,
    });

    const creditResult = await consumeCredit(clubId, 'ticketed_event', ents.plan_code);
    if (!creditResult.ok) {
      console.error(
        `[ticketedEventMgmtRoutes] ⚠️ Credit consume failed after room creation — club: ${clubId} room: ${roomId}`,
      );
    } else {
      console.log(`[ticketedEventMgmtRoutes] ✅ Credit consumed — club: ${clubId}`);
    }

    return res.status(201).json({ ...result, roomCaps });
  } catch (err) {
    return sendError(res, err);
  }
});

// ─── GET /rooms ───────────────────────────────────────────────────────────────
router.get('/rooms', async (req, res) => {
  try {
    const clubId = req.club_id;
    if (!clubId) return res.status(401).json({ error: 'unauthorized' });

    const status = String(req.query.status || 'all');
    const time   = String(req.query.time   || 'all');

    const rooms = await listTicketedEvents({ clubId, status, time });
    return res.status(200).json({ rooms });
  } catch (err) {
    return sendError(res, err);
  }
});

// ─── GET /rooms/:roomId ───────────────────────────────────────────────────────
router.get('/rooms/:roomId', async (req, res) => {
  try {
    const clubId = req.club_id;
    if (!clubId) return res.status(401).json({ error: 'unauthorized' });

    const roomId = String(req.params.roomId || '').trim();
    if (!roomId) return res.status(400).json({ error: 'missing_room_id' });

    const room = await getTicketedEvent({ clubId, roomId });
    if (!room) return res.status(404).json({ error: 'not_found' });

    return res.status(200).json({ room });
  } catch (err) {
    return sendError(res, err);
  }
});

// ─── PATCH /rooms/:roomId ─────────────────────────────────────────────────────
router.patch('/rooms/:roomId', async (req, res) => {
  try {
    const clubId = req.club_id;
    if (!clubId) return res.status(401).json({ error: 'unauthorized' });

    const roomId = String(req.params.roomId || '').trim();
    if (!roomId) return res.status(400).json({ error: 'missing_room_id' });

    const {
      scheduledAt, timeZone, entryFee, fundraisingMode,
      currency, currencySymbol,
      ticketTypes,      // ← new
      prizes, eventSponsors,
      // Left undefined if not sent — undefined means "don't touch payment
      // methods", [] means "clear all selections". NOT defaulted to [] here,
      // unlike the POST /schedule route, since defaulting would wrongly
      // wipe out existing selections on every edit that doesn't touch the
      // payment step.
      ticketMethodIds,
      onnightMethodIds,
    } = req.body;

    console.log(`[ticketedEventMgmtRoutes] ✏️  Update ticketed event ${roomId} — club: ${clubId} — ticket types: ${Array.isArray(ticketTypes) ? ticketTypes.length : 'unchanged'}`);

    const updated = await updateTicketedEvent({
      clubId, roomId,
      scheduledAt, timeZone, entryFee, fundraisingMode,
      currency, currencySymbol,
      ticketTypes,      // ← new
      prizes, eventSponsors,
      ticketMethodIds,
      onnightMethodIds,
    });

    return res.status(200).json({ room: updated });
  } catch (err) {
    return sendError(res, err);
  }
});

// ─── POST /rooms/:roomId/cancel ───────────────────────────────────────────────
router.post('/rooms/:roomId/cancel', async (req, res) => {
  try {
    const clubId = req.club_id;
    if (!clubId) return res.status(401).json({ error: 'unauthorized' });

    const roomId = String(req.params.roomId || '').trim();
    if (!roomId) return res.status(400).json({ error: 'missing_room_id' });

    console.log(`[ticketedEventMgmtRoutes] 🚫 Cancel ticketed event ${roomId} — club: ${clubId}`);

    await cancelTicketedEvent({ clubId, roomId });
    return res.status(200).json({ ok: true });
  } catch (err) {
    return sendError(res, err);
  }
});

// ─── POST /rooms/:roomId/open-checkin ─────────────────────────────────────────
router.post('/rooms/:roomId/open-checkin', async (req, res) => {
  try {
    const clubId = req.club_id;
    if (!clubId) return res.status(401).json({ error: 'unauthorized' });

    const roomId = String(req.params.roomId || '').trim();
    if (!roomId) return res.status(400).json({ error: 'missing_room_id' });

    console.log(`[ticketedEventMgmtRoutes] 🚪 Open check-in for ${roomId} — club: ${clubId}`);

    const result = await openCheckIn({ clubId, roomId });
    return res.status(200).json(result);
  } catch (err) {
    return sendError(res, err);
  }
});

// ─── POST /rooms/:roomId/complete ─────────────────────────────────────────────
router.post('/rooms/:roomId/complete', async (req, res) => {
  try {
    const clubId = req.club_id;
    if (!clubId) return res.status(401).json({ error: 'unauthorized' });

    const roomId = String(req.params.roomId || '').trim();
    if (!roomId) return res.status(400).json({ error: 'missing_room_id' });

    console.log(`[ticketedEventMgmtRoutes] ✅ Complete ticketed event ${roomId} — club: ${clubId}`);

    await completeTicketedEvent({ clubId, roomId });
    return res.status(200).json({ ok: true });
  } catch (err) {
    return sendError(res, err);
  }
});

export default router;