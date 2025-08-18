// src/components/Quiz/Wizard/StepQuizTemplates.tsx
import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Clock, Trophy, Zap, Plus, CheckCircle, Brain } from 'lucide-react';
import { useQuizSetupStore } from '../hooks/useQuizSetupStore';
import type { RoundTypeId, RoundConfig } from '../types/quiz';
// ✅ FIXED: Import from the correct constants file
import { roundTypeDefaults, roundTypeMap } from '../constants/quiztypeconstants';

interface QuizTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  duration: number;
  rounds: Array<{
    type: string;
    category: string;
    difficulty: string;
    customConfig?: Partial<RoundConfig>; // ✅ Allow custom overrides
  }>;
  tags: string[];
}

// ✅ FIXED: Calculate duration using actual round configurations with 2.5x multiplier
const calculateDuration = (rounds: any[]) => {
  const baseTime = rounds.reduce((total, round) => {
    const roundConfig = roundTypeDefaults[round.type as RoundTypeId];
    if (roundConfig) {
      // Use custom config if provided, otherwise use defaults
      const questionsPerRound = round.customConfig?.questionsPerRound || roundConfig.questionsPerRound || 6;
      const timePerQuestion = round.customConfig?.timePerQuestion || roundConfig.timePerQuestion || 25;
      
      // Calculate time: (questions × timePerQuestion) × 2.5 ÷ 60 (convert to minutes)
      const roundTimeSeconds = questionsPerRound * timePerQuestion * 2.5;
      const roundTimeMinutes = roundTimeSeconds / 60;
      return total + roundTimeMinutes;
    }
    // Fallback if round type not found (should never happen)
    return total + (round.type === 'general_trivia' ? 10.5 : 11.2);
  }, 0);
  
  // Add 15min break after every 3 rounds (but not at the end)
  const breakCount = Math.floor((rounds.length - 1) / 3);
  const breakTime = breakCount * 15;
  
  return Math.round(baseTime + breakTime);
};

