// Core TypeScript interfaces for FundRaisely Club - Updated Version

// ===== BASIC ENTITIES =====

export interface Club {
  id: string;
  name: string;
  email: string;
  password_hash?: string;
  created_at: string;
  entity_type?: EntityType;
}

export interface Campaign {
  id: string;
  club_id: string;
  name: string;
  description?: string;
  target_amount: number;
  actual_amount?: number;
  total_expenses?: number;
  net_profit?: number;
  overhead_allocation?: number;
  status?: 'draft' | 'active' | 'completed' | 'paused';
  category?: string;
  start_date?: string;
  end_date?: string;
  tags?: string[];
  total_events?: number;
  total_raised?: number;
  total_profit?: number;
  progress_percentage?: number;
  total_participants?: number;
  total_supporters?: number;
  total_prizes?: number;
  total_tasks?: number;
  total_income?: number;
  total_donations?: number;
  total_sponsors?: number;
  created_at: string;
  impact_area_ids?: string[];
  is_published?: boolean;
}

// ===== EVENT TYPES (NEW SCHEMA) =====

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
  
  // Computed/joined fields
  campaign_name?: string;
  computed_status?: 'draft' | 'scheduled' | 'live' | 'ended' | 'today';
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

// ===== onboarding & TRUST =====

// Entity type enum
export enum EntityType {
  CLUB = 'club',
  CHARITY = 'charity',
  SCHOOL = 'school',
  COMMUNITY_GROUP = 'community_group',
  CAUSE = 'cause'
}

// Onboarding status
export enum OnboardingStatus {
  DRAFT = 'draft',
  ENTITY_SETUP = 'entity_setup',
  PENDING_VERIFICATION = 'pending_verification',
  VERIFIED = 'verified',
  SUSPENDED = 'suspended'
}

// Legal structure
export enum LegalStructure {
  UNINCORPORATED_ASSOCIATION = 'unincorporated_association',
  COMPANY_LIMITED_BY_GUARANTEE = 'company_limited_by_guarantee',
  CHARITABLE_TRUST = 'charitable_trust',
  COMMUNITY_INTEREST_COMPANY = 'community_interest_company',
  OTHER = 'other'
}

// Country enum
export enum Country {
  IRELAND = 'IE',
  UK = 'GB'
}

// Main entity details interface
export interface EntityDetails {
  id: string;
  clubId: string;
  
  // Basic info
  legalName: string;
  tradingNames?: string[]; // Stored as JSON in DB
  description?: string;
  foundedYear?: number;
  
  // Address
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  countyState?: string;
  postalCode?: string;
  country: Country;
  
  // Ireland registrations
  ieCroNumber?: string;
  ieCharityChyNumber?: string;
  ieCharityRcn?: string;
  ieRevenueSportsBody: boolean;
  
  // UK registrations
  ukCompanyNumber?: string;
  ukCharityEnglandWales?: string;
  ukCharityScotland?: string;
  ukCharityNi?: string;
  ukCascRegistered: boolean;
  
  // Structure
  legalStructure: LegalStructure;
  isRegisteredCharity: boolean;
  isRegisteredCompany: boolean;
  
  // Verification
  registrationVerified: boolean;
  verificationNotes?: string;
  verifiedAt?: Date;
  verifiedBy?: string;
  
  // Audit
  createdAt: Date;
  updatedAt: Date;
}

// Form data interfaces for frontend
export interface EntitySetupFormData {
  // Step 1: Basic Info
  legalName: string;
  tradingNames: string[];
  description: string;
  foundedYear: number;
  
  // Step 2: Address
  addressLine1: string;
  addressLine2?: string;
  city: string;
  countyState: string;
  postalCode: string;
  country: Country;
  
  // Step 3: Legal Structure
  legalStructure: LegalStructure;
  
  // Step 4: Registration Details (conditional based on country)
  registrationDetails: IrelandRegistration | UKRegistration;
}

export interface IrelandRegistration {
  croNumber?: string;
  charityChyNumber?: string;
  charityRcn?: string;
  revenueSportsBody: boolean;
}

