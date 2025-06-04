import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuizSocket } from '../sockets/QuizSocketProvider';
import { joinQuizRoom } from '../components/Quiz/joinQuizSocket';
import { usePlayerStore } from '../components/Quiz/usePlayerStore';
import { useQuizConfig } from '../components/Quiz/useQuizConfig';
import { fundraisingExtraDefinitions } from '../constants/quizMetadata';

// Debug configuration
const DEBUG = true;

// Debug logger with emojis for this component
const debugLog = {
  info: (message: string, ...args: any[]) => { if (DEBUG) console.log(`🔵 [WaitingPage] ${message}`, ...args); },
  success: (message: string, ...args: any[]) => { if (DEBUG) console.log(`✅ [WaitingPage] ${message}`, ...args); },
  warning: (message: string, ...args: any[]) => { if (DEBUG) console.warn(`⚠️ [WaitingPage] ${message}`, ...args); },
  error: (message: string, ...args: any[]) => { if (DEBUG) console.error(`❌ [WaitingPage] ${message}`, ...args); },
  event: (message: string, ...args: any[]) => { if (DEBUG) console.log(`🎯 [WaitingPage] ${message}`, ...args); },
  data: (message: string, data: any) => { if (DEBUG) { console.group(`📦 [WaitingPage] ${message}`); console.log(data); console.groupEnd(); } },
  lifecycle: (message: string, ...args: any[]) => { if (DEBUG) console.log(`🔄 [WaitingPage] ${message}`, ...args); }
};

// Round type explainers (same as your host dashboard for consistency)
const roundTypeExplainers: Record<string, { title: string; icon: string; difficulty: string }> = {
  general_trivia: { title: "General Trivia", icon: "🧠", difficulty: "Easy" },
  speed_round: { title: "Speed Round", icon: "⚡", difficulty: "Medium" },
  fastest_finger: { title: "Fastest Finger First", icon: "👆", difficulty: "Medium" },
  wipeout: { title: "Wipeout", icon: "💀", difficulty: "Hard" },
  head_to_head: { title: "Head to Head", icon: "⚔️", difficulty: "Hard" },
  media_puzzle: { title: "Media Puzzle", icon: "🧩", difficulty: "Medium" }
};

