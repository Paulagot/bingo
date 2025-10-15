// src/components/chains/WalletConnectionButton.tsx
import React from 'react';
import { Wallet, RefreshCw, Zap, AlertCircle } from 'lucide-react';
import { useWalletActions } from '../../hooks/useWalletActions';
import { useQuizChainIntegration } from '../../hooks/useQuizChainIntegration';
import type { SupportedChain } from '../../chains/types';

interface Props {
  variant?: 'default' | 'compact' | 'status-only';
  className?: string;
  onConnectionChange?: (connected: boolean) => void;
}

const WalletConnectionButton: React.FC<Props> = ({
  variant = 'default',
  className = '',
  onConnectionChange,
}) => {
  const { selectedChain, isWalletConnected, isWalletConnecting, walletError, getChainDisplayName, getFormattedAddress } =
    useQuizChainIntegration();
  const { connect, disconnect } = useWalletActions();

  const chainName = getChainDisplayName(selectedChain as SupportedChain | null);

  const handleConnect = async () => {
    const result = await connect();
    onConnectionChange?.(!!result?.success);
  };

  const handleDisconnect = async () => {
    await disconnect();
    onConnectionChange?.(false);
  };

  const handleRefresh = async () => {
    await disconnect();
    setTimeout(async () => {
      const result = await connect();
      onConnectionChange?.(!!result?.success);
    }, 300);
  };

  // Status-only
  if (variant === 'status-only') {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        <div
          className={`h-2 w-2 rounded-full ${
            isWalletConnected ? 'bg-green-500' :
            isWalletConnecting ? 'animate-pulse bg-yellow-500' :
            walletError ? 'bg-red-500' : 'bg-gray-300'
          }`}
        />
        <span className="text-sm font-medium">
          {isWalletConnected ? `${chainName} wallet connected` :
           isWalletConnecting ? 'Connecting…' :
           walletError ? 'Connection error' :
           'Wallet not connected'}
        </span>
        {isWalletConnected && (
          <button onClick={handleRefresh} className="text-xs text-blue-600 hover:text-blue-700" title="Refresh connection">
            <RefreshCw className="h-3 w-3" />
          </button>
        )}
      </div>
    );
  }

  // Compact
  if (variant === 'compact') {
    if (isWalletConnected) {
      return (
        <div className={`flex items-center space-x-2 ${className}`}>
          <div className="flex items-center space-x-1 rounded bg-green-50 px-2 py-1 text-green-700">
            <Zap className="h-3 w-3" />
            <span className="text-xs font-medium">Connected</span>
          </div>
          <button onClick={handleDisconnect} className="text-xs text-red-600 hover:text-red-700">
            Disconnect
          </button>
        </div>
      );
    }
    return (
      <button
        onClick={handleConnect}
        disabled={isWalletConnecting || !selectedChain}
        className={`flex items-center space-x-1 rounded bg-blue-600 px-3 py-1 text-xs text-white hover:bg-blue-700 disabled:opacity-50 ${className}`}
      >
        {isWalletConnecting ? (
          <>
            <div className="h-3 w-3 animate-spin rounded-full border border-white border-t-transparent" />
            <span>Connecting…</span>
          </>
        ) : (
          <>
            <Wallet className="h-3 w-3" />
            <span>Connect</span>
          </>
        )}
      </button>
    );
  }

  // Default
  if (isWalletConnected) {
    return (
      <div className={`space-y-2 ${className}`}>
        <div className="flex items-center justify-between rounded-lg border border-green-200 bg-green-50 p-3">
          <div className="flex items-center space-x-2">
            <div className="h-2 w-2 rounded-full bg-green-500" />
            <div>
              <div className="text-sm font-medium text-green-800">
                {chainName} Wallet Connected
              </div>
              <div className="font-mono text-xs text-green-600">
                {getFormattedAddress(true)}
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button onClick={handleRefresh} className="p-1 text-green-600 hover:text-green-700" title="Refresh connection">
              <RefreshCw className="h-4 w-4" />
            </button>
            <button
              onClick={handleDisconnect}
              className="rounded border border-red-200 px-3 py-1 text-sm text-red-600 hover:bg-red-50 hover:text-red-700"
            >
              Disconnect
            </button>
          </div>
        </div>

        {walletError && (
          <div className="flex items-start space-x-2 rounded border border-red-200 bg-red-50 p-2 text-sm text-red-700">
            <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <div>
              <div className="font-medium">Connection Issue</div>
              <div className="text-xs">{walletError.message}</div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Not connected
  return (
    <button
      onClick={handleConnect}
      disabled={isWalletConnecting || !selectedChain}
      className={`flex w-full items-center justify-center space-x-2 rounded-lg bg-purple-600 px-4 py-3 font-medium text-white hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
    >
      {isWalletConnecting ? (
        <>
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
          <span>Connecting {chainName} Wallet…</span>
        </>
      ) : (
        <>
          <Wallet className="h-4 w-4" />
          <span>Connect {chainName} Wallet</span>
        </>
      )}
    </button>
  );
};

export default WalletConnectionButton;
