import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  CheckCircle,
  Zap,
  Users,
  AlertCircle,
  Trophy,
  Play,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { useQuizSocket } from '../sockets/QuizSocketProvider';
import { useQuizConfig } from '../hooks/useQuizConfig';
import { fundraisingExtraDefinitions, roundTypeDefinitions } from '../constants/quizMetadata';
import type { RoundTypeId } from '../types/quiz';

const DEBUG = true;

const debugLog = {
  info: (message: string, ...args: any[]) => { if (DEBUG) console.log(`🔵 [WaitingPage] ${message}`, ...args); },
  success: (message: string, ...args: any[]) => { if (DEBUG) console.log(`✅ [WaitingPage] ${message}`, ...args); },
  warning: (message: string, ...args: any[]) => { if (DEBUG) console.warn(`⚠️ [WaitingPage] ${message}`, ...args); },
  error: (message: string, ...args: any[]) => { if (DEBUG) console.error(`❌ [WaitingPage] ${message}`, ...args); },
  event: (message: string, ...args: any[]) => { if (DEBUG) console.log(`🎯 [WaitingPage] ${message}`, ...args); },
  data: (message: string, data: any) => { if (DEBUG) { console.group(`📦 [WaitingPage] ${message}`); console.log(data); console.groupEnd(); } },
  lifecycle: (message: string, ...args: any[]) => { if (DEBUG) console.log(`🔄 [WaitingPage] ${message}`, ...args); }
};

interface ServerPlayer {
  id: string;
  name: string;
  paid: boolean;
  paymentMethod: string;
  credits: number;
  extras: string[];
  extraPayments?: Record<string, any>;
  disqualified?: boolean;
}

