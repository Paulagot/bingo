// src/components/Quiz/Wizard/StepWeb3ReviewLaunch.tsx
import { FC, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuizSetupStore } from '../hooks/useQuizSetupStore';
import { useQuizConfig } from '../hooks/useQuizConfig';
import { useQuizSocket } from '../sockets/QuizSocketProvider';
import { useQuizChainIntegration } from '../../../hooks/useQuizChainIntegration';
import { useStellarWalletContext } from '../../../chains/stellar/StellarWalletProvider';
import { useQuizContract as useStellarQuizContract } from '../../../chains/stellar/useQuizContract';
// import { WalletDebugPanel } from './WalletDebug';

import { generateRoomId, generateHostId } from '../utils/idUtils';
import { roundTypeMap } from '../constants/quiztypeconstants';
import { fundraisingExtras } from '../types/quiz';
import type { WizardStepProps } from './WizardStepProps';
import type { RoundDefinition } from '../types/quiz';

import {
  ChevronLeft,
  Rocket,
 
  User,
  Calendar,
  Target,
  Trophy,
  Heart,
  Wallet,
  Clock,
  MapPin,
  CheckCircle,
   ExternalLink,
  Shield,
  Layers,
  Users,
} from 'lucide-react';


import ClearSetupButton from './ClearSetupButton';

type Web3LaunchState =
  | 'ready'
  | 'generating-ids'
  | 'connecting-wallet'
  | 'deploying-contract'
  | 'creating-room'
  | 'success'
  | 'error';

