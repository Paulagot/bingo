import BaseService from '../components/mgtsystem/services/BaseService';

export type PeerFundraiserStatus =
  | 'draft'
  | 'published'
  | 'closed';

export type PeerFundraiserFormat =
  | 'door_to_door'
  | 'sponsored'
  | 'personal_fundraising'
  | 'team_fundraising'
  | 'custom';

export type RoomStatus =
  | 'scheduled'
  | 'open'
  | 'live';

export type PeerPaymentStatus =
  | 'pending'
  | 'claimed'
  | 'confirmed'
  | 'failed'
  | 'cancelled'
  | 'refunded';

export interface PeerFundraiser {
  id: string;
  club_id: string;
  name: string;
  description: string | null;
  format_type: PeerFundraiserFormat;
  target_amount: number;
  currency: string;
  start_date?: string | null;
  end_date?: string | null;
  status: PeerFundraiserStatus;
  public_slug: string;
  club_slug?: string | null;
  club_name?: string | null;
  linked_payment_methods_json?: {
    payment_method_ids?: number[];
  } | null;
  settings_json?: Record<string, unknown> | null;
  participant_count?: number;
  pack_count?: number;
  confirmed_total?: number;
  created_at?: string;
  updated_at?: string;
}

export interface CreatePeerFundraiserPayload {
  name: string;
  description?: string | null;
  formatType?: PeerFundraiserFormat;
  targetAmount?: number;
  currency?: string;
  startDate?: string | null;
  endDate?: string | null;
  status?: PeerFundraiserStatus;
  publicSlug?: string;
  settings?: Record<string, unknown>;
  paymentMethodIds?: number[];
}

export interface UpdatePeerFundraiserPayload {
  name?: string;
  description?: string | null;
  formatType?: PeerFundraiserFormat;
  targetAmount?: number;
  currency?: string;
  startDate?: string | null;
  endDate?: string | null;
  status?: PeerFundraiserStatus;
  publicSlug?: string;
  settings?: Record<string, unknown>;
}

export type PeerSellableOptionType =
  | 'quiz_entry'
  | 'elimination_entry'
  | 'event_ticket'
  | 'puzzle_entry';

export interface PeerSellableOption {
  optionId: string;
  roomId: string;
  gameType: 'quiz' | 'elimination' | 'ticketed_event' | 'puzzle_drop';
  itemType: PeerSellableOptionType;
  label: string;
  description?: string | null;
  configuredPrice: number;
  currency: string;
  quantity: number;
  metadata: {
    optionKind: 'room_entry' | 'ticket_type' | 'puzzle_tier';
    ticketTypeId?: string;
    ticketTypeName?: string;
    ticketTypeQuantity?: number | null;
    ticketTypeSaleEndsAt?: string | null;
    entryFee?: number;
    includedExtras?: Array<{
      extraId: string;
      label?: string;
      price: number;
    }>;
    extrasTotal?: number;
    pricingTierId?: string;
    pricingTierLabel?: string | null;
    puzzleQuantity?: number;
    puzzleItemIds?: string[];
    puzzleItems?: Array<{
      id: string;
      itemNumber: number;
      puzzleType: string;
      difficulty: string;
    }>;
    referencePrice: number;
  };
}

export interface AvailableRoom {
  room_id: string;
  game_type:
    | 'quiz'
    | 'elimination'
    | 'ticketed_event'
    | 'puzzle_drop';
  status: RoomStatus;
  scheduled_at: string | null;
  time_zone?: string | null;
  name: string;
  description?: string | null;
  prize_description?: string | null;
  prize_value?: number | null;
  config?: Record<string, unknown>;
  sellable_options: PeerSellableOption[];
}

export interface PeerParticipant {
  id: string;
  peer_fundraiser_id: string;
  club_id: string;
  participant_name: string;
  participant_slug: string;
  email: string | null;
  phone: string | null;
  personal_target: number | null;
  personal_message: string | null;
  profile_image_url: string | null;
  is_active: boolean | number;
  notes: string | null;
  order_count?: number;
  confirmed_total?: number;
  claimed_total?: number;
  created_at?: string;
  updated_at?: string;
}

