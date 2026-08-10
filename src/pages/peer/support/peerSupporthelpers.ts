// peerSupport.helpers.ts
// Pure, presentation-agnostic helpers extracted verbatim from
// PeerSupportPage.tsx. No behaviour change — same functions, one home.

import type { PublicPeerPaymentMethod } from '../../../services/PeerSupportService';

export type ThemeInput = {
  primary?: string | null;
  secondary?: string | null;
  accent?: string | null;
  background?: string | null;
};

export type RoomPrize = {
  place?: number | string | null;
  value?: number | string | null;
  sponsor?: string | null;
  description?: string | null;
};

export type PackRoomDetails = {
  id?: string;
  roomId?: string;
  roomName?: string;
  itemType?: string;
  gameType?: string;
  quantity: number;
  startsAt?: string | null;
  endsAt?: string | null;
  location?: string | null;
  prizes: RoomPrize[];
};

export const DEFAULT_THEME = {
  primary: '#f97316',
  secondary: '#111827',
  accent: '#fb923c',
  background: '#fff7ed',
};

export function asNumber(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

export function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export function asBool(value: unknown): boolean {
  return value === true || value === 1 || value === '1';
}

export function firstDefined<T>(...values: Array<T | null | undefined>): T | undefined {
  return values.find(value => value !== undefined && value !== null && value !== '') as T | undefined;
}

export function parseJsonMaybe<T>(value: unknown): T | null {
  if (!value) return null;
  if (typeof value === 'object') return value as T;
  if (typeof value !== 'string') return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

export function fmt(amount: number | string, currency = 'EUR') {
  const symbols: Record<string, string> = { EUR: '€', GBP: '£', USD: '$' };
  const code = currency || 'EUR';
  return `${symbols[code] ?? `${code} `}${asNumber(amount).toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}

export function currencySymbol(currency: string): string {
  return currency === 'EUR' ? '€' : currency === 'GBP' ? '£' : currency === 'USD' ? '$' : currency;
}

export function friendlyOrderError(message: string): string {
  if (message === 'pack_not_available') {
    return 'One of the packs in your cart is no longer available. Its sales window may have closed. Please go back and check your selection.';
  }
  if (message === 'pack_sold_out') {
    return 'One of the packs in your cart has just sold out. Please go back and adjust your selection.';
  }
  return message || 'Something went wrong. Please try again.';
}

export function generateReference(): string {
  return `PF-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

export function formatProviderName(providerName?: string | null): string {
  const raw = String(providerName || '').trim();
  if (!raw) return 'payment app';
  return raw.replace(/_/g, ' ').replace(/\b\w/g, char => char.toUpperCase());
}

export function isStripeMethod(method: PublicPeerPaymentMethod | null | undefined): boolean {
  if (!method) return false;
  const category = String(method.methodCategory || '').toLowerCase();
  const provider = String(method.providerName || '').toLowerCase();
  return category === 'stripe' || provider === 'stripe';
}

export function isCryptoMethod(method: PublicPeerPaymentMethod | null | undefined): boolean {
  return String(method?.methodCategory || '').toLowerCase() === 'crypto';
}

export function isInstantMethod(method: PublicPeerPaymentMethod | null | undefined): boolean {
  if (!method) return false;
  const category = String(method.methodCategory || '').toLowerCase();
  const provider = String(method.providerName || '').toLowerCase();
  return category === 'instant_payment' || category === 'bank_transfer' || provider === 'revolut' || provider === 'bank_transfer';
}

export function isCashMethod(method: PublicPeerPaymentMethod | null | undefined): boolean {
  if (!method) return false;
  const category = String(method.methodCategory || '').toLowerCase();
  const provider = String(method.providerName || '').toLowerCase();
  return ['cash_to_participant', 'cash_to_player', 'cash'].includes(category) ||
    ['cash_to_participant', 'cash_to_player', 'cash', 'cash_at_door'].includes(provider);
}

export function hasProviderInstructionStep(method: PublicPeerPaymentMethod | null | undefined): boolean {
  if (!method) return false;
  const provider = String(method.providerName || '').toLowerCase();
  return provider === 'revolut' || provider === 'bank_transfer';
}

export function methodDisplay(method: PublicPeerPaymentMethod): { icon: string; label: string; hint: string } {
  const category = String(method.methodCategory || '').toLowerCase();
  const provider = String(method.providerName || '').toLowerCase();
  const providerLabel = formatProviderName(method.providerName);

  if (isStripeMethod(method)) {
    return {
      icon: '💳',
      label: method.methodLabel || 'Pay online',
      hint: 'Pay securely by card, Apple Pay or Google Pay.',
    };
  }

  if (isCashMethod(method)) {
    return {
      icon: '💵',
      label: method.methodLabel || 'Pay the participant in cash',
      hint: 'Give the cash directly to the participant. The club will confirm it.',
    };
  }

  if (isInstantMethod(method)) {
    return {
      icon: provider === 'bank_transfer' || category === 'bank_transfer' ? '🏦' : '📱',
      label: method.methodLabel || providerLabel,
      hint: `Pay using ${providerLabel} and include your unique reference.`,
    };
  }

  if (category === 'card') {
    return { icon: '💳', label: method.methodLabel || 'Pay by card', hint: 'Pay by card.' };
  }

  return {
    icon: '💰',
    label: method.methodLabel || providerLabel,
    hint: (method as any).playerInstructions || 'Complete the payment using the organiser’s instructions.',
  };
}

export function getRoomObject(item: any): any {
  return item?.room ?? item?.roomDetails ?? item?.room_details ?? item?.targetRoom ?? item?.target_room ?? null;
}

export function getRoomConfig(item: any): any {
  const room = getRoomObject(item);
  return (
    item?.roomConfig ??
    item?.room_config ??
    parseJsonMaybe(item?.roomConfigJson ?? item?.room_config_json) ??
    parseJsonMaybe(item?.configJson ?? item?.config_json) ??
    parseJsonMaybe(room?.configJson ?? room?.config_json) ??
    room?.configJson ??
    room?.config_json ??
    parseJsonMaybe<any>(item?.metadataJson ?? item?.metadata_json)?.roomConfig ??
    null
  );
}

export function getPackRooms(pack: any): PackRoomDetails[] {
  const items = Array.isArray(pack?.items) ? pack.items : [];
  return items.map((item: any) => {
    const room = getRoomObject(item);
    const config = getRoomConfig(item);
    const prizes = Array.isArray(config?.prizes)
      ? config.prizes
      : Array.isArray(room?.prizes)
        ? room.prizes
        : [];

    return {
      id: item?.id,
      roomId: firstDefined(
        item?.targetRoomId,
        item?.target_room_id,
        item?.roomId,
        item?.room_id,
        room?.roomId,
        room?.room_id,
        room?.id
      ),
      roomName: firstDefined(
        item?.roomName,
        item?.room_name,
        room?.roomName,
        room?.room_name,
        room?.name,
        config?.eventName,
        config?.title
      ),
      itemType: firstDefined(item?.itemType, item?.item_type),
      gameType: firstDefined(item?.gameType, item?.game_type, room?.gameType, room?.game_type),
      quantity: Math.max(1, asNumber(item?.quantity, 1)),
      startsAt: firstDefined(
        item?.startsAt,
        item?.starts_at,
        item?.scheduledAt,
        item?.scheduled_at,
        room?.startsAt,
        room?.starts_at,
        room?.scheduledAt,
        room?.scheduled_at,
        config?.startsAt,
        config?.startDate
      ) ?? null,
      endsAt: firstDefined(
        item?.endsAt,
        item?.ends_at,
        room?.endsAt,
        room?.ends_at,
        config?.endsAt,
        config?.endDate
      ) ?? null,
      location: firstDefined(
        item?.location,
        item?.venue,
        room?.location,
        room?.venue,
        room?.eventLocation,
        room?.event_location,
        config?.location,
        config?.venue
      ) ?? null,
      prizes,
    };
  });
}

export function itemTypeLabel(itemType?: string, gameType?: string): string {
  const type = String(itemType || '').toLowerCase();
  const game = String(gameType || '').toLowerCase();

  if (type === 'elimination_entry' || game === 'elimination') return 'Last Player Standing';
  if (type === 'game_entry' || game === 'quiz') {
    return 'Quiz Entry + All Extras';
  }
  if (type === 'puzzle_entry' || game === 'puzzle_sub' || game === 'puzzle_drop') return 'Puzzle Challenge';
  if (type === 'event_ticket' || game === 'ticketed_event') return 'Event Ticket';

  return 'Fundraiser Entry';
}

export function includedLine(room: PackRoomDetails): string {
  const quantity =
    room.quantity > 1 ? `${room.quantity} × ` : '';

  const label = itemTypeLabel(
    room.itemType,
    room.gameType,
  );

  return `${quantity}${label}${
    room.roomName ? ` — ${room.roomName}` : ''
  }`;
}

export function formatEventDate(value?: string | null): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
}

export function formatEventTime(value?: string | null): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}

export function getPlaceLabel(place: RoomPrize['place']): string {
  const n = Number(place);
  if (n === 1) return '1st';
  if (n === 2) return '2nd';
  if (n === 3) return '3rd';
  if (Number.isFinite(n)) return `${n}th`;
  return 'Prize';
}

export function getPackFeatured(pack: any): boolean {
  return asBool(pack?.isFeatured ?? pack?.is_featured);
}

export function getPackSoldOut(pack: any): boolean {
  return asBool(pack?.soldOut ?? pack?.sold_out);
}

export function getPackBadge(pack: any): string | null {
  return firstDefined(pack?.badgeLabel, pack?.badge_label) ?? null;
}

export function getTheme(data: any): typeof DEFAULT_THEME {
  const raw =
    data?.fundraiser?.theme ??
    data?.fundraiser?.theme_json ??
    data?.club?.theme ??
    data?.club?.theme_json;
  const input =
    (typeof raw === 'string'
      ? parseJsonMaybe<ThemeInput>(raw)
      : raw) ?? {};

  const primary =
    data?.club?.brand_primary_color ||
    data?.club?.brandPrimaryColor ||
    input.primary ||
    DEFAULT_THEME.primary;

  return {
    primary,
    secondary:
      input.secondary ||
      data?.club?.brand_secondary_color ||
      DEFAULT_THEME.secondary,
    accent: input.accent || primary || DEFAULT_THEME.accent,
    background:
      data?.club?.brand_background_color ||
      data?.club?.brandBackgroundColor ||
      input.background ||
      DEFAULT_THEME.background,
  };
}