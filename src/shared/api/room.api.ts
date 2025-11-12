// src/shared/api/room.api.ts
// Room management API endpoints

import { apiClient } from './client';

export interface RoomConfig {
  [key: string]: unknown;
}

export interface CreateRoomRequest {
  config: RoomConfig;
  roomId: string;
  hostId: string;
}

export interface CreateRoomResponse {
  roomId: string;
  hostId: string;
  roomCaps: RoomConfig;
}

export interface CreateWeb3RoomResponse extends CreateRoomResponse {
  contractAddress: string;
  deploymentTxHash: string;
  verified: boolean;
}

export const roomApi = {
  /**
   * Create a new room
   */
  async createRoom(roomData: CreateRoomRequest): Promise<CreateRoomResponse> {
    return apiClient.post<CreateRoomResponse>('/quiz/api/create-room', roomData);
  },

  /**
   * Create a new Web3 room
   */
  async createWeb3Room(roomData: CreateRoomRequest): Promise<CreateWeb3RoomResponse> {
    return apiClient.post<CreateWeb3RoomResponse>('/quiz/api/create-web3-room', roomData);
  },
};

