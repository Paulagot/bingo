// src/components/Quiz/payments/ReconciliationDownloads.tsx
import { useEffect, useMemo, useState } from 'react';
import { Download, CheckCircle, AlertTriangle, Clock } from 'lucide-react';
import { useParams } from 'react-router-dom';

import { useQuizConfig } from '../hooks/useQuizConfig';
import { usePlayerStore } from '../hooks/usePlayerStore';
import { useQuizSocket } from '../sockets/QuizSocketProvider';

import { makeArchiveZip } from './reportExport';
import { cleanupQuizRoom } from '../utils/cleanupQuizRoom';

type Props = {
  allRoundsStats?: any[];
};

export default function ReconciliationDownloads({
  allRoundsStats = [],
}: Props) {
  const { config } = useQuizConfig();
  const { players } = usePlayerStore();
  const approvedAt = (config?.reconciliation as any)?.approvedAt;
  const disabled = !approvedAt;

  const { socket } = useQuizSocket();
  const { roomId } = useParams();

  const [busy, setBusy] = useState<'none' | 'zip'>('none');
  
  // Track successful archive generation and countdown
  const [archiveComplete, setArchiveComplete] = useState(false);
  const [countdown, setCountdown] = useState(10); // 10 second countdown

  const payload = useMemo(
    () => ({ config, players, allRoundsStats }),
    [config, players, allRoundsStats]
  );

  // Auto-cleanup countdown after archive generation
  useEffect(() => {
    if (!archiveComplete) return;

    // Start countdown
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          // Countdown finished, trigger cleanup
          clearInterval(timer);
          handleEndQuiz();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [archiveComplete]);

  // Unified cleanup function using socket
const handleEndQuiz = async () => {
  console.log('🧹 [Reconciliation] Triggering quiz cleanup...');
  
  if (!roomId) {
    console.warn('⚠️ [Reconciliation] No roomId available');
    window.location.href = '/';
    return;
  }

  try {
    // 1. Clean up client-side (localStorage, no wallet disconnect for web2)
    await cleanupQuizRoom({
      roomId,
      isWeb3Game: false,
      disconnectWallets: false,
    });
    console.log('✅ [Reconciliation] Client-side cleanup complete');

    // 2. Notify server to clean up room
    if (socket) {
      socket.emit('end_quiz_cleanup', { roomId });
      console.log('✅ [Reconciliation] Cleanup signal sent to server');
    }

    // 3. Navigate away
    setTimeout(() => {
      window.location.href = '/';
    }, 1000);

  } catch (error) {
    console.error('❌ [Reconciliation] Error during cleanup:', error);
    // Fallback navigation
    window.location.href = '/';
  }
};

  // Generate archive and trigger auto-cleanup
  const handleArchive = async () => {
    if (disabled || busy !== 'none') return;

    setBusy('zip');
    try {
      // Generate and download archive
      await makeArchiveZip(payload);
      
      // Stamp archiveGeneratedAt for audit trail (prevents auto-cleanup guard from triggering)
      if (socket && roomId) {
        const ts = new Date().toISOString();
        socket.emit('update_reconciliation', {
          roomId,
          patch: { archiveGeneratedAt: ts },
        });
      }
      
      // Mark as complete and start countdown
      setArchiveComplete(true);
      setCountdown(10); // Reset countdown
      
      console.log('✅ [Reconciliation] Archive generated, starting auto-cleanup countdown...');
    } catch (e) {
      console.error('❌ [Reconciliation] Archive generation failed:', e);
      alert('Failed to generate archive. Please try again.');
    } finally {
      setBusy('none');
    }
  };

  return (
    <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
      <div className="p-4 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold text-gray-900">Download & Complete</h3>
            <p className="text-xs text-gray-600 mt-0.5">
              {disabled ? 'Approve reconciliation to unlock downloads' : 'Download your complete quiz archive'}
            </p>
          </div>
          {!disabled && !archiveComplete && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-green-300 bg-green-100 px-3 py-1 text-xs font-semibold text-green-800">
              <CheckCircle className="h-3 w-3" />
              Ready
            </span>
          )}
        </div>
      </div>

      <div className="p-4">
        {/* Download button (pre-archive) */}
        {!archiveComplete ? (
          <div className="space-y-3">
            <button
              disabled={disabled || busy !== 'none'}
              onClick={handleArchive}
              className="w-full flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
            >
              <Download className="h-4 w-4" />
              <span>
                {busy === 'zip' ? 'Generating Archive…' : 'Download Archive & End Quiz'}
              </span>
            </button>

            {/* Info about what's included */}
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 space-y-2">
              <div className="text-xs font-semibold text-gray-700">Archive includes:</div>
              <ul className="text-xs text-gray-600 space-y-1">
                <li>• Complete financial reconciliation report</li>
                <li>• Player roster and payment records</li>
                <li>• Game statistics and results</li>
                <li>• Audit trail of all adjustments</li>
              </ul>
            </div>

            {/* Warning about what happens */}
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
              <div className="flex gap-2 text-xs text-amber-900">
                <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                <div>
                  <strong>This will end your quiz:</strong> After downloading, the quiz will automatically 
                  clean up and all participants will be disconnected. Make sure you've completed everything first.
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Success state with auto-cleanup countdown */
          <div className="space-y-3">
            {/* Success message */}
            <div className="flex items-center gap-2 rounded-lg border-2 border-green-200 bg-green-50 p-4">
              <CheckCircle className="h-6 w-6 text-green-600 flex-shrink-0" />
              <div className="flex-1">
                <div className="text-sm font-semibold text-green-800">
                  Archive downloaded successfully!
                </div>
                <div className="text-xs text-green-700 mt-1">
                  Your quiz data has been saved locally
                </div>
              </div>
            </div>

            {/* Countdown bar */}
            <div className="rounded-lg border-2 border-blue-200 bg-blue-50 p-4">
              <div className="mb-3 text-center">
                <div className="flex items-center justify-center gap-2 mb-1">
                  <Clock className="h-5 w-5 text-blue-600" />
                  <div className="text-3xl font-bold text-blue-800">
                    {countdown}
                  </div>
                </div>
                <p className="text-sm text-blue-700 font-medium">
                  Cleaning up and returning to dashboard...
                </p>
              </div>

              {/* Progress bar */}
              <div className="mb-3 h-2 overflow-hidden rounded-full bg-blue-200">
                <div
                  className="h-full bg-blue-600 transition-all duration-1000 ease-linear"
                  style={{ width: `${(countdown / 10) * 100}%` }}
                />
              </div>

              {/* Manual trigger option */}
              <button
                onClick={handleEndQuiz}
                className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 active:bg-blue-800 shadow-sm"
              >
                End Quiz Now
              </button>
            </div>

            {/* What happens next */}
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
              <div className="text-xs text-gray-600 space-y-1">
                <p><strong>What's happening:</strong></p>
                <p>• All quiz data will be removed from our servers</p>
                <p>• All participants will be disconnected</p>
                <p>• You'll be redirected to the dashboard</p>
                <p>• Your downloaded archive contains all records</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}