const quizTemplates: QuizTemplate[] = [
  {
    id: 'demo-quiz',
    name: 'Demo Quiz',
    description: 'Quick 4-question demo to try out the platform.',
    icon: '🚀',
    difficulty: 'Easy',
    duration: 5, // Will be calculated dynamically
    rounds: [
      { 
        type: 'wipeout', 
        category: 'General Knowledge', 
        difficulty: 'medium', 
        customConfig: { 
          questionsPerRound: 4,
          timePerQuestion: 20,
          pointsPerDifficulty: { easy: 2, medium: 3, hard: 4 },
          pointsLostPerWrong: 2,
          pointslostperunanswered: 3
        } 
      }
    ],
    tags: ['Demo', 'Quick Start', 'Try It Out']
  },
  {
    id: 'family-night',
    name: 'Family Night In',
    description: 'Balanced, family-friendly, light risk.',
    icon: '👨‍👩‍👧‍👦',
    difficulty: 'Easy',
    duration: 64, // Will be calculated dynamically
    rounds: [
      { type: 'general_trivia', category: 'Family', difficulty: 'easy' },
      { type: 'general_trivia', category: 'General Knowledge', difficulty: 'medium' },
      { type: 'wipeout', category: 'Pop Culture', difficulty: 'easy' },
      { type: 'general_trivia', category: 'Sport', difficulty: 'medium' },
      { type: 'general_trivia', category: 'History', difficulty: 'medium' },
      { type: 'general_trivia', category: 'Family', difficulty: 'medium' }
    ],
    tags: ['Family-Friendly', 'Beginner', 'Mixed Topics']
  },
  {
    id: 'pub-classic',
    name: 'Pub Quiz Classic',
    description: 'The traditional all-rounder.',
    icon: '🍺',
    difficulty: 'Medium',
    duration: 75, // Will be calculated dynamically
    rounds: [
      { type: 'general_trivia', category: 'General Knowledge', difficulty: 'medium' },
      { type: 'general_trivia', category: 'History', difficulty: 'medium' },
      { type: 'wipeout', category: 'Sport', difficulty: 'medium' },
      { type: 'general_trivia', category: 'Pop Culture', difficulty: 'medium' },
      { type: 'general_trivia', category: 'Science', difficulty: 'medium' },
      { type: 'wipeout', category: 'General Knowledge', difficulty: 'easy' },
      { type: 'general_trivia', category: 'General Knowledge', difficulty: 'hard' }
    ],
    tags: ['Traditional', 'Balanced', 'All Topics']
  },
  {
    id: 'brains-bants',
    name: 'Brains & Bants',
    description: 'Clever mix with a little spice.',
    icon: '🧠',
    difficulty: 'Hard',
    duration: 64, // Will be calculated dynamically
    rounds: [
      { type: 'general_trivia', category: 'Science', difficulty: 'medium' },
      { type: 'general_trivia', category: 'History', difficulty: 'hard' },
      { type: 'wipeout', category: 'Pop Culture', difficulty: 'medium' },
      { type: 'general_trivia', category: 'General Knowledge', difficulty: 'medium' },
      { type: 'wipeout', category: 'Science', difficulty: 'medium' },
      { type: 'general_trivia', category: 'Pop Culture', difficulty: 'hard' }
    ],
    tags: ['Challenging', 'Intellectual', 'Science Focus']
  },
  {
    id: 'sports-showdown',
    name: 'Sports Showdown',
    description: 'Sport-centric with a movie/TV crossover.',
    icon: '⚽',
    difficulty: 'Medium',
    duration: 64, // Will be calculated dynamically
    rounds: [
      { type: 'general_trivia', category: 'Sport', difficulty: 'easy' },
      { type: 'wipeout', category: 'Sport', difficulty: 'medium' },
      { type: 'general_trivia', category: 'Pop Culture', difficulty: 'medium' },
      { type: 'general_trivia', category: 'Sport', difficulty: 'medium' },
      { type: 'wipeout', category: 'Sport', difficulty: 'hard' },
      { type: 'general_trivia', category: 'General Knowledge', difficulty: 'medium' }
    ],
    tags: ['Sports Focus', 'Entertainment', 'Active']
  },
  {
    id: 'future-shock',
    name: 'Future Shock',
    description: 'Web3/Blockchain + Science, still approachable.',
    icon: '🚀',
    difficulty: 'Medium',
    duration: 64, // Will be calculated dynamically
    rounds: [
      { type: 'general_trivia', category: 'Web3', difficulty: 'easy' },
      { type: 'general_trivia', category: 'Science', difficulty: 'medium' },
      { type: 'wipeout', category: 'Blockchain', difficulty: 'medium' },
      { type: 'general_trivia', category: 'General Knowledge', difficulty: 'medium' },
      { type: 'wipeout', category: 'Web3', difficulty: 'medium' },
      { type: 'general_trivia', category: 'Pop Culture', difficulty: 'medium' }
    ],
    tags: ['Tech Focus', 'Modern', 'Innovation']
  },
  {
    id: 'time-travelers',
    name: 'Time Travelers',
    description: 'History-led with GK anchors.',
    icon: '⏰',
    difficulty: 'Medium',
    duration: 64, // Will be calculated dynamically
    rounds: [
      { type: 'general_trivia', category: 'History', difficulty: 'easy' },
      { type: 'general_trivia', category: 'General Knowledge', difficulty: 'medium' },
      { type: 'wipeout', category: 'History', difficulty: 'medium' },
      { type: 'general_trivia', category: 'Science', difficulty: 'medium' },
      { type: 'general_trivia', category: 'History', difficulty: 'hard' },
      { type: 'wipeout', category: 'General Knowledge', difficulty: 'easy' }
    ],
    tags: ['History Focus', 'Educational', 'Timeless']
  }
];

