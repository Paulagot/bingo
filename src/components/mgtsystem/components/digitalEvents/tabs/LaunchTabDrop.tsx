// src/components/mgtsystem/components/digitalEvents/tabs/LaunchTabDrop.tsx
//
// Drop has no "launch" in the quiz/elimination sense — there's no room to
// open, no dashboard to join. It goes on sale itself once scheduled_at
// passes (see maybeOpenDropRoom, lazy-flipped server-side). This tab is
// purely about the other end: marking it done. Two-step confirm, same
// shape as LaunchTab's ticketed-event "Close Event" — irreversible,
// affects buyers, so it needs the explicit warning step.
//
// Marking complete stops new purchases (backend already 409s anything
// but 'open') but does NOT touch existing entitlements — buyers who
// already paid keep their puzzle links working forever. The copy below
// says this explicitly so a host doesn't think "complete" means "delete".

import { useState } from 'react';
import {
  CheckCircle, XCircle, AlertCircle, Clock, Loader, ShieldAlert, X, Play,
} from 'lucide-react';
import puzzleDropMgmtService from '../../../services/PuzzleDropMgmtService';

interface Props {
  roomId: string;
  status: 'scheduled' | 'open' | 'completed' | 'cancelled';
  scheduledAt: string | null;
  onStatusChanged: () => void; // triggers onRefreshRoom in the parent drawer
}

function minutesUntil(scheduledAt: string | null): number | null {
  if (!scheduledAt) return null;
  const diff = new Date(scheduledAt).getTime() - Date.now();
  return Math.ceil(diff / 60_000);
}

function formatCountdown(mins: number): string {
  if (mins > 60 * 24) return `${Math.floor(mins / (60 * 24))}d`;
  if (mins > 60) return `${Math.floor(mins / 60)}h ${mins % 60}m`;
  return `${mins} min`;
}