export interface CreatePeerParticipantPayload {
  participantName: string;
  participantSlug?: string;
  email?: string | null;
  phone?: string | null;
  personalTarget?: number | null;
  personalMessage?: string | null;
  profileImageUrl?: string | null;
  notes?: string | null;
}

export interface UpdatePeerParticipantPayload
  extends Partial<CreatePeerParticipantPayload> {
  isActive?: boolean;
}

export interface PeerPackItem {
  id?: string;
  pack_id?: string;
  peer_fundraiser_id?: string;
  club_id?: string;
  target_room_id?: string;
  targetRoomId?: string;
  item_type?: string;
  itemType?: string;
  quantity: number;
  metadata_json?: Record<string, unknown> | null;
  metadata?: Record<string, unknown> | null;
}

export interface PeerPack {
  id: string;
  peer_fundraiser_id: string;
  club_id: string;
  name: string;
  description: string | null;
  pack_type: string;
  price: number;
  currency: string;
  is_featured: boolean | number;
  badge_label: string | null;
  display_order: number;
  max_sales: number | null;
  sales_start_at: string | null;
  sales_end_at: string | null;
  is_active: boolean | number;
  metadata_json?: Record<string, unknown> | null;
  items: PeerPackItem[];
  created_at?: string;
  updated_at?: string;
}

export interface SavePeerPackPayload {
  name: string;
  description?: string | null;
  packType?: string;
  price: number;
  currency?: string;
  isFeatured?: boolean;
  badgeLabel?: string | null;
  displayOrder?: number;
  maxSales?: number | null;
  salesStartAt?: string | null;
  salesEndAt?: string | null;
  metadata?: Record<string, unknown> | null;
  items: Array<{
    targetRoomId: string;
    itemType: string;
    quantity: number;
    metadata?: {
      optionId?: string;
      optionKind?: 'room_entry' | 'ticket_type' | 'puzzle_tier';
      configuredPrice?: number;
      referencePrice?: number;
      ticketTypeId?: string;
      ticketTypeName?: string;
      ticketTypeQuantity?: number | null;
      ticketTypeSaleEndsAt?: string | null;
      entryFee?: number;
      includedExtras?: Array<{
        extraId: string;
        label?: string;
        price: number;
      }>;
      extrasTotal?: number;
      pricingTierId?: string;
      pricingTierLabel?: string | null;
      puzzleQuantity?: number;
      puzzleItemIds?: string[];
      puzzleItems?: Array<{
        id: string;
        itemNumber: number;
        puzzleType: string;
        difficulty: string;
      }>;
    } | null;
  }>;
}

export interface PeerOrder {
  id: string;
  peer_fundraiser_id: string;
  club_id: string;
  participant_id: string | null;
  participant_name: string | null;
  supporter_name: string;
  supporter_email: string;
  supporter_phone: string | null;
  club_payment_method_id: number | null;
  payment_method_category: string;
  payment_provider: string | null;
  payment_reference: string | null;
  payment_status: PeerPaymentStatus;
  subtotal_amount: number;
  total_amount: number;
  currency: string;
  stripe_checkout_session_id?: string | null;
  stripe_payment_intent_id?: string | null;
  external_transaction_id?: string | null;
  source: string;
  created_at: string;
  updated_at?: string;
  confirmed_at: string | null;
}

