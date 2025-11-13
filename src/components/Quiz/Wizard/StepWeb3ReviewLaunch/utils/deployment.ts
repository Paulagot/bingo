/**
 * Deployment Utilities
 *
 * Utility functions for building deployment parameters and room configuration
 * for Web3 quiz room creation. These functions transform setup configuration
 * into the format required by contract deployment and server API.
 *
 * ## Functions
 *
 * - `buildDeployParams`: Builds deployment parameters from setup config
 * - `buildWeb3RoomConfig`: Builds server room configuration from deployment result
 *
 * Used by launch hooks and the main StepWeb3ReviewLaunch component.
 */

import type { DeployParams } from '@/hooks/useContractActions';
import type { QuizConfig } from '@/components/Quiz/types/quiz';
import type { Web3RoomConfig } from '../types';
import type { DeploymentResult } from '../types';
import type { SupportedChain } from '@/chains/types';

/**
 * Build Deployment Parameters
 *
 * Transforms quiz setup configuration into deployment parameters for smart contract
 * deployment. Handles prize mode mapping, asset prize formatting, and charity wallet
 * resolution.
 *
 * ## Prize Mode Mapping
 *
 * - **Split Mode**: Maps `prizeSplits` to `prizeSplits` object (first/second/third place percentages)
 * - **Asset Mode**: Maps `prizes` array to `expectedPrizes` array (token addresses and amounts)
 *
 * ## Charity Wallet Handling
 *
 * The charity wallet is handled in two phases:
 *
 * 1. **Room Creation**: Uses `charityAddress` if provided, otherwise deploy function uses
 *    GlobalConfig's charity wallet. This allows room creation to succeed even if TGB
 *    address is not available yet.
 *
 * 2. **Prize Distribution**: Uses TGB dynamic charity address from `web3CharityAddress`
 *    parameter in the `end_room` instruction. This allows each transaction to use a
 *    different TGB address.
 *
 * ## Prize Split Mapping
 *
 * Converts `setupConfig.prizeSplits` (Record<number, number>) to `prizeSplits` object:
 *
 * ```typescript
 * // Input: { 1: 50, 2: 30, 3: 20 }
 * // Output: { first: 50, second: 30, third: 20 }
 * ```
 *
 * ## Asset Prize Mapping
 *
 * Filters and maps `setupConfig.prizes` array to `expectedPrizes`:
 *
 * ```typescript
 * // Input: [{ tokenAddress: '0x...', value: '1' }, ...]
 * // Output: [{ tokenAddress: '0x...', amount: '1' }, ...]
 * ```
 *
 * ## Usage
 *
 * ```typescript
 * const deployParams = buildDeployParams(roomId, hostId, hostWallet, setupConfig);
 * const result = await contractActions.deploy(deployParams);
 * ```
 *
 * @param roomId - Unique room identifier
 * @param hostId - Unique host identifier
 * @param hostWallet - Host wallet address (must be connected)
 * @param setupConfig - Quiz setup configuration from store
 * @returns Deployment parameters for contract deployment
 */
export function buildDeployParams(
  roomId: string,
  hostId: string,
  hostWallet: string,
  setupConfig: Partial<QuizConfig>
): DeployParams {
  // Determine prize mode
  const prizeMode = (setupConfig.prizeMode as 'split' | 'assets' | undefined) || 'split';
  
  // Get prize splits for pool mode
  const splits = setupConfig.web3PrizeSplit || undefined;
  
  // Map prize splits (1/2/3 => first/second/third)
  const poolSplits = setupConfig.prizeSplits
    ? {
        first: Number(setupConfig.prizeSplits[1] ?? 100),
        second: setupConfig.prizeSplits[2],
        third: setupConfig.prizeSplits[3],
      }
    : { first: 100 };
  
  // Map asset prizes (filter and format)
  const expectedPrizes =
    (setupConfig.prizes || [])
      .filter((p: any) => p?.tokenAddress)
      .map((p: any) => ({
        tokenAddress: String(p.tokenAddress),
        amount: String(p.value ?? '1'),
      })) || [];
  
  // Charity wallet resolution
  // Note: charityAddress is optional - deploy function will use GlobalConfig's charity wallet
  // if not provided. This allows room creation to succeed even if TGB address is not available.
  const resolvedCharityAddress = (setupConfig as any)?.web3CharityAddress ?? undefined;
  const resolvedCharityName =
    (setupConfig as any)?.web3Charity ?? (setupConfig as any)?.charityName ?? undefined;
  
  // Log charity wallet resolution for debugging
  if (resolvedCharityAddress) {
    console.log('[buildDeployParams] 📋 Charity address provided for room creation:', resolvedCharityAddress);
    console.log('[buildDeployParams] ℹ️ Note: This will be stored in the room, but TGB dynamic address will be used at prize distribution');
  } else {
    console.log('[buildDeployParams] 📋 No charity address provided - deploy function will use GlobalConfig charity wallet');
    console.log('[buildDeployParams] ℹ️ Note: TGB dynamic charity address will be used during prize distribution');
  }
  
  return {
    roomId,
    hostId,
    currency: setupConfig.web3Currency || setupConfig.currencySymbol || 'XLM',
    entryFee: setupConfig.entryFee ?? '1.0',
    hostFeePct: Number(splits?.host ?? 0),
    prizeMode: prizeMode,
    charityName: resolvedCharityName,
    // charityAddress is optional - if not provided, deploy function will use GlobalConfig's charity wallet
    // This allows room creation to succeed even if TGB address is not available yet
    charityAddress: resolvedCharityAddress,
    prizePoolPct: Number(splits?.prizes ?? 0),
    prizeSplits: poolSplits,
    expectedPrizes,
    hostWallet,
    hostMetadata: {
      hostName: setupConfig.hostName,
      eventDateTime: setupConfig.eventDateTime,
      totalRounds: (setupConfig.roundDefinitions || []).length,
    },
  };
}