const QuizGameWaitingPage = () => {
  const { roomId, playerId } = useParams<{ roomId: string; playerId: string }>();
  const { socket, connected } = useQuizSocket();
  const navigate = useNavigate();
  const { players, setPlayers } = usePlayerStore();
  const { config } = useQuizConfig();
  const [hydrated, setHydrated] = useState(false);
  const [hasJoined, setHasJoined] = useState(false);
  const [configRequested, setConfigRequested] = useState(false);
  const [localConfig, setLocalConfig] = useState<any>(null); // Backup config state
  const [retryCount, setRetryCount] = useState(0);

  debugLog.lifecycle('🚀 QuizGameWaitingPage component mounting');
  debugLog.data('Component params', { roomId, playerId });
  debugLog.data('Socket state', { connected, hasSocket: !!socket });
  debugLog.data('Initial config state', { config, localConfig });

  // Helper function to get extra label from ID
  const getExtraLabel = (extraId: string): string => {
    const extra = fundraisingExtraDefinitions[extraId as keyof typeof fundraisingExtraDefinitions];
    return extra ? `${extra.icon} ${extra.label}` : extraId;
  };

  // Monitor config changes for debugging
  useEffect(() => {
    debugLog.lifecycle('🔄 Config monitoring effect triggered');
    debugLog.data('Config state analysis', {
      zustandConfig: config,
      localConfig: localConfig,
      configExists: !!config,
      configKeys: config ? Object.keys(config) : [],
      configType: typeof config,
      localConfigExists: !!localConfig,
      localConfigKeys: localConfig ? Object.keys(localConfig) : []
    });
    
    if (config && Object.keys(config).length > 0) {
      debugLog.success('✅ Zustand config is available');
      setLocalConfig(config); // Sync local config
    } else if (localConfig && Object.keys(localConfig).length > 0) {
      debugLog.success('✅ Local config is available as fallback');
    } else {
      debugLog.warning('⚠️ No config available from either source');
    }
  }, [config, localConfig]);

  // Set up socket listeners for config
  useEffect(() => {
    if (!socket) return;

    const handleRoomConfig = (receivedConfig: any) => {
      debugLog.event('🎯 Received room_config directly in waiting page');
      debugLog.data('Direct config reception', {
        receivedConfig,
        hasData: !!receivedConfig,
        keys: receivedConfig ? Object.keys(receivedConfig) : [],
        type: typeof receivedConfig
      });
      
      if (receivedConfig && typeof receivedConfig === 'object') {
        setLocalConfig(receivedConfig);
        debugLog.success('✅ Local config updated from direct reception');
      } else {
        debugLog.warning('⚠️ Received invalid config structure');
      }
    };

    socket.on('room_config', handleRoomConfig);
    
    return () => {
      socket.off('room_config', handleRoomConfig);
    };
  }, [socket]);

  // Hydrate player store from server state if empty
  useEffect(() => {
    debugLog.lifecycle('🔄 Hydration effect triggered');
    debugLog.data('Effect dependencies', { 
      hasSocket: !!socket, 
      connected, 
      roomId, 
      playersLength: players.length,
      configRequested 
    });

    if (!socket || !connected || !roomId) {
      debugLog.warning('⚠️ Missing required dependencies for hydration');
      return;
    }

    if (players.length === 0 && !configRequested) {
      debugLog.info('📡 Requesting current state from server (no players found)');
      socket.emit('request_current_state', { roomId });
      setConfigRequested(true);
    } else if (players.length > 0) {
      debugLog.success('✅ Players already hydrated, setting hydrated to true');
      setHydrated(true);
    }

    const handlePlayerListUpdate = ({ players }: { players: any[] }) => {
      debugLog.event('👥 Received player_list_updated event');
      debugLog.data('Updated players list', players);
      setPlayers(players);
      setHydrated(true);
      debugLog.success('✅ Player store updated and hydrated');
    };

    socket.on('player_list_updated', handlePlayerListUpdate);
    
    return () => {
      debugLog.lifecycle('🧹 Cleaning up player_list_updated listener');
      socket.off('player_list_updated', handlePlayerListUpdate);
    };
  }, [socket, connected, roomId, players.length, setPlayers, configRequested]);

  // Config retry mechanism
  useEffect(() => {
    if (!socket || !connected || !roomId) return;
    
    const currentConfig = localConfig || config;
    
    if (!currentConfig && retryCount < 3) {
      const retryTimer = setTimeout(() => {
        debugLog.warning(`⚠️ Config still not available, retry attempt ${retryCount + 1}/3`);
        socket.emit('request_current_state', { roomId });
        setRetryCount(prev => prev + 1);
      }, 2000 * (retryCount + 1)); // Exponential backoff
      
      return () => clearTimeout(retryTimer);
    }
  }, [socket, connected, roomId, localConfig, config, retryCount]);

  // Once hydrated, emit join_quiz_room (only once)
  useEffect(() => {
    debugLog.lifecycle('🔄 Join room effect triggered');
    debugLog.data('Join effect dependencies', { 
      hasSocket: !!socket, 
      connected, 
      roomId, 
      playerId, 
      hydrated, 
      hasJoined 
    });

    if (!socket || !connected || !roomId || !playerId || !hydrated || hasJoined) {
      debugLog.warning('⚠️ Not ready to join room yet');
      return;
    }

    const foundPlayer = players.find(p => p.id === playerId);
    const name = foundPlayer?.name || `Player ${playerId}`;

    debugLog.info(`🚪 Attempting to join room as player: ${name}`);
    debugLog.data('Player details', { id: playerId, name, foundPlayer });

    const player = { id: playerId, name };
    joinQuizRoom(socket, roomId, player);
    setHasJoined(true);
    
    debugLog.success('✅ Join room request sent');
  }, [socket, connected, roomId, playerId, players, hydrated, hasJoined]);

  // Handle quiz start signal
  useEffect(() => {
    debugLog.lifecycle('🔄 Quiz start listener effect triggered');
    
    if (!socket) {
      debugLog.warning('⚠️ No socket available for quiz start listener');
      return;
    }

    const handleQuizStart = () => {
      debugLog.event('🎯 Quiz started! Navigating to play page');
      debugLog.data('Navigation details', { roomId, playerId });
      navigate(`/quiz/play/${roomId}/${playerId}`);
    };

    socket.on('quiz_started', handleQuizStart);
    debugLog.info('👂 Quiz start listener registered');
    
    return () => {
      debugLog.lifecycle('🧹 Cleaning up quiz_started listener');
      socket.off('quiz_started', handleQuizStart);
    };
  }, [socket, roomId, playerId, navigate]);

  // Prepare data for rendering
  const foundPlayer = players.find(p => p.id === playerId);
  const name = foundPlayer?.name || 'Player';
  const extras = foundPlayer?.extras || [];
  const displayConfig = localConfig || config; // Use either source

  debugLog.data('Render data preparation', {
    foundPlayer,
    name,
    extras,
    displayConfig,
    configAvailable: !!displayConfig && Object.keys(displayConfig).length > 0
  });

  return (
    <div className="p-6 max-w-3xl mx-auto text-center space-y-8">
      <h1 className="text-3xl font-bold">🎉 Welcome, {name}!</h1>

      {/* No cheating rule - moved to top */}
      <div className="bg-red-50 p-4 rounded-xl border text-red-700 font-semibold">
        🚫 No Cheating — you will be disqualified if unfair play is detected.
      </div>

      {/* Debug Info Section (only in debug mode) */}
      {DEBUG && (
        <div className="bg-gray-100 p-4 rounded-xl border text-left text-sm">
          <h3 className="font-bold mb-2">🔧 Debug Information</h3>
          <div className="space-y-1">
            <div>Socket Connected: {connected ? '✅' : '❌'}</div>
            <div>Hydrated: {hydrated ? '✅' : '❌'}</div>
            <div>Has Joined: {hasJoined ? '✅' : '❌'}</div>
            <div>Zustand Config: {config && Object.keys(config).length > 0 ? '✅' : '❌'}</div>
            <div>Local Config: {localConfig && Object.keys(localConfig).length > 0 ? '✅' : '❌'}</div>
            <div>Display Config: {displayConfig && Object.keys(displayConfig).length > 0 ? '✅' : '❌'}</div>
            <div>Players Count: {players.length}</div>
            <div>Room ID: {roomId || 'N/A'}</div>
            <div>Player ID: {playerId || 'N/A'}</div>
            <div>Retry Count: {retryCount}/3</div>
            {displayConfig && (
              <details className="mt-2">
                <summary className="cursor-pointer font-bold">Show Config Data</summary>
                <pre className="text-xs mt-1 p-2 bg-white rounded">
                  {JSON.stringify(displayConfig, null, 2)}
                </pre>
              </details>
            )}
          </div>
        </div>
      )}

      {/* Loading State */}
      {(!displayConfig || Object.keys(displayConfig).length === 0) && (
        <div className="bg-blue-50 p-6 rounded-xl border">
          <div className="animate-spin text-4xl mb-4">⏳</div>
          <div className="text-lg font-semibold">Loading quiz information...</div>
          <div className="text-sm text-gray-600 mt-2">
            Attempt {retryCount + 1}/3 - Please wait
          </div>
        </div>
      )}

      {/* Gifts / Prizes */}
      {displayConfig && (
        <div className="bg-yellow-50 p-4 rounded-xl border">
          <h2 className="text-xl font-semibold mb-3">🎁 Gifts for Winners</h2>
          {displayConfig.prizes && displayConfig.prizes.length > 0 ? (
            <div className="space-y-3">
              {displayConfig.prizes.map((prize: any, idx: number) => (
                <div key={idx} className="bg-white p-3 rounded-lg shadow">
                  <div className="font-bold">{prize.place} place: {prize.description}</div>
                  {prize.value && displayConfig.currencySymbol && (
                    <div className="text-gray-600">
                      Value: {displayConfig.currencySymbol}{prize.value}
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
      )}

      {/* Gameplay */}
      {displayConfig && (
        <div className="bg-blue-50 p-4 rounded-xl border">
          <h2 className="text-xl font-semibold mb-3">🎮 Gameplay</h2>
          {displayConfig.roundDefinitions && displayConfig.roundDefinitions.length > 0 ? (
            <div className="space-y-2">
              {displayConfig.roundDefinitions.map((round: any, index: number) => {
                const explainer = roundTypeExplainers[round.roundType];
                return (
                  <div key={index} className="flex justify-between bg-white p-3 rounded-lg shadow">
                    <span>
                      {explainer?.icon || '🎯'} Round {round.roundNumber}: {explainer?.title || round.roundType}
                    </span>
                    <span className="text-sm text-gray-600">
                      {explainer?.difficulty || 'Unknown'}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-gray-500">No rounds configured</div>
          )}
        </div>
      )}

      {/* Fundraising Extras */}
      {displayConfig && (
        <div className="bg-green-50 p-4 rounded-xl border">
          <h2 className="text-xl font-semibold mb-3">💡 Your Extras</h2>
          {extras.length > 0 ? (
            <div className="space-y-3">
              <ul className="list-disc list-inside text-left space-y-1">
                {extras.map((extra: string, idx: number) => (
                  <li key={idx} className="font-medium">{getExtraLabel(extra)}</li>
                ))}
              </ul>
              <div className="text-sm text-blue-700 bg-blue-50 p-3 rounded-lg border border-blue-200 mt-3">
                ℹ️ Extras will become active when playable. You can only use one extra per round.
              </div>
            </div>
          ) : (
            <div className="text-gray-500">You have not purchased any extras</div>
          )}
        </div>
      )}

      {/* Thank you */}
      {displayConfig && (
        <div className="p-4 text-lg font-semibold text-gray-700">
          🙏 Thank you for supporting this fundraiser and GOOD LUCK!
        </div>
      )}

      {/* Retry Button for Failed Config Load */}
      {!displayConfig && retryCount >= 3 && (
        <div className="bg-red-50 p-4 rounded-xl border">
          <div className="text-red-700 font-semibold mb-3">
            ❌ Failed to load quiz configuration
          </div>
          <button 
            onClick={() => {
              setRetryCount(0);
              setConfigRequested(false);
              if (socket && roomId) {
                socket.emit('request_current_state', { roomId });
              }
            }}
            className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700"
          >
            🔄 Try Again
          </button>
        </div>
      )}
    </div>
  );
};

export default QuizGameWaitingPage;
