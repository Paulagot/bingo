// src/features/auth/ui/AuthGuard.tsx
// Authentication guard component

import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { authApi } from '@shared/api';

interface AuthGuardProps {
  children: React.ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
  const { isAuthenticated, user, setUser, setClub } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [isCheckingAuth, setIsCheckingAuth] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const checkAuthStatus = async () => {
      const token = localStorage.getItem('auth_token');

      if (!token) {
        setIsLoading(false);
        return;
      }

      if (isAuthenticated && user) {
        setIsLoading(false);
        return;
      }

      try {
        setIsCheckingAuth(true);
        const response = await authApi.getCurrentUser();

        setUser(response.user);
        setClub(response.club);
      } catch (error) {
        // Token is invalid, clear it
        localStorage.removeItem('auth_token');
        console.error('Auth check failed:', error);
      } finally {
        setIsCheckingAuth(false);
        setIsLoading(false);
      }
    };

    checkAuthStatus();
  }, [isAuthenticated, user, setUser, setClub]);

  // Loading state while checking authentication
  if (isLoading || isCheckingAuth) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
          <p className="text-fg/70">Checking authentication...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    const returnTo = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/auth?returnTo=${returnTo}`} replace />;
  }

  // Render protected content
  return <>{children}</>;
}

