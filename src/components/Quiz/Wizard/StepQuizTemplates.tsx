// src/components/Quiz/Wizard/StepQuizTemplates.tsx
import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Clock, Trophy, Zap, Plus, CheckCircle, Brain } from 'lucide-react';
import { useQuizSetupStore } from '../hooks/useQuizSetupStore';
import type { RoundTypeId, RoundConfig } from '../types/quiz';
import { roundTypeDefaults, roundTypeMap } from '../constants/quiztypeconstants';
import ClearSetupButton from './ClearSetupButton';
import type { WizardStepProps } from './WizardStepProps';

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
    customConfig?: Partial<RoundConfig>;
  }>;
  tags: string[];
}

// duration helper
// duration helpers
type RoundLite = { type: RoundTypeId; customConfig?: Partial<RoundConfig> };

const ROUND_BREAK_EVERY = 3;      // after every N rounds
const BREAK_MINUTES = 15;         // matches your UI copy

function computeRoundMinutes(round: RoundLite): number {
  const defaults = roundTypeDefaults[round.type as RoundTypeId];
  const cfg = { ...defaults, ...(round.customConfig ?? {}) };

  if (round.type === 'speed_round' && cfg.totalTimeSeconds) {
    // ✅ round-time based: totalTimeSeconds × 4 (your rule)
    const seconds = cfg.totalTimeSeconds * 4;
    return Math.round((seconds / 60) * 10) / 10;
  }

  // ✅ per-question based: timePerQuestion × questions × 3 (your rule)
  const seconds = (cfg.timePerQuestion || 0) * (cfg.questionsPerRound || 0) * 3;
  return Math.round((seconds / 60) * 10) / 10;
}

const calculateDuration = (rounds: any[]) => {
  const quizMinutes = rounds.reduce((total, r) => total + computeRoundMinutes(r), 0);
  const breakCount = Math.max(0, Math.floor((rounds.length - 1) / ROUND_BREAK_EVERY));
  const breakMinutes = breakCount * BREAK_MINUTES;
  return Math.round(quizMinutes + breakMinutes);
};



