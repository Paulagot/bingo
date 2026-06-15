// src/components/mgtsystem/services/CampaignProductService.ts
//
// Frontend management service for the Campaign Product Builder.
// Extends BaseService — same auth header/logging pattern as EliminationMgmtService.
// All requests go to /api/campaigns/:campaignId/... (auth-gated).

import BaseService from './BaseService';

// ─── Types ────────────────────────────────────────────────────────────────────

export type ProductType =
  | 'single_entry' | 'bundle' | 'ticket'
  | 'subscription' | 'sponsor' | 'custom';

export type ItemType =
  | 'game_entry' | 'quiz_team_ticket' | 'quiz_individual_ticket'
  | 'puzzle_entry' | 'elimination_entry' | 'event_ticket' | 'custom';

export type PaymentMethodCategory =
  | 'card' | 'instant_payment' | 'cash_to_player' | 'bank_transfer' | 'other';

export type OrderPaymentStatus =
  | 'pending' | 'claimed' | 'confirmed' | 'failed' | 'cancelled' | 'refunded';

export type EntryStatus =
  | 'pending_payment' | 'confirmed' | 'sent' | 'opened'
  | 'used' | 'completed' | 'cancelled' | 'refunded';

export type CampaignProductTemplateKey =
  | 'door_to_door' | 'quiz_only' | 'puzzle_campaign';

export interface CampaignPaymentMethodRaw {
  id:                   number;
  methodCategory:       string;
  providerName:         string | null;
  methodLabel:          string;
  displayOrder:         number;
  isEnabled:            boolean;
  playerInstructions:   string | null;
  methodConfig:         Record<string, unknown> | null;
  isOfficialClubAccount: boolean;
}

// ── Product item ──

export interface CampaignProductItem {
  id:           string;
  productId:    string;
  targetRoomId: string;
  itemType:     ItemType;
  quantity:     number;
  metadata:     Record<string, unknown> | null;
}

export interface UpsertProductItemPayload {
  targetRoomId: string;
  itemType:     ItemType;
  quantity:     number;
  metadata?:    Record<string, unknown>;
}

// ── Product ──

export interface CampaignProduct {
  id:           string;
  campaignId:   string;
  clubId:       string;
  name:         string;
  description:  string | null;
  productType:  ProductType;
  price:        number;
  currency:     string;
  isFeatured:   boolean;
  badgeLabel:   string | null;
  displayOrder: number;
  maxSales:     number | null;
  salesStartAt: string | null;
  salesEndAt:   string | null;
  isActive:     boolean;
  metadata:     Record<string, unknown> | null;
  items:        CampaignProductItem[];
  createdAt:    string;
  updatedAt:    string;
}

export interface UpsertCampaignProductPayload {
  name:          string;
  description?:  string;
  productType?:  ProductType;
  price:         number;
  currency?:     string;
  isFeatured?:   boolean;
  badgeLabel?:   string;
  displayOrder?: number;
  maxSales?:     number;
  salesStartAt?: string;
  salesEndAt?:   string;
  items:         UpsertProductItemPayload[];
}

// ── Order ──

export interface CampaignOrderItem {
  id:                         string;
  orderId:                    string;
  productId:                  string;
  productNameSnapshot:        string;
  productDescriptionSnapshot: string | null;
  unitPrice:                  number;
  quantity:                   number;
  lineTotal:                  number;
}

export interface CampaignProductOrder {
  id:                    string;
  campaignId:            string;
  clubId:                string;
  sellerId:              string | null;
  sellerName:            string | null;
  supporterName:         string;
  supporterEmail:        string;
  supporterPhone:        string | null;
  paymentMethodCategory: PaymentMethodCategory;
  paymentProvider:       string | null;
  paymentReference:      string | null;
  paymentStatus:         OrderPaymentStatus;
  subtotalAmount:        number;
  totalAmount:           number;
  currency:              string;
  stripePaymentIntentId: string | null;
  source:                string;
  items?:                CampaignOrderItem[];
  createdAt:             string;
  updatedAt:             string;
  confirmedAt:           string | null;
}

export interface CampaignOrderFilters {
  paymentStatus?:         OrderPaymentStatus;
  sellerId?:              string;
  paymentMethodCategory?: PaymentMethodCategory;
}

// ── Campaign entry ──

export interface CampaignEntry {
  id:           string;
  campaignId:   string;
  roomId:       string;
  entryType:    ItemType;
  status:       EntryStatus;
  entryCode:    string | null;
  joinUrl:      string | null;
}

// ─── Service ──────────────────────────────────────────────────────────────────

class CampaignProductService extends BaseService {
  private readonly base = '/campaigns';

  // ── Products ────────────────────────────────────────────────────────────────

  async listProducts(campaignId: string): Promise<{ products: CampaignProduct[] }> {
    return this.request<{ products: CampaignProduct[] }>(
      `${this.base}/${encodeURIComponent(campaignId)}/products`
    );
  }

  async createProduct(
    campaignId: string,
    payload: UpsertCampaignProductPayload,
  ): Promise<{ product: CampaignProduct }> {
    return this.request<{ product: CampaignProduct }>(
      `${this.base}/${encodeURIComponent(campaignId)}/products`,
      { method: 'POST', body: JSON.stringify(payload) }
    );
  }

