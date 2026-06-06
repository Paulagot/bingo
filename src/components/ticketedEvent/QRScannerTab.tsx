// src/components/ticketedEvent/QRScannerTab.tsx
//
// Camera QR scanner for the check-in dashboard.
// Uses html5-qrcode for camera access, falls back to manual token entry.

import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import {
  ScanLine, CheckCircle2, XCircle, AlertTriangle,
  Loader2, CameraOff, Camera,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ScanResult {
  ok:            boolean;
  alreadyUsed?:  boolean;
  error?:        string;
  message:       string;
  purchaserName?: string;
  playerName?:    string;
  redeemedAt?:    string;
}

interface Props {
  roomId:   string;
  token:    string | null;
}

function getAuthHeaders(token?: string | null): Record<string, string> {
  const stored = typeof localStorage !== 'undefined' ? localStorage.getItem('auth_token') : null;
  const bearer = token || stored;
  return {
    'Content-Type': 'application/json',
    ...(bearer ? { Authorization: `Bearer ${bearer}` } : {}),
  };
}

// ─── Result banner ────────────────────────────────────────────────────────────

const ResultBanner: React.FC<{ result: ScanResult; onDismiss: () => void }> = ({ result, onDismiss }) => {
  const isError  = !result.ok;
  const isWarn   = result.ok && result.alreadyUsed;


  const colours = isError
    ? 'border-red-200 bg-red-50'
    : isWarn
      ? 'border-yellow-200 bg-yellow-50'
      : 'border-green-200 bg-green-50';

  const textColour = isError ? 'text-red-800' : isWarn ? 'text-yellow-800' : 'text-green-800';

  const Icon = isError ? XCircle : isWarn ? AlertTriangle : CheckCircle2;
  const iconColour = isError ? 'text-red-500' : isWarn ? 'text-yellow-500' : 'text-green-500';

  return (
    <div className={`rounded-xl border p-4 ${colours}`}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Icon className={`h-8 w-8 flex-shrink-0 ${iconColour}`} />
          <div>
            <p className={`font-bold text-sm ${textColour}`}>{result.message}</p>
            {result.purchaserName && (
              <p className="text-xs text-gray-600 mt-0.5">{result.purchaserName}</p>
            )}
          </div>
        </div>
        <button type="button" onClick={onDismiss} className="text-gray-400 hover:text-gray-600 flex-shrink-0">
          <XCircle className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

// ─── Main component ───────────────────────────────────────────────────────────

const SCANNER_DIV_ID = 'qr-scanner-viewport';

export const QRScannerTab: React.FC<Props> = ({ roomId, token }) => {
  const [cameraActive,  setCameraActive]  = useState(false);
  const [cameraError,   setCameraError]   = useState<string | null>(null);
  const [scanning,      setScanning]      = useState(false);
  const [lastResult,    setLastResult]    = useState<ScanResult | null>(null);
  const [manualToken,   setManualToken]   = useState('');
  const [manualLoading, setManualLoading] = useState(false);

  const scannerRef = useRef<Html5Qrcode | null>(null);
  // Prevent double-scanning the same QR code
  const lastScannedRef = useRef<string>('');

  // ── Submit a joinToken to the backend ──────────────────────────────────────
  const submitToken = async (joinToken: string) => {
    if (!joinToken.trim()) return;
    setScanning(true);
    try {
      const res = await fetch(`/api/ticketed-event/checkin/${roomId}/scan`, {
        method:  'POST',
        headers: getAuthHeaders(token),
        body:    JSON.stringify({ joinToken: joinToken.trim() }),
      });
      const data: ScanResult = await res.json();
      setLastResult(data);
      setManualToken('');
    } catch {
      setLastResult({ ok: false, message: 'Scan failed. Please try again.' });
    } finally {
      setScanning(false);
    }
  };

  // ── Start camera ───────────────────────────────────────────────────────────
  const startCamera = async () => {
    setCameraError(null);
    try {
      const scanner = new Html5Qrcode(SCANNER_DIV_ID);
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: 'environment' },   // rear camera on phones
      { fps: 10, qrbox: { width: 250 as number, height: 250 as number } },
        (decodedText) => {
          // Avoid re-scanning the same code within 3 seconds
          if (decodedText === lastScannedRef.current) return;
          lastScannedRef.current = decodedText;
          setTimeout(() => { lastScannedRef.current = ''; }, 3000);

          // The QR code contains the full checkin URL or just the token
          // Extract the joinToken from the URL if needed
          let joinToken = decodedText;
          try {
            const url = new URL(decodedText);
            const t = url.searchParams.get('token') || url.searchParams.get('joinToken');
            if (t) joinToken = t;
            // Also handle /join/ROOMID?ticket=TOKEN pattern
            const pathParts = url.pathname.split('/');
            const ticketIdx = pathParts.indexOf('ticket');
            if (ticketIdx !== -1 && pathParts[ticketIdx + 1]) {
           joinToken = pathParts[ticketIdx + 1] ?? joinToken;
            }
          } catch {
            // Not a URL — use raw text as the token
          }

          submitToken(joinToken);
        },
        () => { /* ignore per-frame failures */ }
      );

      setCameraActive(true);
    } catch (err: any) {
      const msg = err?.message || '';
      if (msg.includes('Permission') || msg.includes('permission')) {
        setCameraError('Camera permission denied. Please allow camera access and try again.');
      } else if (msg.includes('NotFound') || msg.includes('device')) {
        setCameraError('No camera found on this device.');
      } else {
        setCameraError('Could not start camera. Try manual entry below.');
      }
    }
  };

  // ── Stop camera ────────────────────────────────────────────────────────────
  const stopCamera = async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
        scannerRef.current.clear();
      } catch { /* ignore */ }
      scannerRef.current = null;
    }
    setCameraActive(false);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => { stopCamera(); };
  }, []);

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">

      {/* Last scan result */}
      {lastResult && (
        <ResultBanner result={lastResult} onDismiss={() => setLastResult(null)} />
      )}

      {/* Camera viewport — always in DOM so html5-qrcode can mount into it */}
      <div className="rounded-xl border border-[#dce1df] overflow-hidden bg-black">
        <div id={SCANNER_DIV_ID} className="w-full" style={{ minHeight: cameraActive ? 280 : 0 }} />

        {!cameraActive && (
          <div className="flex flex-col items-center justify-center gap-3 py-10 px-4 text-center">
            {cameraError ? (
              <>
                <CameraOff className="h-10 w-10 text-gray-400" />
                <p className="text-sm text-gray-300">{cameraError}</p>
              </>
            ) : (
              <>
                <ScanLine className="h-10 w-10 text-[#157f85]" />
                <p className="text-sm text-gray-300">Camera is off</p>
              </>
            )}
            <button
              type="button"
              onClick={startCamera}
              className="inline-flex items-center gap-2 rounded-lg bg-[#157f85] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0e6268] transition-colors"
            >
              <Camera className="h-4 w-4" />
              Start camera
            </button>
          </div>
        )}
      </div>

      {/* Stop camera button */}
      {cameraActive && (
        <button
          type="button"
          onClick={stopCamera}
          className="w-full inline-flex items-center justify-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-100 transition-colors"
        >
          <CameraOff className="h-4 w-4" />
          Stop camera
        </button>
      )}

      {/* Manual token entry — always available as fallback */}
      <div className="rounded-xl border border-[#dce1df] bg-white p-4">
        <p className="text-xs font-semibold text-[#52636f] mb-2">Manual entry</p>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Paste ticket token…"
            value={manualToken}
            onChange={e => setManualToken(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && manualToken.trim()) {
                setManualLoading(true);
                submitToken(manualToken).finally(() => setManualLoading(false));
              }
            }}
            className="flex-1 rounded-lg border border-[#dce1df] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#157f85]"
          />
          <button
            type="button"
            onClick={() => {
              setManualLoading(true);
              submitToken(manualToken).finally(() => setManualLoading(false));
            }}
            disabled={!manualToken.trim() || manualLoading || scanning}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#157f85] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0e6268] disabled:opacity-40 transition-colors"
          >
            {manualLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
            Check in
          </button>
        </div>
      </div>

    </div>
  );
};

export default QRScannerTab;