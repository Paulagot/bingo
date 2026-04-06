import React, { useState } from 'react';
import { useChainWallet } from '../../hooks/useChainWallet';
import { toChainConfig } from '../../types/chainConfig';
import { useSolanaEliminationJoinRoom } from '../../chains/solana/hooks/useSolanaEliminationJoinRoom';
import { getTokenByMint } from '../../chains/solana/config/solanaTokenConfig';

const WSOL_MINT = 'So11111111111111111111111111111111111111112';

interface Props {
  roomData: any;
  name: string;
  onPaymentDone: (txHash: string) => void;
  onError: (msg: string) => void;
}

export const Web3JoinSection: React.FC<Props> = ({
  roomData,
  name,
  onPaymentDone,
  onError,
}) => {
  // ── Use cluster from roomData — never hardcode devnet ─────────────────────
  const cluster = roomData.solanaCluster ?? 'devnet';

  const chainConfig = toChainConfig({
    web3Chain: roomData.web3Chain ?? 'solana',
    solanaCluster: cluster,
  });

 const { address: walletAddress, isConnected, connect, disconnect } = useChainWallet(chainConfig);
  const { joinRoom: solanaJoinRoom } = useSolanaEliminationJoinRoom(cluster);

  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentError, setPaymentError] = useState('');

  // ── Resolve token info from feeMint ──────────────────────────────────────
  const feeMint = roomData.feeMint ?? '';
  const tokenConfig = getTokenByMint(feeMint);
  const decimals = tokenConfig?.decimals ?? 6;
  const tokenSymbol = tokenConfig?.code ?? 'tokens';
  const isNativeSOL = feeMint === WSOL_MINT;

  const entryFeeDisplay = roomData.entryFee
    ? (roomData.entryFee / Math.pow(10, decimals)).toFixed(4)
    : '—';

  const handlePay = async () => {
    if (!walletAddress) return;
    const trimmedName = name.trim();
    if (!trimmedName) {
      setPaymentError('Enter your name first');
      return;
    }

    setPaymentError('');
    setPaymentLoading(true);

    try {
      // ── Pre-payment server check ────────────────────────────────────────
      // Verify room is still joinable BEFORE paying on-chain.
      // Prevents paying for a room that has started, is full, or was cancelled.
      const checkRes = await fetch(`/api/elimination/rooms/${roomData.roomId}`);
      const checkData = await checkRes.json();

      if (!checkData.success) {
        throw new Error('Room not found — it may have been cancelled.');
      }

      const roomStatus = checkData.room?.status;
      if (roomStatus && roomStatus !== 'waiting') {
        throw new Error(
          roomStatus === 'cancelled'
            ? 'This room has been cancelled.'
            : 'This game has already started.'
        );
      }

      const playerCount = checkData.room?.players?.length ?? 0;
      if (playerCount >= 200) {
        throw new Error('Room is full.');
      }

      console.log('[Web3JoinSection] Room check passed — proceeding with payment');

      // ── On-chain payment ──────────────────────────────────────────────────
      const result = await solanaJoinRoom({
        roomId: roomData.roomId,
        roomPda: roomData.roomPda,
        feeMint: feeMint,
        entryFee: roomData.entryFee,
        currency: feeMint,
      });

      if (!result.success) throw new Error((result as any).error ?? 'Payment failed');
      onPaymentDone(result.txHash);

    } catch (err: any) {
      const msg = err?.message ?? 'Payment failed';
      setPaymentError(msg);
      onError(msg);
    } finally {
      setPaymentLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>

      {/* Entry fee info */}
      <div style={{
        background: 'rgba(0,229,255,0.05)',
        border: '1px solid rgba(0,229,255,0.15)',
        borderRadius: '8px',
        padding: '12px',
      }}>
        <p style={{
          fontSize: '11px',
          color: 'rgba(255,255,255,0.4)',
          margin: '0 0 4px',
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          fontFamily: 'Inter, system-ui, sans-serif',
        }}>
          Entry Fee
        </p>
        <p style={{
          fontSize: '22px',
          color: '#00e5ff',
          margin: 0,
          fontFamily: 'Inter, system-ui, sans-serif',
          fontWeight: 700,
        }}>
          {entryFeeDisplay} {tokenSymbol}
        </p>
        <p style={{
          fontSize: '10px',
          color: 'rgba(255,255,255,0.25)',
          margin: '4px 0 0',
          fontFamily: 'Inter, system-ui, sans-serif',
        }}>
          Paid on-chain · Solana {cluster}
          {isNativeSOL && ' · Native SOL'}
        </p>
      </div>

      {/* Wallet / pay button */}
      {!isConnected ? (
        <button onClick={() => connect()} style={btnStyle}>
          Connect Wallet to Pay
        </button>
      ) : (
        <>
          <div style={{
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
}}>
  <span style={{
    fontSize: '11px',
    color: 'rgba(0,229,255,0.6)',
    fontFamily: 'monospace',
  }}>
    ✓ {walletAddress?.slice(0, 6)}...{walletAddress?.slice(-4)}
  </span>
  <button
    onClick={() => disconnect()}
    style={{
      background: 'none',
      border: '1px solid rgba(255,59,92,0.3)',
      borderRadius: '4px',
      color: 'rgba(255,59,92,0.6)',
      fontSize: '10px',
      fontFamily: "'IBM Plex Mono', monospace",
      padding: '3px 8px',
      cursor: 'pointer',
      letterSpacing: '0.08em',
    }}
  >
    Disconnect
  </button>
</div>

          {paymentError && (
            <p style={{
              color: '#ff3b5c',
              fontSize: '12px',
              fontFamily: 'Inter, system-ui, sans-serif',
              margin: 0,
            }}>
              {paymentError}
            </p>
          )}

          <button
            onClick={handlePay}
            disabled={paymentLoading || !name.trim()}
            style={{
              ...btnStyle,
              opacity: (paymentLoading || !name.trim()) ? 0.5 : 1,
              cursor: (paymentLoading || !name.trim()) ? 'not-allowed' : 'pointer',
            }}
          >
            {paymentLoading
              ? paymentError
                ? 'Retrying...'
                : 'Checking room...'
              : `Pay ${entryFeeDisplay} ${tokenSymbol} & Join`}
          </button>
        </>
      )}
    </div>
  );
};

const btnStyle: React.CSSProperties = {
  width: '100%',
  padding: '16px',
  background: 'rgba(0,229,255,0.15)',
  border: '1px solid rgba(0,229,255,0.6)',
  borderRadius: '8px',
  color: '#00e5ff',
  fontSize: '14px',
  fontWeight: 700,
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
  fontFamily: "'Bebas Neue', 'Impact', sans-serif",
  cursor: 'pointer',
};