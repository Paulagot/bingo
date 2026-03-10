// src/components/Quiz/tickets/TicketStatusChecker.tsx
import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Check, Clock, AlertCircle, ExternalLink } from 'lucide-react';

interface TicketStatus {
  ticketId: string;
  roomId: string;
  purchaserName: string;
  playerName: string;
  entryFee: number;
  extrasTotal: number;
  totalAmount: number;
  currency: string;
  extras: Array<{ extraId: string; price: number }>;
  paymentStatus: 'payment_claimed' | 'payment_confirmed' | 'refunded';
  redemptionStatus: 'blocked' | 'ready' | 'redeemed' | 'expired';
  paymentMethod: string;
  paymentReference: string;
  confirmedAt: string | null;
  redeemedAt: string | null;
  joinToken: string;
  canJoinNow?: boolean;
  joinOpensAt?: string | null;
  scheduledAt?: string | null;
  roomStatus?: 'scheduled' | 'live' | 'completed' | 'cancelled' | null;
  joinWindowMinutes?: number;
}

function formatCountdown(ms: number) {
  if (ms <= 0) return '00:00';

  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const pad = (n: number) => String(n).padStart(2, '0');
  return hours > 0 ? `${pad(hours)}:${pad(minutes)}:${pad(seconds)}` : `${pad(minutes)}:${pad(seconds)}`;
}

