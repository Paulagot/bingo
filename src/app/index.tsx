// src/app/index.tsx
// Application entry point

import React from 'react';
import { AppProviders } from './providers';
import { AppRouter } from './router';
import { AppErrorBoundary } from './providers/ErrorBoundary';
import { useAuthStore } from '../features/auth';
import { Header } from '../components/GeneralSite2/Header';

export function App() {
  const initialize = useAuthStore((state) => state.initialize);

  React.useEffect(() => {
    initialize();
  }, [initialize]);

  return (
    <AppErrorBoundary>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <Header />
        <main className="pt-16">
          <AppRouter />
        </main>
      </div>
    </AppErrorBoundary>
  );
}

