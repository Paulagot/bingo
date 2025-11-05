// src/components/Quiz/game/TiebreakerRound.tsx
import React, { useMemo, useCallback, useEffect } from 'react';
import { useQuizTimer } from '../hooks/useQuizTimer';

interface TiebreakerRoundProps {
  question: { id: string; text: string; timeLimit: number; questionStartTime?: number } | null;
  isTieBreakerParticipant: boolean;
  tbParticipants: string[];
  tbStillTied: string[];
  tbWinners: string[] | null;
  tbAnswer: string;
  setTbAnswer: (answer: string) => void;
  submitTieBreaker: () => void;
  currentRound?: number;
  timerActive?: boolean;
  correctAnswer?: number;
  showReview?: boolean;
  playerAnswers?: Record<string, number>;
  playersInRoom?: { id: string; name: string }[];
  onAutoSubmit?: () => void;
  questionNumber?: number;
  /** Controlled by parent — do NOT manage local state for this */
  hasSubmitted?: boolean;
}

const TiebreakerRound: React.FC<TiebreakerRoundProps> = ({
  question,
  isTieBreakerParticipant,
  tbParticipants,
  tbStillTied,
  tbWinners,
  tbAnswer,
  setTbAnswer,
  submitTieBreaker,
  timerActive = true,
  correctAnswer,
  showReview = false,
  playerAnswers = {},
  playersInRoom = [],
  onAutoSubmit,
  questionNumber = 1,
  hasSubmitted = false,
}) => {
  // Auto-submit when timer ends (parent owns hasSubmitted state)
  const handleAutoSubmit = useCallback(() => {
    if (!hasSubmitted && isTieBreakerParticipant) {
      if (onAutoSubmit) onAutoSubmit();
      else submitTieBreaker();
    }
  }, [hasSubmitted, isTieBreakerParticipant, onAutoSubmit, submitTieBreaker]);

  // Timer setup
  const timerQuestion = useMemo(() => {
    if (!question) return null;
    const { id, timeLimit, questionStartTime } = question;
    if (typeof timeLimit !== 'number') return null;
    return {
      id,
      timeLimit,
      questionStartTime: questionStartTime || Date.now(),
    };
  }, [question?.id, question?.timeLimit, question?.questionStartTime]);

  const { timeLeft } = useQuizTimer({
    question: timerQuestion,
    timerActive: !hasSubmitted && isTieBreakerParticipant && !!timerQuestion,
    onTimeUp: handleAutoSubmit,
  });

  // Debug helpful when testing
  useEffect(() => {
    console.log('[TiebreakerRound] Timer state:', {
      timeLeft,
      propTimerActive: timerActive,
      effectiveTimerActive: !hasSubmitted && isTieBreakerParticipant && !!timerQuestion,
      timerQuestion,
      hasSubmitted,
      isTieBreakerParticipant,
    });
  }, [timeLeft, timerActive, hasSubmitted, isTieBreakerParticipant, timerQuestion]);

  // Timer ring helpers
  const getTimerProgress = () => {
    if (!question?.timeLimit || timeLeft === null) return 157;
    const percentage = timeLeft / question.timeLimit;
    return 157 - percentage * 157;
  };

  const getTimerClass = () => {
    if (timeLeft === null) return 'timer-progress';
    if (timeLeft <= 1) return 'timer-progress danger';
    if (timeLeft <= 5) return 'timer-progress warning';
    return 'timer-progress';
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasSubmitted && tbAnswer.trim()) {
      submitTieBreaker(); // parent will flip hasSubmitted via server echo/recovery
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!hasSubmitted) {
      setTbAnswer(e.target.value);
    }
  };

  // Utility: get player name by ID
  const getPlayerName = (playerId: string) => {
    const player = playersInRoom.find((p) => p.id === playerId);
    return player?.name || `Player ${playerId}`;
  };

  // Build review analysis; guard for undefined/null AND empty map
  const getAnswerAnalysis = () => {
    if (
      correctAnswer === undefined ||
      correctAnswer === null ||
      Object.keys(playerAnswers).length === 0
    ) {
      return [];
    }

    return Object.entries(playerAnswers)
      .map(([playerId, answer]) => ({
        playerId,
        playerName: getPlayerName(playerId),
        answer,
        distance: Math.abs(answer - correctAnswer),
        isWinner: tbWinners?.includes(playerId) || false,
      }))
      .sort((a, b) => a.distance - b.distance);
  };

  const answerAnalysis = getAnswerAnalysis();

  return (
    <>
      <style>{`
        .tiebreaker-container {
          max-width: 800px;
          width: 100%;
          margin: 0 auto;
          padding: 0 16px;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          position: relative;
          z-index: 1;
        }
        @media (max-width: 768px) { .tiebreaker-container { padding: 0 12px; } }

        .tiebreaker-header {
          display: flex; justify-content: space-between; align-items: center;
          margin-bottom: 24px; background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
          padding: 16px 24px; border-radius: 20px; box-shadow: 0 4px 20px rgba(245, 158, 11, 0.15);
          border: 2px solid #f59e0b; flex-wrap: wrap; gap: 12px;
        }
        @media (max-width: 640px) { .tiebreaker-header { padding: 12px 16px; margin-bottom: 16px; } }

        .tiebreaker-info { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
        .tiebreaker-badge {
          background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
          color: white; padding: 8px 16px; border-radius: 12px; font-weight: 700; font-size: 14px;
          text-transform: uppercase; letter-spacing: 0.5px; animation: goldShimmer 2s ease-in-out infinite;
        }
        @keyframes goldShimmer { 0%,100%{box-shadow:0 0 10px rgba(245,158,11,.3);} 50%{box-shadow:0 0 20px rgba(245,158,11,.6),0 0 30px rgba(245,158,11,.4);} }
        @media (max-width: 480px) { .tiebreaker-badge { font-size: 12px; padding: 6px 12px; } }

        .question-counter { background:#fbbf24; color:#fff; padding:8px 16px; border-radius:12px; font-weight:600; font-size:14px; }
        @media (max-width:480px){ .question-counter{ font-size:12px; padding:6px 12px; } }

        .timer-section { display:flex; align-items:center; }
        .circular-timer { position:relative; width:60px; height:60px; }
        @media (max-width:480px){ .circular-timer{ width:50px; height:50px; } }
        .timer-ring { position:absolute; width:100%; height:100%; transform: rotate(-90deg); }
        .timer-ring circle { fill:none; stroke-width:4; }
        .timer-bg { stroke:#fde68a; }
        .timer-progress { stroke:#f59e0b; stroke-linecap:round; stroke-dasharray:157; transition: stroke-dashoffset 1s linear, stroke .3s ease; }
        .timer-progress.warning { stroke:#dc2626; animation: warningPulse .5s infinite; }
        .timer-progress.danger  { stroke:#991b1b; animation: dangerPulse .3s infinite; }
        @keyframes warningPulse { 0%,100%{opacity:1;} 50%{opacity:.7;} }
        @keyframes dangerPulse   { 0%,100%{opacity:1; stroke-width:4;} 50%{opacity:.8; stroke-width:6;} }
        .timer-text { position:absolute; top:50%; left:50%; transform:translate(-50%, -50%); font-weight:700; font-size:16px; color:#92400e; }
        @media (max-width:480px){ .timer-text{ font-size:14px; } }

        .tiebreaker-card {
          background: linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%);
          border-radius: 24px; padding: 32px; margin-bottom: 24px; box-shadow: 0 8px 32px rgba(245, 158, 11, 0.15);
          position: relative; overflow: visible; border: 3px solid transparent;
          background-image: linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%), linear-gradient(45deg, #f59e0b, #d97706, #fbbf24, #f59e0b);
          background-origin: border-box; background-clip: padding-box, border-box; animation: goldBorderFlow 3s ease-in-out infinite;
        }
        @media (max-width:640px){ .tiebreaker-card{ padding:20px; border-radius:16px; margin-bottom:16px; } }
        @keyframes goldBorderFlow { 0%,100%{ filter:hue-rotate(0deg); } 33%{ filter:hue-rotate(20deg); } 66%{ filter:hue-rotate(-20deg); } }

        .participants-info { text-align:center; margin-bottom:24px; padding:16px; background:rgba(245,158,11,.1); border-radius:12px; border:1px solid #fbbf24; }
        .participants-text { color:#92400e; font-weight:600; margin-bottom:8px; }
        .participants-list { color:#d97706; font-weight:500; }

        .question-text { font-size:24px; font-weight:700; color:#92400e; line-height:1.4; margin-bottom:32px; text-align:center; }
        @media (max-width:640px){ .question-text{ font-size:20px; margin-bottom:24px; } }
        @media (max-width:480px){ .question-text{ font-size:18px; margin-bottom:20px; } }

        .answer-form { display:flex; flex-direction:column; align-items:center; gap:16px; margin-bottom:24px; }
        .number-input { width:200px; padding:16px 20px; font-size:18px; font-weight:600; text-align:center; border:3px solid #fbbf24; border-radius:16px; background:#fff; color:#92400e; transition: all .3s ease; }
        @media (max-width:480px){ .number-input{ width:160px; padding:12px 16px; font-size:16px; } }
        .number-input:focus { outline:none; border-color:#f59e0b; box-shadow:0 0 20px rgba(245,158,11,.3); transform: scale(1.05); }
        .number-input:disabled { opacity:.6; cursor:not-allowed; }

        .submit-button { background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color:#fff; border:none; padding:14px 28px; font-size:16px; font-weight:600; border-radius:12px; cursor:pointer; transition: all .3s ease; text-transform: uppercase; letter-spacing:.5px; }
        .submit-button:hover:not(:disabled){ transform: translateY(-2px); box-shadow: 0 8px 25px rgba(245,158,11,.4); background: linear-gradient(135deg, #d97706 0%, #b45309 100%); }
        .submit-button:disabled{ opacity:.6; cursor:not-allowed; transform:none; box-shadow:none; }

        .submitted-indicator { text-align:center; padding:16px; background: rgba(16,185,129,.1); border:2px solid #10b981; border-radius:12px; color:#065f46; font-weight:600; margin-bottom:24px; }
        .observer-mode { text-align:center; padding:20px; background: rgba(107,114,128,.1); border:2px solid #6b7280; border-radius:12px; color:#374151; font-weight:500; }

        .review-section { background:#fff; border-radius:16px; padding:24px; margin-top:24px; box-shadow: 0 4px 20px rgba(0,0,0,.1); }
        .review-title { font-size:20px; font-weight:700; color:#92400e; margin-bottom:20px; text-align:center; }
        .correct-answer { text-align:center; margin-bottom:24px; padding:16px; background: linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%); border-radius:12px; border:2px solid #22c55e; }
        .correct-answer-text { font-size:18px; font-weight:700; color:#15803d; }

        .answers-grid { display:grid; gap:12px; margin-bottom:20px; }
        .answer-row { display:flex; align-items:center; justify-content:space-between; padding:12px 16px; border-radius:8px; border:2px solid #e5e7eb; background:#f9fafb; }
        .answer-row.winner { background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border-color:#f59e0b; }
        .player-info { display:flex; align-items:center; gap:8px; }
        .winner-crown { color:#f59e0b; font-size:16px; }
        .player-name { font-weight:600; color:#374151; }
        .answer-details { display:flex; align-items:center; gap:12px; font-size:14px; }
        .player-answer { font-weight:600; color:#1f2937; }
        .distance { color:#6b7280; }
        .distance.perfect { color:#22c55e; font-weight:600; }

        .winners-announcement { text-align:center; padding:20px; background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border-radius:12px; border:2px solid #f59e0b; margin-top:16px; }
        .winners-text { font-size:18px; font-weight:700; color:#92400e; margin-bottom:8px; }
        .next-round-text { color:#d97706; font-weight:500; }
      `}</style>

      <div className="tiebreaker-container">
        {/* Header */}
        <div className="tiebreaker-header">
          <div className="tiebreaker-info">
            <div className="tiebreaker-badge">Tie-Breaker</div>
            {questionNumber > 1 && <div className="question-counter">Question {questionNumber}</div>}
          </div>

          {question && (
            <div className="timer-section">
              <div className="circular-timer">
                <svg className="timer-ring" viewBox="0 0 50 50">
                  <circle cx="25" cy="25" r="25" className="timer-bg"></circle>
                  <circle
                    cx="25"
                    cy="25"
                    r="25"
                    className={getTimerClass()}
                    style={{ strokeDashoffset: getTimerProgress() }}
                  ></circle>
                </svg>
                <div className="timer-text">{timeLeft ?? '0'}</div>
              </div>
            </div>
          )}
        </div>

        <div className="tiebreaker-card">
          {showReview ? (
            // Review Phase
            <div className="review-section">
              <div className="review-title">Tie-Breaker Results</div>

              {correctAnswer !== undefined && correctAnswer !== null && (
                <div className="correct-answer">
                  <div className="correct-answer-text">
                    Correct Answer: {Number(correctAnswer).toLocaleString()}
                  </div>
                </div>
              )}

              {answerAnalysis.length > 0 && (
                <div className="answers-grid">
                  {answerAnalysis.map(({ playerId, playerName, answer, distance, isWinner }) => (
                    <div key={playerId} className={`answer-row ${isWinner ? 'winner' : ''}`}>
                      <div className="player-info">
                        {isWinner && <span className="winner-crown">👑</span>}
                        <span className="player-name">{playerName}</span>
                      </div>
                      <div className="answer-details">
                        <span className="player-answer">{answer.toLocaleString()}</span>
                        <span className={`distance ${distance === 0 ? 'perfect' : ''}`}>
                          {distance === 0 ? 'Perfect!' : `Off by ${distance.toLocaleString()}`}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {tbWinners && tbWinners.length > 0 && (
                <div className="winners-announcement">
                  <div className="winners-text">
                    Winner{tbWinners.length > 1 ? 's' : ''}: {tbWinners.map(getPlayerName).join(', ')}
                  </div>
                  <div className="next-round-text">
                    {tbWinners.length === 1
                      ? 'Returning to final results...'
                      : 'Another tie-breaker needed...'}
                  </div>
                </div>
              )}
            </div>
          ) : !question ? (
            // Waiting for question
            <div className="participants-info">
              <div className="participants-text">Preparing tie-breaker question...</div>
              <div className="participants-list">
                {(tbStillTied.length ? tbStillTied : tbParticipants).map(getPlayerName).join(', ')}
              </div>
            </div>
          ) : (
            // Question Phase
            <>
              <div className="participants-info">
                <div className="participants-text">Tie-breaker between:</div>
                <div className="participants-list">
                  {(tbStillTied.length ? tbStillTied : tbParticipants).map(getPlayerName).join(', ')}
                </div>
              </div>

              <div className="question-text">{question.text}</div>

              {isTieBreakerParticipant ? (
                hasSubmitted ? (
                  <div className="submitted-indicator">
                    ✅ Answer submitted: {tbAnswer}
                    <br />
                    Waiting for review..
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="answer-form">
                    <input
                      type="number"
                      inputMode="numeric"
                      step="1"
                      value={tbAnswer}
                      onChange={handleInputChange}
                      className="number-input"
                      placeholder="Your answer"
                      disabled={hasSubmitted}
                      autoFocus
                    />
                    <button
                      type="submit"
                      className="submit-button"
                      disabled={!tbAnswer.trim() || hasSubmitted}
                    >
                      Submit Answer
                    </button>
                  </form>
                )
              ) : (
                <div className="observer-mode">
                  You are observing this tie-breaker round.
                  <br />
                  Waiting for participants to submit their answers...
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
};

export default TiebreakerRound;
