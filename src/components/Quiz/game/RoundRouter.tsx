// Update your RoundRouter component
import React from 'react';
import { RoundComponentProps } from '../types/quiz';
import StandardRound from './../game/StandardRound';
import ReviewPhase from './../game/ReviewPhase';

interface RoundRouterProps extends RoundComponentProps {
  roomPhase: 'asking' | 'reviewing';
  currentRoundType?: string;
  correctAnswer?: string;
  // Add these new props
  questionNumber?: number;
  totalQuestions?: number;
  difficulty?: string;
  category?: string;
}

const RoundRouter: React.FC<RoundRouterProps> = ({
  roomPhase,
  currentRoundType,
  question,
  selectedAnswer,
  feedback,
  correctAnswer,
  questionNumber,
  totalQuestions,
  difficulty,
  category,
  ...props
}) => {
  if (roomPhase === 'reviewing') {
    return (
      <ReviewPhase
        question={question}
        selectedAnswer={selectedAnswer}
        feedback={feedback}
        correctAnswer={correctAnswer}
        difficulty={difficulty}
        category={category}
        questionNumber={questionNumber}
        totalQuestions={totalQuestions}
      />
    );
  }

  return (
    <StandardRound 
      {...props} 
      question={question} 
      selectedAnswer={selectedAnswer} 
      feedback={feedback}
      questionNumber={questionNumber}
      totalQuestions={totalQuestions}
      difficulty={difficulty}
      category={category}
    />
  );
};

export default RoundRouter;