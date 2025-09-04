import type React from 'react';
import { useState } from 'react';
import { CheckCircle, AlertCircle } from 'lucide-react';
import { useAppKit, useAppKitAccount } from '@reown/appkit/react';
import { useWriteContract, usePublicClient } from 'wagmi';
import { decodeEventLog } from 'viem';
import { useSupportedNetworks } from './hooks/useSupportedNetworks';
import type { SupportedNetwork } from './hooks/useSupportedNetworks';
import { chainInfo } from './constants/contractFactoryAddresses';
import { checkServerHealth } from './utils/checkServerHealth';
import { CreateSolanaRoom } from './createsolanaroom';


interface ConfirmRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (walletAddress: string, contractAddress: string) => void;
  hostName: string;
  entryFee: string;
  selectedChain: string | number;

}

const InfoItem = ({ label, value, className = '' }: { label: string; value: string; className?: string }) => (
  <div className={`rounded-lg bg-gray-50 p-2 ${className}`}>
    <p className="text-fg/60 text-xs">{label}</p>
    <p className="break-all text-sm font-medium">{value}</p>
  </div>
);

const FACTORY_ABI = [
  {
    inputs: [{ internalType: 'uint256', name: '_entryFee', type: 'uint256' }],
    name: 'createRoom',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: 'address', name: 'host', type: 'address' },
      { indexed: true, internalType: 'address', name: 'room', type: 'address' },
      { indexed: false, internalType: 'uint256', name: 'entryFee', type: 'uint256' },
    ],
    name: 'RoomCreated',
    type: 'event',
  },
];

const ConfirmRoomModal: React.FC<ConfirmRoomModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  hostName,
  entryFee,
  selectedChain,
}) => {
  const { open } = useAppKit();
  const { supportedNetworks } = useSupportedNetworks();
  const { address, isConnected } = useAppKitAccount();
  const { writeContractAsync } = useWriteContract();
  const publicClient = usePublicClient();

  const [isDeploying, setIsDeploying] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [serverHealthy, setServerHealthy] = useState(true);
  const [triggerSolanaRoomCreation, setTriggerSolanaRoomCreation] = useState(false);



  const selectedNetwork: SupportedNetwork | undefined = supportedNetworks.find(
    (n) => String(n.id) === String(selectedChain)
  );

  const factoryAddress = selectedChain
    ? chainInfo[String(selectedChain)]?.factoryAddress
    : undefined;

  const handleConfirm = async () => {
    setError('');
    setStatus('');
    console.log('🚀 handleConfirm called');

    const serverAlive = await checkServerHealth();
    console.log('✅ Server health:', serverAlive);
    if (!serverAlive) {
      setError('🚨 Server unavailable. Try again later.');
      setServerHealthy(false);
      return;
    }
    setServerHealthy(true);

    if (!isConnected || !address) {
      setError('Please connect wallet.');
      return;
    }


    // ✅ Solana logic
if (selectedNetwork?.namespace === 'solana') {
  console.log('🌐 Solana network detected - launching Solana room creation');
  setTriggerSolanaRoomCreation(true); // Show the component
  return;
}

    // ✅ EVM logic
    if (!factoryAddress) {
      setError('Factory address not found.');
      return;
    }

    if (!publicClient) {
      setError('Public client unavailable. Please reload.');
      return;
    }

    setIsDeploying(true);

    try {
      setStatus('Sending transaction...');
      const entryFeeInUSDC = BigInt(Number.parseFloat(entryFee) * 1_000_000);
      console.log('🎯 Entry Fee in USDC:', entryFeeInUSDC.toString());

      const txHash = await writeContractAsync({
        address: factoryAddress as `0x${string}`,
        abi: FACTORY_ABI,
        functionName: 'createRoom',
        args: [entryFeeInUSDC],
      });

      setStatus('Transaction sent. Waiting...');
      const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });

      if (!receipt || receipt.status !== 'success') {
        throw new Error('Transaction failed');
      }

      const log = receipt.logs.find((log) => log.address.toLowerCase() === factoryAddress.toLowerCase());
      if (!log) throw new Error('Event log not found');

      const parsedLog = decodeEventLog({
        abi: FACTORY_ABI,
        eventName: 'RoomCreated',
        data: log.data,
        topics: log.topics,
      });

      let deployedContractAddress: string;
      if (Array.isArray(parsedLog.args)) {
        deployedContractAddress = parsedLog.args[1] as string;
      } else if (parsedLog.args && typeof parsedLog.args === 'object' && 'room' in parsedLog.args) {
        deployedContractAddress = parsedLog.args.room as string;
      } else {
        throw new Error('Event args not found');
      }

      setStatus('Room created successfully!');
      onConfirm(address, deployedContractAddress);
    } catch (err: any) {
      console.error('❌ Contract deployment failed:', err);
      setError(err.message || 'Unknown error');
      setStatus('');
    } finally {
      setIsDeploying(false);
    }
  };

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

          <h3 className="mb-2 text-center text-lg font-bold">Confirm Fundraising Event</h3>

          <div className="mb-3 space-y-2">
            {error && (
              <div className="flex items-start gap-1 rounded-lg bg-red-50 p-2 text-xs text-red-500">
                <AlertCircle className="mt-0.5 h-3 w-3 flex-shrink-0" />
                <p>{error}</p>
              </div>
            )}
            <InfoItem label="Host Name" value={hostName} />
            <InfoItem label="Entry Fee" value={`${entryFee} USDC`} />
            <InfoItem label="Blockchain Network" value={selectedNetwork?.name || 'Unknown'} />
            <InfoItem
              label="Wallet Address"
              value={isConnected ? `${address?.slice(0, 6)}...${address?.slice(-4)}` : 'Not connected'}
            />
            <InfoItem
              label="Contract Address"
              value={factoryAddress ? `${factoryAddress?.slice(0, 6)}...${factoryAddress?.slice(-4)}` : 'No contract available'}
              className={factoryAddress ? '' : 'bg-yellow-50 text-yellow-500'}
            />
            {status && <InfoItem label="Status" value={status} className="bg-blue-50 text-blue-500" />}
          </div>

{triggerSolanaRoomCreation && (
  <CreateSolanaRoom
    entryFee={entryFee}
    roomId={String(Date.now())} // or roomId from props if available
    sendTxId={(txid) => {
      console.log('✅ Solana TX ID:', txid);
      onConfirm(address!, 'solana'); // You may want to pass back room PDA later
    }}
    onSuccess={() => {
      setStatus('Solana room created!');
      setTriggerSolanaRoomCreation(false); // Hide the component
      onClose();
    }}
  />
)}

          {!isConnected && (
            <div className="mb-2">
              <button
                type="button"
                onClick={() => open({ view: 'Connect', namespace: selectedNetwork?.namespace || 'eip155' })}
                className="w-full rounded-lg bg-indigo-500 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-indigo-600"
              >
                Connect Wallet
              </button>
            </div>
          )}

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
              onClick={handleConfirm}
              className="flex-1 rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 px-3 py-2 text-sm font-medium text-white transition hover:from-indigo-700 hover:to-purple-700 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={!isConnected || isDeploying || !selectedChain || !serverHealthy}
            >
              {isDeploying ? 'Creating...' : 'Create Event'}
            </button>

            
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfirmRoomModal;
