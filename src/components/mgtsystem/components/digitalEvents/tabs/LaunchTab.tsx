// src/components/mgtsystem/components/digitalEvents/tabs/LaunchTab.tsx
//
// Launch tab for both quiz and elimination rooms.
// Elimination:
//   1. Hydrate call → DB status: scheduled → open
//   2. Host joins game tab → socket START_GAME → DB status: open → live
// Quiz:
//   onLaunchFromHere() handled by parent (unchanged).

import { useState } from 'react';
import { Play, Lock, Clock, Loader, AlertCircle } from 'lucide-react';
import type { Web2RoomListItem as Room } from '../../../../../shared/api/quiz.api';
import eliminationMgmtService from '../../../services/EliminationMgmtService';

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
}

export default function LaunchTab({ room, onLaunchFromHere }: Props) {
  const isElimination = (room as any).game_type === 'elimination';

  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  const isAvailable = ['scheduled', 'open', 'live'].includes(room.status);
  const mins        = minutesUntil(room.scheduled_at);
  const tooEarly    = room.status === 'scheduled' && mins !== null && mins > 60;

  // ── Elimination launch ──────────────────────────────────────────────────────
  // 1. POST /hydrate  → room moves scheduled → open in DB
  // 2. Open game tab  → host socket connects → START_GAME → open → live
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

  // ── Theme ───────────────────────────────────────────────────────────────────
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

  // ── Not available ───────────────────────────────────────────────────────────
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

  return (
    <div className="p-5 space-y-4">

      {/* ── Primary action card ── */}
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

        {/* Status pill — shows current DB status for transparency */}
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

        {/* Error */}
        {error && (
          <div className="mb-3 flex items-start gap-2 rounded-lg border border-[rgba(233,87,79,0.3)] bg-white px-3 py-2.5">
            <AlertCircle className="h-4 w-4 text-[#c8423b] flex-shrink-0 mt-0.5" />
            <p className="text-sm text-[#c8423b]">{error}</p>
          </div>
        )}

        {/* Too early — countdown */}
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

      {/* ── What happens next ── */}
      {!tooEarly && (
        <div className="rounded-xl border border-[#dce1df] bg-white p-4">
          <p className="text-xs font-semibold text-[#52636f] uppercase tracking-wide mb-2">
            What happens when you launch
          </p>
          <ol className="space-y-1.5">
            {isElimination ? (
              <>
                <Step n={1} text="Room config loads from the database" />
                <Step n={2} text="Room status moves to open — players can now join" />
                <Step n={3} text="Elimination lobby opens in a new tab, with you as host" />
                <Step n={4} text="When you click Start Game, status moves to live" />
              </>
            ) : (
              <>
                <Step n={1} text="Host dashboard opens in a new tab" />
                <Step n={2} text="Players can join using the room code or link" />
                <Step n={3} text="Start the quiz when everyone is ready" />
              </>
            )}
          </ol>
        </div>
      )}

    </div>
  );
}

// ── Small helper ──────────────────────────────────────────────────────────────
function Step({ n, text }: { n: number; text: string }) {
  return (
    <li className="flex items-start gap-2 text-xs text-[#52636f]">
      <span className="flex-shrink-0 flex h-4 w-4 items-center justify-center rounded-full bg-[#f0f4f3] text-[10px] font-bold text-[#52636f]">
        {n}
      </span>
      {text}
    </li>
  );
}