import * as React from 'react';
import { Eye, Timer } from 'lucide-react';

import ActivityTicker from './ActivityTicker';
import RoundStatsDisplay from './RoundStatsDisplay';
import HostRoundPreview from '../../game/HostRoundPreview';
import HostHeader from './HostHeader';
import RoundLeaderboardCard from './RoundLeaderboardCard';
import OverallLeaderboardCard from './OverallLeaderboardCard';
import ReviewPanel from './ReviewPanel';
import HostTiebreakerPanel from './HostTiebreakerPanel';
import SpeedRoundHostPanel from './SpeedRoundHostPanel';
import HostPostgamePanel from './HostPostgamePanel';

import HiddenObjectReviewPanel from './Hiddenobjectreviewpane';
import HiddenObjectHostPanel from './HiddenObjectHostPanel';
import OrderImageHostPanel from './OrderImageHostPanel';
import OrderImageReviewPanel from './OrderImageReviewPanel';

import type { HostControlsController } from '../../hooks/useHostControlsController';

const HostControlsView: React.FC<{ roomId: string; controller: HostControlsController }> = ({
  roomId,
  controller,
}) => {
  const {
    socket,
    connected,
    config,

    currentRoundDef,
    roundTypeId,
    timeLeft,
    currentEffect,
    isFlashing,
    getFlashClasses,
    isLastQuestionOfRound,

    activities,
    clearActivity,
    hasRoundStats,
    currentRoundStats,
    hasFinalStats,
    allRoundsStats,

    roomState,
    playersInRoom,

    tbParticipants,
    tbQuestion,
    tbWinners,
    tbPlayerAnswers,
    tbCorrectAnswer,
    tbShowReview,
    tbQuestionNumber,
    tbStillTied,

    currentQuestion,
    reviewQuestion,
    leaderboard,

    hiddenObjectPuzzle,
    hiddenObjectFoundIds,
    hiddenObjectRemainingSeconds,

    orderImageQuestion,
    orderImageReviewQuestion,

    roundLeaderboard,
    isShowingRoundResults,
    reviewComplete,

    prizeCount,
    hasPrizeTie,
    tieParticipantsByName,

   

    handleStartRound,
    handleNextReview,
    handleShowRoundResults,
    handleContinueToOverallLeaderboard,
    handleEndGame,
    handleReturnToDashboard,
  } = controller;

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50 to-white">
      {/* Countdown Effect Overlay */}
      {currentEffect && isFlashing && (
        <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center">
          <div
            className={`animate-bounce text-8xl font-bold ${
              currentEffect.color === 'green'
                ? 'text-green-500'
                : currentEffect.color === 'orange'
                  ? 'text-orange-500'
                  : 'text-red-500'
            }`}
          >
            {currentEffect.message}
          </div>
        </div>
      )}

      <div className={`container mx-auto max-w-6xl px-4 py-8 ${getFlashClasses()}`}>
        <HostHeader
          roomId={roomId}
          connected={connected}
          currentRound={roomState.currentRound}
          totalRounds={roomState.totalRounds}
          phase={roomState.phase}
        />

        <HostTiebreakerPanel
          visible={roomState.phase === 'tiebreaker'}
          participants={tbParticipants}
          question={tbQuestion}
          winners={tbWinners}
          playerAnswers={tbPlayerAnswers}
          correctAnswer={tbCorrectAnswer ?? 0}
          showReview={tbShowReview}
          playersInRoom={playersInRoom?.length ? playersInRoom : leaderboard}
          questionNumber={tbQuestionNumber}
          stillTied={tbStillTied}
        />

        {/* Activity Ticker */}
        <ActivityTicker activities={activities} onClearActivity={clearActivity} maxVisible={8} />

        {/* Round Info / Launch */}
        {(roomState.phase === 'waiting' || roomState.phase === 'launched') && (
          <HostRoundPreview
            currentRound={roomState.currentRound}
            totalRounds={roomState.totalRounds}
            config={config}
            roomPhase={roomState.phase}
            totalPlayers={roomState.totalPlayers || 0}
            onStartRound={handleStartRound}
          />
        )}

        {/* Speed Round Host Panel */}
        <SpeedRoundHostPanel
          roomId={roomId}
          visible={roomState.phase === 'asking' && roundTypeId === 'speed_round'}
        />

        <HiddenObjectHostPanel
          visible={roomState.phase === 'asking' && roundTypeId === 'hidden_object'}
          puzzle={hiddenObjectPuzzle}
          remainingSeconds={hiddenObjectRemainingSeconds}
        />

        {/* Order Image Host Panel - Asking Phase */}
        <OrderImageHostPanel
          visible={roomState.phase === 'asking' && roundTypeId === 'order_image'}
          question={orderImageQuestion}
          timeLeft={timeLeft}
        />

        {/* Active Question */}
        {currentQuestion && roomState.phase === 'asking' && roundTypeId !== 'speed_round' && (
          <div className="bg-muted mb-6 rounded-xl border-2 border-blue-200 p-6 shadow-lg">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <h3 className="text-fg flex items-center space-x-2 text-lg font-bold">
                  <Eye className="h-5 w-5 text-blue-600" />
                  <span>Current Question</span>
                </h3>
                {currentQuestion.questionNumber && currentQuestion.totalQuestions && (
                  <span className="rounded-full bg-blue-100 px-3 py-1 text-sm font-medium text-blue-700">
                    Question {currentQuestion.questionNumber}/{currentQuestion.totalQuestions}
                  </span>
                )}
              </div>
              <div className="flex items-center space-x-4">
                {currentQuestion.category && (
                  <span className="rounded-full bg-blue-100 px-2 py-1 text-xs text-blue-700">
                    {currentQuestion.category}
                  </span>
                )}
                {currentQuestion.difficulty && (
                  <span
                    className={`rounded-full px-2 py-1 text-xs font-medium ${
                      currentQuestion.difficulty === 'easy'
                        ? 'bg-green-100 text-green-700'
                        : currentQuestion.difficulty === 'medium'
                          ? 'bg-yellow-100 text-yellow-700'
                          : 'bg-red-100 text-red-700'
                    }`}
                  >
                    {currentQuestion.difficulty}
                  </span>
                )}
                {timeLeft !== null && (
                  <div className="flex items-center space-x-2">
                    <Timer className="h-4 w-4 text-orange-600" />
                    <span
                      className={`text-lg font-bold ${
                        timeLeft <= 10
                          ? 'animate-pulse text-red-600'
                          : timeLeft <= 30
                            ? 'text-orange-600'
                            : 'text-green-600'
                      }`}
                    >
                      {timeLeft}s
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-lg bg-gray-50 p-4">
              <p className="text-fg mb-3 text-lg">{currentQuestion.text}</p>
              <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                {currentQuestion.options.map((opt, idx) => (
                  <div
                    key={idx}
                    className="bg-muted rounded border p-3 text-sm transition-colors hover:bg-gray-50"
                  >
                    <span className="text-fg/70 font-medium">
                      Option {String.fromCharCode(65 + idx)}:
                    </span>{' '}
                    {opt}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Review Panel - Conditional based on round type */}
        {roundTypeId === 'hidden_object' ? (
        <HiddenObjectReviewPanel
    roomPhase={roomState.phase}
    puzzle={hiddenObjectPuzzle}
    foundIds={hiddenObjectFoundIds}
    reviewComplete={reviewComplete}
    currentReviewIndex={roomState.currentReviewIndex ?? 0}  // ✅ ADD THIS
    totalReviewQuestions={roomState.totalReviewQuestions ?? 0}  // ✅ ADD THIS
    onNextReview={handleNextReview}  // ✅ ADD THIS
    onShowRoundResults={handleShowRoundResults}
  />
        ) : roundTypeId === 'order_image' ? (
          <OrderImageReviewPanel
            visible={roomState.phase === 'reviewing'}
            reviewQuestion={orderImageReviewQuestion}
            isLastQuestionOfRound={isLastQuestionOfRound()}
            reviewComplete={reviewComplete}
            onShowRoundResults={handleShowRoundResults}
            onNextReview={handleNextReview}
          />
        ) : (
          <ReviewPanel
            roomPhase={roomState.phase}
            currentRoundDef={currentRoundDef}
            reviewQuestion={reviewQuestion!}
            isLastQuestionOfRound={isLastQuestionOfRound()}
            reviewComplete={reviewComplete}
            onShowRoundResults={handleShowRoundResults}
            onNextReview={handleNextReview}
            roomId={roomId}
          />
        )}

        {/* Round Stats */}
        {roomState.phase === 'leaderboard' &&
          isShowingRoundResults &&
          hasRoundStats &&
          currentRoundStats && <RoundStatsDisplay roundStats={currentRoundStats} isVisible={true} />}

        {/* Round Leaderboard */}
        {roomState.phase === 'leaderboard' && isShowingRoundResults && roundLeaderboard.length > 0 && (
          <RoundLeaderboardCard
            roundNumber={roomState.currentRound}
            leaderboard={roundLeaderboard}
            onContinue={handleContinueToOverallLeaderboard}
          />
        )}

        {/* Overall Leaderboard */}
        {roomState.phase === 'leaderboard' && !isShowingRoundResults && leaderboard.length > 0 && (
          <OverallLeaderboardCard
            leaderboard={leaderboard}
            isFinalRound={roomState.currentRound >= roomState.totalRounds}
            prizeCount={prizeCount}
            hasPrizeTie={hasPrizeTie}
            tieParticipants={tieParticipantsByName}
            onContinue={() => socket?.emit('next_round_or_end', { roomId })}
            onConfirmTiebreaker={() => socket?.emit('next_round_or_end', { roomId })}
          />
        )}

        {/* Post-game */}
        <HostPostgamePanel
          phase={roomState.phase}
          leaderboard={leaderboard}
          totalPlayers={roomState.totalPlayers || 0}
          hasFinalStats={hasFinalStats}
          allRoundsStats={allRoundsStats}
          roomId={roomId}
          paymentMethod={config?.paymentMethod ?? 'unknown'}
          debug={false}
          onReturnToDashboard={handleReturnToDashboard}
          onEndGame={handleEndGame}
          currentRound={roomState.currentRound}
          totalRounds={roomState.totalRounds}
          
        />
      </div>
    </div>
  );
};

export default HostControlsView;
