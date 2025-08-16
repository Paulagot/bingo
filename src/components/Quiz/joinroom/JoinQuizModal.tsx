import React, { useState } from 'react';
import { nanoid } from 'nanoid';
import { useNavigate } from 'react-router-dom';
import { 
  Globe, 
  Target, 
  ChevronLeft, 
  ChevronRight, 
 
  Zap,
  AlertCircle,
  CheckCircle,
  GamepadIcon,
  Plus,
  Minus
} from 'lucide-react';

import { useQuizSocket } from '../sockets/QuizSocketProvider';
import { fundraisingExtraDefinitions } from '../constants/quizMetadata';
import { roundTypeDefinitions } from '../constants/quizMetadata';
import type { FundraisingExtraDefinition } from '../constants/quizMetadata';

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
    <div 
      className={`border-2 rounded-lg p-3 sm:p-4 transition-all cursor-pointer ${
        isSelected 
          ? 'border-blue-500 bg-blue-50' 
          : `${getExcitementColor(details.excitement || 'Low')} hover:shadow-md`
      }`}
      onClick={() => onToggle(extraKey)}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2 sm:space-x-3 flex-1 min-w-0">
          <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center text-lg sm:text-xl flex-shrink-0 ${
            details.excitement === 'High' ? 'bg-red-100' :
            details.excitement === 'Medium' ? 'bg-yellow-100' : 'bg-green-100'
          }`}>
            {details.icon}
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-gray-900 text-sm sm:text-base truncate">{details.label}</h4>
            <p className="text-xs sm:text-sm text-gray-600 truncate sm:block">{details.description}</p>
            <div className="flex items-center space-x-2 mt-1">
              <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${getExcitementBadge(details.excitement || 'Low')}`}>
                {details.excitement}
              </span>
              <div className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-xs ${applicability.color}`}>
                {applicability.icon}
                <span className="hidden sm:inline">{applicability.text}</span>
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-2 flex-shrink-0">
          <div className="text-right">
            <div className="font-bold text-sm sm:text-lg text-gray-900">{currency}{price.toFixed(2)}</div>
          </div>
          {isSelected ? (
            <CheckCircle className="w-5 h-5 text-blue-500" />
          ) : (
            <Plus className="w-5 h-5 text-gray-400" />
          )}
        </div>
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
    <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50 p-2 sm:p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[95vh] sm:max-h-[90vh] overflow-hidden">
        {stage === 1 && (
          <div className="p-4 sm:p-6">
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-lg sm:text-xl">
                🎯
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Join Quiz Game</h2>
                <p className="text-sm sm:text-base text-gray-600">Enter your details to join the fun!</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Room ID</label>
                <input
                  value={roomId}
                  onChange={e => setRoomId(e.target.value)}
                  placeholder="Enter the room ID"
                  className="w-full px-3 py-2 sm:px-4 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors text-sm sm:text-base"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Your Name</label>
                <input
                  value={playerName}
                  onChange={e => setPlayerName(e.target.value)}
                  placeholder="Enter your display name"
                  className="w-full px-3 py-2 sm:px-4 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors text-sm sm:text-base"
                />
              </div>
            </div>

            {error && (
              <div className="mt-4 p-3 sm:p-4 bg-red-50 border border-red-200 rounded-lg flex items-center space-x-2">
                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                <p className="text-red-700 text-sm sm:text-base">{error}</p>
              </div>
            )}

            <div className="flex flex-col sm:flex-row justify-end space-y-3 sm:space-y-0 sm:space-x-3 mt-6 pt-6 border-t border-gray-200">
              <button 
                onClick={onClose} 
                className="px-4 py-2 sm:px-6 sm:py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors text-sm sm:text-base"
              >
                Cancel
              </button>
              <button 
                onClick={goToStep2} 
                className="px-4 py-2 sm:px-6 sm:py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors flex items-center justify-center space-x-2 text-sm sm:text-base"
              >
                <span>Continue</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {stage === 2 && roomConfig && (
          <div className="flex flex-col h-full max-h-[95vh] sm:max-h-[90vh]">
            <div className="p-4 sm:p-6 border-b border-gray-200">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gradient-to-br from-green-500 to-blue-600 flex items-center justify-center text-white text-lg sm:text-xl">
                  🚀
                </div>
                <div>
                  <h2 className="text-lg sm:text-2xl font-bold text-gray-900">Game Extras</h2>
                  <p className="text-sm sm:text-base text-gray-600">
                    Joining {roomConfig.hostName ? `${roomConfig.hostName}'s` : 'the'} {roomConfig.gameType || 'quiz'} game
                  </p>
                </div>
              </div>
            </div>

            {/* Sticky Summary - Pattern 1 */}
            <div className="sticky top-0 bg-gradient-to-r from-blue-50 to-purple-50 border-b border-blue-200 p-3 sm:p-4 z-10">
              <div className="flex justify-between items-center">
                <div>
                  <span className="text-sm text-gray-600">Total Cost</span>
                  <div className="font-medium text-sm sm:text-base">{selectedExtras.length} extras added</div>
                </div>
                <div className="text-right">
                  <div className="text-xl sm:text-2xl font-bold text-blue-900">{roomConfig.currencySymbol}{total.toFixed(2)}</div>
                  <div className="text-xs sm:text-sm text-blue-600">
                    Entry {roomConfig.currencySymbol}{roomConfig.entryFee.toFixed(2)} + Extras {roomConfig.currencySymbol}{extrasTotal.toFixed(2)}
                  </div>
                </div>
              </div>
              
              {selectedExtras.length > 0 && (
                <div className="flex flex-wrap gap-1 sm:gap-2 mt-3">
                  {selectedExtras.map(key => {
                    const extra = fundraisingExtraDefinitions[key as keyof typeof fundraisingExtraDefinitions];
                    return (
                      <span key={key} className="bg-white px-2 py-1 rounded-full text-xs sm:text-sm flex items-center space-x-1">
                        <span>{extra?.icon}</span>
                        <span className="hidden sm:inline">{extra?.label}</span>
                        <button onClick={() => toggleExtra(key)} className="text-gray-400 hover:text-red-500">
                          <Minus className="w-3 h-3" />
                        </button>
                      </span>
                    );
                  })}
                </div>
              )}
              
              {/* Join Button in Sticky Header */}
              <div className="mt-3 sm:mt-4">
                <button 
                  onClick={handleJoin} 
                  className="w-full bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white font-bold py-3 sm:py-4 px-4 sm:px-6 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center space-x-2 text-sm sm:text-base"
                >
                  <span>Join Game</span>
                  <span className="bg-white bg-opacity-20 px-2 py-1 sm:px-3 sm:py-1 rounded-full text-xs sm:text-sm">
                    {roomConfig.currencySymbol}{total.toFixed(2)}
                  </span>
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              <div className="p-3 sm:p-6">
                {/* Available Extras */}
                {availableExtras.length > 0 ? (
                  <div className="space-y-4 sm:space-y-6">
                    {/* Animated Header - Technique 1 */}
                    <div className={`transition-all duration-500 ${selectedExtras.length === 0 ? 'animate-pulse' : ''}`}>
                      <div className="flex items-center space-x-3 mb-2">
                        <div className={`w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center transition-all duration-300 ${
                          selectedExtras.length === 0 ? 'bg-gradient-to-r from-yellow-400 to-orange-500 animate-bounce' : 'bg-blue-100'
                        }`}>
                          {selectedExtras.length === 0 ? (
                            <span className="text-white text-sm sm:text-base">🔥</span>
                          ) : (
                            <Zap className="w-3 h-3 sm:w-5 sm:h-5 text-blue-600" />
                          )}
                        </div>
                        <h3 className={`text-base sm:text-lg font-semibold transition-all duration-300 ${
                          selectedExtras.length === 0 ? 'text-transparent bg-clip-text bg-gradient-to-r from-yellow-600 to-orange-600' : 'text-gray-800'
                        }`}>
                          {selectedExtras.length === 0 ? '🔥 Power-Up Your Game' : 'Power-Ups'}
                        </h3>
                        {selectedExtras.length === 0 && (
                          <div className="animate-bounce hidden sm:block">
                            <svg className="w-4 h-4 text-orange-500" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                            </svg>
                          </div>
                        )}
                      </div>
                      
                      {selectedExtras.length === 0 && (
                        <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-lg p-3 mb-4">
                          <div className="flex items-center space-x-2 text-xs sm:text-sm">
                            <span className="text-yellow-500">⭐</span>
                            <span className="text-yellow-800 font-medium">87% of winners used at least one extra!</span>
                          </div>
                        </div>
                      )}
                      
                      <p className="text-xs sm:text-sm text-gray-600 mb-4">
                        {selectedExtras.length === 0 
                          ? "Strategic extras give you a competitive edge. Most winners don't play without them!"
                          : "Choose strategic extras to boost your performance and increase your chances of winning!"
                        }
                      </p>
                    </div>
                    
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 sm:gap-4">
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
                    <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
                      <GamepadIcon className="w-6 h-6 sm:w-8 sm:h-8 text-gray-400" />
                    </div>
                    <h3 className="text-base sm:text-lg font-medium text-gray-800 mb-2">No Extras Available</h3>
                    <p className="text-sm sm:text-base text-gray-600">This game doesn't have any optional extras configured.</p>
                  </div>
                )}
              </div>
            </div>

            {error && (
              <div className="px-4 py-3 sm:px-6 sm:py-4 bg-red-50 border-t border-red-200">
                <div className="flex items-center space-x-2">
                  <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                  <p className="text-red-700 text-sm sm:text-base">{error}</p>
                </div>
              </div>
            )}

            <div className="p-3 sm:p-6 border-t border-gray-200 bg-gray-50">
              <div className="flex justify-between items-center">
                <button 
                  onClick={() => setStage(1)} 
                  className="flex items-center space-x-2 px-3 py-2 sm:px-4 sm:py-3 text-gray-600 hover:text-gray-800 transition-colors text-sm sm:text-base"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Back</span>
                </button>
                
                {/* Mobile: Show simplified total */}
                <div className="text-right sm:hidden">
                  <div className="text-lg font-bold text-gray-900">{roomConfig.currencySymbol}{total.toFixed(2)}</div>
                  <div className="text-xs text-gray-600">Total</div>
                </div>
                
                {/* Desktop: Show detailed breakdown */}
                <div className="hidden sm:block text-right">
                  <div className="text-sm text-gray-600">Ready to join?</div>
                  <div className="text-xl font-bold text-gray-900">{roomConfig.currencySymbol}{total.toFixed(2)} total</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default JoinQuizModal;



