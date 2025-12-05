// src/components/Quiz/joinroom/JoinRoomFlow.tsx
import React, { useState, useEffect, lazy, Suspense } from 'react';
import { RoomVerificationStep } from './RoomVerificationStep';
import { ExtrasSelectionStep } from './ExtrasSelectionStep';
import { DemoPaymentStep } from './DemoPaymentStep';
import { Web2PaymentStep } from './Web2PaymentStep';
import type { SupportedChain } from '../../../chains/types';
import { useQuizSocket } from '../sockets/QuizSocketProvider';
import { useQuizConfig } from '../hooks/useQuizConfig';
// import WalletDebugPanel from '../Wizard/WalletDebug';

// ✅ Lazy load Web3Provider
const Web3Provider = lazy(() => 
  import('../../../components/Web3Provider').then(m => ({ default: m.Web3Provider }))
);

// ✅ Lazy load Web3PaymentStep (it needs Web3Provider context, so load together)
const Web3PaymentStep = lazy(() => 
  import('./Web3PaymentStep').then(m => ({ default: m.Web3PaymentStep }))
);

// 🔍 central debug toggle + helper
const DEBUG = true;
const joinDebug = (...args: any[]) => {
  if (DEBUG) console.log('[JoinRoomFlow]', ...args);
};

// Loading spinner for Web3 components
const LoadingSpinner = () => (
  <div className="flex items-center justify-center p-8">
    <div className="text-center">
      <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-indigo-300 border-t-indigo-600" />
      <p className="text-indigo-700 text-sm font-medium">Loading Web3 payment...</p>
    </div>
  </div>
);

// Use consistent RoomConfig interface matching what verification returns
interface RoomConfig {
  exists: boolean;
  paymentMethod: 'web3' | 'cash' | 'revolut' | string;
  demoMode: boolean;
  entryFee: number;
  fundraisingOptions: Record<string, boolean>;
  fundraisingPrices: Record<string, number>;
  currencySymbol: string;

  // Web3 fields
  web3Chain?: string;
  evmNetwork?: string;
  solanaCluster?: string;
  stellarNetwork?: string;
  roomContractAddress?: string;
  deploymentTxHash?: string;
  web3Currency?: string;

  // Room info
  hostName?: string;
  gameType?: string;
  roundDefinitions?: Array<{ roundType: string }>;
  roomId: string;
}

type JoinStep = 'verification' | 'name-entry' | 'extras' | 'payment';
type PaymentFlow = 'demo' | 'web3' | 'web2';

// Normalize backend strings to our SupportedChain union
const normalizeChain = (value?: string | null): SupportedChain | null => {
  if (!value) return null;
  const v = value.toLowerCase();
  if (['stellar', 'xlm'].includes(v)) return 'stellar';
  if (
    ['evm', 'ethereum', 'eth', 'polygon', 'matic', 'arbitrum', 'optimism', 'base'].includes(
      v
    )
  )
    return 'evm';
  if (['solana', 'sol'].includes(v)) return 'solana';
  return null;
};

interface JoinRoomFlowProps {
  onClose: () => void;
  onChainDetected?: (chain: SupportedChain) => void;
  prefilledRoomId?: string;
}

