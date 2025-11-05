// src/components/PrizesTab.tsx
import { useMemo } from 'react';
import { Gift, CheckCircle, AlertCircle } from 'lucide-react';
import { useQuizConfig } from '../hooks/useQuizConfig';
import type { LeaderboardEntry } from '../types/quiz';

import WinnersAssignPanel from '../game/completion/WinnersAssignPanel';
import PrizeDeliveryPanel from '../game/completion/PrizeDeliveryPanel';

type Props = {
  prizeLeaderboard: LeaderboardEntry[];
  prizeWorkflowComplete: boolean;
  lockEdits: boolean;
}

const FINAL_STATES = new Set(['delivered', 'unclaimed', 'refused', 'returned', 'canceled']);

export default function PrizesTab({
  prizeLeaderboard,
  prizeWorkflowComplete,
  lockEdits,
}: Props) {
  const { config } = useQuizConfig();
  const currency = config?.currencySymbol || '€';

  const prizes = (config?.prizes || []) as any[];
  const awards = (config?.reconciliation?.prizeAwards || []) as any[];

  const metrics = useMemo(() => {
    const totalPrizes = prizes.length;
    const declared = awards.length;
    const resolved = awards.filter((a) => FINAL_STATES.has(a?.status)).length;

    const declaredValue = awards.reduce(
      (sum, a) => sum + (typeof a?.prizeValue === 'number' ? a.prizeValue : 0),
      0
    );
    const deliveredValue = awards
      .filter((a) => a?.status === 'delivered')
      .reduce((sum, a) => sum + (typeof a?.prizeValue === 'number' ? a.prizeValue : 0), 0);

    return { totalPrizes, declared, resolved, declaredValue, deliveredValue };
  }, [prizes, awards]);

  const hasPrizes = metrics.totalPrizes > 0;
  const allDeclared = hasPrizes && metrics.declared === metrics.totalPrizes;
  const allResolved = hasPrizes && metrics.resolved === metrics.totalPrizes;

  return (
    <div className="space-y-6">
      {/* Header with Status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-purple-100 p-2">
            <Gift className="h-6 w-6 text-purple-700" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Prize Distribution</h2>
            <p className="text-sm text-gray-600 mt-0.5">
              {hasPrizes ? `${metrics.totalPrizes} prize${metrics.totalPrizes !== 1 ? 's' : ''} configured` : 'No prizes configured'}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
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
        </div>
      </div>

      {/* Empty State */}
      {!hasPrizes && (
        <div className="rounded-xl border-2 border-dashed border-blue-300 bg-blue-50 p-8 text-center">
          <Gift className="h-12 w-12 text-blue-400 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-blue-900 mb-2">No Prizes Configured</h3>
          <p className="text-sm text-blue-700">
            Add prizes in the quiz setup to track winners and delivery here.
          </p>
        </div>
      )}

      {/* Metrics Overview */}
      {hasPrizes && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
            <div className="text-xs font-medium text-gray-600 uppercase tracking-wider mb-1">Declared</div>
            <div className="text-2xl font-bold text-gray-900">
              {metrics.declared}<span className="text-base font-normal text-gray-500">/{metrics.totalPrizes}</span>
            </div>
            {allDeclared && (
              <div className="mt-1 text-xs text-green-600 flex items-center gap-1">
                <CheckCircle className="h-3 w-3" />
                Complete
              </div>
            )}
          </div>

          <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
            <div className="text-xs font-medium text-gray-600 uppercase tracking-wider mb-1">Resolved</div>
            <div className="text-2xl font-bold text-gray-900">
              {metrics.resolved}<span className="text-base font-normal text-gray-500">/{metrics.totalPrizes}</span>
            </div>
            {allResolved && (
              <div className="mt-1 text-xs text-green-600 flex items-center gap-1">
                <CheckCircle className="h-3 w-3" />
                Complete
              </div>
            )}
          </div>

          <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
            <div className="text-xs font-medium text-gray-600 uppercase tracking-wider mb-1">Declared Value</div>
            <div className="text-2xl font-bold text-gray-900">
              {currency}{metrics.declaredValue.toFixed(2)}
            </div>
          </div>

          <div className={`rounded-lg border bg-white p-4 shadow-sm ${
            metrics.declaredValue !== metrics.deliveredValue 
              ? 'border-amber-300 bg-amber-50' 
              : 'border-gray-200'
          }`}>
            <div className="text-xs font-medium text-gray-600 uppercase tracking-wider mb-1">Delivered Value</div>
            <div className={`text-2xl font-bold ${
              metrics.declaredValue !== metrics.deliveredValue ? 'text-amber-900' : 'text-gray-900'
            }`}>
              {currency}{metrics.deliveredValue.toFixed(2)}
            </div>
            {metrics.declaredValue !== metrics.deliveredValue && (
              <div className="mt-1 text-xs text-amber-700">
                Variance detected
              </div>
            )}
          </div>
        </div>
      )}

      {/* Warning if no awards yet */}
      {hasPrizes && metrics.declared === 0 && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-amber-700 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="text-sm font-semibold text-amber-900 mb-1">No Prize Awards Declared Yet</h4>
              <p className="text-sm text-amber-800">
                The "Assign Winners" section will auto-fill from final standings. You can adjust assignments if needed.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Winners Assignment */}
      {hasPrizes && (
        <WinnersAssignPanel leaderboard={prizeLeaderboard} />
      )}

      {/* Delivery & Status Management */}
      {hasPrizes && (
        <PrizeDeliveryPanel lockEdits={lockEdits} />
      )}
    </div>
  );
}
