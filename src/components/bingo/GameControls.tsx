// src/components/GameControls.tsx
import { Play, Pause, ArrowLeft, PlayCircle, } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface GameControlsProps {
  onToggleAutoPlay: () => void;
  onUnpauseGame: () => void;
  onDeclareLineWinners?: () => void;
  onDeclareFullHouseWinners?: () => void;
  hasWon: boolean;
  autoPlay: boolean;
  isPaused: boolean;
  showDeclarationsButtons?: boolean;
  lineWinners?: Array<{ id: string; name: string }>;
  fullHouseWinners?: Array<{ id: string; name: string }>;
  lineWinClaimed?: boolean;
}

export function GameControls({
  onToggleAutoPlay,
  onUnpauseGame,
 
  hasWon,
  autoPlay,
  isPaused,
  
  lineWinners = [],
  fullHouseWinners = [],
  lineWinClaimed = false,
}: GameControlsProps) {
  console.log('[GameControls] 🚀 Rendering GameControls', {
    isPaused,
    lineWinners,
    fullHouseWinners,
    lineWinClaimed,
    hasWon,
    autoPlay,
  });

  const navigate = useNavigate();

  const handleReturnToLanding = () => {
    if (window.confirm('Are you sure you want to return to the landing page?')) {
      navigate('/');
    }
  };

  return (
    <div className="mt-6 flex flex-wrap justify-center gap-4">
      {/* Auto Play Control */}
      <button
        type="button"
        onClick={onToggleAutoPlay}
        disabled={hasWon || isPaused}
        className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-3 text-white shadow-md transition-all hover:from-indigo-700 hover:to-purple-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {autoPlay ? <Pause size={20} /> : <Play size={20} />}
        {autoPlay ? 'Pause' : 'Auto Play'}
      </button>

      {/* Unpause Button - Show when paused */}
      {isPaused && (
        <button
          type="button"
          onClick={() => {
            console.log('[GameControls] 👆 Unpause button clicked');
            onUnpauseGame();
          }}
          disabled={hasWon}
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-3 text-white shadow-md transition-all hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <PlayCircle size={20} />
          Unpause Game
        </button>
      )}


      {/* Return to Landing button */}
      <button
        type="button"
        onClick={handleReturnToLanding}
        className="flex items-center gap-2 rounded-lg bg-gray-600 px-6 py-3 text-white shadow-md transition-all hover:bg-gray-700"
      >
        <ArrowLeft size={20} />
        Return to Landing
      </button>
    </div>
  );
}