// src/components/mgtsystem/components/digitalEvents/tabs/TicketsTab.tsx

import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Check,
  CheckCircle,
  Clock,
  Copy,
  CreditCard,
  ExternalLink,
  Lock,
  QrCode,
  RefreshCw,
  Ticket,
  TicketCheck,
  Users,
  X,
} from 'lucide-react';
import { QRCodeCanvas } from 'qrcode.react';

import type { Web2RoomListItem as Room } from '../../../../../shared/api/quiz.api';
import { TicketQRModal } from '../../../../Quiz/dashboard/TicketQRModal';
import { useCurrency } from '../../../hooks/useCurrency';

interface TicketData {
  ticketId: string;
  purchaserName: string;
  purchaserEmail: string;
  playerName: string;
  entryFee: number;
  extrasTotal: number;
  totalAmount: number;
  currency: string;
  paymentStatus: 'payment_claimed' | 'payment_confirmed' | 'refunded';
  redemptionStatus: 'unredeemed' | 'blocked' | 'ready' | 'redeemed' | 'expired';
  paymentMethod: string;
  paymentReference: string;
  createdAt: string;
  confirmedAt: string | null;
  redeemedAt: string | null;
}

interface Props {
  room: Room;
  hasLinkedPaymentMethods: boolean;
  canUseTicketing: boolean;
  confirmedBy: string;
  confirmedByName?: string;
  config?: any;
}

type Filter = 'all' | 'pending' | 'confirmed' | 'redeemed';

interface RoomPaymentMethod {
  id: string | number;
  methodCategory?: string;
  method_category?: string;
  providerName?: string | null;
  provider_name?: string | null;
  methodLabel?: string;
  method_label?: string;
  isEnabled?: boolean | number;
  is_enabled?: boolean | number;
}

const TICKET_ALLOWED_MANUAL_PROVIDERS = new Set([
  'revolut',
  'monzo',
  'bank_transfer',
  'zippypay',
]);

function normalise(value: unknown): string {
  return String(value || '').trim().toLowerCase();
}

function isEnabledMethod(method: RoomPaymentMethod): boolean {
  const enabledValue = method.isEnabled ?? method.is_enabled;
  if (enabledValue === false) return false;
  if (enabledValue === 0) return false;
  return true;
}

function getMethodCategory(method: RoomPaymentMethod): string {
  return normalise(method.methodCategory || method.method_category);
}

function getProviderName(method: RoomPaymentMethod): string {
  return normalise(method.providerName || method.provider_name);
}

function isTicketSafePaymentMethod(method: RoomPaymentMethod): boolean {
  if (!isEnabledMethod(method)) return false;
  const category = getMethodCategory(method);
  const provider = getProviderName(method);
  if (category === 'stripe' || category === 'card') return true;
  if (category === 'crypto') return true;
  if (category === 'instant_payment') {
    if (provider === 'cash' || provider === 'card_tap') return false;
    return TICKET_ALLOWED_MANUAL_PROVIDERS.has(provider);
  }
  return false;
}

function parseMaybeJson(value: unknown): any {
  if (!value) return null;
  if (typeof value === 'object') return value;
  if (typeof value === 'string') {
    try { return JSON.parse(value); } catch { return null; }
  }
  return null;
}

function resolveRoomConfig(room: Room, providedConfig?: any): any {
  const roomAny = room as any;
  return (
    parseMaybeJson(providedConfig) ||
    parseMaybeJson(roomAny.config) ||
    parseMaybeJson(roomAny.room_config) ||
    parseMaybeJson(roomAny.quiz_config) ||
    parseMaybeJson(roomAny.setup_config) ||
    {}
  );
}

