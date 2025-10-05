// src/components/Quiz/payments/ReconciliationDownloads.tsx
import { useEffect, useMemo, useState } from 'react';
import { Download } from 'lucide-react';
import { useParams } from 'react-router-dom';

import { useQuizConfig } from '../hooks/useQuizConfig';
import { usePlayerStore } from '../hooks/usePlayerStore';
import { useQuizSocket } from '../sockets/QuizSocketProvider';

import { makeArchiveZip, exportCsvs, exportPdf } from './reportExport';

type Props = {
  allRoundsStats?: any[];         // pass-through from HostStats if available
  onArchiveComplete?: () => void; // called when user confirms "End & Clear Now"
};

export default function ReconciliationDownloads({
  allRoundsStats = [],
  onArchiveComplete,
}: Props) {
  const { config } = useQuizConfig();
  const { players } = usePlayerStore();
  const approvedAt = (config?.reconciliation as any)?.approvedAt;
  const disabled = !approvedAt;

  const { socket } = useQuizSocket();
  const { roomId } = useParams();

  const [busy, setBusy] = useState<'none' | 'csv' | 'pdf' | 'zip'>('none');
  const [showConfirm, setShowConfirm] = useState(false);

  const payload = useMemo(
    () => ({ config, players, allRoundsStats }),
    [config, players, allRoundsStats]
  );

  const run = async (fn: () => Promise<void>, kind: 'csv' | 'pdf' | 'zip') => {
    try {
      setBusy(kind);
      await fn();
    } finally {
      setBusy('none');
    }
  };

  // Generate archive locally, stamp archiveGeneratedAt, then show the confirm bar.
  const handleArchive = async () => {
    if (disabled || busy !== 'none') return;

    setBusy('zip');
    try {
      await makeArchiveZip(payload); // triggers .zip download
      // Stamp archiveGeneratedAt for audit trail
      if (socket && roomId) {
        const ts = new Date().toISOString();
        socket.emit('update_reconciliation', {
          roomId,
          patch: { archiveGeneratedAt: ts },
        });
      }
      // Now show confirm to End & Clear
      setShowConfirm(true);
    } catch (e) {
      console.warn('Archive failed:', e);
    } finally {
      setBusy('none');
    }
  };

  // If you later move archive building to the server, you can listen to:
  // archive_started / archive_ready here and show the same confirm bar.
  useEffect(() => {
    // placeholder for future socket-based flow
  }, []);

  return (
    <div className="rounded-xl border-2 border-emerald-200 bg-white p-4">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-lg font-semibold">Downloads</h3>
        <div className="text-xs text-fg/70">
          {disabled ? 'Exports unlock after approval' : 'Ready'}
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        {/* <button
          disabled={disabled || busy !== 'none'}
          onClick={() => run(() => exportCsvs(payload), 'csv')}
          className="flex items-center space-x-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
        >
          <Download className="h-4 w-4" />
          <span>Export CSVs</span>
        </button> */}

        {/* <button
          disabled={disabled || busy !== 'none'}
          onClick={() => run(() => exportPdf(payload), 'pdf')}
          className="flex items-center space-x-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
        >
          <Download className="h-4 w-4" />
          <span>Export PDF</span>
        </button> */}

        <button
          disabled={disabled || busy !== 'none'}
          onClick={handleArchive}
          className="flex items-center space-x-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
        >
          <Download className="h-4 w-4" />
          <span>
            {busy === 'zip' ? 'Generating Archive…' : 'Generate Archive (.zip)'}
          </span>
        </button>
      </div>

      {showConfirm && (
        <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-sm font-medium text-amber-800">
              Archive started. End &amp; Clear now?
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowConfirm(false)}
                className="rounded-lg border border-amber-300 bg-white px-3 py-1 text-sm text-amber-700 hover:bg-amber-100"
              >
                Not yet
              </button>
              <button
                onClick={() => onArchiveComplete?.()}
                className="rounded-lg bg-red-600 px-3 py-1 text-sm font-semibold text-white hover:bg-red-700"
              >
                End &amp; Clear Now
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


