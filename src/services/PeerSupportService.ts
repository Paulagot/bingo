import type { PeerSupportPayload } from '../pages/peer/support/peerSupporttypes';

const BASE =
  import.meta.env.PROD
    ? '/api'
    : 'http://localhost:3001/api';

async function req<T = any>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const response = await fetch(
    `${BASE}${path}`,
    {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
    },
  );

  let data: any = null;

  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (
    !response.ok ||
    data?.ok === false
  ) {
    throw new Error(
      data?.error ||
        data?.message ||
        `HTTP ${response.status}`,
    );
  }

  return data as T;
}

export interface PublicPeerPaymentMethod {
  id: number;
  methodCategory:
    | 'instant_payment'
    | 'crypto'
    | 'card'
    | 'stripe'
    | 'other';
  providerName: string | null;
  methodLabel: string;
  displayOrder: number;
  isEnabled: boolean;
  playerInstructions: string | null;
  methodConfig: Record<string, unknown> | null;
  isOfficialClubAccount: boolean;
}

export interface PublicPeerPaymentMethodsResponse {
  paymentMethods: PublicPeerPaymentMethod[];
}

export interface PeerOrderItemPayload {
  packId: string;
  quantity: number;
}

export interface CreatePeerOrderPayload {
  participantId?: string | null;
  supporterName: string;
  supporterEmail: string;
  supporterPhone?: string | null;
  clubPaymentMethodId?: number | null;
  paymentMethodCategory: string;
  paymentProvider?: string | null;
  paymentReference?: string | null;
  items: PeerOrderItemPayload[];
}

export interface CreatePeerOrderResponse {
  orderId: string;
  totalAmount: number;
  currency: string;
}

export interface ClaimPeerOrderPayload {
  paymentReference?: string | null;
  clubPaymentMethodId?: number | null;
}

export interface StripeCheckoutResponse {
  checkoutUrl?: string;
  url?: string;
  sessionId?: string;
  orderId?: string;
}

export interface PeerOrderSummaryItem {
  packName: string;
  quantity: number;
  lineTotal: number;
}

export interface PeerOrderSummary {
  id: string;
  participantName: string | null;
  supporterName: string;
  supporterEmail: string;
  paymentStatus: string;
  paymentMethodCategory: string;
  paymentReference: string | null;
  totalAmount: number;
  currency: string;
  items: PeerOrderSummaryItem[];
}

export interface PeerGeneratedEntry {
  id: string;
  entry_type: string;
  status: string;
  entry_code: string | null;
  join_url: string | null;
  room_id: string;
}

const PeerSupportService = {
  page(
    club: string,
    fundraiser: string,
    participant?: string,
  ) {
    const path = participant
      ? `/peer-support/${encodeURIComponent(
          club,
        )}/${encodeURIComponent(
          fundraiser,
        )}/${encodeURIComponent(
          participant,
        )}`
      : `/peer-support/${encodeURIComponent(
          club,
        )}/${encodeURIComponent(
          fundraiser,
        )}`;

    return req<PeerSupportPayload>(path);
  },

  paymentMethods(
    peerFundraiserId: string,
  ) {
    return req<PublicPeerPaymentMethodsResponse>(
      `/peer-support/fundraiser/${encodeURIComponent(
        peerFundraiserId,
      )}/payment-methods`,
    );
  },

  order(
    peerFundraiserId: string,
    body: CreatePeerOrderPayload,
  ) {
    return req<CreatePeerOrderResponse>(
      `/peer-support/${encodeURIComponent(
        peerFundraiserId,
      )}/orders`,
      {
        method: 'POST',
        body: JSON.stringify(body),
      },
    );
  },

  claim(
    orderId: string,
    body: ClaimPeerOrderPayload = {},
  ) {
    return req<{
      orderId: string;
    }>(
      `/peer-support/orders/${encodeURIComponent(
        orderId,
      )}/claim`,
      {
        method: 'POST',
        body: JSON.stringify(body),
      },
    );
  },

  getOrderSummary(orderId: string) {
    return req<{
      order: PeerOrderSummary;
      entries: PeerGeneratedEntry[];
    }>(
      `/peer-support/orders/${encodeURIComponent(orderId)}/summary`,
    );
  },

  stripeCheckout(
    orderId: string,
  ) {
    return req<StripeCheckoutResponse>(
      `/peer-support/orders/${encodeURIComponent(
        orderId,
      )}/stripe-checkout`,
      {
        method: 'POST',
      },
    );
  },
};

export default PeerSupportService;
