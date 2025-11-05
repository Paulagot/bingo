// src/components/Quiz/payments/ReconciliationApproval.tsx
import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuizSocket } from '../sockets/QuizSocketProvider';
import { useQuizConfig } from '../hooks/useQuizConfig';
import { CheckCircle2, Clock, AlertCircle } from 'lucide-react';

type Props = { compact?: boolean };

export default function ReconciliationApproval({ compact = false }: Props) {
  const { roomId } = useParams();
  const { socket } = useQuizSocket();
  const { config } = useQuizConfig();

  const rec = (config?.reconciliation as any) || {};
  const [approvedBy, setApprovedBy] = useState(rec.approvedBy || '');
  const [notes, setNotes] = useState(rec.notes || '');
  const [approvedAt, setApprovedAt] = useState<string | null>(rec.approvedAt || null);

  useEffect(() => {
    setApprovedBy(rec.approvedBy || '');
    setNotes(rec.notes || '');
    setApprovedAt(rec.approvedAt || null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config?.reconciliation]);

  const queue = useRef<number | null>(null);
  const save = (patch: any) => {
    if (!socket || !roomId) return;
    if (queue.current) window.clearTimeout(queue.current);
    queue.current = window.setTimeout(() => {
      socket.emit('update_reconciliation', { roomId, patch });
    }, 300);
  };

  const onApprove = () => {
    const ts = new Date().toISOString();
    setApprovedAt(ts);
    save({ approvedAt: ts, approvedBy });
  };

  const isApproved = !!approvedAt;
  const canApprove = !isApproved && approvedBy.trim().length > 0;

  return (
    <div className="rounded-lg border-2 border-indigo-200 bg-white p-4 shadow-sm">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isApproved ? (
            <CheckCircle2 className="h-5 w-5 text-green-600" />
          ) : (
            <Clock className="h-5 w-5 text-yellow-600" />
          )}
          <h3 className="text-lg font-semibold text-gray-900">Approval</h3>
        </div>
        {isApproved ? (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-green-300 bg-green-100 px-3 py-1 text-xs font-semibold text-green-800">
            <CheckCircle2 className="h-3 w-3" />
            Approved
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-yellow-300 bg-yellow-100 px-3 py-1 text-xs font-semibold text-yellow-800">
            <Clock className="h-3 w-3" />
            Pending
          </span>
        )}
      </div>

      <div className={`grid ${compact ? 'grid-cols-1' : 'grid-cols-1'} gap-4`}>
        {/* Approved By Field */}
        <div>
          <label className="mb-1.5 block text-xs font-semibold text-gray-700 uppercase tracking-wider">
            Approved By
          </label>
          <input
            className="w-full rounded-lg border-2 border-gray-300 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 disabled:bg-gray-100 disabled:cursor-not-allowed transition-all"
            value={approvedBy}
            disabled={isApproved}
            onChange={(e) => {
              setApprovedBy(e.target.value);
              save({ approvedBy: e.target.value });
            }}
            placeholder="Enter your name or role..."
          />
          
          {/* Approve Button */}
          {!isApproved && (
            <div className="mt-3">
              <button
                onClick={onApprove}
                disabled={!canApprove}
                className={`w-full rounded-lg px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all inline-flex items-center justify-center gap-2 ${
                  canApprove
                    ? 'bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800'
                    : 'bg-gray-400 cursor-not-allowed opacity-50'
                }`}
                title={!canApprove ? 'Enter your name first' : 'Mark as approved'}
              >
                <CheckCircle2 className="h-4 w-4" />
                Mark as Approved
              </button>
              {!canApprove && approvedBy.trim().length === 0 && (
                <div className="mt-2 flex items-start gap-1.5 text-xs text-amber-700">
                  <AlertCircle className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                  <span>Enter your name above to enable approval</span>
                </div>
              )}
            </div>
          )}

          {/* Approval Timestamp */}
          {isApproved && approvedAt && (
            <div className="mt-2 text-xs text-gray-600">
              <span className="font-medium">Approved on:</span>{' '}
              {new Date(approvedAt).toLocaleString()}
            </div>
          )}
        </div>

        {/* Notes Field */}
        <div>
          <label className="mb-1.5 block text-xs font-semibold text-gray-700 uppercase tracking-wider">
            Comments / Notes
          </label>
          <textarea
            rows={compact ? 2 : 3}
            className="w-full rounded-lg border-2 border-gray-300 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 disabled:bg-gray-100 disabled:cursor-not-allowed transition-all resize-none"
            disabled={isApproved}
            value={notes}
            onChange={(e) => {
              setNotes(e.target.value);
              save({ notes: e.target.value });
            }}
            placeholder="Discrepancies, explanations, sign-off notes…"
          />
        </div>
      </div>
    </div>
  );
}
