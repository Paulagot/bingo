// src/components/campaignSupport/services/CampaignSupportService.ts
// Public supporter-facing service. No auth required.

const API_BASE = import.meta.env.PROD ? '/api' : 'http://localhost:3001/api';

export interface SupportCampaign {
  id:           string;
  name:         string;
  description:  string | null;
  targetAmount: number;
  currency:     string;
  isPublished:  boolean;
  startDate:    string | null;
  endDate:      string | null;
}

export interface SupportProductItem {
  id:           string;
  targetRoomId: string;
  itemType:     string;
  quantity:     number;
}

export interface SupportProduct {
  id:          string;
  name:        string;
  description: string | null;
  productType: string;
  price:       number;
  currency:    string;
  isFeatured:  boolean;
  badgeLabel:  string | null;
  soldOut:     boolean;
  items:       SupportProductItem[];
}

export interface Seller {
  id:         string;
  sellerName: string;
  sellerSlug: string | null;
}

export interface CampaignSupportPayload {
  campaign:  SupportCampaign;
  products:  SupportProduct[];
  seller:    Seller | null;
  sellerId:  string | null;
}

export interface CampaignPaymentMethod {
  id:                   number;
  methodCategory:       string;
  providerName:         string | null;
  methodLabel:          string;
  playerInstructions:   string | null;
  isOfficialClubAccount: boolean;
  methodConfig:         Record<string, unknown> | null;
}

export interface OrderItem {
  productId: string;
  quantity:  number;
}

export interface CreateOrderPayload {
  sellerId?:              string;
  supporterName:          string;
  supporterEmail:         string;
  supporterPhone?:        string;
  paymentMethodCategory:  string;
  clubPaymentMethodId?:   number | null;
  paymentProvider?:       string | null;
  items:                  OrderItem[];
}

export interface OrderSummary {
  id:                    string;
  supporterName:         string;
  supporterEmail:        string;
  paymentStatus:         string;
  paymentMethodCategory: string;
  totalAmount:           number;
  currency:              string;
  items: {
    productName: string;
    quantity:    number;
    lineTotal:   number;
  }[];
}

export interface GeneratedEntry {
  id:        string;
  entryType: string;
  status:    string;
  entryCode: string | null;
  joinUrl:   string | null;
  roomId:    string;
}

// ── HTTP helpers ──────────────────────────────────────────────────────────────

async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok || !data.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data as T;
}

async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`);
  const data = await res.json();
  if (!res.ok || !data.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data as T;
}

// ── Service ───────────────────────────────────────────────────────────────────

export const campaignSupportService = {

  async getCampaignPage(campaignId: string, sellerId?: string): Promise<CampaignSupportPayload> {
    const qs = sellerId ? `?sellerId=${encodeURIComponent(sellerId)}` : '';
    return apiGet<CampaignSupportPayload>(`/campaign-support/${campaignId}${qs}`);
  },

  async getPaymentMethodsForCampaign(campaignId: string): Promise<CampaignPaymentMethod[]> {
    try {
      const res = await fetch(`${API_BASE}/campaign-support/${encodeURIComponent(campaignId)}/payment-methods`);
      const data = await res.json();
      if (!data.ok) return [];
      return (data.paymentMethods ?? []).map((m: any): CampaignPaymentMethod => ({
        id:                   Number(m.id),
        methodCategory:       m.methodCategory,
        providerName:         m.providerName ?? null,
        methodLabel:          m.methodLabel,
        playerInstructions:   m.playerInstructions ?? null,
        isOfficialClubAccount: m.isOfficialClubAccount ?? false,
        methodConfig:         m.methodConfig ?? null,
      }));
    } catch {
      return [];
    }
  },

  async createOrder(campaignId: string, payload: CreateOrderPayload): Promise<{ order: OrderSummary }> {
    return apiPost<{ order: OrderSummary }>(`/campaign-support/${campaignId}/orders`, payload);
  },

  async claimPayment(
    orderId: string,
    opts?: { paymentReference?: string | null; clubPaymentMethodId?: number | null }
  ): Promise<{ order: OrderSummary }> {
    return apiPost<{ order: OrderSummary }>(`/campaign-support/orders/${orderId}/claim-payment`, {
      paymentReference:    opts?.paymentReference ?? null,
      clubPaymentMethodId: opts?.clubPaymentMethodId ?? null,
    });
  },

  async createStripeCheckout(
    campaignId: string,
    orderId: string,
  ): Promise<{ url: string; sessionId: string }> {
    return apiPost<{ url: string; sessionId: string }>(`/stripe/campaign-checkout`, { orderId, campaignId });
  },

  async confirmCryptoPayment(
    orderId: string,
    payload: {
      txHash:             string;
      web3TransactionId?: string | number | null;
      ticketId?:          string | null;
      joinToken?:         string | null;
    }
  ): Promise<{ ok: boolean; orderId: string; txHash: string; entries: GeneratedEntry[] }> {
    return apiPost(
      `/campaign-support/orders/${encodeURIComponent(orderId)}/confirm-crypto`,
      payload
    );
  },

  async getOrderSummary(orderId: string): Promise<{ order: OrderSummary; entries: GeneratedEntry[] }> {
    return apiGet<{ order: OrderSummary; entries: GeneratedEntry[] }>(
      `/campaign-support/orders/${orderId}/summary`
    );
  },

  /**
   * Fire the order-level confirmation email for the given order.
   * Called client-side just before navigating to the thank-you screen.
   * The backend route is non-fatal and always returns { sent: true }.
   *
   * Note: apiPost throws if the response is not ok — but the backend route
   * always returns 200 { sent: true } even on email failure, so this will
   * never throw in practice. The fireOrderConfirmationEmail wrapper in
   * CampaignSupportPage also swallows any error as a safety net.
   */
  async sendOrderConfirmationEmail(orderId: string): Promise<void> {
    await apiPost<{ sent: boolean }>(
      `/campaign-support/orders/${encodeURIComponent(orderId)}/send-confirmation-email`,
      {}
    );
  },

};