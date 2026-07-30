// src/pages/peer/PeerSupportPage.tsx
//
// Public peer fundraiser support page using the same mobile-first visual
// language and support flow as CampaignSupportPage.
//
// Supported flow:
// packs -> details -> payment -> payment-instructions -> confirm
// Stripe redirects to Checkout. Cash can be claimed immediately. Revolut,
// bank transfer and other manual methods use the shared payment instructions.
//
// Crypto remains hidden until peer orders have their own verified on-chain
// confirmation endpoint. Do not expose crypto here by treating it as a manual
// payment: that would create unverified paid orders.

import { type CSSProperties, type ReactNode, useEffect, useMemo, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Check,
  ChevronRight,
  Clock3,
  CreditCard,
  Gift,
  Heart,
  Loader2,
  Mail,
  MapPin,
  Minus,
  Phone,
  Plus,
  Puzzle,
  ShieldCheck,
  Target,
  Trophy,
  User,
  Users,
  WalletCards,
  X,
} from 'lucide-react';
import api from '../../services/PeerSupportService';
import type {
  PublicPeerPaymentMethod,
  PeerOrderSummary,
  PeerGeneratedEntry,
} from '../../services/PeerSupportService';
import PeerOrderThankYou from '../../components/peer/PeerOrderThankYou';
import {
  PaymentInstructionsContent,
  PaymentInstructionsFooter,
} from '../../components/Quiz/shared/PaymentInstructions';

type Step = 'packs' | 'details' | 'payment' | 'payment-instructions' | 'confirm';

type ThemeInput = {
  primary?: string | null;
  secondary?: string | null;
  accent?: string | null;
  background?: string | null;
};

type RoomPrize = {
  place?: number | string | null;
  value?: number | string | null;
  sponsor?: string | null;
  description?: string | null;
};

