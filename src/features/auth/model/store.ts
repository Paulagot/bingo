// src/features/auth/model/store.ts
// Authentication store (Zustand)
//
// Changes from previous version:
//   - entitlements is now a map keyed by scope: { quiz?: Entitlements, elimination?: Entitlements }
//   - Both scopes are fetched on login and cached in sessionStorage
//   - getEntitlementsForScope() helper added
//   - showNoCreditWarning checks both scopes
//   - initialized flag added to prevent premature redirect on refresh

import { create } from 'zustand';
import { authApi, quizApi } from '@shared/api';
import type { AuthStore, RegisterRequest, LoginRequest } from './types';
import type { Entitlements } from '@shared/types';

import { setStorageString, removeStorageItem } from '@shared/lib';

const AUTH_TOKEN_KEY = 'auth_token';
type GameScope = 'quiz' | 'elimination';

/**
 * Entitlements map - one entry per game scope.
 * Using a map means adding a new game type in future is a one-liner.
 */
export type EntitlementsMap = Partial<Record<GameScope, Entitlements>>;

/**
 * Scopes to fetch on login.
 * Add new game types here when they are added to the platform.
 */
const GAME_SCOPES: GameScope[] = ['quiz', 'elimination'];

/**
 * Fetch entitlements for all game scopes in parallel.
 * Non-fatal - if one scope fails, the others still succeed.
 */
async function fetchAllEntitlements(): Promise<EntitlementsMap> {
  const results = await Promise.allSettled(
    GAME_SCOPES.map((scope) => quizApi.getEntitlements(scope))
  );

  const map: EntitlementsMap = {};
  results.forEach((result, i) => {
    const scope = GAME_SCOPES[i] as GameScope;
    if (result.status === 'fulfilled') {
      map[scope] = result.value;
    } else {
      console.error(
        `[AuthStore] Failed to fetch entitlements for scope "${scope}":`,
        result.reason
      );
    }
  });

  return map;
}

/**
 * Check if any scope has zero credits - used to show the no-credit warning.
 * Only warns for scopes that the club actually has (i.e. not missing from the map).
 */
function hasAnyZeroCredits(entitlements: EntitlementsMap): boolean {
  return GAME_SCOPES.some(
    (scope) =>
      entitlements[scope] !== undefined &&
      (entitlements[scope]?.game_credits_remaining ?? 0) === 0
  );
}

export const useAuthStore = create<AuthStore>((set, get) => ({
  // ── Initial state ──────────────────────────────────────────────────────────

  user: null,
  club: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
  successMessage: null,

  // entitlements is now an EntitlementsMap, but we keep the field name
  // so existing callers that do `state.entitlements` still work.
  // Use getEntitlementsForScope() for typed per-scope access.
  entitlements: null,

  showNoCreditWarning: false,

  // initialized starts false so DashboardShell shows a spinner rather than
  // immediately redirecting while getProfile() is still in flight.
  // It is set to true exactly once - after initialize() resolves or rejects.
  initialized: false,

  // ── Actions ────────────────────────────────────────────────────────────────

  initialize: () => {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (token) {
      // Optimistically mark authenticated so protected UI doesn't flash,
      // then confirm (or clear) once the profile API responds.
      set({ isAuthenticated: true });
      get()
        .getProfile()
        .catch(() => get().logout())
        .finally(() => set({ initialized: true }));
    } else {
      // No token - nothing to hydrate, ready immediately.
      set({ initialized: true });
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
      const errorMessage =
        error instanceof Error ? error.message : 'Registration failed';
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
        // Already initialized from a previous initialize() call (the login
        // page renders after initialize() has finished), but set it here too
        // so a login on a fresh tab without a prior token also marks ready.
        initialized: true,
      });

      // Fetch all scopes in parallel after successful login.
      // Non-fatal - login succeeds even if entitlements fetch fails.
      try {
        const entitlementsMap = await fetchAllEntitlements();
        set({
          entitlements: entitlementsMap as any,
          showNoCreditWarning: hasAnyZeroCredits(entitlementsMap),
        });
      } catch (entError) {
        console.error('[AuthStore] Failed to fetch entitlements:', entError);
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Login failed';
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
    // Clear scope-specific sessionStorage caches
    GAME_SCOPES.forEach((scope) => {
      sessionStorage.removeItem(`fundraisely_ents_${scope}`);
    });
    set({
      user: null,
      club: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
      successMessage: null,
      entitlements: null,
      showNoCreditWarning: false,
      // Keep initialized: true - the store is still ready, just logged out.
      // DashboardShell will see initialized=true + isAuthenticated=false
      // and redirect to / immediately, which is the correct behaviour.
      initialized: true,
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
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to get profile';
      set({ isLoading: false, error: errorMessage });

      if (
        errorMessage.includes('401') ||
        errorMessage.includes('Unauthorized')
      ) {
        get().logout();
      }
      throw error;
    }
  },

  dismissNoCreditWarning: () => set({ showNoCreditWarning: false }),

  // ── Utility actions ────────────────────────────────────────────────────────

  setUser:             (user)    => set({ user, isAuthenticated: !!user }),
  setClub:             (club)    => set({ club }),
  setError:            (error)   => set({ error, successMessage: null }),
  clearError:          ()        => set({ error: null }),
  setSuccessMessage:   (message) => set({ successMessage: message, error: null }),
  clearSuccessMessage: ()        => set({ successMessage: null }),
  setLoading:          (loading) => set({ isLoading: loading }),
}));

// ─── Selectors ────────────────────────────────────────────────────────────────

/**
 * Get entitlements for a specific game scope from the auth store.
 * Use this instead of reading `state.entitlements` directly.
 *
 * @example
 *   const quizEnts = useAuthStore(getEntitlementsForScope('quiz'));
 *   const elimEnts = useAuthStore(getEntitlementsForScope('elimination'));
 */
export function getEntitlementsForScope(scope: GameScope) {
  return (state: ReturnType<typeof useAuthStore.getState>): Entitlements | null => {
    const map = state.entitlements as EntitlementsMap | null;
    return map?.[scope] ?? null;
  };
}

/**
 * Hook: get entitlements for a specific scope from the auth store.
 * Prefer useEntitlements() hook for component-level use - it handles
 * loading state and cache. Use this only when you need entitlements
 * from Zustand state without triggering a fetch.
 *
 * @example
 *   const quizEnts = useEntitlementsFromStore('quiz');
 */
export function useEntitlementsFromStore(scope: GameScope): Entitlements | null {
  return useAuthStore(getEntitlementsForScope(scope));
}

