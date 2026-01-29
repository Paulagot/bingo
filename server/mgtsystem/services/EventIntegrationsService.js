import database from '../../config/database.js';

const VALID_TYPES = ['quiz_web2']; // add more later: quiz_web3, bingo_web2, etc.

class EventIntegrationsService {
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
   * List club events (for dropdown)
   */
  async listClubEvents({ clubId }) {
    const [rows] = await database.connection.execute(
      `
      SELECT
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
        created_at DESC
      `,
      [clubId]
    );

    return rows || [];
  }

  /**
   * Lookup integrations by external refs (e.g., many room_ids)
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
      `
      SELECT
        ei.external_ref,
        ei.event_id,
        e.title AS event_title
      FROM fundraisely_event_integrations ei
      JOIN fundraisely_events e ON e.id = ei.event_id
      WHERE ei.club_id = ?
        AND ei.integration_type = ?
        AND ei.external_ref IN (${placeholders})
      `,
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

  async addIntegration({ eventId, clubId, integration_type, external_ref }) {
    if (!VALID_TYPES.includes(integration_type)) {
      throw new Error(`Invalid integration_type: ${integration_type}`);
    }

    await this._assertEventOwned({ eventId, clubId });

    let cached = {
      status: null,
      scheduled_at: null,
      ended_at: null,
      time_zone: null
    };

    if (integration_type === 'quiz_web2') {
      const room = await this._loadQuizWeb2Room({ roomId: external_ref, clubId });
      cached = {
        status: room.status || null,
        scheduled_at: room.scheduled_at || null,
        ended_at: room.ended_at || null,
        time_zone: room.time_zone || null
      };
    }

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
        cached.time_zone
      ]
    );

    const insertedId = result?.insertId;

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

