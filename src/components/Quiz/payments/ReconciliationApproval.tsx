// src/components/Quiz/payments/ReconciliationApproval.tsx
import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuizSocket } from '../sockets/QuizSocketProvider';
import { useQuizConfig } from '../hooks/useQuizConfig';

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

  const disabled = !!approvedAt;

  return (
    <div className="rounded-xl border-2 border-indigo-200 bg-white p-4 shadow-sm">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-lg font-semibold">Reconciliation Approval</h3>
        {approvedAt ? (
          <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700">
            Approved {new Date(approvedAt).toLocaleString()}
          </span>
        ) : (
          <span className="rounded-full bg-yellow-100 px-3 py-1 text-xs font-medium text-yellow-700">
            Pending Approval
          </span>
        )}
      </div>

      <div className={`grid ${compact ? 'grid-cols-1' : 'grid-cols-2'} gap-3`}>
        <div>
          <label className="mb-1 block text-xs text-fg/70">Approved by</label>
          <input
            className="w-full rounded-lg border bg-white px-3 py-2 text-sm"
            value={approvedBy}
            disabled={disabled}
            onChange={(e) => {
              setApprovedBy(e.target.value);
              save({ approvedBy: e.target.value });
            }}
            placeholder="Name / Role"
          />
          {!approvedAt && (
            <button
              onClick={onApprove}
              className="mt-2 rounded-lg bg-indigo-600 px-3 py-1 text-xs font-semibold text-white hover:bg-indigo-700"
            >
              Mark Approved
            </button>
          )}
        </div>

        <div className={`${compact ? 'col-span-1' : 'col-span-2'}`}>
          <label className="mb-1 block text-xs text-fg/70">Comments / Notes</label>
          <textarea
            rows={compact ? 2 : 3}
            className="w-full rounded-lg border bg-white px-3 py-2 text-sm"
            disabled={disabled}
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
