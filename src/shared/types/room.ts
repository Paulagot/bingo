// src/shared/types/room.ts
// Room and game room types

export interface RoomCaps {
  maxPlayers: number;
  maxRounds: number;
  roundTypesAllowed?: string[] | '*';
  extrasAllowed?: string[] | '*';
}

export type RoomPhase = 'waiting' | 'launched' | 'asking' | 'reviewing' | 'leaderboard' | 'complete' | 'distributing_prizes';

export interface RoomConfig {
  [key: string]: unknown;
}

export interface BaseRoom {
  roomId: string;
  hostId: string;
  roomCaps: RoomCaps;
  phase?: RoomPhase;
  config?: RoomConfig;
}

export interface Web3Room extends BaseRoom {
  contractAddress: string;
  deploymentTxHash: string;
  verified: boolean;
  isWeb3Room: true;
}

