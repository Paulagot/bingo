import React, { useState, useEffect } from 'react';
import { roundTypeDefinitions  } from '../constants/quizMetadata';
import type { RoundTypeId } from '../types/quiz';

interface LaunchedPhaseProps {
  currentRound: number;
  config: any; // Quiz config with roundDefinitions
  totalPlayers: number;
  playerId: string;
  playerExtras: string[];
  roomPhase: 'launched' | 'waiting'; // To distinguish between initial launch vs between rounds
}

const LaunchedPhase: React.FC<LaunchedPhaseProps> = ({
  currentRound,
  config,
  totalPlayers,
  playerId,
 
  roomPhase
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [pulseAnimation, setPulseAnimation] = useState(false);

  const currentRoundDef = config?.roundDefinitions?.[currentRound - 1];
  const roundTypeId = currentRoundDef?.roundType as RoundTypeId;
  const roundMetadata = roundTypeDefinitions[roundTypeId];

  const isInitialLaunch = roomPhase === 'launched';
  const isBetweenRounds = roomPhase === 'waiting' && currentRound > 1;

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 100);
    const pulseTimer = setInterval(() => {
      setPulseAnimation(true);
      setTimeout(() => setPulseAnimation(false), 1000);
    }, 1000);

    return () => {
      clearTimeout(timer);
      clearInterval(pulseTimer);
    };
  }, []);

  if (!roundMetadata || !currentRoundDef) {
    return (
      <div className="rounded-xl bg-blue-50 p-4 text-center sm:p-6">
        <p className="text-blue-700">
          {isInitialLaunch ? '🚀 Quiz launched! Get ready to play...' : `🔄 Round ${currentRound} coming up! Get ready...`}
        </p>
      </div>
    );
  }

  const roundConfig = currentRoundDef.config;
  const defaultConfig = roundMetadata.defaultConfig || {};
  
  // Get round-specific configuration with fallbacks
  const pointsPerDifficulty = roundConfig?.pointsPerDifficulty || defaultConfig.pointsPerDifficulty || { easy: 1, medium: 2, hard: 3 };
  const pointsLostPerWrong = roundConfig?.pointsLostPerWrong ?? defaultConfig.pointsLostPerWrong ?? 0;
  const pointsLostPerNoAnswer = roundConfig?.pointsLostPerNoAnswer ?? defaultConfig.pointsLostPerUnanswered ?? 0;
  const timePerQuestion = roundConfig?.timePerQuestion || defaultConfig.timePerQuestion || 25;
  const questionsPerRound = roundConfig?.questionsPerRound || defaultConfig.questionsPerRound || 6;
  
  // Get the specific difficulty for this round
  const roundDifficulty = currentRoundDef.difficulty;
  const roundCategory = currentRoundDef.category;
  
  // Calculate points for this specific round's difficulty
  const getPointsForThisRound = () => {
    if (roundDifficulty) {
      return pointsPerDifficulty[roundDifficulty] || pointsPerDifficulty.medium || 2;
    }
    // If no specific difficulty, show all possible values
    return null;
  };

  const pointsForThisRound = getPointsForThisRound();

  return (
    <div className={`transition-all duration-1000 ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}>
      <div className="rounded-xl border border-indigo-200 bg-gradient-to-br from-indigo-50 to-purple-50 p-4 shadow-lg sm:p-8">
        
        {/* Header */}
        <div className="mb-4 text-center sm:mb-6">
          <div className={`mb-2 text-4xl transition-transform duration-1000 sm:mb-3 sm:text-6xl ${pulseAnimation ? 'scale-110' : 'scale-100'}`}>
            {roundMetadata.icon}
          </div>
          <h2 className="mb-1 text-xl font-bold text-indigo-900 sm:mb-2 sm:text-3xl">
            {isInitialLaunch ? `Get Ready for Round ${currentRound}!` : `Round ${currentRound} Coming Up!`}
          </h2>
          <h3 className="heading-2">
            {roundMetadata.name}
          </h3>
          
          {/* Round-specific details */}
          <div className="mt-2 flex flex-wrap items-center justify-center gap-2 sm:mt-3 sm:gap-4">
            {roundCategory && (
              <span className="rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-700 sm:px-3 sm:text-sm">
                📚 {roundCategory}
              </span>
            )}
            {roundDifficulty && (
              <span className={`rounded-full px-2 py-1 text-xs font-medium sm:px-3 sm:text-sm ${
                roundDifficulty === 'easy' ? 'bg-green-100 text-green-700' :
                roundDifficulty === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                'bg-red-100 text-red-700'
              }`}>
                {roundDifficulty.charAt(0).toUpperCase() + roundDifficulty.slice(1)} Level
              </span>
            )}
          </div>
          
          {isBetweenRounds && (
            <p className="mt-2 text-sm text-indigo-600 sm:text-base">
              🎉 Previous round complete! Time for the next challenge...
            </p>
          )}
        </div>

        {/* Game Rules Section */}
        <div className="bg-muted/70 mb-4 rounded-lg border border-white/50 p-3 backdrop-blur-sm sm:mb-6 sm:p-6">
          <h4 className="text-fg mb-2 flex items-center text-base font-bold sm:mb-3 sm:text-lg">
            📋 Round Rules
          </h4>
          <p className="text-fg/80 mb-3 text-sm sm:mb-4 sm:text-base">{roundMetadata.description}</p>
          
          <div className="grid grid-cols-1 gap-3 sm:gap-4 md:grid-cols-2">
            <div className="rounded-lg bg-blue-50 p-3 sm:p-4">
              <h5 className="mb-2 text-sm font-semibold text-blue-800 sm:text-base">⏱️ Timing & Scoring</h5>
              <ul className="space-y-1 text-xs text-blue-700 sm:text-sm">
                <li>• {questionsPerRound} questions this round</li>
                <li>• {timePerQuestion} seconds per question</li>
                
                {/* Round-specific scoring */}
                {pointsForThisRound !== null ? (
                  <li className={`${
                    roundDifficulty === 'easy' ? 'text-green-700' :
                    roundDifficulty === 'medium' ? 'text-blue-700' :
                    'text-purple-700'
                  }`}>
                    • +{pointsForThisRound} points for correct answers
                  </li>
                ) : (
                  // Show all difficulties if round difficulty not specified
                  <>
                    <li className="text-green-700">• +{pointsPerDifficulty.easy} points for easy questions</li>
                    <li className="text-blue-700">• +{pointsPerDifficulty.medium} points for medium questions</li>
                    <li className="text-purple-700">• +{pointsPerDifficulty.hard} points for hard questions</li>
                  </>
                )}
                
                {/* Penalty information */}
                {pointsLostPerWrong > 0 && (
                  <li className="text-red-600">• -{pointsLostPerWrong} points for wrong answers</li>
                )}
                {pointsLostPerNoAnswer > 0 && (
                  <li className="text-orange-600">• -{pointsLostPerNoAnswer} points for not answering</li>
                )}
                {pointsLostPerWrong === 0 && pointsLostPerNoAnswer === 0 && (
                  <li className="text-fg/70">• No penalties for wrong/missed answers</li>
                )}
              </ul>
            </div>

            {/* Round-specific strategy tips */}
            <div className="rounded-lg bg-green-50 p-3 sm:p-4">
              <h5 className="mb-2 text-sm font-semibold text-green-800 sm:text-base">💡 Strategy Tips</h5>
              <ul className="space-y-1 text-xs text-green-700 sm:text-sm">
                {roundDifficulty === 'easy' && (
                  <li>• Focus on speed and accuracy</li>
                )}
                {roundDifficulty === 'medium' && (
                  <li>• Balance speed with careful thinking</li>
                )}
                {roundDifficulty === 'hard' && (
                  <li>• Take time to think through answers</li>
                )}
                {pointsLostPerWrong > 0 ? (
                  <li>• Be careful - wrong answers cost points!</li>
                ) : (
                  <li>• No penalty for guessing if unsure</li>
                )}
              </ul>
            </div>
          </div>
        </div>

        {/* Player Count */}
        <div className="rounded-lg bg-indigo-100 p-3 text-center sm:p-4">
          <p className="text-sm text-indigo-800 sm:text-base">
            <span className="font-bold">{totalPlayers}</span> player{totalPlayers !== 1 ? 's' : ''} ready to compete
          </p>
          <p className="mt-1 text-xs text-indigo-600 sm:text-sm">
            Player ID: <span className="bg-muted rounded px-2 py-1 font-mono text-xs">{playerId}</span>
          </p>
        </div>

        {/* Waiting Message */}
        <div className="mt-4 text-center sm:mt-6">
          <div className={`inline-flex items-center space-x-2 text-indigo-700 transition-all duration-500 ${pulseAnimation ? 'scale-105' : 'scale-100'}`}>
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-indigo-300 border-t-indigo-600 sm:h-5 sm:w-5"></div>
            <span className="text-sm font-medium sm:text-base">
              {isInitialLaunch 
                ? 'Waiting for host to start the round...' 
                : `Waiting for host to start Round ${currentRound}...`
              }
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LaunchedPhase;
