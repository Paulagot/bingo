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
    <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 bg-gray-50">
       
      </div>
        {/* Notes Field */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-gray-700 uppercase tracking-wider">
              Comments / Notes (Optional)
            </label>
            <textarea
              rows={compact ? 2 : 4}
              className="w-full rounded-lg border-2 border-gray-300 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 disabled:bg-gray-100 disabled:cursor-not-allowed transition-all resize-none"
              disabled={isApproved}
              value={notes}
              onChange={(e) => {
                setNotes(e.target.value);
                save({ notes: e.target.value });
              }}
              placeholder="Any discrepancies, explanations, or final notes..."
            />
            {isApproved && (
              <p className="mt-1.5 text-xs text-gray-500 italic">
                Approval is final - edits are locked
              </p>
            )}
          </div>

           <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isApproved ? (
              <CheckCircle2 className="h-5 w-5 text-green-600" />
            ) : (
              <Clock className="h-5 w-5 text-amber-600" />
            )}
            <div>
              <h3 className="text-base font-semibold text-gray-900">Approval & Sign-Off</h3>
              <p className="text-xs text-gray-600 mt-0.5">Confirm all amounts are correct and finalize</p>
            </div>
          </div>
          {isApproved ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-green-300 bg-green-100 px-3 py-1 text-xs font-semibold text-green-800">
              <CheckCircle2 className="h-3 w-3" />
              Approved
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-300 bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">
              <Clock className="h-3 w-3" />
              Pending
            </span>
          )}
        </div>

      <div className="p-4">
        <div className={`grid ${compact ? 'grid-cols-1' : 'grid-cols-1'} gap-4`}>
          {/* Approved By Field */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-gray-700 uppercase tracking-wider">
              Approved By <span className="text-red-500">*</span>
            </label>
            <input
              className="w-full rounded-lg border-2 border-gray-300 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 disabled:bg-gray-100 disabled:cursor-not-allowed transition-all"
              value={approvedBy}
              disabled={isApproved}
              onChange={(e) => {
                setApprovedBy(e.target.value);
                save({ approvedBy: e.target.value });
              }}
              placeholder="Enter your name or role (required)..."
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
                  <div className="mt-2 flex items-start gap-1.5 text-xs text-amber-700 bg-amber-50 rounded-lg p-2">
                    <AlertCircle className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                    <span>Enter your name above to enable approval</span>
                  </div>
                )}
              </div>
            )}

            {/* Approval Timestamp */}
            {isApproved && approvedAt && (
              <div className="mt-2 rounded-lg bg-green-50 border border-green-200 p-2 text-xs text-green-800">
                <span className="font-medium">Approved on:</span>{' '}
                {new Date(approvedAt).toLocaleString('en-US', {
                  dateStyle: 'medium',
                  timeStyle: 'short'
                })}
              </div>
            )}
          </div>

        
        </div>

        {/* Information Box */}
        {!isApproved && (
          <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 p-3">
            <div className="flex gap-2 text-xs text-blue-900">
              <AlertCircle className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
              <div>
                <strong>Important:</strong> Once approved, you cannot make further changes to the reconciliation. 
                Make sure all adjustments are correct before approving.
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