  async getProduct(
    campaignId: string,
    productId: string,
  ): Promise<{ product: CampaignProduct }> {
    return this.request<{ product: CampaignProduct }>(
      `${this.base}/${encodeURIComponent(campaignId)}/products/${encodeURIComponent(productId)}`
    );
  }

  async updateProduct(
    campaignId: string,
    productId: string,
    payload: UpsertCampaignProductPayload,
  ): Promise<{ product: CampaignProduct }> {
    return this.request<{ product: CampaignProduct }>(
      `${this.base}/${encodeURIComponent(campaignId)}/products/${encodeURIComponent(productId)}`,
      { method: 'PATCH', body: JSON.stringify(payload) }
    );
  }

  async hideProduct(campaignId: string, productId: string): Promise<{ ok: boolean }> {
    return this.request<{ ok: boolean }>(
      `${this.base}/${encodeURIComponent(campaignId)}/products/${encodeURIComponent(productId)}/hide`,
      { method: 'POST' }
    );
  }

  async duplicateProduct(
    campaignId: string,
    productId: string,
  ): Promise<{ product: CampaignProduct }> {
    return this.request<{ product: CampaignProduct }>(
      `${this.base}/${encodeURIComponent(campaignId)}/products/${encodeURIComponent(productId)}/duplicate`,
      { method: 'POST' }
    );
  }

  async applyTemplate(
    campaignId: string,
    templateKey: CampaignProductTemplateKey,
  ): Promise<{ products: CampaignProduct[] }> {
    return this.request<{ products: CampaignProduct[] }>(
      `${this.base}/${encodeURIComponent(campaignId)}/products/apply-template`,
      { method: 'POST', body: JSON.stringify({ templateKey }) }
    );
  }

  // ── Orders ───────────────────────────────────────────────────────────────────

  async listOrders(
    campaignId: string,
    filters?: CampaignOrderFilters,
  ): Promise<{ orders: CampaignProductOrder[] }> {
    const qs = filters ? `?${this.buildQueryString(filters as Record<string, any>)}` : '';
    return this.request<{ orders: CampaignProductOrder[] }>(
      `${this.base}/${encodeURIComponent(campaignId)}/product-orders${qs}`
    );
  }

  async confirmCashOrder(
    campaignId: string,
    orderId: string,
  ): Promise<{ order: CampaignProductOrder }> {
    return this.request<{ order: CampaignProductOrder }>(
      `${this.base}/${encodeURIComponent(campaignId)}/product-orders/${encodeURIComponent(orderId)}/confirm-cash`,
      { method: 'POST' }
    );
  }

  async rejectCashOrder(
    campaignId: string,
    orderId: string,
    reason?: string,
  ): Promise<{ order: CampaignProductOrder }> {
    return this.request<{ order: CampaignProductOrder }>(
      `${this.base}/${encodeURIComponent(campaignId)}/product-orders/${encodeURIComponent(orderId)}/reject-cash`,
      { method: 'POST', body: JSON.stringify({ reason }) }
    );
  }

  // ── Reporting ──────────────────────────────────────────────────────────────

  async getReport(campaignId: string): Promise<{ report: Record<string, unknown> }> {
    return this.request<{ report: Record<string, unknown> }>(
      `${this.base}/${encodeURIComponent(campaignId)}/product-reports`
    );
  }

  // ── Campaign payment methods ────────────────────────────────────────────────

  async getCampaignPaymentMethods(campaignId: string): Promise<{
    available_methods: CampaignPaymentMethodRaw[];
    linked_method_ids: number[];
    total_available: number;
  }> {
    return this.request(
      `${this.base}/${encodeURIComponent(campaignId)}/payment-methods`
    );
  }

  async updateCampaignPaymentMethods(
    campaignId: string,
    paymentMethodIds: number[],
  ): Promise<{ ok: boolean }> {
    return this.request(
      `${this.base}/${encodeURIComponent(campaignId)}/payment-methods`,
      { method: 'POST', body: JSON.stringify({ payment_method_ids: paymentMethodIds }) }
    );
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  formatPrice(price: number, currency = 'EUR'): string {
    const symbols: Record<string, string> = {
      EUR: '€', GBP: '£', USD: '$', CAD: 'CA$',
    };
    const sym = symbols[currency] ?? currency;
    return `${sym}${price.toFixed(2)}`;
  }

  itemTypeLabel(itemType: ItemType): string {
    const labels: Record<ItemType, string> = {
      game_entry:              'Game Entry',
      quiz_team_ticket:        'Quiz Team Ticket',
      quiz_individual_ticket:  'Quiz Individual Ticket',
      puzzle_entry:            'Puzzle Entry',
      elimination_entry:       'Last Player Standing Entry',
      event_ticket:            'Event Ticket',
      custom:                  'Custom',
    };
    return labels[itemType] ?? itemType;
  }
}

// Singleton — same pattern as EliminationMgmtService
const campaignProductService = new CampaignProductService();
export default campaignProductService;