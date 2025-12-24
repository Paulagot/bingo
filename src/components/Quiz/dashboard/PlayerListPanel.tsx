// src/components/Quiz/dashboard/PlayerListPanel.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { usePlayerStore } from '../hooks/usePlayerStore';
import { useQuizConfig } from '../hooks/useQuizConfig';
import { QRCodeCanvas } from 'qrcode.react';
import AddPlayerModal from './AddPlayerModal';
import { useRoomIdentity } from '../hooks/useRoomIdentity';
import QRCodeShare from './QRCodeShare';
import { 
  Users, 
  UserPlus, 
  QrCode, 
  Link as LinkIcon, 
  X,
  AlertCircle,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Pencil
} from 'lucide-react';
import { fundraisingExtras } from '../types/quiz';
import { useQuizSocket } from '../sockets/QuizSocketProvider';
import PlayerSearchInput from '../game/PlayerSearchInput';

const PlayerListPanel: React.FC = () => {
  const { config } = useQuizConfig();
  // Prefer canonical room id from identity, fallback to route param
  const { roomId: identityRoomId } = useRoomIdentity();
  const { roomId: routeRoomId } = useParams();
  const roomId = identityRoomId || routeRoomId || '';

  const { players } = usePlayerStore();

  const isWeb3 = config?.paymentMethod === 'web3' || config?.isWeb3Room;
  const maxPlayers = isWeb3 ? Number.POSITIVE_INFINITY : (config?.roomCaps?.maxPlayers ?? 20);
  const atCapacity = isWeb3 ? false : ((players?.length || 0) >= maxPlayers);

  const currency = config?.currencySymbol || '€';
  const entryFee = Number(config?.entryFee) || 0;

  // Asset room gating for room-level QR
  const isAssetRoom = isWeb3 && config?.prizeMode === 'assets';
  const assetPrizes = useMemo(
    () => (Array.isArray(config?.prizes) ? config!.prizes! : []).filter((p: any) => p?.tokenAddress),
    [config?.prizes]
  );
  const allAssetsUploaded =
    assetPrizes.length > 0 &&
    assetPrizes.every((p: any) => p?.uploadStatus === 'completed');
  const showRoomQR = isWeb3 && (!isAssetRoom || allAssetsUploaded);

  const [newName, setNewName] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState<any | null>(null);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const { socket } = useQuizSocket();
  const debug = false;

  useEffect(() => {
    if (!roomId || !socket) return;

    const handlePlayerListUpdated = ({ players }: { players: any[] }) => {
      if (debug) console.log('[Socket] player_list_updated received:', players);
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

  const copyToClipboard = (text: string, playerId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(playerId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const norm = (s: string) =>
    (s || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '');

  const filteredPlayers = useMemo(() => {
    if (!searchTerm.trim()) return players;
    const q = norm(searchTerm.trim());
    return players.filter((p: any) => norm(p.name).includes(q));
  }, [players, searchTerm]);

  const activePlayers = filteredPlayers.filter((p: any) => !p.disqualified);
  const disqualifiedPlayers = filteredPlayers.filter((p: any) => p.disqualified);
  const paidCount = players.filter((p: any) => p.paid && !p.disqualified).length;

  // Total owed helper
  const getPlayerTotals = (player: any) => {
    const extrasTotal = (player.extras || []).reduce(
      (sum: number, key: string) => sum + (config?.fundraisingPrices?.[key] || 0),
      0
    );
    const total = entryFee + extrasTotal;
    return { extrasTotal, total };
  };

  const isEditModalOpen = !!editingPlayer;

  return (
    <div className="bg-gray-50 rounded-xl p-6 shadow-md">
      {/* Header with Stats */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-indigo-100 p-2">
            <Users className="h-6 w-6 text-indigo-700" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Players</h2>
            <p className="text-sm text-gray-600 mt-0.5">
              {players.length} total • {paidCount} paid • {disqualifiedPlayers.length} disqualified
            </p>
          </div>
        </div>

        <div className="sm:w-72">
          <PlayerSearchInput
            value={searchTerm}
            onChange={setSearchTerm}
            placeholder="Search players by name…"
          />
        </div>
      </div>

      {/* Room-level QR */}
      {roomId && (
        isWeb3 ? (
          showRoomQR ? (
            <div className="mb-6">
              <QRCodeShare
                roomId={roomId}
                hostName={config?.hostName}
                gameType={config?.gameType}
              />
            </div>
          ) : isAssetRoom ? (
            <div className="mb-6 rounded-lg border border-yellow-200 bg-yellow-50 p-4">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
                <div className="text-sm text-yellow-800">
                  <p className="font-medium">QR joining is locked for asset rooms.</p>
                  <p className="mt-1">
                    Add and upload all digital prize assets first.{' '}
                    {assetPrizes.length === 0
                      ? 'No assets configured yet.'
                      : `Uploaded ${
                          assetPrizes.filter((p: any) => p?.uploadStatus === 'completed').length
                        }/${assetPrizes.length}.`}
                  </p>
                </div>
              </div>
            </div>
          ) : null
        ) : (
          // ✅ Web2 / cash / Revolut rooms get a simple room QR with no gating
          <div className="mb-6">
            <QRCodeShare
              roomId={roomId}
              hostName={config?.hostName}
              gameType={config?.gameType}
            />
          </div>
        )
      )}

      {/* Add Player Section (Web2 only) */}
      {!isWeb3 && (
        <div className="mb-6 rounded-lg border-2 border-indigo-200 bg-white p-4">
          <div className="flex items-center gap-2 mb-3">
            <UserPlus className="h-5 w-5 text-indigo-600" />
            <h3 className="font-semibold text-gray-900">Add New Player</h3>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              placeholder="Enter player name..."
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && newName.trim() && !atCapacity) {
                  setShowModal(true);
                }
              }}
              className="flex-1 rounded-lg border-2 border-gray-300 px-4 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 transition-all"
            />
            <button
              onClick={() => { if (newName.trim()) setShowModal(true); }}
              disabled={atCapacity || !newName.trim()}
              className={`rounded-lg px-6 py-2.5 font-semibold text-white shadow-sm transition-all inline-flex items-center gap-2 ${
                atCapacity || !newName.trim()
                  ? 'cursor-not-allowed opacity-50 bg-gray-400'
                  : 'bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800'
              }`}
            >
              <UserPlus className="h-4 w-4" />
              Add Player
            </button>
          </div>

          {atCapacity && (
            <div className="mt-3 flex items-start gap-2 rounded-lg bg-red-50 border border-red-200 p-3">
              <AlertCircle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-red-700">
                Player limit reached ({Number.isFinite(maxPlayers) ? maxPlayers : 'limit'}). Upgrade your plan to add more players.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Shared Add/Edit Modal */}
      <AddPlayerModal
        isOpen={showModal || isEditModalOpen}
        onClose={() => {
          setShowModal(false);
          setEditingPlayer(null);
          setNewName('');
        }}
        initialName={editingPlayer?.name ?? newName}
        roomId={roomId}
        mode={editingPlayer ? 'edit' : 'add'}
        playerToEdit={editingPlayer ?? undefined}
      />

      {/* Empty State */}
      {players.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-gray-300 bg-white p-8 text-center">
          <Users className="h-12 w-12 text-gray-400 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Players Yet</h3>
          <p className="text-sm text-gray-600">
            {isWeb3 ? 'Players will appear here when they join via wallet connection.' : 'Add your first player to get started.'}
          </p>
        </div>
      ) : filteredPlayers.length === 0 ? (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-6 text-center">
          <AlertCircle className="h-8 w-8 text-amber-600 mx-auto mb-2" />
          <p className="text-sm text-amber-800">No players match "{searchTerm}"</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Active Players */}
          {activePlayers.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-3">
                Active Players ({activePlayers.length})
              </h3>
              <ul className="space-y-2">
                {activePlayers.map((player: any) => {
                  const joinLink = `${baseJoinUrl}/${player.id}`;
                  const isShowingQR = selectedPlayerId === player.id;
                  const isCopied = copiedId === player.id;

                  const { extrasTotal, total } = getPlayerTotals(player);

                  return (
                    <li
                      key={player.id}
                      className="rounded-lg border-2 border-gray-200 bg-white p-4 hover:border-indigo-300 hover:shadow-md transition-all"
                    >
                      <div className="flex flex-col gap-3">
                        {/* Player Info */}
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-semibold text-gray-900">{player.name}</h4>
                              {player.paid ? (
                                <div className="flex items-center gap-1 rounded-full bg-green-100 border border-green-300 px-2 py-0.5">
                                  <CheckCircle2 className="h-3 w-3 text-green-700" />
                                  <span className="text-xs font-medium text-green-800">Paid</span>
                                </div>
                              ) : (
                                <div className="flex items-center gap-1 rounded-full bg-red-100 border border-red-300 px-2 py-0.5">
                                  <XCircle className="h-3 w-3 text-red-700" />
                                  <span className="text-xs font-medium text-red-800">Unpaid</span>
                                </div>
                              )}
                            </div>

                            {/* Amount owed */}
                            <div className="mb-2 text-xs text-gray-700">
                              <span className="font-semibold">
                                Total: {currency}
                                {total.toFixed(2)}
                              </span>
                              {' · '}
                              <span>
                                Entry {currency}
                                {entryFee.toFixed(2)}
                              </span>
                              {extrasTotal > 0 && (
                                <>
                                  {' + Extras '}
                                  <span>
                                    {currency}
                                    {extrasTotal.toFixed(2)}
                                  </span>
                                </>
                              )}
                            </div>

                            {/* Extras */}
                            {allExtras.length > 0 && (
                              <div className="flex flex-wrap gap-1.5">
                                {allExtras.map((extraKey) => {
                                  const extra = fundraisingExtras[extraKey];
                                  const hasExtra = player.extras?.includes(extraKey);
                                  return (
                                    <span
                                      key={extraKey}
                                      className={`rounded-full px-2.5 py-0.5 text-xs font-medium transition-all ${
                                        hasExtra
                                          ? 'bg-green-100 text-green-800 border border-green-300'
                                          : 'bg-gray-100 text-gray-600 border border-gray-200'
                                      }`}
                                    >
                                      {extra?.label?.replace(/^Buy\s+/i, '') ||
                                        extraKey.replace(/^buy/i, '')}
                                    </span>
                                  );
                                })}
                              </div>
                            )}
                          </div>

                          {/* Action Buttons */}
                          <div className="flex flex-col gap-2">
                            <button
                              onClick={() => setSelectedPlayerId(isShowingQR ? null : player.id)}
                              className="inline-flex items-center gap-1.5 rounded-lg border-2 border-indigo-300 bg-white px-3 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-50 transition-all"
                            >
                              <QrCode className="h-3.5 w-3.5" />
                              {isShowingQR ? 'Hide' : 'Invite'}
                            </button>

                            {!isWeb3 && (
  <button
    onClick={() => setEditingPlayer(player)}
    className="inline-flex items-center gap-1.5 rounded-lg border-2 border-emerald-300 bg-white px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 transition-all"
  >
    <Pencil className="h-3.5 w-3.5" />
    Edit
  </button>
)}

                            <button
                              onClick={() => toggleDisqualification(player.id)}
                              className="inline-flex items-center gap-1.5 rounded-lg border-2 border-red-300 bg-white px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50 transition-all"
                            >
                              <X className="h-3.5 w-3.5" />
                              Disqualify
                            </button>
                          </div>
                        </div>

                        {/* QR Code Section */}
                        {isShowingQR && (
                          <div className="mt-2 rounded-lg bg-gray-50 border border-gray-200 p-4">
                            <div className="flex flex-col sm:flex-row gap-4 items-center">
                              <div className="bg-white p-3 rounded-lg border-2 border-gray-300 shadow-sm">
                                <QRCodeCanvas value={joinLink} size={120} />
                              </div>
                              <div className="flex-1 w-full">
                                <label className="text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2 block">
                                  Join Link
                                </label>
                                <div className="flex gap-2">
                                  <input
                                    type="text"
                                    value={joinLink}
                                    readOnly
                                    className="flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-mono text-gray-700"
                                  />
                                  <button
                                    onClick={() => copyToClipboard(joinLink, player.id)}
                                    className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700 transition-all inline-flex items-center gap-1.5"
                                  >
                                    <LinkIcon className="h-3.5 w-3.5" />
                                    {isCopied ? 'Copied!' : 'Copy'}
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {/* Disqualified Players */}
          {disqualifiedPlayers.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-3">
                Disqualified Players ({disqualifiedPlayers.length})
              </h3>
              <ul className="space-y-2">
                {disqualifiedPlayers.map((player: any) => (
                  <li key={player.id} className="rounded-lg border-2 border-red-200 bg-red-50 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold text-gray-900">{player.name}</h4>
                          <span className="rounded-full bg-red-100 border border-red-300 px-2.5 py-0.5 text-xs font-semibold uppercase text-red-700">
                            Disqualified
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => toggleDisqualification(player.id)}
                        className="inline-flex items-center gap-1.5 rounded-lg border-2 border-green-300 bg-white px-3 py-1.5 text-xs font-semibold text-green-700 hover:bg-green-50 transition-all"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Restore
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PlayerListPanel;



















