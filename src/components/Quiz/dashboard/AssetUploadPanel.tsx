import React, { useState } from 'react';
import { useQuizConfig } from '../hooks/useQuizConfig';
import { 
  Upload, 
  CheckCircle, 
  XCircle, 
  Clock, 
  AlertTriangle,
  ExternalLink,
  Copy,
  Info,
  Wallet,
  Trophy,
  ArrowRight,
  RefreshCw
} from 'lucide-react';

const AssetUploadPanel: React.FC = () => {
  const { config, setFullConfig } = useQuizConfig();
  const [copying, setCopying] = useState<string | null>(null);

  const prizes = config?.prizes || [];
  const contractAddress = config?.web3ContractAddress;
  const assetPrizes = prizes.filter(prize => prize.tokenAddress);

  // Calculate upload statistics
  const totalAssets = assetPrizes.length;
  const completedUploads = assetPrizes.filter(p => p.uploadStatus === 'completed').length;
  const failedUploads = assetPrizes.filter(p => p.uploadStatus === 'failed').length;
  const pendingUploads = assetPrizes.filter(p => !p.uploadStatus || p.uploadStatus === 'pending').length;
  const uploading = assetPrizes.filter(p => p.uploadStatus === 'uploading').length;

  const allUploadsComplete = totalAssets > 0 && completedUploads === totalAssets;

  // Update prize upload status
  const updatePrizeStatus = (prizeIndex: number, status: 'pending' | 'uploading' | 'completed' | 'failed', transactionHash?: string) => {
    const updatedPrizes = [...prizes];
    const assetIndex = prizes.findIndex(p => p === assetPrizes[prizeIndex]);
    
    if (assetIndex !== -1) {
      updatedPrizes[assetIndex] = {
        ...updatedPrizes[assetIndex],
        uploadStatus: status,
        transactionHash: status === 'completed' ? transactionHash : undefined,
        uploadedAt: status === 'completed' ? new Date().toISOString() : undefined
      };

      setFullConfig({
        ...config,
        prizes: updatedPrizes
      });
    }
  };

  // Mock upload function (replace with actual Web3 logic later)
  const handleUploadAsset = async (prizeIndex: number) => {
    try {
      updatePrizeStatus(prizeIndex, 'uploading');
      
      // Simulate upload delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Mock transaction hash
      const mockTxHash = `0x${Math.random().toString(16).substring(2, 66)}`;
      
      // Simulate success/failure (90% success rate for demo)
      if (Math.random() > 0.1) {
        updatePrizeStatus(prizeIndex, 'completed', mockTxHash);
      } else {
        updatePrizeStatus(prizeIndex, 'failed');
      }
    } catch (error) {
      updatePrizeStatus(prizeIndex, 'failed');
    }
  };

  const handleRetryUpload = (prizeIndex: number) => {
    updatePrizeStatus(prizeIndex, 'pending');
  };

  const copyToClipboard = async (text: string, type: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopying(type);
      setTimeout(() => setCopying(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const getStatusIcon = (status: 'pending' | 'uploading' | 'completed' | 'failed' | undefined) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'failed':
        return <XCircle className="w-5 h-5 text-red-600" />;
      case 'uploading':
        return <RefreshCw className="w-5 h-5 text-blue-600 animate-spin" />;
      default:
        return <Clock className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusColor = (status: 'pending' | 'uploading' | 'completed' | 'failed' | undefined) => {
    switch (status) {
      case 'completed':
        return 'bg-green-50 border-green-200';
      case 'failed':
        return 'bg-red-50 border-red-200';
      case 'uploading':
        return 'bg-blue-50 border-blue-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  const getStatusText = (status: 'pending' | 'uploading' | 'completed' | 'failed' | undefined) => {
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

  if (totalAssets === 0) {
    return (
      <div className="text-center py-12">
        <Trophy className="w-16 h-16 mx-auto mb-4 text-gray-300" />
        <h3 className="text-lg font-semibold text-gray-600 mb-2">No Digital Assets to Upload</h3>
        <p className="text-gray-500 max-w-md mx-auto">
          No prizes with token addresses were configured. Digital assets will appear here when prizes include token contract addresses.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Upload Status Overview */}
      <div className="bg-gradient-to-r from-purple-50 to-indigo-50 p-6 rounded-xl border-2 border-purple-200">
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-12 h-12 rounded-full bg-purple-600 flex items-center justify-center">
            <Upload className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-purple-800">Asset Upload Status</h2>
            <p className="text-purple-600">Upload your digital prizes to the smart contract</p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-3 bg-white rounded-lg border border-purple-200">
            <div className="text-2xl font-bold text-gray-900">{totalAssets}</div>
            <div className="text-sm text-gray-600">Total Assets</div>
          </div>
          <div className="text-center p-3 bg-white rounded-lg border border-green-200">
            <div className="text-2xl font-bold text-green-600">{completedUploads}</div>
            <div className="text-sm text-gray-600">Completed</div>
          </div>
          <div className="text-center p-3 bg-white rounded-lg border border-yellow-200">
            <div className="text-2xl font-bold text-yellow-600">{pendingUploads + uploading}</div>
            <div className="text-sm text-gray-600">Pending</div>
          </div>
          <div className="text-center p-3 bg-white rounded-lg border border-red-200">
            <div className="text-2xl font-bold text-red-600">{failedUploads}</div>
            <div className="text-sm text-gray-600">Failed</div>
          </div>
        </div>

        {allUploadsComplete && (
          <div className="mt-4 p-3 bg-green-100 border border-green-300 rounded-lg">
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <span className="font-medium text-green-800">All assets uploaded successfully!</span>
            </div>
            <p className="text-sm text-green-700 mt-1">Your quiz is ready to launch.</p>
          </div>
        )}
      </div>

      {/* Contract Information */}
      <div className="bg-white border-2 border-gray-200 rounded-xl p-6">
        <div className="flex items-center space-x-3 mb-4">
          <Wallet className="w-6 h-6 text-indigo-600" />
          <h3 className="text-lg font-semibold text-gray-900">Smart Contract Information</h3>
        </div>

        {contractAddress ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-indigo-50 rounded-lg border border-indigo-200">
              <div>
                <div className="text-sm font-medium text-indigo-800">Contract Address</div>
                <div className="font-mono text-sm text-indigo-700">{contractAddress}</div>
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => copyToClipboard(contractAddress, 'contract')}
                  className="p-2 text-indigo-600 hover:bg-indigo-100 rounded-lg transition-colors"
                  title="Copy contract address"
                >
                  {copying === 'contract' ? (
                    <CheckCircle className="w-4 h-4 text-green-600" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
                <button
                  onClick={() => window.open(`https://stellar.expert/explorer/public/contract/${contractAddress}`, '_blank')}
                  className="p-2 text-indigo-600 hover:bg-indigo-100 rounded-lg transition-colors"
                  title="View on Stellar Explorer"
                >
                  <ExternalLink className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="flex items-start space-x-2">
                <Info className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-blue-800">
                  <p className="font-medium mb-1">Upload Instructions</p>
                  <p>Each asset will be transferred to the smart contract individually. Make sure you have sufficient wallet balance for transaction fees.</p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="w-5 h-5 text-yellow-600" />
              <span className="font-medium text-yellow-800">Contract address will be provided</span>
            </div>
            <p className="text-sm text-yellow-700 mt-1">
              The smart contract is being deployed. You'll be able to upload assets once the contract address is available.
            </p>
          </div>
        )}
      </div>

      {/* Asset Upload List */}
      <div className="bg-white border-2 border-gray-200 rounded-xl p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <Trophy className="w-6 h-6 text-yellow-600" />
            <h3 className="text-lg font-semibold text-gray-900">Digital Prize Assets</h3>
          </div>
          <div className="text-sm text-gray-500">
            {completedUploads} of {totalAssets} uploaded
          </div>
        </div>

        <div className="space-y-4">
          {assetPrizes.map((prize, index) => (
            <div
              key={index}
              className={`border-2 rounded-xl p-4 transition-all duration-200 ${getStatusColor(prize.uploadStatus)}`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <div className="flex items-center space-x-2">
                      <span className="px-2 py-1 bg-indigo-100 text-indigo-800 text-xs font-medium rounded-full">
                        {prize.place === 1 ? '1st' : prize.place === 2 ? '2nd' : prize.place === 3 ? '3rd' : `${prize.place}th`} Place
                      </span>
                      {getStatusIcon(prize.uploadStatus)}
                      <span className="text-sm font-medium text-gray-700">
                        {getStatusText(prize.uploadStatus)}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div>
                      <div className="text-sm font-medium text-gray-700">Description</div>
                      <div className="text-gray-600">{prize.description}</div>
                    </div>

                    {prize.tokenAddress && (
                      <div>
                        <div className="text-sm font-medium text-gray-700">Token Address</div>
                        <div className="flex items-center space-x-2">
                          <code className="text-xs bg-gray-100 px-2 py-1 rounded font-mono">
                            {prize.tokenAddress}
                          </code>
                          <button
                            onClick={() => copyToClipboard(prize.tokenAddress!, `token-${index}`)}
                            className="p-1 text-gray-500 hover:text-gray-700 transition-colors"
                          >
                            {copying === `token-${index}` ? (
                              <CheckCircle className="w-3 h-3 text-green-600" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                        </div>
                      </div>
                    )}

                    {prize.sponsor && (
                      <div>
                        <div className="text-sm font-medium text-gray-700">Sponsor</div>
                        <div className="text-gray-600">{prize.sponsor}</div>
                      </div>
                    )}

                    {prize.transactionHash && (
                      <div>
                        <div className="text-sm font-medium text-gray-700">Transaction Hash</div>
                        <div className="flex items-center space-x-2">
                          <code className="text-xs bg-green-100 px-2 py-1 rounded font-mono text-green-800">
                            {prize.transactionHash.substring(0, 10)}...{prize.transactionHash.substring(-8)}
                          </code>
                          <button
                            onClick={() => window.open(`https://stellar.expert/explorer/public/tx/${prize.transactionHash}`, '_blank')}
                            className="p-1 text-green-600 hover:text-green-800 transition-colors"
                          >
                            <ExternalLink className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    )}

                    {prize.uploadedAt && (
                      <div>
                        <div className="text-sm font-medium text-gray-700">Uploaded At</div>
                        <div className="text-xs text-gray-500">
                          {new Date(prize.uploadedAt).toLocaleString()}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="ml-4 flex flex-col space-y-2">
                  {prize.uploadStatus === 'completed' ? (
                    <div className="flex items-center space-x-2 text-green-600">
                      <CheckCircle className="w-4 h-4" />
                      <span className="text-sm font-medium">Uploaded</span>
                    </div>
                  ) : prize.uploadStatus === 'uploading' ? (
                    <div className="flex items-center space-x-2 text-blue-600">
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span className="text-sm">Uploading...</span>
                    </div>
                  ) : prize.uploadStatus === 'failed' ? (
                    <button
                      onClick={() => handleRetryUpload(index)}
                      disabled={!contractAddress}
                      className="flex items-center space-x-2 px-3 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <RefreshCw className="w-4 h-4" />
                      <span className="text-sm">Retry</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => handleUploadAsset(index)}
                      disabled={!contractAddress || ['uploading', 'completed'].includes(prize.uploadStatus || 'pending')}
                      className="flex items-center space-x-2 px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Upload className="w-4 h-4" />
                      <span className="text-sm">Upload</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Bulk Actions */}
        {contractAddress && pendingUploads > 0 && (
          <div className="mt-6 pt-4 border-t border-gray-200">
            <button
              onClick={() => {
                assetPrizes.forEach((prize, index) => {
                  if (!prize.uploadStatus || prize.uploadStatus === 'pending' || prize.uploadStatus === 'failed') {
                    handleUploadAsset(index);
                  }
                });
              }}
              disabled={uploading > 0}
              className="flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Upload className="w-4 h-4" />
              <span>Upload All Remaining Assets</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Help Information */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
        <div className="flex items-start space-x-2">
          <Info className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-amber-800">
            <p className="font-medium mb-1">Important Notes</p>
            <ul className="space-y-1 text-xs">
              <li>• Each asset transfer requires a separate blockchain transaction</li>
              <li>• Ensure you have sufficient balance for transaction fees</li>
              <li>• Assets will be held in escrow until the quiz ends</li>
              <li>• Failed uploads can be retried at any time</li>
              <li>• All assets must be uploaded before launching the quiz</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AssetUploadPanel;