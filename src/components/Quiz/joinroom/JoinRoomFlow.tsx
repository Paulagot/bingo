// src/components/Quiz/joinroom/JoinRoomFlow.tsx
import React, { useState, useEffect } from 'react';
import { RoomVerificationStep } from './RoomVerificationStep';
import { ExtrasSelectionStep } from './ExtrasSelectionStep';
import { DemoPaymentStep } from './DemoPaymentStep';
import { Web3PaymentStep } from './Web3PaymentStep';
import { Web2PaymentStep } from './Web2PaymentStep';
import type { SupportedChain } from '../../../chains/types';
import { DynamicChainProvider } from '../../chains/DynamicChainProvider';
import { useQuizSocket } from '../sockets/QuizSocketProvider';

// Use consistent RoomConfig interface matching what verification returns
interface RoomConfig {
  exists: boolean;
  paymentMethod: 'web3' | 'cash' | 'revolut' | string;
  demoMode: boolean;
  entryFee: number;
  fundraisingOptions: Record<string, boolean>;
  fundraisingPrices: Record<string, number>;
  currencySymbol: string; // Make required to fix type conflict
  web3Chain?: string;
  hostName?: string;
  gameType?: string;
  roundDefinitions?: Array<{ roundType: string }>;
  roomId: string;
}

type JoinStep = 'verification' | 'name-entry' | 'extras' | 'payment';
type PaymentFlow = 'demo' | 'web3' | 'web2';

interface JoinRoomFlowProps {
  onClose: () => void;
  onChainDetected?: (chain: SupportedChain) => void;
  prefilledRoomId?: string;
}

export const JoinRoomFlow: React.FC<JoinRoomFlowProps> = ({ 
  onClose, 
  prefilledRoomId 
}) => {
  const { socket } = useQuizSocket();
  const [step, setStep] = useState<JoinStep>(prefilledRoomId ? 'name-entry' : 'verification');
  const [paymentFlow, setPaymentFlow] = useState<PaymentFlow | null>(null);
  const [roomId, setRoomId] = useState(prefilledRoomId || '');
  const [playerName, setPlayerName] = useState('');
  const [roomConfig, setRoomConfig] = useState<RoomConfig | null>(null);
  const [selectedExtras, setSelectedExtras] = useState<string[]>([]);
  const [detectedChain, setDetectedChain] = useState<SupportedChain | null>(null);

  // Auto-verify room if roomId is prefilled
  useEffect(() => {
    if (prefilledRoomId && socket?.connected && !roomConfig) {
      console.log('Auto-verifying room from QR code:', prefilledRoomId);
      
      socket.emit('verify_quiz_room', { roomId: prefilledRoomId });
      
      const handleVerification = (data: any) => {
        console.log('Room verification response:', data);
        
        if (!data.exists) {
          // Room doesn't exist, fall back to manual entry
          setStep('verification');
          return;
        }
        
        // Room exists, set up the config and proceed to name entry
        const normalizedConfig: RoomConfig = {
          ...data,
          currencySymbol: data.currencySymbol || '€',
          roomId: prefilledRoomId
        };
        
        setRoomConfig(normalizedConfig);

        if (data.web3Chain) {
          setDetectedChain(data.web3Chain as SupportedChain);
        }

        if (data.demoMode) {
          setPaymentFlow('demo');
        } else if (data.paymentMethod === 'web3') {
          setPaymentFlow('web3');
        } else {
          setPaymentFlow('web2');
        }
      };

      socket.once('quiz_room_verification_result', handleVerification);
      
      return () => {
        socket.off('quiz_room_verification_result', handleVerification);
      };
    }
  }, [prefilledRoomId, socket?.connected, roomConfig]);

  const handleRoomVerified = (config: any, roomId: string, playerName: string) => {
    console.log('🎯 handleRoomVerified called with:', { config, roomId, playerName });
    
    const normalizedConfig: RoomConfig = {
      ...config,
      currencySymbol: config.currencySymbol || '€',
      roomId: roomId 
    };
    
    setRoomConfig(normalizedConfig);
    setRoomId(roomId);
    setPlayerName(playerName);

    // Handle chain detection internally (no parent callback)
    if (config.web3Chain) {
      console.log('🎯 Setting detected chain to:', config.web3Chain);
      setDetectedChain(config.web3Chain as SupportedChain);
    }

    if (config.demoMode) {
      setPaymentFlow('demo');
    } else if (config.paymentMethod === 'web3') {
      setPaymentFlow('web3');
    } else {
      setPaymentFlow('web2');
    }
    
    console.log('🎯 About to set step to extras');
    setStep('extras');
    console.log('🎯 Step set to extras');
  };

  const handleExtrasSelected = (extras: string[]) => {
    setSelectedExtras(extras);
    setStep('payment');
  };

  const handleBackToVerification = () => {
    setStep('verification');
    setPaymentFlow(null);
    setRoomConfig(null);
    setSelectedExtras([]);
  };

  const handleBackToExtras = () => {
    setStep('extras');
  };

  // Add this useEffect to track step changes
  useEffect(() => {
    console.log('🔄 Step changed to:', step);
  }, [step]);

  // And add this to see the current state when rendering
  console.log('🎭 JoinRoomFlow render - current step:', step, 'paymentFlow:', paymentFlow, 'roomConfig exists:', !!roomConfig);
  console.log('🔗 JoinRoomFlow detectedChain:', detectedChain);
  console.log('🔗 JoinRoomFlow step:', step, 'paymentFlow:', paymentFlow);

  return (
    <DynamicChainProvider selectedChain={detectedChain}>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-30 p-2 sm:p-4">
        <div className="bg-muted max-h-[95vh] w-full max-w-4xl overflow-hidden rounded-xl shadow-xl sm:max-h-[90vh]">
          {step === 'verification' && (
            <RoomVerificationStep
              onVerified={handleRoomVerified}
              onClose={onClose}
            />
          )}
          
          {step === 'name-entry' && roomConfig && (
            <NameEntryStep
              roomId={roomId}
              roomConfig={roomConfig}
              onBack={handleBackToVerification}
              onContinue={(name) => {
                setPlayerName(name);
                setStep('extras');
              }}
            />
          )}
          
          {step === 'extras' && roomConfig && (
            <ExtrasSelectionStep
              roomId={roomId}
              playerName={playerName}
              roomConfig={roomConfig}
              onBack={handleBackToVerification}
              onContinue={handleExtrasSelected}
            />
          )}
          
          {step === 'payment' && roomConfig && (
            <>
              {paymentFlow === 'demo' && (
                <DemoPaymentStep
                  roomId={roomId}
                  playerName={playerName}
                  roomConfig={roomConfig}
                  selectedExtras={selectedExtras}
                  onBack={handleBackToExtras}
                  onClose={onClose}
                />
              )}
              
              {paymentFlow === 'web3' && (
                <Web3PaymentStep
                  roomId={roomId}
                  playerName={playerName}
                  roomConfig={roomConfig}
                  selectedExtras={selectedExtras}
                  onBack={handleBackToExtras}
                  onClose={onClose}
                />
              )}
              
              {paymentFlow === 'web2' && (
                <Web2PaymentStep
                  roomId={roomId}
                  playerName={playerName}
                  roomConfig={roomConfig}
                  selectedExtras={selectedExtras}
                  onBack={handleBackToExtras}
                  onClose={onClose}
                />
              )}
            </>
          )}
        </div>
      </div>
    </DynamicChainProvider>
  );
};

