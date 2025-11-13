/**
 * Web3 Launch Hook
 *
 * Custom hook that encapsulates the entire Web3 quiz room deployment flow.
 * Handles contract deployment, room creation, error handling, and state management
 * for EVM and Solana blockchains. Stellar deployment is delegated to StellarLaunchSection.
 *
 * ## Responsibilities
 *
 * 1. **Pre-flight Checks**: Validates wallet connection and configuration
 * 2. **ID Generation**: Generates unique room and host IDs
 * 3. **Contract Deployment**: Deploys smart contract on selected blockchain
 * 4. **Room Creation**: Creates room record on server with deployment proof
 * 5. **Error Handling**: Catches and formats errors for user feedback
 * 6. **State Management**: Manages launch state machine transitions
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
 * - **Stellar**: Delegates to StellarLaunchSection component (via deployTrigger)
 * - **EVM/Solana**: Handles deployment directly via contractActions.deploy
 *
 * ## Error Recovery
 *
 * - **Duplicate Transaction (Solana)**: Automatically retries with fresh IDs
 * - **Network Errors**: Provides user-friendly error messages
 * - **Server Errors**: Parses and displays server error details
 *
 * ## Usage
 *
 * ```typescript
 * const {
 *   launchState,
 *   launchError,
 *   contractAddress,
 *   txHash,
 *   explorerUrl,
 *   handleLaunch,
 *   isLaunching,
 *   canLaunch
 * } = useWeb3Launch({
 *   setupConfig,
 *   selectedChain,
 *   isWalletConnected,
 *   walletReadiness,
 *   currentWallet,
 *   walletActions,
 *   contractActions,
 *   getNetworkDisplayName,
 *   setRoomIds,
 *   clearRoomIds,
 *   setFullConfig,
 *   navigate
 * });
 * ```
 *
 * Used by StepWeb3ReviewLaunch component to orchestrate the deployment flow.
 */

import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import type { QuizConfig } from '@/components/Quiz/types/quiz';
import type { SupportedChain } from '@/chains/types';
import type { Web3LaunchState, DeploymentResult } from '../types';
import { generateRoomId, generateHostId } from '@/components/Quiz/utils/idUtils';
import { buildDeployParams, buildWeb3RoomConfig } from '../utils/deployment';
import { isInvalidTx } from '../utils/formatting';
import type { WalletActions } from '@/hooks/useWalletActions';
import type { ContractActions } from '@/hooks/useContractActions';

/**
 * Hook Configuration
 *
 * Configuration object for the useWeb3Launch hook.
 */
export interface UseWeb3LaunchConfig {
  /** Quiz setup configuration */
  setupConfig: Partial<QuizConfig>;
  /** Selected blockchain */
  selectedChain: SupportedChain | null;
  /** Whether wallet is connected */
  isWalletConnected: boolean;
  /** Wallet readiness status */
  walletReadiness: { status: string; message: string };
  /** Current wallet information */
  currentWallet: { address?: string; isDisconnecting?: boolean } | null;
  /** Wallet actions hook */
  walletActions: WalletActions;
  /** Contract actions hook */
  contractActions: ContractActions;
  /** Function to get network display name */
  getNetworkDisplayName: () => string;
  /** Function to set room IDs */
  setRoomIds: (roomId: string, hostId: string) => void;
  /** Function to clear room IDs */
  clearRoomIds: () => void;
  /** Function to set full quiz config */
  setFullConfig: (config: Partial<QuizConfig>) => void;
  /** Navigation function */
  navigate: ReturnType<typeof useNavigate>;
}

/**
 * Hook Return Value
 *
 * Return value from useWeb3Launch hook.
 */
export interface UseWeb3LaunchReturn {
  /** Current launch state */
  launchState: Web3LaunchState;
  /** Launch error message (if any) */
  launchError: string | null;
  /** Deployed contract address */
  contractAddress: string | null;
  /** Deployment transaction hash */
  txHash: string | null;
  /** Block explorer URL */
  explorerUrl: string | null;
  /** Current deployment step message */
  deploymentStep: string;
  /** Deploy trigger counter (for Stellar) */
  deployTrigger: number;
  /** Function to trigger launch */
  handleLaunch: () => Promise<void>;
  /** Whether launch is in progress */
  isLaunching: boolean;
  /** Whether launch can be triggered */
  canLaunch: boolean;
  /** Function to set deployment step message */
  setDeploymentStep: (step: string) => void;
  /** Function to set launch state */
  setLaunchState: (state: Web3LaunchState) => void;
  /** Function to set launch error */
  setLaunchError: (error: string | null) => void;
  /** Function to set contract address */
  setContractAddress: (address: string | null) => void;
  /** Function to set transaction hash */
  setTxHash: (hash: string | null) => void;
  /** Function to set explorer URL */
  setExplorerUrl: (url: string | null) => void;
}

