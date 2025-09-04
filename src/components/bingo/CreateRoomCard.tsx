//src/components/CreateRoomCard.tsx
import { useState, type FC } from 'react';
import ConfirmRoomModal from './ConfirmRoomModal';
import { Dices, Users, Wallet, Gamepad2, Info, ArrowRight } from 'lucide-react';
import { useAppKit, useAppKitAccount } from '@reown/appkit/react';
import { useSupportedNetworks } from './hooks/useSupportedNetworks';
import type { SupportedNetwork } from './hooks/useSupportedNetworks';
import MintUSDCButton from '../MintUSDCButton';
import { saveRoomCreationData } from './utils/localStorageUtils';
import { chainInfo } from './constants/contractFactoryAddresses'; // Import chainInfo



interface CreateRoomCardProps {
  onCreateRoom: (roomData: {
    playerName: string;
    entryFee: string;
    chain: number;
    walletAddress: string;
    roomId: string;
    contractAddress: string;
    namespace: string;
  }) => void;
  isGenerating: boolean;
  roomId: string;
}

// List of testnet chain IDs (EVM only, since minting is EVM-specific)
const TESTNET_CHAIN_IDS = [
  '11155111', // Sepolia
  '84532', // Base Sepolia
  '421614', // Arbitrum Sepolia
  '43113', // Avalanche Fuji
  '11155420', // Optimism Sepolia
  '1328', // Sei Devnet
  '8080', // BOB Sepolia
  '168587773', // Blast Sepolia
];

const CreateRoomCard: FC<CreateRoomCardProps> = ({ onCreateRoom, isGenerating, roomId }) => {
  const [createName, setCreateName] = useState('');
  const [entryFee, setEntryFee] = useState('');
  const [selectedChain, setSelectedChain] = useState<string>('');
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [solanaWarning, setSolanaWarning] = useState(false);

  const { open } = useAppKit();
  const { address: eip155Address, isConnected: isEip155Connected } = useAppKitAccount({ namespace: 'eip155' });
  const { address: solanaAddress, isConnected: isSolanaConnected } = useAppKitAccount({ namespace: 'solana' });
  const { supportedNetworks, currentNetwork, switchNetwork } = useSupportedNetworks();

  const activeChainName = currentNetwork?.name || 'Unknown';
  const isConnected = isEip155Connected || isSolanaConnected;
  const address = currentNetwork?.namespace === 'solana' ? solanaAddress : eip155Address;

  const handleChainChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newChainId = e.target.value;
    setSelectedChain(newChainId);

    const newNetwork: SupportedNetwork | undefined = supportedNetworks.find((n) => String(n.id) === newChainId);
    const isSolana = newNetwork?.namespace === 'solana';
    setSolanaWarning(isSolana);

    if (newChainId && String(newChainId) !== String(currentNetwork?.id)) {
      try {
        console.log('Attempting to switch to ID:', newChainId, 'Namespace:', newNetwork?.namespace);
        if (isSolana && !isSolanaConnected) {
          await open({ view: 'Connect', namespace: 'solana' });
        } else if (!isSolana && !isEip155Connected) {
          await open({ view: 'Connect', namespace: 'eip155' });
        }
        console.log('🧪 Trying to switch to chain:', newChainId, 'Resolved as:', newNetwork?.name);

        await switchNetwork(newChainId);
      } catch (err) {
        console.error('Failed to switch chain:', err);
        const networkName = newNetwork?.name || 'Unknown';
        alert(`Could not switch to ${networkName}. Please try again or switch manually in your wallet.`);
      }
    }
  };

  const formReady = createName.trim() !== '' && entryFee !== '' && selectedChain !== '' && isConnected;

const handleConfirm = async (walletAddress: string, contractAddress: string) => {
  if (!address || selectedChain === '') return;

  const selectedNetwork = supportedNetworks.find((n) => String(n.id) === selectedChain);
  const namespace = selectedNetwork?.namespace || 'eip155';

  // ✅ Don't treat Solana differently here — let ConfirmRoomModal handle it
  onCreateRoom({
    playerName: createName,
    entryFee,
    chain: Number(selectedChain),
    walletAddress,
    roomId,
    contractAddress,
    namespace,
  });

  saveRoomCreationData({
    isCreator: true,
    playerName: createName,
    entryFee,
    chain: Number(selectedChain),
    roomId,
    walletAddress,
    contractAddress,
    namespace,
  });

  setShowConfirmModal(false);
};
  

  console.log('🔍 currentNetwork:', currentNetwork);
