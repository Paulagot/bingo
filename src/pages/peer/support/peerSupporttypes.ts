// peerSupport.types.ts
// Typed model of the payload returned by the peer-support endpoint
// (server: peerPublicService.publicPayload). Replaces the `any` that
// `PeerSupportService.page()` currently returns, so the page can read known
// fields instead of the defensive camel/snake `firstDefined(...)` chains.
//
// Money/count columns arrive from MySQL as either strings ("25.00") or numbers
// depending on driver/config, so numeric DB fields are typed `string | number`
// and should be run through the `asNumber` helper before maths. Fields the
// backend derives (raisedAmount, room{}, logoUrl) are already real numbers /
// camelCase and are typed precisely.

export type Money = string | number;
export type IsoDateString = string;

// ── lifecycle ───────────────────────────────────────────────────────────────
export type LifecycleState =
  | 'draft' | 'closed' | 'not_started' | 'ended' | 'participant_inactive' | 'open';

export interface Lifecycle {
  state: LifecycleState;
  canTransact: boolean;
  message: string | null;
}

// ── club ────────────────────────────────────────────────────────────────────
export interface SupportClub {
  id: string;
  name: string;
  slug: string | null;
  brand_logo_url: string | null;
  brand_primary_color: string | null;
  brand_background_color: string | null;
  brand_text_on_primary_color: string | null;
  // backend aliases (both set to brand_logo_url)
  logo_url: string | null;
  logoUrl: string | null;
}

// ── fundraiser settings (settings_json, parsed) ──────────────────────────────
export interface FundraiserSettings {
  templateType?: string;
  donationsEnabled?: boolean;
  sponsoredRoomId?: string | null;
  coverImageUrl?: string | null; // optional cause hero image (URL only)
  videoUrl?: string | null;      // optional cause-level YouTube URL
  [key: string]: unknown;        // forward-compatible for other saved settings
}

export type FundraiserFormat = 'door_to_door' | 'sponsored' | string;
export type FundraiserStatus = 'draft' | 'published' | 'closed' | string;

export interface SupportFundraiser {
  id: string;
  club_id: string;
  name: string;
  description: string | null;
  format_type: FundraiserFormat;
  target_amount: Money;
  currency: string;
  start_date: IsoDateString | null;
  end_date: IsoDateString | null;
  status: FundraiserStatus;
  public_slug: string;
  settings_json?: string | null;
  created_at?: IsoDateString;
  updated_at?: IsoDateString;
  // derived / attached by publicPayload
  settings: FundraiserSettings;
  raised_amount: number;          // fundraiser-wide confirmed total
  raisedAmount: number;
  sponsorship_total: number;
  sponsor_count: number;
  confirmed_support_count: number;
}

// ── participant ──────────────────────────────────────────────────────────────
export interface SupportParticipant {
  id: string;
  peer_fundraiser_id: string;
  club_id: string;
  participant_name: string;
  participant_slug: string;
  email: string | null;
  phone: string | null;
  personal_target: Money | null;  // the personal bar's target
  personal_message: string | null;
  profile_image_url: string | null;
  video_url: string | null;        // optional participant YouTube URL
  notes: string | null;
  is_active: number | boolean;
  created_at?: IsoDateString;
  updated_at?: IsoDateString;
  // derived / attached by publicPayload (participant-scoped)
  raised_amount: number;
  raisedAmount: number;
  sponsorship_total: number;
  sponsor_count: number;
  confirmed_support_count: number;
}

// ── sponsored room (only present on sponsored fundraisers) ────────────────────
export interface SponsoredRoom {
  roomId: string;
  status: string;
  activityKind: string;
  customActivityLabel: string | null;
  suggestedAmounts: number[];
  currency: string;
}

// ── pack availability ────────────────────────────────────────────────────────
export type AvailabilityReason =
  | 'fundraiser_closed' | 'pack_not_started' | 'pack_sales_ended' | 'pack_sold_out'
  | 'activity_missing' | 'activity_closed' | 'ticket_sales_closed' | 'capacity_reached'
  | 'ticket_type_required' | 'ticket_type_unavailable' | 'ticket_type_sale_ended'
  | 'ticket_type_sold_out' | null;

export interface PackAvailability {
  available: boolean;
  reasonCode: AvailabilityReason;
  message: string | null;   // e.g. "2 remaining", "Sold out."
  remaining: number | null;
}

// ── room config (config_json on each item, parsed) ───────────────────────────
// Loosely typed on purpose - shapes differ by game type. Helpers read the
// bits they need (quiz extras, puzzle items, prizes).
export interface Prize {
  place: number | string;
  value: Money | null;
  sponsor: string | null;
  description: string | null;
}

export interface QuizExtra { extraId: string; label: string; price: number; }

export interface PuzzleItem {
  id: string;
  itemNumber: number;
  puzzleType: string;
  difficulty: string | null;
}

export interface RoomConfig {
  entryFee?: Money;
  currency?: string;
  timeZone?: string;
  eventDateTime?: IsoDateString;
  eventName?: string;
  eventTitle?: string;
  quizName?: string;
  fundraisingOptions?: Record<string, boolean>;
  fundraisingPrices?: Record<string, Money>;
  ticketTypes?: Array<Record<string, unknown>>;
  puzzleItems?: PuzzleItem[];
  prizes?: Prize[];
  [key: string]: unknown;
}

// ── pack item (PI row + joined room columns + derived room{}) ─────────────────
export type GameType =
  | 'quiz' | 'elimination' | 'ticketed_event' | 'puzzle_drop' | 'puzzle_sub' | string;

export interface ItemRoom {
  roomId: string;
  gameType: GameType | null;
  status: string | null;
  scheduledAt: IsoDateString | null;
  name: string;
  description: string | null;
}

export interface PackItem {
  id: string;
  pack_id: string;
  peer_fundraiser_id: string;
  club_id: string;
  target_room_id: string;
  item_type: string;
  quantity: number;
  metadata_json: string | null;
  // joined room columns
  game_type: GameType | null;
  room_status: string | null;
  scheduled_at: IsoDateString | null;
  time_zone: string | null;
  config_json: string | null;
  event_title: string | null;
  event_summary: string | null;
  event_description: string | null;
  // derived
  room: ItemRoom;
}

// ── pack (PK row + derived) ───────────────────────────────────────────────────
export type PackType = 'single_entry' | 'bundle' | 'ticket' | 'sponsor' | 'custom' | string;

export interface PackMetadata {
  configuredValue?: Money;  // pre-discount value, drives the savings badge
  discountAmount?: Money;   // amount saved vs configuredValue
  [key: string]: unknown;
}

export interface SupportPack {
  id: string;
  peer_fundraiser_id: string;
  club_id: string;
  name: string;
  description: string | null;
  pack_type: PackType;
  price: Money;
  currency: string;
  is_featured: number | boolean;
  badge_label: string | null;
  display_order: number;
  max_sales: number | null;
  sales_start_at: IsoDateString | null;
  sales_end_at: IsoDateString | null;
  is_active: number | boolean;
  metadata_json: string | null;
  created_at?: IsoDateString;
  // derived
  sold_out: boolean;
  availability: PackAvailability;
  items: PackItem[];
}

// ── top-level payload ─────────────────────────────────────────────────────────
export type SupporterExperience = 'sponsorship' | 'sell_activities';

export interface PeerSupportPayload {
  club: SupportClub;
  lifecycle: Lifecycle;
  fundraiser: SupportFundraiser;
  participant: SupportParticipant | null;
  sponsoredRoom: SponsoredRoom | null;
  supporterExperience: SupporterExperience;
  packs: SupportPack[];
}