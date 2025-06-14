// src/components/Quiz/game/UseExtraModal.tsx

import React, { useState } from 'react';

type UseExtraModalProps = {
  visible: boolean;
  players: { id: string; name: string }[];
  onCancel: () => void;
  onConfirm: (targetPlayerId: string) => void;
};

const UseExtraModal: React.FC<UseExtraModalProps> = ({ visible, players, onCancel, onConfirm }) => {
  const [selectedPlayer, setSelectedPlayer] = useState<string>('');

  if (!visible) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
      <div className="bg-white p-6 rounded-xl shadow-xl w-[400px]">
        <h2 className="text-xl font-bold mb-4">❄️ Select player to freeze</h2>

        <div className="space-y-2 mb-4">
          {players.map((player) => (
            <button
              key={player.id}
              onClick={() => setSelectedPlayer(player.id)}
              className={`block w-full px-4 py-2 rounded-lg border 
                ${selectedPlayer === player.id ? 'bg-indigo-600 text-white' : 'bg-gray-100 hover:bg-gray-200'}`}
            >
              {player.name}
            </button>
          ))}
        </div>

        <div className="flex justify-end space-x-4">
          <button onClick={onCancel} className="px-4 py-2 rounded bg-gray-300 hover:bg-gray-400">
            Cancel
          </button>
          <button
            onClick={() => onConfirm(selectedPlayer)}
            disabled={!selectedPlayer}
            className="px-4 py-2 rounded bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            Freeze Player
          </button>
        </div>
      </div>
    </div>
  );
};

export default UseExtraModal;
