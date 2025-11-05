// src/components/Quiz/Wizard/StepCombinedRounds.tsx
import React, { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Trophy, Info, CheckCircle, Trash2, Zap, Plus } from 'lucide-react';
import { useQuizSetupStore } from '../hooks/useQuizSetupStore';
import {
  roundTypeDefinitions,
  fundraisingExtraDefinitions,
  availableCategories,
  availableDifficulties,
} from '../constants/quizMetadata';
import { roundTypeDefaults } from '../constants/quiztypeconstants';
import type { RoundDefinition, RoundTypeId } from '../types/quiz';
import ClearSetupButton from './ClearSetupButton';
import type { WizardStepProps } from './WizardStepProps';

const MAX_ROUNDS = 8;
const MIN_ROUNDS = 1;

const Character = ({ message }: { message: string }) => {
  const getBubbleColor = (): string => {
    if (message.includes('Perfect!') || message.includes('configured!')) return 'bg-green-50 border-green-200';
    if (message.includes('Excellent!') || message.includes('choice!')) return 'bg-blue-50 border-blue-200';
    if (message.includes('ready') || message.includes('configured')) return 'bg-indigo-50 border-indigo-200';
    if (message.includes('template') || message.includes('Great choice')) return 'bg-blue-50 border-blue-200';
    if (message.includes('build') || message.includes('custom')) return 'bg-orange-50 border-orange-200';
    if (message.includes('Keep going!')) return 'bg-yellow-50 border-yellow-200';
    return 'bg-muted border-border';
  };

  return (
    <div className="mb-3 flex items-center gap-2 sm:mb-6 sm:gap-4">
      <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-border bg-muted sm:h-16 sm:w-16">
        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-gray-100 to-gray-300">
          <span className="text-fg/60 text-xs font-medium sm:text-sm">IMG</span>
        </div>
      </div>
      <div className={`relative flex-1 rounded-lg border p-2 shadow-lg sm:rounded-2xl sm:p-4 ${getBubbleColor()}`}>
        <p className="text-fg/80 text-xs leading-tight sm:text-sm sm:leading-normal">{message}</p>
      </div>
    </div>
  );
};

