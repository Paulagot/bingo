// src/components/mgtsystem/components/digitalEvents/tabs/LaunchTab.tsx
//
// Launch tab for quiz, elimination, and ticketed event rooms.
//
// Quiz:
//   onLaunchFromHere() handled by parent (unchanged).
//
// Elimination:
//   1. Hydrate call → DB status: scheduled → open
//   2. Host joins game tab → socket START_GAME → DB status: open → live
//
// Ticketed event:
//   1. "Open Check-in" → POST /open-checkin → DB status: scheduled → open
//   2. Opens check-in dashboard in new tab
//   3. "Close Event" → POST /complete → DB status: open → completed
//      This triggers reconciliation (same as game end for quiz/elimination)

import { useState } from 'react';
import {
  Play, Lock, Clock, Loader, AlertCircle,
  QrCode, CheckCircle, XCircle,
} from 'lucide-react';
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
  onRoomUpdated?: () => void; // called after status changes so drawer refreshes
}

export default function LaunchTab({ room, onLaunchFromHere, onRoomUpdated }: Props) {
  const isElimination   = (room as any).game_type === 'elimination';
  const isTicketedEvent = (room as any).game_type === 'ticketed_event';

  const [loading,        setLoading]        = useState(false);
  const [closingEvent,   setClosingEvent]   = useState(false);
  const [error,          setError]          = useState<string | null>(null);
  const [closeConfirm,   setCloseConfirm]   = useState(false);

  const isAvailable = ['scheduled', 'open', 'live'].includes(room.status);
  const isOpen      = room.status === 'open';
  const mins        = minutesUntil(room.scheduled_at);
  const tooEarly    = room.status === 'scheduled' && mins !== null && mins > 60;

  // ── Elimination launch ────────────────────────────────────────────────────
  const handleEliminationLaunch = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await eliminationMgmtService.hydrateRoom(room.room_id);
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
      // Open the check-in dashboard in a new tab
      const params = new URLSearchParams({ hostId: room.host_id });
      window.open(`/ticketed-event/checkin/${room.room_id}?${params.toString()}`, '_blank');
      onRoomUpdated?.();
    } catch (e: any) {
      setError(e?.message || 'Failed to open check-in. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ── Ticketed event: open existing check-in dashboard ─────────────────────
  const handleRejoinCheckin = () => {
    const params = new URLSearchParams({ hostId: room.host_id });
    window.open(`/ticketed-event/checkin/${room.room_id}?${params.toString()}`, '_blank');
  };

  // ── Ticketed event: close event + trigger reconciliation ──────────────────
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

  // ── Ticketed event layout ─────────────────────────────────────────────────
  if (isTicketedEvent) {
    return (
      <div className="p-5 space-y-4">

        {/* ── Primary action card ── */}
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

          {/* Status pill */}
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
            // Already open — rejoin check-in dashboard
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
            // Scheduled — open check-in
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

        {/* ── Close event card — only shown when check-in is open ── */}
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
                  Make sure all payments are confirmed before closing. You can still view and approve reconciliation afterwards.
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

  // ── Quiz / Elimination layout (unchanged) ─────────────────────────────────
  return (
    <div className="p-5 space-y-4">
      <div className={`rounded-xl border p-5 ${theme.wrap}`}>

        {/* Header */}
        <div className="flex items-start gap-3 mb-4">
          <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full ${theme.iconBg}`}>
            <Play className={`h-5 w-5 ${theme.iconTxt}`} />
          </div>
          <div>
            <h3 className={`text-sm font-semibold ${theme.heading}`}>
              {isElimination ? 'Launch Elimination Game' : 'Open Host Dashboard'}
            </h3>
            <p className="mt-0.5 text-xs text-[#52636f]">
              {isElimination
                ? 'Loads the room config, marks the room open, and joins you as host in a new tab. The room goes live once you start the game.'
                : 'Opens the full host dashboard in a new tab. From there you can start the game, manage players, and run the quiz.'}
            </p>
          </div>
        </div>

        {/* Status pill */}
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
                Loading game…
              </>
            ) : (
              <>
                <Play className="h-4 w-4" />
                {isElimination
                  ? (room.status === 'open' ? 'Rejoin Game' : 'Launch Elimination')
                  : 'Open Host Dashboard'}
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}