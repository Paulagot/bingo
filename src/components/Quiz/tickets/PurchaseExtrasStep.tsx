import React, { useMemo } from 'react';
import { ChevronLeft, ChevronRight, Minus } from 'lucide-react';
import type { RoomInfo, PurchaseFormData } from './types';
import { fundraisingExtraDefinitions } from '../constants/quizMetadata';

interface Props {
  roomInfo: RoomInfo;
  formData: PurchaseFormData;
  setFormData: React.Dispatch<React.SetStateAction<PurchaseFormData>>;
  onBack: () => void;
  onContinue: () => void;
  totalAmount: number;
  extrasTotal: number;
}

type ExtraId = keyof typeof fundraisingExtraDefinitions;

export const PurchaseExtrasStep: React.FC<Props> = ({
  roomInfo,
  formData,
  setFormData,
  onBack,
  onContinue,
  totalAmount,
  extrasTotal,
}) => {
  const availableExtras = useMemo(() => {
    return (Object.entries(roomInfo.fundraisingOptions) as Array<[string, boolean]>)
      .filter(([_, enabled]) => enabled)
      .map(([extraId]) => extraId)
      .filter((extraId): extraId is ExtraId => extraId in fundraisingExtraDefinitions);
  }, [roomInfo]);

  const toggleExtra = (extraId: string) => {
    setFormData((prev) => {
      const next = prev.selectedExtras.includes(extraId)
        ? prev.selectedExtras.filter((x) => x !== extraId)
        : [...prev.selectedExtras, extraId];
      return { ...prev, selectedExtras: next };
    });
  };

  return (
    <div className="flex flex-col h-full">
      {/* Scroll */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        {/* Total card */}
        <div className="rounded-xl border border-indigo-200 bg-gradient-to-r from-indigo-50 to-purple-50 p-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="font-medium text-gray-900">Total cost</div>
              <div className="text-sm text-gray-600">
                Entry: {roomInfo.currencySymbol}
                {roomInfo.entryFee.toFixed(2)}
                {extrasTotal > 0 &&
                  ` + Extras: ${roomInfo.currencySymbol}${extrasTotal.toFixed(2)}`}
              </div>
            </div>
            <div className="text-2xl font-bold text-indigo-700">
              {roomInfo.currencySymbol}
              {totalAmount.toFixed(2)}
            </div>
          </div>

          {formData.selectedExtras.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {formData.selectedExtras.map((id) => {
                const extra = fundraisingExtraDefinitions[id as ExtraId];
                return (
                  <span
                    key={id}
                    className="inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-white px-3 py-1 text-xs"
                  >
                    <span className="text-base">{extra?.icon}</span>
                    <span className="hidden sm:inline font-medium text-gray-700">
                      {extra?.label}
                    </span>
                    <button
                      type="button"
                      onClick={() => toggleExtra(id)}
                      className="text-gray-400 hover:text-red-500"
                      aria-label="Remove extra"
                    >
                      <Minus className="h-3 w-3" />
                    </button>
                  </span>
                );
              })}
            </div>
          )}
        </div>

        {/* Sell the extras */}
        {availableExtras.length > 0 ? (
          <div className="mt-6 space-y-4">
            <div className="rounded-xl border border-yellow-200 bg-gradient-to-r from-yellow-50 to-orange-50 p-4">
              <div className="flex items-start gap-3">
                <div className="text-2xl">⚡</div>
                <div>
                  <div className="font-semibold text-yellow-900">
                    Give yourself an edge
                  </div>
                  <div className="text-sm text-yellow-800">
                    These power-ups can change the game — add one or two and play smarter.
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:gap-4 lg:grid-cols-2">
              {availableExtras.map((extraId) => {
                const extra = fundraisingExtraDefinitions[extraId];
                const price = roomInfo.fundraisingPrices[extraId] || 0;
                const isSelected = formData.selectedExtras.includes(extraId);

                return (
                  <button
                    type="button"
                    key={extraId}
                    onClick={() => toggleExtra(extraId)}
                    className={[
                      'w-full text-left rounded-xl border-2 p-4 transition',
                      isSelected
                        ? 'border-indigo-500 bg-indigo-50 shadow-sm'
                        : 'border-gray-200 bg-white hover:border-indigo-400 hover:bg-indigo-50/50',
                    ].join(' ')}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xl">{extra.icon}</span>
                          <span className="font-semibold text-gray-900 truncate">
                            {extra.label}
                          </span>
                        </div>
                        <div className="mt-1 text-sm text-gray-600">
                          {extra.description}
                        </div>

                        {/* little “why buy” line if you have it */}
                        {(extra as any).playerStrategy && (
                          <div className="mt-2 text-xs text-indigo-700 bg-indigo-50 border border-indigo-100 rounded-md px-2 py-1">
                            {(extra as any).playerStrategy}
                          </div>
                        )}
                      </div>

                      <div className="text-right flex-shrink-0">
                        <div className="text-sm font-bold text-indigo-700">
                          {roomInfo.currencySymbol}
                          {price.toFixed(2)}
                        </div>
                        <div className="mt-2 text-xs text-gray-500">
                          {isSelected ? 'Added' : 'Tap to add'}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="mt-6 rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700">
            No extras available for this quiz.
          </div>
        )}
      </div>

      {/* Footer (NOT sticky) */}
      <div className="shrink-0 border-t border-gray-200 bg-white p-4">
        <div className="flex items-center justify-between gap-3">
          <button
            onClick={onBack}
            className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:text-gray-900 sm:px-4 sm:py-3 sm:text-base"
          >
            <ChevronLeft className="h-4 w-4" />
            Back
          </button>

          <div className="text-right sm:hidden">
            <div className="text-lg font-bold text-gray-900">
              {roomInfo.currencySymbol}
              {totalAmount.toFixed(2)}
            </div>
            <div className="text-xs text-gray-500">Total</div>
          </div>

          <button
            onClick={onContinue}
            className="flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 sm:px-6 sm:py-3 sm:text-base"
          >
            Continue to Payment
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
};


