import React from 'react';
import { Question } from '../types/quiz';

interface ReviewPhaseProps {
  question: Question;
  selectedAnswer: string;
  feedback: string | null;
}

const ReviewPhase: React.FC<ReviewPhaseProps> = ({
  question,
  selectedAnswer,
  feedback,
}) => {
  return (
    <div className="bg-yellow-50 p-6 rounded-xl">
      <p className="text-sm font-semibold text-gray-800">📖 Reviewing:</p>
      <p className="text-base text-yellow-900 mt-1">{question.text}</p>
      <ul className="mt-2 space-y-1 text-sm">
        {question.options.map((opt, idx) => {
          const isCorrect = feedback?.includes(opt) && feedback.includes('Correct');
          const isSubmitted = opt === selectedAnswer;
          const bgColor = isCorrect
            ? 'bg-green-200'
            : isSubmitted
            ? 'bg-red-200'
            : 'bg-white';
          return (
            <li key={idx} className={`p-1 rounded ${bgColor}`}>
              {opt}
            </li>
          );
        })}
      </ul>
      {feedback && <p className="mt-4 text-sm text-gray-700 italic">{feedback}</p>}
    </div>
  );
};

export default ReviewPhase;