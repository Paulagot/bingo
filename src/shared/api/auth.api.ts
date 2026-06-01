// src/shared/api/auth.api.ts
// Authentication API endpoints

import { apiClient } from './client';
import type { User, Club } from '../types';

export interface RegisterClubRequest {
  clubName:              string;   // stored in fundraisely_clubs.name
  personName:            string;   // stored in fundraisely_users.name
  email:                 string;
  password:              string;
  reportingCurrency:     string;   // stored in fundraisely_clubs.reporting_currency
  gdprConsent:           boolean;
  privacyPolicyAccepted: boolean;
  marketingConsent?:     boolean;
}

export interface LoginRequest {
  club: string;
  email: string;
  password: string;  
}

export interface LoginResponse {
  message:  string;
  token:    string;
  user:     User;
  club:     Club;
}

export interface GetCurrentUserResponse {
  user: User;
  club: Club;
}

export const authApi = {
  async registerClub(data: RegisterClubRequest): Promise<LoginResponse> {
    return apiClient.post<LoginResponse>('/clubs/register', data, false); // was true
  },

  async loginClub(credentials: LoginRequest): Promise<LoginResponse> {
    return apiClient.post<LoginResponse>('/clubs/login', credentials, false); // was true
  },

  async getCurrentUser(): Promise<GetCurrentUserResponse> {
    return apiClient.get<GetCurrentUserResponse>('/clubs/me', false); // was true
  },
};

