/**
 * StepWeb3Prizes Component
 *
 * Web3 prize configuration step for the quiz wizard.
 * Allows users to configure prize pool allocation or external assets.
 */

import { type FC, type FormEvent } from 'react';
import { AlertCircle, ChevronLeft, ChevronRight, Info } from 'lucide-react';
import type { WizardStepProps } from '../WizardStepProps';
import ClearSetupButton from '../ClearSetupButton';
import Character from '../shared/components/Character';
import { usePrizeConfiguration } from './hooks/usePrizeConfiguration';
import { AllocationOverview } from './components/AllocationOverview';
import { PrizeSourceSelector } from './components/PrizeSourceSelector';
import { PersonalTakeSection } from './components/PersonalTakeSection';
import { PrizePoolSection } from './components/PrizePoolSection';
import { ExternalAssetsSection } from './components/ExternalAssetsSection';

const PLATFORM_PCT = 20; // Fixed platform fee

const StepWeb3Prizes: FC<WizardStepProps> = ({ onNext, onBack, onResetToFirst }) => {
  const {
    prizeSource,
    personalTake,
    prizePoolPct,
    splits,
    externalPrizes,
    error,
    maxPrizePool,
    charityPct,
    totalPrizeSplit,
    currentMessage,
    setPrizeSource,
    setPersonalTake,
    setPrizePoolPct,
    handleSplitChange,
    handleExternalPrizeChange,
    handleClearPrize,
    handleSubmit,
    setError,
  } = usePrizeConfiguration(onNext);

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    handleSubmit();
  };

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="heading-2">Step 4 of 4: Prize Pool Configuration</h2>
        <div className="text-fg/70 text-xs md:text-sm">Configure Web3 prize distribution</div>
      </div>

      {/* Character with message */}
      <Character message={currentMessage} />

      {/* Allocation overview */}
      <AllocationOverview
        charityPct={charityPct}
        personalTake={personalTake}
        prizePoolPct={prizePoolPct}
        prizeSource={prizeSource}
        platformPct={PLATFORM_PCT}
      />

      <form onSubmit={onSubmit} className="space-y-6">
        {/* Prize source */}
        <PrizeSourceSelector prizeSource={prizeSource} onSourceChange={setPrizeSource} />

        {/* Personal take */}
        <PersonalTakeSection personalTake={personalTake} onPersonalTakeChange={setPersonalTake} />

        {/* Pool config */}
        {prizeSource === 'pool' && (
          <PrizePoolSection
            prizePoolPct={prizePoolPct}
            maxPrizePool={maxPrizePool}
            splits={splits}
            totalPrizeSplit={totalPrizeSplit}
            onPrizePoolPctChange={setPrizePoolPct}
            onSplitChange={handleSplitChange}
          />
        )}

        {/* External assets config */}
        {prizeSource === 'assets' && (
          <ExternalAssetsSection
            externalPrizes={externalPrizes}
            onPrizeChange={handleExternalPrizeChange}
            onClearPrize={handleClearPrize}
          />
        )}

        {/* Help */}
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
          <div className="flex items-start space-x-2">
            <Info className="mt-0.5 h-4 w-4 flex-shrink-0 text-blue-600" />
            <div className="text-sm text-blue-800">
              <p className="mb-1 font-medium">Prize Pool Guidelines</p>
              <ul className="space-y-1 text-xs">
                <li>• Minimum 40% always goes to charity</li>
                <li>• Platform reserves 20%</li>
                <li>• Remaining 40% is yours to allocate (personal up to 5%, and/or prizes up to 40% combined)</li>
                <li>• Any unused allocation goes to charity</li>
                <li>• External assets are provided separately from the fund pool</li>
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
        <div className="border-border flex justify-between border-t pt-6">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="text-fg/70 hover:text-fg flex items-center space-x-2 transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
              <span>Back</span>
            </button>
          )}

          <div className="flex items-center gap-3">
            <ClearSetupButton
              label="Start Over"
              variant="ghost"
              size="sm"
              keepIds={false}
              flow="web3"
              onCleared={onResetToFirst}
            />

            <button
              type="submit"
              className="flex items-center space-x-2 rounded-xl bg-indigo-600 px-4 py-2 text-white shadow-sm transition-all duration-200 hover:bg-indigo-700 hover:shadow-md disabled:cursor-not-allowed disabled:bg-gray-400 md:px-6 md:py-3"
            >
              <span>Save & Continue</span>
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default StepWeb3Prizes;