export interface ClubPaymentMethod {
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

export interface PeerPaymentMethodsResponse {
  availableMethods: ClubPaymentMethod[];
  linkedMethodIds: number[];
}

export interface PeerAvailablePaymentMethodsResponse {
  availableMethods: ClubPaymentMethod[];
}

export interface PeerReportStatusTotal {
  payment_status: PeerPaymentStatus;
  order_count: number;
  total_amount: number;
}

export interface PeerReportParticipant {
  participant_id: string | null;
  participant_name: string | null;
  order_count: number;
  confirmed_total: number;
  claimed_total: number;
}

export interface PeerReportPack {
  pack_id: string;
  pack_name: string;
  quantity_sold: number;
  confirmed_total: number;
}

export interface PeerReportRoom {
  room_id: string;
  entry_type: string;
  entry_count: number;
}

export interface PeerReport {
  statusTotals: PeerReportStatusTotal[];
  participantTotals: PeerReportParticipant[];
  packTotals: PeerReportPack[];
  roomTotals: PeerReportRoom[];
}

export interface StripeCheckoutResponse {
  checkoutUrl?: string;
  url?: string;
  sessionId?: string;
  orderId?: string;
}

class PeerService extends BaseService {
  list() {
    return this.request<{
      fundraisers: PeerFundraiser[];
    }>('/peer-fundraisers');
  }

