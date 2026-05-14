// src/components/mgtsystem/components/digitalEvents/tabs/LaunchTab.tsx
import { useState, useEffect } from 'react';
import { Play, Lock, Clock, ExternalLink, Copy, Check, Loader, QrCode } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import type { Web2RoomListItem as Room } from '../../../../../shared/api/quiz.api';
import eliminationMgmtService from '../../../services/EliminationMgmtService';

const QUIZ_API_BASE = import.meta.env.PROD ? '' : 'http://localhost:3001';
const getToken = () => localStorage.getItem('auth_token') ?? '';

function minutesUntil(scheduledAt: string | null): number | null {
  if (!scheduledAt) return null;
  const diff = new Date(scheduledAt).getTime() - Date.now();
  return Math.ceil(diff / 60_000);
}

interface Props {
  room: Room;
  onLaunchFromHere: () => void;
}

export default function LaunchTab({ room, onLaunchFromHere }: Props) {
  const isElimination = (room as any).game_type === 'elimination';

  const [showOperatorSection, setShowOperatorSection] = useState(false);
  const [operatorUrl,  setOperatorUrl]  = useState<string | null>(null);
  const [tokenLoading, setTokenLoading] = useState(false);
  const [tokenError,   setTokenError]   = useState(false);
  const [copied,       setCopied]       = useState(false);

  // Elimination-specific launch state
  const [hydrateLoading, setHydrateLoading] = useState(false);
  const [hydrateError,   setHydrateError]   = useState<string | null>(null);

  const isAvailable = ['scheduled', 'open', 'live'].includes(room.status);
  const mins    = minutesUntil(room.scheduled_at);
  const tooEarly = room.status === 'scheduled' && mins !== null && mins > 60;

  // Fetch operator token when section expands
  useEffect(() => {
    if (!showOperatorSection || operatorUrl || tokenError) return;
    let cancelled = false;
    setTokenLoading(true);

    (async () => {
      try {
        if (isElimination) {
          // Elimination: use mgmt service operator token endpoint
          const data = await eliminationMgmtService.getOperatorToken(room.room_id);
          if (!cancelled) setOperatorUrl(data.operatorUrl);
        } else {
          // Quiz: existing endpoint
          const token = getToken();
          const res = await fetch(
            `${QUIZ_API_BASE}/quiz/api/web2/rooms/${room.room_id}/operator-token`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                ...(token && { Authorization: `Bearer ${token}` }),
              },
            },
          );
          if (!res.ok) {
            const d = await res.json().catch(() => ({}));
            throw new Error(d.message || `status ${res.status}`);
          }
          const data = await res.json();
          if (!cancelled) setOperatorUrl(data.operatorUrl);
        }
      } catch {
        if (!cancelled) setTokenError(true);
      } finally {
        if (!cancelled) setTokenLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [showOperatorSection, room.room_id, isElimination]);

  // Elimination launch: hydrate into socket server then open game tab
  const handleEliminationLaunch = async () => {
    setHydrateLoading(true);
    setHydrateError(null);
    try {
      const result = await eliminationMgmtService.hydrateRoom(room.room_id);
      window.open(
        `/elimination/host/${result.roomId}?hostId=${encodeURIComponent(result.hostId)}`,
        '_blank',
      );
    } catch (e: any) {
      setHydrateError(e?.message || 'Failed to launch. Please try again.');
    } finally {
      setHydrateLoading(false);
    }
  };

  const copyLink = async () => {
    if (!operatorUrl) return;
    try { await navigator.clipboard.writeText(operatorUrl); }
    catch {
      const ta = document.createElement('textarea');
      ta.value = operatorUrl;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  if (!isAvailable) {
    return (
      <div className="p-5">
        <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 p-8 text-center">
          <p className="text-sm text-gray-400">
            Launch is only available for scheduled, open or live events.
          </p>
        </div>
      </div>
    );
  }

  const accentClass = isElimination
    ? 'border-red-200 bg-red-50'
    : 'border-indigo-200 bg-indigo-50';
  const iconBgClass = isElimination
    ? 'bg-red-100'
    : 'bg-indigo-100';
  const iconTextClass = isElimination
    ? 'text-red-600'
    : 'text-indigo-600';
  const btnClass = isElimination
    ? 'bg-red-600 hover:bg-red-700'
    : 'bg-indigo-600 hover:bg-indigo-700';
  const headingClass = isElimination
    ? 'text-red-900'
    : 'text-indigo-900';

  return (
    <div className="p-5 space-y-5">

      {/* ── Primary action ── */}
      <div className={`rounded-xl border p-5 ${accentClass}`}>
        <div className="flex items-start gap-3 mb-4">
          <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full ${iconBgClass}`}>
            <Play className={`h-5 w-5 ${iconTextClass}`} />
          </div>
          <div>
            <h3 className={`text-sm font-semibold ${headingClass}`}>
              {isElimination ? 'Open Elimination Host Dashboard' : 'Open Host Dashboard'}
            </h3>
            <p className="mt-0.5 text-xs text-gray-600">
              {isElimination
                ? 'Loads the game config from the database, then opens the host dashboard in a new tab. From there you can wait for players and start the game.'
                : 'Opens the full host dashboard in a new tab. From there you can start the game, manage players, and run the quiz on the night.'}
            </p>
          </div>
        </div>

        {/* Hydrate error */}
        {hydrateError && (
          <div className="mb-3 rounded-lg border border-red-200 bg-white px-3 py-2.5 text-sm text-red-700">
            {hydrateError}
          </div>
        )}

        {tooEarly ? (
          <div className="rounded-lg border border-indigo-200 bg-white px-4 py-3 flex items-center gap-3">
            <Clock className="h-4 w-4 text-indigo-400 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-gray-700">Opens 1 hour before the scheduled start</p>
              {mins !== null && (
                <p className="mt-0.5 text-xs text-gray-500">
                  Available in {mins > 60 ? `${Math.floor(mins / 60)}h ${mins % 60}m` : `${mins} min`}
                </p>
              )}
            </div>
            <Lock className="h-4 w-4 text-gray-400 ml-auto flex-shrink-0" />
          </div>
        ) : (
          <button
            type="button"
            onClick={isElimination ? handleEliminationLaunch : onLaunchFromHere}
            disabled={hydrateLoading}
            className={`w-full inline-flex items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-bold text-white transition-colors disabled:opacity-60 disabled:cursor-not-allowed ${btnClass}`}
          >
            {hydrateLoading ? (
              <>
                <Loader className="h-4 w-4 animate-spin" />
                Loading game…
              </>
            ) : (
              <>
                <Play className="h-4 w-4" />
                {isElimination ? 'Launch Elimination' : 'Open Host Dashboard'}
              </>
            )}
          </button>
        )}
      </div>

      {/* ── Operator link ── */}
      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        <button
          type="button"
          onClick={() => setShowOperatorSection(v => !v)}
          className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <QrCode className="h-4 w-4 text-gray-500" />
            Someone else is running the game on the night?
          </div>
          <span className={`text-xs font-semibold ${isElimination ? 'text-red-600' : 'text-indigo-600'}`}>
            {showOperatorSection ? 'Hide' : 'Show operator link'}
          </span>
        </button>

        {showOperatorSection && (
          <div className="border-t border-gray-100 p-4 space-y-4">
            <p className="text-xs text-gray-500">
              Generate a secure operator link for the person hosting the game. They get game controls only — no admin or financial access. Valid for 8 hours.
            </p>

            {tokenLoading && (
              <div className="flex items-center gap-2 py-6 justify-center text-sm text-gray-500">
                <Loader className="h-4 w-4 animate-spin" /> Generating link…
              </div>
            )}

            {tokenError && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600">
                Failed to generate operator link. Please close and try again.
              </div>
            )}

            {operatorUrl && (
              <>
                <div className="flex flex-col items-center gap-2">
                  <div className="rounded-xl border-2 border-indigo-100 bg-white p-4 shadow-sm">
                    <QRCodeSVG value={operatorUrl} size={160} bgColor="#ffffff" fgColor="#3730a3" level="M" />
                  </div>
                  <p className="text-xs text-gray-500 text-center">Scan with the host device — no login required</p>
                </div>

                <div>
                  <div className="flex gap-2">
                    <code className="flex-1 min-w-0 truncate rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 font-mono text-xs text-gray-700">
                      {operatorUrl}
                    </code>
                    <button type="button" onClick={copyLink}
                      className="flex-shrink-0 inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors">
                      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      {copied ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                  <div className="mt-1.5 flex justify-end">
                    <a href={operatorUrl} target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-800">
                      <ExternalLink className="h-3 w-3" /> Test link
                    </a>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}