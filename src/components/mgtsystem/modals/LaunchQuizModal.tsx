// src/components/mgtsystem/modals/LaunchQuizModal.tsx
import { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Copy, Check, ExternalLink, Play, X, AlertTriangle, Loader } from 'lucide-react';

interface LaunchQuizModalProps {
  roomId: string;
  hostId: string;
  /** Called after the double-confirm — organiser opens host dashboard on this device */
  onLaunchFromHere: () => void;
  onClose: () => void;
}

// Mirror BaseService's URL logic exactly.
// In prod the empty string makes it a relative URL the server handles.
// In dev we point directly at Express on 3001 (same as BaseService does for /api).
// Note: BaseService uses /api — this endpoint lives under /quiz/api which is a
// different mount point, so we build the full path ourselves.
const QUIZ_API_BASE = import.meta.env.PROD
  ? ''
  : 'http://localhost:3001';

// Read token exactly as BaseService does
function getAuthToken(): string {
  return localStorage.getItem('auth_token') ?? '';
}

export function LaunchQuizModal({
  roomId,
  onLaunchFromHere,
  onClose,
}: LaunchQuizModalProps) {
  const [copied, setCopied] = useState(false);
  const [confirmStep, setConfirmStep] = useState<'idle' | 'confirm'>('idle');
  const [operatorUrl, setOperatorUrl] = useState<string | null>(null);
  const [tokenError, setTokenError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function fetchOperatorToken() {
      try {
        const token = getAuthToken();

        const res = await fetch(
          `${QUIZ_API_BASE}/quiz/api/web2/rooms/${roomId}/operator-token`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(token && { Authorization: `Bearer ${token}` }),
            },
          }
        );

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.message || errData.error || `status ${res.status}`);
        }

        const data = await res.json();
        if (!cancelled) setOperatorUrl(data.operatorUrl);
      } catch (err) {
        console.error('[LaunchQuizModal] Failed to fetch operator token:', err);
        if (!cancelled) setTokenError(true);
      }
    }

    fetchOperatorToken();
    return () => { cancelled = true; };
  }, [roomId]);

  const copyLink = async () => {
    if (!operatorUrl) return;
    try {
      await navigator.clipboard.writeText(operatorUrl);
    } catch {
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

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget && confirmStep === 'idle') onClose();
      }}
    >
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-white">Launch Quiz</h2>
              <p className="text-indigo-200 text-sm mt-0.5">
                Share with the person hosting the game
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

          {/* QR Code */}
          <div className="flex flex-col items-center gap-3">
            {!operatorUrl && !tokenError && (
              <div className="flex items-center gap-2 text-sm text-gray-500 py-8">
                <Loader className="h-4 w-4 animate-spin" />
                Generating operator link...
              </div>
            )}
            {tokenError && (
              <div className="text-sm text-red-600 text-center py-4">
                Failed to generate operator link. Please close and try again.
              </div>
            )}
            {operatorUrl && (
              <>
                <div className="p-4 bg-white rounded-xl border-2 border-purple-100 shadow-sm">
                  <QRCodeSVG
                    value={operatorUrl}
                    size={180}
                    bgColor="#ffffff"
                    fgColor="#4c1d95"
                    level="M"
                  />
                </div>
                <p className="text-xs text-gray-500 text-center">
                  Scan with the host device — no login required
                </p>
              </>
            )}
          </div>

          {/* Shareable link */}
          {operatorUrl && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Operator link (share this)
              </label>
              <div className="flex gap-2">
                <code className="flex-1 min-w-0 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 font-mono text-xs text-gray-700 truncate">
                  {operatorUrl}
                </code>
                <button
                  type="button"
                  onClick={copyLink}
                  className="shrink-0 inline-flex items-center gap-1.5 px-3 py-2.5 rounded-lg bg-purple-600 text-white text-sm font-semibold hover:bg-purple-700 transition-colors"
                >
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  {copied ? 'Copied' : 'Copy'}
                </button>
              </div>
              <div className="mt-2 flex items-center justify-between">
                <p className="text-xs text-gray-400">
                  Valid for 8 hours · game controls only, no admin access
                </p>
                <a
                  href={operatorUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-purple-600 hover:text-purple-800 font-medium"
                >
                  <ExternalLink className="h-3 w-3" />
                  Test link
                </a>
              </div>
            </div>
          )}

          {/* Divider */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">or</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>

          {/* Launch from this device — organiser only, double confirm */}
          {confirmStep === 'idle' ? (
            <button
              type="button"
              onClick={() => setConfirmStep('confirm')}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-gray-300 bg-white text-gray-700 text-sm font-medium hover:bg-gray-50 transition-colors"
            >
              <Play className="h-4 w-4 text-gray-500" />
              You're hosting — open dashboard on this device
            </button>
          ) : (
            <div className="rounded-xl border-2 border-orange-300 bg-orange-50 p-4 space-y-3">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-orange-500 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-orange-900">Open on this device?</p>
                  <p className="text-xs text-orange-700 mt-1">
                    This opens the full host dashboard here. Use the link above if someone else is running the game.
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
                  Open dashboard
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}