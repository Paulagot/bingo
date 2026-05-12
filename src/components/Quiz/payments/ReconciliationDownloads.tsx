// src/components/Quiz/payments/ReconciliationDownloads.tsx
import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { CheckCircle2, AlertTriangle, Loader } from 'lucide-react';

import { useQuizConfig } from '../hooks/useQuizConfig';
import { useQuizSocket } from '../sockets/QuizSocketProvider';
import { cleanupQuizRoom } from '../utils/cleanupQuizRoom';

type Props = {
  allRoundsStats?: any[];
};

export default function ReconciliationDownloads({ allRoundsStats = [] }: Props) {
  const { config } = useQuizConfig();
  const { socket } = useQuizSocket();
  const { roomId } = useParams();
  const navigate = useNavigate();

  const approvedAt = (config?.reconciliation as any)?.approvedAt;
  const disabled   = !approvedAt;

  const [busy,          setBusy]          = useState(false);
  const [confirmOpen,   setConfirmOpen]   = useState(false);
  const [error,         setError]         = useState<string | null>(null);

  const handleComplete = async () => {
    if (!roomId) return;
    setBusy(true);
    setError(null);

    try {
      // 1. Clean up client-side localStorage and Zustand stores
      await cleanupQuizRoom({
        roomId,
        isWeb3Game: false,
        disconnectWallets: false,
      });
      console.log('✅ [Complete] Client cleanup done');

      // 2. Tell server to clean up room, disconnect all sockets
      if (socket) {
        socket.emit('end_quiz_cleanup', { roomId });
        console.log('✅ [Complete] end_quiz_cleanup emitted');
      }

      // 3. Navigate host to event dashboard
      setTimeout(() => {
        navigate('/quiz/eventdashboard');
      }, 1500);

    } catch (err) {
      console.error('❌ [Complete] Error during cleanup:', err);
      setError('Something went wrong during cleanup. Please try again.');
      setBusy(false);
    }
  };

  return (
    <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
      <div className="p-4 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold text-gray-900">Complete & End Quiz</h3>
            <p className="text-xs text-gray-600 mt-0.5">
              {disabled
                ? 'Approve reconciliation first to unlock this step'
                : 'End the quiz session and return to your dashboard'}
            </p>
          </div>
          {!disabled && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-green-300 bg-green-100 px-3 py-1 text-xs font-semibold text-green-800">
              <CheckCircle2 className="h-3 w-3" />
              Ready
            </span>
          )}
        </div>
      </div>

      <div className="p-4 space-y-3">
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5 shrink-0" />
            <span className="text-sm text-red-800">{error}</span>
          </div>
        )}

        {!confirmOpen ? (
          <>
            <button
              disabled={disabled || busy}
              onClick={() => setConfirmOpen(true)}
              className="w-full flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
            >
              <CheckCircle2 className="h-4 w-4" />
              Complete & End Quiz
            </button>

            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
              <div className="flex gap-2 text-xs text-amber-900">
                <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                <div>
                  <strong>This will end your quiz session.</strong> All players
                  and admins will be disconnected and you will be returned to
                  your event dashboard.
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="rounded-xl border-2 border-emerald-200 bg-emerald-50 p-4 space-y-3">
            <p className="text-sm font-semibold text-emerald-900 text-center">
              Are you sure? This cannot be undone.
            </p>
            <p className="text-xs text-emerald-700 text-center">
              All players and admins will be disconnected immediately.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setConfirmOpen(false)}
                disabled={busy}
                className="flex-1 rounded-lg border-2 border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-40"
              >
                Cancel
              </button>
              <button
                onClick={handleComplete}
                disabled={busy}
                className="flex-1 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-40 flex items-center justify-center gap-2"
              >
                {busy ? (
                  <>
                    <Loader className="h-4 w-4 animate-spin" />
                    Ending…
                  </>
                ) : (
                  'Yes, End Quiz'
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}


