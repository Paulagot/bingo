// types.ts - Updated Event Types for New Schema

export type LocationType = 'in_person' | 'online' | 'hybrid';
export type PrimaryActionType = 'attend' | 'donate' | 'buy' | 'volunteer' | 'register' | 'learn_more';
export type EventStatus = 'draft' | 'live' | 'ended';
export type ImpactStatus = 'pending' | 'in_progress' | 'complete';

/**
 * Main Event interface matching the new database schema
 * Events capture "what/when/where/action"
 */
export interface Event {
  // Core identifiers
  id: string;
  club_id: string;
  campaign_id: string | null;
  
  // Event identity (the "what")
  title: string;
  summary: string | null; // Max 280 chars - like a tweet
  type: string; // Free-form: "quiz", "dinner", "concert", "auction", etc.
  description: string | null;
  
  // Location details (the "where")
  venue: string | null; // Deprecated but kept for backward compatibility
  location_type: LocationType;
  location_label: string | null; // e.g., "Dublin Community Center" or "Zoom Webinar"
  online_url: string | null;
  
  // Call to action (the "action")
  primary_action_type: PrimaryActionType;
  primary_action_label: string | null; // Custom label, max 64 chars
  primary_action_url: string | null;
  
  // Event logistics
  max_participants: number | null;
  
  // Fundraising goals
  goal_amount: number;
  actual_amount: number;
  total_expenses: number;
  net_profit: number;
  overhead_allocation: number;
  
  // Timing (the "when")
  event_date: string; // Simple date for backward compatibility
  start_datetime: string | null; // Full datetime
  end_datetime: string | null;
  time_zone: string | null; // e.g., "Europe/Dublin"
  
  // Status and publishing
  status: EventStatus;
  is_published: boolean;
  
  // Impact tracking
  impact_reported: boolean;
  impact_status: ImpactStatus;
  
  // External integration
  external_source: string | null; // e.g., "eventbrite", "ticketmaster"
  external_ref: string | null; // External event ID
  
  // Metadata
  created_at: string;
  
  // Payment method selections (ticket vs on-night)
  payment_methods_json?: {
    ticket_method_ids:  number[];
    onnight_method_ids: number[];
  } | null;

  // Computed/joined fields
  campaign_name?: string;
  computed_status?: string;
}

/**
 * Form data for creating events
 */
export interface CreateEventForm {
  // Required core fields
  title: string;
  type: string;
  goal_amount: number;
  
  // Summary (Twitter-style pitch)
  summary?: string;
  
  // Location details
  location_type: LocationType;
  location_label?: string;
  online_url?: string;
  
  // Legacy venue field (will be migrated to location_label)
  venue?: string;
  
  // Call to action
  primary_action_type: PrimaryActionType;
  primary_action_label?: string;
  primary_action_url?: string;
  
  // Timing
  event_date?: string; // Simple date
  start_datetime?: string; // Full datetime
  end_datetime?: string;
  time_zone?: string;
  
  // Optional fields
  description?: string;
  max_participants?: number;
  campaign_id?: string;
  
  // External integration
  external_source?: string;
  external_ref?: string;

  // Payment method selections (collected in CreateEventForm, saved to event then applied to the linked room)
  ticket_method_ids?:  number[];
  onnight_method_ids?: number[];
  payment_methods_json?: { ticket_method_ids: number[]; onnight_method_ids: number[] } | null;
}

/**
 * Form data for updating events
 */
export interface UpdateEventForm extends Partial<CreateEventForm> {
  is_published?: boolean;
  status?: EventStatus;
  impact_reported?: boolean;
  impact_status?: ImpactStatus;
  actual_amount?: number;
  total_expenses?: number;
  overhead_allocation?: number;
}

/**
 * Location configuration helper
 */
export interface EventLocation {
  type: LocationType;
  label: string;
  url?: string;
  displayText: string; // Computed display string
}

/**
 * Primary action configuration
 */
export interface EventAction {
  type: PrimaryActionType;
  label: string;
  url?: string;
  displayText: string; // e.g., "Buy Tickets", "Register Now"
}

