import React from 'react';
import { Question } from '../types/quiz';

interface ReviewPhaseProps {
  question: Question;
  selectedAnswer: string;
  feedback: string | null;
  correctAnswer?: string; // ✅ ADD THIS PROP
}

const ReviewPhase: React.FC<ReviewPhaseProps> = ({
  question,
  selectedAnswer,
  feedback,
  correctAnswer, // ✅ ADD THIS
}) => {
  return (
    <div className="bg-yellow-50 p-6 rounded-xl">
      <p className="text-sm font-semibold text-gray-800">📖 Reviewing:</p>
      <p className="text-base text-yellow-900 mt-1">{question.text}</p>
      <ul className="mt-2 space-y-1 text-sm">
        {question.options.map((opt, idx) => {
          // ✅ FIXED LOGIC:
          const isThisTheCorrectAnswer = correctAnswer === opt;
          const isThisThePlayerAnswer = opt === selectedAnswer;
          const isPlayerCorrect = selectedAnswer === correctAnswer;
          
          // ✅ PROPER COLOR LOGIC:
          let bgColor = 'bg-white'; // default
          
          if (isThisTheCorrectAnswer) {
            bgColor = 'bg-green-200'; // Always highlight correct answer in green
          } else if (isThisThePlayerAnswer && !isPlayerCorrect) {
            bgColor = 'bg-red-200'; // Only highlight player's wrong answer in red
          }
          
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