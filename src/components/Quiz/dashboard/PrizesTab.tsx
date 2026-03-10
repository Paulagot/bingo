// src/components/Quiz/dashboard/PrizesTab.tsx
import { useMemo } from 'react';
import { Gift, CheckCircle, AlertCircle, Info } from 'lucide-react';
import { useQuizConfig } from '../hooks/useQuizConfig';
import type { LeaderboardEntry, PrizeAward, PrizeAwardStatus } from '../types/quiz';

import WinnersAssignPanel from '../game/completion/WinnersAssignPanel';
import PrizeDeliveryPanel from '../game/completion/PrizeDeliveryPanel';

type Props = {
  prizeLeaderboard: LeaderboardEntry[];
  prizeWorkflowComplete: boolean;
  lockEdits: boolean;
};

// FINAL states that count towards "resolved"
const RESOLVED_STATES: Set<PrizeAwardStatus> = new Set([
  'collected',
  'delivered',
  'unclaimed',
  'refused',
]);

export default function PrizesTab({
  prizeLeaderboard,
  prizeWorkflowComplete,
  lockEdits,
}: Props) {
  const { config } = useQuizConfig();
  const currency = config?.currencySymbol || '€';

  const prizes = (config?.prizes || []) as Array<{
    place: number;
    description: string;
    value?: number;
    sponsor?: string;
  }>;

  const awards = (config?.reconciliation?.prizeAwards || []) as PrizeAward[];

  const metrics = useMemo(() => {
    const totalPrizes = prizes.length;

    // ----- Declared (prizes assigned to winners) -----
    const declaredPlaces = new Set<number>();
    awards.forEach((a) => {
      if (typeof a.place === 'number') declaredPlaces.add(a.place);
    });
    const declared = declaredPlaces.size;

    // ----- Resolved (prizes with final status) -----
    const resolvedPlaces = new Set<number>();
    awards.forEach((a) => {
      if (RESOLVED_STATES.has(a.status) && typeof a.place === 'number') {
        resolvedPlaces.add(a.place);
      }
    });
    const resolved = resolvedPlaces.size;

    // ----- Declared Value (sum of all prize.value) -----
    let declaredValue = 0;
    prizes.forEach((p) => {
      if (typeof p.value === 'number') declaredValue += p.value;
    });

    // ----- Resolved Value (sum of prize.value for resolved awards) -----
    let resolvedValue = 0;
    awards.forEach((a) => {
      if (!RESOLVED_STATES.has(a.status)) return;

      const basePrize = prizes.find((p) => p.place === a.place);
      if (basePrize && typeof basePrize.value === 'number') {
        resolvedValue += basePrize.value;
      }
    });

    return {
      totalPrizes,
      declared,
      resolved,
      declaredValue,
      resolvedValue,
    };
  }, [prizes, awards]);

  const hasPrizes = metrics.totalPrizes > 0;
  const allDeclared = hasPrizes && metrics.declared === metrics.totalPrizes;
  const allResolved = hasPrizes && metrics.resolved === metrics.totalPrizes;

  const hasUnresolvedPrizes = awards.some((a) => a.status === 'declared');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-purple-100 p-2">
            <Gift className="h-6 w-6 text-purple-700" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Prize Distribution</h2>
            <p className="text-sm text-gray-600 mt-0.5">
              {hasPrizes
                ? `${metrics.totalPrizes} prize${metrics.totalPrizes !== 1 ? 's' : ''} configured`
                : 'No prizes configured'}
            </p>
          </div>
        </div>

        {/* <div className="flex items-center gap-2">
          {prizeWorkflowComplete ? (
            <div className="flex items-center gap-2 rounded-lg bg-green-50 border border-green-200 px-3 py-2">
              <CheckCircle className="h-4 w-4 text-green-700" />
              <span className="text-sm font-medium text-green-800">All prizes resolved</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2">
              <AlertCircle className="h-4 w-4 text-amber-700" />
              <span className="text-sm font-medium text-amber-800">Complete to unlock Payments</span>
            </div>
          )}
        </div> */}
      </div>

      {/* Educational Banner */}
      {hasPrizes && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="text-sm font-semibold text-blue-900 mb-1">
                Prize Declaration & Compliance
              </h4>
              <p className="text-sm text-blue-800 mb-2">
                Winners are automatically assigned based on final standings.
              </p>
              <p className="text-xs text-blue-700">
                All prize declarations are timestamped and immutable once the payment reconciliation is completed.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!hasPrizes && (
        <div className="rounded-xl border-2 border-dashed border-blue-300 bg-blue-50 p-8 text-center">
          <Gift className="h-12 w-12 text-blue-400 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-blue-900 mb-2">No Prizes Configured</h3>
          <p className="text-sm text-blue-700">
            Add prizes in the setup to track winners and delivery.
          </p>
        </div>
      )}

      {/* Metrics */}
      {hasPrizes && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {/* Declared */}
          <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
            <div className="text-xs font-medium text-gray-600 uppercase tracking-wider mb-1">
              Declared
            </div>
            <div className="text-2xl font-bold text-gray-900">
              {metrics.declared}/{metrics.totalPrizes}
            </div>
            {allDeclared && (
              <div className="mt-1 text-xs text-green-600 flex items-center gap-1">
                <CheckCircle className="h-3 w-3" /> Complete
              </div>
            )}
          </div>

          {/* Resolved */}
          <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
            <div className="text-xs font-medium text-gray-600 uppercase tracking-wider mb-1">
              Resolved
            </div>
            <div className="text-2xl font-bold text-gray-900">
              {metrics.resolved}/{metrics.totalPrizes}
            </div>
            {allResolved && (
              <div className="mt-1 text-xs text-green-600 flex items-center gap-1">
                <CheckCircle className="h-3 w-3" /> Complete
              </div>
            )}
          </div>

          {/* Declared Value */}
          <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
            <div className="text-xs font-medium text-gray-600 uppercase tracking-wider mb-1">
              Declared Value
            </div>
            <div className="text-2xl font-bold text-gray-900">
              {currency}
              {metrics.declaredValue.toFixed(2)}
            </div>
          </div>

          {/* Resolved Value */}
          <div
            className={`rounded-lg border bg-white p-4 shadow-sm ${
              metrics.resolvedValue !== metrics.declaredValue
                ? 'border-amber-300 bg-amber-50'
                : 'border-gray-200'
            }`}
          >
            <div className="text-xs font-medium text-gray-600 uppercase tracking-wider mb-1">
              Resolved Value
            </div>
            <div
              className={`text-2xl font-bold ${
                metrics.resolvedValue !== metrics.declaredValue
                  ? 'text-amber-900'
                  : 'text-gray-900'
              }`}
            >
              {currency}
              {metrics.resolvedValue.toFixed(2)}
            </div>
            {metrics.resolvedValue !== metrics.declaredValue && (
              <div className="mt-1 text-xs text-amber-700">Variance detected</div>
            )}
          </div>
        </div>
      )}

      {/* Warning for no awards */}
      {hasPrizes && metrics.declared === 0 && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-amber-700 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="text-sm font-semibold text-amber-900 mb-1">
                No Prize Awards Declared Yet
              </h4>
              <p className="text-sm text-amber-800">
                The "Assign Winners" section will auto-fill based on leaderboard results.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Winners Assignment */}
      {hasPrizes && <WinnersAssignPanel leaderboard={prizeLeaderboard} />}

      {/* Inline Help */}
      {hasPrizes && hasUnresolvedPrizes && (
        <div className="rounded-lg bg-blue-50 border border-blue-200 p-4">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-semibold text-blue-900 text-sm mb-2">
                Next Steps for Prize Distribution
              </h4>
              <ol className="text-sm text-blue-800 space-y-2 list-decimal list-inside">
                <li>Contact winners to arrange collection or delivery.</li>
                <li>Update prize status as distribution progresses.</li>
                <li>Complete all prizes to unlock payment reconciliation.</li>
              </ol>
            </div>
          </div>
        </div>
      )}

      {/* Delivery Panel */}
      {hasPrizes && <PrizeDeliveryPanel lockEdits={lockEdits} />}
    </div>
  );
}



