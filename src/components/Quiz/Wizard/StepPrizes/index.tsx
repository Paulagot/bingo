/**
 * StepPrizes Component
 *
 * Prize configuration step for the quiz wizard.
 */

import { FC, type FormEvent } from 'react';
import { ChevronLeft, ChevronRight, Plus, Trophy, Info, AlertCircle } from 'lucide-react';
import { useQuizSetupStore } from '@/components/Quiz/hooks/useQuizSetupStore';
import type { WizardStepProps } from '../WizardStepProps';
import ClearSetupButton from '../ClearSetupButton';
import Character from '../shared/components/Character';
import { usePrizes } from './hooks/usePrizes';
import { PrizeCard } from './components/PrizeCard';

const StepPrizes: FC<WizardStepProps> = ({ onNext, onBack, onResetToFirst }) => {
  const { flow, setupConfig } = useQuizSetupStore();
  const currency = setupConfig.currencySymbol || '€';

  const {
    prizes,
    error,
    hasFirstPlace,
    totalValue,
    canAddMore,
    currentMessage,
    handlePrizeChange,
    handleAddPrize,
    handleRemovePrize,
    handleSubmit,
  } = usePrizes();

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    handleSubmit(onNext);
  };

  return (
    <div className="w-full space-y-3 px-2 pb-4 sm:space-y-6 sm:px-4">
      {/* Header */}
      <div className="px-1">
        <h2 className="heading-2">Step 4 of 4: Prizes Setup</h2>
        <div className="text-fg/70 mt-0.5 text-xs sm:text-sm">Configure manual prize distribution</div>
      </div>

      <Character message={currentMessage.message} positive={currentMessage.positive} />

      {/* Info banner */}
      <div className="rounded-lg border border-indigo-200 bg-indigo-50 p-3 sm:p-4">
        <div className="mb-1 flex items-center gap-1.5">
          <Trophy className="h-3 w-3 text-indigo-600 sm:h-4 sm:w-4" />
          <span className="text-xs font-medium text-indigo-900 sm:text-sm">Manual distribution</span>
        </div>
        <div className="text-xs text-indigo-800 sm:text-sm">
          Physical items & vouchers you'll distribute manually
          {prizes.length > 0 && ` • ${prizes.length} prize${prizes.length === 1 ? '' : 's'}`}
        </div>
      </div>

      <form onSubmit={onSubmit} className="space-y-3 sm:space-y-6">
        {/* Prize Configuration */}
        <div className="bg-muted rounded-lg border-2 border-border p-3 shadow-sm transition-all sm:p-6">
          <div className="mb-3 flex items-center justify-between sm:mb-4">
            <div className="flex items-center gap-3">
              {/* Section image placeholder */}
              <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-lg border-2 border-border bg-card sm:h-12 sm:w-12">
                <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-gray-100 to-gray-300">
                  <span className="text-fg/60 text-xs font-medium sm:text-sm">IMG</span>
                </div>
              </div>
              <div>
                <h3 className="text-fg text-sm font-semibold sm:text-base">Prize Configuration</h3>
                <p className="text-fg/70 hidden text-xs sm:block sm:text-sm">Set up rewards for your quiz winners.</p>
              </div>
            </div>

            {canAddMore && (
              <button type="button" onClick={handleAddPrize} className="btn-primary">
                <Plus className="h-4 w-4" />
                <span>Add Prize</span>
              </button>
            )}
          </div>

          <div className="space-y-3 sm:space-y-4">
            {prizes.length === 0 ? (
              <div className="text-fg/60 py-8 text-center">
                <Trophy className="mx-auto mb-2 h-8 w-8 text-fg/30 sm:h-10 sm:w-10" />
                <p className="text-xs sm:text-sm">No prizes yet. Click "Add Prize" to get started.</p>
                <p className="mt-1 text-xs text-fg/50">You need at least a 1st place prize.</p>
              </div>
            ) : (
              prizes.map((prize, index) => (
                <PrizeCard
                  key={index}
                  prize={prize}
                  index={index}
                  currency={currency}
                  onUpdate={(field, value) => handlePrizeChange(index, field, value)}
                  onRemove={() => handleRemovePrize(index)}
                />
              ))
            )}
          </div>

          {/* Add Prize Button (bottom) */}
          {prizes.length > 0 && canAddMore && (
            <div className="border-border mt-3 border-t pt-3 sm:mt-4 sm:pt-4">
              <button
                type="button"
                onClick={handleAddPrize}
                className="w-full rounded-lg border-2 border-dashed border-indigo-300 py-2 text-sm text-indigo-600 transition-colors hover:border-indigo-400 hover:bg-indigo-50 sm:py-3"
              >
                Add Another Prize (Max 10)
              </button>
            </div>
          )}
        </div>

        {/* Summary */}
        {prizes.length > 0 && (
          <div className="rounded-lg border border-green-200 bg-green-50 p-3 sm:p-4">
            <div className="mb-2 flex items-center gap-1.5">
              <Trophy className="h-4 w-4 text-green-600 sm:h-5 sm:w-5" />
              <span className="text-sm font-medium text-green-800 sm:text-base">Prize Summary</span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-xs sm:gap-4 sm:text-sm">
              <div className="rounded border border-green-200 bg-card p-2 text-center">
                <div className="text-sm font-bold text-green-700 sm:text-lg">{prizes.length}</div>
                <div className="text-green-700">Prizes</div>
              </div>
              <div className="rounded border border-green-200 bg-card p-2 text-center">
                <div className="text-sm font-bold text-green-700 sm:text-lg">
                  {currency}
                  {totalValue.toFixed(2)}
                </div>
                <div className="text-green-700">Value</div>
              </div>
              <div className="rounded border border-green-200 bg-card p-2 text-center">
                <div className="text-sm font-bold text-green-700 sm:text-lg">{hasFirstPlace ? '✓' : '✗'}</div>
                <div className="text-green-700">1st Place</div>
              </div>
            </div>
          </div>
        )}

        {/* Help */}
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 sm:p-4">
          <div className="flex items-start gap-2">
            <Info className="mt-0.5 h-4 w-4 flex-shrink-0 text-blue-600" />
            <div className="text-xs text-blue-800 sm:text-sm">
              <p className="mb-1 font-medium">Prize tips</p>
              <ul className="space-y-1">
                <li>• At least a 1st place prize is required</li>
                <li>• Include sponsors for credibility</li>
                <li>• A mix of values keeps things exciting</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-start gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <p>{error}</p>
          </div>
        )}

        {/* Navigation */}
        <div className="border-border flex justify-between border-t pt-4">
          {onBack && (
            <button type="button" onClick={onBack} className="btn-muted">
              <ChevronLeft className="h-4 w-4" />
              <span>Back</span>
            </button>
          )}
          <ClearSetupButton
            variant="ghost"
            flow={flow ?? 'web2'}
            onCleared={onResetToFirst}
          />
          <button type="submit" disabled={!hasFirstPlace} className="btn-primary disabled:opacity-60">
            <span className="hidden sm:inline">Save Prizes & Continue</span>
            <span className="sm:hidden">Continue</span>
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </form>
    </div>
  );
};

export default StepPrizes;

