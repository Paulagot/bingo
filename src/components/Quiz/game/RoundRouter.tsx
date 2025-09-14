// RoundRouter.tsx - Updated imports and props
import React from 'react';
import { RoundComponentProps } from '../types/quiz';
import ModernStandardRound from './ModernStandardRound'; // Changed import
import ReviewPhase from './ReviewPhase';

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
  questionNumber?: number;
  totalQuestions?: number;
  difficulty?: string;
  category?: string;
  statistics?: AnswerStatistics;
  isHost?: boolean;
  playersInRoom?: { id: string; name: string }[];
  // Add countdown props
  isFlashing?: boolean;
  currentEffect?: any;
  getFlashClasses?: () => string;
  currentRound?: number;
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
  playersInRoom,
  isFlashing,
  currentEffect,
  getFlashClasses,
  currentRound,
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
        statistics={statistics}
        isHost={isHost}
      />
    );
  }

  return (
    <ModernStandardRound
      {...props}
      playersInRoom={playersInRoom}
      question={question}
      selectedAnswer={selectedAnswer}
      feedback={feedback}
      questionNumber={questionNumber}
      totalQuestions={totalQuestions}
      difficulty={difficulty}
      category={category}
      isFlashing={isFlashing}
      currentEffect={currentEffect}
      getFlashClasses={getFlashClasses}
      currentRound={currentRound}
    />
  );
};

export default RoundRouter;