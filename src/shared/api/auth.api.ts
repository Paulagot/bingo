// src/shared/api/auth.api.ts
// Authentication API endpoints

import { apiClient } from './client';
import type { User, Club } from '../types';

export interface RegisterClubRequest {
  name: string;
  email: string;
  password: string;
  gdprConsent: boolean;
  privacyPolicyAccepted: boolean;
  marketingConsent?: boolean;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  message: string;
  token: string;
  user: User;
  club: Club;
}

export interface GetCurrentUserResponse {
  user: User;
  club: Club;
}

export const authApi = {
  /**
   * Register a new club
   */
  async registerClub(data: RegisterClubRequest): Promise<LoginResponse> {
    return apiClient.post<LoginResponse>('/clubs/register', data, true);
  },

  /**
   * Login with club credentials
   */
  async loginClub(credentials: LoginRequest): Promise<LoginResponse> {
    return apiClient.post<LoginResponse>('/clubs/login', credentials, true);
  },

  /**
   * Get current user information
   */
  async getCurrentUser(): Promise<GetCurrentUserResponse> {
    return apiClient.get<GetCurrentUserResponse>('/clubs/me', true);
  },
};

