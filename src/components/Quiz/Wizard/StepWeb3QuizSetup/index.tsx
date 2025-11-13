/**
 * StepWeb3QuizSetup Component
 *
 * Web3 quiz setup step for the quiz wizard.
 * Configures host information and Web3 payment settings.
 */

import { FC, useEffect } from 'react';
import { ChevronRight, AlertCircle } from 'lucide-react';
import type { WizardStepProps } from '../WizardStepProps';
import type { SupportedChain } from '@/chains/types';
import ClearSetupButton from '../ClearSetupButton';
import Character from '../shared/components/Character';
import { useWeb3Setup } from './hooks/useWeb3Setup';
import { HostSection } from './components/HostSection';
import { Web3PaymentsSection } from './components/Web3PaymentsSection';
import { useQuizSetupStore } from '@/components/Quiz/hooks/useQuizSetupStore';

interface StepWeb3QuizSetupProps extends WizardStepProps {
  onChainUpdate?: (chain: SupportedChain) => void;
}

const StepWeb3QuizSetup: FC<StepWeb3QuizSetupProps> = ({
  onNext,
  onChainUpdate,
  onResetToFirst,
}) => {
  const { setupConfig, updateSetupConfig } = useQuizSetupStore();
  const {
    hostName,
    choice,
    currency,
    charityId,
    entryFee,
    error,
    availableTokens,
    completedSections,
    allSectionsComplete,
    currentMessage,
    setHostName,
    setChoice,
    setCurrency,
    setCharityId,
    setEntryFee,
    handleSubmit,
  } = useWeb3Setup();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  return (
    <div className="w-full space-y-3 px-2 pb-4 sm:space-y-6 sm:px-4">
      {/* Header */}
      <div className="mb-2 flex items-center justify-between px-1">
        <div>
          <h2 className="heading-2">Step 1 of 4: Web3 Quiz Setup</h2>
          <div className="text-fg/70 mt-0.5 text-xs sm:text-sm">Configure host + Web3 payments</div>
        </div>
        <ClearSetupButton
          label="Start Over"
          variant="link"
          flow="web3"
          keepIds={false}
          onCleared={onResetToFirst}
        />
      </div>

      <Character message={currentMessage} />

      {/* Host */}
      <HostSection hostName={hostName} completed={completedSections.host} onHostNameChange={setHostName} />

      {/* Chain + Token */}
      <Web3PaymentsSection
        choice={choice}
        currency={currency}
        charityId={charityId}
        entryFee={entryFee}
        availableTokens={availableTokens}
        completed={completedSections.web3}
        setupConfig={setupConfig}
        onChoiceChange={setChoice}
        onCurrencyChange={setCurrency}
        onCharityChange={setCharityId}
        onEntryFeeChange={setEntryFee}
        onUpdateConfig={updateSetupConfig}
      />

      {/* Error */}
      {error && (
        <div className="flex items-start gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {/* Navigation */}
      <div className="border-border border-t pt-4 sm:pt-6">
        <button
          onClick={() => handleSubmit(onNext, onChainUpdate)}
          disabled={!allSectionsComplete}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-3 text-sm font-medium text-white shadow-sm transition-all duration-200 hover:bg-indigo-700 hover:shadow-md disabled:cursor-not-allowed disabled:bg-gray-400 sm:ml-auto sm:w-auto sm:rounded-xl sm:px-6 sm:text-base"
        >
          <span>Continue Setup</span>
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

export default StepWeb3QuizSetup;

