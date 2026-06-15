// src/components/mgtsystem/services/eventsServices.ts

import BaseService from './BaseService';
import type {
  Event,
  CreateEventForm,
  UpdateEventForm,
  LocationType,
  PrimaryActionType,
  EventStatus
} from '../types/event';

class EventsService extends BaseService {

  /**
   * Get all events for a club
   */
  async getClubEvents(clubId: string): Promise<{ events: Event[] }> {
    return this.request<{ events: Event[] }>(`/clubs/${clubId}/events`);
  }

  /**
   * Get a single event by ID
   */
  async getEvent(eventId: string): Promise<{ event: Event }> {
    return this.request<{ event: Event }>(`/events/${eventId}`);
  }

  /**
   * Create a new event (automatically saved as draft)
   * Note: clubId comes from JWT on the backend — not passed in the URL
   */
  async createEvent(_clubId: string, eventData: CreateEventForm): Promise<{ event: Event; message: string }> {
    return this.request<{ event: Event; message: string }>(`/events`, {
      method: 'POST',
      body: JSON.stringify(eventData),
    });
  }

  /**
   * Update an existing event
   */
  async updateEvent(eventId: string, eventData: UpdateEventForm): Promise<{ event: Event; message: string }> {
    return this.request<{ event: Event; message: string }>(`/events/${eventId}`, {
      method: 'PUT',
      body: JSON.stringify(eventData),
    });
  }

