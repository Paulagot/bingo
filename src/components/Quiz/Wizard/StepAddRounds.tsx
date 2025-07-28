import React, { useEffect, useState } from 'react';
import { fundraisingExtraDefinitions, roundTypeDefinitions } from '../../../constants/quizMetadata';
import type { RoundDefinition, RoundTypeId } from '../types/quiz';
import { ChevronLeft, ChevronRight, Trash2, GripVertical, Zap, RotateCcw, Info, Play, X, FlipHorizontal } from 'lucide-react';
import { useQuizSetupStore } from '../useQuizSetupStore';
import { roundTypeDefaults } from '../../../constants/quiztypeconstants';

interface StepAddRoundsProps {
  onNext: () => void;
  onBack: () => void;
}

interface VideoModalProps {
  isOpen: boolean;
  onClose: () => void;
  videoId: string;
  title: string;
}

const debug = false;

const VideoModal: React.FC<VideoModalProps> = ({ isOpen, onClose, videoId, title }) => {
  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
      onClick={handleBackdropClick}
    >
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="text-lg font-semibold text-gray-900">{title} - Gameplay Tutorial</h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="aspect-video">
          <iframe
            src={`https://www.youtube.com/embed/${videoId}?autoplay=1`}
            title={`${title} gameplay tutorial`}
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            className="w-full h-full"
          />
        </div>
      </div>
    </div>
  );
};

const MAX_ROUNDS = 8;
const MIN_ROUNDS = 1;

