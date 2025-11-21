// src/features/auth/hooks/useAuth.ts
// Main authentication hook

import { useAuthStore } from '../model/store';

/**
 * Main authentication hook
 * Returns user, authentication status, and auth actions
 */
export function useAuth() {
  return useAuthStore((state) => ({
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
}

/**
 * UI state hook
 * Returns loading, error, and success message state
 */
export function useAuthUI() {
  return useAuthStore((state) => ({
    isLoading: state.isLoading,
    error: state.error,
    successMessage: state.successMessage,
    setLoading: state.setLoading,
    setError: state.setError,
    clearError: state.clearError,
    setSuccessMessage: state.setSuccessMessage,
    clearSuccessMessage: state.clearSuccessMessage,
  }));
}

/**
 * Credit warning hook
 * Returns credit warning state and dismiss function
 */
export function useCreditWarning() {
  return useAuthStore((state) => ({
    showNoCreditWarning: state.showNoCreditWarning,
    dismissNoCreditWarning: state.dismissNoCreditWarning,
    entitlements: state.entitlements,
  }));
}

