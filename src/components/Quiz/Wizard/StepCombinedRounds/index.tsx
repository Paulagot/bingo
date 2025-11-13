/**
 * StepCombinedRounds Component
 *
 * Round configuration step for the quiz wizard.
 */

import { FC } from 'react';
import { ChevronLeft, ChevronRight, Zap, Plus } from 'lucide-react';
import { useQuizSetupStore } from '@/components/Quiz/hooks/useQuizSetupStore';
import type { WizardStepProps } from '../WizardStepProps';
import ClearSetupButton from '../ClearSetupButton';
import Character from '../shared/components/Character';
import { useRounds } from './hooks/useRounds';
import { RoundCard } from './components/RoundCard';
import { AddRoundOptions } from './components/AddRoundOptions';

const StepCombinedRounds: FC<WizardStepProps> = ({ onNext, onBack, onResetToFirst }) => {
  const { flow, setupConfig } = useQuizSetupStore();
  const {
    selectedRounds,
    showAddRounds,
    completedRounds,
    totalRounds,
    isComplete,
    estimatedTime,
    currentMessage,
    canAddMore,
    canRemove,
    addRound,
    removeRound,
    updateRoundField,
    setShowAddRounds,
  } = useRounds();

  return (
    <div className="w-full space-y-3 px-2 pb-4 sm:space-y-6 sm:px-4">
      {/* Header */}
      <div className="px-1">
        <h2 className="heading-2">Configure Rounds</h2>
        <div className="text-fg/70 mt-0.5 text-xs sm:text-sm">
          Set up each round with categories and difficulty levels
        </div>
      </div>

      <Character message={currentMessage} />

      {/* Progress */}
      <div className="rounded-lg border border-indigo-200 bg-indigo-50 p-3 sm:p-4">
        <div className="mb-2 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Zap className="h-3 w-3 text-indigo-600 sm:h-4 sm:w-4" />
            <span className="text-xs font-medium text-indigo-800 sm:text-sm">Progress</span>
          </div>
          <span className="text-xs text-indigo-700 sm:text-sm">
            {totalRounds} rounds • {completedRounds} done • ~{Math.round(estimatedTime)}min
          </span>
        </div>
        <div className="h-1.5 w-full rounded-full bg-indigo-200 sm:h-2">
          <div
            className="h-1.5 rounded-full bg-indigo-600 transition-all duration-300 sm:h-2"
            style={{ width: `${totalRounds > 0 ? (completedRounds / totalRounds) * 100 : 0}%` }}
          />
        </div>
      </div>

      {/* Round cards */}
      <div className="space-y-3 sm:space-y-4">
        {selectedRounds.map((round, index) => (
          <RoundCard
            key={`${round.roundType}-${index}`}
            round={round}
            index={index}
            canRemove={canRemove}
            onUpdate={(field, value) => updateRoundField(index, field, value)}
            onRemove={() => removeRound(index)}
          />
        ))}

        {/* Add Round Button */}
        <button
          onClick={() => setShowAddRounds(!showAddRounds)}
          disabled={!canAddMore}
          className={`w-full rounded-lg border-2 border-dashed p-4 transition-all sm:rounded-xl sm:p-6 ${
            !canAddMore
              ? 'cursor-not-allowed border-gray-300 text-fg/60'
              : 'border-indigo-300 text-indigo-600 hover:border-indigo-400 hover:bg-indigo-50'
          }`}
        >
          <div className="flex items-center justify-center gap-2">
            <Plus className="h-4 w-4" />
            <span className="text-sm font-medium sm:text-base">
              {!canAddMore ? 'Maximum Rounds Reached (8)' : 'Add Another Round'}
            </span>
          </div>
        </button>

        {/* Add Round Options */}
        {showAddRounds && canAddMore && <AddRoundOptions onAddRound={addRound} />}
      </div>

      {/* Help */}
      <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 sm:p-4">
        <h4 className="mb-2 text-sm font-medium text-blue-900 sm:text-base">💡 Round Configuration Tips</h4>
        <ul className="space-y-1 text-xs text-blue-800 sm:text-sm">
          <li>
            • <strong>Category</strong> determines the topic area for questions
          </li>
          <li>
            • <strong>Difficulty</strong> affects both question complexity and point values
          </li>
          <li>• Mix different difficulties to create an engaging progression</li>
          <li>• Wipeout rounds offer higher points but with penalties for wrong answers</li>
        </ul>
      </div>

      {/* Navigation */}
      <div className="border-border flex justify-between border-t pt-4">
        <button onClick={onBack} className="btn-muted">
          <ChevronLeft className="h-4 w-4" />
          <span>Back</span>
        </button>

        <ClearSetupButton
          label="Start Over"
          variant="ghost"
          size="sm"
          keepIds={false}
          flow={flow ?? (setupConfig.paymentMethod === 'web3' ? 'web3' : 'web2')}
          onCleared={onResetToFirst}
        />

        <button
          onClick={onNext}
          disabled={!isComplete}
          className="btn-primary sm:rounded-xl sm:px-6 sm:py-3 sm:text-base"
        >
          <span>Continue Setup</span>
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

export default StepCombinedRounds;