const StepWeb3ReviewLaunch: FC<WizardStepProps> = ({ onBack, onResetToFirst }) => {
  const { setupConfig, roomId, hostId, setRoomIds, clearRoomIds, hardReset } = useQuizSetupStore();
  const { setFullConfig } = useQuizConfig();
  const navigate = useNavigate();
  const { socket, connected } = useQuizSocket();

  // Web3 integration - these hooks provide the multi-chain state
  const {
    selectedChain,
    isWalletConnected,
    walletReadiness,
    currentWallet,
    getChainDisplayName,
    getFormattedAddress,
    needsWalletConnection,
  } = useQuizChainIntegration();

  // Chain-specific providers - conditionally call based on selected chain
  // This is the proper way to handle multi-chain without violating React hooks rules
  const stellarWallet = selectedChain === 'stellar' ? useStellarWalletContext() : null;
  const stellarContract = selectedChain === 'stellar' ? useStellarQuizContract() : null;
  
  // For future chains, add similar conditional calls:
  // const evmWallet = selectedChain === 'evm' ? useEvmWalletContext() : null;
  // const evmContract = selectedChain === 'evm' ? useEvmQuizContract() : null;
  // const solanaWallet = selectedChain === 'solana' ? useSolanaWalletContext() : null;
  // const solanaContract = selectedChain === 'solana' ? useSolanaQuizContract() : null;

  const [launchState, setLaunchState] = useState<Web3LaunchState>('ready');
  const [launchError, setLaunchError] = useState<string | null>(null);
  const [contractAddress, setContractAddress] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [deploymentStep, setDeploymentStep] = useState<string>('');

  useEffect(() => {
    if (!connected || !socket) return;
 const handleCreated = ({ roomId }: { roomId: string }) => {
  setLaunchState('success');

  // Clean any temp locals we may have set earlier
  try {
    localStorage.removeItem('current-room-id');
    localStorage.removeItem('current-host-id');
    localStorage.removeItem('current-contract-address');
  } catch {} // ignore

  // Nuke the entire wizard so nothing leaks into next session
  hardReset();

  // Navigate after a short UX pause
  setTimeout(() => navigate(`/quiz/host-dashboard/${roomId}`), 600);
};

    const handleError = ({ message }: { message: string }) => {
      console.error('[Socket Error]', message);
      setLaunchError(message);
      setLaunchState('error');
    };
    socket.on('quiz_room_created', handleCreated);
    socket.on('quiz_error', handleError);
    return () => {
      socket.off('quiz_room_created', handleCreated);
      socket.off('quiz_error', handleError);
    };
  }, [connected, navigate, socket]);

  // Multi-chain wallet handlers
  const handleWalletConnect = async () => {
    try {
      switch (selectedChain) {
        case 'stellar':
          if (stellarWallet) {
            await stellarWallet.connect();
          }
          break;
        case 'evm':
          // When EVM is implemented:
          // if (evmWallet) await evmWallet.connect();
          console.log('EVM wallet connection not implemented yet');
          break;
        case 'solana':
          // When Solana is implemented:
          // if (solanaWallet) await solanaWallet.connect();
          console.log('Solana wallet connection not implemented yet');
          break;
        default:
          console.error('Unsupported chain:', selectedChain);
      }
    } catch (error) {
      console.error('Wallet connection failed:', error);
    }
  };

  const handleWalletDisconnect = async () => {
    try {
      switch (selectedChain) {
        case 'stellar':
          if (stellarWallet) {
            await stellarWallet.disconnect();
          }
          break;
        case 'evm':
          // When EVM is implemented:
          // if (evmWallet) await evmWallet.disconnect();
          console.log('EVM wallet disconnection not implemented yet');
          break;
        case 'solana':
          // When Solana is implemented:
          // if (solanaWallet) await solanaWallet.disconnect();
          console.log('Solana wallet disconnection not implemented yet');
          break;
        default:
          console.error('Unsupported chain:', selectedChain);
      }
    } catch (error) {
      console.error('Wallet disconnection failed:', error);
    }
  };

  // Chain-specific deployment functions
const deployQuizContractOnStellar = async (params: any) => {
  if (!stellarWallet?.wallet.isConnected || !stellarWallet.wallet.address || !stellarContract) {
    throw new Error('Stellar wallet not connected or contract not available');
  }

  setDeploymentStep('Preparing room parameters…');

  // Common parameters
  const currency = setupConfig.web3Currency || 'XLM';
  const entryFee = setupConfig.entryFee || '1.0';
  const hostFeePct = setupConfig.web3PrizeSplit?.host || 0;
  const charityName = setupConfig.web3Charity;

  // Check prize mode to determine which contract function to call
  const prizeMode = setupConfig.prizeMode;
  
  console.log('Prize mode detected:', prizeMode);
  console.log('Setup config prizes:', setupConfig.prizes);
  console.log('Setup config prize splits:', setupConfig.prizeSplits);

  let result;

  if (prizeMode === 'assets') {
    // Asset-based room using init_asset_room
    setDeploymentStep('Creating asset-based room on blockchain…');
    
    // Convert Prize[] array to ExpectedPrize format for contract
    const expectedPrizes = (setupConfig.prizes || [])
      .filter(prize => prize.tokenAddress && prize.value && prize.value > 0)
      .map(prize => ({
        tokenAddress: prize.tokenAddress!,
        amount: prize.value!.toString() // Convert number to string for contract
      }));

    if (expectedPrizes.length === 0) {
      throw new Error('No valid prizes found for asset room. At least one prize with token address and amount is required.');
    }

    console.log('Expected prizes for contract:', expectedPrizes);

    result = await stellarContract.createAssetRoom({
      roomId: params.roomId,
      hostAddress: stellarWallet.wallet.address,
      currency,
      entryFee,
      hostFeePct,
      charityName,
      expectedPrizes
    });

    setDeploymentStep('Asset room created successfully! Host will need to deposit assets next.');
    
  } else {
    // Prize pool room using init_pool_room (default behavior)
    setDeploymentStep('Creating prize pool room on blockchain…');
    
    const prizePoolPct = setupConfig.web3PrizeSplit?.prizes || 0;

    // Map splits to first/second/third for chain client (if provided)
    const prizeSplits = setupConfig.prizeSplits
      ? {
          first: setupConfig.prizeSplits[1] || 100,
          second: setupConfig.prizeSplits[2],
          third: setupConfig.prizeSplits[3],
        }
      : { first: 100 };

    result = await stellarContract.createPoolRoom({
      roomId: params.roomId,
      hostAddress: stellarWallet.wallet.address,
      currency,
      entryFee,
      hostFeePct,
      prizePoolPct,
      charityName,
      prizeSplits,
    });

    setDeploymentStep('Prize pool room created successfully!');
  }

  return { 
    contractAddress: result.contractAddress, 
    txHash: result.txHash 
  };
};

  const deployQuizContractOnEVM = async (_params: any) => {
    setDeploymentStep('Connecting to EVM…');
    await new Promise((r) => setTimeout(r, 500));
    setDeploymentStep('Deploying contract…');
    await new Promise((r) => setTimeout(r, 1500));
    return {
      contractAddress: `0x${Math.random().toString(16).slice(2, 42)}`,
      txHash: `0x${Math.random().toString(16).slice(2, 66)}`,
    };
  };

  const deployQuizContractOnSolana = async (_params: any) => {
    setDeploymentStep('Connecting to Solana…');
    await new Promise((r) => setTimeout(r, 500));
    setDeploymentStep('Deploying program…');
    await new Promise((r) => setTimeout(r, 1500));
    return {
      contractAddress: `SOLANA_PROGRAM_${_params.roomId}`,
      txHash: `solana_sig_${Math.random().toString(36).slice(2, 16)}`,
    };
  };

  const deployWeb3Contract = async (roomId: string, hostId: string) => {
    if (!selectedChain || !currentWallet?.address) {
      throw new Error('Wallet not connected');
    }
    setLaunchState('deploying-contract');
    setDeploymentStep('Preparing contract parameters…');

    const contractParams = {
      roomId,
      hostId,
      entryFee: setupConfig.entryFee,
      currency: setupConfig.web3Currency,
      hostWallet: setupConfig.hostWallet || currentWallet.address,
      charity: setupConfig.web3Charity,
      prizeSplits: setupConfig.web3PrizeSplit || setupConfig.prizeSplits,
      maxPlayers: (setupConfig as any).maxPlayers || 100,
      hostMetadata: {
        hostName: setupConfig.hostName,
        eventDateTime: setupConfig.eventDateTime,
        totalRounds: setupConfig.roundDefinitions?.length || 0,
      },
    };

    let result;
    switch (selectedChain) {
      case 'stellar':
        setDeploymentStep('Deploying Stellar contract…');
        result = await deployQuizContractOnStellar(contractParams);
        break;
      case 'evm':
        setDeploymentStep('Deploying EVM contract…');
        result = await deployQuizContractOnEVM(contractParams);
        break;
      case 'solana':
        setDeploymentStep('Deploying Solana program…');
        result = await deployQuizContractOnSolana(contractParams);
        break;
      default:
        throw new Error(`Unsupported chain: ${selectedChain}`);
    }
    setContractAddress(result.contractAddress);
    setTxHash(result.txHash);
    setDeploymentStep('Contract deployed successfully!');
    return result;
  };

 const handleWeb3Launch = async () => {
  if (launchState !== 'ready' && launchState !== 'error') return;
  setLaunchError(null);

  // IMPORTANT: clear any prior IDs so we never re-use a failed one
  try {
    localStorage.removeItem('current-room-id');
    localStorage.removeItem('current-host-id');
    localStorage.removeItem('current-contract-address');
  } catch {} // ignore
  clearRoomIds();

  try {
    console.log('🚀 Starting Web3 launch process...');
    setLaunchState('generating-ids');

    // Always mint fresh IDs for each attempt (prevents smart-contract collisions)
    const newRoomId = generateRoomId();
    const newHostId = generateHostId();
    setRoomIds(newRoomId, newHostId);


      const contractData = await deployWeb3Contract(newRoomId, newHostId);
      console.log('✅ Contract deployed:', contractData);

      setLaunchState('creating-room');
      const web3RoomConfig = {
        ...setupConfig,
        contractAddress: contractData.contractAddress,
        deploymentTxHash: contractData.txHash,
        web3ChainConfirmed: selectedChain ?? undefined,
        hostWalletConfirmed: currentWallet?.address,
        paymentMethod: 'web3' as const,
        isWeb3Room: true,
          web3PrizeStructure: {
    firstPlace: setupConfig.prizeSplits?.[1] || 100,
    secondPlace: setupConfig.prizeSplits?.[2] || 0,
    thirdPlace: setupConfig.prizeSplits?.[3] || 0
  }
      };

      console.log('🌐 Making API call to create Web3 room...');
      const response = await fetch('/quiz/api/create-web3-room', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          config: web3RoomConfig, 
          roomId: newRoomId, 
          hostId: newHostId 
        }),
      });
      
      console.log('📡 API response status:', response.status);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('❌ API error:', errorData);
        throw new Error(errorData.error || `Server error: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('✅ API response data:', data);

  if (!data.verified || !data.contractAddress) {
  throw new Error('Room creation not verified by server');
}

// (Optional) keep these if your dashboard relies on them
try {
  localStorage.setItem('current-room-id', data.roomId);
  localStorage.setItem('current-host-id', data.hostId);
  localStorage.setItem('current-contract-address', data.contractAddress);
} catch {} // ignore

// If your dashboard needs full config immediately, keep this:
setFullConfig({
  ...web3RoomConfig,
  roomId: data.roomId,
  hostId: data.hostId,
  web3ChainConfirmed: web3RoomConfig.web3ChainConfirmed ?? undefined,
  hostWalletConfirmed: web3RoomConfig.hostWalletConfirmed ?? undefined,
});

// SUCCESS: wipe the wizard state so nothing persists
hardReset();

console.log('🎉 Web3 launch complete, navigating to dashboard...');
setLaunchState('success');

setTimeout(() => {
  navigate(`/quiz/host-dashboard/${data.roomId}`);
}, 600);

      
   } catch (err: any) {
  console.error('[Web3 Launch Error]', err);

  // Failure path: clear IDs so the next click gets brand-new ones
  try {
    localStorage.removeItem('current-room-id');
    localStorage.removeItem('current-host-id');
    localStorage.removeItem('current-contract-address');
  } catch {} // ignore
  clearRoomIds();

  setLaunchError(err?.message || 'Unknown error');
  setLaunchState('error');
}
  };

  // Derived config for review UI
  const currency = setupConfig.currencySymbol || setupConfig.web3Currency || 'USDGLO';
  const hasHostName = !!setupConfig.hostName;
  const hasRounds = !!(setupConfig.roundDefinitions && setupConfig.roundDefinitions.length > 0);
  const configComplete = hasHostName && hasRounds && !!selectedChain;

  const prizeMode: 'split' | 'assets' | undefined = setupConfig.prizeMode as any;
  const splits = setupConfig.web3PrizeSplit || undefined;
  const platformPct = 20;
  const hasPool = prizeMode === 'split' && splits && (splits.prizes ?? 0) > 0;
  const hasAssets = prizeMode === 'assets' && (setupConfig.prizes?.length ?? 0) > 0;

  // Helper: nicely format event datetime
  const formatEventDateTime = (dateTime?: string) => {
    if (!dateTime) return null;
    const date = new Date(dateTime);
    return {
      date: date.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }),
      time: date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      }),
    };
  };
  const eventDateTime = formatEventDateTime(setupConfig.eventDateTime || '');

  // Fundraising extras
  const enabledExtras = Object.entries(setupConfig.fundraisingOptions || {}).filter(([, v]) => v);
  const totalExtrasPerPlayer = enabledExtras.reduce((acc, [k]) => {
    const p = setupConfig.fundraisingPrices?.[k];
    return acc + (typeof p === 'number' ? p : 0);
  }, 0);

  // Character copy
  const getCurrentMessage = () => {
    if (launchState === 'generating-ids') {
      return { expression: 'generating', message: 'Generating unique room and host IDs…' };
    }
    if (launchState === 'deploying-contract') {
      return {
        expression: 'deploying',
        message: deploymentStep || `Deploying quiz contract on ${getChainDisplayName()}…`,
      };
    }
    if (launchState === 'creating-room') {
      return { expression: 'creating', message: 'Creating your Web3 quiz room and finalizing…' };
    }
    if (launchState === 'success') {
      return { expression: 'success', message: '🎉 Deployed! Redirecting to your host dashboard…' };
    }
    if (launchState === 'error') {
      return {
        expression: 'error',
        message: `Web3 launch failed: ${launchError}. Check wallet + network and try again.`,
      };
    }
    if (!configComplete) {
      return {
        expression: 'warning',
        message:
          "Review your config. Ensure host, rounds, and Web3 payment settings are complete. After deployment, structure can't be changed.",
      };
    }
    if (!isWalletConnected) {
      return {
        expression: 'wallet',
        message: `Connect your ${getChainDisplayName()} wallet to deploy.`,
      };
    }
    return {
      expression: 'ready',
      message: `All set! You're ready to deploy on ${getChainDisplayName()}. Review everything below, then deploy.`,
    };
  };

  const Character = ({ expression, message }: { expression: string; message: string }) => {
    const base =
      'w-16 h-16 md:w-20 md:h-20 rounded-full flex items-center justify-center text-2xl md:text-3xl transition-all duration-300';
    const style =
      expression === 'ready'
        ? 'bg-gradient-to-br from-green-400 to-emerald-500'
        : expression === 'warning'
        ? 'bg-gradient-to-br from-yellow-400 to-orange-500 animate-pulse'
        : expression === 'generating'
        ? 'bg-gradient-to-br from-cyan-400 to-blue-500 animate-pulse'
        : expression === 'deploying'
        ? 'bg-gradient-to-br from-purple-400 to-pink-500 animate-bounce'
        : expression === 'creating'
        ? 'bg-gradient-to-br from-indigo-400 to-purple-500 animate-spin'
        : expression === 'success'
        ? 'bg-gradient-to-br from-green-400 to-emerald-500 animate-bounce'
        : expression === 'error'
        ? 'bg-gradient-to-br from-red-400 to-pink-500 animate-pulse'
        : 'bg-gradient-to-br from-indigo-400 to-purple-500';
    const emoji =
      expression === 'ready'
        ? '🚀'
        : expression === 'warning'
        ? '⚠️'
        : expression === 'generating'
        ? '🆔'
        : expression === 'deploying'
        ? '⚡'
        : expression === 'creating'
        ? '🔄'
        : expression === 'success'
        ? '🎉'
        : expression === 'error'
        ? '❌'
        : '💳';
    return (
      <div className="mb-6 flex items-start space-x-3 md:space-x-4">
        <div className={`${base} ${style}`}>{emoji}</div>
        <div className="bg-muted border-border relative max-w-sm flex-1 rounded-2xl border-2 p-3 shadow-lg md:max-w-lg md:p-4">
          <div className="absolute left-0 top-6 h-0 w-0 -translate-x-2 transform border-b-8 border-r-8 border-t-8 border-b-transparent border-r-white border-t-transparent"></div>
          <div className="absolute left-0 top-6 h-0 w-0 -translate-x-1 transform border-b-8 border-r-8 border-t-8 border-b-transparent border-r-gray-200 border-t-transparent"></div>
          <p className="text-fg/80 text-sm md:text-base">{message}</p>
        </div>
      </div>
    );
  };

  // Render
  const isLaunching = launchState !== 'ready' && launchState !== 'error';
  const canLaunch = configComplete && isWalletConnected && (launchState === 'ready' || launchState === 'error');

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="heading-2">Review & Deploy</h2>
          <p className="text-fg/70 mt-0.5 text-xs md:text-sm">Final blockchain deployment check</p>
        </div>
        <ClearSetupButton
  label="Start Over"
  variant="ghost"
  size="sm"
  keepIds={false}
  flow="web3"
  onCleared={onResetToFirst}
