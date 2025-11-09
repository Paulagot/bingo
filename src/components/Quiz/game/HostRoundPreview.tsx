// src/components/Quiz/host-controls/HostRoundPreview.tsx
import React from 'react';
import { Play } from 'lucide-react';
import { roundTypeDefinitions } from '../constants/quizMetadata';
import type { RoundTypeId } from '../types/quiz';

interface HostRoundPreviewProps {
  currentRound: number;
  totalRounds: number;
  config: any;
  roomPhase: 'waiting' | 'launched';
  totalPlayers: number;
  onStartRound: () => void;
}

const HostRoundPreview: React.FC<HostRoundPreviewProps> = ({
  currentRound,

  config,
  roomPhase,
  totalPlayers,
  onStartRound
}) => {
  const currentRoundDef = config?.roundDefinitions?.[currentRound - 1];
  const roundTypeId = currentRoundDef?.roundType as RoundTypeId;
  const roundMetadata = roundTypeDefinitions[roundTypeId];

  if (!roundMetadata || !currentRoundDef) {
    return null;
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
  
  const roundDifficulty = currentRoundDef.difficulty;
  const roundCategory = currentRoundDef.category;
  const pointsForThisRound = roundDifficulty ? pointsPerDifficulty[roundDifficulty] : null;

  // Determine if this is a speed round
  const isSpeedRound = roundTypeId === 'speed_round';

  return (
    <div className="mb-6 rounded-xl border border-purple-200 bg-gradient-to-br from-purple-50 to-indigo-50 p-8 shadow-lg">
      <div className="mb-6 text-center">
        <div className="mb-3 text-6xl">{roundMetadata.icon}</div>
        <h2 className="mb-2 text-3xl font-bold text-indigo-900">
          {roomPhase === 'waiting' ? 'Preparing' : 'Ready to Start'} Round {currentRound}
        </h2>
        <h3 className="text-2xl font-semibold text-indigo-700 mb-4">{roundMetadata.name}</h3>
      </div>

      {/* Host Controls Section */}
      <div className="bg-green-50 mb-6 rounded-lg p-6 backdrop-blur-sm">
        <h4 className="text-green-800 mb-3 text-lg font-bold flex items-center">
          🎯 Host Controls
        </h4>
        <ul className="space-y-1 text-sm text-green-700">
          <li>• Read the round configuration below to players</li>
          <li>• Start round when players are ready</li>
          <li>• Read questions to players with possible answers - questions auto-transition when timer expires</li>
          <li>• Review stage: Read each question again with correct answer and share stats</li>
          <li>• Control leaderboard transitions (round results, then overall leaderboard)</li>
          <li>• Allow time for players to use arsenal during round leaderboard</li>
        </ul>
      </div>

      {/* Category and Difficulty */}
      <div className="mb-6 flex items-center justify-center space-x-4">
        {roundCategory && (
          <span className="rounded-full bg-blue-100 px-4 py-2 text-sm font-medium text-blue-700">
            📚 {roundCategory}
          </span>
        )}
        {roundDifficulty && (
          <span className={`rounded-full px-4 py-2 text-sm font-medium ${
            roundDifficulty === 'easy' ? 'bg-green-100 text-green-700' :
            roundDifficulty === 'medium' ? 'bg-yellow-100 text-yellow-700' :
            'bg-red-100 text-red-700'
          }`}>
            {roundDifficulty.charAt(0).toUpperCase() + roundDifficulty.slice(1)} Level
          </span>
        )}
      </div>

      {/* Round Configuration */}
      <div className="bg-blue-50 mb-6 rounded-lg p-6 backdrop-blur-sm">
        <h4 className="text-blue-800 mb-3 text-lg font-bold">⏱️ Timing & Scoring</h4>
        <p className="text-blue-800 mb-4">{roundMetadata.description}</p>
        
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <div className="text-sm text-blue-700">
              <strong>{questionsPerRound}</strong> questions this round
            </div>
            
            {/* Conditional time display based on round type */}
            <div className="text-sm text-blue-700">
              {isSpeedRound && totalTimeSeconds ? (
                <><strong>{totalTimeSeconds}</strong> seconds total time</>
              ) : (
                <><strong>{timePerQuestion}</strong> seconds per question</>
              )}
            </div>
            
            {pointsForThisRound !== null ? (
              <div className={`text-sm ${
                roundDifficulty === 'easy' ? 'text-green-700' :
                roundDifficulty === 'medium' ? 'text-blue-700' :
                'text-purple-700'
              }`}>
                <strong>+{pointsForThisRound}</strong> points for correct answers
              </div>
            ) : (
              <div className="space-y-1">
                <div className="text-sm text-green-700">
                  <strong>+{pointsPerDifficulty.easy}</strong> points for easy questions
                </div>
                <div className="text-sm text-blue-700">
                  <strong>+{pointsPerDifficulty.medium}</strong> points for medium questions
                </div>
                <div className="text-sm text-purple-700">
                  <strong>+{pointsPerDifficulty.hard}</strong> points for hard questions
                </div>
              </div>
            )}
          </div>

          <div className="space-y-2">
            {pointsLostPerWrong > 0 && (
              <div className="text-sm text-red-600">
                <strong>-{pointsLostPerWrong}</strong> points for wrong answers
              </div>
            )}
            {pointsLostPerNoAnswer > 0 && (
              <div className="text-sm text-orange-600">
                <strong>-{pointsLostPerNoAnswer}</strong> points for not answering
              </div>
            )}
            {pointsLostPerWrong === 0 && pointsLostPerNoAnswer === 0 && (
              <div className="text-sm text-gray-600">
                No penalties for wrong/missed answers
              </div>
            )}
            <div className="text-sm text-gray-600">
              <strong>{totalPlayers}</strong> players connected
            </div>
          </div>
        </div>
      </div>

      {/* Action Button */}
      <div className="text-center">
        {roomPhase === 'waiting' && (
          <button 
            onClick={onStartRound} 
            className="mx-auto flex transform items-center space-x-3 rounded-xl bg-indigo-600 px-8 py-4 text-xl font-bold text-white shadow-lg transition-all duration-200 hover:scale-105 hover:bg-indigo-700 hover:shadow-xl"
          >
            <Play className="h-6 w-6" />
            <span>Launch Quiz & Start Round {currentRound}</span>
          </button>
        )}

        {roomPhase === 'launched' && (
          <>
            <div className="mb-4 rounded-lg bg-green-50 p-4">
              <p className="font-medium text-green-700">🚀 Quiz launched! Players are now ready.</p>
            </div>
            <button 
              onClick={onStartRound} 
              className="mx-auto flex transform items-center space-x-3 rounded-xl bg-green-600 px-8 py-4 text-xl font-bold text-white shadow-lg transition-all duration-200 hover:scale-105 hover:bg-green-700 hover:shadow-xl"
            >
              <Play className="h-6 w-6" />
              <span>Start Round {currentRound}</span>
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default HostRoundPreview;