/**
 * Event type suggestions (replacing the old enum)
 */
export const EVENT_TYPE_SUGGESTIONS = [
  // Traditional fundraisers
  'Dinner Dance',
  'Gala',
  'Auction',
  'Raffle',
  'Quiz Night',
  'Bingo',
  
  // Sports & Activities
  'Sports Tournament',
  'Fun Run',
  'Cycle',
  'Swim',
  'Sponsored Challenge',
  
  // Entertainment
  'Concert',
  'Comedy Night',
  'Theater Performance',
  'Film Screening',
  
  // Community
  'Community Fair',
  'Market Day',
  'Festival',
  'Open Day',
  
  // Online
  'Virtual Event',
  'Webinar',
  'Live Stream',
  
  // Other
  'Workshop',
  'Conference',
  'Exhibition',
  'Other'
] as const;

/**
 * Location type metadata
 */
export const LOCATION_TYPE_META: Record<LocationType, {
  label: string;
  description: string;
  icon: string;
}> = {
  in_person: {
    label: 'In-Person',
    description: 'Physical venue with an address',
    icon: 'MapPin'
  },
  online: {
    label: 'Online',
    description: 'Virtual event with a link',
    icon: 'Globe'
  },
  hybrid: {
    label: 'Hybrid',
    description: 'Both in-person and online',
    icon: 'Layers'
  }
};

/**
 * Primary action type metadata
 */
export const ACTION_TYPE_META: Record<PrimaryActionType, {
  label: string;
  defaultLabel: string;
  icon: string;
  description: string;
}> = {
  attend: {
    label: 'Attend',
    defaultLabel: 'Attend Event',
    icon: 'Calendar',
    description: 'For events where people show up'
  },
  donate: {
    label: 'Donate',
    defaultLabel: 'Donate Now',
    icon: 'Heart',
    description: 'Direct donation appeals'
  },
  buy: {
    label: 'Buy',
    defaultLabel: 'Buy Tickets',
    icon: 'Ticket',
    description: 'Purchase tickets, merchandise, etc.'
  },
  volunteer: {
    label: 'Volunteer',
    defaultLabel: 'Sign Up to Help',
    icon: 'Users',
    description: 'Volunteer recruitment'
  },
  register: {
    label: 'Register',
    defaultLabel: 'Register Now',
    icon: 'UserPlus',
    description: 'Event registration or sign-up'
  },
  learn_more: {
    label: 'Learn More',
    defaultLabel: 'Learn More',
    icon: 'Info',
    description: 'Information and awareness'
  }
};

/**
 * Event validation errors
 */
export interface EventValidationErrors {
  title?: string;
  type?: string;
  goal_amount?: string;
  location_type?: string;
  location_label?: string;
  online_url?: string;
  event_date?: string;
  start_datetime?: string;
  end_datetime?: string;
  primary_action_type?: string;
  primary_action_url?: string;
  summary?: string;
}

/**
 * Helper function to format event location for display
 */
export function formatEventLocation(event: Event): string {
  if (event.location_type === 'online') {
    return event.location_label || 'Online Event';
  }
  
  if (event.location_type === 'hybrid') {
    const label = event.location_label || 'Venue TBA';
    return `${label} + Online`;
  }
  
  // in_person
  return event.location_label || event.venue || 'Venue TBA';
}

/**
 * Helper function to get primary action display text
 */
export function formatEventAction(event: Event): string {
  if (event.primary_action_label) {
    return event.primary_action_label;
  }
  
  return ACTION_TYPE_META[event.primary_action_type]?.defaultLabel || 'Learn More';
}

/**
 * Helper to check if event requires a URL
 */
export function eventRequiresUrl(event: Event): boolean {
  // Online/hybrid events need a URL
  if (event.location_type === 'online' || event.location_type === 'hybrid') {
    return true;
  }
  
  // Some actions need URLs
  if (['buy', 'register', 'learn_more'].includes(event.primary_action_type)) {
    return true;
  }
  
  return false;
}