/**
 * Web3 Launch Hook
 *
 * Manages the complete Web3 quiz room deployment flow including contract deployment
 * and server room creation. Handles state transitions, error recovery, and user feedback.
 *
 * @param config - Hook configuration
 * @returns Launch state and control functions
 */
export function useWeb3Launch(config: UseWeb3LaunchConfig): UseWeb3LaunchReturn {
  const {
    setupConfig,
    selectedChain,
    isWalletConnected,
    walletReadiness,
    currentWallet,
    walletActions,
    contractActions,
    getNetworkDisplayName,
    setRoomIds,
    clearRoomIds,
    setFullConfig,
    navigate,
  } = config;

  // Launch state
  const [launchState, setLaunchState] = useState<Web3LaunchState>('ready');
  const [launchError, setLaunchError] = useState<string | null>(null);
  const [contractAddress, setContractAddress] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [deploymentStep, setDeploymentStep] = useState<string>('');
  const [deployTrigger, setDeployTrigger] = useState(0);
  const [explorerUrl, setExplorerUrl] = useState<string | null>(null);

  /**
   * Handle Web3 Launch
   *
   * Main launch handler that orchestrates the entire deployment flow.
   * Handles EVM and Solana deployments directly; delegates Stellar to child component.
   *
   * ## Flow
   *
   * 1. Validate pre-conditions (chain, wallet, configuration)
   * 2. Generate unique room and host IDs
   * 3. Deploy smart contract (EVM/Solana) or trigger Stellar deployment
   * 4. Create room on server with deployment proof
   * 5. Handle success/error states
   *
   * ## Error Handling
   *
   * - Validates wallet connection before proceeding
   * - Handles duplicate transaction errors (Solana) with automatic retry
   * - Provides detailed error messages for user feedback
   * - Cleans up state on error
   *
   * ## Stellar Handling
   *
   * For Stellar, this function only triggers the StellarLaunchSection component
   * via the deployTrigger counter. The actual deployment is handled by that component.
   */
  const handleLaunch = useCallback(async () => {
    // Only allow launch from ready or error states
    if (launchState !== 'ready' && launchState !== 'error') return;
    
    setLaunchError(null);

    // Clean up previous attempt
    try {
      localStorage.removeItem('current-room-id');
      localStorage.removeItem('current-host-id');
      localStorage.removeItem('current-contract-address');
    } catch {}
    clearRoomIds();

    try {
      // Validate chain selection
      if (!selectedChain) {
        throw new Error('No blockchain selected.');
      }

      // Get host wallet address
      const hostWalletMaybe =
        currentWallet?.address ?? walletActions.getAddress?.() ?? null;

      // Check wallet connection
      const connectedNow =
        walletReadiness?.status === 'ready' ||
        walletActions.isConnected?.() === true ||
        !!hostWalletMaybe;

      // Debug logging
      console.log('[useWeb3Launch] Pre-flight check:', {
        selectedChain,
        readiness: walletReadiness,
        hostWalletMaybe,
        wa_isConnected: walletActions.isConnected?.(),
      });

      if (!connectedNow || !hostWalletMaybe) {
        throw new Error(`Connect your ${getNetworkDisplayName()} wallet first.`);
      }

      // From here on, hostWallet is a real string
      const hostWallet: string = hostWalletMaybe;

      // Generate IDs
      setLaunchState('generating-ids');
      const newRoomId = generateRoomId();
      const newHostId = generateHostId();
      setRoomIds(newRoomId, newHostId);

      // Stellar → delegate to child component
      if (selectedChain === 'stellar') {
        setLaunchState('deploying-contract');
        setDeploymentStep('Deploying Stellar contract…');
        setDeployTrigger((n) => n + 1);
        return;
      }

      // Non-Stellar (EVM/Solana) → handle deployment
      setLaunchState('deploying-contract');
      setDeploymentStep(`Deploying ${getNetworkDisplayName()} contract…`);

      // Build deployment parameters
      const deployParams = buildDeployParams(newRoomId, newHostId, hostWallet, setupConfig);
      let deployRes: DeploymentResult;

      try {
        const result = await contractActions.deploy(deployParams);
        
        if (!result.success || !result.contractAddress || isInvalidTx(result.txHash)) {
          throw new Error('Blockchain deployment was not signed/confirmed.');
        }
        
        deployRes = result;
      } catch (deployError: any) {
        console.error('[useWeb3Launch] Deployment error:', deployError);

        // Solana duplicate transaction detection
        if (deployError?.message?.includes('This transaction has already been processed')) {
          console.warn('[useWeb3Launch] Duplicate signature; retrying with fresh IDs...');
          await new Promise((r) => setTimeout(r, 2000));

          const retryRoomId = generateRoomId();
          const retryHostId = generateHostId();
          setRoomIds(retryRoomId, retryHostId);

          const retryParams = buildDeployParams(retryRoomId, retryHostId, hostWallet, setupConfig);
          const retryResult = await contractActions.deploy(retryParams);
          
          if (!retryResult.success || !retryResult.contractAddress || isInvalidTx(retryResult.txHash)) {
            throw new Error('Blockchain deployment was not signed/confirmed.');
          }
          
          deployRes = retryResult;
          console.log('[useWeb3Launch] Retry succeeded!');
        } else {
          throw deployError;
        }
      }

      // Store deployment result
      setContractAddress(deployRes.contractAddress);
      setTxHash(deployRes.txHash);
      setExplorerUrl(deployRes.explorerUrl || null);

      // Create room on server
      setLaunchState('creating-room');
      await createRoomOnServer(
        newRoomId,
        newHostId,
        deployRes,
        hostWallet,
        selectedChain,
        setupConfig,
        setFullConfig,
        navigate
      );

      // Success
      setLaunchState('success');
      setTimeout(() => {
        navigate(`/quiz/host-dashboard/${newRoomId}`);
      }, 600);
    } catch (err: any) {
      console.error('[useWeb3Launch] Launch error:', err);
      console.error('[useWeb3Launch] Error details:', {
        name: err?.name,
        message: err?.message,
        stack: err?.stack,
      });

      // Cleanup on error
      try {
        localStorage.removeItem('current-room-id');
        localStorage.removeItem('current-host-id');
        localStorage.removeItem('current-contract-address');
      } catch {}
      clearRoomIds();

      setLaunchError(err?.message || 'Unknown error');
      setLaunchState('error');
    }
  }, [
    launchState,
    selectedChain,
    isWalletConnected,
    walletReadiness,
    currentWallet,
    walletActions,
    contractActions,
    getNetworkDisplayName,
    setRoomIds,
    clearRoomIds,
    setFullConfig,
    navigate,
    setupConfig,
  ]);

  const isLaunching = launchState !== 'ready' && launchState !== 'error';
  const canLaunch =
    !!setupConfig.hostName &&
    !!(setupConfig.roundDefinitions && setupConfig.roundDefinitions.length > 0) &&
    !!selectedChain &&
    isWalletConnected &&
    (launchState === 'ready' || launchState === 'error');

  return {
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
  };
}

