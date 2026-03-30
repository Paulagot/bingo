const BASE = '/api/elimination';

const request = async <T>(
  path: string,
  options?: RequestInit,
): Promise<T> => {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? 'Request failed');
  return data as T;
};

// ─── Create Room ──────────────────────────────────────────────────────────────
export const createRoom = (hostName: string, hostId?: string) =>
  request<{ roomId: string; hostId: string; status: string; createdAt: string }>(
    '/rooms',
    {
      method: 'POST',
      body: JSON.stringify({ hostName, hostId }),
    },
  );

// ─── Get Room ─────────────────────────────────────────────────────────────────
export const getRoom = (roomId: string) =>
  request<{ room: import('../types/elimination').EliminationRoom }>(`/rooms/${roomId}`);

// ─── Reconnect Snapshot ───────────────────────────────────────────────────────
export const getReconnectSnapshot = (roomId: string, playerId: string) =>
  request<{
    roomSnapshot: import('../types/elimination').EliminationRoom;
    playerState: import('../types/elimination').EliminationPlayer;
    activeRound: import('../types/elimination').ActiveRound | null;
  }>(`/rooms/${roomId}/player/${playerId}`);

// ─── End Room ─────────────────────────────────────────────────────────────────
export const endRoom = (roomId: string, hostId: string) =>
  request<{ success: boolean }>(`/rooms/${roomId}/end`, {
    method: 'POST',
    body: JSON.stringify({ hostId }),
  });

  // ─── Create Web3 Room ─────────────────────────────────────────────────────────
export interface CreateWeb3RoomPayload {
  hostName: string;
  hostId?: string;
  hostWallet: string;
  web3Chain: 'solana' | 'evm';
  solanaCluster?: 'devnet' | 'mainnet';
  feeMint: string;
  entryFee: number;
  roomPda: string;
  charityOrgId?: number | null;
  charityName?: string | null;
  onChainRoomId?: string;
}

export interface CreateWeb3RoomResponse {
  success: boolean;
  roomId: string;
  hostId: string;
  status: string;
  createdAt: string;
  roomPda: string;
  feeMint: string;
  entryFee: number;
  web3Chain: string;
}

export const createWeb3Room = (payload: CreateWeb3RoomPayload) =>
  request<CreateWeb3RoomResponse>('/rooms/web3', {
    method: 'POST',
    body: JSON.stringify(payload),
  });