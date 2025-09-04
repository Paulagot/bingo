// src/components/GameHeader.tsx
import type React from 'react';
import { Gamepad2 } from 'lucide-react';

interface GameHeaderProps {
  roomId: string;
}

export const GameHeader: React.FC<GameHeaderProps> = ({ roomId }) => {
  return (
    <div className="mb-8 text-center">
      <div className="mb-4 inline-block rounded-full bg-indigo-100 p-2">
        <Gamepad2 className="h-10 w-10 text-indigo-600" />
      </div>
      <h1 className="mb-2 bg-gradient-to-r from-indigo-700 to-purple-600 bg-clip-text text-2xl font-bold text-transparent md:text-3xl">
        FundRaisely Bingo Game Room
      </h1>
      <p className="text-fg/70">
        Room Code: <span className="font-semibold">{roomId}</span>
      </p>
    </div>
  );
};
