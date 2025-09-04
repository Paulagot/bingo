// src/components/Quiz/game/UseExtraModal.tsx

import React, { useState } from 'react';

type UseExtraModalProps = {
  visible: boolean;
  players: { id: string; name: string; score?: number }[];
  onCancel: () => void;
  onConfirm: (targetPlayerId: string) => void;
  extraType?: 'freezeOutTeam' | 'robPoints'; // ✅ NEW: Dynamic extra type
};

const UseExtraModal: React.FC<UseExtraModalProps> = ({ 
  visible, 
  players, 
  onCancel, 
  onConfirm,
  extraType = 'freezeOutTeam' // ✅ Default to freeze for backward compatibility
}) => {
  const [selectedPlayer, setSelectedPlayer] = useState<string>('');

  if (!visible) return null;

  // ✅ Dynamic content based on extra type
  const getModalConfig = () => {
    switch (extraType) {
      case 'robPoints':
        return {
          title: '⚡ Select player to rob points from',
          buttonText: 'Rob Points',
          icon: '⚡'
        };
      case 'freezeOutTeam':
      default:
        return {
          title: '❄️ Select player to freeze',
          buttonText: 'Freeze Player',
          icon: '❄️'
        };
    }
  };

  const modalConfig = getModalConfig();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-muted w-[400px] rounded-xl p-6 shadow-xl">
        <h2 className="mb-4 text-xl font-bold">{modalConfig.title}</h2>

        <div className="mb-4 space-y-2">
          {players.map((player) => (
            <button
              key={player.id}
              onClick={() => setSelectedPlayer(player.id)}
              className={`block w-full rounded-lg border px-4 py-2 text-left
                ${selectedPlayer === player.id ? 'bg-indigo-600 text-white' : 'bg-gray-100 hover:bg-gray-200'}`}
            >
              <div className="flex items-center justify-between">
                <span>{player.name}</span>
                {/* ✅ Show score for robPoints */}
                {extraType === 'robPoints' && player.score !== undefined && (
                  <span className="text-sm opacity-75">{player.score} pts</span>
                )}
              </div>
            </button>
          ))}
        </div>

        <div className="flex justify-end space-x-4">
          <button onClick={onCancel} className="rounded bg-gray-300 px-4 py-2 hover:bg-gray-400">
            Cancel
          </button>
          <button
            onClick={() => onConfirm(selectedPlayer)}
            disabled={!selectedPlayer}
            className="rounded bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {modalConfig.icon} {modalConfig.buttonText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default UseExtraModal;
