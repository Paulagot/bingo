import React, { useState } from 'react';
import { nanoid } from 'nanoid';
import { useNavigate } from 'react-router-dom';
import { 
  Globe, 
  Target, 
  ChevronLeft, 
  ChevronRight, 
  TrendingUp, 
  Info,
  Zap,
  AlertCircle,
  CheckCircle,
  GamepadIcon
} from 'lucide-react';

import { useQuizSocket } from '../../../sockets/QuizSocketProvider';
import { fundraisingExtraDefinitions } from '../../../constants/quizMetadata';
import { roundTypeDefinitions } from '../../../constants/quizMetadata';
import type { FundraisingExtraDefinition } from '../../../constants/quizMetadata';

interface RoomConfig {
  entryFee: number;
  fundraisingOptions: Record<string, boolean>;
  fundraisingPrices: Record<string, number>;
  paymentMethod: string;
  demoMode: boolean;
  currencySymbol: string;
  roundDefinitions?: Array<{ roundType: string }>;
  hostName?: string;
  gameType?: string;
}

interface ExtraCardProps {
  extraKey: string;
  details: FundraisingExtraDefinition;
  price: number;
  currency: string;
  isSelected: boolean;
  onToggle: (key: string) => void;
  applicableRounds: string[];
}

const ExtraCard: React.FC<ExtraCardProps> = ({ 
  extraKey, 
  details, 
  price, 
  currency, 
  isSelected, 
  onToggle,
  applicableRounds 
}) => {
  const [showDetails, setShowDetails] = useState(false);

  const getExcitementColor = (excitement: string) => {
    switch (excitement) {
      case 'High': return 'border-red-300 bg-red-50';
      case 'Medium': return 'border-yellow-300 bg-yellow-50';
      case 'Low': return 'border-green-300 bg-green-50';
      default: return 'border-gray-300 bg-gray-50';
    }
  };

  const getExcitementBadge = (excitement: string) => {
    switch (excitement) {
      case 'High': return 'bg-red-100 text-red-700';
      case 'Medium': return 'bg-yellow-100 text-yellow-700';
      case 'Low': return 'bg-green-100 text-green-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getApplicabilityInfo = () => {
    if (details.applicableTo === 'global') {
      return { text: 'All Rounds', icon: <Globe className="w-3 h-3" />, color: 'text-purple-600 bg-purple-100' };
    }
    return { 
      text: applicableRounds.join(', '), 
      icon: <Target className="w-3 h-3" />, 
      color: 'text-blue-600 bg-blue-100' 
    };
  };

  const applicability = getApplicabilityInfo();

  return (
    <div className={`relative border-2 rounded-xl transition-all duration-200 ${
      isSelected 
        ? 'border-indigo-500 bg-indigo-50 shadow-md' 
        : `${getExcitementColor(details.excitement || 'Low')} hover:shadow-md`
    }`}>
      <div className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center space-x-3 flex-1 min-w-0">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-xl flex-shrink-0 ${
              details.excitement === 'High' ? 'bg-red-100' :
              details.excitement === 'Medium' ? 'bg-yellow-100' : 'bg-green-100'
            }`}>
              {details.icon}
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-semibold text-gray-900 text-base truncate">{details.label}</h4>
              <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium mt-1 ${getExcitementBadge(details.excitement || 'Low')}`}>
                {details.excitement} Impact
              </span>
            </div>
          </div>
          <div className="flex items-center space-x-2 flex-shrink-0">
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="p-1 hover:bg-gray-100 rounded-full transition-colors"
              title="More details"
            >
              <Info className="w-4 h-4 text-gray-400" />
            </button>
            <div className="text-right">
              <div className="font-bold text-lg text-gray-900">{currency}{price.toFixed(2)}</div>
            </div>
          </div>
        </div>

        {/* Description */}
        <p className="text-sm text-gray-700 mb-3 leading-relaxed">{details.description}</p>

        {/* Applicability */}
        <div className="mb-3">
          <div className={`inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs ${applicability.color}`}>
            {applicability.icon}
            <span>{applicability.text}</span>
          </div>
        </div>

        {/* Player Strategy - Expandable */}
        {showDetails && details.playerStrategy && (
          <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center space-x-2 mb-2">
              <GamepadIcon className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-800">Strategy Guide</span>
            </div>
            <p className="text-xs text-blue-700 leading-relaxed">{details.playerStrategy}</p>
          </div>
        )}

        {/* Special Properties */}
        {((details as any).totalRestorePoints || (details as any).pointsToRob) && (
          <div className="mb-3">
            <div className="flex flex-wrap gap-1">
              {(details as any).totalRestorePoints && (
                <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                  Restore up to {(details as any).totalRestorePoints} points
                </span>
              )}
              {(details as any).pointsToRob && (
                <span className="px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-medium">
                  Steal {(details as any).pointsToRob} points
                </span>
              )}
            </div>
          </div>
        )}

        {/* Toggle Button */}
        <button
          onClick={() => onToggle(extraKey)}
          className={`w-full py-3 px-4 rounded-lg font-medium transition-all duration-200 shadow-sm hover:shadow-md active:scale-[0.98] flex items-center justify-center space-x-2 ${
            isSelected
              ? 'bg-indigo-600 hover:bg-indigo-700 text-white'
              : 'bg-white hover:bg-gray-50 text-gray-700 border border-gray-300'
          }`}
        >
          {isSelected ? (
            <>
              <CheckCircle className="w-4 h-4" />
              <span>Added</span>
            </>
          ) : (
            <>
              <Zap className="w-4 h-4" />
              <span>Add Extra</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};

const JoinQuizModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { socket, connected } = useQuizSocket();
  const navigate = useNavigate();

  // modal stage
  const [stage, setStage] = useState<1 | 2>(1);

  // form state
  const [roomId, setRoomId] = useState('');
  const [playerName, setPlayerName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // extras state
  const [selectedExtras, setSelectedExtras] = useState<string[]>([]);

  // room config fetched at step 1
  const [roomConfig, setRoomConfig] = useState<RoomConfig | null>(null);

  // calculate totals
  const extrasTotal = roomConfig
    ? selectedExtras.reduce((sum, key) => sum + (roomConfig.fundraisingPrices[key] || 0), 0)
    : 0;
  const total = roomConfig ? roomConfig.entryFee + extrasTotal : 0;

  // Get available extras based on room config
  const getAvailableExtras = () => {
    if (!roomConfig) return [];
    
    return Object.entries(roomConfig.fundraisingOptions)
      .filter(([_, enabled]) => enabled)
      .map(([key]) => key)
      .filter(key => key in fundraisingExtraDefinitions);
  };

  // Get applicable round names for an extra
  const getApplicableRounds = (extraKey: string) => {
    const definition = fundraisingExtraDefinitions[extraKey as keyof typeof fundraisingExtraDefinitions];
    if (!definition || !roomConfig?.roundDefinitions) return [];

    if (definition.applicableTo === 'global') {
      return ['All Rounds'];
    }

    const roundTypes = roomConfig.roundDefinitions.map(r => r.roundType);
    return definition.applicableTo
      .filter(roundType => roundTypes.includes(roundType))
      .map(roundType => roundTypeDefinitions[roundType as keyof typeof roundTypeDefinitions]?.name || roundType);
  };

  const toggleExtra = (key: string) => {
    setSelectedExtras(prev =>
      prev.includes(key) ? prev.filter(e => e !== key) : [...prev, key]
    );
  };

  // transition to step 2: fetch config from server
  const goToStep2 = () => {
    if (!roomId.trim() || !playerName.trim()) {
      setError('Please enter both Room ID and your name.');
      return;
    }
    setError('');
    setLoading(true);

    socket?.emit('verify_quiz_room', { roomId });
    socket?.once('quiz_room_verification_result', (data: any) => {
      setLoading(false);
      if (!data.exists) {
        setError('Room not found.');
        return;
      }
      // populate local config
      setRoomConfig({
        entryFee: data.entryFee,
        fundraisingOptions: data.fundraisingOptions,
        fundraisingPrices: data.fundraisingPrices,
        paymentMethod: data.paymentMethod,
        demoMode: data.demoMode,
        currencySymbol: data.currencySymbol || '€',
        roundDefinitions: data.roundDefinitions,
        hostName: data.hostName,
        gameType: data.gameType
      });
      setStage(2);
    });
  };

  // send join payload
  const handleJoin = () => {
    if (!socket || !connected || !roomConfig) {
      setError('Socket not ready or missing room config.');
      return;
    }
    setError('');
    const playerId = nanoid();
    socket.emit('join_quiz_room', {
      roomId,
      user: {
        id: playerId,
        name: playerName.trim(),
        paid: false, // overridden by demoMode
        paymentMethod: 'other',
        extras: selectedExtras,
        extraPayments: Object.fromEntries(
          selectedExtras.map(key => [key, { method: 'other', amount: roomConfig.fundraisingPrices[key] }])
        )
      },
      role: 'player'
    });
    localStorage.setItem(`quizPlayerId:${roomId}`, playerId);
    navigate(`/quiz/game/${roomId}/${playerId}`);
    onClose();
  };

  // loading state
  if (loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-30 z-50">
        <div className="bg-white p-6 rounded-xl shadow-lg flex items-center space-x-3">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-indigo-600"></div>
          <span className="text-gray-700">Loading room info…</span>
        </div>
      </div>
    );
  }

  const availableExtras = getAvailableExtras();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {stage === 1 && (
          <div className="p-6">
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-xl">
                🎯
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Join Quiz Game</h2>
                <p className="text-gray-600">Enter your details to join the fun!</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Room ID</label>
                <input
                  value={roomId}
                  onChange={e => setRoomId(e.target.value)}
                  placeholder="Enter the room ID"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Your Name</label>
                <input
                  value={playerName}
                  onChange={e => setPlayerName(e.target.value)}
                  placeholder="Enter your display name"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                />
              </div>
            </div>

            {error && (
              <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center space-x-2">
                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                <p className="text-red-700">{error}</p>
              </div>
            )}

            <div className="flex justify-end space-x-3 mt-6 pt-6 border-t border-gray-200">
              <button 
                onClick={onClose} 
                className="px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={goToStep2} 
                className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors flex items-center space-x-2"
              >
                <span>Continue</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {stage === 2 && roomConfig && (
          <div className="flex flex-col h-full max-h-[90vh]">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-500 to-blue-600 flex items-center justify-center text-white text-xl">
                    🚀
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">Game Extras & Payment</h2>
                    <p className="text-gray-600">
                      Joining {roomConfig.hostName ? `${roomConfig.hostName}'s` : 'the'} {roomConfig.gameType || 'quiz'} game
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-gray-600">Entry Fee</div>
                  <div className="text-2xl font-bold text-gray-900">
                    {roomConfig.currencySymbol}{roomConfig.entryFee.toFixed(2)}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              <div className="p-6">
                {/* Summary Card */}
                <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 rounded-xl p-4 mb-6">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      <TrendingUp className="w-5 h-5 text-indigo-600" />
                      <span className="font-semibold text-indigo-800">Your Order Summary</span>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-indigo-900">
                        {roomConfig.currencySymbol}{total.toFixed(2)}
                      </div>
                      <div className="text-sm text-indigo-600">
                        {selectedExtras.length} extra{selectedExtras.length !== 1 ? 's' : ''} selected
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-indigo-700">Entry Fee:</span>
                      <span className="float-right font-medium">{roomConfig.currencySymbol}{roomConfig.entryFee.toFixed(2)}</span>
                    </div>
                    <div>
                      <span className="text-indigo-700">Extras:</span>
                      <span className="float-right font-medium">{roomConfig.currencySymbol}{extrasTotal.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                {/* Available Extras */}
                {availableExtras.length > 0 ? (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-800 mb-2">Power-Up Your Game</h3>
                      <p className="text-sm text-gray-600 mb-4">
                        Choose strategic extras to boost your performance and increase your chances of winning!
                      </p>
                    </div>
                    
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      {availableExtras.map((key) => {
                        const definition = fundraisingExtraDefinitions[key as keyof typeof fundraisingExtraDefinitions];
                        const price = roomConfig.fundraisingPrices[key] || 0;
                        const applicableRounds = getApplicableRounds(key);
                        
                        return (
                          <ExtraCard
                            key={key}
                            extraKey={key}
                            details={definition}
                            price={price}
                            currency={roomConfig.currencySymbol}
                            isSelected={selectedExtras.includes(key)}
                            onToggle={toggleExtra}
                            applicableRounds={applicableRounds}
                          />
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
                      <GamepadIcon className="w-8 h-8 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-800 mb-2">No Extras Available</h3>
                    <p className="text-gray-600">This game doesn't have any optional extras configured.</p>
                  </div>
                )}
              </div>
            </div>

            {error && (
              <div className="px-6 py-4 bg-red-50 border-t border-red-200">
                <div className="flex items-center space-x-2">
                  <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                  <p className="text-red-700">{error}</p>
                </div>
              </div>
            )}

            <div className="p-6 border-t border-gray-200 bg-gray-50">
              <div className="flex justify-between items-center">
                <button 
                  onClick={() => setStage(1)} 
                  className="flex items-center space-x-2 px-4 py-3 text-gray-600 hover:text-gray-800 transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Back</span>
                </button>
                <button 
                  onClick={handleJoin} 
                  className="flex items-center space-x-2 px-8 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors shadow-md hover:shadow-lg"
                >
                  <span>Join Game</span>
                  <span className="bg-green-500 px-2 py-1 rounded text-sm">
                    {roomConfig.currencySymbol}{total.toFixed(2)}
                  </span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default JoinQuizModal;