export interface UKRegistration {
  companyNumber?: string;
  charityEnglandWales?: string;
  charityScotland?: string;
  charityNi?: string;
  cascRegistered: boolean;
}

// ===== SUPPORTER & CRM SYSTEM =====

export interface Supporter {
  // Core identification
  id: string;
  club_id: string;
  name: string;
  type: 'volunteer' | 'donor' | 'sponsor';
  notes?: string;
  
  // Contact information
  email?: string;
  phone?: string;
  address_line1?: string;
  address_line2?: string;
  city?: string;
  state_province?: string;
  postal_code?: string;
  country?: string;
  preferred_contact_method?: 'email' | 'phone' | 'post' | 'sms';
  
  // Relationship management
  relationship_strength?: 'prospect' | 'new' | 'regular' | 'major' | 'lapsed' | 'inactive';
  contact_source?: 'website' | 'event' | 'referral' | 'social_media' | 'cold_outreach' | 'walk_in' | 'other';
  referral_source?: string;
  
  // Financial tracking (auto-calculated by backend)
  total_donated?: number;
  first_donation_date?: string;
  last_donation_date?: string;
  donation_count?: number;
  average_donation?: number;
  largest_donation?: number;
  
  // Volunteer tracking
  volunteer_hours_total?: number;
  volunteer_hours_this_year?: number;
  last_volunteer_date?: string;
  
  // Communication preferences
  email_subscribed?: boolean;
  sms_subscribed?: boolean;
  newsletter_subscribed?: boolean;
  event_notifications?: boolean;
  do_not_contact?: boolean;
  unsubscribe_reason?: string;
  
  // Flexible data (JSON fields)
  tags?: string[];
  interests?: string[];
  skills?: string[];
  communication_preferences?: Record<string, any>;
  
  // GDPR compliance
  gdpr_consent?: boolean;
  gdpr_consent_date?: string;
  data_protection_notes?: string;
  
  // Lifecycle management
  lifecycle_stage?: 'prospect' | 'first_time' | 'repeat' | 'major' | 'lapsed' | 'champion';
  next_contact_date?: string;
  priority_level?: 'low' | 'medium' | 'high' | 'urgent';
  last_contact_date?: string;
  last_updated?: string;
  created_at: string;
  is_archived: boolean;
}

export interface CreateSupporterData {
  // Core fields
  name: string;
  type: 'volunteer' | 'donor' | 'sponsor';
  notes?: string;
  
  // Contact information
  email?: string;
  phone?: string;
  address_line1?: string;
  address_line2?: string;
  city?: string;
  state_province?: string;
  postal_code?: string;
  country?: string;
  preferred_contact_method?: 'email' | 'phone' | 'post' | 'sms';
  
  // Relationship management
  relationship_strength?: 'prospect' | 'new' | 'regular' | 'major' | 'lapsed' | 'inactive';
  contact_source?: 'website' | 'event' | 'referral' | 'social_media' | 'cold_outreach' | 'walk_in' | 'other';
  referral_source?: string;
  
  // Communication preferences
  email_subscribed?: boolean;
  sms_subscribed?: boolean;
  newsletter_subscribed?: boolean;
  event_notifications?: boolean;
  do_not_contact?: boolean;
  
  // Lifecycle & Priority
  lifecycle_stage?: 'prospect' | 'first_time' | 'repeat' | 'major' | 'lapsed' | 'champion';
  priority_level?: 'low' | 'medium' | 'high' | 'urgent';
  next_contact_date?: string;
  
  // Flexible data
  tags?: string[];
  interests?: string[];
  skills?: string[];
  communication_preferences?: Record<string, any>;
  
  // GDPR
  gdpr_consent?: boolean;
  data_protection_notes?: string;
}

// ===== COMMUNICATION SYSTEM =====

export interface Communication {
  id: string;
  club_id: string;
  supporter_id: string;
  
