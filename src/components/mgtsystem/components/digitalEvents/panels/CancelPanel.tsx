// src/components/mgtsystem/components/drawer/QuizEventDrawer/panels/CancelPanel.tsx
import { AlertTriangle, Loader2 } from 'lucide-react';
import type { Web2RoomListItem as Room, ParsedConfig } from '../../../../../shared/api/quiz.api';

function safeHostName(config: ParsedConfig | null | undefined): string {
  return (config?.hostName || 'Unknown').trim() || 'Unknown';
}

interface CancelPanelProps {
  room: Room | null;
  config: ParsedConfig | null;
  loading: boolean;
  error: string | null;
  onClose: () => void;
  onConfirm: () => void;
}

export default function CancelPanel({
  room,
  config,
  loading,
  error,
  onClose,
  onConfirm,
}: CancelPanelProps) {
  if (!room) return null;

  const dateStr = room.scheduled_at
    ? new Date(room.scheduled_at).toLocaleString('en-GB')
    : 'Not scheduled';

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 p-5 space-y-5">
        {/* Warning banner */}
        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4">
          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-red-100">
            <AlertTriangle className="h-5 w-5 text-red-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-red-900">This action cannot be undone</p>
            <p className="mt-1 text-sm text-red-700">
              The event will be marked as <span className="font-semibold">Cancelled</span> and can no longer be opened.
            </p>
          </div>
        </div>

        {/* Event details */}
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
            Event details
          </h3>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <div className="text-xs font-semibold text-gray-500">Room</div>
              <div className="mt-0.5 font-medium text-gray-900">{room.room_id.slice(0, 8)}…</div>
            </div>
            <div>
              <div className="text-xs font-semibold text-gray-500">Scheduled</div>
              <div className="mt-0.5 font-medium text-gray-900">{dateStr}</div>
            </div>
            <div className="col-span-2">
              <div className="text-xs font-semibold text-gray-500">Host</div>
              <div className="mt-0.5 font-medium text-gray-900">{safeHostName(config)}</div>
            </div>
          </div>
        </div>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}
      </div>

      {/* Footer actions */}
      <div className="flex-shrink-0 border-t border-gray-200 bg-gray-50 px-5 py-4">
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
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
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            Cancel Event
          </button>
        </div>
      </div>
    </div>
  );
}