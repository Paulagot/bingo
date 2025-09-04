// src/store/authStore.ts
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

interface AuthState {
  user: User | null;
  club: Club | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  successMessage: string | null; // New: for registration success
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
  login: (data: { email: string; password: string }) => Promise<void>;
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
}

type AuthStore = AuthState & AuthActions;

export const useAuthStore = create<AuthStore>((set, get) => ({
  // Initial state
  user: null,
  club: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
  successMessage: null,

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
      
      // Call API with GDPR data
      const response = await apiService.registerClub({
        name: data.name,
        email: data.email,
        password: data.password,
        gdprConsent: data.gdprConsent,
        privacyPolicyAccepted: data.privacyPolicyAccepted,
        marketingConsent: data.marketingConsent || false
      });
      
      // Don't auto-authenticate - user should manually login
      const successMsg = 'Registration successful! Please check your email and login to continue.';
      set({
        isLoading: false,
        error: null,
        successMessage: successMsg,
        // Keep authentication state as false
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

  login: async (data) => {
    try {
      set({ isLoading: true, error: null, successMessage: null });
      const response = await apiService.loginClub(data);
      
      localStorage.setItem('auth_token', response.token);
      set({
        user: response.user,
        club: response.club,
        isAuthenticated: true,
        isLoading: false,
        error: null,
        successMessage: null,
      });
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

  // Utility actions
  setUser: (user) => set({ user, isAuthenticated: !!user }),
  setClub: (club) => set({ club }),
  setError: (error) => set({ error, successMessage: null }),
  clearError: () => set({ error: null }),
  setSuccessMessage: (message) => set({ successMessage: message, error: null }),
  clearSuccessMessage: () => set({ successMessage: null }),
  setLoading: (loading) => set({ isLoading: loading }),
}));

// Selector hooks for components
export const useAuth = () => useAuthStore((state) => ({
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

export const useUI = () => useAuthStore((state) => ({
  isLoading: state.isLoading,
  error: state.error,
  successMessage: state.successMessage,
  setLoading: state.setLoading,
  setError: state.setError,
  clearError: state.clearError,
  setSuccessMessage: state.setSuccessMessage,
  clearSuccessMessage: state.clearSuccessMessage,
}));