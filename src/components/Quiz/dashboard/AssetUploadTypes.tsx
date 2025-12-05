// src/components/Quiz/dashboard/AssetUploadTypes.ts
import type { Prize } from '../types/quiz';
import type { UploadStatus } from './AssetUploadUtils';

/**
 * Base props that all chain-specific asset upload components receive
 */
export interface BaseAssetUploadProps {
  chainName: string;
}

/**
 * Callback function type for updating prize upload status
 * Used by parent component to update config state
 * 
 * @param prizeIndex - Index in the assetPrizes array (NOT the prizes array)
 * @param status - New upload status
 * @param transactionHash - Optional transaction hash if status is 'completed'
 */
export type OnStatusUpdate = (
  prizeIndex: number,
  status: UploadStatus,
  transactionHash?: string
) => void;

/**
 * Props for shared UI components that display upload statistics
 */
export interface UploadStatsDisplayProps {
  totalAssets: number;
  completedUploads: number;
  failedUploads: number;
  pendingUploads: number;
  uploading: number;
}

/**
 * Props for connection status notices
 */
export interface ConnectionStatus {
  isSocketConnected: boolean;
  isWalletConnected: boolean;
  isContractReady: boolean;
}

/**
 * Props for contract information display
 */
export interface ContractInfo {
  contractAddress?: string | undefined;
  roomId?: string | undefined;
  walletAddress?: string | undefined;
  explorerBaseUrl?: string | undefined;
}

/**
 * Helper type for local prize input state (used in EVM for NFT tokenId/amount)
 */
export interface LocalPrizeInputs {
  tokenIds: Record<number, string>;
  amounts: Record<number, string>;
}

/**
 * Result type for upload operations
 */
export interface UploadResult {
  success: boolean;
  hash?: string;
  error?: string;
}

/**
 * Extended prize type with computed properties for UI
 * (Not stored, just for display logic)
 */
export interface PrizeWithStatus extends Prize {
  // All Prize fields are inherited
  // Add computed display properties if needed
  displayStatus?: string;
  canUpload?: boolean;
  errorMessage?: string;
}