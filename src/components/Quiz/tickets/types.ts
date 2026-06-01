// src/components/Quiz/tickets/types.ts
// UPDATED: gameType and clubName added to RoomInfo and Ticket

export interface RoomInfo {
  roomId: string;
  clubId: string;
  status: 'scheduled' | 'live' | 'completed' | 'cancelled';
  hostName: string;
  entryFee: number;
  currencySymbol: string;
  fundraisingOptions: Record<string, boolean>;
  fundraisingPrices: Record<string, number>;
  eventDateTime?: string;
  timeZone?: string;
  fundraisingMode?: 'fixed_fee' | 'donation';
  // ── New ──────────────────────────────────────────────────────────────────
  gameType?: 'quiz' | 'elimination';  // defaults to 'quiz' if absent
  clubName?: string | null;           // from fundraisely_clubs.name
}

export interface ClubPaymentMethod {
  id: number;
  methodLabel: string;
  methodCategory: 'instant_payment' | 'card' | 'stripe' | 'crypto' | 'other';
  providerName: string | null;
  playerInstructions: string | null;
  methodConfig: {
    // Revolut
    link?: string;
    qrCodeUrl?: string;
    // Bank Transfer
    accountName?: string;
    iban?: string;
    bic?: string;
    sortCode?: string;
    accountNumber?: string;
  };
}

export interface PurchaseFormData {
  purchaserName: string;
  purchaserEmail: string;
  purchaserPhone: string;
  playerName: string;
  selectedExtras: string[];
}

export interface Ticket {
  ticketId: string;
  joinToken: string;
  roomId: string;
  purchaserName: string;
  purchaserEmail: string;
  playerName: string;
  entryFee: number;
  extrasTotal: number;
  totalAmount: number;
  currency: string;
  extras: Array<{ extraId: string; price: number }>;
  paymentStatus: 'payment_claimed' | 'payment_confirmed' | 'refunded';
  redemptionStatus: 'unredeemed' | 'blocked' | 'ready' | 'redeemed' | 'expired';
  paymentMethod: string;
  paymentReference: string;
  fundraisingMode?: 'fixed_fee' | 'donation';
  donationAmount?: number | null;
  // ── New ──────────────────────────────────────────────────────────────────
  gameType?: 'quiz' | 'elimination';
  clubName?: string | null;
}

// TicketStatus is the shape returned by GET /api/quiz/tickets/:ticketId/status
// Used by TicketStatusChecker
export interface TicketStatus {
  ticketId: string;
  roomId: string;
  purchaserName: string;
  playerName: string;
  entryFee: number;
  extrasTotal: number;
  totalAmount: number;
  currency: string;
  extras: Array<{ extraId: string; price: number }>;
  paymentStatus: 'payment_claimed' | 'payment_confirmed' | 'refunded';
  redemptionStatus: 'blocked' | 'ready' | 'redeemed' | 'expired';
  paymentMethod: string;
  paymentReference: string;
  confirmedAt: string | null;
  redeemedAt: string | null;
  joinToken: string;
  canJoinNow?: boolean;
  joinOpensAt?: string | null;
  scheduledAt?: string | null;
  roomStatus?: 'scheduled' | 'open' | 'live' | 'completed' | 'cancelled' | null;
  joinWindowMinutes?: number;
  // ── New ──────────────────────────────────────────────────────────────────
  gameType?: 'quiz' | 'elimination';
  clubName?: string | null;
  hostName?: string | null;
}

export type PurchaseStep =
  | 'loading'
  | 'form'
  | 'payment_method'
  | 'payment_instructions'
  | 'creating_ticket'
  | 'complete'
  | 'error';