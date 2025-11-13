/**
 * Room IDs Banner Component
 *
 * Displays generated room and host IDs.
 */

import { FC } from 'react';
import { CheckCircle } from 'lucide-react';

export interface RoomIdsBannerProps {
  roomId: string | null;
  hostId: string | null;
}

export const RoomIdsBanner: FC<RoomIdsBannerProps> = ({ roomId, hostId }) => {
  if (!roomId && !hostId) return null;

  return (
    <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 sm:p-4">
      <div className="mb-1 flex items-center gap-2">
        <CheckCircle className="h-4 w-4 text-blue-600" />
        <span className="text-xs font-medium text-blue-900 sm:text-sm">Room IDs Generated</span>
      </div>
      <div className="space-y-0.5 text-xs text-blue-800 sm:text-sm">
        {roomId && (
          <p>
            <span className="font-medium">Room ID:</span>{' '}
            <code className="rounded bg-blue-100 px-2 py-0.5">{roomId}</code>
          </p>
        )}
        {hostId && (
          <p>
            <span className="font-medium">Host ID:</span>{' '}
            <code className="rounded bg-blue-100 px-2 py-0.5">{hostId}</code>
          </p>
        )}
      </div>
    </div>
  );
};

