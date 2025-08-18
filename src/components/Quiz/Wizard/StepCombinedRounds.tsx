// src/components/Quiz/Wizard/StepCombinedRounds.tsx
import React, { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Trophy, Info, CheckCircle, Trash2, Zap, Plus } from 'lucide-react';
import { useQuizSetupStore } from '../hooks/useQuizSetupStore';
import { roundTypeDefinitions, fundraisingExtraDefinitions, availableCategories, availableDifficulties } from '../constants/quizMetadata';
import { roundTypeDefaults } from '../constants/quiztypeconstants';
import type { RoundDefinition, RoundTypeId } from '../types/quiz';

interface StepCombinedRoundsProps {
  onNext: () => void;
  onBack: () => void;
}

const MAX_ROUNDS = 8;
const MIN_ROUNDS = 1;

const Character = ({ message }: { message: string }) => {
  const getBubbleColor = (): string => {
    if (message.includes('Perfect!') || message.includes('configured!')) {
      return 'bg-green-50 border-green-200';
    }
    if (message.includes('Excellent!') || message.includes('choice!')) {
      return 'bg-blue-50 border-blue-200';
    }
    if (message.includes('ready') || message.includes('configured')) {
      return 'bg-indigo-50 border-indigo-200';
    }
    if (message.includes('template') || message.includes('Great choice')) {
      return 'bg-blue-50 border-blue-200';
    }
    if (message.includes('build') || message.includes('custom')) {
      return 'bg-orange-50 border-orange-200';
    }
    if (message.includes('Keep going!')) {
      return 'bg-yellow-50 border-yellow-200';
    }
    return 'bg-gray-50 border-gray-200';
  };

  return (
    <div className="flex items-center gap-2 sm:gap-4 mb-3 sm:mb-6">
      {/* Character Image Placeholder */}
      <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-gray-200 border-2 border-gray-300 flex items-center justify-center flex-shrink-0 overflow-hidden">
        {/* TODO: Replace with actual character image */}
        <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-300 flex items-center justify-center">
          <span className="text-gray-500 text-xs sm:text-sm font-medium">IMG</span>
        </div>
      </div>
      <div className={`relative rounded-lg sm:rounded-2xl p-2 sm:p-4 shadow-lg border flex-1 ${getBubbleColor()}`}>
        <p className="text-gray-700 text-xs sm:text-sm leading-tight sm:leading-normal">{message}</p>
      </div>
    </div>
  );
};

