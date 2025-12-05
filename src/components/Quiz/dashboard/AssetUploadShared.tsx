// src/components/Quiz/dashboard/AssetUploadShared.tsx
import React, { useState } from 'react';
import {
  Upload,
  CheckCircle,
  AlertTriangle,
  Wallet,
  Info,
  ExternalLink,
  Copy,
} from 'lucide-react';
import { safeStringify } from './AssetUploadUtils';
import type { UploadStatsDisplayProps, ConnectionStatus, ContractInfo } from './AssetUploadTypes';

/**
 * Upload Status Overview Component
 * Displays a grid of statistics about prize upload progress
 */
interface UploadStatusOverviewProps extends UploadStatsDisplayProps {
  chainName: string;
  allUploadsComplete: boolean;
}

export const UploadStatusOverview: React.FC<UploadStatusOverviewProps> = ({
  chainName,
  totalAssets,
  completedUploads,
  failedUploads,
  pendingUploads,
  uploading,
  allUploadsComplete,
}) => {
  return (
    <div className="rounded-xl border-2 border-purple-200 bg-gradient-to-r from-purple-50 to-indigo-50 p-6">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-purple-600">
            <Upload className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-purple-800">Asset Upload Status</h2>
            <p className="text-purple-600">Upload your digital prizes to the {chainName} smart contract</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <div className="bg-muted rounded-lg border border-purple-200 p-3 text-center">
          <div className="text-fg text-2xl font-bold">{totalAssets}</div>
          <div className="text-fg/70 text-sm">Total Assets</div>
        </div>
        <div className="bg-muted rounded-lg border border-green-200 p-3 text-center">
          <div className="text-2xl font-bold text-green-600">{completedUploads}</div>
          <div className="text-fg/70 text-sm">Completed</div>
        </div>
        <div className="bg-muted rounded-lg border border-yellow-200 p-3 text-center">
          <div className="text-2xl font-bold text-yellow-600">{pendingUploads + uploading}</div>
          <div className="text-fg/70 text-sm">Pending</div>
        </div>
        <div className="bg-muted rounded-lg border border-red-200 p-3 text-center">
          <div className="text-2xl font-bold text-red-600">{failedUploads}</div>
          <div className="text-fg/70 text-sm">Failed</div>
        </div>
      </div>

      {allUploadsComplete && (
        <div className="mt-4 rounded-lg border border-green-300 bg-green-100 p-3">
          <div className="flex items-center space-x-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <span className="font-medium text-green-800">All assets uploaded successfully!</span>
          </div>
          <p className="mt-1 text-sm text-green-700">Your quiz is ready to launch.</p>
        </div>
      )}
    </div>
  );
};

/**
 * Connection Status Notices Component
 * Displays warning messages for socket/wallet/contract connection issues
 */
interface ConnectionStatusNoticesProps extends ConnectionStatus {
  chainName: string;
}

export const ConnectionStatusNotices: React.FC<ConnectionStatusNoticesProps> = ({
  isSocketConnected,
  isWalletConnected,
  isContractReady,
  chainName,
}) => {
  return (
    <>
      {!isSocketConnected && (
        <div className="rounded-xl border-2 border-yellow-200 bg-yellow-50 p-4">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="h-5 w-5 text-yellow-600" />
            <span className="font-medium text-yellow-800">Socket Disconnected</span>
          </div>
          <p className="mt-1 text-sm text-yellow-700">Cannot upload assets while disconnected.</p>
        </div>
      )}

      {!isWalletConnected && (
        <div className="rounded-xl border-2 border-red-200 bg-red-50 p-4">
          <div className="flex items-center space-x-2">
            <Wallet className="h-5 w-5 text-red-600" />
            <span className="font-medium text-red-800">{chainName} Wallet Not Connected</span>
          </div>
          <p className="mt-1 text-sm text-red-700">
            Please connect your {chainName} wallet to upload assets.
          </p>
        </div>
      )}

      {!isContractReady && isWalletConnected && (
        <div className="rounded-xl border-2 border-orange-200 bg-orange-50 p-4">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="h-5 w-5 text-orange-600" />
            <span className="font-medium text-orange-800">Contract Not Ready</span>
          </div>
          <p className="mt-1 text-sm text-orange-700">
            {chainName} contract is not ready. Please ensure wallet is connected.
          </p>
        </div>
      )}
    </>
  );
};

