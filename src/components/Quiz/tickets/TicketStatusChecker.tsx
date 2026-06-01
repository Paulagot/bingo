// src/components/Quiz/tickets/TicketStatusChecker.tsx
// UPDATED: game-type aware join URL, club name, event type in all copy

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Check, Clock, AlertCircle, ExternalLink, RefreshCw } from 'lucide-react';
import type { TicketStatus } from './types';
import { getGameTypeMeta } from './gameTypeMeta';

/** Formats ms into HH:MM:SS or MM:SS */
function formatCountdown(ms: number) {
  if (ms <= 0) return '00:00';
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return hours > 0
    ? `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`
    : `${pad(minutes)}:${pad(seconds)}`;
}

const POLL_INTERVAL_MS = 15_000;

export const TicketStatusChecker: React.FC = () => {
  const { ticketId } = useParams<{ ticketId: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [ticket, setTicket] = useState<TicketStatus | null>(null);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [isRefreshing, setIsRefreshing] = useState(false);

  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ─── Fetch ticket from API ────────────────────────────────────────────────
  const loadTicketStatus = useCallback(
    async (silent = false) => {
      try {
        if (!silent) setLoading(true);
        else setIsRefreshing(true);
        setError(null);

        const response = await fetch(`/api/quiz/tickets/${ticketId}/status`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to load ticket status');
        }

        setTicket(data);
      } catch (err) {
        console.error('[TicketStatusChecker] Failed to load ticket:', err);
        setError(
          err instanceof Error ? err.message : 'Failed to load ticket status'
        );
        setTicket(null);
      } finally {
        setLoading(false);
        setIsRefreshing(false);
      }
    },
    [ticketId]
  );

  // ─── Initial load ─────────────────────────────────────────────────────────
  useEffect(() => {
    loadTicketStatus();
  }, [loadTicketStatus]);

  // ─── Polling ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }

    if (!ticket) return;
    if (ticket.canJoinNow) return;
    if (
      ticket.roomStatus === 'completed' ||
      ticket.roomStatus === 'cancelled'
    )
      return;

    const shouldPoll =
      ticket.paymentStatus === 'payment_confirmed' &&
      (ticket.roomStatus === 'scheduled' ||
        ticket.roomStatus === 'open' ||
        ticket.roomStatus === 'live' ||
        !ticket.roomStatus);

    if (!shouldPoll) return;

    pollTimerRef.current = setInterval(() => {
      loadTicketStatus(true);
    }, POLL_INTERVAL_MS);

    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, [ticket, loadTicketStatus]);

  // ─── Countdown ticker ─────────────────────────────────────────────────────
  useEffect(() => {
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }

    const scheduledAt = ticket?.scheduledAt
      ? new Date(ticket.scheduledAt).getTime()
      : null;

    if (!scheduledAt) return;
    if (ticket?.canJoinNow) return;
    if (ticket?.roomStatus !== 'scheduled') return;
    if (ticket?.paymentStatus !== 'payment_confirmed') return;

    countdownTimerRef.current = setInterval(
      () => setNowMs(Date.now()),
      1000
    );

    return () => {
      if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
    };
  }, [
    ticket?.scheduledAt,
    ticket?.canJoinNow,
    ticket?.roomStatus,
    ticket?.paymentStatus,
  ]);

  // ─── Loading screen ───────────────────────────────────────────────────────
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

  // ─── Error screen ─────────────────────────────────────────────────────────
  if (error || !ticket) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
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
    );
  }

  // ─── Game type meta ───────────────────────────────────────────────────────
  const meta = getGameTypeMeta(ticket.gameType);

  // Resolve display name
  const displayName =
    ticket.clubName || ticket.hostName || 'the host';

  // ─── Join URL — game-type aware ───────────────────────────────────────────
  const joinUrl = meta.joinPath(ticket.roomId, ticket.joinToken);

  // ─── Derived display values ───────────────────────────────────────────────
  const statusConfig = {
    payment_claimed: {
      icon: <Clock className="h-6 w-6 text-yellow-600" />,
      title: 'Payment Pending',
      description: 'Waiting for host to confirm your payment',
      wrapperClass: 'bg-yellow-50 border-yellow-200',
    },
    payment_confirmed: {
      icon: <Check className="h-6 w-6 text-green-600" />,
      title: 'Payment Confirmed',
      description: 'Your ticket is ready to use!',
      wrapperClass: 'bg-green-50 border-green-200',
    },
    refunded: {
      icon: <AlertCircle className="h-6 w-6 text-red-600" />,
      title: 'Ticket Refunded',
      description: 'This ticket has been refunded',
      wrapperClass: 'bg-red-50 border-red-200',
    },
  } as const;

  const redemptionLabels = {
    blocked: 'Waiting for payment confirmation',
    ready: 'Ready to use',
    redeemed: 'Already used',
    expired: 'Ticket expired',
  } as const;

  const paymentInfo =
    statusConfig[ticket.paymentStatus] ?? statusConfig.payment_claimed;
  const redemptionLabel =
    redemptionLabels[ticket.redemptionStatus] ?? 'Unknown';

  // ─── Join gate ────────────────────────────────────────────────────────────
  const joinAllowed =
    ticket.paymentStatus === 'payment_confirmed' &&
    ticket.redemptionStatus === 'ready' &&
    ticket.canJoinNow === true;

  // ─── Countdown values ─────────────────────────────────────────────────────
  const scheduledAtMs = ticket.scheduledAt
    ? new Date(ticket.scheduledAt).getTime()
    : null;
  const remainingMs =
    scheduledAtMs != null ? Math.max(0, scheduledAtMs - nowMs) : null;
  const countdownText =
    remainingMs != null ? formatCountdown(remainingMs) : null;

  const scheduledAtText = ticket.scheduledAt
    ? new Date(ticket.scheduledAt).toLocaleString(undefined, {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : null;

  // ─── Which status panel to show ───────────────────────────────────────────
  const isRunningLate =
    scheduledAtMs != null &&
    nowMs > scheduledAtMs &&
    ticket.roomStatus === 'scheduled' &&
    !joinAllowed;

  const showWaitingPanel =
    ticket.paymentStatus === 'payment_confirmed' &&
    ticket.redemptionStatus === 'ready' &&
    !joinAllowed &&
    ticket.roomStatus === 'scheduled';

  const showLobbyOpenPanel =
    ticket.paymentStatus === 'payment_confirmed' &&
    ticket.redemptionStatus === 'ready' &&
    !joinAllowed &&
    ticket.roomStatus === 'open';

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg overflow-hidden mb-6">

          {/* Header */}
          <div className="bg-indigo-600 px-6 py-4">
            <div className="flex items-center gap-3">
              <span className="text-3xl">{meta.emoji}</span>
              <div>
                <h1 className="text-2xl font-bold text-white">
                  Ticket Status
                </h1>
                <p className="text-indigo-100 text-sm">
                  Ticket ID: {ticket.ticketId}
                </p>
              </div>
            </div>
          </div>

          {/* Club / event type banner */}
          <div className="bg-indigo-50 border-b border-indigo-100 px-6 py-3 flex items-center gap-3">
            <span className="text-lg">🏢</span>
            <div>
              <div className="text-xs font-semibold text-indigo-500 uppercase tracking-wide">
                {meta.label}
              </div>
              <div className="text-sm font-bold text-indigo-900">
                {displayName}
              </div>
            </div>
          </div>

          {/* Payment status banner */}
          <div
            className={`${paymentInfo.wrapperClass} border-b px-6 py-4`}
          >
            <div className="flex items-center gap-3 mb-1">
              {paymentInfo.icon}
              <div className="font-semibold text-gray-900">
                {paymentInfo.title}
              </div>
            </div>
            <p className="text-sm text-gray-700">{paymentInfo.description}</p>
          </div>

          {/* Body */}
          <div className="p-6 space-y-4">

            {/* Ticket details */}
            <div>
              <h2 className="font-semibold text-gray-900 mb-3">
                Ticket Details
              </h2>
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

            {/* Extras list */}
            {ticket.extras.length > 0 && (
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">
                  Included Extras
                </h3>
                <div className="space-y-2">
                  {ticket.extras.map((extra) => (
                    <div
                      key={extra.extraId}
                      className="bg-green-50 border border-green-200 rounded px-3 py-2 text-sm"
                    >
                      <div className="flex justify-between">
                        <span className="text-green-700 font-medium">
                          {extra.extraId}
                        </span>
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

            {/* Payment info */}
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">
                Payment Information
              </h3>
              <div className="bg-gray-50 rounded-lg p-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Method:</span>
                  <span className="font-medium capitalize">
                    {ticket.paymentMethod}
                  </span>
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
                    <span className="font-medium">
                      {new Date(ticket.confirmedAt).toLocaleString()}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Redemption status */}
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">
                Redemption Status
              </h3>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-700">{redemptionLabel}</p>
                {ticket.redeemedAt && (
                  <p className="text-sm text-gray-600 mt-2">
                    Redeemed on{' '}
                    {new Date(ticket.redeemedAt).toLocaleString()}
                  </p>
                )}
              </div>
            </div>

            {/* ── STATUS PANELS ──────────────────────────────────────── */}

            {/* Panel 1: Payment pending */}
            {ticket.paymentStatus === 'payment_claimed' && (
              <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
                <div className="font-semibold text-yellow-900 mb-1">
                  Payment Pending Confirmation
                </div>
                <div className="text-sm text-yellow-700">
                  Your payment is being reviewed by the host. Once confirmed
                  you'll be able to join the {meta.eventNoun}. This page
                  checks for updates automatically every{' '}
                  {POLL_INTERVAL_MS / 1000} seconds.
                </div>
              </div>
            )}

            {/* Panel 2: Waiting for lobby (room is 'scheduled') */}
            {showWaitingPanel && (
              <div
                className={`rounded-lg border p-4 ${
                  isRunningLate
                    ? 'border-orange-200 bg-orange-50'
                    : 'border-blue-200 bg-blue-50'
                }`}
              >
                {isRunningLate ? (
                  <>
                    <div className="flex items-center gap-2 font-semibold text-orange-900 mb-1">
                      🕐 Running a little late
                    </div>
                    <div className="text-sm text-orange-700">
                      The {meta.eventNoun} was scheduled for{' '}
                      <span className="font-medium">{scheduledAtText}</span>{' '}
                      but the lobby isn&apos;t open yet. The host will open
                      it shortly — this page checks for updates every{' '}
                      {POLL_INTERVAL_MS / 1000} seconds.
                    </div>
                  </>
                ) : (
                  <>
                    <div className="font-semibold text-blue-900 mb-2">
                      Not quite time yet
                    </div>

                    {countdownText &&
                    remainingMs != null &&
                    remainingMs > 0 ? (
                      <div className="flex items-center justify-between gap-3">
                        <div className="text-sm text-blue-700">
                          {meta.eventNounCap} starts in{' '}
                          <span className="font-semibold text-blue-900">
                            {countdownText}
                          </span>
                          {scheduledAtText && (
                            <div className="text-xs text-blue-600 mt-1">
                              Scheduled for{' '}
                              <span className="font-medium">
                                {scheduledAtText}
                              </span>
                            </div>
                          )}
                        </div>
                        <div className="shrink-0 rounded-lg bg-white border border-blue-200 px-3 py-2 text-center">
                          <div className="text-xs text-blue-600">
                            Starts in
                          </div>
                          <div className="text-lg font-bold text-blue-900 tabular-nums">
                            {countdownText}
                          </div>
                        </div>
                      </div>
                    ) : scheduledAtText ? (
                      <div className="text-sm text-blue-700">
                        {meta.eventNounCap} starts at{' '}
                        <span className="font-medium">{scheduledAtText}</span>.
                      </div>
                    ) : (
                      <div className="text-sm text-blue-700">
                        The join button will appear when the host opens the
                        lobby.
                      </div>
                    )}

                    <div className="text-xs text-blue-600 mt-2">
                      This page checks for updates every{' '}
                      {POLL_INTERVAL_MS / 1000} seconds. The Join button
                      appears as soon as the host opens the lobby.
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Panel 3: Lobby open but canJoinNow not yet returned */}
            {showLobbyOpenPanel && (
              <div className="rounded-lg border border-green-200 bg-green-50 p-4">
                <div className="flex items-center gap-2 font-semibold text-green-900 mb-1">
                  🟢 Lobby is open!
                </div>
                <div className="text-sm text-green-700">
                  The host has opened the lobby. Getting your join
                  link&hellip;
                </div>
              </div>
            )}

            {/* Panel 4: Completed or cancelled */}
            {(ticket.roomStatus === 'completed' ||
              ticket.roomStatus === 'cancelled') && (
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                <div className="font-semibold text-gray-900 mb-1 capitalize">
                  This {meta.eventNoun} is {ticket.roomStatus}
                </div>
                <div className="text-sm text-gray-700">
                  If you think this is a mistake, please contact the host.
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="bg-gray-50 px-6 py-4 border-t space-y-3">

            {/* Join button — game-type-aware URL */}
            {joinAllowed && (
              <a
                href={joinUrl}
                className="flex items-center justify-center gap-2 w-full px-6 py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700"
              >
                <span>{meta.joinLabel}</span>
                <ExternalLink className="h-4 w-4" />
              </a>
            )}

            <button
              onClick={() => loadTicketStatus()}
              disabled={isRefreshing}
              className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <RefreshCw
                className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`}
              />
              {isRefreshing ? 'Refreshing…' : 'Refresh Status'}
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

