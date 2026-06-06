// server/mgtsystem/services/EventIntegrationsService.js

import database from '../../config/database.js';
import QuizPaymentMethodsService from './QuizPaymentMethodsService.js';

const VALID_TYPES = ['quiz_web2', 'elimination', 'ticketed_event']; // add more later: quiz_web3, bingo_web2, etc.

class EventIntegrationsService {

  // ── Private helpers ────────────────────────────────────────────────────────

  async _assertEventOwned({ eventId, clubId }) {
    const [rows] = await database.connection.execute(
      `SELECT id, club_id FROM fundraisely_events WHERE id = ? LIMIT 1`,
      [eventId]
    );
    if (!rows?.length) throw new Error('Event not found');
    if (rows[0].club_id !== clubId) throw new Error('Access denied');
    return rows[0];
  }

  async _loadQuizWeb2Room({ roomId, clubId }) {
    const [rows] = await database.connection.execute(
      `SELECT room_id, club_id, status, scheduled_at, ended_at, time_zone
       FROM fundraisely_web2_quiz_rooms
       WHERE room_id = ?
       LIMIT 1`,
      [roomId]
    );
    if (!rows?.length) throw new Error('Quiz room not found');
    if (rows[0].club_id !== clubId) throw new Error('Access denied');
    return rows[0];
  }

