// src/components/chains/WalletConnectionButton.tsx

import React from 'react';
import { Wallet, RefreshCw, Zap, AlertCircle } from 'lucide-react';
import { useStellarWalletContext } from '../../chains/stellar/StellarWalletProvider';
import type { SupportedChain } from '../../chains/types';

interface WalletConnectionButtonProps {
  chain: SupportedChain;
  variant?: 'default' | 'compact' | 'status-only';
  onConnectionChange?: (connected: boolean) => void;
  className?: string;
}

export const WalletConnectionButton: React.FC<WalletConnectionButtonProps> = ({
  chain,
  variant = 'default',
  onConnectionChange,
  className = ''
}) => {
  // Only handle Stellar for now - check if we're in Stellar provider context
  let stellarWallet = null;
  let hasContext = false;
  
  try {
    stellarWallet = useStellarWalletContext();
    hasContext = true;
  } catch (error) {
    // Not in Stellar provider context
    hasContext = false;
  }
  
  if (chain !== 'stellar') {
    return (
      <div className={`text-fg/60 text-sm ${className}`}>
        {chain} wallet support coming soon
      </div>
    );
  }

  if (!hasContext) {
    return (
      <div className={`rounded-lg border border-orange-200 bg-orange-50 p-3 text-sm text-orange-600 ${className}`}>
        <div className="flex items-center space-x-2">
          <AlertCircle className="h-4 w-4" />
          <span>Stellar wallet provider not available in this context</span>
        </div>
      </div>
    );
  }

  const {
    wallet,
    connect,
    disconnect
  } = stellarWallet!;

  const handleConnect = async () => {
    try {
      const result = await connect();
      if (result.success) {
        onConnectionChange?.(true);
      }
    } catch (error) {
      console.error('Connection failed:', error);
    }
  };

  const handleDisconnect = async () => {
    try {
      await disconnect();
      onConnectionChange?.(false);
    } catch (error) {
      console.error('Disconnection failed:', error);
    }
  };

  const handleRefresh = async () => {
    try {
      // Simple reconnection attempt
      await disconnect();
      setTimeout(async () => {
        const result = await connect();
        onConnectionChange?.(result.success);
      }, 1000);
    } catch (error) {
      console.error('Refresh failed:', error);
    }
  };

  // Status-only variant
  if (variant === 'status-only') {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        <div className={`h-2 w-2 rounded-full ${
          wallet.isConnected ? 'bg-green-500' : 
          wallet.isConnecting ? 'animate-pulse bg-yellow-500' : 
          wallet.error ? 'bg-red-500' : 'bg-gray-300'
        }`} />
        <span className="text-sm font-medium">
          {wallet.isConnected ? `Stellar wallet connected` :
           wallet.isConnecting ? 'Connecting...' :
           wallet.error ? 'Connection error' :
           'Wallet not connected'}
        </span>
        {wallet.isConnected && (
          <button
            onClick={handleRefresh}
            className="text-xs text-blue-600 hover:text-blue-700"
            title="Refresh connection"
          >
            <RefreshCw className="h-3 w-3" />
          </button>
        )}
      </div>
    );
  }

  // Compact variant
  if (variant === 'compact') {
    if (wallet.isConnected) {
      return (
        <div className={`flex items-center space-x-2 ${className}`}>
          <div className="flex items-center space-x-1 rounded bg-green-50 px-2 py-1 text-green-700">
            <Zap className="h-3 w-3" />
            <span className="text-xs font-medium">Connected</span>
          </div>
          <button
            onClick={handleDisconnect}
            disabled={wallet.isDisconnecting}
            className="text-xs text-red-600 hover:text-red-700 disabled:opacity-50"
          >
            Disconnect
          </button>
        </div>
      );
    }

    return (
      <button
        onClick={handleConnect}
        disabled={wallet.isConnecting}
        className={`flex items-center space-x-1 rounded bg-blue-600 px-3 py-1 text-xs text-white hover:bg-blue-700 disabled:opacity-50 ${className}`}
      >
        {wallet.isConnecting ? (
          <>
            <div className="h-3 w-3 animate-spin rounded-full border border-white border-t-transparent" />
            <span>Connecting...</span>
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

  // Default variant - full button
  if (wallet.isConnected) {
    return (
      <div className={`space-y-2 ${className}`}>
        <div className="flex items-center justify-between rounded-lg border border-green-200 bg-green-50 p-3">
          <div className="flex items-center space-x-2">
            <div className="h-2 w-2 rounded-full bg-green-500"></div>
            <div>
              <div className="text-sm font-medium text-green-800">
                Stellar Wallet Connected
              </div>
              <div className="font-mono text-xs text-green-600">
                {stellarWallet!.formatAddress(wallet.address || '')}
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={handleRefresh}
              disabled={wallet.isConnecting}
              className="p-1 text-green-600 hover:text-green-700 disabled:opacity-50"
              title="Refresh connection"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
            <button
              onClick={handleDisconnect}
              disabled={wallet.isDisconnecting}
              className="rounded border border-red-200 px-3 py-1 text-sm text-red-600 hover:bg-red-50 hover:text-red-700 disabled:opacity-50"
            >
              {wallet.isDisconnecting ? 'Disconnecting...' : 'Disconnect'}
            </button>
          </div>
        </div>
        
        {wallet.error && (
          <div className="flex items-start space-x-2 rounded border border-red-200 bg-red-50 p-2 text-sm text-red-700">
            <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <div>
              <div className="font-medium">Connection Issue</div>
              <div className="text-xs">{wallet.error.message}</div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Not connected - show connect button
  return (
    <button
      onClick={handleConnect}
      disabled={wallet.isConnecting}
      className={`flex w-full items-center justify-center space-x-2 rounded-lg bg-purple-600 px-4 py-3 font-medium text-white hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
    >
      {wallet.isConnecting ? (
        <>
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
          <span>Connecting Stellar Wallet...</span>
        </>
      ) : (
        <>
          <Wallet className="h-4 w-4" />
          <span>Connect Stellar Wallet</span>
        </>
      )}
    </button>
  );
};

export default WalletConnectionButton;