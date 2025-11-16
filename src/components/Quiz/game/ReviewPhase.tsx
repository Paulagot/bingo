//src/components/Quiz/game/ReviewPhase.tsx
import React from 'react';
import { Question } from '../types/quiz';
import { 
  CheckCircle, 
  XCircle, 
  Clock,
  Eye,
  Target,

  Users,
  BarChart3,
  TrendingUp
} from 'lucide-react';

interface AnswerStatistics {
  totalPlayers: number;
  correctCount: number;
  incorrectCount: number;
  noAnswerCount: number;
  correctPercentage: number;
  incorrectPercentage: number;
  noAnswerPercentage: number;
}

interface ReviewPhaseProps {
  question: Question;
  selectedAnswer: string;
  feedback: string | null;
  correctAnswer?: string | undefined;
  difficulty?: string | undefined;
  category?: string | undefined;
  questionNumber?: number | undefined;
  totalQuestions?: number | undefined;
  statistics?: AnswerStatistics | undefined;  // 👈 this is the crucial line
  isHost?: boolean | undefined;
}



const ReviewPhase: React.FC<ReviewPhaseProps> = ({
  question,
  selectedAnswer,
  feedback,
  correctAnswer,
  difficulty,
  category,
  questionNumber,
  totalQuestions,
  statistics,
  isHost = false
}) => {
  const hasAnswered = selectedAnswer !== null && selectedAnswer !== undefined && selectedAnswer !== '';
  const isCorrect = hasAnswered && selectedAnswer === correctAnswer;

  // Determine the result status
  const getResultStatus = () => {
    if (!hasAnswered) return 'no-answer';
    if (isCorrect) return 'correct';
    return 'incorrect';
  };

  const resultStatus = getResultStatus();

  // Get status styling
  const getStatusStyling = () => {
    switch (resultStatus) {
      case 'correct':
        return {
          borderColor: 'border-green-300',
          bgColor: 'bg-green-50',
          iconColor: 'text-green-600',
          textColor: 'text-green-900',
          icon: CheckCircle
        };
      case 'incorrect':
        return {
          borderColor: 'border-red-300',
          bgColor: 'bg-red-50',
          iconColor: 'text-red-600',
          textColor: 'text-red-900',
          icon: XCircle
        };
      default: // no-answer
        return {
          borderColor: 'border-orange-300',
          bgColor: 'bg-orange-50',
          iconColor: 'text-orange-600',
          textColor: 'text-orange-900',
          icon: Clock
        };
    }
  };

  const styling = getStatusStyling();
  const StatusIcon = styling.icon;

  return (
    <div className={`rounded-xl border-2 shadow-lg ${styling.borderColor} ${styling.bgColor} overflow-hidden`}>
      
      {/* Header */}
      <div className="bg-muted/70 border-border border-b p-4 backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Eye className="text-fg/70 h-5 w-5" />
            <h3 className="text-fg text-lg font-bold">
              {isHost ? 'Host Review' : 'Question Review'}
            </h3>
            {(questionNumber && totalQuestions) && (
              <span className="rounded-full bg-blue-100 px-3 py-1 text-sm font-medium text-blue-700">
                Question {questionNumber}/{totalQuestions}
              </span>
            )}
          </div>
          <div className="flex items-center space-x-2">
            {category && (
              <span className="rounded-full bg-blue-100 px-2 py-1 text-xs text-blue-700">
                {category}
              </span>
            )}
            {difficulty && (
              <span className={`rounded-full px-2 py-1 text-xs font-medium ${
                difficulty === 'easy' ? 'bg-green-100 text-green-700' :
                difficulty === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                'bg-red-100 text-red-700'
              }`}>
                {difficulty}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ✅ NEW: Host Statistics Section */}
      {isHost && statistics && (
        <div className="border-b border-blue-200 bg-blue-50 p-4">
          <div className="mb-3 flex items-center justify-between">
            <h4 className="flex items-center space-x-2 text-sm font-semibold text-blue-800">
              <BarChart3 className="h-4 w-4" />
              <span>Answer Statistics</span>
            </h4>
            <div className="flex items-center space-x-2 text-xs text-blue-600">
              <Users className="h-3 w-3" />
              <span>{statistics.totalPlayers} players</span>
            </div>
          </div>
          
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="rounded-lg border border-green-200 bg-green-100 p-3">
              <div className="text-lg font-bold text-green-700">{statistics.correctCount}</div>
              <div className="text-xs text-green-600">Correct</div>
              <div className="text-xs text-green-500">{statistics.correctPercentage}%</div>
            </div>
            <div className="rounded-lg border border-red-200 bg-red-100 p-3">
              <div className="text-lg font-bold text-red-700">{statistics.incorrectCount}</div>
              <div className="text-xs text-red-600">Incorrect</div>
              <div className="text-xs text-red-500">{statistics.incorrectPercentage}%</div>
            </div>
            <div className="rounded-lg border border-orange-200 bg-orange-100 p-3">
              <div className="text-lg font-bold text-orange-700">{statistics.noAnswerCount}</div>
              <div className="text-xs text-orange-600">No Answer</div>
              <div className="text-xs text-orange-500">{statistics.noAnswerPercentage}%</div>
            </div>
          </div>

          {/* Performance Indicator */}
          <div className="mt-3 flex items-center justify-center space-x-2">
            <TrendingUp className={`h-4 w-4 ${
              statistics.correctPercentage >= 70 ? 'text-green-600' :
              statistics.correctPercentage >= 50 ? 'text-yellow-600' :
              'text-red-600'
            }`} />
            <span className={`text-sm font-medium ${
              statistics.correctPercentage >= 70 ? 'text-green-700' :
              statistics.correctPercentage >= 50 ? 'text-yellow-700' :
              'text-red-700'
            }`}>
              {statistics.correctPercentage >= 70 ? 'Strong Performance' :
               statistics.correctPercentage >= 50 ? 'Moderate Performance' :
               'Challenging Question'}
            </span>
          </div>
        </div>
      )}

      {/* Result Status Banner - Only for Players */}
      {!isHost && (
        <div className={`p-4 ${styling.bgColor} border-border border-b`}>
          <div className="flex items-center justify-center space-x-3">
            <StatusIcon className={`h-8 w-8 ${styling.iconColor}`} />
            <div className="text-center">
              <div className={`text-lg font-bold ${styling.textColor}`}>
                {resultStatus === 'correct' && 'Correct Answer!'}
                {resultStatus === 'incorrect' && 'Incorrect Answer'}
                {resultStatus === 'no-answer' && 'No Answer Submitted'}
              </div>
              {feedback && (
                <div className={`text-sm ${styling.textColor} mt-1 opacity-80`}>
                  {feedback}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Question Content */}
      <div className="p-6">
        <div className="mb-4">
          <h4 className="text-fg/80 mb-2 flex items-center space-x-2 text-sm font-semibold">
            <Target className="h-4 w-4" />
            <span>Question</span>
          </h4>
          <p className="text-fg text-lg">{question.text}</p>
        </div>

        {/* Answer Options */}
        <div className="space-y-2">
          <h4 className="text-fg/80 mb-2 text-sm font-semibold">Answer Options</h4>
          {question.options.map((opt, idx) => {
            const isThisTheCorrectAnswer = correctAnswer === opt;
            const isThisThePlayerAnswer = opt === selectedAnswer;
            const isPlayerCorrect = selectedAnswer === correctAnswer;

            // Enhanced styling logic
            let cardStyling = 'border-2 p-4 rounded-lg transition-all duration-200';
            let iconElement = null;
            let labelStyling = '';

            if (isThisTheCorrectAnswer) {
              cardStyling += ' bg-green-100 border-green-300 shadow-md';
              iconElement = <CheckCircle className="h-5 w-5 text-green-600" />;
              labelStyling = 'text-green-800 font-semibold';
            } else if (isThisThePlayerAnswer && !isPlayerCorrect && !isHost) {
              cardStyling += ' bg-red-100 border-red-300 shadow-md';
              iconElement = <XCircle className="h-5 w-5 text-red-600" />;
              labelStyling = 'text-red-800 font-medium';
            } else {
              cardStyling += ' bg-gray-50 border-border';
              labelStyling = 'text-fg/80';
            }

            return (
              <div key={idx} className={cardStyling}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <span className="text-fg/70 flex h-6 w-6 items-center justify-center rounded-full bg-gray-200 text-sm font-medium">
                      {String.fromCharCode(65 + idx)}
                    </span>
                    <span className={labelStyling}>{opt}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    {isThisThePlayerAnswer && !isHost && (
                      <span className="rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-700">
                        Your Answer
                      </span>
                    )}
                    {isThisTheCorrectAnswer && (
                      <span className="rounded-full bg-green-200 px-2 py-1 text-xs font-medium text-green-800">
                        Correct Answer
                      </span>
                    )}
                    {iconElement}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

       
      </div>
    </div>
  );
};

export default ReviewPhase;