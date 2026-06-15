// src/pages/campaigns/CampaignSupportPage.tsx
//
// Public campaign support page — app-like mobile-first product selection flow.
// Flow:
// 1) Pick products / see product details, event details and prizes
// 2) Enter supporter details
// 3) Select payment method
// 4) Stripe / crypto / manual claim / confirmation

import { type CSSProperties, type ReactNode, lazy, Suspense, useEffect, useMemo, useState } from 'react';
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
import {
  campaignSupportService,
  SupportProduct,
  SupportCampaign,
  Seller,
  GeneratedEntry,
  OrderSummary,
  CampaignPaymentMethod,
} from '../../components/campaignSupport/services/CampaignSupportService';
import { Web3Provider } from '../../components/Web3Provider';
import CampaignOrderThankYou from '../../components/campaignSupport/services/CampaignOrderThankYou';
import {
  PaymentInstructionsContent,
  PaymentInstructionsFooter,
} from '../../components/Quiz/shared/PaymentInstructions';

const CryptoFixedFeeStep = lazy(() =>
  import('../../components/Quiz/joinroom/crypto/CryptoFixedFeeStep').then(m => ({
    default: m.CryptoFixedFeeStep ?? m.default,
  }))
);

type Step = 'products' | 'details' | 'payment' | 'payment-instructions' | 'crypto' | 'confirm';

interface CartItem {
  product: SupportProduct;
  quantity: number;
}

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

type ProductRoomDetails = {
  roomId?: string;
  roomName?: string;
  itemType?: string;
  quantity: number;
  startsAt?: string | null;
  endsAt?: string | null;
  location?: string | null;
  prizes: RoomPrize[];
};

const TALLAGHT_TOWN_THEME = {
  primary: '#f97316',
  secondary: '#111827',
  accent: '#fb923c',
  background: '#fff7ed',
};

// React public paths do not include /public. Update this first path if your filename differs.
const LOGO_FALLBACKS = [
  '/partner/tallaghttow.jpg',
  
];

function useCampaignIdAndSeller(): { campaignId: string; sellerId: string | null } {
  const params = useParams<{ campaignId: string }>();
  const [search] = useSearchParams();
  return { campaignId: params.campaignId ?? '', sellerId: search.get('sellerId') };
}

