// src/components/Quiz/modals/UnlinkConfirmModal.tsx

import { AlertTriangle, X, Unlink, Link2 } from 'lucide-react';

interface UnlinkConfirmModalProps {
  open: boolean;
  eventTitle: string;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
}

export default function UnlinkConfirmModal({ 
  open, 
  eventTitle, 
  onConfirm, 
  onCancel, 
  loading 
}: UnlinkConfirmModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div 
        className="absolute inset-0 bg-black/40" 
        onClick={!loading ? onCancel : undefined} 
      />
      
      <div className="relative w-full max-w-md rounded-2xl bg-white shadow-2xl border border-gray-200 animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-start gap-4 p-6 border-b border-gray-100">
          <div className="flex-shrink-0 w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center">
            <AlertTriangle className="h-6 w-6 text-amber-600" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900">Unlink Quiz?</h3>
            <p className="mt-1 text-sm text-gray-600">
              This will remove the connection to the event
            </p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="flex-shrink-0 p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6">
          <div className="rounded-lg bg-gray-50 p-4 border border-gray-200">
            <div className="flex items-center gap-2 text-sm">
              <Link2 className="h-4 w-4 text-indigo-600 flex-shrink-0" />
              <span className="text-gray-600">Event:</span>
              <span className="font-semibold text-gray-900">{eventTitle}</span>
            </div>
          </div>
          <p className="mt-4 text-sm text-gray-600">
            Players will no longer see this quiz associated with the event. You can always link it again later.
          </p>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 bg-gray-50 rounded-b-2xl">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="px-4 py-2 rounded-lg border border-gray-300 text-sm font-semibold text-gray-700 hover:bg-gray-100 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition-colors disabled:opacity-50"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Unlinking...
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