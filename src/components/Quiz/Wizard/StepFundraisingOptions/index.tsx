/**
 * StepFundraisingOptions Component
 *
 * Fundraising extras configuration step for the quiz wizard.
 */

import { FC } from 'react';
import { ChevronLeft, ChevronRight, TrendingUp } from 'lucide-react';
import { useQuizSetupStore } from '@/components/Quiz/hooks/useQuizSetupStore';
import type { WizardStepProps } from '../WizardStepProps';
import ClearSetupButton from '../ClearSetupButton';
import Character from '../shared/components/Character';
import { useFundraisingOptions } from './hooks/useFundraisingOptions';
import { FundraisingCard } from './components/FundraisingCard';
import { SelectedExtraCard } from './components/SelectedExtraCard';
import { fundraisingExtraDefinitions } from '@/components/Quiz/constants/quizMetadata';

const StepFundraisingOptions: FC<WizardStepProps> = ({ onNext, onBack, onResetToFirst }) => {
  const { flow, setupConfig } = useQuizSetupStore();
  const isWeb3 = flow === 'web3';
  const currency = setupConfig.currencySymbol || '€';
  const fundraisingPrices = setupConfig.fundraisingPrices || {};

  const {
    selectedExtras,
    applicableExtras,
    totalExtraValue,
    allPricesSet,
    message,
    entitlementsLoaded,
    handleAddExtra,
    handleRemoveExtra,
    handlePriceChange,
    getSuggestedPriceRange,
  } = useFundraisingOptions();

  return (
    <div className="w-full space-y-3 px-2 pb-4 sm:space-y-6 sm:px-4">
      {/* Header */}
      <div className="px-1">
        <h2 className="heading-2">
          {isWeb3 ? 'Step 3 of 4' : 'Step 3 of 4'}: Fundraising Extras (Optional)
        </h2>
        <div className="text-fg/70 mt-0.5 text-xs sm:text-sm">
          Optional add-ons to boost engagement{isWeb3 ? ' (compatible with crypto entry fees)' : ''}
        </div>
      </div>

      <Character message={message} />

      {/* Revenue indicator */}
      <div className="rounded-lg border border-indigo-200 bg-indigo-50 p-3 sm:p-4">
        <div className="mb-1 flex items-center gap-2">
          <TrendingUp className="h-3 w-3 text-indigo-600 sm:h-4 sm:w-4" />
          <span className="text-sm font-medium text-indigo-900 sm:text-base">Potential Revenue</span>
        </div>
        <div className="text-xs text-indigo-800 sm:text-sm">
          Enabled: <strong>{selectedExtras.length}</strong> • Revenue/Device:{' '}
          <strong>
            {totalExtraValue.toFixed(2)}
            {currency}
          </strong>
        </div>
      </div>

      {/* Selected extras */}
      {selectedExtras.length > 0 && (
        <div className="space-y-3 sm:space-y-4">
          <h3 className="text-fg text-sm font-medium sm:text-base">Your Extras ({selectedExtras.length})</h3>
          <div className="space-y-2 sm:space-y-3">
            {selectedExtras.map((key) => {
              const details = fundraisingExtraDefinitions[key as keyof typeof fundraisingExtraDefinitions];
              const price = fundraisingPrices[key];

              return (
                <SelectedExtraCard
                  key={key}
                  extraKey={key}
                  details={details}
                  currency={currency}
                  price={price}
                  onRemove={() => handleRemoveExtra(key)}
                  onPriceChange={(value) => handlePriceChange(key, value)}
                  getSuggestedPriceRange={getSuggestedPriceRange}
                />
              );
            })}
          </div>

          {!allPricesSet && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-2 text-xs text-red-700 sm:text-sm">
              ⚠️ Please set prices for all selected extras before continuing.
            </div>
          )}
        </div>
      )}

      {/* Available extras */}
      {selectedExtras.length < applicableExtras.length && (
        <div className="space-y-3 sm:space-y-4">
          <h3 className="text-fg text-sm font-medium sm:text-base">Available Extras</h3>
          {!isWeb3 && !entitlementsLoaded && (
            <div className="text-fg/70 rounded-lg border border-blue-200 bg-blue-50 p-2 text-xs sm:p-3 sm:text-sm">
              Loading available extras…
            </div>
          )}
          <div className="text-fg/70 rounded-lg border border-blue-200 bg-blue-50 p-2 text-xs sm:p-3 sm:text-sm">
            💡 <strong>Tip:</strong> Tap the eye icon to see strategy details.
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
            {applicableExtras
              .filter(([key]) => !selectedExtras.includes(key))
              .map(([key, details]) => (
                <FundraisingCard
                  key={key}
                  extraKey={key}
                  details={details}
                  currency={currency}
                  onAdd={handleAddExtra}
                  getSuggestedPriceRange={getSuggestedPriceRange}
                />
              ))}
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="border-border flex justify-between border-t pt-4">
        {onBack && (
          <button onClick={onBack} className="btn-muted">
            <ChevronLeft className="h-4 w-4" />
            <span>Back</span>
          </button>
        )}

        <ClearSetupButton
          variant="ghost"
          flow={flow ?? (setupConfig.paymentMethod === 'web3' ? 'web3' : 'web2')}
          onCleared={onResetToFirst}
        />
        <button
          onClick={onNext}
          disabled={selectedExtras.length > 0 && !allPricesSet}
          className="btn-primary disabled:opacity-60"
        >
          <span>Next</span>
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

export default StepFundraisingOptions;