interface NameEntryStepProps {
  roomId: string;
  roomConfig: RoomConfig;
  onBack: () => void;
  onContinue: (name: string) => void;
}

const NameEntryStep: React.FC<NameEntryStepProps> = ({
  roomId,
  roomConfig,
  onBack,
  onContinue
}) => {
  const [playerName, setPlayerName] = useState('');
  const [error, setError] = useState('');

  const handleContinue = () => {
    if (!playerName.trim()) {
      setError('Please enter your name.');
      return;
    }
    onContinue(playerName.trim());
  };

  return (
    <div className="p-4 sm:p-6">
      <div className="mb-6 flex items-center space-x-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-lg text-white sm:h-12 sm:w-12 sm:text-xl">
          🎯
        </div>
        <div>
          <h2 className="text-xl font-bold sm:text-2xl">
            Joining {roomConfig.hostName ? `${roomConfig.hostName}'s` : 'the'} Game
          </h2>
          <p className="text-gray-600 text-sm sm:text-base">
            Room {roomId} • Just enter your name to continue!
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">Your Name</label>
          <input
            value={playerName}
            onChange={e => {
              setPlayerName(e.target.value);
              setError('');
            }}
            placeholder="Enter your display name"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm transition-colors focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 sm:px-4 sm:py-3 sm:text-base"
            autoFocus
          />
        </div>
      </div>

      {error && (
        <div className="mt-4 flex items-center space-x-2 rounded-lg border border-red-200 bg-red-50 p-3 sm:p-4">
          <span className="h-5 w-5 flex-shrink-0 text-red-500">⚠️</span>
          <p className="text-sm text-red-700 sm:text-base">{error}</p>
        </div>
      )}

      <div className="mt-6 flex flex-col justify-end space-y-3 border-t border-gray-200 pt-6 sm:flex-row sm:space-x-3 sm:space-y-0">
        <button 
          onClick={onBack}
          className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-200 sm:px-6 sm:py-3 sm:text-base"
        >
          Back
        </button>
        <button 
          onClick={handleContinue}
          className="flex items-center justify-center space-x-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700 sm:px-6 sm:py-3 sm:text-base"
        >
          <span>Continue to Extras</span>
          <span>→</span>
        </button>
      </div>
    </div>
  );
};