const Character = ({ message }: { message: string }) => {
  const getBubbleColor = (): string => {
    if (message.includes('Perfect!') || message.includes('🎉')) {
      return 'bg-green-50 border-green-200';
    }
    if (message.includes('Excellent!') || message.includes('choice!')) {
      return 'bg-blue-50 border-blue-200';
    }
    if (message.includes('ready') || message.includes('configured')) {
      return 'bg-indigo-50 border-indigo-200';
    }
    if (message.includes('build')) {
      return 'bg-orange-50 border-orange-200';
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

interface StepQuizTemplatesProps {
  onNext: () => void;
  onBack: () => void;
}

const StepQuizTemplates: React.FC<StepQuizTemplatesProps> = ({ onNext, onBack }) => {
  const { updateSetupConfig } = useQuizSetupStore();
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [expandedTemplate, setExpandedTemplate] = useState<string | null>(null);

  // ✅ FIXED: Get round type info using actual configurations with 2.5x multiplier
  const getRoundTypeInfo = (type: string, customConfig?: any) => {
    const roundType = roundTypeMap[type as RoundTypeId];
    const config = roundTypeDefaults[type as RoundTypeId];
    
    if (roundType && config) {
      // Use custom config if provided, otherwise use defaults
      const questionsPerRound = customConfig?.questionsPerRound || config.questionsPerRound || 6;
      const timePerQuestion = customConfig?.timePerQuestion || config.timePerQuestion || 25;
      
      // Calculate actual time: (questions × timePerQuestion) × 2.5 ÷ 60 (convert to minutes)
      const roundTimeSeconds = questionsPerRound * timePerQuestion * 2.5;
      const timeInMinutes = roundTimeSeconds / 60;
      
      return {
        icon: type === 'general_trivia' ? '🧠' : type === 'wipeout' ? '⚡' : '❓',
        name: roundType.name,
        time: Math.round(timeInMinutes * 10) / 10, // Round to 1 decimal
        questionsCount: questionsPerRound
      };
    }
    
    // Fallback
    return { 
      icon: '❓', 
      name: 'Unknown', 
      time: 10,
      questionsCount: 6
    };
  };

  // Calculate breaks in the round sequence
  const getBreakPositions = (roundCount: number) => {
    const breaks = [];
    for (let i = 3; i < roundCount; i += 3) {
      breaks.push(i); // After round 3, 6, 9, etc.
    }
    return breaks;
  };

  const handleTemplateSelect = (templateId: string) => {
  setSelectedTemplate(templateId);
  
  const template = quizTemplates.find(t => t.id === templateId);
  if (template) {
    const roundDefinitions = template.rounds.map((round, index) => ({
      roundNumber: index + 1,
      roundType: round.type as RoundTypeId,
      category: round.category,
      difficulty: round.difficulty as 'easy' | 'medium' | 'hard',
      config: templateId === 'demo-quiz' ? {
        questionsPerRound: 4,
        timePerQuestion: 20,
        pointsPerDifficulty: { easy: 2, medium: 3, hard: 4 },
        pointsLostPerWrong: 2,
        pointslostperunanswered: 3
      } : {
        ...roundTypeDefaults[round.type as RoundTypeId],
        ...round.customConfig
      },
      enabledExtras: {}
    }));
    
    updateSetupConfig({ 
      roundDefinitions,
      selectedTemplate: templateId,
      isCustomQuiz: false,
      skipRoundConfiguration: true
    });
  }
};

  const handleCustomSelect = () => {
    setSelectedTemplate('custom');
    updateSetupConfig({ 
      roundDefinitions: [], // Empty - user builds from scratch
      selectedTemplate: 'custom',
      isCustomQuiz: true,
      skipRoundConfiguration: false // Custom quiz needs configuration step
    });
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'Easy': return 'bg-green-100 text-green-800 border-green-200';
      case 'Medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'Hard': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getCurrentMessage = () => {
    if (!selectedTemplate) {
      return "Choose a ready-made quiz to get started quickly, or build your own custom quiz from scratch!";
    }
    if (selectedTemplate === 'custom') {
      return "Perfect! You'll be able to build your quiz exactly how you want it.";
    }
    const template = quizTemplates.find(t => t.id === selectedTemplate);
    return `Excellent choice! "${template?.name}" is ready to go. Just a few more steps!`;
  };

  return (
    <div className="w-full px-2 sm:px-4 space-y-3 sm:space-y-6 pb-4">
      {/* Header */}
      <div className="px-1">
        <h2 className="text-base sm:text-xl font-semibold text-indigo-800">Step 2 of 4: Select Quiz</h2>
        <div className="text-xs sm:text-sm text-gray-600 mt-0.5">Choose any one of the preconfigured quiz nights or custom build your own</div>
      </div>

      <Character message={getCurrentMessage()} />

      {/* Template Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        {quizTemplates.map((template) => (
          <div
            key={template.id}
            onClick={() => handleTemplateSelect(template.id)}
            className={`relative border rounded-lg p-3 sm:p-4 cursor-pointer transition-all hover:shadow-md ${
              selectedTemplate === template.id
                ? 'border-indigo-500 bg-indigo-50 shadow-lg'
                : 'border-gray-200 bg-white hover:border-indigo-300'
            }`}
          >
            {/* Selection indicator */}
            {selectedTemplate === template.id && (
              <div className="absolute top-2 right-2">
                <CheckCircle className="w-5 h-5 text-indigo-600" />
              </div>
            )}

            {/* Template header */}
            <div className="flex items-start gap-3 mb-3">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center text-lg sm:text-xl flex-shrink-0">
                {template.icon}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-gray-900 text-sm sm:text-base mb-1">{template.name}</h3>
                <p className="text-xs sm:text-sm text-gray-600 leading-tight">{template.description}</p>
              </div>
            </div>

            {/* Template stats */}
            <div className="grid grid-cols-2 gap-2 mb-3">
              <div className="flex items-center gap-1.5">
                <Clock className="w-3 h-3 sm:w-4 sm:h-4 text-indigo-600" />
                <span className="text-xs sm:text-sm text-gray-700">{calculateDuration(template.rounds)}min</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Trophy className="w-3 h-3 sm:w-4 sm:h-4 text-purple-600" />
                <span className="text-xs sm:text-sm text-gray-700">{template.rounds.length} rounds</span>
              </div>
            </div>

            {/* Difficulty badge */}
            <div className="mb-3">
              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getDifficultyColor(template.difficulty)}`}>
                {template.difficulty}
              </span>
            </div>

            {/* Tags */}
            <div className="flex flex-wrap gap-1 mb-3">
              {template.tags.slice(0, 2).map((tag) => (
                <span key={tag} className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded text-xs">
                  {tag}
                </span>
              ))}
              {template.tags.length > 2 && (
                <span className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded text-xs">
                  +{template.tags.length - 2} more
                </span>
              )}
            </div>

            {/* Round preview - Expandable */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="text-xs font-medium text-gray-700">Quiz Structure:</div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setExpandedTemplate(expandedTemplate === template.id ? null : template.id);
                  }}
                  className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                >
                  {expandedTemplate === template.id ? 'Show Less' : 'View All Rounds'}
                </button>
              </div>
              
              {expandedTemplate === template.id ? (
                // Full round structure with breaks
                <div className="space-y-1 max-h-64 overflow-y-auto">
                  {template.rounds.map((round, index) => {
                    const roundInfo = getRoundTypeInfo(round.type, round.customConfig);
                    const breakPositions = getBreakPositions(template.rounds.length);
                    const showBreakAfter = breakPositions.includes(index + 1);
                    
                    return (
                      <div key={index}>
                        <div className="flex items-center gap-2 text-xs p-2 bg-gray-50 rounded">
                          <span className="w-5 h-5 rounded bg-indigo-100 flex items-center justify-center text-xs font-bold text-indigo-700">
                            {index + 1}
                          </span>
                          <span className="text-lg">{roundInfo.icon}</span>
                          <div className="flex-1">
                            <div className="font-medium text-gray-800">{round.category}</div>
                            <div className="text-gray-600">{roundInfo.name} • {round.difficulty} • {roundInfo.questionsCount}Q • ~{roundInfo.time}min</div>
                          </div>
                          <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${getDifficultyColor(round.difficulty.charAt(0).toUpperCase() + round.difficulty.slice(1))}`}>
                            {round.difficulty}
                          </span>
                        </div>
                        
                        {showBreakAfter && (
                          <div className="flex items-center gap-2 my-2 py-2 px-3 bg-orange-50 rounded border border-orange-200">
                            <div className="w-5 h-5 rounded bg-orange-200 flex items-center justify-center">
                              ☕
                            </div>
                            <span className="text-xs font-medium text-orange-800">15 minute break</span>
                            <span className="text-xs text-orange-600 ml-auto">Rest & refresh</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                  
                  {/* Total time breakdown */}
                  <div className="mt-3 p-2 bg-indigo-50 rounded border border-indigo-200">
                    <div className="text-xs font-medium text-indigo-900 mb-1">Time Breakdown:</div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-indigo-700">Quiz time: </span>
                        <span className="font-medium">{Math.round(template.rounds.reduce((total, round) => total + getRoundTypeInfo(round.type, round.customConfig).time, 0))}min</span>
                      </div>
                      <div>
                        <span className="text-indigo-700">Breaks: </span>
                        <span className="font-medium">{getBreakPositions(template.rounds.length).length * 15}min</span>
                      </div>
                    </div>
                    <div className="text-xs font-bold text-indigo-800 mt-1 pt-1 border-t border-indigo-200">
                      Total: {calculateDuration(template.rounds)} minutes
                    </div>
                  </div>
                </div>
              ) : (
                // Compact preview (first 3 rounds)
                <div className="space-y-1">
                  {template.rounds.slice(0, 3).map((round, index) => {
                    const roundInfo = getRoundTypeInfo(round.type, round.customConfig);
                    return (
                      <div key={index} className="flex items-center gap-2 text-xs">
                        <span className="w-4 h-4 rounded bg-gray-200 flex items-center justify-center text-xs font-medium">
                          {index + 1}
                        </span>
                        <span>{roundInfo.icon}</span>
                        <span className="text-gray-600">
                          {round.category} ({round.difficulty})
                          {round.customConfig?.questionsPerRound && 
                            ` • ${round.customConfig.questionsPerRound}Q`
                          }
                        </span>
                      </div>
                    );
                  })}
                  {template.rounds.length > 3 && (
                    <div className="text-xs text-gray-500 pl-6">
                      +{template.rounds.length - 3} more rounds
                      {getBreakPositions(template.rounds.length).length > 0 && 
                        ` • ${getBreakPositions(template.rounds.length).length} break${getBreakPositions(template.rounds.length).length > 1 ? 's' : ''}`
                      }
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Custom Quiz Option */}
        <div
          onClick={handleCustomSelect}
          className={`relative border rounded-lg p-3 sm:p-4 cursor-pointer transition-all hover:shadow-md ${
            selectedTemplate === 'custom'
              ? 'border-indigo-500 bg-indigo-50 shadow-lg'
              : 'border-gray-200 bg-white hover:border-indigo-300'
          }`}
        >
          {/* Selection indicator */}
          {selectedTemplate === 'custom' && (
            <div className="absolute top-2 right-2">
              <CheckCircle className="w-5 h-5 text-indigo-600" />
            </div>
          )}

          {/* Custom header */}
          <div className="flex items-start gap-3 mb-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-gradient-to-br from-orange-100 to-pink-100 flex items-center justify-center text-lg sm:text-xl flex-shrink-0">
              🎨
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-gray-900 text-sm sm:text-base mb-1">Custom Quiz</h3>
              <p className="text-xs sm:text-sm text-gray-600 leading-tight">Build your own quiz from scratch with full control</p>
            </div>
          </div>

          {/* Custom features */}
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-xs sm:text-sm text-gray-700">
              <Plus className="w-3 h-3 sm:w-4 sm:h-4 text-green-600" />
              <span>Add any number of rounds</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs sm:text-sm text-gray-700">
              <Zap className="w-3 h-3 sm:w-4 sm:h-4 text-yellow-600" />
              <span>Choose categories & difficulties</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs sm:text-sm text-gray-700">
              <Brain className="w-3 h-3 sm:w-4 sm:h-4 text-purple-600" />
              <span>Mix different round types</span>
            </div>
          </div>

          {/* Perfect for badge */}
          <div className="mt-3">
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800 border border-orange-200">
              Perfect for experts
            </span>
          </div>
        </div>
      </div>

      {/* Help section */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 sm:p-4">
        <h4 className="font-medium text-blue-900 mb-2 text-sm sm:text-base">💡 Quick Guide</h4>
        <ul className="text-xs sm:text-sm text-blue-800 space-y-1">
          <li>• <strong>Preconfigured Quizzes</strong> are ready to play immediately</li>
          <li>• <strong>Custom Quiz</strong> lets you build your own rounds step-by-step</li>
          <li>• All times include 15-minute breaks after every 3 rounds</li>
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
          disabled={!selectedTemplate}
          className={`flex items-center gap-2 px-4 py-2 sm:px-6 sm:py-3 rounded-lg sm:rounded-xl transition-all duration-200 shadow-sm hover:shadow-md font-medium text-sm sm:text-base ${
            selectedTemplate
              ? 'bg-indigo-600 hover:bg-indigo-700 text-white'
              : 'bg-gray-400 text-white cursor-not-allowed'
          }`}
        >
          <span>{selectedTemplate === 'custom' ? 'Configure Quiz' : 'Next'}</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default StepQuizTemplates;