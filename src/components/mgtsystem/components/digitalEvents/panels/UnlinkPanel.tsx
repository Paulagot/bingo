// src/components/mgtsystem/components/drawer/QuizEventDrawer/panels/UnlinkPanel.tsx
import { AlertTriangle, Link2, Unlink } from 'lucide-react';

interface UnlinkPanelProps {
  eventTitle: string;
  loading?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

export default function UnlinkPanel({
  eventTitle,
  loading,
  onConfirm,
  onClose,
}: UnlinkPanelProps) {
  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 p-5 space-y-5">
        {/* Warning banner */}
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-amber-100">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-amber-900">Remove event link?</p>
            <p className="mt-1 text-sm text-amber-700">
              Players will no longer see this quiz associated with the event. You can always link it again later.
            </p>
          </div>
        </div>

        {/* Linked event detail */}
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
            Currently linked to
          </h3>
          <div className="flex items-center gap-2 text-sm">
            <Link2 className="h-4 w-4 text-indigo-600 flex-shrink-0" />
            <span className="font-semibold text-gray-900">{eventTitle}</span>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="flex-shrink-0 border-t border-gray-200 bg-gray-50 px-5 py-4">
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
          >
            {loading ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                Unlinking…
              </>
            ) : (
              <>
                <Unlink className="h-4 w-4" />
                Unlink Quiz
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}