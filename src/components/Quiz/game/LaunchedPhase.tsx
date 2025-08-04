import React, { useState, useEffect } from 'react';
import { roundTypeDefinitions, fundraisingExtraDefinitions } from '../constants/quizMetadata';
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
  const defaultConfig = roundMetadata.defaultConfig || {};
  
  // Get round-specific configuration with fallbacks
  const pointsPerDifficulty = roundConfig?.pointsPerDifficulty || defaultConfig.pointsPerDifficulty || { easy: 1, medium: 2, hard: 3 };
  const pointsLostPerWrong = roundConfig?.pointsLostPerWrong ?? defaultConfig.pointsLostPerWrong ?? 0;
  const pointsLostPerNoAnswer = roundConfig?.pointslostperunanswered ?? defaultConfig.pointslostperunanswered ?? 0;
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
          
          {/* Round-specific details */}
          <div className="flex justify-center items-center space-x-4 mt-3">
            {roundCategory && (
              <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                📚 {roundCategory}
              </span>
            )}
            {roundDifficulty && (
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                roundDifficulty === 'easy' ? 'bg-green-100 text-green-700' :
                roundDifficulty === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                'bg-red-100 text-red-700'
              }`}>
                {roundDifficulty.charAt(0).toUpperCase() + roundDifficulty.slice(1)} Level
              </span>
            )}
          </div>
          
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
            <div className="bg-blue-50 p-4 rounded-lg">
              <h5 className="font-semibold text-blue-800 mb-2">⏱️ Timing & Scoring</h5>
              <ul className="text-sm text-blue-700 space-y-1">
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
                  <li className="text-gray-600">• No penalties for wrong/missed answers</li>
                )}
              </ul>
            </div>

            {/* Round-specific strategy tips */}
            <div className="bg-green-50 p-4 rounded-lg">
              <h5 className="font-semibold text-green-800 mb-2">💡 Strategy Tips</h5>
              <ul className="text-sm text-green-700 space-y-1">
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
                {/* Remove strategy reference since it doesn't exist in RoundTypeDefinition */}
              </ul>
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
                  const extraDef = Object.values(fundraisingExtraDefinitions).find(def => {
                    const defId = def.id.toLowerCase();
                    const searchKey = extraId.toLowerCase();
                    return defId === searchKey || defId.includes(searchKey) || searchKey.includes(defId);
                  });
                  
                  if (!extraDef) return false;
                  
                  return extraDef.applicableTo === 'global' || 
                         (Array.isArray(extraDef.applicableTo) && extraDef.applicableTo.includes(roundTypeId));
                })
                .map((extraId) => {
                  const extraDef = Object.values(fundraisingExtraDefinitions).find(def => {
                    const defId = def.id.toLowerCase();
                    const searchKey = extraId.toLowerCase();
                    return defId === searchKey || defId.includes(searchKey) || searchKey.includes(defId);
                  });
                  
                  return (
                    <span key={extraId} className="bg-yellow-200 text-yellow-800 px-3 py-1 rounded-full text-sm font-medium">
                      {extraDef?.icon} {extraDef?.label || extraId}
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
