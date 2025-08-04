// src/components/Quiz/dashboard/PlayerListPanel.tsx

import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { usePlayerStore } from '../hooks/usePlayerStore';
import { useQuizConfig } from '../hooks/useQuizConfig';
import { QRCodeCanvas } from 'qrcode.react';
import AddPlayerModal from './AddPlayerModal';
import { BadgeCheck, BadgeX } from 'lucide-react';
import { fundraisingExtras } from '../types/quiz';
import { useQuizSocket } from '../sockets/QuizSocketProvider';  // ✅ new socket hook

const PlayerListPanel: React.FC = () => {
  const { config } = useQuizConfig();
  const { roomId } = useParams();
  const { players } = usePlayerStore();
  const [newName, setNewName] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const { socket } = useQuizSocket();
  const debug = false;

  useEffect(() => {
    if (!roomId || !socket) return;

    const handlePlayerListUpdated = ({ players }: { players: any[] }) => {
      if (debug) console.log('[Socket] 🎯 player_list_updated received:', players);
      usePlayerStore.setState({ players });
    };

    socket.on('player_list_updated', handlePlayerListUpdated);

    return () => {
      socket.off('player_list_updated', handlePlayerListUpdated);
    };
  }, [roomId, socket]);

  const isWeb3 = config.paymentMethod === 'web3';
  const baseJoinUrl = `${window.location.origin}/quiz/game/${roomId}`;
  const allExtras = Object.entries(config?.fundraisingOptions || {})
    .filter(([_, enabled]) => enabled)
    .map(([key]) => key);

  const toggleDisqualification = (playerId: string) => {
    usePlayerStore.setState((state) => {
      const updatedPlayers = state.players.map((p) =>
        p.id === playerId ? { ...p, disqualified: !p.disqualified } : p
      );

      if (roomId) {
        localStorage.setItem(`players_${roomId}`, JSON.stringify(updatedPlayers));
      }

      const updatedPlayer = updatedPlayers.find((p) => p.id === playerId);

      if (updatedPlayer && socket) {
        socket.emit('disqualify_player', {
          roomId,
          playerId,
          disqualified: updatedPlayer.disqualified,
        });

        if (debug)
          console.log(`[Socket Emit] disqualify_player`, {
            playerId,
            disqualified: updatedPlayer.disqualified,
          });
      }

      return { players: updatedPlayers };
    });
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow-sm">
      <h2 className="text-2xl font-bold text-gray-800 mb-4">👥 Players</h2>

      {!isWeb3 && (
        <div className="flex flex-col sm:flex-row gap-2 mb-4">
          <input
            type="text"
            placeholder="Player Name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="flex-1 border border-gray-300 rounded-md px-3 py-2 focus:ring-indigo-500"
          />
          <button
            onClick={() => {
              if (newName.trim()) setShowModal(true);
            }}
            className="bg-indigo-600 text-white px-5 py-2 rounded-md font-medium shadow hover:bg-indigo-700 transition"
          >
            Add
          </button>
        </div>
      )}

      <AddPlayerModal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setNewName('');
        }}
        initialName={newName}
        roomId={roomId || ''}
      />

      {players.length === 0 ? (
        <p className="text-gray-600">No players {isWeb3 ? 'have joined yet.' : 'added yet.'}</p>
      ) : (
        <ul className="space-y-2">
          {players.map((player) => {
            const joinLink = `${baseJoinUrl}/${player.id}`;
            const isShowingQR = selectedPlayerId === player.id;

            return (
              <li key={player.id} className="p-2 border rounded-md bg-gray-50 text-sm">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="flex-1">
                    <p className="font-semibold text-gray-800 flex items-center gap-2">
                      {player.name}
                      {player.disqualified && (
                        <span className="text-xs bg-red-100 text-red-600 rounded px-2 py-0.5 uppercase">Disqualified</span>
                      )}
                      {player.paid ? (
                        <BadgeCheck className="w-4 h-4 text-green-600" />
                      ) : (
                        <BadgeX className="w-4 h-4 text-red-600" />
                      )}
                    </p>
                    <div className="flex flex-wrap items-center gap-2 text-gray-600 mt-1">
                      <span>Payment: {player.paid ? 'Paid' : 'Unpaid'}</span>
                      {allExtras.map((extraKey) => {
                        const extra = fundraisingExtras[extraKey];
                        const hasExtra = player.extras?.includes(extraKey);
                        return (
                          <span
                            key={extraKey}
                            className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                              hasExtra ? 'bg-green-100 text-green-800' : 'bg-gray-200 text-gray-600'
                            }`}
                          >
                            {extra?.label?.replace(/^Buy\s+/i, '') || extraKey.replace(/^buy/i, '')}
                          </span>
                        );
                      })}
                      <button
                        onClick={() => toggleDisqualification(player.id)}
                        className="text-red-600 text-xs underline ml-2"
                      >
                        {player.disqualified ? 'Undo' : 'Disqualify'}
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-col items-end">
                    <button
                      onClick={() => setSelectedPlayerId(isShowingQR ? null : player.id)}
                      className="text-indigo-600 hover:underline text-xs font-semibold"
                    >
                      🔗 Invite
                    </button>

                    {isShowingQR && (
                      <div className="mt-1 p-2 bg-white border rounded-md shadow-sm max-w-xs">
                        <QRCodeCanvas value={joinLink} size={96} />
                        <p className="mt-1 text-xs text-gray-600 break-all">{joinLink}</p>
                        <button
                          onClick={() => navigator.clipboard.writeText(joinLink)}
                          className="text-indigo-600 text-xs mt-1 hover:underline"
                        >
                          Copy Link
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

export default PlayerListPanel;
















