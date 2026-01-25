// src/components/Quiz/services/EventIntegrationsService.ts

import BaseService from './BaseService';

export type EventIntegration = {
  id: number;
  event_id: string;
  club_id: string;
  integration_type: string;
  external_ref: string;
  status?: string | null;
  scheduled_at?: string | null;
  ended_at?: string | null;
  time_zone?: string | null;
  metadata_json?: any;
  created_at?: string;
  updated_at?: string;
};

export type ClubEventOption = {
  id: string;
  title: string;
  start_datetime?: string | null;
  event_date?: string | null;
  status?: string | null;
  is_published?: number | boolean | null;
};

export type IntegrationLookupLink = {
  external_ref: string; // e.g. room_id
  event_id: string;
  event_title: string;
};

class EventIntegrationsService extends BaseService {
  /**
   * ---------------------------------------------
   * Collection routes (STATIC) - keep these first
   * ---------------------------------------------
   */

  /**
   * Dropdown feed: list events for the logged-in club
   * GET /api/events
   */
  listClubEvents() {
    return this.request<{ events: ClubEventOption[]; total: number }>(
      `/events`,
      { method: 'GET' }
    );
  }

  /**
   * Batch lookup: resolve room_ids (external_refs) -> event title
   * POST /api/event-integrations/lookup
   * 
   * This is the recommended method for bulk fetching linked events in the dashboard.
   * It returns simplified data with just external_ref, event_id, and event_title.
   */
  lookupLinks(payload: { integration_type: string; external_refs: string[] }) {
    return this.request<{ links: IntegrationLookupLink[]; total: number }>(
      `/event-integrations/lookup`,
      { method: 'POST', body: JSON.stringify(payload) }
    );
  }

  /**
   * --------------------------------------------------------
   * Parameterised routes (eventId) - keep after static routes
   * --------------------------------------------------------
   */

  /**
   * List all integrations for a specific event
   * GET /api/events/:eventId/integrations
   */
  list(eventId: string) {
    return this.request<{ integrations: EventIntegration[]; total: number }>(
      `/events/${eventId}/integrations`,
      { method: 'GET' }
    );
  }

  /**
   * Link an integration to an event
   * POST /api/events/:eventId/integrations
   */
  link(
    eventId: string,
    payload: {
      integration_type: string;
      external_ref: string;
      status?: string | null;
      scheduled_at?: string | null;
      ended_at?: string | null;
      time_zone?: string | null;
      meta?: any;
    }
  ) {
    return this.request<{ message: string; integration: EventIntegration }>(
      `/events/${eventId}/integrations`,
      { method: 'POST', body: JSON.stringify(payload) }
    );
  }

  /**
   * Unlink an integration from an event
   * DELETE /api/events/:eventId/integrations/:integrationId
   */
  unlink(eventId: string, integrationId: number) {
    return this.request<{ message: string }>(
      `/events/${eventId}/integrations/${integrationId}`,
      { method: 'DELETE' }
    );
  }
}

export const eventIntegrationsService = new EventIntegrationsService();

