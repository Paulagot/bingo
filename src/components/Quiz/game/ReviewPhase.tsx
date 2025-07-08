import React from 'react';
import { Question } from '../types/quiz';
import { 
  CheckCircle, 
  XCircle, 
  Clock,
  Eye,
  Target,
  AlertCircle
} from 'lucide-react';

interface ReviewPhaseProps {
  question: Question;
  selectedAnswer: string;
  feedback: string | null;
  correctAnswer?: string;
  difficulty?: string;
  category?: string;
  questionNumber?: number;
  totalQuestions?: number;
}

const ReviewPhase: React.FC<ReviewPhaseProps> = ({
  question,
  selectedAnswer,
  feedback,
  correctAnswer,
  difficulty,
  category,
  questionNumber,
  totalQuestions
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
    <div className={`rounded-xl shadow-lg border-2 ${styling.borderColor} ${styling.bgColor} overflow-hidden`}>
      
      {/* Header */}
      <div className="bg-white/70 backdrop-blur-sm p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Eye className="w-5 h-5 text-gray-600" />
            <h3 className="text-lg font-bold text-gray-800">Question Review</h3>
            {(questionNumber && totalQuestions) && (
              <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                Question {questionNumber}/{totalQuestions}
              </span>
            )}
          </div>
          <div className="flex items-center space-x-2">
            {category && (
              <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs">
                {category}
              </span>
            )}
            {difficulty && (
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
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

      {/* Result Status Banner */}
      <div className={`p-4 ${styling.bgColor} border-b border-gray-200`}>
        <div className="flex items-center justify-center space-x-3">
          <StatusIcon className={`w-8 h-8 ${styling.iconColor}`} />
          <div className="text-center">
            <div className={`text-lg font-bold ${styling.textColor}`}>
              {resultStatus === 'correct' && 'Correct Answer!'}
              {resultStatus === 'incorrect' && 'Incorrect Answer'}
              {resultStatus === 'no-answer' && 'No Answer Submitted'}
            </div>
            {feedback && (
              <div className={`text-sm ${styling.textColor} opacity-80 mt-1`}>
                {feedback}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Question Content */}
      <div className="p-6">
        <div className="mb-4">
          <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center space-x-2">
            <Target className="w-4 h-4" />
            <span>Question</span>
          </h4>
          <p className="text-lg text-gray-800">{question.text}</p>
        </div>

        {/* Answer Options */}
        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-gray-700 mb-2">Answer Options</h4>
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
              iconElement = <CheckCircle className="w-5 h-5 text-green-600" />;
              labelStyling = 'text-green-800 font-semibold';
            } else if (isThisThePlayerAnswer && !isPlayerCorrect) {
              cardStyling += ' bg-red-100 border-red-300 shadow-md';
              iconElement = <XCircle className="w-5 h-5 text-red-600" />;
              labelStyling = 'text-red-800 font-medium';
            } else {
              cardStyling += ' bg-gray-50 border-gray-200';
              labelStyling = 'text-gray-700';
            }

            return (
              <div key={idx} className={cardStyling}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <span className="w-6 h-6 rounded-full bg-gray-200 text-gray-600 text-sm font-medium flex items-center justify-center">
                      {String.fromCharCode(65 + idx)}
                    </span>
                    <span className={labelStyling}>{opt}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    {isThisThePlayerAnswer && (
                      <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                        Your Answer
                      </span>
                    )}
                    {isThisTheCorrectAnswer && (
                      <span className="px-2 py-1 bg-green-200 text-green-800 rounded-full text-xs font-medium">
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

        {/* Summary Section */}
        <div className="mt-6 p-4 bg-white rounded-lg border border-gray-200">
          <h4 className="text-sm font-semibold text-gray-700 mb-2">Review Summary</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="text-center">
              <div className="font-medium text-gray-600">Your Answer</div>
              <div className={`font-bold ${
                hasAnswered ? (isCorrect ? 'text-green-600' : 'text-red-600') : 'text-orange-600'
              }`}>
                {hasAnswered ? selectedAnswer : 'No Answer'}
              </div>
            </div>
            <div className="text-center">
              <div className="font-medium text-gray-600">Correct Answer</div>
              <div className="font-bold text-green-600">
                {correctAnswer || 'Not Available'}
              </div>
            </div>
            <div className="text-center">
              <div className="font-medium text-gray-600">Result</div>
              <div className={`font-bold flex items-center justify-center space-x-1 ${styling.textColor}`}>
                <StatusIcon className={`w-4 h-4 ${styling.iconColor}`} />
                <span>
                  {resultStatus === 'correct' && 'Correct'}
                  {resultStatus === 'incorrect' && 'Incorrect'}
                  {resultStatus === 'no-answer' && 'No Answer'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Additional Info */}
        {!hasAnswered && (
          <div className="mt-4 p-3 bg-orange-100 border border-orange-200 rounded-lg">
            <div className="flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 text-orange-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-orange-800">
                <p className="font-medium">Time ran out</p>
                <p>You didn't submit an answer in time. The correct answer was: <strong>{correctAnswer}</strong></p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReviewPhase;