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
}

export interface ClubPaymentMethod {
  id: number;
  methodLabel: string;
  methodCategory: 'instant_payment' | 'card' | 'stripe' | 'other';
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
}

export type PurchaseStep = 
  | 'loading'
  | 'form'
  | 'payment_method'
  | 'payment_instructions'
  | 'creating_ticket'
  | 'complete'
  | 'error';