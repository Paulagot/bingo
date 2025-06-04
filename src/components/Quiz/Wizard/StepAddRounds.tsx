import React, { useEffect, useState } from 'react';
import { useQuizConfig } from '../useQuizConfig';
import { fundraisingExtraDefinitions, roundTypeDefinitions, type RoundTypeDefinition } from '../../../constants/quizMetadata';
import type { RoundDefinition, RoundTypeId } from '../../../types/quiz';
import { Info, ChevronLeft, ChevronRight, Trash2, GripVertical, Zap } from 'lucide-react';

interface StepAddRoundsProps {
  onNext: () => void;
  onBack: () => void;
}

const MAX_ROUNDS = 8;
const MIN_ROUNDS = 1;

export const StepAddRounds: React.FC<StepAddRoundsProps> = ({ onNext, onBack }) => {
  const { config, updateConfig } = useQuizConfig();
  const [activeExplainer, setActiveExplainer] = useState<RoundTypeDefinition | null>(null);
  const [selectedRounds, setSelectedRounds] = useState<RoundDefinition[]>([]);

  useEffect(() => {
    console.log('🔄 useEffect: hydrate selectedRounds from config');

    if (!config.roundDefinitions || config.roundDefinitions.length === 0) {
      const defaultRounds: RoundDefinition[] = [
        createRoundDefinition('general_trivia', 1),
        createRoundDefinition('speed_round', 2),
        createRoundDefinition('general_trivia', 3),
      ];
      setSelectedRounds(defaultRounds);
      updateConfig({ roundDefinitions: defaultRounds });
    } else {
      setSelectedRounds(config.roundDefinitions);
    }
  }, [config.roundDefinitions, updateConfig]);

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

    const renumberedRounds = updatedRounds.map((round, index) => ({
      ...round,
      roundNumber: index + 1
    }));

    setSelectedRounds(renumberedRounds);
    updateConfig({ roundDefinitions: renumberedRounds });

    console.log(`✅ Round added: ${roundType}`);
  };

  const removeRound = (index: number) => {
    if (selectedRounds.length <= MIN_ROUNDS) return;

    const updatedRounds = selectedRounds.filter((_, i) => i !== index);

    const renumberedRounds = updatedRounds.map((round, i) => ({
      ...round,
      roundNumber: i + 1
    }));

    setSelectedRounds(renumberedRounds);
    updateConfig({ roundDefinitions: renumberedRounds });

    console.log(`🗑 Round removed at index: ${index}`);
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
    if (activeExplainer) {
      return { expression: "explaining", message: activeExplainer };
    }
    if (selectedRounds.length === 0) {
      return { expression: "encouraging", message: "Let's build your quiz! Click a round to add." };
    }
    if (selectedRounds.length >= MAX_ROUNDS) {
      return { expression: "strategic", message: "You've reached 8 rounds. You can reorder or remove." };
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
        <h2 className="text-xl font-semibold text-indigo-800">Step 2 of 7: Configure Rounds</h2>
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
                <Info className="w-4 h-4 cursor-pointer text-gray-400 hover:text-indigo-500" onClick={() => setActiveExplainer(explainer)} />
                <button onClick={() => removeRound(index)} className="p-1 text-red-400 hover:text-red-600 transition">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        );
      })}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Object.values(roundTypeDefinitions).map((type) => (
          <div key={type.id} onClick={() => addRound(type.id)} className="border-2 p-4 rounded-xl hover:bg-indigo-50 cursor-pointer transition">
            <div className="flex justify-between">
              <div className="flex items-center space-x-2">
                <span className="text-2xl">{type.icon}</span>
                <span>{type.name}</span>
              </div>
              <span className={`px-2 py-1 text-xs rounded-full ${
                type.difficulty === 'Easy' ? 'bg-green-100 text-green-700' :
                type.difficulty === 'Medium' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'
              }`}>
                {type.difficulty}
              </span>
            </div>
          </div>
        ))}
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