const FlipCard = ({ type, onAdd, isMaxReached }: { 
  type: any, 
  onAdd: (roundType: RoundTypeId) => void, 
  isMaxReached: boolean
}) => {
  const [isFlipped, setIsFlipped] = useState(false);
  const [showVideoModal, setShowVideoModal] = useState(false);

  // Calculate time estimate based on actual config
  const getTimeEstimate = (config: any): number => {
    if (config.totalTimeSeconds) {
      return Math.round(config.totalTimeSeconds / 60 + 2.5);
    }
    if (config.questionsPerRound && config.timePerQuestion) {
      return Math.round((config.questionsPerRound * config.timePerQuestion) / 60 + 2.5);
    }
    return 5; // fallback
  };

  // Get relevant metrics from config
  const getMetrics = (config: any) => {
    const metrics = [];
    
    if (config.questionsPerRound) {
      metrics.push({ label: 'Questions', value: config.questionsPerRound });
    }
    
    if (config.totalTimeSeconds) {
      metrics.push({ 
        label: 'Total Time', 
        value: `${Math.round(config.totalTimeSeconds / 60)}m` 
      });
    } else if (config.timePerQuestion) {
      metrics.push({ 
        label: 'Per Question', 
        value: `${config.timePerQuestion}s` 
      });
    }
    
    if (config.timeToAnswer) {
      metrics.push({ 
        label: 'Answer Time', 
        value: `${config.timeToAnswer}s` 
      });
    }

    metrics.push({ 
      label: 'Est. Duration', 
      value: `~${getTimeEstimate(config)}min` 
    });

    return metrics;
  };

  const metrics = getMetrics(type.defaultConfig);

  const handleVideoClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowVideoModal(true);
  };

  const handleCardClick = () => {
    setIsFlipped(!isFlipped);
  };

  const handleFlipBadgeClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsFlipped(!isFlipped);
  };

  return (
    <>
      <div className="group perspective-1000 h-72 md:h-80 relative">
        {/* Interactive Flip Badge */}
        <div className={`absolute top-2 right-2 z-20 transition-all duration-300 ${
          isFlipped ? 'opacity-0 pointer-events-none' : ''
        }`}>
          <button
            onClick={handleFlipBadgeClick}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-2 py-1 rounded-full text-xs font-medium flex items-center space-x-1 shadow-lg transition-colors cursor-pointer"
          >
            <FlipHorizontal className="w-3 h-3" />
            <span>Flip for Details</span>
          </button>
        </div>

        <div 
          className={`relative w-full h-full transition-transform duration-700 transform-style-preserve-3d cursor-pointer ${
            isFlipped ? 'rotate-y-180' : ''
          }`}
          onClick={handleCardClick}
        >
          {/* Front of card */}
          <div className="absolute inset-0 backface-hidden border-2 rounded-xl bg-white hover:border-indigo-300 hover:shadow-lg transition-all duration-200">
            <div className="p-4 md:p-6 h-full flex flex-col">
              {/* Header row: icon + name + info */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-3 flex-1 min-w-0">
                  <div className="w-10 h-10 md:w-12 md:h-12 rounded-lg flex items-center justify-center text-xl md:text-2xl flex-shrink-0 bg-gray-100">
                    {type.icon}
                  </div>
                  <h4 className="font-semibold text-gray-900 text-base md:text-lg truncate flex-1">{type.name}</h4>
                </div>
                <Info className="w-4 h-4 text-gray-400 ml-2 flex-shrink-0" />
              </div>

              {/* Description */}
              <div className="mb-4 flex-1">
                <p className="text-xs md:text-sm text-gray-600 leading-relaxed">{type.description}</p>
              </div>
              
              {/* Compact metrics row */}
              <div className="flex gap-1 mb-4">
                {metrics.slice(0, 4).map((metric, idx) => (
                  <div key={idx} className="flex-1 text-center p-1 bg-gray-50 rounded text-xs min-w-0">
                    <div className="font-semibold text-gray-900 text-xs truncate">{metric.value}</div>
                    <div className="text-xs text-gray-500 truncate">{metric.label}</div>
                  </div>
                ))}
              </div>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onAdd(type.id);
                }}
                disabled={isMaxReached}
                className={`w-full py-2 md:py-3 px-4 rounded-lg font-medium transition-all duration-200 ${
                  isMaxReached
                    ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                    : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm hover:shadow-md active:scale-[0.98]'
                }`}
              >
                {isMaxReached ? 'Max Rounds Reached' : 'Add Round'}
              </button>
            </div>
          </div>

          {/* Back of card */}
          <div className="absolute inset-0 backface-hidden rotate-y-180 border-2 rounded-xl bg-gradient-to-br from-indigo-50 to-purple-50 border-indigo-200">
            <div className="p-3 md:p-4 h-full flex flex-col">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <span className="text-lg md:text-xl">{type.icon}</span>
                  <h4 className="font-semibold text-gray-900 text-sm md:text-base">{type.name}</h4>
                </div>
                <RotateCcw className="w-3 h-3 text-gray-400" />
              </div>

              {/* Compact Video Section */}
              <div className="mb-2">
                <button
                  onClick={handleVideoClick}
                  className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 rounded-lg p-2 border border-indigo-300 text-center transition-all duration-200 hover:shadow-md group"
                >
                  <div className="flex items-center justify-center space-x-2">
                    <div className="bg-white bg-opacity-20 rounded-full p-1">
                      <Play className="w-3 h-3 text-white fill-current" />
                    </div>
                    <span className="text-xs font-medium text-white">Watch Gameplay</span>
                  </div>
                </button>
              </div>

              <div className="space-y-2 flex-1 text-xs overflow-hidden min-h-0">
                {/* Best For */}
                <div className="min-h-0">
                  <h5 className="font-medium text-gray-800 mb-1 text-xs">Best For</h5>
                  <p className="text-gray-600 text-xs leading-tight line-clamp-2">{type.bestFor}</p>
                </div>

                {/* Why Choose This */}
                <div className="min-h-0">
                  <h5 className="font-medium text-gray-800 mb-1 text-xs">Why Choose This?</h5>
                  <div className="flex flex-wrap gap-1">
                    {type.pros?.map((pro: string, idx: number) => (
                      <span key={idx} className="px-1.5 py-0.5 bg-indigo-100 text-indigo-700 rounded text-xs whitespace-nowrap">
                        {pro}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Fundraising Extras */}
                {type.extras && type.extras.length > 0 && (
                  <div className="min-h-0">
                    <h5 className="font-medium text-gray-800 mb-1 text-xs">Fundraising Extras</h5>
                    <div className="flex flex-wrap gap-1">
                      {type.extras.map((extra: string, idx: number) => (
                        <span key={idx} className="px-1.5 py-0.5 bg-green-100 text-green-700 rounded text-xs whitespace-nowrap">
                          {extra}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Video Modal */}
      <VideoModal
        isOpen={showVideoModal}
        onClose={() => setShowVideoModal(false)}
        videoId={type.videoId || 'dQw4w9WgXcQ'} // Default video ID, replace with actual video IDs
        title={type.name}
      />
    </>
  );
};

const Character = ({ expression, message }: { expression: string; message: any }) => {
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

  const isRoundDefinition = typeof message === 'object' && message?.name && message?.description;

  return (
    <div className="flex items-start space-x-3 md:space-x-4 mb-6">
      <div className={getCharacterStyle()}>{getEmoji()}</div>
      <div className="relative bg-white rounded-2xl p-3 md:p-4 shadow-lg border-2 border-gray-200 max-w-sm md:max-w-lg flex-1">
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
          <p className="text-gray-700 text-sm md:text-base">{message}</p>
        )}
      </div>
    </div>
  );
};

export const StepAddRounds: React.FC<StepAddRoundsProps> = ({ onNext, onBack }) => {
  const { setupConfig, updateSetupConfig } = useQuizSetupStore();
  const [selectedRounds, setSelectedRounds] = useState<RoundDefinition[]>([]);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  useEffect(() => {
   if (debug) console.log('[StepAddRounds] Hydrating selectedRounds from setupConfig:', setupConfig);

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
   if (debug) console.log(`[DEBUG] Creating round for ${roundType}:`, def);

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
        // ✅ FIXED: Copy ALL fields from defaultConfig instead of cherry-picking
        ...def,
        // ✅ Ensure required fields have defaults
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

   if (debug) console.log(`[StepAddRounds] ✅ Round added: ${roundType}`);
  };

  const removeRound = (index: number) => {
    if (selectedRounds.length <= MIN_ROUNDS) return;

    const updatedRounds = selectedRounds.filter((_, i) => i !== index);
    const renumberedRounds = updatedRounds.map((round, i) => ({ ...round, roundNumber: i + 1 }));

    setSelectedRounds(renumberedRounds);
    updateSetupConfig({ roundDefinitions: renumberedRounds });

   if (debug) console.log(`[StepAddRounds] 🗑 Round removed at index: ${index}`);
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
      
      // Remove the dragged item
      newRounds.splice(draggedIndex, 1);
      // Insert it at the new position
      newRounds.splice(dragOverIndex, 0, draggedRound);
      
      // Renumber all rounds
      const renumberedRounds = newRounds.map((round, i) => ({ ...round, roundNumber: i + 1 }));
      
      setSelectedRounds(renumberedRounds);
      updateSetupConfig({ roundDefinitions: renumberedRounds });
      
     if (debug) console.log(`[StepAddRounds] 🔄 Round moved from ${draggedIndex} to ${dragOverIndex}`);
    }
    
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  const getCurrentMessage = () => {
    if (selectedRounds.length === 0) {
      return { expression: "encouraging", message: "Let's build your quiz! Click a round type below to add it." };
    }
    if (selectedRounds.length >= MAX_ROUNDS) {
      return { expression: "strategic", message: "You've reached 8 rounds. You can reorder or remove rounds above." };
    }
    
    // Check if we're showing the initial default setup
    const hasDefaultSetup = selectedRounds.length === 3 && 
                           selectedRounds[0]?.roundType === 'general_trivia' &&
                           selectedRounds[1]?.roundType === 'wipeout' &&
                           selectedRounds[2]?.roundType === 'general_trivia';
    
    if (hasDefaultSetup) {
      return { expression: "explaining", message: "Now its time to select the round type's, the cards below provide more information on each type and the game play associated with that round.  We have set up a quiz for you with 3 rounds, you can customise this and have up to 8 rounds." };
    }
    
    return { expression: "excited", message: `You have ${selectedRounds.length} round${selectedRounds.length === 1 ? '' : 's'}. Add more below!` };
  };

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
        <h2 className="text-lg md:text-xl font-semibold text-indigo-800">Step 3 of 8: Select Rounds</h2>
        <div className="text-xs md:text-sm text-gray-600">Build your quiz structure</div>
      </div>

      <Character {...getCurrentMessage()} />

      {/* Quiz Preview - Sticky on larger screens */}
      <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-3 md:p-4 sticky top-4 z-10">
        <div className="flex items-center space-x-2 mb-2">
          <Zap className="w-4 h-4 text-indigo-600" />
          <span className="font-medium text-indigo-800 text-sm md:text-base">Quiz Structure Preview</span>
        </div>
        <div className="text-xs md:text-sm text-indigo-700">
          {selectedRounds.length} round(s), est. ~{Math.round(estimatedTime)} min
        </div>
      </div>

      {/* Selected Rounds */}
      {selectedRounds.map((round, index) => {
        const explainer = roundTypeDefinitions[round.roundType];
        const isDragging = draggedIndex === index;
        const isDragOver = dragOverIndex === index;
        
        return (
          <div 
            key={`${round.roundType}-${index}`} 
            draggable
            onDragStart={() => handleDragStart(index)}
            onDragOver={(e) => handleDragOver(e, index)}
            onDragEnd={handleDragEnd}
            onDragLeave={handleDragLeave}
            className={`border-2 p-3 md:p-4 rounded-xl shadow-sm transition-all cursor-move ${
              isDragging ? 'opacity-50 scale-105' : ''
            } ${
              isDragOver ? 'border-indigo-400 bg-indigo-50' : ''
            } ${
              explainer.difficulty === 'Easy' ? 'bg-green-50 border-green-200' :
              explainer.difficulty === 'Medium' ? 'bg-yellow-50 border-yellow-200' : 'bg-red-50 border-red-200'
            } hover:shadow-md`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 md:space-x-3">
                <GripVertical className="w-4 h-4 text-gray-400 cursor-grab active:cursor-grabbing" />
                <span className="font-semibold text-gray-800 text-sm md:text-base">Round {round.roundNumber}</span>
                <span className="text-lg md:text-xl">{explainer.icon}</span>
                <span className="text-sm md:text-base truncate">{explainer.name}</span>
              </div>
              <button 
                onClick={() => removeRound(index)} 
                className="p-1 md:p-2 text-red-400 hover:text-red-600 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        );
      })}

      {/* Available Round Types */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base md:text-lg font-medium text-gray-800">Available Round Types</h3>
          <span className="text-xs md:text-sm text-gray-500">
            {selectedRounds.length}/{MAX_ROUNDS} rounds added
          </span>
        </div>
        
        {/* Enhanced Interactive Tip */}
        <div className="text-xs md:text-sm text-gray-600 bg-blue-50 border border-blue-200 rounded-lg p-3">
          💡 <strong>Tip:</strong> Click the "Flip for Details" button on any card to see detailed gameplay information!
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
          {Object.values(roundTypeDefinitions).map((type) => (
            <FlipCard
              key={type.id}
              type={type}
              onAdd={addRound}
              isMaxReached={selectedRounds.length >= MAX_ROUNDS}
            />
          ))}
        </div>
      </div>

      <div className="flex justify-between pt-6 border-t border-gray-200">
        <button onClick={onBack} className="flex items-center space-x-2 text-gray-600 hover:text-gray-800 transition-colors">
          <ChevronLeft className="w-4 h-4" />
          <span>Back</span>
        </button>
        <button 
          onClick={onNext} 
          disabled={selectedRounds.length === 0} 
          className="flex items-center space-x-2 px-4 md:px-6 py-2 md:py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl disabled:bg-gray-400 transition-colors"
        >
          <span>Next</span>
          <ChevronRight className="w-4 h-4 ml-2" />
        </button>
      </div>

      {/* CSS styles */}
      <style dangerouslySetInnerHTML={{
        __html: `
          .perspective-1000 {
            perspective: 1000px;
          }
          .transform-style-preserve-3d {
            transform-style: preserve-3d;
          }
          .backface-hidden {
            backface-visibility: hidden;
          }
          .rotate-y-180 {
            transform: rotateY(180deg);
          }
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

export default StepAddRounds;