  // Communication details
  type: 'call' | 'email' | 'meeting' | 'letter' | 'sms' | 'social_media' | 'event_interaction' | 'other';
  direction: 'inbound' | 'outbound';
  subject?: string;
  notes: string;
  outcome?: 'positive' | 'neutral' | 'negative' | 'no_response' | 'callback_requested';
  
  // Follow-up management
  follow_up_required?: boolean;
  follow_up_date?: string;
  follow_up_notes?: string;
  follow_up_completed?: boolean;
  
  // Context linking
  event_id?: string;
  campaign_id?: string;
  communication_channel?: string;
  
  // Additional metadata
  duration_minutes?: number;
  attachment_urls?: string[];
  tags?: string[];
  
  // Audit trail
  created_by?: string;
  created_by_name?: string;
  supporter_name?: string;
  supporter_email?: string;
  created_at: string;
  updated_at?: string;
}

export interface CreateCommunicationData {
  type: 'call' | 'email' | 'meeting' | 'letter' | 'sms' | 'social_media' | 'event_interaction' | 'other';
  direction: 'inbound' | 'outbound';
  notes: string;
  subject?: string;
  outcome?: 'positive' | 'neutral' | 'negative' | 'no_response' | 'callback_requested';
  follow_up_required?: boolean;
  follow_up_date?: string;
  follow_up_notes?: string;
  event_id?: string;
  campaign_id?: string;
  communication_channel?: string;
  duration_minutes?: number;
  attachment_urls?: string[];
  tags?: string[];
}

// ===== USER MANAGEMENT =====

export type UserRole = 'host' | 'admin' | 'treasurer' | 'communications' | 'volunteer';

export interface User {
  id: string;
  club_id: string;
  name: string;
  email: string;
  role: UserRole;
  created_at: string;
}

export interface CreateUserData {
  name: string;
  email: string;
  role: UserRole;
}

export interface UserPermissions {
  user_id: string;
  role: UserRole;
  permissions: string[];
}

export interface UserStats {
  total_users: number;
  by_role: {
    role: UserRole;
    count: number;
  }[];
}

// ===== PRIZE MANAGEMENT =====

export interface Prize {
  id: string;
  event_id: string;
  name: string;
  value: number;
  donated_by?: string;
  confirmed: boolean;
  created_at: string;
  donor_name?: string;
  donor_email?: string;
  event_title?: string;
  club_id?: string;
}

export interface CreatePrizeData {
  name: string;
  value?: number;
  donated_by?: string;
}

export interface PrizeStats {
  total_prizes: number;
  total_value: number;
  confirmed_prizes: number;
  donated_prizes: number;
  average_value: number;
}

// ===== TASK MANAGEMENT =====

export type TaskStatus = 'todo' | 'in_progress' | 'done';

export interface Task {
  id: string;
  event_id: string;
  title: string;
  assigned_to?: string;
  due_date?: string;
  status: TaskStatus;
  created_at: string;
  assigned_supporter_name?: string;
  assigned_user_name?: string;
  assigned_name?: string;
  assigned_email?: string;
  assigned_type?: 'supporter' | 'user' | 'unassigned';
  event_title?: string;
  club_id?: string;
  campaign_name?: string;
  days_overdue?: number;
  days_until_due?: number;
}

export interface CreateTaskData {
  title: string;
  assigned_to?: string;
  due_date?: string;
  status?: TaskStatus;
}

export interface TaskStats {
  total_tasks: number;
  todo_tasks: number;
  in_progress_tasks: number;
  completed_tasks: number;
  assigned_tasks: number;
  overdue_tasks: number;
}

// ===== FINANCIAL INTERFACES =====

export interface Expense {
  id: string;
  club_id: string;
  event_id?: string;
  campaign_id?: string;
  category: string;
  description: string;
  amount: number;
  date: string;
  receipt_url?: string;
  vendor?: string;
  payment_method: 'cash' | 'card' | 'transfer' | 'cheque' | 'other';
  status: 'pending' | 'approved' | 'paid';
  created_by: string;
  created_at: string;
}

