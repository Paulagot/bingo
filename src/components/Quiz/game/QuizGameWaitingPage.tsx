import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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
      <div className="p-6 text-center">
        <div className="animate-spin text-4xl mb-4">⏳</div>
        <div className="text-lg font-semibold">
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

  return (
    <div className="p-6 max-w-4xl mx-auto text-center space-y-8">
      <h1 className="text-3xl font-bold">🎉 Welcome, {playerName}!</h1>

      <div className="p-4 text-lg font-semibold text-gray-700">
        🙏 Thank you for supporting this fundraiser and GOOD LUCK!
      </div>

      {/* Payment Status Warning */}
      {!playerData.paid && (
        <div className="bg-yellow-50 p-4 rounded-xl border text-yellow-700 font-semibold">
          ⚠️ Payment Required — Please complete payment with the quiz organizer to participate.
        </div>
      )}

      {/* Disqualification Warning */}
      {playerData.disqualified && (
        <div className="bg-red-100 p-4 rounded-xl border text-red-700 font-semibold">
          🚫 You have been disqualified from this quiz.
        </div>
      )}

      <div className="bg-yellow-50 p-4 rounded-xl border">
        <h2 className="text-xl font-semibold mb-3">🎁 Gifts for Winners</h2>
        {config.prizes?.length ? (
          <div className="space-y-3">
            {config.prizes.map((prize, idx: number) => (
              <div key={idx} className="bg-white p-3 rounded-lg shadow">
                <div className="font-bold">{prize.place} place: {prize.description}</div>
                {prize.value && config.currencySymbol && (
                  <div className="text-gray-600">
                    Value: {config.currencySymbol}{prize.value}
                  </div>
                )}
                {prize.sponsor && (
                  <div className="text-sm text-gray-500">
                    🎗️ Thanks to our sponsor: {prize.sponsor}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-gray-500">No gifts configured</div>
        )}
      </div>

      <div className="bg-red-50 p-4 rounded-xl border text-red-700 font-semibold">
        🚫 No Cheating — you will be disqualified if unfair play is detected.
      </div>

      <div className="bg-blue-50 p-4 rounded-xl border">
        <h2 className="text-xl font-semibold mb-3">🎮 Gameplay</h2>
        {config.roundDefinitions?.length ? (
          <div className="space-y-3">
            {config.roundDefinitions.map((round, index: number) => {
              const roundTypeDef = roundTypeDefinitions[round.roundType as RoundTypeId];
              
              const playerExtrasForThisRound = playerExtras.filter(extraId => {
                const extraDef = Object.values(fundraisingExtraDefinitions).find(def => {
                  const defId = def.id.toLowerCase();
                  const searchKey = extraId.toLowerCase();
                  return defId === searchKey || 
                         defId.includes(searchKey) ||
                         searchKey.includes(defId);
                });
                
                if (!extraDef) return false;
                
                return extraDef.applicableTo === 'global' || 
                       (Array.isArray(extraDef.applicableTo) && extraDef.applicableTo.includes(round.roundType));
              });
              
              if (!roundTypeDef) {
                return (
                  <div key={index} className="bg-white p-3 rounded-lg shadow">
                    <div className="flex justify-between">
                      <span>🎯 Round {round.roundNumber}: Unknown Round Type</span>
                      <span className="text-sm text-gray-600">Unknown</span>
                    </div>
                  </div>
                );
              }

              return (
                <div key={index} className="bg-white p-3 rounded-lg shadow space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">
                      {roundTypeDef.icon} Round {round.roundNumber}: {roundTypeDef.name}
                    </span>
                    <div className="flex items-center space-x-2">
                      {round.category && (
                        <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded-full">
                          {round.category}
                        </span>
                      )}
                      <span className={`text-sm px-2 py-1 rounded-full ${
                        round.difficulty === 'easy' ? 'bg-green-100 text-green-700' :
                        round.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                        round.difficulty === 'hard' ? 'bg-red-100 text-red-700' :
                        'bg-gray-100 text-gray-600'
                      }`}>
                        {round.difficulty || roundTypeDef.difficulty || 'Unknown'}
                      </span>
                    </div>
                  </div>
                  
                  {playerExtrasForThisRound.length > 0 && (
                    <div className="border-t border-gray-200 pt-2">
                      <div className="text-xs text-gray-600 mb-1 text-left">Your extras available in this round:</div>
                      <div className="flex flex-wrap gap-1 justify-start">
                        {playerExtrasForThisRound.map((extraId, extraIdx) => {
                          const extraInfo = getExtraInfo(extraId);
                          return (
                            <div key={extraIdx} className="inline-flex items-center space-x-1 px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs">
                              <span>{extraInfo.definition?.icon || '💰'}</span>
                              <span>{extraInfo.definition?.label || extraId}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-gray-500">No rounds configured</div>
        )}
      </div>

      <div className="bg-green-50 p-4 rounded-xl border">
        <div className="bg-orange-50 border border-orange-200 p-3 rounded-lg mb-4">
          <div className="text-sm text-orange-800">
            <strong>⚠️ Remember: Be Strategic</strong> You can only use one extra per round, so choose your moment carefully! 
            Think strategically about when each extra will have the most impact. You can use more than one extra during the leaderboard phase
          </div>
        </div>
        
        <h2 className="text-xl font-semibold mb-3">💡 Your Extras</h2>
        {playerExtras.length ? (
          <div className="space-y-4 text-left">
            {playerExtras.map((extra: string, idx: number) => {
              const extraInfo = getExtraInfo(extra);
              return (
                <div key={idx} className="bg-white p-4 rounded-lg shadow space-y-2">
                  <div className="font-bold text-lg">{extraInfo.label}</div>
                  
                  {extraInfo.definition && (
                    <>
                      <div className="text-sm text-gray-600">
                        <strong>What it does:</strong> {extraInfo.definition.description}
                      </div>
                      
                      <div className="text-sm text-blue-700 bg-blue-50 p-3 rounded-lg">
                        <strong>💡 Strategy Tip:</strong> {extraInfo.strategy}
                      </div>
                      
                      <div className="text-xs text-gray-600">
                        <strong>Can be used in:</strong>
                        {extraInfo.definition.applicableTo === 'global' ? (
                          <span className="ml-1 px-2 py-1 bg-purple-100 text-purple-700 rounded-full">
                            🌍 All rounds
                          </span>
                        ) : (
                          <div className="inline-flex flex-wrap gap-1 ml-1">
                            {extraInfo.definition.applicableTo.map((roundType: string, roundIdx: number) => {
                              const roundDef = roundTypeDefinitions[roundType as RoundTypeId];
                              return (
                                <span key={roundIdx} className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full">
                                  {roundDef?.icon} {roundDef?.name}
                                </span>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-gray-500">You have not purchased any extras</div>
        )}
      </div>
    </div>
  );
};

export default QuizGameWaitingPage;
