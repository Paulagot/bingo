// src/components/Quiz/payments/ReconciliationDownloads.tsx
import { useEffect, useMemo, useState } from 'react';
import { Download, CheckCircle } from 'lucide-react';
import { useParams } from 'react-router-dom';

import { useQuizConfig } from '../hooks/useQuizConfig';
import { usePlayerStore } from '../hooks/usePlayerStore';
import { useQuizSocket } from '../sockets/QuizSocketProvider';

import { makeArchiveZip } from './reportExport';

type Props = {
  allRoundsStats?: any[];
  // 🔴 REMOVED: onArchiveComplete - we'll use socket cleanup instead
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
  
  // 🆕 NEW: Track successful archive generation and countdown
  const [archiveComplete, setArchiveComplete] = useState(false);
  const [countdown, setCountdown] = useState(10); // 10 second countdown

  const payload = useMemo(
    () => ({ config, players, allRoundsStats }),
    [config, players, allRoundsStats]
  );

  // 🆕 NEW: Auto-cleanup countdown after archive generation
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
  }, [archiveComplete]);

  // 🆕 NEW: Unified cleanup function using socket
  const handleEndQuiz = () => {
    console.log('🧹 [Reconciliation] Triggering quiz cleanup...');
    
    if (!socket || !roomId) {
      console.warn('⚠️ [Reconciliation] No socket or roomId available');
      // Fallback: just navigate
      window.location.href = '/';
      return;
    }

    try {
      // Use the same cleanup event as Web3 flow
      // Backend will detect this is NOT a Web3 room and redirect accordingly
      socket.emit('end_quiz_cleanup', { roomId });
      console.log('✅ [Reconciliation] Cleanup signal sent');
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
      
      // Stamp archiveGeneratedAt for audit trail
      if (socket && roomId) {
        const ts = new Date().toISOString();
        socket.emit('update_reconciliation', {
          roomId,
          patch: { archiveGeneratedAt: ts },
        });
      }
      
      // 🆕 NEW: Mark as complete and start countdown
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
    <div className="rounded-xl border-2 border-emerald-200 bg-white p-4">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-lg font-semibold">Downloads</h3>
        <div className="text-xs text-fg/70">
          {disabled ? 'Exports unlock after approval' : 'Ready'}
        </div>
      </div>

      {/* 🆕 UPDATED: Download button */}
      {!archiveComplete ? (
        <div className="flex flex-wrap gap-3">
          <button
            disabled={disabled || busy !== 'none'}
            onClick={handleArchive}
            className="flex items-center space-x-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-40"
          >
            <Download className="h-4 w-4" />
            <span>
              {busy === 'zip' ? 'Generating Archive…' : 'Download Archive & End Quiz'}
            </span>
          </button>
        </div>
      ) : (
        /* 🆕 NEW: Success state with auto-cleanup countdown */
        <div className="space-y-3">
          {/* Success message */}
          <div className="flex items-center space-x-2 rounded-lg border-2 border-green-200 bg-green-50 p-3">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <span className="text-sm font-medium text-green-800">
              Archive downloaded successfully!
            </span>
          </div>

          {/* Countdown bar */}
          <div className="rounded-lg border-2 border-blue-200 bg-blue-50 p-4">
            <div className="mb-3 text-center">
              <div className="text-2xl font-bold text-blue-800">
                {countdown}
              </div>
              <p className="text-sm text-blue-600">
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
              className="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
            >
              End Quiz Now
            </button>
          </div>
        </div>
      )}

      {/* Optional: Info text */}
      <p className="mt-2 text-xs text-gray-500">
        After downloading, the quiz will automatically end and clean up all data.
      </p>
    </div>
  );
}