export interface Income {
  id: string;
  club_id: string;
  event_id?: string;
  source: string;
  description: string;
  amount: number;
  date: string;
  payment_method: 'cash' | 'card' | 'transfer' | 'sponsorship' | 'donation' | 'ticket_sales' | 'other';
  reference?: string;
  created_at: string;
  campaign_id?: string;
}

export interface FinancialSummary {
  total_income: number;
  total_expenses: number;
  net_profit: number;
  pending_expenses: number;
  income_by_method: Record<string, number>;
  expenses_by_category: Record<string, number>;
  monthly_trends: Array<{
    month: string;
    income: number;
    expenses: number;
    profit: number;
  }>;
}

// ===== FORM INTERFACES =====

export interface RegisterClubForm {
  name: string;
  email: string;
  password: string;
}

export interface CreateCampaignForm {
  name: string;
  description: string;
  target_amount: number;
  category?: string;
  start_date?: string;
  end_date?: string;
  tags?: string[];
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
  max_participants?: number | null;
  campaign_id?: string;
  
  // External integration
  external_source?: string;
  external_ref?: string;
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

export interface CreateExpenseForm {
  category: string;
  description: string;
  amount: number;
  date: string;
  vendor?: string;
  payment_method: 'cash' | 'card' | 'transfer' | 'cheque' | 'other';
  receipt_url?: string;
  event_id?: string;
  campaign_id?: string;
}

export interface CreateIncomeForm {
  source: string;
  description: string;
  amount: number;
  date: string;
  payment_method: 'cash' | 'card' | 'transfer' | 'sponsorship' | 'donation' | 'ticket_sales' | 'allocated-funds' | 'other';
  reference?: string;
  event_id?: string;
  campaign_id?: string;
  supporter_id?: string;
}

export interface CreatePrizeForm {
  name: string;
  value: number;
  donated_by: string;
}

export interface CreateTaskForm {
  title: string;
  assigned_to: string;
  due_date: string;
}

// ===== ANALYTICS & STATS =====

export interface SupporterFilters {
  type?: 'volunteer' | 'donor' | 'sponsor';
  search?: string;
  relationship_strength?: 'prospect' | 'new' | 'regular' | 'major' | 'lapsed' | 'inactive';
  lifecycle_stage?: 'prospect' | 'first_time' | 'repeat' | 'major' | 'lapsed' | 'champion';
  priority_level?: 'low' | 'medium' | 'high' | 'urgent';
  limit?: number;
  offset?: number;
}

export interface DonorStats {
  total_donors: number;
  active_donors: number;
  recent_donors: number;
  new_donors_this_month: number;
  total_amount_raised: number;
  average_donor_value: number;
  largest_donor_amount: number;
  relationship_breakdown: Array<{ relationship_strength: string; count: number }>;
  lifecycle_breakdown: Array<{ lifecycle_stage: string; count: number }>;
}

export interface SupporterEngagement {
  supporter: Supporter;
  engagement: {
    total_donated: number;
    donation_count: number;
    average_donation: number;
    total_prizes_donated: number;
    total_prize_value: number;
    total_tasks_assigned: number;
    completed_tasks: number;
    pending_tasks: number;
    task_completion_rate: number;
    volunteer_hours_total: number;
    total_communications: number;
    last_contact_date?: string;
    relationship_strength: string;
    lifecycle_stage: string;
  };
  recent_communications: Communication[];
  prizes_donated: Prize[];
  tasks_assigned: Task[];
}

export interface EventSummary {
  event: Event;
  total_income: number;
  total_expenses: number;
  participant_count: number;
  prizes_awarded: Prize[];
  top_contributors: Supporter[];
  net_profit: number;
  expense_breakdown: Record<string, number>;
  income_breakdown: Record<string, number>;
}

export interface DashboardMetrics {
  total_raised: number;
  active_campaigns: number;
  upcoming_events: number;
  totalEvents: number;
  totalCampaigns: number;
  totalExpenses: number;
  totalIncome: number;
  netProfit: number;
  totalSupporters: number;
  totalDonors: number;
  totalVolunteers: number;
  totalSponsors: number;
  avgDonation: number;
  donorRetentionRate: number;
  totalUsers: number;
  totalPrizes: number;
  totalPrizeValue: number;
  totalTasks: number;
  overdueTasks: number;
  completedTasks: number;
  supporter_breakdown: {
    volunteers: number;
    donors: number;
    sponsors: number;
  };
  top_donors: Supporter[];
  recent_supporters: Supporter[];
  pending_follow_ups: number;
}

// ===== API RESPONSE TYPES =====

export interface ApiResponse<T> {
  message?: string;
  data?: T;
  error?: string;
}

export interface UserResponse extends ApiResponse<User> {
  user: User;
}

export interface UsersResponse extends ApiResponse<User[]> {
  users: User[];
}

export interface PrizeResponse extends ApiResponse<Prize> {
  prize: Prize;
}

export interface PrizesResponse extends ApiResponse<Prize[]> {
  prizes: Prize[];
}

export interface TaskResponse extends ApiResponse<Task> {
  task: Task;
}

export interface TasksResponse extends ApiResponse<Task[]> {
  tasks: Task[];
}

export interface BulkCreateResponse<T> {
  message: string;
  items: T[];
}

// ===== FILTER TYPES =====

export interface UserFilters {
  role?: UserRole;
  search?: string;
}

export interface PrizeFilters {
  confirmed?: boolean;
  donated_by?: string;
  min_value?: number;
  max_value?: number;
}

export interface TaskFilters {
  status?: TaskStatus;
  assigned_to?: string;
  overdue?: boolean;
  upcoming_days?: number;
}

// ===== FORM STATE TYPES =====

export interface UserFormState {
  name: string;
  email: string;
  role: UserRole;
  isSubmitting: boolean;
  errors: Record<string, string>;
}

export interface PrizeFormState {
  name: string;
  value: number;
  donated_by: string;
  isSubmitting: boolean;
  errors: Record<string, string>;
}

export interface TaskFormState {
  title: string;
  assigned_to: string;
  due_date: string;
  status: TaskStatus;
  isSubmitting: boolean;
  errors: Record<string, string>;
}

export interface ModalState {
  isOpen: boolean;
  mode: 'create' | 'edit';
  item?: any;
}

// ===== NAVIGATION & PERMISSIONS =====

export interface NavItem {
  path: string;
  label: string;
  icon?: string;
  roles?: UserRole[];
  children?: NavItem[];
}

export interface PermissionConfig {
  [key: string]: UserRole[];
}

export const PERMISSIONS: PermissionConfig = {
  manage_users: ['host', 'admin'],
  manage_campaigns: ['host', 'admin', 'communications'],
  manage_events: ['host', 'admin', 'communications'],
  manage_finances: ['host', 'admin', 'treasurer'],
  manage_supporters: ['host', 'admin', 'communications'],
  manage_prizes: ['host', 'admin', 'treasurer'],
  manage_tasks: ['host', 'admin', 'communications'],
  view_analytics: ['host', 'admin', 'treasurer', 'communications']
};

// ===== SOCKET EVENT TYPES =====

export interface SocketEvents {
  // Campaign events
  campaign_created: { campaign: Campaign };
  campaign_updated: { campaign: Campaign };
  
