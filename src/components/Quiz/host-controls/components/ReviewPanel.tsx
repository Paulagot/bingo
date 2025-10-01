import { SkipForward, Trophy } from 'lucide-react';
import RoundRouter from '../../game/RoundRouter';

type ReviewQuestionPayload = {
  id: string;
  text: string;
  options: string[];
  correctAnswer: string;
  submittedAnswer?: string | null;
  difficulty?: string;
  category?: string;
  questionNumber?: number;
  totalQuestions?: number;
  statistics?: any;
};

type Props = {
  roomPhase: string;
  currentRoundDef?: any;
  reviewQuestion: ReviewQuestionPayload;
  isLastQuestionOfRound: boolean;
  reviewComplete: boolean;
  onShowRoundResults: () => void;
  onNextReview: () => void;
  roomId: string;
};

export default function ReviewPanel({
  roomPhase,
  currentRoundDef,
  reviewQuestion,
  isLastQuestionOfRound,
  reviewComplete,
  onShowRoundResults,
  onNextReview,
  roomId
}: Props) {
  if (!reviewQuestion || roomPhase !== 'reviewing') return null;

  return (
    <div className="bg-muted mb-6 rounded-xl border-2 border-yellow-200 p-6 shadow-lg">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <h3 className="text-fg text-lg font-bold">📖 Question Review</h3>
          {reviewQuestion.questionNumber && reviewQuestion.totalQuestions && (
            <span className="rounded-full bg-yellow-100 px-3 py-1 text-sm font-medium text-yellow-700">
              Question {reviewQuestion.questionNumber}/{reviewQuestion.totalQuestions}
            </span>
          )}
        </div>

        {/* ✅ Fixed button logic */}
        <div className="flex items-center space-x-3">
          {/* Show Round Results when last review is reached OR reviewComplete */}
          {(isLastQuestionOfRound || reviewComplete) && (
            <button
              onClick={onShowRoundResults}
              className="flex items-center space-x-2 rounded-lg bg-purple-500 px-4 py-2 font-medium text-white transition hover:bg-purple-600"
            >
              <Trophy className="h-4 w-4" />
              <span>Show Round Results</span>
            </button>
          )}

          {/* Next Review only while there are more reviews to go */}
          {!isLastQuestionOfRound && !reviewComplete && (
            <button
              onClick={onNextReview}
              className="flex items-center space-x-2 rounded-lg bg-yellow-500 px-4 py-2 font-medium text-white transition hover:bg-yellow-600"
            >
              <SkipForward className="h-4 w-4" />
              <span>Next Review</span>
            </button>
          )}
        </div>
      </div>

      <RoundRouter
        roomPhase="reviewing"
        currentRoundType={currentRoundDef?.roundType}
        question={{
          id: reviewQuestion.id,
          text: reviewQuestion.text,
          options: reviewQuestion.options,
          timeLimit: 0,
          difficulty: reviewQuestion.difficulty,
          category: reviewQuestion.category
        }}
        timeLeft={null}
        timerActive={false}
        selectedAnswer=""
        setSelectedAnswer={() => {}}
        answerSubmitted={false}
        clue={null}
        feedback={null}
        correctAnswer={reviewQuestion.correctAnswer}
        isFrozen={false}
        frozenNotice={null}
        onSubmit={() => {}}
        roomId={roomId}
        playerId="host"
        roundExtras={[]}
        usedExtras={{}}
        usedExtrasThisRound={{}}
        onUseExtra={() => {}}
        questionNumber={reviewQuestion.questionNumber}
        totalQuestions={reviewQuestion.totalQuestions}
        difficulty={reviewQuestion.difficulty}
        category={reviewQuestion.category}
        statistics={reviewQuestion.statistics}
        isHost={true}
      />
    </div>
  );
}

