// src/components/Quiz/tickets/types.ts

import type { TicketTypeOption } from './TicketTypeSelector';

export interface EventDetails {
  eventId:       string;
  title:         string;
  summary:       string | null;
  locationLabel: string | null;
  locationType:  'in_person' | 'online' | 'hybrid' | null;
  onlineUrl:     string | null;
  startDatetime: string | null;
  endDatetime:   string | null;
  timeZone:      string | null;
  eventDate:     string | null;
}

export interface RoomInfo {
  roomId:             string;
  clubId:             string;
  status:             'scheduled' | 'open' | 'live' | 'completed' | 'cancelled';
  hostName:           string;
  entryFee:           number;
  currencySymbol:     string;
  fundraisingOptions: Record<string, boolean>;
  fundraisingPrices:  Record<string, number>;
  eventDateTime?:     string;
  timeZone?:          string;
  fundraisingMode?:   'fixed_fee' | 'donation';
  gameType?:          'quiz' | 'elimination' | 'ticketed_event';
  clubName?:          string | null;
  eventDetails?:      EventDetails | null;
  // ── Ticket types — present for ticketed_event rooms only ─────────────────
  ticketTypes?:       TicketTypeOption[];
}

export interface ClubPaymentMethod {
  id:                 number;
  methodLabel:        string;
  methodCategory:     'instant_payment' | 'card' | 'stripe' | 'crypto' | 'other';
  providerName:       string | null;
  playerInstructions: string | null;
  isEnabled?:         boolean;
  methodConfig: {
    link?:          string;
    qrCodeUrl?:     string;
    accountName?:   string;
    iban?:          string;
    bic?:           string;
    sortCode?:      string;
    accountNumber?: string;
  };
}

export interface PurchaseFormData {
  purchaserName:  string;
  purchaserEmail: string;
  purchaserPhone: string;
  playerName:     string;
  selectedExtras: string[];
}

export interface Ticket {
  ticketId:         string;
  joinToken:        string;
  roomId:           string;
  purchaserName:    string;
  purchaserEmail:   string;
  playerName:       string;
  entryFee:         number;
  extrasTotal:      number;
  totalAmount:      number;
  currency:         string;
  extras:           Array<{ extraId: string; price: number }>;
  paymentStatus:    'payment_claimed' | 'payment_confirmed' | 'refunded';
  redemptionStatus: 'unredeemed' | 'blocked' | 'ready' | 'redeemed' | 'expired';
  paymentMethod:    string;
  paymentReference: string;
  fundraisingMode?: 'fixed_fee' | 'donation';
  donationAmount?:  number | null;
  gameType?:        'quiz' | 'elimination' | 'ticketed_event';
  clubName?:        string | null;
  // ── Ticket type ───────────────────────────────────────────────────────────
  ticketTypeId?:    string | null;
  ticketTypeName?:  string | null;
}

// TicketStatus is the shape returned by GET /api/quiz/tickets/:ticketId/status
export interface TicketStatus {
  ticketId:         string;
  roomId:           string;
  purchaserName:    string;
  playerName:       string;
  entryFee:         number;
  extrasTotal:      number;
  totalAmount:      number;
  currency:         string;
  extras:           Array<{ extraId: string; price: number }>;
  paymentStatus:    'payment_claimed' | 'payment_confirmed' | 'refunded';
  redemptionStatus: 'blocked' | 'ready' | 'redeemed' | 'expired';
  paymentMethod:    string;
  paymentReference: string;
  confirmedAt:      string | null;
  redeemedAt:       string | null;
  joinToken:        string;
  canJoinNow?:      boolean;
  joinOpensAt?:     string | null;
  scheduledAt?:     string | null;
  roomStatus?:      'scheduled' | 'open' | 'live' | 'completed' | 'cancelled' | null;
  joinWindowMinutes?: number;
  gameType?:        'quiz' | 'elimination' | 'ticketed_event';
  clubName?:        string | null;
  hostName?:        string | null;
  // ── Ticket type ───────────────────────────────────────────────────────────
  ticketTypeId?:    string | null;
  ticketTypeName?:  string | null;
}

export type PurchaseStep =
  | 'loading'
  | 'form'
  | 'payment_method'
  | 'payment_instructions'
  | 'creating_ticket'
  | 'complete'
  | 'error';