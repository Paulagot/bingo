/**
 * Web3 Review & Launch Step
 *
 * Final step in the Web3 quiz wizard that allows users to review their configuration
 * and deploy the quiz room on the selected blockchain. This component orchestrates
 * the entire deployment flow including contract deployment and server room creation.
 *
 * ## Architecture
 *
 * This component has been refactored from a monolithic 1153-line file into a modular
 * structure with clear separation of concerns:
 *
 * ### Modules
 *
 * - **Types** (`types/`): Type definitions for launch state, messages, and configuration
 * - **Hooks** (`hooks/`): Business logic hooks (launch, wallet, messages, socket)
 * - **Components** (`components/`): UI components (status character, review sections, IDs banner)
 * - **Utils** (`utils/`): Utility functions (formatting, deployment parameter building)
 *
 * ### Main Responsibilities
 *
 * 1. **Orchestration**: Coordinates hooks and components to manage the launch flow
 * 2. **State Management**: Manages launch state machine transitions
 * 3. **UI Rendering**: Renders review sections and launch controls
 * 4. **Error Handling**: Displays errors and allows retry
 *
 * ## Launch Flow
 *
 * ```
 * ready → generating-ids → deploying-contract → creating-room → success
 *                                                      ↓
 *                                                    error
 * ```
 *
 * ## Chain-Specific Behavior
 *
 * - **Stellar**: Delegates deployment to StellarLaunchSection component
 * - **EVM/Solana**: Handles deployment directly via contractActions.deploy
 *
 * ## Usage
 *
 * ```typescript
 * <StepWeb3ReviewLaunch
 *   onBack={() => goToPreviousStep()}
 *   onResetToFirst={() => resetWizard()}
 * />
 * ```
 *
 * Used by Web3QuizWizard component as the final step in the wizard flow.
 */

import { FC, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Rocket } from 'lucide-react';

import { useQuizSetupStore } from '../../hooks/useQuizSetupStore';
import { useQuizConfig } from '../../hooks/useQuizConfig';
import { useQuizSocket } from '../../sockets/QuizSocketProvider';
import { useQuizChainIntegration } from '@/hooks/useQuizChainIntegration';
import { useWalletActions } from '@/hooks/useWalletActions';
import { useContractActions } from '@/hooks/useContractActions';
import type { QuizConfig } from '../../types/quiz';

import StellarLaunchSection from '../StellarLaunchSection';
import ClearSetupButton from '../ClearSetupButton';
import type { WizardStepProps } from '../WizardStepProps';

// Modular imports
import { useWeb3Launch } from './hooks/useWeb3Launch';
import { useLaunchMessages } from './hooks/useLaunchMessages';
import { useWalletConnection } from './hooks/useWalletConnection';
import { useSocketListeners } from './hooks/useSocketListeners';
import { LaunchStatusCharacter } from './components/LaunchStatusCharacter';
import { RoomIdsBanner } from './components/RoomIdsBanner';
import {
  HostEventSection,
  PaymentPrizeSection,
  QuizStructureSection,
  BlockchainConfigSection,
} from './components/ReviewSections';
import { generateRoomId, generateHostId } from '../../utils/idUtils';
import { buildWeb3RoomConfig } from './utils/deployment';
import type { DeploymentResult } from './types';

/**
 * Web3 Review & Launch Step Component
 *
 * Main component for the Web3 review and launch step. Orchestrates the deployment
 * flow by coordinating hooks and rendering UI components.
 *
 * @param props - Component props
 * @returns StepWeb3ReviewLaunch component
 */