  /**
   * Load the event's scheduling + payment data so we can push it to the
   * room at link time.
   */
  async _loadEventSyncData({ eventId }) {
    const [rows] = await database.connection.execute(
      `SELECT start_datetime, event_date, time_zone, payment_methods_json
       FROM fundraisely_events
       WHERE id = ? LIMIT 1`,
      [eventId]
    );
    return rows?.[0] || null;
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  /**
   * List club events (for dropdown)
   */
  async listClubEvents({ clubId }) {
    const [rows] = await database.connection.execute(
      `SELECT
        id,
        title,
        start_datetime,
        event_date,
        status,
        is_published
       FROM fundraisely_events
       WHERE club_id = ?
       ORDER BY
         CASE WHEN start_datetime IS NULL THEN 1 ELSE 0 END,
         start_datetime DESC,
         created_at DESC`,
      [clubId]
    );
    return rows || [];
  }

  /**
   * Lookup integrations by external refs (e.g. many room_ids)
   * Returns: [{ external_ref, event_id, event_title }]
   */
  async lookupByExternalRefs({ clubId, integration_type, external_refs }) {
    if (!VALID_TYPES.includes(integration_type)) {
      throw new Error(`Invalid integration_type: ${integration_type}`);
    }

    const refs = Array.from(new Set((external_refs || []).filter(Boolean))).slice(0, 200);
    if (refs.length === 0) return [];

    const placeholders = refs.map(() => '?').join(',');
    const params = [clubId, integration_type, ...refs];

    const [rows] = await database.connection.execute(
      `SELECT
         ei.external_ref,
         ei.event_id,
         e.title AS event_title
       FROM fundraisely_event_integrations ei
       JOIN fundraisely_events e ON e.id = ei.event_id
       WHERE ei.club_id = ?
         AND ei.integration_type = ?
         AND ei.external_ref IN (${placeholders})`,
      params
    );

    return rows || [];
  }

  async listIntegrations({ eventId, clubId }) {
    await this._assertEventOwned({ eventId, clubId });

    const [rows] = await database.connection.execute(
      `SELECT *
       FROM fundraisely_event_integrations
       WHERE event_id = ? AND club_id = ?
       ORDER BY created_at DESC`,
      [eventId, clubId]
    );

    return rows || [];
  }

  /**
   * Link a quiz/elimination room to an event.
   *
   * On link we do a two-way sync:
   *   • Cache the room's current status/scheduling in event_integrations (existing behaviour)
   *   • Push the event's start_datetime, time_zone and payment_methods_json → room (new)
   *
   * The event is the source of truth for scheduling + payments; the room
   * inherits from it at link time and on every subsequent event update.
   */
  async addIntegration({ eventId, clubId, integration_type, external_ref }) {
    if (!VALID_TYPES.includes(integration_type)) {
      throw new Error(`Invalid integration_type: ${integration_type}`);
    }

    await this._assertEventOwned({ eventId, clubId });

    // Load room data (for the event_integrations cache row)
    let cached = {
      status:       null,
      scheduled_at: null,
      ended_at:     null,
      time_zone:    null,
    };

    if (integration_type === 'quiz_web2' || integration_type === 'elimination') {
      const room = await this._loadQuizWeb2Room({ roomId: external_ref, clubId });
      cached = {
        status:       room.status       || null,
        scheduled_at: room.scheduled_at || null,
        ended_at:     room.ended_at     || null,
        time_zone:    room.time_zone    || null,
      };
    }

    // Insert the integration record
    const [result] = await database.connection.execute(
      `INSERT INTO fundraisely_event_integrations
         (event_id, club_id, integration_type, external_ref, status, scheduled_at, ended_at, time_zone)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        eventId,
        clubId,
        integration_type,
        external_ref,
        cached.status,
        cached.scheduled_at,
        cached.ended_at,
        cached.time_zone,
      ]
    );

    const insertedId = result?.insertId;

    // ── Push event's scheduling + payment methods → room ──────────────────
    // The event is the source of truth; sync it to the room now that they're linked.
    try {
      const eventData = await this._loadEventSyncData({ eventId });

      if (eventData && (integration_type === 'quiz_web2' || integration_type === 'elimination')) {
        const scheduledAt = eventData.start_datetime || eventData.event_date || null;
        const timeZone    = eventData.time_zone || null;

        // 1. Sync scheduling + timezone to the quiz room
        if (scheduledAt || timeZone) {
          const setClauses = [];
          const params = [];

          if (scheduledAt) { setClauses.push('scheduled_at = ?'); params.push(scheduledAt); }
          if (timeZone)    { setClauses.push('time_zone = ?');    params.push(timeZone); }

          if (setClauses.length > 0) {
            params.push(external_ref, clubId);
            await database.connection.execute(
              `UPDATE fundraisely_web2_quiz_rooms
               SET ${setClauses.join(', ')}, updated_at = UTC_TIMESTAMP()
               WHERE room_id = ? AND club_id = ?`,
              params
            );

            // Also update the cached values we just inserted into event_integrations
            const eiSetClauses = [];
            const eiParams = [];
            if (scheduledAt) { eiSetClauses.push('scheduled_at = ?'); eiParams.push(scheduledAt); }
            if (timeZone)    { eiSetClauses.push('time_zone = ?');    eiParams.push(timeZone); }
            eiParams.push(insertedId);
            await database.connection.execute(
              `UPDATE fundraisely_event_integrations
               SET ${eiSetClauses.join(', ')}
               WHERE id = ?`,
              eiParams
            );
          }
        }

        // 2. Sync payment methods to the quiz room
        if (eventData.payment_methods_json) {
          const pm = typeof eventData.payment_methods_json === 'string'
            ? JSON.parse(eventData.payment_methods_json)
            : eventData.payment_methods_json;

          if (pm?.ticket_method_ids || pm?.onnight_method_ids) {
            const pmService = new QuizPaymentMethodsService();
            await pmService.updateLinkedPaymentMethods({
              roomId:          external_ref,
              clubId,
              ticketMethodIds:  pm.ticket_method_ids  || [],
              onnightMethodIds: pm.onnight_method_ids || [],
            });
          }
        }

        console.log(`[EventIntegrationsService] Synced event ${eventId} → room ${external_ref} at link time`);
      }
    } catch (err) {
      // Non-fatal — the integration row was created, sync failure shouldn't block the link
      console.warn(`[EventIntegrationsService] Sync to room ${external_ref} failed at link time:`, err.message);
    }

    const [rows] = await database.connection.execute(
      `SELECT * FROM fundraisely_event_integrations WHERE id = ? LIMIT 1`,
      [insertedId]
    );

    return rows?.[0] || null;
  }

  async removeIntegration({ eventId, integrationId, clubId }) {
    await this._assertEventOwned({ eventId, clubId });

    const [result] = await database.connection.execute(
      `DELETE FROM fundraisely_event_integrations
       WHERE id = ? AND event_id = ? AND club_id = ?`,
      [integrationId, eventId, clubId]
    );

    return (result?.affectedRows || 0) > 0;
  }
}

export default EventIntegrationsService;

