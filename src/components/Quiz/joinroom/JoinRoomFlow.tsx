// src/components/Quiz/joinroom/JoinRoomFlow.tsx
import React, { useState, useEffect } from 'react';
import { RoomVerificationStep } from './RoomVerificationStep';
import { ExtrasSelectionStep } from './ExtrasSelectionStep';
import { DemoPaymentStep } from './DemoPaymentStep';
import { Web3PaymentStep } from './Web3PaymentStep';
import { Web2PaymentStep } from './Web2PaymentStep';
import type { SupportedChain } from '../../../chains/types';
import { DynamicChainProvider } from '../../chains/DynamicChainProvider';

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
}

type JoinStep = 'verification' | 'extras' | 'payment';
type PaymentFlow = 'demo' | 'web3' | 'web2';

interface JoinRoomFlowProps {
  onClose: () => void;
  onChainDetected?: (chain: SupportedChain) => void;
}

export const JoinRoomFlow: React.FC<JoinRoomFlowProps> = ({ 
  onClose, 
  
}) => {
    const [step, setStep] = useState<JoinStep>('verification');
  const [paymentFlow, setPaymentFlow] = useState<PaymentFlow | null>(null);
  const [roomId, setRoomId] = useState('');
  const [playerName, setPlayerName] = useState('');
  const [roomConfig, setRoomConfig] = useState<RoomConfig | null>(null);
  const [selectedExtras, setSelectedExtras] = useState<string[]>([]);
  const [detectedChain, setDetectedChain] = useState<SupportedChain | null>(null)

 const handleRoomVerified = (config: any, roomId: string, playerName: string) => {
    console.log('🎯 handleRoomVerified called with:', { config, roomId, playerName });
    
    const normalizedConfig: RoomConfig = {
      ...config,
      currencySymbol: config.currencySymbol || '€'
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