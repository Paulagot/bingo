// src/components/mgtsystem/components/digitalEvents/tabs/TicketsTab.tsx

import { useEffect, useMemo, useState } from 'react';
import {
  Copy,
  CheckCircle,
  Check,
  Clock,
  RefreshCw,
  QrCode,
  Lock,
  Ticket,
  X,
  AlertTriangle,
} from 'lucide-react';
import { QRCodeCanvas } from 'qrcode.react';

import type { Web2RoomListItem as Room } from '../../../../../shared/api/quiz.api';
import { TicketQRModal } from '../../../../Quiz/dashboard/TicketQRModal';

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

  if (category === 'stripe' || category === 'card') {
    return true;
  }

  if (category === 'crypto') {
    return true;
  }

  if (category === 'instant_payment') {
    if (provider === 'cash') return false;
    return TICKET_ALLOWED_MANUAL_PROVIDERS.has(provider);
  }

  return false;
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-sm rounded-xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-200 p-4">
          <div>
            <h3 className="text-base font-bold text-gray-900">
              Ticket purchase QR code
            </h3>
            <p className="text-xs text-gray-500">
              Scan to open the ticket purchase page.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 hover:bg-gray-100"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        <div className="space-y-4 p-5 text-center">
          <div className="inline-block rounded-xl border border-gray-200 bg-white p-4">
            <QRCodeCanvas value={ticketUrl} size={220} includeMargin />
          </div>

          <code className="block truncate rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-700">
            {ticketUrl}
          </code>

          <button
            type="button"
            onClick={copyLink}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
          >
            {copied ? (
              <>
                <CheckCircle className="h-4 w-4" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="h-4 w-4" />
                Copy ticket link
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function TicketsTab({
  room,
  hasLinkedPaymentMethods,
  canUseTicketing,
  confirmedBy,
  confirmedByName,
}: Props) {
  const [tickets, setTickets] = useState<TicketData[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkingPaymentMethods, setCheckingPaymentMethods] = useState(true);
  const [paymentMethodsError, setPaymentMethodsError] = useState<string | null>(
    null
  );
  const [hasTicketSafePaymentMethod, setHasTicketSafePaymentMethod] =
    useState(false);

  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>('all');
  const [confirming, setConfirming] = useState<string | null>(null);
  const [qrTicket, setQrTicket] = useState<TicketData | null>(null);
  const [showTicketLinkQr, setShowTicketLinkQr] = useState(false);
  const [copied, setCopied] = useState(false);

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
      return 'Link a payment method in the Payments tab first — once set up, ticket sales will be active here.';
    }

    if (!checkingPaymentMethods && !hasTicketSafePaymentMethod) {
      return 'Ticket sales need at least one online payment method. Cash at the door can be used for admin-added players, but it cannot be used for public ticket purchases.';
    }

    return null;
  }, [
    canUseTicketing,
    hasLinkedPaymentMethods,
    checkingPaymentMethods,
    hasTicketSafePaymentMethod,
  ]);

  const linkUnavailableReason = useMemo(() => {
    if (isRoomLive) {
      return 'This quiz is now live, so the public ticket purchase link is no longer available.';
    }

    if (isRoomCompleted) {
      return 'This quiz is completed, so ticket sales are closed.';
    }

    if (isRoomCancelled) {
      return 'This quiz is cancelled, so ticket sales are closed.';
    }

    return paymentLockReason;
  }, [isRoomLive, isRoomCompleted, isRoomCancelled, paymentLockReason]);

  /**
   * This locks only the setup/link availability because no ticket-safe method exists.
   * It does not lock the whole tab once the room is live/completed/cancelled.
   */
  const shouldHideEntireTab =
    !!paymentLockReason && !isRoomLive && !isRoomCompleted && !isRoomCancelled;

  useEffect(() => {
    void checkTicketSafePaymentMethods();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room.room_id, hasLinkedPaymentMethods, canUseTicketing]);

  useEffect(() => {
    if (!checkingPaymentMethods) {
      void loadTickets();
    }
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

      const response = await fetch(
        `/api/quiz-rooms/${room.room_id}/available-payment-methods`
      );

      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(data.error || 'Failed to check payment methods');
      }

      const paymentMethods: RoomPaymentMethod[] = Array.isArray(
        data.paymentMethods
      )
        ? data.paymentMethods
        : [];

      const hasSafeMethod = paymentMethods.some(isTicketSafePaymentMethod);

      setHasTicketSafePaymentMethod(hasSafeMethod);
    } catch (e) {
      setHasTicketSafePaymentMethod(false);
      setPaymentMethodsError(
        e instanceof Error ? e.message : 'Failed to check payment methods'
      );
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

      if (!res.ok) {
        throw new Error(data.error || 'Failed to load tickets');
      }

      setTickets(data.tickets || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  };

  const confirmPayment = async (ticketId: string) => {
    if (!confirmedBy) {
      setError('Missing confirmer identity.');
      return;
    }

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

      if (!res.ok) {
        throw new Error(data.error || 'Failed to confirm');
      }

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
        if (filter === 'pending') {
          return ticket.paymentStatus === 'payment_claimed';
        }

        if (filter === 'confirmed') {
          return ticket.paymentStatus === 'payment_confirmed';
        }

        if (filter === 'redeemed') {
          return ticket.redemptionStatus === 'redeemed';
        }

        return true;
      }),
    [tickets, filter]
  );

  const stats = useMemo(
    () => ({
      total: tickets.length,
      pending: tickets.filter(
        (ticket) => ticket.paymentStatus === 'payment_claimed'
      ).length,
      confirmed: tickets.filter(
        (ticket) => ticket.paymentStatus === 'payment_confirmed'
      ).length,
      redeemed: tickets.filter(
        (ticket) => ticket.redemptionStatus === 'redeemed'
      ).length,
      revenue: tickets
        .filter((ticket) => ticket.paymentStatus !== 'refunded')
        .reduce((sum, ticket) => sum + ticket.totalAmount, 0),
    }),
    [tickets]
  );

  if (checkingPaymentMethods) {
    return (
      <div className="p-5">
        <div className="flex items-center justify-center rounded-xl border border-gray-200 bg-gray-50 p-8">
          <div className="h-6 w-6 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
          <span className="ml-3 text-sm text-gray-600">
            Checking ticket payment methods…
          </span>
        </div>
      </div>
    );
  }

  if (shouldHideEntireTab) {
    return (
      <div className="p-5">
        <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 p-8 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-gray-200">
            <Lock className="h-6 w-6 text-gray-400" />
          </div>

          <p className="text-sm font-semibold text-gray-700">
            Ticket sales not available yet
          </p>

          <p className="mx-auto mt-2 max-w-sm text-xs text-gray-500">
            {paymentLockReason}
          </p>

          {paymentMethodsError && (
            <div className="mx-auto mt-4 flex max-w-sm items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-left text-xs text-amber-800">
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
        {/* Sell link */}
        {shouldShowTicketPurchaseLink ? (
          <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
            <div className="mb-2 flex items-center gap-2">
              <Ticket className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-semibold text-blue-900">
                Ticket purchase link
              </span>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <code className="min-w-0 flex-1 truncate rounded-lg border border-blue-200 bg-white px-3 py-2 font-mono text-xs text-gray-700">
                {ticketUrl}
              </code>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowTicketLinkQr(true)}
                  className="inline-flex flex-shrink-0 items-center gap-1.5 rounded-lg border border-blue-300 bg-white px-3 py-2 text-sm font-semibold text-blue-700 transition-colors hover:bg-blue-100"
                >
                  <QrCode className="h-4 w-4" />
                  QR Code
                </button>

                <button
                  type="button"
                  onClick={copyLink}
                  className="inline-flex flex-shrink-0 items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
                >
                  {copied ? (
                    <CheckCircle className="h-4 w-4" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              </div>
            </div>

            <p className="mt-2 text-xs text-blue-700">
              Share this link or QR code so players can purchase tickets online.
            </p>
          </div>
        ) : (
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-gray-200">
                <Lock className="h-5 w-5 text-gray-500" />
              </div>

              <div>
                <p className="text-sm font-semibold text-gray-800">
                  Ticket purchase link unavailable
                </p>

                <p className="mt-1 text-xs text-gray-500">
                  {linkUnavailableReason ||
                    'Ticket sales are not currently available for this quiz.'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Stats */}
        {!loading && (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
            {[
              {
                label: 'Total',
                value: stats.total,
                cls: 'bg-gray-50 border-gray-200 text-gray-900',
              },
              {
                label: 'Pending',
                value: stats.pending,
                cls: 'bg-yellow-50 border-yellow-200 text-yellow-900',
              },
              {
                label: 'Confirmed',
                value: stats.confirmed,
                cls: 'bg-green-50 border-green-200 text-green-900',
              },
              {
                label: 'Redeemed',
                value: stats.redeemed,
                cls: 'bg-blue-50 border-blue-200 text-blue-900',
              },
              {
                label: 'Revenue',
                value: `${tickets[0]?.currency || '€'}${stats.revenue.toFixed(
                  2
                )}`,
                cls: 'bg-indigo-50 border-indigo-200 text-indigo-900',
              },
            ].map(({ label, value, cls }) => (
              <div key={label} className={`rounded-lg border p-3 ${cls}`}>
                <div className="mb-1 text-xs opacity-70">{label}</div>
                <div className="text-base font-bold">{value}</div>
              </div>
            ))}
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex gap-2">
            {(['all', 'pending', 'confirmed', 'redeemed'] as const).map(
              (filterKey) => (
                <button
                  key={filterKey}
                  type="button"
                  onClick={() => setFilter(filterKey)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium capitalize transition-colors ${
                    filter === filterKey
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {filterKey}
                </button>
              )
            )}
          </div>

          <button
            type="button"
            onClick={loadTickets}
            className="flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs hover:bg-gray-50"
          >
            <RefreshCw className="h-3 w-3" />
            Refresh
          </button>
        </div>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {paymentMethodsError && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
            {paymentMethodsError}
          </div>
        )}

        {/* Table */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-6 w-6 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
            <span className="ml-3 text-sm text-gray-600">Loading tickets…</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-10 text-center text-sm text-gray-500">
            No tickets found.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-gray-200">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  {['Purchaser', 'Player', 'Amount', 'Ref', 'Status', ''].map(
                    (heading) => (
                      <th
                        key={heading}
                        className="px-3 py-2.5 text-left text-xs font-semibold uppercase text-gray-500"
                      >
                        {heading}
                      </th>
                    )
                  )}
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100 bg-white">
                {filtered.map((ticket) => (
                  <tr key={ticket.ticketId} className="hover:bg-gray-50">
                    <td className="whitespace-nowrap px-3 py-3">
                      <div className="font-medium text-gray-900">
                        {ticket.purchaserName}
                      </div>
                      <div className="text-xs text-gray-500">
                        {ticket.purchaserEmail}
                      </div>
                    </td>

                    <td className="whitespace-nowrap px-3 py-3 text-gray-900">
                      {ticket.playerName}
                    </td>

                    <td className="whitespace-nowrap px-3 py-3">
                      <div className="font-semibold text-gray-900">
                        {ticket.currency}
                        {ticket.totalAmount.toFixed(2)}
                      </div>

                      {ticket.extrasTotal > 0 && (
                        <div className="text-xs text-gray-500">
                          {ticket.currency}
                          {ticket.entryFee.toFixed(2)} + {ticket.currency}
                          {ticket.extrasTotal.toFixed(2)}
                        </div>
                      )}
                    </td>

                    <td className="whitespace-nowrap px-3 py-3">
                      <code className="rounded bg-gray-100 px-1.5 py-0.5 text-xs">
                        {ticket.paymentReference}
                      </code>
                    </td>

                    <td className="whitespace-nowrap px-3 py-3">
                      {ticket.paymentStatus === 'payment_claimed' && (
                        <span className="inline-flex items-center rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-800">
                          <Clock className="mr-1 h-3 w-3" />
                          Pending
                        </span>
                      )}

                      {ticket.paymentStatus === 'payment_confirmed' && (
                        <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
                          <Check className="mr-1 h-3 w-3" />
                          Confirmed
                        </span>
                      )}

                      {ticket.redemptionStatus === 'redeemed' && (
                        <div className="mt-0.5 text-xs text-blue-600">
                          ✓ Redeemed
                        </div>
                      )}
                    </td>

                    <td className="whitespace-nowrap px-3 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {ticket.paymentStatus === 'payment_claimed' && (
                          <button
                            type="button"
                            onClick={() => confirmPayment(ticket.ticketId)}
                            disabled={confirming === ticket.ticketId}
                            className="inline-flex items-center rounded bg-green-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-50"
                          >
                            {confirming === ticket.ticketId ? (
                              <div className="mr-1 h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
                            ) : (
                              <Check className="mr-1 h-3 w-3" />
                            )}
                            Confirm
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => setQrTicket(ticket)}
                          className="rounded-lg border border-indigo-200 bg-indigo-50 p-1.5 transition-colors hover:bg-indigo-100"
                          title="QR code"
                        >
                          <QrCode className="h-3.5 w-3.5 text-indigo-600" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
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