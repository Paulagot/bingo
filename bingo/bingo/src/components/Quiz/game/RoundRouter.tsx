// src/components/Quiz/game/RoundRouter.tsx
import React from 'react';
import { RoundComponentProps, type RoundTypeId } from '../types/quiz';
import ModernStandardRound from './ModernStandardRound';
import ReviewPhase from './ReviewPhase';
import SpeedAsking from './SpeedAsking';

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
  currentRoundType?: RoundTypeId;      // use union type
  correctAnswer?: string;
  questionNumber?: number;
  totalQuestions?: number;
  difficulty?: string;
  category?: string;
  statistics?: AnswerStatistics;
  isHost?: boolean;
  playersInRoom?: { id: string; name: string }[];
  // Countdown / FX
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

  // SPEED ROUND — dedicated component, instant submit
  if (currentRoundType === 'speed_round') {
    return (
      <SpeedAsking
        {...props}
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
  }

  // DEFAULT: Modern Standard Round
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

