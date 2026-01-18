
import { XCircle, AlertTriangle, Loader2 } from 'lucide-react';
import type { Web2RoomListItem as Room, ParsedConfig } from '../../../shared/api/quiz.api.ts';

function safeHostName(config: ParsedConfig | null | undefined): string {
  return (config?.hostName || 'Unknown').trim() || 'Unknown';
}

export default function CancelQuizModal({
  open,
  room,
  config,
  loading,
  error,
  onClose,
  onConfirm,
}: {
  open: boolean;
  room: Room | null;
  config: ParsedConfig | null;
  loading: boolean;
  error: string | null;
  onClose: () => void;
  onConfirm: () => void;
}) {
  if (!open || !room) return null;

  const dateStr = room.scheduled_at
    ? new Date(room.scheduled_at).toLocaleString('en-GB')
    : 'Not scheduled';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-black/40"
      />

      {/* Modal */}
      <div className="relative w-[92vw] max-w-lg rounded-2xl bg-white shadow-xl border border-gray-200">
        <div className="p-5 sm:p-6">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-50 border border-red-100">
              <AlertTriangle className="h-5 w-5 text-red-600" />
            </div>

            <div className="min-w-0 flex-1">
              <h3 className="text-base sm:text-lg font-semibold text-gray-900">
                Cancel this quiz event?
              </h3>
              <p className="mt-1 text-sm text-gray-600">
                This will mark the event as <span className="font-semibold text-red-600">Cancelled</span> and it
                can’t be opened.
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-2 hover:bg-gray-100"
              title="Close"
            >
              <XCircle className="h-5 w-5 text-gray-500" />
            </button>
          </div>

          <div className="mt-5 rounded-xl border border-gray-200 bg-gray-50 p-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <div className="text-xs font-semibold text-gray-500 uppercase">Room</div>
                <div className="mt-0.5 font-medium text-gray-900">{room.room_id.slice(0, 8)}…</div>
              </div>
              <div>
                <div className="text-xs font-semibold text-gray-500 uppercase">Scheduled</div>
                <div className="mt-0.5 font-medium text-gray-900">{dateStr}</div>
              </div>
              <div className="col-span-2">
                <div className="text-xs font-semibold text-gray-500 uppercase">Host</div>
                <div className="mt-0.5 font-medium text-gray-900">{safeHostName(config)}</div>
              </div>
            </div>
          </div>

          {error && (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60"
            >
              Keep Event
            </button>

            <button
              type="button"
              onClick={onConfirm}
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Cancel Event
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