  /**
   * Delete an event
   */
  async deleteEvent(eventId: string): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/events/${eventId}`, {
      method: 'DELETE',
    });
  }

  /**
   * Publish an event (makes it public)
   */
  async publishEvent(eventId: string): Promise<{ message: string; event: Event }> {
    return this.request<{ message: string; event: Event }>(`/events/${eventId}/publish`, {
      method: 'PATCH',
    });
  }

  /**
   * Unpublish an event (makes it draft again)
   */
  async unpublishEvent(eventId: string): Promise<{ message: string; event: Event }> {
    return this.request<{ message: string; event: Event }>(`/events/${eventId}/unpublish`, {
      method: 'PATCH',
    });
  }

  /**
   * Get events by campaign
   */
  async getCampaignEvents(campaignId: string): Promise<{ events: Event[] }> {
    return this.request<{ events: Event[] }>(`/campaigns/${campaignId}/events`);
  }

  /**
   * Get upcoming events
   */
  async getUpcomingEvents(clubId: string): Promise<{ events: Event[] }> {
    return this.request<{ events: Event[] }>(`/clubs/${clubId}/events/upcoming`);
  }

  /**
   * Get past events (client-side filter)
   */
  async getPastEvents(clubId: string): Promise<{ events: Event[] }> {
    const response = await this.getClubEvents(clubId);
    const now = new Date();
    const pastEvents = response.events.filter(event => {
      const eventDate = event.start_datetime
        ? new Date(event.start_datetime)
        : new Date(event.event_date);
      return eventDate <= now;
    });
    return { events: pastEvents };
  }

  /**
   * Get public/published events for a club
   */
  async getPublicEvents(clubId: string): Promise<{ events: Event[] }> {
    return this.request<{ events: Event[] }>(`/clubs/${clubId}/events/published`);
  }

  /**
   * Update event status
   */
  async updateEventStatus(eventId: string, status: EventStatus): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/events/${eventId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  }

  /**
   * Get event financial breakdown
   */
  async getEventFinancials(eventId: string): Promise<any> {
    return this.request<any>(`/events/${eventId}/financials`);
  }

  /**
   * Get event integrations (linked quiz rooms / activities)
   */
  async getEventIntegrations(eventId: string): Promise<any> {
    return this.request<any>(`/events/${eventId}/integrations`);
  }

  // ── Client-side helpers ───────────────────────────────────────────────────

  validateEventData(data: CreateEventForm): string[] {
    const errors: string[] = [];

    if (!data.title?.trim()) errors.push('Event title is required');
    if (!data.goal_amount || data.goal_amount <= 0) errors.push('Goal amount must be greater than 0');
    if (data.summary && data.summary.length > 280) errors.push('Summary must be 280 characters or less');

    if (data.location_type === 'online' || data.location_type === 'hybrid') {
      if (!data.online_url?.trim()) errors.push('Online URL is required for online/hybrid events');
    }

    if (!data.event_date && !data.start_datetime) errors.push('Event date is required');

    if (data.event_date) {
      const eventDate = new Date(data.event_date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (eventDate < today) errors.push('Event date cannot be in the past');
    }

    if (data.start_datetime && data.end_datetime) {
      if (new Date(data.end_datetime) <= new Date(data.start_datetime)) {
        errors.push('End time must be after start time');
      }
    }

    return errors;
  }

  calculateProgress(goalAmount: number, actualAmount: number): number {
    if (goalAmount === 0) return 0;
    return Math.min((actualAmount / goalAmount) * 100, 100);
  }

  getEventStatusBadge(event: Event): { color: string; label: string } {
    const now = new Date();
    const eventDate = event.start_datetime
      ? new Date(event.start_datetime)
      : new Date(event.event_date);

    if (event.status === 'ended' || eventDate < now) return { color: 'gray', label: 'Ended' };
    if (event.status === 'live' && event.is_published) return { color: 'green', label: 'Live' };
    if (event.status === 'draft' || !event.is_published) return { color: 'yellow', label: 'Draft' };
    return { color: 'blue', label: 'Scheduled' };
  }

  canEditEvent(event: Event): boolean {
    const eventDate = event.start_datetime
      ? new Date(event.start_datetime)
      : new Date(event.event_date);
    return eventDate > new Date() || event.status === 'draft';
  }

  canDeleteEvent(event: Event): boolean {
    return (event.actual_amount || 0) === 0 && (event.total_expenses || 0) === 0;
  }

  getLocationDisplay(event: Event): string {
    if (event.location_type === 'online') return event.location_label || 'Online Event';
    if (event.location_type === 'hybrid') return `${event.location_label || 'Venue TBA'} + Online`;
    return event.location_label || event.venue || 'Venue TBA';
  }

  getActionDisplay(event: Event): string {
    if (event.primary_action_label) return event.primary_action_label;
    const actionLabels: Record<PrimaryActionType, string> = {
      attend:     'Attend Event',
      donate:     'Donate Now',
      buy:        'Buy Tickets',
      volunteer:  'Sign Up to Help',
      register:   'Register Now',
      learn_more: 'Learn More',
    };
    return actionLabels[event.primary_action_type] || 'Learn More';
  }

  eventRequiresUrl(event: Event): boolean {
    if (event.location_type === 'online' || event.location_type === 'hybrid') return true;
    if (['buy', 'register', 'learn_more'].includes(event.primary_action_type)) return true;
    return false;
  }

  async getEventsByLocationType(clubId: string, locationType: LocationType): Promise<{ events: Event[] }> {
    const response = await this.getClubEvents(clubId);
    return { events: response.events.filter(e => e.location_type === locationType) };
  }

  async getEventsByActionType(clubId: string, actionType: PrimaryActionType): Promise<{ events: Event[] }> {
    const response = await this.getClubEvents(clubId);
    return { events: response.events.filter(e => e.primary_action_type === actionType) };
  }

  async getEventsNeedingImpactReports(clubId: string): Promise<{ events: Event[] }> {
    const response = await this.getClubEvents(clubId);
    const now = new Date();
    return {
      events: response.events.filter(event => {
        const eventDate = event.start_datetime
          ? new Date(event.start_datetime)
          : new Date(event.event_date);
        return eventDate < now && !event.impact_reported;
      }),
    };
  }
}

const eventsService = new EventsService();
export default eventsService;