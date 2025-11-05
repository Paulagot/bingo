// src/components/GameLoader.tsx
import type React from 'react';
import { Loader2 } from 'lucide-react';

interface GameLoaderProps {
  isHost: boolean;
}

export const GameLoader: React.FC<GameLoaderProps> = ({ isHost }) => {
  return (
    <div className="bg-muted flex h-48 items-center justify-center rounded-2xl p-6 shadow-md">
      <div className="text-center">
        <div className="mb-4 inline-block rounded-full bg-indigo-100 p-3">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
        </div>
        <h2 className="text-fg/80 px-4 text-xl font-medium sm:text-2xl">
          Waiting for players to ready up...
        </h2>
        <p className="text-fg/60 mt-2 text-sm">
          {isHost
            ? "The game will start once all players are ready"
            : "Please click 'Ready Up' when you're ready to play"}
        </p>
      </div>
    </div>
  );
};
