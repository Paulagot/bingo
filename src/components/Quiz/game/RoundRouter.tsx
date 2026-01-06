// src/components/Quiz/game/RoundRouter.tsx
import React from 'react';
import { RoundComponentProps, type RoundTypeId } from '../types/quiz';
import ModernStandardRound from './ModernStandardRound';
import ReviewPhase from './ReviewPhase';
import SpeedAsking from './SpeedAsking';
import HiddenObjectAsking from './HiddenObjectAsking';
import HiddenObjectReview from './HiddenObjectReview';
import OrderImageAsking from './OrderImageAsking'; // ✅ ADD
import OrderImageReview from './OrderImageReview'; // ✅ ADD
import type { HiddenObjectPuzzle } from './HiddenObjectAsking';

const Debug = false;

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
  currentRoundType?: RoundTypeId;
  correctAnswer?: string;
  questionNumber?: number;
  totalQuestions?: number;
  difficulty?: string;
  category?: string;
  statistics?: AnswerStatistics;
  isHost?: boolean;
  playersInRoom?: { id: string; name: string }[];
  onOrderChange?: (order: string[]) => void;

  // Countdown / FX
  isFlashing?: boolean;
  currentEffect?: any;
  getFlashClasses?: () => string;
  currentRound?: number;

  // ✅ Hidden Object props
  puzzle?: HiddenObjectPuzzle | null;
  foundIds?: string[];
  finished?: boolean;
  onTap?: (itemId: string, x: number, y: number) => void;
  remainingSeconds?: number | null;

  // ✅ Order Image props
  orderImageQuestion?: any;
  playerOrder?: string[] | null;
  onOrderSubmit?: (order: string[]) => void;
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

  // hidden object
  puzzle,
  foundIds = [],
  finished = false,
  onTap,
  remainingSeconds = null,

  // order image
  orderImageQuestion,
  playerOrder,
  onOrderSubmit,

  ...props
}) => {
    if (Debug) console.log('[RoundRouter] Debug:', {
    roomPhase,
    currentRoundType,
    hasQuestion: !!question,
    hasOrderImageQuestion: !!orderImageQuestion,
    hasOnOrderSubmit: !!onOrderSubmit,
    questionId: question?.id,
    orderQuestionId: orderImageQuestion?.id
  });
  // ✅ ORDER IMAGE REVIEW - Add BEFORE default ReviewPhase
  if (roomPhase === 'reviewing' && currentRoundType === 'order_image') {
  if (!orderImageQuestion) {
    return (
      <div className="text-fg/70 rounded-xl bg-gray-100 p-6 text-center">
        Loading Order Image review…
      </div>
    );
  }

    return (
     <OrderImageReview
      question={orderImageQuestion} // ✅ Pass orderImageQuestion instead
      playerOrder={playerOrder || null}
      questionNumber={questionNumber}
      totalQuestions={totalQuestions}
    />
    );
  }

  // ✅ Hidden Object REVIEW must bypass ReviewPhase (no "question.text" concept)
  if (roomPhase === 'reviewing' && currentRoundType === 'hidden_object') {
    if (!puzzle) {
      return (
        <div className="text-fg/70 rounded-xl bg-gray-100 p-6 text-center">
          Loading Hidden Object review…
        </div>
      );
    }

    return <HiddenObjectReview puzzle={puzzle} foundIds={foundIds} />;
  }

  // Default REVIEW (standard Q/A rounds)
  if (roomPhase === 'reviewing') {
      if (!question) {
    return (
      <div className="text-fg/70 rounded-xl bg-gray-100 p-6 text-center">
        Loading review…
      </div>
    );
  }
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

  // HIDDEN OBJECT — asking
  if (currentRoundType === 'hidden_object') {
    if (!puzzle || !onTap) {
      return (
        <div className="text-fg/70 rounded-xl bg-gray-100 p-6 text-center">
          Loading Hidden Object…
        </div>
      );
    }

    return (
      <HiddenObjectAsking
        puzzle={puzzle}
        foundIds={foundIds}
        finished={finished}
        onTap={onTap}
        // remainingSeconds={remainingSeconds}
      />
    );
  }

  // ✅ ORDER IMAGE — asking
  if (currentRoundType === 'order_image') {
    if (!orderImageQuestion || !onOrderSubmit) {
      return (
        <div className="text-fg/70 rounded-xl bg-gray-100 p-6 text-center">
          Loading Order Image…
        </div>
      );
    }

    return (
      <OrderImageAsking
        question={orderImageQuestion}
        onSubmit={onOrderSubmit}
        isFrozen={props.isFrozen}
        onOrderChange={props.onOrderChange}
        frozenNotice={props.frozenNotice}
        timeLeft={props.timeLeft}
        answerSubmitted={props.answerSubmitted}
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


