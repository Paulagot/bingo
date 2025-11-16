// src/components/Quiz/host-controls/components/HostTiebreakerPanel.tsx
import React, { useMemo } from 'react';
import { Crown, Timer, Users, Eye, Trophy, Medal } from 'lucide-react';
import { useQuizTimer } from '../../hooks/useQuizTimer';

interface TiebreakerQuestion {
  id: string;
  text: string;
  timeLimit: number;
  questionStartTime?: number;
}

interface HostTiebreakerPanelProps {
  visible: boolean;
  participants: string[];
  question?: TiebreakerQuestion | null;
  winners?: string[] | null;
  playerAnswers?: Record<string, number>;
  correctAnswer?: number;
  showReview?: boolean;
  playersInRoom?: { id: string; name: string }[];
  questionNumber?: number;
  stillTied?: string[];
}

const HostTiebreakerPanel: React.FC<HostTiebreakerPanelProps> = ({
  visible,
  participants,
  question,
  winners,
  playerAnswers = {},
  correctAnswer,
  showReview = false,
  playersInRoom = [],
  questionNumber = 1
}) => {
  if (!visible) return null;

  // Timer setup for active questions
  const timerQuestion = useMemo(() => {
    if (!question || !question.timeLimit) return null;
    return {
      id: question.id,
      timeLimit: question.timeLimit,
      questionStartTime: question.questionStartTime || Date.now()
    };
  }, [question?.id, question?.timeLimit, question?.questionStartTime]);

  const { timeLeft } = useQuizTimer({
    question: timerQuestion,
    timerActive: !!question && !showReview,
   
  });

  // Helper to get player names
  const getPlayerName = (playerId: string) => {
    const player = playersInRoom.find(p => p.id === playerId);
    return player?.name || `Player ${playerId}`;
  };

  // Calculate answer analysis for review
  const getAnswerAnalysis = () => {
    if (!correctAnswer || !Object.keys(playerAnswers).length) return [];
    
    return Object.entries(playerAnswers).map(([playerId, answer]) => ({
      playerId,
      playerName: getPlayerName(playerId),
      answer: answer,
      distance: Math.abs(answer - correctAnswer),
      isWinner: winners?.includes(playerId) || false
    })).sort((a, b) => a.distance - b.distance);
  };

  const answerAnalysis = getAnswerAnalysis();
  const hasSubmittedAnswers = Object.keys(playerAnswers).length > 0;
  const participantNames = participants.map(getPlayerName);



  return (
    <div className="mb-6 overflow-hidden rounded-xl border-2 border-amber-300 bg-gradient-to-r from-amber-50 to-yellow-50 shadow-lg">
      {/* Header Section */}
      <div className="bg-gradient-to-r from-amber-600 to-yellow-600 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20">
              <Trophy className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Tie-breaker Round</h3>
              <p className="text-amber-100 text-sm">
                {questionNumber > 1 ? `Question ${questionNumber}` : 'Resolving tie'}
              </p>
            </div>
          </div>
          
          {/* Timer Display */}
          {question && timeLeft !== null && (
            <div className="flex items-center space-x-3">
              <Timer className="h-5 w-5 text-white" />
              <div className="text-right">
                <div className={`text-2xl font-bold text-white ${
                  timeLeft <= 5 ? 'animate-pulse' : ''
                }`}>
                  {timeLeft}s
                </div>
                <div className="text-xs text-amber-100">remaining</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Content Section */}
      <div className="p-6">
        {!question ? (
          /* Waiting State */
          <div className="text-center">
            <div className="mb-4 flex items-center justify-center space-x-2">
              <Users className="h-5 w-5 text-amber-600" />
              <span className="font-semibold text-amber-900">Preparing tie-breaker question</span>
            </div>
            
            <div className="rounded-lg bg-amber-100 p-4">
              <div className="mb-2 text-sm font-medium text-amber-800">Participants:</div>
              <div className="flex flex-wrap justify-center gap-2">
                {participantNames.map((name, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center space-x-1 rounded-full bg-amber-200 px-3 py-1 text-sm font-medium text-amber-900"
                  >
                    <Medal className="h-3 w-3" />
                    <span>{name}</span>
                  </span>
                ))}
              </div>
            </div>
          </div>
        ) : showReview ? (
          /* Review State */
          <div className="space-y-6">
            {/* Question Display */}
            <div className="rounded-lg bg-white p-4 shadow-sm">
              <div className="mb-2 flex items-center space-x-2">
                <Eye className="h-4 w-4 text-gray-600" />
                <span className="text-sm font-medium text-gray-600">Question:</span>
              </div>
              <p className="text-lg font-semibold text-gray-900">{question.text}</p>
            </div>

            {/* Correct Answer */}
            {correctAnswer !== undefined && (
              <div className="rounded-lg border-2 border-green-200 bg-green-50 p-4">
                <div className="text-center">
                  <div className="text-sm font-medium text-green-800">Correct Answer</div>
                  <div className="text-2xl font-bold text-green-900">
                    {correctAnswer.toLocaleString()}
                  </div>
                </div>
              </div>
            )}

            {/* Answer Analysis */}
            {answerAnalysis.length > 0 && (
              <div className="space-y-3">
                <h4 className="font-semibold text-gray-900">Participant Answers</h4>
                <div className="space-y-2">
                  {answerAnalysis.map(({ playerId, playerName, answer, distance, isWinner }) => (
                    <div
                      key={playerId}
                      className={`flex items-center justify-between rounded-lg border-2 p-3 ${
                        isWinner
                          ? 'border-yellow-300 bg-yellow-50'
                          : 'border-gray-200 bg-white'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        {isWinner && <Crown className="h-4 w-4 text-yellow-600" />}
                        <span className={`font-medium ${
                          isWinner ? 'text-yellow-900' : 'text-gray-900'
                        }`}>
                          {playerName}
                        </span>
                      </div>
                      <div className="flex items-center space-x-4">
                        <span className="font-semibold text-gray-900">
                          {answer.toLocaleString()}
                        </span>
                        <span className={`text-sm ${
                          distance === 0 
                            ? 'font-semibold text-green-600' 
                            : 'text-gray-600'
                        }`}>
                          {distance === 0 
                            ? 'Perfect!' 
                            : `Off by ${distance.toLocaleString()}`
                          }
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Winners Announcement */}
            {winners && winners.length > 0 && (
              <div className="rounded-lg border-2 border-amber-300 bg-amber-50 p-4 text-center">
                <div className="mb-2 text-lg font-bold text-amber-900">
                  Tie-breaker Winner{winners.length > 1 ? 's' : ''}
                </div>
                <div className="flex flex-wrap justify-center gap-2">
                  {winners.map((winnerId, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center space-x-1 rounded-full bg-amber-200 px-3 py-2 font-semibold text-amber-900"
                    >
                      <Crown className="h-4 w-4" />
                      <span>{getPlayerName(winnerId)}</span>
                    </span>
                  ))}
                </div>
                <div className="mt-2 text-sm text-amber-700">
                  {winners.length === 1 
                    ? 'Returning to final results...' 
                    : 'Additional tie-breaker may be needed...'
                  }
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Active Question State */
          <div className="space-y-4">
            {/* Participants Info */}
            <div className="rounded-lg bg-amber-100 p-4">
              <div className="mb-2 flex items-center space-x-2">
                <Users className="h-4 w-4 text-amber-700" />
                <span className="text-sm font-medium text-amber-800">Competing:</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {participantNames.map((name, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center space-x-1 rounded-full bg-amber-200 px-3 py-1 text-sm font-medium text-amber-900"
                  >
                    <Medal className="h-3 w-3" />
                    <span>{name}</span>
                  </span>
                ))}
              </div>
            </div>

            {/* Question Display */}
            <div className="rounded-lg bg-white p-6 shadow-sm">
              <div className="mb-3 flex items-center space-x-2">
                <Eye className="h-5 w-5 text-gray-600" />
                <span className="font-medium text-gray-600">Tie-breaker Question:</span>
              </div>
              <p className="text-xl font-semibold text-gray-900">{question.text}</p>
            </div>

            {/* Submission Status */}
            <div className="rounded-lg border-2 border-blue-200 bg-blue-50 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Timer className="h-4 w-4 text-blue-600" />
                  <span className="text-sm font-medium text-blue-800">
                    Waiting for participant answers...
                  </span>
                </div>
                {hasSubmittedAnswers && (
                  <div className="text-sm text-blue-700">
                    {Object.keys(playerAnswers).length}/{participants.length} submitted
                  </div>
                )}
              </div>
              
              {/* Progress Bar */}
              <div className="mt-3">
                <div className="h-2 w-full rounded-full bg-blue-200">
                  <div
                    className="h-2 rounded-full bg-blue-600 transition-all duration-300"
                    style={{
                      width: `${(Object.keys(playerAnswers).length / participants.length) * 100}%`
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Host Notice */}
        <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3">
          <p className="text-center text-sm font-medium text-amber-800">
            Host actions are locked during tie-breaker resolution
          </p>
        </div>
      </div>
    </div>
  );
};

export default HostTiebreakerPanel;
