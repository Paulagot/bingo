import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Users } from 'lucide-react';
import { useGameStore } from '../store/gameStore';

export function Header() {
  const navigate = useNavigate();
  const location = useLocation();
  const { players, playerName } = useGameStore();
  const isGamePage = location.pathname.startsWith('/game/');
  const roomId = location.pathname.split('/').pop();

  const handleBack = () => {
    if (isGamePage) {
      if (window.confirm('Are you sure you want to leave the game? All progress will be lost.')) {
        navigate('/');
      }
    }
  };

  return (
    <header className="fixed top-0 left-0 right-0 bg-white/90 backdrop-blur-sm shadow-sm z-50">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        {isGamePage ? (
          <>
            <button
              onClick={handleBack}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft size={20} />
              <span className="hidden sm:inline">Leave Game</span>
            </button>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-100 rounded-full text-sm">
                <Users size={16} className="text-blue-600" />
                <span className="text-blue-800 font-medium">{players.length}</span>
              </div>
              <div className="px-3 py-1.5 bg-green-100 rounded-full">
                <span className="text-sm text-green-800 font-medium">
                  Room: {roomId}
                </span>
              </div>
            </div>
          </>
        ) : (
          <div className="w-full text-center">
            <h1 className="text-xl font-bold text-blue-900">Bingo</h1>
          </div>
        )}
      </div>
    </header>
  );
}