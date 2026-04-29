// src/components/Quiz/dashboard/TicketQRModal.tsx
import React, { useMemo, useState } from 'react';
import { Check, Copy, ExternalLink, QrCode, X } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

interface TicketQRModalProps {
  ticketId: string;
  playerName: string;
  purchaserName: string;
  onClose: () => void;
}

export const TicketQRModal: React.FC<TicketQRModalProps> = ({
  ticketId,
  playerName,
  purchaserName,
  onClose,
}) => {
  const [copied, setCopied] = useState(false);

  const ticketUrl = useMemo(() => {
    return `${window.location.origin}/tickets/status/${ticketId}`;
  }, [ticketId]);

  const copyTicketUrl = async () => {
    try {
      await navigator.clipboard.writeText(ticketUrl);
      setCopied(true);

      window.setTimeout(() => {
        setCopied(false);
      }, 1800);
    } catch (err) {
      console.error('[TicketQRModal] Failed to copy ticket URL:', err);

      // Fallback for older browsers / restricted clipboard permissions
      const textarea = document.createElement('textarea');
      textarea.value = ticketUrl;
      textarea.style.position = 'fixed';
      textarea.style.left = '-9999px';

      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();

      try {
        document.execCommand('copy');
        setCopied(true);

        window.setTimeout(() => {
          setCopied(false);
        }, 1800);
      } catch (fallbackErr) {
        console.error('[TicketQRModal] Fallback copy failed:', fallbackErr);
      } finally {
        document.body.removeChild(textarea);
      }
    }
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black bg-opacity-60 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 flex flex-col items-center gap-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="w-full flex items-center justify-between">
          <div className="flex items-center gap-2 text-gray-800">
            <QrCode className="h-5 w-5 text-indigo-600" />
            <span className="font-semibold text-sm">Ticket QR Code</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
            aria-label="Close ticket QR modal"
          >
            <X className="h-4 w-4 text-gray-500" />
          </button>
        </div>

        {/* Player info */}
        <div className="text-center">
          <p className="text-base font-bold text-gray-900">{playerName}</p>
          <p className="text-xs text-gray-500 mt-0.5">
            Purchased by {purchaserName}
          </p>
        </div>

        {/* QR Code */}
        <div className="p-3 bg-white rounded-xl border-2 border-indigo-100 shadow-inner">
          <QRCodeSVG
            value={ticketUrl}
            size={200}
            bgColor="#ffffff"
            fgColor="#1e1b4b"
            level="M"
            includeMargin={false}
          />
        </div>

        {/* Ticket link */}
        <div className="w-full">
          <p className="text-xs text-gray-400 mb-1 text-center">Ticket Link</p>

          <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 p-2">
            <code className="min-w-0 flex-1 truncate text-xs font-mono text-gray-700">
              {ticketUrl}
            </code>

            <button
              type="button"
              onClick={copyTicketUrl}
              className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors ${
                copied
                  ? 'bg-green-100 text-green-700'
                  : 'bg-indigo-600 text-white hover:bg-indigo-700'
              }`}
              title="Copy ticket link"
            >
              {copied ? (
                <>
                  <Check className="h-3.5 w-3.5" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" />
                  Copy
                </>
              )}
            </button>
          </div>

          <a
            href={ticketUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-flex w-full items-center justify-center gap-1.5 text-xs font-medium text-indigo-700 hover:text-indigo-900"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Open ticket page
          </a>
        </div>

        {/* Ticket ID */}
        <div className="text-center w-full">
          <p className="text-xs text-gray-400 mb-1">Ticket ID</p>
          <code className="text-xs bg-gray-100 px-3 py-1.5 rounded-lg font-mono text-gray-700 block truncate">
            {ticketId}
          </code>
        </div>

        {/* Instruction */}
        <p className="text-xs text-center text-gray-500 leading-relaxed">
          Ask the player to scan the QR code or send them the copied ticket link.
        </p>

        <button
          type="button"
          onClick={onClose}
          className="w-full py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
        >
          Done
        </button>
      </div>
    </div>
  );
};

export default TicketQRModal;