// Updated StandardRound.tsx with FIXED answer selection and highlighting
// src/components/Quiz/game/StandardRound.tsx
import React from 'react';
import { RoundComponentProps } from '../types/quiz';
import FloatingRoundExtrasBar from './FloatingRoundExtrasBar';
import { 
  Timer, 
  Eye, 
  Lightbulb, 
  Check, 
  Snowflake,
  Clock,
  Target
} from 'lucide-react';

interface EnhancedStandardRoundProps extends RoundComponentProps {
  questionNumber?: number;
  totalQuestions?: number;
  difficulty?: string;
  category?: string;
  playersInRoom?: { id: string; name: string }[];
}

const StandardRound: React.FC<EnhancedStandardRoundProps> = ({
  question,
  timeLeft,
  timerActive,
  selectedAnswer,
  setSelectedAnswer,
  answerSubmitted,
  clue,
  feedback,
  isFrozen,
  roomId,
  playerId,
  roundExtras,
  usedExtras,
  usedExtrasThisRound,
  onUseExtra,
  questionNumber,
  totalQuestions,
  difficulty,
  category,
  playersInRoom = []
}) => {
  const getTimerColor = () => {
    if (!timeLeft) return 'text-fg/60';
    if (timeLeft <= 10) return 'text-red-600';
    if (timeLeft <= 30) return 'text-orange-600';
    return 'text-green-600';
  };

  const getTimerAnimation = () => {
    if (!timeLeft) return '';
    if (timeLeft <= 10) return 'animate-pulse';
    return '';
  };

  return (
    <div className="relative">
      {/* Floating Round Extras Bar */}
      <FloatingRoundExtrasBar
        roomId={roomId}
        playerId={playerId}
        availableExtras={roundExtras}
        usedExtras={usedExtras}
        usedExtrasThisRound={usedExtrasThisRound}
        onUseExtra={onUseExtra}
        answerSubmitted={answerSubmitted}
        playersInRoom={playersInRoom}
        currentPlayerId={playerId}
      />

      <div className={`bg-muted overflow-hidden rounded-xl border-2 shadow-lg transition-all duration-200 ${
        isFrozen ? 'border-red-300 opacity-75' : 'border-blue-200'
      }`}>
        
        {/* Header */}
        <div className={`border-border border-b p-4 ${
          isFrozen ? 'bg-red-50' : 'bg-blue-50'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Eye className={`h-5 w-5 ${isFrozen ? 'text-red-600' : 'text-blue-600'}`} />
              <h3 className={`text-lg font-bold ${isFrozen ? 'text-red-800' : 'text-blue-800'}`}>
                {isFrozen ? 'Frozen Question' : 'Current Question'}
              </h3>
              {/* Question Counter */}
              {(questionNumber && totalQuestions) && (
                <span className={`rounded-full px-3 py-1 text-sm font-medium ${
                  isFrozen 
                    ? 'bg-red-100 text-red-700' 
                    : 'bg-blue-100 text-blue-700'
                }`}>
                  Question {questionNumber}/{totalQuestions}
                </span>
              )}
            </div>
            
            <div className="flex items-center space-x-3">
              {/* Category Badge */}
              {category && (
                <span className="rounded-full bg-purple-100 px-2 py-1 text-xs font-medium text-purple-700">
                  {category}
                </span>
              )}
              
              {/* Difficulty Badge */}
              {difficulty && (
                <span className={`rounded-full px-2 py-1 text-xs font-medium ${
                  difficulty === 'easy' ? 'bg-green-100 text-green-700' :
                  difficulty === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                  'bg-red-100 text-red-700'
                }`}>
                  {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}
                </span>
              )}
              
              {/* Timer */}
              {timerActive && timeLeft !== null && (
                <div className={`bg-muted flex items-center space-x-2 rounded-full px-3 py-1 shadow-sm ${getTimerAnimation()}`}>
                  <Timer className={`h-4 w-4 ${getTimerColor()}`} />
                  <span className={`text-lg font-bold ${getTimerColor()}`}>
                    {Math.floor(timeLeft)}s
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Question Content */}
        <div className="p-6">
          {/* Question Text */}
          <div className="mb-6">
            <div className="flex items-start space-x-3">
              <Target className="text-fg/70 mt-1 h-5 w-5 flex-shrink-0" />
              <div className="flex-1">
                <h2 className="heading-2">
                  {question.text}
                </h2>
                
                {/* Clue Display */}
                {clue && (
                  <div className="mt-3 rounded-lg border border-yellow-200 bg-yellow-50 p-3">
                    <div className="flex items-start space-x-2">
                      <Lightbulb className="mt-0.5 h-4 w-4 flex-shrink-0 text-yellow-600" />
                      <div>
                        <p className="text-sm font-medium text-yellow-800">Hint Revealed</p>
                        <p className="text-sm text-yellow-700">{clue}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Answer Options */}
          {question.options && (
            <div className="mb-6 space-y-3">
              <h4 className="text-fg/80 mb-3 text-sm font-semibold">Choose your answer:</h4>
              {question.options.map((opt: string, idx: number) => {
                // ✅ FIXED: Compare against option text, not index
                const isSelected = selectedAnswer === opt;
                const isDisabled = isFrozen || answerSubmitted;
                
                return (
                  <button
                    key={idx}
                    onClick={() => {
                      if (!isDisabled) {
                        console.log('[AnswerSelect] Option clicked:', idx, 'text:', opt);
                        // ✅ FIXED: Store the option text, not index
                        setSelectedAnswer(opt);
                        console.log('[AnswerSelect] selectedAnswer should now be:', opt);
                        
                        // Debug timing check
                        setTimeout(() => {
                          console.log('[AnswerSelect] selectedAnswer after timeout - should be:', opt);
                        }, 100);
                      }
                    }}
                    className={`w-full rounded-lg border-2 p-4 text-left transition-all duration-200 ${
                      isDisabled
                        ? 'border-border cursor-not-allowed bg-gray-100 text-gray-400'
                        : isSelected
                          ? 'border-indigo-400 bg-indigo-100 text-indigo-900 shadow-md'
                          : 'border-border bg-gray-50 hover:border-gray-300 hover:bg-gray-100'
                    }`}
                    disabled={isDisabled}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <span className={`flex h-6 w-6 items-center justify-center rounded-full text-sm font-medium ${
                          isSelected 
                            ? 'bg-indigo-600 text-white' 
                            : 'text-fg/70 bg-gray-300'
                        }`}>
                          {String.fromCharCode(65 + idx)}
                        </span>
                        <span className="flex-1">{opt}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        {isSelected && !isDisabled && (
                          <Check className="h-4 w-4 text-indigo-600" />
                        )}
                        {isFrozen && (
                          <Snowflake className="h-4 w-4 text-red-400" />
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* Status Display */}
          <div className="mb-6 flex items-center justify-center">
            {!selectedAnswer && !isFrozen && !answerSubmitted && (
              <div className="rounded-xl border-2 border-yellow-300 bg-yellow-100 px-8 py-3 text-lg font-bold text-yellow-700">
                <div className="flex items-center space-x-2">
                  <Clock className="h-5 w-5" />
                  <span>Select an answer before time runs out!</span>
                </div>
              </div>
            )}
          </div>

          {/* Feedback */}
          {feedback && (
            <div className="mb-6 rounded-lg border border-blue-200 bg-blue-50 p-4 text-center">
              <p className="text-lg font-medium text-blue-800">{feedback}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StandardRound;