type PackRoomDetails = {
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

type CartItem = {
  pack: any;
  quantity: number;
};

const DEFAULT_THEME = {
  primary: '#f97316',
  secondary: '#111827',
  accent: '#fb923c',
  background: '#fff7ed',
};

function asNumber(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function asBool(value: unknown): boolean {
  return value === true || value === 1 || value === '1';
}

function firstDefined<T>(...values: Array<T | null | undefined>): T | undefined {
  return values.find(value => value !== undefined && value !== null && value !== '') as T | undefined;
}

function parseJsonMaybe<T>(value: unknown): T | null {
  if (!value) return null;
  if (typeof value === 'object') return value as T;
  if (typeof value !== 'string') return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

function fmt(amount: number | string, currency = 'EUR') {
  const symbols: Record<string, string> = { EUR: '€', GBP: '£', USD: '$' };
  const code = currency || 'EUR';
  return `${symbols[code] ?? `${code} `}${asNumber(amount).toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}

function currencySymbol(currency: string): string {
  return currency === 'EUR' ? '€' : currency === 'GBP' ? '£' : currency === 'USD' ? '$' : currency;
}

function friendlyOrderError(message: string): string {
  if (message === 'pack_not_available') {
    return 'One of the packs in your cart is no longer available. Its sales window may have closed. Please go back and check your selection.';
  }
  if (message === 'pack_sold_out') {
    return 'One of the packs in your cart has just sold out. Please go back and adjust your selection.';
  }
  return message || 'Something went wrong. Please try again.';
}

function generateReference(): string {
  return `PF-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

function formatProviderName(providerName?: string | null): string {
  const raw = String(providerName || '').trim();
  if (!raw) return 'payment app';
  return raw.replace(/_/g, ' ').replace(/\b\w/g, char => char.toUpperCase());
}

function isStripeMethod(method: PublicPeerPaymentMethod | null | undefined): boolean {
  if (!method) return false;
  const category = String(method.methodCategory || '').toLowerCase();
  const provider = String(method.providerName || '').toLowerCase();
  return category === 'stripe' || provider === 'stripe';
}

function isCryptoMethod(method: PublicPeerPaymentMethod | null | undefined): boolean {
  return String(method?.methodCategory || '').toLowerCase() === 'crypto';
}

function isInstantMethod(method: PublicPeerPaymentMethod | null | undefined): boolean {
  if (!method) return false;
  const category = String(method.methodCategory || '').toLowerCase();
  const provider = String(method.providerName || '').toLowerCase();
  return category === 'instant_payment' || category === 'bank_transfer' || provider === 'revolut' || provider === 'bank_transfer';
}

function isCashMethod(method: PublicPeerPaymentMethod | null | undefined): boolean {
  if (!method) return false;
  const category = String(method.methodCategory || '').toLowerCase();
  const provider = String(method.providerName || '').toLowerCase();
  return ['cash_to_participant', 'cash_to_player', 'cash'].includes(category) ||
    ['cash_to_participant', 'cash_to_player', 'cash', 'cash_at_door'].includes(provider);
}

function hasProviderInstructionStep(method: PublicPeerPaymentMethod | null | undefined): boolean {
  if (!method) return false;
  const provider = String(method.providerName || '').toLowerCase();
  return provider === 'revolut' || provider === 'bank_transfer';
}

function methodDisplay(method: PublicPeerPaymentMethod): { icon: string; label: string; hint: string } {
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

function getRoomObject(item: any): any {
  return item?.room ?? item?.roomDetails ?? item?.room_details ?? item?.targetRoom ?? item?.target_room ?? null;
}

function getRoomConfig(item: any): any {
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

function getPackRooms(pack: any): PackRoomDetails[] {
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

function itemTypeLabel(itemType?: string, gameType?: string): string {
  const type = String(itemType || '').toLowerCase();
  const game = String(gameType || '').toLowerCase();

  if (type === 'elimination_entry' || game === 'elimination') return 'Last Player Standing';
  if (type === 'quiz_team_ticket') return 'Quiz Team Ticket';
  if (type === 'quiz_individual_ticket') return 'Individual Quiz Ticket';
  if (type === 'puzzle_entry' || game === 'puzzle_sub' || game === 'puzzle_drop') return 'Puzzle Challenge';
  if (type === 'event_ticket' || game === 'ticketed_event') return 'Event Ticket';
  if (type === 'game_entry') return 'Game Entry';
  return 'Fundraiser Entry';
}

function includedLine(room: PackRoomDetails): string {
  const quantity = room.quantity > 1 ? `${room.quantity} × ` : '';
  const label = itemTypeLabel(room.itemType, room.gameType);
  return `${quantity}${label}${room.roomName ? ` - ${room.roomName}` : ''}`;
}

function formatEventDate(value?: string | null): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
}

function formatEventTime(value?: string | null): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}

function getPlaceLabel(place: RoomPrize['place']): string {
  const n = Number(place);
  if (n === 1) return '1st';
  if (n === 2) return '2nd';
  if (n === 3) return '3rd';
  if (Number.isFinite(n)) return `${n}th`;
  return 'Prize';
}

function getPackFeatured(pack: any): boolean {
  return asBool(pack?.isFeatured ?? pack?.is_featured);
}

function getPackSoldOut(pack: any): boolean {
  return asBool(pack?.soldOut ?? pack?.sold_out);
}

function getPackBadge(pack: any): string | null {
  return firstDefined(pack?.badgeLabel, pack?.badge_label) ?? null;
}

function getTheme(data: any): typeof DEFAULT_THEME {
  const raw = data?.fundraiser?.theme ?? data?.fundraiser?.theme_json ?? data?.club?.theme ?? data?.club?.theme_json;
  const input = (typeof raw === 'string' ? parseJsonMaybe<ThemeInput>(raw) : raw) ?? {};
  return {
    primary: input.primary || DEFAULT_THEME.primary,
    secondary: input.secondary || DEFAULT_THEME.secondary,
    accent: input.accent || DEFAULT_THEME.accent,
    background: input.background || DEFAULT_THEME.background,
  };
}

export default function PeerSupportPage() {
  const { clubSlug = '', fundraiserSlug = '', participantSlug } = useParams();
  const [searchParams] = useSearchParams();

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [cart, setCart] = useState<Record<string, number>>({});
  const [activePack, setActivePack] = useState<any | null>(null);
  const [step, setStep] = useState<Step>('packs');

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

  const [methods, setMethods] = useState<PublicPeerPaymentMethod[]>([]);
  const [methodsLoading, setMethodsLoading] = useState(false);
  const [methodsError, setMethodsError] = useState<string | null>(null);
  const [selectedMethod, setSelectedMethod] = useState<PublicPeerPaymentMethod | null>(null);
  const [reference] = useState(generateReference);
  const [hasCopiedReference, setHasCopiedReference] = useState(false);
  const [hasOpenedProviderLink, setHasOpenedProviderLink] = useState(false);

  const [orderId, setOrderId] = useState<string | null>(null);
  const [orderSummary, setOrderSummary] = useState<PeerOrderSummary | null>(null);
  const [entries, setEntries] = useState<PeerGeneratedEntry[]>([]);

  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const cancelled = searchParams.get('cancelled') === '1';

  useEffect(() => {
    setLoading(true);
    setLoadError(null);
    api.page(clubSlug, fundraiserSlug, participantSlug)
      .then(result => {
        setData(result);
        setCart({});
        setActivePack(null);
      })
      .catch(err => setLoadError(err?.message || 'Could not load this fundraiser.'))
      .finally(() => setLoading(false));
  }, [clubSlug, fundraiserSlug, participantSlug]);

  useEffect(() => {
    if (step !== 'payment' || !data?.fundraiser?.id) return;

    setMethodsLoading(true);
    setMethodsError(null);
    api.paymentMethods(data.fundraiser.id)
      .then(result => {
        const available = (result.paymentMethods ?? []).filter((method: PublicPeerPaymentMethod) => !isCryptoMethod(method));
        setMethods(available);
        setSelectedMethod(current => available.find((method: PublicPeerPaymentMethod) => method.id === current?.id) ?? available[0] ?? null);
      })
      .catch(err => setMethodsError(err?.message || 'Could not load payment options.'))
      .finally(() => setMethodsLoading(false));
  }, [step, data?.fundraiser?.id]);

  const cartItems = useMemo<CartItem[]>(() => {
    if (!data?.packs) return [];
    return data.packs
      .filter((pack: any) => asNumber(cart[pack.id]) > 0)
      .map((pack: any) => ({ pack, quantity: asNumber(cart[pack.id]) }));
  }, [data, cart]);

  const total = useMemo(
    () => cartItems.reduce((sum, item) => sum + asNumber(item.pack.price) * item.quantity, 0),
    [cartItems]
  );
  const cartCount = useMemo(() => cartItems.reduce((sum, item) => sum + item.quantity, 0), [cartItems]);
  const currency = data?.fundraiser?.currency || data?.packs?.[0]?.currency || 'EUR';

  const theme = useMemo(() => getTheme(data), [data]);
  const appStyle = {
    '--fr-primary': theme.primary,
    '--fr-secondary': theme.secondary,
    '--fr-accent': theme.accent,
    '--fr-bg': theme.background,
  } as CSSProperties;

  const participantName = firstDefined(
    data?.participant?.participantName,
    data?.participant?.participant_name,
    data?.participant?.name
  );
  const title = participantName ? `Support ${participantName}` : `Support ${data?.club?.name || 'this fundraiser'}`;
  const subtitle = data?.fundraiser?.description || data?.fundraiser?.name;
  const logoUrl = firstDefined(data?.club?.logoUrl, data?.club?.logo_url, data?.fundraiser?.logoUrl, data?.fundraiser?.logo_url);

  const target = asNumber(firstDefined(
    data?.participant?.targetAmount,
    data?.participant?.target_amount,
    data?.fundraiser?.targetAmount,
    data?.fundraiser?.target_amount
  ));
  const raised = asNumber(firstDefined(
    data?.participant?.raisedAmount,
    data?.participant?.raised_amount,
    data?.participant?.actualAmount,
    data?.participant?.actual_amount,
    data?.fundraiser?.raisedAmount,
    data?.fundraiser?.raised_amount,
    data?.fundraiser?.actualAmount,
    data?.fundraiser?.actual_amount
  ));
  const progress = target > 0 ? Math.min(100, Math.round((raised / target) * 100)) : 0;

  const setPackQuantity = (pack: any, quantity: number) => {
    if (getPackSoldOut(pack)) return;
    setCart(current => {
      const next = { ...current };
      if (quantity <= 0) delete next[pack.id];
      else next[pack.id] = quantity;
      return next;
    });
  };

  const goToDetails = () => {
    if (!cartCount) {
      setFormError('Please choose at least one pack first.');
      return;
    }
    setFormError(null);
    setStep('details');
  };

  const goToPayment = () => {
    if (!name.trim() || !email.trim()) {
      setFormError('Please enter your name and email.');
      return;
    }
    setFormError(null);
    setStep('payment');
  };

  async function loadOrderSummary(id: string) {
    const summary = await api.getOrderSummary(id);
    setOrderSummary(summary.order);
    setEntries(summary.entries ?? []);
    setStep('confirm');
  }

  async function createOrderAndProceed() {
    if (!selectedMethod) {
      setFormError('Please select a payment method.');
      return;
    }

    setSubmitting(true);
    setFormError(null);

    try {
      const result = await api.order(data.fundraiser.id, {
        participantId: data.participant?.id || null,
        supporterName: name.trim(),
        supporterEmail: email.trim(),
        supporterPhone: phone.trim() || null,
        paymentMethodCategory: selectedMethod.methodCategory,
        clubPaymentMethodId: selectedMethod.id,
        paymentProvider: selectedMethod.providerName || null,
        paymentReference: reference,
        items: cartItems.map(item => ({ packId: item.pack.id, quantity: item.quantity })),
      } as any);

      setOrderId(result.orderId);

      if (isStripeMethod(selectedMethod)) {
        const checkout = await api.stripeCheckout(result.orderId);
        const url = checkout.url || checkout.checkoutUrl;
        if (!url) throw new Error('Could not start card checkout. Please try again.');
        window.location.href = url;
        return;
      }

      if (isCashMethod(selectedMethod)) {
        await api.claim(result.orderId, {
          paymentReference: null,
          clubPaymentMethodId: selectedMethod.id,
        });
        await loadOrderSummary(result.orderId);
        return;
      }

      setHasCopiedReference(false);
      setHasOpenedProviderLink(false);
      setStep('payment-instructions');
    } catch (err: any) {
      setFormError(friendlyOrderError(err?.message));
    } finally {
      setSubmitting(false);
    }
  }

  async function confirmManualPayment() {
    if (!orderId || !selectedMethod) {
      setFormError('Could not find the order to confirm. Please go back and try again.');
      return;
    }

    setSubmitting(true);
    setFormError(null);

    try {
      await api.claim(orderId, {
        paymentReference: reference,
        clubPaymentMethodId: selectedMethod.id,
      });
      await loadOrderSummary(orderId);
    } catch (err: any) {
      setFormError(err?.message || 'Could not confirm your payment. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return <AppShell style={appStyle}><LoadingState message="Loading support page…" /></AppShell>;
  }

  if (loadError) {
    return <AppShell style={appStyle}><EmptyState title="Something went wrong" message={loadError} /></AppShell>;
  }

  if (!data?.fundraiser) {
    return <AppShell style={appStyle}><EmptyState title="Fundraiser not found" message="This peer fundraiser could not be loaded." /></AppShell>;
  }

  return (
    <AppShell style={appStyle}>
      {step === 'packs' && (
        <>
          <main className="mx-auto min-h-[100dvh] w-full max-w-[430px] overflow-x-hidden px-3 pb-36 pt-3 sm:max-w-lg sm:px-4 lg:max-w-5xl lg:pb-20">
            <header className="mb-3 flex items-center justify-between gap-3 rounded-b-[1.75rem] bg-white/95 px-4 py-3 shadow-sm ring-1 ring-black/5 backdrop-blur">
              <div className="min-w-0">
                <p className="truncate text-lg font-black tracking-tight text-slate-950">{title}</p>
                <p className="text-xs font-bold text-slate-400">Peer fundraiser support page</p>
              </div>
              <a href="/" className="shrink-0 rounded-full bg-slate-950 px-3 py-2 text-xs font-black text-white">FundRaisely</a>
            </header>

            <section className="w-full overflow-hidden rounded-[2rem] bg-white/95 px-3 py-4 shadow-sm ring-1 ring-black/5 sm:px-4 lg:grid lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-6 lg:px-6">
              <div className="grid grid-cols-[106px_minmax(0,1fr)] items-center gap-3 sm:grid-cols-[128px_minmax(0,1fr)] lg:block">
                <div className="grid h-28 w-28 shrink-0 place-items-center overflow-hidden rounded-3xl bg-slate-50 sm:h-32 sm:w-32 lg:mx-auto lg:h-44 lg:w-44">
                  {logoUrl ? (
                    <img src={logoUrl} alt={`${data.club?.name || 'Club'} logo`} className="h-full w-full object-contain" />
                  ) : (
                    <Heart className="h-14 w-14 fill-[var(--fr-primary)] text-[var(--fr-primary)]" />
                  )}
                </div>
                <div className="min-w-0 overflow-hidden lg:mt-4 lg:text-center">
                  <p className="text-xs font-black uppercase tracking-wide text-[var(--fr-primary)]">{data.club?.name}</p>
                  <h1 className="mt-1 max-w-full break-words text-[clamp(1.35rem,6.2vw,2rem)] font-black leading-tight tracking-tight text-slate-950 sm:text-3xl">
                    {subtitle}
                  </h1>
                  {data.fundraiser?.description && (
                    <p className="mt-2 text-sm font-semibold text-slate-500">{data.fundraiser.name}</p>
                  )}
                </div>
              </div>

              {(target > 0 || raised > 0) && (
                <div className="mt-5 lg:mt-0 lg:flex lg:flex-col lg:justify-end">
                  <div className="flex items-center justify-between text-sm font-bold">
                    <span><span className="text-[var(--fr-primary)]">{fmt(raised, currency)}</span> raised</span>
                    {target > 0 && <span className="text-slate-500">Target: {fmt(target, currency)}</span>}
                  </div>
                  <div className="mt-2 h-3 overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full rounded-full bg-[var(--fr-primary)] transition-all" style={{ width: `${progress}%` }} />
                  </div>
                  {target > 0 && <div className="mt-1 text-right text-xs font-black text-[var(--fr-primary)]">{progress}%</div>}
                </div>
              )}
            </section>

            {cancelled && (
              <div className="mt-4 rounded-2xl bg-amber-50 p-3 text-center text-sm font-bold text-amber-800 ring-1 ring-amber-100">
                Checkout was cancelled. Your card was not charged. Choose a pack below to try again.
              </div>
            )}

            {!data.packs?.length ? (
              <EmptyCard title="No packs available yet" message="The organiser has not added any peer fundraising packs yet." />
            ) : (
              <section className="mt-5 grid gap-3 lg:grid-cols-2">
                {data.packs.map((pack: any) => (
                  <PackChoiceCard
                    key={pack.id}
                    pack={pack}
                    currency={currency}
                    quantity={asNumber(cart[pack.id])}
                    onOpen={() => setActivePack(pack)}
                    onAdd={() => setPackQuantity(pack, asNumber(cart[pack.id]) + 1)}
                    onRemove={() => setPackQuantity(pack, asNumber(cart[pack.id]) - 1)}
                  />
                ))}
              </section>
            )}

            <PrizeStrip packs={data.packs ?? []} currency={currency} onOpenPack={setActivePack} />

            <a href="/" className="mt-8 flex items-center justify-center gap-2 text-xs font-bold text-slate-500 hover:text-[var(--fr-primary)]">
              <ShieldCheck className="h-4 w-4" /> Created by FundRaisely
            </a>
          </main>

          {formError && (
            <div className="fixed inset-x-4 bottom-28 z-[10001] mx-auto max-w-md rounded-2xl bg-red-50 px-4 py-3 text-sm font-bold text-red-700 ring-1 ring-red-100">
              {formError}
            </div>
          )}

          <SelectionBar total={total} count={cartCount} currency={currency} onContinue={goToDetails} />

          {activePack && (
            <PackDetailsSheet pack={activePack} currency={currency} onClose={() => setActivePack(null)} />
          )}
        </>
      )}

      {step === 'details' && (
        <StepPanel title="Your details" subtitle="We’ll use this to send your confirmation and entry links." onBack={() => setStep('packs')}>
          <div className="space-y-3">
            <InputShell icon={<User className="h-5 w-5" />}>
              <input value={name} onChange={event => setName(event.target.value)} placeholder="Your name" className="w-full bg-transparent text-base font-semibold outline-none placeholder:text-slate-400" />
            </InputShell>
            <InputShell icon={<Mail className="h-5 w-5" />}>
              <input type="email" value={email} onChange={event => setEmail(event.target.value)} placeholder="Email for confirmation and links" className="w-full bg-transparent text-base font-semibold outline-none placeholder:text-slate-400" />
            </InputShell>
            <InputShell icon={<Phone className="h-5 w-5" />}>
              <input type="tel" value={phone} onChange={event => setPhone(event.target.value)} placeholder="Phone number (optional)" className="w-full bg-transparent text-base font-semibold outline-none placeholder:text-slate-400" />
            </InputShell>
          </div>

          <OrderMiniSummary cartItems={cartItems} currency={currency} />
          {formError && <FormError>{formError}</FormError>}

          <button onClick={goToPayment} disabled={!name.trim() || !email.trim()} className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-[var(--fr-primary)] px-5 py-4 text-lg font-black text-white shadow-lg shadow-orange-500/20 disabled:cursor-not-allowed disabled:opacity-50">
            Continue <ArrowRight className="h-5 w-5" />
          </button>
        </StepPanel>
      )}

      {step === 'payment' && (
        <StepPanel title="How would you like to pay?" subtitle={`Total to pay: ${fmt(total, currency)}`} onBack={() => setStep('details')}>
          {methodsLoading && <LoadingState message="Loading payment options…" compact />}

          {!methodsLoading && methodsError && (
            <FormError>Could not load payment options ({methodsError}). Please refresh and try again.</FormError>
          )}

          {!methodsLoading && !methodsError && methods.length === 0 && (
            <FormError>No payment methods are configured for this fundraiser yet. Please contact the organiser.</FormError>
          )}

          {!methodsLoading && !methodsError && methods.length > 0 && (
            <div className="space-y-3">
              {methods.map(method => {
                const display = methodDisplay(method);
                const selected = selectedMethod?.id === method.id;
                return (
                  <button
                    key={method.id}
                    type="button"
                    onClick={() => {
                      setSelectedMethod(method);
                      setFormError(null);
                      setHasCopiedReference(false);
                      setHasOpenedProviderLink(false);
                    }}
                    className={`flex w-full items-center gap-3 rounded-2xl border p-4 text-left transition ${selected ? 'border-[var(--fr-primary)] bg-orange-50 ring-2 ring-orange-100' : 'border-slate-200 bg-white hover:border-orange-200'}`}
                  >
                    <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-slate-50 text-2xl">{display.icon}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-base font-black text-slate-950">{display.label}</span>
                      <span className="mt-0.5 block text-sm font-medium text-slate-500">{display.hint}</span>
                    </span>
                    {selected ? <Check className="h-5 w-5 text-[var(--fr-primary)]" /> : <ChevronRight className="h-5 w-5 text-slate-300" />}
                  </button>
                );
              })}
            </div>
          )}

          {selectedMethod && isInstantMethod(selectedMethod) && (
            <div className="mt-4 rounded-2xl bg-blue-50 p-4 text-sm font-semibold text-blue-900 ring-1 ring-blue-100">
              You’ll get a unique payment reference and the organiser’s instructions on the next screen.
            </div>
          )}

          {selectedMethod && isCashMethod(selectedMethod) && (
            <div className="mt-4 rounded-2xl bg-orange-50 p-4 text-sm font-semibold text-slate-700 ring-1 ring-orange-100">
              Give the cash directly to the participant. The club will confirm it before any entry links are activated.
            </div>
          )}

          {formError && !methodsError && <FormError>{formError}</FormError>}

          <button onClick={createOrderAndProceed} disabled={!selectedMethod || submitting || methodsLoading} className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-[var(--fr-primary)] px-5 py-4 text-lg font-black text-white shadow-lg shadow-orange-500/20 disabled:cursor-not-allowed disabled:opacity-50">
            {submitting ? (
              <><Loader2 className="h-5 w-5 animate-spin" /> Processing…</>
            ) : selectedMethod && isCashMethod(selectedMethod) ? (
              <><Check className="h-5 w-5" /> I&apos;ve given the cash</>
            ) : selectedMethod && isStripeMethod(selectedMethod) ? (
              <><CreditCard className="h-5 w-5" /> Continue</>
            ) : (
              <><WalletCards className="h-5 w-5" /> Continue</>
            )}
          </button>

          <div className="mt-4 rounded-2xl bg-slate-50 p-3 text-xs font-semibold text-slate-500 ring-1 ring-slate-100">
            Crypto is not shown on peer fundraiser pages yet because peer orders still need a verified on-chain confirmation endpoint.
          </div>
        </StepPanel>
      )}

      {step === 'payment-instructions' && selectedMethod && orderId && (
        <StepPanel title="Complete your payment" subtitle={methodDisplay(selectedMethod).label} onBack={() => setStep('payment')} wide>
          <PaymentInstructionsContent
            method={{
              id: selectedMethod.id,
              methodLabel: selectedMethod.methodLabel,
              methodCategory: selectedMethod.methodCategory,
              providerName: selectedMethod.providerName ?? null,
              playerInstructions: (selectedMethod as any).playerInstructions ?? null,
              methodConfig: ((selectedMethod as any).methodConfig ?? {}) as any,
            }}
            paymentReference={reference}
            totalAmount={total}
            currencySymbol={currencySymbol(currency)}
            revolutLink={
              String(selectedMethod.providerName || '').toLowerCase() === 'revolut' &&
              (selectedMethod as any).methodConfig &&
              'link' in ((selectedMethod as any).methodConfig as any)
                ? ((selectedMethod as any).methodConfig as any).link
                : undefined
            }
            error={formError}
            hasEverCopied={hasCopiedReference}
            hasOpenedProviderLink={hasOpenedProviderLink}
            onCopied={() => setHasCopiedReference(true)}
            onOpenedLink={() => setHasOpenedProviderLink(true)}
          />

          <div className="mt-5">
            <PaymentInstructionsFooter
              hasEverCopied={hasCopiedReference}
              hasOpenedProviderLink={hasOpenedProviderLink}
              hasProviderStep={hasProviderInstructionStep(selectedMethod)}
              confirming={submitting}
              onConfirmPaid={confirmManualPayment}
              onBack={() => setStep('payment')}
            />
          </div>
        </StepPanel>
      )}

      {step === 'confirm' && orderSummary && (
        <StepPanel title="" wide>
          <PeerOrderThankYou
            order={orderSummary}
            entries={entries}
            fundraiserName={data.fundraiser.name}
            orderId={orderId}
          />
        </StepPanel>
      )}
    </AppShell>
  );
}

function AppShell({ children, style }: { children: ReactNode; style: CSSProperties }) {
  return (
    <div
      style={style}
      className="fixed inset-0 z-[9999] min-h-[100dvh] overflow-x-hidden overflow-y-auto bg-[radial-gradient(circle_at_top_right,var(--fr-bg),white_42%,#f8fafc_100%)] text-slate-950 overscroll-contain"
    >
      {children}
    </div>
  );
}

function PackChoiceCard({ pack, currency, quantity, onOpen, onAdd, onRemove }: {
  pack: any;
  currency: string;
  quantity: number;
  onOpen: () => void;
  onAdd: () => void;
  onRemove: () => void;
}) {
  const featured = getPackFeatured(pack);
  const badge = getPackBadge(pack) || (featured ? 'Most popular' : null);
  const soldOut = getPackSoldOut(pack);
  const rooms = getPackRooms(pack);

  return (
    <article className={`relative overflow-visible rounded-3xl bg-white p-3 shadow-sm ring-1 transition ${featured ? 'ring-[var(--fr-primary)]' : 'ring-slate-200'} ${quantity > 0 ? 'shadow-orange-100 ring-2 ring-[var(--fr-primary)]' : ''}`}>
      {badge && (
        <div className="absolute -top-3 left-5 z-10 flex items-center gap-1.5 rounded-full bg-[var(--fr-primary)] px-5 py-2 text-xs font-black uppercase tracking-wide text-white shadow-lg shadow-orange-500/20">
          <Trophy className="h-4 w-4 fill-white text-white" /> {badge}
        </div>
      )}

      <button type="button" onClick={onOpen} className="flex w-full items-center gap-4 pt-2 text-left">
        <div className={`grid h-20 w-20 shrink-0 place-items-center rounded-3xl ${featured ? 'bg-gradient-to-br from-yellow-100 via-amber-100 to-orange-50' : 'bg-slate-50'}`}>
          <PackArtwork pack={pack} featured={featured} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <h2 className="max-w-full break-words text-[clamp(1.05rem,4.8vw,1.25rem)] font-black leading-tight tracking-tight text-slate-950">{pack.name} - {fmt(pack.price, pack.currency ?? currency)}</h2>
            <ChevronRight className="mt-1 h-5 w-5 shrink-0 text-slate-300" />
          </div>
          <div className="mt-2 space-y-1">
            {(rooms.length ? rooms : [{ quantity: 1, prizes: [] } as PackRoomDetails]).slice(0, 2).map((room, index) => (
              <div key={`${room.roomId ?? index}`} className="flex items-center gap-2 text-sm font-semibold text-slate-600">
                <Check className="h-4 w-4 shrink-0 rounded-full bg-[var(--fr-primary)] p-0.5 text-white" />
                <span className="truncate">{includedLine(room)}</span>
              </div>
            ))}
          </div>
        </div>
      </button>

      <div className="mt-3 flex items-center justify-between gap-3 border-t border-slate-100 pt-3">
        <button type="button" onClick={onOpen} className="text-sm font-black text-[var(--fr-primary)]">Details & prizes</button>
        {soldOut ? (
          <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-black text-slate-500">Sold out</span>
        ) : quantity > 0 ? (
          <div className="flex items-center gap-2 rounded-full bg-orange-50 p-1 ring-1 ring-orange-100">
            <button type="button" onClick={onRemove} className="grid h-9 w-9 place-items-center rounded-full bg-white text-slate-900 shadow-sm"><Minus className="h-4 w-4" /></button>
            <span className="w-6 text-center text-base font-black text-slate-950">{quantity}</span>
            <button type="button" onClick={onAdd} className="grid h-9 w-9 place-items-center rounded-full bg-[var(--fr-primary)] text-white shadow-sm"><Plus className="h-4 w-4" /></button>
          </div>
        ) : (
          <button type="button" onClick={onAdd} className="rounded-full bg-[var(--fr-secondary)] px-4 py-2 text-sm font-black text-white">Add</button>
        )}
      </div>
    </article>
  );
}

function PackArtwork({ pack, featured }: { pack: any; featured: boolean }) {
  const room = getPackRooms(pack)[0];
  if (featured) {
    return (
      <div className="relative grid h-[4.5rem] w-[4.5rem] place-items-center rounded-full bg-gradient-to-br from-yellow-300 via-amber-400 to-orange-500 shadow-inner">
        <Trophy className="h-12 w-12 fill-black/90 text-black" />
      </div>
    );
  }

  const className = 'h-9 w-9';
  const type = String(room?.itemType || '').toLowerCase();
  const game = String(room?.gameType || '').toLowerCase();
  if (type === 'puzzle_entry' || game.includes('puzzle')) return <Puzzle className={`${className} text-[var(--fr-primary)]`} />;
  if (type.includes('quiz') || game === 'quiz') return <Users className={`${className} text-slate-950`} />;
  if (type === 'elimination_entry' || game === 'elimination') return <Trophy className={`${className} text-slate-950`} />;
  if (String(pack?.packType || pack?.pack_type || '').toLowerCase() === 'donation') return <Heart className={`${className} fill-[var(--fr-primary)] text-[var(--fr-primary)]`} />;
  return <Gift className={`${className} text-[var(--fr-primary)]`} />;
}

function PrizeStrip({ packs, currency, onOpenPack }: { packs: any[]; currency: string; onOpenPack: (pack: any) => void }) {
  const prizePacks = packs.filter(pack => getPackRooms(pack).some(room => room.prizes.length > 0));
  if (!prizePacks.length) return null;

  return (
    <section className="mt-6">
      <h2 className="mb-2 text-sm font-black uppercase tracking-wide text-slate-700">Prize details</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        {prizePacks.slice(0, 4).map(pack => {
          const room = getPackRooms(pack).find(candidate => candidate.prizes.length > 0);
          if (!room) return null;
          return (
            <button key={pack.id} type="button" onClick={() => onOpenPack(pack)} className="flex items-center gap-3 rounded-2xl border border-orange-100 bg-white/80 p-3 text-left shadow-sm">
              <div className="grid h-12 w-12 place-items-center rounded-2xl bg-orange-50 text-[var(--fr-secondary)]">
                {String(room.itemType || '').toLowerCase() === 'puzzle_entry' ? <Puzzle className="h-7 w-7" /> : <Trophy className="h-7 w-7" />}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-black text-slate-950">{room.roomName || itemTypeLabel(room.itemType, room.gameType)} prizes</div>
                <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs font-bold text-slate-600">
                  {room.prizes.slice(0, 3).map((prize, index) => (
                    <span key={index}>{getPlaceLabel(prize.place)} <span className="text-[var(--fr-primary)]">{prize.value ? fmt(prize.value, currency) : prize.description}</span></span>
                  ))}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function PackDetailsSheet({ pack, currency, onClose }: { pack: any; currency: string; onClose: () => void }) {
  const rooms = getPackRooms(pack);
  const featured = getPackFeatured(pack);

  return (
    <div className="fixed inset-0 z-[10002] flex items-end justify-center bg-slate-950/45 p-0 backdrop-blur-sm sm:items-center sm:p-6" onClick={onClose}>
      <div className="max-h-[88dvh] w-full max-w-lg overflow-y-auto rounded-t-[2rem] bg-white p-5 shadow-2xl sm:rounded-[2rem]" onClick={event => event.stopPropagation()}>
        <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-slate-200 sm:hidden" />
        <div className="flex items-start gap-4">
          <div className="grid h-20 w-20 shrink-0 place-items-center rounded-3xl bg-orange-50">
            <PackArtwork pack={pack} featured={featured} />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="break-words text-2xl font-black leading-tight tracking-tight text-slate-950">{pack.name}</h2>
            <p className="mt-1 text-xl font-black text-[var(--fr-primary)]">{fmt(pack.price, pack.currency ?? currency)}</p>
            {pack.description && <p className="mt-2 text-sm font-semibold text-slate-500">{pack.description}</p>}
          </div>
          <button type="button" onClick={onClose} className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-slate-100 text-slate-500"><X className="h-5 w-5" /></button>
        </div>

        <div className="mt-5 space-y-3">
          {rooms.map((room, index) => (
            <div key={`${room.id ?? room.roomId ?? index}`} className="rounded-3xl bg-slate-50 p-4 ring-1 ring-slate-100">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="break-words text-base font-black text-slate-950">{includedLine(room)}</p>
                </div>
                <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-slate-600 ring-1 ring-slate-200">x{room.quantity}</span>
              </div>

              <div className="mt-3 grid gap-2 text-sm font-semibold text-slate-600">
                {room.startsAt && <div className="flex items-center gap-2"><CalendarDays className="h-4 w-4 text-[var(--fr-primary)]" /> {formatEventDate(room.startsAt)}</div>}
                {room.startsAt && <div className="flex items-center gap-2"><Clock3 className="h-4 w-4 text-[var(--fr-primary)]" /> {formatEventTime(room.startsAt)}{room.endsAt ? ` – ${formatEventTime(room.endsAt)}` : ''}</div>}
                {room.location && <div className="flex items-center gap-2"><MapPin className="h-4 w-4 text-[var(--fr-primary)]" /> {room.location}</div>}
              </div>

              {room.prizes.length > 0 && (
                <div className="mt-4">
                  <p className="mb-2 text-xs font-black uppercase tracking-wide text-slate-500">Prize details</p>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                    {room.prizes.slice(0, 6).map((prize, prizeIndex) => (
                      <div key={prizeIndex} className="rounded-2xl bg-white p-3 ring-1 ring-orange-100">
                        <p className="text-xs font-black text-slate-500">{getPlaceLabel(prize.place)}</p>
                        <p className="mt-0.5 text-base font-black text-[var(--fr-primary)]">{prize.value ? fmt(prize.value, currency) : prize.description || 'Prize'}</p>
                        {prize.description && prize.value && <p className="mt-1 text-xs font-bold text-slate-600">{prize.description}</p>}
                        {prize.sponsor && <p className="mt-1 text-[11px] font-bold text-slate-400">Sponsored by {prize.sponsor}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {!rooms.length && (
          <div className="mt-4 rounded-2xl bg-orange-50 p-3 text-sm font-semibold text-slate-600 ring-1 ring-orange-100">
            The pack has no linked event or game details in the public payload yet.
          </div>
        )}

        <button type="button" onClick={onClose} className="mt-5 w-full rounded-2xl bg-slate-950 px-5 py-4 text-base font-black text-white">Close</button>
      </div>
    </div>
  );
}

function SelectionBar({ total, count, currency, onContinue }: { total: number; count: number; currency: string; onContinue: () => void }) {
  if (count <= 0) return null;
  return (
    <div className="fixed inset-x-0 bottom-0 z-[10000] border-t border-slate-200 bg-white/95 px-4 pb-[max(env(safe-area-inset-bottom),1rem)] pt-3 shadow-2xl backdrop-blur">
      <div className="mx-auto flex max-w-md items-center gap-3 lg:max-w-5xl">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-black uppercase tracking-wide text-slate-400">Total to pay</p>
          <p className="text-2xl font-black tracking-tight text-slate-950">{fmt(total, currency)}</p>
          <p className="text-xs font-bold text-slate-500">{count} pack{count === 1 ? '' : 's'} selected</p>
        </div>
        <button type="button" onClick={onContinue} className="flex items-center gap-2 rounded-2xl bg-[var(--fr-primary)] px-6 py-4 text-base font-black text-white shadow-lg shadow-orange-500/20">
          Continue <ArrowRight className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}

function StepPanel({ title, subtitle, children, onBack, wide = false }: { title: string; subtitle?: string; children: ReactNode; onBack?: () => void; wide?: boolean }) {
  return (
    <main className="flex min-h-[100dvh] items-end justify-center px-0 pt-8 sm:items-center sm:px-4 sm:py-10">
      <section className={`w-full ${wide ? 'max-w-2xl' : 'max-w-md'} rounded-t-[2rem] bg-white p-5 shadow-2xl ring-1 ring-black/5 sm:rounded-[2rem] sm:p-6`}>
        <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-slate-200 sm:hidden" />
        <div className="mb-5 flex items-start gap-3">
          {onBack && <button type="button" onClick={onBack} className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-slate-100 text-slate-700"><ArrowLeft className="h-5 w-5" /></button>}
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-black tracking-tight text-slate-950">{title}</h1>
            {subtitle && <p className="mt-1 text-sm font-semibold text-slate-500">{subtitle}</p>}
          </div>
        </div>
        {children}
        <a href="/" className="mt-6 flex items-center justify-center gap-2 text-xs font-bold text-slate-400 hover:text-[var(--fr-primary)]"><ShieldCheck className="h-4 w-4" /> Created by FundRaisely</a>
      </section>
    </main>
  );
}

function InputShell({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 ring-1 ring-transparent focus-within:border-[var(--fr-primary)] focus-within:ring-orange-100">
      <span className="text-slate-500">{icon}</span>
      {children}
    </div>
  );
}

function OrderMiniSummary({ cartItems, currency }: { cartItems: CartItem[]; currency: string }) {
  const total = cartItems.reduce((sum, item) => sum + asNumber(item.pack.price) * item.quantity, 0);
  return (
    <div className="mt-5 rounded-3xl bg-slate-50 p-4 ring-1 ring-slate-100">
      <p className="mb-2 text-xs font-black uppercase tracking-wide text-slate-500">Your selection</p>
      <div className="space-y-2">
        {cartItems.map(item => (
          <div key={item.pack.id} className="flex justify-between gap-4 text-sm font-bold text-slate-700">
            <span>{item.pack.name} ×{item.quantity}</span>
            <span>{fmt(asNumber(item.pack.price) * item.quantity, item.pack.currency ?? currency)}</span>
          </div>
        ))}
      </div>
      <div className="mt-3 flex justify-between border-t border-slate-200 pt-3 text-lg font-black text-slate-950">
        <span>Total</span>
        <span>{fmt(total, currency)}</span>
      </div>
    </div>
  );
}

function FormError({ children }: { children: ReactNode }) {
  return <div className="mt-4 rounded-2xl bg-red-50 p-3 text-sm font-bold text-red-700 ring-1 ring-red-100">{children}</div>;
}

function LoadingState({ message, compact = false }: { message: string; compact?: boolean }) {
  return (
    <div className={`grid place-items-center ${compact ? 'py-8' : 'min-h-screen'} text-slate-600`}>
      <div className="text-center">
        <Loader2 className="mx-auto h-8 w-8 animate-spin text-[var(--fr-primary)]" />
        <p className="mt-3 text-sm font-bold">{message}</p>
      </div>
    </div>
  );
}

function EmptyState({ title, message }: { title: string; message: string }) {
  return (
    <div className="mx-auto grid min-h-screen max-w-md place-items-center px-6 text-center">
      <div className="rounded-[2rem] bg-white p-6 shadow-sm ring-1 ring-slate-100">
        <Target className="mx-auto h-10 w-10 text-[var(--fr-primary)]" />
        <h1 className="mt-3 text-2xl font-black tracking-tight text-slate-950">{title}</h1>
        <p className="mt-2 text-sm font-semibold text-slate-500">{message}</p>
      </div>
    </div>
  );
}

function EmptyCard({ title, message }: { title: string; message: string }) {
  return (
    <div className="mt-5 rounded-3xl bg-white p-6 text-center shadow-sm ring-1 ring-slate-100">
      <Gift className="mx-auto h-9 w-9 text-[var(--fr-primary)]" />
      <h2 className="mt-3 text-xl font-black text-slate-950">{title}</h2>
      <p className="mt-2 text-sm font-semibold text-slate-500">{message}</p>
    </div>
  );
}