if (currentNetwork?.namespace === 'solana') {
  console.log('📡 Solana network ID:', currentNetwork.id); // Should be 'solanaDevnet' or similar
}



  // Check if the selected chain is a testnet with a USDC address
  const isTestnetWithUSDC = selectedChain && TESTNET_CHAIN_IDS.includes(selectedChain) && !!chainInfo[selectedChain]?.usdcAddress;

  return (
    <div className="bg-muted transform overflow-hidden rounded-2xl shadow-xl transition hover:-translate-y-1 hover:shadow-2xl">
      <div className="h-2 bg-gradient-to-r from-indigo-500 to-purple-500" />
      <div className="p-8">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-indigo-100">
          <Dices className="h-8 w-8 text-indigo-600" />
        </div>

        <h2 className="text-fg mb-6 text-center text-2xl font-bold">Create Bingo Event</h2>

        <div className="space-y-4">
          {!isConnected ? (
            <div className="text-center">
              <button
                type="button"
                onClick={() => open({ view: 'Connect', namespace: currentNetwork?.namespace || 'eip155' })}
                className="rounded-xl bg-indigo-600 px-4 py-2 font-medium text-white transition hover:bg-indigo-700"
              >
                Connect Wallet
              </button>
              <p className="mt-2 text-sm text-red-500">Wallet required to create an event</p>
            </div>
          ) : (
            <div className="text-center">
              <span className="inline-block rounded-full bg-green-100 px-3 py-1 text-sm text-green-800">
                ✅ Connected to {activeChainName}
              </span>
            </div>
          )}

          <div className="relative">
            <input
              type="text"
              value={createName}
              onChange={(e) => setCreateName(e.target.value)}
              placeholder="Enter your name"
              className="border-border w-full rounded-xl border-2 px-4 py-3 pl-10 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
              maxLength={20}
            />
            <Users className="absolute left-3 top-3.5 h-5 w-5 text-gray-400" />
          </div>

          <div className="relative">
            <input
              type="number"
              value={entryFee}
              onChange={(e) => setEntryFee(e.target.value)}
              placeholder="Entry Fee (USDC)"
              className="border-border w-full rounded-xl border-2 px-4 py-3 pl-10 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
              min="0"
              step="0.001"
            />
            <Wallet className="absolute left-3 top-3.5 h-5 w-5 text-gray-400" />
          </div>

          <div className="relative">
            <select
              value={selectedChain}
              onChange={handleChainChange}
              className="border-border w-full rounded-xl border-2 px-4 py-3 pl-10 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
              aria-label="Select Blockchain Network"
            >
              <option value="">Select Chain</option>
              {supportedNetworks.map((network) => (
                <option key={network.id} value={network.id}>
                  {network.name}
                </option>
              ))}
            </select>
            <Gamepad2 className="absolute left-3 top-3.5 h-5 w-5 text-gray-400" />
            {solanaWarning && (
              <p className="mt-2 text-sm text-red-500">Solana is not yet supported for room creation.</p>
            )}
          </div>

          <button
            type="button"
            onClick={() => setShowConfirmModal(true)}
            disabled={isGenerating || !formReady}
            className="flex w-full transform items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600
                       to-purple-600 px-6 py-4 font-semibold
                       text-white shadow-md transition hover:from-indigo-700 hover:to-purple-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isGenerating ? (
              <div className="h-6 w-6 animate-spin rounded-full border-4 border-white border-t-transparent" />
            ) : (
              <>
                Create Bingo Event
                <ArrowRight className="h-5 w-5" />
              </>
            )}
          </button>

          {isTestnetWithUSDC && <MintUSDCButton chainId={selectedChain} />}

          <div className="text-fg/60 flex items-center justify-center gap-2 text-sm">
            <Info className="h-4 w-4" />
            <p>Free setup & Hosting- Just a few cent in transaction fees required</p>
          </div>
        </div>
      </div>

      <ConfirmRoomModal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        onConfirm={handleConfirm}
        hostName={createName}
        entryFee={entryFee}
        selectedChain={selectedChain}
      />
    </div>
  );
};

export default CreateRoomCard;