/**
 * Build Web3 Room Configuration
 *
 * Builds the extended room configuration object sent to the server for Web3 room creation.
 * Includes all Web3-specific fields, deployment metadata, and prize structure.
 *
 * ## Field Mapping
 *
 * - `roomContractAddress`: Canonical field (preferred)
 * - `web3ContractAddress`: Legacy field (maintained for backward compatibility)
 * - `contractAddress`: Old field (maintained for backward compatibility)
 *
 * All three fields are set to the same value to ensure compatibility with different
 * server versions and client code.
 *
 * ## Prize Structure
 *
 * Maps `prizeSplits` to `web3PrizeStructure`:
 *
 * ```typescript
 * // Input: { 1: 50, 2: 30, 3: 20 }
 * // Output: { firstPlace: 50, secondPlace: 30, thirdPlace: 20 }
 * ```
 *
 * ## Cleanup
 *
 * Removes `maxPlayers` from config to prevent accidental client-side caps from
 * overriding server-side entitlements.
 *
 * ## Usage
 *
 * ```typescript
 * const deployResult = await contractActions.deploy(deployParams);
 * const roomConfig = buildWeb3RoomConfig(
 *   setupConfig,
 *   selectedChain,
 *   deployResult,
 *   hostWallet
 * );
 * const response = await fetch('/quiz/api/create-web3-room', {
 *   method: 'POST',
 *   body: JSON.stringify({ config: roomConfig, roomId, hostId })
 * });
 * ```
 *
 * @param setupConfig - Base quiz setup configuration
 * @param selectedChain - Selected blockchain (solana, evm, stellar)
 * @param deployResult - Deployment result from contract deployment
 * @param hostWallet - Confirmed host wallet address
 * @returns Extended Web3 room configuration for server
 */
export function buildWeb3RoomConfig(
  setupConfig: Partial<QuizConfig>,
  selectedChain: SupportedChain,
  deployResult: DeploymentResult,
  hostWallet: string
): Web3RoomConfig {
  const web3RoomConfig: Web3RoomConfig = {
    ...setupConfig,
    deploymentTxHash: deployResult.txHash,
    hostWalletConfirmed: hostWallet,
    paymentMethod: 'web3' as const,
    isWeb3Room: true,
    web3PrizeStructure: {
      firstPlace: setupConfig.prizeSplits?.[1] || 100,
      secondPlace: setupConfig.prizeSplits?.[2] || 0,
      thirdPlace: setupConfig.prizeSplits?.[3] || 0,
    },
    web3Chain: selectedChain,
    evmNetwork: (setupConfig as any)?.evmNetwork,
    solanaCluster: (setupConfig as any)?.solanaCluster,
    // Set all three contract address fields for backward compatibility
    roomContractAddress: deployResult.contractAddress, // Canonical field
    web3ContractAddress: deployResult.contractAddress, // Legacy field
    contractAddress: deployResult.contractAddress, // Old field
    web3CharityId: (setupConfig as any)?.web3CharityId,
    web3CharityName: (setupConfig as any)?.web3Charity,
    web3CharityAddress: (setupConfig as any)?.web3CharityAddress,
  };
  
  // Prevent accidental caps coming from client
  delete (web3RoomConfig as any).maxPlayers;
  
  return web3RoomConfig;
}