const QuizGameWaitingPage = () => {
  const { roomId, playerId } = useParams<{ roomId: string; playerId: string }>();
  const { socket, connected } = useQuizSocket();
  const navigate = useNavigate();
  const { config } = useQuizConfig();

  const [playerData, setPlayerData] = useState<ServerPlayer | null>(null);
  const [allPlayers, setAllPlayers] = useState<ServerPlayer[]>([]);
  const [showRounds, setShowRounds] = useState(false);
  const [showPrizes, setShowPrizes] = useState(false);
  const [showArsenal, setShowArsenal] = useState(false);
  const hasJoinedRef = useRef(false);

  debugLog.lifecycle('🚀 QuizGameWaitingPage mount');
  debugLog.data('Component params', { roomId, playerId });
  debugLog.data('Socket state', { connected, hasSocket: !!socket });

  // 🔐 Cache key
  const STORAGE_KEY = roomId && playerId ? `fr_player:${roomId}:${playerId}` : null;

  // 🔁 Central join function (mount + reconnect reuse)
  const joinOrRejoin = () => {
    if (!socket || !connected || !roomId || !playerId) {
      debugLog.warning('⚠️ Missing data for joinOrRejoin', { connected, roomId, playerId });
      return;
    }

    if (hasJoinedRef.current) {
      // Idempotent: we can still re-run; server will disconnect any prior player socket
    }
    hasJoinedRef.current = true;

    // ✅ FIX: Build user object conditionally - only include name if we have valid data
    const userPayload: { id: string; name?: string } = { id: playerId };
    
    // Only include name if we have actual player data loaded (not the default 'Player')
    if (playerData?.name && playerData.name !== 'Player') {
      userPayload.name = playerData.name;
    }
    
    debugLog.info('🔄 Joining/rejoining with payload:', userPayload);

    socket.emit(
      'join_and_recover',
      { roomId, user: userPayload, role: 'player' },
      (res?: any) => {
        if (!res?.ok) {
          const msg = res?.error || 'Failed to recover';
          debugLog.error('❌ join_and_recover failed', msg);
          navigate('/quiz');
          return;
        }
        debugLog.success('✅ join_and_recover snapshot received');
        const { snap } = res;
        // If the game is already underway, go to play page
        const phase = snap?.roomState?.phase;
        if (['asking','reviewing','leaderboard','launched','tiebreaker','complete'].includes(phase)) {
          navigate(`/quiz/play/${roomId}/${playerId}`);
        }
      }
    );
  };

  // Debug: rounds
  useEffect(() => {
    if (config?.roundDefinitions) {
      if (DEBUG) console.log('Round definitions:', config.roundDefinitions);
      if (DEBUG) console.log('Sample round:', config.roundDefinitions[0]);
    }
  }, [config]);

  // 🗄️ Hydrate from cache early - BEFORE any join attempts
  useEffect(() => {
    if (!STORAGE_KEY) return;
    
    try {
      const cached = localStorage.getItem(STORAGE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached) as ServerPlayer;
        setPlayerData(parsed);
        debugLog.info('🗄️ Loaded player snapshot from cache:', parsed.name);
      }
    } catch (err) {
      debugLog.error('Failed to load from cache', err);
    }
    
    if (roomId && playerId) {
      localStorage.setItem('fr_last_room_ctx', JSON.stringify({ roomId, playerId, at: Date.now() }));
    }
  }, [STORAGE_KEY, roomId, playerId]);

  // ✍️ Persist any fresh playerData
  useEffect(() => {
    if (!STORAGE_KEY || !playerData) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(playerData));
      debugLog.info('💾 Persisted player data to cache:', playerData.name);
    } catch (err) {
      debugLog.error('Failed to persist to cache', err);
    }
  }, [STORAGE_KEY, playerData]);

  // 🔌 Socket lifecycle: connect/reconnect
  useEffect(() => {
    if (!socket) return;

    const onConnect = () => {
      debugLog.lifecycle('🔌 socket connected', { id: socket.id });
      hasJoinedRef.current = false;
      joinOrRejoin();
    };

    const onReconnect = (attempt: number) => {
      debugLog.lifecycle('🔄 socket reconnected', { attempt });
      hasJoinedRef.current = false;
      joinOrRejoin();
    };

    const onDisconnect = (reason: string) => {
      debugLog.lifecycle('🧯 socket disconnected', { reason });
    };

    socket.on('connect', onConnect);
    socket.on('reconnect', onReconnect);
    socket.on('disconnect', onDisconnect);

    return () => {
      socket.off('connect', onConnect);
      socket.off('reconnect', onReconnect);
      socket.off('disconnect', onDisconnect);
    };
  }, [socket, roomId, playerId, connected, playerData]);

  // 🔔 Listeners
  useEffect(() => {
    if (!socket || !connected) return;

    const handlePlayerListUpdated = ({ players }: { players: ServerPlayer[] }) => {
      debugLog.event('🎯 player_list_updated received', players);
      setAllPlayers(players);
      const currentPlayer = players.find((p: ServerPlayer) => p.id === playerId);
      if (currentPlayer) {
        setPlayerData(currentPlayer);
        debugLog.data('Current player data updated', currentPlayer);
      }
    };

    const handleQuizLaunched = ({ roomId: launchedRoomId, message }: { roomId: string; message: string }) => {
      debugLog.event('🚀 Quiz launched - redirecting to play page', { launchedRoomId, message });
      setTimeout(() => {
        navigate(`/quiz/play/${roomId}/${playerId}`);
      }, 1000);
      debugLog.success('✅ Redirecting to game...');
    };

    const handleRoomConfig = (roomConfig: any) => {
      debugLog.event('🎯 room_config received', roomConfig);
    };

    const handleRoomState = (data: any) => {
      debugLog.event('🎯 room_state received in waiting page', data);
      if (data.phase && (data.phase === 'asking' || data.phase === 'reviewing' || data.phase === 'leaderboard' || data.phase === 'tiebreaker')) {
        debugLog.info('🎮 Game detected as active - redirecting to play page');
        setTimeout(() => {
          navigate(`/quiz/play/${roomId}/${playerId}`);
        }, 500);
      }
    };

    socket.on('player_list_updated', handlePlayerListUpdated);
    socket.on('room_config', handleRoomConfig);
    socket.on('quiz_launched', handleQuizLaunched);
    socket.on('room_state', handleRoomState);

    return () => {
      socket.off('player_list_updated', handlePlayerListUpdated);
      socket.off('room_config', handleRoomConfig);
      socket.off('quiz_launched', handleQuizLaunched);
      socket.off('room_state', handleRoomState);
    };
  }, [socket, connected, playerId, navigate, roomId]);

  // 🔑 One-shot join on mount/param change - ONLY after cache is checked
  useEffect(() => {
    if (!socket || !connected || !roomId || !playerId) {
      debugLog.warning('⚠️ Missing params for joinQuizRoom');
      return;
    }
    
    // Small delay to ensure cache has been read first
    const timer = setTimeout(() => {
      joinOrRejoin();
    }, 100);
    
    return () => clearTimeout(timer);
  }, [socket, connected, roomId, playerId]);

  // Helpers
  const getExtraInfo = (extraId: string) => {
    const extra = Object.values(fundraisingExtraDefinitions).find(def => {
      const defId = def.id.toLowerCase();
      const searchKey = extraId.toLowerCase();
      return defId === searchKey || defId.includes(searchKey) || searchKey.includes(defId);
    });

    if (extra) {
      return {
        label: `${extra.icon} ${extra.label}`,
        strategy: (extra as any).playerStrategy || extra.description,
        definition: extra
      };
    }

    return { label: extraId, strategy: 'No strategy information available.', definition: null };
  };

  // Loading states
  if (!config || Object.keys(config).length === 0 || !playerData) {
    return (
      <div className="p-4 text-center sm:p-6">
        <div className="mb-4 animate-spin text-3xl sm:text-4xl">⏳</div>
        <div className="heading-2">
          {!config ? 'Loading quiz configuration...' : 'Loading player data...'}
        </div>
        {DEBUG && (
          <div className="text-fg/60 mt-4 text-xs">
            Config loaded: {!!config ? '✅' : '❌'} |
            Player data: {!!playerData ? '✅' : '❌'} |
            Player name: {playerData?.name || 'N/A'} |
            Socket: {connected ? '🟢' : '🔴'}
          </div>
        )}
      </div>
    );
  }

  const playerExtras = playerData.extras || [];
  const playerName = playerData.name || 'Player';
  const totalPlayers = allPlayers.length;

  return (
    <div className="mx-auto max-w-4xl space-y-4 p-4 sm:space-y-6">
      <div className="rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 p-4 text-white sm:p-6">
        <div className="text-center">
          <div className="mb-2 text-3xl sm:text-4xl">🎉</div>
          <h1 className="mb-2 text-xl font-bold sm:text-2xl">
            Hey {playerName.split(' ')[0]}!
          </h1>
          <p className="text-sm text-blue-100 sm:text-base">You're all set to play</p>
          <p className="mt-1 text-xs text-blue-200 sm:text-sm">Thank you for supporting this fundraiser and GOOD LUCK!</p>
        </div>

        <div className="mt-4 flex justify-around border-t border-blue-400 pt-4">
          <div className="text-center">
            {playerData.paid ? (
              <CheckCircle className="mx-auto mb-1 h-5 w-5 text-green-300 sm:h-6 sm:w-6" />
            ) : (
              <AlertCircle className="mx-auto mb-1 h-5 w-5 text-yellow-300 sm:h-6 sm:w-6" />
            )}
            <div className="text-xs sm:text-sm">{playerData.paid ? 'Paid' : 'Pending'}</div>
          </div>
          <div className="text-center">
            <Zap className="mx-auto mb-1 h-5 w-5 text-yellow-300 sm:h-6 sm:w-6" />
            <div className="text-xs sm:text-sm">{playerExtras.length} Extras</div>
          </div>
          <div className="text-center">
            <Users className="mx-auto mb-1 h-5 w-5 text-blue-300 sm:h-6 sm:w-6" />
            <div className="text-xs sm:text-sm">{totalPlayers} Players</div>
          </div>
        </div>
      </div>

      {!playerData.paid && (
        <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-4">
          <div className="flex items-center space-x-2">
            <AlertCircle className="h-5 w-5 flex-shrink-0 text-yellow-500" />
            <div className="text-sm font-semibold text-yellow-700">
              ⚠️ Payment Required — Please complete payment with the quiz organizer to participate.
            </div>
          </div>
        </div>
      )}

      {playerData.disqualified && (
        <div className="rounded-xl border border-red-200 bg-red-100 p-4">
          <div className="flex items-center space-x-2">
            <AlertCircle className="h-5 w-5 flex-shrink-0 text-red-500" />
            <div className="text-sm font-semibold text-red-700">
              🚫 You have been disqualified from this quiz.
            </div>
          </div>
        </div>
      )}

      <div className="rounded-xl border border-red-200 bg-red-50 p-4">
        <div className="text-sm font-semibold text-red-700">
          🚫 No Cheating — you will be disqualified if unfair play is detected.
        </div>
      </div>

      {playerExtras.length > 0 && (
        <div className="rounded-lg border-l-4 border-green-400 bg-green-50 p-4">
          <button onClick={() => setShowArsenal(!showArsenal)} className="flex w-full items-center justify-between text-left">
            <h3 className="flex items-center space-x-2 text-base font-bold text-green-800">
              <Zap className="h-5 w-5" />
              <span>Your Arsenal ({playerExtras.length} extras)</span>
            </h3>
            {showArsenal ? <ChevronUp className="h-5 w-5 text-green-600" /> : <ChevronDown className="h-5 w-5 text-green-600" />}
          </button>

          {showArsenal && (
            <div className="mt-3 space-y-3">
              {playerExtras.map((extraId: string, idx: number) => {
                const extraInfo = getExtraInfo(extraId);
                return (
                  <div key={idx} className="bg-muted flex items-center space-x-3 rounded-lg border border-green-200 p-3 shadow">
                    <span className="flex-shrink-0 text-2xl">{extraInfo.definition?.icon || '💰'}</span>
                    <div className="flex-1">
                      <div className="text-fg text-sm font-medium">
                        {extraInfo.definition?.label || extraId}
                      </div>
                      <div className="text-fg/70 text-xs">
                        {extraInfo.definition?.description}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
                <div className="text-xs text-blue-800">
                  <strong>⚠️ Remember:</strong> Once you use an extra, it cannot be reused. Use them wisely!
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="rounded-lg border-l-4 border-blue-400 bg-blue-50 p-4">
        <button onClick={() => setShowRounds(!showRounds)} className="flex w-full items-center justify-between text-left">
          <h3 className="flex items-center space-x-2 text-base font-bold text-blue-800">
            <Play className="h-5 w-5" />
            <span>Round Overview ({config.roundDefinitions?.length || 0} rounds)</span>
          </h3>
          {showRounds ? <ChevronUp className="h-5 w-5 text-blue-600" /> : <ChevronDown className="h-5 w-5 text-blue-600" />}
        </button>

        {showRounds && config.roundDefinitions?.length && (
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {config.roundDefinitions.map((round: any, index: number) => {
              const roundTypeDef = roundTypeDefinitions[round.roundType as RoundTypeId];
              return (
                <div key={index} className="bg-muted rounded-lg border border-blue-200 p-3">
                  <div className="text-center">
                    <div className="mb-1 text-sm font-bold text-blue-900">
                      {roundTypeDef?.icon || '🎯'} Round {round.roundNumber}
                    </div>
                    <div className="text-fg/70 mb-2 text-xs">
                      {round.category || roundTypeDef?.name || 'Unknown'}
                    </div>
                    <span className={`rounded-full px-2 py-1 text-xs font-medium ${
                      round.difficulty === 'easy' ? 'bg-green-100 text-green-700' :
                      round.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                      round.difficulty === 'hard' ? 'bg-red-100 text-red-700' :
                      'text-fg/80 bg-gray-100'
                    }`}>
                      {round.difficulty || roundTypeDef?.difficulty || 'Unknown'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {config.prizes && config.prizes.length > 0 && (
        <div className="rounded-lg border-l-4 border-yellow-400 bg-yellow-50 p-4">
          <button onClick={() => setShowPrizes(!showPrizes)} className="flex w-full items-center justify-between text-left">
            <h3 className="flex items-center space-x-2 text-base font-bold text-yellow-800">
              <Trophy className="h-5 w-5" />
              <span>Win Up To {config.currencySymbol}{config.prizes[0]?.value}!</span>
            </h3>
            {showPrizes ? <ChevronUp className="h-5 w-5 text-yellow-600" /> : <ChevronDown className="h-5 w-5 text-yellow-600" />}
          </button>

          {showPrizes && (
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {config.prizes.map((prize: any, idx: number) => (
                <div key={idx} className="bg-muted rounded-lg border p-3 shadow">
                  <div className="text-center">
                    <div className="mb-1 text-xl">
                      {idx === 0 ? '🥇' : idx === 1 ? '🥈' : '🥉'}
                    </div>
                    <div className="text-fg text-sm font-bold">{prize.place}</div>
                    <div className="text-fg/70 mb-1 text-xs">{prize.description}</div>
                    {prize.value && (
                      <div className="text-fg text-sm font-bold">
                        {config.currencySymbol}{prize.value}
                      </div>
                    )}
                    {prize.sponsor && (
                      <div className="text-fg/60 mt-1 text-xs">🎗️ Thanks to {prize.sponsor}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="rounded-lg bg-gray-50 p-4 text-center sm:p-6">
        <div className="text-fg/70 inline-flex items-center space-x-2">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600 sm:h-5 sm:w-5"></div>
          <span className="text-sm font-medium sm:text-base">Waiting for host to start the game...</span>
        </div>
        {DEBUG && (
          <div className="mt-2 text-xs text-gray-400">
            Player ID: {playerId} | Name: {playerData.name} | Socket: {connected ? '🟢 Connected' : '🔴 Disconnected'}
          </div>
        )}
      </div>
    </div>
  );
};

export default QuizGameWaitingPage;

