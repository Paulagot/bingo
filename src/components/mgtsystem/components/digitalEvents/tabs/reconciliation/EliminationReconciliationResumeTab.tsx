//src/components/mgtsystem/components/digitalEvents/tabs/reconciliation/EliminationReconciliationResumeTab.tsx
import { Scale, ExternalLink, CheckCircle2 } from 'lucide-react';
import eliminationMgmtService from '../../../../services/EliminationMgmtService';
import { useState } from 'react';

interface Props {
  roomId: string;
  hostId: string;
}

export default function EliminationReconciliationResumeTab({ roomId, hostId }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleResume = async () => {
    setLoading(true);
    setError(null);
    try {
      // Re-hydrate the room so it's back in memory on the server,
      // then open the game page in reconciliation mode
      await eliminationMgmtService.hydrateRoom(roomId);
      const params = new URLSearchParams({
        roomId,
        hostId,
        mode: 'reconcile',
      });
      window.open(`/elimination?${params.toString()}`, '_blank');
    } catch (e: any) {
      setError(e?.message || 'Failed to resume reconciliation. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-5 space-y-4">
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-5">
        <div className="flex items-start gap-3 mb-4">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-amber-100">
            <Scale className="h-5 w-5 text-amber-600" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-amber-900">
              Reconciliation incomplete
            </h3>
            <p className="mt-0.5 text-xs text-amber-700">
              This game ended without the reconciliation being approved.
              Resume it to review payments, make adjustments, and finalise your records.
            </p>
          </div>
        </div>

        {error && (
          <p className="mb-3 rounded-lg border border-red-200 bg-white px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}

        <button
          type="button"
          onClick={handleResume}
          disabled={loading}
          className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-amber-600
            px-4 py-3 text-sm font-bold text-white hover:bg-amber-700
            disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? (
            'Loading…'
          ) : (
            <><ExternalLink className="h-4 w-4" /> Resume Reconciliation</>
          )}
        </button>
      </div>

      <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
        <div className="flex items-start gap-2">
          <CheckCircle2 className="h-4 w-4 text-gray-400 mt-0.5 shrink-0" />
          <p className="text-xs text-gray-500">
            Once reconciliation is approved, this tab will show the final confirmed total
            and the room will be fully closed.
          </p>
        </div>
      </div>
    </div>
  );
}