import React from 'react';
import { ChevronLeft, ChevronRight, Trophy, Target, Clock, Users, Info, CheckCircle } from 'lucide-react';
import { useQuizSetupStore } from '../hooks/useQuizSetupStore';
import { roundTypeDefinitions, availableCategories, availableDifficulties } from '../constants/quizMetadata';
import type { RoundDefinition, RoundTypeId } from '../types/quiz';

interface StepConfigureRoundsProps {
  onNext: () => void;
  onBack: () => void;
}

const Character = ({ expression, message }: { expression: string; message: string }) => {
  const getCharacterStyle = (): string => {
    const base = "w-16 h-16 md:w-20 md:h-20 rounded-full flex items-center justify-center text-2xl md:text-3xl transition-all duration-300";
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
    <div className="flex items-start space-x-3 md:space-x-4 mb-6">
      <div className={getCharacterStyle()}>{getEmoji()}</div>
      <div className="relative bg-white rounded-2xl p-3 md:p-4 shadow-lg border-2 border-gray-200 max-w-sm md:max-w-lg flex-1">
        <div className="absolute left-0 top-6 w-0 h-0 border-t-8 border-t-transparent border-r-8 border-r-white border-b-8 border-b-transparent transform -translate-x-2"></div>
        <div className="absolute left-0 top-6 w-0 h-0 border-t-8 border-t-transparent border-r-8 border-r-gray-200 border-b-8 border-b-transparent transform -translate-x-1"></div>
        <p className="text-gray-700 text-sm md:text-base">{message}</p>
      </div>
    </div>
  );
};

