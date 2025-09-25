// src/components/Quiz/completion/PrizesScreen.tsx
import React from 'react';
import { Gift } from 'lucide-react';
import { QuizConfig } from '../../types/quiz';

interface PrizesScreenProps {
  config: QuizConfig | null;
  playerPosition: number;
  isHost: boolean;
  prizes: any[] | null;
  currency: string;
}

export const PrizesScreen: React.FC<PrizesScreenProps> = ({ 
  config, 
  playerPosition, 
  isHost, 
  prizes, 
  currency 
}) => {
  const getOrdinalSuffix = (num: number) => {
    const j = num % 10;
    const k = num % 100;
    if (j == 1 && k != 11) return "st";
    if (j == 2 && k != 12) return "nd";
    if (j == 3 && k != 13) return "rd";
    return "th";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-600 via-teal-600 to-blue-600 p-4 md:p-8">
      <div className="mx-auto max-w-4xl text-center">
        <h2 className="mb-8 text-3xl font-bold text-white md:text-5xl">🎁 Prizes & Distribution</h2>
        
        {prizes && prizes.length > 0 && (
          <div className="mb-8 grid gap-6 md:grid-cols-3">
            {prizes.slice(0, 3).map((prize, index) => (
              <div key={index} className="rounded-xl bg-white/10 p-6 text-white backdrop-blur">
                <div className="mb-4 text-4xl">
                  {index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'}
                </div>
                <h3 className="mb-2 text-xl font-bold">{prize.place}{getOrdinalSuffix(prize.place)} Place</h3>
                <p className="mb-2 text-lg">{prize.description}</p>
                {prize.value && prize.value > 0 && (
                  <p className="font-semibold text-green-300">
                    {config?.paymentMethod === 'web3' && prize.tokenAddress ? (
                      `${prize.value} tokens`
                    ) : (
                      `${currency}${prize.value}`
                    )}
                  </p>
                )}
                {prize.sponsor && (
                  <p className="mt-2 text-sm opacity-80">Sponsored by {prize.sponsor}</p>
                )}
                {config?.paymentMethod === 'web3' && prize.isNFT && (
                  <p className="mt-2 text-xs text-blue-300">NFT Prize</p>
                )}
              </div>
            ))}
          </div>
        )}

        {!isHost && playerPosition <= 3 && prizes?.find(p => p.place === playerPosition) && (
          <div className="mb-8 rounded-xl bg-gradient-to-r from-yellow-400 to-orange-500 p-6 text-black">
            <h3 className="mb-2 text-2xl font-bold">🎉 You Won!</h3>
            <p className="text-lg">{prizes.find(p => p.place === playerPosition)?.description}</p>
            {prizes.find(p => p.place === playerPosition)?.value && (
              <p className="text-xl font-bold">
                {config?.paymentMethod === 'web3' && prizes.find(p => p.place === playerPosition)?.tokenAddress ? (
                  `${prizes.find(p => p.place === playerPosition)?.value} tokens`
                ) : (
                  `${currency}${prizes.find(p => p.place === playerPosition)?.value}`
                )}
              </p>
            )}
          </div>
        )}

        {(!prizes || prizes.length === 0) && (
          <div className="rounded-xl bg-white/10 p-8 text-white backdrop-blur">
            <Gift className="mx-auto mb-4 h-16 w-16 text-green-300" />
            <h3 className="mb-4 text-2xl font-bold">Thank you for participating!</h3>
            <p className="text-lg">Every quiz is a victory in learning and community building.</p>
          </div>
        )}
      </div>
    </div>
  );
};