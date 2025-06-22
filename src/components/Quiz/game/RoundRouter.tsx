import React from 'react';
import { RoundComponentProps, Question } from '../types/quiz';
import StandardRound from './../game/StandardRound';
import ReviewPhase from './../game/ReviewPhase';

interface RoundRouterProps extends RoundComponentProps {
  roomPhase: 'asking' | 'reviewing';
  currentRoundType?: string;
    correctAnswer?: string;
}

const RoundRouter: React.FC<RoundRouterProps> = ({
  roomPhase,
  currentRoundType,
  question,
  selectedAnswer,
  feedback,
   correctAnswer,
  ...props
}) => {
  if (roomPhase === 'reviewing') {
    return (
      <ReviewPhase
        question={question}
        selectedAnswer={selectedAnswer}
        feedback={feedback}
        correctAnswer={correctAnswer}
      />
    );
  }

  // For now, all round types use StandardRound
  // Future round types can be added here:
  // switch (currentRoundType) {
  //   case 'speed': return <SpeedRound {...props} />;
  //   case 'visual': return <VisualRound {...props} />;
  //   default: return <StandardRound {...props} />;
  // }
  
  return <StandardRound {...props} question={question} selectedAnswer={selectedAnswer} feedback={feedback} />;
};

export default RoundRouter;