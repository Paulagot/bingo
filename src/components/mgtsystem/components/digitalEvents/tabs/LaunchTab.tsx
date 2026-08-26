// src/components/mgtsystem/components/digitalEvents/tabs/LaunchTab.tsx
//
// Launch tab for quiz, elimination, and ticketed event rooms.
//
// Quiz:
//   onLaunchFromHere() handled by parent (unchanged).
//
// Elimination:
//   1. Hydrate call → DB status: scheduled → open
//      onRoomUpdated() is called so the drawer refreshes to show 'open'.
//   2. When open, a shareable join link + QR is shown for on-the-night walk-ins.
//   3. Host joins game tab → socket START_GAME → DB status: open → live
//
// Ticketed event:
//   1. "Open Check-in" → POST /open-checkin → DB status: scheduled → open
//   2. Opens check-in dashboard in new tab
//   3. "Close Event" → POST /complete → DB status: open → completed

import { useState } from 'react';
import {
  Play, Lock, Clock, Loader, AlertCircle,
  QrCode, CheckCircle, XCircle, Copy, ExternalLink, Users,
} from 'lucide-react';
import { QRCodeCanvas } from 'qrcode.react';
import type { Web2RoomListItem as Room } from '../../../../../shared/api/quiz.api';
import eliminationMgmtService from '../../../services/EliminationMgmtService';
import ticketedEventMgmtService from '../../../services/TicketedEventMgmtService';

function minutesUntil(scheduledAt: string | null): number | null {
  if (!scheduledAt) return null;
  const diff = new Date(scheduledAt).getTime() - Date.now();
  return Math.ceil(diff / 60_000);
}

function formatCountdown(mins: number): string {
  if (mins > 60) return `${Math.floor(mins / 60)}h ${mins % 60}m`;
  return `${mins} min`;
}

interface Props {
  room: Room;
  onLaunchFromHere: () => void;
  onRoomUpdated?: () => void;
}