function asNumber(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function asBool(value: unknown): boolean {
  return value === true || value === 1 || value === '1';
}

function fmt(price: number | string, currency = 'EUR') {
  const symbols: Record<string, string> = { EUR: '€', GBP: '£', USD: '$' };
  const code = currency || 'EUR';
  return `${symbols[code] ?? `${code} `}${asNumber(price).toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}


function formatProviderName(providerName?: string | null): string {
  const raw = String(providerName || '').trim();
  if (!raw) return 'payment app';
  return raw
    .replace(/_/g, ' ')
    .replace(/\b\w/g, char => char.toUpperCase());
}

function generateCampaignPaymentReference(): string {
  const random = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `FR-${random}`;
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

function getCampaignField<T = unknown>(campaign: SupportCampaign | null, camel: string, snake?: string): T | undefined {
  const c = campaign as any;
  return c?.[camel] ?? (snake ? c?.[snake] : undefined);
}

function getSellerName(seller: Seller | null): string | null {
  const s = seller as any;
  return s?.sellerName ?? s?.seller_name ?? s?.name ?? null;
}

function possessive(name: string) {
  return name.trim().endsWith('s') ? `${name.trim()}’ team` : `${name.trim()}’s team`;
}

function getProductFeatured(product: SupportProduct): boolean {
  const p = product as any;
  return asBool(p.isFeatured ?? p.is_featured);
}

function getProductBadge(product: SupportProduct): string | null {
  const p = product as any;
  return p.badgeLabel ?? p.badge_label ?? null;
}

function getProductSoldOut(product: SupportProduct): boolean {
  const p = product as any;
  return asBool(p.soldOut ?? p.sold_out);
}

function getProductType(product: SupportProduct): string | undefined {
  const p = product as any;
  return p.productType ?? p.product_type;
}

function getProductItems(product: SupportProduct): any[] {
  return ((product as any).items ?? []) as any[];
}

function getItemType(item: any): string | undefined {
  return item.itemType ?? item.item_type;
}

function getItemQuantity(item: any): number {
  return Math.max(1, asNumber(item.quantity, 1));
}

function getItemRoomName(item: any): string | undefined {
  return item.roomName ?? item.room_name ?? item.room?.roomName ?? item.room?.room_name ?? item.room?.name;
}

function getItemTargetRoomId(item: any): string | undefined {
  return item.targetRoomId ?? item.target_room_id ?? item.roomId ?? item.room_id ?? item.room?.roomId ?? item.room?.room_id;
}

function firstDefined<T>(...values: Array<T | null | undefined>): T | undefined {
  return values.find(v => v !== undefined && v !== null && v !== '') as T | undefined;
}

function getRoomObjectFromItem(item: any): any {
  return item.room ?? item.roomDetails ?? item.room_details ?? item.targetRoom ?? item.target_room ?? null;
}

function getRoomConfigFromItem(item: any): any {
  const room = getRoomObjectFromItem(item);
  return (
    item.roomConfig ??
    item.room_config ??
    parseJsonMaybe(item.roomConfigJson ?? item.room_config_json) ??
    parseJsonMaybe(item.configJson ?? item.config_json) ??
    parseJsonMaybe(room?.config_json) ??
    parseJsonMaybe(room?.configJson) ??
    room?.configJson ??
    room?.config_json ??
    parseJsonMaybe<any>(item.metadata_json)?.roomConfig ??
    parseJsonMaybe<any>(item.metadataJson)?.roomConfig ??
    null
  );
}

function getRoomDateField(item: any, camel: string, snake: string): string | null {
  const room = getRoomObjectFromItem(item);
  return firstDefined<string>(
    item[camel],
    item[snake],
    room?.[camel],
    room?.[snake],
    room?.event?.[camel],
    room?.event?.[snake]
  ) ?? null;
}

function getRoomLocation(item: any): string | null {
  const room = getRoomObjectFromItem(item);
  return firstDefined<string>(
    item.location,
    item.venue,
    room?.location,
    room?.venue,
    room?.event_location,
    room?.eventLocation,
    parseJsonMaybe<any>(item.metadata_json)?.location,
    parseJsonMaybe<any>(item.metadataJson)?.location
  ) ?? null;
}

function getProductRooms(product: SupportProduct): ProductRoomDetails[] {
  return getProductItems(product).map(item => {
    const config = getRoomConfigFromItem(item);
    const prizes = Array.isArray(config?.prizes) ? config.prizes as RoomPrize[] : [];
    return {
      roomId: getItemTargetRoomId(item),
      roomName: getItemRoomName(item),
      itemType: getItemType(item),
      quantity: getItemQuantity(item),
      startsAt: getRoomDateField(item, 'startsAt', 'starts_at') ?? getRoomDateField(item, 'startTime', 'start_time') ?? getRoomDateField(item, 'scheduledAt', 'scheduled_at'),
      endsAt: getRoomDateField(item, 'endsAt', 'ends_at') ?? getRoomDateField(item, 'endTime', 'end_time'),
      location: getRoomLocation(item),
      prizes,
    };
  });
}

function getPlaceLabel(place: RoomPrize['place']): string {
  const n = Number(place);
  if (n === 1) return '1st';
  if (n === 2) return '2nd';
  if (n === 3) return '3rd';
  if (Number.isFinite(n)) return `${n}th`;
  return 'Prize';
}

function itemTypeLabel(type?: string): string {
  switch (type) {
    case 'elimination_entry':
      return 'Last Player Standing';
    case 'quiz_team_ticket':
      return 'Quiz Team Ticket';
    case 'quiz_individual_ticket':
      return 'Individual Quiz Ticket';
    case 'puzzle_entry':
      return 'Puzzle Challenge';
    case 'event_ticket':
      return 'Event Ticket';
    case 'game_entry':
      return 'Game Entry';
    default:
      return 'Campaign Entry';
  }
}

function includedLine(room: ProductRoomDetails): string {
  const qty = room.quantity > 1 ? `${room.quantity} × ` : '';
  return `${qty}${itemTypeLabel(room.itemType)}${room.roomName ? ` — ${room.roomName}` : ''}`;
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

function isStripeMethod(m: CampaignPaymentMethod | null | undefined): boolean {
  if (!m) return false;
  const cat = m.methodCategory?.toLowerCase() ?? '';
  const provider = m.providerName?.toLowerCase() ?? '';
  return cat === 'stripe' || provider === 'stripe';
}

function isCryptoMethod(m: CampaignPaymentMethod | null | undefined): boolean {
  if (!m) return false;
  return (m.methodCategory?.toLowerCase() ?? '') === 'crypto';
}

function isInstantMethod(m: CampaignPaymentMethod | null | undefined): boolean {
  if (!m) return false;
  return (m.methodCategory?.toLowerCase() ?? '') === 'instant_payment';
}

function isCashToPlayerMethod(m: CampaignPaymentMethod | null | undefined): boolean {
  if (!m) return false;
  const cat = m.methodCategory?.toLowerCase() ?? '';
  const provider = m.providerName?.toLowerCase() ?? '';
  return cat === 'cash_to_player' || cat === 'cash' || provider === 'cash' || provider === 'cash_to_player' || provider === 'cash_at_door';
}

function hasProviderInstructionStep(m: CampaignPaymentMethod | null | undefined): boolean {
  if (!m) return false;
  const provider = m.providerName?.toLowerCase() ?? '';
  return provider === 'revolut' || provider === 'bank_transfer';
}

function methodDisplay(m: CampaignPaymentMethod): { icon: string; label: string; hint: string } {
  const cat = m.methodCategory?.toLowerCase() ?? '';
  const provider = m.providerName?.toLowerCase() ?? '';
  const providerLabel = formatProviderName(m.providerName);

  if (isStripeMethod(m)) {
    return { icon: '💳', label: m.methodLabel || 'Pay online', hint: 'Pay securely by card, Apple Pay or Google Pay.' };
  }

  if (isCryptoMethod(m)) {
    const isSolana = provider === 'solana_wallet' || provider === 'solana';
    return {
      icon: '🔗',
      label: isSolana ? 'Pay with Crypto on Solana' : (m.methodLabel || 'Pay with crypto'),
      hint: 'Pay with crypto — confirmed on-chain automatically.',
    };
  }

  if (isCashToPlayerMethod(m)) {
    return {
      icon: '💵',
      label: 'Cash at the door',
      hint: 'Give cash to the seller at the door.',
    };
  }

  if (cat === 'card') {
    return { icon: '💳', label: m.methodLabel || 'Pay by card', hint: 'Pay by card.' };
  }

  if (isInstantMethod(m)) {
    return {
      icon: provider === 'bank_transfer' ? '🏦' : '📱',
      label: m.methodLabel || providerLabel,
      hint: `Instant payment to ${providerLabel}.`,
    };
  }

  return { icon: '💰', label: m.methodLabel || providerLabel, hint: m.playerInstructions ?? 'Complete payment as instructed.' };
}

function methodCategory(m: CampaignPaymentMethod): string {
  if (isStripeMethod(m)) return 'card';
  if (isCryptoMethod(m)) return 'crypto';
  if (isCashToPlayerMethod(m)) return 'cash_to_player';
  if ((m.methodCategory?.toLowerCase() ?? '') === 'card') return 'card';
  if (isInstantMethod(m)) return 'instant_payment';
  return 'other';
}

function needsStripeUI(m: CampaignPaymentMethod): boolean {
  return isStripeMethod(m);
}

function needsCryptoUI(m: CampaignPaymentMethod): boolean {
  return isCryptoMethod(m);
}

function useLogoSrc(apiLogo?: string | null) {
  const [index, setIndex] = useState(0);
  const src = apiLogo || LOGO_FALLBACKS[index];
  const onError = () => {
    if (!apiLogo && index < LOGO_FALLBACKS.length - 1) setIndex(i => i + 1);
  };
  return { src, onError };
}

// ─── Order confirmation email helper ────────────────────────────────────────────
// Fire-and-forget: never block the UI or show an error to the supporter
// if the email call fails. Calls the backend endpoint which itself is
// non-fatal — the order and ticket records already exist at this point.
function fireOrderConfirmationEmail(orderId: string | null) {
  if (!orderId) return;
  campaignSupportService
    .sendOrderConfirmationEmail(orderId)
    .catch(err => console.warn('[CampaignSupport] Order confirmation email failed (non-fatal):', err?.message));
}

export default function CampaignSupportPage() {
  const { campaignId, sellerId } = useCampaignIdAndSeller();

  const [campaign, setCampaign] = useState<SupportCampaign | null>(null);
  const [products, setProducts] = useState<SupportProduct[]>([]);
  const [seller, setSeller] = useState<Seller | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [cart, setCart] = useState<CartItem[]>([]);
  const [activeProduct, setActiveProduct] = useState<SupportProduct | null>(null);
  const [step, setStep] = useState<Step>('products');

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

  const [paymentMethods, setPaymentMethods] = useState<CampaignPaymentMethod[]>([]);
  const [paymentMethodsLoading, setPaymentMethodsLoading] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState<CampaignPaymentMethod | null>(null);
  const [paymentReference] = useState(generateCampaignPaymentReference);
  const [hasCopiedReference, setHasCopiedReference] = useState(false);
  const [hasOpenedProviderLink, setHasOpenedProviderLink] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [pendingCryptoOrderId, setPendingCryptoOrderId] = useState<string | null>(null);
  const [orderSummary, setOrderSummary] = useState<OrderSummary | null>(null);
  const [entries, setEntries] = useState<GeneratedEntry[]>([]);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (!campaignId) return;
    setLoading(true);
    setError(null);

    campaignSupportService.getCampaignPage(campaignId, sellerId ?? undefined)
      .then(data => {
        const loadedProducts = data.products ?? [];
        setCampaign(data.campaign);
        setProducts(loadedProducts);
        setSeller(data.seller ?? null);
        setActiveProduct(null);
      })
      .catch(err => setError(err.message ?? 'Could not load campaign'))
      .finally(() => setLoading(false));
  }, [campaignId, sellerId]);

  useEffect(() => {
    if (step !== 'payment') return;
    setPaymentMethodsLoading(true);
    setSubmitError(null);

    campaignSupportService.getPaymentMethodsForCampaign(campaignId)
      .then(methods => {
        setPaymentMethods(methods ?? []);
        setSelectedMethod((methods ?? [])[0] ?? null);
      })
      .catch(err => setSubmitError(err.message ?? 'Could not load payment methods'))
      .finally(() => setPaymentMethodsLoading(false));
  }, [step, campaignId]);

  const firstRoomId = useMemo(() => {
    for (const ci of cart) {
      for (const item of getProductItems(ci.product)) {
        const roomId = getItemTargetRoomId(item);
        if (roomId) return roomId;
      }
    }
    return '';
  }, [cart]);

  const cartTotal = cart.reduce((sum, ci) => sum + asNumber(ci.product.price) * ci.quantity, 0);
  const cartCount = cart.reduce((sum, ci) => sum + ci.quantity, 0);
  const currency = cart[0]?.product.currency ?? getCampaignField<string>(campaign, 'currency') ?? 'EUR';
  const sellerName = getSellerName(seller);
  const supportTitle = sellerName ? `Support ${possessive(sellerName)}` : 'Support this team';
  const target = asNumber(getCampaignField(campaign, 'targetAmount', 'target_amount'));
  const raised = asNumber((campaign as any)?.raisedAmount ?? (campaign as any)?.raised_amount ?? getCampaignField(campaign, 'actualAmount', 'actual_amount'));
  const progress = target > 0 ? Math.min(100, Math.round((raised / target) * 100)) : 0;

  const theme = useMemo(() => {
    const rawTheme = getCampaignField<any>(campaign, 'theme') ?? getCampaignField<any>(campaign, 'theme_json');
    const input = (typeof rawTheme === 'string' ? parseJsonMaybe<ThemeInput>(rawTheme) : rawTheme) ?? {};
    return {
      primary: input.primary || TALLAGHT_TOWN_THEME.primary,
      secondary: input.secondary || TALLAGHT_TOWN_THEME.secondary,
      accent: input.accent || TALLAGHT_TOWN_THEME.accent,
      background: input.background || TALLAGHT_TOWN_THEME.background,
    };
  }, [campaign]);

  const logo = useLogoSrc(
    getCampaignField<string>(campaign, 'logoUrl', 'logo_url') ??
    getCampaignField<string>(campaign, 'clubLogoUrl', 'club_logo_url')
  );

  const appStyle = {
    '--fr-primary': theme.primary,
    '--fr-secondary': theme.secondary,
    '--fr-accent': theme.accent,
    '--fr-bg': theme.background,
  } as CSSProperties;

  const cartQtyForProduct = (productId: string) => cart.find(ci => ci.product.id === productId)?.quantity ?? 0;

  const setProductQty = (product: SupportProduct, quantity: number) => {
    if (getProductSoldOut(product)) return;
    setCart(prev => {
      if (quantity <= 0) return prev.filter(ci => ci.product.id !== product.id);
      const existing = prev.find(ci => ci.product.id === product.id);
      if (existing) return prev.map(ci => ci.product.id === product.id ? { ...ci, quantity } : ci);
      return [...prev, { product, quantity }];
    });
  };

  const addProduct = (product: SupportProduct) => setProductQty(product, cartQtyForProduct(product.id) + 1);
  const removeOneProduct = (product: SupportProduct) => setProductQty(product, cartQtyForProduct(product.id) - 1);

  const goToDetails = () => {
    if (cart.length === 0) {
      setSubmitError('Please choose at least one option first.');
      return;
    }
    setSubmitError(null);
    setActiveProduct(null);
    setStep('details');
  };

  const goToPayment = () => {
    if (!name.trim() || !email.trim()) {
      setSubmitError('Please enter your name and email.');
      return;
    }
    setSubmitError(null);
    setStep('payment');
  };

  const handleSubmitOrder = async () => {
    if (!name.trim() || !email.trim()) {
      setSubmitError('Please enter your name and email.');
      return;
    }
    if (!selectedMethod) {
      setSubmitError('Please select a payment method.');
      return;
    }

    setSubmitError(null);
    setSubmitting(true);

    const category = methodCategory(selectedMethod);

    try {
      const { order } = await campaignSupportService.createOrder(campaignId, {
        sellerId: sellerId ?? undefined,
        supporterName: name.trim(),
        supporterEmail: email.trim(),
        supporterPhone: phone.trim() || undefined,
        paymentMethodCategory: category,
        clubPaymentMethodId: selectedMethod.id,
        paymentProvider: selectedMethod.providerName,
        // Store the generated reference on fundraisely_campaign_product_orders.payment_reference
        // so the club can match Revolut / bank / instant payments back to this order.
        paymentReference,
        items: cart.map(ci => ({ productId: ci.product.id, quantity: ci.quantity })),
      } as any);

      setOrderId(order.id);

      if (needsStripeUI(selectedMethod)) {
        const { url } = await campaignSupportService.createStripeCheckout(campaignId, order.id);
        window.location.href = url;
        return;
      }

      if (needsCryptoUI(selectedMethod)) {
        setPendingCryptoOrderId(order.id);
        setStep('crypto');
        return;
      }

      if (isInstantMethod(selectedMethod)) {
        setHasCopiedReference(false);
        setHasOpenedProviderLink(false);
        setStep('payment-instructions');
        return;
      }

      // Cash to player — supporter has given cash to the seller.
      // Claim the order immediately (no reference needed) and go straight
      // to the thank-you/confirm screen. The club confirms on their side.
      if (isCashToPlayerMethod(selectedMethod)) {
        await campaignSupportService.claimPayment(order.id, {
          paymentReference: null,
          clubPaymentMethodId: selectedMethod.id,
        });
        const summary = await campaignSupportService.getOrderSummary(order.id);
        setOrderSummary(summary.order);
        setEntries(summary.entries ?? []);
        fireOrderConfirmationEmail(order.id);
        setStep('confirm');
        return;
      }
    } catch (err: any) {
      setSubmitError(err.message ?? 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };



  const handleConfirmManualPayment = async () => {
    if (!orderId || !selectedMethod) {
      setSubmitError('Could not find the order to confirm. Please go back and try again.');
      return;
    }

    setSubmitError(null);
    setSubmitting(true);

    try {
      await campaignSupportService.claimPayment(orderId, {
        paymentReference,
        clubPaymentMethodId: selectedMethod.id,
      });
      const summary = await campaignSupportService.getOrderSummary(orderId);
      setOrderSummary(summary.order);
      setEntries(summary.entries ?? []);
      fireOrderConfirmationEmail(orderId);
      setStep('confirm');
    } catch (err: any) {
      setSubmitError(err.message ?? 'Could not confirm payment. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    if (step !== 'confirm' || !orderId) return;
    campaignSupportService.getOrderSummary(orderId)
      .then((data: { order: OrderSummary; entries: GeneratedEntry[] }) => {
        setOrderSummary(data.order);
        setEntries(data.entries);
      })
      .catch(console.error);
  }, [step, orderId]);

  if (!campaignId) return <AppShell style={appStyle}><EmptyState title="Campaign not found" message="No campaign ID was found in the URL." /></AppShell>;
  if (loading) return <AppShell style={appStyle}><LoadingState message="Loading support page…" /></AppShell>;
  if (error) return <AppShell style={appStyle}><EmptyState title="Something went wrong" message={error} /></AppShell>;
  if (!campaign) return <AppShell style={appStyle}><EmptyState title="Campaign not found" message="This campaign could not be loaded." /></AppShell>;

  return (
    <AppShell style={appStyle}>
      {step === 'products' && (
        <>
          <main className="mx-auto min-h-[100dvh] w-full max-w-[430px] overflow-x-hidden px-3 pb-36 pt-3 sm:max-w-lg sm:px-4 lg:max-w-5xl lg:pb-20">
            <header className="mb-3 flex items-center justify-between gap-3 rounded-b-[1.75rem] bg-white/95 px-4 py-3 shadow-sm ring-1 ring-black/5 backdrop-blur">
              <div className="min-w-0">
                <p className="truncate text-lg font-black tracking-tight text-slate-950">{supportTitle}</p>
                <p className="text-xs font-bold text-slate-400">Campaign support page</p>
              </div>
              <a href="/" className="shrink-0 rounded-full bg-slate-950 px-3 py-2 text-xs font-black text-white">FundRaisely</a>
            </header>

            <section className="w-full overflow-hidden rounded-[2rem] bg-white/95 px-3 py-4 shadow-sm ring-1 ring-black/5 sm:px-4 lg:grid lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-6 lg:px-6">
              <div className="grid grid-cols-[106px_minmax(0,1fr)] items-center gap-3 sm:grid-cols-[128px_minmax(0,1fr)] lg:block">
                <div className="h-28 w-28 shrink-0 overflow-hidden rounded-3xl bg-transparent sm:h-32 sm:w-32 lg:mx-auto lg:h-44 lg:w-44">
                  <img src={logo.src} onError={logo.onError} alt="Campaign logo" className="h-full w-full object-contain p-0" />
                </div>
                <div className="min-w-0 overflow-hidden lg:mt-4 lg:text-center">
                  <h1 className="mt-1 max-w-full break-words text-[clamp(1.35rem,6.2vw,2rem)] font-black leading-tight tracking-tight text-slate-950 sm:text-3xl">
                    {campaign.description || campaign.name}
                  </h1>
                  {campaign.description && <p className="mt-2 text-sm font-semibold text-slate-500">{campaign.name}</p>}
                </div>
              </div>

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
            </section>

            {products.length === 0 ? (
              <EmptyState title="No options available yet" message="The organiser has not added campaign products yet." />
            ) : (
              <section className="mt-5 grid gap-3 lg:grid-cols-2">
                {products.map(product => (
                  <ProductChoiceCard
                    key={product.id}
                    product={product}
                    currency={currency}
                    quantity={cartQtyForProduct(product.id)}
                    onOpen={() => setActiveProduct(product)}
                    onAdd={() => addProduct(product)}
                    onRemove={() => removeOneProduct(product)}
                  />
                ))}
              </section>
            )}

            <PrizeStrip products={products} currency={currency} onOpenProduct={setActiveProduct} />

            <a href="/" className="mt-8 flex items-center justify-center gap-2 text-xs font-bold text-slate-500 hover:text-[var(--fr-primary)]">
              <ShieldCheck className="h-4 w-4" /> Created by FundRaisely
            </a>
          </main>

          {submitError && (
            <div className="fixed inset-x-4 bottom-28 z-40 mx-auto max-w-md rounded-2xl bg-red-50 px-4 py-3 text-sm font-bold text-red-700 ring-1 ring-red-100">
              {submitError}
            </div>
          )}

          <SelectionBar cartTotal={cartTotal} cartCount={cartCount} currency={currency} onContinue={goToDetails} />

          {activeProduct && (
            <ProductDetailsSheet
              product={activeProduct}
              currency={currency}
              onClose={() => setActiveProduct(null)}
            />
          )}
        </>
      )}

      {step === 'details' && (
        <StepPanel title="Your details" subtitle="We’ll use this to send your confirmation and game links." onBack={() => setStep('products')}>
          <div className="space-y-3">
            <InputShell icon={<User className="h-5 w-5" />}>
              <input value={name} onChange={e => setName(e.target.value)} placeholder="Your name" className="w-full bg-transparent text-base font-semibold outline-none placeholder:text-slate-400" />
            </InputShell>
            <InputShell icon={<Mail className="h-5 w-5" />}>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email for updates & winner contact" className="w-full bg-transparent text-base font-semibold outline-none placeholder:text-slate-400" />
            </InputShell>
            <InputShell icon={<Phone className="h-5 w-5" />}>
              <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="Phone number (optional)" className="w-full bg-transparent text-base font-semibold outline-none placeholder:text-slate-400" />
            </InputShell>
          </div>

          <OrderMiniSummary cart={cart} currency={currency} />
          {submitError && <FormError>{submitError}</FormError>}

          <button onClick={goToPayment} disabled={!name.trim() || !email.trim()} className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-[var(--fr-primary)] px-5 py-4 text-lg font-black text-white shadow-lg shadow-orange-500/20 disabled:cursor-not-allowed disabled:opacity-50">
            Continue <ArrowRight className="h-5 w-5" />
          </button>
        </StepPanel>
      )}

      {step === 'payment' && (
        <StepPanel title="How would you like to pay?" subtitle={`Total to pay: ${fmt(cartTotal, currency)}`} onBack={() => setStep('details')}>
          {paymentMethodsLoading && <LoadingState message="Loading payment options…" compact />}

          {!paymentMethodsLoading && paymentMethods.length === 0 && (
            <FormError>No payment methods are configured yet. Please contact the organiser.</FormError>
          )}

          {!paymentMethodsLoading && paymentMethods.length > 0 && (
            <div className="space-y-3">
              {paymentMethods.map(method => {
                const { icon, label, hint } = methodDisplay(method);
                const selected = selectedMethod?.id === method.id;
                return (
                  <button
                    key={method.id}
                    type="button"
                    onClick={() => {
                      setSelectedMethod(method);
                      setSubmitError(null);
                      setHasCopiedReference(false);
                      setHasOpenedProviderLink(false);
                    }}
                    className={`flex w-full items-center gap-3 rounded-2xl border p-4 text-left transition ${selected ? 'border-[var(--fr-primary)] bg-orange-50 ring-2 ring-orange-100' : 'border-slate-200 bg-white hover:border-orange-200'}`}
                  >
                    <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-slate-50 text-2xl">{icon}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-base font-black text-slate-950">{label}</span>
                      <span className="mt-0.5 block text-sm font-medium text-slate-500">{hint}</span>
                    </span>
                    {selected ? <Check className="h-5 w-5 text-[var(--fr-primary)]" /> : <ChevronRight className="h-5 w-5 text-slate-300" />}
                  </button>
                );
              })}
            </div>
          )}

          {selectedMethod && isInstantMethod(selectedMethod) && (
            <div className="mt-4 rounded-2xl bg-blue-50 p-4 text-sm font-semibold text-blue-900 ring-1 ring-blue-100">
              You’ll get a payment reference and instructions on the next screen before you confirm the payment.
            </div>
          )}

          {selectedMethod && isCashToPlayerMethod(selectedMethod) && (
            <div className="mt-4 rounded-2xl bg-orange-50 p-4 text-sm font-semibold text-slate-700 ring-1 ring-orange-100">
              Give cash to the seller at the door. The club will confirm it before links are activated.
            </div>
          )}

          {submitError && <FormError>{submitError}</FormError>}

          <button onClick={handleSubmitOrder} disabled={!selectedMethod || submitting} className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-[var(--fr-primary)] px-5 py-4 text-lg font-black text-white shadow-lg shadow-orange-500/20 disabled:cursor-not-allowed disabled:opacity-50">
            {submitting
              ? <><Loader2 className="h-5 w-5 animate-spin" /> Processing…</>
              : selectedMethod && isCashToPlayerMethod(selectedMethod)
                ? <><Check className="h-5 w-5" /> I&apos;ve given cash</>
                : selectedMethod && needsStripeUI(selectedMethod)
                  ? <><CreditCard className="h-5 w-5" /> Continue</>
                  : <><WalletCards className="h-5 w-5" /> Continue</>
            }
          </button>
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
              playerInstructions: selectedMethod.playerInstructions ?? null,
              methodConfig: (selectedMethod.methodConfig ?? {}) as any,
            }}
            paymentReference={paymentReference}
            totalAmount={cartTotal}
            currencySymbol={currency === 'EUR' ? '€' : currency === 'GBP' ? '£' : currency === 'USD' ? '$' : currency}
            revolutLink={
              selectedMethod.providerName?.toLowerCase() === 'revolut' &&
              selectedMethod.methodConfig &&
              'link' in (selectedMethod.methodConfig as any)
                ? (selectedMethod.methodConfig as any).link
                : undefined
            }
            error={submitError}
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
              onConfirmPaid={handleConfirmManualPayment}
              onBack={() => setStep('payment')}
            />
          </div>
        </StepPanel>
      )}

      {step === 'crypto' && selectedMethod && pendingCryptoOrderId && (
        <StepPanel title="Crypto payment" subtitle="Complete the wallet payment to confirm your entries." onBack={() => setStep('payment')} wide>
          {!firstRoomId ? (
            <FormError>Could not determine the event room for this product. Please go back and try again.</FormError>
          ) : (
            <Web3Provider force>
              <Suspense fallback={<LoadingState message="Loading payment…" compact />}>
                <CryptoFixedFeeStep
                  mode="ticket"
                  roomId={firstRoomId}
                  purchaserName={name}
                  purchaserEmail={email}
                  purchaserPhone={phone || undefined}
                  playerName={name}
                  selectedMethod={{
                    id: selectedMethod.id,
                    methodCategory: selectedMethod.methodCategory as any,
                    providerName: selectedMethod.providerName ?? '',
                    methodLabel: selectedMethod.methodLabel,
                    methodConfig: (selectedMethod.methodConfig ?? {}) as any,
                    playerInstructions: selectedMethod.playerInstructions ?? null,
                  }}
                  totalFiatAmount={cartTotal}
                  entryFeeAmount={cartTotal}
                  extrasAmount={0}
                  selectedExtras={[]}
                  fiatCurrency={currency}
                  currencySymbol={currency}
                  skipInternalJoin
                  skipInternalNavigate
                  confirmEndpoint={`/api/campaign-support/orders/${pendingCryptoOrderId}/confirm-crypto`}
                  onBack={() => setStep('payment')}
                  onSuccess={async (_result) => {
                    // The confirmEndpoint (campaignCryptoRoutes) has already
                    // verified the payment on-chain, confirmed the order, and
                    // expanded all entries. We just need to fetch the summary.
                    try {
                      const summary = await campaignSupportService.getOrderSummary(pendingCryptoOrderId);
                      setOrderId(pendingCryptoOrderId);
                      setOrderSummary(summary.order);
                      setEntries(summary.entries);
                      fireOrderConfirmationEmail(pendingCryptoOrderId);
                      setStep('confirm');
                    } catch (err: any) {
                      setSubmitError(err.message ?? 'Failed to load order summary after crypto payment');
                      setStep('payment');
                    }
                  }}
                />
              </Suspense>
            </Web3Provider>
          )}
          {submitError && <FormError>{submitError}</FormError>}
        </StepPanel>
      )}

      {step === 'confirm' && orderSummary && (
        <StepPanel title="" wide>
          <CampaignOrderThankYou
            order={orderSummary}
            entries={entries}
            campaignName={campaign.name}
            sellerName={sellerName}
            orderId={orderId}
            onBackToCampaign={() => { window.location.href = '/'; }}
            backLabel="Close" 
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

function ProductChoiceCard({ product, currency, quantity, onOpen, onAdd, onRemove }: {
  product: SupportProduct;
  currency: string;
  quantity: number;
  onOpen: () => void;
  onAdd: () => void;
  onRemove: () => void;
}) {
  const featured = getProductFeatured(product);
  const badge = getProductBadge(product) || (featured ? 'Most popular' : null);
  const soldOut = getProductSoldOut(product);
  const rooms = getProductRooms(product);

  return (
    <article className={`relative overflow-visible rounded-3xl bg-white p-3 shadow-sm ring-1 transition ${featured ? 'ring-[var(--fr-primary)]' : 'ring-slate-200'} ${quantity > 0 ? 'shadow-orange-100 ring-2 ring-[var(--fr-primary)]' : ''}`}>
      {badge && (
        <div className="absolute -top-3 left-5 z-10 flex items-center gap-1.5 rounded-full bg-[var(--fr-primary)] px-5 py-2 text-xs font-black uppercase tracking-wide text-white shadow-lg shadow-orange-500/20">
          <Trophy className="h-4 w-4 fill-white text-white" /> {badge}
        </div>
      )}

      <button type="button" onClick={onOpen} className="flex w-full items-center gap-4 pt-2 text-left">
        <div className={`grid h-20 w-20 shrink-0 place-items-center rounded-3xl ${featured ? 'bg-gradient-to-br from-yellow-100 via-amber-100 to-orange-50' : 'bg-slate-50'}`}>
          <ProductArtwork product={product} featured={featured} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <h2 className="max-w-full break-words text-[clamp(1.05rem,4.8vw,1.25rem)] font-black leading-tight tracking-tight text-slate-950">{product.name} — {fmt(product.price, product.currency ?? currency)}</h2>
            <ChevronRight className="mt-1 h-5 w-5 shrink-0 text-slate-300" />
          </div>
          <div className="mt-2 space-y-1">
            {(rooms.length ? rooms : [{ quantity: 1, itemType: undefined, prizes: [] } as ProductRoomDetails]).slice(0, 2).map((room, index) => (
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

function ProductArtwork({ product, featured }: { product: SupportProduct; featured: boolean }) {
  const type = getItemType(getProductItems(product)[0]);
  if (featured) {
    return (
      <div className="relative grid h-[4.5rem] w-[4.5rem] place-items-center rounded-full bg-gradient-to-br from-yellow-300 via-amber-400 to-orange-500 shadow-inner">
        <Trophy className="h-12 w-12 fill-black/90 text-black" />
      </div>
    );
  }
  const className = 'h-9 w-9';
  if (type === 'puzzle_entry') return <Puzzle className={`${className} text-[var(--fr-primary)]`} />;
  if (type === 'quiz_team_ticket' || type === 'quiz_individual_ticket') return <Users className={`${className} text-slate-950`} />;
  if (type === 'elimination_entry') return <Trophy className={`${className} text-slate-950`} />;
  if (getProductType(product) === 'donation') return <Heart className={`${className} fill-[var(--fr-primary)] text-[var(--fr-primary)]`} />;
  return <Gift className={`${className} text-[var(--fr-primary)]`} />;
}

function PrizeStrip({ products, currency, onOpenProduct }: { products: SupportProduct[]; currency: string; onOpenProduct: (product: SupportProduct) => void }) {
  const prizeProducts = products.filter(product => getProductRooms(product).some(room => room.prizes.length > 0));
  if (!prizeProducts.length) return null;

  return (
    <section className="mt-6">
      <h2 className="mb-2 text-sm font-black uppercase tracking-wide text-slate-700">Prize details</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        {prizeProducts.slice(0, 4).map(product => {
          const room = getProductRooms(product).find(r => r.prizes.length > 0);
          if (!room) return null;
          return (
            <button key={product.id} type="button" onClick={() => onOpenProduct(product)} className="flex items-center gap-3 rounded-2xl border border-orange-100 bg-white/80 p-3 text-left shadow-sm">
              <div className="grid h-12 w-12 place-items-center rounded-2xl bg-orange-50 text-[var(--fr-secondary)]">
                {room.itemType === 'puzzle_entry' ? <Puzzle className="h-7 w-7" /> : <Trophy className="h-7 w-7" />}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-black text-slate-950">{room.roomName || itemTypeLabel(room.itemType)} prizes</div>
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

function ProductDetailsSheet({ product, currency, onClose }: {
  product: SupportProduct;
  currency: string;
  onClose: () => void;
}) {
  const rooms = getProductRooms(product);
  const featured = getProductFeatured(product);

  return (
    <div className="fixed inset-0 z-[10000] flex items-end justify-center bg-slate-950/45 p-0 backdrop-blur-sm sm:items-center sm:p-6" onClick={onClose}>
      <div className="max-h-[88dvh] w-full max-w-lg overflow-y-auto rounded-t-[2rem] bg-white p-5 shadow-2xl sm:rounded-[2rem]" onClick={e => e.stopPropagation()}>
        <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-slate-200 sm:hidden" />
        <div className="flex items-start gap-4">
          <div className="grid h-20 w-20 shrink-0 place-items-center rounded-3xl bg-orange-50">
            <ProductArtwork product={product} featured={featured} />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="break-words text-2xl font-black leading-tight tracking-tight text-slate-950">{product.name}</h2>
            <p className="mt-1 text-xl font-black text-[var(--fr-primary)]">{fmt(product.price, product.currency ?? currency)}</p>
            {product.description && <p className="mt-2 text-sm font-semibold text-slate-500">{product.description}</p>}
          </div>
          <button type="button" onClick={onClose} className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-slate-100 text-slate-500"><X className="h-5 w-5" /></button>
        </div>

        <div className="mt-5 space-y-3">
          {rooms.map((room, index) => (
            <div key={`${room.roomId ?? index}`} className="rounded-3xl bg-slate-50 p-4 ring-1 ring-slate-100">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="break-words text-base font-black text-slate-950">{includedLine(room)}</p>
                  {room.roomId && <p className="mt-1 break-all text-xs font-bold text-slate-400">Room: {room.roomId}</p>}
                </div>
                <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-slate-600 ring-1 ring-slate-200">x{room.quantity}</span>
              </div>

              <div className="mt-3 grid gap-2 text-sm font-semibold text-slate-600">
                {room.startsAt && (
                  <div className="flex items-center gap-2"><CalendarDays className="h-4 w-4 text-[var(--fr-primary)]" /> {formatEventDate(room.startsAt)}</div>
                )}
                {room.startsAt && (
                  <div className="flex items-center gap-2"><Clock3 className="h-4 w-4 text-[var(--fr-primary)]" /> {formatEventTime(room.startsAt)}{room.endsAt ? ` – ${formatEventTime(room.endsAt)}` : ''}</div>
                )}
                {room.location && (
                  <div className="flex items-center gap-2"><MapPin className="h-4 w-4 text-[var(--fr-primary)]" /> {room.location}</div>
                )}
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

        {rooms.length > 0 && rooms.every(room => room.prizes.length === 0) && (
          <div className="mt-4 rounded-2xl bg-orange-50 p-3 text-sm font-semibold text-slate-600 ring-1 ring-orange-100">
            Prize details will appear here when the support payload includes the linked room config.
          </div>
        )}

        <button type="button" onClick={onClose} className="mt-5 w-full rounded-2xl bg-slate-950 px-5 py-4 text-base font-black text-white">
          Close
        </button>
      </div>
    </div>
  );
}

function SelectionBar({ cartTotal, cartCount, currency, onContinue }: { cartTotal: number; cartCount: number; currency: string; onContinue: () => void }) {
  if (cartCount <= 0) return null;
  return (
    <div className="fixed inset-x-0 bottom-0 z-[10000] border-t border-slate-200 bg-white/95 px-4 pb-[max(env(safe-area-inset-bottom),1rem)] pt-3 shadow-2xl backdrop-blur">
      <div className="mx-auto flex max-w-md items-center gap-3 lg:max-w-5xl">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-black uppercase tracking-wide text-slate-400">Total to pay</p>
          <p className="text-2xl font-black tracking-tight text-slate-950">{fmt(cartTotal, currency)}</p>
          <p className="text-xs font-bold text-slate-500">{cartCount} item{cartCount === 1 ? '' : 's'} selected</p>
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

function OrderMiniSummary({ cart, currency }: { cart: CartItem[]; currency: string }) {
  const total = cart.reduce((sum, ci) => sum + asNumber(ci.product.price) * ci.quantity, 0);
  return (
    <div className="mt-5 rounded-3xl bg-slate-50 p-4 ring-1 ring-slate-100">
      <p className="mb-2 text-xs font-black uppercase tracking-wide text-slate-500">Your selection</p>
      <div className="space-y-2">
        {cart.map(ci => (
          <div key={ci.product.id} className="flex justify-between gap-4 text-sm font-bold text-slate-700">
            <span>{ci.product.name} ×{ci.quantity}</span>
            <span>{fmt(asNumber(ci.product.price) * ci.quantity, ci.product.currency ?? currency)}</span>
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