const StepWeb3ReviewLaunch: FC<WizardStepProps> = ({ onBack, onResetToFirst }) => {
  // Store and config
  const { setupConfig, roomId, hostId, setRoomIds, clearRoomIds, hardReset } = useQuizSetupStore();
  const { setFullConfig } = useQuizConfig();
  const navigate = useNavigate();
  const { socket, connected } = useQuizSocket();

  // Chain integration
  const {
    selectedChain,
    isWalletConnected,
    walletReadiness,
    currentWallet,
    getFormattedAddress,
    getNetworkDisplayName,
  } = useQuizChainIntegration();

  // Wallet and contract actions
  const walletActions = useWalletActions();
  const contractActions = useContractActions();

  // Wallet connection handlers
  const { handleConnect, handleDisconnect } = useWalletConnection({ walletActions });

  // Normalize currentWallet type
  const normalizedWallet = currentWallet && currentWallet.address
    ? {
        address: currentWallet.address,
        ...((currentWallet as any).isDisconnecting !== undefined && {
          isDisconnecting: (currentWallet as any).isDisconnecting as boolean,
        }),
      }
    : null;

  // Launch hook
  const {
    launchState,
    launchError,
    contractAddress,
    txHash,
    explorerUrl,
    deploymentStep,
    deployTrigger,
    handleLaunch,
    isLaunching,
    canLaunch,
    setDeploymentStep,
    setLaunchState,
    setLaunchError,
    setContractAddress,
    setTxHash,
    setExplorerUrl,
  } = useWeb3Launch({
    setupConfig,
    selectedChain,
    isWalletConnected,
    walletReadiness,
    currentWallet: normalizedWallet,
    walletActions,
    contractActions,
    getNetworkDisplayName,
    setRoomIds,
    clearRoomIds,
    setFullConfig,
    navigate,
  });

  // Socket listeners
  useSocketListeners({
    socket,
    connected,
    setLaunchState,
    setLaunchError,
    hardReset,
    navigate,
  });

  // Configuration completeness
  const hasHostName = !!setupConfig.hostName;
  const hasRounds = !!(setupConfig.roundDefinitions && setupConfig.roundDefinitions.length > 0);
  const configComplete = hasHostName && hasRounds && !!selectedChain;

  // Launch messages
  const { getCurrentMessage } = useLaunchMessages({
    launchState,
    deploymentStep,
    configComplete,
    isWalletConnected,
    getNetworkDisplayName,
  });

  // Update launch error message if available
  const messageWithError = useMemo(() => {
    const baseMessage = getCurrentMessage();
    if (launchState === 'error' && launchError) {
      return {
        ...baseMessage,
        message: `Web3 launch failed: ${launchError}. Check wallet + network and try again.`,
      };
    }
    return baseMessage;
  }, [getCurrentMessage, launchState, launchError]);

  // Currency
  const currency = setupConfig.currencySymbol || setupConfig.web3Currency || 'GLOUSD';
  const platformPct = 20; // Fixed platform fee

  // Resolved room/host IDs (for Stellar)
  const resolvedRoomId: string =
    roomId ?? localStorage.getItem('current-room-id') ?? generateRoomId();
  const resolvedHostId: string =
    hostId ?? localStorage.getItem('current-host-id') ?? generateHostId();

  // Stellar deployment handler
  const handleStellarDeployed = async (result: {
    contractAddress: string;
    txHash: string;
    explorerUrl?: string;
  }) => {
    try {
      setContractAddress(result.contractAddress);
      setTxHash(result.txHash);
      setExplorerUrl(result.explorerUrl || null);
      setLaunchState('creating-room');

      const confirmedWallet = walletActions.getAddress() || currentWallet?.address || undefined;
      const deploymentResult: DeploymentResult = {
        success: true,
        contractAddress: result.contractAddress,
        txHash: result.txHash,
        ...(result.explorerUrl && { explorerUrl: result.explorerUrl }),
      };
      const web3RoomConfig = buildWeb3RoomConfig(
        setupConfig,
        'stellar',
        deploymentResult,
        confirmedWallet || ''
      );

      const response = await fetch('/quiz/api/create-web3-room', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          config: web3RoomConfig,
          roomId: roomId || localStorage.getItem('current-room-id'),
          hostId: hostId || localStorage.getItem('current-host-id'),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Server error: ${response.status}`);
      }

      const data = await response.json();
      if (!data.verified || !data.contractAddress) {
        throw new Error('Room creation not verified by server');
      }

      try {
        localStorage.setItem('current-room-id', data.roomId);
        localStorage.setItem('current-host-id', data.hostId);
        localStorage.setItem('current-contract-address', data.contractAddress);
      } catch {}

      setFullConfig({
        ...web3RoomConfig,
        roomId: data.roomId,
        hostId: data.hostId,
      } as Partial<QuizConfig>);

      setLaunchState('success');
      setTimeout(() => navigate(`/quiz/host-dashboard/${data.roomId}`), 600);
    } catch (err: any) {
      console.error('[StepWeb3ReviewLaunch] Stellar deployment error:', err);
      setLaunchError(err?.message || 'Unknown error');
      setLaunchState('error');
    }
  };

  // Current status message
  const currentMessage = messageWithError;

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="heading-2">Review & Deploy</h2>
          <p className="text-fg/70 mt-0.5 text-xs md:text-sm">Final blockchain deployment check</p>
        </div>
        {onResetToFirst && (
          <ClearSetupButton
            label="Start Over"
            variant="ghost"
            size="sm"
            keepIds={false}
            flow="web3"
            onCleared={onResetToFirst}
          />
        )}
      </div>

      {/* Status Character */}
      <LaunchStatusCharacter expression={currentMessage.expression} message={currentMessage.message} />

      {/* Room IDs Banner */}
      <RoomIdsBanner roomId={roomId} hostId={hostId} />

      {/* Review Sections */}
      <div className="grid grid-cols-1 gap-4 md:gap-6 lg:grid-cols-2">
        <HostEventSection setupConfig={setupConfig} hasHostName={hasHostName} />
        <PaymentPrizeSection
          setupConfig={setupConfig}
          currency={currency}
          platformPct={platformPct}
        />
      </div>

      {/* Quiz Structure */}
      <QuizStructureSection
        roundDefinitions={setupConfig.roundDefinitions || []}
        hasRounds={hasRounds}
      />

      {/* Stellar Launch Section (only when chain === 'stellar') */}
      {selectedChain === 'stellar' && (
        <StellarLaunchSection
          deployTrigger={deployTrigger}
          roomId={resolvedRoomId}
          hostId={resolvedHostId}
          setupConfig={setupConfig}
          onDeploymentProgress={(msg) => setDeploymentStep(msg)}
          onDeployed={handleStellarDeployed}
          onError={(message) => {
            console.error('[StepWeb3ReviewLaunch] Stellar error:', message);
            setLaunchError(message);
            setLaunchState('error');
          }}
        />
      )}

      {/* Blockchain Configuration */}
      <BlockchainConfigSection
        setupConfig={setupConfig}
        currency={currency}
        walletReadiness={walletReadiness}
        isWalletConnected={isWalletConnected}
        currentWallet={normalizedWallet}
        getFormattedAddress={() => getFormattedAddress() || ''}
        getNetworkDisplayName={getNetworkDisplayName}
        onConnect={handleConnect}
        onDisconnect={handleDisconnect}
        contractAddress={contractAddress}
        txHash={txHash}
        explorerUrl={explorerUrl}
      />

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
          {onResetToFirst && (
            <ClearSetupButton
              label="Start Over"
              variant="ghost"
              size="sm"
              keepIds={false}
              flow="web3"
              onCleared={onResetToFirst}
            />
          )}
          <button
            type="button"
            onClick={handleLaunch}
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
                : !isWalletConnected
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

