// src/components/Quiz/joinroom/DemoPaymentStep.tsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { nanoid } from 'nanoid';
import { ChevronLeft, CheckCircle } from 'lucide-react';
import { useQuizSocket } from '../sockets/QuizSocketProvider';

interface RoomConfig {
  exists: boolean;
  paymentMethod: 'web3' | 'cash' | 'revolut' | string;
  demoMode: boolean;
  entryFee: number;
  fundraisingOptions: Record<string, boolean>;
  fundraisingPrices: Record<string, number>;
  currencySymbol: string;
  web3Chain?: string;
  hostName?: string;
  gameType?: string;
  roundDefinitions?: Array<{ roundType: string }>;
}

interface DemoPaymentStepProps {
  roomId: string;
  playerName: string;
  roomConfig: RoomConfig;
  selectedExtras: string[];
  onBack: () => void;
  onClose: () => void;
}

export const DemoPaymentStep: React.FC<DemoPaymentStepProps> = ({
  roomId,
  playerName,
  roomConfig,
  selectedExtras,
  onBack,
  onClose
}) => {
  const { socket } = useQuizSocket();
  const navigate = useNavigate();

  // Calculate totals for display
  const extrasTotal = selectedExtras.reduce((sum, extraId) => {
    return sum + (roomConfig.fundraisingPrices[extraId] || 0);
  }, 0);
  const totalAmount = roomConfig.entryFee + extrasTotal;

  const handleDemoJoin = () => {
    const playerId = nanoid();
    
    // Demo mode - join immediately without payment verification
    socket?.emit('join_quiz_room', {
      roomId,
      user: {
        id: playerId,
        name: playerName,
        paid: true, // Demo mode automatically marks as paid
        paymentMethod: 'demo',
        extras: selectedExtras,
        extraPayments: Object.fromEntries(
          selectedExtras.map(key => [key, { 
            method: 'demo', 
            amount: roomConfig.fundraisingPrices[key] || 0
          }])
        )
      },
      role: 'player'
    });
    
    localStorage.setItem(`quizPlayerId:${roomId}`, playerId);
    navigate(`/quiz/game/${roomId}/${playerId}`);
    onClose();
  };

  return (
    <div className="p-4 sm:p-6">
      <div className="mb-6 flex items-center space-x-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-green-500 to-blue-600 text-lg text-white sm:h-12 sm:w-12 sm:text-xl">
          🎮
        </div>
        <div>
          <h2 className="text-fg text-xl font-bold sm:text-2xl">Demo Mode</h2>
          <p className="text-fg/70 text-sm sm:text-base">
            Join {roomConfig.hostName ? `${roomConfig.hostName}'s` : 'the'} demo quiz
          </p>
        </div>
      </div>

      {/* Payment Summary */}
      <div className="rounded-lg border border-green-200 bg-green-50 p-4 mb-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-fg font-medium">Demo Cost (Free)</div>
            <div className="text-fg/70 text-sm">
              Entry: {roomConfig.currencySymbol}{roomConfig.entryFee.toFixed(2)}
              {extrasTotal > 0 && ` + Extras: ${roomConfig.currencySymbol}${extrasTotal.toFixed(2)}`}
            </div>
          </div>
          <div className="text-xl font-bold text-green-900">
            {roomConfig.currencySymbol}{totalAmount.toFixed(2)}
          </div>
        </div>
      </div>

      <div className="rounded-lg border-2 border-green-200 bg-green-50 p-4 mb-4">
        <div className="flex items-center space-x-3">
          <CheckCircle className="h-6 w-6 text-green-600" />
          <div>
            <h3 className="text-green-800 font-semibold">Free Demo Access</h3>
            <p className="text-green-700 text-sm">
              This is a demo room - no payment required! You can join immediately.
            </p>
          </div>
        </div>
      </div>

      {/* Selected Extras Display */}
      {selectedExtras.length > 0 && (
        <div className="rounded-lg bg-blue-50 border border-blue-200 p-4 mb-4">
          <h3 className="text-blue-800 font-medium mb-2">Selected Extras (Demo Only)</h3>
          <div className="space-y-1">
            {selectedExtras.map(extraId => (
              <div key={extraId} className="flex justify-between text-sm">
                <span className="text-blue-700">{extraId}</span>
                <span className="text-blue-700 font-medium">
                  {roomConfig.currencySymbol}{(roomConfig.fundraisingPrices[extraId] || 0).toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-6 rounded-lg bg-gray-50 p-4">
        <h3 className="text-fg font-medium mb-2">Demo Limitations:</h3>
        <ul className="text-fg/70 text-sm space-y-1">
          <li>• No prize winnings (this is just for testing)</li>
          <li>• Extras are simulated (no actual payments)</li>
          <li>• No payment processing</li>
        </ul>
      </div>

      <div className="border-border mt-6 flex flex-col justify-end space-y-3 border-t pt-6 sm:flex-row sm:space-x-3 sm:space-y-0">
        <button 
          onClick={onBack}
          className="text-fg/80 flex items-center justify-center space-x-2 rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium transition-colors hover:bg-gray-200 sm:px-6 sm:py-3 sm:text-base"
        >
          <ChevronLeft className="h-4 w-4" />
          <span>Back</span>
        </button>
        <button 
          onClick={handleDemoJoin}
          className="flex items-center justify-center space-x-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-green-700 sm:px-6 sm:py-3 sm:text-base"
        >
          <span>Join Demo Game</span>
          <CheckCircle className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};



