/**
 * Room IDs Banner Component
 *
 * Displays generated room and host IDs in a prominent banner.
 * These IDs are embedded in the smart contract for traceability and are used
 * throughout the quiz lifecycle.
 *
 * ## Purpose
 *
 * - **Transparency**: Shows users the unique identifiers for their room
 * - **Traceability**: IDs are embedded in smart contract for on-chain verification
 * - **Debugging**: Helps with troubleshooting and support
 *
 * ## Usage
 *
 * ```typescript
 * <RoomIdsBanner roomId="abc123" hostId="xyz789" />
 * ```
 *
 * Used by StepWeb3ReviewLaunch component to display generated IDs.
 */

import { FC } from 'react';
import { CheckCircle } from 'lucide-react';

/**
 * Component Props
 */
export interface RoomIdsBannerProps {
  /** Generated room ID */
  roomId: string | null;
  /** Generated host ID */
  hostId: string | null;
}

/**
 * Room IDs Banner
 *
 * Displays room and host IDs in a styled banner with helpful context.
 *
 * @param props - Component props
 * @returns Room IDs banner component
 */
export const RoomIdsBanner: FC<RoomIdsBannerProps> = ({ roomId, hostId }) => {
  // Don't render if no IDs
  if (!roomId && !hostId) return null;

  return (
    <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
      <div className="mb-2 flex items-center space-x-2">
        <CheckCircle className="h-5 w-5 text-blue-600" />
        <span className="font-medium text-blue-800">Room IDs</span>
      </div>
      <div className="space-y-1 text-sm text-blue-700">
        {roomId && (
          <p>
            <span className="font-medium">Room ID:</span>{' '}
            <code className="rounded bg-blue-100 px-2 py-1">{roomId}</code>
          </p>
        )}
        {hostId && (
          <p>
            <span className="font-medium">Host ID:</span>{' '}
            <code className="rounded bg-blue-100 px-2 py-1">{hostId}</code>
          </p>
        )}
        <p className="mt-2 text-xs text-blue-600">
          💡 Embedded in the smart contract for traceability.
        </p>
      </div>
    </div>
  );
};

