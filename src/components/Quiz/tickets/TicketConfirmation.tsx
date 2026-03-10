import React, { useMemo, useState } from 'react';
import { Check, Copy, ExternalLink, Link as LinkIcon } from 'lucide-react';
import type { Ticket, RoomInfo } from './types';

interface TicketConfirmationProps {
  ticket: Ticket;
  roomInfo: RoomInfo;
}

type StatusKey = Ticket['paymentStatus'];

export const TicketConfirmation: React.FC<TicketConfirmationProps> = ({ ticket }) => {
  const [copiedJoin, setCopiedJoin] = useState(false);
  const [copiedStatus, setCopiedStatus] = useState(false);

  const origin =
    typeof window !== 'undefined' && window.location?.origin
      ? window.location.origin
      : '';

  // ✅ This is the link you want to email + copy
  const joinUrl = `${origin}/quiz/join/${ticket.roomId}?joinToken=${encodeURIComponent(
    ticket.joinToken
  )}`;

  const statusUrl = `${origin}/tickets/status/${ticket.ticketId}`;

  const copyToClipboard = async (value: string, setFlag: (v: boolean) => void) => {
    try {
      await navigator.clipboard.writeText(value);
      setFlag(true);
      setTimeout(() => setFlag(false), 2000);
    } catch {
      // ignore
    }
  };

  const status = useMemo(() => {
    const map: Record<
      StatusKey,
      {
        icon: string;
        title: string;
        message: string;
        badgeClass: string;
        boxClass: string;
        borderClass: string;
        textClass: string;
      }
    > = {
      payment_claimed: {
        icon: '⏳',
        title: 'Payment pending',
        message: 'The host will confirm your payment shortly.',
        badgeClass: 'bg-yellow-100 text-yellow-800 border-yellow-200',
        boxClass: 'bg-yellow-50',
        borderClass: 'border-yellow-200',
        textClass: 'text-yellow-900',
      },
      payment_confirmed: {
        icon: '✅',
        title: 'Payment confirmed',
        message: 'Your ticket is ready — you can join when the room opens.',
        badgeClass: 'bg-green-100 text-green-800 border-green-200',
        boxClass: 'bg-green-50',
        borderClass: 'border-green-200',
        textClass: 'text-green-900',
      },
      refunded: {
        icon: '💰',
        title: 'Refunded',
        message: 'This ticket was refunded. If you think this is a mistake, contact the host.',
        badgeClass: 'bg-red-100 text-red-800 border-red-200',
        boxClass: 'bg-red-50',
        borderClass: 'border-red-200',
        textClass: 'text-red-900',
      },
    };

    return map[ticket.paymentStatus];
  }, [ticket.paymentStatus]);

  const showJoinNow = ticket.redemptionStatus === 'ready';

  return (
    <div className="h-full overflow-y-auto">
      {/* ✅ Compact header: icon left, text right */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-5 py-4 sm:px-8 sm:py-5">
        <div className="flex items-center gap-4">
          <div className="text-4xl sm:text-5xl">🎟️</div>

          <div className="min-w-0 flex-1">
            <div className="text-white text-xl sm:text-2xl font-bold leading-tight">
              Ticket created
            </div>

            <div className="mt-1 text-indigo-100 text-sm">
              Ticket ID:{' '}
              <span className="font-semibold text-white/90">{ticket.ticketId}</span>
            </div>

            <div className="mt-2 text-white/90 text-xs sm:text-sm">
              We&apos;ve sent confirmation to:{' '}
              <span className="font-semibold text-white">{ticket.purchaserEmail}</span>
            </div>
          </div>

        </div>
      </div>

      {/* Body */}
      <div className="p-4 sm:p-6 space-y-5">
        {/* Status */}
        <div className={`rounded-xl border ${status.borderClass} ${status.boxClass} p-4`}>
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="text-2xl">{status.icon}</div>
              <div>
                <div className={`font-semibold ${status.textClass}`}>{status.title}</div>
                <div className="text-sm text-gray-700">{status.message}</div>
              </div>
            </div>

            {/* mobile badge */}
            <span
              className={`sm:hidden shrink-0 rounded-full border px-2.5 py-1 text-xs font-semibold ${status.badgeClass}`}
            >
              {ticket.paymentStatus.replace('_', ' ')}
            </span>
          </div>
        </div>

        {/* ✅ Join link (full URL) */}
        <div className="rounded-xl border border-indigo-200 bg-gradient-to-r from-indigo-50 to-purple-50 p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                <LinkIcon className="h-4 w-4 text-indigo-700" />
                Your join link
              </h2>
              <p className="mt-1 text-sm text-indigo-900/80">
                This is the same link we email you. Copy it and keep it handy for quiz night.
              </p>
            </div>
          </div>

          <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
            <code className="w-full sm:flex-1 bg-white px-3 py-3 rounded-lg border border-indigo-200 font-mono text-sm sm:text-base break-all">
              {statusUrl}
            </code>

            <button
              type="button"
              onClick={() => copyToClipboard(statusUrl, setCopiedJoin)}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-3 text-sm font-semibold text-white hover:bg-indigo-700"
            >
              {copiedJoin ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copiedJoin ? 'Copied' : 'Copy link'}
            </button>
          </div>

          {/* Optional: show token small under it for support/debug */}
          <div className="mt-3 text-xs text-indigo-900/70">
            Token: <span className="font-mono">{ticket.joinToken}</span>
          </div>
        </div>

        {/* Ticket summary */}
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <h2 className="font-semibold text-gray-900 mb-3">Ticket summary</h2>

          <div className="space-y-2 text-sm">
            <div className="flex justify-between gap-3">
              <span className="text-gray-600">Player name</span>
              <span className="font-medium text-gray-900 truncate">{ticket.playerName}</span>
            </div>

            <div className="flex justify-between gap-3">
              <span className="text-gray-600">Entry fee</span>
              <span className="font-medium text-gray-900">
                {ticket.currency}
                {ticket.entryFee.toFixed(2)}
              </span>
            </div>

            {ticket.extrasTotal > 0 && (
              <div className="flex justify-between gap-3">
                <span className="text-gray-600">Extras</span>
                <span className="font-medium text-gray-900">
                  {ticket.currency}
                  {ticket.extrasTotal.toFixed(2)}
                </span>
              </div>
            )}

            <div className="pt-2 mt-2 border-t border-gray-200 flex justify-between gap-3">
              <span className="font-semibold text-gray-900">Total</span>
              <span className="font-bold text-gray-900">
                {ticket.currency}
                {ticket.totalAmount.toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        {/* What happens next */}
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
          <h3 className="font-semibold text-blue-900 mb-2">What happens next</h3>
          <ol className="list-decimal list-inside space-y-1 text-sm text-blue-800">
            <li>The host confirms your payment</li>
            <li>Your ticket becomes ready to redeem</li>
            <li>Use your join link on quiz night</li>
            <li>You can check your ticket status anytime</li>
          </ol>
        </div>

        {/* Actions */}
        <div className="space-y-3">
          {/* Status link: also full URL + copy option */}
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <div className="font-semibold text-gray-900 mb-2">Ticket status link</div>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <code className="w-full sm:flex-1 bg-gray-50 px-3 py-3 rounded-lg border border-gray-200 font-mono text-xs sm:text-sm break-all">
                {statusUrl}
              </code>

              <button
                type="button"
                onClick={() => copyToClipboard(statusUrl, setCopiedStatus)}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-lg bg-gray-900 px-4 py-3 text-sm font-semibold text-white hover:bg-black"
              >
                {copiedStatus ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copiedStatus ? 'Copied' : 'Copy'}
              </button>
            </div>

            <a
              href={`/tickets/status/${ticket.ticketId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-indigo-700 hover:text-indigo-800"
            >
              Open status page <ExternalLink className="h-4 w-4" />
            </a>
          </div>

          {/* Join now button (if ready) */}
          {showJoinNow && (
            <a
              href={`/quiz/join/${ticket.roomId}?joinToken=${ticket.joinToken}`}
              className="flex items-center justify-center gap-2 w-full px-5 py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700"
            >
              Join quiz now <span>→</span>
            </a>
          )}
        </div>

        <div className="h-2" />
      </div>
    </div>
  );
};

