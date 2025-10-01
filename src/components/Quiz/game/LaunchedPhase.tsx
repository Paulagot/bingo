import React, { useState, useEffect } from 'react';
import { roundTypeDefinitions } from '../constants/quizMetadata';
import type { RoundTypeId } from '../types/quiz';

interface LaunchedPhaseProps {
  currentRound: number;
  config: any; // Quiz config with roundDefinitions
  totalPlayers: number;
  playerId: string;
  playerExtras: string[];
  roomPhase: 'launched' | 'waiting';
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
    }, 2000);

    return () => {
      clearTimeout(timer);
      clearInterval(pulseTimer);
    };
  }, []);

  if (!roundMetadata || !currentRoundDef) {
    return (
      <div className="rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 p-6 text-center text-white shadow-2xl">
        <div className="text-6xl mb-4">🚀</div>
        <h2 className="text-2xl font-bold mb-2">
          {isInitialLaunch ? 'Quiz Launched!' : `Round ${currentRound} Loading...`}
        </h2>
        <p>Get ready to play!</p>
      </div>
    );
  }

  const roundConfig = currentRoundDef.config;
  const defaultConfig = roundMetadata.defaultConfig || {};
  
  // Get round-specific configuration with fallbacks
  const pointsPerDifficulty = roundConfig?.pointsPerDifficulty || defaultConfig.pointsPerDifficulty || { easy: 1, medium: 2, hard: 3 };
  const pointsLostPerWrong = roundConfig?.pointsLostPerWrong ?? defaultConfig.pointsLostPerWrong ?? 0;
  const pointsLostPerNoAnswer = roundConfig?.pointsLostPerUnanswered ?? defaultConfig.pointsLostPerUnanswered ?? 0;
  const timePerQuestion = roundConfig?.timePerQuestion || defaultConfig.timePerQuestion || 25;
  const totalTimeSeconds = roundConfig?.totalTimeSeconds || defaultConfig.totalTimeSeconds;
  const questionsPerRound = roundConfig?.questionsPerRound || defaultConfig.questionsPerRound || 6;
  
  // Get the specific difficulty for this round
  const roundDifficulty = currentRoundDef.difficulty;
  const roundCategory = currentRoundDef.category;
  
  // Calculate points for this specific round's difficulty
  const getPointsForThisRound = () => {
    if (roundDifficulty) {
      return pointsPerDifficulty[roundDifficulty] || pointsPerDifficulty.medium || 2;
    }
    return null;
  };

  const pointsForThisRound = getPointsForThisRound();

  // Determine if this is a speed round
  const isSpeedRound = roundTypeId === 'speed_round';

  return (
    <div className={`transition-all duration-1000 ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}>
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-purple-600 via-indigo-600 to-blue-700 p-8 shadow-2xl">
        
        {/* Animated background elements */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute -top-10 -right-10 h-40 w-40 rounded-full bg-white animate-pulse"></div>
          <div className="absolute -bottom-10 -left-10 h-32 w-32 rounded-full bg-white animate-pulse delay-1000"></div>
        </div>

        {/* Header */}
        <div className="relative z-10 text-center text-white">
          <div className={`mb-4 text-8xl transition-transform duration-1000 ${pulseAnimation ? 'scale-125 rotate-12' : 'scale-100'}`}>
            {roundMetadata.icon}
          </div>
          
          <h1 className="mb-2 text-4xl font-black tracking-tight">
            {isInitialLaunch ? `ROUND ${currentRound}` : `ROUND ${currentRound}`}
          </h1>
          
          <h2 className="mb-4 text-2xl font-bold bg-gradient-to-r from-yellow-300 to-orange-300 bg-clip-text text-transparent">
            {roundMetadata.name}
          </h2>
          
          {/* Round details badges */}
          <div className="mb-6 flex flex-wrap items-center justify-center gap-3">
            {roundCategory && (
              <div className="rounded-full bg-white/20 backdrop-blur-sm px-4 py-2 text-sm font-bold">
                📚 {roundCategory}
              </div>
            )}
            {roundDifficulty && (
              <div className={`rounded-full px-4 py-2 text-sm font-bold ${
                roundDifficulty === 'easy' ? 'bg-green-500/30 text-green-100' :
                roundDifficulty === 'medium' ? 'bg-yellow-500/30 text-yellow-100' :
                'bg-red-500/30 text-red-100'
              }`}>
                {roundDifficulty.toUpperCase()} LEVEL
              </div>
            )}
          </div>
        </div>

        {/* Game stats grid */}
        <div className="relative z-10 mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
          {/* Questions count */}
          <div className="rounded-xl bg-white/10 backdrop-blur-sm p-4 text-center text-white">
            <div className="text-2xl font-bold text-yellow-300">{questionsPerRound}</div>
            <div className="text-sm opacity-80">Questions</div>
          </div>
          
          {/* Time display - conditional based on round type */}
          {isSpeedRound && totalTimeSeconds ? (
            <div className="rounded-xl bg-white/10 backdrop-blur-sm p-4 text-center text-white">
              <div className="text-2xl font-bold text-blue-300">{totalTimeSeconds}s</div>
              <div className="text-sm opacity-80">Total Time</div>
            </div>
          ) : (
            <div className="rounded-xl bg-white/10 backdrop-blur-sm p-4 text-center text-white">
              <div className="text-2xl font-bold text-blue-300">{timePerQuestion}s</div>
              <div className="text-sm opacity-80">Per Question</div>
            </div>
          )}
          
          {/* Points display */}
          {pointsForThisRound !== null ? (
            <div className="rounded-xl bg-white/10 backdrop-blur-sm p-4 text-center text-white">
              <div className="text-2xl font-bold text-green-300">+{pointsForThisRound}</div>
              <div className="text-sm opacity-80">For Correct</div>
            </div>
          ) : (
            <div className="rounded-xl bg-white/10 backdrop-blur-sm p-4 text-center text-white">
              <div className="text-lg font-bold text-green-300">+{pointsPerDifficulty.easy}-{pointsPerDifficulty.hard}</div>
              <div className="text-sm opacity-80">Points Range</div>
            </div>
          )}
          
          {/* Penalty display - Fixed to show penalties */}
          <div className="rounded-xl bg-white/10 backdrop-blur-sm p-4 text-center text-white">
            {pointsLostPerWrong > 0 || pointsLostPerNoAnswer > 0 ? (
              <>
                <div className="text-2xl font-bold text-red-300">
                  -{Math.max(pointsLostPerWrong, pointsLostPerNoAnswer)}
                </div>
                <div className="text-sm opacity-80">Penalty</div>
              </>
            ) : (
              <>
                <div className="text-2xl font-bold text-gray-300">0</div>
                <div className="text-sm opacity-80">No Penalty</div>
              </>
            )}
          </div>
        </div>

        {/* Quick strategy tip */}
        {(pointsLostPerWrong > 0 || pointsLostPerNoAnswer > 0) && (
          <div className="relative z-10 mb-6 rounded-xl bg-red-500/20 backdrop-blur-sm border border-red-300/30 p-4 text-center">
            <div className="text-red-100 font-bold text-lg mb-1">⚠️ HIGH STAKES!</div>
            <div className="text-red-200 text-sm">
              {pointsLostPerWrong > 0 && pointsLostPerNoAnswer > 0 ? (
                `Wrong answers cost ${pointsLostPerWrong} points • No answer costs ${pointsLostPerNoAnswer} points`
              ) : pointsLostPerWrong > 0 ? (
                `Wrong answers cost ${pointsLostPerWrong} points`
              ) : (
                `No answer costs ${pointsLostPerNoAnswer} points`
              )}
            </div>
          </div>
        )}

        {/* Player info */}
        <div className="relative z-10 mb-6 rounded-xl bg-white/10 backdrop-blur-sm p-4 text-center text-white">
          <div className="text-lg font-bold mb-1">
            {totalPlayers} Player{totalPlayers !== 1 ? 's' : ''} Ready
          </div>
          <div className="text-sm opacity-70">
            You are: <span className="font-mono bg-white/20 px-2 py-1 rounded text-xs">{playerId}</span>
          </div>
        </div>

        {/* Waiting animation */}
        <div className="relative z-10 text-center">
          <div className={`inline-flex items-center space-x-3 text-white transition-all duration-500 ${pulseAnimation ? 'scale-105' : 'scale-100'}`}>
            <div className="h-6 w-6 animate-spin rounded-full border-3 border-white/30 border-t-white"></div>
            <span className="text-lg font-bold">
              {isInitialLaunch 
                ? 'Waiting for host to start...' 
                : `Round ${currentRound} starting soon...`
              }
            </span>
          </div>
          
          {/* Pulsing ready indicator */}
          <div className="mt-4">
            <div className="inline-block rounded-full bg-green-500 px-6 py-2 text-sm font-bold text-white animate-pulse">
              🎮 YOU'RE READY!
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LaunchedPhase;
