import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuizSocket } from '../../../sockets/QuizSocketProvider';
import { joinQuizRoom } from '../joinQuizSocket';
import { usePlayerStore } from '../usePlayerStore';
import { useQuizConfig } from '../useQuizConfig';
import { fundraisingExtraDefinitions } from '../../../constants/quizMetadata';

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
  const { players } = usePlayerStore();
  const { config } = useQuizConfig();

  debugLog.lifecycle('🚀 QuizGameWaitingPage mount');
  debugLog.data('Component params', { roomId, playerId });
  debugLog.data('Socket state', { connected, hasSocket: !!socket });
  debugLog.data('Zustand config', config);

  const foundPlayer = players.find(p => p.id === playerId);
  const name = foundPlayer?.name || 'Player';
  const extras = foundPlayer?.extras || [];

  // Join room on mount
  useEffect(() => {
    if (!socket || !connected || !roomId || !playerId) {
      debugLog.warning('⚠️ Missing params for joinQuizRoom');
      return;
    }

    const player = { id: playerId, name };
    joinQuizRoom(socket, roomId, player);
    debugLog.success('✅ joinQuizRoom emitted');
  }, [socket, connected, roomId, playerId, name]);

  // Listen for quiz start event
  useEffect(() => {
    if (!socket) return;
    const handleQuizStart = () => {
      debugLog.event('🎯 Quiz started — navigating to gameplay');
      navigate(`/quiz/play/${roomId}/${playerId}`);
    };
    socket.on('quiz_started', handleQuizStart);
   return () => { socket.off('quiz_started', handleQuizStart); };

  }, [socket, navigate, roomId, playerId]);

  // Helper for extra labels
  const getExtraLabel = (extraId: string): string => {
    const extra = fundraisingExtraDefinitions[extraId as keyof typeof fundraisingExtraDefinitions];
    return extra ? `${extra.icon} ${extra.label}` : extraId;
  };

  if (!config || Object.keys(config).length === 0) {
    return (
      <div className="p-6 text-center">
        <div className="animate-spin text-4xl mb-4">⏳</div>
        <div className="text-lg font-semibold">Loading quiz configuration...</div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-3xl mx-auto text-center space-y-8">
      <h1 className="text-3xl font-bold">🎉 Welcome, {name}!</h1>

      <div className="bg-red-50 p-4 rounded-xl border text-red-700 font-semibold">
        🚫 No Cheating — you will be disqualified if unfair play is detected.
      </div>

      {DEBUG && (
        <div className="bg-gray-100 p-4 rounded-xl border text-left text-sm">
          <h3 className="font-bold mb-2">🔧 Debug Information</h3>
          <div className="space-y-1">
            <div>Socket Connected: {connected ? '✅' : '❌'}</div>
            <div>Room ID: {roomId || 'N/A'}</div>
            <div>Player ID: {playerId || 'N/A'}</div>
            <div>Players Count: {players.length}</div>
            <div>Config Loaded: ✅</div>
            <details className="mt-2">
              <summary className="cursor-pointer font-bold">Show Config Data</summary>
              <pre className="text-xs mt-1 p-2 bg-white rounded">
                {JSON.stringify(config, null, 2)}
              </pre>
            </details>
          </div>
        </div>
      )}

      <div className="bg-yellow-50 p-4 rounded-xl border">
        <h2 className="text-xl font-semibold mb-3">🎁 Gifts for Winners</h2>
        {config.prizes?.length ? (
          <div className="space-y-3">
            {config.prizes.map((prize: any, idx: number) => (
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

      <div className="bg-blue-50 p-4 rounded-xl border">
        <h2 className="text-xl font-semibold mb-3">🎮 Gameplay</h2>
        {config.roundDefinitions?.length ? (
          <div className="space-y-2">
            {config.roundDefinitions.map((round: any, index: number) => {
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

      <div className="bg-green-50 p-4 rounded-xl border">
        <h2 className="text-xl font-semibold mb-3">💡 Your Extras</h2>
        {extras.length ? (
          <ul className="list-disc list-inside text-left space-y-1">
            {extras.map((extra: string, idx: number) => (
              <li key={idx} className="font-medium">{getExtraLabel(extra)}</li>
            ))}
          </ul>
        ) : (
          <div className="text-gray-500">You have not purchased any extras</div>
        )}
      </div>

      <div className="p-4 text-lg font-semibold text-gray-700">
        🙏 Thank you for supporting this fundraiser and GOOD LUCK!
      </div>
    </div>
  );
};

export default QuizGameWaitingPage;

