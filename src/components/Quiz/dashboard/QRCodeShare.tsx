// src/components/Quiz/dashboard/QRCodeShare.tsx
import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Copy, Check, QrCode, ExternalLink, Users } from 'lucide-react';

interface QRCodeShareProps {
  roomId: string;
 hostName?: string | undefined;  // ✅ Explicitly add | undefined
  gameType?: string | undefined
}

const QRCodeShare: React.FC<QRCodeShareProps> = ({ roomId, hostName, gameType }) => {
  const [copied, setCopied] = useState(false);

  // Get the base URL dynamically
  const getBaseUrl = () => {
    if (typeof window !== 'undefined') {
      return `${window.location.protocol}//${window.location.host}`;
    }
    return 'https://fundraisely.ie'; // Fallback
  };

  const joinUrl = `${getBaseUrl()}/quiz/join/${roomId}`;

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(joinUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = joinUrl;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="rounded-xl border-2 border-indigo-200 bg-gradient-to-r from-indigo-50 to-purple-50 p-6">
      <div className="mb-4 flex items-center space-x-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-600">
          <QrCode className="h-5 w-5 text-white" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-indigo-800">
            Share Your {gameType || 'Quiz'} Room
          </h3>
          <p className="text-sm text-indigo-600">
            Players can scan this QR code or use the link to join instantly
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* QR Code Section */}
        <div className="text-center">
          <div className="mb-4">
            <h4 className="mb-2 text-sm font-medium text-gray-700">Scan to Join</h4>
            <div className="mx-auto inline-block rounded-lg bg-white p-4 shadow-md">
              <QRCodeSVG
                value={joinUrl}
                size={200}
                bgColor="#ffffff"
                fgColor="#1F2937"
                level="M"
              />
            </div>
          </div>
          
          <div className="space-y-2 text-sm text-gray-600">
            <div className="flex items-center justify-center space-x-2">
              <Users className="h-4 w-4" />
              <span>Works with any smartphone camera app</span>
            </div>
           
          </div>
        </div>

        {/* Link Section */}
        <div className="space-y-4">
          <div>
            <h4 className="mb-2 text-sm font-medium text-gray-700">Direct Link</h4>
            <div className="rounded-lg border border-gray-200 bg-white p-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-medium text-gray-500">Room ID</span>
                <span className="rounded bg-gray-100 px-2 py-1 font-mono text-sm text-gray-700">
                  {roomId}
                </span>
              </div>
              <div className="break-all text-sm text-gray-600">
                {joinUrl}
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <button
              onClick={copyToClipboard}
              className={`flex w-full items-center justify-center space-x-2 rounded-lg px-4 py-3 text-sm font-medium transition-all ${
                copied
                  ? 'bg-green-100 text-green-700'
                  : 'bg-indigo-600 text-white hover:bg-indigo-700'
              }`}
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4" />
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  <span>Copy Link</span>
                </>
              )}
            </button>

            <a
              href={joinUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex w-full items-center justify-center space-x-2 rounded-lg bg-gray-100 px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-200"
            >
              <ExternalLink className="h-4 w-4" />
              <span>Test Link</span>
            </a>
          </div>

          {hostName && (
            <div className="rounded-lg bg-blue-50 p-3">
              <div className="text-xs text-blue-600">
                <strong>Share message:</strong>
              </div>
              <div className="mt-1 text-sm text-blue-800">
                "Join {hostName}'s {gameType || 'quiz'} game! Scan the QR code or click: {joinUrl}"
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Mobile-specific instructions */}
      <div className="mt-6 rounded-lg border border-amber-200 bg-amber-50 p-3">
        <div className="flex items-start space-x-2">
          <div className="text-amber-600">💡</div>
          <div className="text-xs text-amber-800">
            <strong>Pro tip:</strong> Players can scan with their phone's camera app or share the link via WhatsApp, text, or social media. No app download required!
          </div>
        </div>
      </div>
    </div>
  );
};

export default QRCodeShare;