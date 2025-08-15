import React, { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Trophy, Info, CheckCircle, Trash2, GripVertical, Zap, Plus } from 'lucide-react';
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

const Character = ({ expression, message }: { expression: string; message: string }) => {
  const getCharacterStyle = (): string => {
    const base = "w-8 h-8 sm:w-16 sm:h-16 rounded-full flex items-center justify-center text-lg sm:text-2xl transition-all duration-300";
    switch (expression) {
      case "excited": return `${base} bg-gradient-to-br from-indigo-400 to-purple-500 animate-bounce`;
      case "explaining": return `${base} bg-gradient-to-br from-purple-400 to-pink-500 animate-pulse`;
      case "strategic": return `${base} bg-gradient-to-br from-orange-400 to-red-500`;
      case "encouraging": return `${base} bg-gradient-to-br from-green-400 to-blue-500`;
      default: return `${base} bg-gradient-to-br from-gray-400 to-gray-600`;
    }
  };

  const getEmoji = (): string => {
    switch (expression) {
      case "excited": return "🎯";
      case "explaining": return "💡";
      case "strategic": return "🧠";
      case "encouraging": return "⚡";
      default: return "😊";
    }
  };

  return (
    <div className="flex items-center gap-2 sm:gap-4 mb-3 sm:mb-6">
      <div className={getCharacterStyle()}>{getEmoji()}</div>
      <div className="relative bg-white rounded-lg sm:rounded-2xl p-2 sm:p-4 shadow-lg border border-gray-200 flex-1">
        <p className="text-gray-700 text-xs sm:text-base leading-tight sm:leading-normal">{message}</p>
      </div>
    </div>
  );
};