  create(body: CreatePeerFundraiserPayload) {
    return this.request<{
      fundraiser: PeerFundraiser;
    }>('/peer-fundraisers', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  // Club-level — no fundraiser id needed. Used by the create form so
  // payment methods can be picked before the fundraiser exists.
  getAvailablePaymentMethods() {
    return this.request<PeerAvailablePaymentMethodsResponse>(
      '/peer-fundraisers/available-payment-methods',
    );
  }

  get(id: string) {
    return this.request<{
      fundraiser: PeerFundraiser;
    }>(
      `/peer-fundraisers/${encodeURIComponent(id)}`,
    );
  }

  update(
    id: string,
    body: UpdatePeerFundraiserPayload,
  ) {
    return this.request<{
      fundraiser: PeerFundraiser;
    }>(
      `/peer-fundraisers/${encodeURIComponent(id)}`,
      {
        method: 'PATCH',
        body: JSON.stringify(body),
      },
    );
  }

  rooms(id: string) {
    return this.request<{
      rooms: AvailableRoom[];
    }>(
      `/peer-fundraisers/${encodeURIComponent(
        id,
      )}/available-rooms`,
    );
  }

  participants(id: string) {
    return this.request<{
      participants: PeerParticipant[];
    }>(
      `/peer-fundraisers/${encodeURIComponent(
        id,
      )}/participants`,
    );
  }

  addParticipant(
    id: string,
    body: CreatePeerParticipantPayload,
  ) {
    return this.request<{
      participantId: string;
      participantSlug: string;
    }>(
      `/peer-fundraisers/${encodeURIComponent(
        id,
      )}/participants`,
      {
        method: 'POST',
        body: JSON.stringify(body),
      },
    );
  }

  updateParticipant(
    id: string,
    participantId: string,
    body: UpdatePeerParticipantPayload,
  ) {
    return this.request<{
      participant?: PeerParticipant;
      participantId?: string;
    }>(
      `/peer-fundraisers/${encodeURIComponent(
        id,
      )}/participants/${encodeURIComponent(
        participantId,
      )}`,
      {
        method: 'PATCH',
        body: JSON.stringify(body),
      },
    );
  }

  deleteParticipant(id: string, participantId: string) {
    return this.request<{ deleted: boolean; deactivated: boolean }>(
      `/peer-fundraisers/${encodeURIComponent(id)}/participants/${encodeURIComponent(participantId)}`,
      { method: 'DELETE' },
    );
  }

  packs(id: string) {
    return this.request<{
      packs: PeerPack[];
    }>(
      `/peer-fundraisers/${encodeURIComponent(
        id,
      )}/packs`,
    );
  }

  addPack(
    id: string,
    body: SavePeerPackPayload,
  ) {
    return this.request<{
      packId: string;
    }>(
      `/peer-fundraisers/${encodeURIComponent(
        id,
      )}/packs`,
      {
        method: 'POST',
        body: JSON.stringify(body),
      },
    );
  }

  updatePack(
    id: string,
    packId: string,
    body: SavePeerPackPayload,
  ) {
    return this.request<{
      packId: string;
    }>(
      `/peer-fundraisers/${encodeURIComponent(
        id,
      )}/packs/${encodeURIComponent(packId)}`,
      {
        method: 'PATCH',
        body: JSON.stringify(body),
      },
    );
  }

  hidePack(id: string, packId: string) {
    return this.request<{ ok: boolean }>(
      `/peer-fundraisers/${encodeURIComponent(id)}/packs/${encodeURIComponent(packId)}/hide`,
      { method: 'POST' },
    );
  }

  duplicatePack(id: string, packId: string) {
    return this.request<{ packId: string }>(
      `/peer-fundraisers/${encodeURIComponent(id)}/packs/${encodeURIComponent(packId)}/duplicate`,
      { method: 'POST' },
    );
  }

  applyTemplate(
    id: string,
    templateKey: 'door_to_door' | 'quiz_only' | 'puzzle_campaign',
  ) {
    return this.request<{ packs: PeerPack[] }>(
      `/peer-fundraisers/${encodeURIComponent(id)}/packs/apply-template`,
      {
        method: 'POST',
        body: JSON.stringify({ templateKey }),
      },
    );
  }

  orders(id: string) {
    return this.request<{
      orders: PeerOrder[];
    }>(
      `/peer-fundraisers/${encodeURIComponent(
        id,
      )}/orders`,
    );
  }

  /**
   * Confirm a manual (cash / instant payment) order.
   *
   * Verifies the order belongs to this fundraiser + your club, flips it
   * to confirmed, and fully expands it — creates peer_entries, quiz_tickets
   * and join links. (Previously this endpoint only flipped the status and
   * never expanded anything — fixed on the backend, method kept the same
   * name since the route now does the right thing.)
   */
  confirm(
    id: string,
    orderId: string,
  ) {
    return this.request<{
      order: PeerOrder;
    }>(
      `/peer-fundraisers/${encodeURIComponent(
        id,
      )}/orders/${encodeURIComponent(
        orderId,
      )}/confirm`,
      {
        method: 'POST',
      },
    );
  }

  /**
   * Reject a manual order that shouldn't be confirmed (e.g. cash never
   * arrived, duplicate order). Cancels the order and any pending entries
   * already created for it.
   */
  rejectOrder(
    id: string,
    orderId: string,
    reason?: string,
  ) {
    return this.request<{
      order: PeerOrder;
    }>(
      `/peer-fundraisers/${encodeURIComponent(
        id,
      )}/orders/${encodeURIComponent(
        orderId,
      )}/reject`,
      {
        method: 'POST',
        body: JSON.stringify({ reason }),
      },
    );
  }

  paymentMethods(id: string) {
    return this.request<PeerPaymentMethodsResponse>(
      `/peer-fundraisers/${encodeURIComponent(
        id,
      )}/payment-methods`,
    );
  }

  savePaymentMethods(
    id: string,
    paymentMethodIds: number[],
  ) {
    return this.request<{
      selectedPaymentMethodIds: number[];
    }>(
      `/peer-fundraisers/${encodeURIComponent(
        id,
      )}/payment-methods`,
      {
        method: 'POST',
        body: JSON.stringify({
          paymentMethodIds,
        }),
      },
    );
  }

  report(id: string) {
    return this.request<PeerReport>(
      `/peer-fundraisers/${encodeURIComponent(
        id,
      )}/report`,
    );
  }

  createStripeCheckout(
    peerFundraiserId: string,
    orderId: string,
  ) {
    return this.request<StripeCheckoutResponse>(
      `/peer-support/orders/${encodeURIComponent(
        orderId,
      )}/stripe-checkout`,
      {
        method: 'POST',
        body: JSON.stringify({
          peerFundraiserId,
        }),
      },
    );
  }
}

export default new PeerService();
