import React from 'react';
import { RoundComponentProps } from '../types/quiz';
import ExtrasPanel from '../game/ExtrasPanel';
import { 
  Timer, 
  Eye, 
  Lightbulb, 
  Check, 
  Snowflake,
  
  Target
} from 'lucide-react';

interface EnhancedStandardRoundProps extends RoundComponentProps {
  questionNumber?: number;
  totalQuestions?: number;
  difficulty?: string;
  category?: string;
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
  frozenNotice,
  onSubmit,
  roomId,
  playerId,
  roundExtras,
  usedExtras,
  usedExtrasThisRound,
  onUseExtra,
  questionNumber,
  totalQuestions,
  difficulty,
  category
}) => {
  const getTimerColor = () => {
    if (!timeLeft) return 'text-gray-500';
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
    <div className={`bg-white rounded-xl shadow-lg border-2 overflow-hidden transition-all duration-200 ${
      isFrozen ? 'border-red-300 opacity-75' : 'border-blue-200'
    }`}>
      
      {/* Header */}
      <div className={`p-4 border-b border-gray-200 ${
        isFrozen ? 'bg-red-50' : 'bg-blue-50'
      }`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Eye className={`w-5 h-5 ${isFrozen ? 'text-red-600' : 'text-blue-600'}`} />
            <h3 className={`text-lg font-bold ${isFrozen ? 'text-red-800' : 'text-blue-800'}`}>
              {isFrozen ? 'Frozen Question' : 'Current Question'}
            </h3>
            {/* Question Counter */}
            {(questionNumber && totalQuestions) && (
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
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
              <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">
                {category}
              </span>
            )}
            
            {/* Difficulty Badge */}
            {difficulty && (
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                difficulty === 'easy' ? 'bg-green-100 text-green-700' :
                difficulty === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                'bg-red-100 text-red-700'
              }`}>
                {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}
              </span>
            )}
            
            {/* Timer */}
            {timerActive && timeLeft !== null && (
              <div className={`flex items-center space-x-2 px-3 py-1 rounded-full bg-white shadow-sm ${getTimerAnimation()}`}>
                <Timer className={`w-4 h-4 ${getTimerColor()}`} />
                <span className={`font-bold text-lg ${getTimerColor()}`}>
                  {Math.floor(timeLeft)}s
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Frozen Notice */}
        {isFrozen && frozenNotice && (
          <div className="mt-3 p-3 bg-red-100 border border-red-300 rounded-lg">
            <div className="flex items-center space-x-2">
              <Snowflake className="w-5 h-5 text-red-600" />
              <div>
                <p className="font-bold text-red-800">You are frozen!</p>
                <p className="text-sm text-red-700">{frozenNotice}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Question Content */}
      <div className="p-6">
        {/* Question Text */}
        <div className="mb-6">
          <div className="flex items-start space-x-3">
            <Target className="w-5 h-5 text-gray-600 mt-1 flex-shrink-0" />
            <div className="flex-1">
              <h2 className="text-xl font-semibold text-gray-800 leading-relaxed">
                {question.text}
              </h2>
              
              {/* Clue Display */}
              {clue && (
                <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="flex items-start space-x-2">
                    <Lightbulb className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
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
          <div className="space-y-3 mb-6">
            <h4 className="text-sm font-semibold text-gray-700 mb-3">Choose your answer:</h4>
            {question.options.map((opt: string, idx: number) => {
              const isSelected = selectedAnswer === opt;
              const isDisabled = isFrozen || answerSubmitted;
              
              return (
                <button
                  key={idx}
                  onClick={() => !isDisabled && setSelectedAnswer(opt)}
                  className={`w-full text-left p-4 rounded-lg border-2 transition-all duration-200 ${
                    isDisabled
                      ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                      : isSelected
                        ? 'bg-indigo-100 border-indigo-400 text-indigo-900 shadow-md'
                        : 'bg-gray-50 border-gray-200 hover:bg-gray-100 hover:border-gray-300'
                  }`}
                  disabled={isDisabled}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <span className={`w-6 h-6 rounded-full text-sm font-medium flex items-center justify-center ${
                        isSelected 
                          ? 'bg-indigo-600 text-white' 
                          : 'bg-gray-300 text-gray-600'
                      }`}>
                        {String.fromCharCode(65 + idx)}
                      </span>
                      <span className="flex-1">{opt}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      {isSelected && !isDisabled && (
                        <Check className="w-4 h-4 text-indigo-600" />
                      )}
                      {isFrozen && (
                        <Snowflake className="w-4 h-4 text-red-400" />
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* Submit Button */}
        <div className="flex items-center justify-center mb-6">
          <button
            onClick={onSubmit}
            className={`px-8 py-3 rounded-xl font-bold text-lg shadow-lg transition-all duration-200 transform ${
              isFrozen
                ? 'bg-red-100 text-red-700 cursor-not-allowed'
                : !selectedAnswer || answerSubmitted
                  ? 'bg-gray-300 text-gray-600 cursor-not-allowed'
                  : 'bg-indigo-600 text-white hover:bg-indigo-700 hover:scale-105 hover:shadow-xl'
            }`}
            disabled={!selectedAnswer || isFrozen || answerSubmitted}
          >
            {isFrozen ? (
              <div className="flex items-center space-x-2">
                <Snowflake className="w-5 h-5" />
                <span>Frozen - Cannot Submit</span>
              </div>
            ) : answerSubmitted ? (
              <div className="flex items-center space-x-2">
                <Check className="w-5 h-5" />
                <span>Answer Submitted</span>
              </div>
            ) : (
              <span>Submit Answer</span>
            )}
          </button>
        </div>

        {/* Feedback */}
        {feedback && (
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg text-center">
            <p className="text-lg font-medium text-blue-800">{feedback}</p>
          </div>
        )}

        {/* Extras Panel */}
        <div className="border-t border-gray-200 pt-6">
          <ExtrasPanel
            roomId={roomId}
            playerId={playerId}
            availableExtras={roundExtras}
            usedExtras={usedExtras}
            usedExtrasThisRound={usedExtrasThisRound}
            onUseExtra={onUseExtra}
            answerSubmitted={answerSubmitted} // ✅ NEW: Pass answer submission state
          />
        </div>

        {/* Status Information */}
        {/* <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <div className="font-medium text-gray-600">Selected Answer</div>
            <div className={`font-bold ${selectedAnswer ? 'text-indigo-600' : 'text-gray-400'}`}>
              {selectedAnswer || 'None selected'}
            </div>
          </div>
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <div className="font-medium text-gray-600">Status</div>
            <div className={`font-bold ${
              isFrozen ? 'text-red-600' :
              answerSubmitted ? 'text-green-600' :
              'text-orange-600'
            }`}>
              {isFrozen ? 'Frozen' : answerSubmitted ? 'Submitted' : 'Answering'}
            </div>
          </div>
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <div className="font-medium text-gray-600">Time Remaining</div>
            <div className={`font-bold ${getTimerColor()}`}>
              {timerActive && timeLeft ? `${Math.floor(timeLeft)}s` : 'No timer'}
            </div>
          </div>
        </div> */}
      </div>
    </div>
  );
};

export default StandardRound;