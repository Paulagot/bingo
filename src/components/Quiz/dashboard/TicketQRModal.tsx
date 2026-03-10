// src/components/Quiz/dashboard/TicketQRModal.tsx
import React from 'react';
import { X, QrCode } from 'lucide-react';
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
  const ticketUrl = `${window.location.origin}/tickets/status/${ticketId}`;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black bg-opacity-60 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-xs p-6 flex flex-col items-center gap-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="w-full flex items-center justify-between">
          <div className="flex items-center gap-2 text-gray-800">
            <QrCode className="h-5 w-5 text-indigo-600" />
            <span className="font-semibold text-sm">Ticket QR Code</span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X className="h-4 w-4 text-gray-500" />
          </button>
        </div>

        {/* Player info */}
        <div className="text-center">
          <p className="text-base font-bold text-gray-900">{playerName}</p>
          <p className="text-xs text-gray-500 mt-0.5">Purchased by {purchaserName}</p>
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

        {/* Ticket ID */}
        <div className="text-center w-full">
          <p className="text-xs text-gray-400 mb-1">Ticket ID</p>
          <code className="text-xs bg-gray-100 px-3 py-1.5 rounded-lg font-mono text-gray-700 block truncate">
            {ticketId}
          </code>
        </div>

        {/* Instruction */}
        <p className="text-xs text-center text-gray-500 leading-relaxed">
          Ask the player to scan this code to view their ticket status
        </p>

        <button
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