export const StepCombinedRounds: React.FC<StepCombinedRoundsProps> = ({ onNext, onBack }) => {
  const { setupConfig, updateSetupConfig } = useQuizSetupStore();
  const [selectedRounds, setSelectedRounds] = useState<RoundDefinition[]>([]);
  const [showAddRounds, setShowAddRounds] = useState(false);

  useEffect(() => {
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
  }, [setupConfig.roundDefinitions, updateSetupConfig]);

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

    if (completedRounds === 0 && totalRounds === 0) {
      return { 
        expression: "explaining", 
        message: "Let's build your quiz! Add rounds and configure each one." 
      };
    }
    if (completedRounds === 0 && totalRounds > 0) {
      return { 
        expression: "encouraging", 
        message: "Great! Now configure each round below." 
      };
    }
    if (completedRounds === totalRounds && totalRounds > 0) {
      return { 
        expression: "excited", 
        message: "Perfect! All rounds configured!" 
      };
    }
    return { 
      expression: "strategic", 
      message: `${completedRounds} of ${totalRounds} rounds configured. Keep going!` 
    };
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
        <h2 className="text-base sm:text-xl font-semibold text-indigo-800">Step 2 of 4: Build Quiz Rounds</h2>
        <div className="text-xs sm:text-sm text-gray-600 mt-0.5">Add rounds and configure them</div>
      </div>

      <Character {...getCurrentMessage()} />

      {/* Progress indicator - Compact */}
      <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-2 sm:p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <Zap className="w-3 h-3 sm:w-4 sm:h-4 text-indigo-600" />
            <span className="font-medium text-indigo-800 text-xs sm:text-base">Progress</span>
          </div>
          <span className="text-xs text-indigo-700">
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

      {/* Round Configuration Cards - Mobile optimized */}
      <div className="space-y-2 sm:space-y-4">
        {selectedRounds.map((round, index) => {
          const roundDef = roundTypeDefinitions[round.roundType];
          const isConfigured = round.category && round.difficulty;
          const categories = availableCategories[round.roundType] || [];
          
          return (
            <div 
              key={`${round.roundType}-${index}`}
              className={`border rounded-lg transition-all ${
                isConfigured ? 'bg-green-50 border-green-300' : 'bg-white border-gray-300'
              }`}
            >
              {/* Round Header - Simplified for mobile */}
              <div className="p-3 sm:p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                    <GripVertical className="w-3 h-3 sm:w-4 sm:h-4 text-gray-400 hidden sm:block" />
                    <div className="w-8 h-8 sm:w-12 sm:h-12 rounded bg-gray-100 flex items-center justify-center text-sm sm:text-2xl flex-shrink-0">
                      {roundDef.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-gray-900 text-sm sm:text-lg truncate">
                        Round {round.roundNumber}: {roundDef.name}
                      </h4>
                      <p className="text-xs sm:text-sm text-gray-600 hidden sm:block">{roundDef.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {isConfigured && <CheckCircle className="w-4 h-4 text-green-600" />}
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        removeRound(index);
                      }} 
                      className="p-1 text-red-400 hover:text-red-600 transition-colors"
                      disabled={selectedRounds.length <= MIN_ROUNDS}
                    >
                      <Trash2 className="w-3 h-3 sm:w-4 sm:h-4" />
                    </button>
                  </div>
                </div>

                {/* Configuration - Inline on mobile */}
                <div className="mt-3 space-y-2 sm:space-y-3">
                  <div className="flex gap-2">
                    <select
                      value={round.category || ''}
                      onChange={(e) => updateRound(index, 'category', e.target.value)}
                      className={`flex-1 border rounded px-2 py-1.5 sm:px-3 sm:py-2 text-xs sm:text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 ${
                        round.category 
                          ? 'border-green-400 bg-green-50' 
                          : 'border-gray-300 bg-white'
                      }`}
                    >
                      <option value="">Category...</option>
                      {categories.map((cat) => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>

                    <select
                      value={round.difficulty || ''}
                      onChange={(e) => updateRound(index, 'difficulty', e.target.value)}
                      className={`flex-1 border rounded px-2 py-1.5 sm:px-3 sm:py-2 text-xs sm:text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 ${
                        round.difficulty 
                          ? 'border-green-400 bg-green-50' 
                          : 'border-gray-300 bg-white'
                      }`}
                    >
                      <option value="">Difficulty...</option>
                      {availableDifficulties.map((diff) => (
                        <option key={diff} value={diff}>
                          {diff.charAt(0).toUpperCase() + diff.slice(1)}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Points preview - Compact */}
                  {isConfigured && round.config.pointsPerDifficulty && (
                    <div className="p-2 bg-gradient-to-r from-indigo-50 to-purple-50 rounded border border-indigo-200">
                      <div className="flex items-center gap-1.5 mb-1">
                        <Trophy className="w-3 h-3 sm:w-4 sm:h-4 text-indigo-600" />
                        <span className="text-xs sm:text-sm font-medium text-indigo-900">Points</span>
                      </div>
                      
                      {round.roundType === 'wipeout' ? (
                        <div className="space-y-2">
                          <div className="text-center">
                            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded font-bold text-sm ${
                              round.difficulty === 'easy' ? 'bg-green-100 text-green-800' :
                              round.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-red-100 text-red-800'
                            }`}>
                              <Trophy className="w-3 h-3" />
                              +{round.config.pointsPerDifficulty[round.difficulty as keyof typeof round.config.pointsPerDifficulty]}
                            </span>
                          </div>
                          <div className="grid grid-cols-2 gap-1 text-xs">
                            <div className="text-center p-1 bg-red-50 rounded border border-red-200">
                              <div className="font-bold text-red-700">-{round.config.pointsLostPerWrong || 2}</div>
                              <div className="text-red-600">Wrong</div>
                            </div>
                            <div className="text-center p-1 bg-orange-50 rounded border border-orange-200">
                              <div className="font-bold text-orange-700">-{round.config.pointslostperunanswered || 3}</div>
                              <div className="text-orange-600">Skip</div>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center">
                          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded font-bold text-sm ${
                            round.difficulty === 'easy' ? 'bg-green-100 text-green-800' :
                            round.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            <Trophy className="w-3 h-3" />
                            +{round.config.pointsPerDifficulty[round.difficulty as keyof typeof round.config.pointsPerDifficulty]} points
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Help text */}
                  {!isConfigured && (
                    <div className="flex items-start gap-1.5 p-2 bg-blue-50 rounded border border-blue-200">
                      <Info className="w-3 h-3 sm:w-4 sm:h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                      <p className="text-xs text-blue-700">
                        Select category and difficulty to complete this round.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {/* Add Round Button - Simplified */}
        <button
          onClick={() => setShowAddRounds(!showAddRounds)}
          disabled={selectedRounds.length >= MAX_ROUNDS}
          className={`w-full border-2 border-dashed rounded-lg p-3 sm:p-4 transition-colors ${
            selectedRounds.length >= MAX_ROUNDS
              ? 'border-gray-300 text-gray-500 cursor-not-allowed'
              : 'border-indigo-300 text-indigo-600 hover:border-indigo-400 hover:bg-indigo-50'
          }`}
        >
          <div className="flex items-center justify-center gap-2">
            <Plus className="w-4 h-4" />
            <span className="text-sm sm:text-base font-medium">
              {selectedRounds.length >= MAX_ROUNDS ? 'Max Rounds (8)' : 'Add Round Type'}
            </span>
          </div>
        </button>

        {/* Add Round Options - Mobile optimized */}
        {showAddRounds && selectedRounds.length < MAX_ROUNDS && (
          <div className="space-y-2">
            {Object.values(roundTypeDefinitions).map((type) => (
              <div
                key={type.id}
                className="border border-gray-200 rounded-lg p-3 sm:p-4 bg-white"
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded bg-gray-100 flex items-center justify-center text-lg sm:text-xl flex-shrink-0">
                    {type.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-gray-900 text-sm sm:text-base">{type.name}</h4>
                    <p className="text-xs sm:text-sm text-gray-600">{type.description}</p>
                  </div>
                </div>
                
                {/* Key info - Compact grid */}
                <div className="grid grid-cols-2 gap-2 mb-3 text-xs">
                  <div className="bg-blue-50 p-2 rounded">
                    <div className="font-medium text-blue-800">Timing</div>
                    <div className="text-blue-600">{type.timing}</div>
                  </div>
                  <div className="bg-purple-50 p-2 rounded">
                    <div className="font-medium text-purple-800">Level</div>
                    <div className="text-purple-600">{type.difficulty}</div>
                  </div>
                </div>
                
                {/* Points preview - Compact */}
                <div className="mb-3 p-2 bg-gradient-to-r from-indigo-50 to-purple-50 rounded border border-indigo-200">
                  <div className="text-xs font-medium text-indigo-900 mb-1">Points</div>
                  
                  {type.id === 'wipeout' ? (
                    <div className="space-y-1">
                      <div className="grid grid-cols-3 gap-1 text-xs">
                        <div className="text-center p-1 bg-green-100 rounded">
                          <div className="font-bold text-green-700">+{type.defaultConfig.pointsPerDifficulty?.easy}</div>
                        </div>
                        <div className="text-center p-1 bg-yellow-100 rounded">
                          <div className="font-bold text-yellow-700">+{type.defaultConfig.pointsPerDifficulty?.medium}</div>
                        </div>
                        <div className="text-center p-1 bg-red-100 rounded">
                          <div className="font-bold text-red-700">+{type.defaultConfig.pointsPerDifficulty?.hard}</div>
                        </div>
                      </div>
                      <div className="text-center text-xs text-red-600">Penalties for wrong answers</div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 gap-1 text-xs">
                      <div className="text-center p-1 bg-green-100 rounded">
                        <div className="font-bold text-green-700">+{type.defaultConfig.pointsPerDifficulty?.easy}</div>
                      </div>
                      <div className="text-center p-1 bg-yellow-100 rounded">
                        <div className="font-bold text-yellow-700">+{type.defaultConfig.pointsPerDifficulty?.medium}</div>
                      </div>
                      <div className="text-center p-1 bg-red-100 rounded">
                        <div className="font-bold text-red-700">+{type.defaultConfig.pointsPerDifficulty?.hard}</div>
                      </div>
                    </div>
                  )}
                </div>
                
                <button
                  onClick={() => addRound(type.id)}
                  className="w-full py-2 px-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded font-medium text-sm transition-colors"
                >
                  Add {type.name}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Help section - Compact */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 sm:p-4">
        <h4 className="font-medium text-blue-900 mb-2 text-sm sm:text-base">💡 Tips</h4>
        <ul className="text-xs sm:text-sm text-blue-800 space-y-1">
          <li>• <strong>Category</strong> sets the topic area</li>
          <li>• <strong>Difficulty</strong> affects points and complexity</li>
          <li>• Mix difficulties for engaging progression</li>
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
          className={`flex items-center gap-2 px-4 py-2 sm:px-6 sm:py-3 rounded-lg sm:rounded-xl transition-colors text-sm sm:text-base ${
            isComplete
              ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm hover:shadow-md'
              : 'bg-gray-300 text-gray-600 cursor-not-allowed'
          }`}
        >
          <span>Next</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default StepCombinedRounds;