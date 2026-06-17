// src/components/Quiz/tickets/TicketTypeSelector.tsx
// Shows available ticket types. Unavailable types are already filtered server-side
// so this component only displays what it receives.
// Shows remaining count when the type has a quantity limit.

import React from 'react';
import { CheckCircle2, Ticket, AlertTriangle } from 'lucide-react';

export interface TicketTypeOption {
  id:        string;
  name:      string;
  price:     string;
  soldCount: number;
  remaining: number | null;  // null = only limited by venue cap
}

interface TicketTypeSelectorProps {
  ticketTypes:          TicketTypeOption[];
  selectedTicketTypeId: string | null;
  onSelect:             (type: TicketTypeOption) => void;
  currencySymbol:       string;
}

export const TicketTypeSelector: React.FC<TicketTypeSelectorProps> = ({
  ticketTypes,
  selectedTicketTypeId,
  onSelect,
  currencySymbol,
}) => {
  if (ticketTypes.length === 0) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
        No ticket types are currently available for this event.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-600">
        Select the ticket type that applies to you.
      </p>

      {ticketTypes.map((type) => {
        const isSelected = selectedTicketTypeId === type.id;
        const price      = parseFloat(type.price);
        const isLow      = type.remaining !== null && type.remaining <= 5;

        return (
          <button
            key={type.id}
            type="button"
            onClick={() => onSelect(type)}
            className={[
              'w-full text-left rounded-xl border-2 p-4 transition-all',
              isSelected
                ? 'border-indigo-500 bg-indigo-50 shadow-sm'
                : 'border-gray-200 bg-white hover:border-indigo-300 hover:bg-indigo-50/40',
            ].join(' ')}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className={[
                  'flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full',
                  isSelected ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-400',
                ].join(' ')}>
                  {isSelected
                    ? <CheckCircle2 className="h-5 w-5" />
                    : <Ticket className="h-5 w-5" />}
                </div>

                <div className="min-w-0">
                  <div className={[
                    'font-semibold text-base truncate',
                    isSelected ? 'text-indigo-900' : 'text-gray-900',
                  ].join(' ')}>
                    {type.name}
                  </div>

                  {/* Remaining count hint */}
                  {type.remaining !== null && (
                    <div className={[
                      'flex items-center gap-1 text-xs mt-0.5',
                      isLow ? 'text-amber-600' : 'text-gray-500',
                    ].join(' ')}>
                      {isLow && <AlertTriangle className="h-3 w-3" />}
                      {type.remaining} remaining
                    </div>
                  )}
                </div>
              </div>

              <div className="flex-shrink-0 text-right">
                <div className={[
                  'text-xl font-bold',
                  isSelected ? 'text-indigo-700' : 'text-gray-900',
                ].join(' ')}>
                  {currencySymbol}{isNaN(price) ? type.price : price.toFixed(2)}
                </div>
                <div className="text-xs text-gray-500 mt-0.5">per ticket</div>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
};