/**
 * Create Room on Server
 *
 * Helper function that creates the room record on the server after successful
 * contract deployment. Handles request building, response parsing, and error handling.
 *
 * ## Request Structure
 *
 * ```typescript
 * {
 *   config: Web3RoomConfig,  // Extended room configuration
 *   roomId: string,          // Generated room ID
 *   hostId: string           // Generated host ID
 * }
 * ```
 *
 * ## Response Validation
 *
 * Validates that server response includes:
 * - `verified: true` - Server verified the deployment
 * - `contractAddress` - Confirmed contract address
 * - `roomId` - Server-assigned room ID
 * - `hostId` - Server-assigned host ID
 *
 * ## Error Handling
 *
 * - Handles empty responses
 * - Handles non-JSON responses
 * - Provides detailed error messages
 * - Saves room details to localStorage on success
 *
 * @param roomId - Generated room ID
 * @param hostId - Generated host ID
 * @param deployResult - Deployment result
 * @param hostWallet - Host wallet address
 * @param selectedChain - Selected blockchain
 * @param setupConfig - Setup configuration
 * @param setFullConfig - Function to set full config
 * @param navigate - Navigation function
 */
async function createRoomOnServer(
  roomId: string,
  hostId: string,
  deployResult: DeploymentResult,
  hostWallet: string,
  selectedChain: SupportedChain,
  setupConfig: Partial<QuizConfig>,
  setFullConfig: (config: Partial<QuizConfig>) => void,
  navigate: ReturnType<typeof useNavigate>
): Promise<void> {
  const web3RoomConfig = buildWeb3RoomConfig(setupConfig, selectedChain, deployResult, hostWallet);

  console.log('[createRoomOnServer] 📤 Sending room creation request...');
  console.log('[createRoomOnServer] 📋 Request payload:', {
    roomId,
    hostId,
    contractAddress: web3RoomConfig.roomContractAddress,
    deploymentTxHash: web3RoomConfig.deploymentTxHash,
    chain: web3RoomConfig.web3Chain,
  });

  const response = await fetch('/quiz/api/create-web3-room', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      config: web3RoomConfig,
      roomId,
      hostId,
    }),
  });

  console.log('[createRoomOnServer] 📥 Response received:', {
    status: response.status,
    statusText: response.statusText,
    ok: response.ok,
    contentType: response.headers.get('content-type'),
  });

  // Parse response
  let data: any = null;
  try {
    const contentType = response.headers.get('content-type');
    const text = await response.clone().text();

    if (!text || text.trim().length === 0) {
      console.error('[createRoomOnServer] ❌ Empty response body');
      if (!response.ok) {
        throw new Error(`Server returned empty response with status ${response.status}`);
      }
      throw new Error(`Server returned empty response (${response.status})`);
    }

    if (contentType && contentType.includes('application/json')) {
      try {
        data = JSON.parse(text);
        console.log('[createRoomOnServer] 📦 Response data:', data);
      } catch (parseError: any) {
        console.error('[createRoomOnServer] ❌ Failed to parse JSON:', parseError);
        console.error('[createRoomOnServer] 📄 Response text:', text.substring(0, 500));
        throw new Error(`Invalid JSON response from server: ${parseError.message}`);
      }
    } else {
      console.error('[createRoomOnServer] ❌ Unexpected content type:', contentType);
      console.error('[createRoomOnServer] 📄 Response text:', text.substring(0, 500));
      throw new Error(`Unexpected response type: ${contentType || 'unknown'}`);
    }
  } catch (parseError: any) {
    if (!response.ok && data) {
      const errorMessage = data?.error || data?.details || `Server error: ${response.status}`;
      throw new Error(errorMessage);
    }
    if (parseError.message && (parseError.message.includes('Server') || parseError.message.includes('Invalid JSON'))) {
      throw parseError;
    }
    throw new Error(`Failed to parse server response (${response.status}): ${parseError.message || 'Unknown error'}`);
  }

  // Validate response
  if (!response.ok) {
    const errorMessage = data?.error || data?.details || `Server error: ${response.status}`;
    console.error('[createRoomOnServer] ❌ Server error:', {
      status: response.status,
      error: data?.error,
      details: data?.details,
    });
    throw new Error(errorMessage);
  }

  if (!data.verified || !data.contractAddress) {
    console.error('[createRoomOnServer] ❌ Room creation not verified:', {
      verified: data.verified,
      contractAddress: data.contractAddress,
    });
    throw new Error('Room creation not verified by server');
  }

  console.log('[createRoomOnServer] ✅ Room creation successful!', {
    roomId: data.roomId,
    hostId: data.hostId,
    contractAddress: data.contractAddress,
  });

  // Save to localStorage
  try {
    localStorage.setItem('current-room-id', data.roomId);
    localStorage.setItem('current-host-id', data.hostId);
    localStorage.setItem('current-contract-address', data.contractAddress);
    console.log('[createRoomOnServer] 💾 Saved room details to localStorage');
  } catch (storageError) {
    console.warn('[createRoomOnServer] ⚠️ Failed to save to localStorage:', storageError);
  }

  // Update config
  setFullConfig({
    ...web3RoomConfig,
    roomId: data.roomId,
    hostId: data.hostId,
  });
}

