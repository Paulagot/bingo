import React, { useEffect, useState } from 'react';
import confetti from 'canvas-confetti';
import { motion } from 'framer-motion';
import { Trophy, Heart } from 'lucide-react';

interface WinEffectsProps {
  isWinner: boolean;
  winnerName: string;
}

export function WinEffects({ isWinner, winnerName }: WinEffectsProps) {
  const [showEffect, setShowEffect] = useState(true);

  useEffect(() => {
    if (isWinner) {
      const duration = 3 * 1000;
      const animationEnd = Date.now() + duration;
      const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

      const randomInRange = (min: number, max: number) => {
        return Math.random() * (max - min) + min;
      };

      const interval: NodeJS.Timer = setInterval(() => {
        const timeLeft = animationEnd - Date.now();

        if (timeLeft <= 0) {
          return clearInterval(interval);
        }

        const particleCount = 50 * (timeLeft / duration);

        confetti({
          ...defaults,
          particleCount,
          origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 }
        });
        confetti({
          ...defaults,
          particleCount,
          origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 }
        });
      }, 250);

      return () => clearInterval(interval);
    }
  }, [isWinner]);

  if (!showEffect) return null;

  return (
    <motion.div
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      exit={{ scale: 0 }}
      className={`flex items-center justify-center gap-4 mb-8 p-4 rounded-lg ${
        isWinner ? 'bg-green-500 text-white' : 'bg-blue-100 text-blue-800'
      }`}
    >
      {isWinner ? (
        <>
          <Trophy size={32} />
          <span className="text-2xl font-bold">You won!</span>
        </>
      ) : (
        <>
          <Heart size={32} />
          <span className="text-xl font-medium">
            {winnerName} won! Better luck next time!
          </span>
        </>
      )}
      <button
        onClick={() => setShowEffect(false)}
        className="ml-4 text-sm opacity-75 hover:opacity-100"
      >
        Dismiss
      </button>
    </motion.div>
  );
}