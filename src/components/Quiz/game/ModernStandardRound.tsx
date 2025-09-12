// ModernStandardRound.tsx - Updated with stronger flash and more transparent countdown
import React, { useState, useEffect, useRef } from 'react';
import { RoundComponentProps } from '../types/quiz';
import { usePlayerStore } from '../hooks/usePlayerStore';
import UseExtraModal from './UseExtraModal';

interface ModernStandardRoundProps extends RoundComponentProps {
  questionNumber?: number;
  totalQuestions?: number;
  difficulty?: string;
  category?: string;
  playersInRoom?: { id: string; name: string }[];
  isFlashing?: boolean;
  currentEffect?: any;
  getFlashClasses?: () => string;
}

const ModernStandardRound: React.FC<ModernStandardRoundProps> = ({
  question,
  timerActive,
  selectedAnswer,
  setSelectedAnswer,
  answerSubmitted,
  clue,
  feedback,
  isFrozen,
  frozenNotice,
  playerId,
  roundExtras,
  usedExtras,
  usedExtrasThisRound,
  onUseExtra,
  questionNumber,
  totalQuestions,
  difficulty = 'medium',
  category = 'General Knowledge',
  playersInRoom = [],
  isFlashing = false,
  currentEffect,
  getFlashClasses = () => ''
}) => {
  const { players } = usePlayerStore();
  const thisPlayer = players.find(p => p.id === playerId);
  const [displayTimeLeft, setDisplayTimeLeft] = useState(15);
  const [freezeModalOpen, setFreezeModalOpen] = useState(false);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Timer management - sync with server timing
  useEffect(() => {
    if (timerActive && question?.timeLimit) {
      const startTime = question.questionStartTime || Date.now();
      const totalTime = question.timeLimit;
      
      const updateTimer = () => {
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        const remaining = Math.max(0, totalTime - elapsed);
        setDisplayTimeLeft(remaining);
        
        if (remaining <= 0) {
          if (timerIntervalRef.current) {
            clearInterval(timerIntervalRef.current);
            timerIntervalRef.current = null;
          }
        }
      };

      updateTimer();
      timerIntervalRef.current = setInterval(updateTimer, 1000);

      return () => {
        if (timerIntervalRef.current) {
          clearInterval(timerIntervalRef.current);
          timerIntervalRef.current = null;
        }
      };
    }
  }, [timerActive, question?.timeLimit, question?.questionStartTime]);

  // Timer ring calculation for circular progress
  const getTimerProgress = () => {
    if (!question?.timeLimit) return 0;
    const percentage = (displayTimeLeft / question.timeLimit);
    return 157 - (percentage * 157); // 157 is circumference for radius=25
  };

  const getTimerClass = () => {
    if (displayTimeLeft <= 3) return 'timer-progress danger';
    if (displayTimeLeft <= 10) return 'timer-progress warning';
    return 'timer-progress';
  };

  const getDifficultyBadgeClass = () => {
    switch (difficulty?.toLowerCase()) {
      case 'easy': return 'difficulty-badge easy';
      case 'hard': return 'difficulty-badge hard';
      default: return 'difficulty-badge medium';
    }
  };

  const getOptionLetter = (index: number) => {
    return String.fromCharCode(65 + index); // A, B, C, D
  };

  const handleOptionSelect = (option: string) => {
    if (!answerSubmitted && !isFrozen) {
      setSelectedAnswer(option);
      console.log('[ModernStandardRound] Selected answer:', option);
    }
  };

  const handleExtraClick = (extraId: string) => {
    if (usedExtras[extraId] || usedExtrasThisRound[extraId]) return;
    
    if (extraId === 'freezeOutTeam') {
      if (playersInRoom.filter(p => p.id !== playerId).length === 0) {
        alert('No other players to target');
        return;
      }
      setFreezeModalOpen(true);
    } else {
      onUseExtra(extraId);
    }
  };

  const handleFreezeConfirm = (targetPlayerId: string) => {
    onUseExtra('freezeOutTeam', targetPlayerId);
    setFreezeModalOpen(false);
  };

  const getExtraIcon = (extraId: string) => {
    switch (extraId) {
      case 'buyHint': return '💡';
      case 'freezeOutTeam': return '❄️';
      case 'restorePoints': return '🎯';
      case 'robPoints': return '💰';
      default: return '✨';
    }
  };

  const getExtraClass = (extraId: string) => {
    const baseClass = 'power-up';
    switch (extraId) {
      case 'buyHint': return `${baseClass} hint`;
      case 'freezeOutTeam': return `${baseClass} freeze`;
      case 'restorePoints': return `${baseClass} restore`;
      case 'robPoints': return `${baseClass} rob`;
      default: return baseClass;
    }
  };

  const getExtraTooltip = (extraId: string) => {
    switch (extraId) {
      case 'buyHint': return 'Use Hint';
      case 'freezeOutTeam': return 'Freeze Opponent';
      case 'restorePoints': return 'Restore Points';
      case 'robPoints': return 'Rob Points';
      default: return 'Power Up';
    }
  };

  const isExtraDisabled = (extraId: string) => {
    return usedExtras[extraId] || usedExtrasThisRound[extraId] || 
           (extraId === 'buyHint' && answerSubmitted);
  };

  return (
    <>
      <style>{`
        .game-container {
          max-width: 800px;
          width: 100%;
          margin: 0 auto;
          padding: 0 16px;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          position: relative;
          z-index: 1;
        }

        /* 📱 RESPONSIVE BREAKPOINTS */
        @media (max-width: 768px) {
          .game-container {
            padding: 0 12px;
          }
        }

        .game-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
          background: white;
          padding: 16px 24px;
          border-radius: 20px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
          flex-wrap: wrap;
          gap: 12px;
        }

        @media (max-width: 640px) {
          .game-header {
            padding: 12px 16px;
            margin-bottom: 16px;
          }
        }

        .round-info {
          display: flex;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
        }

        .round-badge {
          background: linear-gradient(135deg, #8b5cf6 0%, #a855f7 100%);
          color: white;
          padding: 8px 16px;
          border-radius: 12px;
          font-weight: 600;
          font-size: 14px;
        }

        @media (max-width: 480px) {
          .round-badge {
            font-size: 12px;
            padding: 6px 12px;
          }
        }

        .question-counter {
          background: #f1f5f9;
          padding: 8px 16px;
          border-radius: 12px;
          color: #64748b;
          font-weight: 500;
          font-size: 14px;
        }

        @media (max-width: 480px) {
          .question-counter {
            font-size: 12px;
            padding: 6px 12px;
          }
        }

        .timer-section {
          display: flex;
          align-items: center;
        }

        .circular-timer {
          position: relative;
          width: 60px;
          height: 60px;
        }

        @media (max-width: 480px) {
          .circular-timer {
            width: 50px;
            height: 50px;
          }
        }

        .timer-ring {
          position: absolute;
          width: 100%;
          height: 100%;
          transform: rotate(-90deg);
        }

        .timer-ring circle {
          fill: none;
          stroke-width: 4;
        }

        .timer-bg {
          stroke: #e2e8f0;
        }

        .timer-progress {
          stroke: #10b981;
          stroke-linecap: round;
          stroke-dasharray: 157;
          transition: stroke-dashoffset 1s linear, stroke 0.3s ease;
        }

        .timer-progress.warning {
          stroke: #f59e0b;
        }

        .timer-progress.danger {
          stroke: #ef4444;
          animation: timerPulse 0.5s infinite;
        }

        @keyframes timerPulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }

        .timer-text {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          font-weight: 700;
          font-size: 16px;
          color: #1e293b;
        }

        @media (max-width: 480px) {
          .timer-text {
            font-size: 14px;
          }
        }

        .player-status {
          display: flex;
          align-items: center;
          gap: 12px;
          background: #f8fafc;
          padding: 12px 16px;
          border-radius: 12px;
          margin-bottom: 16px;
        }

        .player-avatar {
          width: 32px;
          height: 32px;
          border-radius: 8px;
          background: linear-gradient(135deg, #8b5cf6, #06b6d4);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: 600;
          font-size: 14px;
        }

        .score-display {
          color: #64748b;
          font-weight: 500;
        }

        .score-value {
          color: #10b981;
          font-weight: 700;
        }

        .question-card {
          background: white;
          border-radius: 24px;
          padding: 32px;
          margin-bottom: 24px;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.08);
          position: relative;
          overflow: visible;
          border: 3px solid transparent;
          background-image: linear-gradient(white, white), 
                           linear-gradient(45deg, #8b5cf6, #06b6d4, #10b981, #f59e0b, #8b5cf6);
          background-origin: border-box;
          background-clip: padding-box, border-box;
          animation: borderFlow 4s ease-in-out infinite;
        }

        @media (max-width: 640px) {
          .question-card {
            padding: 20px;
            border-radius: 16px;
            margin-bottom: 16px;
          }
        }

        @keyframes borderFlow {
          0%, 100% { 
            filter: hue-rotate(0deg);
          }
          25% { 
            filter: hue-rotate(90deg);
          }
          50% { 
            filter: hue-rotate(180deg);
          }
          75% { 
            filter: hue-rotate(270deg);
          }
        }

        .question-meta {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
          gap: 12px;
          flex-wrap: wrap;
        }

        @media (max-width: 640px) {
          .question-meta {
            margin-bottom: 16px;
          }
        }

        .difficulty-badge {
          padding: 6px 12px;
          border-radius: 8px;
          font-size: 12px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .difficulty-badge.easy {
          background: #dcfce7;
          color: #16a34a;
        }

        .difficulty-badge.medium {
          background: #fef3c7;
          color: #d97706;
        }

        .difficulty-badge.hard {
          background: #fecaca;
          color: #dc2626;
        }

        .category-tag {
          background: #f1f5f9;
          color: #64748b;
          padding: 6px 12px;
          border-radius: 8px;
          font-size: 12px;
          font-weight: 500;
        }

        .question-text {
          font-size: 24px;
          font-weight: 600;
          color: #1e293b;
          line-height: 1.4;
          margin-bottom: 32px;
          text-align: center;
        }

        @media (max-width: 640px) {
          .question-text {
            font-size: 20px;
            margin-bottom: 24px;
          }
        }

        @media (max-width: 480px) {
          .question-text {
            font-size: 18px;
            margin-bottom: 20px;
          }
        }

        .clue-section {
          background: #fef9c3;
          border: 2px solid #fbbf24;
          border-radius: 12px;
          padding: 16px;
          margin-bottom: 24px;
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .clue-icon {
          font-size: 20px;
        }

        .clue-text {
          color: #92400e;
          font-weight: 500;
          flex: 1;
        }

        .options-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
          margin-bottom: 32px;
        }

        @media (max-width: 640px) {
          .options-grid {
            grid-template-columns: 1fr;
            gap: 12px;
            margin-bottom: 24px;
          }
        }

        .option-button {
          background: white;
          border: 2px solid #e2e8f0;
          border-radius: 16px;
          padding: 20px 24px;
          font-size: 16px;
          font-weight: 500;
          color: #1e293b;
          cursor: pointer;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          gap: 12px;
          min-height: 80px;
          position: relative;
          overflow: hidden;
          text-align: left;
        }

        @media (max-width: 640px) {
          .option-button {
            padding: 16px 20px;
            font-size: 14px;
            min-height: 60px;
          }
        }

        .option-button:disabled {
          cursor: not-allowed;
          opacity: 0.6;
        }

        .option-letter {
          width: 32px;
          height: 32px;
          border-radius: 8px;
          background: #f1f5f9;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          color: #64748b;
          flex-shrink: 0;
        }

        @media (max-width: 640px) {
          .option-letter {
            width: 28px;
            height: 28px;
            font-size: 14px;
          }
        }

        .option-button:hover:not(:disabled):not(.selected) {
          border-color: #8b5cf6;
          background: #faf5ff;
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(139, 92, 246, 0.15);
        }

        .option-button.selected {
          border-color: #8b5cf6;
          background: linear-gradient(135deg, #8b5cf6 0%, #a855f7 100%);
          color: white;
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(139, 92, 246, 0.3);
        }

        /* 🔥 FIXED: Selected hover state - keep the selected styling */
        .option-button.selected:hover {
          background: linear-gradient(135deg, #7c3aed 0%, #9333ea 100%);
          border-color: #7c3aed;
          color: white;
        }

        .option-button.selected .option-letter {
          background: rgba(255, 255, 255, 0.2);
          color: white;
        }

        .frozen-indicator {
          text-align: center;
          padding: 16px;
          background: rgba(239, 68, 68, 0.1);
          border: 2px solid #ef4444;
          border-radius: 12px;
          margin-bottom: 24px;
          color: #dc2626;
          font-weight: 600;
        }

        .feedback-section {
          background: #dbeafe;
          border: 2px solid #3b82f6;
          border-radius: 12px;
          padding: 16px;
          margin-bottom: 24px;
          text-align: center;
        }

        .feedback-text {
          color: #1e40af;
          font-weight: 600;
          font-size: 18px;
        }

        @media (max-width: 640px) {
          .feedback-text {
            font-size: 16px;
          }
        }

        .actions-section {
          position: relative;
          z-index: 10;
        }

        .power-ups {
          display: flex;
          gap: 16px;
          justify-content: center;
          flex-wrap: wrap;
        }

        @media (max-width: 640px) {
          .power-ups {
            gap: 12px;
          }
        }

        .power-up {
          width: 50px;
          height: 50px;
          border-radius: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.3s ease;
          border: 2px solid transparent;
          font-size: 20px;
          position: relative;
          /* 🚀 EYE-CATCHING PULSE ANIMATION */
          animation: powerUpPulse 2s infinite;
        }

        @media (max-width: 640px) {
          .power-up {
            width: 45px;
            height: 45px;
            font-size: 18px;
          }
        }

        /* 🎯 ATTENTION-GRABBING ANIMATIONS */
        @keyframes powerUpPulse {
          0%, 100% { 
            transform: scale(1); 
            box-shadow: 0 0 0 0 rgba(139, 92, 246, 0.7);
          }
          50% { 
            transform: scale(1.05); 
            box-shadow: 0 0 20px 10px rgba(139, 92, 246, 0);
          }
        }

        @keyframes powerUpBounce {
          0%, 20%, 50%, 80%, 100% { transform: translateY(0); }
          40% { transform: translateY(-8px); }
          60% { transform: translateY(-4px); }
        }

        @keyframes powerUpGlow {
          0%, 100% { box-shadow: 0 0 5px rgba(139, 92, 246, 0.5); }
          50% { box-shadow: 0 0 20px rgba(139, 92, 246, 0.8), 0 0 30px rgba(139, 92, 246, 0.6); }
        }

        .power-up:not(:disabled) {
          animation: powerUpPulse 2s infinite, powerUpBounce 3s infinite 0.5s;
        }

        .power-up.hint {
          background: linear-gradient(135deg, #06b6d4 0%, #0891b2 100%);
          color: white;
        }

        .power-up.freeze {
          background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%);
          color: white;
        }

        .power-up.restore {
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          color: white;
        }

        .power-up.rob {
          background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
          color: white;
        }

        .power-up:hover:not(:disabled) {
          transform: scale(1.15);
          box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
          animation: powerUpGlow 1s infinite;
        }

        .power-up:disabled {
          opacity: 0.4;
          cursor: not-allowed;
          transform: none !important;
          animation: none !important;
        }

        /* 🔧 FIXED: Tooltip positioning and z-index */
        .power-up-tooltip {
          position: absolute;
          bottom: 100%;
          left: 50%;
          transform: translateX(-50%);
          margin-bottom: 8px;
          background: #1e293b;
          color: white;
          padding: 8px 12px;
          border-radius: 6px;
          font-size: 12px;
          white-space: nowrap;
          opacity: 0;
          pointer-events: none;
          transition: opacity 0.2s;
          z-index: 1000;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }

        /* Tooltip arrow */
        .power-up-tooltip::after {
          content: '';
          position: absolute;
          top: 100%;
          left: 50%;
          transform: translateX(-50%);
          border: 5px solid transparent;
          border-top-color: #1e293b;
        }

        .power-up:hover .power-up-tooltip {
          opacity: 1;
        }

        @media (max-width: 640px) {
          .power-up-tooltip {
            font-size: 10px;
            padding: 6px 8px;
          }
        }

        /* 🔢 ENHANCED COUNTDOWN OVERLAY - More transparent */
        .countdown-overlay {
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          font-size: 6rem;
          font-weight: bold;
          z-index: 1000;
          pointer-events: none;
          animation: gentleBounce 0.6s ease-in-out;
          opacity: 0.6; /* Made more transparent */
          text-shadow: 0 4px 20px rgba(0, 0, 0, 0.3); /* Added subtle shadow */
        }

        @media (max-width: 640px) {
          .countdown-overlay {
            font-size: 4rem;
          }
        }

        @keyframes gentleBounce {
          0% { 
            transform: translate(-50%, -50%) scale(0.8);
            opacity: 0.3;
          }
          50% { 
            transform: translate(-50%, -50%) scale(1.1);
            opacity: 0.7;
          }
          100% { 
            transform: translate(-50%, -50%) scale(1);
            opacity: 0.6;
          }
        }

        /* More transparent countdown colors */
        .countdown-3 { 
          color: rgba(16, 185, 129, 0.7); /* Made more transparent */
        }
        .countdown-2 { 
          color: rgba(245, 158, 11, 0.7); /* Made more transparent */
        }
        .countdown-1 { 
          color: rgba(239, 68, 68, 0.7); /* Made more transparent */
        }

        /* 🎨 ENHANCED FLASH EFFECTS - Much stronger */
        .flash-effect {
          transition: all 0.2s ease-in-out;
          position: relative;
        }

        .flash-effect::before {
          content: '';
          position: absolute;
          top: -8px;
          left: -8px;
          right: -8px;
          bottom: -8px;
          border-radius: 32px;
          pointer-events: none;
          opacity: 0;
          animation: strongFlash 0.6s ease-in-out;
          z-index: -1;
        }

        .flash-green::before {
          background: linear-gradient(135deg, rgba(34, 197, 94, 0.3), rgba(34, 197, 94, 0.15));
          border: 2px solid rgba(34, 197, 94, 0.4);
          box-shadow: 
            0 0 30px rgba(34, 197, 94, 0.3),
            0 0 60px rgba(34, 197, 94, 0.2),
            inset 0 0 20px rgba(34, 197, 94, 0.1);
        }

        .flash-orange::before {
          background: linear-gradient(135deg, rgba(251, 146, 60, 0.3), rgba(251, 146, 60, 0.15));
          border: 2px solid rgba(251, 146, 60, 0.4);
          box-shadow: 
            0 0 30px rgba(251, 146, 60, 0.3),
            0 0 60px rgba(251, 146, 60, 0.2),
            inset 0 0 20px rgba(251, 146, 60, 0.1);
        }

        .flash-red::before {
          background: linear-gradient(135deg, rgba(239, 68, 68, 0.3), rgba(239, 68, 68, 0.15));
          border: 2px solid rgba(239, 68, 68, 0.4);
          box-shadow: 
            0 0 30px rgba(239, 68, 68, 0.3),
            0 0 60px rgba(239, 68, 68, 0.2),
            inset 0 0 20px rgba(239, 68, 68, 0.1);
        }

        @keyframes strongFlash {
          0% { 
            opacity: 0;
            transform: scale(0.9);
          }
          25% { 
            opacity: 0.8;
            transform: scale(1.05);
          }
          50% { 
            opacity: 1;
            transform: scale(1.08);
          }
          75% { 
            opacity: 0.6;
            transform: scale(1.02);
          }
          100% { 
            opacity: 0;
            transform: scale(1);
          }
        }

        /* 🌟 OPTIONAL: Full-screen flash overlay for even stronger effect */
        .fullscreen-flash {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          pointer-events: none;
          z-index: 999;
          opacity: 0;
          transition: opacity 0.1s ease;
        }

        .fullscreen-flash.flash-green {
          background: rgba(34, 197, 94, 0.1);
          animation: fullscreenPulse 0.4s ease-in-out;
        }

        .fullscreen-flash.flash-orange {
          background: rgba(251, 146, 60, 0.1);
          animation: fullscreenPulse 0.4s ease-in-out;
        }

        .fullscreen-flash.flash-red {
          background: rgba(239, 68, 68, 0.1);
          animation: fullscreenPulse 0.4s ease-in-out;
        }

        @keyframes fullscreenPulse {
          0% { opacity: 0; }
          50% { opacity: 0.3; }
          100% { opacity: 0; }
        }
      `}</style>

      <div className={`game-container ${getFlashClasses()}`}>
        {/* Enhanced Full-Screen Flash Effect */}
        {currentEffect && isFlashing && (
          <div className={`fullscreen-flash ${getFlashClasses()}`}></div>
        )}

        {/* More Transparent Countdown Effect Overlay */}
        {currentEffect && isFlashing && (
          <div className={`countdown-overlay countdown-${currentEffect.secondsLeft || 1}`}>
            {currentEffect.message}
          </div>
        )}

        {/* Game Header */}
        <div className="game-header">
          <div className="round-info">
            <div className="round-badge">Round {questionNumber ? Math.ceil(questionNumber / 8) : 1}</div>
            <div className="question-counter">Question {questionNumber}/{totalQuestions}</div>
          </div>
          
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
              <div className="timer-text">{displayTimeLeft}</div>
            </div>
          </div>
        </div>

        {/* Frozen Indicator */}
        {isFrozen && frozenNotice && (
          <div className="frozen-indicator">
            {frozenNotice}
          </div>
        )}

        {/* Question Card */}
        <div className="question-card" data-testid="question-card">
          <div className="question-meta">
            <div className={getDifficultyBadgeClass()}>{difficulty}</div>
            <div className="category-tag">{category}</div>
          </div>

          <div className="question-text">
            {question.text}
          </div>

          {/* Clue Section */}
          {clue && (
            <div className="clue-section">
              <div className="clue-icon">💡</div>
              <div className="clue-text">{clue}</div>
            </div>
          )}

          {/* Feedback Section */}
          {feedback && (
            <div className="feedback-section">
              <div className="feedback-text">{feedback}</div>
            </div>
          )}

          <div className="options-grid">
            {question.options?.map((option: string, index: number) => (
              <button
                key={index}
                className={`option-button ${selectedAnswer === option ? 'selected' : ''}`}
                onClick={() => handleOptionSelect(option)}
                disabled={answerSubmitted || isFrozen}
              >
                <div className="option-letter">{getOptionLetter(index)}</div>
                <span>{option}</span>
              </button>
            ))}
          </div>

          {/* Extras/Power-ups Section */}
          {roundExtras.length > 0 && (
            <div className="actions-section">
              <div className="power-ups">
                {roundExtras.map((extraId) => (
                  <button
                    key={extraId}
                    className={getExtraClass(extraId)}
                    onClick={() => handleExtraClick(extraId)}
                    disabled={isExtraDisabled(extraId)}
                  >
                    {getExtraIcon(extraId)}
                    <div className="power-up-tooltip">{getExtraTooltip(extraId)}</div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Freeze Modal */}
        <UseExtraModal
          visible={freezeModalOpen}
          players={playersInRoom.filter(p => p.id !== playerId)}
          onCancel={() => setFreezeModalOpen(false)}
          onConfirm={handleFreezeConfirm}
          extraType="freezeOutTeam"
        />
      </div>
    </>
  );
};

export default ModernStandardRound;