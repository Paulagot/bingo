// src/components/Quiz/game/completion/PrizeDeliveryPanel.tsx
import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuizSocket } from '../../sockets/QuizSocketProvider';
import { useQuizConfig } from '../../hooks/useQuizConfig';
import type { PrizeAward, PrizeAwardStatus } from '../../types/quiz';

import {
  Package,
  CheckCircle,
  XCircle,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  HelpCircle
} from 'lucide-react';

type Props = {
  lockEdits: boolean;
};

const STATUS_CONFIG = {
  declared: { label: 'Declared', color: 'blue', icon: Package },
  collected: { label: 'Collected', color: 'purple', icon: CheckCircle },
  delivered: { label: 'Delivered', color: 'green', icon: CheckCircle },
  unclaimed: { label: 'Unclaimed', color: 'amber', icon: AlertTriangle },
  refused: { label: 'Refused', color: 'red', icon: XCircle },
  canceled: { label: 'Canceled', color: 'gray', icon: XCircle },
} as const;

type PrizeStatus = keyof typeof STATUS_CONFIG;

export default function PrizeDeliveryPanel({ lockEdits }: Props) {
  const { roomId } = useParams();
  const { socket } = useQuizSocket();
  const { config } = useQuizConfig();
  const [showGuide, setShowGuide] = useState(false);

  const awards: PrizeAward[] = (config?.reconciliation?.prizeAwards || []) as PrizeAward[];
  const currency = config?.currencySymbol || '€';

  if (!awards.length) return null;

  // ---- SHARED HELPER FOR PATCHING ----
  const updatePrizeAward = (prizeAwardId: string, updates: Partial<PrizeAward>) => {
    if (!socket || !roomId || lockEdits) return;

    const existing = awards.find(a => a.prizeAwardId === prizeAwardId);
    if (!existing) return;

    // Add statusHistory only when status changes
    const newHistory =
      updates.status && updates.status !== existing.status
        ? [
            ...(existing.statusHistory || []),
            {
              status: updates.status as PrizeAwardStatus,
              at: new Date().toISOString(),
              byUserId: config?.hostId || 'system',
              ...(config?.hostName ? { byUserName: config.hostName } : {}),
              note: `Status changed to ${updates.status}`,
            },
          ]
        : existing.statusHistory;

    const patch: Partial<PrizeAward> = {
      ...updates,
      ...(newHistory ? { statusHistory: newHistory } : {}),
    };

    socket.emit('update_prize_award', { roomId, prizeAwardId, patch });
  };

  // ---- STATUS ACTION HELPERS ----
  const markCollected = (id: string) =>
    updatePrizeAward(id, {
      status: 'collected',
      collectedAt: new Date().toISOString(),
    });

  const markDelivered = (id: string) =>
    updatePrizeAward(id, {
      status: 'delivered',
      deliveredAt: new Date().toISOString(),
    });

  const markUnclaimed = (id: string) =>
    updatePrizeAward(id, {
      status: 'unclaimed',
      unclaimedAt: new Date().toISOString(),
    });

  const markRefused = (id: string) =>
    updatePrizeAward(id, {
      status: 'refused',
      refusedAt: new Date().toISOString(),
    });

  // ---- RENDER ----
  return (
    <div className="rounded-xl border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-white p-6 shadow-sm">
      {/* Header */}
      <div className="mb-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-purple-100 p-2">
            <Package className="h-5 w-5 text-purple-700" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900">Prize Delivery & Status</h3>
            <p className="text-sm text-gray-600">Update and correct prize status at any time</p>
          </div>
        </div>
      </div>

      {/* Guide */}
      <details
        className="rounded-lg border border-gray-200 bg-gray-50 mb-6"
        open={showGuide}
        onToggle={(e) => setShowGuide((e.target as HTMLDetailsElement).open)}
      >
        <summary className="cursor-pointer p-4 font-medium text-gray-900 hover:bg-gray-100 transition-colors flex items-center justify-between">
          <span className="flex items-center gap-2">
            <HelpCircle className="h-5 w-5 text-gray-600" />
            Prize Status Guide
          </span>
          {showGuide ? <ChevronUp /> : <ChevronDown />}
        </summary>

        <div className="p-4 pt-0 text-sm space-y-3">
          <p className="text-blue-900 font-semibold">All statuses are fully editable.</p>
          <p className="text-gray-700">
            You may correct mistakes at any time by switching between:
            <strong> Declared, Collected, Delivered, Unclaimed, Refused.</strong>
          </p>
        </div>
      </details>

      {/* Prize Cards */}
      <div className="space-y-4">
        {awards.map((award) => {
          const id = award.prizeAwardId;
          const status = (award.status || 'declared') as PrizeStatus;
          const statusInfo = STATUS_CONFIG[status];
          const StatusIcon = statusInfo.icon;

          const prizeValue = award.declaredValue;

          return (
            <div
              key={id}
              className={`rounded-lg border-2 p-5 bg-white ${
                status === 'refused' || status === 'unclaimed'
                  ? 'border-amber-200 bg-amber-50/30'
                  : status === 'delivered' || status === 'collected'
                  ? 'border-green-200 bg-green-50/30'
                  : 'border-purple-200 hover:border-purple-300 hover:shadow-md'
              }`}
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600 text-white flex items-center justify-center text-sm font-bold">
                      {award.place}
                    </div>
                    <h4 className="text-base font-bold text-gray-900">{award.prizeName}</h4>
                  </div>
                  <div className="text-sm text-gray-600 ml-9 flex gap-3">
                    <span>
                      Winner: <strong>{award.winnerName}</strong>
                    </span>
                    {typeof prizeValue === 'number' && (
                      <span>
                        Value: <strong>{currency}{prizeValue.toFixed(2)}</strong>
                      </span>
                    )}
                  </div>
                </div>

                {/* Status Badge */}
                <div
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border-2 bg-${statusInfo.color}-50 border-${statusInfo.color}-200`}
                >
                  <StatusIcon className={`h-4 w-4 text-${statusInfo.color}-700`} />
                  <span className={`text-sm font-semibold text-${statusInfo.color}-900`}>
                    {statusInfo.label}
                  </span>
                </div>
              </div>

              {/* Actions */}
              {!lockEdits && (
                <div className="border-t border-gray-200 pt-4 mt-4 space-y-3">
                  <p className="text-sm font-medium text-gray-800">Update Status:</p>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <button
                      disabled={status === 'collected'}
                      onClick={() => markCollected(id)}
                      className="px-3 py-2 rounded-lg bg-purple-600 text-white disabled:opacity-50"
                    >
                      Mark Collected
                    </button>

                    <button
                      disabled={status === 'delivered'}
                      onClick={() => markDelivered(id)}
                      className="px-3 py-2 rounded-lg bg-green-600 text-white disabled:opacity-50"
                    >
                      Mark Delivered
                    </button>

                    <button
                      disabled={status === 'unclaimed'}
                      onClick={() => markUnclaimed(id)}
                      className="px-3 py-2 rounded-lg bg-amber-500 text-white disabled:opacity-50"
                    >
                      Mark Unclaimed
                    </button>

                    <button
                      disabled={status === 'refused'}
                      onClick={() => markRefused(id)}
                      className="px-3 py-2 rounded-lg bg-red-600 text-white disabled:opacity-50"
                    >
                      Mark Refused
                    </button>
                  </div>
                </div>
              )}

              {lockEdits && (
                <div className="border-t border-gray-200 pt-4 mt-4">
                  <div className="rounded-lg bg-gray-50 border border-gray-200 p-3 text-sm text-gray-700">
                    🔒 Prize workflow is locked.
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}