// ✅ Replace ONLY the quizTemplates array with the following:
const quizTemplates: QuizTemplate[] = [
  // --- keep this demo exactly as-is ---
{
  id: 'demo-quiz',
  name: 'Demo Quiz',
  description: 'Quick demo: 1 short Wipeout + 1 Speed Round.',
  icon: '🚀',
  difficulty: 'Easy',
  duration: 7, // ~2 min (wipeout) + ~5 min (speed)
  rounds: [
    {
      type: 'wipeout',
      category: 'General Knowledge',
      difficulty: 'medium',
      customConfig: {
        questionsPerRound: 4,
        timePerQuestion: 10,
        pointsPerDifficulty: { easy: 2, medium: 3, hard: 4 },
        pointsLostPerWrong: 2,
        pointsLostPerUnanswered: 3,
      },
    },
    {
      type: 'speed_round',
      category: 'Emojis',
      difficulty: 'hard',
      customConfig: {
        // required even if pacing is total-time based
        questionsPerRound: 40,
        totalTimeSeconds: 75,
        skipAllowed: true,
        pointsPerDifficulty: { easy: 2, medium: 3, hard: 4 },
        pointsLostPerWrong: 0,
        pointsLostPerUnanswered: 0,
      },
    },
  ],
  tags: ['Demo', 'Quick Start', 'Try It Out'],
}
,

  // 1) Youth-focused (adds some Medium for balance)
  {
    id: 'youth-pulse',
    name: 'Youth Pulse',
    description: 'High-energy mix with pop culture & music, plus a couple of medium rounds to keep it interesting.',
    icon: '🎉',
    difficulty: 'Medium',
    duration: 60,
    rounds: [
      { type: 'general_trivia', category: 'Pop Music', difficulty: 'easy' },
      { type: 'speed_round',    category: 'Emojis',    difficulty: 'medium' },
      { type: 'general_trivia', category: 'Pop Culture', difficulty: 'easy' },
      { type: 'wipeout',        category: 'Pop Culture', difficulty: 'medium' },
      { type: 'speed_round',    category: 'Pop Music',   difficulty: 'easy' },
      { type: 'general_trivia', category: 'General Knowledge', difficulty: 'easy' },
    ],
    tags: ['Teens', 'Pop', 'Fast-Paced'],
  },

  // 2) Family-focused (accessible, friendly topics)
  {
    id: 'family-fiesta',
    name: 'Family Fiesta',
    description: 'Accessible and upbeat — perfect for mixed ages. One quick speed round for fun.',
    icon: '👨‍👩‍👧‍👦',
    difficulty: 'Easy',
    duration: 65,
    rounds: [
      { type: 'general_trivia', category: 'General Knowledge', difficulty: 'easy' },
      { type: 'general_trivia', category: 'Pop Culture',        difficulty: 'easy' },
      { type: 'speed_round',    category: 'family movies',      difficulty: 'medium' },
      { type: 'general_trivia', category: 'World Capitals',     difficulty: 'easy' },
      { type: 'wipeout',        category: 'General Knowledge',  difficulty: 'medium' },
      { type: 'general_trivia', category: 'History',            difficulty: 'easy' },
      { type: 'speed_round',    category: 'math',      difficulty: 'easy' },
    ],
    tags: ['Family-Friendly', 'Mixed Ages', 'Welcoming'],
  },

  // 3) Future Shock (tech-forward) — refreshed but familiar
  {
    id: 'future-shock',
    name: 'Future Shock',
    description: 'Web3 + approachable anchors. Modern, curious, and fun.',
    icon: '🚀',
    difficulty: 'Medium',
    duration: 64,
    rounds: [
      { type: 'speed_round',    category: 'Emojis',              difficulty: 'hard' },
      { type: 'general_trivia', category: 'Web3',              difficulty: 'easy' },
      { type: 'general_trivia', category: 'Pop Culture',       difficulty: 'medium' },
      { type: 'wipeout',        category: 'Web3',              difficulty: 'medium' },
      { type: 'speed_round',    category: 'Math',              difficulty: 'hard' },
      { type: 'general_trivia', category: 'General Knowledge', difficulty: 'medium' },
      { type: 'wipeout',        category: 'Web3',              difficulty: 'hard' },
    ],
    tags: ['Tech', 'Modern', 'Innovation'],
  },

  // 4) Pub Classic 2.0 (the all-rounder with one speed burst)
  {
    id: 'pub-classic-2',
    name: 'Pub Classic 2.0',
    description: 'Traditional balance with a quick speed burst to lift the room.',
    icon: '🍺',
    difficulty: 'Medium',
    duration: 72,
    rounds: [
      { type: 'general_trivia', category: 'General Knowledge', difficulty: 'medium' },
      { type: 'general_trivia', category: 'History',           difficulty: 'medium' },
      { type: 'wipeout',        category: 'General Knowledge', difficulty: 'medium' },
      { type: 'general_trivia', category: 'Pop Culture',       difficulty: 'medium' },
      { type: 'general_trivia', category: 'World Capitals',    difficulty: 'medium' },
      { type: 'speed_round',    category: 'Pop Music',         difficulty: 'easy' },
      { type: 'general_trivia', category: 'General Knowledge', difficulty: 'hard' },
    ],
    tags: ['Traditional', 'Balanced', 'Venue-Friendly'],
  },

  // 5) Sports Night Reloaded (Olympic Sports core with energy spikes)
  {
    id: 'sports-reloaded',
    name: 'Sports Night Reloaded',
    description: 'Olympic Sports with a fun speed interlude and solid anchors.',
    icon: '🏅',
    difficulty: 'Medium',
    duration: 64,
    rounds: [
      { type: 'general_trivia', category: 'Olympic Sports',    difficulty: 'easy' },
      { type: 'wipeout',        category: 'Olympic Sports',    difficulty: 'medium' },
      { type: 'general_trivia', category: 'History', difficulty: 'medium' },
      { type: 'speed_round',    category: 'Sport',             difficulty: 'medium' },
      { type: 'general_trivia', category: 'Olympic Sports',    difficulty: 'medium' },
      { type: 'wipeout',        category: 'General Knowledge', difficulty: 'easy' },
    ],
    tags: ['Sports Focus', 'Active', 'Crowd-Pleaser'],
  },

  // 6) Fundraiser Max (optimized for extras & engagement)
  {
    id: 'fundraiser-max',
    name: 'Fundraiser Max',
    description: 'Designed to sell extras: wipeout tension + two speed bursts.',
    icon: '💸',
    difficulty: 'Hard',
    duration: 88,
    rounds: [
      { type: 'general_trivia', category: 'General Knowledge', difficulty: 'easy' },
      { type: 'wipeout',        category: 'General Knowledge', difficulty: 'medium' },
      { type: 'speed_round',    category: 'Pop Music',         difficulty: 'easy' },
      { type: 'general_trivia', category: 'Pop Culture',       difficulty: 'medium' },
      { type: 'wipeout',        category: 'General Knowledge', difficulty: 'hard' },
      { type: 'general_trivia', category: 'World Capitals',    difficulty: 'medium' },
      { type: 'speed_round',    category: 'Emojis',            difficulty: 'hard' },
      { type: 'general_trivia', category: 'General Knowledge', difficulty: 'hard' },
    ],
    tags: ['High Engagement', 'Extras-Friendly', 'Big Night'],
  },
];



