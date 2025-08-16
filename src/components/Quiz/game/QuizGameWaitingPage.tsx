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

  // Debug log for round definitions
  useEffect(() => {
    if (config?.roundDefinitions) {
      console.log('Round definitions:', config.roundDefinitions);
      console.log('Sample round:', config.roundDefinitions[0]);
    }
  }, [config]);

  // Listen for server events
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

    // ✅ NEW: Handle room state updates that indicate game is in progress
    const handleRoomState = (data: any) => {
      debugLog.event('🎯 room_state received in waiting page', data);
      
      // If we receive a room state indicating the game is active, redirect
      if (data.phase && (data.phase === 'asking' || data.phase === 'reviewing' || data.phase === 'leaderboard')) {
        debugLog.info('🎮 Game detected as active - redirecting to play page');
        setTimeout(() => {
          navigate(`/quiz/play/${roomId}/${playerId}`);
        }, 500);
      }
    };

    socket.on('player_list_updated', handlePlayerListUpdated);
    socket.on('room_config', handleRoomConfig);
    socket.on('quiz_launched', handleQuizLaunched);
    socket.on('room_state', handleRoomState); // ✅ NEW

    return () => {
      socket.off('player_list_updated', handlePlayerListUpdated);
      socket.off('room_config', handleRoomConfig);
      socket.off('quiz_launched', handleQuizLaunched);
      socket.off('room_state', handleRoomState); // ✅ NEW
    };
  }, [socket, connected, playerId, navigate, roomId]);

  // ✅ UPDATED: Join room logic with reconnection support
  useEffect(() => {
    if (!socket || !connected || !roomId || !playerId || hasJoinedRef.current) {
      if (!socket || !connected || !roomId || !playerId) {
        debugLog.warning('⚠️ Missing params for joinQuizRoom');
      }
      return;
    }

    hasJoinedRef.current = true;

    const checkPlayerExists = () => {
      socket.emit('verify_quiz_room_and_player', { roomId, playerId });
      
      socket.once('quiz_room_player_verification_result', ({ roomExists, playerApproved, roomState }) => {
        if (!roomExists) {
          debugLog.error('❌ Room does not exist');
          navigate('/quiz');
          return;
        }

        if (playerApproved) {
          // ✅ Player exists, updating socket connection
          debugLog.info('🔄 Player exists, updating socket connection');
          socket.emit('join_quiz_room', {
            roomId,
            user: { id: playerId, name: 'Player' },
            role: 'player'
          });

          // ✅ NEW: Check if quiz is already in progress
          if (roomState && (roomState.phase === 'asking' || roomState.phase === 'reviewing' || roomState.phase === 'leaderboard' || roomState.phase === 'launched')) {
            debugLog.info('🎮 Quiz already in progress - redirecting to play page');
            setTimeout(() => {
              navigate(`/quiz/play/${roomId}/${playerId}`);
            }, 500);
            return;
          }

        } else {
          // ✅ IMPROVED: More specific error handling
          debugLog.warning('⚠️ Player not approved for this room');
          
          // Check if it's a mid-game reconnection issue
          socket.emit('check_player_in_active_game', { roomId, playerId });
          
          socket.once('player_active_game_status', ({ isInActiveGame }) => {
            if (isInActiveGame) {
              debugLog.info('🔄 Player found in active game - allowing reconnection');
              socket.emit('rejoin_active_game', { roomId, playerId });
              setTimeout(() => {
                navigate(`/quiz/play/${roomId}/${playerId}`);
              }, 500);
            } else {
              alert('You are not registered for this quiz. Please contact the organizer.');
              navigate('/quiz');
            }
          });
          
          return;
        }

        // ✅ Request current state after joining
        setTimeout(() => {
          socket.emit('request_current_state', { roomId });
          debugLog.success('✅ Joined room and requested current state');
        }, 100);
      });
    };

    checkPlayerExists();
  }, [socket, connected, roomId, playerId, navigate]);

  // Helper for extra labels
  const getExtraInfo = (extraId: string) => {
    const extra = Object.values(fundraisingExtraDefinitions).find(def => {
      const defId = def.id.toLowerCase();
      const searchKey = extraId.toLowerCase();
      return defId === searchKey || 
             defId.includes(searchKey) ||
             searchKey.includes(defId);
    });
    
    if (extra) {
      return {
        label: `${extra.icon} ${extra.label}`,
        strategy: (extra as any).playerStrategy || extra.description,
        definition: extra
      };
    }
    
    return {
      label: extraId,
      strategy: 'No strategy information available.',
      definition: null
    };
  };

  // Show loading state while waiting for server data
  if (!config || Object.keys(config).length === 0 || !playerData) {
    return (
      <div className="p-4 sm:p-6 text-center">
        <div className="animate-spin text-3xl sm:text-4xl mb-4">⏳</div>
        <div className="text-lg sm:text-xl font-semibold">
          {!config ? 'Loading quiz configuration...' : 'Loading player data...'}
        </div>
        {DEBUG && (
          <div className="mt-4 text-xs text-gray-500">
            Config loaded: {!!config ? '✅' : '❌'} | 
            Player data: {!!playerData ? '✅' : '❌'} | 
            Socket: {connected ? '🟢' : '🔴'}
          </div>
        )}
      </div>
    );
  }

  const playerExtras = playerData.extras || [];
  const playerName = playerData.name;
  const totalPlayers = allPlayers.length;

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-4 sm:space-y-6">
      {/* Mobile-optimized header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl p-4 sm:p-6">
        <div className="text-center">
          <div className="text-3xl sm:text-4xl mb-2">🎉</div>
          <h1 className="text-xl sm:text-2xl font-bold mb-2">
            Hey {playerName.split(' ')[0]}!
          </h1>
          <p className="text-blue-100 text-sm sm:text-base">You're all set to play</p>
          <p className="text-blue-200 text-xs sm:text-sm mt-1">Thank you for supporting this fundraiser and GOOD LUCK!</p>
        </div>
        
        {/* Status indicators */}
        <div className="flex justify-around mt-4 pt-4 border-t border-blue-400">
          <div className="text-center">
            {playerData.paid ? (
              <CheckCircle className="w-5 h-5 sm:w-6 sm:h-6 mx-auto mb-1 text-green-300" />
            ) : (
              <AlertCircle className="w-5 h-5 sm:w-6 sm:h-6 mx-auto mb-1 text-yellow-300" />
            )}
            <div className="text-xs sm:text-sm">{playerData.paid ? 'Paid' : 'Pending'}</div>
          </div>
          <div className="text-center">
            <Zap className="w-5 h-5 sm:w-6 sm:h-6 mx-auto mb-1 text-yellow-300" />
            <div className="text-xs sm:text-sm">{playerExtras.length} Extras</div>
          </div>
          <div className="text-center">
            <Users className="w-5 h-5 sm:w-6 sm:h-6 mx-auto mb-1 text-blue-300" />
            <div className="text-xs sm:text-sm">{totalPlayers} Players</div>
          </div>
        </div>
      </div>

      {/* Warning Messages */}
      {!playerData.paid && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-5 h-5 text-yellow-500 flex-shrink-0" />
            <div className="text-yellow-700 text-sm font-semibold">
              ⚠️ Payment Required — Please complete payment with the quiz organizer to participate.
            </div>
          </div>
        </div>
      )}

      {playerData.disqualified && (
        <div className="bg-red-100 border border-red-200 rounded-xl p-4">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
            <div className="text-red-700 text-sm font-semibold">
              🚫 You have been disqualified from this quiz.
            </div>
          </div>
        </div>
      )}

      {/* No Cheating Warning */}
      <div className="bg-red-50 border border-red-200 rounded-xl p-4">
        <div className="text-red-700 text-sm font-semibold">
          🚫 No Cheating — you will be disqualified if unfair play is detected.
        </div>
      </div>

      {/* Your Arsenal - Collapsible */}
      {playerExtras.length > 0 && (
        <div className="bg-green-50 border-l-4 border-green-400 rounded-lg p-4">
          <button 
            onClick={() => setShowArsenal(!showArsenal)}
            className="w-full flex items-center justify-between text-left"
          >
            <h3 className="font-bold text-green-800 flex items-center space-x-2 text-base">
              <Zap className="w-5 h-5" />
              <span>Your Arsenal ({playerExtras.length} extras)</span>
            </h3>
            {showArsenal ? (
              <ChevronUp className="w-5 h-5 text-green-600" />
            ) : (
              <ChevronDown className="w-5 h-5 text-green-600" />
            )}
          </button>
          
          {showArsenal && (
            <div className="mt-3 space-y-3">
              {playerExtras.map((extraId: string, idx: number) => {
                const extraInfo = getExtraInfo(extraId);
                return (
                  <div key={idx} className="bg-white rounded-lg p-3 border border-green-200 shadow flex items-center space-x-3">
                    <span className="text-2xl flex-shrink-0">{extraInfo.definition?.icon || '💰'}</span>
                    <div className="flex-1">
                      <div className="font-medium text-sm text-gray-900">
                        {extraInfo.definition?.label || extraId}
                      </div>
                      <div className="text-xs text-gray-600">
                        {extraInfo.definition?.description}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div className="text-xs text-blue-800">
                  <strong>⚠️ Remember:</strong> One extra per round - use wisely!
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Round Overview - Collapsible */}
      <div className="bg-blue-50 border-l-4 border-blue-400 rounded-lg p-4">
        <button 
          onClick={() => setShowRounds(!showRounds)}
          className="w-full flex items-center justify-between text-left"
        >
          <h3 className="font-bold text-blue-800 flex items-center space-x-2 text-base">
            <Play className="w-5 h-5" />
            <span>Round Overview ({config.roundDefinitions?.length || 0} rounds)</span>
          </h3>
          {showRounds ? (
            <ChevronUp className="w-5 h-5 text-blue-600" />
          ) : (
            <ChevronDown className="w-5 h-5 text-blue-600" />
          )}
        </button>
        
        {showRounds && config.roundDefinitions?.length && (
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {config.roundDefinitions.map((round: any, index: number) => {
              const roundTypeDef = roundTypeDefinitions[round.roundType as RoundTypeId];
              
              return (
                <div key={index} className="bg-white rounded-lg p-3 border border-blue-200">
                  <div className="text-center">
                    <div className="font-bold text-sm text-blue-900 mb-1">
                      {roundTypeDef?.icon || '🎯'} Round {round.roundNumber}
                    </div>
                    <div className="text-xs text-gray-600 mb-2">
                      {round.category || roundTypeDef?.name || 'Unknown'}
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      round.difficulty === 'easy' ? 'bg-green-100 text-green-700' :
                      round.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                      round.difficulty === 'hard' ? 'bg-red-100 text-red-700' :
                      'bg-gray-100 text-gray-700'
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

      {/* Prizes - Collapsible */}
      {config.prizes && config.prizes.length > 0 && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 rounded-lg p-4">
          <button 
            onClick={() => setShowPrizes(!showPrizes)}
            className="w-full flex items-center justify-between text-left"
          >
            <h3 className="font-bold text-yellow-800 flex items-center space-x-2 text-base">
              <Trophy className="w-5 h-5" />
              <span>Win Up To {config.currencySymbol}{config.prizes[0]?.value}!</span>
            </h3>
            {showPrizes ? (
              <ChevronUp className="w-5 h-5 text-yellow-600" />
            ) : (
              <ChevronDown className="w-5 h-5 text-yellow-600" />
            )}
          </button>
          
          {showPrizes && (
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {config.prizes.map((prize: any, idx: number) => (
                <div key={idx} className="bg-white rounded-lg p-3 border shadow">
                  <div className="text-center">
                    <div className="text-xl mb-1">
                      {idx === 0 ? '🥇' : idx === 1 ? '🥈' : '🥉'}
                    </div>
                    <div className="font-bold text-sm text-gray-900">{prize.place}</div>
                    <div className="text-xs text-gray-600 mb-1">{prize.description}</div>
                    {prize.value && (
                      <div className="font-bold text-sm text-gray-900">
                        {config.currencySymbol}{prize.value}
                      </div>
                    )}
                    {prize.sponsor && (
                      <div className="text-xs text-gray-500 mt-1">🎗️ Thanks to {prize.sponsor}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Waiting Message */}
      <div className="text-center bg-gray-50 rounded-lg p-4 sm:p-6">
        <div className="inline-flex items-center space-x-2 text-gray-600">
          <div className="animate-spin w-4 h-4 sm:w-5 sm:h-5 border-2 border-gray-300 border-t-blue-600 rounded-full"></div>
          <span className="font-medium text-sm sm:text-base">Waiting for host to start the game...</span>
        </div>
        {DEBUG && (
          <div className="mt-2 text-xs text-gray-400">
            Player ID: {playerId} | Socket: {connected ? '🟢 Connected' : '🔴 Disconnected'}
          </div>
        )}
      </div>
    </div>
  );
};

export default QuizGameWaitingPage;