const PointsPreview = ({ roundType, config, selectedDifficulty }: { 
  roundType: string, 
  config: any, 
  selectedDifficulty?: string 
}) => {
  if (!config.pointsPerDifficulty) return null;

  const isWipeout = roundType === 'wipeout';
  const points = config.pointsPerDifficulty;

  return (
    <div className="mt-3 p-3 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg border border-indigo-200">
      <div className="flex items-center space-x-2 mb-2">
        <Trophy className="w-4 h-4 text-indigo-600" />
        <span className="text-sm font-medium text-indigo-900">Point Structure</span>
      </div>
      
      {selectedDifficulty ? (
        // Show selected difficulty only
        <div className="text-center">
          <div className={`inline-flex items-center space-x-2 px-3 py-2 rounded-lg ${
            selectedDifficulty === 'easy' ? 'bg-green-100 text-green-800' :
            selectedDifficulty === 'medium' ? 'bg-yellow-100 text-yellow-800' :
            'bg-red-100 text-red-800'
          }`}>
            <Trophy className="w-4 h-4" />
            <span className="font-bold text-lg">
              {points[selectedDifficulty as keyof typeof points]} points
            </span>
            <span className="text-sm capitalize">({selectedDifficulty})</span>
          </div>
          {isWipeout && (
            <div className="mt-3 grid grid-cols-2 gap-2">
              <div className="text-center p-2 bg-red-50 rounded border border-red-200">
                <div className="font-bold text-red-700 text-lg">-{config.pointsLostPerWrong || 1}</div>
                <div className="text-red-600 text-xs">Wrong Answer</div>
              </div>
              <div className="text-center p-2 bg-orange-50 rounded border border-orange-200">
                <div className="font-bold text-orange-700 text-lg">-{config.pointslostperunanswered || 0}</div>
                <div className="text-orange-600 text-xs">Unanswered</div>
              </div>
            </div>
          )}
        </div>
      ) : (
        // Show all difficulties
        <>
          <div className="grid grid-cols-3 gap-2 text-xs mb-2">
            <div className="text-center p-2 bg-green-50 rounded border border-green-200">
              <div className="font-bold text-green-700 text-lg">{points.easy}</div>
              <div className="text-green-600">Easy</div>
            </div>
            <div className="text-center p-2 bg-yellow-50 rounded border border-yellow-200">
              <div className="font-bold text-yellow-700 text-lg">{points.medium}</div>
              <div className="text-yellow-600">Medium</div>
            </div>
            <div className="text-center p-2 bg-red-50 rounded border border-red-200">
              <div className="font-bold text-red-700 text-lg">{points.hard}</div>
              <div className="text-red-600">Hard</div>
            </div>
          </div>
          
          {isWipeout && (
            <div className="mt-3 grid grid-cols-2 gap-2">
              <div className="text-center p-2 bg-red-50 rounded border border-red-200">
                <div className="font-bold text-red-700 text-lg">-{config.pointsLostPerWrong || 1}</div>
                <div className="text-red-600">Wrong Answer</div>
              </div>
              <div className="text-center p-2 bg-orange-50 rounded border border-orange-200">
                <div className="font-bold text-orange-700 text-lg">-{config.pointslostperunanswered || 0}</div>
                <div className="text-orange-600">Unanswered</div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

const RoundConfigCard = ({ 
  round, 
  index, 
  onCategoryChange, 
  onDifficultyChange,
  availableCategories 
}: {
  round: RoundDefinition,
  index: number,
  onCategoryChange: (index: number, value: string) => void,
  onDifficultyChange: (index: number, value: string) => void,
  availableCategories: string[]
}) => {
  const def = roundTypeDefinitions[round.roundType as RoundTypeId];
  const isComplete = round.category && round.difficulty;

  // Get time and question info
  const getTimeInfo = (config: any) => {
    const info = [];
    if (config.questionsPerRound) {
      info.push({ icon: <Target className="w-3 h-3" />, text: `${config.questionsPerRound} questions` });
    }
    if (config.totalTimeSeconds) {
      info.push({ icon: <Clock className="w-3 h-3" />, text: `${Math.round(config.totalTimeSeconds / 60)} min total` });
    } else if (config.timePerQuestion) {
      info.push({ icon: <Clock className="w-3 h-3" />, text: `${config.timePerQuestion}s per question` });
    }
    if (config.timePerTeam) {
      info.push({ icon: <Users className="w-3 h-3" />, text: `${config.timePerTeam}s per team` });
    }
    return info;
  };

  const timeInfo = getTimeInfo(round.config);

  return (
    <div className={`relative border-2 rounded-xl p-4 md:p-6 shadow-sm transition-all duration-200 ${
      isComplete 
        ? 'bg-green-50 border-green-200 shadow-md' 
        : 'bg-white border-gray-200 hover:border-indigo-300 hover:shadow-md'
    }`}>
      
      {/* Completion indicator */}
      {isComplete && (
        <div className="absolute top-3 right-3">
          <CheckCircle className="w-5 h-5 text-green-600" />
        </div>
      )}

      {/* Header */}
      <div className="flex items-center space-x-3 mb-4">
        <div className={`w-12 h-12 rounded-lg flex items-center justify-center text-2xl flex-shrink-0 ${
          def.difficulty === 'Easy' ? 'bg-green-100' :
          def.difficulty === 'Medium' ? 'bg-yellow-100' : 'bg-red-100'
        }`}>
          {def.icon}
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900 text-lg">
            Round {round.roundNumber}: {def.name}
          </h3>
          <p className="text-sm text-gray-600">{def.description}</p>
        </div>
      </div>

      {/* Time and Questions Info */}
      {timeInfo.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {timeInfo.map((info, idx) => (
            <div key={idx} className="flex items-center space-x-1 px-2 py-1 bg-gray-100 rounded text-xs">
              {info.icon}
              <span>{info.text}</span>
            </div>
          ))}
        </div>
      )}

      {/* Configuration Options */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        {/* Category Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Category <span className="text-red-500">*</span>
          </label>
          <select
            value={round.category || ''}
            onChange={(e) => onCategoryChange(index, e.target.value)}
            className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 transition-colors ${
              round.category 
                ? 'border-green-300 bg-green-50 focus:ring-green-500' 
                : 'border-gray-300 bg-white focus:ring-indigo-500'
            }`}
          >
            <option value="">Choose a category...</option>
            {availableCategories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>

        {/* Difficulty Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Difficulty <span className="text-red-500">*</span>
          </label>
          <select
            value={round.difficulty || ''}
            onChange={(e) => onDifficultyChange(index, e.target.value)}
            className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 transition-colors ${
              round.difficulty 
                ? 'border-green-300 bg-green-50 focus:ring-green-500' 
                : 'border-gray-300 bg-white focus:ring-indigo-500'
            }`}
          >
            <option value="">Choose difficulty...</option>
            {availableDifficulties.map((diff) => (
              <option key={diff} value={diff}>
                {diff.charAt(0).toUpperCase() + diff.slice(1)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Points Preview */}
      <PointsPreview 
        roundType={round.roundType} 
        config={round.config} 
        selectedDifficulty={round.difficulty}
      />

      {/* Help text */}
      {!isComplete && (
        <div className="mt-3 flex items-start space-x-2 p-2 bg-blue-50 rounded-lg border border-blue-200">
          <Info className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-blue-700">
            Select both category and difficulty to configure this round. The difficulty affects point values and question complexity.
          </p>
        </div>
      )}
    </div>
  );
};

const StepConfigureRounds: React.FC<StepConfigureRoundsProps> = ({ onNext, onBack }) => {
  const { setupConfig, updateSetupConfig } = useQuizSetupStore();

  const handleCategoryChange = (index: number, value: string) => {
    const updatedRounds = [...(setupConfig.roundDefinitions ?? [])];
    updatedRounds[index] = {
      ...updatedRounds[index],
      category: value,
    };
    updateSetupConfig({ roundDefinitions: updatedRounds });
  };

  const handleDifficultyChange = (index: number, value: string) => {
    const updatedRounds = [...(setupConfig.roundDefinitions ?? [])];
    updatedRounds[index] = {
      ...updatedRounds[index],
      difficulty: value as 'easy' | 'medium' | 'hard',
    };
    updateSetupConfig({ roundDefinitions: updatedRounds });
  };

  const totalRounds = setupConfig.roundDefinitions?.length || 0;
  const completedRounds = (setupConfig.roundDefinitions ?? []).filter(r => r.category && r.difficulty).length;
  const isComplete = completedRounds === totalRounds && totalRounds > 0;

  const getCurrentMessage = () => {
    if (completedRounds === 0) {
      return { 
        expression: "explaining", 
        message: "Now let's configure each round! Choose a category and difficulty level to determine the questions and point values." 
      };
    }
    if (completedRounds === totalRounds) {
      return { 
        expression: "excited", 
        message: "Perfect! All rounds are configured. Your quiz structure is ready to go!" 
      };
    }
    return { 
      expression: "encouraging", 
      message: `Great progress! You've configured ${completedRounds} of ${totalRounds} rounds. Keep going!` 
    };
  };

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg md:text-xl font-semibold text-indigo-800">
          Step 3 of 5: Configure Rounds
        </h2>
        <div className="text-xs md:text-sm text-gray-600">
          Choose category and difficulty for each round
        </div>
      </div>

      <Character {...getCurrentMessage()} />

      {/* Progress indicator */}
      <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-3 md:p-4 sticky top-4 z-10">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-2">
            <Trophy className="w-4 h-4 text-indigo-600" />
            <span className="font-medium text-indigo-800 text-sm md:text-base">Configuration Progress</span>
          </div>
          <span className="text-xs md:text-sm text-indigo-700">
            {completedRounds}/{totalRounds} rounds configured
          </span>
        </div>
        <div className="w-full bg-indigo-200 rounded-full h-2">
          <div 
            className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${totalRounds > 0 ? (completedRounds / totalRounds) * 100 : 0}%` }}
          ></div>
        </div>
      </div>

      {/* Configuration Cards */}
      <div className="space-y-4">
        {(setupConfig.roundDefinitions ?? []).map((round, index) => {
          const categories = availableCategories[round.roundType as RoundTypeId] || [];
          
          return (
            <RoundConfigCard
              key={`${round.roundType}-${index}`}
              round={round}
              index={index}
              onCategoryChange={handleCategoryChange}
              onDifficultyChange={handleDifficultyChange}
              availableCategories={categories}
            />
          );
        })}
      </div>

      {/* Help section */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-medium text-blue-900 mb-2">💡 Configuration Tips</h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• <strong>Category</strong> determines the topic area for questions (e.g., Science, History, Sports)</li>
          <li>• <strong>Difficulty</strong> affects point values and question complexity</li>
          <li>• Mix different difficulties to create an engaging progression</li>
          <li>• Wipeout rounds have penalties for wrong answers - choose difficulty carefully!</li>
        </ul>
      </div>

      <div className="flex justify-between pt-6 border-t border-gray-200">
        <button
          onClick={onBack}
          className="flex items-center space-x-2 text-gray-600 hover:text-gray-800 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Back</span>
        </button>
        <button
          onClick={onNext}
          disabled={!isComplete}
          className={`flex items-center space-x-2 px-4 md:px-6 py-2 md:py-3 rounded-xl transition-colors ${
            isComplete
              ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm hover:shadow-md'
              : 'bg-gray-300 text-gray-600 cursor-not-allowed'
          }`}
        >
          <span>Next</span>
          <ChevronRight className="w-4 h-4 ml-1" />
        </button>
      </div>
    </div>
  );
};

export default StepConfigureRounds;