/>
      </div>

      <Character {...getCurrentMessage()} />

      {/* IDs banner */}
      {(roomId || hostId) && (
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
          <div className="mb-2 flex items-center space-x-2">
            <CheckCircle className="h-5 w-5 text-blue-600" />
            <span className="font-medium text-blue-800">Room IDs</span>
          </div>
          <div className="space-y-1 text-sm text-blue-700">
            {roomId && (
              <p>
                <span className="font-medium">Room ID:</span>{' '}
                <code className="rounded bg-blue-100 px-2 py-1">{roomId}</code>
              </p>
            )}
            {hostId && (
              <p>
                <span className="font-medium">Host ID:</span>{' '}
                <code className="rounded bg-blue-100 px-2 py-1">{hostId}</code>
              </p>
            )}
            <p className="mt-2 text-xs text-blue-600">💡 Embedded in the smart contract for traceability.</p>
          </div>
        </div>
      )}

   

      {/* Overview: Host & Event + Template */}
      <div className="grid grid-cols-1 gap-4 md:gap-6 lg:grid-cols-2">
        <div className="bg-muted border-border rounded-xl border-2 p-4 shadow-sm md:p-6">
          <div className="mb-4 flex items-center space-x-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100 text-2xl">👤</div>
            <div className="flex-1">
              <h3 className="text-fg text-lg font-semibold">Host & Event</h3>
              <p className="text-fg/70 text-sm">Basic event information</p>
            </div>
            {hasHostName && <CheckCircle className="h-5 w-5 text-green-600" />}
          </div>

          <div className="space-y-3 text-sm">
            <div className="flex items-center space-x-3">
              <User className="text-fg/60 h-4 w-4" />
              <div>
                <p className="text-fg">{setupConfig.hostName || 'Not provided'}</p>
              </div>
            </div>
            {eventDateTime ? (
              <div className="flex items-start space-x-3">
                <Calendar className="text-fg/60 mt-1 h-4 w-4" />
                <div>
                  <p className="text-fg/80 text-xs font-medium">Scheduled</p>
                  <p className="text-fg">{eventDateTime.date}</p>
                  <div className="mt-1 flex items-center space-x-2">
                    <Clock className="h-3 w-3 text-gray-400" />
                    <span className="text-fg/70">{eventDateTime.time}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <MapPin className="h-3 w-3 text-gray-400" />
                    <span className="text-fg/60 text-xs">{setupConfig.timeZone || 'Unknown timezone'}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center space-x-3">
                <Calendar className="text-fg/60 h-4 w-4" />
                <div>
                  <p className="text-fg/80 text-xs font-medium">Event Date</p>
                  <p className="text-fg">Not scheduled</p>
                </div>
              </div>
            )}

            {(setupConfig.selectedTemplate || setupConfig.skipRoundConfiguration !== undefined) && (
              <div className="flex items-center space-x-3">
                <Layers className="text-fg/60 h-4 w-4" />
                <div>
                  <p className="text-fg/80 text-xs font-medium">Template</p>
                  <p className="text-fg">
                    {setupConfig.selectedTemplate
                      ? String(setupConfig.selectedTemplate)
                      : 'Custom'}{' '}
                    {setupConfig.skipRoundConfiguration ? '(rounds auto-configured)' : ''}
                  </p>
                </div>
              </div>
            )}

            {(setupConfig as any).maxPlayers && (
              <div className="flex items-center space-x-3">
                <Users className="text-fg/60 h-4 w-4" />
                <div>
                  <p className="text-fg/80 text-xs font-medium">Max Players</p>
                  <p className="text-fg">{(setupConfig as any).maxPlayers}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Payment & Prize model summary */}
        <div className="bg-muted border-border rounded-xl border-2 p-4 shadow-sm md:p-6">
          <div className="mb-4 flex items-center space-x-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-green-100 text-2xl">💰</div>
            <div className="flex-1">
              <h3 className="text-fg text-lg font-semibold">Web3 Payments & Prize Model</h3>
              <p className="text-fg/70 text-sm">Entry fee & distribution</p>
            </div>
            <CheckCircle className="h-5 w-5 text-green-600" />
          </div>

          <div className="space-y-3 text-sm">
            <div className="flex items-center space-x-2">
              <span className="text-fg/80">Payment Method:</span>
              <span className="text-fg font-medium">{setupConfig.paymentMethod === 'web3' ? 'Web3 Wallet' : 'Cash / Card'}</span>
            </div>

            <div className="rounded-lg border border-indigo-200 bg-indigo-50 p-3">
              <div className="mb-2 font-medium text-indigo-900">Prize Distribution (overview)</div>
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded border bg-gray-50 p-2">
                  <div className="text-xs text-fg/70">Charity</div>
                  <div className="text-fg font-semibold">{splits?.charity ?? '—'}%</div>
                </div>
                <div className="rounded border bg-gray-50 p-2">
                  <div className="text-xs text-fg/70">Personal</div>
                  <div className="text-fg font-semibold">{splits?.host ?? 0}%</div>
                </div>
                <div className="rounded border bg-gray-50 p-2">
                  <div className="text-xs text-fg/70">Prizes</div>
                  <div className="text-fg font-semibold">{splits?.prizes ?? 0}%</div>
                </div>
                <div className="rounded border bg-gray-50 p-2">
                  <div className="text-xs text-fg/70">Platform</div>
                  <div className="text-fg font-semibold">{platformPct}%</div>
                </div>
              </div>
              <div className="mt-2 text-xs text-fg/60">
                Totals reflect your selections in the Web3 prizes step.
              </div>
            </div>

            {hasPool && setupConfig.prizeSplits && (
              <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-3">
                <div className="mb-2 font-medium text-yellow-800">Prize Pool Splits</div>
                <div className="grid grid-cols-3 gap-2">
                  {Object.entries(setupConfig.prizeSplits).map(([place, pct]) => (
                    <div key={place} className="rounded border border-yellow-200 bg-white p-2 text-center">
                      <div className="font-bold text-yellow-700">{pct}%</div>
                      <div className="text-xs text-yellow-700">
                        {place === '1' ? '1st' : place === '2' ? '2nd' : place === '3' ? '3rd' : `${place}th`}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {hasAssets && (
              <div className="rounded-lg border border-green-200 bg-green-50 p-3">
                <div className="mb-2 font-medium text-green-800">External Asset Prizes</div>
                <div className="space-y-2">
                  {setupConfig.prizes!.map((prize, i) => (
                    <div key={i} className="flex items-start gap-3 rounded border border-green-200 bg-white p-2">
                      <Trophy className="h-4 w-4 text-green-700" />
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-fg">
                          {prize.place === 1 ? '1st' : prize.place === 2 ? '2nd' : prize.place === 3 ? '3rd' : `${prize.place}th`} Place
                        </div>
                        <div className="text-xs text-fg/70">{prize.description || 'No description'}</div>
                        {prize.tokenAddress && (
                          <div className="text-xs font-mono text-fg/70 break-all">{prize.tokenAddress}</div>
                        )}
                        {prize.value ? <div className="text-xs text-fg/70">Qty/ID: {prize.value}</div> : null}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quiz Structure */}
      <div className="bg-muted border-border rounded-xl border-2 p-4 shadow-sm md:p-6">
        <div className="mb-4 flex items-center space-x-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-indigo-100 text-2xl">🎯</div>
          <div className="flex-1">
            <h3 className="text-fg text-lg font-semibold">Quiz Structure</h3>
            <p className="text-fg/70 text-sm">{(setupConfig.roundDefinitions || []).length} rounds configured</p>
          </div>
          {hasRounds && <CheckCircle className="h-5 w-5 text-green-600" />}
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          {(setupConfig.roundDefinitions || []).map((round: RoundDefinition, idx: number) => (
            <div key={idx} className="border-border rounded-lg border bg-gray-50 p-3">
              <div className="mb-2 flex items-center space-x-2">
                <Target className="h-4 w-4 text-indigo-600" />
                <span className="text-fg font-medium">Round {idx + 1}</span>
              </div>
              <div className="space-y-1 text-sm">
                <p className="text-fg font-medium">{roundTypeMap[round.roundType]?.name || round.roundType}</p>
                <p className="text-fg/70">{round.config.questionsPerRound} questions</p>
                {round.category && (
                  <span className="inline-block rounded bg-blue-100 px-2 py-0.5 text-xs text-blue-700">{round.category}</span>
                )}{' '}
                {round.difficulty && (
                  <span
                    className={`inline-block rounded px-2 py-0.5 text-xs ${
                      round.difficulty === 'easy'
                        ? 'bg-green-100 text-green-700'
                        : round.difficulty === 'medium'
                        ? 'bg-yellow-100 text-yellow-700'
                        : 'bg-red-100 text-red-700'
                    }`}
                  >
                    {round.difficulty.charAt(0).toUpperCase() + round.difficulty.slice(1)}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Fundraising Extras */}
      <div className="bg-muted border-border rounded-xl border-2 p-4 shadow-sm md:p-6">
        <div className="mb-4 flex items-center space-x-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-red-100 text-2xl">❤️</div>
          <div className="flex-1">
            <h3 className="text-fg text-lg font-semibold">Fundraising Extras</h3>
            <p className="text-fg/70 text-sm">Additional fundraising options</p>
          </div>
          <CheckCircle className="h-5 w-5 text-green-600" />
        </div>

        {enabledExtras.length > 0 ? (
          <div className="space-y-2">
            {enabledExtras.map(([key]) => (
              <div
                key={key}
                className="flex items-center justify-between rounded border border-green-200 bg-green-50 p-2"
              >
                <div className="flex items-center gap-2">
                  <Heart className="h-4 w-4 text-green-600" />
                  <span className="text-sm font-medium text-green-800">{fundraisingExtras[key]?.label || key}</span>
                </div>
                <span className="text-sm font-semibold text-green-900">
                  
                  {setupConfig.fundraisingPrices?.[key] ?? '0.00'}
                  {currency}
                </span>
              </div>
            ))}
            <div className="mt-2 text-right text-xs text-fg/70">
              Total potential per player from extras: <strong>{totalExtrasPerPlayer.toFixed(2)} {currency}</strong>
            </div>
          </div>
        ) : (
          <div className="text-fg/60 py-4 text-center">
            <Heart className="mx-auto mb-2 h-8 w-8 text-gray-300" />
            <p className="text-sm">No additional fundraising options selected</p>
          </div>
        )}
      </div>

     
     {/* <WalletDebugPanel /> */}

      
            {/* Blockchain config & wallet */}
      <div className="rounded-xl border border-purple-200 bg-gradient-to-r from-purple-50 to-indigo-50 p-4">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Shield className="h-5 w-5 text-purple-600" />
            <span className="font-medium text-purple-800">Blockchain Configuration</span>
          </div>
          <div
            className={`flex items-center space-x-2 ${
              walletReadiness.status === 'ready'
                ? 'text-green-600'
                : walletReadiness.status === 'error'
                ? 'text-red-600'
                : 'text-yellow-600'
            }`}
          >
            <div
              className={`h-2 w-2 rounded-full ${
                walletReadiness.status === 'ready'
                  ? 'bg-green-500'
                  : walletReadiness.status === 'error'
                  ? 'bg-red-500'
                  : 'bg-yellow-500'
              }`}
            />
            <span className="text-sm font-medium">{walletReadiness.message}</span>
          </div>
        </div>

        <div className="mb-4 grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-purple-700">Blockchain:</span>
            <span className="ml-2 font-medium text-purple-900">{getChainDisplayName()}</span>
          </div>
          <div>
            <span className="text-purple-700">Token:</span>
            <span className="ml-2 font-medium text-purple-900">{setupConfig.web3Currency || 'USDGLO'}</span>
          </div>
          <div>
            <span className="text-purple-700">Charity:</span>
            <span className="ml-2 font-medium text-purple-900">{setupConfig.web3Charity || 'Not selected'}</span>
          </div>
          <div>
            <span className="text-purple-700">Entry Fee:</span>
            <span className="ml-2 font-medium text-purple-900">
              {setupConfig.entryFee ? `${setupConfig.entryFee} ${currency}` : 'Free'}
            </span>
          </div>
          {isWalletConnected && (
            <div className="col-span-2">
              <span className="text-purple-700">Host Wallet:</span>
              <span className="ml-2 font-mono text-purple-900 break-all">{getFormattedAddress()}</span>
            </div>
          )}
        </div>

        {/* Multi-chain wallet connection UI */}
        {selectedChain && (
          <div className="mb-3">
            {needsWalletConnection ? (
              <button
                onClick={handleWalletConnect}
                disabled={walletReadiness.status === 'connecting'}
                className="flex w-full items-center justify-center space-x-2 rounded-lg bg-purple-600 px-4 py-3 font-medium text-white hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {walletReadiness.status === 'connecting' ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    <span>Connecting {getChainDisplayName()} Wallet...</span>
                  </>
                ) : (
                  <>
                    <Wallet className="h-4 w-4" />
                    <span>Connect {getChainDisplayName()} Wallet</span>
                  </>
                )}
              </button>
            ) : (
              <div className="rounded-lg border border-green-200 bg-green-50 p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="h-2 w-2 rounded-full bg-green-500"></div>
                    <div>
                      <div className="text-sm font-medium text-green-800">
                        {getChainDisplayName()} Wallet Connected
                      </div>
                      <div className="font-mono text-xs text-green-600">
                        {getFormattedAddress()}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={handleWalletDisconnect}
                    disabled={currentWallet?.isDisconnecting}
                    className="rounded border border-red-200 px-3 py-1 text-sm text-red-600 hover:bg-red-50 hover:text-red-700 disabled:opacity-50"
                  >
                    {currentWallet?.isDisconnecting ? 'Disconnecting...' : 'Disconnect'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {contractAddress && (
          <div className="bg-muted mt-3 rounded-lg border border-purple-200 p-3">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-purple-700">Smart Contract:</span>
                <span className="font-mono text-xs text-purple-900">{contractAddress}</span>
              </div>
              {txHash && (
                <div className="flex items-center justify-between">
                  <span className="text-purple-700">Deployment Tx:</span>
                  <a
                    href="#"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center space-x-1 font-mono text-xs text-purple-900 hover:underline"
                  >
                    <span>
                      {txHash.slice(0, 8)}…{txHash.slice(-8)}
                    </span>
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="border-border flex items-center justify-between border-t pt-6">
        <button
          type="button"
          onClick={onBack}
          disabled={isLaunching}
          className={`flex items-center space-x-2 transition-colors ${
            isLaunching ? 'cursor-not-allowed text-gray-400' : 'text-fg/70 hover:text-fg'
          }`}
        >
          <ChevronLeft className="h-4 w-4" />
          <span>Back</span>
        </button>

        <div className="flex items-center gap-3">
        <ClearSetupButton
  label="Start Over"
  variant="ghost"
  size="sm"
  keepIds={false}
  flow="web3"
  onCleared={onResetToFirst}
/>
          <button
            type="button"
            onClick={handleWeb3Launch}
            className={`flex items-center space-x-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-3 text-lg font-medium text-white transition-all duration-200 md:px-8 md:py-4 ${
              !canLaunch
                ? 'cursor-not-allowed opacity-50'
                : 'transform shadow-lg hover:scale-105 hover:from-indigo-700 hover:to-purple-700 hover:shadow-xl'
            }`}
            disabled={!canLaunch}
          >
            <Rocket className="h-5 w-5" />
            <span>
              {isLaunching
                ? launchState === 'generating-ids'
                  ? 'Generating IDs…'
                  : launchState === 'deploying-contract'
                  ? 'Deploying Contract…'
                  : launchState === 'creating-room'
                  ? 'Creating Room…'
                  : 'Launching…'
                : needsWalletConnection
                ? 'Connect Wallet First'
                : 'Deploy Web3 Quiz'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default StepWeb3ReviewLaunch;