export default function LaunchTab({ room, onLaunchFromHere, onRoomUpdated }: Props) {
  const isElimination   = (room as any).game_type === 'elimination';
  const isTicketedEvent = (room as any).game_type === 'ticketed_event';

  const [loading,        setLoading]        = useState(false);
  const [closingEvent,   setClosingEvent]   = useState(false);
  const [error,          setError]          = useState<string | null>(null);
  const [closeConfirm,   setCloseConfirm]   = useState(false);
  const [copiedJoinLink, setCopiedJoinLink] = useState(false);
  const [showJoinQr,     setShowJoinQr]     = useState(false);

  const isAvailable = ['scheduled', 'open', 'live'].includes(room.status);
  const isOpen      = room.status === 'open';
  const mins        = minutesUntil(room.scheduled_at);
  const tooEarly    = room.status === 'scheduled' && mins !== null && mins > 60;

  // The public join URL players use to enter the room on the night
  const joinUrl = isElimination
    ? `${window.location.origin}/elimination/join/${room.room_id}`
    : null;

  // ── Copy join link ────────────────────────────────────────────────────────
  const copyJoinLink = async () => {
    if (!joinUrl) return;
    try {
      await navigator.clipboard.writeText(joinUrl);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = joinUrl;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    setCopiedJoinLink(true);
    window.setTimeout(() => setCopiedJoinLink(false), 2000);
  };

  // ── Elimination launch ────────────────────────────────────────────────────
  const handleEliminationLaunch = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await eliminationMgmtService.hydrateRoom(room.room_id);
      // Refresh the drawer so status shows 'open' immediately
      onRoomUpdated?.();
      const params = new URLSearchParams({
        roomId: result.roomId,
        hostId: result.hostId,
        mode:   'host',
      });
      window.open(`/elimination?${params.toString()}`, '_blank');
    } catch (e: any) {
      setError(e?.message || 'Failed to launch. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ── Ticketed event: open check-in ─────────────────────────────────────────
  const handleOpenCheckin = async () => {
    setLoading(true);
    setError(null);
    try {
      await ticketedEventMgmtService.openCheckIn(room.room_id);
      const params = new URLSearchParams({ hostId: room.host_id });
      window.open(`/ticketed-event/checkin/${room.room_id}?${params.toString()}`, '_blank');
      onRoomUpdated?.();
    } catch (e: any) {
      setError(e?.message || 'Failed to open check-in. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleRejoinCheckin = () => {
    const params = new URLSearchParams({ hostId: room.host_id });
    window.open(`/ticketed-event/checkin/${room.room_id}?${params.toString()}`, '_blank');
  };

  const handleCloseEvent = async () => {
    setClosingEvent(true);
    setError(null);
    try {
      await ticketedEventMgmtService.completeEvent(room.room_id);
      setCloseConfirm(false);
      onRoomUpdated?.();
    } catch (e: any) {
      setError(e?.message || 'Failed to close event. Please try again.');
    } finally {
      setClosingEvent(false);
    }
  };

  // ── Theme ─────────────────────────────────────────────────────────────────
  const theme = isElimination
    ? {
        wrap:     'border-[rgba(233,87,79,0.3)] bg-[rgba(233,87,79,0.06)]',
        iconBg:   'bg-[rgba(233,87,79,0.15)]',
        iconTxt:  'text-[#c8423b]',
        btn:      'bg-[#e9574f] hover:bg-[#c8423b] focus-visible:ring-[#e9574f]',
        heading:  'text-[#8b1c1c]',
        accent:   'text-[#c8423b]',
        lockBg:   'border-[rgba(233,87,79,0.2)] bg-[rgba(233,87,79,0.04)]',
        lockIcon: 'text-[#c8423b]',
        joinBg:   'border-[rgba(233,87,79,0.2)] bg-[rgba(233,87,79,0.04)]',
        joinBtn:  'bg-[#e9574f] hover:bg-[#c8423b]',
        joinOutline: 'border-[rgba(233,87,79,0.3)] text-[#c8423b] hover:bg-[rgba(233,87,79,0.08)]',
      }
    : isTicketedEvent
    ? {
        wrap:     'border-[rgba(21,127,133,0.3)] bg-[rgba(21,127,133,0.06)]',
        iconBg:   'bg-[rgba(21,127,133,0.15)]',
        iconTxt:  'text-[#157f85]',
        btn:      'bg-[#157f85] hover:bg-[#0e6268] focus-visible:ring-[#157f85]',
        heading:  'text-[#102532]',
        accent:   'text-[#157f85]',
        lockBg:   'border-[rgba(21,127,133,0.2)] bg-[rgba(21,127,133,0.04)]',
        lockIcon: 'text-[#157f85]',
        joinBg:   '',
        joinBtn:  '',
        joinOutline: '',
      }
    : {
        wrap:     'border-[rgba(21,127,133,0.3)] bg-[rgba(21,127,133,0.06)]',
        iconBg:   'bg-[rgba(21,127,133,0.15)]',
        iconTxt:  'text-[#157f85]',
        btn:      'bg-[#157f85] hover:bg-[#0e6268] focus-visible:ring-[#157f85]',
        heading:  'text-[#102532]',
        accent:   'text-[#157f85]',
        lockBg:   'border-[rgba(21,127,133,0.2)] bg-[rgba(21,127,133,0.04)]',
        lockIcon: 'text-[#157f85]',
        joinBg:   '',
        joinBtn:  '',
        joinOutline: '',
      };

  // ── Not available ─────────────────────────────────────────────────────────
  if (!isAvailable) {
    return (
      <div className="p-5">
        <div className="rounded-xl border border-dashed border-[#dce1df] bg-[#fbf8f2] p-8 text-center">
          <p className="text-sm text-[#8a9bab]">
            Launch is only available for scheduled, open, or live events.
          </p>
        </div>
      </div>
    );
  }

  // ── Ticketed event layout (unchanged) ────────────────────────────────────
  if (isTicketedEvent) {
    return (
      <div className="p-5 space-y-4">
        <div className={`rounded-xl border p-5 ${theme.wrap}`}>
          <div className="flex items-start gap-3 mb-4">
            <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full ${theme.iconBg}`}>
              <QrCode className={`h-5 w-5 ${theme.iconTxt}`} />
            </div>
            <div>
              <h3 className={`text-sm font-semibold ${theme.heading}`}>
                {isOpen ? 'Check-in is open' : 'Open check-in'}
              </h3>
              <p className="mt-0.5 text-xs text-[#52636f]">
                {isOpen
                  ? 'Guests are checking in. Open the check-in dashboard to scan QR codes and manage attendees.'
                  : 'Start check-in on the night. This opens a dashboard where you and your door staff can scan guest QR codes.'}
              </p>
            </div>
          </div>

          <div className="mb-3 flex items-center gap-2">
            <span className="text-xs text-[#8a9bab] font-medium">Status:</span>
            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${
              isOpen
                ? 'bg-green-100 text-green-700'
                : room.status === 'scheduled'
                  ? 'bg-yellow-100 text-yellow-700'
                  : 'bg-gray-100 text-gray-500'
            }`}>
              {isOpen ? '🟢 Check-in open' : room.status}
            </span>
          </div>

          {error && (
            <div className="mb-3 flex items-start gap-2 rounded-lg border border-[rgba(233,87,79,0.3)] bg-white px-3 py-2.5">
              <AlertCircle className="h-4 w-4 text-[#c8423b] flex-shrink-0 mt-0.5" />
              <p className="text-sm text-[#c8423b]">{error}</p>
            </div>
          )}

          {tooEarly ? (
            <div className={`rounded-lg border px-4 py-3 flex items-center gap-3 ${theme.lockBg}`}>
              <Clock className={`h-4 w-4 flex-shrink-0 ${theme.lockIcon}`} />
              <div>
                <p className="text-sm font-medium text-[#52636f]">
                  Opens 1 hour before the scheduled start
                </p>
                {mins !== null && (
                  <p className="mt-0.5 text-xs text-[#8a9bab]">
                    Available in {formatCountdown(mins)}
                  </p>
                )}
              </div>
              <Lock className="h-4 w-4 text-[#8a9bab] ml-auto flex-shrink-0" />
            </div>
          ) : isOpen ? (
            <button
              type="button"
              onClick={handleRejoinCheckin}
              className={`w-full inline-flex items-center justify-center gap-2 rounded-lg px-4 py-3
                text-sm font-bold text-white transition-colors
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2
                ${theme.btn}`}
            >
              <QrCode className="h-4 w-4" />
              Open Check-in Dashboard
            </button>
          ) : (
            <button
              type="button"
              onClick={handleOpenCheckin}
              disabled={loading}
              className={`w-full inline-flex items-center justify-center gap-2 rounded-lg px-4 py-3
                text-sm font-bold text-white transition-colors
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2
                disabled:opacity-60 disabled:cursor-not-allowed ${theme.btn}`}
            >
              {loading ? (
                <><Loader className="h-4 w-4 animate-spin" />Opening check-in…</>
              ) : (
                <><QrCode className="h-4 w-4" />Open Check-in</>
              )}
            </button>
          )}
        </div>

        {isOpen && (
          <div className="rounded-xl border border-[rgba(233,87,79,0.2)] bg-[rgba(233,87,79,0.04)] p-5">
            <div className="flex items-start gap-3 mb-4">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-[rgba(233,87,79,0.12)]">
                <CheckCircle className="h-5 w-5 text-[#c8423b]" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-[#8b1c1c]">Close event</h3>
                <p className="mt-0.5 text-xs text-[#52636f]">
                  Mark the event as completed and start reconciliation. This closes check-in and moves to the report and approval screens.
                </p>
              </div>
            </div>

            {!closeConfirm ? (
              <button
                type="button"
                onClick={() => setCloseConfirm(true)}
                className="w-full inline-flex items-center justify-center gap-2 rounded-lg border border-[rgba(233,87,79,0.3)] bg-white px-4 py-3
                  text-sm font-bold text-[#c8423b] transition-colors hover:bg-[rgba(233,87,79,0.08)]
                  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e9574f] focus-visible:ring-offset-2"
              >
                <XCircle className="h-4 w-4" />
                Close Event &amp; Start Reconciliation
              </button>
            ) : (
              <div className="rounded-lg border border-[rgba(233,87,79,0.3)] bg-white p-4 space-y-3">
                <p className="text-sm font-semibold text-[#8b1c1c]">
                  Are you sure? This will close check-in and begin reconciliation.
                </p>
                <p className="text-xs text-[#52636f]">
                  Make sure all payments are confirmed before closing.
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setCloseConfirm(false)}
                    disabled={closingEvent}
                    className="flex-1 rounded-lg border border-[#dce1df] bg-white px-4 py-2 text-sm font-semibold text-[#52636f]
                      hover:bg-gray-50 disabled:opacity-40"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleCloseEvent}
                    disabled={closingEvent}
                    className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-[#e9574f]
                      px-4 py-2 text-sm font-bold text-white hover:bg-[#c8423b]
                      disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {closingEvent ? (
                      <><Loader className="h-3.5 w-3.5 animate-spin" />Closing…</>
                    ) : (
                      'Yes, close event'
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // ── Quiz / Elimination layout ─────────────────────────────────────────────
  return (
    <div className="p-5 space-y-4">

      {/* ── Launch / Rejoin card ── */}
      <div className={`rounded-xl border p-5 ${theme.wrap}`}>
        <div className="flex items-start gap-3 mb-4">
          <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full ${theme.iconBg}`}>
            <Play className={`h-5 w-5 ${theme.iconTxt}`} />
          </div>
          <div>
            <h3 className={`text-sm font-semibold ${theme.heading}`}>
              {isElimination
                ? (isOpen ? 'Game is open — rejoin as host' : 'Launch Elimination Game')
                : 'Open Host Dashboard'}
            </h3>
            <p className="mt-0.5 text-xs text-[#52636f]">
              {isElimination
                ? isOpen
                  ? 'The game room is open and accepting players. Click to rejoin the host view and start the game when ready.'
                  : 'Loads the room config, marks the room open, and joins you as host in a new tab. Players can then join using the link below.'
                : 'Opens the full host dashboard in a new tab. From there you can start the game, manage players, and run the quiz.'}
            </p>
          </div>
        </div>

        <div className="mb-3 flex items-center gap-2">
          <span className="text-xs text-[#8a9bab] font-medium">Status:</span>
          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold
            ${room.status === 'live'      ? 'bg-green-100 text-green-700'   :
              room.status === 'open'      ? 'bg-blue-100 text-blue-700'     :
              room.status === 'scheduled' ? 'bg-yellow-100 text-yellow-700' :
                                            'bg-gray-100 text-gray-500'}`}>
            {room.status}
          </span>
        </div>

        {error && (
          <div className="mb-3 flex items-start gap-2 rounded-lg border border-[rgba(233,87,79,0.3)] bg-white px-3 py-2.5">
            <AlertCircle className="h-4 w-4 text-[#c8423b] flex-shrink-0 mt-0.5" />
            <p className="text-sm text-[#c8423b]">{error}</p>
          </div>
        )}

        {tooEarly ? (
          <div className={`rounded-lg border px-4 py-3 flex items-center gap-3 ${theme.lockBg}`}>
            <Clock className={`h-4 w-4 flex-shrink-0 ${theme.lockIcon}`} />
            <div>
              <p className="text-sm font-medium text-[#52636f]">
                Opens 1 hour before the scheduled start
              </p>
              {mins !== null && (
                <p className="mt-0.5 text-xs text-[#8a9bab]">
                  Available in {formatCountdown(mins)}
                </p>
              )}
            </div>
            <Lock className="h-4 w-4 text-[#8a9bab] ml-auto flex-shrink-0" />
          </div>
        ) : (
          <button
            type="button"
            onClick={isElimination ? handleEliminationLaunch : onLaunchFromHere}
            disabled={loading}
            className={`w-full inline-flex items-center justify-center gap-2 rounded-lg px-4 py-3
              text-sm font-bold text-white transition-colors
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2
              disabled:opacity-60 disabled:cursor-not-allowed ${theme.btn}`}
          >
            {loading ? (
              <>
                <Loader className="h-4 w-4 animate-spin" />
                {isOpen ? 'Opening…' : 'Loading game…'}
              </>
            ) : (
              <>
                <Play className="h-4 w-4" />
                {isElimination
                  ? (isOpen ? 'Rejoin Game' : 'Launch Elimination')
                  : 'Open Host Dashboard'}
              </>
            )}
          </button>
        )}
      </div>

      {/* ── Join link / QR card — shown for elimination once room is open ── */}
      {isElimination && isOpen && joinUrl && (
        <div className={`rounded-xl border p-5 ${theme.joinBg}`}>
          <div className="flex items-start gap-3 mb-4">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-[rgba(233,87,79,0.12)]">
              <Users className="h-5 w-5 text-[#c8423b]" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-[#8b1c1c]">Player join link</h3>
              <p className="mt-0.5 text-xs text-[#52636f]">
                Share this link or QR code so players can join on the night. They'll be prompted to enter their name and pay the entry fee.
              </p>
            </div>
          </div>

          <code className="mb-3 block truncate rounded-lg border border-[rgba(233,87,79,0.2)] bg-white px-3 py-2 font-mono text-xs text-gray-700">
            {joinUrl}
          </code>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setShowJoinQr(v => !v)}
              className={`inline-flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-semibold transition-colors ${theme.joinOutline}`}
            >
              <QrCode className="h-4 w-4" />
              {showJoinQr ? 'Hide QR' : 'Show QR'}
            </button>
            <button
              type="button"
              onClick={copyJoinLink}
              className={`flex-1 inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5
                text-sm font-bold text-white transition-colors ${theme.joinBtn}`}
            >
              {copiedJoinLink
                ? <><CheckCircle className="h-4 w-4" />Copied!</>
                : <><Copy className="h-4 w-4" />Copy join link</>
              }
            </button>
            <a
              href={joinUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg border border-[rgba(233,87,79,0.2)] bg-white px-3 py-2.5 text-sm font-semibold text-[#c8423b] transition-colors hover:bg-[rgba(233,87,79,0.06)]"
              title="Preview join page"
            >
              <ExternalLink className="h-4 w-4" />
            </a>
          </div>

          {showJoinQr && (
            <div className="mt-4 flex justify-center">
              <div className="rounded-xl border border-[rgba(233,87,79,0.2)] bg-white p-4 shadow-sm">
                <QRCodeCanvas value={joinUrl} size={200} includeMargin />
                <p className="mt-2 text-center text-xs text-[#8a9bab]">Players scan to join</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Scheduled tip — only for elimination before launch ── */}
      {isElimination && room.status === 'scheduled' && !tooEarly && (
        <div className="rounded-xl border border-[#dce1df] bg-[#fbf8f2] p-4">
          <p className="text-xs text-[#52636f]">
            <span className="font-semibold">After launching:</span> a shareable join link and QR code will appear here so players can join on the night.
          </p>
        </div>
      )}
    </div>
  );
}