export const TicketStatusChecker: React.FC = () => {
  const { ticketId } = useParams<{ ticketId: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [ticket, setTicket] = useState<TicketStatus | null>(null);
  const [nowMs, setNowMs] = useState(() => Date.now());
  
  // ✅ Track if we've already refreshed when countdown reached zero
  const hasRefreshedRef = useRef(false);

  const loadTicketStatus = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/quiz/tickets/${ticketId}/status`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load ticket status');
      }

      setTicket(data);
      
      // ✅ Reset the refresh flag when we get fresh data
      hasRefreshedRef.current = false;
    } catch (err) {
      console.error('Failed to load ticket:', err);
      setError(err instanceof Error ? err.message : 'Failed to load ticket status');
      setTicket(null);
    } finally {
      setLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    loadTicketStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticketId]);

// Tick every second only when we have a joinOpensAt and we are not joinable yet
useEffect(() => {
  const joinOpensAt = ticket?.joinOpensAt ? new Date(ticket.joinOpensAt).getTime() : null;

  if (!joinOpensAt) return;
  if (ticket?.canJoinNow) return;
  
  // ✅ NEW: Don't tick countdown if payment not confirmed
  if (ticket?.paymentStatus !== 'payment_confirmed') return;
  if (ticket?.redemptionStatus === 'blocked') return;

  const interval = setInterval(() => setNowMs(Date.now()), 1000);
  return () => clearInterval(interval);
}, [ticket?.joinOpensAt, ticket?.canJoinNow, ticket?.paymentStatus, ticket?.redemptionStatus]);

// ✅ Auto refresh ONCE when countdown reaches zero
useEffect(() => {
  const joinOpensAt = ticket?.joinOpensAt ? new Date(ticket.joinOpensAt).getTime() : null;

  if (!joinOpensAt) return;
  if (ticket?.canJoinNow) return;
  if (hasRefreshedRef.current) return;
  
  // ✅ NEW: Don't auto-refresh if payment not confirmed
  if (ticket?.paymentStatus !== 'payment_confirmed') return;
  
  // ✅ NEW: Don't auto-refresh if redemption blocked
  if (ticket?.redemptionStatus === 'blocked') return;

  if (nowMs >= joinOpensAt) {
    console.log('[TicketStatus] Join window opened - refreshing once');
    hasRefreshedRef.current = true;
    loadTicketStatus();
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [nowMs, ticket?.joinOpensAt, ticket?.canJoinNow, ticket?.paymentStatus, ticket?.redemptionStatus]);

  // ---------------------------------------------------------------------------
  // From here down: NO hooks (safe to early-return)
  // ---------------------------------------------------------------------------

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full">
          <div className="flex items-center justify-center">
            <div className="animate-spin h-8 w-8 border-4 border-indigo-600 border-t-transparent rounded-full" />
            <span className="ml-3 text-gray-700">Loading ticket status...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error || !ticket) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full">
          <div className="text-center">
            <div className="text-red-600 text-5xl mb-4">⚠️</div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Error</h2>
            <p className="text-red-600 mb-4">{error || 'Ticket not found'}</p>
            <button
              onClick={() => navigate('/')}
              className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
            >
              Go Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  const statusConfig = {
    payment_claimed: {
      icon: <Clock className="h-6 w-6 text-yellow-600" />,
      title: 'Payment Pending',
      description: 'Waiting for host to confirm your payment',
      wrapperClass: 'bg-yellow-50 border-yellow-200',
      canJoin: false,
    },
    payment_confirmed: {
      icon: <Check className="h-6 w-6 text-green-600" />,
      title: 'Payment Confirmed',
      description: 'Your ticket is ready to use!',
      wrapperClass: 'bg-green-50 border-green-200',
      canJoin: true,
    },
    refunded: {
      icon: <AlertCircle className="h-6 w-6 text-red-600" />,
      title: 'Ticket Refunded',
      description: 'This ticket has been refunded',
      wrapperClass: 'bg-red-50 border-red-200',
      canJoin: false,
    },
  } as const;

  const redemptionConfig = {
    blocked: { message: 'Waiting for payment confirmation', canJoin: false },
    ready: { message: 'Ready to use', canJoin: true },
    redeemed: { message: 'Already used', canJoin: false },
    expired: { message: 'Ticket expired', canJoin: false },
  } as const;

  const paymentInfo = statusConfig[ticket.paymentStatus] || statusConfig.payment_claimed;
  const redemptionInfo = redemptionConfig[ticket.redemptionStatus] || { message: 'Unknown', canJoin: false };

  const canJoinNow = ticket.canJoinNow === true;

  const joinOpensAtMs = ticket.joinOpensAt ? new Date(ticket.joinOpensAt).getTime() : null;
  const remainingMs = joinOpensAtMs != null ? Math.max(0, joinOpensAtMs - nowMs) : null;
  const countdownText = remainingMs != null ? formatCountdown(remainingMs) : null;

  const joinAllowed =
    ticket.paymentStatus === 'payment_confirmed' &&
    ticket.redemptionStatus === 'ready' &&
    paymentInfo.canJoin &&
    redemptionInfo.canJoin &&
    canJoinNow;

  const showTooEarlyMessage =
    ticket.paymentStatus === 'payment_confirmed' &&
    ticket.redemptionStatus === 'ready' &&
    !joinAllowed &&
    ticket.roomStatus !== 'completed' &&
    ticket.roomStatus !== 'cancelled';

  const joinOpensAtText = ticket.joinOpensAt ? new Date(ticket.joinOpensAt).toLocaleString() : null;
  const scheduledAtText = ticket.scheduledAt ? new Date(ticket.scheduledAt).toLocaleString() : null;

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg overflow-hidden mb-6">
          <div className="bg-indigo-600 px-6 py-4">
            <h1 className="text-2xl font-bold text-white">Ticket Status</h1>
            <p className="text-indigo-100">Ticket ID: {ticket.ticketId}</p>
          </div>

          {/* Payment Status */}
          <div className={`${paymentInfo.wrapperClass} border-b px-6 py-4`}>
            <div className="flex items-center gap-3 mb-2">
              {paymentInfo.icon}
              <div className="font-semibold text-gray-900">{paymentInfo.title}</div>
            </div>
            <p className="text-sm text-gray-700">{paymentInfo.description}</p>
          </div>

          {/* Ticket Details */}
          <div className="p-6 space-y-4">
            <div>
              <h2 className="font-semibold text-gray-900 mb-3">Ticket Details</h2>
              <div className="bg-gray-50 rounded-lg p-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Player Name:</span>
                  <span className="font-medium">{ticket.playerName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Entry Fee:</span>
                  <span className="font-medium">
                    {ticket.currency}
                    {ticket.entryFee.toFixed(2)}
                  </span>
                </div>
                {ticket.extrasTotal > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Extras:</span>
                    <span className="font-medium">
                      {ticket.currency}
                      {ticket.extrasTotal.toFixed(2)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between border-t pt-2">
                  <span className="text-gray-900 font-semibold">Total:</span>
                  <span className="font-bold">
                    {ticket.currency}
                    {ticket.totalAmount.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            {/* Extras List */}
            {ticket.extras.length > 0 && (
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Included Extras</h3>
                <div className="space-y-2">
                  {ticket.extras.map((extra) => (
                    <div
                      key={extra.extraId}
                      className="bg-green-50 border border-green-200 rounded px-3 py-2 text-sm"
                    >
                      <div className="flex justify-between">
                        <span className="text-green-700 font-medium">{extra.extraId}</span>
                        <span className="text-green-700">
                          {ticket.currency}
                          {extra.price.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Payment Info */}
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Payment Information</h3>
              <div className="bg-gray-50 rounded-lg p-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Payment Method:</span>
                  <span className="font-medium capitalize">{ticket.paymentMethod}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Reference:</span>
                  <code className="font-mono bg-white px-2 py-1 border rounded">
                    {ticket.paymentReference}
                  </code>
                </div>
                {ticket.confirmedAt && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Confirmed:</span>
                    <span className="font-medium">{new Date(ticket.confirmedAt).toLocaleString()}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Redemption Status */}
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Redemption Status</h3>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-700">{redemptionInfo.message}</p>
                {ticket.redeemedAt && (
                  <p className="text-sm text-gray-600 mt-2">
                    Redeemed on {new Date(ticket.redeemedAt).toLocaleString()}
                  </p>
                )}
              </div>
            </div>

            {/* Join Window / Countdown */}
            {ticket.paymentStatus !== 'payment_confirmed' && ticket.paymentStatus === 'payment_claimed' && (
  <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
    <div className="font-semibold text-yellow-900 mb-1">Payment Pending Confirmation</div>
    <div className="text-sm text-yellow-700">
      Your payment is being reviewed by the host. Once confirmed, you'll be able to join the quiz.
      This page will not auto-refresh - please use the "Refresh Status" button to check for updates.
    </div>
  </div>
)}
            {showTooEarlyMessage && (
              <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
                <div className="font-semibold text-blue-900 mb-1">Not quite time yet</div>

                {countdownText && remainingMs != null && remainingMs > 0 ? (
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-sm text-blue-700">
                      Join opens in <span className="font-semibold text-blue-900">{countdownText}</span>
                      {ticket.joinWindowMinutes ? (
                        <> (about {ticket.joinWindowMinutes} minutes before start)</>
                      ) : null}
                      .
                      {joinOpensAtText ? (
                        <div className="text-xs text-blue-700 mt-1">
                          Opens at <span className="font-medium">{joinOpensAtText}</span>
                        </div>
                      ) : null}
                    </div>

                    <div className="shrink-0 rounded-lg bg-white border border-blue-200 px-3 py-2">
                      <div className="text-xs text-blue-700">Countdown</div>
                      <div className="text-lg font-bold text-blue-900 tabular-nums">{countdownText}</div>
                    </div>
                  </div>
                ) : joinOpensAtText ? (
                  <div className="text-sm text-blue-700">
                    Join opens at <span className="font-medium">{joinOpensAtText}</span>.
                  </div>
                ) : scheduledAtText ? (
                  <div className="text-sm text-blue-700">
                    Join will open shortly before the quiz starts at{' '}
                    <span className="font-medium">{scheduledAtText}</span>.
                  </div>
                ) : (
                  <div className="text-sm text-blue-700">Join will open shortly before the quiz starts.</div>
                )}

                <div className="text-xs text-blue-700 mt-2">
                  This page will refresh automatically when join opens. You can also press{' '}
                  <span className="font-medium">Refresh Status</span>.
                </div>
              </div>
            )}

            {(ticket.roomStatus === 'completed' || ticket.roomStatus === 'cancelled') && (
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                <div className="font-semibold text-gray-900 mb-1">This quiz is {ticket.roomStatus}</div>
                <div className="text-sm text-gray-700">If you think this is a mistake, contact the host.</div>
              </div>
            )}
          </div>
          {/* Actions */}
<div className="bg-gray-50 px-6 py-4 border-t space-y-3">
 {joinAllowed && (
  <a
    href={`/quiz/join/${ticket.roomId}?ticket=${ticket.joinToken}`}
    className="flex items-center justify-center gap-2 w-full px-6 py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700"
  >
    <span>Join Quiz Now</span>
    <ExternalLink className="h-4 w-4" />
  </a>
)}

  <button
    onClick={() => loadTicketStatus()}
    className="w-full px-6 py-3 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700"
  >
    Refresh Status
  </button>

  <button
    onClick={() => navigate('/')}
    className="w-full px-6 py-3 bg-gray-200 text-gray-700 font-semibold rounded-lg hover:bg-gray-300"
  >
    Go Home
  </button>
</div>

        </div>
      </div>
    </div>
  );
};