  // Event events
  event_created: { event: Event };
  event_updated: { event: Event };
  
  // Supporter events
  supporter_created: { supporter: Supporter };
  supporter_updated: { supporter: Supporter };
  supporter_deleted: { supporterId: string };
  
  // Communication events
  communication_logged: { communication: Communication };
  
  // User events
  user_created: { user: User };
  user_updated: { user: User };
  user_deleted: { userId: string };
  user_role_updated: { user: User };
  
  // Prize events
  prize_created: { prize: Prize };
  prize_updated: { prize: Prize };
  prize_deleted: { prizeId: string };
  prize_confirmed: { prize: Prize };
  
  // Task events
  task_created: { task: Task };
  task_updated: { task: Task };
  task_deleted: { taskId: string };
  task_status_updated: { task: Task };
  
  // Milestone events
  milestone_due: {
    event_id: string;
    milestone: string;
    message: string;
  };
}

// ===== COMPONENT PROPS TYPES =====

export interface UserCardProps {
  user: User;
  onEdit: (user: User) => void;
  onDelete: (userId: string) => void;
  onRoleChange: (userId: string, role: UserRole) => void;
  currentUserRole: UserRole;
}

export interface PrizeCardProps {
  prize: Prize;
  onEdit: (prize: Prize) => void;
  onDelete: (prizeId: string) => void;
  onConfirm: (prizeId: string) => void;
  canManage: boolean;
}

export interface TaskCardProps {
  task: Task;
  onEdit: (task: Task) => void;
  onDelete: (taskId: string) => void;
  onStatusChange: (taskId: string, status: TaskStatus) => void;
  canManage: boolean;
  showEvent?: boolean;
}

// ===== SERVICE & ERROR TYPES =====

export interface ServiceMethods {
  create: (data: any) => Promise<any>;
  getAll: (filters?: any) => Promise<any>;
  getById: (id: string) => Promise<any>;
  update: (id: string, data: any) => Promise<any>;
  delete: (id: string) => Promise<any>;
}

export interface ServiceError {
  message: string;
  status?: number;
  code?: string;
}

export interface LoadingStates {
  loading: boolean;
  creating: boolean;
  updating: boolean;
  deleting: boolean;
  error: string | null;
}

// ===== VALIDATION TYPES =====

export interface ValidationRule {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  custom?: (value: any) => string | null;
}

export interface ValidationRules {
  [fieldName: string]: ValidationRule;
}

// ===== STATE MANAGEMENT TYPES =====

export interface AppState {
  user: User | null;
  club: Club | null;
  campaigns: Campaign[];
  events: Event[];
  supporters: Supporter[];
  isLoading: boolean;
  error: string | null;
}

// ===== UTILITY TYPE ALIASES =====

export type RelationshipStrength = 'prospect' | 'new' | 'regular' | 'major' | 'lapsed' | 'inactive';
export type LifecycleStage = 'prospect' | 'first_time' | 'repeat' | 'major' | 'lapsed' | 'champion';
export type ContactSource = 'website' | 'event' | 'referral' | 'social_media' | 'cold_outreach' | 'walk_in' | 'other';
export type PriorityLevel = 'low' | 'medium' | 'high' | 'urgent';
export type PreferredContactMethod = 'email' | 'phone' | 'post' | 'sms';
export type SupporterType = 'volunteer' | 'donor' | 'sponsor';
export type CommunicationType = 'call' | 'email' | 'meeting' | 'letter' | 'sms' | 'social_media' | 'event_interaction' | 'other';
export type CommunicationOutcome = 'positive' | 'neutral' | 'negative' | 'no_response' | 'callback_requested';

// ===== COMMUNICATION SERVICE SPECIFIC TYPES =====

export interface CommunicationFilters {
  type?: string;
  direction?: 'inbound' | 'outbound';
  outcome?: string;
  follow_up_required?: boolean;
  date_from?: string;
  date_to?: string;
  limit?: number;
}

export interface CommunicationSummary {
  total_communications: number;
  recent_communications: number;
  pending_follow_ups: number;
  communication_breakdown: Array<{ type: string; count: number }>;
  outcome_breakdown: Array<{ outcome: string; count: number }>;
  avg_response_time: number;
}

// ===== HELPER UTILITY FUNCTIONS =====

export const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString();
};

export const formatCurrency = (amount: number): string => {
  return `£${amount.toLocaleString()}`;
};

export const safeFormatCurrency = (amount: number | undefined): string => {
  return amount !== undefined ? formatCurrency(amount) : '£0';
};

export const getProfitStyle = (profit: number | undefined): string => {
  if (profit === undefined) return 'text-gray-500';
  if (profit > 0) return 'text-green-600';
  if (profit < 0) return 'text-red-600';
  return 'text-gray-500';
};

