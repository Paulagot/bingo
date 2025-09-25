import React, { useMemo, useState, useEffect } from 'react';
import PlayerSearchInput from '../game/PlayerSearchInput';

type UseExtraModalProps = {
  visible: boolean;
  players: { id: string; name: string; score?: number }[];
  onCancel: () => void;
  onConfirm: (targetPlayerId: string) => void;
  extraType?: 'freezeOutTeam' | 'robPoints';
};

const UseExtraModal: React.FC<UseExtraModalProps> = ({
  visible,
  players,
  onCancel,
  onConfirm,
  extraType = 'freezeOutTeam',
}) => {
  const [selectedPlayer, setSelectedPlayer] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');

  // Optional: reset state whenever the modal closes/opens
  useEffect(() => {
    if (!visible) {
      setSelectedPlayer('');
      setSearchTerm('');
    }
  }, [visible]);

  const modalConfig = (() => {
    switch (extraType) {
      case 'robPoints':
        return { title: '⚡ Select player to rob points from', buttonText: 'Rob Points', icon: '⚡' };
      case 'freezeOutTeam':
      default:
        return { title: '❄️ Select player to freeze', buttonText: 'Freeze Player', icon: '❄️' };
    }
  })();

  const norm = (s: string) =>
    (s || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '');

  const filteredPlayers = useMemo(() => {
    if (!searchTerm.trim()) return players ?? [];
    const q = norm(searchTerm.trim());
    return (players ?? []).filter((p) => norm(p.name).includes(q));
  }, [players, searchTerm]);

  // ✅ Decide what to render AFTER all hooks have been called
  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-muted w-[400px] rounded-xl p-6 shadow-xl">
        <h2 className="mb-4 text-xl font-bold">{modalConfig.title}</h2>

        <PlayerSearchInput
          value={searchTerm}
          onChange={setSearchTerm}
          placeholder="Search players…"
          className="mb-3"
        />

        <div className="mb-4 max-h-64 space-y-2 overflow-auto pr-1">
          {filteredPlayers.length === 0 ? (
            <p className="text-sm text-gray-600">No players match “{searchTerm}”.</p>
          ) : (
            filteredPlayers.map((player) => (
              <button
                key={player.id}
                onClick={() => setSelectedPlayer(player.id)}
                className={`block w-full rounded-lg border px-4 py-2 text-left ${
                  selectedPlayer === player.id ? 'bg-indigo-600 text-white' : 'bg-gray-100 hover:bg-gray-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span>{player.name}</span>
                  {extraType === 'robPoints' && player.score !== undefined && (
                    <span className="text-sm opacity-75">{player.score} pts</span>
                  )}
                </div>
              </button>
            ))
          )}
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


