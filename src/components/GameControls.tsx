import React from 'react';
import { Play, Pause, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface GameControlsProps {
  onCallNumber: () => void;
  onToggleAutoPlay: () => void;
  hasWon: boolean;
  autoPlay: boolean;
}

export function GameControls({ 
  onCallNumber, 
  onToggleAutoPlay,
  hasWon,
  autoPlay 
}: GameControlsProps) {
  const navigate = useNavigate();

  const handleReturnToLanding = () => {
    if (window.confirm('Are you sure you want to return to the landing page?')) {
      navigate('/');
    }
  };

  return (
    <div className="flex justify-center gap-4 mt-6">
      <button
        onClick={onToggleAutoPlay}
        disabled={hasWon}
        className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {autoPlay ? <Pause size={20} /> : <Play size={20} />}
        {autoPlay ? 'Pause' : 'Auto Play'}
      </button>
      <button
        onClick={onCallNumber}
        disabled={hasWon || autoPlay}
        className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Call Number
      </button>
      <button
        onClick={handleReturnToLanding}
        className="flex items-center gap-2 px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
      >
        <ArrowLeft size={20} />
        Return to Landing
      </button>
    </div>
  );
}