// src/components/mgtsystem/components/drawer/QuizEventDrawer/panels/LaunchPanel.tsx
import { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Copy, Check, ExternalLink, Play, AlertTriangle, Loader } from 'lucide-react';

const QUIZ_API_BASE = import.meta.env.PROD ? '' : 'http://localhost:3001';

function getAuthToken(): string {
  return localStorage.getItem('auth_token') ?? '';
}

interface LaunchPanelProps {
  roomId: string;
  hostId: string;
  onLaunchFromHere: () => void;
  onClose: () => void;
}

export default function LaunchPanel({
  roomId,
  onLaunchFromHere,
  onClose,
}: LaunchPanelProps) {
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
        console.error('[LaunchPanel] Failed to fetch operator token:', err);
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
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-5 space-y-6">

        {/* QR Code */}
        <div className="flex flex-col items-center gap-3">
          {!operatorUrl && !tokenError && (
            <div className="flex items-center gap-2 py-10 text-sm text-gray-500">
              <Loader className="h-4 w-4 animate-spin" />
              Generating operator link…
            </div>
          )}
          {tokenError && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600 text-center w-full">
              Failed to generate operator link. Please close and try again.
            </div>
          )}
          {operatorUrl && (
            <>
              <div className="rounded-xl border-2 border-indigo-100 bg-white p-4 shadow-sm">
                <QRCodeSVG
                  value={operatorUrl}
                  size={180}
                  bgColor="#ffffff"
                  fgColor="#3730a3"
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
            <label className="mb-2 block text-sm font-semibold text-gray-700">
              Operator link
            </label>
            <div className="flex gap-2">
              <code className="flex-1 min-w-0 truncate rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 font-mono text-xs text-gray-700">
                {operatorUrl}
              </code>
              <button
                type="button"
                onClick={copyLink}
                className="flex-shrink-0 inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors"
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
            <div className="mt-2 flex items-center justify-between">
              <p className="text-xs text-gray-400">
                Valid for 8 hours · game controls only
              </p>
              <a
                href={operatorUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-800"
              >
                <ExternalLink className="h-3 w-3" />
                Test link
              </a>
            </div>
          </div>
        )}

        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-gray-200" />
          <span className="text-xs font-medium uppercase tracking-wide text-gray-400">or</span>
          <div className="flex-1 h-px bg-gray-200" />
        </div>

        {/* Launch from this device */}
        {confirmStep === 'idle' ? (
          <button
            type="button"
            onClick={() => setConfirmStep('confirm')}
            className="w-full inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <Play className="h-4 w-4 text-gray-500" />
            You're hosting — open dashboard on this device
          </button>
        ) : (
          <div className="rounded-xl border-2 border-orange-300 bg-orange-50 p-4 space-y-3">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-orange-500 mt-0.5 flex-shrink-0" />
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
                className="flex-1 rounded-lg border border-orange-300 bg-white px-3 py-2 text-sm font-medium text-orange-700 hover:bg-orange-50 transition-colors"
              >
                Go back
              </button>
              <button
                type="button"
                onClick={onLaunchFromHere}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-orange-600 px-3 py-2 text-sm font-bold text-white hover:bg-orange-700 transition-colors"
              >
                <Play className="h-4 w-4" />
                Open dashboard
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}