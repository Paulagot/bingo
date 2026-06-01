// server/mgtsystem/services/EventService.js

import { connection, TABLE_PREFIX } from '../../config/database.js';
import { v4 as uuidv4 } from 'uuid';
import QuizPaymentMethodsService from './QuizPaymentMethodsService.js';

function getComputedEventStatus(event) {
  if (!event || !event.event_date) return 'upcoming';
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const eventDate = new Date(event.event_date);
  eventDate.setHours(0, 0, 0, 0);
  if (event.status === 'live') return 'live';
  if (eventDate < now) return 'ended';
  if (eventDate.getTime() === now.getTime()) return 'today';
  return 'upcoming';
}

class EventService {
  constructor() {
    this.prefix = TABLE_PREFIX;
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  _addComputedFields(event) {
    if (!event) return null;
    return { ...event, computed_status: getComputedEventStatus(event) };
  }

  _addComputedFieldsToArray(events) {
    return events.map(event => this._addComputedFields(event));
  }

  /** Convert empty strings to null so MySQL datetime columns don't reject them */
  _nullIfEmpty(val) {
    return val === '' || val === undefined ? null : val;
  }

  /**
   * After any event create/update that touches scheduling or payment methods,
   * push the relevant fields to every linked quiz/elimination room.
   *
   * Synced fields:
   *   scheduled_at              ← event.start_datetime ?? event.event_date
   *   time_zone                 ← event.time_zone
   *   linked_payment_methods_json ← event.payment_methods_json
   *
   * Only fields present in `changes` are synced — so a title-only edit
   * won't touch the quiz room at all.
   */
  async _syncLinkedRooms(eventId, clubId, changes) {
    // Nothing to sync?
    const hasSchedule = 'start_datetime' in changes || 'event_date' in changes;
    const hasTimezone = 'time_zone' in changes;
    const hasPayments = 'payment_methods_json' in changes;

    if (!hasSchedule && !hasTimezone && !hasPayments) return;

    // Find all linked quiz / elimination rooms for this event
    const [integrations] = await connection.execute(
      `SELECT external_ref, integration_type
       FROM ${this.prefix}event_integrations
       WHERE event_id = ? AND club_id = ?
         AND integration_type IN ('quiz_web2', 'elimination')`,
      [eventId, clubId]
    );

    if (!integrations?.length) return;

    for (const integration of integrations) {
      const roomId = integration.external_ref;
      try {
        // ── 1. Sync scheduling / timezone ────────────────────────────────
        if (hasSchedule || hasTimezone) {
          const scheduledAt = hasSchedule
            ? this._nullIfEmpty(changes.start_datetime ?? changes.event_date)
            : undefined;
          const timeZone = hasTimezone
            ? this._nullIfEmpty(changes.time_zone)
            : undefined;

          // Only build SET clause for fields that are actually changing
          const setClauses = [];
          const params = [];

          if (scheduledAt !== undefined) {
            setClauses.push('scheduled_at = ?');
            params.push(scheduledAt);
          }
          if (timeZone !== undefined) {
            setClauses.push('time_zone = ?');
            params.push(timeZone);
          }

          if (setClauses.length > 0) {
            params.push(roomId, clubId);
            await connection.execute(
              `UPDATE ${this.prefix}web2_quiz_rooms
               SET ${setClauses.join(', ')}, updated_at = UTC_TIMESTAMP()
               WHERE room_id = ? AND club_id = ?`,
              params
            );

            // Also keep event_integrations cache in sync
            const eiSetClauses = [];
            const eiParams = [];
            if (scheduledAt !== undefined) {
              eiSetClauses.push('scheduled_at = ?');
              eiParams.push(scheduledAt);
            }
            if (timeZone !== undefined) {
              eiSetClauses.push('time_zone = ?');
              eiParams.push(timeZone);
            }
            eiParams.push(eventId, clubId, roomId);
            await connection.execute(
              `UPDATE ${this.prefix}event_integrations
               SET ${eiSetClauses.join(', ')}
               WHERE event_id = ? AND club_id = ? AND external_ref = ?`,
              eiParams
            );
          }
        }

        // ── 2. Sync payment methods ───────────────────────────────────────
        if (hasPayments && changes.payment_methods_json) {
          const pm = typeof changes.payment_methods_json === 'string'
            ? JSON.parse(changes.payment_methods_json)
            : changes.payment_methods_json;

          if (pm) {
            const pmService = new QuizPaymentMethodsService();
            await pmService.updateLinkedPaymentMethods({
              roomId,
              clubId,
              ticketMethodIds:  pm.ticket_method_ids  || [],
              onnightMethodIds: pm.onnight_method_ids || [],
            });
          }
        }

        console.log(`[EventService] Synced room ${roomId} for event ${eventId}`);
      } catch (err) {
        // Log but never let a room sync failure roll back the event update
        console.warn(`[EventService] Failed to sync room ${roomId}:`, err.message);
      }
    }
  }

  // ── CRUD ───────────────────────────────────────────────────────────────────

  async createEvent(clubId, eventData) {
    const {
      title, type, summary, description,
      location_type, location_label, online_url, venue,
      primary_action_type, primary_action_label, primary_action_url,
      event_date, start_datetime, end_datetime, time_zone,
      max_participants, goal_amount, campaign_id,
      external_source, external_ref,
      payment_methods_json,
    } = eventData;

    if (campaign_id) {
      const [campaignRows] = await connection.execute(
        `SELECT club_id FROM ${this.prefix}campaigns WHERE id = ?`,
        [campaign_id]
      );
      if (!Array.isArray(campaignRows) || campaignRows.length === 0) throw new Error('Campaign not found');
      if (campaignRows[0].club_id !== clubId) throw new Error('Campaign does not belong to your club');
    }

    const eventId = uuidv4();
    const finalLocationLabel = location_label || venue || null;

    const pmJson = payment_methods_json
      ? (typeof payment_methods_json === 'string' ? payment_methods_json : JSON.stringify(payment_methods_json))
      : null;

    await connection.execute(
      `INSERT INTO ${this.prefix}events (
        id, club_id, campaign_id, title, summary, type, description,
        location_type, location_label, online_url, venue,
        primary_action_type, primary_action_label, primary_action_url,
        max_participants, goal_amount,
        event_date, start_datetime, end_datetime, time_zone,
        external_source, external_ref,
        payment_methods_json,
        status, is_published
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft', FALSE)`,
      [
        eventId, clubId, campaign_id || null,
        title, summary || null, type || 'fundraising_event', description || null,
        location_type || 'in_person', finalLocationLabel, online_url || null, venue || null,
        primary_action_type || 'attend', primary_action_label || null, primary_action_url || null,
        max_participants || null, goal_amount,
        event_date || null, start_datetime || null, end_datetime || null, time_zone || null,
        external_source || null, external_ref || null,
        pmJson,
      ]
    );

    // Sync to any rooms already linked (unlikely on create but safe to call)
    if (pmJson || start_datetime || event_date || time_zone) {
      await this._syncLinkedRooms(eventId, clubId, {
        ...(start_datetime && { start_datetime }),
        ...(event_date     && { event_date }),
        ...(time_zone      && { time_zone }),
        ...(pmJson         && { payment_methods_json: pmJson }),
      });
    }

    const [rows] = await connection.execute(
      `SELECT * FROM ${this.prefix}events WHERE id = ?`,
      [eventId]
    );
    return this._addComputedFields(Array.isArray(rows) ? rows[0] : null);
  }

  async updateEvent(eventId, clubId, updateData) {
    // ── Normalise empty strings → null for all nullable columns ────────────
    const nullableFields = [
      'start_datetime', 'end_datetime', 'event_date', 'time_zone',
      'online_url', 'location_label', 'summary', 'description', 'campaign_id',
    ];
    nullableFields.forEach(f => {
      if (f in updateData) updateData[f] = this._nullIfEmpty(updateData[f]);
    });

    // ── Campaign ownership check ────────────────────────────────────────────
    if (updateData.campaign_id !== undefined) {
      if (!updateData.campaign_id) {
        updateData.campaign_id = null;
      } else {
        const [campaignRows] = await connection.execute(
          `SELECT club_id FROM ${this.prefix}campaigns WHERE id = ?`,
          [updateData.campaign_id]
        );
        if (!Array.isArray(campaignRows) || campaignRows.length === 0) throw new Error('Campaign not found');
        if (campaignRows[0].club_id !== clubId) throw new Error('Campaign does not belong to your club');
      }
    }

    if (updateData.venue && !updateData.location_label) {
      updateData.location_label = updateData.venue;
    }

    // ── Normalise payment_methods_json ─────────────────────────────────────
    if (updateData.payment_methods_json !== undefined && updateData.payment_methods_json !== null) {
      if (typeof updateData.payment_methods_json === 'object') {
        updateData.payment_methods_json = JSON.stringify(updateData.payment_methods_json);
      }
    }

    const allowedFields = [
      'title', 'summary', 'type', 'description',
      'location_type', 'location_label', 'online_url', 'venue',
      'primary_action_type', 'primary_action_label', 'primary_action_url',
      'max_participants', 'goal_amount', 'actual_amount',
      'event_date', 'start_datetime', 'end_datetime', 'time_zone',
      'status', 'campaign_id', 'is_published',
      'external_source', 'external_ref',
      'impact_reported', 'impact_status', 'overhead_allocation',
      'payment_methods_json',
    ];

    const updateFields = Object.keys(updateData).filter(key =>
      allowedFields.includes(key) && updateData[key] !== undefined
    );

    if (updateFields.length === 0) throw new Error('No valid fields to update');

    const setClause = updateFields.map(field => `${field} = ?`).join(', ');
    const values = [...updateFields.map(field => updateData[field]), eventId, clubId];

    const [result] = await connection.execute(
      `UPDATE ${this.prefix}events SET ${setClause} WHERE id = ? AND club_id = ?`,
      values
    );

    if (result.affectedRows === 0) throw new Error('Event not found or no changes made');

    // ── Sync scheduling + payment methods to any linked quiz rooms ──────────
    await this._syncLinkedRooms(eventId, clubId, updateData);

    return await this.getEventById(eventId, clubId);
  }

  async publishEvent(eventId, clubId) {
    const [result] = await connection.execute(
      `UPDATE ${this.prefix}events SET is_published = TRUE, status = 'live' WHERE id = ? AND club_id = ?`,
      [eventId, clubId]
    );
    if (result.affectedRows === 0) throw new Error('Event not found');
    return await this.getEventById(eventId, clubId);
  }

  async unpublishEvent(eventId, clubId) {
    const [result] = await connection.execute(
      `UPDATE ${this.prefix}events SET is_published = FALSE, status = 'draft' WHERE id = ? AND club_id = ?`,
      [eventId, clubId]
    );
    if (result.affectedRows === 0) throw new Error('Event not found');
    return await this.getEventById(eventId, clubId);
  }

  async getEventsByClub(clubId) {
    const [rows] = await connection.execute(
      `SELECT e.*, c.name as campaign_name
       FROM ${this.prefix}events e
       LEFT JOIN ${this.prefix}campaigns c ON e.campaign_id = c.id
       WHERE e.club_id = ?
       ORDER BY CASE WHEN e.start_datetime IS NOT NULL THEN e.start_datetime ELSE e.event_date END DESC`,
      [clubId]
    );
    return this._addComputedFieldsToArray(rows || []);
  }

  async getPublishedEventsByClub(clubId) {
    const [rows] = await connection.execute(
      `SELECT e.*, c.name as campaign_name
       FROM ${this.prefix}events e
       LEFT JOIN ${this.prefix}campaigns c ON e.campaign_id = c.id
       WHERE e.club_id = ? AND e.is_published = TRUE AND e.status != 'ended'
       ORDER BY CASE WHEN e.start_datetime IS NOT NULL THEN e.start_datetime ELSE e.event_date END DESC`,
      [clubId]
    );
    return this._addComputedFieldsToArray(rows || []);
  }

  async getEventById(eventId, clubId) {
    const [rows] = await connection.execute(
      `SELECT e.*, c.name as campaign_name
       FROM ${this.prefix}events e
       LEFT JOIN ${this.prefix}campaigns c ON e.campaign_id = c.id
       WHERE e.id = ? AND e.club_id = ?`,
      [eventId, clubId]
    );
    const event = Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
    return this._addComputedFields(event);
  }

  async getEventsByCampaign(campaignId, clubId) {
    const [rows] = await connection.execute(
      `SELECT e.*, c.name as campaign_name
       FROM ${this.prefix}events e
       LEFT JOIN ${this.prefix}campaigns c ON e.campaign_id = c.id
       WHERE e.campaign_id = ? AND e.club_id = ?
       ORDER BY CASE WHEN e.start_datetime IS NOT NULL THEN e.start_datetime ELSE e.event_date END DESC`,
      [campaignId, clubId]
    );
    return this._addComputedFieldsToArray(rows || []);
  }

  async getEventsByStatus(clubId, status) {
    const [rows] = await connection.execute(
      `SELECT e.*, c.name as campaign_name
       FROM ${this.prefix}events e
       LEFT JOIN ${this.prefix}campaigns c ON e.campaign_id = c.id
       WHERE e.club_id = ? AND e.status = ?
       ORDER BY CASE WHEN e.start_datetime IS NOT NULL THEN e.start_datetime ELSE e.event_date END DESC`,
      [clubId, status]
    );
    return this._addComputedFieldsToArray(rows || []);
  }

  async getUpcomingEvents(clubId, limit = 5) {
    const [rows] = await connection.execute(
      `SELECT e.*, c.name as campaign_name
       FROM ${this.prefix}events e
       LEFT JOIN ${this.prefix}campaigns c ON e.campaign_id = c.id
       WHERE e.club_id = ?
       AND ((e.start_datetime IS NOT NULL AND e.start_datetime >= NOW()) OR (e.start_datetime IS NULL AND e.event_date >= CURDATE()))
       AND e.status != 'ended'
       ORDER BY CASE WHEN e.start_datetime IS NOT NULL THEN e.start_datetime ELSE e.event_date END ASC
       LIMIT ?`,
      [clubId, limit]
    );
    return this._addComputedFieldsToArray(rows || []);
  }

  async deleteEvent(eventId, clubId) {
    const [expenseRows] = await connection.execute(
      `SELECT COUNT(*) as expense_count FROM ${this.prefix}expenses WHERE event_id = ?`,
      [eventId]
    );
    const [incomeRows] = await connection.execute(
      `SELECT COUNT(*) as income_count FROM ${this.prefix}income WHERE event_id = ?`,
      [eventId]
    );
    const expenseCount = Array.isArray(expenseRows) ? expenseRows[0].expense_count : 0;
    const incomeCount  = Array.isArray(incomeRows)  ? incomeRows[0].income_count  : 0;
    if (expenseCount > 0 || incomeCount > 0) throw new Error('Cannot delete event with associated financial records');

    const [result] = await connection.execute(
      `DELETE FROM ${this.prefix}events WHERE id = ? AND club_id = ?`,
      [eventId, clubId]
    );
    return result.affectedRows > 0;
  }

  async getEventFinancials(eventId, clubId) {
    const event = await this.getEventById(eventId, clubId);
    if (!event) return null;

    const [incomeRows] = await connection.execute(
      `SELECT source, payment_method, SUM(amount) as total_amount, COUNT(*) as transaction_count
       FROM ${this.prefix}income WHERE event_id = ? GROUP BY source, payment_method ORDER BY total_amount DESC`,
      [eventId]
    );
    const [expenseRows] = await connection.execute(
      `SELECT category, payment_method, status, SUM(amount) as total_amount, COUNT(*) as transaction_count
       FROM ${this.prefix}expenses WHERE event_id = ? GROUP BY category, payment_method, status ORDER BY total_amount DESC`,
      [eventId]
    );
    const [totalIncomeRows] = await connection.execute(
      `SELECT COALESCE(SUM(amount), 0) as total_income FROM ${this.prefix}income WHERE event_id = ?`,
      [eventId]
    );
    const [totalExpenseRows] = await connection.execute(
      `SELECT COALESCE(SUM(amount), 0) as total_expenses FROM ${this.prefix}expenses WHERE event_id = ?`,
      [eventId]
    );

    const totalIncome   = Array.isArray(totalIncomeRows)  ? totalIncomeRows[0].total_income   : 0;
    const totalExpenses = Array.isArray(totalExpenseRows) ? totalExpenseRows[0].total_expenses : 0;

    return {
      event,
      financial_summary: {
        total_income: totalIncome, total_expenses: totalExpenses,
        net_profit: totalIncome - totalExpenses,
        goal_amount: event.goal_amount,
        overhead_allocation: event.overhead_allocation || 0,
        progress_percentage: event.goal_amount > 0 ? Math.round((totalIncome / event.goal_amount) * 100) : 0,
      },
      income_breakdown:  incomeRows  || [],
      expense_breakdown: expenseRows || [],
    };
  }

  async updateEventFinancials(eventId) {
    const [incomeRows] = await connection.execute(
      `SELECT COALESCE(SUM(amount), 0) as total_income FROM ${this.prefix}income WHERE event_id = ?`,
      [eventId]
    );
    const totalIncome = Array.isArray(incomeRows) ? incomeRows[0].total_income : 0;
    const [expenseRows] = await connection.execute(
      `SELECT COALESCE(SUM(amount), 0) as total_expenses FROM ${this.prefix}expenses WHERE event_id = ?`,
      [eventId]
    );
    const totalExpenses = Array.isArray(expenseRows) ? expenseRows[0].total_expenses : 0;
    await connection.execute(
      `UPDATE ${this.prefix}events SET actual_amount = ?, total_expenses = ?, net_profit = ? WHERE id = ?`,
      [totalIncome, totalExpenses, totalIncome - totalExpenses, eventId]
    );
    return { total_income: totalIncome, total_expenses: totalExpenses, net_profit: totalIncome - totalExpenses };
  }

  async getEventIntegrations(eventId) {
    const [rows] = await connection.execute(
      `SELECT * FROM ${this.prefix}event_integrations WHERE event_id = ?`,
      [eventId]
    );
    return { integrations: rows || [] };
  }
}

export default EventService;