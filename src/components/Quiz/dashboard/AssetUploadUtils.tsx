// src/components/Quiz/Wizard/AssetUploadUtils.tsx
import React from 'react';
import type { Prize } from '../types/quiz';
import {
  CheckCircle,
  XCircle,
  Clock,
  RefreshCw,
} from 'lucide-react';

// Re-export upload status type from Prize interface
export type UploadStatus = Prize['uploadStatus'];

// Chain type for routing
export type ChainType = 'stellar' | 'evm' | 'solana';

// Stats calculation interface
export interface UploadStats {
  totalAssets: number;
  completedUploads: number;
  failedUploads: number;
  pendingUploads: number;
  uploading: number;
  allUploadsComplete: boolean;
}

/**
 * Calculate upload statistics from prizes array
 */
export const calculateUploadStats = (prizes: Prize[]): UploadStats => {
  const assetPrizes = prizes.filter((p) => p.tokenAddress);
  const totalAssets = assetPrizes.length;
  const completedUploads = assetPrizes.filter((p) => p.uploadStatus === 'completed').length;
  const failedUploads = assetPrizes.filter((p) => p.uploadStatus === 'failed').length;
  const pendingUploads = assetPrizes.filter((p) => !p.uploadStatus || p.uploadStatus === 'pending').length;
  const uploading = assetPrizes.filter((p) => p.uploadStatus === 'uploading').length;

  return {
    totalAssets,
    completedUploads,
    failedUploads,
    pendingUploads,
    uploading,
    allUploadsComplete: totalAssets > 0 && completedUploads === totalAssets,
  };
};

/**
 * Filter prizes to only include those with token addresses
 */
export const getAssetPrizes = (prizes: Prize[]): Prize[] => {
  return prizes.filter((p) => p.tokenAddress);
};

/**
 * Safe JSON stringify that handles circular references and special types
 */
export const safeStringify = (value: any): string => {
  try {
    const seen = new Set<any>();
    return JSON.stringify(
      value,
      (_key, val) => {
        if (typeof val === 'function') return '[Function]';
        if (typeof val === 'symbol') return String(val);
        if (typeof val === 'object' && val !== null) {
          if (seen.has(val)) return '[Circular]';
          if (val instanceof Map) return { __type: 'Map', size: val.size };
          if (val instanceof Set) return { __type: 'Set', size: val.size };
          seen.add(val);
        }
        return val;
      },
      2
    );
  } catch {
    return '"<unserializable>"';
  }
};

/**
 * Get the appropriate icon component for upload status
 */
export const getStatusIcon = (status?: UploadStatus): React.ReactNode => {
  switch (status) {
    case 'completed':
      return <CheckCircle className="h-5 w-5 text-green-600" />;
    case 'failed':
      return <XCircle className="h-5 w-5 text-red-600" />;
    case 'uploading':
      return <RefreshCw className="h-5 w-5 animate-spin text-blue-600" />;
    default:
      return <Clock className="h-5 w-5 text-gray-400" />;
  }
};

/**
 * Get the appropriate CSS classes for upload status background
 */
export const getStatusColor = (status?: UploadStatus): string => {
  switch (status) {
    case 'completed':
      return 'bg-green-50 border-green-200';
    case 'failed':
      return 'bg-red-50 border-red-200';
    case 'uploading':
      return 'bg-blue-50 border-blue-200';
    default:
      return 'bg-gray-50 border-border';
  }
};

/**
 * Get human-readable text for upload status
 */
export const getStatusText = (status?: UploadStatus): string => {
  switch (status) {
    case 'completed':
      return 'Uploaded';
    case 'failed':
      return 'Failed';
    case 'uploading':
      return 'Uploading...';
    default:
      return 'Pending';
  }
};

/**
 * Build explorer URL for different chains
 */
export const getExplorerUrl = (
  chain: ChainType | null | undefined,
  type: 'contract' | 'tx',
  id: string
): string => {
  switch (chain) {
    case 'stellar':
      return type === 'contract'
        ? `https://stellar.expert/explorer/testnet/contract/${id}`
        : `https://stellar.expert/explorer/testnet/tx/${id}`;
    case 'evm':
      // Note: This is a generic fallback. Individual EVM chains should override with their own explorer
      return type === 'contract'
        ? `https://etherscan.io/address/${id}`
        : `https://etherscan.io/tx/${id}`;
    case 'solana':
      return type === 'contract'
        ? `https://explorer.solana.com/address/${id}?cluster=devnet`
        : `https://explorer.solana.com/tx/${id}?cluster=devnet`;
    default:
      return '#';
  }
};

/**
 * Format place number to ordinal string (1st, 2nd, 3rd, etc.)
 */
export const formatPlaceOrdinal = (place: number): string => {
  if (place === 1) return '1st';
  if (place === 2) return '2nd';
  if (place === 3) return '3rd';
  return `${place}th`;
};

/**
 * Truncate hash for display (e.g., "0x1234...5678")
 */
export const truncateHash = (hash: string, startChars = 10, endChars = 8): string => {
  if (hash.length <= startChars + endChars) return hash;
  return `${hash.substring(0, startChars)}...${hash.substring(hash.length - endChars)}`;
};

/**
 * Copy text to clipboard with error handling
 */
export const copyToClipboard = async (text: string): Promise<boolean> => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (error) {
    console.error('Failed to copy to clipboard:', error);
    return false;
  }
};