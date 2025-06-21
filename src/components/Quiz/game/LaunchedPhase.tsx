// src/components/Quiz/game/LaunchedPhase.tsx
import React, { useState, useEffect } from 'react';
import { roundTypeDefinitions, fundraisingExtraDefinitions } from '../../../constants/quizMetadata';
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
  playerExtras,
  roomPhase
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [pulseAnimation, setPulseAnimation] = useState(false);

  // Get the current round definition
  const currentRoundDef = config?.roundDefinitions?.[currentRound - 1];
  const roundTypeId = currentRoundDef?.roundType as RoundTypeId;
  const roundMetadata = roundTypeDefinitions[roundTypeId];

  // Determine if this is initial launch or between rounds
  const isInitialLaunch = roomPhase === 'launched';
  const isBetweenRounds = roomPhase === 'waiting' && currentRound > 1;

  useEffect(() => {
    // Fade in animation
    const timer = setTimeout(() => setIsVisible(true), 100);
    
    // Pulse animation every 3 seconds
    const pulseTimer = setInterval(() => {
      setPulseAnimation(true);
      setTimeout(() => setPulseAnimation(false), 1000);
    }, 3000);

    return () => {
      clearTimeout(timer);
      clearInterval(pulseTimer);
    };
  }, []);

  if (!roundMetadata || !currentRoundDef) {
    return (
      <div className="bg-blue-50 p-6 rounded-xl text-center">
        <p className="text-blue-700">
          {isInitialLaunch ? '🚀 Quiz launched! Get ready to play...' : `🔄 Round ${currentRound} coming up! Get ready...`}
        </p>
      </div>
    );
  }

  const roundConfig = currentRoundDef.config;
  const pointsPerQuestion = roundConfig?.pointsPerQuestion || 2;
  const pointsLostPerWrong = roundConfig?.pointsLostPerWrong;
  const timePerQuestion = roundConfig?.timePerQuestion || 25;
  const questionsPerRound = roundConfig?.questionsPerRound || 6;

  return (
    <div className={`transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
      <div className="bg-gradient-to-br from-indigo-50 to-purple-50 p-8 rounded-xl border border-indigo-200 shadow-lg">
        
        {/* Header */}
        <div className="text-center mb-6">
          <div className={`text-6xl mb-3 transition-transform duration-1000 ${pulseAnimation ? 'scale-110' : 'scale-100'}`}>
            {roundMetadata.icon}
          </div>
          <h2 className="text-3xl font-bold text-indigo-900 mb-2">
            {isInitialLaunch ? `Get Ready for Round ${currentRound}!` : `Round ${currentRound} Coming Up!`}
          </h2>
          <h3 className="text-xl text-indigo-700 font-semibold">
            {roundMetadata.name}
          </h3>
          {isBetweenRounds && (
            <p className="text-indigo-600 mt-2">
              🎉 Previous round complete! Time for the next challenge...
            </p>
          )}
        </div>

        {/* Game Rules Section */}
        <div className="bg-white/70 backdrop-blur-sm rounded-lg p-6 mb-6 border border-white/50">
          <h4 className="text-lg font-bold text-gray-800 mb-3 flex items-center">
            📋 Round Rules
          </h4>
          <p className="text-gray-700 mb-4">{roundMetadata.description}</p>
          
          <div className="grid md:grid-cols-2 gap-4">
            {/* Timing & Scoring */}
            <div className="bg-blue-50 p-4 rounded-lg">
              <h5 className="font-semibold text-blue-800 mb-2">⏱️ Timing & Scoring</h5>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• {questionsPerRound} questions this round</li>
                <li>• {timePerQuestion} seconds per question</li>
                <li>• +{pointsPerQuestion} points for correct answers</li>
                {pointsLostPerWrong && (
                  <li className="text-red-600">• -{pointsLostPerWrong} points for wrong answers</li>
                )}
              </ul>
            </div>

            {/* Strategy Tips */}
            <div className="bg-green-50 p-4 rounded-lg">
              <h5 className="font-semibold text-green-800 mb-2">💡 Strategy Tips</h5>
              <div className="text-sm text-green-700 space-y-1">
                {roundMetadata.pros?.map((tip: string, index: number) => (
                  <div key={index}>• {tip}</div>
                ))}
                {roundTypeId === 'wipeout' && (
                  <div className="text-orange-600 font-medium mt-2">
                    ⚠️ Think carefully - wrong answers cost you points!
                  </div>
                )}
                {roundTypeId === 'general_trivia' && (
                  <div className="text-blue-600 font-medium mt-2">
                    💡 Hint extras available if you get stuck!
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Available Extras */}
        {playerExtras && playerExtras.length > 0 && (
          <div className="bg-yellow-50 p-4 rounded-lg mb-6 border border-yellow-200">
            <h4 className="font-bold text-yellow-800 mb-2">✨ Your Available Extras This Round</h4>
            <div className="flex flex-wrap gap-2">
              {playerExtras
                .filter(extraId => {
                  const extraDef = Object.values(fundraisingExtraDefinitions).find((def: any) => {
                    const defId = def.id.toLowerCase();
                    const searchKey = extraId.toLowerCase();
                    return defId === searchKey || defId.includes(searchKey) || searchKey.includes(defId);
                  });
                  
                  if (!extraDef) return false;
                  
                  return (extraDef as any).applicableTo === 'global' || 
                         (Array.isArray((extraDef as any).applicableTo) && (extraDef as any).applicableTo.includes(roundTypeId));
                })
                .map((extraId) => {
                  const extraDef = Object.values(fundraisingExtraDefinitions).find((def: any) => {
                    const defId = def.id.toLowerCase();
                    const searchKey = extraId.toLowerCase();
                    return defId === searchKey || defId.includes(searchKey) || searchKey.includes(defId);
                  });
                  
                  return (
                    <span key={extraId} className="bg-yellow-200 text-yellow-800 px-3 py-1 rounded-full text-sm font-medium">
                      {(extraDef as any)?.icon} {(extraDef as any)?.label || extraId}
                    </span>
                  );
                })
              }
            </div>
            <p className="text-yellow-700 text-sm mt-2">
              Remember: Only one extra per round - use them wisely!
            </p>
          </div>
        )}

        {/* Player Count */}
        <div className="text-center bg-indigo-100 p-4 rounded-lg">
          <p className="text-indigo-800">
            <span className="font-bold">{totalPlayers}</span> player{totalPlayers !== 1 ? 's' : ''} ready to compete
          </p>
          <p className="text-indigo-600 text-sm mt-1">
            Player ID: <span className="font-mono bg-white px-2 py-1 rounded">{playerId}</span>
          </p>
        </div>

        {/* Waiting Message */}
        <div className="text-center mt-6">
          <div className={`inline-flex items-center space-x-2 text-indigo-700 transition-all duration-500 ${pulseAnimation ? 'scale-105' : 'scale-100'}`}>
            <div className="animate-spin w-5 h-5 border-2 border-indigo-300 border-t-indigo-600 rounded-full"></div>
            <span className="font-medium">
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