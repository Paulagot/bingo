import React, { useEffect, useState } from 'react';
import { fundraisingExtraDefinitions, roundTypeDefinitions } from '../../../constants/quizMetadata';
import type { RoundDefinition, RoundTypeId } from '../../../types/quiz';
import { ChevronLeft, ChevronRight, Trash2, GripVertical, Zap } from 'lucide-react';
import { useQuizSetupStore } from '../useQuizSetupStore';

interface StepAddRoundsProps {
  onNext: () => void;
  onBack: () => void;
}

const MAX_ROUNDS = 8;
const MIN_ROUNDS = 1;

export const StepAddRounds: React.FC<StepAddRoundsProps> = ({ onNext, onBack }) => {
  const { setupConfig, updateSetupConfig } = useQuizSetupStore();
  // Removed activeExplainer state as we're showing info directly on cards
  const [selectedRounds, setSelectedRounds] = useState<RoundDefinition[]>([]);

  useEffect(() => {
    console.log('[StepAddRounds] Hydrating selectedRounds from setupConfig:', setupConfig);

    if (!setupConfig.roundDefinitions || setupConfig.roundDefinitions.length === 0) {
      const defaultRounds: RoundDefinition[] = [
        createRoundDefinition('general_trivia', 1),
        createRoundDefinition('speed_round', 2),
        createRoundDefinition('general_trivia', 3),
      ];
      setSelectedRounds(defaultRounds);
      updateSetupConfig({ roundDefinitions: defaultRounds });
    } else {
      setSelectedRounds(setupConfig.roundDefinitions);
    }
  }, [setupConfig.roundDefinitions, updateSetupConfig]);

  const createRoundDefinition = (roundType: RoundTypeId, roundNumber: number): RoundDefinition => {
    const def = roundTypeDefinitions[roundType].defaultConfig;

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
        questionsPerRound: def.questionsPerRound ?? 0,
        timePerQuestion: def.timePerQuestion ?? 0,
        ...(def.timePerTeam !== undefined && { timePerTeam: def.timePerTeam }),
        ...(def.totalTimeSeconds !== undefined && { totalTimeSeconds: def.totalTimeSeconds }),
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

    console.log(`[StepAddRounds] ✅ Round added: ${roundType}`);
  };

  const removeRound = (index: number) => {
    if (selectedRounds.length <= MIN_ROUNDS) return;

    const updatedRounds = selectedRounds.filter((_, i) => i !== index);
    const renumberedRounds = updatedRounds.map((round, i) => ({ ...round, roundNumber: i + 1 }));

    setSelectedRounds(renumberedRounds);
    updateSetupConfig({ roundDefinitions: renumberedRounds });

    console.log(`[StepAddRounds] 🗑 Round removed at index: ${index}`);
  };

  const Character = ({ expression, message }: { expression: string; message: any }) => {
    const getCharacterStyle = () => {
      const base = "w-20 h-20 rounded-full flex items-center justify-center text-3xl transition-all duration-300";
      switch (expression) {
        case "excited": return `${base} bg-gradient-to-br from-indigo-400 to-purple-500 animate-bounce`;
        case "explaining": return `${base} bg-gradient-to-br from-purple-400 to-pink-500 animate-pulse`;
        case "strategic": return `${base} bg-gradient-to-br from-orange-400 to-red-500`;
        case "encouraging": return `${base} bg-gradient-to-br from-green-400 to-blue-500`;
        default: return `${base} bg-gradient-to-br from-gray-400 to-gray-600`;
      }
    };

    const getEmoji = () => {
      switch (expression) {
        case "excited": return "🎯";
        case "explaining": return "💡";
        case "strategic": return "🧠";
        case "encouraging": return "⚡";
        default: return "😊";
      }
    };

    const isRoundDefinition = typeof message === 'object' && message?.name && message?.description;

    return (
      <div className="flex items-start space-x-4 mb-8">
        <div className={getCharacterStyle()}>{getEmoji()}</div>
        <div className="relative bg-white rounded-2xl p-4 shadow-lg border-2 border-gray-200 max-w-lg">
          <div className="absolute left-0 top-6 w-0 h-0 border-t-8 border-t-transparent border-r-8 border-r-white border-b-8 border-b-transparent transform -translate-x-2"></div>
          <div className="absolute left-0 top-6 w-0 h-0 border-t-8 border-t-transparent border-r-8 border-r-gray-200 border-b-8 border-b-transparent transform -translate-x-1"></div>

          {isRoundDefinition ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-gray-800 flex items-center space-x-2">
                  <span className="text-2xl">{message.icon}</span>
                  <span>{message.name}</span>
                </h4>
                <span className={`px-2 py-1 text-xs rounded-full ${
                  message.difficulty === 'Easy' ? 'bg-green-100 text-green-700' :
                  message.difficulty === 'Medium' ? 'bg-yellow-100 text-yellow-700' :
                  'bg-red-100 text-red-700'
                }`}>
                  {message.difficulty}
                </span>
              </div>
              <p className="text-gray-600 text-sm">{message.description}</p>
            </div>
          ) : (
            <p className="text-gray-700 text-sm">{message}</p>
          )}
        </div>
      </div>
    );
  };

  const getCurrentMessage = () => {
    if (selectedRounds.length === 0) {
      return { expression: "encouraging", message: "Let's build your quiz! Click a round type below to add it." };
    }
    if (selectedRounds.length >= MAX_ROUNDS) {
      return { expression: "strategic", message: "You've reached 8 rounds. You can reorder or remove rounds above." };
    }
    return { expression: "excited", message: `You have ${selectedRounds.length} round${selectedRounds.length === 1 ? '' : 's'}. Add more below!` };
  };

  const estimatedTime = selectedRounds.reduce((total, round) => {
    const time = (round.config.questionsPerRound * (round.config.timePerQuestion || 25)) / 60;
    return total + time + 2;
  }, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-indigo-800">Step 3 of 6: Configure Rounds</h2>
        <div className="text-sm text-gray-600">Build your quiz structure</div>
      </div>

      <Character {...getCurrentMessage()} />

      <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4">
        <div className="flex items-center space-x-2 mb-2">
          <Zap className="w-4 h-4 text-indigo-600" />
          <span className="font-medium text-indigo-800">Quiz Structure Preview</span>
        </div>
        <div className="text-sm text-indigo-700">
          {selectedRounds.length} round(s), est. ~{Math.round(estimatedTime)} min
        </div>
      </div>

      {selectedRounds.map((round, index) => {
        const explainer = roundTypeDefinitions[round.roundType];
        return (
          <div key={`${round.roundType}-${index}`} className={`border-2 p-4 rounded-xl shadow-sm ${
            explainer.difficulty === 'Easy' ? 'bg-green-100' :
            explainer.difficulty === 'Medium' ? 'bg-yellow-100' : 'bg-red-100'
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <GripVertical className="w-4 h-4 text-gray-400" />
                <span className="font-semibold text-gray-800">Round {round.roundNumber}</span>
                <span className="text-2xl">{explainer.icon}</span>
                <span>{explainer.name}</span>
              </div>
              <div className="flex space-x-2">
                <button onClick={() => removeRound(index)} className="p-1 text-red-400 hover:text-red-600 transition">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        );
      })}

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-800">Available Round Types</h3>
          <span className="text-sm text-gray-500">
            {selectedRounds.length}/{MAX_ROUNDS} rounds added
          </span>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {Object.values(roundTypeDefinitions).map((type) => {
            const isMaxReached = selectedRounds.length >= MAX_ROUNDS;
            const estimatedRoundTime = type.defaultConfig.totalTimeSeconds 
              ? Math.round(type.defaultConfig.totalTimeSeconds / 60)
              : Math.round(((type.defaultConfig.questionsPerRound ?? 0) * (type.defaultConfig.timePerQuestion || 25)) / 60);
            
            return (
              <div 
                key={type.id} 
                className={`border-2 rounded-xl transition-all duration-200 ${
                  isMaxReached 
                    ? 'border-gray-200 bg-gray-50' 
                    : 'border-gray-200 bg-white hover:border-indigo-300 hover:shadow-lg'
                }`}
              >
                <div className="p-6 space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      <div className={`w-12 h-12 rounded-lg flex items-center justify-center text-2xl ${
                        type.difficulty === 'Easy' ? 'bg-green-100' :
                        type.difficulty === 'Medium' ? 'bg-yellow-100' : 'bg-red-100'
                      }`}>
                        {type.icon}
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-900 text-lg">{type.name}</h4>
                        <p className="text-sm text-gray-600 mt-1 leading-relaxed">{type.description}</p>
                      </div>
                    </div>
                    <span className={`px-3 py-1 text-xs font-medium rounded-full whitespace-nowrap ${
                      type.difficulty === 'Easy' ? 'bg-green-100 text-green-700' :
                      type.difficulty === 'Medium' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {type.difficulty}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-4 py-3 bg-gray-50 rounded-lg px-4">
                    <div className="text-center">
                      <div className="text-lg font-semibold text-gray-900">{type.defaultConfig.questionsPerRound ?? 0}</div>
                      <div className="text-xs text-gray-600">Questions</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-semibold text-gray-900">
                        {type.defaultConfig.timePerQuestion || type.defaultConfig.timePerTeam || 'Varies'}
                      </div>
                      <div className="text-xs text-gray-600">
                        {type.defaultConfig.timePerTeam ? 'Sec/Team' : 'Sec/Question'}
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-semibold text-gray-900">~{estimatedRoundTime}</div>
                      <div className="text-xs text-gray-600">Minutes</div>
                    </div>
                  </div>

                  <button
                    onClick={() => addRound(type.id)}
                    disabled={isMaxReached}
                    className={`w-full py-3 px-4 rounded-lg font-medium transition-all duration-200 ${
                      isMaxReached
                        ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                        : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm hover:shadow-md active:scale-[0.98]'
                    }`}
                  >
                    {isMaxReached ? 'Max Rounds Reached' : 'Add Round'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex justify-between pt-6 border-t border-gray-200">
        <button onClick={onBack} className="flex items-center space-x-2 text-gray-600">
          <ChevronLeft className="w-4 h-4" /><span>Back</span>
        </button>
        <button onClick={onNext} disabled={selectedRounds.length === 0} className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl disabled:bg-gray-400">
          <span>Next</span><ChevronRight className="w-4 h-4 ml-2" />
        </button>
      </div>
    </div>
  );
};

export default StepAddRounds;








