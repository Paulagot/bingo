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

// 👉 Derive capacity AFTER players exist, and only for Web2
const isWeb3 = config?.paymentMethod === 'web3' || config?.isWeb3Room;
const maxPlayers = isWeb3 ? Number.POSITIVE_INFINITY : (config?.roomCaps?.maxPlayers ?? 20);
const atCapacity = isWeb3 ? false : ((players?.length || 0) >= maxPlayers);


  
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


  const baseJoinUrl = `${window.location.origin}/quiz/game/${roomId}`;

const allowedExtras: string[] =
  Array.isArray(config?.roomCaps?.extrasAllowed)
    ? config!.roomCaps!.extrasAllowed!
    : Object.keys(config?.fundraisingOptions || {});

const allExtras = Object.entries(config?.fundraisingOptions || {})
  .filter(([key, enabled]) => !!enabled && allowedExtras.includes(key))
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
    <div className="bg-muted rounded-lg p-4 shadow-sm">
      <h2 className="text-fg mb-4 text-2xl font-bold">👥 Players</h2>

      {!isWeb3 && (
        <div className="mb-4 flex flex-col gap-2 sm:flex-row">
          <input
            type="text"
            placeholder="Player Name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="flex-1 rounded-md border border-gray-300 px-3 py-2 focus:ring-indigo-500"
          />
      <button
  onClick={() => { if (newName.trim()) setShowModal(true); }}
  disabled={atCapacity}
  className={`rounded-md bg-indigo-600 px-5 py-2 font-medium text-white shadow transition ${
    atCapacity ? 'cursor-not-allowed opacity-50' : 'hover:bg-indigo-700'
  }`}
>
  Add
</button>

{!isWeb3 && atCapacity && (
  <p className="mt-2 text-xs text-red-600">
    Player limit reached ({Number.isFinite(maxPlayers) ? maxPlayers : 'limit'}). Upgrade to add more.
  </p>
)}
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
        <p className="text-fg/70">No players {isWeb3 ? 'have joined yet.' : 'added yet.'}</p>
      ) : (
        <ul className="space-y-2">
          {players.map((player) => {
            const joinLink = `${baseJoinUrl}/${player.id}`;
            const isShowingQR = selectedPlayerId === player.id;

            return (
              <li key={player.id} className="rounded-md border bg-gray-50 p-2 text-sm">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex-1">
                    <p className="text-fg flex items-center gap-2 font-semibold">
                      {player.name}
                      {player.disqualified && (
                        <span className="rounded bg-red-100 px-2 py-0.5 text-xs uppercase text-red-600">Disqualified</span>
                      )}
                      {player.paid ? (
                        <BadgeCheck className="h-4 w-4 text-green-600" />
                      ) : (
                        <BadgeX className="h-4 w-4 text-red-600" />
                      )}
                    </p>
                    <div className="text-fg/70 mt-1 flex flex-wrap items-center gap-2">
                      <span>Payment: {player.paid ? 'Paid' : 'Unpaid'}</span>
                      {allExtras.map((extraKey) => {
                        const extra = fundraisingExtras[extraKey];
                        const hasExtra = player.extras?.includes(extraKey);
                        return (
                          <span
                            key={extraKey}
                            className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                              hasExtra ? 'bg-green-100 text-green-800' : 'text-fg/70 bg-gray-200'
                            }`}
                          >
                            {extra?.label?.replace(/^Buy\s+/i, '') || extraKey.replace(/^buy/i, '')}
                          </span>
                        );
                      })}
                      <button
                        onClick={() => toggleDisqualification(player.id)}
                        className="ml-2 text-xs text-red-600 underline"
                      >
                        {player.disqualified ? 'Undo' : 'Disqualify'}
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-col items-end">
                    <button
                      onClick={() => setSelectedPlayerId(isShowingQR ? null : player.id)}
                      className="text-xs font-semibold text-indigo-600 hover:underline"
                    >
                      🔗 Invite
                    </button>

                    {isShowingQR && (
                      <div className="bg-muted mt-1 max-w-xs rounded-md border p-2 shadow-sm">
                        <QRCodeCanvas value={joinLink} size={96} />
                        <p className="text-fg/70 mt-1 break-all text-xs">{joinLink}</p>
                        <button
                          onClick={() => navigator.clipboard.writeText(joinLink)}
                          className="mt-1 text-xs text-indigo-600 hover:underline"
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
