export const StepCombinedRounds: React.FC<StepCombinedRoundsProps> = ({ onNext, onBack }) => {
  const { setupConfig, updateSetupConfig } = useQuizSetupStore();
  const [selectedRounds, setSelectedRounds] = useState<RoundDefinition[]>([]);
  const [showAddRounds, setShowAddRounds] = useState(false);

  useEffect(() => {
    if (setupConfig.isCustomQuiz) {
      // Custom quiz - start with default empty rounds
      if (!setupConfig.roundDefinitions || setupConfig.roundDefinitions.length === 0) {
        const defaultRounds: RoundDefinition[] = [
          createRoundDefinition('general_trivia', 1),
          createRoundDefinition('wipeout', 2),
          createRoundDefinition('general_trivia', 3),
        ];
        setSelectedRounds(defaultRounds);
        updateSetupConfig({ roundDefinitions: defaultRounds });
      } else {
        setSelectedRounds(setupConfig.roundDefinitions);
      }
    } else {
      // Template selected - rounds should already be populated from previous step
      if (setupConfig.roundDefinitions && setupConfig.roundDefinitions.length > 0) {
        setSelectedRounds(setupConfig.roundDefinitions);
      }
    }
  }, [setupConfig.roundDefinitions, setupConfig.isCustomQuiz, updateSetupConfig]);

  const createRoundDefinition = (roundType: RoundTypeId, roundNumber: number): RoundDefinition => {
    const def = roundTypeDefaults[roundType];

    const validExtras = Object.entries(fundraisingExtraDefinitions)
      .filter(([_, rule]) =>
        rule.applicableTo === 'global' || rule.applicableTo.includes(roundType)
      )
      .reduce((acc, [key]) => {
        acc[key] = false;
        return acc;
      }, {} as Record<string, boolean>);

    return {
      roundNumber,
      roundType,
      config: {
        ...def,
        questionsPerRound: def.questionsPerRound ?? 0,
        timePerQuestion: def.timePerQuestion ?? 0,
      },
      enabledExtras: validExtras,
    };
  };

  const addRound = (roundType: RoundTypeId) => {
    if (selectedRounds.length >= MAX_ROUNDS) return;

    const newRound = createRoundDefinition(roundType, selectedRounds.length + 1);
    const updatedRounds = [...selectedRounds, newRound];
    const renumberedRounds = updatedRounds.map((round, index) => ({ ...round, roundNumber: index + 1 }));

    setSelectedRounds(renumberedRounds);
    updateSetupConfig({ roundDefinitions: renumberedRounds });
    setShowAddRounds(false);
  };

  const removeRound = (index: number) => {
    if (selectedRounds.length <= MIN_ROUNDS) return;

    const updatedRounds = selectedRounds.filter((_, i) => i !== index);
    const renumberedRounds = updatedRounds.map((round, i) => ({ ...round, roundNumber: i + 1 }));

    setSelectedRounds(renumberedRounds);
    updateSetupConfig({ roundDefinitions: renumberedRounds });
  };

  const updateRound = (index: number, field: keyof RoundDefinition, value: any) => {
    const updatedRounds = [...selectedRounds];
    updatedRounds[index] = { ...updatedRounds[index], [field]: value };
    
    setSelectedRounds(updatedRounds);
    updateSetupConfig({ roundDefinitions: updatedRounds });
  };

  const getCurrentMessage = () => {
    const completedRounds = selectedRounds.filter(r => r.category && r.difficulty).length;
    const totalRounds = selectedRounds.length;

    if (setupConfig.selectedTemplate && setupConfig.selectedTemplate !== 'custom') {
      // Template was selected
      if (completedRounds === totalRounds && totalRounds > 0) {
        return `🎉 Perfect! Your "${setupConfig.selectedTemplate}" template is ready. Feel free to customize it further!`;
      }
      return `Great choice with "${setupConfig.selectedTemplate}"! You can modify any rounds below or keep as-is.`;
    }
    
    // Custom quiz logic
    if (completedRounds === 0 && totalRounds === 0) {
      return "Let's build your custom quiz! Add rounds and configure each one.";
    }
    if (completedRounds === 0 && totalRounds > 0) {
      return "Great! Now configure each round below. Select a category and difficulty for each round. Add, remove and rearrange rounds as needed.";
    }
    if (completedRounds === totalRounds && totalRounds > 0) {
      return "🎉 Perfect! All rounds configured!";
    }
    return `${completedRounds} of ${totalRounds} rounds configured. Keep going!`;
  };

  const completedRounds = selectedRounds.filter(r => r.category && r.difficulty).length;
  const totalRounds = selectedRounds.length;
  const isComplete = completedRounds === totalRounds && totalRounds > 0;

  const estimatedTime = selectedRounds.reduce((total, round) => {
    const config = round.config;
    let roundTime = 2.5;
    
    if (config.totalTimeSeconds) {
      roundTime += config.totalTimeSeconds / 60;
    } else if (config.questionsPerRound && config.timePerQuestion) {
      roundTime += (config.questionsPerRound * config.timePerQuestion) / 60;
    }
    
    return total + roundTime;
  }, 0);

  return (
    <div className="w-full px-2 sm:px-4 space-y-3 sm:space-y-6 pb-4">
      {/* Header */}
      <div className="px-1">
        <h2 className="text-base sm:text-xl font-semibold text-indigo-800">Step 3 of 4: Configure Rounds</h2>
        <div className="text-xs sm:text-sm text-gray-600 mt-0.5">Set up each round with categories and difficulty levels</div>
      </div>

      <Character message={getCurrentMessage()} />

      {/* Progress indicator */}
      <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-3 sm:p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <Zap className="w-3 h-3 sm:w-4 sm:h-4 text-indigo-600" />
            <span className="font-medium text-indigo-800 text-xs sm:text-sm">Progress</span>
          </div>
          <span className="text-xs sm:text-sm text-indigo-700">
            {totalRounds} rounds • {completedRounds} done • ~{Math.round(estimatedTime)}min
          </span>
        </div>
        <div className="w-full bg-indigo-200 rounded-full h-1.5 sm:h-2">
          <div 
            className="bg-indigo-600 h-1.5 sm:h-2 rounded-full transition-all duration-300"
            style={{ width: `${totalRounds > 0 ? (completedRounds / totalRounds) * 100 : 0}%` }}
          />
        </div>
      </div>

      {/* Round Configuration Cards */}
      <div className="space-y-3 sm:space-y-4">
        {selectedRounds.map((round, index) => {
          const roundDef = roundTypeDefinitions[round.roundType];
          const isConfigured = round.category && round.difficulty;
          const categories = availableCategories[round.roundType] || [];
          
          return (
            <div 
              key={`${round.roundType}-${index}`}
              className={`bg-white border-2 rounded-lg sm:rounded-xl p-4 sm:p-6 shadow-sm transition-all ${
                isConfigured ? 'border-green-300 bg-green-50' : 'border-gray-200'
              }`}
            >
              {/* Round Header */}
              <div className="flex items-start gap-3 mb-3 sm:mb-4">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg flex items-center justify-center text-xl sm:text-2xl bg-blue-100 flex-shrink-0">
                  {roundDef.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-gray-900 text-sm sm:text-base">
                      Round {round.roundNumber}: {roundDef.name}
                    </h3>
                    {isConfigured && <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" />}
                  </div>
                  <p className="text-xs sm:text-sm text-gray-600">{roundDef.description}</p>
                </div>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    removeRound(index);
                  }} 
                  className="p-1 text-red-400 hover:text-red-600 transition-colors"
                  disabled={selectedRounds.length <= MIN_ROUNDS}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              {/* Configuration */}
              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <label className="text-xs sm:text-sm font-medium text-gray-700">
                      Category <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={round.category || ''}
                      onChange={(e) => updateRound(index, 'category', e.target.value)}
                      className={`w-full px-3 sm:px-4 py-2.5 sm:py-3 border-2 rounded-lg focus:ring-2 focus:ring-indigo-200 outline-none transition text-sm sm:text-base ${
                        round.category 
                          ? 'border-green-300 bg-green-50 focus:border-green-500' 
                          : 'border-gray-200 focus:border-indigo-500'
                      }`}
                    >
                      <option value="">Select Category...</option>
                      {categories.map((cat) => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs sm:text-sm font-medium text-gray-700">
                      Difficulty <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={round.difficulty || ''}
                      onChange={(e) => updateRound(index, 'difficulty', e.target.value)}
                      className={`w-full px-3 sm:px-4 py-2.5 sm:py-3 border-2 rounded-lg focus:ring-2 focus:ring-indigo-200 outline-none transition text-sm sm:text-base ${
                        round.difficulty 
                          ? 'border-green-300 bg-green-50 focus:border-green-500' 
                          : 'border-gray-200 focus:border-indigo-500'
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
                  <div className="p-3 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg border border-indigo-200">
                    <div className="flex items-center gap-2 mb-2">
                      <Trophy className="w-4 h-4 text-indigo-600" />
                      <span className="text-xs sm:text-sm font-medium text-indigo-900">Points System</span>
                    </div>
                    
                    {round.roundType === 'wipeout' ? (
                      <div className="space-y-2">
                        <div className="text-center">
                          <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-lg font-bold text-sm ${
                            round.difficulty === 'easy' ? 'bg-green-100 text-green-800' :
                            round.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            <Trophy className="w-3 h-3" />
                            +{round.config.pointsPerDifficulty[round.difficulty as keyof typeof round.config.pointsPerDifficulty]} points per correct answer
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div className="text-center p-2 bg-red-50 rounded border border-red-200">
                            <div className="font-bold text-red-700">-{round.config.pointsLostPerWrong || 2}</div>
                            <div className="text-red-600">Wrong Answer</div>
                          </div>
                          <div className="text-center p-2 bg-orange-50 rounded border border-orange-200">
                            <div className="font-bold text-orange-700">-{round.config.pointslostperunanswered || 3}</div>
                            <div className="text-orange-600">No Answer</div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center">
                        <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-lg font-bold text-sm ${
                          round.difficulty === 'easy' ? 'bg-green-100 text-green-800' :
                          round.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          <Trophy className="w-3 h-3" />
                          +{round.config.pointsPerDifficulty[round.difficulty as keyof typeof round.config.pointsPerDifficulty]} points per correct answer
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* Help text */}
                {!isConfigured && (
                  <div className="flex items-start gap-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <Info className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                    <p className="text-xs sm:text-sm text-blue-700">
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
          className={`w-full border-2 border-dashed rounded-lg sm:rounded-xl p-4 sm:p-6 transition-all ${
            selectedRounds.length >= MAX_ROUNDS
              ? 'border-gray-300 text-gray-500 cursor-not-allowed'
              : 'border-indigo-300 text-indigo-600 hover:border-indigo-400 hover:bg-indigo-50'
          }`}
        >
          <div className="flex items-center justify-center gap-2">
            <Plus className="w-4 h-4" />
            <span className="text-sm sm:text-base font-medium">
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
                className="bg-white border-2 rounded-lg sm:rounded-xl p-4 sm:p-6 shadow-sm transition-all hover:shadow-md"
              >
                <div className="flex items-start gap-3 mb-3 sm:mb-4">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-blue-100 flex items-center justify-center text-xl sm:text-2xl flex-shrink-0">
                    {type.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 text-sm sm:text-base mb-1">{type.name}</h3>
                    <p className="text-xs sm:text-sm text-gray-600">{type.description}</p>
                  </div>
                </div>
                
                {/* Key info */}
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                    <div className="text-xs sm:text-sm font-medium text-blue-800">Timing</div>
                    <div className="text-xs sm:text-sm text-blue-600">{type.timing}</div>
                  </div>
                  <div className="bg-purple-50 p-3 rounded-lg border border-purple-200">
                    <div className="text-xs sm:text-sm font-medium text-purple-800">Difficulty Level</div>
                    <div className="text-xs sm:text-sm text-purple-600">{type.difficulty}</div>
                  </div>
                </div>
                
                {/* Points preview */}
                <div className="mb-4 p-3 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg border border-indigo-200">
                  <div className="text-xs sm:text-sm font-medium text-indigo-900 mb-2">Points System</div>
                  
                  {type.id === 'wipeout' ? (
                    <div className="space-y-2">
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        <div className="text-center p-2 bg-green-100 rounded border border-green-200">
                          <div className="font-bold text-green-700">+{type.defaultConfig.pointsPerDifficulty?.easy}</div>
                          <div className="text-green-600">Easy</div>
                        </div>
                        <div className="text-center p-2 bg-yellow-100 rounded border border-yellow-200">
                          <div className="font-bold text-yellow-700">+{type.defaultConfig.pointsPerDifficulty?.medium}</div>
                          <div className="text-yellow-600">Medium</div>
                        </div>
                        <div className="text-center p-2 bg-red-100 rounded border border-red-200">
                          <div className="font-bold text-red-700">+{type.defaultConfig.pointsPerDifficulty?.hard}</div>
                          <div className="text-red-600">Hard</div>
                        </div>
                      </div>
                      <div className="text-center text-xs text-red-600 font-medium">High risk, high reward format</div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div className="text-center p-2 bg-green-100 rounded border border-green-200">
                        <div className="font-bold text-green-700">+{type.defaultConfig.pointsPerDifficulty?.easy}</div>
                        <div className="text-green-600">Easy</div>
                      </div>
                      <div className="text-center p-2 bg-yellow-100 rounded border border-yellow-200">
                        <div className="font-bold text-yellow-700">+{type.defaultConfig.pointsPerDifficulty?.medium}</div>
                        <div className="text-yellow-600">Medium</div>
                      </div>
                      <div className="text-center p-2 bg-red-100 rounded border border-red-200">
                        <div className="font-bold text-red-700">+{type.defaultConfig.pointsPerDifficulty?.hard}</div>
                        <div className="text-red-600">Hard</div>
                      </div>
                    </div>
                  )}
                </div>
                
                <button
                  onClick={() => addRound(type.id)}
                  className="w-full py-2.5 sm:py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg sm:rounded-xl font-medium text-sm sm:text-base transition-all duration-200 shadow-sm hover:shadow-md"
                >
                  Add {type.name}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Help section */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 sm:p-4">
        <h4 className="font-medium text-blue-900 mb-2 text-sm sm:text-base">💡 Round Configuration Tips</h4>
        <ul className="text-xs sm:text-sm text-blue-800 space-y-1">
          <li>• <strong>Category</strong> determines the topic area for questions</li>
          <li>• <strong>Difficulty</strong> affects both question complexity and point values</li>
          <li>• Mix different difficulties to create an engaging progression</li>
          <li>• Wipeout rounds offer higher points but with penalties for wrong answers</li>
        </ul>
      </div>

      {/* Navigation */}
      <div className="flex justify-between pt-4 border-t border-gray-200">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-800 transition-colors text-sm sm:text-base"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Back</span>
        </button>
        <button
          onClick={onNext}
          disabled={!isComplete}
          className={`flex items-center gap-2 px-4 sm:px-6 py-3 rounded-lg sm:rounded-xl transition-all duration-200 shadow-sm hover:shadow-md font-medium text-sm sm:text-base ${
            isComplete
              ? 'bg-indigo-600 hover:bg-indigo-700 text-white'
              : 'bg-gray-400 text-white cursor-not-allowed'
          }`}
        >
          <span>Continue Setup</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default StepCombinedRounds;