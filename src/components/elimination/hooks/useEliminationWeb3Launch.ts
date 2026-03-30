import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useChainWallet } from '../../../hooks/useChainWallet';
import { useEliminationContractActions } from '../../../hooks/useEliminationContractActions';
import { toChainConfig } from '../../../types/chainConfig';
import { createWeb3Room } from '../services/eliminationApi';
import { generatePlayerId } from '../utils/eliminationHelpers';

export type EliminationWeb3LaunchState =
  | 'idle'
  | 'deploying'
  | 'creating-room'
  | 'success'
  | 'error';

export interface EliminationWeb3Config {
  hostName: string;
  web3Chain: 'solana' | 'evm';
  solanaCluster: 'devnet' | 'mainnet';
  feeMint: string;
  entryFee: number;
  entryFeeDisplay: string;
  tokenSymbol: string;
  charityOrgId: number | null;
  charityName: string | null;
}

// ── Generates a short ID safe for Solana PDA seeds (max 32 bytes) ─────────────
// 8 uppercase chars from base36 — unique enough for a game room
const generateOnChainRoomId = (): string =>
  Math.random().toString(36).substring(2, 10).toUpperCase();

export function useEliminationWeb3Launch(config: EliminationWeb3Config) {
  const navigate = useNavigate();

  const chainConfig = toChainConfig({
    web3Chain: config.web3Chain,
    solanaCluster: config.solanaCluster,
  });

  const {
    address: walletAddress,
    isConnected,
    networkInfo,
    connect,
    disconnect,
  } = useChainWallet(chainConfig);

  const { deploy } = useEliminationContractActions(chainConfig);

  const [launchState, setLaunchState] =
    useState<EliminationWeb3LaunchState>('idle');
  const [error, setError] = useState<string | null>(null);
  const [roomPda, setRoomPda] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);

  const canLaunch =
    isConnected &&
    !!walletAddress &&
    !!config.hostName.trim() &&
    !!config.feeMint &&
    config.entryFee > 0 &&
    (launchState === 'idle' || launchState === 'error');

  const handleConnect = useCallback(async () => {
    try {
      await connect();
    } catch (err: any) {
      setError(err?.message ?? 'Wallet connection failed');
    }
  }, [connect]);

  const handleDisconnect = useCallback(async () => {
    await disconnect();
  }, [disconnect]);

  const handleLaunch = useCallback(async () => {
    if (!canLaunch || !walletAddress) return;
    setError(null);

    try {
      // ── Step 1: generate IDs ──────────────────────────────────────────────
      // onChainRoomId: short, used as the Solana PDA seed (max 32 bytes)
      // hostId: full UUID, used server-side and in session storage only
      const onChainRoomId = generateOnChainRoomId();
      const hostId = generatePlayerId();

      console.log('[useEliminationWeb3Launch] IDs generated:', {
        onChainRoomId,  // e.g. "A3F8K2ZQ" — goes on-chain
        hostId,         // e.g. "player_uuid" — server only
      });

      // ── Step 2: deploy create_room on-chain ───────────────────────────────
      setLaunchState('deploying');

      const deployResult = await deploy({
        roomId: onChainRoomId,       // ← short ID as the on-chain seed
        currency: config.tokenSymbol,
        entryFee: config.entryFeeDisplay,
        cluster: config.solanaCluster,
      });

      if (!deployResult?.success || !deployResult.contractAddress) {
        throw new Error('On-chain deployment failed or was not signed');
      }

      setRoomPda(deployResult.contractAddress);
      setTxHash(deployResult.txHash ?? null);

      console.log('[useEliminationWeb3Launch] Contract deployed:', {
        roomPda: deployResult.contractAddress,
        txHash: deployResult.txHash,
        onChainRoomId,
      });

      // ── Step 3: create server room ────────────────────────────────────────
      setLaunchState('creating-room');

      const response = await createWeb3Room({
        hostName: config.hostName.trim(),
        hostId,
        hostWallet: walletAddress,
        web3Chain: config.web3Chain,
        solanaCluster: config.solanaCluster,
        feeMint: config.feeMint,
        entryFee: config.entryFee,
        roomPda: deployResult.contractAddress,
        charityOrgId: config.charityOrgId,
        charityName: config.charityName,
        onChainRoomId,               // ← stored for finalize_game later
      });

      if (!response.success) {
        throw new Error('Failed to create server room');
      }

      console.log('[useEliminationWeb3Launch] Server room created:', response.roomId);

      // ── Step 4: set session and navigate ─────────────────────────────────
      setLaunchState('success');

      // Server room ID — used by socket events and the game UI
      sessionStorage.setItem('elim_room_id', response.roomId);
      // Host auth token
      sessionStorage.setItem('elim_host_id', hostId);
      // Display name
      sessionStorage.setItem('elim_player_name', config.hostName.trim());
      // Flag as host
      sessionStorage.setItem('elim_is_host', 'true');
      // On-chain room ID — needed to derive PDA for finalize_game
      sessionStorage.setItem('elim_onchain_room_id', onChainRoomId);

      // Small delay so success state renders before navigation
      setTimeout(() => {
        navigate('/elimination');
      }, 600);

    } catch (err: any) {
      console.error('[useEliminationWeb3Launch]', err);
      setError(err?.message ?? 'Launch failed');
      setLaunchState('error');
    }
  }, [canLaunch, walletAddress, config, deploy, navigate]);

  return {
    walletAddress,
    isConnected,
    networkInfo,
    handleConnect,
    handleDisconnect,
    launchState,
    error,
    roomPda,
    txHash,
    canLaunch,
    isLaunching: launchState === 'deploying' || launchState === 'creating-room',
    handleLaunch,
  };
}