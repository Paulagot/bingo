// src/features/auth/index.ts
// Barrel export for auth feature

export * from './model';
export * from './hooks/useAuth';
export * from './lib';

// Re-export store for backward compatibility
export { useAuthStore } from './model/store';

