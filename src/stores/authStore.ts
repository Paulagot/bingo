// src/stores/authStore.ts
import { create } from 'zustand';
import { apiService } from '../services/apiService';

interface User {
  id: string;
  club_id: string;
  name: string;
  email: string;
  role: string;
}

interface Club {
  id: string;
  name: string;
  email: string;
}

interface Entitlements {
  max_players_per_game: number;
  max_rounds: number;
  round_types_allowed: string[];
  extras_allowed: string[];
  concurrent_rooms: number;
  game_credits_remaining: number;
}

interface AuthState {
  user: User | null;
  club: Club | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  successMessage: string | null;
  entitlements: Entitlements | null;
  showNoCreditWarning: boolean;
}

interface AuthActions {
  register: (data: {
    name: string;
    email: string;
    password: string;
    gdprConsent: boolean;
    privacyPolicyAccepted: boolean;
    marketingConsent?: boolean;
  }) => Promise<{ success: boolean; message: string }>;

  // ✅ UPDATED: include club
  login: (data: { club: string; email: string; password: string }) => Promise<void>;

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

type AuthStore = AuthState & AuthActions;

export const useAuthStore = create<AuthStore>((set, get) => ({
  user: null,
  club: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
  successMessage: null,
  entitlements: null,
  showNoCreditWarning: false,

  initialize: () => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      set({ isAuthenticated: true });
      get().getProfile().catch(() => get().logout());
    }
  },

  register: async (data) => {
    try {
      set({ isLoading: true, error: null, successMessage: null });

      await apiService.registerClub({
        name: data.name,
        email: data.email,
        password: data.password,
        gdprConsent: data.gdprConsent,
        privacyPolicyAccepted: data.privacyPolicyAccepted,
        marketingConsent: data.marketingConsent || false,
      });

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

  // ✅ UPDATED: expects club + email + password
  login: async (data) => {
    try {
      set({ isLoading: true, error: null, successMessage: null });

      const response = await apiService.loginClub({
        club: data.club,
        email: data.email,
        password: data.password,
      });

      localStorage.setItem('auth_token', response.token);
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
        const entitlements = await apiService.getEntitlements();
        set({ entitlements });

        if (entitlements.game_credits_remaining === 0) {
          set({ showNoCreditWarning: true });
        }
      } catch (entError) {
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
      localStorage.removeItem('auth_token');
      throw error;
    }
  },

  logout: () => {
    localStorage.removeItem('auth_token');
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
      const response = await apiService.getCurrentUser();
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

  setUser: (user) => set({ user, isAuthenticated: !!user }),
  setClub: (club) => set({ club }),
  setError: (error) => set({ error, successMessage: null }),
  clearError: () => set({ error: null }),
  setSuccessMessage: (message) => set({ successMessage: message, error: null }),
  clearSuccessMessage: () => set({ successMessage: null }),
  setLoading: (loading) => set({ isLoading: loading }),
}));

// Selector hooks
export const useAuth = () =>
  useAuthStore((state) => ({
    user: state.user,
    club: state.club,
    isAuthenticated: state.isAuthenticated,
    login: state.login,
    register: state.register,
    logout: state.logout,
    setUser: state.setUser,
    setClub: state.setClub,
    initialize: state.initialize,
  }));

export const useUI = () =>
  useAuthStore((state) => ({
    isLoading: state.isLoading,
    error: state.error,
    successMessage: state.successMessage,
    setLoading: state.setLoading,
    setError: state.setError,
    clearError: state.clearError,
    setSuccessMessage: state.setSuccessMessage,
    clearSuccessMessage: state.clearSuccessMessage,
  }));

export const useCreditWarning = () =>
  useAuthStore((state) => ({
    showNoCreditWarning: state.showNoCreditWarning,
    dismissNoCreditWarning: state.dismissNoCreditWarning,
    entitlements: state.entitlements,
  }));
