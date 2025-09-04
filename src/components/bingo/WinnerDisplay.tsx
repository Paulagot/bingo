// src/components/WinnerDisplay.tsx
import type React from 'react';

interface Winner {
  id: string;
  name: string;
}

interface WinnerDisplayProps {
  lineWinners: Winner[];
  fullHouseWinners: Winner[];
}

export const WinnerDisplay: React.FC<WinnerDisplayProps> = ({ lineWinners, fullHouseWinners }) => {
  if (lineWinners.length === 0 && fullHouseWinners.length === 0) return null;

  return (
    <div className="mb-6 text-center">
      <h2 className="heading-2">Winners</h2>
      <div className="mt-2 flex flex-wrap justify-center gap-2">
        {lineWinners.map(winner => (
          <span key={winner.id} className="rounded-full bg-indigo-100 px-3 py-1 text-indigo-800">
            {winner.name} (Line)
          </span>
        ))}
        {fullHouseWinners.map(winner => (
          <span key={winner.id} className="rounded-full bg-purple-100 px-3 py-1 text-purple-800">
            {winner.name} (Full House)
          </span>
        ))}
      </div>
    </div>
  );
};