/**
 * Contract Information Card Component
 * Displays contract address, room ID, and wallet information with copy/explorer links
 */
interface ContractInfoCardProps extends ContractInfo {
  chainName: string;
  isWalletConnected: boolean;
  additionalInfo?: React.ReactNode;
  onCopyAddress?: (address: string) => Promise<void>;
}

export const ContractInfoCard: React.FC<ContractInfoCardProps> = ({
  chainName,
  contractAddress,
  roomId,
  walletAddress,
  explorerBaseUrl,
  isWalletConnected,
  additionalInfo,
  onCopyAddress,
}) => {
  const [copying, setCopying] = useState<string | null>(null);

  const handleCopy = async (text: string, type: string) => {
    try {
      if (onCopyAddress) {
        await onCopyAddress(text);
      } else {
        await navigator.clipboard.writeText(text);
      }
      setCopying(type);
      setTimeout(() => setCopying(null), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  return (
    <div className="bg-muted border-border rounded-xl border-2 p-6">
      <div className="mb-4 flex items-center space-x-3">
        <Wallet className="h-6 w-6 text-indigo-600" />
        <h3 className="text-fg text-lg font-semibold">{chainName} Smart Contract</h3>
      </div>

      {contractAddress && roomId ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between rounded-lg border border-indigo-200 bg-indigo-50 p-3">
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-indigo-800">Contract Address</div>
              <div className="font-mono text-sm text-indigo-700 truncate">{contractAddress}</div>
            </div>
            <div className="flex space-x-2 ml-2">
              <button
                onClick={() => handleCopy(contractAddress, 'contract')}
                className="rounded-lg p-2 text-indigo-600 transition-colors hover:bg-indigo-100"
                title={copying === 'contract' ? 'Copied!' : 'Copy address'}
              >
                <Copy className="h-4 w-4" />
              </button>
              {explorerBaseUrl && (
                <button
                  onClick={() => window.open(`${explorerBaseUrl}/address/${contractAddress}`, '_blank')}
                  className="rounded-lg p-2 text-indigo-600 transition-colors hover:bg-indigo-100"
                  title="View in explorer"
                >
                  <ExternalLink className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
            <div className="flex items-start space-x-2">
              <Info className="mt-0.5 h-4 w-4 flex-shrink-0 text-blue-600" />
              <div className="text-sm text-blue-800">
                <p className="mb-1 font-medium">Chain: {chainName}</p>
                <p className="truncate">Wallet: {walletAddress || 'Not connected'}</p>
                <p>Status: {isWalletConnected ? 'Ready' : 'Not connected'}</p>
                {additionalInfo}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="h-5 w-5 text-yellow-600" />
            <span className="font-medium text-yellow-800">Contract not available</span>
          </div>
          <p className="mt-1 text-sm text-yellow-700">
            Contract address: {contractAddress || 'Not found'}
            <br />
            Room ID: {roomId || 'Not found'}
            <br />
            Wallet ready: {isWalletConnected ? 'Yes' : 'No'}
          </p>
        </div>
      )}
    </div>
  );
};

/**
 * Debug Info Panel Component
 * Shows development debug information (only visible in development mode)
 */
interface DebugInfoPanelProps {
  data: Record<string, any>;
  show?: boolean;
}

export const DebugInfoPanel: React.FC<DebugInfoPanelProps> = ({ 
  data, 
  show = process.env.NODE_ENV === 'development' 
}) => {
  if (!show) return null;

  return (
    <div className="bg-gray-100 p-4 rounded-lg">
      <h4 className="font-mono text-sm font-bold mb-2">Debug Info:</h4>
      <pre className="text-xs overflow-auto max-h-40">
        {safeStringify(data)}
      </pre>
    </div>
  );
};

/**
 * Empty State Component
 * Displayed when there are no digital asset prizes to upload
 */
interface EmptyStateProps {
  chainName?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ chainName }) => {
  return (
    <div className="py-12 text-center">
      <Upload className="mx-auto mb-4 h-16 w-16 text-gray-300" />
      <h3 className="text-fg/70 mb-2 text-lg font-semibold">No Digital Assets to Upload</h3>
      <p className="text-fg/60 mx-auto max-w-md">
        {chainName 
          ? `No prizes with token addresses were configured for ${chainName}. Digital assets will appear here when prizes include token contract addresses.`
          : 'No prizes with token addresses were configured. Digital assets will appear here when prizes include token contract addresses.'
        }
      </p>
    </div>
  );
};
