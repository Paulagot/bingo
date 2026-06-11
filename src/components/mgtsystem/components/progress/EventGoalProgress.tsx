// src/components/mgtsystem/components/progress/EventGoalProgress.tsx
//
// Displays confirmed income vs goal amount for a single event.
// Income source priority: whichever is higher between ledger-confirmed
// income (activityStats.totalIncome) and event.actual_amount.
// If goal_amount is 0 or missing, renders nothing.

import { TrendingUp, CheckCircle } from 'lucide-react';
import { useCurrency } from '../../hooks/useCurrency';
import type { RoomStats } from '../../services/quizRoomServices';
import type { Event } from '../../types/event';

interface EventGoalProgressProps {
  event: Event;
  activityStats?: RoomStats;
  /** Accent colour for the progress bar — defaults to brand teal */
  accentColor?: string;
  /** Show the "X raised" label below the bar. Default true. */
  showRaisedLabel?: boolean;
  /** Compact mode removes vertical padding for use inside tight layouts */
  compact?: boolean;
}

export function EventGoalProgress({
  event,
  activityStats,
  accentColor = '#157f85',
  showRaisedLabel = true,
  compact = false,
}: EventGoalProgressProps) {
  const { fmt: formatMoney } = useCurrency();

  const goalAmount = Number(event.goal_amount || 0);
  if (goalAmount <= 0) return null;

  // Use whichever source gives the higher confirmed figure.
  const ledgerIncome   = activityStats?.totalIncome ?? 0;
  const actualAmount   = Number(event.actual_amount || 0);
  const confirmedIncome = Math.max(ledgerIncome, actualAmount);

  const progress = Math.min(Math.round((confirmedIncome / goalAmount) * 100), 100);
  const isComplete = progress >= 100;

  // Colour shifts green once the goal is hit.
  const barColor = isComplete ? '#22c55e' : accentColor;

  return (
    <div className={compact ? 'py-1' : 'py-3'}>
      {/* Label row */}
      <div className="flex items-center justify-between text-xs mb-1.5">
        <span style={{ color: '#52636f' }}>
          Goal:{' '}
          <span className="font-semibold" style={{ color: '#102532' }}>
            {formatMoney(goalAmount)}
          </span>
        </span>

        {confirmedIncome > 0 && (
          <span
            className="flex items-center gap-1 font-semibold"
            style={{ color: isComplete ? '#16a34a' : accentColor }}
          >
            {isComplete
              ? <CheckCircle className="h-3 w-3" />
              : <TrendingUp className="h-3 w-3" />}
            {progress}%
          </span>
        )}
      </div>

      {/* Bar */}
      <div
        className="h-1.5 w-full rounded-full overflow-hidden"
        style={{ background: '#f1f0ee' }}
      >
        <div
          className="h-1.5 rounded-full transition-all duration-500"
          style={{
            width: confirmedIncome > 0 ? `${progress}%` : '0%',
            background: barColor,
          }}
        />
      </div>

      {/* Raised label */}
      {showRaisedLabel && confirmedIncome > 0 && (
        <p className="mt-1 text-xs" style={{ color: '#52636f' }}>
          {formatMoney(confirmedIncome)} raised
          {isComplete && (
            <span
              className="ml-1.5 font-semibold"
              style={{ color: '#16a34a' }}
            >
              · Goal reached!
            </span>
          )}
        </p>
      )}

      {/* No income yet */}
      {showRaisedLabel && confirmedIncome === 0 && (
        <p className="mt-1 text-xs" style={{ color: '#b8c6b0' }}>
          No confirmed income yet
        </p>
      )}
    </div>
  );
}

export default EventGoalProgress;