function formatDateTime(value: string | null | undefined): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('en-IE', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function humanisePaymentMethod(value: string | null | undefined): string {
  if (!value) return 'Payment method';
  return value
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

/** Truncate a string to maxChars, appending ellipsis if needed */
function truncate(value: string | null | undefined, maxChars: number): string {
  if (!value) return '—';
  return value.length > maxChars ? `${value.slice(0, maxChars)}…` : value;
}

/**
 * Truncate a payment reference intelligently.
 * Short manual refs (e.g. "REV-1234") pass through unchanged.
 * Long Stripe/crypto refs are truncated to show prefix + last 4 chars.
 */
function truncateRef(value: string | null | undefined): string {
  if (!value) return '—';
  if (value.length <= 14) return value;
  return `${value.slice(0, 8)}…${value.slice(-4)}`;
}

function TicketLinkQRModal({
  ticketUrl,
  onClose,
}: {
  ticketUrl: string;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(ticketUrl);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = ticketUrl;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#102532]/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-sm overflow-hidden rounded-xl bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-gray-200 bg-gray-50 p-5">
          <div>
            <h3 className="text-base font-bold text-gray-900">
              Ticket purchase QR code
            </h3>
            <p className="mt-1 text-xs text-gray-500">
              Scan to open the ticket purchase page.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-gray-500 transition hover:bg-white hover:text-gray-900"
            aria-label="Close QR code modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="space-y-4 p-5 text-center">
          <div className="inline-block rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <QRCodeCanvas value={ticketUrl} size={220} includeMargin />
          </div>
          <code className="block truncate rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-700">
            {ticketUrl}
          </code>
          <button
            type="button"
            onClick={copyLink}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#157f85] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#0e6268]"
          >
            {copied ? (
              <><CheckCircle className="h-4 w-4" />Copied</>
            ) : (
              <><Copy className="h-4 w-4" />Copy ticket link</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

function StatusPill({ ticket }: { ticket: TicketData }) {
  if (ticket.paymentStatus === 'payment_claimed') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800">
        <Clock className="h-3.5 w-3.5" />
        Pending
      </span>
    );
  }

  if (ticket.paymentStatus === 'payment_confirmed') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-green-200 bg-green-50 px-2.5 py-1 text-xs font-semibold text-green-800">
        <Check className="h-3.5 w-3.5" />
        Confirmed
      </span>
    );
  }

  return (
    <span className="inline-flex items-center rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-xs font-semibold text-gray-700">
      Refunded
    </span>
  );
}

export default function TicketsTab({
  room,
  hasLinkedPaymentMethods,
  canUseTicketing,
  confirmedBy,
  confirmedByName,
  config,
}: Props) {
  const [tickets, setTickets] = useState<TicketData[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkingPaymentMethods, setCheckingPaymentMethods] = useState(true);
  const [paymentMethodsError, setPaymentMethodsError] = useState<string | null>(null);
  const [hasTicketSafePaymentMethod, setHasTicketSafePaymentMethod] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>('all');
  const [confirming, setConfirming] = useState<string | null>(null);
  const [qrTicket, setQrTicket] = useState<TicketData | null>(null);
  const [showTicketLinkQr, setShowTicketLinkQr] = useState(false);
  const [copied, setCopied] = useState(false);

  const roomConfig = useMemo(() => resolveRoomConfig(room, config), [room, config]);
  const { fmt: formatMoney } = useCurrency(roomConfig);

  const ticketUrl = `${window.location.origin}/tickets/buy/${room.room_id}`;

  const isRoomLive = room.status === 'live';
  const isRoomCompleted = room.status === 'completed';
  const isRoomCancelled = room.status === 'cancelled';

  const shouldShowTicketPurchaseLink =
    !isRoomLive && !isRoomCompleted && !isRoomCancelled;

  const paymentLockReason = useMemo(() => {
    if (!canUseTicketing) {
      return 'Your plan does not include ticketing.';
    }
    if (!hasLinkedPaymentMethods) {
      return 'Link a payment method first. Once a supported method is available, ticket sales will be active here.';
    }
    if (!checkingPaymentMethods && !hasTicketSafePaymentMethod) {
      return 'Ticket sales need at least one online payment method. Cash and CardTap on-the-night payments can be used for admin-added players, but not for public ticket purchases.';
    }
    return null;
  }, [canUseTicketing, hasLinkedPaymentMethods, checkingPaymentMethods, hasTicketSafePaymentMethod]);

  const linkUnavailableReason = useMemo(() => {
    if (isRoomLive) return 'This quiz is now live, so the public ticket purchase link is no longer available.';
    if (isRoomCompleted) return 'This quiz is completed, so ticket sales are closed.';
    if (isRoomCancelled) return 'This quiz is cancelled, so ticket sales are closed.';
    return paymentLockReason;
  }, [isRoomLive, isRoomCompleted, isRoomCancelled, paymentLockReason]);

  const shouldHideEntireTab =
    !!paymentLockReason && !isRoomLive && !isRoomCompleted && !isRoomCancelled;

  useEffect(() => {
    void checkTicketSafePaymentMethods();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room.room_id, hasLinkedPaymentMethods, canUseTicketing]);

  useEffect(() => {
    if (!checkingPaymentMethods) void loadTickets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room.room_id, checkingPaymentMethods]);

  const checkTicketSafePaymentMethods = async () => {
    if (!canUseTicketing || !hasLinkedPaymentMethods) {
      setHasTicketSafePaymentMethod(false);
      setCheckingPaymentMethods(false);
      return;
    }
    try {
      setCheckingPaymentMethods(true);
      setPaymentMethodsError(null);
      const response = await fetch(`/api/quiz-rooms/${room.room_id}/available-payment-methods`);
      const data = await response.json();
      if (!response.ok || !data.ok) throw new Error(data.error || 'Failed to check payment methods');
      const paymentMethods: RoomPaymentMethod[] = Array.isArray(data.paymentMethods) ? data.paymentMethods : [];
      setHasTicketSafePaymentMethod(paymentMethods.some(isTicketSafePaymentMethod));
    } catch (e) {
      setHasTicketSafePaymentMethod(false);
      setPaymentMethodsError(e instanceof Error ? e.message : 'Failed to check payment methods');
    } finally {
      setCheckingPaymentMethods(false);
    }
  };

  const loadTickets = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`/api/quiz/tickets/room/${room.room_id}`, {
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load tickets');
      setTickets(data.tickets || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  };

  const confirmPayment = async (ticketId: string) => {
    if (!confirmedBy) { setError('Missing confirmer identity.'); return; }
    try {
      setConfirming(ticketId);
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`/api/quiz/tickets/${ticketId}/confirm`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify({
          confirmedBy,
          confirmedByName: confirmedByName || 'Admin',
          confirmedByRole: 'admin',
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to confirm');
      await loadTickets();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to confirm');
    } finally {
      setConfirming(null);
    }
  };

  const copyLink = async () => {
    if (!shouldShowTicketPurchaseLink) return;
    try {
      await navigator.clipboard.writeText(ticketUrl);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = ticketUrl;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  const filtered = useMemo(
    () =>
      tickets.filter((ticket) => {
        if (filter === 'pending') return ticket.paymentStatus === 'payment_claimed';
        if (filter === 'confirmed') return ticket.paymentStatus === 'payment_confirmed';
        if (filter === 'redeemed') return ticket.redemptionStatus === 'redeemed';
        return true;
      }),
    [tickets, filter]
  );

  const stats = useMemo(
    () => ({
      total: tickets.length,
      pending: tickets.filter((t) => t.paymentStatus === 'payment_claimed').length,
      confirmed: tickets.filter((t) => t.paymentStatus === 'payment_confirmed').length,
      redeemed: tickets.filter((t) => t.redemptionStatus === 'redeemed').length,
      revenue: tickets
        .filter((t) => t.paymentStatus !== 'refunded')
        .reduce((sum, t) => sum + Number(t.totalAmount || 0), 0),
    }),
    [tickets]
  );

  const filterOptions: Array<{ key: Filter; label: string; count: number }> = [
    { key: 'all', label: 'All', count: stats.total },
    { key: 'pending', label: 'Pending', count: stats.pending },
    { key: 'confirmed', label: 'Confirmed', count: stats.confirmed },
    { key: 'redeemed', label: 'Redeemed', count: stats.redeemed },
  ];

  if (checkingPaymentMethods) {
    return (
      <div className="p-5">
        <div className="flex items-center justify-center rounded-xl border border-gray-200 bg-white p-8 shadow-sm">
          <div className="h-6 w-6 animate-spin rounded-full border-4 border-[#157f85] border-t-transparent" />
          <span className="ml-3 text-sm font-medium text-gray-600">
            Checking ticket payment methods…
          </span>
        </div>
      </div>
    );
  }

  if (shouldHideEntireTab) {
    return (
      <div className="p-5">
        <div className="overflow-hidden rounded-xl border border-dashed border-gray-300 bg-white shadow-sm">
          <div className="border-b border-gray-100 bg-gray-50 p-5 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-gray-200">
              <Lock className="h-6 w-6 text-gray-500" />
            </div>
            <p className="text-sm font-bold text-gray-900">Ticket sales not available yet</p>
            <p className="mx-auto mt-2 max-w-md text-sm text-gray-500">{paymentLockReason}</p>
          </div>
          {paymentMethodsError && (
            <div className="m-5 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-left text-sm text-amber-800">
              <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
              <span>{paymentMethodsError}</span>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-5 p-5">

        {/* ── Header / Stats ── */}
        <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          {/* Teal accent bar at top */}
          <div className="h-1 w-full bg-gradient-to-r from-[#157f85] to-[#0e6268]" />

          <div className="border-b border-gray-100 bg-[rgba(21,127,133,0.04)] p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-[rgba(21,127,133,0.18)] bg-white/80 px-3 py-1 text-xs font-semibold text-[#157f85] shadow-sm">
                  <Ticket className="h-3.5 w-3.5" />
                  Ticketing
                </div>
                <h2 className="mt-3 text-lg font-bold text-[#102532]">
                  Ticket sales and check-in
                </h2>
                <p className="mt-1 max-w-2xl text-sm text-gray-600">
                  Share the purchase link, confirm manual payments, and scan or open each player's ticket QR code from one place.
                </p>
              </div>

              <button
                type="button"
                onClick={loadTickets}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50"
              >
                <RefreshCw className="h-4 w-4" />
                Refresh
              </button>
            </div>
          </div>

          <div className="grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-4">
            {/* Tickets sold */}
            <div className="rounded-xl border border-gray-200 bg-gray-50/70 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Tickets sold</p>
                  <p className="mt-1 text-xl font-bold text-[#102532]">{stats.total}</p>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-[#157f85] shadow-sm">
                  <Ticket className="h-5 w-5" />
                </div>
              </div>
              <p className="mt-2 text-xs text-gray-500">{stats.pending} pending confirmation</p>
            </div>

            {/* Confirmed — green to match semantic meaning */}
            <div className="rounded-xl border border-green-100 bg-green-50/60 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-green-700">Confirmed</p>
                  <p className="mt-1 text-xl font-bold text-green-900">{stats.confirmed}</p>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-green-600 shadow-sm">
                  <CheckCircle className="h-5 w-5" />
                </div>
              </div>
              <p className="mt-2 text-xs text-green-700">Payments verified</p>
            </div>

            {/* Redeemed — teal brand */}
            <div className="rounded-xl border border-[rgba(21,127,133,0.2)] bg-[rgba(21,127,133,0.06)] p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-[#157f85]">Redeemed</p>
                  <p className="mt-1 text-xl font-bold text-[#102532]">{stats.redeemed}</p>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-[#157f85] shadow-sm">
                  <TicketCheck className="h-5 w-5" />
                </div>
              </div>
              <p className="mt-2 text-xs text-[#157f85]">Checked in / used</p>
            </div>

            {/* Revenue — ink/dark */}
            <div className="rounded-xl border border-[#102532]/10 bg-[#102532]/[0.04] p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-[#52636f]">Ticket revenue</p>
                  <p className="mt-1 text-xl font-bold text-[#102532]">{formatMoney(stats.revenue)}</p>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-[#102532] shadow-sm">
                  <CreditCard className="h-5 w-5" />
                </div>
              </div>
              <p className="mt-2 text-xs text-[#52636f]">Total value of tickets sold</p>
            </div>
          </div>
        </section>

        {/* ── Ticket purchase link ── */}
        {shouldShowTicketPurchaseLink ? (
          <section className="rounded-xl border border-[rgba(21,127,133,0.18)] bg-[rgba(21,127,133,0.06)] p-5 shadow-sm">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="min-w-0">
                <div className="mb-2 flex items-center gap-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#157f85] text-white shadow-sm">
                    <ExternalLink className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-[#102532]">Public ticket purchase link</h3>
                    <p className="text-xs text-[#157f85]">Share this with players before the quiz starts.</p>
                  </div>
                </div>
                <code className="block min-w-0 truncate rounded-xl border border-[rgba(21,127,133,0.18)] bg-white px-3 py-2 font-mono text-xs text-gray-700 shadow-sm">
                  {ticketUrl}
                </code>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row lg:flex-shrink-0">
                <button
                  type="button"
                  onClick={() => setShowTicketLinkQr(true)}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-[rgba(21,127,133,0.25)] bg-white px-4 py-2.5 text-sm font-semibold text-[#157f85] shadow-sm transition hover:bg-[rgba(21,127,133,0.12)]"
                >
                  <QrCode className="h-4 w-4" />
                  Show QR
                </button>
                <button
                  type="button"
                  onClick={copyLink}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#157f85] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#0e6268]"
                >
                  {copied ? <CheckCircle className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  {copied ? 'Copied' : 'Copy link'}
                </button>
              </div>
            </div>
          </section>
        ) : (
          <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-gray-100 text-gray-500">
                <Lock className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-bold text-gray-900">Ticket purchase link unavailable</p>
                <p className="mt-1 text-sm text-gray-500">
                  {linkUnavailableReason || 'Ticket sales are not currently available for this quiz.'}
                </p>
              </div>
            </div>
          </section>
        )}

        {/* ── Ticket list ── */}
        <section className="rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-gray-100 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-sm font-bold text-[#102532]">Ticket list</h3>
              <p className="mt-0.5 text-xs text-gray-500">Filter by payment or redemption status.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {filterOptions.map(({ key, label, count }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setFilter(key)}
                  className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                    filter === key
                      ? 'bg-[#157f85] text-white shadow-sm'
                      : 'border border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  {label}
                  <span
                    className={`rounded-full px-1.5 py-0.5 text-[10px] ${
                      filter === key ? 'bg-white/20 text-white' : 'bg-white text-gray-500'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div className="m-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {paymentMethodsError && (
            <div className="m-4 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
              <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
              <span>{paymentMethodsError}</span>
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-14">
              <div className="h-6 w-6 animate-spin rounded-full border-4 border-[#157f85] border-t-transparent" />
              <span className="ml-3 text-sm font-medium text-gray-600">Loading tickets…</span>
            </div>
          ) : filtered.length === 0 ? (
            <div className="px-5 py-12 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-gray-100 text-gray-400">
                <Ticket className="h-6 w-6" />
              </div>
              <p className="mt-3 text-sm font-semibold text-gray-700">No tickets found</p>
              <p className="mt-1 text-xs text-gray-500">
                Try another filter, or share the purchase link once ticket sales are open.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-100 text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    {['Player', 'Status', 'Actions', 'Payment ref', 'Purchaser', 'Amount'].map((heading) => (
                      <th
                        key={heading}
                        className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-gray-500"
                      >
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100 bg-white">
                  {filtered.map((ticket) => (
                    <tr key={ticket.ticketId} className="hover:bg-[rgba(21,127,133,0.03)]">

                      {/* ── Player ── */}
                      <td className="whitespace-nowrap px-4 py-4">
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-[rgba(21,127,133,0.08)] text-[#157f85]">
                            <Users className="h-3.5 w-3.5" />
                          </div>
                          <div>
                            <div
                              className="max-w-[9rem] truncate font-semibold text-[#102532]"
                              title={ticket.playerName || 'Player'}
                            >
                              {truncate(ticket.playerName || 'Player', 12)}
                            </div>
                            <div className="text-xs text-gray-400">
                              {formatDateTime(ticket.createdAt)}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* ── Status ── */}
                      <td className="whitespace-nowrap px-4 py-4">
                        <div className="flex flex-col items-start gap-1.5">
                          <StatusPill ticket={ticket} />
                          {ticket.redemptionStatus === 'redeemed' ? (
                            <span className="inline-flex items-center gap-1 rounded-full border border-[rgba(21,127,133,0.25)] bg-[rgba(21,127,133,0.06)] px-2.5 py-1 text-xs font-semibold text-[#157f85]">
                              <TicketCheck className="h-3.5 w-3.5" />
                              Redeemed
                            </span>
                          ) : (
                            <span className="text-xs text-gray-400">Not redeemed</span>
                          )}
                        </div>
                      </td>

                      {/* ── Actions ── */}
                      <td className="whitespace-nowrap px-4 py-4">
                        <div className="flex items-center gap-2">
                          {ticket.paymentStatus === 'payment_claimed' && (
                            <button
                              type="button"
                              onClick={() => confirmPayment(ticket.ticketId)}
                              disabled={confirming === ticket.ticketId}
                              className="inline-flex items-center gap-1.5 rounded-xl bg-green-600 px-3 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {confirming === ticket.ticketId ? (
                                <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                              ) : (
                                <Check className="h-3.5 w-3.5" />
                              )}
                              Confirm
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => setQrTicket(ticket)}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-[rgba(21,127,133,0.18)] bg-[rgba(21,127,133,0.06)] px-3 py-2 text-xs font-bold text-[#157f85] transition hover:bg-[rgba(21,127,133,0.12)]"
                            title="Open ticket QR code"
                          >
                            <QrCode className="h-3.5 w-3.5" />
                            QR
                          </button>
                        </div>
                      </td>

                      {/* ── Payment ref ── */}
                      <td className="whitespace-nowrap px-4 py-4">
                        <code
                          className="rounded-lg border border-gray-200 bg-gray-50 px-2 py-1 text-xs text-gray-700"
                          title={ticket.paymentReference || undefined}
                        >
                          {truncateRef(ticket.paymentReference)}
                        </code>
                        <div className="mt-1 text-xs text-gray-400">
                          {humanisePaymentMethod(ticket.paymentMethod)}
                        </div>
                      </td>

                      {/* ── Purchaser ── */}
                      <td className="whitespace-nowrap px-4 py-4">
                        <div
                          className="max-w-[8rem] truncate font-medium text-gray-800"
                          title={ticket.purchaserName || undefined}
                        >
                          {truncate(ticket.purchaserName || 'Purchaser', 14)}
                        </div>
                        <div
                          className="mt-0.5 max-w-[10rem] truncate text-xs text-gray-400"
                          title={ticket.purchaserEmail || undefined}
                        >
                          {truncate(ticket.purchaserEmail || 'No email', 18)}
                        </div>
                      </td>

                      {/* ── Amount ── */}
                      <td className="whitespace-nowrap px-4 py-4 text-right">
                        <div className="font-bold text-[#102532]">
                          {formatMoney(ticket.totalAmount)}
                        </div>
                        {ticket.extrasTotal > 0 && (
                          <div className="text-xs text-gray-400">
                            {formatMoney(ticket.entryFee)} +{' '}
                            {formatMoney(ticket.extrasTotal)}
                          </div>
                        )}
                      </td>

                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      {showTicketLinkQr && shouldShowTicketPurchaseLink && (
        <TicketLinkQRModal
          ticketUrl={ticketUrl}
          onClose={() => setShowTicketLinkQr(false)}
        />
      )}

      {qrTicket && (
        <TicketQRModal
          ticketId={qrTicket.ticketId}
          playerName={qrTicket.playerName}
          purchaserName={qrTicket.purchaserName}
          onClose={() => setQrTicket(null)}
        />
      )}
    </>
  );
}