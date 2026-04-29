// src/components/Quiz/modals/LaunchQuizModal.tsx
//
// Drop-in modal that replaces the direct onOpenRoom() call on the "Start Quiz" button.
//
// USAGE in QuizEventCard:
//   1. Add state:  const [launchModalOpen, setLaunchModalOpen] = useState(false);
//   2. Change both Start Quiz buttons (table + card view) from:
//        onClick={() => onOpenRoom(room.room_id, room.host_id)}
//      to:
//        onClick={() => setLaunchModalOpen(true)}
//   3. Render at the bottom of the return alongside your other modals:
//        {launchModalOpen && (
//          <LaunchQuizModal
//            roomId={room.room_id}
//            hostId={room.host_id}
//            onLaunchFromHere={() => { setLaunchModalOpen(false); onOpenRoom(room.room_id, room.host_id); }}
//            onClose={() => setLaunchModalOpen(false)}
//          />
//        )}

import { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Copy, Check, ExternalLink, Play, X, AlertTriangle } from 'lucide-react';

interface LaunchQuizModalProps {
  roomId: string;
  hostId: string;
  /** Called after the double-confirm "Launch Now" — do your openRoom() logic here */
  onLaunchFromHere: () => void;
  onClose: () => void;
}

export function LaunchQuizModal({
  roomId,
  hostId,
  onLaunchFromHere,
  onClose,
}: LaunchQuizModalProps) {
  const [copied, setCopied] = useState(false);
  // null = default view, 'confirm' = asking for second confirmation
  const [confirmStep, setConfirmStep] = useState<'idle' | 'confirm'>('idle');

  const origin =
    typeof window !== 'undefined' && window.location?.origin
      ? window.location.origin
      : '';

  // The URL the host device needs — same URL that openRoom() navigates to
  const hostUrl = `${origin}/quiz/host-dashboard/${roomId}?hostId=${encodeURIComponent(hostId)}`;

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(hostUrl);
    } catch {
      // fallback for older browsers / non-HTTPS
      const ta = document.createElement('textarea');
      ta.value = hostUrl;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    // Backdrop
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={(e) => {
        // Close on backdrop click, but NOT if mid-confirm
        if (e.target === e.currentTarget && confirmStep === 'idle') onClose();
      }}
    >
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden">

        {/* ── Header ── */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-white">Launch Quiz</h2>
              <p className="text-indigo-200 text-sm mt-0.5">
                Share the QR code or link with your host device
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-white/20 text-white transition-colors"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">

          {/* ── QR Code ── */}
          <div className="flex flex-col items-center gap-3">
            <div className="p-4 bg-white rounded-xl border-2 border-indigo-100 shadow-sm">
              <QRCodeSVG
                value={hostUrl}
                size={180}
                bgColor="#ffffff"
                fgColor="#3730a3"   // indigo-800 — readable and on-brand
                level="M"
              />
            </div>
            <p className="text-xs text-gray-500 text-center">
              Scan with the host device camera to open the host dashboard
            </p>
          </div>

          {/* ── Shareable link ── */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Host dashboard link
            </label>
            <div className="flex gap-2">
              <code className="flex-1 min-w-0 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 font-mono text-xs text-gray-700 truncate">
                {hostUrl}
              </code>
              <button
                type="button"
                onClick={copyLink}
                className="shrink-0 inline-flex items-center gap-1.5 px-3 py-2.5 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-colors"
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>

            <a
              href={hostUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-flex items-center gap-1.5 text-xs text-indigo-600 hover:text-indigo-800 font-medium"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Open in new tab (host device only)
            </a>
          </div>

          {/* ── Divider ── */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">
              or
            </span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>

          {/* ── Launch from this device — double confirm ── */}
          {confirmStep === 'idle' ? (
            <button
              type="button"
              onClick={() => setConfirmStep('confirm')}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-gray-300 bg-white text-gray-700 text-sm font-medium hover:bg-gray-50 transition-colors"
            >
              <Play className="h-4 w-4 text-gray-500" />
              Launch from this device instead
            </button>
          ) : (
            // Confirmation step — slightly alarming so the host doesn't do it by accident
            <div className="rounded-xl border-2 border-orange-300 bg-orange-50 p-4 space-y-3">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-orange-500 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-orange-900">
                    Launch from this device?
                  </p>
                  <p className="text-xs text-orange-700 mt-1">
                    This will open the host dashboard in a new tab on{' '}
                    <strong>this device</strong>. Only do this if you are the
                    host — players are watching!
                  </p>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setConfirmStep('idle')}
                  className="flex-1 px-3 py-2 rounded-lg border border-orange-300 bg-white text-orange-700 text-sm font-medium hover:bg-orange-50 transition-colors"
                >
                  Go back
                </button>
                <button
                  type="button"
                  onClick={onLaunchFromHere}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-orange-600 text-white text-sm font-bold hover:bg-orange-700 transition-colors"
                >
                  <Play className="h-4 w-4" />
                  Launch now
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}