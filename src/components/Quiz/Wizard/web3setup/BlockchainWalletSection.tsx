// src/components/Quiz/Wizard/web3setup/BlockchainWalletSection.tsx
import React from "react";
import { Shield, ExternalLink, Wallet, CheckCircle, AlertTriangle } from "lucide-react";

interface Props {
  setupConfig: any;
  launchState: string;
  contractAddress: string | null;
  txHash: string | null;
  explorerUrl: string | null;
  handleWalletConnect: () => void;
  handleWalletDisconnect: () => void;
  isWalletConnected?: boolean;
  walletAddress?: string | null;
  networkName?: string;
  // ✅ ADD THESE NEW PROPS
  isOnCorrectNetwork?: boolean;
  actualNetwork?: string;
  expectedNetwork?: string;
}

const BlockchainWalletSection: React.FC<Props> = ({
  setupConfig,
  contractAddress,
  txHash,
  explorerUrl,
  handleWalletConnect,
  handleWalletDisconnect,
  isWalletConnected = false,
  walletAddress = null,
  networkName,
  // ✅ NEW PROPS
  isOnCorrectNetwork = true,
  actualNetwork,
  expectedNetwork,
}) => {
  const currency = setupConfig.web3Currency || "USDGLO";
  
  const formattedAddress = walletAddress && walletAddress.length > 10
    ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`
    : walletAddress;

  const displayNetworkName = expectedNetwork || networkName || setupConfig.web3Chain || "Blockchain";

  return (
    <div className="rounded-xl border border-purple-200 bg-gradient-to-r from-purple-50 to-indigo-50 p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Shield className="h-5 w-5 text-purple-600" />
          <span className="font-medium text-purple-800">Blockchain Configuration</span>
        </div>
        {isWalletConnected && isOnCorrectNetwork && (
          <CheckCircle className="h-5 w-5 text-green-600" />
        )}
        {isWalletConnected && !isOnCorrectNetwork && (
          <AlertTriangle className="h-5 w-5 text-orange-600" />
        )}
      </div>

      <div className="mb-4 grid grid-cols-2 gap-4 text-sm">
        <div>
          <span className="text-purple-700">Network:</span>
          <span className="ml-2 font-medium text-purple-900">
            {displayNetworkName}
          </span>
        </div>

        <div>
          <span className="text-purple-700">Token:</span>
          <span className="ml-2 font-medium text-purple-900">
            {currency}
          </span>
        </div>

        <div>
          <span className="text-purple-700">Charity:</span>
          <span className="ml-2 font-medium text-purple-900">
            {setupConfig.web3Charity || "Not selected"}
          </span>
        </div>

        <div>
          <span className="text-purple-700">Entry Fee:</span>
          <span className="ml-2 font-medium text-purple-900">
            {setupConfig.entryFee ? `${setupConfig.entryFee} ${currency}` : "Free"}
          </span>
        </div>
      </div>

      {/* ✅ NETWORK MISMATCH WARNING */}
      {isWalletConnected && !isOnCorrectNetwork && (
        <div className="mb-3 rounded-lg border border-orange-200 bg-orange-50 p-3">
          <div className="flex items-start space-x-2">
            <AlertTriangle className="h-5 w-5 text-orange-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-orange-800">
                Wrong Network
              </p>
              <p className="text-xs text-orange-700 mt-1">
                Your wallet is on <strong>{actualNetwork}</strong>, but this quiz requires <strong>{expectedNetwork}</strong>.
                Please switch networks in your wallet.
              </p>
            </div>
          </div>
        </div>
      )}

      {!isWalletConnected ? (
        <div className="mb-3">
          <button
            onClick={handleWalletConnect}
            className="flex w-full items-center justify-center space-x-2 rounded-lg bg-purple-600 px-4 py-3 font-medium text-white hover:bg-purple-700 transition-colors"
          >
            <Wallet className="h-4 w-4" />
            <span>Connect {displayNetworkName} Wallet</span>
          </button>
          <p className="mt-2 text-xs text-purple-600 text-center">
            A modal will open to select your wallet
          </p>
        </div>
      ) : (
        <div className="mb-3 space-y-2">
          <div className={`rounded-lg border p-3 ${
            isOnCorrectNetwork 
              ? 'border-green-200 bg-green-50' 
              : 'border-orange-200 bg-orange-50'
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                {isOnCorrectNetwork ? (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                ) : (
                  <AlertTriangle className="h-4 w-4 text-orange-600" />
                )}
                <span className={`text-sm font-medium ${
                  isOnCorrectNetwork ? 'text-green-800' : 'text-orange-800'
                }`}>
                  {displayNetworkName} Wallet Connected
                </span>
              </div>
            </div>
            {formattedAddress && (
              <p className={`mt-1 text-xs font-mono ${
                isOnCorrectNetwork ? 'text-green-700' : 'text-orange-700'
              }`}>
                {formattedAddress}
              </p>
            )}
          </div>

          <button
            onClick={handleWalletDisconnect}
            className="w-full rounded-lg border border-red-200 bg-white px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
          >
            Disconnect Wallet
          </button>
        </div>
      )}

      {contractAddress && (
        <div className="bg-muted mt-3 rounded-lg border border-purple-200 p-3">
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-purple-700">Smart Contract:</span>
              <span className="font-mono text-xs text-purple-900 break-all">
                {contractAddress}
              </span>
            </div>

            {txHash && (
              <div className="flex items-center justify-between">
                <span className="text-purple-700">Deployment Tx:</span>
                <a
                  href={explorerUrl || "#"}
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
  );
};

export default BlockchainWalletSection;
