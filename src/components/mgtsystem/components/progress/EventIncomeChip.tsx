// src/components/mgtsystem/components/progress/EventIncomeChip.tsx
//
// Compact inline chip for the table row income column.
// Shows confirmed income vs goal as "€X / €Y" with a mini progress bar.
// Falls back gracefully when there's no goal or no income.

import { TrendingUp, CheckCircle, Minus } from 'lucide-react';
import { useCurrency } from '../../hooks/useCurrency';
import type { RoomStats } from '../../services/quizRoomServices';
import type { Event } from '../../types/event';

interface EventIncomeChipProps {
  event: Event;
  activityStats?: RoomStats;
  accentColor?: string;
}

export function EventIncomeChip({
  event,
  activityStats,
  accentColor = '#157f85',
}: EventIncomeChipProps) {
  const { fmt: formatMoney } = useCurrency();

  const goalAmount     = Number(event.goal_amount || 0);
  const ledgerIncome   = activityStats?.totalIncome ?? 0;
  const actualAmount   = Number(event.actual_amount || 0);
  const confirmedIncome = Math.max(ledgerIncome, actualAmount);

  // No goal and no income — show a neutral dash
  if (goalAmount === 0 && confirmedIncome === 0) {
    return (
      <span className="flex items-center gap-1 text-xs" style={{ color: '#b8c6b0' }}>
        <Minus className="h-3 w-3" /> —
      </span>
    );
  }

  const progress   = goalAmount > 0
    ? Math.min(Math.round((confirmedIncome / goalAmount) * 100), 100)
    : null;
  const isComplete = progress !== null && progress >= 100;
  const barColor   = isComplete ? '#22c55e' : accentColor;

  return (
    <div className="flex flex-col gap-1 min-w-[90px]">
      {/* Amount */}
      <div className="flex items-center gap-1">
        {isComplete
          ? <CheckCircle className="h-3 w-3 flex-shrink-0" style={{ color: '#16a34a' }} />
          : confirmedIncome > 0
            ? <TrendingUp className="h-3 w-3 flex-shrink-0" style={{ color: accentColor }} />
            : null}
        <span
          className="text-xs font-semibold"
          style={{ color: confirmedIncome > 0 ? '#102532' : '#b8c6b0' }}
        >
          {confirmedIncome > 0 ? formatMoney(confirmedIncome) : '—'}
        </span>
        {goalAmount > 0 && (
          <span className="text-xs" style={{ color: '#8a9bab' }}>
            / {formatMoney(goalAmount)}
          </span>
        )}
      </div>

      {/* Mini progress bar — only when there's a goal */}
      {goalAmount > 0 && (
        <div
          className="h-1 w-full rounded-full overflow-hidden"
          style={{ background: '#f1f0ee' }}
        >
          <div
            className="h-1 rounded-full transition-all duration-500"
            style={{
              width: confirmedIncome > 0 ? `${progress}%` : '0%',
              background: barColor,
            }}
          />
        </div>
      )}

      {/* Percentage label */}
      {progress !== null && confirmedIncome > 0 && (
        <span
          className="text-[10px] font-semibold leading-none"
          style={{ color: isComplete ? '#16a34a' : '#8a9bab' }}
        >
          {isComplete ? 'Goal reached' : `${progress}% of goal`}
        </span>
      )}
    </div>
  );
}

export default EventIncomeChip;