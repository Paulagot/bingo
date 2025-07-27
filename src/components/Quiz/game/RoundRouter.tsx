// RoundRouter.tsx - Updated with statistics support
import React from 'react';
import { RoundComponentProps } from '../types/quiz';
import StandardRound from './../game/StandardRound';
import ReviewPhase from './../game/ReviewPhase';

interface AnswerStatistics {
  totalPlayers: number;
  correctCount: number;
  incorrectCount: number;
  noAnswerCount: number;
  correctPercentage: number;
  incorrectPercentage: number;
  noAnswerPercentage: number;
}

interface RoundRouterProps extends RoundComponentProps {
  roomPhase: 'asking' | 'reviewing';
  currentRoundType?: string;
  correctAnswer?: string;
  // Add these new props
  questionNumber?: number;
  totalQuestions?: number;
  difficulty?: string;
  category?: string;
  // ✅ NEW: Statistics for host view
  statistics?: AnswerStatistics;
  isHost?: boolean;
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
  statistics,
  isHost = false,
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
        // ✅ NEW: Pass statistics for host view
        statistics={statistics}
        isHost={isHost}
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