export default function LaunchTabDrop({ roomId, status, scheduledAt, onStatusChanged }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  const mins = minutesUntil(scheduledAt);
  const notYetOpen = status === 'scheduled' && mins !== null && mins > 0;

  const handleOpenNow = async () => {
    setLoading(true);
    setError(null);
    try {
      await puzzleDropMgmtService.openNow(roomId);
      onStatusChanged();
    } catch (e: any) {
      setError(e?.message || 'Failed to open this Drop.');
    } finally {
      setLoading(false);
    }
  };

  const handleComplete = async () => {
    setLoading(true);
    setError(null);
    try {
      await puzzleDropMgmtService.completeDrop(roomId);
      setConfirming(false);
      onStatusChanged();
    } catch (e: any) {
      setError(e?.message || 'Failed to mark this Drop as completed.');
    } finally {
      setLoading(false);
    }
  };

  if (status === 'completed') {
    return (
      <div className="p-5 space-y-4">
        <div className="rounded-xl border border-[rgba(124,58,237,0.2)] bg-[rgba(124,58,237,0.04)] p-5 text-center">
          <CheckCircle className="mx-auto mb-3 h-8 w-8 text-[#7c3aed]" />
          <p className="text-sm font-bold text-[#102532]">This Drop is completed</p>
          <p className="mx-auto mt-2 max-w-sm text-xs text-[#52636f]">
            New purchases are closed. Anyone who already bought a puzzle can still play it — nothing already sold has been affected.
          </p>
        </div>
      </div>
    );
  }

  if (status === 'cancelled') {
    return (
      <div className="p-5">
        <div className="rounded-xl border border-dashed border-[#dce1df] bg-[#fbf8f2] p-8 text-center">
          <p className="text-sm text-[#8a9bab]">This Drop has been cancelled.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-5 space-y-4">

      {/* ── Status card ── */}
      <div className="rounded-xl border p-5" style={{ borderColor: 'rgba(124,58,237,0.3)', background: 'rgba(124,58,237,0.06)' }}>
        <div className="mb-4 flex items-start gap-3">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full" style={{ background: 'rgba(124,58,237,0.15)' }}>
            <Clock className="h-5 w-5 text-[#7c3aed]" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-[#102532]">
              {status === 'scheduled' ? 'Not yet on sale' : 'On sale now'}
            </h3>
            <p className="mt-0.5 text-xs text-[#52636f]">
              {status === 'scheduled'
                ? 'This Drop opens for purchases automatically once its scheduled time passes — nothing to launch manually.'
                : 'Buyers can purchase puzzles right now. This stays on sale indefinitely until you mark it completed below.'}
            </p>
          </div>
        </div>

        <div className="mb-3 flex items-center gap-2">
          <span className="text-xs font-medium text-[#8a9bab]">Status:</span>
          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${
            status === 'open' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
          }`}>
            {status === 'open' ? '🟢 On sale' : status}
          </span>
        </div>

    {notYetOpen && mins !== null && (
          <div className="space-y-3">
            <div className="flex items-center gap-3 rounded-lg border border-[rgba(124,58,237,0.2)] bg-white px-4 py-3">
              <Clock className="h-4 w-4 flex-shrink-0 text-[#7c3aed]" />
              <div>
                <p className="text-sm font-medium text-[#52636f]">Opens automatically</p>
                <p className="mt-0.5 text-xs text-[#8a9bab]">Available in {formatCountdown(mins)}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleOpenNow}
              disabled={loading}
              className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-[#7c3aed] px-4 py-3
                text-sm font-bold text-white transition-colors hover:opacity-90
                disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? <><Loader className="h-4 w-4 animate-spin" /> Opening…</> : <><Play className="h-4 w-4" /> Open for purchases now</>}
            </button>
          </div>
        )}
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5">
          <AlertCircle className="h-4 w-4 flex-shrink-0 text-red-600 mt-0.5" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* ── Mark complete ── */}
      <div className="rounded-xl border border-[rgba(233,87,79,0.2)] bg-[rgba(233,87,79,0.04)] p-5">
        <div className="mb-4 flex items-start gap-3">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-[rgba(233,87,79,0.12)]">
            <XCircle className="h-5 w-5 text-[#c8423b]" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-[#8b1c1c]">Mark as completed</h3>
            <p className="mt-0.5 text-xs text-[#52636f]">
              Stops new purchases for good. People who've already bought a puzzle keep full access — nothing is taken away or refunded.
            </p>
          </div>
        </div>

        {!confirming ? (
          <button
            type="button"
            onClick={() => setConfirming(true)}
            className="w-full inline-flex items-center justify-center gap-2 rounded-lg border border-[rgba(233,87,79,0.3)] bg-white px-4 py-3
              text-sm font-bold text-[#c8423b] transition-colors hover:bg-[rgba(233,87,79,0.08)]
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e9574f] focus-visible:ring-offset-2"
          >
            <XCircle className="h-4 w-4" />
            Mark Drop as Completed
          </button>
        ) : (
          <div className="space-y-3 rounded-lg border border-[rgba(233,87,79,0.3)] bg-white p-4">
            <div className="flex items-start gap-2">
              <ShieldAlert className="mt-0.5 h-5 w-5 flex-shrink-0 text-rose-600" />
              <div>
                <p className="text-sm font-bold text-[#8b1c1c]">Are you sure?</p>
                <ul className="mt-2 space-y-1 text-xs text-[#8b1c1c]">
                  <li>• No one will be able to buy a puzzle from this Drop after this.</li>
                  <li>• Existing buyers keep their puzzle links and can still play, forever.</li>
                  <li>• This can't be undone from here.</li>
                </ul>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setConfirming(false)}
                disabled={loading}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg border border-[#dce1df] bg-white px-4 py-2 text-sm font-semibold text-[#52636f] hover:bg-gray-50 disabled:opacity-40"
              >
                <X className="h-3.5 w-3.5" /> Cancel
              </button>
              <button
                type="button"
                onClick={handleComplete}
                disabled={loading}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-[#e9574f] px-4 py-2 text-sm font-bold text-white hover:bg-[#c8423b] disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading ? <><Loader className="h-3.5 w-3.5 animate-spin" /> Completing…</> : 'Yes, mark completed'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}