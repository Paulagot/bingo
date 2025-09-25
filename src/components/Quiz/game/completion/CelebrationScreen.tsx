// src/components/Quiz/completion/CelebrationScreen.tsx
import React, { useEffect, useState } from 'react';
import { Heart } from 'lucide-react';
import { QuizConfig, LeaderboardEntry } from '../../types/quiz';

interface CelebrationScreenProps {
  leaderboard: LeaderboardEntry[];
  config: QuizConfig | null;
  playerId: string;
  playerPosition: number;
  playerScore: number;
  isHost: boolean;
  fundraisingData?: any;
  currency: string;
}

const CelebrationScreen: React.FC<CelebrationScreenProps> = ({

  config,

  playerPosition,
  playerScore,
  isHost,
  fundraisingData,
  currency
}) => {
  const [confettiActive, setConfettiActive] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setConfettiActive(false), 3000);
    return () => clearTimeout(timer);
  }, []);

  const getOrdinalSuffix = (num: number) => {
    const j = num % 10;
    const k = num % 100;
    if (j == 1 && k != 11) return "st";
    if (j == 2 && k != 12) return "nd";
    if (j == 3 && k != 13) return "rd";
    return "th";
  };

  // Confetti Effect
  const ConfettiEffect = () => (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {[...Array(50)].map((_, i) => (
        <div
          key={i}
          className="absolute animate-pulse"
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            fontSize: `${Math.random() * 20 + 10}px`,
            animationDelay: `${Math.random() * 2}s`,
            animationDuration: `${Math.random() * 3 + 2}s`
          }}
        >
          {['🎉', '🎊', '🏆', '⭐', '💫', '❤️', '💝'][Math.floor(Math.random() * 7)]}
        </div>
      ))}
    </div>
  );

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-purple-600 via-pink-600 to-orange-500">
      {confettiActive && <ConfettiEffect />}
      
      <div className="z-10 px-4 text-center text-white">
        <div className="mb-6 animate-bounce text-8xl">
          {fundraisingData && fundraisingData.totalRaised > 0 ? '💝' : '🎉'}
        </div>
        <h1 className="mb-4 bg-gradient-to-r from-yellow-300 to-pink-300 bg-clip-text text-4xl font-bold text-transparent md:text-6xl lg:text-8xl">
          {isHost ? 'QUIZ COMPLETE!' : 'AMAZING JOB!'}
        </h1>
        <div className="text-2xl md:text-3xl mb-4">
          {!isHost && playerPosition === 1 && "🏆 CHAMPION! You came 1st!"}
          {!isHost && playerPosition === 2 && "🥈 Amazing! You came 2nd!"}
          {!isHost && playerPosition === 3 && "🥉 Fantastic! You came 3rd!"}
          {!isHost && playerPosition > 3 && `Great job! You finished ${playerPosition}${getOrdinalSuffix(playerPosition)}!`}
          {isHost && "Thank you for hosting this incredible quiz event!"}
        </div>
        {!isHost && (
          <div className="mb-8 text-lg md:text-xl">
            Final Score: <span className="font-bold text-yellow-300">{playerScore} points</span>
          </div>
        )}
        {fundraisingData && fundraisingData.totalRaised > 0 && (
          <div className="mt-6 rounded-xl bg-black/20 p-4 text-base opacity-90 backdrop-blur md:text-lg">
            <Heart className="mx-auto mb-2 h-6 w-6 text-red-300" />
            <div className="text-xl font-bold text-green-300">
              Together we raised {currency}{fundraisingData.totalRaised.toFixed(2)}
            </div>
            <div className="text-sm">for {config?.web3Charity || 'charity'}</div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CelebrationScreen;