// ✅ Core component without provider wrapper
const JoinRoomFlowCore: React.FC<JoinRoomFlowProps> = ({
  onClose,
  prefilledRoomId,
}) => {
  const { socket } = useQuizSocket();
  const { setFullConfig } = useQuizConfig();
  const [step, setStep] = useState<JoinStep>(
    prefilledRoomId ? 'name-entry' : 'verification'
  );
  const [paymentFlow, setPaymentFlow] = useState<PaymentFlow | null>(null);
  const [roomId, setRoomId] = useState(prefilledRoomId || '');
  const [playerName, setPlayerName] = useState('');
  const [roomConfig, setRoomConfig] = useState<RoomConfig | null>(null);
  const [selectedExtras, setSelectedExtras] = useState<string[]>([]);
  const [detectedChain, setDetectedChain] = useState<SupportedChain | null>(null);

  // 🔄 top-level render log
  joinDebug('render', {
    step,
    paymentFlow,
    hasRoomConfig: !!roomConfig,
    roomId,
    playerName,
    detectedChain,
    prefilledRoomId,
  });

  // Auto-verify room if roomId is prefilled
  useEffect(() => {
    if (prefilledRoomId && socket?.connected && !roomConfig) {
      joinDebug('Auto-verifying room from QR code', { prefilledRoomId });

      socket.emit('verify_quiz_room', { roomId: prefilledRoomId });

      const handleVerification = (data: any) => {
        joinDebug('Room verification response', data);
        joinDebug('verify result web3Chain:', data.web3Chain);

        if (!data.exists) {
          joinDebug('Room does NOT exist, returning to verification step');
          // Room doesn't exist, fall back to manual entry
          setStep('verification');
          return;
        }

        // ✅ SET SESSION STORAGE IMMEDIATELY BEFORE setting roomConfig
        // This ensures network config is available when Web3Provider mounts
        if (data.web3Chain === 'evm' && data.evmNetwork) {
          joinDebug('Pre-setting EVM network in sessionStorage', {
            evmNetwork: data.evmNetwork,
            roomContractAddress: data.roomContractAddress,
          });
          sessionStorage.setItem('active-evm-network', data.evmNetwork);
          if (data.roomContractAddress) {
            sessionStorage.setItem('active-room-contract', data.roomContractAddress);
          }
        }

        // Room exists, set up the config and proceed to name entry
        const normalizedConfig: RoomConfig = {
          ...data,
          currencySymbol: data.currencySymbol || '€',
          roomId: prefilledRoomId,
        };

        joinDebug('Setting roomConfig from QR verify', normalizedConfig);
        setRoomConfig(normalizedConfig);
        setFullConfig(normalizedConfig);

        const normalized = normalizeChain(data.web3Chain);
        joinDebug('normalized chain from verify:', {
          raw: data.web3Chain,
          normalized,
        });
        if (normalized) setDetectedChain(normalized);
          setFullConfig(normalizedConfig);

        let flow: PaymentFlow;
        if (data.demoMode) {
          flow = 'demo';
        } else if (data.paymentMethod === 'web3') {
          flow = 'web3';
        } else {
          flow = 'web2';
        }
        joinDebug('Auto-selected paymentFlow from verify', {
          paymentMethod: data.paymentMethod,
          demoMode: data.demoMode,
          paymentFlow: flow,
        });

        setPaymentFlow(flow);

        // Since QR already implies a ready room, skip name step if you want
        // but currently logic starts at name-entry (set by initial state)
      };

      socket.once('quiz_room_verification_result', handleVerification);

      return () => {
        socket.off('quiz_room_verification_result', handleVerification);
      };
    }
  }, [prefilledRoomId, socket?.connected, roomConfig, socket]);

  const handleRoomVerified = (config: any, roomId: string, playerName: string) => {
    joinDebug('handleRoomVerified called', { config, roomId, playerName });

    // ✅ SET SESSION STORAGE FIRST - before any state updates
    // This ensures network config is available when Web3Provider mounts
    if (config.web3Chain === 'evm' && config.evmNetwork) {
      joinDebug('Pre-setting EVM network in sessionStorage', {
        evmNetwork: config.evmNetwork,
        roomContractAddress: config.roomContractAddress,
      });
      sessionStorage.setItem('active-evm-network', config.evmNetwork);
      if (config.roomContractAddress) {
        sessionStorage.setItem('active-room-contract', config.roomContractAddress);
      }
    }

    const normalizedConfig: RoomConfig = {
      ...config,
      currencySymbol: config.currencySymbol || '€',
      roomId: roomId,
    };

    joinDebug('Setting roomConfig from manual verify', normalizedConfig);
    setRoomConfig(normalizedConfig);
    setRoomId(roomId);
    setPlayerName(playerName);

    // Handle chain detection internally (no parent callback)
    const normalized = normalizeChain(config.web3Chain);
    joinDebug('Setting detected chain', {
      raw: config.web3Chain,
      normalized,
    });
    setDetectedChain(normalized);

    let flow: PaymentFlow;
    if (config.demoMode) {
      flow = 'demo';
    } else if (config.paymentMethod === 'web3') {
      flow = 'web3';
    } else {
      flow = 'web2';
    }
    joinDebug('Selected paymentFlow from config', {
      paymentMethod: config.paymentMethod,
      demoMode: config.demoMode,
      paymentFlow: flow,
    });

    setPaymentFlow(flow);

    joinDebug('About to set step to extras');
    setStep('extras');
    joinDebug('Step set to extras (handleRoomVerified)');
  };

  const handleExtrasSelected = (extras: string[]) => {
    joinDebug('Extras selected, moving to payment step', {
      extras,
      roomId,
      playerName,
      paymentFlow,
    });
    setSelectedExtras(extras);
    setStep('payment');
  };

  const handleBackToVerification = () => {
    joinDebug('Back to verification pressed. Resetting flow.', {
      currentStep: step,
      roomId,
    });
    setStep('verification');
    setPaymentFlow(null);
    setRoomConfig(null);
    setSelectedExtras([]);
    // ✅ Clean up sessionStorage when going back
    sessionStorage.removeItem('active-evm-network');
    sessionStorage.removeItem('active-room-contract');
    setFullConfig({});
  };

  const handleBackToExtras = () => {
    joinDebug('Back to extras pressed', {
      currentStep: step,
      roomId,
      selectedExtras,
    });
    setStep('extras');
  };

  // Track step changes
  useEffect(() => {
    joinDebug('Step changed', { step });
  }, [step]);

  // Track payment flow changes
  useEffect(() => {
    joinDebug('paymentFlow changed', { paymentFlow });
  }, [paymentFlow]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-30 p-2 sm:p-4">
      <div className="bg-muted max-h-[95vh] w-full max-w-4xl overflow-hidden rounded-xl shadow-xl sm:max-h-[90vh]">
        {step === 'verification' && (
          <RoomVerificationStep onVerified={handleRoomVerified} onClose={onClose} />
        )}

        {/* <WalletDebugPanel /> */}

        {step === 'name-entry' && roomConfig && (
          <NameEntryStep
            roomId={roomId}
            roomConfig={roomConfig}
            onBack={handleBackToVerification}
            onContinue={(name) => {
              joinDebug('Name entry continue', { name, roomId });
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

            {paymentFlow === 'web3' &&
              (detectedChain ? (
                <Suspense fallback={<LoadingSpinner />}>
                  <Web3PaymentStep
                    chainOverride={detectedChain}
                    roomId={roomId}
                    playerName={playerName}
                    roomConfig={roomConfig}
                    selectedExtras={selectedExtras}
                    onBack={handleBackToExtras}
                    onClose={onClose}
                  />
                </Suspense>
              ) : (
                <div className="p-6">
                  <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
                    Detecting blockchain network… Please wait.
                  </div>
                </div>
              ))}

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
  );
};

// ✅ Wrapper component: Only wrap with Web3Provider when needed
export const JoinRoomFlow: React.FC<JoinRoomFlowProps> = (props) => {
  const [needsWeb3, setNeedsWeb3] = useState(false);

  // We need Web3Provider if:
  // 1. prefilledRoomId exists (might be web3)
  // 2. User is verifying rooms manually (might be web3)
  // So basically: always wrap it to be safe, since we don't know upfront
  // OR: We could check sessionStorage for active-evm-network
  
  // For simplicity, let's always wrap it since the overhead is minimal
  // and we avoid race conditions
  useEffect(() => {
    // Check if there's any indication this might be a web3 room
    const hasEvmNetwork = sessionStorage.getItem('active-evm-network');
    if (hasEvmNetwork || props.prefilledRoomId) {
      setNeedsWeb3(true);
    } else {
      // Default to true for safety - Web3Provider handles non-web3 gracefully
      setNeedsWeb3(true);
    }
  }, [props.prefilledRoomId]);

  joinDebug('JoinRoomFlow wrapper render', { 
    needsWeb3, 
    prefilledRoomId: props.prefilledRoomId 
  });

  // ✅ Always wrap with Web3Provider for simplicity
  // It's lightweight and handles non-web3 flows gracefully
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <Web3Provider>
        <JoinRoomFlowCore {...props} />
      </Web3Provider>
    </Suspense>
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
  onContinue,
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
          <label className="mb-2 block text-sm font-medium text-gray-700">
            Your Name
          </label>
          <input
            value={playerName}
            onChange={(e) => {
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