export const StepCombinedRounds: React.FC<WizardStepProps> = ({ onNext, onBack, onResetToFirst }) => {
  const { setupConfig, updateSetupConfig, flow } = useQuizSetupStore();
  const [showAddRounds, setShowAddRounds] = useState(false);

  // Always read rounds from the store (single source of truth)
  const selectedRounds: RoundDefinition[] = useMemo(
    () => setupConfig.roundDefinitions ?? [],
    [setupConfig.roundDefinitions]
  );

  // Build a new round using defaults + allowed extras
  const createRoundDefinition = (roundType: RoundTypeId, roundNumber: number): RoundDefinition => {
    const def = roundTypeDefaults[roundType];

    const validExtras = Object.entries(fundraisingExtraDefinitions)
      .filter(([_, rule]) => rule.applicableTo === 'global' || rule.applicableTo.includes(roundType))
      .reduce((acc, [key]) => {
        acc[key] = false;
        return acc;
      }, {} as Record<string, boolean>);

    return {
      roundNumber,
      roundType,
      // category/difficulty left unset until user chooses
      config: {
        ...def,
        questionsPerRound: def.questionsPerRound ?? 0,
        timePerQuestion: def.timePerQuestion ?? 0,
      },
      enabledExtras: validExtras,
    };
  };

  // Initialize defaults for custom quizzes that have no rounds yet
  useEffect(() => {
    if (setupConfig.isCustomQuiz && (!selectedRounds || selectedRounds.length === 0)) {
      const defaults: RoundDefinition[] = [
        createRoundDefinition('general_trivia', 1),
        createRoundDefinition('wipeout', 2),
        createRoundDefinition('general_trivia', 3),
      ];
      updateSetupConfig({ roundDefinitions: defaults });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setupConfig.isCustomQuiz]);

  // Add/remove/update round helpers working directly on store state
  const addRound = (roundType: RoundTypeId) => {
    if (selectedRounds.length >= MAX_ROUNDS) return;
    const newRound = createRoundDefinition(roundType, selectedRounds.length + 1);
    const updated = [...selectedRounds, newRound].map((r, i) => ({ ...r, roundNumber: i + 1 }));
    updateSetupConfig({ roundDefinitions: updated });
    setShowAddRounds(false);
  };

  const removeRound = (index: number) => {
    if (selectedRounds.length <= MIN_ROUNDS) return;
    const updated = selectedRounds
      .filter((_, i) => i !== index)
      .map((r, i) => ({ ...r, roundNumber: i + 1 }));
    updateSetupConfig({ roundDefinitions: updated });
  };

  const updateRoundField = (index: number, field: keyof RoundDefinition, value: any) => {
    const updated = selectedRounds.map((r, i) =>
      i === index ? ({ ...r, [field]: value } as RoundDefinition) : r
    );
    updateSetupConfig({ roundDefinitions: updated });
  };

  const completedRounds = selectedRounds.filter((r) => r.category && r.difficulty).length;
  const totalRounds = selectedRounds.length;
  const isComplete = completedRounds === totalRounds && totalRounds > 0;

  const getCurrentMessage = () => {
    if (setupConfig.selectedTemplate && setupConfig.selectedTemplate !== 'custom') {
      if (isComplete) return `🎉 Perfect! Your "${setupConfig.selectedTemplate}" template is ready. Feel free to customize it further!`;
      return `Great choice with "${setupConfig.selectedTemplate}"! You can modify any rounds below or keep as-is.`;
    }
    if (totalRounds === 0) return "Let's build your custom quiz! Add rounds and configure each one.";
    if (!isComplete) return `${completedRounds} of ${totalRounds} rounds configured. Keep going!`;
    return '🎉 Perfect! All rounds configured!';
  };

  const estimatedTime = selectedRounds.reduce((total, round) => {
    const config = round.config || {};
    let roundTime = 2.5; // overhead per round (mins) to match your earlier calc
    if ((config as any).totalTimeSeconds) roundTime += (config as any).totalTimeSeconds / 60;
    else if (config.questionsPerRound && config.timePerQuestion)
      roundTime += (config.questionsPerRound * config.timePerQuestion) / 60;
    return total + roundTime;
  }, 0);

  return (
    <div className="w-full space-y-3 px-2 pb-4 sm:space-y-6 sm:px-4">
      {/* Header */}
      <div className="px-1">
        <h2 className="heading-2"> Configure Rounds</h2>
        <div className="text-fg/70 mt-0.5 text-xs sm:text-sm">Set up each round with categories and difficulty levels</div>
      </div>

      <Character message={getCurrentMessage()} />

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
        {selectedRounds.map((round, index) => {
          const roundDef = roundTypeDefinitions[round.roundType];
          const isConfigured = Boolean(round.category && round.difficulty);
          const categories = availableCategories[round.roundType] || [];

          return (
            <div
              key={`${round.roundType}-${index}`}
              className={`bg-muted rounded-lg border-2 p-4 shadow-sm transition-all sm:rounded-xl sm:p-6 ${
                isConfigured ? 'border-green-300 bg-green-50' : 'border-border'
              }`}
            >
              {/* Header */}
              <div className="mb-3 flex items-start gap-3 sm:mb-4">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-blue-100 text-xl sm:h-12 sm:w-12 sm:text-2xl">
                  {roundDef.icon}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-fg text-sm font-semibold sm:text-base">
                      Round {round.roundNumber}: {roundDef.name}
                    </h3>
                    {isConfigured && <CheckCircle className="h-4 w-4 text-green-600 sm:h-5 sm:w-5" />}
                  </div>
                  <p className="text-fg/70 text-xs sm:text-sm">{roundDef.description}</p>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removeRound(index);
                  }}
                  className="p-1 text-red-400 transition-colors hover:text-red-600 disabled:opacity-50"
                  disabled={selectedRounds.length <= MIN_ROUNDS}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>

              {/* Controls */}
              <div className="space-y-3">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-fg/80 text-xs font-medium sm:text-sm">
                      Category <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={round.category || ''}
                      onChange={(e) => updateRoundField(index, 'category', e.target.value)}
                      className={`w-full rounded-lg border-2 px-3 py-2.5 text-sm outline-none transition focus:ring-2 focus:ring-indigo-200 sm:px-4 sm:py-3 sm:text-base ${
                        round.category ? 'border-green-300 bg-green-50 focus:border-green-500' : 'border-border focus:border-indigo-500'
                      }`}
                    >
                      <option value="">Select Category...</option>
                      {categories.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-fg/80 text-xs font-medium sm:text-sm">
                      Difficulty <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={round.difficulty || ''}
                      onChange={(e) => updateRoundField(index, 'difficulty', e.target.value)}
                      className={`w-full rounded-lg border-2 px-3 py-2.5 text-sm outline-none transition focus:ring-2 focus:ring-indigo-200 sm:px-4 sm:py-3 sm:text-base ${
                        round.difficulty ? 'border-green-300 bg-green-50 focus:border-green-500' : 'border-border focus:border-indigo-500'
                      }`}
                    >
                      <option value="">Select Difficulty...</option>
                      {availableDifficulties.map((diff) => (
                        <option key={diff} value={diff}>
                          {diff.charAt(0).toUpperCase() + diff.slice(1)}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Points preview */}
                {isConfigured && round.config.pointsPerDifficulty && (
                  <div className="rounded-lg border border-indigo-200 bg-gradient-to-r from-indigo-50 to-purple-50 p-3">
                    <div className="mb-2 flex items-center gap-2">
                      <Trophy className="h-4 w-4 text-indigo-600" />
                      <span className="text-xs font-medium text-indigo-900 sm:text-sm">Points System</span>
                    </div>

                    {round.roundType === 'wipeout' ? (
                      <div className="space-y-2">
                        <div className="text-center">
                          <span
                            className={`inline-flex items-center gap-1 rounded-lg px-3 py-1 text-sm font-bold ${
                              round.difficulty === 'easy'
                                ? 'bg-green-100 text-green-800'
                                : round.difficulty === 'medium'
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-red-100 text-red-800'
                            }`}
                          >
                            <Trophy className="h-3 w-3" />
                            +
                            {round.config.pointsPerDifficulty[
                              round.difficulty as keyof typeof round.config.pointsPerDifficulty
                            ]}{' '}
                            points per correct answer
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div className="rounded border border-red-200 bg-red-50 p-2 text-center">
                            <div className="font-bold text-red-700">-{round.config.pointsLostPerWrong || 2}</div>
                            <div className="text-red-600">Wrong Answer</div>
                          </div>
                          <div className="rounded border border-orange-200 bg-orange-50 p-2 text-center">
                            <div className="font-bold text-orange-700">-{round.config.pointsLostPerUnanswered || 3}</div>
                            <div className="text-orange-600">No Answer</div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center">
                        <span
                          className={`inline-flex items-center gap-1 rounded-lg px-3 py-1 text-sm font-bold ${
                            round.difficulty === 'easy'
                              ? 'bg-green-100 text-green-800'
                              : round.difficulty === 'medium'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          <Trophy className="h-3 w-3" />
                          +
                          {round.config.pointsPerDifficulty[
                            round.difficulty as keyof typeof round.config.pointsPerDifficulty
                          ]}{' '}
                          points per correct answer
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* Help */}
                {!isConfigured && (
                  <div className="flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50 p-3">
                    <Info className="mt-0.5 h-4 w-4 flex-shrink-0 text-blue-600" />
                    <p className="text-xs text-blue-700 sm:text-sm">
                      Select both category and difficulty to complete this round configuration.
                    </p>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* Add Round Button */}
        <button
          onClick={() => setShowAddRounds(!showAddRounds)}
          disabled={selectedRounds.length >= MAX_ROUNDS}
          className={`w-full rounded-lg border-2 border-dashed p-4 transition-all sm:rounded-xl sm:p-6 ${
            selectedRounds.length >= MAX_ROUNDS
              ? 'cursor-not-allowed border-gray-300 text-fg/60'
              : 'border-indigo-300 text-indigo-600 hover:border-indigo-400 hover:bg-indigo-50'
          }`}
        >
          <div className="flex items-center justify-center gap-2">
            <Plus className="h-4 w-4" />
            <span className="text-sm font-medium sm:text-base">
              {selectedRounds.length >= MAX_ROUNDS ? 'Maximum Rounds Reached (8)' : 'Add Another Round'}
            </span>
          </div>
        </button>

        {/* Add Round Options */}
        {showAddRounds && selectedRounds.length < MAX_ROUNDS && (
          <div className="space-y-3 sm:space-y-4">
            {Object.values(roundTypeDefinitions).map((type) => (
              <div
                key={type.id}
                className="bg-muted hover:shadow-md rounded-lg border-2 p-4 shadow-sm transition-all sm:rounded-xl sm:p-6"
              >
                <div className="mb-3 flex items-start gap-3 sm:mb-4">
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-blue-100 text-xl sm:h-12 sm:w-12 sm:text-2xl">
                    {type.icon}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-fg mb-1 text-sm font-semibold sm:text-base">{type.name}</h3>
                    <p className="text-fg/70 text-xs sm:text-sm">{type.description}</p>
                  </div>
                </div>

                <div className="mb-4 grid grid-cols-2 gap-3">
                  <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
                    <div className="text-xs font-medium text-blue-800 sm:text-sm">Timing</div>
                    <div className="text-xs text-blue-600 sm:text-sm">{type.timing}</div>
                  </div>
                  <div className="rounded-lg border border-purple-200 bg-purple-50 p-3">
                    <div className="text-xs font-medium text-purple-800 sm:text-sm">Difficulty Level</div>
                    <div className="text-xs text-purple-600 sm:text-sm">{type.difficulty}</div>
                  </div>
                </div>

                <button
                  onClick={() => addRound(type.id as RoundTypeId)}
                  className="btn-primary w-full sm:rounded-xl sm:py-3 sm:text-base"
                >
                  Add {type.name}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Help */}
      <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 sm:p-4">
        <h4 className="mb-2 text-sm font-medium text-blue-900 sm:text-base">💡 Round Configuration Tips</h4>
        <ul className="space-y-1 text-xs text-blue-800 sm:text-sm">
          <li>• <strong>Category</strong> determines the topic area for questions</li>
          <li>• <strong>Difficulty</strong> affects both question complexity and point values</li>
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

