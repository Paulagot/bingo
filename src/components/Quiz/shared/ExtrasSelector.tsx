// src/components/Quiz/shared/ExtrasSelector.tsx
import React from 'react';
import { Shield } from 'lucide-react';
import { fundraisingExtraDefinitions } from '../constants/quizMetadata';

type ExtraId = keyof typeof fundraisingExtraDefinitions;

interface ExtrasSelectorProps {
  availableExtras: string[];
  selectedExtras: string[];
  onToggleExtra: (extraId: string) => void;
  fundraisingPrices: Record<string, number>;
  currencySymbol: string;
  totalAmount: number;
  entryFee: number;
  extrasTotal: number;
}

export const ExtrasSelector: React.FC<ExtrasSelectorProps> = ({
  availableExtras,
  selectedExtras,
  onToggleExtra,
  fundraisingPrices,
  currencySymbol,
  totalAmount,
  entryFee,
  extrasTotal,
}) => {
  const validExtras = availableExtras.filter(
    (extraId): extraId is ExtraId => extraId in fundraisingExtraDefinitions
  );

  return (
    <div className="space-y-4">
      {/* Total Summary - Blue style matching join flow */}
      <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="font-medium text-gray-900">Total to Pay</div>
            <div className="text-sm text-gray-600">
              Entry: {currencySymbol}{entryFee.toFixed(2)}
              {extrasTotal > 0 && ` + Extras: ${currencySymbol}${extrasTotal.toFixed(2)}`}
            </div>
          </div>
          <div className="text-2xl font-bold text-blue-900">
            {currencySymbol}{totalAmount.toFixed(2)}
          </div>
        </div>
      </div>

      {/* Selected Extras - Green style like join flow */}
      {selectedExtras.length > 0 && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-4">
          <h3 className="mb-3 flex items-center space-x-2 text-green-800 font-medium">
            <Shield className="h-4 w-4" />
            <span>Your Extras</span>
          </h3>
          <div className="space-y-2">
            {selectedExtras.map((extraId) => {
              const definition = fundraisingExtraDefinitions[extraId as ExtraId];
              const price = fundraisingPrices[extraId] || 0;
              if (!definition) return null;
              
              return (
                <div
                  key={extraId}
                  className="flex items-center justify-between rounded border border-green-200 bg-white p-2"
                >
                  <div className="flex items-center space-x-2">
                    <span className="text-base">{definition.icon}</span>
                    <span className="text-sm font-medium text-green-700">
                      {definition.label}
                    </span>
                  </div>
                  <span className="text-sm font-bold text-green-700">
                    {currencySymbol}{price.toFixed(2)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Available Extras */}
      {validExtras.length > 0 ? (
        <div className="space-y-3">
          <h3 className="font-semibold text-gray-900">Available Extras</h3>
          <div className="space-y-2">
            {validExtras.map((extraId) => {
              const extra = fundraisingExtraDefinitions[extraId];
              const price = fundraisingPrices[extraId] || 0;
              const isSelected = selectedExtras.includes(extraId);

              return (
                <button
                  type="button"
                  key={extraId}
                  onClick={() => onToggleExtra(extraId)}
                  className={`w-full text-left rounded-lg border-2 p-3 transition ${
                    isSelected
                      ? 'border-green-500 bg-green-50'
                      : 'border-gray-200 bg-white hover:border-green-300 hover:bg-green-50/50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3 flex-1">
                      <span className="text-xl">{extra.icon}</span>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-gray-900">{extra.label}</div>
                        <div className="text-sm text-gray-600">{extra.description}</div>
                      </div>
                    </div>
                    <div className="ml-3 text-right flex-shrink-0">
                      <div className="text-sm font-bold text-gray-900">
                        {currencySymbol}{price.toFixed(2)}
                      </div>
                      {isSelected && (
                        <div className="text-xs text-green-600 font-medium">✓ Added</div>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600">
          No extras available for this quiz.
        </div>
      )}
    </div>
  );
};

// Helper hook for managing extras
export const useExtrasSelection = (initialExtras: string[] = []) => {
  const [selectedExtras, setSelectedExtras] = React.useState<string[]>(initialExtras);

  const toggleExtra = React.useCallback((extraId: string) => {
    setSelectedExtras((prev) =>
      prev.includes(extraId)
        ? prev.filter((x) => x !== extraId)
        : [...prev, extraId]
    );
  }, []);

  const calculateExtrasTotal = React.useCallback(
    (prices: Record<string, number>) => {
      return selectedExtras.reduce((sum, extraId) => {
        return sum + (prices[extraId] || 0);
      }, 0);
    },
    [selectedExtras]
  );

  return {
    selectedExtras,
    setSelectedExtras,
    toggleExtra,
    calculateExtrasTotal,
  };
};