// src/services/apiService.ts
// Legacy API service - wraps new modular API structure for backward compatibility
// TODO: Migrate all usages to @shared/api modules and remove this file

import { authApi, quizApi, roomApi } from '../shared/api';
import type {
  RegisterClubRequest,
  LoginRequest,
  LoginResponse,
  GetCurrentUserResponse,
  Entitlements,
  CreateRoomRequest,
  CreateRoomResponse,
  CreateWeb3RoomResponse,
} from '../shared/api';

class ApiService {
  // Authentication methods
  async registerClub(data: RegisterClubRequest): Promise<LoginResponse> {
    return authApi.registerClub(data);
  }

  async loginClub(credentials: LoginRequest): Promise<LoginResponse> {
    return authApi.loginClub(credentials);
  }

  async getCurrentUser(): Promise<GetCurrentUserResponse> {
    return authApi.getCurrentUser();
  }

  // Quiz methods
  async getEntitlements(): Promise<Entitlements> {
    return quizApi.getEntitlements();
  }

  // Room methods
  async createRoom(roomData: CreateRoomRequest): Promise<CreateRoomResponse> {
    return roomApi.createRoom(roomData);
  }

  async createWeb3Room(roomData: CreateRoomRequest): Promise<CreateWeb3RoomResponse> {
    return roomApi.createWeb3Room(roomData);
  }
}

export const apiService = new ApiService();
export default apiService;

