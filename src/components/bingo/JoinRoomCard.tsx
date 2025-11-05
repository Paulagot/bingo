import type React from 'react';
import { useState, useEffect } from 'react';
import { Users, Dices, ArrowRight, Wallet } from 'lucide-react';
import { getExplorerBaseUrl, getChainName } from './utils/chainHelpers';
import { saveRoomJoiningData } from './utils/localStorageUtils';
import { useAppKitState } from '@reown/appkit/react';
import { useSupportedNetworks } from './hooks/useSupportedNetworks';
import VerifyRoomModal from './VerifyRoomModal';
import { useRoomVerification } from './hooks/useRoomVerification';

interface JoinRoomCardProps {
  onJoinRoom: (roomData: { playerName: string; roomCode: string }) => Promise<void>;
  isReownConnected: boolean;
  formattedAddress: string;
  paymentStatus: 'idle' | 'pending' | 'success';
  roomVerificationStatus: 'idle' | 'checking' | 'exists' | 'not_exists' | 'error';
  transactionHash: string;
  paymentError: string;
  chainId: string | number;
}

const JoinRoomCard: React.FC<JoinRoomCardProps> = ({
  onJoinRoom,
  isReownConnected,
  formattedAddress,
  paymentStatus,
  roomVerificationStatus,
  transactionHash,
  paymentError,
  chainId,
}) => {
  console.log('🔄 JoinRoomCard rendering with props:', {
    isReownConnected,
    formattedAddress,
    paymentStatus,
    roomVerificationStatus,
    transactionHash,
    paymentError,
    chainId,
  });

  const [joinName, setJoinName] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [joinError, setJoinError] = useState('');
  const [namespace, setNamespace] = useState<string>('eip155');
  const [entryFee, setEntryFee] = useState<string>('0');
  const [hasJoined, setHasJoined] = useState(false); // ✅ NEW
  const [verifiedRoomData, setVerifiedRoomData] = useState<{
    hostName: string;
    entryFee: string;
    contractAddress: string;
    chainId: string | number;
  } | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const { selectedNetworkId } = useAppKitState();
  const { currentNetwork } = useSupportedNetworks();
  const currentChainId = selectedNetworkId?.split(':')[1];

  const { verifyRoom } = useRoomVerification();

  const isWrongChain =
    isReownConnected && currentChainId && chainId && currentChainId !== String(chainId);

  useEffect(() => {
    console.log('💾 JoinRoomCard state updated:', {
      joinName,
      roomCode,
      joinError,
      isWrongChain,
      currentChainId,
      targetChainId: chainId,
    });
  }, [joinName, roomCode, joinError, isWrongChain, currentChainId, chainId]);

  useEffect(() => {
    console.log('🔄 Payment status changed:', paymentStatus);
  }, [paymentStatus]);

  useEffect(() => {
    if (transactionHash) {
      console.log('💰 Transaction hash received:', transactionHash);
    }
  }, [transactionHash]);

  useEffect(() => {
    if (paymentError) {
      console.error('❌ Payment error:', paymentError);
    }
  }, [paymentError]);

  const handleVerifyRoom = async () => {
    console.log('🔍 Verifying room:', roomCode);
    setJoinError('');

    if (!roomCode.trim() || !joinName.trim()) {
      setJoinError('Please enter a name and room code');
      return;
    }

    if (!isReownConnected) {
      setJoinError('Please connect your wallet first');
      return;
    }

    try {
      const { exists, chainId, contractAddress, namespace, entryFee } = await verifyRoom(roomCode.toUpperCase());

      if (!exists || !chainId || !contractAddress) {
        setJoinError('Room not found or invalid');
        return;
      }

      setNamespace(namespace || 'eip155');
      setEntryFee(entryFee || '0');

      setVerifiedRoomData({
        hostName: 'Host', // replace if real name available
        entryFee: entryFee || '0',
        contractAddress,
        chainId,
      });

      setIsModalOpen(true);
    } catch (err) {
      console.error('❌ Room verification failed:', err);
      setJoinError('Verification failed. Please try again.');
    }
  };

  const getJoinButtonText = () => {
    if (paymentStatus === 'pending') {
      return <div className="h-6 w-6 animate-spin rounded-full border-4 border-white border-t-transparent" />;
    }
    return (
      <>
        Verify Room
        <ArrowRight className="h-5 w-5" />
      </>
    );
  };

  return (
    <div className="bg-muted transform overflow-hidden rounded-2xl shadow-xl transition hover:-translate-y-1 hover:shadow-2xl">
      <div className="h-2 bg-gradient-to-r from-green-500 to-teal-500" />
      <div className="p-8">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
          <Users className="h-8 w-8 text-green-600" />
        </div>

        <h2 className="text-fg mb-6 text-center text-2xl font-bold">Join Bingo Event</h2>

        <div className="mb-6">
          <appkit-button label="Connect" />

          {isReownConnected && (
            <div className="mt-4 rounded-lg bg-green-100 p-3 text-center text-green-800">
              <p className="font-medium">Connected: {formattedAddress}</p>
              <p className="mt-1 text-sm">
                Network: {currentNetwork?.name || (currentChainId ? getChainName(currentChainId) : 'Unknown')}
              </p>
            </div>
          )}
        </div>

        <form className="space-y-4">
          <div className="relative">
            <input
              type="text"
              value={joinName}
              onChange={(e) => setJoinName(e.target.value)}
              placeholder="Enter Your Name"
              className="border-border w-full rounded-xl border-2 px-4 py-3 pl-10 outline-none transition focus:border-green-500 focus:ring-2 focus:ring-green-200"
              maxLength={20}
            />
            <Users className="absolute left-3 top-3.5 h-5 w-5 text-gray-400" />
          </div>

          <div className="relative">
            <input
              type="text"
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
              placeholder="Enter Event Code"
              className="border-border w-full rounded-xl border-2 px-4 py-3 pl-10 outline-none transition focus:border-green-500 focus:ring-2 focus:ring-green-200"
              maxLength={6}
            />
            <Dices className="absolute left-3 top-3.5 h-5 w-5 text-gray-400" />
          </div>

          {(paymentError || joinError) && (
            <div className="rounded-lg bg-red-100 p-3 text-red-800">
              {paymentError || joinError}
            </div>
          )}

          {!hasJoined && (
            <button
              type="button"
              onClick={handleVerifyRoom}
              className="flex w-full transform items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4 font-semibold text-white shadow-md transition hover:from-blue-700 hover:to-indigo-700"
            >
              {getJoinButtonText()}
            </button>
          )}

          <div className="text-fg/60 flex items-center justify-center gap-2 text-sm">
            <Wallet className="h-4 w-4" />
            <p>Pay with crypto - Entry fee determined by event</p>
          </div>
        </form>
      </div>

      {verifiedRoomData && (
        <VerifyRoomModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onConfirm={async () => {
            setIsModalOpen(false);
            await onJoinRoom({ playerName: joinName, roomCode: roomCode.toUpperCase() });

            const contractAddress = verifiedRoomData.contractAddress;

            saveRoomJoiningData({
              isCreator: false,
              playerName: joinName,
              roomId: roomCode.toUpperCase(),
              walletAddress: formattedAddress,
              contractAddress,
              chain: verifiedRoomData.chainId,
              namespace,
              entryFee,
            });

            setHasJoined(true); // ✅ Prevents button from re-appearing
          }}
          hostName={verifiedRoomData.hostName}
          entryFee={verifiedRoomData.entryFee}
          contractAddress={verifiedRoomData.contractAddress}
          chainId={verifiedRoomData.chainId}
        />
      )}
    </div>
  );
};

export default JoinRoomCard;



