// src/features/auth/model/store.ts
// Authentication store (Zustand)

import { create } from 'zustand';
import { authApi, quizApi } from '@shared/api';
import type { AuthStore, RegisterRequest, LoginRequest } from './types';
import { setStorageString, removeStorageItem } from '@shared/lib';

const AUTH_TOKEN_KEY = 'auth_token';

export const useAuthStore = create<AuthStore>((set, get) => ({
  // Initial state
  user: null,
  club: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
  successMessage: null,
  entitlements: null,
  showNoCreditWarning: false,

  initialize: () => {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (token) {
      set({ isAuthenticated: true });
      get().getProfile().catch(() => get().logout());
    }
  },

  register: async (data: RegisterRequest) => {
    try {
      set({ isLoading: true, error: null, successMessage: null });

      await authApi.registerClub(data);

      const successMsg = 'Registration successful! Please login to continue.';
      set({
        isLoading: false,
        error: null,
        successMessage: successMsg,
        user: null,
        club: null,
        isAuthenticated: false,
      });

      return { success: true, message: successMsg };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Registration failed';
      set({
        isLoading: false,
        error: errorMessage,
        successMessage: null,
        user: null,
        club: null,
        isAuthenticated: false,
      });
      throw error;
    }
  },

  login: async (data: LoginRequest) => {
    try {
      set({ isLoading: true, error: null, successMessage: null });
      const response = await authApi.loginClub(data);

      setStorageString(AUTH_TOKEN_KEY, response.token);
      set({
        user: response.user,
        club: response.club,
        isAuthenticated: true,
        isLoading: false,
        error: null,
        successMessage: null,
      });

      // Fetch entitlements after successful login
      try {
        const entitlements = await quizApi.getEntitlements();
        set({ entitlements });

        // Check if credits are zero
        if (entitlements.game_credits_remaining === 0) {
          set({ showNoCreditWarning: true });
        }
      } catch (entError) {
        // Don't fail login if entitlements fetch fails
        console.error('Failed to fetch entitlements:', entError);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Login failed';
      set({
        isLoading: false,
        error: errorMessage,
        successMessage: null,
        user: null,
        club: null,
        isAuthenticated: false,
      });
      removeStorageItem(AUTH_TOKEN_KEY);
      throw error;
    }
  },

  logout: () => {
    removeStorageItem(AUTH_TOKEN_KEY);
    set({
      user: null,
      club: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
      successMessage: null,
      entitlements: null,
      showNoCreditWarning: false,
    });
  },

  getProfile: async () => {
    try {
      set({ isLoading: true, error: null });
      const response = await authApi.getCurrentUser();
      set({
        user: response.user,
        club: response.club,
        isLoading: false,
        error: null,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to get profile';
      set({ isLoading: false, error: errorMessage });

      if (errorMessage.includes('401') || errorMessage.includes('Unauthorized')) {
        get().logout();
      }
      throw error;
    }
  },

  dismissNoCreditWarning: () => set({ showNoCreditWarning: false }),

  // Utility actions
  setUser: (user) => set({ user, isAuthenticated: !!user }),
  setClub: (club) => set({ club }),
  setError: (error) => set({ error, successMessage: null }),
  clearError: () => set({ error: null }),
  setSuccessMessage: (message) => set({ successMessage: message, error: null }),
  clearSuccessMessage: () => set({ successMessage: null }),
  setLoading: (loading) => set({ isLoading: loading }),
}));

