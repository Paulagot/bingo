import { useState, useEffect } from 'react';
import { CheckCircle, AlertCircle } from 'lucide-react';
import { useAppKit, useAppKitAccount } from '@reown/appkit/react';
import { useSupportedNetworks } from './hooks/useSupportedNetworks';
import { getExplorerBaseUrl } from './utils/chainHelpers';
import type { SupportedNetwork } from './hooks/useSupportedNetworks';

interface VerifyRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  hostName: string;
  entryFee: string;
  contractAddress: string;
  chainId: string | number;
}

const InfoItem = ({ label, value, className = '' }: { label: string; value: string; className?: string }) => (
  <div className={`rounded-lg bg-gray-50 p-2 ${className}`}>
    <p className="text-fg/60 text-xs">{label}</p>
    <p className="break-all text-sm font-medium">{value}</p>
  </div>
);

const VerifyRoomModal: React.FC<VerifyRoomModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  hostName,
  entryFee,
  contractAddress,
  chainId,
}) => {
  const { open } = useAppKit();
  const { address, isConnected } = useAppKitAccount();
  const { supportedNetworks, currentNetwork, switchNetwork } = useSupportedNetworks();

  const [error, setError] = useState('');
  const [isSwitching, setIsSwitching] = useState(false);

  const isCorrectChain = currentNetwork && String(currentNetwork.id) === String(chainId);
  const targetNetwork: SupportedNetwork | undefined = supportedNetworks.find((n) => String(n.id) === String(chainId));

  useEffect(() => {
    if (!isCorrectChain && targetNetwork) {
      (async () => {
        try {
          setIsSwitching(true);
          await switchNetwork(targetNetwork.id);
          setIsSwitching(false);
        } catch (err) {
          console.error('❌ Failed to switch chain:', err);
          setError(`Failed to switch to ${targetNetwork.name}. Please switch manually.`);
          setIsSwitching(false);
        }
      })();
    }
  }, [isCorrectChain, targetNetwork, switchNetwork]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-muted mx-4 w-full max-w-sm overflow-hidden rounded-xl shadow-lg">
        <div className="p-3">
          <div className="mb-2 flex items-center justify-center">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-100">
              <CheckCircle className="h-4 w-4 text-green-600" />
            </div>
          </div>

          <h3 className="mb-2 text-center text-lg font-bold">Verify Bingo Room</h3>

          <div className="mb-3 space-y-2">
            {error && (
              <div className="flex items-start gap-1 rounded-lg bg-red-50 p-2 text-xs text-red-500">
                <AlertCircle className="mt-0.5 h-3 w-3 flex-shrink-0" />
                <p>{error}</p>
              </div>
            )}
            <InfoItem label="Host Name" value={hostName} />
            <InfoItem label="Entry Fee" value={`${entryFee} USDC`} />
            <InfoItem label="Blockchain Network" value={targetNetwork?.name || 'Unknown'} />
            <InfoItem label="Wallet Address" value={address ? `${address.slice(0, 6)}...${address.slice(-4)}` : 'Not connected'} />
            <InfoItem label="Room Contract" value={`${contractAddress.slice(0, 6)}...${contractAddress.slice(-4)}`} />
            {contractAddress && (
              <a
                href={`${getExplorerBaseUrl(chainId)}/address/${contractAddress}`}
                target="_blank"
                rel="noopener noreferrer"
                className="block text-xs text-indigo-600 underline"
              >
                View on Explorer
              </a>
            )}
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="text-fg/80 flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium transition hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={!isCorrectChain || isSwitching || !isConnected}
              className="flex-1 rounded-lg bg-gradient-to-r from-green-600 to-teal-600 px-3 py-2 text-sm font-medium text-white transition hover:from-green-700 hover:to-teal-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSwitching ? 'Switching...' : 'Pay & Join Room'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VerifyRoomModal;