const Character = ({ message }: { message: string }) => {
  const getBubbleColor = (): string => {
    if (message.includes('Perfect!') || message.includes('🎉')) return 'bg-green-50 border-green-200';
    if (message.includes('Excellent!') || message.includes('choice!')) return 'bg-blue-50 border-blue-200';
    if (message.includes('ready') || message.includes('configured')) return 'bg-indigo-50 border-indigo-200';
    if (message.includes('build')) return 'bg-orange-50 border-orange-200';
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



const StepQuizTemplates: React.FC<WizardStepProps> = ({ onNext, onBack, onResetToFirst }) => {
  // ✅ Use store for persistence
  const { setupConfig, setTemplate, updateSetupConfig, flow } = useQuizSetupStore();

  // purely UI state can remain local
  const [expandedTemplate, setExpandedTemplate] = useState<string | null>(null);

  const selectedTemplate = setupConfig.selectedTemplate ?? null;

 const getRoundTypeInfo = (type: string, customConfig?: Partial<RoundConfig>) => {
  const roundType = roundTypeMap[type as RoundTypeId];
  const icon = type === 'general_trivia' ? '🧠' : type === 'wipeout' ? '💀' : type === 'speed_round' ? '⚡' : '❓';

  if (roundType) {
    const time = computeRoundMinutes({ type: type as RoundTypeId, customConfig });
    // Show question count only for per-question rounds
    const defaults = roundTypeDefaults[type as RoundTypeId];
    const cfg = { ...defaults, ...(customConfig ?? {}) };
    const questionsCount = type === 'speed_round' ? undefined : (cfg.questionsPerRound ?? 6);

    return {
      icon,
      name: roundType.name,
      time: Math.round(time * 10) / 10,
      questionsCount,
      timed: type === 'speed_round' ? (cfg.totalTimeSeconds ?? 0) : undefined,
    };
  }
  return { icon: '❓', name: 'Unknown', time: 10, questionsCount: 6 as number | undefined, timed: undefined };
};

  const getBreakPositions = (roundCount: number) => {
    const breaks = [];
    for (let i = 3; i < roundCount; i += 3) breaks.push(i);
    return breaks;
  };

  const handleTemplateSelect = (templateId: string) => {
    // ✅ Persist template choice + skip flags in store
    setTemplate(templateId);

    const template = quizTemplates.find((t) => t.id === templateId);
    if (!template) return;

    // Build round definitions
 const roundDefinitions = template.rounds.map((round, index) => {
  // defaults + per-round overrides
  let cfg = { ...roundTypeDefaults[round.type as RoundTypeId], ...(round.customConfig ?? {}) };

  // For the demo, only override the Wipeout round (keep Speed Round custom config!)
  if (templateId === 'demo-quiz' && round.type === 'wipeout') {
    cfg = {
      questionsPerRound: 4,
      timePerQuestion: 10,
      pointsPerDifficulty: { easy: 2, medium: 3, hard: 4 },
      pointsLostPerWrong: 2,
      pointsLostPerUnanswered: 3,
    };
  }

  return {
    roundNumber: index + 1,
    roundType: round.type as RoundTypeId,
    category: round.category,
    difficulty: round.difficulty as 'easy' | 'medium' | 'hard',
    config: cfg,
    enabledExtras: {},
  };
});


    // ✅ Only update config that belongs here (rounds)
     updateSetupConfig({
roundDefinitions,
skipRoundConfiguration: templateId !== 'custom', // <-- important
});
  };

  const handleCustomSelect = () => {
    setTemplate('custom');
    updateSetupConfig({
roundDefinitions: [],
 skipRoundConfiguration: false, // <-- do NOT skip combined rounds
});
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'Easy':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'Medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'Hard':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-muted text-fg border-border';
    }
  };

  const getCurrentMessage = () => {
    if (!selectedTemplate) return 'Choose a ready-made quiz to get started quickly, or build your own custom quiz from scratch!';
    if (selectedTemplate === 'custom') return "Perfect! You'll be able to build your quiz exactly how you want it.";
    const template = quizTemplates.find((t) => t.id === selectedTemplate);
    return `Excellent choice! "${template?.name}" is ready to go. Just a few more steps!`;
  };

  return (
    <div className="w-full space-y-3 px-2 pb-4 sm:space-y-6 sm:px-4">
      {/* Header */}
      <div className="px-1">
        <h2 className="heading-2">Step 2 of 4: Select Quiz</h2>
        <div className="text-fg/70 mt-0.5 text-xs sm:text-sm">
          Choose any one of the preconfigured quiz nights or custom build your own
        </div>
      </div>

      <Character message={getCurrentMessage()} />

      {/* Template Grid */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
        {quizTemplates.map((template) => (
          <div
            key={template.id}
            onClick={() => handleTemplateSelect(template.id)}
            className={`select-card ${selectedTemplate === template.id ? 'select-card--selected' : ''}`}
          >
            {/* Selection indicator */}
            {selectedTemplate === template.id && (
              <div className="absolute right-2 top-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
            )}

            {/* Template header */}
            <div className="mb-3 flex items-start gap-3">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-100 to-purple-100 text-lg sm:h-12 sm:w-12 sm:text-xl">
                {template.icon}
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-fg mb-1 text-sm font-semibold sm:text-base">{template.name}</h3>
                <p className="text-fg/70 text-xs leading-tight sm:text-sm">{template.description}</p>
              </div>
            </div>

            {/* Template stats */}
            <div className="mb-3 grid grid-cols-2 gap-2">
              <div className="flex items-center gap-1.5">
                <Clock className="h-3 w-3 text-indigo-600 sm:h-4 sm:w-4" />
                <span className="text-fg/80 text-xs sm:text-sm">{calculateDuration(template.rounds)}min</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Trophy className="h-3 w-3 text-purple-600 sm:h-4 sm:w-4" />
                <span className="text-fg/80 text-xs sm:text-sm">{template.rounds.length} rounds</span>
              </div>
            </div>

            {/* Difficulty badge */}
            <div className="mb-3">
              <span
                className={`inline-flex items-center rounded-full border px-2 py-1 text-xs font-medium ${getDifficultyColor(
                  template.difficulty
                )}`}
              >
                {template.difficulty}
              </span>
            </div>

            {/* Tags */}
            <div className="mb-3 flex flex-wrap gap-1">
              {template.tags.slice(0, 2).map((tag) => (
                <span key={tag} className="text-fg/80 rounded bg-muted px-2 py-0.5 text-xs">
                  {tag}
                </span>
              ))}
              {template.tags.length > 2 && (
                <span className="text-fg/80 rounded bg-muted px-2 py-0.5 text-xs">
                  +{template.tags.length - 2} more
                </span>
              )}
            </div>

            {/* Round preview - Expandable */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="text-fg/80 text-xs font-medium">Quiz Structure:</div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setExpandedTemplate(expandedTemplate === template.id ? null : template.id);
                  }}
                  className="text-xs font-medium text-indigo-600 hover:text-indigo-800"
                >
                  {expandedTemplate === template.id ? 'Show Less' : 'View All Rounds'}
                </button>
              </div>

              {expandedTemplate === template.id ? (
                // Full round structure with breaks
                <div className="max-h-64 space-y-1 overflow-y-auto">
                  {template.rounds.map((round, index) => {
                    const roundInfo = getRoundTypeInfo(round.type, round.customConfig);
                    const breakPositions = getBreakPositions(template.rounds.length);
                    const showBreakAfter = breakPositions.includes(index + 1);

                    return (
                      <div key={index}>
                        <div className="flex items-center gap-2 rounded bg-muted p-2 text-xs">
                          <span className="flex h-5 w-5 items-center justify-center rounded bg-indigo-100 text-xs font-bold text-indigo-700">
                            {index + 1}
                          </span>
                          <span className="text-lg">{roundInfo.icon}</span>
                          <div className="flex-1">
                            <div className="text-fg font-medium">{round.category}</div>
                            <div className="text-fg/70">
                              {roundInfo.name} • {round.difficulty}
{roundInfo.questionsCount ? ` • ${roundInfo.questionsCount}Q` : ''}
{` • ~${roundInfo.time}min`}

                            </div>
                          </div>
                          <span
                            className={`rounded px-1.5 py-0.5 text-xs font-medium ${getDifficultyColor(
                              round.difficulty.charAt(0).toUpperCase() + round.difficulty.slice(1)
                            )}`}
                          >
                            {round.difficulty}
                          </span>
                        </div>

                        {showBreakAfter && (
                          <div className="my-2 flex items-center gap-2 rounded border border-border bg-muted px-3 py-2">
                            <div className="flex h-5 w-5 items-center justify-center rounded bg-orange-200">☕</div>
                            <span className="text-xs font-medium text-fg/80">15 minute break</span>
                            <span className="ml-auto text-xs text-fg/60">Rest & refresh</span>
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {/* Total time breakdown */}
                  <div className="mt-3 rounded border border-border bg-muted p-2">
                    <div className="mb-1 text-xs font-medium text-fg">Time Breakdown:</div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-fg/80">Quiz time: </span>
                        <span className="font-medium">
                          {Math.round(
                            template.rounds.reduce(
                              (total, round) => total + getRoundTypeInfo(round.type, round.customConfig).time,
                              0
                            )
                          )}
                          min
                        </span>
                      </div>
                      <div>
                        <span className="text-fg/80">Breaks: </span>
                        <span className="font-medium">{getBreakPositions(template.rounds.length).length * 15}min</span>
                      </div>
                    </div>
                    <div className="mt-1 border-t border-border pt-1 text-xs font-bold text-fg">
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
                        <span className="flex h-4 w-4 items-center justify-center rounded bg-muted text-xs font-medium">
                          {index + 1}
                        </span>
                        <span>{roundInfo.icon}</span>
                        <span className="text-fg/70">
                          {round.category} ({round.difficulty})
                          {round.customConfig?.questionsPerRound && ` • ${round.customConfig.questionsPerRound}Q`}
                        </span>
                      </div>
                    );
                  })}
                  {template.rounds.length > 3 && (
                    <div className="text-fg/60 pl-6 text-xs">
                      +{template.rounds.length - 3} more rounds
                      {getBreakPositions(template.rounds.length).length > 0 &&
                        ` • ${getBreakPositions(template.rounds.length).length} break${
                          getBreakPositions(template.rounds.length).length > 1 ? 's' : ''
                        }`}
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
          className={`select-card ${selectedTemplate === 'custom' ? 'select-card--selected' : ''}`}
        >
          {selectedTemplate === 'custom' && (
            <div className="absolute right-2 top-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
            </div>
          )}

          {/* Custom header */}
          <div className="mb-3 flex items-start gap-3">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-orange-100 to-pink-100 text-lg sm:h-12 sm:w-12 sm:text-xl">
              🎨
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-fg mb-1 text-sm font-semibold sm:text-base">Custom Quiz</h3>
              <p className="text-fg/70 text-xs leading-tight sm:text-sm">Build your own quiz from scratch with full control</p>
            </div>
          </div>

          {/* Custom features */}
          <div className="space-y-2">
            <div className="text-fg/80 flex items-center gap-1.5 text-xs sm:text-sm">
              <Plus className="h-3 w-3 text-green-600 sm:h-4 sm:w-4" />
              <span>Add any number of rounds</span>
            </div>
            <div className="text-fg/80 flex items-center gap-1.5 text-xs sm:text-sm">
              <Zap className="h-3 w-3 text-yellow-600 sm:h-4 sm:w-4" />
              <span>Choose categories & difficulties</span>
            </div>
            <div className="text-fg/80 flex items-center gap-1.5 text-xs sm:text-sm">
              <Brain className="h-3 w-3 text-purple-600 sm:h-4 sm:w-4" />
              <span>Mix different round types</span>
            </div>
          </div>

          {/* Perfect for badge */}
          <div className="mt-3">
            <span className="inline-flex items-center rounded-full border border-orange-200 bg-orange-100 px-2 py-1 text-xs font-medium text-orange-800">
              Perfect for experts
            </span>
          </div>
        </div>
      </div>

      {/* Help section */}
      <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 sm:p-4">
        <h4 className="mb-2 text-sm font-medium text-blue-900 sm:text-base">💡 Quick Guide</h4>
        <ul className="space-y-1 text-xs text-blue-800 sm:text-sm">
          <li>• <strong>Preconfigured Quizzes</strong> are ready to play immediately</li>
          <li>• <strong>Custom Quiz</strong> lets you build your own rounds step-by-step</li>
          <li>• All times include 15-minute breaks after every 3 rounds</li>
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
          disabled={!selectedTemplate}
          className="btn-primary sm:rounded-xl sm:px-6 sm:py-3 sm:text-base"
        >
          <span>{selectedTemplate === 'custom' ? 'Configure Quiz' : 'Next'}</span>
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

export default StepQuizTemplates;

