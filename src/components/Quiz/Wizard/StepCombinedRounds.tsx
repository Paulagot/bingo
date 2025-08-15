import React, { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Trophy, Target, Clock, Users, Info, CheckCircle, Trash2, GripVertical, Zap, Play, X, FlipHorizontal } from 'lucide-react';
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

export const StepCombinedRounds: React.FC<StepCombinedRoundsProps> = ({ onNext, onBack }) => {
  const { setupConfig, updateSetupConfig } = useQuizSetupStore();
  const [selectedRounds, setSelectedRounds] = useState<RoundDefinition[]>([]);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

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

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOverIndex(index);
  };

  const handleDragEnd = () => {
    if (draggedIndex !== null && dragOverIndex !== null && draggedIndex !== dragOverIndex) {
      const newRounds = [...selectedRounds];
      const draggedRound = newRounds[draggedIndex];
      
      newRounds.splice(draggedIndex, 1);
      newRounds.splice(dragOverIndex, 0, draggedRound);
      
      const renumberedRounds = newRounds.map((round, i) => ({ ...round, roundNumber: i + 1 }));
      
      setSelectedRounds(renumberedRounds);
      updateSetupConfig({ roundDefinitions: renumberedRounds });
    }
    
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  const getCurrentMessage = () => {
    const completedRounds = selectedRounds.filter(r => r.category && r.difficulty).length;
    const totalRounds = selectedRounds.length;

    if (completedRounds === 0 && totalRounds === 0) {
      return { 
        expression: "explaining", 
        message: "Let's build your quiz! Add round types below and configure each one with a category and difficulty." 
      };
    }
    if (completedRounds === 0 && totalRounds > 0) {
      return { 
        expression: "encouraging", 
        message: "Great! Now configure each round by selecting a category and difficulty level." 
      };
    }
    if (completedRounds === totalRounds && totalRounds > 0) {
      return { 
        expression: "excited", 
        message: "Perfect! All rounds are configured. Your quiz structure is ready to go!" 
      };
    }
    return { 
      expression: "strategic", 
      message: `You've configured ${completedRounds} of ${totalRounds} rounds. Keep going to complete your quiz setup!` 
    };
  };

  const completedRounds = selectedRounds.filter(r => r.category && r.difficulty).length;
  const totalRounds = selectedRounds.length;
  const isComplete = completedRounds === totalRounds && totalRounds > 0;

  const estimatedTime = selectedRounds.reduce((total, round) => {
    const config = round.config;
    let roundTime = 2.5; // base time for transitions
    
    if (config.totalTimeSeconds) {
      roundTime += config.totalTimeSeconds / 60;
    } else if (config.questionsPerRound && config.timePerQuestion) {
      roundTime += (config.questionsPerRound * config.timePerQuestion) / 60;
    }
    
    return total + roundTime;
  }, 0);

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg md:text-xl font-semibold text-indigo-800">Step 2 of 4: Build Quiz Rounds</h2>
        <div className="text-xs md:text-sm text-gray-600">Add rounds and configure them</div>
      </div>

      <Character {...getCurrentMessage()} />

      {/* Progress indicator */}
      <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-3 md:p-4 sticky top-4 z-10">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-2">
            <Zap className="w-4 h-4 text-indigo-600" />
            <span className="font-medium text-indigo-800 text-sm md:text-base">Quiz Progress</span>
          </div>
          <span className="text-xs md:text-sm text-indigo-700">
            {totalRounds} rounds, {completedRounds} configured, ~{Math.round(estimatedTime)} min
          </span>
        </div>
        <div className="w-full bg-indigo-200 rounded-full h-2">
          <div 
            className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${totalRounds > 0 ? (completedRounds / totalRounds) * 100 : 0}%` }}
          />
        </div>
      </div>

      {/* Round Configuration Cards */}
      <div className="space-y-4">
        {selectedRounds.map((round, index) => {
          const roundDef = roundTypeDefinitions[round.roundType];
          const isConfigured = round.category && round.difficulty;
          const isDragging = draggedIndex === index;
          const isDragOver = dragOverIndex === index;
          const categories = availableCategories[round.roundType] || [];
          
          return (
            <div 
              key={`${round.roundType}-${index}`}
              draggable
              onDragStart={() => handleDragStart(index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDragEnd={handleDragEnd}
              onDragLeave={handleDragLeave}
              className={`border-2 rounded-xl transition-all cursor-move ${
                isDragging ? 'opacity-50 scale-105' : ''
              } ${
                isDragOver ? 'border-indigo-400 bg-indigo-50' : ''
              } ${
                isConfigured ? 'bg-green-50 border-green-300 shadow-md' : 'bg-white border-gray-200 hover:border-indigo-300 hover:shadow-md'
              }`}
            >
              {/* Completion indicator */}
              {isConfigured && (
                <div className="absolute top-3 right-3 z-10">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                </div>
              )}

              {/* Round Header */}
              <div className="p-4 cursor-pointer">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <GripVertical className="w-4 h-4 text-gray-400 cursor-grab active:cursor-grabbing" />
                    <div className={`w-12 h-12 rounded-lg flex items-center justify-center text-2xl flex-shrink-0 ${
                      roundDef.difficulty === 'Easy' ? 'bg-green-100' :
                      roundDef.difficulty === 'Medium' ? 'bg-yellow-100' : 'bg-red-100'
                    }`}>
                      {roundDef.icon}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900 text-lg">
                        Round {round.roundNumber}: {roundDef.name}
                      </h4>
                      <p className="text-sm text-gray-600">{roundDef.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {isConfigured ? (
                      <span className="text-sm text-green-600 font-medium">✓ Configured</span>
                    ) : (
                      <span className="text-sm text-orange-600 font-medium">⚠ Needs Setup</span>
                    )}
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
                </div>
              </div>
              
              {/* Configuration Content */}
              <div className="px-4 pb-4 border-t border-gray-200">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  {/* Category Selection */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Category <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={round.category || ''}
                      onChange={(e) => updateRound(index, 'category', e.target.value)}
                      className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 transition-colors ${
                        round.category 
                          ? 'border-green-300 bg-green-50 focus:ring-green-500' 
                          : 'border-gray-300 bg-white focus:ring-indigo-500'
                      }`}
                    >
                      <option value="">Choose category...</option>
                      {categories.map((cat) => (
                        <option key={cat} value={cat}>{cat}</option>
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
                      onChange={(e) => updateRound(index, 'difficulty', e.target.value)}
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
                
                {/* Points preview for configured rounds */}
                {isConfigured && round.config.pointsPerDifficulty && (
                  <div className="mt-4 p-3 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg border border-indigo-200">
                    <div className="flex items-center space-x-2 mb-2">
                      <Trophy className="w-4 h-4 text-indigo-600" />
                      <span className="text-sm font-medium text-indigo-900">Points for this round</span>
                    </div>
                    
                    {round.roundType === 'wipeout' ? (
                      // Wipeout points structure with penalties
                      <div className="space-y-3">
                        <div className="text-center">
                          <span className={`inline-flex items-center space-x-2 px-3 py-2 rounded-lg font-bold text-lg ${
                            round.difficulty === 'easy' ? 'bg-green-100 text-green-800' :
                            round.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            <Trophy className="w-4 h-4" />
                            <span>+{round.config.pointsPerDifficulty[round.difficulty as keyof typeof round.config.pointsPerDifficulty]} points</span>
                            <span className="text-xs opacity-75">(correct)</span>
                          </span>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-2">
                          <div className="text-center p-2 bg-red-50 rounded border border-red-200">
                            <div className="font-bold text-red-700 text-lg">-{round.config.pointsLostPerWrong || 2}</div>
                            <div className="text-red-600 text-xs">Wrong Answer</div>
                          </div>
                          <div className="text-center p-2 bg-orange-50 rounded border border-orange-200">
                            <div className="font-bold text-orange-700 text-lg">-{round.config.pointslostperunanswered || 3}</div>
                            <div className="text-orange-600 text-xs">No Answer</div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      // Standard points structure
                      <div className="text-center">
                        <span className={`inline-flex items-center space-x-2 px-3 py-2 rounded-lg font-bold text-lg ${
                          round.difficulty === 'easy' ? 'bg-green-100 text-green-800' :
                          round.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          <Trophy className="w-4 h-4" />
                          <span>+{round.config.pointsPerDifficulty[round.difficulty as keyof typeof round.config.pointsPerDifficulty]} points</span>
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* Help text for unconfigured rounds */}
                {!isConfigured && (
                  <div className="mt-3 flex items-start space-x-2 p-2 bg-blue-50 rounded-lg border border-blue-200">
                    <Info className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-blue-700">
                      Select both category and difficulty to configure this round. The difficulty affects point values and question complexity.
                    </p>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* Add Round Section */}
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 hover:border-indigo-300 transition-colors">
          <div className="text-center mb-4">
            <h3 className="font-medium text-gray-800">Add Round Type</h3>
            <p className="text-sm text-gray-600">Choose from available round formats below</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.values(roundTypeDefinitions).map((type) => (
              <div
                key={type.id}
                className="border border-gray-200 rounded-lg p-4 hover:border-indigo-400 hover:shadow-md transition-all"
              >
                {/* Header */}
                <div className="flex items-center space-x-3 mb-3">
                  <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center text-2xl flex-shrink-0">
                    {type.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-gray-900">{type.name}</h4>
                    <p className="text-sm text-gray-600 line-clamp-2">{type.description}</p>
                  </div>
                </div>
                
                {/* Gameplay */}
                <div className="mb-3">
                  <h5 className="text-xs font-medium text-gray-700 mb-1">How It Works</h5>
                  <p className="text-xs text-gray-600 leading-relaxed line-clamp-3">{type.gameplay}</p>
                </div>
                
                {/* Key Info Grid */}
                <div className="grid grid-cols-2 gap-2 mb-3 text-xs">
                  <div className="bg-blue-50 p-2 rounded">
                    <div className="font-medium text-blue-800">Timing</div>
                    <div className="text-blue-600">{type.timing}</div>
                  </div>
                  <div className="bg-purple-50 p-2 rounded">
                    <div className="font-medium text-purple-800">Difficulty</div>
                    <div className="text-purple-600">{type.difficulty}</div>
                  </div>
                </div>
                
                {/* Best For */}
                <div className="mb-3">
                  <h5 className="text-xs font-medium text-gray-700 mb-1">Best For</h5>
                  <p className="text-xs text-gray-600 line-clamp-2">{type.bestFor}</p>
                </div>
                
                {/* Pros */}
                <div className="mb-4">
                  <h5 className="text-xs font-medium text-gray-700 mb-1">Key Benefits</h5>
                  <div className="flex flex-wrap gap-1">
                    {type.pros?.map((pro: string, idx: number) => (
                      <span key={idx} className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs">
                        {pro}
                      </span>
                    ))}
                  </div>
                </div>
                
                {/* Points Preview */}
                <div className="mb-4 p-2 bg-gradient-to-r from-indigo-50 to-purple-50 rounded border border-indigo-200">
                  <div className="text-xs font-medium text-indigo-900 mb-1">Point Structure</div>
                  
                  {type.id === 'wipeout' ? (
                    <div className="space-y-2">
                      <div className="grid grid-cols-3 gap-1 text-xs">
                        <div className="text-center p-1 bg-green-100 rounded">
                          <div className="font-bold text-green-700">+{type.defaultConfig.pointsPerDifficulty?.easy}</div>
                          <div className="text-green-600">Easy</div>
                        </div>
                        <div className="text-center p-1 bg-yellow-100 rounded">
                          <div className="font-bold text-yellow-700">+{type.defaultConfig.pointsPerDifficulty?.medium}</div>
                          <div className="text-yellow-600">Medium</div>
                        </div>
                        <div className="text-center p-1 bg-red-100 rounded">
                          <div className="font-bold text-red-700">+{type.defaultConfig.pointsPerDifficulty?.hard}</div>
                          <div className="text-red-600">Hard</div>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-1 text-xs">
                        <div className="text-center p-1 bg-red-50 rounded border border-red-200">
                          <div className="font-bold text-red-700">-{type.defaultConfig.pointsLostPerWrong}</div>
                          <div className="text-red-600">Wrong</div>
                        </div>
                        <div className="text-center p-1 bg-orange-50 rounded border border-orange-200">
                          <div className="font-bold text-orange-700">-{type.defaultConfig.pointslostperunanswered}</div>
                          <div className="text-orange-600">No Answer</div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 gap-1 text-xs">
                      <div className="text-center p-1 bg-green-100 rounded">
                        <div className="font-bold text-green-700">+{type.defaultConfig.pointsPerDifficulty?.easy}</div>
                        <div className="text-green-600">Easy</div>
                      </div>
                      <div className="text-center p-1 bg-yellow-100 rounded">
                        <div className="font-bold text-yellow-700">+{type.defaultConfig.pointsPerDifficulty?.medium}</div>
                        <div className="text-yellow-600">Medium</div>
                      </div>
                      <div className="text-center p-1 bg-red-100 rounded">
                        <div className="font-bold text-red-700">+{type.defaultConfig.pointsPerDifficulty?.hard}</div>
                        <div className="text-red-600">Hard</div>
                      </div>
                    </div>
                  )}
                </div>
                
                <button
                  onClick={() => addRound(type.id)}
                  disabled={selectedRounds.length >= MAX_ROUNDS}
                  className={`w-full py-2 px-4 rounded-lg font-medium transition-all ${
                    selectedRounds.length >= MAX_ROUNDS
                      ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                      : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm hover:shadow-md'
                  }`}
                >
                  {selectedRounds.length >= MAX_ROUNDS ? 'Max Rounds (8)' : `Add ${type.name}`}
                </button>
              </div>
            ))}
          </div>
          
          {selectedRounds.length >= MAX_ROUNDS && (
            <div className="mt-4 text-center text-sm text-orange-600 bg-orange-50 border border-orange-200 rounded-lg p-3">
              ⚠️ Maximum of 8 rounds reached. Remove a round above to add a different type.
            </div>
          )}
        </div>
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
      
      {/* CSS styles for line clamping */}
      <style dangerouslySetInnerHTML={{
        __html: `
          .line-clamp-2 {
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
            overflow: hidden;
          }
          .line-clamp-3 {
            display: -webkit-box;
            -webkit-line-clamp: 3;
            -webkit-box-orient: vertical;
            overflow: hidden;
          }
        `
      }} />
    </div>
  );
};

export default StepCombinedRounds;