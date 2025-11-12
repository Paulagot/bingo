// src/features/auth/model/types.ts
// Authentication types

import type { User, Club, Entitlements } from '@shared/types';

export interface AuthState {
  user: User | null;
  club: Club | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  successMessage: string | null;
  entitlements: Entitlements | null;
  showNoCreditWarning: boolean;
}

export interface AuthActions {
  register: (data: RegisterRequest) => Promise<{ success: boolean; message: string }>;
  login: (data: LoginRequest) => Promise<void>;
  logout: () => void;
  getProfile: () => Promise<void>;
  setError: (error: string) => void;
  clearError: () => void;
  setSuccessMessage: (message: string) => void;
  clearSuccessMessage: () => void;
  setLoading: (loading: boolean) => void;
  initialize: () => void;
  setUser: (user: User | null) => void;
  setClub: (club: Club | null) => void;
  dismissNoCreditWarning: () => void;
}

export interface RegisterRequest {
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

export type AuthStore = AuthState & AuthActions;

